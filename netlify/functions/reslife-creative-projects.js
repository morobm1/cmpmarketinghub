import { verifyReqAuth } from './_auth.js';
import { getDb, ObjectId } from './_db.js';
import { refreshReslifeUser, json } from './_reslife.js';

/**
 * Reslife Creative Studio — projects, folders and favorites (per property).
 *
 * Property access: a user may use a Creative Studio property only if one of the names on
 * their user record (user.properties) maps to that property id below, or they are a site
 * admin / portfolio user. Add new properties to PROPERTY_ALIASES when onboarding.
 *
 * Collections:
 *  reslife_creative_projects  { _id, propertyId, name, type, format, templateId, folder, status,
 *                               content, campaignId, thumbnail, createdBy, updatedBy, createdAt, updatedAt }
 *  reslife_creative_folders   { _id, propertyId, name, createdBy, createdAt }
 *  reslife_creative_favorites { _id, propertyId, username, templateIds: [] }
 *
 * GET    ?propertyId=X[&resource=projects|folders|favorites][&archived=1]
 * POST   { propertyId, resource:'projects', ...project }          create
 * POST   { propertyId, resource:'projects', action:'duplicate', id }
 * POST   { propertyId, resource:'folders', name }
 * PUT    { propertyId, resource:'projects', id, ...fields }        update (status 'archived' to archive)
 * PUT    { propertyId, resource:'favorites', templateIds:[] }
 * DELETE ?propertyId=X&resource=projects|folders&id=Y
 */
const PROPERTY_ALIASES = {
  'harbour-occ': ['the harbour at occ', 'the harbour', 'harbour at occ', 'the-harbour-at-occ', 'harbour-occ'],
};
const STATUSES = ['draft', 'pending', 'final', 'archived'];
const MANAGER_ROLES = ['admin', 'reslife-admin', 'reslife-rec'];
const SHARED_WITH = ['reslife-admin', 'reslife-rec']; // every creative is visible to Admins + RECs by default

/**
 * Approval workflow:
 *  - Anyone can save drafts.
 *  - Saving as final by an RA or REC → status 'pending' until an Admin or REC (other than the creator,
 *    unless they are an Admin) approves it. Admins' finals are approved immediately.
 *  - Editing an approved final as RA/REC sends it back to 'pending'.
 * Visibility: Admins/RECs see every project; RAs see their own plus approved finals.
 */
function resolveStatus(user, requested) {
  if (requested === 'final' || requested === 'pending') return (user.role === 'admin' || user.role === 'reslife-admin') ? 'final' : 'pending';
  return STATUSES.includes(requested) ? requested : 'draft';
}

function canUseProperty(user, propertyId) {
  if (!PROPERTY_ALIASES[propertyId]) return false;
  if (user.role === 'admin' || user.properties === '*') return true;
  const names = Array.isArray(user.properties) ? user.properties : [];
  if (names.includes('*')) return true;
  return names.some(n => PROPERTY_ALIASES[propertyId].includes(String(n).trim().toLowerCase()));
}

const MAX_THUMB = 400 * 1024; // keep documents small; thumbnails are low-res JPEG data URLs

