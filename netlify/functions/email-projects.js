import { verifyReqAuth } from './_auth.js';
import { getDb, ObjectId } from './_db.js';

/**
 * Email Projects API
 * GET              - List projects (scoped by propertyId + createdBy for user, all for admin)
 * GET ?id=X        - Get single project
 * GET ?propertyId=X - Filter by property
 * POST             - Create/update project (or duplicate with action=duplicate)
 * DELETE ?id=X     - Delete project
 */
export async function handler(event) {
  const user = verifyReqAuth(event);
  if (!user) return { statusCode: 401, body: 'Unauthorized' };

  const db = await getDb();
  const col = db.collection('email_projects');
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

  function canAccessProject(doc) {
    if (!doc) return false;
    if (doc.createdBy === user.sub) return true;
    if (Array.isArray(doc.sharedWith) && doc.sharedWith.includes(user.sub)) return true;
    return userCanAccessProperty(doc.propertyId);
  }

  try {
    if (event.httpMethod === 'GET') {
      const id = params.get('id');
      const propertyId = params.get('propertyId');

      if (id) {
        let query;
        try { query = { _id: new ObjectId(id) }; } catch { query = { id }; }
        const doc = await col.findOne(query);
        if (!doc) return { statusCode: 404, body: 'Not found' };
        if (!canAccessProject(doc)) return { statusCode: 403, body: 'Access denied' };
        doc.id = doc.id || doc._id.toString();
        return json(doc);
      }

      let filter = {};
      if (propertyId) {
        if (!userCanAccessProperty(propertyId)) return { statusCode: 403, body: 'Access denied' };
        filter.propertyId = propertyId;
      } else if (user.role === 'admin' || user.properties === '*') {
        // Admin sees all — no filter needed
      } else {
        // User-scoped: show projects created by this user, for their assigned properties, or shared with them
        const allowed = Array.isArray(user.properties) ? user.properties : [];
        filter = { $or: [
          { createdBy: user.sub },
          ...(allowed.length > 0 ? [{ propertyId: { $in: allowed } }] : []),
          { sharedWith: user.sub },
        ]};
      }

      const docs = await col.find(filter).sort({ updatedAt: -1 }).toArray();
      docs.forEach(d => { d.id = d.id || d._id.toString(); });
      return json(docs);
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');

      // Handle duplicate action
      if (body.action === 'duplicate') {
        const { id, newName } = body;
        if (!id) return { statusCode: 400, body: 'id required for duplicate' };
        let query;
        try { query = { _id: new ObjectId(id) }; } catch { query = { id }; }
        const original = await col.findOne(query);
        if (!original) return { statusCode: 404, body: 'Project not found' };
        if (!canAccessProject(original)) return { statusCode: 403, body: 'Access denied' };

        const now = new Date().toISOString();
        delete original._id;
        const dup = {
          ...original,
          id: undefined,
          name: newName || original.name + ' (Copy)',
          status: 'draft',
          createdBy: user.sub,
          createdAt: now,
          updatedAt: now,
        };
        const result = await col.insertOne(dup);
        dup.id = result.insertedId.toString();
        return json(dup);
      }

      // Create or update
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
        body.createdBy = body.createdBy || user.sub;
        body.createdAt = now;
        body.updatedAt = now;
        body.status = body.status || 'draft';
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
      if (existing && !canAccessProject(existing)) return { statusCode: 403, body: 'Access denied' };
      await col.deleteOne(filter);
      return json({ success: true });
    }

    return { statusCode: 405, body: 'Method not allowed' };
  } catch (err) {
    console.error('email-projects error:', err);
    return { statusCode: 500, body: 'Internal server error' };
  }
}
