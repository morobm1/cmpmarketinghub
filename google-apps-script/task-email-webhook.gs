/**
 * CMP Marketing Hub — Task Assignment Email Webhook
 * Google Apps Script (deploy as Web App)
 *
 * ═══════════════════════════════════════════════════════════════
 * SETUP INSTRUCTIONS
 * ═══════════════════════════════════════════════════════════════
 *
 * 1.  Open https://script.google.com
 * 2.  Create a new Apps Script project (name it e.g. "CMP Task Email Webhook").
 * 3.  Delete the default Code.gs content and paste this entire script.
 * 4.  Go to Project Settings (gear icon) > Script Properties.
 * 5.  Click "Add script property" and add:
 *       Property: CMP_TASK_SECRET
 *       Value:    <your private webhook secret — any strong random string>
 * 6.  Click Deploy > New deployment.
 * 7.  Select type: Web app.
 * 8.  Set "Execute as": Me (your Google Workspace account).
 * 9.  Set "Who has access": Anyone (or "Anyone within <your org>" for tighter security).
 * 10. Click Deploy, then copy the Web App URL.
 * 11. In your Netlify backend environment variables, add:
 *       CMP_SCRIPT_URL = <the Web App URL from step 10>
 *       CMP_TASK_SECRET = <the same secret from step 5>
 *
 * IMPORTANT:
 * - The email sender will be the Google Workspace account that deploys this script.
 * - The visible sender name will be "CMP Marketing Hub".
 * - Gmail/Google Workspace daily sending limits apply (~2,000/day for Workspace, ~100/day for free).
 * ═══════════════════════════════════════════════════════════════
 */

function doPost(e) {
  try {
    var raw = (e && e.postData && e.postData.contents) ? e.postData.contents : '{}';
    var data = JSON.parse(raw);

    var expectedSecret = PropertiesService.getScriptProperties().getProperty('CMP_TASK_SECRET');
    if (!expectedSecret || data.secret !== expectedSecret) {
      return jsonResponse({ success: false, error: 'Unauthorized' });
    }

    if (data.eventType !== 'task_assigned' && data.eventType !== 'task_overdue_reminder') {
      return jsonResponse({ success: false, error: 'Unsupported event type' });
    }

    // ── task_assigned ──
    if (data.eventType === 'task_assigned') {
      if (!isValidEmail(data.assignedToEmail)) {
        return jsonResponse({ success: false, error: 'Missing or invalid assignedToEmail' });
      }

      var taskTitle = data.taskTitle || 'Task';
      var subject = 'New Task Assigned: ' + taskTitle;

      var mailOptions = {
        to: data.assignedToEmail,
        subject: subject,
        body: buildPlainTextBody(data),
        htmlBody: buildTaskAssignedEmailHtml(data),
        name: 'CMP Marketing Hub'
      };

      if (isValidEmail(data.assignedByEmail)) {
        mailOptions.replyTo = data.assignedByEmail;
      }

      MailApp.sendEmail(mailOptions);

      return jsonResponse({
        success: true,
        message: 'Task assignment email sent to ' + data.assignedToEmail
      });
    }

    // ── task_overdue_reminder ──
    if (data.eventType === 'task_overdue_reminder') {
      if (!isValidEmail(data.assignedToEmail)) {
        return jsonResponse({ success: false, error: 'Missing or invalid assignedToEmail' });
      }

      var overdueSubject = 'Overdue Tasks Reminder: ' + (data.totalOverdue || 0) + ' task(s) need attention';

      var overdueMailOptions = {
        to: data.assignedToEmail,
        subject: overdueSubject,
        body: buildOverdueReminderPlainText(data),
        htmlBody: buildOverdueReminderHtml(data),
        name: 'CMP Marketing Hub'
      };

      MailApp.sendEmail(overdueMailOptions);

      return jsonResponse({
        success: true,
        message: 'Overdue reminder email sent to ' + data.assignedToEmail
      });
    }

  } catch (err) {
    return jsonResponse({
      success: false,
      error: err && err.message ? err.message : String(err)
    });
  }
}

