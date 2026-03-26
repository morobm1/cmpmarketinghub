import { getDb, ObjectId } from './_db.js';
import { verifyReqAuth } from './_auth.js';

/**
 * Leasing Team Staff List API
 * 
 * Collections:
 *   leasingStaff      - staff members per property
 *   leasingTasks      - individual assigned tasks
 *   leasingTemplates  - reusable task templates
 *   leasingRoles      - role definitions
 *
 * GET actions:
 *   staff          - list staff for property
 *   tasks          - list tasks (by property, date, staffMemberId)
 *   myTasks        - get tasks for the current authenticated user (staff direct link)
 *   templates      - list templates (global + property-specific)
 *   roles          - list roles
 *   export         - export data for property
 *   progress       - completion progress for property/date
 *   staffByUser    - find staff record by username
 *
 * POST actions:
 *   staff          - create/update staff member
 *   task           - create/update single task
 *   taskBatch      - create multiple tasks at once (from template)
 *   template       - create/update template
 *   role           - create role
 *   seedTemplates  - seed default templates
 *   completeTask   - mark task complete (staff-facing)
 *
 * DELETE actions:
 *   staff          - deactivate staff
 *   task           - delete task
 *   template       - delete template
 */

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
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  };
}

const SYSTEM_TEMPLATES = [
  {
    name: 'Simple Daily Checklist Version',
    category: 'Opening Task',
    isGlobal: true,
    isSystem: true,
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
    category: 'Closing Task',
    isGlobal: true,
    isSystem: true,
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

// Auto-seed system templates if they don't exist
async function ensureSystemTemplates(db) {
  const col = db.collection('leasingTemplates');
  for (const tpl of SYSTEM_TEMPLATES) {
    const exists = await col.findOne({ name: tpl.name, isSystem: true });
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

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,Authorization' }, body: '' };
  }

  const user = verifyReqAuth(event);
  if (!user) return cors('Unauthorized', 401);

  const db = await getDb();
  const staffCol = db.collection('leasingStaff');
  const taskCol = db.collection('leasingTasks');
  const templateCol = db.collection('leasingTemplates');
  const roleCol = db.collection('leasingRoles');

  const qs = event.queryStringParameters || {};
  const action = qs.action || '';

  try {
    // ═══════════════════ GET ═══════════════════
    if (event.httpMethod === 'GET') {

      if (action === 'staff') {
        const propertyId = qs.propertyId;
        if (!propertyId) return cors('Missing propertyId', 400);
        if (!userCanAccessProperty(user, propertyId)) return cors('Forbidden', 403);
        const filter = { propertyId };
        if (qs.activeOnly !== 'false') filter.isActive = { $ne: false };
        const staff = await staffCol.find(filter).sort({ employeeName: 1 }).toArray();
        return cors(staff);
      }

      if (action === 'staffByUser') {
        const username = qs.username || user.sub;
        const staff = await staffCol.findOne({ username, isActive: { $ne: false } });
        return cors(staff || {});
      }

      if (action === 'tasks') {
        const propertyId = qs.propertyId;
        if (!propertyId) return cors('Missing propertyId', 400);
        if (!userCanAccessProperty(user, propertyId)) return cors('Forbidden', 403);
        const filter = { propertyId };
        if (qs.date) filter.shiftDate = qs.date;
        if (qs.staffMemberId) filter.staffMemberId = qs.staffMemberId;
        const tasks = await taskCol.find(filter).sort({ sortOrder: 1, category: 1, taskText: 1 }).toArray();
        return cors(tasks);
      }

      if (action === 'myTasks') {
        // Find staff record for current user
        const staffQuery = {};
        if (qs.staffId) {
          staffQuery._id = new ObjectId(qs.staffId);
        } else {
          staffQuery.username = user.sub;
        }
        staffQuery.isActive = { $ne: false };
        const staffRecord = await staffCol.findOne(staffQuery);
        if (!staffRecord) return cors({ staff: null, tasks: [] });
        const date = qs.date || new Date().toISOString().slice(0, 10);
        const myTasks = await taskCol.find({
          staffMemberId: staffRecord._id.toString(),
          shiftDate: date,
        }).sort({ sortOrder: 1, category: 1 }).toArray();
        return cors({ staff: staffRecord, tasks: myTasks, date });
      }

      if (action === 'templates') {
        // Auto-seed system templates on first access
        await ensureSystemTemplates(db);
        const filter = { $or: [{ isGlobal: true }, { isSystem: true }] };
        if (qs.propertyId) {
          filter.$or.push({ propertyId: qs.propertyId });
        }
        // Also include templates created by this user
        filter.$or.push({ createdBy: user.sub });
        const templates = await templateCol.find(filter).sort({ isSystem: -1, name: 1 }).toArray();
        return cors(templates);
      }

      if (action === 'roles') {
        const roles = await roleCol.find({}).sort({ roleName: 1 }).toArray();
        return cors(roles);
      }

      if (action === 'progress') {
        const propertyId = qs.propertyId;
        if (!propertyId) return cors('Missing propertyId', 400);
        if (!userCanAccessProperty(user, propertyId)) return cors('Forbidden', 403);
        const date = qs.date || new Date().toISOString().slice(0, 10);
        const allTasks = await taskCol.find({ propertyId, shiftDate: date }).toArray();
        // Group by staffMemberId
        const byStaff = {};
        allTasks.forEach(t => {
          if (!byStaff[t.staffMemberId]) byStaff[t.staffMemberId] = { total: 0, completed: 0, staffName: t.employeeName || '' };
          byStaff[t.staffMemberId].total++;
          if (t.isCompleted) byStaff[t.staffMemberId].completed++;
        });
        return cors({ date, propertyId, progress: byStaff, totalTasks: allTasks.length, completedTasks: allTasks.filter(t => t.isCompleted).length });
      }

      if (action === 'export') {
        const propertyId = qs.propertyId;
        if (!propertyId) return cors('Missing propertyId', 400);
        if (!userCanAccessProperty(user, propertyId)) return cors('Forbidden', 403);
        const staff = await staffCol.find({ propertyId, isActive: { $ne: false } }).sort({ employeeName: 1 }).toArray();
        const filter = { propertyId };
        if (qs.date) filter.shiftDate = qs.date;
        const tasks = await taskCol.find(filter).sort({ category: 1 }).toArray();
        return cors({ staff, tasks });
      }

      return cors('Unknown GET action: ' + action, 400);
    }

    // ═══════════════════ POST ═══════════════════
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');

      if (action === 'staff') {
        if (user.role !== 'admin') return cors('Forbidden', 403);
        const { id, propertyId, employeeName, role, isActive, username, email, title } = body;
        if (!propertyId || !employeeName) return cors('Missing required fields', 400);

        if (id) {
          const updates = { updatedAt: new Date().toISOString(), updatedBy: user.sub };
          if (employeeName !== undefined) updates.employeeName = employeeName;
          if (role !== undefined) updates.role = role;
          if (propertyId !== undefined) updates.propertyId = propertyId;
          if (isActive !== undefined) updates.isActive = isActive;
          if (username !== undefined) updates.username = username;
          if (email !== undefined) updates.email = email;
          if (title !== undefined) updates.title = title;
          await staffCol.updateOne({ _id: new ObjectId(id) }, { $set: updates });
          return cors({ success: true, id });
        } else {
          const doc = {
            propertyId,
            employeeName,
            role: role || '',
            username: username || '',
            email: email || '',
            title: title || '',
            isActive: isActive !== false,
            createdAt: new Date().toISOString(),
            createdBy: user.sub,
            updatedAt: new Date().toISOString(),
            updatedBy: user.sub,
          };
          const res = await staffCol.insertOne(doc);
          doc._id = res.insertedId;
          return cors(doc, 201);
        }
      }

      if (action === 'task') {
        const { id, propertyId, staffMemberId, employeeName, category, taskText, shiftDate, shiftType, isCompleted, notes, sortOrder } = body;
        if (!propertyId || !staffMemberId || !taskText || !category) return cors('Missing required fields', 400);
        if (!userCanAccessProperty(user, propertyId)) return cors('Forbidden', 403);

        if (id) {
          const updates = { updatedAt: new Date().toISOString(), updatedBy: user.sub };
          if (category !== undefined) updates.category = category;
          if (taskText !== undefined) updates.taskText = taskText;
          if (shiftDate !== undefined) updates.shiftDate = shiftDate;
          if (shiftType !== undefined) updates.shiftType = shiftType;
          if (isCompleted !== undefined) {
            updates.isCompleted = isCompleted;
            if (isCompleted) {
              updates.completedAt = new Date().toISOString();
              updates.completedBy = user.sub;
            } else {
              updates.completedAt = null;
              updates.completedBy = null;
            }
          }
          if (notes !== undefined) updates.notes = notes;
          if (staffMemberId !== undefined) updates.staffMemberId = staffMemberId;
          if (employeeName !== undefined) updates.employeeName = employeeName;
          if (sortOrder !== undefined) updates.sortOrder = sortOrder;
          await taskCol.updateOne({ _id: new ObjectId(id) }, { $set: updates });
          return cors({ success: true, id });
        } else {
          const doc = {
            propertyId,
            staffMemberId,
            employeeName: employeeName || '',
            category,
            taskText,
            shiftDate: shiftDate || new Date().toISOString().slice(0, 10),
            shiftType: shiftType || '',
            isCompleted: isCompleted || false,
            completedAt: null,
            completedBy: null,
            notes: notes || '',
            sortOrder: sortOrder || 0,
            createdAt: new Date().toISOString(),
            createdBy: user.sub,
            updatedAt: new Date().toISOString(),
            updatedBy: user.sub,
          };
          const res = await taskCol.insertOne(doc);
          doc._id = res.insertedId;
          return cors(doc, 201);
        }
      }

      // Batch create tasks from template
      if (action === 'taskBatch') {
        const { propertyId, staffMemberId, employeeName, shiftDate, tasks: taskItems } = body;
        if (!propertyId || !staffMemberId || !taskItems || !taskItems.length) return cors('Missing required fields', 400);
        if (!userCanAccessProperty(user, propertyId)) return cors('Forbidden', 403);
        const date = shiftDate || new Date().toISOString().slice(0, 10);
        const now = new Date().toISOString();
        const docs = taskItems.map((t, i) => ({
          propertyId,
          staffMemberId,
          employeeName: employeeName || '',
          category: t.category || 'Misc Task',
          taskText: t.taskText || t.label || t,
          shiftDate: date,
          shiftType: '',
          isCompleted: false,
          completedAt: null,
          completedBy: null,
          notes: t.notes || '',
          sortOrder: t.sortOrder || i,
          sourceTemplateId: t.sourceTemplateId || null,
          createdAt: now,
          createdBy: user.sub,
          updatedAt: now,
          updatedBy: user.sub,
        }));
        const res = await taskCol.insertMany(docs);
        return cors({ success: true, insertedCount: res.insertedCount });
      }

      // Complete/uncomplete a task (staff-facing)
      if (action === 'completeTask') {
        const { id, isCompleted } = body;
        if (!id) return cors('Missing id', 400);
        const task = await taskCol.findOne({ _id: new ObjectId(id) });
        if (!task) return cors('Not found', 404);
        if (!userCanAccessProperty(user, task.propertyId)) return cors('Forbidden', 403);
        const updates = {
          isCompleted: !!isCompleted,
          completedAt: isCompleted ? new Date().toISOString() : null,
          completedBy: isCompleted ? user.sub : null,
          updatedAt: new Date().toISOString(),
          updatedBy: user.sub,
        };
        await taskCol.updateOne({ _id: new ObjectId(id) }, { $set: updates });
        return cors({ success: true });
      }

      // Template CRUD
      if (action === 'template') {
        const { id, name, propertyId, isGlobal, category, tasks: tplTasks } = body;
        if (!name) return cors('Missing template name', 400);
        // Only admin can create global templates or templates for other properties
        if (isGlobal && user.role !== 'admin') return cors('Forbidden', 403);

        if (id) {
          const updates = { updatedAt: new Date().toISOString(), updatedBy: user.sub };
          if (name !== undefined) updates.name = name;
          if (propertyId !== undefined) updates.propertyId = propertyId;
          if (isGlobal !== undefined) updates.isGlobal = isGlobal;
          if (category !== undefined) updates.category = category;
          if (tplTasks !== undefined) updates.tasks = tplTasks;
          await templateCol.updateOne({ _id: new ObjectId(id) }, { $set: updates });
          return cors({ success: true, id });
        } else {
          const doc = {
            name,
            propertyId: propertyId || null,
            isGlobal: !!isGlobal,
            category: category || 'Misc Task',
            tasks: tplTasks || [],
            createdAt: new Date().toISOString(),
            createdBy: user.sub,
            updatedAt: new Date().toISOString(),
            updatedBy: user.sub,
          };
          const res = await templateCol.insertOne(doc);
          doc._id = res.insertedId;
          return cors(doc, 201);
        }
      }

      if (action === 'role') {
        if (user.role !== 'admin') return cors('Forbidden', 403);
        const { roleName } = body;
        if (!roleName) return cors('Missing roleName', 400);
        const existing = await roleCol.findOne({ roleName });
        if (existing) return cors(existing);
        const doc = { roleName, createdAt: new Date().toISOString(), createdBy: user.sub };
        const res = await roleCol.insertOne(doc);
        doc._id = res.insertedId;
        return cors(doc, 201);
      }

      // Seed system templates (manual trigger, also auto-seeds on template GET)
      if (action === 'seedTemplates') {
        if (user.role !== 'admin') return cors('Forbidden', 403);
        await ensureSystemTemplates(db);
        return cors({ success: true });
      }

      return cors('Unknown POST action: ' + action, 400);
    }

    // ═══════════════════ DELETE ═══════════════════
    if (event.httpMethod === 'DELETE') {
      const body = JSON.parse(event.body || '{}');

      if (action === 'staff') {
        if (user.role !== 'admin') return cors('Forbidden', 403);
        const { id } = body;
        if (!id) return cors('Missing id', 400);
        await staffCol.updateOne({ _id: new ObjectId(id) }, { $set: { isActive: false, updatedAt: new Date().toISOString(), updatedBy: user.sub } });
        return cors({ success: true });
      }

      if (action === 'task') {
        const { id } = body;
        if (!id) return cors('Missing id', 400);
        const task = await taskCol.findOne({ _id: new ObjectId(id) });
        if (!task) return cors('Not found', 404);
        if (!userCanAccessProperty(user, task.propertyId)) return cors('Forbidden', 403);
        await taskCol.deleteOne({ _id: new ObjectId(id) });
        return cors({ success: true });
      }

      if (action === 'template') {
        const { id } = body;
        if (!id) return cors('Missing id', 400);
        const tpl = await templateCol.findOne({ _id: new ObjectId(id) });
        if (!tpl) return cors('Not found', 404);
        if (tpl.isSystem) return cors('System templates cannot be deleted. Duplicate it to create your own version.', 403);
        if (tpl.isGlobal && user.role !== 'admin') return cors('Forbidden', 403);
        await templateCol.deleteOne({ _id: new ObjectId(id) });
        return cors({ success: true });
      }

      return cors('Unknown DELETE action: ' + action, 400);
    }

    return cors('Method not allowed', 405);
  } catch (e) {
    console.error('leasing-staff error:', e);
    return cors('Server error: ' + e.message, 500);
  }
}
