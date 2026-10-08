/**
 * Ivory University House – Pulse Survey Engine
 * ------------------------------------------------------------------
 * Dependency-free ES module shared by:
 *   - the admin tool (pulse-survey/index.html)
 *   - the public survey page (pulse-survey/public.html)
 *   - the Netlify Functions (netlify/functions/pulse-survey*.js, bundled by esbuild)
 *
 * It owns everything that must behave identically in the browser and on the
 * server: question type definitions, survey-definition validation, conditional
 * logic evaluation, answer validation, analytics aggregation, text theming,
 * cross-survey comparison and version diffing.
 *
 * Survey definition shape (stored as a draft on the survey and frozen into
 * immutable version snapshots on publish):
 *   {
 *     sections:  [{ id, title, description }],
 *     questions: [{ id, sectionId, type, text, description, required, enabled,
 *                   choices:[{ id, label, score?, na?, sentiment?, exclusive? }],
 *                   rows:[{ id, label, comparisonKey }],          // grid only
 *                   scale:{ min, max, minLabel, maxLabel },         // rating only
 *                   naOption:{ enabled, label },                    // rating only
 *                   allowOther, otherLabel, minSelect, maxSelect,
 *                   comparisonKey, reportRole,
 *                   logic:{ match:'all'|'any', conditions:[{ questionId, operator, values:[] }] } | null }]
 *   }
 * Question order = section order, then array order within each section.
 */

export const QUESTION_TYPES = {
  single:   { label: 'Multiple choice (single answer)', hasChoices: true },
  checkbox: { label: 'Checkboxes (multiple answers)', hasChoices: true },
  dropdown: { label: 'Dropdown', hasChoices: true },
  rating:   { label: 'Linear rating scale', hasChoices: false },
  likert:   { label: 'Likert agreement scale', hasChoices: true },
  grid:     { label: 'Multiple-choice rating grid', hasChoices: true },
  short:    { label: 'Short text', hasChoices: false },
  long:     { label: 'Long paragraph', hasChoices: false },
  date:     { label: 'Date', hasChoices: false },
  yesno:    { label: 'Yes / No', hasChoices: true },
  heading:  { label: 'Section heading / descriptive text', hasChoices: false },
};

export const SURVEY_STATUSES = ['draft', 'published', 'paused', 'closed', 'archived'];

export const SURVEY_CATEGORIES = [
  'Resident Experience Pulse', 'Move-In Experience', 'Resident Events and Engagement',
  'Maintenance and Operations', 'Community Satisfaction', 'Renewal Interest',
  'End-of-Term Experience', 'Custom Survey',
];

/** Roles drive the Pulse Report sections. All optional. */
export const REPORT_ROLES = {
  '': 'None',
  overall_satisfaction: 'Overall satisfaction',
  experience_grid: 'Resident experience ratings',
  community_agreement: 'Community / safety agreement',
  priorities: 'Improvement priorities',
  event_attendance: 'Event attendance',
  event_rating: 'Event satisfaction',
  refreshments: 'Refreshment satisfaction',
  event_communication: 'Event communication',
  event_variety: 'Event variety',
  event_interests: 'Requested event types',
  event_barriers: 'Event barriers',
  comm_channels: 'Preferred communication channels',
  series_rating: 'Guest series rating',
  renewal_likelihood: 'Renewal likelihood',
  renewal_arrangement: 'Renewal room arrangement',
  renewal_factors: 'Renewal decision factors',
  renewal_timing: 'Renewal decision timing',
  renewal_leave_reason: 'Reason for leaving',
  open_feedback: 'Open feedback',
};

export const OTHER_ID = '__other';
export const NA_VALUE = 'na';
export const SMALL_GROUP_MIN = 5;
export const LOGIC_SOURCE_TYPES = new Set(['single', 'checkbox', 'dropdown', 'likert', 'yesno', 'rating']);
const ANSWERABLE = (q) => q.type !== 'heading';

const LIMITS = { title: 300, text: 1000, desc: 2000, label: 300, short: 500, long: 5000, other: 500, choices: 60, rows: 40, questions: 200, sections: 40 };

/* ------------------------------------------------------------------ ids */
export function uid(prefix = 'id') {
  const c = (typeof globalThis !== 'undefined' && globalThis.crypto) || null;
  let rand = '';
  if (c && c.getRandomValues) {
    const a = new Uint8Array(8); c.getRandomValues(a);
    rand = Array.from(a, (b) => (b % 36).toString(36)).join('');
  } else {
    rand = Math.random().toString(36).slice(2, 10);
  }
  return `${prefix}_${rand}`;
}

