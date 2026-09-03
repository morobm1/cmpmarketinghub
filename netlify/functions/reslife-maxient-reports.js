import { verifyReqAuth } from './_auth.js';
import { getDb, ObjectId } from './_db.js';
import { canAccessReslifeProperty, canModifyReslifeRecord, isReslifeManager, refreshReslifeUser, json } from './_reslife.js';

/**
 * Reslife Hub — Incident Report Assistant / Maxient Report Builder
 *
 * Each document is one report draft (or finalized "ready" report). The
 * entire structured report lives under `report` as a single nested object —
 * schemaless by design so the wizard can evolve its fields without a
 * migration. Ownership: the RA who created it, or REC/Admin/site admin
 * (manager tier) for oversight and co-authoring, mirroring every other
 * "own record vs manager" pattern in this app (see reslife-incidents.js).
 *
 * GET    ?property=X                - list this property's reports (summary fields only,
 *                                      for the drafts dashboard). RA sees own; manager tier sees all.
 * GET    ?property=X&id=Y           - full report (owner or manager tier)
 * POST                                - create a new draft { property, report }
 * PUT                                 - update a draft/report { id, property, report, status }
 * DELETE ?id=X&property=Y           - delete a draft (owner or manager tier)
 */
export async function handler(event) {
  const user = verifyReqAuth(event);
  if (!user) return { statusCode: 401, body: 'Unauthorized' };

  const db = await getDb();
  await refreshReslifeUser(db, user);
  const col = db.collection('reslife_maxient_reports');
  const manager = user.role === 'admin' || isReslifeManager(user.role);

  try {
    if (event.httpMethod === 'GET') {
      const { property, id } = event.queryStringParameters || {};
      if (!property) return { statusCode: 400, body: 'Missing property' };
      if (!canAccessReslifeProperty(user, property)) return { statusCode: 403, body: 'Forbidden' };

      if (id) {
        const doc = await col.findOne({ _id: new ObjectId(id), property });
        if (!doc) return { statusCode: 404, body: 'Not found' };
        if (!canModifyReslifeRecord(user, property, doc.createdBy) && doc.createdBy !== user.sub) {
          return { statusCode: 403, body: 'Forbidden' };
        }
        doc.id = doc._id.toString();
        return json(200, doc);
      }

      const filter = { property };
      if (!manager) filter.createdBy = user.sub;
      const docs = await col
        .find(filter, { projection: { report: 0 } })
        .sort({ updatedAt: -1 })
        .toArray();
      docs.forEach(d => { d.id = d._id.toString(); });
      return json(200, docs);
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { property, report } = body;
      if (!property) return { statusCode: 400, body: 'Missing property' };
      if (!canAccessReslifeProperty(user, property)) return { statusCode: 403, body: 'Forbidden' };
      const now = new Date().toISOString();
      const doc = {
        property,
        status: 'draft',
        report: report || {},
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
      const { id, property, report, status } = body;
      if (!id || !property) return { statusCode: 400, body: 'Missing id/property' };
      const existing = await col.findOne({ _id: new ObjectId(id), property });
      if (!existing) return { statusCode: 404, body: 'Not found' };
      if (!canModifyReslifeRecord(user, property, existing.createdBy)) return { statusCode: 403, body: 'Forbidden' };

      const updates = { updatedBy: user.sub, updatedAt: new Date().toISOString() };
      if (report !== undefined) updates.report = report;
      if (status !== undefined && ['draft', 'ready'].includes(status)) updates.status = status;

      await col.updateOne({ _id: new ObjectId(id), property }, { $set: updates });
      return json(200, { success: true });
    }

    if (event.httpMethod === 'DELETE') {
      const { id, property } = event.queryStringParameters || {};
      if (!id || !property) return { statusCode: 400, body: 'Missing id/property' };
      const existing = await col.findOne({ _id: new ObjectId(id), property });
      if (!existing) return { statusCode: 404, body: 'Not found' };
      if (!canModifyReslifeRecord(user, property, existing.createdBy)) return { statusCode: 403, body: 'Forbidden' };
      await col.deleteOne({ _id: new ObjectId(id), property });
      return json(200, { success: true });
    }

    return { statusCode: 405, body: 'Method Not Allowed' };
  } catch (e) {
    return { statusCode: 500, body: e.message };
  }
}
