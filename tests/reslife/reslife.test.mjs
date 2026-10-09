// Reslife Hub: Programming, Safety Records, Accommodations and Guest integration tests.
// Synthetic data only. Run: node --test --experimental-test-module-mocks tests/reslife/
import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { fakeMongo, ObjectId } from './fake-mongo.mjs';

const db = fakeMongo();
mock.module(new URL('../../netlify/functions/_db.js', import.meta.url).href, { namedExports: { getDb: async () => db, ObjectId } });

const { handler: programs } = await import('../../netlify/functions/reslife-programs.js');
const { handler: safety } = await import('../../netlify/functions/reslife-safety.js');
const { handler: accom } = await import('../../netlify/functions/reslife-accommodations.js');
const { handler: guestLog } = await import('../../netlify/functions/reslife-guest-log.js');
const { handler: kiosk } = await import('../../netlify/functions/reslife-guest-kiosk.js');
const P = await import('../../netlify/functions/_programs.js');
const S = await import('../../netlify/functions/_safety.js');

const PROP = 'Test Harbour';
const OTHER = 'Other Property';
const users = {
  ra1: { username: 'ra1', fullName: 'Test RA One', role: 'reslife-ra', properties: [PROP] },
  ra2: { username: 'ra2', fullName: 'Test RA Two', role: 'reslife-ra', properties: [PROP] },
  ra3: { username: 'ra3', fullName: 'Test RA Three', role: 'reslife-ra', properties: [PROP] },
  rec: { username: 'rec1', fullName: 'Test REC', role: 'reslife-rec', properties: [PROP] },
  adm: { username: 'adm1', fullName: 'Test Reslife Admin', role: 'reslife-admin', properties: [PROP] },
  outsider: { username: 'out1', fullName: 'Other RA', role: 'reslife-ra', properties: [OTHER] },
  outAdmin: { username: 'out2', fullName: 'Other Admin', role: 'reslife-admin', properties: [OTHER] },
};
for (const u of Object.values(users)) await db.collection('users').insertOne(u);
const tok = u => jwt.sign({ sub: u.username, role: u.role, properties: u.properties }, 'dev-secret-change-me');
const req = (fn) => async (u, method, { q = {}, body } = {}) => {
  const r = await fn({ httpMethod: method, headers: u ? { authorization: 'Bearer ' + tok(u) } : {}, queryStringParameters: Object.assign({ property: PROP }, q), body: body ? JSON.stringify(Object.assign({ property: PROP }, body)) : undefined });
  let data = r.body; try { data = JSON.parse(r.body); } catch (e) { /* text */ }
  return { status: r.statusCode, data, headers: r.headers || {} };
};
const prog = req(programs), saf = req(safety), acc = req(accom), gl = req(guestLog);

// ---------------------------------------------------------------- pure logic
test('budget: per-vendor tax, fees, tips in integer cents; cancelled items excluded', () => {
  const items = [
    { kind: 'purchase', item: 'Banner', vendor: 'Amazon', price: 19.99, qty: 3 },
    { kind: 'purchase', item: 'Chips', vendor: 'Instacart - Vons', price: 4.49, qty: 10 },
    { kind: 'purchase', item: 'Pizza', vendor: "Luigi's", price: 15.5, qty: 4 },
    { kind: 'purchase', item: 'Gone', vendor: 'Amazon', price: 100, qty: 1, status: 'cancelled' },
    { kind: 'supply', item: 'Tables', qty: 4 },
  ];
  const vendors = [
    { vendor: 'amazon', taxRate: 7.75 },
    { vendor: 'Instacart - Vons', taxRate: 0, serviceFee: 5, instacartFee: 3.99, tip: 6 },
    { vendor: "Luigi's", taxRate: 7.75, deliveryFee: 4.99, tip: 8 },
  ];
  const b = P.computeBudget(items, vendors, 200);
  const amazon = b.vendors.find(v => v.vendor === 'Amazon');
  assert.equal(amazon.subtotal, 59.97); assert.equal(amazon.tax, 4.65); assert.equal(amazon.total, 64.62);
  const ic = b.vendors.find(v => v.vendor === 'Instacart - Vons');
  assert.equal(ic.subtotal, 44.9); assert.equal(ic.fees, 8.99); assert.equal(ic.tip, 6); assert.equal(ic.total, 59.89);
  const lu = b.vendors.find(v => v.vendor === "Luigi's");
  assert.equal(lu.tax, 4.81); assert.equal(lu.total, 62 + 4.81 + 4.99 + 8);
  assert.equal(b.subtotal, 166.87); assert.equal(b.total, 64.62 + 59.89 + 79.8);
  assert.equal(b.approvedBudget, 200); assert.equal(b.remaining, Math.round((200 - b.total) * 100) / 100);
  assert.equal(b.overBudget, true);
});

