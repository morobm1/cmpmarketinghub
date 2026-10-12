// Conduct Meeting Notes — API, permissions, autosave, submission, amendments and official documents.
// Synthetic test data only. Run: node --test --experimental-test-module-mocks tests/conduct/
import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import JSZip from 'jszip';
import { fakeMongo, ObjectId } from '../reslife/fake-mongo.mjs';

const db = fakeMongo();
mock.module(new URL('../../netlify/functions/_db.js', import.meta.url).href, { namedExports: { getDb: async () => db, ObjectId } });
const { handler } = await import('../../netlify/functions/reslife-conduct.js');
const C = await import('../../netlify/functions/_conduct.js');

const PROP = 'Test Harbour', OTHER = 'Other Property';
const users = {
  rec: { username: 'rec1', fullName: 'Test REC', role: 'reslife-rec', properties: [PROP] },
  rec2: { username: 'rec2', fullName: 'Test REC Two', role: 'reslife-rec', properties: [PROP] },
  adm: { username: 'adm1', fullName: 'Test Reslife Admin', role: 'reslife-admin', properties: [PROP] },
  site: { username: 'site1', fullName: 'Site Admin', role: 'admin', properties: '*' },
  ra: { username: 'ra1', fullName: 'Test RA', role: 'reslife-ra', properties: [PROP] },
  mkt: { username: 'mkt1', fullName: 'Marketing', role: 'user', properties: [PROP] },
  otherRec: { username: 'rec9', fullName: 'Other REC', role: 'reslife-rec', properties: [OTHER] },
};
for (const u of Object.values(users)) await db.collection('users').insertOne(u);
const r1 = { property: PROP, residentName: 'Testperson, Alpha', unit: '9999-A', room: '9999-A' };
const r2 = { property: PROP, residentName: 'Testperson, Beta', unit: '' };
await db.collection('reslife_directory').insertOne(r1);
await db.collection('reslife_directory').insertOne(r2);
const R1 = String(r1._id), R2 = String(r2._id);

const tok = u => jwt.sign({ sub: u.username, role: u.role, properties: u.properties }, 'dev-secret-change-me');
const call = async (u, method, { q = {}, body } = {}) => {
  const r = await handler({ httpMethod: method, headers: u ? { authorization: 'Bearer ' + tok(u) } : {}, queryStringParameters: Object.assign({ property: PROP }, q), body: body ? JSON.stringify(Object.assign({ property: PROP }, body)) : undefined });
  let data = r.body; try { data = JSON.parse(r.body); } catch (e) { /* binary */ }
  return { status: r.statusCode, data, headers: r.headers || {}, raw: r };
};
const base = () => ({ residentId: R1, incidentViolation: 'TEST quiet hours', meetingDateTime: '2026-10-12T14:30', noticeDate: '2026-10-01', staffPresent: [{ name: 'Test REC', username: 'rec1' }] });

test('only REC / ADMIN may use the module; RA, other roles, other properties and anonymous are blocked', async () => {
  for (const u of [users.rec, users.adm, users.site]) assert.equal((await call(u, 'GET')).status, 200, u.username);
  assert.equal((await call(null, 'GET')).status, 401);
  for (const u of [users.ra, users.mkt, users.otherRec]) {
    assert.equal((await call(u, 'GET')).status, 403, u.username);
    assert.equal((await call(u, 'POST', { body: { action: 'create' } })).status, 403);
  }
});

test('create pre-fills staff; resident snapshot comes from the directory; missing bedspace is flagged, not invented', async () => {
  const c = await call(users.rec, 'POST', { body: { action: 'create' } });
  assert.equal(c.status, 201);
  assert.deepEqual(c.data.data.staffPresent, [{ name: 'Test REC', username: 'rec1' }]);
  const s = await call(users.rec, 'PUT', { body: { id: c.data.id, seq: 1, data: Object.assign(base(), { residentName: 'Typed Wrong Name' }) } });
  assert.equal(s.data.ok, true);
  assert.equal(s.data.data.residentName, 'Alpha Testperson');
  assert.equal(s.data.data.bedspace, '9999-A');
  assert.equal(s.data.data.bedspaceSource, 'directory');
  const c2 = await call(users.rec, 'POST', { body: { action: 'create' } });
  const s2 = await call(users.rec, 'PUT', { body: { id: c2.data.id, seq: 1, data: Object.assign(base(), { residentId: R2 }) } });
  assert.equal(s2.data.data.bedspace, '');
  assert.equal(s2.data.data.bedspaceNeedsReview, true);
});