/* -------------------------------------------------------------- defaults */
export const AGREEMENT_CHOICES = () => [
  { id: 'sd', label: 'Strongly disagree', score: 1 },
  { id: 'd', label: 'Disagree', score: 2 },
  { id: 'n', label: 'Neutral', score: 3 },
  { id: 'a', label: 'Agree', score: 4 },
  { id: 'sa', label: 'Strongly agree', score: 5 },
];
export const QUALITY_CHOICES = () => [
  { id: 'poor', label: 'Poor', score: 1 },
  { id: 'fair', label: 'Fair', score: 2 },
  { id: 'avg', label: 'Average', score: 3 },
  { id: 'good', label: 'Good', score: 4 },
  { id: 'exc', label: 'Excellent', score: 5 },
];

export function defaultQuestion(type, sectionId) {
  const q = {
    id: uid('q'), sectionId, type, text: '', description: '', required: false, enabled: true,
    choices: [], rows: [], scale: null, naOption: { enabled: false, label: 'N/A' },
    allowOther: false, otherLabel: 'Other', minSelect: null, maxSelect: null,
    comparisonKey: '', reportRole: '', logic: null,
  };
  switch (type) {
    case 'single': case 'checkbox': case 'dropdown':
      q.choices = [{ id: uid('c'), label: 'Option 1' }, { id: uid('c'), label: 'Option 2' }]; break;
    case 'likert': q.choices = AGREEMENT_CHOICES(); break;
    case 'grid':
      q.choices = QUALITY_CHOICES();
      q.rows = [{ id: uid('r'), label: 'Item 1', comparisonKey: '' }];
      break;
    case 'rating': q.scale = { min: 1, max: 5, minLabel: 'Poor', maxLabel: 'Excellent' }; break;
    case 'yesno': q.choices = [{ id: 'yes', label: 'Yes' }, { id: 'no', label: 'No' }]; break;
    case 'heading': q.text = 'Section note'; break;
    default: break;
  }
  return q;
}

export function emptyDefinition() {
  const s = { id: uid('s'), title: 'Section 1', description: '' };
  return { sections: [s], questions: [] };
}

/* ---------------------------------------------------------------- helpers */
const str = (v, max) => (v == null ? '' : String(v)).replace(/\u0000/g, '').slice(0, max);
const bool = (v) => v === true || v === 'true';
const intOrNull = (v) => { if (v === '' || v == null) return null; const n = parseInt(v, 10); return Number.isFinite(n) ? n : null; };
const numOrNull = (v) => { if (v === '' || v == null) return null; const n = Number(v); return Number.isFinite(n) ? n : null; };
const safeId = (v, fallbackPrefix) => { const s = str(v, 64).replace(/[^A-Za-z0-9_\-]/g, ''); return s || uid(fallbackPrefix); };

export function orderedQuestions(def) {
  if (!def || !Array.isArray(def.sections)) return [];
  const qs = Array.isArray(def.questions) ? def.questions : [];
  return def.sections.flatMap((s) => qs.filter((q) => q.sectionId === s.id));
}

/** Choices a resident can pick, including the synthetic "Other" option. */
export function answerChoices(q) {
  if (q.type === 'rating') {
    const out = [];
    const { min, max } = q.scale || { min: 1, max: 5 };
    for (let n = min; n <= max; n++) out.push({ id: String(n), label: String(n), score: n });
    if (q.naOption && q.naOption.enabled) out.push({ id: NA_VALUE, label: q.naOption.label || 'N/A', na: true });
    return out;
  }
  const base = Array.isArray(q.choices) ? q.choices.slice() : [];
  if (q.allowOther && ['single', 'checkbox', 'dropdown'].includes(q.type)) base.push({ id: OTHER_ID, label: q.otherLabel || 'Other' });
  return base;
}

export function maxScore(q) {
  if (q.type === 'rating') return (q.scale && q.scale.max) || 5;
  const scores = (q.choices || []).filter((c) => !c.na && typeof c.score === 'number').map((c) => c.score);
  return scores.length ? Math.max(...scores) : null;
}
export function minScoreOf(q) {
  if (q.type === 'rating') return (q.scale && q.scale.min) || 1;
  const scores = (q.choices || []).filter((c) => !c.na && typeof c.score === 'number').map((c) => c.score);
  return scores.length ? Math.min(...scores) : null;
}
/** Favorable = top-two box (e.g. 4 or 5 on a 1–5 scale). N/A never counts. */
export function favorableThreshold(q) {
  const mx = maxScore(q); const mn = minScoreOf(q);
  if (mx == null) return null;
  if (mx - mn >= 6) return mx - 2; // 0–10 style scales: top three
  return mx - 1;
}

