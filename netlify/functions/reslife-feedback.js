import { verifyReqAuth } from './_auth.js';
import { getDb, ObjectId } from './_db.js';
import { json } from './_reslife.js';

/**
 * Reslife Hub — Feedback ticket log ("Report an issue / Request a feature" widget, reslife-feedback.js).
 * Submissions are stored as tickets in reslife_feedback and reviewed in the Hub's Feedback tab (no email).
 *
 * POST   { type, title, description, page, pageTitle, userAgent, viewport, property, screenshot? }  any signed-in user
 * GET    ?id=X&shot=1   screenshot image (admin tier or the submitter)
 * GET                    ticket list (admin tier: site admin / reslife-admin)
 * PUT    { id, status?, priority?, note? }                                                        admin tier
 * DELETE ?id=X                                                                                    admin tier
 */
const MAX_SHOT = 1.4 * 1024 * 1024;
const TYPES = { bug: 'Error / Bug', feature: 'Feature Request', question: 'Question' };
const STATUSES = ['new', 'reviewing', 'planned', 'in_progress', 'resolved', 'wont_fix'];
const PRIORITIES = ['low', 'medium', 'high', 'critical'];
const clip = (s, n) => String(s == null ? '' : s).trim().slice(0, n);
const isAdminTier = u => u.role === 'admin' || u.role === 'reslife-admin';

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
        if (!isAdminTier(user) && d.submittedBy !== user.sub) return { statusCode: 403, body: 'Forbidden' };
        const m = d.screenshot.match(/^data:(image\/[a-z]+);base64,(.+)$/);
        if (!m) return { statusCode: 404, body: 'No screenshot' };
        return { statusCode: 200, headers: { 'Content-Type': m[1], 'Cache-Control': 'private, max-age=3600' }, body: m[2], isBase64Encoded: true };
      }
      if (!isAdminTier(user)) return { statusCode: 403, body: 'Forbidden' };
      const list = await col.find({}, { projection: { screenshot: 0 } }).sort({ createdAt: -1 }).limit(500).toArray();
      const shots = new Set((await col.find({ screenshot: { $nin: ['', null] } }, { projection: { _id: 1 } }).toArray()).map(d => d._id.toString()));
      return json(200, list.map(d => Object.assign(d, { id: d._id.toString(), hasScreenshot: shots.has(d._id.toString()) })));
    }

    if (event.httpMethod === 'POST') {
      const b = JSON.parse(event.body || '{}');
      const type = TYPES[b.type] ? b.type : 'bug';
      const title = clip(b.title, 140), description = clip(b.description, 5000);
      if (!title && !description) return { statusCode: 400, body: 'Please describe the issue or request.' };
      const shot = typeof b.screenshot === 'string' && /^data:image\/(png|jpeg|webp);base64,/.test(b.screenshot) && b.screenshot.length < MAX_SHOT ? b.screenshot : '';
      const u = await db.collection('users').findOne({ username: user.sub }, { projection: { fullName: 1, email: 1 } }).catch(() => null);
      const now = new Date().toISOString();
      const last = await col.find({ ticketNo: { $exists: true } }).sort({ ticketNo: -1 }).limit(1).toArray();
      const ticketNo = ((last[0] && last[0].ticketNo) || 1000) + 1;
      const doc = {
        ticketNo, type, title: title || description.slice(0, 80), description,
        page: clip(b.page, 500), pageTitle: clip(b.pageTitle, 200), property: clip(b.property, 120),
        userAgent: clip(b.userAgent, 400), viewport: clip(b.viewport, 40),
        submittedBy: user.sub, submitterName: (u && u.fullName) || user.sub, submitterEmail: (u && u.email) || '', role: user.role,
        screenshot: shot, status: 'new', priority: type === 'bug' ? 'medium' : 'low', notes: [],
        createdAt: now, updatedAt: now,
      };
      const r = await col.insertOne(doc);
      return json(200, { ok: true, id: r.insertedId.toString(), ticketNo });
    }

    if (event.httpMethod === 'PUT') {
      if (!isAdminTier(user)) return { statusCode: 403, body: 'Forbidden' };
      const b = JSON.parse(event.body || '{}');
      if (!b.id) return { statusCode: 400, body: 'Missing id' };
      const now = new Date().toISOString();
      const set = { updatedAt: now, updatedBy: user.sub };
      const update = { $set: set };
      if (b.status !== undefined) { if (!STATUSES.includes(b.status)) return { statusCode: 400, body: 'Bad status' }; set.status = b.status; }
      if (b.priority !== undefined) { if (!PRIORITIES.includes(b.priority)) return { statusCode: 400, body: 'Bad priority' }; set.priority = b.priority; }
      const note = clip(b.note, 2000);
      if (note) update.$push = { notes: { by: user.sub, text: note, at: now } };
      await col.updateOne({ _id: new ObjectId(b.id) }, update);
      const d = await col.findOne({ _id: new ObjectId(b.id) }, { projection: { screenshot: 0 } });
      return json(200, d ? Object.assign(d, { id: d._id.toString() }) : { ok: true });
    }

    if (event.httpMethod === 'DELETE') {
      if (!isAdminTier(user)) return { statusCode: 403, body: 'Forbidden' };
      if (!q.id) return { statusCode: 400, body: 'Missing id' };
      await col.deleteOne({ _id: new ObjectId(q.id) });
      return json(200, { ok: true });
    }
    return { statusCode: 405, body: 'Method Not Allowed' };
  } catch (e) {
    return { statusCode: 500, body: e.message };
  }
}
