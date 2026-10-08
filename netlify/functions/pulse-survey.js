import { verifyReqAuth } from './_auth.js';
import {
  getDb, json, C, PROPERTY_ID, canAccessIUH, publicBaseUrl, randomToken, getBrand, ensureIndexes,
  surveyState, parseBody, csvCell,
} from './_pulse.js';
import {
  sanitizeDefinition, validateDefinition, diffDefinitions, computeSurveyAnalytics, compareSurveys,
  orderedQuestions, answerToText, emptyDefinition, cloneDefinition, SURVEY_CATEGORIES, SMALL_GROUP_MIN, localDateKey,
} from '../../pulse-survey/engine.js';
import { fall2026Definition, fall2026Settings, SEED_KEY } from '../../pulse-survey/seed.js';

/**
 * Netlify Function: pulse-survey  (AUTHENTICATED – IUH staff only)
 *
 * POST /api/pulse-survey  { action, ... }   – all management operations
 * GET  /api/pulse-survey?action=export&surveyId=…  – CSV export
 *
 * CSRF: the staff cookie is SameSite=Strict, and every POST must also carry
 * the custom header `X-Pulse-Request: 1`, which cross-site forms cannot send.
 */
const MAX_RESPONSES_ANALYZED = 20000;

const str = (v, max = 500) => (v == null ? '' : String(v)).slice(0, max);
const dateOrNull = (v) => { if (!v) return null; const d = new Date(v); return isNaN(d) ? null : d.toISOString(); };

export function sanitizeSettings(raw = {}, prev = {}) {
  const s = { ...prev };
  const set = (k, v) => { if (raw[k] !== undefined) s[k] = v; };
  set('title', str(raw.title, 300).trim() || 'Untitled survey');
  set('description', str(raw.description, 2000));
  set('category', SURVEY_CATEGORIES.includes(raw.category) ? raw.category : 'Custom Survey');
  set('academicYear', str(raw.academicYear, 40));
  set('term', str(raw.term, 80));
  set('audience', str(raw.audience, 200));
  set('openAt', dateOrNull(raw.openAt));
  set('closeAt', dateOrNull(raw.closeAt));
  set('intro', str(raw.intro, 5000));
  set('thankYou', str(raw.thankYou, 3000));
  set('anonymous', raw.anonymous !== false);
  set('estimatedMinutes', str(raw.estimatedMinutes, 20));
  set('eligibleCount', (() => { const n = parseInt(raw.eligibleCount, 10); return Number.isFinite(n) && n > 0 ? n : null; })());
  if (raw.followUp !== undefined) s.followUp = { enabled: !!(raw.followUp && raw.followUp.enabled), label: str(raw.followUp && raw.followUp.label, 200) || 'Interested in discussing your renewal options? Request information.' };
  if (!s.title) s.title = 'Untitled survey';
  if (s.anonymous === undefined) s.anonymous = true;
  return s;
}

function summarize(s) {
  return {
    id: s._id, publicId: s.publicId, status: s.status, settings: s.settings,
    currentVersion: s.currentVersion || 0, publishedAt: s.publishedAt || null,
    hasUnpublishedChanges: !!s.hasUnpublishedChanges, responseCount: s.responseCount || 0,
    lastResponseAt: s.lastResponseAt || null, createdAt: s.createdAt, updatedAt: s.updatedAt,
    createdBy: s.createdBy, updatedBy: s.updatedBy, state: surveyState(s),
  };
}

async function newSurveyDoc(db, user, settings, definition, extra = {}) {
  const now = new Date().toISOString();
  let publicId;
  for (let i = 0; i < 5; i++) { publicId = randomToken(12); if (!(await db.collection(C.surveys).findOne({ publicId }))) break; }
  const doc = {
    _id: 'srv_' + randomToken(14), publicId, propertyId: PROPERTY_ID, status: 'draft',
    settings: sanitizeSettings(settings), draft: sanitizeDefinition(definition), draftRev: 1,
    currentVersion: 0, responseCount: 0, hasUnpublishedChanges: false,
    createdAt: now, updatedAt: now, createdBy: user.sub, updatedBy: user.sub, ...extra,
  };
  await db.collection(C.surveys).insertOne(doc);
  return doc;
}

