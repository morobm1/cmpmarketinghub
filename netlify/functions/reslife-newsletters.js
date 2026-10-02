import crypto from 'crypto';
import { verifyReqAuth } from './_auth.js';
import { getDb, ObjectId } from './_db.js';
import { refreshReslifeUser, json } from './_reslife.js';
import { sendGuestEmail } from './_guest.js';

/**
 * Creative Studio — Monthly Newsletter (The Harbour at OCC ResLife).
 *
 * Collections:
 *   reslife_newsletters        { propertyId, month(1-12), year, title, emailSubject, preheader, status, sections[], createdBy, updatedBy, createdAt, updatedAt, sentAt }
 *   reslife_newsletter_blocks  { propertyId, name, category, sectionType, content, createdBy, createdAt, updatedAt }
 *   reslife_newsletter_images  { propertyId, mime, data(base64), name, createdBy, createdAt }  — served publicly so email clients can load them
 *
 * GET  ?propertyId=X                         list newsletters (no sections)
 * GET  ?propertyId=X&id=Y                    one newsletter
 * GET  ?propertyId=X&resource=blocks         saved blocks
 * GET  ?img=ID                               PUBLIC image bytes (used in exported email HTML)
 * POST { propertyId, action:'create', month, year, title, emailSubject, preheader, sections, duplicateOf? }
 * POST { propertyId, action:'image', data(dataURL), name }   → { url }
 * POST { propertyId, action:'sendTest', to, subject, html }
 * POST { propertyId, resource:'blocks', name, category, sectionType, content }
 * PUT  { propertyId, id, ...fields }          save (auto-save + manual); status 'approved' requires REC/Admin
 * PUT  { propertyId, resource:'blocks', id, ...fields }
 * DELETE ?propertyId=X&id=Y[&resource=blocks]
 */
const PROPERTY_ALIASES = { 'harbour-occ': ['the harbour at occ', 'the harbour', 'harbour at occ', 'the-harbour-at-occ', 'harbour-occ'] };
const STATUSES = ['draft', 'review', 'approved', 'sent', 'archived'];
const MANAGERS = ['admin', 'reslife-admin', 'reslife-rec'];
const MAX_IMG = 2.5 * 1024 * 1024;
const MAX_DOC = 900 * 1024;
const clip = (s, n) => String(s == null ? '' : s).slice(0, n);
const oid = id => { try { return new ObjectId(String(id)); } catch { return null; } };

function canUse(user, propertyId) {
  if (!PROPERTY_ALIASES[propertyId]) return false;
  if (user.role === 'admin' || user.properties === '*') return true;
  const names = Array.isArray(user.properties) ? user.properties : [];
  return names.includes('*') || names.some(n => PROPERTY_ALIASES[propertyId].includes(String(n).trim().toLowerCase()));
}

