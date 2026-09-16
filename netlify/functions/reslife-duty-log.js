import { verifyReqAuth } from './_auth.js';
import { getDb, ObjectId } from './_db.js';
import { canAccessReslifeProperty, canAdminReslifeProperty, canManageReslifeProperty, isReslifeManager, refreshReslifeUser, json } from './_reslife.js';

/**
 * Reslife Hub — Duty Log (Harbour Duty Log 26-27, normalized)
 *
 * ONE DutySession per (property, duty_date) holds MULTIPLE embedded DutyEntry
 * records — replacing the old shift/sign-in model and the Excel's twelve
 * monthly tabs with a single, date-filterable log. An RA starts (or resumes)
 * today's session, adds/edits entries all day/night, and the session stays
 * fully editable — nothing here ever auto-closes on elapsed time — until an
 * explicit Submit (or a REC/Admin Reopen) changes its status. Every mutation
 * is its own durable API call (never held only in browser memory), so the
 * draft survives closed tabs, dead phones, and temporary offline periods;
 * the frontend's localStorage use is a recovery/offline-queue layer only.
 *
 * GET  ?property=X                              - caller's own sessions (most recent first)
 * GET  ?property=X&all=1&(month|from|to|ra|partner|type|location|status|q)= - manager tier, filtered
 * GET  ?property=X&id=Y                          - single session (owner or manager tier)
 * GET  ?property=X&config=1                      - configurable options (caller titles, incident types, etc.)
 * GET  ?property=X&roster=1                      - active RA/REC usernames+labels for the Duty Partner picker
 * POST { property, action:'start' }              - create-or-resume today's session (one per property/day)
 * PUT  { id, property, action, ... }              - addEntry / updateEntry / deleteEntry / updateSession / submit / reopen
 * PUT  { property, action:'updateConfig', config } - admin tier only
 * DELETE ?id=X&property=Y                        - remove a session (manager tier only; correcting a mistake)
 */

const DOCUMENTATION_TYPES = ['None Required', 'Incident Report', 'Service Request', 'Other'];

const DEFAULT_CONFIG = {
  callerTitles: ['Resident', 'Guest', 'Parent / Family Member', 'RA', 'REC', 'Security / Campus Safety', 'Maintenance Staff', 'Other Staff', 'Witness', 'Other'],
  incidentTypes: ['Noise Complaint', 'Lockout', 'Resident Concern', 'Maintenance Issue', 'Wellness Check', 'Policy Violation', 'Facility / Safety Issue', 'Medical', 'Mental Health', 'Alcohol / Drug', 'Other'],
  documentationTypes: DOCUMENTATION_TYPES,
  deadlineTime: '09:00', // 24h local time; "This log should be updated by 9:00 AM every day."
  irFormLink: 'reslife_incident_report.html',
  howToWriteIrLink: 'reslife_incident_report.html',
};