test('policy warnings: amazon food, delivery fees, pickup, perishable, Costco food court, over budget — never mutate', () => {
  const p = {
    approvedBudget: 10,
    items: [
      { id: 'a', kind: 'purchase', item: 'Cookies', vendor: 'Amazon', purchaseType: 'Food', price: 5, qty: 1 },
      { id: 'b', kind: 'purchase', item: 'Cake', vendor: 'Vons', purchaseType: 'Food', price: 20, qty: 1, fulfillment: 'pickup', perishable: true },
      { id: 'c', kind: 'purchase', item: 'Pizza', vendor: 'Costco Food Court', purchaseType: 'Food', price: 10, qty: 1, fulfillment: 'delivery' },
      { id: 'd', kind: 'purchase', item: 'Tape', vendor: 'Amazon', purchaseType: 'Supplies', price: 3, qty: 1 },
    ],
    vendors: [],
  };
  const before = JSON.stringify(p);
  const rules = P.policyWarnings(p).map(w => w.rule + ':' + w.itemId);
  assert.ok(rules.includes('amazon_food:a'));
  assert.ok(!rules.some(r => r.endsWith(':d') && r.startsWith('amazon_food')), 'non-food Amazon items are fine');
  assert.ok(rules.includes('pickup_details:b')); assert.ok(rules.includes('perishable:b'));
  assert.ok(rules.includes('costco_food_court:c')); assert.ok(rules.includes('delivery_fees:c'));
  assert.ok(rules.includes('over_budget:'));
  assert.equal(JSON.stringify(p), before, 'warnings must not change the program');
  const off = P.policyWarnings(p, { rules: { amazon_food: { enabled: false } } });
  assert.ok(!off.some(w => w.rule === 'amazon_food'), 'rules are administratively configurable');
});

test('status transitions: members vs managers', () => {
  assert.ok(P.canTransition('draft', 'submitted', 'member'));
  assert.ok(!P.canTransition('submitted', 'approved', 'member'));
  assert.ok(P.canTransition('proposed', 'approved', 'manager'), 'legacy proposed reads as submitted');
  assert.ok(P.canTransition('changes_requested', 'submitted', 'member'));
  assert.ok(!P.canTransition('approved', 'completed', 'member'));
  assert.ok(!P.canTransition('draft', 'submitted', null));
});

test('name screening: strong / possible / none — never an identification', () => {
  assert.equal(S.nameMatchLevel('Jordan Testcase', 'Testcase, Jordan'), 'strong');
  assert.equal(S.nameMatchLevel('Jordon Testcase', 'Jordan Testcase'), 'possible');
  assert.equal(S.nameMatchLevel('J Testcase', 'Jordan Testcase'), 'possible');
  assert.equal(S.nameMatchLevel('Jordan Smith', 'Jordan Testcase'), null);
  assert.equal(S.nameMatchLevel('Alex Testcase', 'Jordan Testcase'), null, 'shared last name alone is not a hit');
  assert.equal(S.nameMatchLevel('Jordan', 'Jordan Testcase'), null, 'single names never match');
  assert.equal(S.bestMatch('Sam Example', { name: 'Jordan Testcase', aliases: ['Sam Example'] }), 'strong');
});

// ---------------------------------------------------------------- programming workflow
let progId, version;
test('programs: RA creates draft, autosave edits with version, other RA cannot see draft', async () => {
  const r = await prog(users.ra1, 'POST', { body: { title: 'Synthetic Craft Night', programType: 'collaborative', collaborators: ['ra2'], owner: 'ra3' } });
  assert.equal(r.status, 200); assert.equal(r.data.status, 'draft');
  assert.equal(r.data.owner, 'ra1', 'RAs cannot assign ownership to someone else');
  assert.equal(r.data.tasks.length, 10, 'standard checklist is added');
  progId = r.data.id; version = r.data.version;
  const list3 = await prog(users.ra3, 'GET'); assert.equal(list3.data.length, 0, 'unrelated RA cannot see drafts');
  const list2 = await prog(users.ra2, 'GET'); assert.equal(list2.data.length, 1, 'collaborator sees shared draft');
  const out = await prog(users.outsider, 'GET', { q: { property: PROP } }); assert.equal(out.status, 403, 'other property blocked');
});

