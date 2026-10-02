import { nameMatches } from './_units.js';

/**
 * verifyResident — the single resident-verification function used by the guest kiosk, resident
 * pre-registration and the staff "Test resident verification" tool.
 *
 * Business rule (from the kiosk wording "Email or phone on file"):
 *   Full name  AND  unit + bed  AND  (email OR phone matches the directory record)
 *
 * Data source: the `reslife_directory` collection (the same records the Resident Directory tab shows),
 * filtered by the kiosk's property name (reslife_guest_settings.property). No caches or copies.
 *
 * Returns { verified, resident, reason, detail } where reason is one of:
 *   INVALID_INPUT · DATA_SOURCE_ERROR · RESIDENT_NOT_FOUND · NAME_MISMATCH · UNIT_MISMATCH · BED_MISMATCH ·
 *   CONTACT_MISMATCH · CONTACT_NOT_ON_FILE
 * `detail` (candidate breakdown) is for staff diagnostics only — never send it to the resident-facing kiosk.
 */

// ── Normalization helpers ──
export const normText = s => String(s == null ? '' : s).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
export const normEmail = s => String(s == null ? '' : s).trim().toLowerCase();
/** Digits only; a leading US country code (+1 / 1) is dropped so +1 559 852 1926 == 5598521926. */
export function normPhone(s) {
  let d = String(s == null ? '' : s).replace(/\D/g, '');
  if (d.length === 11 && d[0] === '1') d = d.slice(1);
  return d;
}
const BED_RE = /^[A-Z]\d{0,2}$/;
const normBed = s => String(s == null ? '' : s).toUpperCase().replace(/\s+/g, '');

/**
 * Parse an entered or stored unit/bed into { unit, bed }.
 * Accepts "1107-B1", "1107 B1", "1107 / B1", "1107–B1", "Unit 1107-B1", "1-1107-B1" (building prefix), "1107".
 * The bed letter and number are kept exactly, so 1107-B1 never equals 1107-B2.
 */