/* ------------------------------------------------------- sanitize (server) */
export function sanitizeDefinition(raw) {
  const def = raw && typeof raw === 'object' ? raw : {};
  const sections = (Array.isArray(def.sections) ? def.sections : []).slice(0, LIMITS.sections).map((s) => ({
    id: safeId(s && s.id, 's'), title: str(s && s.title, LIMITS.title), description: str(s && s.description, LIMITS.desc),
  }));
  const sectionIds = new Set(sections.map((s) => s.id));
  const questions = (Array.isArray(def.questions) ? def.questions : []).slice(0, LIMITS.questions)
    .filter((q) => q && QUESTION_TYPES[q.type] && sectionIds.has(String(q.sectionId)))
    .map((q) => {
      const out = {
        id: safeId(q.id, 'q'), sectionId: String(q.sectionId), type: q.type,
        text: str(q.text, LIMITS.text), description: str(q.description, LIMITS.desc),
        required: bool(q.required), enabled: q.enabled !== false,
        choices: (Array.isArray(q.choices) ? q.choices : []).slice(0, LIMITS.choices).map((c) => {
          const o = { id: safeId(c && c.id, 'c'), label: str(c && c.label, LIMITS.label) };
          const sc = numOrNull(c && c.score); if (sc != null) o.score = sc;
          if (c && bool(c.na)) o.na = true;
          if (c && ['positive', 'undecided', 'negative'].includes(c.sentiment)) o.sentiment = c.sentiment;
          if (c && bool(c.exclusive)) o.exclusive = true;
          return o;
        }).filter((c) => c.id !== OTHER_ID),
        rows: q.type === 'grid' ? (Array.isArray(q.rows) ? q.rows : []).slice(0, LIMITS.rows).map((r) => ({
          id: safeId(r && r.id, 'r'), label: str(r && r.label, LIMITS.label), comparisonKey: str(r && r.comparisonKey, 80),
        })) : [],
        scale: q.type === 'rating' ? {
          min: intOrNull(q.scale && q.scale.min) ?? 1, max: intOrNull(q.scale && q.scale.max) ?? 5,
          minLabel: str(q.scale && q.scale.minLabel, 80), maxLabel: str(q.scale && q.scale.maxLabel, 80),
        } : null,
        naOption: { enabled: bool(q.naOption && q.naOption.enabled), label: str((q.naOption && q.naOption.label) || 'N/A', 120) },
        allowOther: bool(q.allowOther), otherLabel: str(q.otherLabel || 'Other', 120),
        minSelect: intOrNull(q.minSelect), maxSelect: intOrNull(q.maxSelect),
        comparisonKey: str(q.comparisonKey, 80).replace(/[^A-Za-z0-9_.\-]/g, ''),
        reportRole: REPORT_ROLES[q.reportRole] !== undefined ? q.reportRole : '',
        logic: null,
      };
      if (q.type === 'yesno' && out.choices.length !== 2) out.choices = [{ id: 'yes', label: 'Yes' }, { id: 'no', label: 'No' }];
      if (q.logic && Array.isArray(q.logic.conditions) && q.logic.conditions.length) {
        out.logic = {
          match: q.logic.match === 'any' ? 'any' : 'all',
          conditions: q.logic.conditions.slice(0, 10).map((c) => ({
            questionId: str(c && c.questionId, 64),
            operator: ['anyOf', 'noneOf', 'answered', 'notAnswered'].includes(c && c.operator) ? c.operator : 'anyOf',
            values: (Array.isArray(c && c.values) ? c.values : []).slice(0, LIMITS.choices).map((v) => str(v, 64)),
          })),
        };
      }
      return out;
    });
  return { sections, questions };
}

/* ------------------------------------------------------------- validation */
/**
 * Validates a definition before publication. Logic may only reference
 * EARLIER questions, which makes circular routing impossible by construction.
 */