test('programs: collaborator edit; stale version is rejected (no overwrite)', async () => {
  const items = [
    { kind: 'purchase', item: 'Snacks', vendor: 'Amazon', purchaseType: 'Food', price: 10, qty: 2 },
    { kind: 'purchase', item: 'Juice', vendor: 'Instacart - Vons', purchaseType: 'Beverages', price: 3.5, qty: 6, fulfillment: 'delivery' },
  ];
  const a = await prog(users.ra2, 'PUT', { body: { id: progId, version, items, vendors: [{ vendor: 'Instacart - Vons', taxRate: 0, instacartFee: 3.99, tip: 5 }] } });
  assert.equal(a.status, 200); assert.equal(a.data.version, version + 1);
  assert.equal(a.data.budgetSummary.total, 20 + 21 + 3.99 + 5);
  assert.ok(a.data.warnings.some(w => w.rule === 'amazon_food'));
  const stale = await prog(users.ra1, 'PUT', { body: { id: progId, version, title: 'Overwrite attempt' } });
  assert.equal(stale.status, 409);
  version = a.data.version;
  const hist = await prog(users.ra1, 'GET', { q: { id: progId, history: '1' } });
  assert.ok(hist.data.some(h => h.by === 'ra2' && h.action === 'update'), 'history records who changed it');
  const h3 = await prog(users.ra3, 'GET', { q: { id: progId, history: '1' } }); assert.equal(h3.status, 403);
});

test('programs: submit validation → REC requests changes → RA resubmits → REC approves → schedule → evaluation', async () => {
  let r = await prog(users.ra1, 'PUT', { body: { action: 'status', id: progId, to: 'submitted' } });
  assert.equal(r.status, 422); assert.ok(r.data.missing.includes('Programming category'));
  const ev = new Date(Date.now() + 7 * 864e5).toISOString();
  r = await prog(users.ra1, 'PUT', { body: { id: progId, version, category: 'Health & Wellness', eventDate: ev, location: 'Courtyard', description: 'Synthetic', objectives: 'Residents learn X', estAttendance: 30 } });
  version = r.data.version;
  r = await prog(users.ra1, 'PUT', { body: { action: 'status', id: progId, to: 'submitted' } }); assert.equal(r.status, 200);
  assert.ok((await db.collection('reslife_notifications').find({ to: 'rec1' }).toArray()).length >= 1, 'REC notified');
  r = await prog(users.ra1, 'PUT', { body: { action: 'status', id: progId, to: 'approved' } }); assert.equal(r.status, 403, 'RA cannot approve');
  r = await prog(users.rec, 'PUT', { body: { action: 'status', id: progId, to: 'changes_requested' } }); assert.equal(r.status, 400, 'feedback required');
  r = await prog(users.rec, 'PUT', { body: { action: 'status', id: progId, to: 'changes_requested', comment: 'Move snacks off Amazon' } }); assert.equal(r.status, 200);
  const ntf = await db.collection('reslife_notifications').find({ to: 'ra1' }).toArray();
  assert.ok(ntf.some(n => /needs changes/.test(n.title) && /Move snacks/.test(n.message)), 'RA gets feedback');
  r = await prog(users.ra1, 'PUT', { body: { action: 'status', id: progId, to: 'submitted' } }); assert.equal(r.status, 200);
  r = await prog(users.rec, 'PUT', { body: { action: 'status', id: progId, to: 'approved', approvedBudget: 60 } }); assert.equal(r.status, 200);
  r = await prog(users.ra3, 'GET'); assert.ok(r.data.some(p => p.id === progId && p.status === 'approved'), 'approved programs are visible to staff calendar');
  r = await prog(users.rec, 'PUT', { body: { action: 'status', id: progId, to: 'scheduled' } }); assert.equal(r.status, 200);
  r = await prog(users.ra2, 'PUT', { body: { action: 'evaluation', id: progId, evaluation: { actualAttendance: 41, actualExpenses: 52.1, results: 'Good', feedback: 'Fun' } } });
  assert.equal(r.status, 200);
  const list = await prog(users.ra1, 'GET');
  const p = list.data.find(x => x.id === progId);
  assert.equal(p.evaluation.actualAttendance, 41); assert.equal(p.budgetSummary.approvedBudget, 60);
  version = p.version;
});

