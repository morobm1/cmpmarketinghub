import { verifyReqAuth } from './_auth.js';
import { getDb, ObjectId } from './_db.js';

/**
 * Email Templates API
 * GET               - List templates (global defaults + property-specific)
 * GET ?id=X         - Get single template
 * GET ?category=X   - Filter by category
 * GET ?propertyId=X - Get property-specific + global templates
 * GET ?defaults=true - Get default templates only
 * POST              - Save user template
 * DELETE ?id=X      - Delete user template (not default)
 */

// Default template library to seed on first access
import { templateLibrary } from './email-template-seed.js';

let seeded = false;

async function ensureDefaults(col) {
  if (seeded) return;
  const count = await col.countDocuments({ isDefault: true });
  if (count === 0 && templateLibrary && templateLibrary.length > 0) {
    const now = new Date().toISOString();
    const docs = templateLibrary.map(t => ({
      ...t,
      isDefault: true,
      createdAt: t.createdAt || now,
      updatedAt: t.updatedAt || now,
    }));
    await col.insertMany(docs);
  }
  seeded = true;
}

export async function handler(event) {
  const user = verifyReqAuth(event);
  if (!user) return { statusCode: 401, body: 'Unauthorized' };

  const db = await getDb();
  const col = db.collection('email_templates');
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
    return !!propertyId && allowed.includes(propertyId);
  }

  function canAccessTemplate(doc) {
    if (!doc) return false;
    if (doc.isDefault || !doc.propertyId) return true;
    if (doc.createdBy === user.sub) return true;
    return userCanAccessProperty(doc.propertyId);
  }

  try {
    // Seed default templates on first access
    await ensureDefaults(col);

    if (event.httpMethod === 'GET') {
      const id = params.get('id');
      const category = params.get('category');
      const propertyId = params.get('propertyId');
      const defaults = params.get('defaults');

      if (id) {
        let query;
        try { query = { _id: new ObjectId(id) }; } catch { query = { id }; }
        const doc = await col.findOne(query);
        if (!doc) return { statusCode: 404, body: 'Not found' };
        if (!canAccessTemplate(doc)) return { statusCode: 403, body: 'Access denied' };
        doc.id = doc.id || doc._id.toString();
        return json(doc);
      }

      let filter = {};
      if (defaults === 'true') {
        filter.isDefault = true;
      } else if (category) {
        filter.category = category;
      } else if (propertyId) {
        if (!userCanAccessProperty(propertyId)) return { statusCode: 403, body: 'Access denied' };
        filter.$or = [
          { propertyId: propertyId },
          { propertyId: { $exists: false } },
          { propertyId: null },
          { isDefault: true },
        ];
      } else if (!(user.role === 'admin' || user.properties === '*')) {
        // No explicit filter requested: scope to templates this user should actually see
        // instead of every property's saved templates.
        const allowed = Array.isArray(user.properties) ? user.properties : [];
        filter = { $or: [
          { isDefault: true },
          { propertyId: { $exists: false } },
          { propertyId: null },
          { createdBy: user.sub },
          ...(allowed.length > 0 ? [{ propertyId: { $in: allowed } }] : []),
        ]};
      }

      const docs = await col.find(filter).sort({ isDefault: -1, name: 1 }).toArray();
      docs.forEach(d => { d.id = d.id || d._id.toString(); });
      return json(docs);
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const now = new Date().toISOString();

      if (body.id || body._id) {
        const docId = body.id || body._id;
        delete body._id;
        let filter;
        try { filter = { _id: new ObjectId(docId) }; } catch { filter = { id: docId }; }
        const existing = await col.findOne(filter);
        if (existing && !canAccessTemplate(existing) && existing.createdBy !== user.sub) {
          return { statusCode: 403, body: 'Access denied' };
        }
        if (body.propertyId && !userCanAccessProperty(body.propertyId)) return { statusCode: 403, body: 'Access denied' };
        body.updatedAt = now;
        await col.updateOne(filter, { $set: body }, { upsert: true });
        body.id = docId;
        return json(body);
      } else {
        if (body.propertyId && !userCanAccessProperty(body.propertyId)) return { statusCode: 403, body: 'Access denied' };
        body.isDefault = false;
        body.createdBy = user.sub;
        body.createdAt = now;
        body.updatedAt = now;
        const result = await col.insertOne(body);
        body.id = result.insertedId.toString();
        return json(body);
      }
    }

    if (event.httpMethod === 'DELETE') {
      const id = params.get('id');
      if (!id) return { statusCode: 400, body: 'id required' };

      let query;
      try { query = { _id: new ObjectId(id) }; } catch { query = { id }; }
      const doc = await col.findOne(query);
      if (doc && doc.isDefault) return { statusCode: 403, body: 'Cannot delete default templates' };
      if (doc && doc.createdBy !== user.sub && !userCanAccessProperty(doc.propertyId) && user.role !== 'admin') {
        return { statusCode: 403, body: 'Access denied' };
      }

      await col.deleteOne(query);
      return json({ success: true });
    }

    return { statusCode: 405, body: 'Method not allowed' };
  } catch (err) {
    console.error('email-templates error:', err);
    return { statusCode: 500, body: 'Internal server error' };
  }
}