export async function seedIfNeeded(db, user = { sub: 'system' }) {
  const exists = await db.collection(C.surveys).findOne({ seedKey: SEED_KEY });
  if (!exists) await newSurveyDoc(db, user, fall2026Settings(), fall2026Definition(), { seedKey: SEED_KEY });
  const t = await db.collection(C.templates).findOne({ seedKey: SEED_KEY });
  if (!t) {
    await db.collection(C.templates).insertOne({
      _id: 'tpl_' + randomToken(12), propertyId: PROPERTY_ID, seedKey: SEED_KEY,
      name: 'IUH Resident Experience Pulse (standard)', settings: { ...fall2026Settings(), title: 'Resident Experience Pulse Survey', term: '', academicYear: '' },
      definition: fall2026Definition(), createdAt: new Date().toISOString(), createdBy: 'system',
    });
  }
}

async function loadSurvey(db, id) {
  if (typeof id !== 'string' || !/^srv_[A-Za-z0-9]+$/.test(id)) return null;
  return db.collection(C.surveys).findOne({ _id: id, propertyId: PROPERTY_ID });
}

/** Filters responses by date and (optionally) a question answer. */
function filterResponses(list, f = {}) {
  let out = list;
  if (f.from) { const d = new Date(f.from); out = out.filter((r) => new Date(r.submittedAt) >= d); }
  if (f.to) { const d = new Date(f.to); d.setHours(23, 59, 59, 999); out = out.filter((r) => new Date(r.submittedAt) <= d); }
  if (f.version) out = out.filter((r) => r.version === Number(f.version));
  if (f.questionId && Array.isArray(f.values) && f.values.length) {
    out = out.filter((r) => { const v = (r.answers || {})[f.questionId]; const p = Array.isArray(v) ? v : [v]; return p.some((x) => f.values.includes(String(x))); });
  }
  return out;
}

async function analyticsFor(db, survey, filter) {
  const versions = await db.collection(C.versions).find({ surveyId: survey._id }).toArray();
  let responses = await db.collection(C.responses)
    .find({ surveyId: survey._id, status: 'submitted' }, { projection: { answers: 1, other: 1, version: 1, submittedAt: 1 } })
    .sort({ submittedAt: 1 }).limit(MAX_RESPONSES_ANALYZED).toArray();
  const segmented = !!(filter && filter.questionId);
  responses = filterResponses(responses, filter);
  const a = computeSurveyAnalytics(versions, responses);
  // Small-group suppression for segmented views to protect anonymity.
  if (segmented && a.total < SMALL_GROUP_MIN) {
    return { suppressed: true, total: a.total, minGroup: SMALL_GROUP_MIN, questions: [], byDate: {}, byVersion: {}, kpis: {} };
  }
  return a;
}

