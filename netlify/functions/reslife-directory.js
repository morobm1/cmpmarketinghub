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
      const docs = await col.find({ property }).sort({ room: 1, residentName: 1 }).toArray();
      docs.forEach(d => { d.id = d._id.toString(); });
      return json(200, docs);
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
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
