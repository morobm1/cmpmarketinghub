import { getDb, ObjectId } from './_db.js';

const CMP_SCRIPT_URL = process.env.CMP_SCRIPT_URL;
const CMP_TASK_SECRET = process.env.CMP_TASK_SECRET;
const APP_BASE_URL = process.env.APP_BASE_URL || 'https://cmpmarketinghub.netlify.app';

export const config = {
  schedule: "0 13 * * 1"  // Every Monday at 13:00 UTC (9 AM ET)
};

export async function handler(event) {
  console.log('[Reminders] Weekly overdue task reminder started');
  
  if (!CMP_SCRIPT_URL || !CMP_TASK_SECRET) {
    console.warn('[Reminders] Google Script webhook not configured. Skipping.');
    return { statusCode: 200, body: JSON.stringify({ skipped: true, reason: 'missing_config' }) };
  }

  try {
    const db = await getDb();
    const taskCol = db.collection('leasingBoardTasks');
    const staffCol = db.collection('leasingStaff');
    const today = new Date().toISOString().slice(0, 10);

    // Find all overdue, incomplete tasks
    const overdueTasks = await taskCol.find({
      date: { $lt: today },
      completed: { $ne: true },
    }).toArray();

    if (!overdueTasks.length) {
      console.log('[Reminders] No overdue tasks found.');
      return { statusCode: 200, body: JSON.stringify({ success: true, overdueTasks: 0 }) };
    }

    console.log(`[Reminders] Found ${overdueTasks.length} overdue tasks`);

    // Group tasks by person (assignees + responsible users)
    const personTasks = {}; // userId -> { staffId, tasks: [] }
    
    for (const task of overdueTasks) {
      const allPeople = [
        ...((task.assignees || []).map(a => a.userId)),
        ...((task.responsibleUsers || []).map(r => r.userId))
      ].filter((v, i, a) => a.indexOf(v) === i); // dedupe
      
      for (const userId of allPeople) {
        if (!personTasks[userId]) personTasks[userId] = { tasks: [] };
        personTasks[userId].tasks.push(task);
      }
    }

    // Resolve property names (cache)
    let propsMap = {};
    try {
      const props = await db.collection('properties').find({}).toArray();
      for (const p of props) propsMap[p._id.toString()] = p.name;
    } catch(e) {}

    let sent = 0, failed = 0;

    for (const [userId, data] of Object.entries(personTasks)) {
      try {
        const staffRecord = await staffCol.findOne({ _id: new ObjectId(userId) });
        if (!staffRecord || !staffRecord.email) { failed++; continue; }

        // Build task summary for this person
        const taskSummaries = data.tasks.map(t => ({
          title: t.label || 'Task',
          dueDate: t.date || '',
          status: t.status || '',
          priority: t.priority || '',
          propertyName: propsMap[t.propertyId] || '',
          taskUrl: `${APP_BASE_URL}/leasing_staff_list.html?taskId=${encodeURIComponent(t._id.toString())}`,
        }));

        const payload = {
          secret: CMP_TASK_SECRET,
          eventType: 'task_overdue_reminder',
          assignedToName: staffRecord.employeeName || '',
          assignedToEmail: staffRecord.email,
          overdueTasks: taskSummaries,
          totalOverdue: taskSummaries.length,
          dashboardUrl: APP_BASE_URL + '/leasing_staff_list.html',
        };

        const response = await fetch(CMP_SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success) { sent++; } else { failed++; console.error('[Reminders] Webhook failure:', result.error); }
        } else {
          failed++;
          console.error('[Reminders] Webhook HTTP error:', response.status);
        }
      } catch (err) {
        failed++;
        console.error(`[Reminders] Error for userId ${userId}:`, err.message);
      }
    }

    // Log
    try {
      await db.collection('notificationLog').insertOne({
        type: 'weekly_overdue_reminder',
        totalOverdueTasks: overdueTasks.length,
        totalRecipients: Object.keys(personTasks).length,
        sent,
        failed,
        sentAt: new Date().toISOString(),
      });
    } catch(e) {}

    console.log(`[Reminders] Done. Sent: ${sent}, Failed: ${failed}`);
    return { statusCode: 200, body: JSON.stringify({ success: true, overdueTasks: overdueTasks.length, sent, failed }) };

  } catch (err) {
    console.error('[Reminders] Fatal error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}