export function validateDefinition(def, opts = {}) {
  const errors = []; const warnings = [];
  const err = (message, questionId) => errors.push({ message, questionId });
  const warn = (message, questionId) => warnings.push({ message, questionId });
  if (!def || !Array.isArray(def.sections) || !def.sections.length) { err('The survey needs at least one section.'); return { errors, warnings }; }
  const ordered = orderedQuestions(def);
  const enabled = ordered.filter((q) => q.enabled !== false);
  if (!enabled.some(ANSWERABLE)) err('Add at least one question residents can answer.');
  const ids = new Set();
  (def.questions || []).forEach((q) => { if (ids.has(q.id)) err('Duplicate question ID ' + q.id, q.id); ids.add(q.id); });
  const pos = new Map(ordered.map((q, i) => [q.id, i]));
  const label = (q) => `“${(q.text || 'Untitled question').slice(0, 60)}”`;

  for (const q of enabled) {
    if (!String(q.text || '').trim()) err('A question is missing its wording.', q.id);
    const t = QUESTION_TYPES[q.type];
    if (!t) { err('Unknown question type.', q.id); continue; }
    if (['single', 'checkbox', 'dropdown', 'likert', 'grid', 'yesno'].includes(q.type)) {
      const cs = q.choices || [];
      if (cs.length < 2) err(`${label(q)} needs at least two answer choices.`, q.id);
      const cids = new Set();
      cs.forEach((c) => { if (!String(c.label || '').trim()) err(`${label(q)} has an empty answer choice.`, q.id); if (cids.has(c.id)) err(`${label(q)} has duplicate choice IDs.`, q.id); cids.add(c.id); });
    }
    if (q.type === 'grid') {
      if (!(q.rows || []).length) err(`${label(q)} needs at least one row.`, q.id);
      (q.rows || []).forEach((r) => { if (!String(r.label || '').trim()) err(`${label(q)} has an empty grid row.`, q.id); });
    }
    if (q.type === 'rating') {
      const s = q.scale || {};
      if (!(Number.isInteger(s.min) && Number.isInteger(s.max) && s.min < s.max && s.max - s.min <= 10 && s.min >= 0)) err(`${label(q)} needs a valid scale (e.g. 1 to 5, max 11 points).`, q.id);
    }
    if (q.type === 'checkbox') {
      const n = answerChoices(q).length;
      if (q.minSelect != null && q.minSelect < 0) err(`${label(q)}: minimum selections cannot be negative.`, q.id);
      if (q.maxSelect != null && (q.maxSelect < 1 || q.maxSelect > n)) err(`${label(q)}: maximum selections must be between 1 and ${n}.`, q.id);
      if (q.minSelect != null && q.maxSelect != null && q.minSelect > q.maxSelect) err(`${label(q)}: minimum selections exceed the maximum.`, q.id);
    }
    if (opts.anonymous && q.type === 'short' && /\b(name|e-?mail|phone|unit|bed ?space|room number|student id)\b/i.test(q.text || '')) {
      warn(`${label(q)} may collect identifying information in an anonymous survey.`, q.id);
    }
    if (q.logic && q.logic.conditions && q.logic.conditions.length) {
      for (const c of q.logic.conditions) {
        const src = (def.questions || []).find((x) => x.id === c.questionId);
        if (!src) { err(`${label(q)} has a condition pointing to a question that no longer exists.`, q.id); continue; }
        if (src.enabled === false) { err(`${label(q)} depends on ${label(src)}, which is turned off.`, q.id); continue; }
        if (!(pos.get(src.id) < pos.get(q.id))) { err(`${label(q)} depends on ${label(src)}, which does not come before it. Conditions must reference earlier questions.`, q.id); continue; }
        if (!LOGIC_SOURCE_TYPES.has(src.type)) { err(`${label(src)} (${QUESTION_TYPES[src.type].label}) cannot be used in a condition.`, q.id); continue; }
        if (['anyOf', 'noneOf'].includes(c.operator)) {
          if (!c.values || !c.values.length) { err(`${label(q)} has a condition with no answers selected.`, q.id); continue; }
          const valid = new Set(answerChoices(src).map((x) => x.id));
          if (c.values.some((v) => !valid.has(String(v)))) err(`${label(q)} has a condition referencing an answer choice that was removed from ${label(src)}.`, q.id);
        }
      }
      if (q.required) warn(`${label(q)} is required but conditional; it is only required when shown.`, q.id);
    }
  }
  return { errors, warnings };
}

/* ------------------------------------------------------- conditional logic */
export function hasAnswer(v) {
  if (v == null) return false;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === 'object') return Object.keys(v).length > 0;
  return String(v).trim() !== '';
}
function condMet(c, answers, visible) {
  const v = visible.has(c.questionId) ? answers[c.questionId] : undefined;
  const picked = v == null ? [] : (Array.isArray(v) ? v.map(String) : [String(v)]);
  switch (c.operator) {
    case 'answered': return hasAnswer(v);
    case 'notAnswered': return !hasAnswer(v);
    case 'noneOf': return !picked.some((p) => c.values.includes(p));
    case 'anyOf': default: return picked.some((p) => c.values.includes(p));
  }
}
/** Returns the Set of question IDs currently visible given answers. */
export function computeVisibility(def, answers = {}) {
  const visible = new Set();
  for (const q of orderedQuestions(def)) {
    if (q.enabled === false) continue;
    const L = q.logic;
    if (!L || !L.conditions || !L.conditions.length) { visible.add(q.id); continue; }
    const res = L.conditions.map((c) => condMet(c, answers, visible));
    if (L.match === 'any' ? res.some(Boolean) : res.every(Boolean)) visible.add(q.id);
  }
  return visible;
}

/* -------------------------------------------------------- answer validation */
/**
 * Validates and normalizes a submission against an exact version definition.
 * Answers to hidden / unknown questions are dropped, never stored.
 */