test('autosave: newer sequence wins, older requests never overwrite, checkboxes and line breaks persist', async () => {
  const c = await call(users.rec, 'POST', { body: { action: 'create' } });
  const id = c.data.id;
  const text = 'Resident said: "I disagree."\n\nSecond paragraph.';
  assert.equal((await call(users.rec, 'PUT', { body: { id, seq: 200, lastStep: 3, data: Object.assign(base(), { residentResponse: text, education: [C.EDUCATION[1], 'Made-up item'] }) } })).data.ok, true);
  const stale = await call(users.rec, 'PUT', { body: { id, seq: 100, data: Object.assign(base(), { residentResponse: 'old' }) } });
  assert.equal(stale.data.stale, true);
  const g = await call(users.rec, 'GET', { q: { id } });
  assert.equal(g.data.data.residentResponse, text);
  assert.deepEqual(g.data.data.education, [C.EDUCATION[1]]);
  assert.equal(g.data.lastStep, 3);
});

test('over-long text is refused, never truncated', async () => {
  const c = await call(users.rec, 'POST', { body: { action: 'create' } });
  const r = await call(users.rec, 'PUT', { body: { id: c.data.id, seq: 1, data: Object.assign(base(), { residentResponse: 'x'.repeat(C.LIMITS.longText + 1) }) } });
  assert.equal(r.status, 422);
});

test('drafts are private to creator + admin tier', async () => {
  const c = await call(users.rec, 'POST', { body: { action: 'create' } });
  assert.equal((await call(users.rec2, 'GET', { q: { id: c.data.id } })).status, 404);
  assert.ok(!(await call(users.rec2, 'GET')).data.some(m => m.id === c.data.id));
  assert.equal((await call(users.adm, 'GET', { q: { id: c.data.id } })).status, 200);
});

test('submit validates required fields; a no-show with no education items is allowed', async () => {
  const c = await call(users.rec, 'POST', { body: { action: 'create' } });
  const bad = await call(users.rec, 'POST', { body: { action: 'submit', id: c.data.id } });
  assert.equal(bad.status, 422);
  assert.ok(bad.data.missing.some(m => m.startsWith('Resident')) && bad.data.missing.includes('Incident / Violation') && bad.data.missing.includes('Meeting Date / Time'));
  const ok = await call(users.rec, 'POST', { body: { action: 'submit', id: c.data.id, data: Object.assign(base(), { outcomes: ['Resident no-show - outreach required'] }) } });
  assert.equal(ok.status, 200); assert.equal(ok.data.status, 'submitted');
});

let SUBMITTED;
test('submit generates DOCX + PDF, is idempotent, links to the resident and locks the record', async () => {
  const c = await call(users.rec, 'POST', { body: { action: 'create' } });
  const id = c.data.id;
  await call(users.rec, 'PUT', { body: { id, seq: 5, data: Object.assign(base(), { routing: [C.ROUTING[1]], outcomes: [C.OUTCOMES[1]], closeout: [C.CLOSEOUT[0]], residentResponse: 'Line one\nLine two', followUpDate: '2026-10-20' }) } });
  const [a, b] = await Promise.all([call(users.rec, 'POST', { body: { action: 'submit', id } }), call(users.rec, 'POST', { body: { action: 'submit', id } })]);
  assert.ok([a.status, b.status].every(s => s === 200 || s === 409));
  assert.equal(await db.collection('reslife_conduct_versions').countDocuments({ meetingId: id }), 1, 'double submit creates one version');
  assert.equal(await db.collection('reslife_conduct_files').countDocuments({ meetingId: id }), 2);
  const again = await call(users.rec, 'POST', { body: { action: 'submit', id } });
  assert.equal(again.data.alreadySubmitted, true);
  const edit = await call(users.rec, 'PUT', { body: { id, seq: 99, data: base() } });
  assert.equal(edit.status, 409, 'submitted records cannot be autosaved over');
  const prof = await call(users.rec2, 'GET', { q: { residentId: R1 } });
  assert.ok(prof.data.some(m => m.id === id), 'appears on the resident profile for another REC');
  assert.equal((await call(users.ra, 'GET', { q: { residentId: R1 } })).status, 403);
  const docx = await call(users.rec, 'GET', { q: { id, file: 'docx' } });
  assert.equal(docx.status, 200); assert.equal(docx.headers['Cache-Control'], 'private, no-store');
  const zip = await JSZip.loadAsync(Buffer.from(docx.raw.body, 'base64'));
  const xml = await zip.file('word/document.xml').async('string');
  assert.ok(xml.includes('Alpha Testperson') && xml.includes('[X] Potential BP/AP 5500 - OCC referral') && xml.includes('[X] Follow-up required') && xml.includes('[ ] Repeat / pattern review') && xml.includes('[X] Entrata updated'));
  assert.ok(xml.includes(C.DOC_NOTE));
  const pdf = await call(users.rec, 'GET', { q: { id, file: 'pdf' } });
  assert.equal(Buffer.from(pdf.raw.body, 'base64').subarray(0, 5).toString(), '%PDF-');
  assert.equal((await call(users.ra, 'GET', { q: { id, file: 'pdf' } })).status, 403);
  assert.equal((await call(users.otherRec, 'GET', { q: { id, file: 'pdf' }, })).status, 403);
  SUBMITTED = id;
});

