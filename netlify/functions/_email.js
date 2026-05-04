import { ObjectId } from './_db.js';

/**
 * CMP Marketing Hub — Google Apps Script Email Webhook Helper
 *
 * Replaces the previous Resend/SendGrid/SMTP email module.
 * All email notifications are now sent via a Google Apps Script Web App
 * deployed from the company's Google Workspace account.
 *
 * Backend-only environment variables:
 *   CMP_SCRIPT_URL  — The deployed Apps Script Web App URL
 *   CMP_TASK_SECRET — Shared secret for request validation
 *   APP_BASE_URL — Base URL of the app (default: https://cmpmarketinghub.netlify.app)
 */

const APP_BASE_URL = process.env.APP_BASE_URL || 'https://cmpmarketinghub.netlify.app';

// ─── Determine whether an assignment email should fire ───
export function shouldSendTaskAssignmentEmail(previousTask, newTask) {
  if (!newTask) return false;
  if (newTask.deleted || newTask.isDeleted || newTask.archived || newTask.isArchived) return false;
  if (newTask.isTemplate || newTask.template || newTask.isDraft) return false;

  // For multi-assignee model: compare assignee sets
  const newIds = (newTask.assignees || []).map(a => a.userId).filter(Boolean).sort();
  const oldIds = previousTask
    ? (previousTask.assignees || []).map(a => a.userId).filter(Boolean).sort()
    : [];

  if (newIds.length === 0) return false;

  // Find truly new assignees (added but not present before)
  const added = newIds.filter(id => !oldIds.includes(id));
  return added.length > 0;
}

// ─── Get only the newly-added assignee user IDs ───
export function getNewAssigneeIds(previousTask, newTask) {
  const newIds = (newTask.assignees || []).map(a => a.userId).filter(Boolean);
  const oldIds = previousTask
    ? (previousTask.assignees || []).map(a => a.userId).filter(Boolean)
    : [];
  return newIds.filter(id => !oldIds.includes(id));
}

// ─── Build a direct task URL ───
export function buildTaskUrl(task) {
  const taskId = task._id ? task._id.toString() : (task.id || '');
  if (!taskId) return APP_BASE_URL + '/leasing_staff_list.html';
  return `${APP_BASE_URL}/leasing_staff_list.html?taskId=${encodeURIComponent(taskId)}`;
}

// ─── Send the webhook to Google Apps Script ───
export async function sendTaskAssignmentEmailWebhook({ task, assignedUser, assignedByUser, propertyName, groupName }) {
  const webhookUrl = process.env.CMP_SCRIPT_URL;
  const secret = process.env.CMP_TASK_SECRET;

  if (!webhookUrl || !secret) {
    console.warn('[Email] Google Script email webhook is not configured. Skipping.');
    return { success: false, skipped: true, reason: 'missing_config' };
  }

  if (!assignedUser || !(assignedUser.email || assignedUser.workEmail)) {
    console.warn(`[Email] Task assignment email skipped — assigned user has no email.`);
    return { success: false, skipped: true, reason: 'missing_assignee_email' };
  }

  const payload = {
    secret,
    eventType: 'task_assigned',
    taskId: task._id ? task._id.toString() : (task.id || ''),
    taskTitle: task.label || task.title || task.name || 'Task',
    taskDescription: task.notes || task.description || '',
    propertyName: propertyName || task.propertyName || task.property || '',
    priority: task.priority || '',
    status: task.status || '',
    dueDate: task.date || task.dueDate || '',
    assignedToName: assignedUser.employeeName || assignedUser.name || assignedUser.fullName || assignedUser.displayName || '',
    assignedToEmail: assignedUser.email || assignedUser.workEmail || '',
    assignedByName: assignedByUser?.employeeName || assignedByUser?.name || assignedByUser?.fullName || assignedByUser?.displayName || '',
    assignedByEmail: assignedByUser?.email || assignedByUser?.workEmail || '',
    groupName: groupName || '',
    taskUrl: buildTaskUrl(task),
  };

  try {
    const bodyStr = JSON.stringify(payload);
    console.log('[Email] Sending webhook to:', webhookUrl.slice(0, 60) + '...');
    console.log('[Email] Payload assignedToEmail:', payload.assignedToEmail, 'eventType:', payload.eventType);

    // Google Apps Script: POST to /exec → 302 → GET response. Default redirect:'follow' is correct.
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: bodyStr,
    });

    const resultText = await response.text();
    console.log('[Email] Response status:', response.status, 'body preview:', resultText.slice(0, 200));

    if (!response.ok) {
      console.error('[Email] Google Script webhook failed:', response.status, resultText.slice(0, 200));
      if (resultText.trim().startsWith('<!DOCTYPE') || resultText.trim().startsWith('<html') || resultText.trim().startsWith('<HTML')) {
        return { success: false, error: 'Google Apps Script returned HTTP ' + response.status + '. The Web App URL may be wrong or the script is not deployed. Check CMP_SCRIPT_URL in Netlify environment variables.' };
      }
      return { success: false, error: 'Webhook HTTP ' + response.status + ': ' + resultText.slice(0, 200) };
    }

    // Even on 200, Google might return HTML if URL is wrong
    if (resultText.trim().startsWith('<!DOCTYPE') || resultText.trim().startsWith('<html') || resultText.trim().startsWith('<HTML')) {
      console.error('[Email] Google Script webhook returned HTML instead of JSON on 200. URL may be incorrect.');
      return { success: false, error: 'Google Apps Script Web App URL appears invalid — received HTML instead of JSON. Verify the deployed Web App URL in CMP_SCRIPT_URL.' };
    }

    let result;
    try { result = JSON.parse(resultText); } catch { result = { raw: resultText }; }

    if (result && result.success === false) {
      console.error('[Email] Google Script webhook returned failure:', result);
      return { success: false, error: result.error || 'Unknown Apps Script error' };
    }

    console.log('[Email] Task assignment email sent via Google Apps Script to', payload.assignedToEmail);
    return { success: true, result };

  } catch (error) {
    console.error('[Email] Google Script webhook error:', error);
    return { success: false, error: error.message };
  }
}

