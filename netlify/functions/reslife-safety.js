import { verifyReqAuth } from './_auth.js';
import { getDb, ObjectId } from './_db.js';
import { audit, readAudit } from './_audit.js';
import { canAccessReslifeProperty, refreshReslifeUser, json } from './_reslife.js';
import {
  RESTRICTION_STATUSES, CHECK_OUTCOMES, cleanRestriction, activationMissing, effectiveRestrictionStatus, reviewDue,
  projectForCheck, isAdminTier, isRec,
} from './_safety.js';
import { screenGuest } from './_safetycheck.js';

/**
 * Restricted Safety Records (verified trespass restrictions) — Reslife Hub.
 *
 * Collections
 *   reslife_safety_records { property, subjectType:'guest'|'resident', residentId, name, aliases[], identifyingNotes, scope, scopeDetail,
 *                            effectiveDate, expiresAt, reviewDate, authorizingDepartment, referenceNumber, verificationNote,
 *                            operationalInstructions, raInstructions, escalationInstructions, documentRef,
 *                            status, verifiedBy, verifiedAt, createdBy, createdAt, updatedBy, updatedAt, history[] }
 *   reslife_safety_checks  { property, at, by, source, guestLogId, recordIds[], levels[], outcome, resolvedBy, resolvedAt, note }
 *
 * Permissions (server-enforced, property-scoped)
 *   Reslife Admin / site admin : list, view, create, verify (activate), edit, revoke, view checks + audit
 *   REC                        : submit an unverified report (pending), screen a name, see operational details on a hit,
 *                                resolve checks (incl. confirmed-match escalation). No list / search of records.
 *   RA                         : screen a name (result = "pause and escalate" + RA-authorized instructions only),
 *                                record "escalated" or "not a match (ID verified)". No names or record details.
 *
 * GET  ?property&list=1[&status]          admin-tier: records (reads are audited)
 * GET  ?property&id=X                     admin-tier: one record + history (audited)
 * GET  ?property&residentId=X             admin-tier: { active: bool, count } for the Resident Profile badge
 * GET  ?property&checks=1                 REC/admin: pending guest checks (no record details for REC beyond hit projection)
 * GET  ?property&audit=1                  admin-tier: safety audit log
 * POST { action:'report', ... }            REC/admin: create pending_verification
 * POST { action:'create', ... }            admin-tier: create pending_verification (verify separately)
 * POST { action:'screen', guestName }      any staff: screen a name (logs a check only on a hit)
 * PUT  { action:'verify', id }             admin-tier: pending -> active (requires official documentation fields)
 * PUT  { action:'update', id, ... }        admin-tier
 * PUT  { action:'status', id, to, note }   admin-tier: revoke / expire / back to pending
 * PUT  { action:'resolve', checkId, outcome, note }
 */
const oid = id => { try { return new ObjectId(String(id)); } catch (e) { return null; } };

function presentRecord(r) {
  const o = Object.assign({}, r); o.id = String(r._id); delete o._id;
  o.effectiveStatus = effectiveRestrictionStatus(r);
  o.reviewDue = reviewDue(Object.assign({}, r, { status: o.effectiveStatus }));
  return o;
}

async function expireLazily(db, property, user) {
  const today = new Date().toISOString().slice(0, 10);
  const col = db.collection('reslife_safety_records');
  const due = await col.find({ property, status: 'active', expiresAt: { $ne: '', $lt: today } }, { projection: { _id: 1 } }).toArray();
  for (const r of due) {
    await col.updateOne({ _id: r._id, status: 'active' }, { $set: { status: 'expired', updatedAt: new Date().toISOString(), updatedBy: 'system' }, $push: { history: { at: new Date().toISOString(), by: 'system', action: 'expired', note: 'Expiration date passed' } } });
    await audit(db, { property, user: { sub: 'system', role: 'system' }, area: 'safety', action: 'auto-expire', entityId: r._id });
  }
}

