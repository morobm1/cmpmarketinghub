import { verifyReqAuth } from './_auth.js';
import { getDb, ObjectId } from './_db.js';

/* ──────────────────────────────────────────────
   SOP Library API
   Collection: sops
   Document shape:
   {
     _id,
     sopType: 'company' | 'site',
     property: null | 'Property Name',   // null for company-wide
     title: String,
     category: String,
     department: String,
     content: String (HTML),
     purpose: String,
     steps: String,
     resources: String,
     owner: String,
     lastReviewed: String (ISO date),
     createdAt: Date,
     updatedAt: Date,
     createdBy: String (username)
   }
────────────────────────────────────────────── */

export async function handler(event) {
  const user = verifyReqAuth(event);
  if (!user) return { statusCode: 401, body: 'Unauthorized' };

  const db = await getDb();
  const col = db.collection('sops');
  const method = event.httpMethod;

  try {
    // ─── GET: list / read SOPs ───
    if (method === 'GET') {
      const qs = event.queryStringParameters || {};

      // Single SOP by id
      if (qs.id) {
        const doc = await col.findOne({ _id: new ObjectId(qs.id) });
        if (!doc) return { statusCode: 404, body: 'Not found' };
        // Access check: company SOPs visible to all; site SOPs only to admin or assigned users
        if (doc.sopType === 'site' && user.role !== 'admin') {
          const userProps = user.properties === '*' ? null : (user.properties || []);
          if (userProps && !userProps.includes(doc.property)) {
            return { statusCode: 403, body: 'Forbidden' };
          }
        }
        doc.id = doc._id.toString();
        delete doc._id;
        return { statusCode: 200, body: JSON.stringify(doc) };
      }

      // List SOPs
      const filter = {};

      // sopType filter: 'company' or 'site'
      if (qs.sopType) {
        filter.sopType = qs.sopType;
      }

      // property filter (for site SOPs)
      if (qs.property) {
        filter.property = qs.property;
      }

      // For non-admin users requesting site SOPs, restrict to their assigned properties
      if (user.role !== 'admin' && (!qs.sopType || qs.sopType === 'site')) {
        const userProps = user.properties === '*' ? null : (user.properties || []);
        if (userProps) {
          if (qs.sopType === 'site') {
            // Only show site SOPs for their properties
            if (qs.property) {
              if (!userProps.includes(qs.property)) {
                return { statusCode: 200, body: JSON.stringify([]) };
              }
            } else {
              filter.property = { $in: userProps };
            }
          } else if (!qs.sopType) {
            // No sopType filter: show company + their site SOPs
            filter.$or = [
              { sopType: 'company' },
              { sopType: 'site', property: { $in: userProps } }
            ];
            // Remove sopType/property from filter since $or handles it
            delete filter.sopType;
            delete filter.property;
          }
        }
      }

      const docs = await col.find(filter).sort({ sopType: 1, category: 1, title: 1 }).toArray();
      const result = docs.map(d => {
        d.id = d._id.toString();
        delete d._id;
        return d;
      });
      return { statusCode: 200, body: JSON.stringify(result) };
    }

    // ─── POST: create new SOP (admin only) ───
    if (method === 'POST') {
      if (user.role !== 'admin') return { statusCode: 403, body: 'Admin only' };

      const body = JSON.parse(event.body || '{}');
      const { sopType, property, title, category, department, content, purpose, steps, resources, owner, lastReviewed } = body;

      if (!title) return { statusCode: 400, body: 'Title is required' };
      if (!sopType || !['company', 'site'].includes(sopType)) {
        return { statusCode: 400, body: 'sopType must be "company" or "site"' };
      }
      if (sopType === 'site' && !property) {
        return { statusCode: 400, body: 'property is required for site SOPs' };
      }

      const doc = {
        sopType,
        property: sopType === 'company' ? null : property,
        title: title.trim(),
        category: (category || 'General').trim(),
        department: (department || '').trim(),
        content: content || '',
        purpose: (purpose || '').trim(),
        steps: (steps || '').trim(),
        resources: (resources || '').trim(),
        owner: (owner || '').trim(),
        lastReviewed: lastReviewed || '',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: user.sub
      };

      const res = await col.insertOne(doc);
      doc.id = res.insertedId.toString();
      delete doc._id;
      return { statusCode: 200, body: JSON.stringify(doc) };
    }

    // ─── PUT: update SOP (admin only) ───
    if (method === 'PUT') {
      if (user.role !== 'admin') return { statusCode: 403, body: 'Admin only' };

      const body = JSON.parse(event.body || '{}');
      const { id, sopType, property, title, category, department, content, purpose, steps, resources, owner, lastReviewed } = body;

      if (!id) return { statusCode: 400, body: 'id is required' };
      if (!title) return { statusCode: 400, body: 'Title is required' };

      const updates = {
        title: title.trim(),
        category: (category || 'General').trim(),
        department: (department || '').trim(),
        content: content || '',
        purpose: (purpose || '').trim(),
        steps: (steps || '').trim(),
        resources: (resources || '').trim(),
        owner: (owner || '').trim(),
        lastReviewed: lastReviewed || '',
        updatedAt: new Date()
      };

      // Allow changing sopType and property
      if (sopType && ['company', 'site'].includes(sopType)) {
        updates.sopType = sopType;
        updates.property = sopType === 'company' ? null : (property || null);
      }

      await col.updateOne({ _id: new ObjectId(id) }, { $set: updates });

      const updated = await col.findOne({ _id: new ObjectId(id) });
      if (updated) {
        updated.id = updated._id.toString();
        delete updated._id;
      }
      return { statusCode: 200, body: JSON.stringify(updated) };
    }

    // ─── DELETE: remove SOP (admin only) ───
    if (method === 'DELETE') {
      if (user.role !== 'admin') return { statusCode: 403, body: 'Admin only' };

      const body = JSON.parse(event.body || '{}');
      const { id } = body;
      if (!id) return { statusCode: 400, body: 'id is required' };

      await col.deleteOne({ _id: new ObjectId(id) });
      return { statusCode: 200, body: JSON.stringify({ deleted: true }) };
    }

    return { statusCode: 405, body: 'Method Not Allowed' };
  } catch (e) {
    return { statusCode: 500, body: e.message };
  }
}