test('programs: material change by RA to a scheduled program triggers re-review; unrelated user blocked', async () => {
  let r = await prog(users.ra1, 'PUT', { body: { id: progId, version, location: 'Rooftop' } });
  assert.equal(r.status, 200); assert.equal(r.data.status, 'submitted');
  version = r.data.version;
  r = await prog(users.ra3, 'PUT', { body: { id: progId, version, title: 'Hijack' } }); assert.equal(r.status, 403);
  r = await prog(users.ra3, 'DELETE', { q: { id: progId } }); assert.equal(r.status, 403);
  r = await prog(users.outAdmin, 'PUT', { body: { id: progId, version, title: 'x' } }); assert.equal(r.status, 403, 'cross-property admin blocked');
});

test('programs: duplicate creates a fresh draft; legacy docs still load', async () => {
  const hidden = await prog(users.ra3, 'POST', { body: { action: 'duplicate', id: progId } });
  assert.equal(hidden.status, 404, 'cannot duplicate a program you cannot see (now back under review)');
  const d = await prog(users.ra2, 'POST', { body: { action: 'duplicate', id: progId } });
  assert.equal(d.status, 200); assert.equal(d.data.status, 'draft'); assert.equal(d.data.owner, 'ra2'); assert.equal(d.data.eventDate, null);
  assert.deepEqual(d.data.collaborators, []);
  assert.ok(d.data.items.every(i => i.status === 'planned'));
  await db.collection('reslife_programs').insertOne({ property: PROP, title: 'Legacy', type: 'passive', status: 'proposed', createdBy: 'ra1', shoppingList: [{ item: 'Markers', vendor: 'Target', price: 2, qty: 5 }], createdAt: '2025-01-01' });
  const l = await prog(users.rec, 'GET');
  const legacy = l.data.find(x => x.title === 'Legacy');
  assert.equal(legacy.status, 'submitted'); assert.equal(legacy.items.length, 1); assert.equal(legacy.budgetSummary.subtotal, 10);
});

test('programs: settings admin-only; attachments are auth-gated', async () => {
  let r = await prog(users.rec, 'PUT', { body: { action: 'settings', settings: { categories: ['X'] } } }); assert.equal(r.status, 403);
  r = await prog(users.adm, 'PUT', { body: { action: 'settings', settings: { categories: ['Academic Excellence', 'New Category'] } } }); assert.equal(r.status, 200);
  r = await prog(users.ra1, 'GET', { q: { settings: '1' } }); assert.deepEqual(r.data.settings.categories, ['Academic Excellence', 'New Category']);
  const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
  r = await prog(users.ra1, 'POST', { body: { action: 'upload', programId: progId, name: 'p.png', mime: 'image/png', data: png } }); assert.equal(r.status, 200);
  const fid = r.data.id;
  r = await prog(users.ra1, 'POST', { body: { action: 'upload', programId: progId, name: 'x.html', mime: 'text/html', data: png } }); assert.equal(r.status, 400);
  r = await prog(users.outsider, 'GET', { q: { file: fid } }); assert.equal(r.status, 403);
  r = await prog(users.ra2, 'GET', { q: { file: fid } }); assert.equal(r.status, 200);
});

// ---------------------------------------------------------------- safety records
let recId;
test('safety: RA cannot create or list; REC report is pending and never matches', async () => {
  let r = await saf(users.ra1, 'POST', { body: { action: 'report', name: 'Jordan Testcase' } }); assert.equal(r.status, 403);
  r = await saf(users.ra1, 'GET', { q: { list: '1' } }); assert.equal(r.status, 403);
  r = await saf(users.rec, 'GET', { q: { list: '1' } }); assert.equal(r.status, 403, 'REC cannot browse restriction list');
  r = await saf(users.rec, 'POST', { body: { action: 'report', name: 'Jordan Testcase', subjectType: 'guest' } });
  assert.equal(r.status, 200); assert.equal(r.data.status, 'pending_verification'); recId = r.data.id;
  r = await saf(users.ra1, 'POST', { body: { action: 'screen', guestName: 'Jordan Testcase' } });
  assert.equal(r.data.hits.length, 0, 'unverified reports do not match');
});

