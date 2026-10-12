import { verifyReqAuth } from './_auth.js';
import { getDb, ObjectId } from './_db.js';
import { refreshReslifeUser, json } from './_reslife.js';
import { displayName } from './_units.js';
import {
  canUseConduct, canViewMeeting, isConductAdmin, sanitizeData, validateForSubmit, diffData, emptyData,
  buildDocx, buildPdf, TEMPLATE_VERSION, TEMPLATE_MAPPING, ROUTING, EDUCATION, OUTCOMES, CLOSEOUT, DOC_NOTE, FIELD_LABELS,
} from './_conduct.js';

/**
 * Reslife Hub — Conduct Meeting Notes (REC + ADMIN only; RAs and every other role get 403).
 *
 * Collections
 *   reslife_conduct_meetings  { _id, property, status: draft|submitting|submitted|amending|amended|discarded,
 *                               data:{...wizard fields, residentId, residentName/bedspace snapshots}, saveSeq, lastStep,
 *                               createdBy, createdByName, createdAt, updatedAt, updatedBy, submittedBy, submittedByName,
 *                               submittedAt, lastAmendedAt, lastAmendedBy, templateVersion, documentVersion,
 *                               docxFileId, pdfFileId, pdfEngine }
 *   reslife_conduct_versions  { meetingId, property, version, kind: original|amendment, data, reason, changes[], by, byName, at,
 *                               templateVersion, docxFileId, pdfFileId, pdfEngine }   — never updated or deleted
 *   reslife_conduct_files     { property, meetingId, version, format: docx|pdf, filename, mime, size, data(base64 string, same pattern as reslife_program_files), createdAt }
 *   reslife_conduct_audit     { property, meetingId, action, by, at, detail }
 *
 * GET  ?property                       list (drafts: own, or all for admin tier)  [&status=&q=&residentId=]
 * GET  ?property&meta=1                official option wording + template mapping
 * GET  ?property&staff=1               REC/Admin/RA accounts for Staff Present
 * GET  ?property&id                    one meeting (+ versions)
 * GET  ?property&id&history=1          versions + audit trail
 * GET  ?property&id&file=docx|pdf[&version=n][&inline=1]   stored official document (auth required, no-store)
 * GET  ?property&id&preview=docx|pdf   render the saved draft without storing it
 * POST {action:'create'|'submit'|'amend'|'discard'}
 * PUT  {id, seq, data, lastStep}       autosave (older seq never overwrites newer)
 */
const MEETINGS = 'reslife_conduct_meetings', VERSIONS = 'reslife_conduct_versions', FILES = 'reslife_conduct_files', AUDIT = 'reslife_conduct_audit';
const LOCK_MS = 2 * 60 * 1000;
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const oid = s => { try { return /^[a-f0-9]{24}$/i.test(String(s)) ? new ObjectId(String(s)) : null; } catch (e) { return null; } };
const err = (status, error, extra) => json(status, Object.assign({ error }, extra || {}));

async function staffName(db, username) {
  const u = await db.collection('users').findOne({ username });
  return (u && u.fullName) || username;
}
async function audit(db, m, action, user, detail) {
  await db.collection(AUDIT).insertOne({ property: m.property, meetingId: String(m._id), action, by: user.sub, at: new Date().toISOString(), detail: detail || '' });
}
function summary(m) {
  const d = m.data || {};
  return {
    id: String(m._id), status: m.status, residentId: d.residentId || '', residentName: d.residentName || '', bedspace: d.bedspace || '',
    bedspaceNeedsReview: !!d.bedspaceNeedsReview, incidentViolation: d.incidentViolation || '', meetingDateTime: d.meetingDateTime || '',
    createdBy: m.createdBy, createdByName: m.createdByName || m.createdBy, createdAt: m.createdAt, updatedAt: m.updatedAt,
    submittedAt: m.submittedAt || null, submittedByName: m.submittedByName || '', lastAmendedAt: m.lastAmendedAt || null,
    documentVersion: m.documentVersion || 0, lastStep: m.lastStep || 0,
  };
}
function full(m) { return Object.assign(summary(m), { data: Object.assign(emptyData(), m.data || {}), saveSeq: m.saveSeq || 0, templateVersion: m.templateVersion || TEMPLATE_VERSION, pdfEngine: m.pdfEngine || '' }); }
const fileName = (m, version, ext) => `Resident Accountability Meeting Record - ${(m.data.residentName || 'Resident').replace(/[^\w .-]/g, '')} - ${(m.data.meetingDateTime || '').slice(0, 10)} - v${version}.${ext}`;