export async function handler(event) {
  const q = event.queryStringParameters || {};
  const db = await getDb();

  // Public image endpoint — email clients fetch these without a login.
  if (event.httpMethod === 'GET' && q.img) {
    const im = await db.collection('reslife_newsletter_images').findOne({ _id: oid(q.img) });
    if (!im) return { statusCode: 404, body: 'Not found' };
    return { statusCode: 200, headers: { 'Content-Type': im.mime, 'Cache-Control': 'public, max-age=31536000, immutable' }, body: im.data, isBase64Encoded: true };
  }

  const user = verifyReqAuth(event);
  if (!user) return { statusCode: 401, body: 'Unauthorized' };
  await refreshReslifeUser(db, user);
  const body = event.body ? JSON.parse(event.body) : {};
  const propertyId = q.propertyId || body.propertyId;
  if (!propertyId || !canUse(user, propertyId)) return { statusCode: 403, body: 'Forbidden' };
  const mgr = MANAGERS.includes(user.role);
  const N = db.collection('reslife_newsletters'), B = db.collection('reslife_newsletter_blocks');
  const now = new Date().toISOString();
  const resource = q.resource || body.resource;

  try {
    if (event.httpMethod === 'GET') {
      if (resource === 'blocks') return json(200, (await B.find({ propertyId }).sort({ category: 1, name: 1 }).toArray()).map(b => Object.assign(b, { id: b._id.toString() })));
      if (q.id) { const n = await N.findOne({ propertyId, _id: oid(q.id) }); if (!n) return { statusCode: 404, body: 'Newsletter not found' }; n.id = n._id.toString(); return json(200, n); }
      const list = await N.find({ propertyId }, { projection: { sections: 0 } }).sort({ year: -1, month: -1, updatedAt: -1 }).limit(300).toArray();
      return json(200, list.map(n => Object.assign(n, { id: n._id.toString() })));
    }

    if (event.httpMethod === 'POST') {
      if (body.action === 'image') {
        return { statusCode: 410, body: 'Uploads are disabled — use an image from the Photo Library or paste an Entrata Media Library link.' };
        const m = String(body.data || '').match(/^data:(image\/(?:png|jpeg|gif|webp));base64,(.+)$/);
        if (!m || m[2].length > MAX_IMG) return { statusCode: 400, body: 'Image must be PNG/JPEG/GIF/WebP under ~2 MB' };
        const r = await db.collection('reslife_newsletter_images').insertOne({ propertyId, mime: m[1], data: m[2], name: clip(body.name, 120), createdBy: user.sub, createdAt: now });
        const base = process.env.APP_BASE_URL || ('https://' + (event.headers.host || 'cmpmarketinghub.netlify.app'));
        return json(200, { url: `${base}/api/reslife-newsletters?img=${r.insertedId.toString()}` });
      }
      if (body.action === 'sendTest') {
        const to = String(body.to || '').split(/[,;\s]+/).filter(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)).slice(0, 5);
        if (!to.length) return { statusCode: 400, body: 'Enter at least one valid email address' };
        if (!process.env.CMP_SCRIPT_URL || !process.env.CMP_TASK_SECRET) return json(501, { ok: false, message: 'Email sending isn’t configured for this site yet.' });
        const r = await sendGuestEmail(db, { to, subject: '[TEST] ' + clip(body.subject, 200), html: String(body.html || '').slice(0, 800000), meta: { type: 'newsletter_test', propertyId } });
        return json(r.success ? 200 : 502, { ok: !!r.success, message: r.success ? `Test sent to ${to.join(', ')}` : ('Send failed: ' + (r.error || 'unknown error')) });
      }
      if (resource === 'blocks') {
        if (!body.name || !body.sectionType) return { statusCode: 400, body: 'Name and section type are required' };
        const doc = { propertyId, name: clip(body.name, 100), category: clip(body.category || 'General', 60), sectionType: clip(body.sectionType, 40), content: body.content || {}, createdBy: user.sub, createdAt: now, updatedAt: now };
        const r = await B.insertOne(doc); doc.id = r.insertedId.toString(); return json(200, doc);
      }
      if (body.action === 'create') {
        const month = Math.min(12, Math.max(1, +body.month || 1)), year = Math.min(2100, Math.max(2020, +body.year || new Date().getFullYear()));
        let sections = Array.isArray(body.sections) ? body.sections : [];
        if (body.duplicateOf) { const src = await N.findOne({ propertyId, _id: oid(body.duplicateOf) }); if (!src) return { statusCode: 404, body: 'Source newsletter not found' }; sections = src.sections || []; }
        // Every section gets a fresh id so the copy is fully independent of the source month.
        sections = sections.map(s => Object.assign({}, s, { id: 's' + crypto.randomBytes(5).toString('hex') }));
        const doc = { propertyId, month, year, title: clip(body.title, 160), emailSubject: clip(body.emailSubject || body.title, 200), preheader: clip(body.preheader, 250), status: 'draft', sections, createdBy: user.sub, updatedBy: user.sub, createdAt: now, updatedAt: now, sentAt: null, duplicatedFrom: body.duplicateOf || null };
        if (JSON.stringify(doc).length > MAX_DOC) return { statusCode: 413, body: 'Newsletter is too large — use uploaded images instead of pasted ones.' };
        const r = await N.insertOne(doc); doc.id = r.insertedId.toString(); return json(200, doc);
      }
      return { statusCode: 400, body: 'Unknown action' };
    }

    if (event.httpMethod === 'PUT') {
      if (resource === 'blocks') {
        const upd = { updatedAt: now };
        ['name', 'category'].forEach(k => { if (body[k] !== undefined) upd[k] = clip(body[k], 100); });
        if (body.content !== undefined) upd.content = body.content;
        await B.updateOne({ propertyId, _id: oid(body.id) }, { $set: upd });
        return json(200, { ok: true });
      }
      const n = await N.findOne({ propertyId, _id: oid(body.id) });
      if (!n) return { statusCode: 404, body: 'Newsletter not found' };
      const upd = { updatedAt: now, updatedBy: user.sub };
      ['title', 'emailSubject', 'preheader'].forEach(k => { if (body[k] !== undefined) upd[k] = clip(body[k], k === 'preheader' ? 250 : 200); });
      if (body.month !== undefined) upd.month = Math.min(12, Math.max(1, +body.month));
      if (body.year !== undefined) upd.year = +body.year;
      if (Array.isArray(body.sections)) upd.sections = body.sections;
      if (body.status !== undefined && body.status !== n.status) {
        if (!STATUSES.includes(body.status)) return { statusCode: 400, body: 'Unknown status' };
        if (body.status === 'approved' && !mgr) return { statusCode: 403, body: 'Only an REC or Admin can approve a newsletter' };
        upd.status = body.status;
        if (body.status === 'sent') { upd.sentAt = now; upd.sentBy = user.sub; }
        if (body.status === 'approved') { upd.approvedBy = user.sub; upd.approvedAt = now; }
      }
      if (upd.sections && JSON.stringify(upd.sections).length > MAX_DOC) return { statusCode: 413, body: 'Newsletter is too large — use uploaded images instead of pasted ones.' };
      await N.updateOne({ _id: n._id }, { $set: upd });
      return json(200, { ok: true, updatedAt: now, status: upd.status || n.status });
    }

    if (event.httpMethod === 'DELETE') {
      if (resource === 'blocks') { await B.deleteOne({ propertyId, _id: oid(q.id) }); return json(200, { ok: true }); }
      const n = await N.findOne({ propertyId, _id: oid(q.id) });
      if (!n) return { statusCode: 404, body: 'Not found' };
      if (!mgr && n.createdBy !== user.sub) return { statusCode: 403, body: 'Only the creator, an REC or an Admin can delete this newsletter' };
      await N.deleteOne({ _id: n._id });
      return json(200, { ok: true });
    }
    return { statusCode: 405, body: 'Method Not Allowed' };
  } catch (e) {
    return { statusCode: 500, body: e.message };
  }
}