export function validateAnswers(def, rawAnswers = {}, rawOther = {}, opts = {}) {
  const answers = {}; const other = {}; const errors = {};
  const inA = rawAnswers && typeof rawAnswers === 'object' ? rawAnswers : {};
  const inO = rawOther && typeof rawOther === 'object' ? rawOther : {};
  // Pass 1: normalize every enabled question's raw value so visibility can be computed.
  const norm = {};
  for (const q of orderedQuestions(def)) {
    if (q.enabled === false || !ANSWERABLE(q)) continue;
    const v = inA[q.id];
    if (!hasAnswer(v)) continue;
    const valid = new Set(answerChoices(q).map((c) => c.id));
    switch (q.type) {
      case 'single': case 'dropdown': case 'likert': case 'yesno': case 'rating': {
        const s = String(Array.isArray(v) ? v[0] : v);
        if (valid.has(s)) norm[q.id] = s; else errors[q.id] = 'Please choose a valid option.';
        break;
      }
      case 'checkbox': {
        const arr = [...new Set((Array.isArray(v) ? v : [v]).map(String))];
        if (arr.every((s) => valid.has(s))) norm[q.id] = arr; else errors[q.id] = 'Please choose valid options.';
        break;
      }
      case 'grid': {
        if (typeof v !== 'object' || Array.isArray(v)) { errors[q.id] = 'Invalid grid answer.'; break; }
        const rows = new Set((q.rows || []).map((r) => r.id)); const o = {};
        for (const [rk, cv] of Object.entries(v)) { if (rows.has(rk) && valid.has(String(cv))) o[rk] = String(cv); }
        if (Object.keys(o).length) norm[q.id] = o;
        break;
      }
      case 'short': norm[q.id] = str(v, LIMITS.short).trim(); break;
      case 'long': norm[q.id] = str(v, LIMITS.long).trim(); break;
      case 'date': { const s = String(v); if (/^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s))) norm[q.id] = s; else errors[q.id] = 'Please enter a valid date.'; break; }
      default: break;
    }
    if (norm[q.id] === '') delete norm[q.id];
  }
  const visible = computeVisibility(def, norm);
  for (const q of orderedQuestions(def)) {
    if (!visible.has(q.id) || !ANSWERABLE(q)) { delete errors[q.id]; continue; }
    const v = norm[q.id];
    if (errors[q.id]) continue;
    if (!hasAnswer(v)) { if (q.required && !opts.partial) errors[q.id] = 'This question is required.'; continue; }
    if (q.type === 'checkbox') {
      const ex = (q.choices || []).filter((c) => c.exclusive).map((c) => c.id);
      if (v.length > 1 && v.some((x) => ex.includes(x))) { errors[q.id] = 'That option cannot be combined with others.'; continue; }
      if (q.maxSelect != null && v.length > q.maxSelect) { errors[q.id] = `Please choose no more than ${q.maxSelect}.`; continue; }
      if (q.minSelect != null && v.length < q.minSelect && !v.some((x) => ex.includes(x))) { errors[q.id] = `Please choose at least ${q.minSelect}.`; continue; }
    }
    if (q.type === 'grid' && q.required && !opts.partial && Object.keys(v).length < (q.rows || []).length) { errors[q.id] = 'Please rate every row.'; continue; }
    answers[q.id] = v;
    const picked = Array.isArray(v) ? v : [v];
    if (picked.includes(OTHER_ID)) {
      const t = str(inO[q.id], LIMITS.other).trim();
      if (t) other[q.id] = t;
    }
  }
  return { ok: Object.keys(errors).length === 0, errors, answers, other };
}

/* ------------------------------------------------------------ display text */
export function answerToText(q, v, otherText) {
  if (!hasAnswer(v)) return '';
  const map = new Map(answerChoices(q).map((c) => [c.id, c.label]));
  const lab = (id) => (id === OTHER_ID && otherText ? `Other: ${otherText}` : (map.get(String(id)) ?? String(id)));
  if (q.type === 'grid') return (q.rows || []).filter((r) => v[r.id]).map((r) => `${r.label}: ${lab(v[r.id])}`).join('; ');
  if (Array.isArray(v)) return v.map(lab).join('; ');
  if (['short', 'long', 'date'].includes(q.type)) return String(v);
  return lab(v);
}

/* ---------------------------------------------------------------- analytics */
export function questionSignature(q) {
  const cs = (q.choices || []).map((c) => `${c.id}:${c.score ?? ''}:${c.na ? 1 : 0}`).join('|');
  const rs = (q.rows || []).map((r) => r.id).join('|');
  const sc = q.scale ? `${q.scale.min}-${q.scale.max}` : '';
  return `${q.type}#${cs}#${rs}#${sc}#${q.naOption && q.naOption.enabled ? 1 : 0}#${q.allowOther ? 1 : 0}`;
}

