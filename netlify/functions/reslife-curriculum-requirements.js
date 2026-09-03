import { verifyReqAuth } from './_auth.js';
import { getDb, ObjectId } from './_db.js';
import { canAccessReslifeProperty, canAdminReslifeProperty, refreshReslifeUser, json } from './_reslife.js';

/**
 * Curriculum Management — Curriculum Builder (Requirement definitions)
 *
 * A Requirement is the reusable definition (title, category, owner type,
 * assignment rule, important dates, workflow stages). Publishing a
 * Requirement generates the actual per-RA (or per-group) Assignment records
 * tracked in reslife-curriculum-assignments.js — the Requirement itself is
 * never marked "complete", only its Assignments are.
 *
 * "Every RA" / "Selected RAs" assignment types create one Assignment PER RA.
 * Every other assignment type (team/floor/building/REC/staff lead/group/
 * other) creates a single group-scope Assignment with the selected staff as
 * participants, so a shared program is never counted as multiple
 * completions (per the anti-duplication requirement).
 *
 * GET    ?property=X&termId=Y        - list requirements for a term (any Reslife role + admin)
 * POST                                  - create a requirement (admin tier only)
 * POST  { action:'publish', id }       - generate assignments for one requirement (admin tier)
 * POST  { action:'publishTerm', termId } - publish every unpublished requirement in a term (admin tier)
 * PUT                                   - update a requirement (admin tier)
 * DELETE ?id=X&property=Y             - delete a requirement with no assignments yet; otherwise archive via PUT
 */
const INDIVIDUAL_ASSIGNMENT_TYPES = ['every_ra', 'selected_ras'];
const DEFAULT_WORKFLOW = [
  { key: 'assigned', label: 'Assigned', order: 0, required: true },
  { key: 'completed', label: 'Completed', order: 1, required: true },
];

function reqDefaults(body) {
  return {
    title: body.title,
    description: body.description || '',
    category: body.category || 'Other',
    month: body.month || '',
    ownerType: body.ownerType || 'RA',
    assignmentType: body.assignmentType || 'every_ra',
    assignedRAs: Array.isArray(body.assignedRAs) ? body.assignedRAs : [],
    required: body.required !== false,
    requiresDocumentation: !!body.requiresDocumentation,
    requiresPurchase: !!body.requiresPurchase,
    workflowStages: Array.isArray(body.workflowStages) && body.workflowStages.length ? body.workflowStages : DEFAULT_WORKFLOW,
    dates: Object.assign({ planningDue: '', purchaseDue: '', programDue: '', documentationDue: '' }, body.dates || {}),
  };
}

async function resolveRAUsernames(db, property, requirement) {
  if (requirement.assignmentType === 'selected_ras') return requirement.assignedRAs || [];
  if (requirement.assignmentType === 'every_ra') {
    const users = await db.collection('users')
      .find({ role: 'reslife-ra', properties: property }, { projection: { username: 1 } })
      .toArray();
    return users.map(u => u.username);
  }
  return [];
}

async function generateAssignments(db, user, property, term, requirement) {
  const assignCol = db.collection('reslife_curriculum_assignments');
  const now = new Date().toISOString();
  const snapshot = {
    title: requirement.title, category: requirement.category, ownerType: requirement.ownerType,
    dates: requirement.dates, workflowStages: requirement.workflowStages,
  };
  let created = 0;

  if (INDIVIDUAL_ASSIGNMENT_TYPES.includes(requirement.assignmentType)) {
    const usernames = await resolveRAUsernames(db, property, requirement);
    for (const username of usernames) {
      const exists = await assignCol.findOne({ property, requirementId: requirement.id, assignedTo: username });
      if (exists) continue;
      await assignCol.insertOne({
        property, termId: term.id, requirementId: requirement.id, requirementSnapshot: snapshot,
        scope: 'individual', assignedTo: username, participants: [username],
        dueDates: requirement.dates, workflowStages: requirement.workflowStages,
        currentStageKey: requirement.workflowStages[0].key, stageProgress: {},
        workflowStatus: 'Not Started',
        submission: null, purchase: { items: [], status: 'Not Needed' },
        program: { planned: null, actual: null }, attachments: [],
        reviewStatus: 'none', revisionRequests: [], comments: [],
        statusHistory: [{ id: uidLike(), field: 'workflowStatus', oldValue: null, newValue: 'Not Started', changedBy: user.sub, timestamp: now, note: 'Assignment created via publish' }],
        waived: false, waivedReason: '', notes: '',
        createdBy: user.sub, createdAt: now, updatedAt: now,
      });
      created++;
    }
  } else {
    // Group / team / floor / building / REC / staff lead / other — single shared assignment.
    const exists = await assignCol.findOne({ property, requirementId: requirement.id, scope: { $in: ['group', 'community'] } });
    if (!exists) {
      await assignCol.insertOne({
        property, termId: term.id, requirementId: requirement.id, requirementSnapshot: snapshot,
        scope: requirement.assignmentType === 'other' ? 'community' : 'group',
        assignedTo: null, participants: requirement.assignedRAs || [],
        dueDates: requirement.dates, workflowStages: requirement.workflowStages,
        currentStageKey: requirement.workflowStages[0].key, stageProgress: {},
        workflowStatus: 'Not Started',
        submission: null, purchase: { items: [], status: 'Not Needed' },
        program: { planned: null, actual: null }, attachments: [],
        reviewStatus: 'none', revisionRequests: [], comments: [],
        statusHistory: [{ id: uidLike(), field: 'workflowStatus', oldValue: null, newValue: 'Not Started', changedBy: user.sub, timestamp: now, note: 'Assignment created via publish' }],
        waived: false, waivedReason: '', notes: '',
        createdBy: user.sub, createdAt: now, updatedAt: now,
      });
      created++;
    }
  }
  return created;
}

