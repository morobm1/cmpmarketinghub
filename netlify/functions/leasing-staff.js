import { getDb, ObjectId } from './_db.js';
import { verifyReqAuth } from './_auth.js';

/**
 * Leasing Team Staff Board API
 *
 * Collections:
 *   leasingStaff      - staff members per property
 *   leasingBoardTasks - board task rows
 *   leasingTemplates  - reusable task templates
 *
 * GET actions:
 *   staff              - list staff for property
 *   tasks              - list board tasks (by property, date, group, staffId)
 *   myTasks            - tasks for current user / staffId
 *   templates          - list templates (auto-seeds system defaults)
 *   groups             - list default groups
 *
 * POST actions:
 *   staff              - create/update staff
 *   task               - create/update single board task
 *   taskBatch          - batch-create tasks (from template)
 *   template           - create/update template
 *   completeTask       - toggle task complete
 *   updateStatus       - update task status
 *
 * DELETE actions:
 *   staff, task, template
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
      'Open leasing office',
      'Turn on lights and music',
      'Clean and organize front desk',
      'Check Print With Me printer',
      'Turn on and walk model',
      'Check model cleanliness and temperature',
      'Walk tour path',
      'Walk amenities',
      'Straighten common areas',
      'Check restrooms',
      'Walk exterior entrance',
      'Review daily schedule',
      'Report issues to team',
    ],
  },
  {
    name: 'Simple Daily Closing Checklist',
    type: 'system',
    defaultGroupId: 'closing',
    propertyId: null,
    tasks: [
      'Clean and organize front desk',
      'Put away supplies and paperwork',
      'Walk and secure model',
      'Turn off model lights',
      'Walk amenity spaces',
      'Straighten common areas',
      'Pick up visible trash',
      'Check restrooms',
      'Walk office exterior',
      'Return keys and tour materials',
      'Turn off lights and music',
      'Lock and secure office',
    ],
  },
];

const STATUSES = ['Not Started', 'Working on It', 'Done', 'On Hold'];

async function ensureSystemTemplates(db) {
  const col = db.collection('leasingTemplates');
  for (const tpl of SYSTEM_TEMPLATES) {
    const exists = await col.findOne({ name: tpl.name, type: 'system' });
    if (!exists) {
      await col.insertOne({
        ...tpl,
        createdAt: new Date().toISOString(),
        createdBy: 'system',
        updatedAt: new Date().toISOString(),
        updatedBy: 'system',
      });
    }
  }
}

function userCanAccessProperty(user, propertyId) {
  if (user.role === 'admin') return true;
  if (user.properties === '*') return true;
  if (Array.isArray(user.properties)) return user.properties.includes(propertyId);
  if (typeof user.properties === 'string') return user.properties === propertyId;
  return false;
}

function cors(body, statusCode = 200) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  };
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

      if (action === 'groups') {
        return cors(GROUPS);
      }

      if (action === 'staff') {
        const pid = qs.propertyId;
        if (!pid) return cors('Missing propertyId', 400);
        if (!userCanAccessProperty(user, pid)) return cors('Forbidden', 403);
        const staff = await staffCol.find({ propertyId: pid, isActive: { $ne: false } }).sort({ employeeName: 1 }).toArray();
        return cors(staff);
      }

      if (action === 'tasks') {
        const pid = qs.propertyId;
        if (!pid) return cors('Missing propertyId', 400);
        if (!userCanAccessProperty(user, pid)) return cors('Forbidden', 403);
        const filter = { propertyId: pid };
        if (qs.date) filter.date = qs.date;
        if (qs.groupId) filter.groupId = qs.groupId;
        if (qs.assignedTo) filter.assignedToUserId = qs.assignedTo;
        const tasks = await taskCol.find(filter).sort({ groupId: 1, sortOrder: 1, label: 1 }).toArray();
        return cors(tasks);
      }

      if (action === 'myTasks') {
        // Find staff record
        let staffRecord = null;
        if (qs.staffId) {
          staffRecord = await staffCol.findOne({ _id: new ObjectId(qs.staffId), isActive: { $ne: false } });
        } else {
          staffRecord = await staffCol.findOne({ username: user.sub, isActive: { $ne: false } });
        }
        if (!staffRecord) return cors({ staff: null, tasks: [] });
        const date = qs.date || new Date().toISOString().slice(0, 10);
        const tasks = await taskCol.find({
          assignedToUserId: staffRecord._id.toString(),
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
        const templates = await templateCol.find(filter).sort({ type: 1, name: 1 }).toArray();
        return cors(templates);
      }

      return cors('Unknown GET action', 400);
    }

    // ═══ POST ═══
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');

      if (action === 'staff') {
        if (user.role !== 'admin') return cors('Forbidden', 403);
        const { id, propertyId, employeeName, role, username, email, isActive } = body;
        if (!propertyId || !employeeName) return cors('Missing fields', 400);
        const now = new Date().toISOString();
        if (id) {
          const upd = { updatedAt: now, updatedBy: user.sub };
          if (employeeName !== undefined) upd.employeeName = employeeName;
          if (role !== undefined) upd.role = role;
          if (propertyId !== undefined) upd.propertyId = propertyId;
          if (username !== undefined) upd.username = username;
          if (email !== undefined) upd.email = email;
          if (isActive !== undefined) upd.isActive = isActive;
          await staffCol.updateOne({ _id: new ObjectId(id) }, { $set: upd });
          return cors({ success: true, id });
        }
        const doc = { propertyId, employeeName, role: role || '', username: username || '', email: email || '', isActive: true, createdAt: now, createdBy: user.sub, updatedAt: now, updatedBy: user.sub };
        const res = await staffCol.insertOne(doc);
        doc._id = res.insertedId;
        return cors(doc, 201);
      }

      if (action === 'task') {
        const { id, propertyId, label, groupId, assignedToUserId, assignedToName, status, date, completed, notes, sortOrder } = body;
        if (!id && (!propertyId || !label)) return cors('Missing fields', 400);
        if (propertyId && !userCanAccessProperty(user, propertyId)) return cors('Forbidden', 403);
        const now = new Date().toISOString();
        if (id) {
          const upd = { updatedAt: now, updatedBy: user.sub };
          if (label !== undefined) upd.label = label;
          if (groupId !== undefined) upd.groupId = groupId;
          if (assignedToUserId !== undefined) upd.assignedToUserId = assignedToUserId;
          if (assignedToName !== undefined) upd.assignedToName = assignedToName;
          if (status !== undefined) upd.status = status;
          if (date !== undefined) upd.date = date;
          if (completed !== undefined) {
            upd.completed = completed;
            upd.completedAt = completed ? now : null;
            upd.completedBy = completed ? user.sub : null;
            if (completed) upd.status = 'Done';
          }
          if (notes !== undefined) upd.notes = notes;
          if (sortOrder !== undefined) upd.sortOrder = sortOrder;
          await taskCol.updateOne({ _id: new ObjectId(id) }, { $set: upd });
          return cors({ success: true });
        }
        const doc = {
          propertyId, label, groupId: groupId || 'misc',
          assignedToUserId: assignedToUserId || null,
          assignedToName: assignedToName || '',
          status: status || 'Not Started',
          date: date || new Date().toISOString().slice(0, 10),
          completed: false, completedAt: null, completedBy: null,
          notes: notes || '',
          sortOrder: sortOrder || 0,
          createdAt: now, createdBy: user.sub, updatedAt: now, updatedBy: user.sub,
        };
        const res = await taskCol.insertOne(doc);
        doc._id = res.insertedId;
        return cors(doc, 201);
      }

      if (action === 'taskBatch') {
        const { propertyId, tasks: items, assignedToUserId, assignedToName, date, groupId } = body;
        if (!propertyId || !items || !items.length) return cors('Missing fields', 400);
        if (!userCanAccessProperty(user, propertyId)) return cors('Forbidden', 403);
        const now = new Date().toISOString();
        const d = date || new Date().toISOString().slice(0, 10);
        const docs = items.map((t, i) => ({
          propertyId,
          label: typeof t === 'string' ? t : (t.label || t.taskText || ''),
          groupId: (typeof t === 'object' && t.groupId) ? t.groupId : (groupId || 'misc'),
          assignedToUserId: assignedToUserId || null,
          assignedToName: assignedToName || '',
          status: 'Not Started',
          date: d,
          completed: false, completedAt: null, completedBy: null,
          notes: '',
          sortOrder: i,
          createdFromTemplateId: body.templateId || null,
          createdAt: now, createdBy: user.sub, updatedAt: now, updatedBy: user.sub,
        }));
        const res = await taskCol.insertMany(docs);
        return cors({ success: true, count: res.insertedCount });
      }

      if (action === 'completeTask') {
        const { id, completed } = body;
        if (!id) return cors('Missing id', 400);
        const task = await taskCol.findOne({ _id: new ObjectId(id) });
        if (!task) return cors('Not found', 404);
        if (!userCanAccessProperty(user, task.propertyId)) return cors('Forbidden', 403);
        const now = new Date().toISOString();
        await taskCol.updateOne({ _id: new ObjectId(id) }, { $set: {
          completed: !!completed,
          completedAt: completed ? now : null,
          completedBy: completed ? user.sub : null,
          status: completed ? 'Done' : 'Not Started',
          updatedAt: now, updatedBy: user.sub,
        }});
        return cors({ success: true });
      }

      if (action === 'updateStatus') {
        const { id, status } = body;
        if (!id || !status) return cors('Missing fields', 400);
        if (!STATUSES.includes(status)) return cors('Invalid status', 400);
        const task = await taskCol.findOne({ _id: new ObjectId(id) });
        if (!task) return cors('Not found', 404);
        if (!userCanAccessProperty(user, task.propertyId)) return cors('Forbidden', 403);
        const now = new Date().toISOString();
        const upd = { status, updatedAt: now, updatedBy: user.sub };
        if (status === 'Done') { upd.completed = true; upd.completedAt = now; upd.completedBy = user.sub; }
        else { upd.completed = false; upd.completedAt = null; upd.completedBy = null; }
        await taskCol.updateOne({ _id: new ObjectId(id) }, { $set: upd });
        return cors({ success: true });
      }

      if (action === 'template') {
        const { id, name, type, defaultGroupId, propertyId, tasks: tplTasks } = body;
        if (!name) return cors('Missing name', 400);
        const now = new Date().toISOString();
        if (id) {
          const tpl = await templateCol.findOne({ _id: new ObjectId(id) });
          if (tpl && tpl.type === 'system') return cors('System templates are read-only. Duplicate to customize.', 403);
          const upd = { updatedAt: now, updatedBy: user.sub };
          if (name !== undefined) upd.name = name;
          if (defaultGroupId !== undefined) upd.defaultGroupId = defaultGroupId;
          if (propertyId !== undefined) upd.propertyId = propertyId;
          if (tplTasks !== undefined) upd.tasks = tplTasks;
          await templateCol.updateOne({ _id: new ObjectId(id) }, { $set: upd });
          return cors({ success: true });
        }
        const doc = { name, type: type || 'custom', defaultGroupId: defaultGroupId || 'misc', propertyId: propertyId || null, tasks: tplTasks || [], createdAt: now, createdBy: user.sub, updatedAt: now, updatedBy: user.sub };
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
        if (user.role !== 'admin') return cors('Forbidden', 403);
        await staffCol.updateOne({ _id: new ObjectId(body.id) }, { $set: { isActive: false, updatedAt: new Date().toISOString() } });
        return cors({ success: true });
      }

      if (action === 'task') {
        const task = await taskCol.findOne({ _id: new ObjectId(body.id) });
        if (!task) return cors('Not found', 404);
        if (!userCanAccessProperty(user, task.propertyId)) return cors('Forbidden', 403);
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
