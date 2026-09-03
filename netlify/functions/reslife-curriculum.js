import { verifyReqAuth } from './_auth.js';
import { getDb, ObjectId } from './_db.js';
import { canAccessReslifeProperty, canManageReslifeProperty, refreshReslifeUser, json } from './_reslife.js';

/**
 * Reslife Hub — Curriculum Tracker
 * Modeled on the property's semester curriculum tracker spreadsheet: a grid
 * of RAs (roster) x required programs/deliverables (requirements), each
 * with a due date and a per-RA completion flag.
 *
 * A tracker document shape:
 *   { property, semester, requirements: [{ id, name, dueDate }],
 *     roster: [raName, ...], completions: { "<raName>__<reqId>": { done, date } } }
 *
 * GET    ?property=X            - list trackers (semesters) for a property (any Reslife role + admin)
 * POST                            - create a new semester tracker (manager tier: REC/Admin/site admin)
 * PUT                             - update requirements/roster/completions (manager tier)
 * DELETE ?id=X&property=Y       - delete a tracker (manager tier)
 */
export async function handler(event) {
  const user = verifyReqAuth(event);
  if (!user) return { statusCode: 401, body: 'Unauthorized' };

  const db = await getDb();
  await refreshReslifeUser(db, user);
  const col = db.collection('reslife_curriculum');

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
      const { property, semester, requirements, roster } = body;
      if (!property || !semester) return { statusCode: 400, body: 'Missing property/semester' };
      if (!canManageReslifeProperty(user, property)) return { statusCode: 403, body: 'Forbidden' };
      const now = new Date().toISOString();
      const reqs = (Array.isArray(requirements) ? requirements : []).map((r, i) => ({
        id: r.id || ('req-' + Date.now() + '-' + i), name: r.name, dueDate: r.dueDate || null,
      }));
      const doc = {
        property, semester,
        requirements: reqs,
        roster: Array.isArray(roster) ? roster : [],
        completions: {},
        createdBy: user.sub, createdAt: now, updatedAt: now,
      };
      const result = await col.insertOne(doc);
      doc.id = result.insertedId.toString();
      return json(200, doc);
    }

    if (event.httpMethod === 'PUT') {
      const body = JSON.parse(event.body || '{}');
      const { id, property, requirements, roster, completions } = body;
      if (!id || !property) return { statusCode: 400, body: 'Missing id/property' };
      if (!canManageReslifeProperty(user, property)) return { statusCode: 403, body: 'Forbidden' };
      const updates = { updatedAt: new Date().toISOString() };
      if (requirements !== undefined) {
        updates.requirements = (Array.isArray(requirements) ? requirements : []).map((r, i) => ({
          id: r.id || ('req-' + Date.now() + '-' + i), name: r.name, dueDate: r.dueDate || null,
        }));
      }
      if (roster !== undefined) updates.roster = Array.isArray(roster) ? roster : [];
      if (completions !== undefined) updates.completions = (completions && typeof completions === 'object') ? completions : {};
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