export function parseUnitBed(raw) {
  const s = String(raw == null ? '' : raw).toUpperCase().replace(/[–—]/g, '-').replace(/\bUNIT\b|\bAPT\.?\b|#/g, ' ').trim();
  const m = s.match(/(\d{3,6})[\s\-\/_.]*([A-Z]\d{0,2})?\s*$/);
  return m ? { unit: m[1], bed: m[2] || '' } : { unit: '', bed: '' };
}

/** Read unit + bed from a directory record, whichever fields it uses (unit / room / bed / baseUnit / legacy names). */
export function recordUnitBed(r) {
  const unitRaw = r.unit != null && r.unit !== '' ? r.unit : (r.unitNumber != null ? r.unitNumber : r.baseUnit);
  const bedField = [r.bed, r.bedSpace, r.room].map(normBed).find(v => BED_RE.test(v)) || '';
  const fromUnit = parseUnitBed(unitRaw);
  if (fromUnit.unit) return { unit: fromUnit.unit, bed: fromUnit.bed || bedField };
  const fromRoom = parseUnitBed(r.room);
  return { unit: fromRoom.unit, bed: fromRoom.bed || bedField };
}

const mask = {
  name: s => normText(s).split(' ').map(w => w[0] + '•').join(' '),
  email: s => { const [u, d] = normEmail(s).split('@'); return u ? u.slice(0, 2) + '•••@' + (d || '') : ''; },
  phone: s => { const d = normPhone(s); return d ? '•••' + d.slice(-4) : ''; },
};

export async function verifyResident(db, property, { fullName, unitBed, contact }, opts = {}) {
  const entered = { name: normText(fullName), ...parseUnitBed(unitBed), contact: String(contact || '').trim() };
  const isEmail = entered.contact.includes('@');
  const enteredEmail = isEmail ? normEmail(entered.contact) : '';
  const enteredPhone = isEmail ? '' : normPhone(entered.contact);
  const out = (verified, resident, reason, candidates) => {
    const result = { verified, resident: resident || null, reason: reason || null, detail: { entered: { name: entered.name, unit: entered.unit, bed: entered.bed, contactType: isEmail ? 'email' : (enteredPhone ? 'phone' : 'none') }, candidates: candidates || [] } };
    // Clean, privacy-safe server log for every attempt (masked values only).
    if (opts.log !== false) console.log('[guest-verify]', JSON.stringify({ property, verified, reason: result.reason, entered: { name: mask.name(fullName), unitBed: `${entered.unit}-${entered.bed}`, contact: isEmail ? mask.email(enteredEmail) : mask.phone(enteredPhone) }, candidates: (candidates || []).length }));
    return result;
  };

  if (!entered.name || !entered.unit) return out(false, null, 'INVALID_INPUT');
  if (!enteredEmail && enteredPhone.length < 7) return out(false, null, 'INVALID_INPUT');

  let all;
  try {
    all = await db.collection('reslife_directory').find({ property }).project({ residentName: 1, unit: 1, room: 1, bed: 1, baseUnit: 1, unitNumber: 1, bedSpace: 1, email: 1, phone: 1 }).toArray();
  } catch (e) { console.error('[guest-verify] directory read failed', e.message); return out(false, null, 'DATA_SOURCE_ERROR'); }
  if (!all.length) return out(false, null, 'DATA_SOURCE_ERROR');

  // Evaluate every record that shares the name OR the unit, so diagnostics explain near-misses.
  const evals = all.map(r => {
    const ub = recordUnitBed(r);
    const emailOnFile = normEmail(r.email), phoneOnFile = normPhone(r.phone);
    const nameMatch = nameMatches(fullName, r.residentName);
    const unitMatch = !!ub.unit && ub.unit === entered.unit;
    const bedMatch = unitMatch && ub.bed === entered.bed;
    const emailMatch = !!enteredEmail && !!emailOnFile && emailOnFile === enteredEmail;
    const phoneMatch = !!enteredPhone && !!phoneOnFile && phoneOnFile === enteredPhone;
    return { r, ub, nameMatch, unitMatch, bedMatch, emailMatch, phoneMatch, contactMatch: emailMatch || phoneMatch, hasContact: !!(emailOnFile || phoneOnFile) };
  }).filter(e => e.nameMatch || e.unitMatch);

  const detail = evals.map(e => ({
    residentName: e.r.residentName, residentUnit: e.ub.unit, residentBed: e.ub.bed, normalizedResidentUnitBed: e.ub.bed ? `${e.ub.unit}-${e.ub.bed}` : e.ub.unit,
    storedUnitField: e.r.unit, storedRoomField: e.r.room,
    residentEmail: opts.full ? e.r.email || '' : mask.email(e.r.email), residentPhone: opts.full ? e.r.phone || '' : mask.phone(e.r.phone),
    nameMatch: e.nameMatch, unitBedMatch: e.bedMatch, emailMatch: e.emailMatch, phoneMatch: e.phoneMatch, contactMatch: e.contactMatch,
    overallMatch: e.nameMatch && e.bedMatch && e.contactMatch,
  }));

  const win = evals.find(e => e.nameMatch && e.bedMatch && e.contactMatch);
  if (win) return out(true, win.r, null, detail);

  const byName = evals.filter(e => e.nameMatch);
  const atBed = evals.find(e => e.bedMatch);
  let reason;
  if (!byName.length) reason = atBed ? 'NAME_MISMATCH' : 'RESIDENT_NOT_FOUND';
  else if (!byName.some(e => e.unitMatch)) reason = 'UNIT_MISMATCH';
  else if (!byName.some(e => e.bedMatch)) reason = 'BED_MISMATCH';
  else reason = byName.some(e => e.bedMatch && e.hasContact) ? 'CONTACT_MISMATCH' : 'CONTACT_NOT_ON_FILE';
  return out(false, null, reason, detail);
}

export const REASON_TEXT = {
  INVALID_INPUT: 'Name, unit & bed, and an email or phone are all required.',
  DATA_SOURCE_ERROR: 'The Resident Directory for this property is empty or could not be read.',
  RESIDENT_NOT_FOUND: 'No resident with that name, and no one at that unit & bed.',
  NAME_MISMATCH: 'Someone lives at that unit & bed, but the name doesn’t match.',
  UNIT_MISMATCH: 'The name was found, but at a different unit.',
  BED_MISMATCH: 'The name and unit match, but the bed is different (check B vs B1/B2).',
  CONTACT_MISMATCH: 'Name and unit & bed match, but the email/phone doesn’t match the one on file.',
  CONTACT_NOT_ON_FILE: 'Name and unit & bed match, but this resident has no email or phone on file — add one in the Resident Directory.',
};
