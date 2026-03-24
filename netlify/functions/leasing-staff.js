import { getDb, ObjectId } from './_db.js';
import { verifyReqAuth } from './_auth.js';

/**
 * Leasing Team Staff List API
 * Collections: leasingStaff, leasingTasks
 * 
 * Routes (via query param ?action=):
 *   GET  ?action=staff&propertyId=...           - list staff for property
 *   GET  ?action=tasks&propertyId=...&date=...  - list tasks for property/date
 *   GET  ?action=roles                          - list all roles
 *   POST ?action=staff                          - create/update staff member
 *   POST ?action=task                           - create/update task
 *   POST ?action=role                           - create a role
 *   DELETE ?action=staff&id=...                 - deactivate staff
 *   DELETE ?action=task&id=...                  - delete task
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

export async function handler(event) {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,Authorization' }, body: '' };
  }

  const user = verifyReqAuth(event);
  if (!user) return cors('Unauthorized', 401);

  const db = await getDb();
  const staffCol = db.collection('leasingStaff');
  const taskCol = db.collection('leasingTasks');
  const roleCol = db.collection('leasingRoles');

  const qs = event.queryStringParameters || {};
  const action = qs.action || '';

  try {
    // ─── GET ───
    if (event.httpMethod === 'GET') {

      // List staff for a property
      if (action === 'staff') {
        const propertyId = qs.propertyId;
        if (!propertyId) return cors('Missing propertyId', 400);
        if (!userCanAccessProperty(user, propertyId)) return cors('Forbidden', 403);
        const staff = await staffCol.find({ propertyId, isActive: { $ne: false } }).sort({ employeeName: 1 }).toArray();
        return cors(staff);
      }

      // List tasks for a property (optionally filtered by date)
      if (action === 'tasks') {
        const propertyId = qs.propertyId;
        if (!propertyId) return cors('Missing propertyId', 400);
        if (!userCanAccessProperty(user, propertyId)) return cors('Forbidden', 403);
        const filter = { propertyId };
        if (qs.date) filter.shiftDate = qs.date;
        if (qs.staffMemberId) filter.staffMemberId = qs.staffMemberId;
        const tasks = await taskCol.find(filter).sort({ category: 1, taskText: 1 }).toArray();
        return cors(tasks);
      }

      // List roles
      if (action === 'roles') {
        const roles = await roleCol.find({}).sort({ roleName: 1 }).toArray();
        return cors(roles);
      }

      // Export data for a property
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

      return cors('Unknown action', 400);
    }

    // ─── POST ───
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');

      // Create/update staff member (admin only)
      if (action === 'staff') {
        if (user.role !== 'admin') return cors('Forbidden', 403);
        const { id, propertyId, employeeName, role, isActive } = body;
        if (!propertyId || !employeeName) return cors('Missing required fields', 400);

        if (id) {
          // Update
          const updates = { updatedAt: new Date().toISOString(), updatedBy: user.sub };
          if (employeeName !== undefined) updates.employeeName = employeeName;
          if (role !== undefined) updates.role = role;
          if (propertyId !== undefined) updates.propertyId = propertyId;
          if (isActive !== undefined) updates.isActive = isActive;
          await staffCol.updateOne({ _id: new ObjectId(id) }, { $set: updates });
          return cors({ success: true, id });
        } else {
          // Create
          const doc = {
            propertyId,
            employeeName,
            role: role || '',
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

      // Create/update task
      if (action === 'task') {
        const { id, propertyId, staffMemberId, employeeName, category, taskText, shiftDate, shiftType, isCompleted, notes } = body;
        if (!propertyId || !staffMemberId || !taskText || !category) return cors('Missing required fields', 400);
        if (!userCanAccessProperty(user, propertyId)) return cors('Forbidden', 403);

        if (id) {
          const updates = { updatedAt: new Date().toISOString(), updatedBy: user.sub };
          if (category !== undefined) updates.category = category;
          if (taskText !== undefined) updates.taskText = taskText;
          if (shiftDate !== undefined) updates.shiftDate = shiftDate;
          if (shiftType !== undefined) updates.shiftType = shiftType;
          if (isCompleted !== undefined) updates.isCompleted = isCompleted;
          if (notes !== undefined) updates.notes = notes;
          if (staffMemberId !== undefined) updates.staffMemberId = staffMemberId;
          if (employeeName !== undefined) updates.employeeName = employeeName;
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
            notes: notes || '',
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

      // Create role (admin only)
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

      return cors('Unknown action', 400);
    }

    // ─── DELETE ───
    if (event.httpMethod === 'DELETE') {
      const body = JSON.parse(event.body || '{}');

      if (action === 'staff') {
        if (user.role !== 'admin') return cors('Forbidden', 403);
        const { id } = body;
        if (!id) return cors('Missing id', 400);
        // Soft-delete (deactivate)
        await staffCol.updateOne({ _id: new ObjectId(id) }, { $set: { isActive: false, updatedAt: new Date().toISOString(), updatedBy: user.sub } });
        return cors({ success: true });
      }

      if (action === 'task') {
        const { id } = body;
        if (!id) return cors('Missing id', 400);
        // Verify ownership
        const task = await taskCol.findOne({ _id: new ObjectId(id) });
        if (!task) return cors('Not found', 404);
        if (!userCanAccessProperty(user, task.propertyId)) return cors('Forbidden', 403);
        await taskCol.deleteOne({ _id: new ObjectId(id) });
        return cors({ success: true });
      }

      return cors('Unknown action', 400);
    }

    return cors('Method not allowed', 405);
  } catch (e) {
    console.error('leasing-staff error:', e);
    return cors('Server error: ' + e.message, 500);
  }
}
