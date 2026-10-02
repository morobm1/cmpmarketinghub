import crypto from 'crypto';
import { ObjectId } from './_db.js';
import { parseUnit, unitCanon, nameMatches } from './_units.js';
import { verifyResident, REASON_TEXT } from './_verify.js';

/**
 * Shared helpers for the Reslife guest log, the front-desk kiosk and pre-registration links.
 */
export const DEFAULT_NOTIFY = ['live@theharbourocc.com', 'info@theharbourocc.com'];
export const ID_TYPES = ["Driver's License", 'State ID', 'Student ID'];
export const DURATIONS = {
  '1h': { label: '1 hour', hours: 1 },
  '2h': { label: '2 hours', hours: 2 },
  '3h': { label: '3 hours', hours: 3 },
  '4h': { label: '4 hours', hours: 4 },
  'evening': { label: 'Until 11:00 PM', until: 23 },
  'overnight': { label: 'Overnight (leaves tomorrow morning)', overnight: true },
};
const MAX_PHOTO = 900 * 1024; // compressed JPEG data URL

// "Jordan  M. Lee" → "jordan m lee"
export const normName = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
// "1234-a1", "1234 - A1" → "1234-A1"
export const normUnit = s => String(s || '').toUpperCase().replace(/\s+/g, '').replace(/[–—]/g, '-');
export const validUnitFormat = s => /^\d{2,6}-[A-Z]\d{0,2}$/.test(normUnit(s));
export const digits = s => String(s || '').replace(/\D/g, '').slice(-10);

// Property-local time (functions run in UTC). Returns the UTC instant for a local wall-clock time.
const TZ = 'America/Los_Angeles';
function localParts(date) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: TZ, year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', hourCycle: 'h23' }).formatToParts(date).map(x => [x.type, +x.value || x.value]));
  return { y: p.year, m: p.month, d: p.day, h: p.hour };
}
function localToUtc(y, m, d, h) {
  const guess = Date.UTC(y, m - 1, d, h);
  const lp = localParts(new Date(guess));
  const asIf = Date.UTC(lp.y, lp.m - 1, lp.d, lp.h);
  return new Date(guess - (asIf - guess));
}
export function expectedOut(durationKey, from) {
  const d = DURATIONS[durationKey];
  const t = new Date(from || Date.now());
  if (!d) return null;
  if (d.hours) return new Date(t.getTime() + d.hours * 3600e3).toISOString();
  const lp = localParts(t);
  if (d.until) { let x = localToUtc(lp.y, lp.m, lp.d, d.until); if (x < t) x = localToUtc(lp.y, lp.m, lp.d + 1, d.until); return x.toISOString(); }
  if (d.overnight) return localToUtc(lp.y, lp.m, lp.d + 1, 11).toISOString();
  return null;
}

export function cleanPhoto(p) {
  const s = String(p || '');
  if (!/^data:image\/(jpeg|png|webp);base64,/.test(s)) return '';
  return s.length <= MAX_PHOTO * 1.37 ? s : '';
}

export async function getSettings(db, property, create) {
  const col = db.collection('reslife_guest_settings');
  let s = await col.findOne({ property });
  if (!s && create) {
    s = { property, notifyEmails: DEFAULT_NOTIFY, kioskKey: crypto.randomBytes(12).toString('hex'), checkinAfter: '19:00', createdAt: new Date().toISOString() };
    await col.insertOne(s);
  }
  return s || { property, notifyEmails: DEFAULT_NOTIFY, kioskKey: null, checkinAfter: '19:00' };
}

// Unit/bed compare key — kept for callers that only need "is anything typed?" checks.
export const unitKey = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

/**
 * Find a resident by full name + unit/bed.
 *  - Name: directory stores "Last, First Preferred" ("Smith, Daniel Danny"); "Daniel Smith" or "Danny Smith" match.
 *  - Unit & bed must match exactly after normalizing ("1111-b", "1-1111-B" → "1111-B"). Double-occupancy
 *    beds must include the number: "1112-B2" ≠ "1112-B".
 *  - If an email is typed and one is on file it must match; same for phone. If that kind isn't on file,
 *    name + unit/bed is enough.
 * Returns { resident } or { reason } (reason is for staff diagnostics only, never shown at the kiosk).
 */