/** Resident Directory is the source of truth: the snapshot name always comes from it. */
async function applyDirectory(db, property, data) {
  if (!data.residentId) { data.residentName = ''; return null; }
  const res = await db.collection('reslife_directory').findOne({ _id: new ObjectId(data.residentId), property });
  if (!res) return null;
  data.residentName = displayName(res.residentName) || res.residentName;
  const dirUnit = String(res.unit || res.room || '').trim();
  if (!data.bedspace && dirUnit) { data.bedspace = dirUnit; data.bedspaceSource = 'directory'; }
  if (data.bedspace && data.bedspace === dirUnit) data.bedspaceSource = 'directory';
  else if (data.bedspace && data.bedspaceSource === 'directory') data.bedspaceSource = 'manual';
  data.bedspaceNeedsReview = !dirUnit; // no confirmed directory bedspace -> flagged, never invented
  return res;
}

async function generateAndStore(db, m, data, version) {
  const meta = { meetingId: String(m._id), version };
  const docx = await buildDocx(data, meta);
  const pdf = await buildPdf(data, meta, docx);
  if (!docx.length || !pdf.buffer.length) throw new Error('Document generation produced an empty file');
  const now = new Date().toISOString();
  const files = db.collection(FILES);
  const d1 = { property: m.property, meetingId: String(m._id), version, format: 'docx', filename: fileName({ data }, version, 'docx'), mime: DOCX_MIME, size: docx.length, data: docx.toString('base64'), createdAt: now };
  const d2 = { property: m.property, meetingId: String(m._id), version, format: 'pdf', filename: fileName({ data }, version, 'pdf'), mime: 'application/pdf', size: pdf.buffer.length, data: pdf.buffer.toString('base64'), createdAt: now };
  await files.insertOne(d1); await files.insertOne(d2);
  return { docxFileId: String(d1._id), pdfFileId: String(d2._id), pdfEngine: pdf.engine };
}
async function removeFiles(db, ids) { for (const id of ids.filter(Boolean)) { const o = oid(id); if (o) await db.collection(FILES).deleteOne({ _id: o }); } }