// ═══════════════════════════════════════════════════════════════
// HTML EMAIL TEMPLATE
// ═══════════════════════════════════════════════════════════════

function buildTaskAssignedEmailHtml(data) {
  var brandColor = '#8B1E2D';
  var taskTitle = escapeHtml(data.taskTitle || 'Task');
  var assignedToName = escapeHtml(data.assignedToName || 'there');
  var assignedByName = escapeHtml(data.assignedByName || 'CMP Marketing Hub');
  var taskDescription = escapeHtml(data.taskDescription || '');
  var groupName = escapeHtml(data.groupName || '');
  var taskUrl = String(data.taskUrl || '').trim();

  var descriptionBlock = taskDescription
    ? '<p style="font-size:15px;line-height:22px;color:#333333;margin:18px 0 0;">' + taskDescription + '</p>'
    : '';

  var ctaBlock = taskUrl
    ? '<div style="text-align:center;margin-top:28px;">'
      + '<a href="' + escapeHtml(taskUrl) + '" style="display:inline-block;background:' + brandColor + ';color:#ffffff;text-decoration:none;padding:14px 24px;border-radius:8px;font-size:16px;font-weight:bold;">View Task</a>'
      + '</div>'
    : '';

  return ''
    + '<div style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;">'
    + '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f5f5f5;padding:24px 0;">'
    + '<tr><td align="center">'
    + '<table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:600px;max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e5e5;">'

    // Header banner
    + '<tr><td style="background:' + brandColor + ';color:#ffffff;padding:24px;text-align:center;">'
    + '<h1 style="margin:0;font-size:24px;line-height:30px;color:#ffffff;">New Task Assigned</h1>'
    + '<p style="margin:8px 0 0;font-size:14px;line-height:20px;color:#ffffff;">CMP Marketing Hub</p>'
    + '</td></tr>'

    // Body
    + '<tr><td style="padding:28px;">'
    + '<p style="font-size:16px;line-height:24px;color:#222222;margin:0 0 16px;">Hi ' + assignedToName + ',</p>'
    + '<p style="font-size:16px;line-height:24px;color:#222222;margin:0 0 24px;">You have been assigned a new task by <strong>' + assignedByName + '</strong>.</p>'

    // Task card
    + '<div style="background:#fafafa;border:1px solid #eeeeee;border-radius:10px;padding:18px;margin-bottom:22px;">'
    + '<h2 style="font-size:20px;line-height:26px;color:#222222;margin:0;">' + taskTitle + '</h2>'
    + descriptionBlock
    + '</div>'

    // Detail rows
    + '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;">'
    + taskRow('Property', data.propertyName)
    + taskRow('Category', groupName)
    + taskRow('Priority', data.priority)
    + taskRow('Status', data.status)
    + taskRow('Due Date', data.dueDate)
    + '</table>'

    + ctaBlock

    // Footer
    + '<p style="font-size:12px;line-height:18px;color:#777777;margin:28px 0 0;text-align:center;">This notification was sent from the CMP Marketing Hub.</p>'
    + '</td></tr>'

    + '</table>'
    + '</td></tr>'
    + '</table>'
    + '</div>';
}

// ═══════════════════════════════════════════════════════════════
// PLAIN TEXT FALLBACK
// ═══════════════════════════════════════════════════════════════