export async function handler(event) {
  const user = verifyReqAuth(event);
  if (!user) return { statusCode: 401, body: 'Unauthorized' };
  const db = await getDb();
  await refreshReslifeUser(db, user);
  const q = event.queryStringParameters || {};
  const col = db.collection('reslife_safety_records');
  const checks = db.collection('reslife_safety_checks');
  const headers = { 'Cache-Control': 'no-store' };
  const out = (code, data) => Object.assign(json(code, data), { headers: Object.assign({ 'Content-Type': 'application/json' }, headers) });

  try {
    let body = {};
    if (event.httpMethod !== 'GET') body = JSON.parse(event.body || '{}');
    const property = q.property || body.property;
    if (!property) return { statusCode: 400, body: 'Missing property' };
    if (!canAccessReslifeProperty(user, property)) return { statusCode: 403, body: 'Forbidden' };
    const admin = isAdminTier(user), rec = isRec(user);
    await expireLazily(db, property, user);

    if (event.httpMethod === 'GET') {
      if (q.residentId) {
        if (!admin) return { statusCode: 403, body: 'Forbidden' };
        const n = await col.countDocuments({ property, subjectType: 'resident', residentId: String(q.residentId), status: 'active' });
        await audit(db, { property, user, area: 'safety', action: 'resident-flag-view', entityId: q.residentId, detail: { active: n > 0 } });
        return out(200, { active: n > 0, count: n });
      }
      if (q.checks) {
        if (!admin && !rec) return { statusCode: 403, body: 'Forbidden' };
        const rows = await checks.find({ property, outcome: 'pending' }).sort({ at: -1 }).limit(100).toArray();
        const recIds = [...new Set(rows.flatMap(r => r.recordIds))].map(oid).filter(Boolean);
        const recs = new Map((await col.find({ _id: { $in: recIds }, property }).toArray()).map(r => [String(r._id), r]));
        const guestIds = rows.map(r => oid(r.guestLogId)).filter(Boolean);
        const guests = new Map((await db.collection('reslife_guest_log').find({ _id: { $in: guestIds }, property }, { projection: { guestName: 1, hostResident: 1, room: 1, status: 1 } }).toArray()).map(g => [String(g._id), g]));
        await audit(db, { property, user, area: 'safety', action: 'list-checks', detail: { count: rows.length } });
        return out(200, rows.map(c => ({
          id: String(c._id), at: c.at, by: c.by, source: c.source, guestLogId: c.guestLogId,
          guest: guests.get(c.guestLogId) ? { guestName: guests.get(c.guestLogId).guestName, hostResident: guests.get(c.guestLogId).hostResident, room: guests.get(c.guestLogId).room, status: guests.get(c.guestLogId).status } : null,
          hits: c.recordIds.map((id, i) => recs.get(id) ? projectForCheck(recs.get(id), user, c.levels[i]) : null).filter(Boolean),
        })));
      }
      if (!admin) return { statusCode: 403, body: 'Forbidden' };
      if (q.audit) return out(200, await readAudit(db, { property, area: 'safety', limit: q.limit }));
      if (q.id) {
        const r = await col.findOne({ _id: oid(q.id), property });
        if (!r) return { statusCode: 404, body: 'Not found' };
        await audit(db, { property, user, area: 'safety', action: 'view', entityId: r._id });
        return out(200, presentRecord(r));
      }
      if (q.list) {
        const f = { property };
        if (q.status && RESTRICTION_STATUSES.includes(q.status)) f.status = q.status;
        const rows = await col.find(f).sort({ updatedAt: -1 }).limit(500).toArray();
        await audit(db, { property, user, area: 'safety', action: 'list', detail: { count: rows.length, status: q.status || 'all' } });
        return out(200, rows.map(presentRecord));
      }
      return { statusCode: 400, body: 'Bad request' };
    }

    const now = new Date().toISOString();

    if (event.httpMethod === 'POST' && body.action === 'screen') {
      // Any staff role may screen; result is projected per role.
      const name = String(body.guestName || '').trim().slice(0, 120);
      if (name.length < 3) return { statusCode: 400, body: 'Enter the guest\u2019s full name' };
      const { checkId, hits } = await screenGuest(db, { property, guestName: name, guestLogId: body.guestLogId, user, source: 'staff-screen' });
      if (!hits.length) { await audit(db, { property, user, area: 'safety', action: 'screen-clear' }); return out(200, { checkId: null, hits: [] }); }
      return out(200, { checkId, hits: hits.map(h => projectForCheck(h.record, user, h.level)) });
    }

    if (event.httpMethod === 'POST' && (body.action === 'report' || body.action === 'create')) {
      if (!admin && !rec) return { statusCode: 403, body: 'Only an REC or Reslife Admin can submit a restriction report' };
      const r = cleanRestriction(body);
      if (!r.name) return { statusCode: 400, body: 'Name is required' };
      if (r.subjectType === 'resident') {
        if (!r.residentId) return { statusCode: 400, body: 'Select the resident record' };
        const res = await db.collection('reslife_directory').findOne({ _id: oid(r.residentId), property }, { projection: { _id: 1 } });
        if (!res) return { statusCode: 400, body: 'Resident not found in this property' };
      }
      const doc = Object.assign(r, { property, status: 'pending_verification', verifiedBy: '', verifiedAt: '', createdBy: user.sub, createdAt: now, updatedBy: user.sub, updatedAt: now, history: [{ at: now, by: user.sub, action: 'created', note: 'Pending verification' }] });
      const ins = await col.insertOne(doc);
      await audit(db, { property, user, area: 'safety', action: 'create', entityId: ins.insertedId, detail: { subjectType: doc.subjectType } });
      return out(200, presentRecord(Object.assign({ _id: ins.insertedId }, doc)));
    }

    if (event.httpMethod === 'PUT' && body.action === 'resolve') {
      const c = await checks.findOne({ _id: oid(body.checkId), property });
      if (!c) return { statusCode: 404, body: 'Not found' };
      if (!CHECK_OUTCOMES.includes(body.outcome)) return { statusCode: 400, body: 'Invalid outcome' };
      if (body.outcome === 'confirmed_match_escalated' && !admin && !rec) return { statusCode: 403, body: 'Only an REC or Reslife Admin can record a confirmed match' };
      const note = String(body.note || '').trim().slice(0, 1000);
      if (['confirmed_match_escalated', 'unable_to_verify', 'not_match_id_verified'].includes(body.outcome) && !note) return { statusCode: 400, body: 'Add a short note describing how identity was verified or why it could not be' };
      await checks.updateOne({ _id: c._id }, { $set: { outcome: body.outcome, resolvedBy: user.sub, resolvedAt: now, note } });
      if (c.guestLogId) await db.collection('reslife_guest_log').updateOne({ _id: oid(c.guestLogId), property }, { $set: { 'safetyReview.required': false, 'safetyReview.outcome': body.outcome, 'safetyReview.resolvedBy': user.sub, 'safetyReview.resolvedAt': now } });
      await audit(db, { property, user, area: 'safety', action: 'resolve-check', entityId: c._id, detail: { outcome: body.outcome } });
      return out(200, { success: true });
    }

    if (event.httpMethod === 'PUT') {
      if (!admin) return { statusCode: 403, body: 'Only a Reslife Admin can manage restriction records' };
      const r = await col.findOne({ _id: oid(body.id), property });
      if (!r) return { statusCode: 404, body: 'Not found' };

      if (body.action === 'update') {
        const u = cleanRestriction(Object.assign({}, r, body));
        if (!u.name) return { statusCode: 400, body: 'Name is required' };
        if (r.status === 'active') { const miss = activationMissing(u); if (miss.length) return out(422, { error: 'An active restriction must keep its documentation', missing: miss }); }
        await col.updateOne({ _id: r._id }, { $set: Object.assign(u, { updatedBy: user.sub, updatedAt: now }), $push: { history: { at: now, by: user.sub, action: 'updated', note: String(body.changeNote || '').slice(0, 300) } } });
        await audit(db, { property, user, area: 'safety', action: 'update', entityId: r._id });
        return out(200, presentRecord(await col.findOne({ _id: r._id })));
      }
      if (body.action === 'verify') {
        const merged = cleanRestriction(Object.assign({}, r, body));
        const miss = activationMissing(merged);
        if (miss.length) return out(422, { error: 'Official documentation is incomplete', missing: miss });
        if (!body.attest) return { statusCode: 400, body: 'Confirm that you reviewed the official documentation or Campus Safety authorization' };
        if (!['pending_verification', 'expired'].includes(effectiveRestrictionStatus(r))) return { statusCode: 400, body: 'Only pending or expired records can be verified' };
        await col.updateOne({ _id: r._id }, { $set: Object.assign(merged, { status: 'active', verifiedBy: user.sub, verifiedAt: now, updatedBy: user.sub, updatedAt: now }), $push: { history: { at: now, by: user.sub, action: 'verified', note: 'Activated after documentation review' } } });
        await audit(db, { property, user, area: 'safety', action: 'verify', entityId: r._id });
        return out(200, presentRecord(await col.findOne({ _id: r._id })));
      }
      if (body.action === 'status') {
        const to = body.to;
        if (!['revoked', 'expired', 'pending_verification'].includes(to)) return { statusCode: 400, body: 'Use "verify" to activate a record' };
        const note = String(body.note || '').trim().slice(0, 500);
        if (!note) return { statusCode: 400, body: 'A reason is required' };
        await col.updateOne({ _id: r._id }, { $set: { status: to, updatedBy: user.sub, updatedAt: now }, $push: { history: { at: now, by: user.sub, action: to, note } } });
        await audit(db, { property, user, area: 'safety', action: 'status', entityId: r._id, detail: { from: r.status, to } });
        return out(200, presentRecord(await col.findOne({ _id: r._id })));
      }
      return { statusCode: 400, body: 'Unknown action' };
    }
    // No DELETE: records are retained per policy; use Revoked. (Retention/deletion policy is an open decision.)
    return { statusCode: 405, body: 'Method Not Allowed' };
  } catch (e) {
    if (e instanceof SyntaxError) return { statusCode: 400, body: 'Invalid JSON' };
    console.error('[reslife-safety] error');
    return { statusCode: 500, body: 'Server error' };
  }
}
