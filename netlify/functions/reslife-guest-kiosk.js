import jwt from 'jsonwebtoken';
import { verifyResident } from './_verify.js';
import { displayName } from './_units.js';
import { getDb, ObjectId } from './_db.js';
import { json } from './_reslife.js';
import { screenGuest } from './_safetycheck.js';
import { ID_TYPES, DURATIONS, normName, normUnit, unitKey, expectedOut, cleanPhoto, matchResident, recordVisitOnResident, sendGuestEmail, guestEmailHtml } from './_guest.js';

/**
 * Reslife Guest Kiosk — PUBLIC endpoint used by guest_checkin.html (front-desk iPad + resident pre-registration links).
 * No login. Access is scoped by the property's secret kiosk key (k) or a one-time invite code.
 *
 * POST { action:'config', k?, invite? }                          → { property, mode:'kiosk'|'invite', resident?, checkinAfter }
 * POST { action:'verify', k, name, unit, contact }               → { ok, token, firstName, unit, pending:[{id, guestName}] }
 * POST { action:'checkin', token, guestName, guestPhone, guestEmail, idType, idPhoto, duration, preregId? } → { ok, entry }
 * POST { action:'prereg', invite, guestName, guestPhone, guestEmail, idType, idPhoto, duration, expectedDate } → { ok }
 *
 * Verification requires the resident's full name exactly as it appears in Entrata / the directory and the unit in
 * 1234-A / 1234-A1 format, plus an email or phone that matches the directory record (when one is on file).
 */
const SECRET = (process.env.JWT_SECRET || 'dev-secret-change-me') + ':guest-kiosk';
const MAX_FAILS = 8;          // per kiosk per 10 minutes
const clip = (s, n) => String(s || '').trim().slice(0, n);

async function propertyForKey(db, k) {
  if (!k || typeof k !== 'string' || k.length < 16) return null;
  const s = await db.collection('reslife_guest_settings').findOne({ kioskKey: k });
  return s ? s : null;
}