export async function handler(event) {
  const user = verifyReqAuth(event);
  if (!user) return err(401, 'Unauthorized');
  const db = await getDb();
  await refreshReslifeUser(db, user);
  const col = db.collection(MEETINGS);
  const q = event.queryStringParameters || {};
  let body = {};
  if (event.body) { try { body = JSON.parse(event.body); } catch (e) { return err(400, 'Invalid JSON'); } }
  const property = q.property || body.property;
  if (!property) return err(400, 'Missing property');
  if (!canUseConduct(user, property)) return err(403, 'Forbidden');

  const loadMeeting = async id => { const o = oid(id); if (!o) return null; const m = await col.findOne({ _id: o, property }); return m && canViewMeeting(user, m) && m.status !== 'discarded' ? m : null; };

  try {
    if (event.httpMethod === 'GET') {
      if (q.meta) return json(200, { templateVersion: TEMPLATE_VERSION, routing: ROUTING, education: EDUCATION, outcomes: OUTCOMES, closeout: CLOSEOUT, docNote: DOC_NOTE, mapping: TEMPLATE_MAPPING, labels: FIELD_LABELS });
      if (q.staff) {
        const users = await db.collection('users').find({ role: { $in: ['reslife-rec', 'reslife-admin', 'reslife-ra'] }, properties: property }).sort({ fullName: 1 }).toArray();
        return json(200, users.map(u => ({ username: u.username, name: u.fullName || u.username, role: u.role })));
      }
      if (q.id) {
        const m = await loadMeeting(q.id);
        if (!m) return err(404, 'Not found');
        if (q.file) {
          const fmt = q.file === 'docx' ? 'docx' : q.file === 'pdf' ? 'pdf' : null;
          if (!fmt || !['submitted', 'amended'].includes(m.status)) return err(404, 'No official document for this record');
          const version = q.version ? parseInt(q.version, 10) : m.documentVersion;
          const f = await db.collection(FILES).findOne({ meetingId: String(m._id), property, version, format: fmt });
          if (!f) return err(404, 'File not found');
          await audit(db, m, 'download', user, `${fmt} v${version}`);
          return { statusCode: 200, isBase64Encoded: true, body: String(f.data), headers: { 'Content-Type': f.mime, 'Content-Disposition': `${q.inline && fmt === 'pdf' ? 'inline' : 'attachment'}; filename="${f.filename}"`, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } };
        }
        if (q.preview) {
          const data = Object.assign(emptyData(), m.data);
          const meta = { meetingId: String(m._id), version: (m.documentVersion || 0) + (m.status === 'draft' ? 1 : 0) };
          if (q.preview === 'docx') { const b = await buildDocx(data, meta); return { statusCode: 200, isBase64Encoded: true, body: b.toString('base64'), headers: { 'Content-Type': DOCX_MIME, 'Content-Disposition': 'attachment; filename="PREVIEW - ' + fileName(m, meta.version, 'docx') + '"', 'Cache-Control': 'private, no-store' } }; }
          const p = await buildPdf(data, meta);
          return { statusCode: 200, isBase64Encoded: true, body: p.buffer.toString('base64'), headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'inline; filename="preview.pdf"', 'Cache-Control': 'private, no-store' } };
        }
        if (q.history) {
          const versions = await db.collection(VERSIONS).find({ meetingId: String(m._id), property }).sort({ version: 1 }).toArray();
          const events = await db.collection(AUDIT).find({ meetingId: String(m._id), property }).sort({ at: -1 }).limit(200).toArray();
          return json(200, { versions: versions.map(v => ({ version: v.version, kind: v.kind, reason: v.reason || '', changes: v.changes || [], by: v.by, byName: v.byName, at: v.at, templateVersion: v.templateVersion, data: v.data })), audit: events.map(e => ({ action: e.action, by: e.by, at: e.at, detail: e.detail })) });
        }
        const out = full(m);
        out.versions = (await db.collection(VERSIONS).find({ meetingId: String(m._id), property }).sort({ version: 1 }).toArray()).map(v => ({ version: v.version, kind: v.kind, at: v.at, byName: v.byName, reason: v.reason || '' }));
        return json(200, out);
      }
      // List
      const filter = { property, status: { $nin: ['discarded'] } };
      if (q.residentId) { filter['data.residentId'] = String(q.residentId); filter.status = { $in: ['submitted', 'amended', 'amending'] }; }
      let rows = await col.find(filter).sort({ updatedAt: -1 }).limit(1000).toArray();
      rows = rows.filter(m => canViewMeeting(user, m));
      if (q.status) rows = rows.filter(m => m.status === q.status);
      if (q.q) { const s = String(q.q).toLowerCase(); rows = rows.filter(m => [m.data && m.data.residentName, m.data && m.data.bedspace, m.data && m.data.incidentViolation, m.createdByName].some(v => String(v || '').toLowerCase().includes(s))); }
      return json(200, rows.map(summary));
    }

    if (event.httpMethod === 'PUT') {
      // Autosave: conditional on status=draft and a strictly newer client sequence number.
      const m = await loadMeeting(body.id);
      if (!m) return err(404, 'Not found');
      if (m.status !== 'draft') return err(409, 'This record has been submitted. Use the amendment process to change it.', { status: m.status });
      const seq = Number(body.seq);
      if (!Number.isFinite(seq) || seq <= 0) return err(400, 'Missing save sequence');
      const { data, errors } = sanitizeData(body.data);
      if (errors.length) return err(422, 'Not saved', { errors });
      if (data.residentId && !(await applyDirectory(db, property, data))) return err(422, 'Not saved', { errors: ['Selected resident was not found in the Resident Directory'] });
      const now = new Date().toISOString();
      const lastStep = Math.max(0, Math.min(6, parseInt(body.lastStep, 10) || 0));
      const r = await col.updateOne({ _id: m._id, status: 'draft', $or: [{ saveSeq: { $lt: seq } }, { saveSeq: { $exists: false } }] }, { $set: { data, saveSeq: seq, lastStep, updatedAt: now, updatedBy: user.sub } });
      if (!r.matchedCount) {
        const cur = await col.findOne({ _id: m._id });
        if (cur && cur.status !== 'draft') return err(409, 'This record has been submitted.', { status: cur.status });
        return json(200, { ok: false, stale: true, saveSeq: cur ? cur.saveSeq : 0 });
      }
      return json(200, { ok: true, saveSeq: seq, updatedAt: now, data });
    }

    if (event.httpMethod === 'POST') {
      const action = body.action;
      if (action === 'create') {
        const now = new Date().toISOString();
        const name = await staffName(db, user.sub);
        const { data } = sanitizeData(Object.assign(emptyData(), body.data || {}));
        if (!data.staffPresent.length) data.staffPresent = [{ name, username: user.sub }];
        if (data.residentId) await applyDirectory(db, property, data);
        const doc = { property, status: 'draft', data, saveSeq: 0, lastStep: 0, createdBy: user.sub, createdByName: name, createdAt: now, updatedAt: now, updatedBy: user.sub, templateVersion: TEMPLATE_VERSION, documentVersion: 0 };
        await col.insertOne(doc);
        await audit(db, doc, 'created', user);
        return json(201, full(doc));
      }

      const m = await loadMeeting(body.id);
      if (!m) return err(404, 'Not found');

      if (action === 'preview') {
        // Renders unsaved amendment text for review. Nothing is stored.
        const s = sanitizeData(body.data);
        if (s.errors.length) return err(422, 'Cannot preview', { errors: s.errors });
        s.data.residentId = m.data.residentId; s.data.residentName = m.data.residentName;
        const p = await buildPdf(s.data, { meetingId: String(m._id), version: (m.documentVersion || 0) + 1 });
        return json(200, { pdf: p.buffer.toString('base64') });
      }

      if (action === 'discard') {
        if (m.status !== 'draft') return err(409, 'Submitted records cannot be discarded');
        if (m.createdBy !== user.sub && !isConductAdmin(user)) return err(403, 'Forbidden');
        await col.updateOne({ _id: m._id, status: 'draft' }, { $set: { status: 'discarded', updatedAt: new Date().toISOString(), updatedBy: user.sub } });
        await audit(db, m, 'draft_discarded', user);
        return json(200, { ok: true });
      }

      if (action === 'submit') {
        if (['submitted', 'amended'].includes(m.status)) return json(200, Object.assign(full(m), { alreadySubmitted: true }));
        // Last unsaved edits may ride along with the submit; they go through the same sanitising.
        let data = Object.assign(emptyData(), m.data);
        if (body.data) {
          const s = sanitizeData(body.data);
          if (s.errors.length) return err(422, 'Not submitted', { errors: s.errors });
          data = s.data;
        }
        const resident = data.residentId ? await applyDirectory(db, property, data) : null;
        const missing = validateForSubmit(data);
        if (data.residentId && !resident) missing.unshift('Resident (the selected resident is no longer in the Resident Directory)');
        if (missing.length) return err(422, 'Required information is missing', { missing });

        const now = new Date();
        const lock = await col.updateOne(
          { _id: m._id, $or: [{ status: 'draft' }, { status: 'submitting', submitLockAt: { $lt: new Date(now - LOCK_MS).toISOString() } }] },
          { $set: { status: 'submitting', submitLockAt: now.toISOString(), data } });
        if (!lock.matchedCount) {
          const cur = await col.findOne({ _id: m._id });
          if (cur && ['submitted', 'amended'].includes(cur.status)) return json(200, Object.assign(full(cur), { alreadySubmitted: true }));
          return err(409, 'This meeting record is already being submitted. Please wait.');
        }
        let files = null, versionId = null;
        try {
          files = await generateAndStore(db, m, data, 1);
          const name = await staffName(db, user.sub);
          const v = { meetingId: String(m._id), property, version: 1, kind: 'original', data, reason: '', changes: [], by: user.sub, byName: name, at: now.toISOString(), templateVersion: TEMPLATE_VERSION, ...files };
          await db.collection(VERSIONS).insertOne(v); versionId = v._id;
          const fin = await col.updateOne({ _id: m._id, status: 'submitting' }, { $set: { status: 'submitted', submittedBy: user.sub, submittedByName: name, submittedAt: now.toISOString(), updatedAt: now.toISOString(), updatedBy: user.sub, documentVersion: 1, templateVersion: TEMPLATE_VERSION, ...files }, $unset: { submitLockAt: '' } });
          if (!fin.matchedCount) throw new Error('Submission lock was lost');
        } catch (e) {
          if (files) await removeFiles(db, [files.docxFileId, files.pdfFileId]);
          if (versionId) await db.collection(VERSIONS).deleteOne({ _id: versionId });
          await col.updateOne({ _id: m._id, status: 'submitting' }, { $set: { status: 'draft' }, $unset: { submitLockAt: '' } });
          await audit(db, m, 'submit_failed', user, String(e.message || e).slice(0, 300));
          return err(500, 'Submission failed — the record was NOT submitted and remains a draft. ' + (e.message || ''));
        }
        await audit(db, m, 'submitted', user, 'v1');
        return json(200, Object.assign(full(await col.findOne({ _id: m._id })), { submitted: true }));
      }

      if (action === 'amend') {
        if (!['submitted', 'amended'].includes(m.status)) return err(409, 'Only submitted records can be amended');
        const reason = String(body.reason || '').trim();
        if (reason.length < 5) return err(422, 'A reason for the correction is required', { missing: ['Reason for amendment'] });
        if (reason.length > 2000) return err(422, 'Reason is too long');
        const s = sanitizeData(body.data);
        if (s.errors.length) return err(422, 'Not amended', { errors: s.errors });
        const data = s.data;
        data.residentId = m.data.residentId; // the resident link of a submitted record never changes
        await applyDirectory(db, property, data);
        data.residentName = m.data.residentName; // historical snapshot preserved
        const missing = validateForSubmit(data);
        if (missing.length) return err(422, 'Required information is missing', { missing });
        const changes = diffData(m.data, data);
        if (!changes.length) return err(422, 'No changes to amend');
        const now = new Date().toISOString();
        const prevStatus = m.status, version = (m.documentVersion || 1) + 1;
        const lock = await col.updateOne({ _id: m._id, status: prevStatus, documentVersion: m.documentVersion }, { $set: { status: 'amending', submitLockAt: now } });
        if (!lock.matchedCount) return err(409, 'This record was changed by someone else. Reload and try again.');
        let files = null, versionId = null;
        try {
          files = await generateAndStore(db, m, data, version);
          const name = await staffName(db, user.sub);
          const v = { meetingId: String(m._id), property, version, kind: 'amendment', data, reason, changes, by: user.sub, byName: name, at: now, templateVersion: TEMPLATE_VERSION, ...files };
          await db.collection(VERSIONS).insertOne(v); versionId = v._id;
          await col.updateOne({ _id: m._id, status: 'amending' }, { $set: { status: 'amended', data, documentVersion: version, lastAmendedAt: now, lastAmendedBy: user.sub, updatedAt: now, updatedBy: user.sub, ...files }, $unset: { submitLockAt: '' } });
        } catch (e) {
          if (files) await removeFiles(db, [files.docxFileId, files.pdfFileId]);
          if (versionId) await db.collection(VERSIONS).deleteOne({ _id: versionId });
          await col.updateOne({ _id: m._id, status: 'amending' }, { $set: { status: prevStatus }, $unset: { submitLockAt: '' } });
          await audit(db, m, 'amend_failed', user, String(e.message || e).slice(0, 300));
          return err(500, 'Amendment failed — the record was not changed. ' + (e.message || ''));
        }
        await audit(db, m, 'amended', user, `v${version}: ${reason}`);
        return json(200, Object.assign(full(await col.findOne({ _id: m._id })), { amended: true }));
      }
      return err(400, 'Unknown action');
    }
    return err(405, 'Method not allowed');
  } catch (e) {
    return err(500, 'Server error: ' + (e.message || e));
  }
}
