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
const STATUSES = ['draft', 'in-review', 'final', 'archived'];

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
      filter.status = q.archived ? 'archived' : { $ne: 'archived' };
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
        Object.assign(src, { name: src.name + ' (copy)', status: 'draft', createdBy: user.sub, updatedBy: user.sub, createdAt: now, updatedAt: now });
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
        status: STATUSES.includes(body.status) ? body.status : 'draft',
        content: body.content || {},
        campaignId: body.campaignId || '',
        thumbnail: typeof body.thumbnail === 'string' && body.thumbnail.length < MAX_THUMB ? body.thumbnail : '',
        createdBy: user.sub, updatedBy: user.sub, createdAt: now, updatedAt: now,
      };
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
      const updates = { updatedAt: now, updatedBy: user.sub };
      ['name', 'type', 'format', 'layout', 'templateId', 'folder', 'content', 'campaignId'].forEach(f => { if (body[f] !== undefined) updates[f] = body[f]; });
      if (body.status !== undefined && STATUSES.includes(body.status)) updates.status = body.status;
      if (typeof body.thumbnail === 'string' && body.thumbnail.length < MAX_THUMB) updates.thumbnail = body.thumbnail;
      const r = await projects.updateOne({ _id: new ObjectId(body.id), propertyId }, { $set: updates });
      if (!r.matchedCount) return { statusCode: 404, body: 'Not found' };
      return json(200, { success: true, updatedAt: now });
    }

    if (event.httpMethod === 'DELETE') {
      if (!q.id) return { statusCode: 400, body: 'Missing id' };
      const col = resource === 'folders' ? folders : projects;
      await col.deleteOne({ _id: new ObjectId(q.id), propertyId });
      return json(200, { success: true });
    }

    return { statusCode: 405, body: 'Method Not Allowed' };
  } catch (e) {
    return { statusCode: 500, body: e.message };
  }
}
