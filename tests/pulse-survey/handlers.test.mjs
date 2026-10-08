import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { fakeDb } from './fake-db.mjs';

process.env.APP_BASE_URL = 'https://cmpmarketinghub.netlify.app';
globalThis.__PULSE_TEST_DB__ = fakeDb();
const db = globalThis.__PULSE_TEST_DB__;
const { handler: admin } = await import('../../netlify/functions/pulse-survey.js');
const { handler: pub } = await import('../../netlify/functions/pulse-survey-public.js');
const E = await import('../../pulse-survey/engine.js');

const tok = (u) => jwt.sign(u, 'dev-secret-change-me');
const ADMIN = tok({ sub: 'morobm1', role: 'admin', properties: '*' });
const call = async (action, body = {}, token = ADMIN, extraHeaders = {}) => {
  const r = await admin({ httpMethod: 'POST', headers: { cookie: `mmp_token=${token}`, 'x-pulse-request': '1', ...extraHeaders }, body: JSON.stringify({ action, ...body }) });
  return { status: r.statusCode, ...JSON.parse(r.body) };
};
let ipN = 0;
const pubGet = async (id, part) => { const r = await pub({ httpMethod: 'GET', headers: {}, queryStringParameters: { id, part } }); return { status: r.statusCode, ...JSON.parse(r.body) }; };
const pubPost = async (body, ip) => { const r = await pub({ httpMethod: 'POST', headers: { 'x-nf-client-connection-ip': ip || `10.0.0.${++ipN}` }, body: JSON.stringify(body) }); return { status: r.statusCode, ...JSON.parse(r.body) }; };
const sid = () => 'sub_' + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);

test('auth: unauthenticated, reslife and other-property users are rejected; CSRF header required', async () => {
  const r = await admin({ httpMethod: 'POST', headers: {}, body: '{"action":"list"}' });
  assert.equal(r.statusCode, 401);
  assert.equal((await call('list', {}, tok({ sub: 'ra', role: 'reslife-ra', properties: ['ivory-university-house'] }))).status, 403);
  assert.equal((await call('list', {}, tok({ sub: 'x', role: 'user', properties: ['harbour-occ'] }))).status, 403);
  assert.equal((await call('list', {}, tok({ sub: 'm', role: 'user', properties: ['ivory-university-house'] }))).status, 200);
  const noHdr = await admin({ httpMethod: 'POST', headers: { cookie: `mmp_token=${ADMIN}` }, body: '{"action":"list"}' });
  assert.equal(noHdr.statusCode, 403);
});

test('bootstrap seeds the Fall 2026 draft exactly once and never publishes it', async () => {
  await call('bootstrap'); await call('bootstrap');
  const { surveys } = await call('list');
  const seeded = surveys.filter((s) => s.settings.title === 'Fall 2026 Resident Experience Pulse Survey');
  assert.equal(seeded.length, 1); assert.equal(seeded[0].status, 'draft'); assert.equal(seeded[0].currentVersion, 0);
  assert.equal((await pubGet(seeded[0].publicId)).state, 'unavailable', 'drafts are not public');
  const t = await call('listTemplates'); assert.ok(t.templates.length >= 1);
});

