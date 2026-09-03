import { verifyReqAuth } from './_auth.js';
import { getDb, ObjectId } from './_db.js';
import { canAccessReslifeProperty, canWriteCollateralGroup, refreshReslifeUser, notifyCollateral, managersForReslifeProperty, json } from './_reslife.js';

/**
 * Collateral Groups — Tasks
 * Committee Lead/manager assigns; the assignee can update their own
 * status/checklist/comments. Meeting notes convert directly into these
 * (see reslife-committee-minutes.js actionItems + the "Create Action Item"
 * flow in reslife_collateral.html), and they surface in "My Tasks".
 *
 * GET    ?property=X&committeeId=Y (optional)&projectId=Y (optional)&assignedTo=Y (optional)
 * GET    ?property=X&id=Y
 * POST                                              - create (Committee Lead/manager)
 * PUT                                                - full edit (lead/manager); assignee may update
 *                                                      status/checklist/comments only
 * DELETE ?id=X&property=Y                         - delete (lead/manager)
 */
const STATUSES = ['Not Started', 'In Progress', 'Submitted', 'Needs Review', 'Revision Requested', 'Complete', 'Blocked', 'Not Applicable'];
const PRIORITIES = ['Low', 'Medium', 'High'];

function uidLike() { return 'h-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8); }

async function canWriteToGroup(db, user, property, committeeId) {
  const committee = await db.collection('reslife_committees').findOne({ _id: new ObjectId(committeeId), property });
  return canWriteCollateralGroup(user, property, committee);
}

export async function handler(event) {
  const user = verifyReqAuth(event);
  if (!user) return { statusCode: 401, body: 'Unauthorized' };

  const db = await getDb();
  await refreshReslifeUser(db, user);
  const col = db.collection('reslife_collateral_tasks');

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
      if (q.projectId) filter.projectId = q.projectId;
      if (q.assignedTo) filter.assignedTo = q.assignedTo;
      const docs = await col.find(filter).sort({ dueDate: 1, updatedAt: -1 }).toArray();
      docs.forEach(d => { d.id = d._id.toString(); });
      return json(200, docs);
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { property, committeeId, title } = body;
      if (!property || !committeeId || !title) return { statusCode: 400, body: 'Missing property/committeeId/title' };
      if (!(await canWriteToGroup(db, user, property, committeeId))) return { statusCode: 403, body: 'Only the Committee Lead or a manager can create tasks for this group' };
      const now = new Date().toISOString();
      const doc = {
        property, committeeId, projectId: body.projectId || '',
        title, description: body.description || '', assignedTo: body.assignedTo || '',
        dueDate: body.dueDate || '', priority: PRIORITIES.includes(body.priority) ? body.priority : 'Medium',
        status: STATUSES.includes(body.status) ? body.status : 'Not Started',
        checklist: Array.isArray(body.checklist) ? body.checklist.map(c => ({ id: c.id || uidLike(), text: c.text, done: !!c.done })) : [],
        dependencies: Array.isArray(body.dependencies) ? body.dependencies : [],
        comments: [], attachments: [],
        statusHistory: [{ id: uidLike(), field: 'status', oldValue: null, newValue: 'Not Started', changedBy: user.sub, timestamp: now }],
        createdBy: user.sub, createdAt: now, updatedAt: now,
      };
      const result = await col.insertOne(doc);
      doc.id = result.insertedId.toString();
      if (doc.assignedTo) await notifyCollateral(db, property, [doc.assignedTo], 'task_assigned', 'New task assigned', `"${title}" was assigned to you.`);
      return json(200, doc);
    }

    if (event.httpMethod === 'PUT') {
      const body = JSON.parse(event.body || '{}');
      const { id, property } = body;
      if (!id || !property) return { statusCode: 400, body: 'Missing id/property' };
      const existing = await col.findOne({ _id: new ObjectId(id), property });
      if (!existing) return { statusCode: 404, body: 'Not found' };
      const canFull = await canWriteToGroup(db, user, property, existing.committeeId);
      const isAssignee = existing.assignedTo === user.sub;
      if (!canFull && !isAssignee) return { statusCode: 403, body: 'Forbidden' };

      const updates = { updatedAt: new Date().toISOString() };
      if (body.action === 'addComment') {
        if (!body.message) return { statusCode: 400, body: 'Comment message required' };
        const comments = existing.comments || [];
        comments.push({ id: uidLike(), author: user.sub, role: user.role, message: body.message, timestamp: new Date().toISOString() });
        updates.comments = comments;
      } else if (canFull) {
        ['title', 'description', 'assignedTo', 'dueDate', 'priority', 'projectId', 'dependencies'].forEach(f => { if (body[f] !== undefined) updates[f] = body[f]; });
        if (body.checklist !== undefined) updates.checklist = Array.isArray(body.checklist) ? body.checklist : [];
        if (body.status !== undefined && STATUSES.includes(body.status) && body.status !== existing.status) {
          updates.status = body.status;
          const hist = existing.statusHistory || [];
          hist.push({ id: uidLike(), field: 'status', oldValue: existing.status, newValue: body.status, changedBy: user.sub, timestamp: new Date().toISOString() });
          updates.statusHistory = hist;
        }
      } else if (isAssignee) {
        if (body.checklist !== undefined) updates.checklist = Array.isArray(body.checklist) ? body.checklist : [];
        if (body.status !== undefined && STATUSES.includes(body.status) && body.status !== existing.status) {
          updates.status = body.status;
          const hist = existing.statusHistory || [];
          hist.push({ id: uidLike(), field: 'status', oldValue: existing.status, newValue: body.status, changedBy: user.sub, timestamp: new Date().toISOString(), note: 'Updated by assignee' });
          updates.statusHistory = hist;
        }
      }
      await col.updateOne({ _id: new ObjectId(id), property }, { $set: updates });

      if (updates.status === 'Needs Review' || updates.status === 'Submitted') {
        await notifyCollateral(db, property, await managersForReslifeProperty(db, property), 'task_needs_review', 'Task needs review', `"${existing.title}" was marked ${updates.status.toLowerCase()} by ${user.sub}.`);
      } else if (updates.status === 'Revision Requested' && existing.assignedTo) {
        await notifyCollateral(db, property, [existing.assignedTo], 'task_revision', 'Revision requested', `"${existing.title}" needs revisions.`);
      } else if (updates.assignedTo && updates.assignedTo !== existing.assignedTo) {
        await notifyCollateral(db, property, [updates.assignedTo], 'task_assigned', 'New task assigned', `"${existing.title}" was assigned to you.`);
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
      return json(200, { success: true });
    }

    return { statusCode: 405, body: 'Method Not Allowed' };
  } catch (e) {
    return { statusCode: 500, body: e.message };
  }
}
