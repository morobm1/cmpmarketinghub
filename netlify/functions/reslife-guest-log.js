import crypto from 'crypto';
import { verifyReqAuth } from './_auth.js';
import { getDb, ObjectId } from './_db.js';
import { canAccessReslifeProperty, canModifyReslifeRecord, isReslifeManager, refreshReslifeUser, json } from './_reslife.js';
import { verifyResident, REASON_TEXT } from './_verify.js';
import { screenGuest } from './_safetycheck.js';
import { projectForCheck } from './_safety.js';
import { ID_TYPES, DURATIONS, DEFAULT_NOTIFY, expectedOut, cleanPhoto, getSettings, recordVisitOnResident, sendGuestEmail, guestEmailHtml } from './_guest.js';

/**
 * Reslife Hub — Guest Log (staff side). The public front-desk kiosk lives in reslife-guest-kiosk.js.
 *
 * Entry: { property, residentId, hostResident, room(unit), guestName, guestPhone, guestEmail, idType, idPhoto,
 *          duration, expectedOut, expectedDate, status: preregistered|checked_in|checked_out, source: kiosk|staff|prelink,
 *          checkInTime, checkOutTime, loggedBy, createdAt }
 *
 * GET  ?property=X[&from=ISO&to=ISO]          list (ID photos omitted)
 * GET  ?property=X&id=Y&photo=1               one entry's ID photo
 * GET  ?property=X&settings=1                 notification emails, kiosk link, check-in time (REC/Admin)
 * POST { property, ... }                      staff manual entry (preRegister:true → preregistered for expectedDate)
 * POST { property, action:'invite', residentId, expectedDate, days } → pre-registration link code
 * PUT  { id, property, action:'checkIn'|'checkOut' }
 * PUT  { property, action:'settings', notifyEmails:[], checkinAfter, regenerateKey }   (REC/Admin)
 * PUT  { id, property, ...fields }            edit (creator or manager)
 * DELETE ?id=X&property=Y
 */
const STATUSES = ['preregistered', 'checked_in', 'checked_out'];
const isMgr = u => u.role === 'admin' || isReslifeManager(u.role);
const clip = (s, n) => String(s || '').trim().slice(0, n);