test('safety: activation requires documentation + attestation by admin', async () => {
  let r = await saf(users.rec, 'PUT', { body: { action: 'verify', id: recId, attest: true } }); assert.equal(r.status, 403);
  r = await saf(users.adm, 'PUT', { body: { action: 'verify', id: recId, attest: true } });
  assert.equal(r.status, 422); assert.ok(r.data.missing.includes('Reference / incident number'));
  const docs = { scope: 'entire_property', effectiveDate: '2026-01-01', authorizingDepartment: 'Synthetic Campus Safety', referenceNumber: 'TEST-001', verificationNote: 'Synthetic letter reviewed', raInstructions: 'Do not admit; call on-call REC.', operationalInstructions: 'Call Campus Safety at TEST.', identifyingNotes: 'Synthetic: approx 6ft' };
  r = await saf(users.adm, 'PUT', { body: Object.assign({ action: 'verify', id: recId, attest: false }, docs) }); assert.equal(r.status, 400);
  r = await saf(users.adm, 'PUT', { body: Object.assign({ action: 'verify', id: recId, attest: true }, docs) });
  assert.equal(r.status, 200); assert.equal(r.data.status, 'active'); assert.equal(r.data.verifiedBy, 'adm1');
  r = await saf(users.outAdmin, 'GET', { q: { id: recId } }); assert.equal(r.status, 403, 'no cross-property access');
});

test('safety: screening is role-projected; similar names flagged as possible only; clear names pass', async () => {
  let r = await saf(users.ra1, 'POST', { body: { action: 'screen', guestName: 'Jordon Testcase' } });
  assert.equal(r.data.hits.length, 1); assert.equal(r.data.hits[0].level, 'possible');
  assert.equal(r.data.hits[0].name, undefined, 'RA never sees the record name');
  assert.equal(r.data.hits[0].referenceNumber, undefined);
  assert.equal(r.data.hits[0].raInstructions, 'Do not admit; call on-call REC.');
  r = await saf(users.rec, 'POST', { body: { action: 'screen', guestName: 'Testcase, Jordan' } });
  assert.equal(r.data.hits[0].level, 'strong'); assert.equal(r.data.hits[0].name, 'Jordan Testcase'); assert.equal(r.data.hits[0].referenceNumber, 'TEST-001');
  r = await saf(users.ra1, 'POST', { body: { action: 'screen', guestName: 'Taylor Unrelated' } }); assert.equal(r.data.hits.length, 0);
  const notes = await db.collection('reslife_notifications').find({ type: 'safety' }).toArray();
  assert.ok(notes.length > 0); assert.ok(notes.every(n => !/Jordan|Testcase/i.test(n.title + n.message)), 'notifications contain no names');
});

test('guest workflow: staff entry with no match works normally; a match flags the entry for verification', async () => {
  const res = await db.collection('reslife_directory').insertOne({ property: PROP, residentName: 'Resident, Synthetic', unit: '1000-A', email: 'synthetic@example.test' });
  const resId = String(res.insertedId);
  let r = await gl(users.ra1, 'POST', { body: { residentId: resId, guestName: 'Casey Clearname', idType: 'State ID', notify: false } });
  assert.equal(r.status, 200); assert.equal(r.data.safetyReview, undefined); assert.equal(r.data.status, 'checked_in');
  r = await gl(users.ra1, 'POST', { body: { residentId: resId, guestName: 'Jordan Testcase', idType: 'State ID', notify: false } });
  assert.equal(r.status, 200, 'never auto-blocks'); assert.equal(r.data.safetyReview.required, true);
  assert.equal(r.data.safetyHits[0].name, undefined, 'RA projection only');
  const checks = await saf(users.rec, 'GET', { q: { checks: '1' } });
  const c = checks.data.find(x => x.guestLogId === r.data.id); assert.ok(c);
  let x = await saf(users.ra1, 'PUT', { body: { action: 'resolve', checkId: c.id, outcome: 'confirmed_match_escalated', note: 'n' } }); assert.equal(x.status, 403, 'RA cannot confirm a match');
  x = await saf(users.rec, 'PUT', { body: { action: 'resolve', checkId: c.id, outcome: 'not_match_id_verified' } }); assert.equal(x.status, 400, 'note required');
  x = await saf(users.rec, 'PUT', { body: { action: 'resolve', checkId: c.id, outcome: 'not_match_id_verified', note: 'ID shows different DOB (synthetic)' } }); assert.equal(x.status, 200);
  const g = await db.collection('reslife_guest_log').findOne({ _id: new ObjectId(r.data.id) });
  assert.equal(g.safetyReview.required, false); assert.equal(g.safetyReview.outcome, 'not_match_id_verified');
});