function uidLike() { return 'h-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8); }

export async function handler(event) {
  const user = verifyReqAuth(event);
  if (!user) return { statusCode: 401, body: 'Unauthorized' };

  const db = await getDb();
  await refreshReslifeUser(db, user);
  const col = db.collection('reslife_curriculum_requirements');
  const termCol = db.collection('reslife_curriculum_terms');

  try {
    if (event.httpMethod === 'GET') {
      const { property, termId } = event.queryStringParameters || {};
      if (!property) return { statusCode: 400, body: 'Missing property' };
      if (!canAccessReslifeProperty(user, property)) return { statusCode: 403, body: 'Forbidden' };
      const filter = { property };
      if (termId) filter.termId = termId;
      const docs = await col.find(filter).sort({ month: 1, title: 1 }).toArray();
      docs.forEach(d => { d.id = d._id.toString(); });
      return json(200, docs);
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');

      if (body.action === 'publish' || body.action === 'publishTerm') {
        const { property } = body;
        if (!property) return { statusCode: 400, body: 'Missing property' };
        if (!canAdminReslifeProperty(user, property)) return { statusCode: 403, body: 'Forbidden' };

        let requirements = [];
        let term = null;
        if (body.action === 'publish') {
          const reqDoc = await col.findOne({ _id: new ObjectId(body.id), property });
          if (!reqDoc) return { statusCode: 404, body: 'Requirement not found' };
          reqDoc.id = reqDoc._id.toString();
          requirements = [reqDoc];
          term = await termCol.findOne({ _id: new ObjectId(reqDoc.termId), property });
        } else {
          term = await termCol.findOne({ _id: new ObjectId(body.termId), property });
          if (!term) return { statusCode: 404, body: 'Term not found' };
          requirements = await col.find({ property, termId: body.termId, status: { $ne: 'archived' } }).toArray();
          requirements.forEach(r => { r.id = r._id.toString(); });
        }
        if (!term) return { statusCode: 404, body: 'Term not found' };
        term.id = term._id.toString();

        let totalCreated = 0;
        const summary = [];
        for (const r of requirements) {
          const createdCount = await generateAssignments(db, user, property, term, r);
          totalCreated += createdCount;
          summary.push({ requirementId: r.id, title: r.title, assignmentsCreated: createdCount });
          await col.updateOne({ _id: new ObjectId(r.id) }, { $set: { published: true, publishedAt: new Date().toISOString() } });
        }
        return json(200, { totalCreated, summary });
      }

      const { property, termId, title } = body;
      if (!property || !termId || !title) return { statusCode: 400, body: 'Missing property/termId/title' };
      if (!canAdminReslifeProperty(user, property)) return { statusCode: 403, body: 'Forbidden' };
      const now = new Date().toISOString();
      const doc = Object.assign({ property, termId, status: 'active', published: false, needsDateReview: false }, reqDefaults(body));
      doc.createdBy = user.sub; doc.createdAt = now; doc.updatedAt = now;
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
      ['title', 'description', 'category', 'month', 'ownerType', 'assignmentType', 'assignedRAs', 'required',
        'requiresDocumentation', 'requiresPurchase', 'workflowStages', 'dates', 'status'].forEach(f => {
        if (body[f] !== undefined) updates[f] = body[f];
      });
      if (body.dates !== undefined) updates.needsDateReview = false;
      await col.updateOne({ _id: new ObjectId(id), property }, { $set: updates });
      return json(200, { success: true });
    }

    if (event.httpMethod === 'DELETE') {
      const { id, property } = event.queryStringParameters || {};
      if (!id || !property) return { statusCode: 400, body: 'Missing id/property' };
      if (!canAdminReslifeProperty(user, property)) return { statusCode: 403, body: 'Forbidden' };
      const assignCount = await db.collection('reslife_curriculum_assignments').countDocuments({ property, requirementId: id });
      if (assignCount > 0) return { statusCode: 409, body: 'This requirement already has assignments. Archive it instead of deleting.' };
      await col.deleteOne({ _id: new ObjectId(id), property });
      return json(200, { success: true });
    }

    return { statusCode: 405, body: 'Method Not Allowed' };
  } catch (e) {
    return { statusCode: 500, body: e.message };
  }
}
