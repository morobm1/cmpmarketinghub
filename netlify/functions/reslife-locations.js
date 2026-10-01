import { verifyReqAuth } from './_auth.js';
import { getDb, ObjectId } from './_db.js';
import { canAccessReslifeProperty, canManageReslifeProperty, refreshReslifeUser, json } from './_reslife.js';

/**
 * Reslife Hub — Program Locations
 * Per-property list of event locations used by the Program Proposal dropdown.
 *
 * Document shape (reslife_locations collection):
 * { _id, property, name, createdBy, createdAt }
 *
 * GET    ?property=X          - list locations (any Reslife role + admin)
 * POST   { property, name }   - add a location (manager tier: REC/Admin/site admin)
 * DELETE ?id=X&property=Y     - remove a location (manager tier)
 */
export async function handler(event) {
  const user = verifyReqAuth(event);
  if (!user) return { statusCode: 401, body: 'Unauthorized' };

  const db = await getDb();
  await refreshReslifeUser(db, user);
  const col = db.collection('reslife_locations');

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
      const property = body.property;
      const name = String(body.name || '').trim();
      if (!property || !name) return { statusCode: 400, body: 'Missing property/name' };
      if (!canManageReslifeProperty(user, property)) return { statusCode: 403, body: 'Only REC/Admin can add locations' };
      const dup = await col.findOne({ property, name: { $regex: '^' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', $options: 'i' } });
      if (dup) { dup.id = dup._id.toString(); return json(200, dup); }
      const doc = { property, name, createdBy: user.sub, createdAt: new Date().toISOString() };
      const result = await col.insertOne(doc);
      doc.id = result.insertedId.toString();
      return json(200, doc);
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