test('guest kiosk: public response unchanged; match flagged server-side only', async () => {
  await db.collection('reslife_guest_settings').insertOne({ property: PROP, kioskKey: 'k'.repeat(20) });
  const res = await db.collection('reslife_directory').findOne({ residentName: 'Resident, Synthetic' });
  const t = jwt.sign({ p: PROP, rid: String(res._id), name: 'Synthetic Resident', unit: '1000-A' }, 'dev-secret-change-me:guest-kiosk');
  const r = await kiosk({ httpMethod: 'POST', body: JSON.stringify({ action: 'checkin', token: t, guestName: 'Jordan Testcase', guestPhone: '555-0100', idType: 'State ID', idPhoto: 'data:image/jpeg;base64,' + 'A'.repeat(200), duration: '2h' }) });
  const data = JSON.parse(r.body);
  assert.equal(r.statusCode, 200); assert.equal(data.ok, true);
  assert.ok(!/restrict|verif|safety/i.test(r.body), 'kiosk discloses nothing');
  const g = await db.collection('reslife_guest_log').findOne({ guestName: 'Jordan Testcase', source: 'kiosk' });
  assert.equal(g.safetyReview.required, true);
});

test('safety: expired and revoked restrictions stop matching; access is audited', async () => {
  const r2 = await saf(users.adm, 'POST', { body: { action: 'create', name: 'Morgan Expiring', scope: 'entire_property' } });
  await saf(users.adm, 'PUT', { body: { action: 'verify', id: r2.data.id, attest: true, effectiveDate: '2025-01-01', expiresAt: '2025-06-01', authorizingDepartment: 'Synthetic', referenceNumber: 'T-2', verificationNote: 'synthetic', scope: 'entire_property' } });
  // verify sets active; expiration date in the past → lazily expired on next request
  let r = await saf(users.ra1, 'POST', { body: { action: 'screen', guestName: 'Morgan Expiring' } }); assert.equal(r.data.hits.length, 0);
  const stored = await db.collection('reslife_safety_records').findOne({ _id: new ObjectId(r2.data.id) }); assert.equal(stored.status, 'expired');
  r = await saf(users.adm, 'PUT', { body: { action: 'status', id: recId, to: 'revoked' } }); assert.equal(r.status, 400, 'reason required');
  r = await saf(users.adm, 'PUT', { body: { action: 'status', id: recId, to: 'revoked', note: 'Synthetic revoke' } }); assert.equal(r.status, 200);
  r = await saf(users.rec, 'POST', { body: { action: 'screen', guestName: 'Jordan Testcase' } }); assert.equal(r.data.hits.length, 0);
  const log = await saf(users.adm, 'GET', { q: { audit: '1' } });
  const actions = log.data.map(a => a.action);
  for (const a of ['create', 'verify', 'status', 'guest-check-hit', 'resolve-check', 'list-checks']) assert.ok(actions.includes(a), 'audited: ' + a);
  assert.ok(log.data.every(a => !/Jordan|Testcase|Morgan/i.test(JSON.stringify(a))), 'audit log holds no names');
  r = await saf(users.rec, 'GET', { q: { audit: '1' } }); assert.equal(r.status, 403);
});

