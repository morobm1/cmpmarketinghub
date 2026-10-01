import { verifyReqAuth } from './_auth.js';
import { getDb, ObjectId } from './_db.js';
import { canAccessReslifeProperty, canAdminReslifeProperty, canManageReslifeProperty, refreshReslifeUser, json } from './_reslife.js';

/**
 * Reslife Hub — Resident Directory
 *
 * Document shape (reslife_directory collection):
 * {
 *   _id, property, residentName, room, unit, phone, email, notes,
 *   violationMeetings: [{ id, date, summary, recordedBy, createdAt }],
 *   behaviorNotes: [{ id, date, note, recordedBy, createdAt }],
 *   updatedBy, createdAt, updatedAt
 * }
 *
 * GET    ?property=X                         - list residents for a property (any Reslife role + admin, read-only for RA/REC)
 * POST                                          - create resident entry (Reslife Admin / site admin only)
 * PUT                                           - update resident entry (Reslife Admin / site admin only)
 * PUT    { action: 'addViolationMeeting' }      - append a violation meeting entry (manager tier: REC/Admin/site admin)
 * PUT    { action: 'addBehaviorNote' }          - append a behavior/interaction note (manager tier: REC/Admin/site admin)
 * DELETE ?id=X&property=Y                     - delete resident entry (Reslife Admin / site admin only)
 */
