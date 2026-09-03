import { verifyReqAuth } from './_auth.js';
import { getDb, ObjectId } from './_db.js';
import { canAccessReslifeProperty, canAdminReslifeProperty, isReslifeManager, refreshReslifeUser, json } from './_reslife.js';

/**
 * Reslife Hub — Duty Log
 *
 * An RA "signs in" to start a duty shift, adds timestamped entries
 * throughout the shift (rounds, calls, notes), and "submits" at the end of
 * the day to close it out. A running end-of-shift summary autosaves every
 * couple of minutes from the frontend so nothing is lost — entries
 * themselves are already durable the moment they're added (each is its own
 * API call, not held only in browser state). Editing stays open for the
 * whole shift; nothing here ever force-closes a log due to elapsed time —
 * only an explicit "Submit & Sign Out" (or an Admin/REC reopen) changes status.
 *
 * GET  ?property=X                    - the caller's own logs (most recent first)
 * GET  ?property=X&all=1              - every RA's logs for this property (manager tier only)
 * GET  ?property=X&id=Y               - single log (owner or manager tier)
 * POST { property, action:'signIn' }  - start a new active shift (blocks a second concurrent active shift)
 * PUT  { id, property, action, ... }  - addEntry / updateEntry / deleteEntry / autosaveSummary / submit / reopen
 * DELETE ?id=X&property=Y             - remove a log (manager tier only; for correcting mistakes)
 */
const ENTRY_TYPES = ['Round', 'Call', 'Note', 'Maintenance', 'Incident Reference', 'Other'];
function uidLike() { return 'h-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8); }

export async function handler(event) {
  const user = verifyReqAuth(event);
  if (!user) return { statusCode: 401, body: 'Unauthorized' };

  const db = await getDb();
  await refreshReslifeUser(db, user);
  const col = db.collection('reslife_duty_logs');
  const manager = user.role === 'admin' || isReslifeManager(user.role);

  try {
    if (event.httpMethod === 'GET') {
      const q = event.queryStringParameters || {};
      const { property, id, all } = q;
      if (!property) return { statusCode: 400, body: 'Missing property' };
      if (!canAccessReslifeProperty(user, property)) return { statusCode: 403, body: 'Forbidden' };

      if (id) {
        const doc = await col.findOne({ _id: new ObjectId(id), property });
        if (!doc) return { statusCode: 404, body: 'Not found' };
        if (doc.raUsername !== user.sub && !manager) return { statusCode: 403, body: 'Forbidden' };
        doc.id = doc._id.toString();
        return json(200, doc);
      }
      const filter = { property };
      if (!(all && manager)) filter.raUsername = user.sub;
      const docs = await col.find(filter).sort({ signInTime: -1 }).limit(200).toArray();
      docs.forEach(d => { d.id = d._id.toString(); });
      return json(200, docs);
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { property, action } = body;
      if (!property) return { statusCode: 400, body: 'Missing property' };
      if (!canAccessReslifeProperty(user, property)) return { statusCode: 403, body: 'Forbidden' };
      if (action !== 'signIn') return { statusCode: 400, body: 'Unknown action' };

      const existingActive = await col.findOne({ property, raUsername: user.sub, status: 'active' });
      if (existingActive) { existingActive.id = existingActive._id.toString(); return json(200, existingActive); }

      const now = new Date().toISOString();
      const doc = {
        property, raUsername: user.sub, shiftDate: now.slice(0, 10),
        signInTime: now, signOutTime: null, status: 'active',
        entries: [], summary: '', lastAutoSavedAt: null,
        createdAt: now, updatedAt: now,
      };
      const result = await col.insertOne(doc);
      doc.id = result.insertedId.toString();
      return json(200, doc);
    }

    if (event.httpMethod === 'PUT') {
      const body = JSON.parse(event.body || '{}');
      const { id, property, action } = body;
      if (!id || !property || !action) return { statusCode: 400, body: 'Missing id/property/action' };
      const existing = await col.findOne({ _id: new ObjectId(id), property });
      if (!existing) return { statusCode: 404, body: 'Not found' };
      const isOwner = existing.raUsername === user.sub;
      const now = new Date().toISOString();
      const updates = { updatedAt: now };

      if (action === 'addEntry') {
        if (!isOwner) return { statusCode: 403, body: 'Only the RA who signed in can add entries' };
        if (existing.status !== 'active') return { statusCode: 409, body: 'This shift has already been submitted' };
        if (!body.entry || !body.entry.text) return { statusCode: 400, body: 'Entry text required' };
        const entries = existing.entries || [];
        entries.push({ id: uidLike(), time: body.entry.time || now, type: ENTRY_TYPES.includes(body.entry.type) ? body.entry.type : 'Note', text: body.entry.text, createdAt: now });
        updates.entries = entries;
      } else if (action === 'updateEntry') {
        if (!isOwner) return { statusCode: 403, body: 'Forbidden' };
        if (existing.status !== 'active') return { statusCode: 409, body: 'This shift has already been submitted' };
        const entries = (existing.entries || []).map(e => e.id === body.entryId ? Object.assign({}, e, { text: body.text !== undefined ? body.text : e.text, type: body.type && ENTRY_TYPES.includes(body.type) ? body.type : e.type, time: body.time || e.time }) : e);
        updates.entries = entries;
      } else if (action === 'deleteEntry') {
        if (!isOwner) return { statusCode: 403, body: 'Forbidden' };
        if (existing.status !== 'active') return { statusCode: 409, body: 'This shift has already been submitted' };
        updates.entries = (existing.entries || []).filter(e => e.id !== body.entryId);
      } else if (action === 'autosaveSummary') {
        if (!isOwner) return { statusCode: 403, body: 'Forbidden' };
        if (existing.status !== 'active') return { statusCode: 409, body: 'This shift has already been submitted' };
        updates.summary = body.summary || '';
        updates.lastAutoSavedAt = now;
      } else if (action === 'submit') {
        if (!isOwner) return { statusCode: 403, body: 'Only the RA who signed in can submit this shift' };
        if (existing.status !== 'active') return { statusCode: 409, body: 'This shift has already been submitted' };
        updates.summary = body.summary !== undefined ? body.summary : existing.summary;
        updates.signOutTime = now;
        updates.status = 'submitted';
      } else if (action === 'reopen') {
        if (!canAdminReslifeProperty(user, property)) return { statusCode: 403, body: 'Only REC/Admin can reopen a submitted log' };
        updates.status = 'active';
        updates.signOutTime = null;
      } else {
        return { statusCode: 400, body: 'Unknown action' };
      }

      await col.updateOne({ _id: new ObjectId(id), property }, { $set: updates });
      return json(200, { success: true });
    }

    if (event.httpMethod === 'DELETE') {
      const { id, property } = event.queryStringParameters || {};
      if (!id || !property) return { statusCode: 400, body: 'Missing id/property' };
      if (!manager) return { statusCode: 403, body: 'Forbidden' };
      await col.deleteOne({ _id: new ObjectId(id), property });
      return json(200, { success: true });
    }

    return { statusCode: 405, body: 'Method Not Allowed' };
  } catch (e) {
    return { statusCode: 500, body: e.message };
  }
}
