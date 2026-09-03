import { verifyReqAuth } from './_auth.js';
import { getDb, ObjectId } from './_db.js';
import { canAccessReslifeProperty, canManageReslifeProperty, refreshReslifeUser, json } from './_reslife.js';

const CATEGORIES = ['Programming', 'Recruitment & Selection', 'Duty & Coverage', 'Incident Response', 'Administrative', 'General'];

/**
 * Reslife Hub — SOP Library
 * GET    ?property=X        - list SOPs for a property (any Reslife role + admin, read-only for RA)
 * POST                       - create an SOP (manager tier: REC/Admin/site admin)
 * PUT                        - update an SOP (manager tier)
 * DELETE ?id=X&property=Y   - delete an SOP (manager tier)
 */
export async function handler(event) {
  const user = verifyReqAuth(event);
  if (!user) return { statusCode: 401, body: 'Unauthorized' };

  const db = await getDb();
  await refreshReslifeUser(db, user);
  const col = db.collection('reslife_sops');

  try {
    if (event.httpMethod === 'GET') {
      const { property } = event.queryStringParameters || {};
      if (!property) return { statusCode: 400, body: 'Missing property' };
      if (!canAccessReslifeProperty(user, property)) return { statusCode: 403, body: 'Forbidden' };
      const docs = await col.find({ property }).sort({ category: 1, title: 1 }).toArray();
      docs.forEach(d => { d.id = d._id.toString(); });
      return json(200, docs);
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { property, title, category, content, linkUrl } = body;
      if (!property || !title) return { statusCode: 400, body: 'Missing property/title' };
      if (!canManageReslifeProperty(user, property)) return { statusCode: 403, body: 'Forbidden' };
      const now = new Date().toISOString();
      const doc = {
        property,
        title,
        category: CATEGORIES.includes(category) ? category : 'General',
        content: content || '',
        linkUrl: linkUrl || '',
        createdBy: user.sub,
        updatedBy: user.sub,
        createdAt: now,
        updatedAt: now,
      };
      const result = await col.insertOne(doc);
      doc.id = result.insertedId.toString();
      return json(200, doc);
    }

    if (event.httpMethod === 'PUT') {
      const body = JSON.parse(event.body || '{}');
      const { id, property, title, category, content, linkUrl } = body;
      if (!id || !property) return { statusCode: 400, body: 'Missing id/property' };
      if (!canManageReslifeProperty(user, property)) return { statusCode: 403, body: 'Forbidden' };
      const updates = { updatedBy: user.sub, updatedAt: new Date().toISOString() };
      if (title !== undefined) updates.title = title;
      if (category !== undefined) updates.category = CATEGORIES.includes(category) ? category : 'General';
      if (content !== undefined) updates.content = content;
      if (linkUrl !== undefined) updates.linkUrl = linkUrl;
      await col.updateOne({ _id: new ObjectId(id), property }, { $set: updates });
      return json(200, { success: true });
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