test('full lifecycle: build → publish → submit → edit → republish → close/reopen → duplicate → analytics/CSV/compare', async () => {
  // 1. blank survey with every question type
  const { survey } = await call('create', { mode: 'blank', settings: { title: 'QA Survey', category: 'Custom Survey', eligibleCount: 50 } });
  const g = await call('get', { surveyId: survey.id });
  const def = g.survey.draft; const s1 = def.sections[0].id;
  for (const t of Object.keys(E.QUESTION_TYPES)) { const q = E.defaultQuestion(t, s1); q.text = `Question ${t}`; q.id = 'q_' + t; def.questions.push(q); }
  def.questions.find((q) => q.id === 'q_single').required = true;
  // conditional: show 'long' only if yesno = yes
  def.questions.find((q) => q.id === 'q_long').logic = { match: 'all', conditions: [{ questionId: 'q_yesno', operator: 'anyOf', values: ['yes'] }] };
  // reorder: move date to top
  const di = def.questions.findIndex((q) => q.id === 'q_date'); const [dq] = def.questions.splice(di, 1); def.questions.unshift(dq);
  const yi = def.questions.findIndex((q) => q.id === 'q_yesno'); const [yq] = def.questions.splice(yi, 1); def.questions.splice(1, 0, yq);
  let save = await call('saveDraft', { surveyId: survey.id, draftRev: g.survey.draftRev, definition: def });
  assert.equal(save.status, 200);
  const stale = await call('saveDraft', { surveyId: survey.id, draftRev: g.survey.draftRev, definition: def });
  assert.equal(stale.status, 409, 'optimistic concurrency');
  const reopened = await call('get', { surveyId: survey.id });
  assert.equal(reopened.survey.draft.questions[0].id, 'q_date'); assert.equal(reopened.survey.draft.questions.length, 11);

  // 2. publish
  const pc = await call('publishCheck', { surveyId: survey.id }); assert.deepEqual(pc.validation.errors, []);
  const p1 = await call('publish', { surveyId: survey.id });
  assert.equal(p1.version, 1);
  const url1 = `${p1.publicBaseUrl}/survey/${p1.publicId}`;
  assert.equal(url1.startsWith('https://cmpmarketinghub.netlify.app/survey/'), true);

  // 3. public load + submit without auth
  const pg = await pubGet(p1.publicId); assert.equal(pg.state, 'open'); assert.equal(pg.version.version, 1);
  assert.equal(pg.survey.anonymous, true);
  assert.equal(pg.survey.description, undefined, 'internal description not exposed');
  const brand = await pubGet(p1.publicId, 'brand'); assert.equal(brand.brand.name, 'Ivory University House');
  const ans = { q_single: def.questions.find((q) => q.id === 'q_single').choices[0].id, q_yesno: 'no', q_long: 'should be dropped', q_rating: '4', q_short: 'hello' };
  const sub1 = sid();
  let r = await pubPost({ action: 'submit', id: p1.publicId, version: 1, answers: ans, submissionId: sub1 });
  assert.equal(r.status, 200, JSON.stringify(r));
  r = await pubPost({ action: 'submit', id: p1.publicId, version: 1, answers: ans, submissionId: sub1 });
  assert.equal(r.duplicate, true, 'idempotent resubmission');
  r = await pubPost({ action: 'submit', id: p1.publicId, version: 1, answers: { q_yesno: 'yes' }, submissionId: sid() });
  assert.equal(r.status, 422, 'required validation server-side');
  const stored = db.collection('pulse_responses').docs;
  assert.equal(stored.length, 1);
  assert.equal(stored[0].answers.q_long, undefined, 'hidden conditional answer not stored');
  assert.deepEqual(Object.keys(stored[0]).sort(), ['_id', 'answers', 'other', 'propertyId', 'seq', 'status', 'submissionId', 'submittedAt', 'surveyId', 'version'].sort(), 'no IP/user agent/identity stored');
  assert.ok(!JSON.stringify(db.collection('pulse_rate').docs).includes('10.0.0.'), 'raw IPs never stored');

  // 4. edit published survey (significant change) → republish keeps link
  const g2 = await call('get', { surveyId: survey.id });
  const d2 = g2.survey.draft; d2.questions.find((q) => q.id === 'q_single').choices.push({ id: 'c_new', label: 'New option' });
  await call('saveDraft', { surveyId: survey.id, draftRev: g2.survey.draftRev, definition: d2 });
  const needAck = await call('publish', { surveyId: survey.id });
  assert.equal(needAck.status, 409); assert.ok(needAck.needsAck);
  const p2 = await call('publish', { surveyId: survey.id, acknowledgeSignificant: true });
  assert.equal(p2.version, 2); assert.equal(p2.publicId, p1.publicId, 'public link unchanged');
  assert.equal((await pubGet(p1.publicId)).version.version, 2);
  // in-progress respondent on v1 may still finish (grace window)
  r = await pubPost({ action: 'submit', id: p1.publicId, version: 1, answers: ans, submissionId: sid() });
  assert.equal(r.status, 200);
  r = await pubPost({ action: 'submit', id: p1.publicId, version: 2, answers: { ...ans, q_single: 'c_new' }, submissionId: sid() });
  assert.equal(r.status, 200);
  const versions = db.collection('pulse_responses').docs.map((x) => x.version).sort();
  assert.deepEqual(versions, [1, 1, 2], 'earlier responses keep their version');
  assert.equal(db.collection('pulse_survey_versions').docs.find((v) => v.version === 1).definition.questions.find((q) => q.id === 'q_single').choices.length, 2, 'v1 snapshot immutable');

  // 5. close → reopen
  await call('setStatus', { surveyId: survey.id, status: 'closed' });
  assert.equal((await pubGet(p1.publicId)).state, 'closed');
  r = await pubPost({ action: 'submit', id: p1.publicId, version: 2, answers: ans, submissionId: sid() });
  assert.equal(r.status, 409);
  await call('setStatus', { surveyId: survey.id, status: 'published' });
  assert.equal((await pubGet(p1.publicId)).state, 'open');
  await call('setStatus', { surveyId: survey.id, status: 'paused' });
  assert.equal((await pubGet(p1.publicId)).state, 'paused');
  await call('setStatus', { surveyId: survey.id, status: 'published' });

  // 6. duplicate
  const dup = await call('duplicate', { surveyId: survey.id });
  assert.notEqual(dup.survey.publicId, p1.publicId); assert.equal(dup.survey.status, 'draft'); assert.equal(dup.survey.responseCount, 0);
  const dg = await call('get', { surveyId: dup.survey.id });
  assert.ok(dg.survey.draft.questions.find((q) => q.id === 'q_long').logic, 'logic copied');

  // 7. analytics, responses, CSV, compare, reports, actions
  const an = await call('analytics', { surveyId: survey.id });
  assert.equal(an.analytics.total, 3);
  const singles = an.analytics.questions.find((x) => x.question.id === 'q_single');
  assert.equal(singles.drift, true, 'scoring/structure drift flagged across versions');
  const seg = await call('analytics', { surveyId: survey.id, filter: { questionId: 'q_yesno', values: ['no'] } });
  assert.equal(seg.analytics.suppressed, true, 'small segments suppressed');
  const lr = await call('responses', { surveyId: survey.id, page: 1 }); assert.equal(lr.total, 3);
  const csv = await admin({ httpMethod: 'GET', headers: { cookie: `mmp_token=${ADMIN}` }, queryStringParameters: { action: 'export', surveyId: survey.id } });
  assert.equal(csv.statusCode, 200); assert.match(csv.headers['Content-Type'], /text\/csv/);
  assert.equal(csv.body.trim().split('\r\n').length, 4);
  const csvNo = await admin({ httpMethod: 'GET', headers: {}, queryStringParameters: { action: 'export', surveyId: survey.id } });
  assert.equal(csvNo.statusCode, 401, 'unauthorized export blocked');
  const cmp = await call('compare', { surveyIds: [survey.id, dup.survey.id] }); assert.ok(cmp.comparison.rows);
  const rep = await call('saveReport', { name: 'Snap', type: 'survey', surveyIds: [survey.id], summary: { analytics: an.analytics } });
  assert.equal((await call('getReport', { id: rep.id })).report.name, 'Snap');
  const act = await call('saveAction', { surveyId: survey.id, item: { priority: 'High', feedback: 'Wi-Fi', action: 'Upgrade AP', status: 'Approved' } });
  assert.equal((await call('listActions', { surveyId: survey.id })).actions[0]._id, act.id);
  const dash = await call('dashboard'); assert.equal(dash.totals.responses, 3);
});

test('public endpoint rejects invalid ids and exposes no admin data', async () => {
  assert.equal((await pubGet('../../etc')).status, 404);
  assert.equal((await pubGet('ZZZZZZZZZZZZ')).status, 404);
  const r = await pubPost({ action: 'responses', id: 'ZZZZZZZZZZZZ' }); assert.equal(r.status, 404);
});

test('rate limiting kicks in per connection without storing IPs', async () => {
  const { surveys } = await call('list');
  const s = surveys.find((x) => x.settings.title === 'QA Survey');
  let last;
  for (let i = 0; i < 16; i++) last = await pubPost({ action: 'submit', id: s.publicId, version: s.currentVersion, answers: {}, submissionId: sid() }, '192.168.9.9');
  assert.equal(last.status, 429);
});
