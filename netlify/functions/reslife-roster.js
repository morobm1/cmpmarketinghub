import { verifyReqAuth } from './_auth.js';
import { getDb, ObjectId } from './_db.js';
import { canAccessReslifeProperty, canManageReslifeProperty, refreshReslifeUser, json } from './_reslife.js';

/**
 * Reslife Hub — Duty / On-Call Roster
 * GET    ?property=X        - list shifts for a property (any Reslife role + admin)
 * POST                       - create a shift (manager tier: REC/Admin/site admin)
 * PUT                        - update a shift (manager tier)
 * DELETE ?id=X&property=Y   - delete a shift (manager tier)
 */
export async function handler(event) {
  const user = verifyReqAuth(event);
  if (!user) return { statusCode: 401, body: 'Unauthorized' };

  const db = await getDb();
  await refreshReslifeUser(db, user);
  const col = db.collection('reslife_roster');

  try {
    if (event.httpMethod === 'GET') {
      const { property } = event.queryStringParameters || {};
      if (!property) return { statusCode: 400, body: 'Missing property' };
      if (!canAccessReslifeProperty(user, property)) return { statusCode: 403, body: 'Forbidden' };
      const docs = await col.find({ property }).sort({ shiftStart: 1 }).toArray();
      docs.forEach(d => { d.id = d._id.toString(); });
      return json(200, docs);
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { property, assignedTo, shiftStart, shiftEnd, notes } = body;
      if (!property || !assignedTo || !shiftStart || !shiftEnd) {
        return { statusCode: 400, body: 'Missing property/assignedTo/shiftStart/shiftEnd' };
      }
      if (!canManageReslifeProperty(user, property)) return { statusCode: 403, body: 'Forbidden' };
      const now = new Date().toISOString();
      const doc = { property, assignedTo, shiftStart, shiftEnd, notes: notes || '', createdBy: user.sub, createdAt: now, updatedAt: now };
      const result = await col.insertOne(doc);
      doc.id = result.insertedId.toString();
      return json(200, doc);
    }

    if (event.httpMethod === 'PUT') {
      const body = JSON.parse(event.body || '{}');
      const { id, property, assignedTo, shiftStart, shiftEnd, notes } = body;
      if (!id || !property) return { statusCode: 400, body: 'Missing id/property' };
      if (!canManageReslifeProperty(user, property)) return { statusCode: 403, body: 'Forbidden' };
      const updates = { updatedAt: new Date().toISOString() };
      if (assignedTo !== undefined) updates.assignedTo = assignedTo;
      if (shiftStart !== undefined) updates.shiftStart = shiftStart;
      if (shiftEnd !== undefined) updates.shiftEnd = shiftEnd;
      if (notes !== undefined) updates.notes = notes;
      await col.updateOne({ _id: new ObjectId(id), property }, { $set: updates });
      return json(200, { success: true });
    }

    if (event.httpMethod === 'DELETE') {
      const { id, property } = event.queryStringParameters || {};
      if (!id || !property) return { statusCode: 400, body: 'Missing id/property' };
      if (!canManageReslifeProperty(user, property)) return { statusCode: 403, body: 'Forbidden' };
      await col.deleteOne({ _id: new ObjectId(id), property });
      return json(200, { success: true });
    }

    return { statusCode: 405, body: 'Method Not Allowed' };
  } catch (e) {
    return { statusCode: 500, body: e.message };
  }
}