export async function handler(event) {
  const user = verifyReqAuth(event);
  if (!user) return { statusCode: 401, body: 'Unauthorized' };

  const db = await getDb();
  await refreshReslifeUser(db, user);
  const col = db.collection('reslife_directory');

  try {
    if (event.httpMethod === 'GET') {
      const { property } = event.queryStringParameters || {};
      if (!property) return { statusCode: 400, body: 'Missing property' };
      if (!canAccessReslifeProperty(user, property)) return { statusCode: 403, body: 'Forbidden' };
      const { id, history } = event.queryStringParameters || {};

      // ── Resident history: incidents, duty log mentions, guest log, key/lock entries ──
      if (id && history) {
        const res = await col.findOne({ _id: new ObjectId(id), property });
        if (!res) return { statusCode: 404, body: 'Not found' };
        return json(200, await buildHistory(db, property, res));
      }

      const docs = await col.find({ property }).sort({ unit: 1, room: 1, residentName: 1 }).toArray();
      docs.forEach(d => { d.id = d._id.toString(); });
      return json(200, docs);
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');

      // ── Bulk roster import: upsert by resident name + unit (keeps existing history) ──
      if (body.action === 'import') {
        const { property } = body;
        if (!property) return { statusCode: 400, body: 'Missing property' };
        if (!canAdminReslifeProperty(user, property)) return { statusCode: 403, body: 'Forbidden' };
        const rows = (Array.isArray(body.rows) ? body.rows : [])
          .map(r => ({
            residentName: String(r.residentName || '').trim(),
            unit: String(r.unit || '').trim(),
            email: String(r.email || '').trim(),
            phone: String(r.phone || '').trim(),
          }))
          .filter(r => r.residentName);
        if (!rows.length) return { statusCode: 400, body: 'No valid rows (each row needs a name)' };
        const now = new Date().toISOString();
        const existing = await col.find({ property }).toArray();
        const keyOf = (n, u) => n.toLowerCase().replace(/\s+/g, ' ') + '|' + u.toLowerCase();
        const byKey = new Map(existing.map(d => [keyOf(d.residentName || '', d.unit || ''), d]));
        const byName = new Map(existing.map(d => [(d.residentName || '').toLowerCase().replace(/\s+/g, ' '), d]));
        let created = 0, updated = 0;
        const ops = [];
        for (const r of rows) {
          const match = byKey.get(keyOf(r.residentName, r.unit)) || byName.get(r.residentName.toLowerCase().replace(/\s+/g, ' '));
          if (match) {
            ops.push({ updateOne: { filter: { _id: match._id }, update: { $set: { residentName: r.residentName, unit: r.unit, room: r.unit, email: r.email || match.email || '', phone: r.phone || match.phone || '', updatedBy: user.sub, updatedAt: now } } } });
            updated++;
          } else {
            ops.push({ insertOne: { document: { property, residentName: r.residentName, room: r.unit, unit: r.unit, phone: r.phone, email: r.email, notes: '', violationMeetings: [], behaviorNotes: [], keyLog: [], updatedBy: user.sub, createdAt: now, updatedAt: now } } });
            created++;
          }
        }
        if (ops.length) await col.bulkWrite(ops);
        return json(200, { created, updated });
      }

      const { property, residentName, room, unit, phone, email, notes } = body;
      if (!property || !residentName) return { statusCode: 400, body: 'Missing property/residentName' };
      if (!canAdminReslifeProperty(user, property)) return { statusCode: 403, body: 'Forbidden' };
      const now = new Date().toISOString();
      const doc = {
        property, residentName, room: room || '', unit: unit || '', phone: phone || '', email: email || '', notes: notes || '',
        violationMeetings: [], behaviorNotes: [],
        updatedBy: user.sub, createdAt: now, updatedAt: now,
      };
      const result = await col.insertOne(doc);
      doc.id = result.insertedId.toString();
      return json(200, doc);
    }

    if (event.httpMethod === 'PUT') {
      const body = JSON.parse(event.body || '{}');
      const { id, property, action } = body;
      if (!id || !property) return { statusCode: 400, body: 'Missing id/property' };

      // ── Append a violation meeting or behavior note (manager tier only) ──
      // ── Key / lock entry (any Reslife role with property access) ──
      if (action === 'addKeyEntry') {
        if (!canAccessReslifeProperty(user, property)) return { statusCode: 403, body: 'Forbidden' };
        const { entryType, details, date } = body;
        if (!entryType) return { statusCode: 400, body: 'Missing entryType' };
        const now = new Date().toISOString();
        const entry = { id: new ObjectId().toString(), date: date || now.slice(0, 10), entryType, details: details || '', recordedBy: user.sub, createdAt: now };
        const r = await col.updateOne({ _id: new ObjectId(id), property }, { $push: { keyLog: entry }, $set: { updatedAt: now, updatedBy: user.sub } });
        if (!r.matchedCount) return { statusCode: 404, body: 'Not found' };
        return json(200, entry);
      }

      if (action === 'addViolationMeeting' || action === 'addBehaviorNote') {
        if (!canManageReslifeProperty(user, property)) return { statusCode: 403, body: 'Forbidden' };
        const existing = await col.findOne({ _id: new ObjectId(id), property });
        if (!existing) return { statusCode: 404, body: 'Not found' };
        const now = new Date().toISOString();

        if (action === 'addViolationMeeting') {
          const { date, summary } = body;
          if (!summary) return { statusCode: 400, body: 'Missing summary' };
          const entry = { id: new ObjectId().toString(), date: date || now.slice(0, 10), summary, recordedBy: user.sub, createdAt: now };
          await col.updateOne({ _id: new ObjectId(id), property }, { $push: { violationMeetings: entry }, $set: { updatedAt: now, updatedBy: user.sub } });
          return json(200, entry);
        } else {
          const { note } = body;
          if (!note) return { statusCode: 400, body: 'Missing note' };
          const entry = { id: new ObjectId().toString(), date: now.slice(0, 10), note, recordedBy: user.sub, createdAt: now };
          await col.updateOne({ _id: new ObjectId(id), property }, { $push: { behaviorNotes: entry }, $set: { updatedAt: now, updatedBy: user.sub } });
          return json(200, entry);
        }
      }

      // ── Standard field update (Reslife Admin / site admin only) ──
      const { residentName, room, unit, phone, email, notes } = body;
      if (!canAdminReslifeProperty(user, property)) return { statusCode: 403, body: 'Forbidden' };
      const updates = { updatedBy: user.sub, updatedAt: new Date().toISOString() };
      if (residentName !== undefined) updates.residentName = residentName;
      if (room !== undefined) updates.room = room;
      if (unit !== undefined) updates.unit = unit;
      if (phone !== undefined) updates.phone = phone;
      if (email !== undefined) updates.email = email;
      if (notes !== undefined) updates.notes = notes;
      await col.updateOne({ _id: new ObjectId(id), property }, { $set: updates });
      return json(200, { success: true });
    }

    if (event.httpMethod === 'DELETE') {
      const { id, property } = event.queryStringParameters || {};
      if (!id || !property) return { statusCode: 400, body: 'Missing id/property' };
      if (!canAdminReslifeProperty(user, property)) return { statusCode: 403, body: 'Forbidden' };
      await col.deleteOne({ _id: new ObjectId(id), property });
      return json(200, { success: true });
    }

    return { statusCode: 405, body: 'Method Not Allowed' };
  } catch (e) {
    return { statusCode: 500, body: e.message };
  }
}