export async function handler(event) {
  const user = verifyReqAuth(event);
  if (!user) return json(401, { ok: false, error: 'Unauthorized' });
  if (!canAccessIUH(user)) return json(403, { ok: false, error: 'You do not have access to Ivory University House tools.' });

  let db;
  try { db = await getDb(); await ensureIndexes(db); }
  catch (e) { console.error('pulse db', e); return json(500, { ok: false, error: 'Database unavailable' }); }

  /* ---------------------------------------------------------- CSV export */
  if (event.httpMethod === 'GET') {
    const qs = event.queryStringParameters || {};
    if (qs.action !== 'export') return json(400, { ok: false, error: 'Unknown action' });
    const s = await loadSurvey(db, qs.surveyId);
    if (!s) return json(404, { ok: false, error: 'Survey not found' });
    const versions = await db.collection(C.versions).find({ surveyId: s._id }).sort({ version: 1 }).toArray();
    const cols = []; const seen = new Set();
    for (const v of [...versions].reverse()) for (const q of orderedQuestions(v.definition)) {
      if (q.type === 'heading' || seen.has(q.id)) continue; seen.add(q.id); cols.push({ q, version: v.version });
    }
    const vmap = new Map(versions.map((v) => [v.version, new Map(orderedQuestions(v.definition).map((q) => [q.id, q]))]));
    const rows = await db.collection(C.responses).find({ surveyId: s._id, status: 'submitted' }).sort({ submittedAt: 1 }).toArray();
    const header = ['Response #', 'Response ID', 'Submitted (UTC)', 'Survey version', ...cols.map((c) => c.q.text)];
    const lines = [header.map(csvCell).join(',')];
    rows.forEach((r, i) => {
      const qm = vmap.get(r.version) || new Map();
      lines.push([i + 1, r._id, r.submittedAt, r.version, ...cols.map(({ q }) => {
        const vq = qm.get(q.id) || q; return answerToText(vq, (r.answers || {})[q.id], (r.other || {})[q.id]);
      })].map(csvCell).join(','));
    });
    const name = (s.settings.title || 'pulse-survey').replace(/[^A-Za-z0-9]+/g, '_').slice(0, 60);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${name}_responses.csv"`, 'Cache-Control': 'no-store' },
      body: '\uFEFF' + lines.join('\r\n'),
    };
  }

  if (event.httpMethod !== 'POST') return json(405, { ok: false, error: 'Method not allowed' });
  const h = event.headers || {};
  if ((h['x-pulse-request'] || h['X-Pulse-Request']) !== '1') return json(403, { ok: false, error: 'Missing request header' });
  const body = parseBody(event);
  if (!body) return json(400, { ok: false, error: 'Invalid JSON' });
  const now = new Date().toISOString();
  const surveys = db.collection(C.surveys);

  try {
    switch (body.action) {
      case 'bootstrap': {
        await seedIfNeeded(db, user);
        return json(200, { ok: true, user: { username: user.sub, role: user.role }, brand: await getBrand(db), publicBaseUrl: publicBaseUrl(), categories: SURVEY_CATEGORIES });
      }

      case 'dashboard': {
        const list = await surveys.find({ propertyId: PROPERTY_ID }).sort({ updatedAt: -1 }).toArray();
        const since = new Date(Date.now() - 60 * 864e5).toISOString();
        const recent = await db.collection(C.responses).find({ propertyId: PROPERTY_ID, status: 'submitted', submittedAt: { $gte: since } }, { projection: { submittedAt: 1, surveyId: 1 } }).toArray();
        const byDate = {};
        recent.forEach((r) => { const k = localDateKey(r.submittedAt); byDate[k] = (byDate[k] || 0) + 1; });
        // Average satisfaction across surveys that have an overall-satisfaction question.
        let satSum = 0, satN = 0;
        for (const s of list.filter((x) => x.responseCount > 0 && x.status !== 'archived').slice(0, 10)) {
          const a = await analyticsFor(db, s);
          const k = a.kpis && a.kpis.overallSatisfaction;
          if (k && k.mean != null) { satSum += k.mean * k.n; satN += k.n; }
        }
        const reports = await db.collection(C.reports).find({ propertyId: PROPERTY_ID }, { projection: { summary: 0 } }).sort({ createdAt: -1 }).limit(5).toArray();
        return json(200, {
          ok: true,
          totals: {
            surveys: list.filter((s) => s.status !== 'archived').length,
            active: list.filter((s) => surveyState(s) === 'open').length,
            responses: list.reduce((n, s) => n + (s.responseCount || 0), 0),
            avgSatisfaction: satN ? Math.round((satSum / satN) * 100) / 100 : null, avgSatisfactionN: satN,
          },
          surveys: list.map(summarize), byDate, reports,
        });
      }

      case 'list': {
        const list = await surveys.find({ propertyId: PROPERTY_ID }).sort({ updatedAt: -1 }).toArray();
        return json(200, { ok: true, surveys: list.map(summarize) });
      }

      case 'get': {
        const s = await loadSurvey(db, body.surveyId);
        if (!s) return json(404, { ok: false, error: 'Survey not found' });
        const versions = await db.collection(C.versions).find({ surveyId: s._id }, { projection: { definition: 0 } }).sort({ version: -1 }).toArray();
        return json(200, { ok: true, survey: { ...summarize(s), draft: s.draft, draftRev: s.draftRev }, versions, publicBaseUrl: publicBaseUrl() });
      }

      case 'getVersion': {
        const s = await loadSurvey(db, body.surveyId);
        if (!s) return json(404, { ok: false, error: 'Survey not found' });
        const v = await db.collection(C.versions).findOne({ surveyId: s._id, version: Number(body.version) });
        if (!v) return json(404, { ok: false, error: 'Version not found' });
        return json(200, { ok: true, version: v });
      }

      case 'create': {
        let settings = body.settings || {}; let def = emptyDefinition();
        if (body.mode === 'template') {
          const t = await db.collection(C.templates).findOne({ _id: String(body.sourceId || ''), propertyId: PROPERTY_ID });
          if (!t) return json(404, { ok: false, error: 'Template not found' });
          def = cloneDefinition(t.definition); settings = { ...t.settings, ...settings };
        } else if (body.mode === 'survey') {
          const src = await loadSurvey(db, body.sourceId);
          if (!src) return json(404, { ok: false, error: 'Survey not found' });
          def = cloneDefinition(src.draft); settings = { ...src.settings, openAt: null, closeAt: null, ...settings };
        }
        const doc = await newSurveyDoc(db, user, settings, def, body.mode === 'survey' ? { duplicatedFrom: body.sourceId } : {});
        return json(200, { ok: true, survey: summarize(doc) });
      }

      case 'saveDraft': {
        const s = await loadSurvey(db, body.surveyId);
        if (!s) return json(404, { ok: false, error: 'Survey not found' });
        if (s.status === 'archived') return json(409, { ok: false, error: 'Archived surveys are read-only. Restore it first.' });
        if (Number(body.draftRev) !== s.draftRev) return json(409, { ok: false, error: 'This survey was changed elsewhere. Reload to get the latest draft.', conflict: true, draftRev: s.draftRev });
        const update = { updatedAt: now, updatedBy: user.sub, draftRev: s.draftRev + 1 };
        if (body.definition) update.draft = sanitizeDefinition(body.definition);
        if (body.settings) update.settings = sanitizeSettings(body.settings, s.settings);
        if (s.currentVersion && body.definition) update.hasUnpublishedChanges = true;
        const r = await surveys.updateOne({ _id: s._id, draftRev: s.draftRev }, { $set: update });
        if (!r.matchedCount) return json(409, { ok: false, error: 'Save conflict. Reload and try again.', conflict: true });
        return json(200, { ok: true, draftRev: update.draftRev, updatedAt: now, settings: update.settings || s.settings });
      }

      case 'publishCheck':
      case 'publish': {
        const s = await loadSurvey(db, body.surveyId);
        if (!s) return json(404, { ok: false, error: 'Survey not found' });
        if (s.status === 'archived') return json(409, { ok: false, error: 'Restore this survey before publishing.' });
        const def = sanitizeDefinition(s.draft);
        const v = validateDefinition(def, { anonymous: s.settings.anonymous });
        const prev = s.currentVersion ? await db.collection(C.versions).findOne({ surveyId: s._id, version: s.currentVersion }) : null;
        const diff = diffDefinitions(prev && prev.definition, def);
        if (body.action === 'publishCheck') return json(200, { ok: true, validation: v, diff, currentVersion: s.currentVersion || 0, responseCount: s.responseCount || 0 });
        if (v.errors.length) return json(422, { ok: false, error: 'Fix the highlighted problems before publishing.', validation: v });
        if (diff.significant.length && !body.acknowledgeSignificant) return json(409, { ok: false, error: 'Significant changes need confirmation.', diff, needsAck: true });
        const version = (s.currentVersion || 0) + 1;
        await db.collection(C.versions).insertOne({
          _id: `${s._id}_v${version}`, surveyId: s._id, propertyId: PROPERTY_ID, version, publishedAt: now, publishedBy: user.sub,
          definition: def, settings: s.settings, changes: diff, notComparableWithPrevious: !diff.comparable, note: str(body.note, 500),
        });
        const status = s.status === 'draft' || s.status === 'closed' ? 'published' : s.status;
        await surveys.updateOne({ _id: s._id }, { $set: { currentVersion: version, publishedAt: now, status, hasUnpublishedChanges: false, updatedAt: now, updatedBy: user.sub } });
        return json(200, { ok: true, version, status, publicId: s.publicId, publicBaseUrl: publicBaseUrl() });
      }

      case 'setStatus': {
        const s = await loadSurvey(db, body.surveyId);
        if (!s) return json(404, { ok: false, error: 'Survey not found' });
        const target = body.status;
        const allowed = { paused: ['published'], published: ['paused', 'closed'], closed: ['published', 'paused'], archived: ['draft', 'published', 'paused', 'closed'], draft: ['archived'] };
        if (!allowed[target]) return json(400, { ok: false, error: 'Invalid status' });
        let next = target;
        if (target === 'draft' && s.currentVersion) next = 'closed'; // restoring an archived, previously-published survey
        if (!allowed[target].includes(s.status)) return json(409, { ok: false, error: `Cannot change a ${s.status} survey to ${target}.` });
        if (target === 'published' && !s.currentVersion) return json(409, { ok: false, error: 'Publish the survey first.' });
        const set = { status: next, updatedAt: now, updatedBy: user.sub };
        if (target === 'published' && s.settings.closeAt && new Date(s.settings.closeAt) < new Date()) set['settings.closeAt'] = null; // reopening clears a past close date
        await surveys.updateOne({ _id: s._id }, { $set: set });
        return json(200, { ok: true, status: next });
      }

      case 'duplicate': {
        const src = await loadSurvey(db, body.surveyId);
        if (!src) return json(404, { ok: false, error: 'Survey not found' });
        const doc = await newSurveyDoc(db, user, { ...src.settings, title: str(body.title, 300) || `${src.settings.title} (Copy)`, openAt: null, closeAt: null }, cloneDefinition(src.draft), { duplicatedFrom: src._id });
        return json(200, { ok: true, survey: summarize(doc) });
      }

      case 'listTemplates': {
        const t = await db.collection(C.templates).find({ propertyId: PROPERTY_ID }).sort({ createdAt: -1 }).toArray();
        return json(200, { ok: true, templates: t.map((x) => ({ id: x._id, name: x.name, category: x.settings && x.settings.category, questionCount: (x.definition.questions || []).length, createdAt: x.createdAt, createdBy: x.createdBy, seeded: !!x.seedKey })) });
      }
      case 'saveTemplate': {
        const s = await loadSurvey(db, body.surveyId);
        if (!s) return json(404, { ok: false, error: 'Survey not found' });
        const doc = { _id: 'tpl_' + randomToken(12), propertyId: PROPERTY_ID, name: str(body.name, 200) || s.settings.title, settings: { ...s.settings, openAt: null, closeAt: null }, definition: sanitizeDefinition(s.draft), createdAt: now, createdBy: user.sub };
        await db.collection(C.templates).insertOne(doc);
        return json(200, { ok: true, id: doc._id });
      }
      case 'deleteTemplate': {
        await db.collection(C.templates).deleteOne({ _id: String(body.id || ''), propertyId: PROPERTY_ID });
        return json(200, { ok: true });
      }

      case 'analytics': {
        const s = await loadSurvey(db, body.surveyId);
        if (!s) return json(404, { ok: false, error: 'Survey not found' });
        const a = await analyticsFor(db, s, body.filter || {});
        return json(200, { ok: true, survey: summarize(s), analytics: a });
      }

      case 'responses': {
        const s = await loadSurvey(db, body.surveyId);
        if (!s) return json(404, { ok: false, error: 'Survey not found' });
        const page = Math.max(1, parseInt(body.page, 10) || 1); const size = Math.min(100, Math.max(5, parseInt(body.pageSize, 10) || 20));
        const q = { surveyId: s._id, status: 'submitted' };
        if (body.version) q.version = Number(body.version);
        if (body.from || body.to) { q.submittedAt = {}; if (body.from) q.submittedAt.$gte = new Date(body.from).toISOString(); if (body.to) { const d = new Date(body.to); d.setHours(23, 59, 59, 999); q.submittedAt.$lte = d.toISOString(); } }
        const total = await db.collection(C.responses).countDocuments(q);
        const items = await db.collection(C.responses).find(q).sort({ submittedAt: -1 }).skip((page - 1) * size).limit(size).toArray();
        const versions = await db.collection(C.versions).find({ surveyId: s._id }).toArray();
        return json(200, { ok: true, total, page, pageSize: size, items: items.map((r) => ({ id: r._id, seq: r.seq, version: r.version, submittedAt: r.submittedAt, answers: r.answers, other: r.other })), versions: versions.map((v) => ({ version: v.version, definition: v.definition })) });
      }

      case 'deleteResponse': {
        if (user.role !== 'admin') return json(403, { ok: false, error: 'Only administrators can delete responses.' });
        const r = await db.collection(C.responses).findOne({ _id: String(body.responseId || ''), propertyId: PROPERTY_ID });
        if (!r) return json(404, { ok: false, error: 'Response not found' });
        await db.collection(C.responses).deleteOne({ _id: r._id });
        await surveys.updateOne({ _id: r.surveyId }, { $inc: { responseCount: -1 } });
        return json(200, { ok: true });
      }

      case 'compare': {
        const ids = (Array.isArray(body.surveyIds) ? body.surveyIds : []).slice(0, 8);
        if (ids.length < 2) return json(400, { ok: false, error: 'Select at least two surveys.' });
        const items = [];
        for (const id of ids) { const s = await loadSurvey(db, id); if (s) items.push({ id: s._id, title: s.settings.title, analytics: await analyticsFor(db, s) }); }
        return json(200, { ok: true, comparison: compareSurveys(items) });
      }

      case 'listReports': {
        const r = await db.collection(C.reports).find({ propertyId: PROPERTY_ID }, { projection: { summary: 0 } }).sort({ createdAt: -1 }).limit(100).toArray();
        return json(200, { ok: true, reports: r });
      }
      case 'getReport': {
        const r = await db.collection(C.reports).findOne({ _id: String(body.id || ''), propertyId: PROPERTY_ID });
        if (!r) return json(404, { ok: false, error: 'Report not found' });
        return json(200, { ok: true, report: r });
      }
      case 'saveReport': {
        const summary = body.summary || null;
        const size = JSON.stringify(summary || {}).length;
        if (size > 3_000_000) return json(413, { ok: false, error: 'Report snapshot too large.' });
        const doc = { _id: 'rpt_' + randomToken(12), propertyId: PROPERTY_ID, name: str(body.name, 200) || 'Pulse Report', scope: { surveyIds: (body.surveyIds || []).map(String).slice(0, 8), type: body.type === 'comparison' ? 'comparison' : 'survey' }, config: body.config || {}, summary, reportDate: now, createdAt: now, createdBy: user.sub };
        await db.collection(C.reports).insertOne(doc);
        return json(200, { ok: true, id: doc._id });
      }
      case 'deleteReport': {
        await db.collection(C.reports).deleteOne({ _id: String(body.id || ''), propertyId: PROPERTY_ID });
        return json(200, { ok: true });
      }

      case 'listActions': {
        const a = await db.collection(C.actions).find({ surveyId: String(body.surveyId || ''), propertyId: PROPERTY_ID }).sort({ createdAt: 1 }).toArray();
        return json(200, { ok: true, actions: a });
      }
      case 'saveAction': {
        const a = body.item || {};
        const STATUSES = ['Proposed', 'Approved', 'In Progress', 'Completed', 'Deferred'];
        const doc = {
          priority: ['High', 'Medium', 'Low'].includes(a.priority) ? a.priority : 'Medium', feedback: str(a.feedback, 1000), action: str(a.action, 1000),
          owner: str(a.owner, 120), targetDate: str(a.targetDate, 20), status: STATUSES.includes(a.status) ? a.status : 'Proposed',
          suggested: !!a.suggested, updatedAt: now, updatedBy: user.sub,
        };
        if (a.id) {
          const r = await db.collection(C.actions).updateOne({ _id: String(a.id), propertyId: PROPERTY_ID }, { $set: doc });
          if (!r.matchedCount) return json(404, { ok: false, error: 'Action not found' });
          return json(200, { ok: true, id: a.id });
        }
        const s = await loadSurvey(db, body.surveyId);
        if (!s) return json(404, { ok: false, error: 'Survey not found' });
        const id = 'act_' + randomToken(12);
        await db.collection(C.actions).insertOne({ _id: id, surveyId: s._id, propertyId: PROPERTY_ID, ...doc, createdAt: now, createdBy: user.sub });
        return json(200, { ok: true, id });
      }
      case 'deleteAction': {
        await db.collection(C.actions).deleteOne({ _id: String(body.id || ''), propertyId: PROPERTY_ID });
        return json(200, { ok: true });
      }

      case 'saveBrand': {
        const b = body.brand || {};
        const hex = (v, d) => (/^#[0-9a-fA-F]{6}$/.test(v || '') ? v : d);
        const cur = await getBrand(db);
        let logo = cur.logoDataUrl;
        if (b.logoDataUrl !== undefined) {
          if (b.logoDataUrl === '') logo = '';
          else if (/^data:image\/(png|svg\+xml|webp|jpeg);base64,[A-Za-z0-9+/=]+$/.test(b.logoDataUrl) && b.logoDataUrl.length < 700_000) {
            if (b.logoDataUrl.startsWith('data:image/svg+xml')) {
              const svg = Buffer.from(b.logoDataUrl.split(',')[1], 'base64').toString('utf8');
              if (/<script|on\w+\s*=|javascript:|<foreignObject/i.test(svg)) return json(400, { ok: false, error: 'SVG logo contains scripts or event handlers and was rejected.' });
            }
            logo = b.logoDataUrl;
          } else return json(400, { ok: false, error: 'Logo must be a PNG, SVG, WebP or JPEG under ~500 KB.' });
        }
        const doc = { propertyId: PROPERTY_ID, name: cur.name, shortName: cur.shortName, location: cur.location, logoDataUrl: logo,
          primaryColor: hex(b.primaryColor, cur.primaryColor), accentColor: hex(b.accentColor, cur.accentColor), accent2Color: hex(b.accent2Color, cur.accent2Color), backgroundColor: hex(b.backgroundColor, cur.backgroundColor),
          updatedAt: now, updatedBy: user.sub };
        await db.collection(C.brand).updateOne({ propertyId: PROPERTY_ID }, { $set: doc }, { upsert: true });
        return json(200, { ok: true, brand: await getBrand(db) });
      }

      case 'listContactRequests': {
        const r = await db.collection(C.contacts).find({ propertyId: PROPERTY_ID }).sort({ createdAt: -1 }).limit(200).toArray();
        return json(200, { ok: true, requests: r });
      }

      default: return json(400, { ok: false, error: 'Unknown action' });
    }
  } catch (e) {
    console.error('pulse-survey error', body && body.action, e);
    return json(500, { ok: false, error: 'Something went wrong. Please try again.' });
  }
}

