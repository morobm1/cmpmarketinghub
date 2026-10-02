/**
 * Resident Directory — unit/bed and name parsing shared by the directory import, tags and the guest kiosk.
 *
 * Unit labels: Entrata exports bedspaces like "1-1111-B" (building prefix) or "1111-B", double-occupancy
 * beds like "1112-B2", or a plain unit "1111". We keep:
 *   unit      "1111-B"   canonical unit + bed label (what residents type at the kiosk)
 *   baseUnit  "1111"
 *   room/bed  "B"        bed only (was previously a duplicate of the unit — fixed on import / refresh)
 *   building  "1"        first digit of the unit number
 *   floor     "1"        second digit of the unit number
 */
export function parseUnit(raw) {
  const s = String(raw || '').toUpperCase().replace(/[–—]/g, '-').trim();
  const m = s.match(/(\d{3,6})\s*-?\s*([A-Z]\d{0,2})?\s*$/);
  if (!m) return { unit: s, baseUnit: s, bed: '', building: '', floor: '' };
  const baseUnit = m[1], bed = m[2] || '';
  return { unit: bed ? `${baseUnit}-${bed}` : baseUnit, baseUnit, bed, building: baseUnit[0] || '', floor: baseUnit[1] || '' };
}
/** Canonical compare key for a unit/bed: "1-1111-b" → "1111-B". */
export const unitCanon = raw => parseUnit(raw).unit;

const words = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9, ]+/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * Directory names are "Last, First Preferred" (preferred name optional), e.g. "Smith, Daniel Danny".
 * Returns { last:[...], firsts:[...] } — firsts holds the first name plus any preferred name.
 */
export function parseName(raw) {
  const w = words(raw);
  if (w.includes(',')) {
    const [last, rest] = [w.slice(0, w.indexOf(',')), w.slice(w.indexOf(',') + 1)];
    return { last: last.split(' ').filter(Boolean), firsts: rest.replace(/,/g, ' ').split(' ').filter(Boolean) };
  }
  const parts = w.split(' ').filter(Boolean);
  return { last: parts.slice(-1), firsts: parts.slice(0, -1) };
}

/** Display form "Daniel (Danny) Smith" from "Smith, Daniel Danny". */
export function displayName(raw) {
  const s = String(raw || '').trim();
  if (!s.includes(',')) return s;
  const last = s.slice(0, s.indexOf(',')).trim();
  const rest = s.slice(s.indexOf(',') + 1).trim().split(/\s+/).filter(Boolean);
  if (!rest.length) return last;
  return `${rest[0]}${rest.length > 1 ? ` (${rest.slice(1).join(' ').replace(/[()]/g, '')})` : ''} ${last}`;
}

/**
 * Does what a resident typed ("Daniel Smith", "Danny Smith", "Smith, Daniel") match the directory name
 * "Smith, Daniel Danny"? Every last-name word must be present, at least one first/preferred name must be
 * present, and nothing else may be typed.
 */
export function nameMatches(entered, onFile) {
  const dir = parseName(onFile);
  const typed = words(entered).replace(/,/g, ' ').split(' ').filter(Boolean);
  if (!typed.length || !dir.last.length) return false;
  const allowed = new Set([...dir.last, ...dir.firsts]);
  return dir.last.every(w => typed.includes(w)) && dir.firsts.some(w => typed.includes(w)) && typed.every(w => allowed.has(w));
}