const norm = s => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();

/**
 * Gathers everything on file that references a resident. Matching is by
 * name (case-insensitive) and, where a unit/room field exists, by exact unit.
 */
async function buildHistory(db, property, res) {
  const name = norm(res.residentName);
  const unit = norm(res.unit || res.room);
  const nameRe = new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+'), 'i');
  const unitMatch = v => unit && norm(v) === unit;
  const textHasName = v => name && nameRe.test(String(v || ''));

  const [incidents, guests, sessions] = await Promise.all([
    db.collection('reslife_incidents').find({ property }).sort({ createdAt: -1 }).limit(1000).toArray(),
    db.collection('reslife_guest_log').find({ property }).sort({ createdAt: -1 }).limit(2000).toArray(),
    db.collection('reslife_duty_sessions').find({ property }).sort({ duty_date: -1 }).limit(730).toArray(),
  ]);

  const incidentHits = incidents
    .filter(i => norm(i.residentName) === name || textHasName(i.residentName) || textHasName(i.description))
    .map(i => ({ id: i._id.toString(), date: (i.createdAt || '').slice(0, 10), severity: i.severity, status: i.status, room: i.room, description: i.description }));

  const guestHits = guests
    .filter(g => norm(g.hostResident) === name || textHasName(g.hostResident) || (unitMatch(g.room) && !g.hostResident))
    .map(g => ({ id: g._id.toString(), guestName: g.guestName, room: g.room, status: g.status, purpose: g.purpose, checkInTime: g.checkInTime, checkOutTime: g.checkOutTime, createdAt: g.createdAt }));

  const dutyHits = [];
  const lockouts = [];
  for (const s of sessions) {
    for (const e of (s.entries || [])) {
      const hit = norm(e.caller_name) === name || textHasName(e.caller_name) || textHasName(e.reason_for_call) || textHasName(e.follow_up) || textHasName(e.location) || unitMatch(e.location);
      if (!hit) continue;
      const rec = { sessionId: s._id.toString(), date: e.incident_date || s.duty_date, time: e.incident_time, type: e.incident_type, location: e.location, caller: e.caller_name, reason: e.reason_for_call, followUp: e.follow_up, by: e.entered_by_username };
      dutyHits.push(rec);
      if (/lock|key/i.test(e.incident_type || '')) lockouts.push({ id: 'duty-' + e.id, date: rec.date, entryType: e.incident_type, details: e.reason_for_call || '', recordedBy: e.entered_by_username, source: 'Duty Log' });
    }
  }

  const keyLog = [...(res.keyLog || []).map(k => ({ ...k, source: 'Manual' })), ...lockouts]
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));

  return { incidents: incidentHits, dutyLog: dutyHits, guestLog: guestHits, keyLog };
}
