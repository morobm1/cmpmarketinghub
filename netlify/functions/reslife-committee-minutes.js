import { verifyReqAuth } from './_auth.js';
import { getDb, ObjectId } from './_db.js';
import { canAccessReslifeProperty, canModifyReslifeRecord, refreshReslifeUser, json } from './_reslife.js';

/**
 * Reslife Hub — Committee Meeting Minutes
 * Modeled on the real biweekly committee agenda template: a Check-In /
 * track-based agenda plus an Action Items table (task, assigned to, due date).
 *
 * GET    ?property=X&committeeId=Y   - list minutes for a committee (any Reslife role + admin)
 * POST                                 - add a minutes entry (any Reslife role + admin)
 * PUT                                  - update an entry; author may edit their own,
 *                                        REC/Admin/site admin may edit any
 * DELETE ?id=X&property=Y            - delete; author may delete their own, REC/Admin/site admin any
 */
export async function handler(event) {
  const user = verifyReqAuth(event);
  if (!user) return { statusCode: 401, body: 'Unauthorized' };

  const db = await getDb();
  await refreshReslifeUser(db, user);
  const col = db.collection('reslife_committee_minutes');

  try {
    if (event.httpMethod === 'GET') {
      const { property, committeeId } = event.queryStringParameters || {};
      if (!property || !committeeId) return { statusCode: 400, body: 'Missing property/committeeId' };
      if (!canAccessReslifeProperty(user, property)) return { statusCode: 403, body: 'Forbidden' };
      const docs = await col.find({ property, committeeId }).sort({ meetingDate: -1 }).toArray();
      docs.forEach(d => { d.id = d._id.toString(); });
      return json(200, docs);
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { property, committeeId, meetingDate, agenda, actionItems } = body;
      if (!property || !committeeId || !agenda) return { statusCode: 400, body: 'Missing property/committeeId/agenda' };
      if (!canAccessReslifeProperty(user, property)) return { statusCode: 403, body: 'Forbidden' };
      const now = new Date().toISOString();
      const doc = {
        property, committeeId,
        meetingDate: meetingDate || now,
        agenda,
        actionItems: Array.isArray(actionItems) ? actionItems : [],
        createdBy: user.sub, createdAt: now, updatedAt: now,
      };
      const result = await col.insertOne(doc);
      doc.id = result.insertedId.toString();
      return json(200, doc);
    }

    if (event.httpMethod === 'PUT') {
      const body = JSON.parse(event.body || '{}');
      const { id, property, meetingDate, agenda, actionItems } = body;
      if (!id || !property) return { statusCode: 400, body: 'Missing id/property' };
      const existing = await col.findOne({ _id: new ObjectId(id), property });
      if (!existing) return { statusCode: 404, body: 'Not found' };
      if (!canModifyReslifeRecord(user, property, existing.createdBy)) return { statusCode: 403, body: 'Forbidden' };
      const updates = { updatedAt: new Date().toISOString() };
      if (meetingDate !== undefined) updates.meetingDate = meetingDate;
      if (agenda !== undefined) updates.agenda = agenda;
      if (actionItems !== undefined) updates.actionItems = Array.isArray(actionItems) ? actionItems : [];
      await col.updateOne({ _id: new ObjectId(id), property }, { $set: updates });
      return json(200, { success: true });
    }

    if (event.httpMethod === 'DELETE') {
      const { id, property } = event.queryStringParameters || {};
      if (!id || !property) return { statusCode: 400, body: 'Missing id/property' };
      const existing = await col.findOne({ _id: new ObjectId(id), property });
      if (!existing) return { statusCode: 404, body: 'Not found' };
      if (!canModifyReslifeRecord(user, property, existing.createdBy)) return { statusCode: 403, body: 'Forbidden' };
      await col.deleteOne({ _id: new ObjectId(id), property });
      return json(200, { success: true });
    }

    return { statusCode: 405, body: 'Method Not Allowed' };
  } catch (e) {
    return { statusCode: 500, body: e.message };
  }
}
