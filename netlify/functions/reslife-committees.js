import { verifyReqAuth } from './_auth.js';
import { getDb, ObjectId } from './_db.js';
import { canAccessReslifeProperty, canManageReslifeProperty, refreshReslifeUser, json } from './_reslife.js';

/**
 * Reslife Hub — Collateral Committees
 * Modeled on the property's real committee structure (Programming, Fun &
 * Recognition, Recruitment & Selection, etc.): advisors, a rotating lead,
 * members, and a meeting cadence. Meeting-by-meeting notes live in
 * reslife-committee-minutes.js, keyed by committeeId.
 *
 * GET    ?property=X        - list committees for a property (any Reslife role + admin)
 * POST                       - create a committee (manager tier: REC/Admin/site admin)
 * PUT                        - update a committee (manager tier)
 * DELETE ?id=X&property=Y   - delete a committee (manager tier)
 */
export async function handler(event) {
  const user = verifyReqAuth(event);
  if (!user) return { statusCode: 401, body: 'Unauthorized' };

  const db = await getDb();
  await refreshReslifeUser(db, user);
  const col = db.collection('reslife_committees');

  try {
    if (event.httpMethod === 'GET') {
      const { property } = event.queryStringParameters || {};
      if (!property) return { statusCode: 400, body: 'Missing property' };
      if (!canAccessReslifeProperty(user, property)) return { statusCode: 403, body: 'Forbidden' };
      const docs = await col.find({ property }).sort({ name: 1 }).toArray();
      docs.forEach(d => { d.id = d._id.toString(); });
      return json(200, docs);
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { property, name, advisors, lead, members, cadence } = body;
      if (!property || !name) return { statusCode: 400, body: 'Missing property/name' };
      if (!canManageReslifeProperty(user, property)) return { statusCode: 403, body: 'Forbidden' };
      const now = new Date().toISOString();
      const doc = {
        property, name, advisors: advisors || '', lead: lead || '',
        members: Array.isArray(members) ? members : [], cadence: cadence || '',
        createdBy: user.sub, createdAt: now, updatedAt: now,
      };
      const result = await col.insertOne(doc);
      doc.id = result.insertedId.toString();
      return json(200, doc);
    }

    if (event.httpMethod === 'PUT') {
      const body = JSON.parse(event.body || '{}');
      const { id, property, name, advisors, lead, members, cadence } = body;
      if (!id || !property) return { statusCode: 400, body: 'Missing id/property' };
      if (!canManageReslifeProperty(user, property)) return { statusCode: 403, body: 'Forbidden' };
      const updates = { updatedAt: new Date().toISOString() };
      if (name !== undefined) updates.name = name;
      if (advisors !== undefined) updates.advisors = advisors;
      if (lead !== undefined) updates.lead = lead;
      if (members !== undefined) updates.members = Array.isArray(members) ? members : [];
      if (cadence !== undefined) updates.cadence = cadence;
      await col.updateOne({ _id: new ObjectId(id), property }, { $set: updates });
      return json(200, { success: true });
    }

    if (event.httpMethod === 'DELETE') {
      const { id, property } = event.queryStringParameters || {};
      if (!id || !property) return { statusCode: 400, body: 'Missing id/property' };
      if (!canManageReslifeProperty(user, property)) return { statusCode: 403, body: 'Forbidden' };
      await col.deleteOne({ _id: new ObjectId(id), property });
      await db.collection('reslife_committee_minutes').deleteMany({ committeeId: id, property });
      return json(200, { success: true });
    }

    return { statusCode: 405, body: 'Method Not Allowed' };
  } catch (e) {
    return { statusCode: 500, body: e.message };
  }
}
