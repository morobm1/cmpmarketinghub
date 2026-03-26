/**
 * Reusable Email Module for Marketing Hub
 * 
 * Supports: Resend (primary), SendGrid, SMTP fallback
 * Configure via environment variables:
 *   EMAIL_PROVIDER=resend|sendgrid|smtp  (default: resend)
 *   EMAIL_FROM=noreply@yourdomain.com
 *   RESEND_API_KEY=re_...
 *   SENDGRID_API_KEY=SG....
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
 *   APP_BASE_URL=https://cmpmarketinghub.netlify.app
 */

const EMAIL_PROVIDER = process.env.EMAIL_PROVIDER || 'resend';
const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@cmpmarketinghub.netlify.app';
const APP_BASE_URL = process.env.APP_BASE_URL || 'https://cmpmarketinghub.netlify.app';

// ─── Provider: Resend ───
async function sendViaResend(to, subject, html) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY not configured');
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ from: EMAIL_FROM, to: Array.isArray(to) ? to : [to], subject, html }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error('Resend error: ' + err);
  }
  return await res.json();
}

// ─── Provider: SendGrid ───
async function sendViaSendGrid(to, subject, html) {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) throw new Error('SENDGRID_API_KEY not configured');
  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      personalizations: [{ to: (Array.isArray(to) ? to : [to]).map(e => ({ email: e })) }],
      from: { email: EMAIL_FROM },
      subject,
      content: [{ type: 'text/html', value: html }],
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error('SendGrid error: ' + err);
  }
  return { provider: 'sendgrid', status: 'sent' };
}

// ─── Provider: SMTP (basic via nodemailer-like fetch) ───
// Note: True SMTP requires nodemailer. This is a placeholder that logs a warning.
async function sendViaSMTP(to, subject, html) {
  console.warn('[Email] SMTP provider selected but native SMTP requires nodemailer. Logging email instead.');
  console.log(`[Email][SMTP-LOG] To: ${to}, Subject: ${subject}`);
  return { provider: 'smtp', status: 'logged_only', note: 'Add nodemailer for real SMTP' };
}

// ─── Main Send Function ───
export async function sendEmail({ to, subject, html }) {
  if (!to || !subject) {
    console.warn('[Email] Missing to or subject, skipping');
    return { success: false, error: 'Missing to or subject' };
  }

  try {
    let result;
    switch (EMAIL_PROVIDER) {
      case 'sendgrid':
        result = await sendViaSendGrid(to, subject, html);
        break;
      case 'smtp':
        result = await sendViaSMTP(to, subject, html);
        break;
      case 'resend':
      default:
        result = await sendViaResend(to, subject, html);
        break;
    }
    console.log(`[Email] Sent via ${EMAIL_PROVIDER} to ${to}: ${subject}`);
    return { success: true, provider: EMAIL_PROVIDER, result };
  } catch (e) {
    console.error(`[Email] Failed via ${EMAIL_PROVIDER}:`, e.message);
    return { success: false, provider: EMAIL_PROVIDER, error: e.message };
  }
}

// ─── Notification Log Helper ───
export async function logNotification(db, { type, taskId, userId, provider, status, error }) {
  try {
    await db.collection('notificationLog').insertOne({
      type: type || 'task_assigned',
      relatedTaskId: taskId || null,
      relatedUserId: userId || null,
      provider: provider || EMAIL_PROVIDER,
      status: status || 'sent',
      errorMessage: error || null,
      sentAt: new Date().toISOString(),
    });
  } catch (e) {
    console.error('[Email] Failed to log notification:', e.message);
  }
}

// ─── Email Templates ───