const pct = (n, d) => (d > 0 ? Math.round((n / d) * 1000) / 10 : null);
const round2 = (x) => (x == null ? null : Math.round(x * 100) / 100);

function scoreStats(q, values) {
  // values: array of choice ids (strings). Returns mean / favorable over scored, non-N/A answers.
  const choices = answerChoices(q);
  const byId = new Map(choices.map((c) => [c.id, c]));
  const thr = favorableThreshold(q);
  let sum = 0, n = 0, fav = 0, na = 0, unfav = 0;
  const minS = minScoreOf(q);
  for (const v of values) {
    const c = byId.get(String(v));
    if (!c) continue;
    if (c.na) { na++; continue; }
    if (typeof c.score !== 'number') continue;
    sum += c.score; n++;
    if (thr != null && c.score >= thr) fav++;
    if (minS != null && c.score <= minS + 1) unfav++;
  }
  return { mean: n ? round2(sum / n) : null, scoredN: n, naN: na, favorable: fav, favorablePct: pct(fav, n), unfavorablePct: pct(unfav, n), maxScore: maxScore(q), threshold: thr };
}

export function computeQuestionStats(q, entries) {
  // entries: [{ value, other, submittedAt }]
  const answered = entries.filter((e) => hasAnswer(e.value));
  const base = { questionId: q.id, answered: answered.length };
  const choices = answerChoices(q);
  if (['single', 'dropdown', 'likert', 'yesno', 'rating'].includes(q.type)) {
    const counts = Object.fromEntries(choices.map((c) => [c.id, 0]));
    answered.forEach((e) => { counts[String(e.value)] = (counts[String(e.value)] || 0) + 1; });
    const out = { ...base, kind: 'choice', counts, ...scoreStats(q, answered.map((e) => e.value)) };
    const senti = (q.choices || []).filter((c) => c.sentiment);
    if (senti.length) {
      const s = { positive: 0, undecided: 0, negative: 0 };
      answered.forEach((e) => { const c = q.choices.find((x) => x.id === String(e.value)); if (c && c.sentiment) s[c.sentiment]++; });
      const valid = s.positive + s.undecided + s.negative;
      out.sentiment = { ...s, valid, positivePct: pct(s.positive, valid), undecidedPct: pct(s.undecided, valid), negativePct: pct(s.negative, valid) };
    }
    out.otherTexts = answered.filter((e) => String(e.value) === OTHER_ID && e.other).map((e) => e.other);
    return out;
  }
  if (q.type === 'checkbox') {
    const counts = Object.fromEntries(choices.map((c) => [c.id, 0]));
    answered.forEach((e) => (e.value || []).forEach((v) => { counts[v] = (counts[v] || 0) + 1; }));
    const ranked = choices.filter((c) => !c.exclusive).map((c) => ({ id: c.id, label: c.label, count: counts[c.id] || 0, pct: pct(counts[c.id] || 0, answered.length) }))
      .sort((a, b) => b.count - a.count);
    return { ...base, kind: 'multi', counts, ranked, otherTexts: answered.filter((e) => (e.value || []).includes(OTHER_ID) && e.other).map((e) => e.other) };
  }
  if (q.type === 'grid') {
    const rows = {};
    for (const r of q.rows || []) {
      const vals = answered.map((e) => e.value && e.value[r.id]).filter(Boolean);
      const counts = Object.fromEntries(choices.map((c) => [c.id, 0]));
      vals.forEach((v) => { counts[v] = (counts[v] || 0) + 1; });
      rows[r.id] = { rowId: r.id, label: r.label, answered: vals.length, counts, ...scoreStats(q, vals) };
    }
    return { ...base, kind: 'grid', rows };
  }
  if (['short', 'long'].includes(q.type)) {
    return { ...base, kind: 'text', items: answered.map((e) => ({ text: String(e.value), at: e.submittedAt || null })) };
  }
  if (q.type === 'date') {
    const counts = {}; answered.forEach((e) => { counts[e.value] = (counts[e.value] || 0) + 1; });
    return { ...base, kind: 'date', counts };
  }
  return { ...base, kind: 'none' };
}

export function localDateKey(d, timeZone = 'America/Denver') {
  try { return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(d)); }
  catch { return new Date(d).toISOString().slice(0, 10); }
}

/**
 * Aggregates responses across all versions of one survey.
 * Questions are keyed by their stable ID; the latest version's wording is used
 * for display, and `drift` flags questions whose scoring/structure changed
 * between versions (results are still tallied by stable choice IDs).
 */
