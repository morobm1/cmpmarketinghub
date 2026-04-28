import { getDb, ObjectId } from './_db.js';
import { verifyReqAuth } from './_auth.js';
import { notifyNewAssigneesViaWebhook } from './_email.js';

/**
 * Leasing Team Staff Board API — Multi-assignee + Email Notifications
 *
 * Collections: leasingStaff, leasingBoardTasks, leasingTemplates, notificationLog
 *
 * Task model uses embedded assignees array:
 *   assignees: [{ userId, userName, userEmail, assignedAt, assignedBy, notificationSentAt }]
 */

const GROUPS = [
  { id: 'opening', name: 'Opening', color: '#3b82f6', sortOrder: 0 },
  { id: 'operations', name: 'Operations', color: '#8b5cf6', sortOrder: 1 },
  { id: 'turn', name: 'Turn / Move-Ins', color: '#f59e0b', sortOrder: 2 },
  { id: 'marketing', name: 'Marketing', color: '#10b981', sortOrder: 3 },
  { id: 'lead-follow-up', name: 'Lead Follow Up', color: '#f97316', sortOrder: 4 },
  { id: 'events', name: 'Events', color: '#ec4899', sortOrder: 5 },
  { id: 'closing', name: 'Closing', color: '#ef4444', sortOrder: 6 },
  { id: 'misc', name: 'Misc', color: '#64748b', sortOrder: 7 },
];

const SYSTEM_TEMPLATES = [
  {
    name: 'Simple Daily Checklist Version',
    type: 'system',
    defaultGroupId: 'opening',
    propertyId: null,
    tasks: [
      'Open leasing office', 'Turn on lights and music', 'Clean and organize front desk',
      'Check Print With Me printer', 'Turn on and walk model', 'Check model cleanliness and temperature',
      'Walk tour path', 'Walk amenities', 'Straighten common areas', 'Check restrooms',
      'Walk exterior entrance', 'Review daily schedule', 'Report issues to team',
    ],
  },
  {
    name: 'Simple Daily Closing Checklist',
    type: 'system',
    defaultGroupId: 'closing',
    propertyId: null,
    tasks: [
      'Clean and organize front desk', 'Put away supplies and paperwork', 'Walk and secure model',
      'Turn off model lights', 'Walk amenity spaces', 'Straighten common areas', 'Pick up visible trash',
      'Check restrooms', 'Walk office exterior', 'Return keys and tour materials',
      'Turn off lights and music', 'Lock and secure office',
    ],
  },
];

const STATUSES = ['Not Started', 'Working on It', 'Done', 'On Hold'];

async function ensureSystemTemplates(db) {
  const col = db.collection('leasingTemplates');
  for (const tpl of SYSTEM_TEMPLATES) {
    const exists = await col.findOne({ name: tpl.name, type: 'system' });
    if (!exists) {
      await col.insertOne({ ...tpl, createdAt: new Date().toISOString(), createdBy: 'system', updatedAt: new Date().toISOString(), updatedBy: 'system' });
    }
  }
}

function canAccess(user, pid) {
  if (user.role === 'admin') return true;
  if (user.properties === '*') return true;
  if (Array.isArray(user.properties)) return user.properties.includes(pid);
  return user.properties === pid;
}

function cors(body, sc = 200) {
  return { statusCode: sc, headers: { 'Content-Type': 'application/json' }, body: typeof body === 'string' ? body : JSON.stringify(body) };
}

