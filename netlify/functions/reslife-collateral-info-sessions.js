import { verifyReqAuth } from './_auth.js';
import { getDb, ObjectId } from './_db.js';
import { canAccessReslifeProperty, canWriteCollateralGroup, refreshReslifeUser, json } from './_reslife.js';

/**
 * Collateral / Recruitment & Development — Information Sessions
 *
 * GET    ?property=X&committeeId=Y   - list sessions for a group (any member + managers)
 * POST                                 - create (Committee Lead/manager)
 * PUT                                  - update (Committee Lead/manager)
 * DELETE ?id=X&property=Y            - delete (Committee Lead/manager)
 */
async function canWriteToGroup(db, user, property, committeeId) {
  const committee = await db.collection('reslife_committees').findOne({ _id: new ObjectId(committeeId), property });
  return canWriteCollateralGroup(user, property, committee);
}

export async function handler(event) {
  const user = verifyReqAuth(event);
  if (!user) return { statusCode: 401, body: 'Unauthorized' };

  const db = await getDb();
  await refreshReslifeUser(db, user);
  const col = db.collection('reslife_collateral_info_sessions');

  try {
    if (event.httpMethod === 'GET') {
      const { property, committeeId } = event.queryStringParameters || {};
      if (!property) return { statusCode: 400, body: 'Missing property' };
      if (!canAccessReslifeProperty(user, property)) return { statusCode: 403, body: 'Forbidden' };
      const filter = { property };
      if (committeeId) filter.committeeId = committeeId;
      const docs = await col.find(filter).sort({ sessionDate: 1 }).toArray();
      docs.forEach(d => { d.id = d._id.toString(); });
      return json(200, docs);
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { property, committeeId, sessionDate } = body;
      if (!property || !committeeId || !sessionDate) return { statusCode: 400, body: 'Missing property/committeeId/sessionDate' };
      if (!(await canWriteToGroup(db, user, property, committeeId))) return { statusCode: 403, body: 'Forbidden' };
      const now = new Date().toISOString();
      const doc = {
        property, committeeId, sessionDate, location: body.location || '',
        presenters: Array.isArray(body.presenters) ? body.presenters : [],
        slidesReady: !!body.slidesReady, attendance: Number.isFinite(body.attendance) ? body.attendance : null,
        feedback: body.feedback || '', followUpNeeded: !!body.followUpNeeded, notes: body.notes || '',
        createdBy: user.sub, createdAt: now, updatedAt: now,
      };
      const result = await col.insertOne(doc);
      doc.id = result.insertedId.toString();
      return json(200, doc);
    }

    if (event.httpMethod === 'PUT') {
      const body = JSON.parse(event.body || '{}');
      const { id, property } = body;
      if (!id || !property) return { statusCode: 400, body: 'Missing id/property' };
      const existing = await col.findOne({ _id: new ObjectId(id), property });
      if (!existing) return { statusCode: 404, body: 'Not found' };
      if (!(await canWriteToGroup(db, user, property, existing.committeeId))) return { statusCode: 403, body: 'Forbidden' };
      const updates = { updatedAt: new Date().toISOString() };
      ['sessionDate', 'location', 'presenters', 'slidesReady', 'attendance', 'feedback', 'followUpNeeded', 'notes'].forEach(f => { if (body[f] !== undefined) updates[f] = body[f]; });
      await col.updateOne({ _id: new ObjectId(id), property }, { $set: updates });
      return json(200, { success: true });
    }

    if (event.httpMethod === 'DELETE') {
      const { id, property } = event.queryStringParameters || {};
      if (!id || !property) return { statusCode: 400, body: 'Missing id/property' };
      const existing = await col.findOne({ _id: new ObjectId(id), property });
      if (!existing) return { statusCode: 404, body: 'Not found' };
      if (!(await canWriteToGroup(db, user, property, existing.committeeId))) return { statusCode: 403, body: 'Forbidden' };
      await col.deleteOne({ _id: new ObjectId(id), property });
      return json(200, { success: true });
    }

    return { statusCode: 405, body: 'Method Not Allowed' };
  } catch (e) {
    return { statusCode: 500, body: e.message };
  }
}
