/**
 * Restricted safety records + housing accommodations — pure logic (unit-testable, no DB).
 *
 * Name matching is a SCREENING aid only. It returns "possible" or "strong" candidates that a person must
 * verify against ID and the official record. Nothing in this file ever concludes that a person IS a
 * restricted individual.
 */

export const RESTRICTION_STATUSES = ['pending_verification', 'active', 'expired', 'revoked'];
export const RESTRICTION_SUBJECTS = ['guest', 'resident'];
export const RESTRICTION_SCOPES = ['entire_property', 'residential_buildings', 'specific_areas', 'other'];
export const CHECK_OUTCOMES = ['not_match_id_verified', 'escalated', 'confirmed_match_escalated', 'unable_to_verify'];

export const ACCOM_CATEGORIES = ['esa', 'service_animal', 'housing_accommodation'];
export const ACCOM_CATEGORY_LABELS = { esa: 'Emotional Support Animal', service_animal: 'Service Animal', housing_accommodation: 'Housing Accommodation' };
export const ACCOM_STATUSES = ['not_documented', 'pending_verification', 'approved', 'revoked', 'expired'];

// ---- roles (least privilege) ----
export const isSiteAdmin = u => u && u.role === 'admin';
export const isAdminTier = u => u && (u.role === 'admin' || u.role === 'reslife-admin');
export const isRec = u => u && u.role === 'reslife-rec';

export function normName(s) {
  return String(s || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z\s'-]/g, ' ').replace(/['-]/g, '').replace(/\s+/g, ' ').trim();
}
/** "Last, First Middle" or "First Middle Last" -> { first, last, tokens } */
export function nameParts(s) {
  const raw = String(s || '');
  let first = '', last = '';
  if (raw.includes(',')) { const [l, f] = raw.split(','); last = normName(l).split(' ').pop() || ''; first = normName(f).split(' ')[0] || ''; }
  else { const t = normName(raw).split(' ').filter(Boolean); first = t[0] || ''; last = t.length > 1 ? t[t.length - 1] : ''; }
  return { first, last, tokens: normName(raw.replace(',', ' ')).split(' ').filter(Boolean) };
}
export function lev(a, b) {
  if (a === b) return 0; if (!a.length) return b.length; if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[b.length];
}

/**
 * Screening level between a typed name and one record name.
 *   'strong'   : same first + last name (order/punctuation/case-insensitive)
 *   'possible' : same last name and first name within 1 edit or same initial; or last name within 1 edit and same first
 *   null       : no screening hit
 * Neither level is an identification.
 */
export function nameMatchLevel(input, recordName) {
  const a = nameParts(input), b = nameParts(recordName);
  if (!a.first || !b.first || !a.last || !b.last) return null;
  if (a.first === b.first && a.last === b.last) return 'strong';
  const sameSet = a.tokens.length >= 2 && a.tokens.slice().sort().join(' ') === b.tokens.slice().sort().join(' ');
  if (sameSet) return 'strong';
  const lastClose = a.last === b.last || (a.last.length >= 4 && lev(a.last, b.last) <= 1);
  const firstClose = a.first === b.first || (a.first.length >= 3 && lev(a.first, b.first) <= 1) || (a.first.length === 1 || b.first.length === 1 ? a.first[0] === b.first[0] : false);
  if (lastClose && firstClose) return 'possible';
  return null;
}

export function bestMatch(input, record) {
  const names = [record.name, ...(record.aliases || [])].filter(Boolean);
  let best = null;
  for (const n of names) { const l = nameMatchLevel(input, n); if (l === 'strong') return 'strong'; if (l) best = l; }
  return best;
}

