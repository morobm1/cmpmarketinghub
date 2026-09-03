import { verifyReqAuth } from './_auth.js';
import { getDb, ObjectId } from './_db.js';

/**
 * Email Assets API
 * GET                         - List all assets for user's properties
 * GET ?propertyId=X           - List assets by property
 * GET ?propertyId=X&category=Y - Filter by category
 * GET ?propertyId=X&q=search  - Search assets
 * POST                        - Add/update asset
 * DELETE ?id=X                - Remove asset
 */
export async function handler(event) {
  const user = verifyReqAuth(event);
  if (!user) return { statusCode: 401, body: 'Unauthorized' };

  const db = await getDb();
  const col = db.collection('email_assets');
  const params = new URLSearchParams(event.rawQuery || '');
  const json = (data) => ({ statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });

  // Refresh properties from DB to avoid stale JWT claims
  const freshUser = await db.collection('users').findOne({ username: user.sub });
  if (freshUser) {
    user.properties = freshUser.properties;
    user.role = freshUser.role;
  }

  function userCanAccessProperty(propertyId) {
    if (user.role === 'admin' || user.properties === '*') return true;
    const allowed = Array.isArray(user.properties) ? user.properties : [];
    return allowed.includes(propertyId);
  }

  try {
    if (event.httpMethod === 'GET') {
      const id = params.get('id');
      const propertyId = params.get('propertyId');
      const category = params.get('category');
      const q = params.get('q');

      if (id) {
        let query;
        try { query = { _id: new ObjectId(id) }; } catch { query = { id }; }
        const doc = await col.findOne(query);
        if (!doc) return { statusCode: 404, body: 'Not found' };
        if (!userCanAccessProperty(doc.propertyId)) return { statusCode: 403, body: 'Access denied' };
        doc.id = doc.id || doc._id.toString();
        return json(doc);
      }

      let filter = {};
      if (propertyId) {
        if (!userCanAccessProperty(propertyId)) return { statusCode: 403, body: 'Access denied' };
        filter.propertyId = propertyId;
      } else if (user.role !== 'admin' && user.properties !== '*') {
        const allowed = Array.isArray(user.properties) ? user.properties : [];
        filter.propertyId = { $in: allowed };
      }

      if (category) filter.category = category;

      if (q) {
        const regex = { $regex: q, $options: 'i' };
        filter.$or = [{ name: regex }, { tags: regex }, { altText: regex }];
      }

      const docs = await col.find(filter).sort({ createdAt: -1 }).toArray();
      docs.forEach(d => { d.id = d.id || d._id.toString(); });
      return json(docs);
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      if (!body.propertyId) return { statusCode: 400, body: 'propertyId required' };
      if (!userCanAccessProperty(body.propertyId)) return { statusCode: 403, body: 'Access denied' };

      const now = new Date().toISOString();
      if (body.id || body._id) {
        const docId = body.id || body._id;
        delete body._id;
        body.updatedAt = now;
        let filter;
        try { filter = { _id: new ObjectId(docId) }; } catch { filter = { id: docId }; }
        await col.updateOne(filter, { $set: body }, { upsert: true });
        body.id = docId;
        return json(body);
      } else {
        body.createdAt = body.createdAt || now;
        body.uploadedBy = user.sub;
        const result = await col.insertOne(body);
        body.id = result.insertedId.toString();
        return json(body);
      }
    }

    if (event.httpMethod === 'DELETE') {
      const id = params.get('id');
      if (!id) return { statusCode: 400, body: 'id required' };
      let filter;
      try { filter = { _id: new ObjectId(id) }; } catch { filter = { id }; }
      const existing = await col.findOne(filter);
      if (existing && !userCanAccessProperty(existing.propertyId)) return { statusCode: 403, body: 'Access denied' };
      await col.deleteOne(filter);
      return json({ success: true });
    }

    return { statusCode: 405, body: 'Method not allowed' };
  } catch (err) {
    console.error('email-assets error:', err);
    return { statusCode: 500, body: 'Internal server error' };
  }
}
