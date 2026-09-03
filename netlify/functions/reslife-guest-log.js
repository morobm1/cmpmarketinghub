import { verifyReqAuth } from './_auth.js';
import { getDb, ObjectId } from './_db.js';
import { canAccessReslifeProperty, canModifyReslifeRecord, refreshReslifeUser, json } from './_reslife.js';

/**
 * Reslife Hub — Guest Log
 *
 * One form, filled out once, for the whole guest visit lifecycle:
 * Pre-Register (optional, before arrival) -> Check In (arrival) -> Check Out
 * (departure). `entrataNotes` is a plain text placeholder field only — this
 * app has no Entrata API integration, so nothing here claims to sync with
 * or read from Entrata automatically; it's just a labeled spot for staff to
 * copy in whatever Entrata shows, until/unless a real integration exists.
 *
 * GET    ?property=X (optional status filter)   - list guest entries (any Reslife role + admin)
 * POST                                             - create an entry (any Reslife role + admin);
 *                                                    { preRegister: true } creates status 'preregistered'
 *                                                    with no check-in time yet; otherwise checks in immediately
 * PUT    { id, property, action:'checkIn' }        - move preregistered -> checked_in, sets checkInTime=now
 * PUT    { id, property, action:'checkOut' }        - sets checkOutTime=now, status='checked_out'
 * PUT    { id, property, ...fields }                - edit fields (creator or manager tier)
 * DELETE ?id=X&property=Y                         - remove (creator or manager tier)
 */
const STATUSES = ['preregistered', 'checked_in', 'checked_out'];

export async function handler(event) {
  const user = verifyReqAuth(event);
  if (!user) return { statusCode: 401, body: 'Unauthorized' };

  const db = await getDb();
  await refreshReslifeUser(db, user);
  const col = db.collection('reslife_guest_log');

  try {
    if (event.httpMethod === 'GET') {
      const { property, status } = event.queryStringParameters || {};
      if (!property) return { statusCode: 400, body: 'Missing property' };
      if (!canAccessReslifeProperty(user, property)) return { statusCode: 403, body: 'Forbidden' };
      const filter = { property };
      if (status && STATUSES.includes(status)) filter.status = status;
      const docs = await col.find(filter).sort({ createdAt: -1 }).limit(300).toArray();
      docs.forEach(d => { d.id = d._id.toString(); });
      return json(200, docs);
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { property, guestName } = body;
      if (!property || !guestName) return { statusCode: 400, body: 'Missing property/guestName' };
      if (!canAccessReslifeProperty(user, property)) return { statusCode: 403, body: 'Forbidden' };
      const now = new Date().toISOString();
      const preRegister = !!body.preRegister;
      const doc = {
        property, guestName, hostResident: body.hostResident || '', building: body.building || '', room: body.room || '',
        purpose: body.purpose || '', entrataNotes: body.entrataNotes || '',
        preRegistered: preRegister,
        status: preRegister ? 'preregistered' : 'checked_in',
        checkInTime: preRegister ? null : now, checkOutTime: null,
        loggedBy: user.sub, createdAt: now, updatedAt: now,
      };
      const result = await col.insertOne(doc);
      doc.id = result.insertedId.toString();
      return json(200, doc);
    }

    if (event.httpMethod === 'PUT') {
      const body = JSON.parse(event.body || '{}');
      const { id, property, action } = body;
      if (!id || !property) return { statusCode: 400, body: 'Missing id/property' };
      const existing = await col.findOne({ _id: new ObjectId(id), property });
      if (!existing) return { statusCode: 404, body: 'Not found' };
      const now = new Date().toISOString();
      const updates = { updatedAt: now };

      if (action === 'checkIn') {
        if (!canAccessReslifeProperty(user, property)) return { statusCode: 403, body: 'Forbidden' };
        updates.status = 'checked_in';
        updates.checkInTime = now;
      } else if (action === 'checkOut') {
        if (!canAccessReslifeProperty(user, property)) return { statusCode: 403, body: 'Forbidden' };
        updates.status = 'checked_out';
        updates.checkOutTime = now;
      } else {
        if (!canModifyReslifeRecord(user, property, existing.loggedBy)) return { statusCode: 403, body: 'Forbidden' };
        ['guestName', 'hostResident', 'building', 'room', 'purpose', 'entrataNotes'].forEach(f => { if (body[f] !== undefined) updates[f] = body[f]; });
      }
      await col.updateOne({ _id: new ObjectId(id), property }, { $set: updates });
      return json(200, { success: true });
    }

    if (event.httpMethod === 'DELETE') {
      const { id, property } = event.queryStringParameters || {};
      if (!id || !property) return { statusCode: 400, body: 'Missing id/property' };
      const existing = await col.findOne({ _id: new ObjectId(id), property });
      if (!existing) return { statusCode: 404, body: 'Not found' };
      if (!canModifyReslifeRecord(user, property, existing.loggedBy)) return { statusCode: 403, body: 'Forbidden' };
      await col.deleteOne({ _id: new ObjectId(id), property });
      return json(200, { success: true });
    }

    return { statusCode: 405, body: 'Method Not Allowed' };
  } catch (e) {
    return { statusCode: 500, body: e.message };
  }
}
