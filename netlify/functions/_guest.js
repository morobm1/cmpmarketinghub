import crypto from 'crypto';
import { ObjectId } from './_db.js';

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

// Unit/bed compare key: letters+digits only, so "7417-A", "7417 a", "7417A", "#7417-a" all match.
export const unitKey = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
// Name compare: word sets, so "Lee, Jordan" (Entrata Last, First) matches "Jordan Lee".
const nameWords = s => normName(s).split(' ').filter(Boolean);
function nameMatches(entered, onFile) {
  const a = nameWords(entered), b = nameWords(onFile);
  if (!a.length || !b.length) return false;
  if ([...a].sort().join(' ') === [...b].sort().join(' ')) return true;            // same words, any order
  // Allow a missing/extra middle name: first + last words of either order must both appear.
  const first = a[0], last = a[a.length - 1];
  return a.length >= 2 && b.includes(first) && b.includes(last) && Math.abs(a.length - b.length) <= 1;
}

/**
 * Find a resident by full name + unit/bed. If the resident types an email and an email is on file,
 * it must match; same for phone. (If that kind of contact isn't on file, name + unit is enough.)
 * Returns { resident } on success or { reason } explaining why it failed (reason is for staff diagnostics only).
 */
export async function findResident(db, property, { name, unit, contact }) {
  const uk = unitKey(unit);
  if (!nameWords(name).length || !uk) return { reason: 'Name and unit are required.' };
  const all = await db.collection('reslife_directory').find({ property }).project({ residentName: 1, unit: 1, room: 1, email: 1, phone: 1 }).toArray();
  if (!all.length) return { reason: `The Resident Directory for "${property}" is empty — import the roster first.` };
  const inUnit = all.filter(r => unitKey(r.unit) === uk || unitKey(r.room) === uk);
  if (!inUnit.length) {
    // Common case: directory has the base unit only ("7417") while the resident typed "7417-A", or vice versa.
    const base = uk.replace(/[A-Z]\d{0,2}$/, '');
    const loose = all.filter(r => [r.unit, r.room].some(v => { const k = unitKey(v); return k && (k === base || k.replace(/[A-Z]\d{0,2}$/, '') === uk); }));
    if (!loose.length) return { reason: `No resident has unit "${unit}" in the directory.` };
    inUnit.push(...loose);
  }
  const hit = inUnit.find(r => nameMatches(name, r.residentName));
  if (!hit) return { reason: `Unit "${unit}" found, but no name matched. On file for that unit: ${inUnit.map(r => r.residentName).join(', ')}.` };
  const c = String(contact || '').trim();
  if (c) {
    if (c.includes('@')) {
      if (hit.email && hit.email.trim().toLowerCase() !== c.toLowerCase()) return { reason: `Name and unit matched, but the email didn’t match the one on file (${maskEmail(hit.email)}).` };
    } else if (digits(c).length >= 7) {
      if (hit.phone && digits(hit.phone) !== digits(c)) return { reason: `Name and unit matched, but the phone didn’t match the one on file (…${digits(hit.phone).slice(-4)}).` };
    }
  }
  return { resident: hit };
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