function buildPlainTextBody(data) {
  var lines = [
    'Hi ' + (data.assignedToName || 'there') + ',',
    '',
    'You have been assigned a new task by ' + (data.assignedByName || 'CMP Marketing Hub') + '.',
    '',
    'Task: ' + (data.taskTitle || 'Task')
  ];

  if (data.taskDescription) lines.push('Description: ' + data.taskDescription);
  if (data.propertyName) lines.push('Property: ' + data.propertyName);
  if (data.groupName) lines.push('Category: ' + data.groupName);
  if (data.priority) lines.push('Priority: ' + data.priority);
  if (data.status) lines.push('Status: ' + data.status);
  if (data.dueDate) lines.push('Due Date: ' + data.dueDate);
  if (data.taskUrl) {
    lines.push('');
    lines.push('View Task: ' + data.taskUrl);
  }

  lines.push('');
  lines.push('— CMP Marketing Hub');

  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function taskRow(label, value) {
  if (!value) return '';
  return ''
    + '<tr>'
    + '<td style="padding:12px;border-bottom:1px solid #eeeeee;font-size:14px;line-height:20px;color:#666666;width:140px;">'
    + escapeHtml(label)
    + '</td>'
    + '<td style="padding:12px;border-bottom:1px solid #eeeeee;font-size:14px;line-height:20px;color:#222222;font-weight:bold;">'
    + escapeHtml(value)
    + '</td>'
    + '</tr>';
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function isValidEmail(email) {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

// ═══════════════════════════════════════════════════════════════
// OVERDUE REMINDER HTML TEMPLATE
// ═══════════════════════════════════════════════════════════════

function buildOverdueReminderHtml(data) {
  var brandColor = '#8B1E2D';
  var name = escapeHtml(data.assignedToName || 'there');
  var total = data.totalOverdue || 0;
  var tasks = data.overdueTasks || [];
  var dashboardUrl = String(data.dashboardUrl || '').trim();

  var taskRows = '';
  for (var i = 0; i < tasks.length; i++) {
    var t = tasks[i];
    var prColor = t.priority === 'Critical' ? '#dc2626' : t.priority === 'High' ? '#ea580c' : t.priority === 'Medium' ? '#d97706' : '#64748b';
    taskRows += ''
      + '<tr>'
      + '<td style="padding:10px 12px;border-bottom:1px solid #eeeeee;font-size:13px;color:#222222;font-weight:600;">'
      + (t.taskUrl ? '<a href="' + escapeHtml(t.taskUrl) + '" style="color:#222222;text-decoration:none;">' + escapeHtml(t.title) + '</a>' : escapeHtml(t.title))
      + '</td>'
      + '<td style="padding:10px 12px;border-bottom:1px solid #eeeeee;font-size:12px;color:' + brandColor + ';font-weight:700;">' + escapeHtml(t.dueDate) + '</td>'
      + '<td style="padding:10px 12px;border-bottom:1px solid #eeeeee;font-size:12px;color:#475569;">' + escapeHtml(t.propertyName) + '</td>'
      + '<td style="padding:10px 12px;border-bottom:1px solid #eeeeee;font-size:11px;font-weight:700;color:' + prColor + ';">' + escapeHtml(t.priority || '—') + '</td>'
      + '</tr>';
  }

  var ctaBlock = dashboardUrl
    ? '<div style="text-align:center;margin-top:28px;">'
      + '<a href="' + escapeHtml(dashboardUrl) + '" style="display:inline-block;background:' + brandColor + ';color:#ffffff;text-decoration:none;padding:14px 24px;border-radius:8px;font-size:16px;font-weight:bold;">Open Task Board</a>'
      + '</div>'
    : '';

  return ''
    + '<div style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;">'
    + '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f5f5f5;padding:24px 0;">'
    + '<tr><td align="center">'
    + '<table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:600px;max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e5e5;">'
    + '<tr><td style="background:' + brandColor + ';color:#ffffff;padding:24px;text-align:center;">'
    + '<h1 style="margin:0;font-size:22px;line-height:28px;color:#ffffff;">⏰ Overdue Tasks Reminder</h1>'
    + '<p style="margin:8px 0 0;font-size:14px;line-height:20px;color:#ffffff;">CMP Marketing Hub</p>'
    + '</td></tr>'
    + '<tr><td style="padding:28px;">'
    + '<p style="font-size:16px;line-height:24px;color:#222222;margin:0 0 16px;">Hi ' + name + ',</p>'
    + '<p style="font-size:16px;line-height:24px;color:#222222;margin:0 0 24px;">You have <strong style="color:' + brandColor + ';">' + total + ' overdue task' + (total !== 1 ? 's' : '') + '</strong> that need your attention:</p>'
    + '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;border:1px solid #eeeeee;border-radius:10px;overflow:hidden;">'
    + '<tr style="background:#f8f8f8;">'
    + '<th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:800;color:#666666;border-bottom:2px solid #eeeeee;">Task</th>'
    + '<th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:800;color:#666666;border-bottom:2px solid #eeeeee;">Due Date</th>'
    + '<th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:800;color:#666666;border-bottom:2px solid #eeeeee;">Property</th>'
    + '<th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:800;color:#666666;border-bottom:2px solid #eeeeee;">Priority</th>'
    + '</tr>'
    + taskRows
    + '</table>'
    + ctaBlock
    + '<p style="font-size:12px;line-height:18px;color:#777777;margin:28px 0 0;text-align:center;">This weekly reminder was sent from the CMP Marketing Hub.</p>'
    + '</td></tr>'
    + '</table>'
    + '</td></tr>'
    + '</table>'
    + '</div>';
}

// ═══════════════════════════════════════════════════════════════
// OVERDUE REMINDER PLAIN TEXT FALLBACK
// ═══════════════════════════════════════════════════════════════

function buildOverdueReminderPlainText(data) {
  var lines = [
    'Hi ' + (data.assignedToName || 'there') + ',',
    '',
    'You have ' + (data.totalOverdue || 0) + ' overdue task(s) that need your attention:',
    ''
  ];

  var tasks = data.overdueTasks || [];
  for (var i = 0; i < tasks.length; i++) {
    var t = tasks[i];
    lines.push((i + 1) + '. ' + (t.title || 'Task') + ' (Due: ' + (t.dueDate || '?') + ')' + (t.propertyName ? ' — ' + t.propertyName : ''));
  }

  if (data.dashboardUrl) {
    lines.push('');
    lines.push('Open Task Board: ' + data.dashboardUrl);
  }

  lines.push('');
  lines.push('— CMP Marketing Hub');

  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════
// TEST FUNCTION (run manually in Apps Script editor)
// ═══════════════════════════════════════════════════════════════

function testTaskAssignedEmail() {
  var testData = {
    secret: PropertiesService.getScriptProperties().getProperty('CMP_TASK_SECRET'),
    eventType: 'task_assigned',
    taskId: 'TEST-123',
    taskTitle: 'Follow up with new leasing leads',
    taskDescription: 'Please review the hot lead tracker and follow up with any prospects marked as contacted needed.',
    propertyName: 'Ivory University House',
    groupName: 'Lead Follow Up',
    priority: 'High',
    status: 'Not Started',
    dueDate: 'Tomorrow',
    assignedToName: 'Test User',
    assignedToEmail: 'test@example.com',  // ← Change to a real email for testing
    assignedByName: 'Brian',
    assignedByEmail: 'brian@example.com',  // ← Change to a real email for testing
    taskUrl: 'https://cmpmarketinghub.netlify.app/leasing_staff_list.html'
  };

  var mailOptions = {
    to: testData.assignedToEmail,
    subject: 'New Task Assigned: ' + testData.taskTitle,
    body: buildPlainTextBody(testData),
    htmlBody: buildTaskAssignedEmailHtml(testData),
    name: 'CMP Marketing Hub'
  };

  if (isValidEmail(testData.assignedByEmail)) {
    mailOptions.replyTo = testData.assignedByEmail;
  }

  MailApp.sendEmail(mailOptions);
  Logger.log('Test email sent to ' + testData.assignedToEmail);
}