// ─── High-level: notify newly-added assignees via Google Apps Script ───
export async function notifyNewAssigneesViaWebhook(db, task, newAssigneeUserIds, propertyName, groupName, assignedByUsername) {
  if (!newAssigneeUserIds || !newAssigneeUserIds.length) return;

  const staffCol = db.collection('leasingStaff');
  const taskCol = db.collection('leasingBoardTasks');
  const now = new Date().toISOString();

  // Resolve the assigning user (the person who saved the task)
  let assignedByUser = null;
  if (assignedByUsername) {
    // Try to find them in the users collection first
    try {
      assignedByUser = await db.collection('users').findOne({ username: assignedByUsername });
    } catch (e) {}
    // Fallback: try staff collection
    if (!assignedByUser) {
      try {
        assignedByUser = await staffCol.findOne({ username: assignedByUsername });
      } catch (e) {}
    }
  }

  for (const userId of newAssigneeUserIds) {
    try {
      const staffRecord = await staffCol.findOne({ _id: new ObjectId(userId) });
      if (!staffRecord) continue;
      if (!staffRecord.email) {
        console.warn(`[Email] Skipping notification for staff ${staffRecord.employeeName} — no email.`);
        continue;
      }

      // Check duplicate: skip if we already notified this person for this task
      const taskDoc = await taskCol.findOne({ _id: task._id });
      if (taskDoc) {
        const assigneeRecord = (taskDoc.assignees || []).find(a => a.userId === userId);
        if (assigneeRecord && assigneeRecord.notificationSentAt) {
          console.log(`[Email] Already notified ${staffRecord.employeeName} for task ${task._id}. Skipping.`);
          continue;
        }
      }

      const result = await sendTaskAssignmentEmailWebhook({
        task,
        assignedUser: staffRecord,
        assignedByUser,
        propertyName,
        groupName,
      });

      // Mark notification sent on the assignee record
      if (result.success) {
        await taskCol.updateOne(
          { _id: task._id, 'assignees.userId': userId },
          { $set: { 'assignees.$.notificationSentAt': now } }
        );
      }

      // Log to notification collection
      try {
        await db.collection('notificationLog').insertOne({
          type: 'task_assigned',
          relatedTaskId: task._id ? task._id.toString() : null,
          relatedUserId: userId,
          provider: 'google_apps_script',
          status: result.success ? 'sent' : (result.skipped ? 'skipped' : 'failed'),
          reason: result.reason || null,
          errorMessage: result.error || null,
          sentAt: now,
        });
      } catch (logErr) {
        console.error('[Email] Failed to log notification:', logErr.message);
      }

    } catch (err) {
      console.error(`[Email] Error notifying userId ${userId}:`, err.message);
    }
  }
}

