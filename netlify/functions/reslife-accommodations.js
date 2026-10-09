import { verifyReqAuth } from './_auth.js';
import { getDb, ObjectId } from './_db.js';
import { audit, readAudit } from './_audit.js';
import { canAccessReslifeProperty, refreshReslifeUser, json } from './_reslife.js';
import {
  ACCOM_CATEGORIES, ACCOM_STATUSES, cleanAccommodation, accommodationErrors, effectiveAccomStatus, reviewDue, planImport,
  SENSITIVE_HINTS, isAdminTier, isRec,
} from './_safety.js';

/**
 * Housing Accommodations & Approved Animals — restricted Resident Profile section.
 *
 * Stores ONLY operational approval status. No diagnoses, medical history, letters or justification.
 * ESA, Service Animal and Housing Accommodation are separate categories (one record per resident per category).
 *
 * Collection reslife_accommodations
 *   { property, residentId, category, status, effectiveDate, reviewDate, expirationDate, verifyingDepartment,
 *     lastVerifiedAt, verificationRef, operationalNotes, createdBy, createdAt, updatedBy, updatedAt,
 *     importBatchId, history:[{ at, by, action, snapshot }] }
 *
 * Permissions (server-enforced, property-scoped)
 *   Reslife Admin / site admin : full view, create/edit status, directory filters, import, rollback, audit
 *   REC                        : per-resident read of category + effective status + operational notes only
 *   RA                         : no access (403)
 *
 * GET  ?property&residentId=X           admin: full; REC: limited projection. Audited.
 * GET  ?property&summary=1              admin: [{ residentId, category, status, reviewDue }] for directory filters. Audited.
 * GET  ?property&audit=1                admin: audit log
 * POST { action:'save', ...record }     admin: create/update one record (by residentId+category)
 * POST { action:'import', rows, dryRun, overwrite }  admin
 * POST { action:'rollback', batchId }   admin: undo an import batch
 */
const oid = id => { try { return new ObjectId(String(id)); } catch (e) { return null; } };
const FIELDS = ['status', 'effectiveDate', 'reviewDate', 'expirationDate', 'verifyingDepartment', 'lastVerifiedAt', 'verificationRef', 'operationalNotes'];
const snap = r => FIELDS.reduce((o, k) => (o[k] = r[k] || '', o), {});

function presentFull(r) {
  const o = Object.assign({}, r); o.id = String(r._id); delete o._id;
  o.effectiveStatus = effectiveAccomStatus(r);
  o.reviewDue = reviewDue(Object.assign({}, r, { status: o.effectiveStatus }));
  return o;
}
function presentLimited(r) {
  const st = effectiveAccomStatus(r);
  return { category: r.category, effectiveStatus: st, operationalNotes: st === 'approved' ? (r.operationalNotes || '') : '' };
}