// ─── Send notifications for newly added assignees (via Google Apps Script webhook) ───
async function notifyNewAssignees(db, task, newAssigneeUserIds, propertyName, groupName, assignedByUsername) {
  return notifyNewAssigneesViaWebhook(db, task, newAssigneeUserIds, propertyName, groupName, assignedByUsername);
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,Authorization' }, body: '' };
  }

  const user = verifyReqAuth(event);
  if (!user) return cors('Unauthorized', 401);

  const db = await getDb();
  const staffCol = db.collection('leasingStaff');
  const taskCol = db.collection('leasingBoardTasks');
  const templateCol = db.collection('leasingTemplates');

  const qs = event.queryStringParameters || {};
  const action = qs.action || '';

  try {
    // ═══ GET ═══
    if (event.httpMethod === 'GET') {

      if (action === 'groups') return cors(GROUPS);

      if (action === 'staff') {
        const pid = qs.propertyId;
        if (!pid) return cors('Missing propertyId', 400);
        if (!canAccess(user, pid)) return cors('Forbidden', 403);
        const filter = { propertyId: pid };
        if (qs.activeOnly !== 'false') filter.isActive = { $ne: false };
        return cors(await staffCol.find(filter).sort({ employeeName: 1 }).toArray());
      }

      if (action === 'tasks') {
        const pid = qs.propertyId;
        if (!pid) return cors('Missing propertyId', 400);
        if (!canAccess(user, pid)) return cors('Forbidden', 403);
        const filter = { propertyId: pid };
        if (qs.date) filter.date = qs.date;
        if (qs.groupId) filter.groupId = qs.groupId;
        // Multi-assignee filter: find tasks where any assignee matches
        if (qs.assignedTo) filter['assignees.userId'] = qs.assignedTo;
        return cors(await taskCol.find(filter).sort({ groupId: 1, sortOrder: 1, label: 1 }).toArray());
      }

      if (action === 'myTasks') {
        let staffRecord = null;
        if (qs.staffId) {
          staffRecord = await staffCol.findOne({ _id: new ObjectId(qs.staffId), isActive: { $ne: false } });
        } else {
          staffRecord = await staffCol.findOne({ username: user.sub, isActive: { $ne: false } });
        }
        if (!staffRecord) return cors({ staff: null, tasks: [] });
        const date = qs.date || new Date().toISOString().slice(0, 10);
        const tasks = await taskCol.find({
          'assignees.userId': staffRecord._id.toString(),
          date,
        }).sort({ groupId: 1, sortOrder: 1 }).toArray();
        return cors({ staff: staffRecord, tasks, date });
      }

      if (action === 'templates') {
        await ensureSystemTemplates(db);
        const filter = {};
        if (qs.propertyId) {
          filter.$or = [{ type: 'system' }, { propertyId: qs.propertyId }, { propertyId: null }];
        }
        return cors(await templateCol.find(filter).sort({ type: 1, name: 1 }).toArray());
      }

      return cors('Unknown GET action', 400);
    }

    // ═══ POST ═══
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');

      // ─── Staff CRUD (all authenticated users with property access) ───
      if (action === 'staff') {
        const { id, propertyId, employeeName, role, username, email, isActive } = body;
        if (!propertyId || !employeeName) return cors('Missing fields', 400);
        const now = new Date().toISOString();
        if (id) {
          const upd = { updatedAt: now, updatedBy: user.sub };
          ['employeeName', 'role', 'propertyId', 'username', 'email', 'isActive'].forEach(k => { if (body[k] !== undefined) upd[k] = body[k]; });
          await staffCol.updateOne({ _id: new ObjectId(id) }, { $set: upd });
          return cors({ success: true, id });
        }
        const doc = { propertyId, employeeName, role: role || '', username: username || '', email: email || '', isActive: true, createdAt: now, createdBy: user.sub, updatedAt: now, updatedBy: user.sub };
        const res = await staffCol.insertOne(doc);
        doc._id = res.insertedId;
        return cors(doc, 201);
      }

      // ─── Task CRUD (multi-assignee + priority/budget/files) ───
      if (action === 'task') {
        const { id, propertyId, label, groupId, assignees, status, date, completed, notes, sortOrder, priority, budget, files } = body;
        if (!id && (!propertyId || !label)) return cors('Missing fields', 400);
        if (propertyId && !canAccess(user, propertyId)) return cors('Forbidden', 403);
        const now = new Date().toISOString();

        if (id) {
          const existing = await taskCol.findOne({ _id: new ObjectId(id) });
          if (!existing) return cors('Not found', 404);
          const upd = { updatedAt: now, updatedBy: user.sub };
          if (label !== undefined) upd.label = label;
          if (groupId !== undefined) upd.groupId = groupId;
          if (status !== undefined) upd.status = status;
          if (date !== undefined) upd.date = date;
          if (notes !== undefined) upd.notes = notes;
          if (sortOrder !== undefined) upd.sortOrder = sortOrder;
          if (priority !== undefined) upd.priority = priority;
          if (budget !== undefined) upd.budget = budget;
          if (files !== undefined) upd.files = files;
          if (completed !== undefined) {
            upd.completed = completed;
            upd.completedAt = completed ? now : null;
            upd.completedBy = completed ? user.sub : null;
            if (completed) upd.status = 'Done';
          }

          // Multi-assignee update
          let newAssigneeIds = [];
          if (assignees !== undefined) {
            const oldIds = (existing.assignees || []).map(a => a.userId);
            const newAssignees = (assignees || []).map(a => ({
              userId: a.userId, userName: a.userName || '', userEmail: a.userEmail || '',
              assignedAt: oldIds.includes(a.userId) ? ((existing.assignees || []).find(x => x.userId === a.userId) || {}).assignedAt || now : now,
              assignedBy: oldIds.includes(a.userId) ? ((existing.assignees || []).find(x => x.userId === a.userId) || {}).assignedBy || user.sub : user.sub,
              notificationSentAt: oldIds.includes(a.userId) ? ((existing.assignees || []).find(x => x.userId === a.userId) || {}).notificationSentAt || null : null,
            }));
            upd.assignees = newAssignees;
            newAssigneeIds = newAssignees.filter(a => !oldIds.includes(a.userId)).map(a => a.userId);
          }

          await taskCol.updateOne({ _id: new ObjectId(id) }, { $set: upd });

          // Email notifications for newly added assignees
          if (newAssigneeIds.length > 0) {
            const updatedTask = await taskCol.findOne({ _id: new ObjectId(id) });
            // Resolve property name
            let propName = '';
            try {
              const allProps = await db.collection('properties').find({}).toArray();
              const p = allProps.find(x => x._id.toString() === (updatedTask.propertyId || existing.propertyId));
              if (p) propName = p.name;
            } catch (e) {}
            const grp = GROUPS.find(g => g.id === (updatedTask.groupId || existing.groupId));
            notifyNewAssignees(db, updatedTask, newAssigneeIds, propName, grp ? grp.name : '', user.sub).catch(e => console.error('[Email] notify error:', e));
          }

          return cors({ success: true });
        }

        // Create new task
        const taskAssignees = (assignees || []).map(a => ({
          userId: a.userId, userName: a.userName || '', userEmail: a.userEmail || '',
          assignedAt: now, assignedBy: user.sub, notificationSentAt: null,
        }));

        const doc = {
          propertyId, label, groupId: groupId || 'misc',
          assignees: taskAssignees,
          status: status || 'Not Started',
          date: date || new Date().toISOString().slice(0, 10),
          completed: false, completedAt: null, completedBy: null,
          notes: notes || '', sortOrder: sortOrder || 0,
          priority: priority || '', budget: budget || null, files: files || [],
          createdAt: now, createdBy: user.sub, updatedAt: now, updatedBy: user.sub,
        };
        const res = await taskCol.insertOne(doc);
        doc._id = res.insertedId;

        // Send notifications
        if (taskAssignees.length > 0) {
          let propName = '';
          try {
            const allProps = await db.collection('properties').find({}).toArray();
            const p = allProps.find(x => x._id.toString() === propertyId);
            if (p) propName = p.name;
          } catch (e) {}
          const grp = GROUPS.find(g => g.id === doc.groupId);
          notifyNewAssignees(db, doc, taskAssignees.map(a => a.userId), propName, grp ? grp.name : '', user.sub).catch(e => console.error('[Email] notify error:', e));
        }

        return cors(doc, 201);
      }

      // ─── Batch create (from template) ───
      if (action === 'taskBatch') {
        const { propertyId, tasks: items, assignees, date, groupId, templateId } = body;
        if (!propertyId || !items || !items.length) return cors('Missing fields', 400);
        if (!canAccess(user, propertyId)) return cors('Forbidden', 403);
        const now = new Date().toISOString();
        const d = date || new Date().toISOString().slice(0, 10);
        const taskAssignees = (assignees || []).map(a => ({
          userId: a.userId, userName: a.userName || '', userEmail: a.userEmail || '',
          assignedAt: now, assignedBy: user.sub, notificationSentAt: null,
        }));

        const docs = items.map((t, i) => ({
          propertyId,
          label: typeof t === 'string' ? t : (t.label || t.taskText || ''),
          groupId: (typeof t === 'object' && t.groupId) ? t.groupId : (groupId || 'misc'),
          assignees: taskAssignees,
          status: 'Not Started',
          date: d,
          completed: false, completedAt: null, completedBy: null,
          notes: '', sortOrder: i,
          priority: '', budget: null, files: [],
          createdFromTemplateId: templateId || null,
          createdAt: now, createdBy: user.sub, updatedAt: now, updatedBy: user.sub,
        }));
        const res = await taskCol.insertMany(docs);

        // Notify assignees via Google Apps Script webhook (one email per person for the batch)
        if (taskAssignees.length > 0 && docs.length > 0) {
          const grp = GROUPS.find(g => g.id === (groupId || 'misc'));
          let propName = '';
          try {
            const allProps = await db.collection('properties').find({}).toArray();
            const p = allProps.find(x => x._id.toString() === propertyId);
            if (p) propName = p.name;
          } catch (e) {}
          // Use the first inserted doc as the representative task for notification
          const summaryDoc = docs[0];
          summaryDoc.label = `${items.length} tasks from template`;
          summaryDoc.notes = items.slice(0, 5).map(t => typeof t === 'string' ? t : t.label).join(', ') + (items.length > 5 ? '...' : '');
          notifyNewAssignees(db, summaryDoc, taskAssignees.map(a => a.userId), propName, grp ? grp.name : '', user.sub).catch(e => console.error('[Email] batch notify error:', e));
        }

        return cors({ success: true, count: res.insertedCount });
      }

      // ─── Complete task ───
      if (action === 'completeTask') {
        const { id, completed } = body;
        if (!id) return cors('Missing id', 400);
        const task = await taskCol.findOne({ _id: new ObjectId(id) });
        if (!task) return cors('Not found', 404);
        if (!canAccess(user, task.propertyId)) return cors('Forbidden', 403);
        const now = new Date().toISOString();
        await taskCol.updateOne({ _id: new ObjectId(id) }, { $set: {
          completed: !!completed, completedAt: completed ? now : null, completedBy: completed ? user.sub : null,
          status: completed ? 'Done' : 'Not Started', updatedAt: now, updatedBy: user.sub,
        }});
        return cors({ success: true });
      }

      // ─── Update status ───
      if (action === 'updateStatus') {
        const { id, status } = body;
        if (!id || !status) return cors('Missing fields', 400);
        if (!STATUSES.includes(status)) return cors('Invalid status', 400);
        const task = await taskCol.findOne({ _id: new ObjectId(id) });
        if (!task) return cors('Not found', 404);
        if (!canAccess(user, task.propertyId)) return cors('Forbidden', 403);
        const now = new Date().toISOString();
        const upd = { status, updatedAt: now, updatedBy: user.sub };
        if (status === 'Done') { upd.completed = true; upd.completedAt = now; upd.completedBy = user.sub; }
        else { upd.completed = false; upd.completedAt = null; upd.completedBy = null; }
        await taskCol.updateOne({ _id: new ObjectId(id) }, { $set: upd });
        return cors({ success: true });
      }

      // ─── Template CRUD ───
      if (action === 'template') {
        const { id, name, defaultGroupId, propertyId, tasks: tplTasks } = body;
        if (!name) return cors('Missing name', 400);
        const now = new Date().toISOString();
        if (id) {
          const tpl = await templateCol.findOne({ _id: new ObjectId(id) });
          if (tpl && tpl.type === 'system') return cors('System templates are read-only', 403);
          const upd = { updatedAt: now, updatedBy: user.sub };
          if (name !== undefined) upd.name = name;
          if (defaultGroupId !== undefined) upd.defaultGroupId = defaultGroupId;
          if (propertyId !== undefined) upd.propertyId = propertyId;
          if (tplTasks !== undefined) upd.tasks = tplTasks;
          await templateCol.updateOne({ _id: new ObjectId(id) }, { $set: upd });
          return cors({ success: true });
        }
        const doc = { name, type: 'custom', defaultGroupId: defaultGroupId || 'misc', propertyId: propertyId || null, tasks: tplTasks || [], createdAt: now, createdBy: user.sub, updatedAt: now, updatedBy: user.sub };
        const res = await templateCol.insertOne(doc);
        doc._id = res.insertedId;
        return cors(doc, 201);
      }

      return cors('Unknown POST action', 400);
    }

    // ═══ DELETE ═══
    if (event.httpMethod === 'DELETE') {
      const body = JSON.parse(event.body || '{}');

      if (action === 'staff') {
        await staffCol.updateOne({ _id: new ObjectId(body.id) }, { $set: { isActive: false, updatedAt: new Date().toISOString() } });
        return cors({ success: true });
      }

      if (action === 'task') {
        const task = await taskCol.findOne({ _id: new ObjectId(body.id) });
        if (!task) return cors('Not found', 404);
        if (!canAccess(user, task.propertyId)) return cors('Forbidden', 403);
        await taskCol.deleteOne({ _id: new ObjectId(body.id) });
        return cors({ success: true });
      }

      if (action === 'template') {
        const tpl = await templateCol.findOne({ _id: new ObjectId(body.id) });
        if (!tpl) return cors('Not found', 404);
        if (tpl.type === 'system') return cors('Cannot delete system templates', 403);
        await templateCol.deleteOne({ _id: new ObjectId(body.id) });
        return cors({ success: true });
      }

      return cors('Unknown DELETE action', 400);
    }

    return cors('Method not allowed', 405);
  } catch (e) {
    console.error('leasing-staff error:', e);
    return cors('Server error: ' + e.message, 500);
  }
}
