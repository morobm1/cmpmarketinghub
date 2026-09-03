import { verifyReqAuth } from './_auth.js';
import { getDb, ObjectId } from './_db.js';
import { canAccessReslifeProperty, canManageReslifeProperty, canAdminReslifeProperty, isCommitteeLead, refreshReslifeUser, json } from './_reslife.js';

/**
 * Reslife Hub — Collateral Groups (Committees)
 *
 * "Collateral" in this app means ResLife staff committees/working groups
 * (Programming, Recognition, Recruitment & Development, etc.) — NOT
 * marketing collateral/swag. This is the CollateralGroup entity: advisors,
 * a Committee Lead, members, meeting cadence, and now an optional
 * `category` (programming/recognition/recruitment/other, freeform so
 * Admin can create future group types without code changes), a
 * description, a semester label, and configurable meeting expectations.
 * Meeting-by-meeting records live in reslife-committee-minutes.js.
 *
 * Committee Lead is a per-group designation (the `lead` field), not a
 * global role — the lead of a specific group gets elevated permissions
 * scoped to that group only (isCommitteeLead()), even if their account's
 * global role is just reslife-ra.
 *
 * GET    ?property=X            - list groups for a property (any Reslife role + admin)
 * POST                            - create a group (Admin tier only: reslife-admin/site admin)
 * PUT                             - update a group (manager tier, OR that group's Committee Lead for
 *                                   a limited set of operational fields: description/cadence/meeting config)
 * DELETE ?id=X&property=Y       - delete a group (Admin tier only) — prefer archiving via PUT status
 */
const LEAD_EDITABLE_FIELDS = ['description', 'cadence', 'meetingFrequencyDays', 'meetingDurationMinutes'];

export async function handler(event) {
  const user = verifyReqAuth(event);
  if (!user) return { statusCode: 401, body: 'Unauthorized' };

  const db = await getDb();
  await refreshReslifeUser(db, user);
  const col = db.collection('reslife_committees');

  try {
    if (event.httpMethod === 'GET') {
      const { property } = event.queryStringParameters || {};
      if (!property) return { statusCode: 400, body: 'Missing property' };
      if (!canAccessReslifeProperty(user, property)) return { statusCode: 403, body: 'Forbidden' };
      const docs = await col.find({ property }).sort({ name: 1 }).toArray();
      docs.forEach(d => {
        d.id = d._id.toString();
        d.status = d.status || 'active';
        d.meetingFrequencyDays = d.meetingFrequencyDays || 14;
        d.meetingDurationMinutes = d.meetingDurationMinutes || 60;
      });
      return json(200, docs);
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { property, name, advisors, lead, members, cadence, description, category, semesterLabel, meetingFrequencyDays, meetingDurationMinutes } = body;
      if (!property || !name) return { statusCode: 400, body: 'Missing property/name' };
      if (!canAdminReslifeProperty(user, property)) return { statusCode: 403, body: 'Forbidden' };
      const now = new Date().toISOString();
      const doc = {
        property, name, advisors: advisors || '', lead: lead || '',
        members: Array.isArray(members) ? members : [], cadence: cadence || '',
        description: description || '', category: category || '', semesterLabel: semesterLabel || '',
        meetingFrequencyDays: Number.isFinite(meetingFrequencyDays) ? meetingFrequencyDays : 14,
        meetingDurationMinutes: Number.isFinite(meetingDurationMinutes) ? meetingDurationMinutes : 60,
        status: 'active',
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
      const existing = await col.findOne({ _id: new ObjectId(id), property });
      if (!existing) return { statusCode: 404, body: 'Not found' };

      const isManagerTier = canManageReslifeProperty(user, property);
      const isLead = isCommitteeLead(existing, user) && canAccessReslifeProperty(user, property);
      if (!isManagerTier && !isLead) return { statusCode: 403, body: 'Forbidden' };

      const allFields = ['name', 'advisors', 'lead', 'members', 'cadence', 'description', 'category', 'semesterLabel', 'meetingFrequencyDays', 'meetingDurationMinutes', 'status'];
      const allowedFields = isManagerTier ? allFields : LEAD_EDITABLE_FIELDS;
      const updates = { updatedAt: new Date().toISOString() };
      allowedFields.forEach(f => {
        if (body[f] === undefined) return;
        if (f === 'members') updates.members = Array.isArray(body.members) ? body.members : [];
        else updates[f] = body[f];
      });
      await col.updateOne({ _id: new ObjectId(id), property }, { $set: updates });
      return json(200, { success: true });
    }

    if (event.httpMethod === 'DELETE') {
      const { id, property } = event.queryStringParameters || {};
      if (!id || !property) return { statusCode: 400, body: 'Missing id/property' };
      if (!canAdminReslifeProperty(user, property)) return { statusCode: 403, body: 'Forbidden' };
      await col.deleteOne({ _id: new ObjectId(id), property });
      await db.collection('reslife_committee_minutes').deleteMany({ committeeId: id, property });
      return json(200, { success: true });
    }

    return { statusCode: 405, body: 'Method Not Allowed' };
  } catch (e) {
    return { statusCode: 500, body: e.message };
  }
}
