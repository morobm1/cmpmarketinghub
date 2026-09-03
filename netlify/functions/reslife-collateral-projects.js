import { verifyReqAuth } from './_auth.js';
import { getDb, ObjectId } from './_db.js';
import { canAccessReslifeProperty, canManageReslifeProperty, canWriteCollateralGroup, refreshReslifeUser, notifyCollateral, managersForReslifeProperty, json } from './_reslife.js';

/**
 * Collateral Groups — Projects
 * (Committee Management + Project Management + Deliverable Tracking.
 * "Collateral" here means ResLife staff committees, never marketing
 * collateral/swag — see reslife-committees.js.)
 *
 * A project can optionally link to an existing Curriculum requirement so
 * Programming collateral projects never duplicate program/purchasing/
 * attendance data already tracked by the Curriculum module.
 *
 * GET    ?property=X&committeeId=Y (optional)   - list projects (any member of the group + managers)
 * GET    ?property=X&id=Y                          - single project
 * POST                                              - create (Committee Lead of that group, or manager tier)
 * PUT                                                - update; full edit for lead/manager, owner/participant
 *                                                      may update status + add comments only
 * DELETE ?id=X&property=Y                         - delete (lead/manager)
 */
const STATUSES = ['Idea', 'Planning', 'In Progress', 'Waiting', 'Needs Review', 'Approved', 'Scheduled', 'Completed', 'Paused', 'Cancelled'];
const PRIORITIES = ['Low', 'Medium', 'High'];

function uidLike() { return 'h-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8); }

async function canWriteToGroup(db, user, property, committeeId) {
  if (canManageReslifeProperty(user, property)) return true;
  const committee = await db.collection('reslife_committees').findOne({ _id: new ObjectId(committeeId), property });
  return canWriteCollateralGroup(user, property, committee);
}
function isParticipant(p, user) { return p.owner === user.sub || (Array.isArray(p.participants) && p.participants.includes(user.sub)); }

export async function handler(event) {
  const user = verifyReqAuth(event);
  if (!user) return { statusCode: 401, body: 'Unauthorized' };

  const db = await getDb();
  await refreshReslifeUser(db, user);
  const col = db.collection('reslife_collateral_projects');

  try {
    if (event.httpMethod === 'GET') {
      const q = event.queryStringParameters || {};
      const { property, id } = q;
      if (!property) return { statusCode: 400, body: 'Missing property' };
      if (!canAccessReslifeProperty(user, property)) return { statusCode: 403, body: 'Forbidden' };
      if (id) {
        const doc = await col.findOne({ _id: new ObjectId(id), property });
        if (!doc) return { statusCode: 404, body: 'Not found' };
        doc.id = doc._id.toString();
        return json(200, doc);
      }
      const filter = { property };
      if (q.committeeId) filter.committeeId = q.committeeId;
      const docs = await col.find(filter).sort({ targetDate: 1, updatedAt: -1 }).toArray();
      docs.forEach(d => { d.id = d._id.toString(); });
      return json(200, docs);
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { property, committeeId, title } = body;
      if (!property || !committeeId || !title) return { statusCode: 400, body: 'Missing property/committeeId/title' };
      if (!canAccessReslifeProperty(user, property)) return { statusCode: 403, body: 'Forbidden' };
      if (!(await canWriteToGroup(db, user, property, committeeId))) return { statusCode: 403, body: 'Only the Committee Lead or a manager can create projects for this group' };
      const now = new Date().toISOString();
      const doc = {
        property, committeeId, title, description: body.description || '', category: body.category || '',
        owner: body.owner || '', participants: Array.isArray(body.participants) ? body.participants : [],
        advisor: body.advisor || '', startDate: body.startDate || '', targetDate: body.targetDate || '',
        status: STATUSES.includes(body.status) ? body.status : 'Idea',
        priority: PRIORITIES.includes(body.priority) ? body.priority : 'Medium',
        milestones: Array.isArray(body.milestones) ? body.milestones : [],
        budget: Object.assign({ default: 0, estimated: 0, approved: 0, purchased: 0 }, body.budget || {}),
        linkedCurriculumRequirementId: body.linkedCurriculumRequirementId || '', linkedCurriculumAssignmentId: body.linkedCurriculumAssignmentId || '',
        comments: [], attachments: [],
        statusHistory: [{ id: uidLike(), field: 'status', oldValue: null, newValue: 'Idea', changedBy: user.sub, timestamp: now }],
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
      const canFull = await canWriteToGroup(db, user, property, existing.committeeId);
      const canLimited = !canFull && isParticipant(existing, user);
      if (!canFull && !canLimited) return { statusCode: 403, body: 'Forbidden' };

      const updates = { updatedAt: new Date().toISOString() };
      if (body.action === 'addComment') {
        if (!body.message) return { statusCode: 400, body: 'Comment message required' };
        const comments = existing.comments || [];
        comments.push({ id: uidLike(), author: user.sub, role: user.role, message: body.message, timestamp: new Date().toISOString() });
        updates.comments = comments;
      } else if (canFull) {
        const fullFields = ['title', 'description', 'category', 'owner', 'participants', 'advisor', 'startDate', 'targetDate', 'priority', 'milestones', 'budget', 'linkedCurriculumRequirementId', 'linkedCurriculumAssignmentId'];
        fullFields.forEach(f => { if (body[f] !== undefined) updates[f] = body[f]; });
        if (body.status !== undefined && STATUSES.includes(body.status) && body.status !== existing.status) {
          updates.status = body.status;
          const hist = existing.statusHistory || [];
          hist.push({ id: uidLike(), field: 'status', oldValue: existing.status, newValue: body.status, changedBy: user.sub, timestamp: new Date().toISOString() });
          updates.statusHistory = hist;
        }
      } else if (canLimited && body.status !== undefined && STATUSES.includes(body.status)) {
        updates.status = body.status;
        const hist = existing.statusHistory || [];
        hist.push({ id: uidLike(), field: 'status', oldValue: existing.status, newValue: body.status, changedBy: user.sub, timestamp: new Date().toISOString(), note: 'Updated by participant' });
        updates.statusHistory = hist;
      }
      await col.updateOne({ _id: new ObjectId(id), property }, { $set: updates });
      if (updates.status === 'Needs Review') {
        await notifyCollateral(db, property, await managersForReslifeProperty(db, property), 'project_needs_review', 'Project needs review', `"${existing.title}" was marked Needs Review by ${user.sub}.`);
      }
      return json(200, { success: true });
    }

    if (event.httpMethod === 'DELETE') {
      const { id, property } = event.queryStringParameters || {};
      if (!id || !property) return { statusCode: 400, body: 'Missing id/property' };
      const existing = await col.findOne({ _id: new ObjectId(id), property });
      if (!existing) return { statusCode: 404, body: 'Not found' };
      if (!(await canWriteToGroup(db, user, property, existing.committeeId))) return { statusCode: 403, body: 'Forbidden' };
      await col.deleteOne({ _id: new ObjectId(id), property });
      await db.collection('reslife_collateral_tasks').deleteMany({ property, projectId: id });
      return json(200, { success: true });
    }

    return { statusCode: 405, body: 'Method Not Allowed' };
  } catch (e) {
    return { statusCode: 500, body: e.message };
  }
}