export async function handler(event) {
  const user = verifyReqAuth(event);
  if (!user) return { statusCode: 401, body: 'Unauthorized' };
  const db = await getDb();
  await refreshReslifeUser(db, user);
  const q = event.queryStringParameters || {};
  const col = db.collection('reslife_accommodations');
  const out = (code, data) => { const r = json(code, data); r.headers['Cache-Control'] = 'no-store'; return r; };

  try {
    const body = event.httpMethod === 'GET' ? {} : JSON.parse(event.body || '{}');
    const property = q.property || body.property;
    if (!property) return { statusCode: 400, body: 'Missing property' };
    if (!canAccessReslifeProperty(user, property)) return { statusCode: 403, body: 'Forbidden' };
    const admin = isAdminTier(user), rec = isRec(user);
    if (!admin && !rec) return { statusCode: 403, body: 'Forbidden' };

    if (event.httpMethod === 'GET') {
      if (q.residentId) {
        const rows = await col.find({ property, residentId: String(q.residentId) }).toArray();
        await audit(db, { property, user, area: 'accommodations', action: 'view', entityId: q.residentId, detail: { records: rows.length } });
        if (admin) return out(200, { access: 'full', records: rows.map(presentFull) });
        return out(200, { access: 'limited', records: rows.map(presentLimited).filter(r => r.effectiveStatus === 'approved') });
      }
      if (!admin) return { statusCode: 403, body: 'Forbidden' };
      if (q.audit) return out(200, await readAudit(db, { property, area: 'accommodations', limit: q.limit }));
      if (q.summary) {
        const rows = await col.find({ property }, { projection: { residentId: 1, category: 1, status: 1, expirationDate: 1, reviewDate: 1, lastVerifiedAt: 1 } }).toArray();
        await audit(db, { property, user, area: 'accommodations', action: 'summary', detail: { count: rows.length } });
        return out(200, rows.map(r => { const st = effectiveAccomStatus(r); return { residentId: r.residentId, category: r.category, status: st, reviewDue: reviewDue(Object.assign({}, r, { status: st })), lastVerifiedAt: r.lastVerifiedAt || '' }; }));
      }
      return { statusCode: 400, body: 'Bad request' };
    }

    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
    if (!admin) return { statusCode: 403, body: 'Only a Reslife Admin can change accommodation records' };
    const now = new Date().toISOString();

    if (body.action === 'save') {
      const a = cleanAccommodation(body);
      const errs = accommodationErrors(a);
      if (SENSITIVE_HINTS.test(a.operationalNotes)) errs.push('Operational notes appear to include medical or diagnostic information. Record only what staff need to do (e.g., "Approved ESA: cat").');
      if (errs.length) return out(422, { error: 'Please fix the following', errors: errs });
      const res = await db.collection('reslife_directory').findOne({ _id: oid(a.residentId), property }, { projection: { _id: 1 } });
      if (!res) return out(422, { error: 'Resident not found in this property', errors: ['Resident not found'] });
      const prev = await col.findOne({ property, residentId: a.residentId, category: a.category });
      if (prev) {
        await col.updateOne({ _id: prev._id }, { $set: Object.assign(a, { updatedBy: user.sub, updatedAt: now }), $push: { history: { at: now, by: user.sub, action: 'updated', snapshot: snap(prev) } } });
      } else {
        await col.insertOne(Object.assign(a, { property, createdBy: user.sub, createdAt: now, updatedBy: user.sub, updatedAt: now, history: [{ at: now, by: user.sub, action: 'created', snapshot: null }] }));
      }
      await audit(db, { property, user, area: 'accommodations', action: prev ? 'update' : 'create', entityId: a.residentId, detail: { category: a.category, status: a.status } });
      const rows = await col.find({ property, residentId: a.residentId }).toArray();
      return out(200, { access: 'full', records: rows.map(presentFull) });
    }

    if (body.action === 'import') {
      const rows = Array.isArray(body.rows) ? body.rows : [];
      if (!rows.length) return { statusCode: 400, body: 'No rows' };
      if (rows.length > 2000) return { statusCode: 413, body: 'Import at most 2000 rows at a time' };
      const ids = [...new Set(rows.map(r => String(r.residentId || '').trim()).filter(Boolean))];
      const validOids = ids.map(oid).filter(Boolean);
      const known = new Set((await db.collection('reslife_directory').find({ property, _id: { $in: validOids } }, { projection: { _id: 1 } }).toArray()).map(r => String(r._id)));
      const existing = new Map((await col.find({ property, residentId: { $in: ids } }).toArray()).map(r => [r.residentId + '|' + r.category, r]));
      const plan = planImport(rows, known, existing, !!body.overwrite);
      const summary = plan.reduce((s, p) => (s[p.action] = (s[p.action] || 0) + 1, s), {});
      if (body.dryRun !== false) {
        await audit(db, { property, user, area: 'accommodations', action: 'import-dry-run', detail: summary });
        return out(200, { dryRun: true, summary, plan: plan.map(p => ({ row: p.row, action: p.action, errors: p.errors || [] })) });
      }
      if (summary.error) return out(422, { error: 'Fix all errors before importing (run the preview again).', summary, plan: plan.filter(p => p.action === 'error').map(p => ({ row: p.row, errors: p.errors })) });
      const batchId = 'imp_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      for (const p of plan) {
        if (p.action === 'create') await col.insertOne(Object.assign({}, p.record, { property, importBatchId: batchId, createdBy: user.sub, createdAt: now, updatedBy: user.sub, updatedAt: now, history: [{ at: now, by: user.sub, action: 'imported', batchId, snapshot: null }] }));
        if (p.action === 'update') {
          const prev = await col.findOne({ _id: oid(p.previousId), property });
          await col.updateOne({ _id: prev._id }, { $set: Object.assign({}, p.record, { importBatchId: batchId, updatedBy: user.sub, updatedAt: now }), $push: { history: { at: now, by: user.sub, action: 'imported', batchId, snapshot: snap(prev) } } });
        }
      }
      await audit(db, { property, user, area: 'accommodations', action: 'import', detail: Object.assign({ batchId }, summary) });
      return out(200, { dryRun: false, batchId, summary });
    }

    if (body.action === 'rollback') {
      const batchId = String(body.batchId || '');
      if (!/^imp_[a-z0-9]+$/.test(batchId)) return { statusCode: 400, body: 'Invalid batch id' };
      const rows = await col.find({ property, importBatchId: batchId }).toArray();
      let removed = 0, restored = 0, skipped = 0;
      for (const r of rows) {
        const h = (r.history || []).slice().reverse().find(x => x.batchId === batchId);
        const last = (r.history || [])[r.history.length - 1];
        if (!h) { skipped++; continue; }
        if (last !== h) { skipped++; continue; } // edited since import — leave for manual correction
        if (h.snapshot === null) { await col.deleteOne({ _id: r._id }); removed++; }
        else { await col.updateOne({ _id: r._id }, { $set: Object.assign({}, h.snapshot, { updatedBy: user.sub, updatedAt: now }), $unset: { importBatchId: '' }, $push: { history: { at: now, by: user.sub, action: 'rollback', batchId, snapshot: snap(r) } } }); restored++; }
      }
      await audit(db, { property, user, area: 'accommodations', action: 'rollback', detail: { batchId, removed, restored, skipped } });
      return out(200, { removed, restored, skipped });
    }
    return { statusCode: 400, body: 'Unknown action' };
  } catch (e) {
    if (e instanceof SyntaxError) return { statusCode: 400, body: 'Invalid JSON' };
    console.error('[reslife-accommodations] error');
    return { statusCode: 500, body: 'Server error' };
  }
}

export { ACCOM_CATEGORIES, ACCOM_STATUSES };