export async function findResident(db, property, { name, unit, contact }) {
  const v = await verifyResident(db, property, { fullName: name, unitBed: unit, contact }, { log: false });
  return v.verified ? { resident: v.resident } : { reason: REASON_TEXT[v.reason] || v.reason, code: v.reason };
}
const maskEmail = e => { const [u, d] = String(e).split('@'); return (u || '').slice(0, 2) + '•••@' + (d || ''); };
export async function matchResident(db, property, q) { return (await findResident(db, property, q)).resident || null; }
/** Record the visit on the resident's directory record. */
export async function recordVisitOnResident(db, property, residentId, entry) {
  if (!residentId) return;
  try {
    await db.collection('reslife_directory').updateOne(
      { _id: new ObjectId(residentId), property },
      { $push: { guestVisits: { logId: entry.logId, guestName: entry.guestName, date: entry.date, status: entry.status, source: entry.source } } }
    );
  } catch (e) { /* non-fatal */ }
}

/** Email the resident + property inboxes through the existing Google Apps Script webhook. */
export async function sendGuestEmail(db, { to, subject, html, text, meta }) {
  const url = process.env.CMP_SCRIPT_URL, secret = process.env.CMP_TASK_SECRET;
  const recipients = [...new Set((to || []).map(e => String(e || '').trim().toLowerCase()).filter(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)))];
  let result = { success: false, skipped: true, reason: 'missing_config' };
  if (url && secret && recipients.length) {
    try {
      const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ secret, eventType: 'reslife_guest_notice', to: recipients.join(','), subject, html, text }) });
      const body = await r.text();
      result = r.ok && !/^\s*</.test(body) ? { success: true } : { success: false, error: 'HTTP ' + r.status };
    } catch (e) { result = { success: false, error: e.message }; }
  }
  try { await db.collection('notificationLog').insertOne({ type: 'reslife_guest_notice', to: recipients, subject, provider: 'google_apps_script', status: result.success ? 'sent' : (result.skipped ? 'skipped' : 'failed'), errorMessage: result.error || null, meta: meta || null, sentAt: new Date().toISOString() }); } catch (e) {}
  return result;
}

export function guestEmailHtml({ property, residentName, unit, guestName, guestPhone, guestEmail, idType, inTime, outTime, kind, note }) {
  const fmt = iso => iso ? new Date(iso).toLocaleString('en-US', { timeZone: 'America/Los_Angeles', weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—';
  const title = kind === 'prereg' ? 'Guest pre-registered' : 'Guest checked in';
  const row = (k, v) => v ? `<tr><td style="padding:6px 0;color:#64748b;font-size:13px;width:150px">${k}</td><td style="padding:6px 0;font-size:14px;color:#103b78;font-weight:bold">${String(v).replace(/</g, '&lt;')}</td></tr>` : '';
  return `<div style="background:#eef2f6;padding:24px 10px;font-family:arial,helvetica,sans-serif"><table role="presentation" width="100%" style="max-width:600px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;border-collapse:collapse">
  <tr><td style="height:6px;background:#f58220"></td></tr>
  <tr><td style="padding:24px 30px;background:#103b78;color:#fff"><div style="font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:#f58220;font-weight:bold">${property}</div><div style="font-size:26px;font-weight:bold;margin-top:6px">${title}</div></td></tr>
  <tr><td style="padding:24px 30px;color:#42566b;font-size:15px;line-height:24px">
    <p style="margin:0 0 14px">${kind === 'prereg' ? `A guest has been pre-registered for <b>${residentName}</b>. ${note || ''}` : `<b>${guestName}</b> has checked in at the front desk to visit <b>${residentName}</b>.`}</p>
    <table role="presentation" width="100%" style="border-collapse:collapse">${row('Resident', residentName)}${row('Unit', unit)}${row('Guest', guestName)}${row('Guest phone', guestPhone)}${row('Guest email', guestEmail)}${row('ID provided', idType)}${row(kind === 'prereg' ? 'Expected' : 'Checked in', inTime ? fmt(inTime) : '')}${row('Expected departure', outTime ? fmt(outTime) : '')}</table>
    <p style="margin:18px 0 0;font-size:13px;color:#64748b">Residents are responsible for their guests and the community standards in their License Agreement. Questions? Contact The Harbour team at 714-643-5100.</p>
  </td></tr>
  <tr><td style="padding:16px 30px;background:#103b78;color:#dce6f2;font-size:12px;text-align:center">The Harbour at Orange Coast College &bull; 1369 Adams Avenue &bull; Costa Mesa, CA</td></tr>
  <tr><td style="height:6px;background:#f58220"></td></tr></table></div>`;
}