export async function handler(event) {
  const user = verifyReqAuth(event);
  if (!user) return { statusCode: 401, body: 'Unauthorized' };

  const db = await getDb();
  await refreshReslifeUser(db, user);
  const col = db.collection('reslife_guest_log');
  const q = event.queryStringParameters || {};

  try {
    if (event.httpMethod === 'GET') {
      const { property } = q;
      if (!property) return { statusCode: 400, body: 'Missing property' };
      if (!canAccessReslifeProperty(user, property)) return { statusCode: 403, body: 'Forbidden' };

      if (q.settings) {
        // Any staff on the property (incl. RAs opening the desk) can create/open the kiosk link.
        // Changing settings / regenerating the key remains manager-only (PUT).
        const s = await getSettings(db, property, true);
        return json(200, { notifyEmails: s.notifyEmails || DEFAULT_NOTIFY, checkinAfter: s.checkinAfter || '19:00', kioskKey: s.kioskKey || null, canEdit: isMgr(user), idTypes: ID_TYPES, durations: Object.entries(DURATIONS).map(([k, v]) => ({ key: k, label: v.label })) });
      }
      if (q.diagnose) {
        if (!isMgr(user)) return { statusCode: 403, body: 'Forbidden' };
        const v = await verifyResident(db, property, { fullName: q.name, unitBed: q.unit, contact: q.contact }, { full: true, log: false });
        return json(200, v.verified ? { ok: true, code: 'VERIFIED', message: `Match: ${v.resident.residentName} (${v.resident.unit || v.resident.room}) — this would pass at the kiosk.`, detail: v.detail } : { ok: false, code: v.reason, message: REASON_TEXT[v.reason] || v.reason, detail: v.detail });
      }
      if (q.id && q.photo) {
        const d = await col.findOne({ _id: new ObjectId(q.id), property }, { projection: { idPhoto: 1, idType: 1, guestName: 1 } });
        if (!d) return { statusCode: 404, body: 'Not found' };
        return json(200, { idPhoto: d.idPhoto || '', idType: d.idType || '', guestName: d.guestName });
      }
      const filter = { property };
      if (q.status && STATUSES.includes(q.status)) filter.status = q.status;
      const docs = await col.find(filter, { projection: { idPhoto: 0 } }).sort({ createdAt: -1 }).limit(1500).toArray();
      docs.forEach(d => { d.id = d._id.toString(); });
      const withPhoto = await col.find({ property, idPhoto: { $nin: [null, ''] } }, { projection: { _id: 1 } }).limit(3000).toArray();
      const set = new Set(withPhoto.map(x => x._id.toString()));
      docs.forEach(d => { d.hasIdPhoto = set.has(d.id); });
      return json(200, docs);
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { property } = body;
      if (!property) return { statusCode: 400, body: 'Missing property' };
      if (!canAccessReslifeProperty(user, property)) return { statusCode: 403, body: 'Forbidden' };
      const now = new Date().toISOString();

      if (body.action === 'invite') {
        const r = await db.collection('reslife_directory').findOne({ _id: new ObjectId(body.residentId), property });
        if (!r) return { statusCode: 404, body: 'Resident not found' };
        const code = crypto.randomBytes(16).toString('base64url');
        const days = Math.min(Math.max(+body.days || 7, 1), 30);
        const inv = { code, property, residentId: r._id.toString(), residentName: r.residentName, unit: r.unit || r.room || '', residentEmail: r.email || '', expectedDate: clip(body.expectedDate, 10), createdBy: user.sub, createdAt: now, expiresAt: new Date(Date.now() + days * 864e5).toISOString(), used: false };
        await db.collection('reslife_guest_invites').insertOne(inv);
        await getSettings(db, property, true);
        return json(200, { code, residentName: inv.residentName, residentEmail: inv.residentEmail, unit: inv.unit, expectedDate: inv.expectedDate, expiresAt: inv.expiresAt });
      }

      const guestName = clip(body.guestName, 80);
      if (!guestName) return { statusCode: 400, body: 'Missing guestName' };
      let resident = null;
      if (body.residentId) resident = await db.collection('reslife_directory').findOne({ _id: new ObjectId(body.residentId), property });
      const preRegister = !!body.preRegister;
      const duration = DURATIONS[body.duration] ? body.duration : '2h';
      const doc = {
        property, residentId: resident ? resident._id.toString() : '', hostResident: resident ? resident.residentName : clip(body.hostResident, 80),
        building: '', room: resident ? (resident.unit || resident.room || '') : clip(body.room, 20),
        guestName, guestPhone: clip(body.guestPhone, 30), guestEmail: clip(body.guestEmail, 120).toLowerCase(),
        idType: ID_TYPES.includes(body.idType) ? body.idType : '', idPhoto: cleanPhoto(body.idPhoto),
        duration, durationLabel: DURATIONS[duration].label,
        purpose: clip(body.purpose, 300), entrataNotes: clip(body.entrataNotes, 2000),
        preRegistered: preRegister, status: preRegister ? 'preregistered' : 'checked_in',
        expectedDate: preRegister ? clip(body.expectedDate, 10) : now.slice(0, 10),
        checkInTime: preRegister ? null : now, checkOutTime: null, expectedOut: preRegister ? null : expectedOut(duration),
        source: 'staff', loggedBy: user.sub, createdAt: now, updatedAt: now,
      };
      const result = await col.insertOne(doc);
      doc.id = result.insertedId.toString();
      // Restricted-access screening (active, verified restrictions only). A hit never blocks or
      // identifies anyone: it flags the entry for identity verification + escalation.
      const screen = await screenGuest(db, { property, guestName, guestLogId: doc.id, user, source: 'staff' });
      if (screen.hits.length) {
        doc.safetyReview = { required: true, checkId: screen.checkId, flaggedAt: now };
        await col.updateOne({ _id: result.insertedId }, { $set: { safetyReview: doc.safetyReview } });
        doc.safetyHits = screen.hits.map(h => projectForCheck(h.record, user, h.level));
      }
      await recordVisitOnResident(db, property, doc.residentId, { logId: doc.id, guestName, date: preRegister ? doc.expectedDate : now, status: doc.status, source: 'staff' });
      if (body.notify !== false && resident) {
        const s = await getSettings(db, property, false);
        await sendGuestEmail(db, { to: [resident.email, ...(s.notifyEmails || DEFAULT_NOTIFY)], subject: `${preRegister ? 'Guest pre-registered' : 'Guest check-in'}: ${guestName} visiting ${resident.residentName}`, html: guestEmailHtml({ property, residentName: resident.residentName, unit: doc.room, guestName, guestPhone: doc.guestPhone, guestEmail: doc.guestEmail, idType: doc.idType, inTime: preRegister ? doc.expectedDate + 'T19:00:00' : now, outTime: doc.expectedOut, kind: preRegister ? 'prereg' : 'checkin' }) });
      }
      delete doc.idPhoto;
      return json(200, doc);
    }

    if (event.httpMethod === 'PUT') {
      const body = JSON.parse(event.body || '{}');
      const { id, property, action } = body;
      if (!property) return { statusCode: 400, body: 'Missing property' };
      if (!canAccessReslifeProperty(user, property)) return { statusCode: 403, body: 'Forbidden' };
      const now = new Date().toISOString();

      if (action === 'settings') {
        if (!isMgr(user)) return { statusCode: 403, body: 'Only an REC or Admin can change guest settings' };
        const s = await getSettings(db, property, true);
        const upd = { updatedAt: now, updatedBy: user.sub };
        if (Array.isArray(body.notifyEmails)) upd.notifyEmails = body.notifyEmails.map(e => String(e).trim().toLowerCase()).filter(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)).slice(0, 10);
        if (/^\d{2}:\d{2}$/.test(body.checkinAfter || '')) upd.checkinAfter = body.checkinAfter;
        if (body.regenerateKey) upd.kioskKey = crypto.randomBytes(12).toString('hex');
        await db.collection('reslife_guest_settings').updateOne({ _id: s._id }, { $set: upd });
        return json(200, Object.assign({}, s, upd, { _id: undefined, fails: undefined }));
      }

      if (!id) return { statusCode: 400, body: 'Missing id' };
      const existing = await col.findOne({ _id: new ObjectId(id), property });
      if (!existing) return { statusCode: 404, body: 'Not found' };
      const updates = { updatedAt: now };
      let extra = {};
      if (action === 'checkIn') {
        updates.status = 'checked_in'; updates.checkInTime = now; updates.checkedInBy = user.sub;
        updates.expectedOut = expectedOut(body.duration || existing.duration || '2h');
        if (!existing.safetyReview) {
          const screen = await screenGuest(db, { property, guestName: existing.guestName, guestLogId: id, user, source: 'staff-checkin' });
          if (screen.hits.length) {
            updates.safetyReview = { required: true, checkId: screen.checkId, flaggedAt: now };
            extra = { safetyReview: updates.safetyReview, safetyHits: screen.hits.map(h => projectForCheck(h.record, user, h.level)) };
          }
        }
      } else if (action === 'checkOut') {
        updates.status = 'checked_out'; updates.checkOutTime = now; updates.checkedOutBy = user.sub;
      } else {
        if (!canModifyReslifeRecord(user, property, existing.loggedBy)) return { statusCode: 403, body: 'Forbidden' };
        ['guestName', 'guestPhone', 'guestEmail', 'purpose', 'entrataNotes', 'expectedDate'].forEach(f => { if (body[f] !== undefined) updates[f] = clip(body[f], 2000); });
        if (body.idType !== undefined && ID_TYPES.includes(body.idType)) updates.idType = body.idType;
        if (body.idPhoto) { const p = cleanPhoto(body.idPhoto); if (p) updates.idPhoto = p; }
        if (body.duration && DURATIONS[body.duration]) { updates.duration = body.duration; updates.durationLabel = DURATIONS[body.duration].label; }
      }
      await col.updateOne({ _id: existing._id }, { $set: updates });
      if (updates.status && existing.residentId) {
        try { await db.collection('reslife_directory').updateOne({ _id: new ObjectId(existing.residentId), 'guestVisits.logId': id }, { $set: { 'guestVisits.$.status': updates.status } }); } catch (e) {}
      }
      return json(200, Object.assign({ success: true }, extra));
    }

    if (event.httpMethod === 'DELETE') {
      const { id, property } = q;
      if (!id || !property) return { statusCode: 400, body: 'Missing id/property' };
      const existing = await col.findOne({ _id: new ObjectId(id), property });
      if (!existing) return { statusCode: 404, body: 'Not found' };
      if (!canModifyReslifeRecord(user, property, existing.loggedBy)) return { statusCode: 403, body: 'Forbidden' };
      await col.deleteOne({ _id: existing._id });
      return json(200, { success: true });
    }

    return { statusCode: 405, body: 'Method Not Allowed' };
  } catch (e) {
    return { statusCode: 500, body: e.message };
  }
}
