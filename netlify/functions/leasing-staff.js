import { getDb, ObjectId } from './_db.js';
import { verifyReqAuth } from './_auth.js';
import { notifyNewAssigneesViaWebhook, sendTaskAssignmentEmailWebhook, notifyTaskUpdateViaWebhook } from './_email.js';

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

let _propsCache = null;
let _propsCacheTime = 0;
async function getPropsMap(db) {
  if (_propsCache && Date.now() - _propsCacheTime < 60000) return _propsCache;
  const docs = await db.collection('properties').find({}).toArray();
  _propsCache = {};
  for (const d of docs) { _propsCache[d._id] = d.name; _propsCache[d.name] = d._id; }
  _propsCacheTime = Date.now();
  return _propsCache;
}

function canAccessSync(user, pid, propsMap) {
  if (user.role === 'admin') return true;
  if (user.properties === '*') return true;
  const propName = (propsMap && propsMap[pid]) || '';
  if (Array.isArray(user.properties)) {
    return user.properties.some(p => {
      const pl = String(p).toLowerCase();
      return pl === pid.toLowerCase() || (propName && pl === propName.toLowerCase());
    });
  }
  const up = String(user.properties).toLowerCase();
  return up === pid.toLowerCase() || (propName && up === propName.toLowerCase());
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
  const propsMap = await getPropsMap(db);
  const staffCol = db.collection('leasingStaff');
  const taskCol = db.collection('leasingBoardTasks');
  const templateCol = db.collection('leasingTemplates');

  const qs = event.queryStringParameters || {};
  const action = qs.action || '';

  try {
    // ═══ GET ═══
    if (event.httpMethod === 'GET') {

      if (action === 'groups') return cors(GROUPS);

      if (action === 'propertyUsers') {
        const pid = qs.propertyId;
        if (!pid) return cors('Missing propertyId', 400);
        if (!canAccessSync(user, pid, propsMap)) return cors('Forbidden', 403);
        const usersCol = db.collection('users');
        const allUsers = await usersCol.find({}, { projection: { passwordHash: 0 } }).toArray();
        const allProps = await db.collection('properties').find({}).toArray();
        const prop = allProps.find(p => p._id === pid || p._id.toString() === pid) || {};
        const propName = prop.name || '';
        const matchValues = [pid, propName].filter(Boolean).map(v => v.toLowerCase());
        const matched = allUsers.filter(u => {
          if (u.properties === '*') return true;
          if (Array.isArray(u.properties)) {
            return u.properties.some(p => matchValues.includes(String(p).toLowerCase()));
          }
          return matchValues.includes(String(u.properties).toLowerCase());
        });
        return cors(matched.map(u => ({ username: u.username, role: u.role, email: u.email || '', properties: u.properties || [] })));
      }

      if (action === 'staff') {
        const pid = qs.propertyId;
        if (!pid) return cors('Missing propertyId', 400);
        if (!canAccessSync(user, pid, propsMap)) return cors('Forbidden', 403);
        const filter = { propertyId: pid };
        if (qs.activeOnly !== 'false') filter.isActive = { $ne: false };
        return cors(await staffCol.find(filter).sort({ employeeName: 1 }).toArray());
      }

      if (action === 'tasks') {
        const pid = qs.propertyId;
        if (!pid) return cors('Missing propertyId', 400);
        if (!canAccessSync(user, pid, propsMap)) return cors('Forbidden', 403);
        const filter = { propertyId: pid, deleted: { $ne: true } };
        if (qs.date) filter.date = qs.date;
        if (qs.groupId) filter.groupId = qs.groupId;
        if (qs.assignedTo) filter['assignees.userId'] = qs.assignedTo;
        return cors(await taskCol.find(filter).sort({ groupId: 1, sortOrder: 1, label: 1 }).toArray());
      }

      if (action === 'deletedTasks') {
        const pid = qs.propertyId;
        if (!pid) return cors('Missing propertyId', 400);
        if (user.role !== 'admin') return cors('Admin only', 403);
        return cors(await taskCol.find({ propertyId: pid, deleted: true }).sort({ deletedAt: -1 }).toArray());
      }

      if (action === 'myTasks') {
        let staffRecord = null;
        if (qs.staffId) {
          staffRecord = await staffCol.findOne({ _id: new ObjectId(qs.staffId), isActive: { $ne: false } });
        } else {
          staffRecord = await staffCol.findOne({ username: user.sub, isActive: { $ne: false } });
        }
        if (!staffRecord) return cors({ staff: null, tasks: [] });
        const mode = qs.mode || 'day';
        const date = qs.date || new Date().toISOString().slice(0, 10);
        const filter = {
          'assignees.userId': staffRecord._id.toString(),
          deleted: { $ne: true },
        };
        if (mode === 'day') {
          filter.date = date;
        } else if (mode === 'month') {
          const ym = date.slice(0, 7);
          filter.date = { $regex: '^' + ym };
        } else if (mode === 'open') {
          filter.completed = { $ne: true };
        }
        const tasks = await taskCol.find(filter).sort({ groupId: 1, sortOrder: 1 }).toArray();
        return cors({ staff: staffRecord, tasks, date, mode });
      }

      if (action === 'templates') {
        await ensureSystemTemplates(db);
        const filter = {};
        if (qs.propertyId) {
          filter.$or = [{ type: 'system' }, { propertyId: qs.propertyId }, { propertyId: null }];
        }
        return cors(await templateCol.find(filter).sort({ type: 1, name: 1 }).toArray());
      }

      if (action === 'taskHistory') {
        const taskId = qs.taskId;
        if (!taskId) return cors('Missing taskId', 400);
        const history = await db.collection('taskHistory').find({ taskId }).sort({ changedAt: -1 }).limit(100).toArray();
        return cors(history);
      }

      // ─── Diagnostic: test webhook connection (admin only) ───
      if (action === 'testWebhook') {
        if (user.role !== 'admin') return cors('Admin only', 403);
        const url = process.env.CMP_SCRIPT_URL;
        const secret = process.env.CMP_TASK_SECRET;
        const diag = {
          CMP_SCRIPT_URL_set: !!url,
          CMP_SCRIPT_URL_preview: url ? url.slice(0, 50) + '...' : 'NOT SET',
          CMP_TASK_SECRET_set: !!secret,
          CMP_TASK_SECRET_length: secret ? secret.length : 0,
          CMP_TASK_SECRET_preview: secret ? secret.slice(0, 3) + '***' : 'NOT SET',
        };
        if (!url || !secret) return cors({ diag, error: 'Missing env vars' });
        try {
          const testPayload = { secret, eventType: 'test_ping' };
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testPayload),
          });
          const text = await res.text();
          diag.responseStatus = res.status;
          diag.responseBody = text.slice(0, 500);
          diag.responseIsHTML = text.trim().startsWith('<');
          // Now try with task_assigned event type
          const testPayload2 = { secret, eventType: 'task_assigned', assignedToEmail: 'test@test.com', assignedToName: 'Test', taskTitle: 'Webhook Test' };
          const res2 = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testPayload2),
          });
          const text2 = await res2.text();
          diag.testAssignedStatus = res2.status;
          diag.testAssignedBody = text2.slice(0, 500);
        } catch (e) {
          diag.fetchError = e.message;
        }
        return cors(diag);
      }

      if (action === 'taskFiles') {
        const taskId = qs.taskId;
        if (!taskId) return cors('Missing taskId', 400);
        const task = await taskCol.findOne({ _id: new ObjectId(taskId) });
        if (!task) return cors('Not found', 404);
        return cors(task.files || []);
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
        const { id, propertyId, label, groupId, assignees, responsibleUsers, status, date, completed, notes, sortOrder, priority, budget, actualSpend, files } = body;
        if (!id && (!propertyId || !label)) return cors('Missing fields', 400);
        if (propertyId && !canAccessSync(user, propertyId, propsMap)) return cors('Forbidden', 403);
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
          if (actualSpend !== undefined) upd.actualSpend = actualSpend;
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

          // Responsible users update
          if (responsibleUsers !== undefined) {
            upd.responsibleUsers = (responsibleUsers || []).map(r => ({ userId: r.userId, userName: r.userName || '', userEmail: r.userEmail || '' }));
          }

          // Compute diff for task history
          const changes = {};
          if (label !== undefined && label !== existing.label) changes.label = { from: existing.label, to: label };
          if (groupId !== undefined && groupId !== existing.groupId) changes.groupId = { from: existing.groupId, to: groupId };
          if (status !== undefined && status !== existing.status) changes.status = { from: existing.status, to: status };
          if (date !== undefined && date !== existing.date) changes.date = { from: existing.date, to: date };
          if (notes !== undefined && notes !== existing.notes) changes.notes = { from: existing.notes, to: notes };
          if (priority !== undefined && priority !== existing.priority) changes.priority = { from: existing.priority, to: priority };
          if (budget !== undefined && budget !== existing.budget) changes.budget = { from: existing.budget, to: budget };
          if (actualSpend !== undefined && actualSpend !== existing.actualSpend) changes.actualSpend = { from: existing.actualSpend, to: actualSpend };
          if (completed !== undefined && completed !== existing.completed) changes.completed = { from: existing.completed, to: completed };
          if (assignees !== undefined) {
            const oldNames = (existing.assignees || []).map(a => a.userName).sort().join(', ');
            const newNames = (assignees || []).map(a => a.userName).sort().join(', ');
            if (oldNames !== newNames) changes.assignees = { from: oldNames, to: newNames };
          }
          if (responsibleUsers !== undefined) {
            const oldResp = (existing.responsibleUsers || []).map(r => r.userName).sort().join(', ');
            const newResp = (responsibleUsers || []).map(r => r.userName).sort().join(', ');
            if (oldResp !== newResp) changes.responsibleUsers = { from: oldResp, to: newResp };
          }

          await taskCol.updateOne({ _id: new ObjectId(id) }, { $set: upd });

          // Log task history for update
          try {
            if (Object.keys(changes).length > 0) {
              await db.collection('taskHistory').insertOne({
                taskId: id,
                action: 'updated',
                changes,
                changedBy: user.sub,
                changedAt: new Date().toISOString()
              });
            }
          } catch (histErr) { console.error('[TaskHistory] update log error:', histErr); }

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

          // Email notifications for task updates (status change or any field change)
          if (Object.keys(changes).length > 0) {
            const updatedTaskForNotify = await taskCol.findOne({ _id: new ObjectId(id) });
            const oldSt = changes.status ? changes.status.from : existing.status;
            const newSt = changes.status ? changes.status.to : existing.status;
            let propNameForNotify = '';
            try {
              const allPropsN = await db.collection('properties').find({}).toArray();
              const pN = allPropsN.find(x => x._id.toString() === (updatedTaskForNotify.propertyId || existing.propertyId));
              if (pN) propNameForNotify = pN.name;
            } catch (e) {}
            const grpN = GROUPS.find(g => g.id === (updatedTaskForNotify.groupId || existing.groupId));
            notifyTaskUpdateViaWebhook(db, updatedTaskForNotify, propNameForNotify, grpN ? grpN.name : '', user.sub, oldSt, newSt, changes).catch(e => console.error('[Email] task update notify error:', e));
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
          responsibleUsers: (responsibleUsers || []).map(r => ({ userId: r.userId, userName: r.userName || '', userEmail: r.userEmail || '' })),
          status: status || 'Not Started',
          date: date || new Date().toISOString().slice(0, 10),
          completed: false, completedAt: null, completedBy: null,
          notes: Array.isArray(notes) ? notes : [], sortOrder: sortOrder || 0,
          priority: priority || '', budget: budget || null, actualSpend: actualSpend || null, files: files || [],
          createdAt: now, createdBy: user.sub, updatedAt: now, updatedBy: user.sub,
        };
        const res = await taskCol.insertOne(doc);
        doc._id = res.insertedId;

        // Log task history for creation
        try {
          await db.collection('taskHistory').insertOne({
            taskId: doc._id.toString(),
            action: 'created',
            changes: { label, groupId: groupId || 'misc', status: status || 'Not Started', date: doc.date, priority: priority || '', assignees: taskAssignees.map(a => a.userName) },
            changedBy: user.sub,
            changedAt: new Date().toISOString()
          });
        } catch (histErr) { console.error('[TaskHistory] create log error:', histErr); }

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

      if (action === 'addNote') {
        const { taskId, text } = body;
        if (!taskId || !text) return cors('Missing fields', 400);
        const task = await taskCol.findOne({ _id: new ObjectId(taskId) });
        if (!task) return cors('Not found', 404);
        if (!canAccessSync(user, task.propertyId, propsMap)) return cors('Forbidden', 403);
        const note = { id: new ObjectId().toString(), text, author: user.sub, createdAt: new Date().toISOString(), resolved: false };
        const existingNotes = Array.isArray(task.notes) ? task.notes : (task.notes ? [{ id: new ObjectId().toString(), text: task.notes, author: 'system', createdAt: task.createdAt || new Date().toISOString(), resolved: false }] : []);
        existingNotes.push(note);
        await taskCol.updateOne({ _id: new ObjectId(taskId) }, { $set: { notes: existingNotes, updatedAt: new Date().toISOString(), updatedBy: user.sub } });
        return cors({ success: true, notes: existingNotes });
      }

      if (action === 'resolveNote') {
        const { taskId, noteId, resolved } = body;
        if (!taskId || !noteId) return cors('Missing fields', 400);
        const task = await taskCol.findOne({ _id: new ObjectId(taskId) });
        if (!task) return cors('Not found', 404);
        if (!canAccessSync(user, task.propertyId, propsMap)) return cors('Forbidden', 403);
        const notes = Array.isArray(task.notes) ? task.notes : [];
        const n = notes.find(x => x.id === noteId);
        if (n) n.resolved = !!resolved;
        await taskCol.updateOne({ _id: new ObjectId(taskId) }, { $set: { notes, updatedAt: new Date().toISOString(), updatedBy: user.sub } });
        return cors({ success: true, notes });
      }

      if (action === 'bulkCreateTasks') {
        if (user.role !== 'admin') return cors('Admin only', 403);
        const { label, groupId, status, date, priority, budget, actualSpend, propertyAssignments } = body;
        if (!label || !propertyAssignments || !propertyAssignments.length) return cors('Missing fields', 400);
        const now = new Date().toISOString();
        const created = [];
        for (const pa of propertyAssignments) {
          const doc = {
            propertyId: pa.propertyId, label, groupId: groupId || 'misc',
            assignees: (pa.assignees || []).map(a => ({ userId: a.userId, userName: a.userName || '', userEmail: a.userEmail || '', assignedAt: now, assignedBy: user.sub, notificationSentAt: null })),
            responsibleUsers: (pa.responsibleUsers || []).map(r => ({ userId: r.userId, userName: r.userName || '', userEmail: r.userEmail || '' })),
            status: status || 'Not Started', date: date || now.slice(0, 10),
            completed: false, completedAt: null, completedBy: null,
            notes: [], sortOrder: 0, priority: priority || '',
            budget: budget || null, actualSpend: actualSpend || null, files: [],
            createdAt: now, createdBy: user.sub, updatedAt: now, updatedBy: user.sub,
          };
          const res = await taskCol.insertOne(doc);
          doc._id = res.insertedId;
          created.push(doc);
          try { await db.collection('taskHistory').insertOne({ taskId: doc._id.toString(), action: 'created', changes: { label, propertyId: pa.propertyId }, changedBy: user.sub, changedAt: now }); } catch (e) {}
          if (doc.assignees.length > 0) {
            let propName = propsMap[pa.propertyId] || '';
            const grp = GROUPS.find(g => g.id === doc.groupId);
            notifyNewAssignees(db, doc, doc.assignees.map(a => a.userId), propName, grp ? grp.name : '', user.sub).catch(() => {});
          }
        }
        return cors({ success: true, count: created.length });
      }

      if (action === 'taskBatch') {
        const { propertyId, tasks: items, assignees, date, groupId, templateId } = body;
        if (!propertyId || !items || !items.length) return cors('Missing fields', 400);
        if (!canAccessSync(user, propertyId, propsMap)) return cors('Forbidden', 403);
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
        if (!canAccessSync(user, task.propertyId, propsMap)) return cors('Forbidden', 403);
        const now = new Date().toISOString();
        await taskCol.updateOne({ _id: new ObjectId(id) }, { $set: {
          completed: !!completed, completedAt: completed ? now : null, completedBy: completed ? user.sub : null,
          status: completed ? 'Done' : 'Not Started', updatedAt: now, updatedBy: user.sub,
        }});
        try {
          await db.collection('taskHistory').insertOne({
            taskId: id,
            action: completed ? 'completed' : 'uncompleted',
            changes: { completed: { from: !completed, to: !!completed } },
            changedBy: user.sub,
            changedAt: new Date().toISOString()
          });
        } catch (histErr) { console.error('[TaskHistory] complete log error:', histErr); }
        const oldSt = task.status || 'Not Started';
        const newSt = completed ? 'Done' : 'Not Started';
        if (oldSt !== newSt) {
          try {
            const allProps = await db.collection('properties').find({}).toArray();
            const p = allProps.find(x => x._id.toString() === task.propertyId);
            const propName = p ? p.name : '';
            const grp = GROUPS.find(g => g.id === task.groupId);
            const updatedTask = { ...task, completed: !!completed, status: newSt, completedAt: completed ? now : null };
            notifyTaskUpdateViaWebhook(db, updatedTask, propName, grp ? grp.name : '', user.sub, oldSt, newSt, { status: { from: oldSt, to: newSt } }).catch(e => console.error('[Email] complete notify error:', e));
          } catch (notifyErr) { console.error('[Email] complete notify setup error:', notifyErr); }
        }
        return cors({ success: true });
      }

      if (action === 'reopenTask') {
        const { id } = body;
        if (!id) return cors('Missing id', 400);
        if (user.role !== 'admin') return cors('Admin only', 403);
        const task = await taskCol.findOne({ _id: new ObjectId(id) });
        if (!task) return cors('Not found', 404);

        const now = new Date().toISOString();
        await taskCol.updateOne({ _id: new ObjectId(id) }, { $set: { deleted: false, deletedAt: null, deletedBy: null, reopenedAt: now, reopenedBy: user.sub, updatedAt: now, updatedBy: user.sub } });
        try {
          await db.collection('taskHistory').insertOne({
            taskId: id, action: 'reopened', changes: { label: task.label }, changedBy: user.sub, changedAt: now
          });
        } catch (histErr) { console.error('[TaskHistory] reopen log error:', histErr); }
        return cors({ success: true });
      }

      if (action === 'updateStatus') {
        const { id, status } = body;
        if (!id || !status) return cors('Missing fields', 400);
        if (!STATUSES.includes(status)) return cors('Invalid status', 400);
        const task = await taskCol.findOne({ _id: new ObjectId(id) });
        if (!task) return cors('Not found', 404);
        if (!canAccessSync(user, task.propertyId, propsMap)) return cors('Forbidden', 403);
        const oldStatus = task.status;
        const now = new Date().toISOString();
        const upd = { status, updatedAt: now, updatedBy: user.sub };
        if (status === 'Done') { upd.completed = true; upd.completedAt = now; upd.completedBy = user.sub; }
        else { upd.completed = false; upd.completedAt = null; upd.completedBy = null; }
        await taskCol.updateOne({ _id: new ObjectId(id) }, { $set: upd });
        try {
          await db.collection('taskHistory').insertOne({
            taskId: id,
            action: 'status_changed',
            changes: { status: { from: oldStatus, to: status } },
            changedBy: user.sub,
            changedAt: new Date().toISOString()
          });
        } catch (histErr) { console.error('[TaskHistory] status log error:', histErr); }

        // Send status change email to all assignees & responsible users
        if (oldStatus !== status) {
          const updatedTask = await taskCol.findOne({ _id: new ObjectId(id) });
          let propName = '';
          try {
            const allProps = await db.collection('properties').find({}).toArray();
            const p = allProps.find(x => x._id.toString() === task.propertyId);
            if (p) propName = p.name;
          } catch (e) {}
          const grp = GROUPS.find(g => g.id === task.groupId);
          notifyTaskUpdateViaWebhook(db, updatedTask, propName, grp ? grp.name : '', user.sub, oldStatus, status, { status: { from: oldStatus, to: status } }).catch(e => console.error('[Email] status change notify error:', e));
        }

        return cors({ success: true });
      }

      // ─── File management ───
      if (action === 'addTaskFile') {
        const { taskId, fileName, fileUrl, fileSize, fileType } = body;
        if (!taskId || !fileName || !fileUrl) return cors('Missing fields', 400);
        const task = await taskCol.findOne({ _id: new ObjectId(taskId) });
        if (!task) return cors('Not found', 404);
        if (!canAccessSync(user, task.propertyId, propsMap)) return cors('Forbidden', 403);
        const fileDoc = {
          id: new ObjectId().toString(),
          fileName, fileUrl, fileSize: fileSize || 0, fileType: fileType || '',
          uploadedBy: user.sub,
          uploadedAt: new Date().toISOString()
        };
        await taskCol.updateOne({ _id: new ObjectId(taskId) }, { $push: { files: fileDoc }, $set: { updatedAt: new Date().toISOString(), updatedBy: user.sub } });
        try {
          await db.collection('taskHistory').insertOne({
            taskId,
            action: 'file_added',
            changes: { fileName },
            changedBy: user.sub,
            changedAt: new Date().toISOString()
          });
        } catch (histErr) { console.error('[TaskHistory] file_added log error:', histErr); }
        return cors(fileDoc, 201);
      }

      if (action === 'removeTaskFile') {
        const { taskId, fileId } = body;
        if (!taskId || !fileId) return cors('Missing fields', 400);
        const task = await taskCol.findOne({ _id: new ObjectId(taskId) });
        if (!task) return cors('Not found', 404);
        if (!canAccessSync(user, task.propertyId, propsMap)) return cors('Forbidden', 403);
        const file = (task.files || []).find(f => f.id === fileId);
        await taskCol.updateOne({ _id: new ObjectId(taskId) }, { $pull: { files: { id: fileId } }, $set: { updatedAt: new Date().toISOString(), updatedBy: user.sub } });
        try {
          await db.collection('taskHistory').insertOne({
            taskId,
            action: 'file_removed',
            changes: { fileName: file ? file.fileName : fileId },
            changedBy: user.sub,
            changedAt: new Date().toISOString()
          });
        } catch (histErr) { console.error('[TaskHistory] file_removed log error:', histErr); }
        return cors({ success: true });
      }

      // ─── Send reminder ───
      if (action === 'sendReminder') {
        const { taskId } = body;
        if (!taskId) return cors('Missing taskId', 400);
        const task = await taskCol.findOne({ _id: new ObjectId(taskId) });
        if (!task) return cors('Not found', 404);
        if (!canAccessSync(user, task.propertyId, propsMap)) return cors('Forbidden', 403);
        const allRecipientIds = [
          ...((task.assignees || []).map(a => a.userId)),
          ...((task.responsibleUsers || []).map(r => r.userId))
        ].filter((v, i, a) => a.indexOf(v) === i);

        if (allRecipientIds.length === 0) return cors({ success: false, error: 'No assignees or responsible users' });

        let propName = '';
        try {
          const allProps = await db.collection('properties').find({}).toArray();
          const p = allProps.find(x => x._id.toString() === task.propertyId);
          if (p) propName = p.name;
        } catch(e) {}

        const grp = GROUPS.find(g => g.id === task.groupId);

        let senderUser = null;
        try { senderUser = await db.collection('users').findOne({ username: user.sub }); } catch(e) {}
        if (!senderUser) try { senderUser = await staffCol.findOne({ username: user.sub }); } catch(e) {}

        // Pre-check: are email env vars configured?
        const webhookConfigured = !!(process.env.CMP_SCRIPT_URL && process.env.CMP_TASK_SECRET);
        if (!webhookConfigured) {
          return cors({
            success: false,
            sent: 0,
            failed: allRecipientIds.length,
            error: 'Email webhook is not configured (missing CMP_SCRIPT_URL or CMP_TASK_SECRET environment variables). Contact an administrator.',
            failureReasons: allRecipientIds.map(id => ({ userId: id, reason: 'missing_config' })),
          });
        }

        let sent = 0, failed = 0;
        const failureReasons = [];
        for (const userId of allRecipientIds) {
          try {
            const staffRecord = await staffCol.findOne({ _id: new ObjectId(userId) });
            if (!staffRecord) {
              failed++;
              failureReasons.push({ userId, reason: 'staff_not_found', detail: 'No staff record found for this user ID' });
              continue;
            }
            if (!staffRecord.email) {
              failed++;
              failureReasons.push({ userId, userName: staffRecord.employeeName, reason: 'missing_email', detail: `${staffRecord.employeeName} has no email address on file` });
              continue;
            }
            const result = await sendTaskAssignmentEmailWebhook({
              task: { ...task, _id: task._id },
              assignedUser: staffRecord,
              assignedByUser: senderUser,
              propertyName: propName,
              groupName: grp ? grp.name : '',
            });
            if (result.success) {
              sent++;
            } else {
              failed++;
              failureReasons.push({
                userId,
                userName: staffRecord.employeeName,
                reason: result.skipped ? result.reason : 'webhook_error',
                detail: result.error || result.reason || 'Email webhook returned failure',
              });
            }
          } catch(e) {
            failed++;
            failureReasons.push({ userId, reason: 'exception', detail: e.message });
          }
        }

        try {
          await db.collection('taskHistory').insertOne({
            taskId,
            action: 'reminder_sent',
            changes: { recipientCount: allRecipientIds.length, sent, failed, failureReasons },
            changedBy: user.sub,
            changedAt: new Date().toISOString()
          });
        } catch (histErr) { console.error('[TaskHistory] reminder log error:', histErr); }

        return cors({ success: sent > 0, sent, failed, failureReasons });
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
        if (!canAccessSync(user, task.propertyId, propsMap)) return cors('Forbidden', 403);
        const now = new Date().toISOString();
        await taskCol.updateOne({ _id: new ObjectId(body.id) }, { $set: { deleted: true, deletedAt: now, deletedBy: user.sub } });
        try {
          await db.collection('taskHistory').insertOne({
            taskId: body.id,
            action: 'deleted',
            changes: { label: task.label },
            changedBy: user.sub,
            changedAt: now
          });
        } catch (histErr) { console.error('[TaskHistory] delete log error:', histErr); }
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