export function computeSurveyAnalytics(versions, responses) {
  const sorted = [...versions].sort((a, b) => a.version - b.version);
  const catalog = new Map(); // qid -> { question, signatures:Set, versions:[] }
  for (const v of sorted) {
    for (const q of orderedQuestions(v.definition)) {
      if (q.enabled === false) continue;
      const cur = catalog.get(q.id) || { question: q, signatures: new Set(), texts: new Set(), versions: [] };
      cur.question = q; cur.signatures.add(questionSignature(q)); cur.texts.add(q.text); cur.versions.push(v.version);
      catalog.set(q.id, cur);
    }
  }
  const latest = sorted[sorted.length - 1];
  const order = latest ? orderedQuestions(latest.definition).map((q) => q.id) : [];
  for (const id of catalog.keys()) if (!order.includes(id)) order.push(id);

  const byDate = {}; const byVersion = {};
  const entries = new Map();
  for (const r of responses) {
    const day = localDateKey(r.submittedAt);
    byDate[day] = (byDate[day] || 0) + 1;
    byVersion[r.version] = (byVersion[r.version] || 0) + 1;
    const ans = r.answers || {};
    for (const [qid, value] of Object.entries(ans)) {
      if (!entries.has(qid)) entries.set(qid, []);
      entries.get(qid).push({ value, other: (r.other || {})[qid], submittedAt: r.submittedAt });
    }
  }
  const questions = order.filter((id) => catalog.has(id)).map((id) => {
    const c = catalog.get(id);
    return {
      question: c.question, versions: c.versions,
      drift: c.signatures.size > 1, wordingChanged: c.texts.size > 1,
      stats: computeQuestionStats(c.question, entries.get(id) || []),
    };
  }).filter((x) => ANSWERABLE(x.question));

  const byRole = (role) => questions.find((x) => x.question.reportRole === role);
  const sat = byRole('overall_satisfaction');
  const ren = byRole('renewal_likelihood');
  return {
    total: responses.length, byDate, byVersion, questions,
    kpis: {
      overallSatisfaction: sat ? { mean: sat.stats.mean, favorablePct: sat.stats.favorablePct, n: sat.stats.scoredN, max: sat.stats.maxScore } : null,
      renewal: ren && ren.stats.sentiment ? ren.stats.sentiment : null,
    },
  };
}

/* ------------------------------------------------------------- text themes */
export const FEEDBACK_THEMES = [
  { key: 'maintenance', label: 'Maintenance concerns', rx: /\b(maint\w*|repair\w*|broken|fix\w*|leak\w*|work order|ac\b|a\/c|heat\w*|hvac|plumb\w*|elevator|washer|dryer|laundry)\b/i },
  { key: 'wifi', label: 'Wi-Fi / internet', rx: /\b(wi-?fi|internet|wifi|connection|network|router|bandwidth|signal)\b/i },
  { key: 'study', label: 'Study spaces', rx: /\b(study|quiet|library|desk|lounge|study room|printer|printing)\b/i },
  { key: 'clean', label: 'Cleanliness', rx: /\b(clean\w*|dirty|trash|garbage|mess\w*|smell\w*|bathroom|restroom)\b/i },
  { key: 'community', label: 'Community engagement', rx: /\b(community|friends?|social|lonely|connect\w*|meet\w*|neighbors?)\b/i },
  { key: 'events', label: 'Event recommendations', rx: /\b(events?|activit\w*|party|parties|games?|movie|trips?|outings?|food|pizza|snacks?)\b/i },
  { key: 'pricing', label: 'Pricing concerns', rx: /\b(price\w*|rent|cost\w*|expensive|afford\w*|fees?|rates?|cheaper)\b/i },
  { key: 'staff', label: 'Staff feedback', rx: /\b(staff|team|office|manager\w*|front desk|ra\b|ras\b|leasing|respons\w*|friendly|rude|helpful)\b/i },
  { key: 'safety', label: 'Safety & security', rx: /\b(safe\w*|secur\w*|lock\w*|door|lighting|camera|parking)\b/i },
  { key: 'amenities', label: 'Amenities', rx: /\b(gym|fitness|pool|amenit\w*|kitchen|appliance\w*|furniture|game room)\b/i },
  { key: 'communication', label: 'Communication', rx: /\b(communicat\w*|emails?|texts?|notif\w*|announce\w*|inform\w*|updates?)\b/i },
];
/** Groups real comments by keyword theme. Never fabricates text. */
export function computeThemes(texts) {
  const themes = FEEDBACK_THEMES.map((t) => ({ key: t.key, label: t.label, count: 0, quotes: [] }));
  let uncategorized = 0; const general = [];
  for (const raw of texts) {
    const t = String(raw || '').trim(); if (!t) continue;
    let hit = false;
    FEEDBACK_THEMES.forEach((th, i) => { if (th.rx.test(t)) { hit = true; themes[i].count++; if (themes[i].quotes.length < 4) themes[i].quotes.push(t); } });
    if (!hit) { uncategorized++; if (general.length < 4) general.push(t); }
  }
  const out = themes.filter((t) => t.count > 0).sort((a, b) => b.count - a.count);
  if (uncategorized) out.push({ key: 'general', label: 'General improvement suggestions', count: uncategorized, quotes: general });
  return out;
}