// ---------------------------------------------------------------- accommodations
let resA;
test('accommodations: RA blocked; admin records approval with verification; REC sees limited view', async () => {
  resA = String((await db.collection('reslife_directory').insertOne({ property: PROP, residentName: 'Example, Avery', unit: '1001-A' })).insertedId);
  let r = await acc(users.ra1, 'GET', { q: { residentId: resA } }); assert.equal(r.status, 403);
  r = await acc(users.rec, 'POST', { body: { action: 'save', residentId: resA, category: 'esa', status: 'approved' } }); assert.equal(r.status, 403);
  r = await acc(users.adm, 'POST', { body: { action: 'save', residentId: resA, category: 'esa', status: 'approved' } });
  assert.equal(r.status, 422, 'approval needs verifying dept + date');
  r = await acc(users.adm, 'POST', { body: { action: 'save', residentId: resA, category: 'esa', status: 'approved', verifyingDepartment: 'Synthetic Dept', lastVerifiedAt: '2026-09-01', operationalNotes: 'Diagnosed anxiety' } });
  assert.equal(r.status, 422, 'medical content rejected');
  r = await acc(users.adm, 'POST', { body: { action: 'save', residentId: resA, category: 'esa', status: 'approved', verifyingDepartment: 'Synthetic Dept', lastVerifiedAt: '2026-09-01', verificationRef: 'REF-1', operationalNotes: 'Approved ESA: one cat' } });
  assert.equal(r.status, 200); assert.equal(r.data.records[0].verifyingDepartment, 'Synthetic Dept');
  r = await acc(users.rec, 'GET', { q: { residentId: resA } });
  assert.equal(r.data.access, 'limited'); assert.deepEqual(Object.keys(r.data.records[0]).sort(), ['category', 'effectiveStatus', 'operationalNotes']);
  assert.equal(r.headers['Cache-Control'], 'no-store');
  r = await acc(users.outAdmin, 'GET', { q: { residentId: resA } }); assert.equal(r.status, 403);
  r = await acc(users.rec, 'GET', { q: { summary: '1' } }); assert.equal(r.status, 403, 'directory filter data is admin-only');
  r = await acc(users.adm, 'GET', { q: { summary: '1' } }); assert.equal(r.data[0].status, 'approved');
  const sv = await db.collection('reslife_accommodations').find({}).toArray(); assert.equal(sv.length, 1, 'service animal stays separate (not created)');
});

test('accommodations: import dry run, validation, no silent overwrite, commit, rollback', async () => {
  const resB = String((await db.collection('reslife_directory').insertOne({ property: PROP, residentName: 'Sample, Blake', unit: '1002-A' })).insertedId);
  const otherRes = String((await db.collection('reslife_directory').insertOne({ property: OTHER, residentName: 'Elsewhere, Cam', unit: '1' })).insertedId);
  const rows = [
    { residentId: resB, category: 'housing_accommodation', status: 'approved', verifyingDepartment: 'Synthetic', lastVerifiedAt: '2026-09-02' },
    { residentId: 'not-a-real-id', category: 'esa', status: 'approved', verifyingDepartment: 'x', lastVerifiedAt: '2026-09-02' },
    { residentId: otherRes, category: 'esa', status: 'approved', verifyingDepartment: 'x', lastVerifiedAt: '2026-09-02' },
    { residentId: resA, category: 'esa', status: 'revoked' },
  ];
  let r = await acc(users.adm, 'POST', { body: { action: 'import', rows } });
  assert.equal(r.data.dryRun, true); assert.equal(r.data.summary.error, 2); assert.equal(r.data.summary.conflict, 1); assert.equal(r.data.summary.create, 1);
  assert.equal(await db.collection('reslife_accommodations').countDocuments({ property: PROP }), 1, 'dry run wrote nothing');
  r = await acc(users.adm, 'POST', { body: { action: 'import', rows, dryRun: false } }); assert.equal(r.status, 422, 'errors block commit');
  const good = [rows[0], { residentId: resA, category: 'esa', status: 'revoked' }];
  r = await acc(users.adm, 'POST', { body: { action: 'import', rows: good, dryRun: false, overwrite: true } });
  assert.equal(r.status, 200); assert.equal(r.data.summary.create, 1); assert.equal(r.data.summary.conflict, 1, 'incomplete row cannot overwrite');
  const esa = await db.collection('reslife_accommodations').findOne({ residentId: resA, category: 'esa' }); assert.equal(esa.status, 'approved');
  r = await acc(users.adm, 'POST', { body: { action: 'rollback', batchId: r.data.batchId } }); assert.equal(r.data.removed, 1);
  assert.equal(await db.collection('reslife_accommodations').countDocuments({ residentId: resB }), 0);
  r = await acc(users.ra1, 'POST', { body: { action: 'import', rows: good, dryRun: true } }); assert.equal(r.status, 403);
});