/** Effective status at `now`: active records past their expiration read as expired. */
export function effectiveRestrictionStatus(r, now = new Date()) {
  // Dates are stored as YYYY-MM-DD; a restriction stays active through its expiration date.
  if (r.status === 'active' && r.expiresAt && String(r.expiresAt).slice(0, 10) < now.toISOString().slice(0, 10)) return 'expired';
  return RESTRICTION_STATUSES.includes(r.status) ? r.status : 'pending_verification';
}
export function reviewDue(r, now = new Date()) {
  return !!(r.reviewDate && String(r.reviewDate).slice(0, 10) <= now.toISOString().slice(0, 10) && ['active', 'approved'].includes(r.status));
}

/** Requirements before a restriction may become Active. Returns list of missing items. */
export function activationMissing(r) {
  const miss = [];
  if (!String(r.name || '').trim()) miss.push('Name');
  if (!String(r.authorizingDepartment || '').trim()) miss.push('Authorizing department');
  if (!String(r.referenceNumber || '').trim()) miss.push('Reference / incident number');
  if (!r.effectiveDate) miss.push('Effective date');
  if (!String(r.verificationNote || '').trim()) miss.push('Verification note (what official documentation was reviewed)');
  if (!RESTRICTION_SCOPES.includes(r.scope)) miss.push('Restriction scope');
  return miss;
}

/**
 * Role-filtered projection of a restriction for a guest-check result.
 *   RA        : no name/ids — just "possible match, pause and escalate" + RA-authorized instructions
 *   REC       : name, scope, dates, authorizing dept, reference #, operational instructions, identifying notes
 *   AdminTier : everything except document reference internals stay as stored
 */
export function projectForCheck(r, user, level) {
  const base = { level, recordId: String(r._id || r.id || ''), escalation: r.escalationInstructions || '' };
  if (!user || (!isAdminTier(user) && !isRec(user))) {
    return { level, raInstructions: r.raInstructions || '', escalation: r.escalationInstructions || '' };
  }
  return Object.assign(base, {
    name: r.name, aliases: r.aliases || [], subjectType: r.subjectType, scope: r.scope, scopeDetail: r.scopeDetail || '',
    effectiveDate: r.effectiveDate || '', expiresAt: r.expiresAt || '', authorizingDepartment: r.authorizingDepartment || '',
    referenceNumber: r.referenceNumber || '', operationalInstructions: r.operationalInstructions || '', raInstructions: r.raInstructions || '',
    identifyingNotes: r.identifyingNotes || '',
  });
}

const s = (v, n) => String(v == null ? '' : v).trim().slice(0, n);
const d = v => { if (!v) return ''; const x = new Date(v); return isNaN(x) ? '' : x.toISOString().slice(0, 10); };

export function cleanRestriction(b) {
  return {
    subjectType: RESTRICTION_SUBJECTS.includes(b.subjectType) ? b.subjectType : 'guest',
    residentId: s(b.residentId, 40),
    name: s(b.name, 120),
    aliases: (Array.isArray(b.aliases) ? b.aliases : String(b.aliases || '').split(/[\n;]/)).map(x => s(x, 120)).filter(Boolean).slice(0, 10),
    identifyingNotes: s(b.identifyingNotes, 500),
    scope: RESTRICTION_SCOPES.includes(b.scope) ? b.scope : '',
    scopeDetail: s(b.scopeDetail, 500),
    effectiveDate: d(b.effectiveDate),
    expiresAt: d(b.expiresAt),
    reviewDate: d(b.reviewDate),
    authorizingDepartment: s(b.authorizingDepartment, 120),
    referenceNumber: s(b.referenceNumber, 80),
    verificationNote: s(b.verificationNote, 1000),
    operationalInstructions: s(b.operationalInstructions, 1000),
    raInstructions: s(b.raInstructions, 500),
    escalationInstructions: s(b.escalationInstructions, 500),
    documentRef: s(b.documentRef, 300),
  };
}

