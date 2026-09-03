import { verifyReqAuth } from './_auth.js';
import { getDb, ObjectId } from './_db.js';

/**
 * Email Shared Library API
 * GET ?propertyId=X         - List shared emails by property
 * GET ?mine=true            - List user's shared emails
 * GET ?visibility=public    - List public shared emails
 * GET ?id=X                 - Get single shared email
 * POST                      - Share an email (or duplicate with action=duplicate)
 * PUT                       - Update visibility
 * DELETE ?id=X              - Unshare
 */
export async function handler(event) {
  const user = verifyReqAuth(event);
  if (!user) return { statusCode: 401, body: 'Unauthorized' };

  const db = await getDb();
  const col = db.collection('email_shared');
  const params = new URLSearchParams(event.rawQuery || '');
  const json = (data) => ({ statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });

  // Refresh properties/role from DB to avoid stale JWT claims
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

  function canAccessShared(doc) {
    if (!doc) return false;
    if (doc.visibility === 'public') return true;
    if (doc.sharedBy === user.sub) return true;
    return userCanAccessProperty(doc.propertyId);
  }

  try {
    if (event.httpMethod === 'GET') {
      const id = params.get('id');
      const propertyId = params.get('propertyId');
      const mine = params.get('mine');
      const visibility = params.get('visibility');

      if (id) {
        let query;
        try { query = { _id: new ObjectId(id) }; } catch { query = { id }; }
        const doc = await col.findOne(query);
        if (!doc) return { statusCode: 404, body: 'Not found' };
        if (!canAccessShared(doc)) return { statusCode: 403, body: 'Access denied' };
        doc.id = doc.id || doc._id.toString();
        return json(doc);
      }

      if (mine === 'true') {
        const docs = await col.find({ sharedBy: user.sub }).sort({ sharedAt: -1 }).toArray();
        docs.forEach(d => { d.id = d.id || d._id.toString(); });
        return json(docs);
      }

      if (visibility === 'public') {
        const docs = await col.find({ visibility: 'public' }).sort({ sharedAt: -1 }).toArray();
        docs.forEach(d => { d.id = d.id || d._id.toString(); });
        return json(docs);
      }

      if (propertyId) {
        if (!userCanAccessProperty(propertyId)) return { statusCode: 403, body: 'Access denied' };
        const docs = await col.find({
          propertyId,
          $or: [
            { visibility: 'property' },
            { visibility: 'public' },
            { sharedBy: user.sub },
          ],
        }).sort({ sharedAt: -1 }).toArray();
        docs.forEach(d => { d.id = d.id || d._id.toString(); });
        return json(docs);
      }

      // Default: return shared emails visible to user
      let filter = {};
      if (user.role !== 'admin' && user.properties !== '*') {
        const allowed = Array.isArray(user.properties) ? user.properties : [];
        filter = {
          $or: [
            { propertyId: { $in: allowed }, visibility: { $in: ['property', 'public'] } },
            { sharedBy: user.sub },
            { visibility: 'public' },
          ],
        };
      }
      const docs = await col.find(filter).sort({ sharedAt: -1 }).toArray();
      docs.forEach(d => { d.id = d.id || d._id.toString(); });
      return json(docs);
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');

      // Handle duplicate
      if (body.action === 'duplicate') {
        const { id, newName, username } = body;
        let query;
        try { query = { _id: new ObjectId(id) }; } catch { query = { id }; }
        const original = await col.findOne(query);
        if (!original) return { statusCode: 404, body: 'Not found' };
        if (!canAccessShared(original)) return { statusCode: 403, body: 'Access denied' };

        const now = new Date().toISOString();
        delete original._id;
        const dup = {
          ...original,
          id: undefined,
          name: newName || original.name + ' (Copy)',
          sharedBy: username || user.sub,
          sharedAt: now,
          updatedAt: now,
          usageCount: 0,
        };
        // Increment original usage count
        await col.updateOne(query, { $inc: { usageCount: 1 } });
        const result = await col.insertOne(dup);
        dup.id = result.insertedId.toString();
        return json(dup);
      }

      // Share new email
      const now = new Date().toISOString();
      body.sharedBy = body.sharedBy || user.sub;
      body.sharedAt = body.sharedAt || now;
      body.updatedAt = now;
      body.usageCount = body.usageCount || 0;
      body.visibility = body.visibility || 'property';
      const result = await col.insertOne(body);
      body.id = result.insertedId.toString();
      return json(body);
    }

    if (event.httpMethod === 'PUT') {
      const body = JSON.parse(event.body || '{}');
      const { id, visibility } = body;
      if (!id || !visibility) return { statusCode: 400, body: 'id and visibility required' };

      let query;
      try { query = { _id: new ObjectId(id) }; } catch { query = { id }; }
      const existing = await col.findOne(query);
      if (!existing) return { statusCode: 404, body: 'Not found' };
      if (existing.sharedBy !== user.sub && user.role !== 'admin') return { statusCode: 403, body: 'Access denied' };
      const now = new Date().toISOString();
      await col.updateOne(query, { $set: { visibility, updatedAt: now } });
      const updated = await col.findOne(query);
      if (updated) updated.id = updated.id || updated._id.toString();
      return json(updated);
    }

    if (event.httpMethod === 'DELETE') {
      const id = params.get('id');
      if (!id) return { statusCode: 400, body: 'id required' };
      let query;
      try { query = { _id: new ObjectId(id) }; } catch { query = { id }; }
      const existing = await col.findOne(query);
      if (existing && existing.sharedBy !== user.sub && user.role !== 'admin') return { statusCode: 403, body: 'Access denied' };
      await col.deleteOne(query);
      return json({ success: true });
    }

    return { statusCode: 405, body: 'Method not allowed' };
  } catch (err) {
    console.error('email-shared error:', err);
    return { statusCode: 500, body: 'Internal server error' };
  }
}
