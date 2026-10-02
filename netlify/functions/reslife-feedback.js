import { verifyReqAuth } from './_auth.js';
import { getDb, ObjectId } from './_db.js';
import { json } from './_reslife.js';
import { sendGuestEmail } from './_guest.js';

/**
 * Reslife Hub — "Report an issue / Request a feature" widget (reslife-feedback.js on every Reslife page).
 *
 * POST { type:'bug'|'feature'|'question', title, description, page, pageTitle, userAgent, viewport, property, screenshot? }
 *      → saves to reslife_feedback and emails FEEDBACK_TO (default brian.strider@capstonemp.com)
 * GET  ?id=X&shot=1   → the screenshot image (site admin or the submitter)
 * GET                  → recent feedback list (site admin only)
 *
 * Email goes through the existing Google Apps Script webhook (eventType 'reslife_guest_notice', same handler as
 * guest notices). The screenshot is linked in the email and also sent as an `attachments` entry, which the
 * Apps Script can attach if it supports it.
 */
const TO = process.env.FEEDBACK_TO || 'brian.strider@capstonemp.com';
const BASE = process.env.APP_BASE_URL || 'https://cmpmarketinghub.netlify.app';
const MAX_SHOT = 1.4 * 1024 * 1024;
const TYPES = { bug: 'Error / Bug', feature: 'Feature Request', question: 'Question' };
const clip = (s, n) => String(s == null ? '' : s).trim().slice(0, n);
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export async function handler(event) {
  const user = verifyReqAuth(event);
  if (!user) return { statusCode: 401, body: 'Please sign in to send feedback.' };
  const db = await getDb();
  const col = db.collection('reslife_feedback');
  const q = event.queryStringParameters || {};

  try {
    if (event.httpMethod === 'GET') {
      if (q.id && q.shot) {
        const d = await col.findOne({ _id: new ObjectId(q.id) }, { projection: { screenshot: 1, submittedBy: 1 } });
        if (!d || !d.screenshot) return { statusCode: 404, body: 'No screenshot' };
        if (user.role !== 'admin' && d.submittedBy !== user.sub) return { statusCode: 403, body: 'Forbidden' };
        const m = d.screenshot.match(/^data:(image\/[a-z]+);base64,(.+)$/);
        if (!m) return { statusCode: 404, body: 'No screenshot' };
        return { statusCode: 200, headers: { 'Content-Type': m[1], 'Cache-Control': 'private, max-age=3600' }, body: m[2], isBase64Encoded: true };
      }
      if (user.role !== 'admin') return { statusCode: 403, body: 'Forbidden' };
      const list = await col.find({}, { projection: { screenshot: 0 } }).sort({ createdAt: -1 }).limit(200).toArray();
      return json(200, list.map(d => Object.assign(d, { id: d._id.toString() })));
    }

    if (event.httpMethod === 'POST') {
      const b = JSON.parse(event.body || '{}');
      const type = TYPES[b.type] ? b.type : 'bug';
      const title = clip(b.title, 140), description = clip(b.description, 5000);
      if (!title && !description) return { statusCode: 400, body: 'Please describe the issue or request.' };
      const shot = typeof b.screenshot === 'string' && /^data:image\/(png|jpeg|webp);base64,/.test(b.screenshot) && b.screenshot.length < MAX_SHOT ? b.screenshot : '';
      const u = await db.collection('users').findOne({ username: user.sub }, { projection: { fullName: 1, email: 1, role: 1 } }).catch(() => null);
      const now = new Date().toISOString();
      const doc = {
        type, title: title || description.slice(0, 80), description,
        page: clip(b.page, 500), pageTitle: clip(b.pageTitle, 200), property: clip(b.property, 120),
        userAgent: clip(b.userAgent, 400), viewport: clip(b.viewport, 40),
        submittedBy: user.sub, submitterName: (u && u.fullName) || user.sub, submitterEmail: (u && u.email) || '', role: user.role,
        screenshot: shot, status: 'new', createdAt: now,
      };
      const r = await col.insertOne(doc);
      const id = r.insertedId.toString();
      const shotUrl = shot ? `${BASE}/api/reslife-feedback?id=${id}&shot=1` : '';
      const row = (k, v) => v ? `<tr><td style="padding:6px 12px 6px 0;color:#64748b;font-size:13px;vertical-align:top;white-space:nowrap">${k}</td><td style="padding:6px 0;font-size:14px;color:#0f172a">${v}</td></tr>` : '';
      const html = `<div style="font-family:Arial,Helvetica,sans-serif;background:#f1f5f9;padding:20px">
        <div style="max-width:640px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0">
          <div style="background:${type === 'bug' ? '#b91c1c' : type === 'feature' ? '#1d4ed8' : '#0f766e'};color:#fff;padding:16px 22px"><div style="font-size:12px;letter-spacing:1.5px;text-transform:uppercase;opacity:.9">Reslife Hub · ${esc(TYPES[type])}</div><div style="font-size:20px;font-weight:bold;margin-top:4px">${esc(doc.title)}</div></div>
          <div style="padding:18px 22px">
            ${description ? `<div style="white-space:pre-wrap;font-size:14px;line-height:1.55;color:#1e293b;background:#f8fafc;border-radius:8px;padding:12px 14px;margin-bottom:14px">${esc(description)}</div>` : ''}
            <table role="presentation" style="border-collapse:collapse">
              ${row('From', `${esc(doc.submitterName)} (${esc(user.sub)})${doc.submitterEmail ? ` · <a href="mailto:${esc(doc.submitterEmail)}">${esc(doc.submitterEmail)}</a>` : ''}`)}
              ${row('Role', esc(user.role))}${row('Property', esc(doc.property))}
              ${row('Page', doc.page ? `<a href="${esc(doc.page)}">${esc(doc.pageTitle || doc.page)}</a>` : '')}
              ${row('Device', esc(doc.viewport + ' · ' + doc.userAgent))}
              ${row('Submitted', new Date(now).toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }))}
              ${row('Screenshot', shotUrl ? `<a href="${shotUrl}">View screenshot</a> (sign in to the Hub first)` : 'None')}
              ${row('Reference', id)}
            </table>
          </div></div></div>`;
      const attachments = shot ? [{ name: `screenshot-${id}.${shot.includes('image/png') ? 'png' : 'jpg'}`, mimeType: shot.slice(5, shot.indexOf(';')), base64: shot.slice(shot.indexOf(',') + 1) }] : [];
      const mail = await sendFeedbackEmail(db, { to: TO, subject: `[Reslife Hub ${TYPES[type]}] ${doc.title}`, html, attachments, replyTo: doc.submitterEmail });
      await col.updateOne({ _id: r.insertedId }, { $set: { emailStatus: mail.success ? 'sent' : (mail.skipped ? 'skipped' : 'failed'), emailError: mail.error || null } });
      return json(200, { ok: true, id, emailed: !!mail.success });
    }
    return { statusCode: 405, body: 'Method Not Allowed' };
  } catch (e) {
    return { statusCode: 500, body: e.message };
  }
}

async function sendFeedbackEmail(db, { to, subject, html, attachments, replyTo }) {
  const url = process.env.CMP_SCRIPT_URL, secret = process.env.CMP_TASK_SECRET;
  if (!url || !secret) return sendGuestEmail(db, { to: [to], subject, html }); // logs as skipped
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ secret, eventType: 'reslife_guest_notice', to, subject, html, attachments, replyTo }) });
    const text = await r.text();
    const ok = r.ok && !/^\s*</.test(text);
    try { await db.collection('notificationLog').insertOne({ type: 'reslife_feedback', to: [to], subject, provider: 'google_apps_script', status: ok ? 'sent' : 'failed', errorMessage: ok ? null : 'HTTP ' + r.status, sentAt: new Date().toISOString() }); } catch (e) {}
    return ok ? { success: true } : { success: false, error: 'HTTP ' + r.status };
  } catch (e) { return { success: false, error: e.message }; }
}
