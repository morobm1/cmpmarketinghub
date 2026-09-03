import { verifyReqAuth } from './_auth.js';
import { getDb, ObjectId } from './_db.js';
import { canAccessReslifeProperty, canAdminReslifeProperty, refreshReslifeUser, json } from './_reslife.js';

/**
 * Curriculum Management — Academic Terms
 * Admin-only mutations (canAdminReslifeProperty = reslife-admin / site admin).
 * REC + RA may read (canAccessReslifeProperty) since term names/dates are
 * needed to filter every other curriculum view.
 *
 * GET    ?property=X                - list terms
 * POST                                - create a term { property, name, academicYear, startDate, endDate, status }
 * POST  { action:'duplicate', id }   - duplicate a term's requirements into a new Draft term
 * PUT                                 - update a term { id, property, ...fields }
 * DELETE ?id=X&property=Y           - delete a term (only if it has no requirements/assignments)
 */
const STATUSES = ['Draft', 'Active', 'Completed', 'Archived'];

export async function handler(event) {
  const user = verifyReqAuth(event);
  if (!user) return { statusCode: 401, body: 'Unauthorized' };

  const db = await getDb();
  await refreshReslifeUser(db, user);
  const col = db.collection('reslife_curriculum_terms');

  try {
    if (event.httpMethod === 'GET') {
      const { property } = event.queryStringParameters || {};
      if (!property) return { statusCode: 400, body: 'Missing property' };
      if (!canAccessReslifeProperty(user, property)) return { statusCode: 403, body: 'Forbidden' };
      const docs = await col.find({ property }).sort({ startDate: -1 }).toArray();
      docs.forEach(d => { d.id = d._id.toString(); });
      return json(200, docs);
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');

      if (body.action === 'duplicate') {
        const { id, property, newName, newAcademicYear } = body;
        if (!id || !property || !newName) return { statusCode: 400, body: 'Missing id/property/newName' };
        if (!canAdminReslifeProperty(user, property)) return { statusCode: 403, body: 'Forbidden' };
        const original = await col.findOne({ _id: new ObjectId(id), property });
        if (!original) return { statusCode: 404, body: 'Term not found' };
        const now = new Date().toISOString();
        const newTerm = {
          property, name: newName, academicYear: newAcademicYear || original.academicYear,
          startDate: '', endDate: '', status: 'Draft',
          duplicatedFrom: id, needsDateReview: true,
          createdBy: user.sub, createdAt: now, updatedAt: now,
        };
        const termResult = await col.insertOne(newTerm);
        newTerm.id = termResult.insertedId.toString();

        // Copy requirement definitions (not assignments) into the new draft term.
        const reqCol = db.collection('reslife_curriculum_requirements');
        const origReqs = await reqCol.find({ property, termId: id }).toArray();
        let copiedCount = 0;
        for (const r of origReqs) {
          const copy = Object.assign({}, r);
          delete copy._id;
          copy.termId = newTerm.id;
          copy.status = 'active';
          copy.needsDateReview = true;
          copy.createdBy = user.sub;
          copy.createdAt = now;
          copy.updatedAt = now;
          await reqCol.insertOne(copy);
          copiedCount++;
        }
        return json(200, { term: newTerm, requirementsCopied: copiedCount });
      }

      const { property, name, academicYear, startDate, endDate, status } = body;
      if (!property || !name) return { statusCode: 400, body: 'Missing property/name' };
      if (!canAdminReslifeProperty(user, property)) return { statusCode: 403, body: 'Forbidden' };
      const now = new Date().toISOString();
      const doc = {
        property, name, academicYear: academicYear || '', startDate: startDate || '', endDate: endDate || '',
        status: STATUSES.includes(status) ? status : 'Draft', needsDateReview: false,
        createdBy: user.sub, createdAt: now, updatedAt: now,
      };
      const result = await col.insertOne(doc);
      doc.id = result.insertedId.toString();
      return json(200, doc);
    }

    if (event.httpMethod === 'PUT') {
      const body = JSON.parse(event.body || '{}');
      const { id, property } = body;
      if (!id || !property) return { statusCode: 400, body: 'Missing id/property' };
      if (!canAdminReslifeProperty(user, property)) return { statusCode: 403, body: 'Forbidden' };
      const updates = { updatedAt: new Date().toISOString() };
      ['name', 'academicYear', 'startDate', 'endDate'].forEach(f => { if (body[f] !== undefined) updates[f] = body[f]; });
      if (body.status !== undefined && STATUSES.includes(body.status)) updates.status = body.status;
      if (body.startDate !== undefined && body.endDate !== undefined) updates.needsDateReview = false;
      await col.updateOne({ _id: new ObjectId(id), property }, { $set: updates });
      return json(200, { success: true });
    }

    if (event.httpMethod === 'DELETE') {
      const { id, property } = event.queryStringParameters || {};
      if (!id || !property) return { statusCode: 400, body: 'Missing id/property' };
      if (!canAdminReslifeProperty(user, property)) return { statusCode: 403, body: 'Forbidden' };
      const reqCount = await db.collection('reslife_curriculum_requirements').countDocuments({ property, termId: id });
      if (reqCount > 0) return { statusCode: 409, body: 'Cannot delete a term that still has curriculum requirements. Archive it instead.' };
      await col.deleteOne({ _id: new ObjectId(id), property });
      return json(200, { success: true });
    }

    return { statusCode: 405, body: 'Method Not Allowed' };
  } catch (e) {
    return { statusCode: 500, body: e.message };
  }
}