function uidLike() { return 'e-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8); }

// Local calendar date (never UTC) for "today" — the operational day this Hub tracks duty
// coverage for. Netlify functions run in UTC, so a server `new Date().toISOString().slice(0,10)`
// would silently roll over hours too early/late for US timezones. The frontend always sends the
// RA's own local `duty_date` on start; this is only a fallback for safety.
function todayLocalFallback() {
  const now = new Date();
  const y = now.getUTCFullYear(), m = now.getUTCMonth(), d = now.getUTCDate();
  return new Date(Date.UTC(y, m, d)).toISOString().slice(0, 10);
}

function entryFromBody(body, user, now) {
  return {
    // Accept a client-generated id (so the RA's device can render/open the entry editor
    // immediately even if this addEntry call is currently queued offline); fall back to
    // generating one server-side for normal online use.
    id: body.id || uidLike(),
    incident_date: body.incident_date || '',
    incident_time: body.incident_time || '',
    caller_name: body.caller_name || '',
    caller_title: body.caller_title || '',
    location: body.location || '',
    incident_type: body.incident_type || '',
    reason_for_call: body.reason_for_call || '',
    follow_up: body.follow_up || '',
    documentation_type: body.documentation_type || '',
    entered_by_username: user.sub,
    created_at: now,
    updated_at: now,
  };
}

function patchEntry(entry, body, now) {
  const fields = ['incident_date', 'incident_time', 'caller_name', 'caller_title', 'location', 'incident_type', 'reason_for_call', 'follow_up', 'documentation_type'];
  const patched = Object.assign({}, entry);
  fields.forEach(f => { if (body[f] !== undefined) patched[f] = body[f]; });
  patched.updated_at = now;
  return patched;
}

function summarize(doc) {
  doc.id = doc._id.toString();
  delete doc._id;
  return doc;
}

export async function handler(event) {
  const user = verifyReqAuth(event);
  if (!user) return { statusCode: 401, body: 'Unauthorized' };

  const db = await getDb();
  await refreshReslifeUser(db, user);
  const col = db.collection('reslife_duty_sessions');
  const cfgCol = db.collection('reslife_duty_config');
  const manager = user.role === 'admin' || isReslifeManager(user.role);

  try {
    if (event.httpMethod === 'GET') {
      const q = event.queryStringParameters || {};
      const { property, id } = q;
      if (!property) return { statusCode: 400, body: 'Missing property' };
      if (!canAccessReslifeProperty(user, property)) return { statusCode: 403, body: 'Forbidden' };

      if (q.config) {
        const cfgDoc = await cfgCol.findOne({ property });
        const cfg = Object.assign({}, DEFAULT_CONFIG, cfgDoc ? cfgDoc.config : {});
        return json(200, cfg);
      }

      if (q.roster) {
        const users = await db.collection('users').find(
          { role: { $in: ['reslife-ra', 'reslife-rec', 'reslife-admin'] }, properties: property },
          { projection: { _id: 0, username: 1, displayName: 1, role: 1 } }
        ).toArray();
        return json(200, users.map(u => ({ username: u.username, label: u.displayName || u.username })));
      }

      if (id) {
        const doc = await col.findOne({ _id: new ObjectId(id), property });
        if (!doc) return { statusCode: 404, body: 'Not found' };
        if (doc.primary_ra_username !== user.sub && !manager) return { statusCode: 403, body: 'Forbidden' };
        return json(200, summarize(doc));
      }

      if (q.all) {
        if (!manager) return { statusCode: 403, body: 'Forbidden' };
        const filter = { property };
        if (q.status) filter.status = q.status;
        if (q.ra) filter.primary_ra_username = q.ra;
        if (q.partner) filter.duty_partner_username = q.partner;
        if (q.from || q.to || q.month) {
          filter.duty_date = {};
          if (q.month) { filter.duty_date.$gte = q.month + '-01'; filter.duty_date.$lte = q.month + '-31'; }
          if (q.from) filter.duty_date.$gte = q.from;
          if (q.to) filter.duty_date.$lte = q.to;
        }
        if (q.type) filter['entries.incident_type'] = q.type;
        if (q.location) filter['entries.location'] = { $regex: q.location, $options: 'i' };
        if (q.q) {
          const rx = { $regex: q.q, $options: 'i' };
          filter.$or = [
            { primary_ra_username: rx }, { duty_partner_username: rx },
            { 'entries.reason_for_call': rx }, { 'entries.location': rx }, { 'entries.caller_name': rx },
          ];
        }
        const docs = await col.find(filter).sort({ duty_date: -1 }).limit(400).toArray();
        return json(200, docs.map(summarize));
      }

      // Default: caller's own sessions only
      const docs = await col.find({ property, primary_ra_username: user.sub }).sort({ duty_date: -1 }).limit(60).toArray();
      return json(200, docs.map(summarize));
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { property, action } = body;
      if (!property) return { statusCode: 400, body: 'Missing property' };
      if (!canAccessReslifeProperty(user, property)) return { statusCode: 403, body: 'Forbidden' };
      if (action !== 'start') return { statusCode: 400, body: 'Unknown action' };

      const dutyDate = body.duty_date || todayLocalFallback();
      const now = new Date().toISOString();

      const existing = await col.findOne({ property, duty_date: dutyDate });
      if (existing) {
        // One shared log per calendar day. If someone else already started today's log and
        // it's not yet submitted, hand back the same session rather than creating a duplicate;
        // edit permission still requires ownership or manager tier (enforced on PUT).
        return json(200, summarize(existing));
      }

      const doc = {
        property,
        duty_date: dutyDate,
        primary_ra_username: user.sub,
        duty_partner_username: '',
        status: 'draft',
        no_incidents: false,
        entries: [],
        started_at: now,
        last_saved_at: now,
        submitted_at: null,
        submitted_by_username: null,
        reopened_at: null,
        reopened_by_username: null,
        created_by_username: user.sub,
        last_edited_by_username: user.sub,
        last_edited_at: now,
        created_at: now,
        updated_at: now,
      };
      const result = await col.insertOne(doc);
      doc._id = result.insertedId;
      return json(200, summarize(doc));
    }

    if (event.httpMethod === 'PUT') {
      const body = JSON.parse(event.body || '{}');
      const { property, action } = body;
      if (!property) return { statusCode: 400, body: 'Missing property' };
      if (!canAccessReslifeProperty(user, property)) return { statusCode: 403, body: 'Forbidden' };

      if (action === 'updateConfig') {
        if (!canAdminReslifeProperty(user, property)) return { statusCode: 403, body: 'Only Reslife Admin can update Duty Log settings' };
        const cfg = Object.assign({}, DEFAULT_CONFIG, body.config || {});
        await cfgCol.updateOne({ property }, { $set: { property, config: cfg, updatedAt: new Date().toISOString() } }, { upsert: true });
        return json(200, cfg);
      }

      const { id } = body;
      if (!id || !action) return { statusCode: 400, body: 'Missing id/action' };
      const existing = await col.findOne({ _id: new ObjectId(id), property });
      if (!existing) return { statusCode: 404, body: 'Not found' };
      const isOwner = existing.primary_ra_username === user.sub;
      const now = new Date().toISOString();
      const updates = { updated_at: now };
      const editable = existing.status === 'draft' || existing.status === 'reopened';

      if (action === 'addEntry') {
        if (!isOwner && !manager) return { statusCode: 403, body: 'Forbidden' };
        if (!editable) return { statusCode: 409, body: 'This Duty Log has already been submitted' };
        // If a queued/offline retry resends the same client-generated id, don't duplicate it.
        const dupe = body.entry && body.entry.id && (existing.entries || []).find(e => e.id === body.entry.id);
        if (dupe) return json(200, { success: true, entry: dupe, last_saved_at: existing.last_saved_at });
        const entry = entryFromBody(body.entry || {}, user, now);
        const entries = (existing.entries || []).concat([entry]);
        updates.entries = entries;
        updates.no_incidents = false; // an actual entry always supersedes "no incidents"
        updates.last_saved_at = now;
        updates.last_edited_by_username = user.sub;
        updates.last_edited_at = now;
        await col.updateOne({ _id: new ObjectId(id), property }, { $set: updates });
        return json(200, { success: true, entry, last_saved_at: now });
      }

      if (action === 'updateEntry') {
        if (!isOwner && !manager) return { statusCode: 403, body: 'Forbidden' };
        if (!editable) return { statusCode: 409, body: 'This Duty Log has already been submitted' };
        if (!body.entryId) return { statusCode: 400, body: 'Missing entryId' };
        let found = false;
        const entries = (existing.entries || []).map(e => {
          if (e.id !== body.entryId) return e;
          found = true;
          return patchEntry(e, body.entry || {}, now);
        });
        if (!found) return { statusCode: 404, body: 'Entry not found' };
        updates.entries = entries;
        updates.last_saved_at = now;
        updates.last_edited_by_username = user.sub;
        updates.last_edited_at = now;
        await col.updateOne({ _id: new ObjectId(id), property }, { $set: updates });
        return json(200, { success: true, last_saved_at: now });
      }

      if (action === 'deleteEntry') {
        if (!isOwner && !manager) return { statusCode: 403, body: 'Forbidden' };
        if (!editable) return { statusCode: 409, body: 'This Duty Log has already been submitted' };
        updates.entries = (existing.entries || []).filter(e => e.id !== body.entryId);
        updates.last_saved_at = now;
        updates.last_edited_by_username = user.sub;
        updates.last_edited_at = now;
        await col.updateOne({ _id: new ObjectId(id), property }, { $set: updates });
        return json(200, { success: true, last_saved_at: now });
      }

      if (action === 'updateSession') {
        if (!isOwner && !manager) return { statusCode: 403, body: 'Forbidden' };
        if (!editable) return { statusCode: 409, body: 'This Duty Log has already been submitted' };
        if (body.duty_partner_username !== undefined) updates.duty_partner_username = body.duty_partner_username;
        if (body.no_incidents !== undefined) {
          if (body.no_incidents && (existing.entries || []).length > 0) {
            return { statusCode: 409, body: 'Cannot mark "No Calls / Incidents" while entries exist — remove entries first or leave unchecked' };
          }
          updates.no_incidents = !!body.no_incidents;
        }
        updates.last_saved_at = now;
        updates.last_edited_by_username = user.sub;
        updates.last_edited_at = now;
        await col.updateOne({ _id: new ObjectId(id), property }, { $set: updates });
        return json(200, { success: true, last_saved_at: now });
      }

      if (action === 'submit') {
        if (!isOwner && !manager) return { statusCode: 403, body: 'Only the Duty RA (or REC/Admin) can submit this Duty Log' };
        if (!editable) return { statusCode: 409, body: 'This Duty Log has already been submitted' };
        const entryCount = (existing.entries || []).length;
        if (!existing.no_incidents && entryCount === 0) {
          return { statusCode: 400, body: 'Add at least one entry, or select "No Calls / Incidents to Report" before submitting' };
        }
        updates.status = 'submitted';
        updates.submitted_at = now;
        updates.submitted_by_username = user.sub;
        updates.last_saved_at = now;
        await col.updateOne({ _id: new ObjectId(id), property }, { $set: updates });
        return json(200, { success: true, submitted_at: now });
      }

      if (action === 'reopen') {
        if (!canAdminReslifeProperty(user, property) && !canManageReslifeProperty(user, property)) {
          return { statusCode: 403, body: 'Only REC/Admin can reopen a submitted Duty Log' };
        }
        if (existing.status !== 'submitted') return { statusCode: 409, body: 'Only a submitted Duty Log can be reopened' };
        updates.status = 'reopened';
        updates.reopened_at = now;
        updates.reopened_by_username = user.sub;
        await col.updateOne({ _id: new ObjectId(id), property }, { $set: updates });
        return json(200, { success: true, reopened_at: now });
      }

      return { statusCode: 400, body: 'Unknown action' };
    }

    if (event.httpMethod === 'DELETE') {
      const { id, property } = event.queryStringParameters || {};
      if (!id || !property) return { statusCode: 400, body: 'Missing id/property' };
      if (!canAccessReslifeProperty(user, property)) return { statusCode: 403, body: 'Forbidden' };
      if (!manager) return { statusCode: 403, body: 'Forbidden' };
      await col.deleteOne({ _id: new ObjectId(id), property });
      return json(200, { success: true });
    }

    return { statusCode: 405, body: 'Method Not Allowed' };
  } catch (e) {
    return { statusCode: 500, body: e.message };
  }
}