test('amendment needs a reason, keeps the original version and records who changed what', async () => {
  const id = SUBMITTED;
  const cur = (await call(users.rec, 'GET', { q: { id } })).data;
  const data = Object.assign({}, cur.data, { residentResponse: cur.data.residentResponse + '\nCorrection: date clarified.' });
  assert.equal((await call(users.adm, 'POST', { body: { action: 'amend', id, data, reason: '' } })).status, 422);
  const a = await call(users.adm, 'POST', { body: { action: 'amend', id, data, reason: 'Clarify meeting notes per follow-up' } });
  assert.equal(a.status, 200); assert.equal(a.data.status, 'amended'); assert.equal(a.data.documentVersion, 2);
  const h = (await call(users.rec, 'GET', { q: { id, history: 1 } })).data;
  assert.equal(h.versions.length, 2);
  assert.equal(h.versions[0].data.residentResponse, 'Line one\nLine two', 'original preserved');
  assert.equal(h.versions[1].by, 'adm1');
  assert.ok(h.versions[1].changes.some(c => c.field === 'residentResponse'));
  assert.ok(h.audit.some(e => e.action === 'amended' && e.by === 'adm1'));
  const v1 = await call(users.rec, 'GET', { q: { id, file: 'docx', version: 1 } });
  assert.equal(v1.status, 200, 'v1 document still downloadable');
});

test('failed document generation leaves the record as a draft', async () => {
  const c = await call(users.rec, 'POST', { body: { action: 'create' } });
  process.env.CONDUCT_TEMPLATE_PATH = new URL('./conduct.test.mjs', import.meta.url).pathname.replace(/^\/(\w:)/, '$1');
  try {
    await assert.rejects(C.loadTemplate(), /does not match/);
    const r = await call(users.rec, 'POST', { body: { action: 'submit', id: c.data.id, data: base() } });
    assert.equal(r.status, 500);
    assert.match(r.data.error, /NOT submitted/);
  } finally { delete process.env.CONDUCT_TEMPLATE_PATH; }
  const g = await call(users.rec, 'GET', { q: { id: c.data.id } });
  assert.equal(g.data.status, 'draft');
  assert.equal(await db.collection('reslife_conduct_files').countDocuments({ meetingId: c.data.id }), 0);
  assert.equal(await db.collection('reslife_conduct_versions').countDocuments({ meetingId: c.data.id }), 0);
  const r2 = await call(users.rec, 'POST', { body: { action: 'submit', id: c.data.id } });
  assert.equal(r2.data.status, 'submitted', 'recovers once generation works');
});

test('document mapping: every blank, box and the response box are filled; long text is complete', async () => {
  const long = Array.from({ length: 150 }, (_, i) => `Statement line ${i + 1}`).join('\n');
  const d = Object.assign(C.emptyData(), base(), { residentName: 'Alpha Testperson', bedspace: '9999-A', residentResponse: long, education: C.EDUCATION, assignedActionNotes: 'A\nB' });
  const zip = await JSZip.loadAsync(await C.buildDocx(d, { meetingId: 'T' }));
  const xml = await zip.file('word/document.xml').async('string');
  assert.ok(!/_{5,}/.test(xml.split('Follow-up date')[0]), 'resident info blanks all filled');
  for (let i = 1; i <= 150; i++) assert.ok(xml.includes(`Statement line ${i}<`), 'line ' + i);
  assert.equal((xml.match(/\[X\] /g) || []).length, C.EDUCATION.length);
  for (const s of ['RESIDENT ACCOUNTABILITY MEETING RECORD', 'Routing', 'Closeout']) assert.ok(xml.includes(s));
  const tmpl = await JSZip.loadAsync(await C.loadTemplate());
  for (const p of ['word/header1.xml', 'word/footer1.xml', 'word/styles.xml', 'word/media/image1.png']) {
    assert.equal(await zip.file(p).async('base64'), await tmpl.file(p).async('base64'), p + ' unchanged');
  }
  const pdf = await C.renderPdf(d, { meetingId: 'T' });
  assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
  const blankPdf = await C.renderPdf(C.emptyData(), {});
  assert.equal((blankPdf.toString('latin1').match(/\/Type \/Page[^s]/g) || []).length, 2, 'ordinary record = 2 pages');
});