export async function handler(event) {
  const user = verifyReqAuth(event);
  if (!user) return { statusCode: 401, body: 'Unauthorized' };
  const db = await getDb();
  await refreshReslifeUser(db, user);

  const q = event.queryStringParameters || {};
  const body = event.body ? JSON.parse(event.body) : {};
  const propertyId = q.propertyId || body.propertyId;
  const resource = q.resource || body.resource || 'projects';
  if (!propertyId) return { statusCode: 400, body: 'Missing propertyId' };
  if (!canUseProperty(user, propertyId)) return { statusCode: 403, body: 'Forbidden' };

  const projects = db.collection('reslife_creative_projects');
  const folders = db.collection('reslife_creative_folders');
  const favorites = db.collection('reslife_creative_favorites');
  const now = new Date().toISOString();

  try {
    if (event.httpMethod === 'GET') {
      if (resource === 'folders') {
        const docs = await folders.find({ propertyId }).sort({ name: 1 }).toArray();
        docs.forEach(d => { d.id = d._id.toString(); });
        return json(200, docs);
      }
      if (resource === 'favorites') {
        const doc = await favorites.findOne({ propertyId, username: user.sub });
        return json(200, { templateIds: doc ? doc.templateIds : [] });
      }
      const filter = { propertyId };
      filter.status = q.archived ? 'archived' : (q.pending ? 'pending' : { $ne: 'archived' });
      if (!MANAGER_ROLES.includes(user.role)) filter.$or = [{ createdBy: user.sub }, { status: 'final' }];
      const docs = await projects.find(filter).sort({ updatedAt: -1 }).limit(500).toArray();
      docs.forEach(d => { d.id = d._id.toString(); });
      return json(200, docs);
    }

    if (event.httpMethod === 'POST') {
      if (resource === 'folders') {
        const name = String(body.name || '').trim();
        if (!name) return { statusCode: 400, body: 'Missing name' };
        const doc = { propertyId, name, createdBy: user.sub, createdAt: now };
        const r = await folders.insertOne(doc);
        doc.id = r.insertedId.toString();
        return json(200, doc);
      }
      if (body.action === 'duplicate') {
        const src = await projects.findOne({ _id: new ObjectId(body.id), propertyId });
        if (!src) return { statusCode: 404, body: 'Not found' };
        delete src._id;
        Object.assign(src, { name: src.name + ' (copy)', status: 'draft', approvedBy: '', approvedAt: '', reviewNote: '', sharedWith: SHARED_WITH, createdBy: user.sub, updatedBy: user.sub, createdAt: now, updatedAt: now });
        const r = await projects.insertOne(src);
        src.id = r.insertedId.toString();
        return json(200, src);
      }
      const doc = {
        propertyId,
        name: String(body.name || 'Untitled project').slice(0, 140),
        type: body.type || 'flyer',
        format: body.format || 'letter',
        layout: body.layout || '',
        templateId: body.templateId || '',
        folder: body.folder || '',
        status: resolveStatus(user, body.status),
        sharedWith: SHARED_WITH,
        approvedBy: '', approvedAt: '', reviewNote: '',
        submittedAt: '',
        content: body.content || {},
        campaignId: body.campaignId || '',
        thumbnail: typeof body.thumbnail === 'string' && body.thumbnail.length < MAX_THUMB ? body.thumbnail : '',
        createdBy: user.sub, updatedBy: user.sub, createdAt: now, updatedAt: now,
      };
      if (doc.status === 'final') { doc.approvedBy = user.sub; doc.approvedAt = now; }
      if (doc.status === 'pending') doc.submittedAt = now;
      const r = await projects.insertOne(doc);
      doc.id = r.insertedId.toString();
      return json(200, doc);
    }

    if (event.httpMethod === 'PUT') {
      if (resource === 'favorites') {
        const templateIds = Array.isArray(body.templateIds) ? body.templateIds.map(String).slice(0, 200) : [];
        await favorites.updateOne({ propertyId, username: user.sub }, { $set: { templateIds, updatedAt: now } }, { upsert: true });
        return json(200, { templateIds });
      }
      if (!body.id) return { statusCode: 400, body: 'Missing id' };
      const existing = await projects.findOne({ _id: new ObjectId(body.id), propertyId });
      if (!existing) return { statusCode: 404, body: 'Not found' };
      const isMgr = MANAGER_ROLES.includes(user.role);
      const isAdminTier = user.role === 'admin' || user.role === 'reslife-admin';

      if (body.action === 'approve' || body.action === 'reject') {
        if (!isMgr) return { statusCode: 403, body: 'Only an Admin or REC can review creatives' };
        if (existing.createdBy === user.sub && !isAdminTier) return { statusCode: 403, body: 'Another Admin or REC must approve your own creative' };
        const approve = body.action === 'approve';
        await projects.updateOne({ _id: existing._id }, { $set: { status: approve ? 'final' : 'draft', approvedBy: approve ? user.sub : '', approvedAt: approve ? now : '', reviewNote: String(body.note || ''), reviewedBy: user.sub, reviewedAt: now, updatedAt: now } });
        return json(200, { success: true, status: approve ? 'final' : 'draft' });
      }

      if (!isMgr && existing.createdBy !== user.sub) return { statusCode: 403, body: 'You can only edit your own creatives' };
      const updates = { updatedAt: now, updatedBy: user.sub };
      ['name', 'type', 'format', 'layout', 'templateId', 'folder', 'content', 'campaignId'].forEach(f => { if (body[f] !== undefined) updates[f] = body[f]; });
      if (body.status !== undefined) {
        updates.status = body.status === 'archived' ? 'archived' : resolveStatus(user, body.status);
        if (updates.status === 'pending' && existing.status !== 'pending') updates.submittedAt = now;
        if (updates.status === 'final' && existing.status !== 'final') { updates.approvedBy = user.sub; updates.approvedAt = now; }
      } else if (existing.status === 'final' && !isAdminTier && (body.content !== undefined || body.name !== undefined)) {
        updates.status = 'pending'; updates.submittedAt = now; // edits to approved work need re-approval
      }
      if (typeof body.thumbnail === 'string' && body.thumbnail.length < MAX_THUMB) updates.thumbnail = body.thumbnail;
      const r = await projects.updateOne({ _id: new ObjectId(body.id), propertyId }, { $set: updates });
      if (!r.matchedCount) return { statusCode: 404, body: 'Not found' };
      return json(200, { success: true, updatedAt: now, status: updates.status || existing.status });
    }

    if (event.httpMethod === 'DELETE') {
      if (!q.id) return { statusCode: 400, body: 'Missing id' };
      const col = resource === 'folders' ? folders : projects;
      if (resource !== 'folders' && !MANAGER_ROLES.includes(user.role)) {
        const ex = await projects.findOne({ _id: new ObjectId(q.id), propertyId });
        if (ex && ex.createdBy !== user.sub) return { statusCode: 403, body: 'Forbidden' };
      }
      await col.deleteOne({ _id: new ObjectId(q.id), propertyId });
      return json(200, { success: true });
    }

    return { statusCode: 405, body: 'Method Not Allowed' };
  } catch (e) {
    return { statusCode: 500, body: e.message };
  }
}