export async function handler(event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  let body;
  try { body = JSON.parse(event.body || '{}'); } catch { return json(400, { ok: false, error: 'Bad request' }); }
  const db = await getDb();
  const guests = db.collection('reslife_guest_log');
  const invites = db.collection('reslife_guest_invites');
  const now = new Date();

  try {
    if (body.action === 'config') {
      if (body.invite) {
        const inv = await invites.findOne({ code: String(body.invite) });
        if (!inv || inv.used || new Date(inv.expiresAt) < now) return json(404, { ok: false, error: 'This pre-registration link has expired or was already used. Please ask the front desk for a new one.' });
        const s = await db.collection('reslife_guest_settings').findOne({ property: inv.property });
        return json(200, { ok: true, mode: 'invite', property: inv.property, resident: { firstName: (inv.residentName || '').split(' ')[0], unit: inv.unit }, expectedDate: inv.expectedDate, checkinAfter: (s && s.checkinAfter) || '19:00' });
      }
      const s = await propertyForKey(db, body.k);
      if (!s) return json(404, { ok: false, error: 'This kiosk link is not valid. Please ask the front desk for assistance.' });
      return json(200, { ok: true, mode: 'kiosk', property: s.property, checkinAfter: s.checkinAfter || '19:00', idTypes: ID_TYPES, durations: Object.entries(DURATIONS).map(([k, v]) => ({ key: k, label: v.label })) });
    }

    if (body.action === 'verify') {
      const s = await propertyForKey(db, body.k);
      if (!s) return json(404, { ok: false, error: 'Kiosk not configured. Please ask the front desk for assistance.' });
      const fails = s.fails || [];
      const recent = fails.filter(t => now - new Date(t) < 10 * 60e3);
      if (recent.length >= MAX_FAILS) return json(429, { ok: false, error: 'Too many attempts. Please ask the front desk for assistance.' });
      const v = await verifyResident(db, s.property, { fullName: body.name, unitBed: body.unit, contact: body.contact });
      if (!v.verified) {
        if (v.reason !== 'DATA_SOURCE_ERROR' && v.reason !== 'INVALID_INPUT') await db.collection('reslife_guest_settings').updateOne({ _id: s._id }, { $set: { fails: [...recent, now.toISOString()] } });
        // Generic message only — the internal reason is logged server-side and available to staff via Test resident verification.
        return json(404, { ok: false, error: 'We couldn’t verify that information. Please confirm your name, unit and bed, and email or phone exactly as listed on your resident account, or ask the front desk for assistance.' });
      }
      const r = v.resident;
      const rid = r._id.toString();
      const token = jwt.sign({ p: s.property, rid, name: r.residentName, unit: r.unit || r.room }, SECRET, { expiresIn: '10m' });
      const startOfDay = new Date(now.getTime() - 18 * 3600e3).toISOString();
      const pending = await guests.find({ property: s.property, residentId: rid, status: 'preregistered', $or: [{ expectedDate: { $gte: startOfDay.slice(0, 10) } }, { expectedDate: { $in: [null, ''] } }] }).project({ guestName: 1, expectedDate: 1, idType: 1 }).limit(10).toArray();
      return json(200, { ok: true, token, firstName: displayName(r.residentName).split(' ')[0], unit: r.unit || r.room, pending: pending.map(g => ({ id: g._id.toString(), guestName: g.guestName, expectedDate: g.expectedDate, hasId: !!g.idType })) });
    }

    if (body.action === 'checkin' || body.action === 'prereg') {
      let property, residentId, residentName, unit, inv = null;
      if (body.action === 'checkin') {
        let t; try { t = jwt.verify(String(body.token || ''), SECRET); } catch { return json(401, { ok: false, error: 'Your session expired. Please start again.' }); }
        property = t.p; residentId = t.rid; residentName = t.name; unit = t.unit;
      } else {
        inv = await invites.findOne({ code: String(body.invite || '') });
        if (!inv || inv.used || new Date(inv.expiresAt) < now) return json(404, { ok: false, error: 'This pre-registration link has expired.' });
        property = inv.property; residentId = inv.residentId; residentName = inv.residentName; unit = inv.unit;
      }
      const settings = await db.collection('reslife_guest_settings').findOne({ property });
      const nowIso = now.toISOString();

      // Checking in a guest who was pre-registered earlier
      if (body.action === 'checkin' && body.preregId) {
        const g = await guests.findOne({ _id: new ObjectId(String(body.preregId)), property, residentId, status: 'preregistered' });
        if (!g) return json(404, { ok: false, error: 'Pre-registration not found.' });
        const upd = { status: 'checked_in', checkInTime: nowIso, expectedOut: expectedOut(body.duration || g.duration || '2h', now), duration: body.duration || g.duration || '2h', updatedAt: nowIso, checkedInVia: 'kiosk' };
        const photo = cleanPhoto(body.idPhoto); if (photo) { upd.idPhoto = photo; upd.idType = ID_TYPES.includes(body.idType) ? body.idType : g.idType; }
        if (!g.idPhoto && !photo) return json(400, { ok: false, error: 'Please capture a photo of your guest’s ID.' });
        await guests.updateOne({ _id: g._id }, { $set: upd });
        if (!g.safetyReview) await flagIfRestricted(db, guests, property, g.guestName, g._id, 'kiosk-checkin');
        await recordVisitOnResident(db, property, residentId, { logId: g._id.toString(), guestName: g.guestName, date: nowIso, status: 'checked_in', source: 'kiosk' });
        await notify(db, settings, property, residentId, { residentName, unit, guestName: g.guestName, guestPhone: g.guestPhone, guestEmail: g.guestEmail, idType: upd.idType || g.idType, inTime: nowIso, outTime: upd.expectedOut, kind: 'checkin' });
        return json(200, { ok: true, entry: { guestName: g.guestName, residentFirst: residentName.split(' ')[0], unit, checkInTime: nowIso, expectedOut: upd.expectedOut } });
      }

      const guestName = clip(body.guestName, 80);
      const idPhoto = cleanPhoto(body.idPhoto);
      if (normName(guestName).split(' ').length < 2) return json(400, { ok: false, error: 'Please enter your guest’s full first and last name.' });
      if (!clip(body.guestPhone, 30) && !clip(body.guestEmail, 120)) return json(400, { ok: false, error: 'Please enter a phone number or email for your guest.' });
      if (!ID_TYPES.includes(body.idType)) return json(400, { ok: false, error: 'Please choose the type of ID.' });
      if (!idPhoto) return json(400, { ok: false, error: 'Please capture a clear photo of the guest’s ID.' });
      const duration = DURATIONS[body.duration] ? body.duration : '2h';
      const isPre = body.action === 'prereg';
      const doc = {
        property, residentId, hostResident: residentName, room: unit, building: '',
        guestName, guestPhone: clip(body.guestPhone, 30), guestEmail: clip(body.guestEmail, 120).toLowerCase(),
        idType: body.idType, idPhoto, duration, durationLabel: DURATIONS[duration].label,
        purpose: '', entrataNotes: '',
        preRegistered: isPre, status: isPre ? 'preregistered' : 'checked_in',
        expectedDate: isPre ? clip(body.expectedDate || (inv && inv.expectedDate), 10) : nowIso.slice(0, 10),
        checkInTime: isPre ? null : nowIso, checkOutTime: null, expectedOut: isPre ? null : expectedOut(duration, now),
        source: isPre ? 'prelink' : 'kiosk', loggedBy: isPre ? 'resident-link' : 'kiosk', createdAt: nowIso, updatedAt: nowIso,
      };
      const r = await guests.insertOne(doc);
      const logId = r.insertedId.toString();
      await flagIfRestricted(db, guests, property, guestName, r.insertedId, doc.source);
      if (inv) await invites.updateOne({ _id: inv._id }, { $set: { used: true, usedAt: nowIso, logId } });
      await recordVisitOnResident(db, property, residentId, { logId, guestName, date: isPre ? doc.expectedDate : nowIso, status: doc.status, source: doc.source });
      await notify(db, settings, property, residentId, { residentName, unit, guestName, guestPhone: doc.guestPhone, guestEmail: doc.guestEmail, idType: doc.idType, inTime: isPre ? doc.expectedDate + 'T19:00:00' : nowIso, outTime: doc.expectedOut, kind: isPre ? 'prereg' : 'checkin', note: isPre ? `Your guest must still check in at the front desk${settings && settings.checkinAfter ? ' after ' + fmt12(settings.checkinAfter) : ''}.` : '' });
      return json(200, { ok: true, entry: { guestName, residentFirst: residentName.split(' ')[0], unit, checkInTime: doc.checkInTime, expectedOut: doc.expectedOut, expectedDate: doc.expectedDate } });
    }

    return json(400, { ok: false, error: 'Unknown action' });
  } catch (e) {
    console.error('guest kiosk error', e);
    return json(500, { ok: false, error: 'Something went wrong. Please ask the front desk for assistance.' });
  }
}

