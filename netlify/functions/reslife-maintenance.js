import { verifyReqAuth } from './_auth.js';
import { getDb, ObjectId } from './_db.js';
import { canAccessReslifeProperty, canModifyReslifeRecord, isReslifeManager, refreshReslifeUser, json } from './_reslife.js';

const TYPES = ['maintenance', 'key'];
const STATUSES = ['open', 'in-progress', 'resolved'];

/**
 * Reslife Hub — Maintenance / Key Request Log
 * GET    ?property=X            - list requests for a property (any Reslife role + admin)
 * POST                            - create request (RA/REC/Admin/site admin)
 * PUT                             - update request; creator may edit their own, REC/Admin/site admin any
 * DELETE ?id=X&property=Y       - delete request; creator may delete their own, REC/Admin/site admin any
 */
export async function handler(event) {
  const user = verifyReqAuth(event);
  if (!user) return { statusCode: 401, body: 'Unauthorized' };

  const db = await getDb();
  await refreshReslifeUser(db, user);
  const col = db.collection('reslife_maintenance_requests');

  try {
    if (event.httpMethod === 'GET') {
      const { property } = event.queryStringParameters || {};
      if (!property) return { statusCode: 400, body: 'Missing property' };
      if (!canAccessReslifeProperty(user, property)) return { statusCode: 403, body: 'Forbidden' };
      const docs = await col.find({ property }).sort({ createdAt: -1 }).toArray();
      docs.forEach(d => { d.id = d._id.toString(); });
      return json(200, docs);
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { property, type, location, description } = body;
      if (!property || !description) return { statusCode: 400, body: 'Missing property/description' };
      if (!canAccessReslifeProperty(user, property)) return { statusCode: 403, body: 'Forbidden' };
      const now = new Date().toISOString();
      const doc = {
        property,
        type: TYPES.includes(type) ? type : 'maintenance',
        location: location || '',
        description,
        status: 'open',
        reportedBy: user.sub,
        createdAt: now,
        updatedAt: now,
        resolvedBy: null,
        resolvedAt: null,
      };
      const result = await col.insertOne(doc);
      doc.id = result.insertedId.toString();
      return json(200, doc);
    }

    if (event.httpMethod === 'PUT') {
      const body = JSON.parse(event.body || '{}');
      const { id, property, type, location, description, status } = body;
      if (!id || !property) return { statusCode: 400, body: 'Missing id/property' };
      const existing = await col.findOne({ _id: new ObjectId(id), property });
      if (!existing) return { statusCode: 404, body: 'Not found' };
      if (!canModifyReslifeRecord(user, property, existing.reportedBy)) return { statusCode: 403, body: 'Forbidden' };

      const updates = { updatedAt: new Date().toISOString() };
      if (type !== undefined && TYPES.includes(type)) updates.type = type;
      if (location !== undefined) updates.location = location;
      if (description !== undefined) updates.description = description;

      if (status !== undefined) {
        if (!(user.role === 'admin' || isReslifeManager(user.role))) {
          return { statusCode: 403, body: 'Only managers can update status' };
        }
        updates.status = STATUSES.includes(status) ? status : 'open';
        updates.resolvedBy = updates.status === 'resolved' ? user.sub : null;
        updates.resolvedAt = updates.status === 'resolved' ? updates.updatedAt : null;
      }

      await col.updateOne({ _id: new ObjectId(id), property }, { $set: updates });
      return json(200, { success: true });
    }

    if (event.httpMethod === 'DELETE') {
      const { id, property } = event.queryStringParameters || {};
      if (!id || !property) return { statusCode: 400, body: 'Missing id/property' };
      const existing = await col.findOne({ _id: new ObjectId(id), property });
      if (!existing) return { statusCode: 404, body: 'Not found' };
      if (!canModifyReslifeRecord(user, property, existing.reportedBy)) return { statusCode: 403, body: 'Forbidden' };
      await col.deleteOne({ _id: new ObjectId(id), property });
      return json(200, { success: true });
    }

    return { statusCode: 405, body: 'Method Not Allowed' };
  } catch (e) {
    return { statusCode: 500, body: e.message };
  }
}