// ─── Send status change email via Google Apps Script webhook ───
export async function sendTaskStatusChangeEmailWebhook({ task, recipientUser, changedByUser, propertyName, groupName, oldStatus, newStatus, changes }) {
  const webhookUrl = process.env.CMP_SCRIPT_URL;
  const secret = process.env.CMP_TASK_SECRET;

  if (!webhookUrl || !secret) {
    console.warn('[Email] Google Script email webhook is not configured. Skipping status change email.');
    return { success: false, skipped: true, reason: 'missing_config' };
  }

  if (!recipientUser || !(recipientUser.email || recipientUser.workEmail)) {
    console.warn(`[Email] Status change email skipped — recipient has no email.`);
    return { success: false, skipped: true, reason: 'missing_recipient_email' };
  }

  const payload = {
    secret,
    eventType: 'task_status_change',
    taskId: task._id ? task._id.toString() : (task.id || ''),
    taskTitle: task.label || task.title || task.name || 'Task',
    taskDescription: task.notes || task.description || '',
    propertyName: propertyName || task.propertyName || task.property || '',
    priority: task.priority || '',
    oldStatus: oldStatus || '',
    newStatus: newStatus || task.status || '',
    dueDate: task.date || task.dueDate || '',
    assignedToName: recipientUser.employeeName || recipientUser.name || recipientUser.fullName || recipientUser.displayName || '',
    assignedToEmail: recipientUser.email || recipientUser.workEmail || '',
    changedByName: changedByUser?.employeeName || changedByUser?.name || changedByUser?.fullName || changedByUser?.displayName || changedByUser?.username || '',
    changedByEmail: changedByUser?.email || changedByUser?.workEmail || '',
    groupName: groupName || '',
    taskUrl: buildTaskUrl(task),
    changedFields: changes ? JSON.stringify(changes) : '',
  };

  try {
    const bodyStr = JSON.stringify(payload);
    console.log('[Email] Sending status change webhook to:', webhookUrl.slice(0, 60) + '...');
    console.log('[Email] Payload assignedToEmail:', payload.assignedToEmail, 'eventType:', payload.eventType);

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: bodyStr,
    });

    const resultText = await response.text();
    console.log('[Email] Status change response status:', response.status, 'body preview:', resultText.slice(0, 200));

    if (!response.ok) {
      console.error('[Email] Status change webhook failed:', response.status, resultText.slice(0, 200));
      return { success: false, error: 'Webhook HTTP ' + response.status + ': ' + resultText.slice(0, 200) };
    }

    if (resultText.trim().startsWith('<!DOCTYPE') || resultText.trim().startsWith('<html') || resultText.trim().startsWith('<HTML')) {
      console.error('[Email] Status change webhook returned HTML instead of JSON.');
      return { success: false, error: 'Google Apps Script Web App URL appears invalid — received HTML instead of JSON.' };
    }

    let result;
    try { result = JSON.parse(resultText); } catch { result = { raw: resultText }; }

    if (result && result.success === false) {
      console.error('[Email] Status change webhook returned failure:', result);
      return { success: false, error: result.error || 'Unknown Apps Script error' };
    }

    console.log('[Email] Status change email sent via Google Apps Script to', payload.assignedToEmail);
    return { success: true, result };

  } catch (error) {
    console.error('[Email] Status change webhook error:', error);
    return { success: false, error: error.message };
  }
}

// ─── High-level: notify all assignees & responsible users about a task update ───
export async function notifyTaskUpdateViaWebhook(db, task, propertyName, groupName, changedByUsername, oldStatus, newStatus, changes) {
  const allRecipientIds = [
    ...((task.assignees || []).map(a => a.userId)),
    ...((task.responsibleUsers || []).map(r => r.userId))
  ].filter((v, i, a) => v && a.indexOf(v) === i); // deduplicate

  if (!allRecipientIds.length) return;

  const staffCol = db.collection('leasingStaff');
  const now = new Date().toISOString();

  // Resolve the user who made the change
  let changedByUser = null;
  if (changedByUsername) {
    try { changedByUser = await db.collection('users').findOne({ username: changedByUsername }); } catch (e) {}
    if (!changedByUser) {
      try { changedByUser = await staffCol.findOne({ username: changedByUsername }); } catch (e) {}
    }
  }

  for (const userId of allRecipientIds) {
    try {
      const staffRecord = await staffCol.findOne({ _id: new ObjectId(userId) });
      if (!staffRecord) continue;
      if (!staffRecord.email) {
        console.warn(`[Email] Skipping status change notification for staff ${staffRecord.employeeName} — no email.`);
        continue;
      }

      const result = await sendTaskStatusChangeEmailWebhook({
        task,
        recipientUser: staffRecord,
        changedByUser,
        propertyName,
        groupName,
        oldStatus,
        newStatus,
        changes,
      });

      // Log to notification collection
      try {
        await db.collection('notificationLog').insertOne({
          type: 'task_status_change',
          relatedTaskId: task._id ? task._id.toString() : null,
          relatedUserId: userId,
          provider: 'google_apps_script',
          status: result.success ? 'sent' : (result.skipped ? 'skipped' : 'failed'),
          reason: result.reason || null,
          errorMessage: result.error || null,
          sentAt: now,
        });
      } catch (logErr) {
        console.error('[Email] Failed to log status change notification:', logErr.message);
      }

    } catch (err) {
      console.error(`[Email] Error notifying userId ${userId} about status change:`, err.message);
    }
  }
}

export { APP_BASE_URL };