export function taskAssignedEmailHTML({ staffName, propertyName, taskTitle, groupName, dueDate, status, notes, myTasksUrl }) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden">
  <tr><td style="background:#446472;padding:24px 32px">
    <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700">New Task Assigned</h1>
    <p style="margin:4px 0 0;color:rgba(255,255,255,.8);font-size:13px">${esc(propertyName)}</p>
  </td></tr>
  <tr><td style="padding:32px">
    <p style="margin:0 0 20px;font-size:15px;color:#1e293b">Hello <strong>${esc(staffName)}</strong>,</p>
    <p style="margin:0 0 20px;font-size:14px;color:#475569">A new task has been assigned to you:</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:24px">
      <tr><td style="padding:12px 16px;background:#f8fafc;font-size:12px;font-weight:700;color:#64748b;border-bottom:1px solid #e2e8f0;width:120px">Task</td>
          <td style="padding:12px 16px;font-size:14px;color:#1e293b;border-bottom:1px solid #e2e8f0;font-weight:600">${esc(taskTitle)}</td></tr>
      <tr><td style="padding:12px 16px;background:#f8fafc;font-size:12px;font-weight:700;color:#64748b;border-bottom:1px solid #e2e8f0">Category</td>
          <td style="padding:12px 16px;font-size:14px;color:#1e293b;border-bottom:1px solid #e2e8f0">${esc(groupName || '—')}</td></tr>
      <tr><td style="padding:12px 16px;background:#f8fafc;font-size:12px;font-weight:700;color:#64748b;border-bottom:1px solid #e2e8f0">Due Date</td>
          <td style="padding:12px 16px;font-size:14px;color:#1e293b;border-bottom:1px solid #e2e8f0">${dueDate ? esc(dueDate) : 'Not set'}</td></tr>
      <tr><td style="padding:12px 16px;background:#f8fafc;font-size:12px;font-weight:700;color:#64748b;border-bottom:1px solid #e2e8f0">Status</td>
          <td style="padding:12px 16px;font-size:14px;color:#1e293b;border-bottom:1px solid #e2e8f0">${esc(status || 'Not Started')}</td></tr>
      ${notes ? `<tr><td style="padding:12px 16px;background:#f8fafc;font-size:12px;font-weight:700;color:#64748b">Notes</td>
          <td style="padding:12px 16px;font-size:14px;color:#1e293b">${esc(notes)}</td></tr>` : ''}
    </table>
    <p style="margin:0 0 24px;font-size:14px;color:#475569">Please log in to review and update your task.</p>
    <a href="${esc(myTasksUrl)}" style="display:inline-block;padding:12px 28px;background:#446472;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600">Open My Tasks</a>
  </td></tr>
  <tr><td style="padding:20px 32px;background:#f8fafc;border-top:1px solid #e2e8f0">
    <p style="margin:0;font-size:11px;color:#94a3b8;text-align:center">Capstone Management Partners &middot; Marketing Hub</p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

function esc(t) {
  if (!t) return '';
  return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ─── High-level: Send Task Assigned Notification ───
export async function sendTaskAssignedNotification(db, { staffRecord, task, propertyName, groupName }) {
  if (!staffRecord || !staffRecord.email) {
    console.warn(`[Email] No email for staff ${staffRecord?.employeeName}, skipping notification`);
    return { success: false, error: 'No email address' };
  }

  const myTasksUrl = `${APP_BASE_URL}/my_tasks.html?staff=${staffRecord._id}`;
  const html = taskAssignedEmailHTML({
    staffName: staffRecord.employeeName,
    propertyName: propertyName || 'Your Property',
    taskTitle: task.label || task.title || 'New Task',
    groupName,
    dueDate: task.date || task.dueDate,
    status: task.status || 'Not Started',
    notes: task.notes || task.description || '',
    myTasksUrl,
  });

  const result = await sendEmail({
    to: staffRecord.email,
    subject: `New Task Assigned: ${task.label || task.title || 'Task'}`,
    html,
  });

  await logNotification(db, {
    type: 'task_assigned',
    taskId: task._id ? task._id.toString() : null,
    userId: staffRecord._id ? staffRecord._id.toString() : null,
    provider: result.provider,
    status: result.success ? 'sent' : 'failed',
    error: result.error || null,
  });

  return result;
}

export { APP_BASE_URL };