/* -------------------------------------------------------------- comparison */
/**
 * Builds a comparison table across surveys using comparisonKey (or row
 * comparisonKey for grids). Questions without keys are never matched by position.
 * items: [{ id, title, analytics }]
 */
export function compareSurveys(items) {
  const metrics = new Map(); // key -> { key, label, cells:{surveyId:{mean,favorablePct,n,signature,text}} }
  const add = (key, label, sid, cell) => {
    if (!metrics.has(key)) metrics.set(key, { key, label, cells: {} });
    metrics.get(key).cells[sid] = cell;
  };
  for (const it of items) {
    for (const { question: q, stats } of it.analytics.questions) {
      if (q.type === 'grid') {
        for (const r of q.rows || []) {
          const k = r.comparisonKey || (q.comparisonKey ? `${q.comparisonKey}.${r.id}` : '');
          if (!k) continue;
          const s = stats.rows[r.id];
          add(k, r.label, it.id, { mean: s.mean, favorablePct: s.favorablePct, n: s.scoredN, signature: questionSignature({ ...q, rows: [] }), text: `${q.text} — ${r.label}` });
        }
        continue;
      }
      if (!q.comparisonKey) continue;
      if (stats.kind === 'choice') {
        add(q.comparisonKey, q.text, it.id, { mean: stats.mean, favorablePct: stats.favorablePct, n: stats.scoredN || stats.answered, signature: questionSignature(q), text: q.text, sentiment: stats.sentiment || null });
      } else if (stats.kind === 'multi') {
        add(q.comparisonKey, q.text, it.id, { ranked: stats.ranked.slice(0, 5), n: stats.answered, signature: questionSignature(q), text: q.text });
      }
    }
  }
  const rows = [...metrics.values()].map((m) => {
    const cells = Object.values(m.cells);
    const sigs = new Set(cells.map((c) => c.signature));
    const texts = new Set(cells.map((c) => c.text));
    return { ...m, present: cells.length, scaleMismatch: sigs.size > 1, wordingChanged: texts.size > 1 };
  });
  return { surveys: items.map((i) => ({ id: i.id, title: i.title, total: i.analytics.total })), rows };
}

/* ------------------------------------------------------------ version diff */
/** Summarizes what changes between the last published version and the draft. */
export function diffDefinitions(prev, next) {
  const out = { added: [], removed: [], reworded: [], significant: [], comparable: true };
  if (!prev) return out;
  const p = new Map(orderedQuestions(prev).filter((q) => q.enabled !== false).map((q) => [q.id, q]));
  const n = new Map(orderedQuestions(next).filter((q) => q.enabled !== false).map((q) => [q.id, q]));
  for (const [id, q] of n) if (!p.has(id)) out.added.push({ id, text: q.text });
  for (const [id, q] of p) if (!n.has(id)) out.removed.push({ id, text: q.text });
  for (const [id, q] of n) {
    const o = p.get(id); if (!o) continue;
    if (o.text !== q.text) out.reworded.push({ id, before: o.text, after: q.text });
    if (questionSignature(o) !== questionSignature(q)) {
      const reasons = [];
      if (o.type !== q.type) reasons.push('response type changed');
      if (JSON.stringify((o.choices || []).map((c) => [c.id, c.score])) !== JSON.stringify((q.choices || []).map((c) => [c.id, c.score]))) reasons.push('answer choices or scoring changed');
      if (JSON.stringify(o.scale) !== JSON.stringify(q.scale)) reasons.push('rating scale changed');
      if ((o.rows || []).map((r) => r.id).join() !== (q.rows || []).map((r) => r.id).join()) reasons.push('grid rows changed');
      out.significant.push({ id, text: q.text, reasons: reasons.length ? reasons : ['structure changed'] });
    }
  }
  out.comparable = out.significant.length === 0;
  return out;
}

/** Deep clone a definition giving every section/question fresh IDs (used for "new survey from…"). Comparison keys are preserved. */
export function cloneDefinition(def, { freshIds = false } = {}) {
  const copy = JSON.parse(JSON.stringify(def || emptyDefinition()));
  if (!freshIds) return copy;
  const sMap = {}; const qMap = {};
  copy.sections.forEach((s) => { const nid = uid('s'); sMap[s.id] = nid; s.id = nid; });
  copy.questions.forEach((q) => { const nid = uid('q'); qMap[q.id] = nid; q.id = nid; q.sectionId = sMap[q.sectionId]; });
  copy.questions.forEach((q) => { if (q.logic) q.logic.conditions.forEach((c) => { c.questionId = qMap[c.questionId] || c.questionId; }); });
  return copy;
}
