import { verifyReqAuth } from './_auth.js';
import { getDb, ObjectId } from './_db.js';
import { canAccessReslifeProperty, canWriteCollateralGroup, refreshReslifeUser, json } from './_reslife.js';

/**
 * Collateral / Recognition — Birthdays, Team Bonding, Special Recognition,
 * Banquet milestones. One flexible entity covers all of these since they
 * share the same operational lifecycle (assign -> prepare -> complete);
 * fields not relevant to a given `type` are simply left blank.
 *
 * Birthdays intentionally store only month/day (no year) — operational
 * use only, no unnecessary sensitive personal data retained.
 *
 * GET    ?property=X&committeeId=Y   - list recognition items for a group (any member + managers)
 * POST                                 - create (Committee Lead/manager)
 * PUT                                  - update (Committee Lead/manager, or the assignee for status/notes)
 * DELETE ?id=X&property=Y            - delete (Committee Lead/manager)
 */
const TYPES = ['birthday', 'team_bonding', 'special', 'banquet_milestone'];

async function canWriteToGroup(db, user, property, committeeId) {
  const committee = await db.collection('reslife_committees').findOne({ _id: new ObjectId(committeeId), property });
  return canWriteCollateralGroup(user, property, committee);
}

export async function handler(event) {
  const user = verifyReqAuth(event);
  if (!user) return { statusCode: 401, body: 'Unauthorized' };

  const db = await getDb();
  await refreshReslifeUser(db, user);
  const col = db.collection('reslife_collateral_recognition');

  try {
    if (event.httpMethod === 'GET') {
      const { property, committeeId } = event.queryStringParameters || {};
      if (!property) return { statusCode: 400, body: 'Missing property' };
      if (!canAccessReslifeProperty(user, property)) return { statusCode: 403, body: 'Forbidden' };
      const filter = { property };
      if (committeeId) filter.committeeId = committeeId;
      const docs = await col.find(filter).sort({ month: 1, day: 1 }).toArray();
      docs.forEach(d => { d.id = d._id.toString(); });
      return json(200, docs);
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { property, committeeId, type, title } = body;
      if (!property || !committeeId || !type || !title) return { statusCode: 400, body: 'Missing property/committeeId/type/title' };
      if (!TYPES.includes(type)) return { statusCode: 400, body: 'Invalid type' };
      if (!(await canWriteToGroup(db, user, property, committeeId))) return { statusCode: 403, body: 'Forbidden' };
      const now = new Date().toISOString();
      const doc = {
        property, committeeId, type, title,
        personUsername: body.personUsername || '', month: body.month || null, day: body.day || null,
        eventDate: body.eventDate || '', location: body.location || '', onProperty: body.onProperty !== false,
        budget: Number.isFinite(body.budget) ? body.budget : 0, purchaseNeeds: body.purchaseNeeds || '',
        attendance: body.attendance || '',
        cardNeeded: !!body.cardNeeded, bannerNeeded: !!body.bannerNeeded, celebrationPlanned: !!body.celebrationPlanned,
        purchasingNeeded: !!body.purchasingNeeded, completed: false,
        assignedTo: body.assignedTo || '', notes: body.notes || '',
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
      const canFull = await canWriteToGroup(db, user, property, existing.committeeId);
      const isAssignee = existing.assignedTo === user.sub;
      if (!canFull && !isAssignee) return { statusCode: 403, body: 'Forbidden' };

      const updates = { updatedAt: new Date().toISOString() };
      const limitedFields = ['cardNeeded', 'bannerNeeded', 'celebrationPlanned', 'purchasingNeeded', 'completed', 'notes'];
      const fullFields = limitedFields.concat(['title', 'personUsername', 'month', 'day', 'eventDate', 'location', 'onProperty', 'budget', 'purchaseNeeds', 'attendance', 'assignedTo']);
      const allowed = canFull ? fullFields : limitedFields;
      allowed.forEach(f => { if (body[f] !== undefined) updates[f] = body[f]; });
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