// ---- accommodations ----
export function cleanAccommodation(b) {
  return {
    residentId: s(b.residentId, 40),
    category: ACCOM_CATEGORIES.includes(b.category) ? b.category : '',
    status: ACCOM_STATUSES.includes(b.status) ? b.status : '',
    effectiveDate: d(b.effectiveDate),
    reviewDate: d(b.reviewDate),
    expirationDate: d(b.expirationDate),
    verifyingDepartment: s(b.verifyingDepartment, 120),
    lastVerifiedAt: d(b.lastVerifiedAt),
    verificationRef: s(b.verificationRef, 120),
    operationalNotes: s(b.operationalNotes, 500),
  };
}
export function accommodationErrors(a) {
  const e = [];
  if (!a.residentId) e.push('residentId is required');
  if (!a.category) e.push(`category must be one of ${ACCOM_CATEGORIES.join(', ')}`);
  if (!a.status) e.push(`status must be one of ${ACCOM_STATUSES.join(', ')}`);
  if (a.status === 'approved') {
    if (!a.verifyingDepartment) e.push('Approved records need the verifying department');
    if (!a.lastVerifiedAt) e.push('Approved records need the date last verified');
  }
  if (a.effectiveDate && a.expirationDate && a.expirationDate < a.effectiveDate) e.push('Expiration date is before effective date');
  return e;
}
/** Words that suggest medical/diagnostic content leaked into operational notes. Advisory only. */
export const SENSITIVE_HINTS = /\b(diagnos\w*|anxiety|depress\w*|ptsd|adhd|autis\w*|bipolar|disorder|medication|therap(y|ist)|psychiatr\w*|doctor'?s? (note|letter)|medical)\b/i;
export function effectiveAccomStatus(a, now = new Date()) {
  if (a.status === 'approved' && a.expirationDate && a.expirationDate < now.toISOString().slice(0, 10)) return 'expired';
  return a.status;
}

/**
 * Validate an import batch. `known` = Set of resident ids in this property; `existing` = Map key(resId|cat) -> record.
 * Never overwrites unless `overwrite` and the row is complete.
 */
export function planImport(rows, known, existing, overwrite) {
  const plan = []; const seen = new Set();
  (Array.isArray(rows) ? rows : []).slice(0, 2000).forEach((raw, i) => {
    const a = cleanAccommodation(Object.assign({}, raw, { category: String(raw.category || '').trim().toLowerCase().replace(/\s+/g, '_'), status: String(raw.status || '').trim().toLowerCase().replace(/\s+/g, '_') }));
    const row = i + 2; // spreadsheet row (header = 1)
    const errs = accommodationErrors(a);
    if (a.residentId && !known.has(a.residentId)) errs.push('residentId not found in this property\u2019s Resident Directory');
    const key = a.residentId + '|' + a.category;
    if (seen.has(key)) errs.push('Duplicate resident + category in this file');
    seen.add(key);
    if (SENSITIVE_HINTS.test(a.operationalNotes)) errs.push('operationalNotes appear to contain medical/diagnostic information — remove it');
    if (errs.length) { plan.push({ row, action: 'error', errors: errs }); return; }
    const prev = existing.get(key);
    if (!prev) { plan.push({ row, action: 'create', record: a }); return; }
    const changed = ['status', 'effectiveDate', 'reviewDate', 'expirationDate', 'verifyingDepartment', 'lastVerifiedAt', 'verificationRef', 'operationalNotes'].some(k => (a[k] || '') !== (prev[k] || ''));
    if (!changed) { plan.push({ row, action: 'unchanged' }); return; }
    const complete = a.status && a.verifyingDepartment && a.lastVerifiedAt;
    if (!overwrite || !complete) { plan.push({ row, action: 'conflict', errors: [overwrite ? 'Row is incomplete (status, verifyingDepartment and lastVerifiedAt are required to replace an existing record)' : 'A record already exists; enable "replace existing records" to update it'] }); return; }
    plan.push({ row, action: 'update', record: a, previousId: String(prev._id) });
  });
  return plan;
}