/**
 * Server-side restricted-access screening for public kiosk entries. The public response never changes
 * (no disclosure to guests/residents); staff see a "verification required" flag in the Guest Log and
 * RECs/Admins get a generic urgent notification. Screening failures never break check-in.
 */
async function flagIfRestricted(db, guests, property, guestName, logOid, source) {
  try {
    const screen = await screenGuest(db, { property, guestName, guestLogId: logOid, user: null, source });
    if (screen.hits.length) await guests.updateOne({ _id: logOid }, { $set: { safetyReview: { required: true, checkId: screen.checkId, flaggedAt: new Date().toISOString() } } });
  } catch (e) { console.error('[kiosk] screening failed'); }
}

const fmt12 = hhmm => { const [h, m] = String(hhmm).split(':').map(Number); return `${(h % 12) || 12}:${String(m || 0).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`; };

async function notify(db, settings, property, residentId, info) {
  let residentEmail = '';
  try { const r = await db.collection('reslife_directory').findOne({ _id: new ObjectId(residentId) }); residentEmail = (r && r.email) || ''; } catch (e) {}
  const to = [residentEmail, ...((settings && settings.notifyEmails) || [])];
  const subject = info.kind === 'prereg' ? `Guest pre-registered: ${info.guestName} for ${info.residentName}` : `Guest check-in: ${info.guestName} visiting ${info.residentName} (${info.unit})`;
  return sendGuestEmail(db, { to, subject, html: guestEmailHtml(Object.assign({ property }, info)), meta: { property, residentId } });
}
