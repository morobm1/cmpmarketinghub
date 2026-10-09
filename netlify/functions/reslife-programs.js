import { verifyReqAuth } from './_auth.js';
import { getDb, ObjectId } from './_db.js';
import { notify } from './_notify.js';
import { audit, readAudit } from './_audit.js';
import { canAccessReslifeProperty, isReslifeManager, isReslifeAdmin, refreshReslifeUser, managersForReslifeProperty, json } from './_reslife.js';
import {
  FORMATS, PROGRAM_TYPES, STATUSES, VISIBLE_TO_ALL, normalizeStatus, mergeSettings, cleanItems, cleanVendors, cleanTasks,
  defaultTasks, computeBudget, policyWarnings, canTransition, isMaterialChange, missingForSubmit, cleanEvaluation, str_ as str, num_ as num,
} from './_programs.js';

/**
 * Reslife Hub — Program Proposals (one record = proposal + Action Item List + budget + checklist +
 * review history + post-event evaluation).
 *
 * Collections
 *   reslife_programs          program records (legacy docs remain valid: `shoppingList` is read as `items`,
 *                             status 'proposed' is read as 'submitted'; nothing is deleted or rewritten in bulk)
 *   reslife_program_settings  { property, categories[], purchaseTypes[], foodPurchaseTypes[], defaultTasks[], rules{}, approvalThreshold, defaultBudget }
 *   reslife_program_files     { property, programId, name, mime, size, data(base64), createdBy, createdAt } — auth-gated, never public
 *   reslife_audit_log         via _audit.js
 *
 * GET    ?property                       list visible programs (+ computed budget / warnings)
 * GET    ?property&settings=1            settings + staff picker list
 * GET    ?property&id&history=1          audit history for one program (members + managers)
 * GET    ?property&file=<id>             attachment (members + managers of its program)
 * POST   { property, ...fields }         create
 * POST   { action:'duplicate', id }      copy a program/template into a new draft owned by the caller
 * POST   { action:'upload', programId, name, mime, data }  attach an image/PDF (<= 1.5 MB)
 * PUT    { id, property, version, ...fields }           edit content (optimistic concurrency on `version`)
 * PUT    { action:'status', id, property, to, comment }  workflow transition
 * PUT    { action:'evaluation', id, property, evaluation }
 * PUT    { action:'settings', property, settings }       Reslife Admin / site admin
 * DELETE ?id&property
 */

const MAX_FILE = 1.5 * 1024 * 1024;
const FILE_MIME = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf'];
const isMgr = u => u.role === 'admin' || isReslifeManager(u.role);
const isAdm = u => u.role === 'admin' || isReslifeAdmin(u.role);
const isMember = (p, u) => p.createdBy === u.sub || p.owner === u.sub || (p.collaborators || []).includes(u.sub);
const canView = (p, u) => isMgr(u) || isMember(p, u) || p.isTemplate || VISIBLE_TO_ALL.includes(normalizeStatus(p.status));
const oid = id => { try { return new ObjectId(String(id)); } catch (e) { return null; } };
const isoOrNull = v => { if (!v) return null; const d = new Date(v); return isNaN(d) ? null : d.toISOString(); };
const users = v => [...new Set((Array.isArray(v) ? v : []).map(x => str(x, 80)).filter(Boolean))].slice(0, 20);

async function loadSettings(db, property) {
  return mergeSettings(await db.collection('reslife_program_settings').findOne({ property }));
}

/** Present a stored doc in the current shape without mutating storage. */
function present(d, settings, user) {
  const p = Object.assign({}, d);
  p.id = String(d._id); delete p._id;
  p.status = normalizeStatus(d.status);
  p.items = Array.isArray(d.items) ? d.items : cleanItems(d.shoppingList || []);
  delete p.shoppingList;
  p.programType = PROGRAM_TYPES.includes(d.programType) ? d.programType : 'individual';
  p.owner = d.owner || d.createdBy;
  p.collaborators = d.collaborators || [];
  p.vendors = d.vendors || [];
  p.tasks = d.tasks || [];
  p.version = d.version || 0;
  p.budgetSummary = computeBudget(p.items, p.vendors, d.approvedBudget);
  p.warnings = policyWarnings(p, settings);
  p.canEdit = isMgr(user) || (isMember(d, user) && !['completed', 'rejected', 'cancelled'].includes(p.status));
  delete p.history; // history is served separately through the audit log endpoint
  return p;
}

/** Whitelisted content fields shared by create + update. Returns only keys present in body. */
function contentFields(body, settings) {
  const u = {};
  const s = (k, max) => { if (body[k] !== undefined) u[k] = str(body[k], max); };
  s('title', 200); s('month', 20); s('location', 200); s('audience', 300); s('category', 80); s('rec', 80); s('weekLabel', 60);
  s('description', 6000); s('objectives', 3000); s('engagementGoals', 3000); s('categoryConnection', 2000); s('outcomes', 3000);
  s('spaceReservation', 2000); s('equipment', 2000); s('setup', 2000); s('marketing', 2000); s('accessibility', 2000); s('otherNeeds', 2000);
  if (body.type !== undefined) u.type = FORMATS.includes(body.type) ? body.type : 'active';
  if (body.programType !== undefined) u.programType = PROGRAM_TYPES.includes(body.programType) ? body.programType : 'individual';
  if (body.eventDate !== undefined) u.eventDate = isoOrNull(body.eventDate);
  if (body.endDate !== undefined) u.endDate = isoOrNull(body.endDate);
  if (body.estAttendance !== undefined) u.estAttendance = body.estAttendance === '' || body.estAttendance == null ? null : Math.round(num(body.estAttendance));
  if (body.budget !== undefined) u.budget = num(body.budget); // legacy requested-budget field, kept for compatibility
  if (body.stations !== undefined) u.stations = (Array.isArray(body.stations) ? body.stations : []).slice(0, 50).map(x => typeof x === 'string' ? { station: str(x, 200), people: '', location: '', job: '' } : { station: str(x.station, 200), people: str(x.people, 200), location: str(x.location, 200), job: str(x.job, 300) }).filter(x => x.station || x.people || x.job);
  if (body.items !== undefined || body.shoppingList !== undefined) u.items = cleanItems(body.items !== undefined ? body.items : body.shoppingList);
  if (body.noItems !== undefined) u.noItems = !!body.noItems;
  if (body.vendors !== undefined) u.vendors = cleanVendors(body.vendors);
  if (body.tasks !== undefined) u.tasks = cleanTasks(body.tasks);
  if (body.collaborators !== undefined) u.collaborators = users(body.collaborators);
  if (body.owner !== undefined) u.owner = str(body.owner, 80);
  if (u.category && settings && !settings.categories.includes(u.category)) u.category = u.category; // retired categories stay readable
  return u;
}

export async function handler(event) {
  const user = verifyReqAuth(event);
  if (!user) return { statusCode: 401, body: 'Unauthorized' };
  const db = await getDb();
  await refreshReslifeUser(db, user);
  const col = db.collection('reslife_programs');
  const q = event.queryStringParameters || {};

  try {
    if (event.httpMethod === 'GET') {
      const property = q.property;
      if (!property) return { statusCode: 400, body: 'Missing property' };
      if (!canAccessReslifeProperty(user, property)) return { statusCode: 403, body: 'Forbidden' };
      const settings = await loadSettings(db, property);

      if (q.settings) {
        const staff = await db.collection('users').find({ properties: property, role: { $in: ['reslife-ra', 'reslife-rec', 'reslife-admin'] } }, { projection: { _id: 0, username: 1, fullName: 1, role: 1 } }).sort({ fullName: 1 }).toArray();
        return json(200, { settings, staff, canAdmin: isAdm(user) });
      }
      if (q.file) {
        const f = await db.collection('reslife_program_files').findOne({ _id: oid(q.file), property });
        if (!f) return { statusCode: 404, body: 'Not found' };
        const p = await col.findOne({ _id: oid(f.programId), property });
        if (!p || !canView(p, user)) return { statusCode: 403, body: 'Forbidden' };
        return { statusCode: 200, headers: { 'Content-Type': f.mime, 'Cache-Control': 'private, no-store', 'Content-Disposition': `inline; filename="${String(f.name).replace(/[^\w.\- ]/g, '_')}"` }, body: f.data, isBase64Encoded: true };
      }
      if (q.id && q.history) {
        const p = await col.findOne({ _id: oid(q.id), property });
        if (!p) return { statusCode: 404, body: 'Not found' };
        if (!isMgr(user) && !isMember(p, user)) return { statusCode: 403, body: 'Forbidden' };
        return json(200, await readAudit(db, { property, area: 'programs', entityId: q.id, limit: 200 }));
      }
      const filter = { property };
      if (!isMgr(user)) filter.$or = [{ createdBy: user.sub }, { owner: user.sub }, { collaborators: user.sub }, { isTemplate: true }, { status: { $in: VISIBLE_TO_ALL } }];
      const docs = await col.find(filter).sort({ eventDate: 1, createdAt: -1 }).toArray();
      return json(200, docs.filter(d => canView(d, user)).map(d => present(d, settings, user)));
    }

    const body = JSON.parse(event.body || '{}');
    const property = body.property || q.property;
    if (!property) return { statusCode: 400, body: 'Missing property' };
    if (!canAccessReslifeProperty(user, property)) return { statusCode: 403, body: 'Forbidden' };
    const settings = await loadSettings(db, property);
    const now = new Date().toISOString();

    if (event.httpMethod === 'POST' && body.action === 'upload') {
      const p = await col.findOne({ _id: oid(body.programId), property });
      if (!p) return { statusCode: 404, body: 'Program not found' };
      if (!isMgr(user) && !isMember(p, user)) return { statusCode: 403, body: 'Forbidden' };
      const mime = String(body.mime || ''); const data = String(body.data || '').replace(/^data:[^;]+;base64,/, '');
      if (!FILE_MIME.includes(mime)) return { statusCode: 400, body: 'Only PNG, JPEG, WebP, GIF or PDF files are allowed' };
      const size = Math.floor(data.length * 3 / 4);
      if (!data || size > MAX_FILE) return { statusCode: 413, body: 'File must be 1.5 MB or smaller' };
      const r = await db.collection('reslife_program_files').insertOne({ property, programId: String(p._id), name: str(body.name, 120) || 'file', mime, size, data, createdBy: user.sub, createdAt: now });
      await audit(db, { property, user, area: 'programs', action: 'attach', entityId: p._id, detail: { mime, size } });
      return json(200, { id: String(r.insertedId), name: str(body.name, 120), mime, size });
    }

    if (event.httpMethod === 'POST' && body.action === 'duplicate') {
      const src = await col.findOne({ _id: oid(body.id), property });
      if (!src || !canView(src, user)) return { statusCode: 404, body: 'Not found' };
      const base = present(src, settings, user);
      const copy = {
        property, title: (body.title ? str(body.title, 200) : `${base.title} (copy)`), type: base.type || 'active', programType: base.programType,
        category: base.category || '', audience: base.audience || '', estAttendance: base.estAttendance ?? null, location: base.location || '', month: '',
        eventDate: null, endDate: null, description: base.description || '', objectives: base.objectives || '', engagementGoals: base.engagementGoals || '',
        categoryConnection: base.categoryConnection || '', outcomes: base.outcomes || '', spaceReservation: base.spaceReservation || '', equipment: base.equipment || '',
        setup: base.setup || '', marketing: base.marketing || '', accessibility: base.accessibility || '', otherNeeds: base.otherNeeds || '',
        stations: base.stations || [], noItems: !!base.noItems,
        items: cleanItems(base.items.map(i => Object.assign({}, i, { id: '', status: 'planned', neededBy: '', due: '', photoId: '' }))),
        vendors: cleanVendors(base.vendors.map(v => Object.assign({}, v, { actual: null }))),
        tasks: defaultTasks(settings), collaborators: [], owner: user.sub, rec: base.rec || '',
        status: 'draft', isTemplate: false, version: 1, createdBy: user.sub, createdAt: now, updatedAt: now, updatedBy: user.sub, duplicatedFrom: String(src._id),
      };
      const r = await col.insertOne(copy);
      await audit(db, { property, user, area: 'programs', action: 'duplicate', entityId: r.insertedId, detail: { from: String(src._id) } });
      return json(200, present(Object.assign({ _id: r.insertedId }, copy), settings, user));
    }

    if (event.httpMethod === 'POST') {
      const f = contentFields(body, settings);
      if (!f.title) return { statusCode: 400, body: 'Program title is required' };
      const doc = Object.assign({
        property, type: 'active', programType: 'individual', month: '', eventDate: null, endDate: null, location: '', description: '', budget: 0,
        stations: [], items: [], vendors: [], collaborators: [], tasks: defaultTasks(settings),
      }, f, {
        owner: (isMgr(user) && f.owner) || user.sub, status: 'draft', version: 1, isTemplate: false,
        createdBy: user.sub, createdAt: now, updatedAt: now, updatedBy: user.sub,
      });
      if (body.status === 'submitted' || body.status === 'proposed') {
        const miss = missingForSubmit(doc);
        if (miss.length) return json(422, { error: 'Missing required information', missing: miss, saved: false });
        doc.status = 'submitted'; doc.submittedAt = now;
      }
      const r = await col.insertOne(doc);
      await audit(db, { property, user, area: 'programs', action: 'create', entityId: r.insertedId, detail: { status: doc.status } });
      if (doc.status === 'submitted') await notifySubmitted(db, property, doc, user);
      return json(200, present(Object.assign({ _id: r.insertedId }, doc), settings, user));
    }

    if (event.httpMethod === 'PUT' && body.action === 'settings') {
      if (!isAdm(user)) return { statusCode: 403, body: 'Only a Reslife Admin can change programming settings' };
      const merged = mergeSettings(body.settings || {});
      await db.collection('reslife_program_settings').updateOne({ property }, { $set: Object.assign({ property, updatedBy: user.sub, updatedAt: now }, merged) }, { upsert: true });
      await audit(db, { property, user, area: 'programs', action: 'settings', detail: { categories: merged.categories.length } });
      return json(200, merged);
    }

    if (event.httpMethod === 'PUT') {
      const _id = oid(body.id);
      const existing = _id && await col.findOne({ _id, property });
      if (!existing) return { statusCode: 404, body: 'Not found' };
      const mgr = isMgr(user), member = isMember(existing, user);
      const cur = normalizeStatus(existing.status);

      if (body.action === 'status') {
        const to = body.to === 'proposed' ? 'submitted' : body.to;
        const role = mgr ? 'manager' : member ? 'member' : null;
        if (!canTransition(cur, to, role)) return { statusCode: 403, body: `You can't move this program from ${cur} to ${to}` };
        const comment = str(body.comment, 2000);
        if (['changes_requested', 'rejected'].includes(to) && !comment) return { statusCode: 400, body: 'Please include feedback for the RA' };
        if (to === 'submitted') {
          const miss = missingForSubmit(present(existing, settings, user));
          if (miss.length) return json(422, { error: 'Missing required information', missing: miss });
        }
        const set = { status: to, updatedAt: now, updatedBy: user.sub, version: (existing.version || 0) + 1 };
        if (to === 'submitted') set.submittedAt = now;
        if (to === 'approved') {
          set.approvedBy = user.sub; set.approvedAt = now;
          if (body.approvedBudget !== undefined && body.approvedBudget !== '') set.approvedBudget = num(body.approvedBudget);
        }
        const push = comment ? { reviewComments: { at: now, by: user.sub, to, comment } } : undefined;
        await col.updateOne({ _id, property }, push ? { $set: set, $push: push } : { $set: set });
        await audit(db, { property, user, area: 'programs', action: 'status', entityId: _id, detail: { from: cur, to } });
        const msg = { approved: 'was approved', changes_requested: 'needs changes', rejected: 'was not approved', scheduled: 'is scheduled', completed: 'was marked completed', cancelled: 'was cancelled', under_review: 'is under review' }[to];
        const people = [existing.createdBy, existing.owner, ...(existing.collaborators || [])].filter(x => x && x !== user.sub);
        if (msg && people.length) await notify(db, { property, to: people, title: `Program ${msg}: ${existing.title}`, message: comment ? `Feedback from ${user.sub}: ${comment}` : `Updated by ${user.sub}.`, type: 'program', link: 'programs', createdBy: user.sub });
        if (to === 'submitted') await notifySubmitted(db, property, existing, user);
        return json(200, { success: true, status: to, version: set.version });
      }

      if (body.action === 'evaluation') {
        if (!mgr && !member) return { statusCode: 403, body: 'Forbidden' };
        if (!['approved', 'scheduled', 'completed'].includes(cur)) return { statusCode: 400, body: 'Evaluations can be entered once a program is approved' };
        const evaluation = Object.assign(cleanEvaluation(body.evaluation), { submittedBy: user.sub, submittedAt: now });
        const ver = (existing.version || 0) + 1;
        await col.updateOne({ _id, property }, { $set: { evaluation, updatedAt: now, updatedBy: user.sub, version: ver } });
        await audit(db, { property, user, area: 'programs', action: 'evaluation', entityId: _id });
        return json(200, { success: true, version: ver });
      }

      // Content edit
      if (!mgr && !(member && !['completed', 'rejected', 'cancelled'].includes(cur))) return { statusCode: 403, body: 'Forbidden' };
      if (body.version !== undefined && Number(body.version) !== (existing.version || 0)) {
        return json(409, { error: 'This program was changed by someone else since you opened it. Reload to see their changes before saving.', current: present(existing, settings, user) });
      }
      const updates = contentFields(body, settings);
      // Only managers may reassign ownership, set the approved budget or mark templates.
      if (!mgr) { delete updates.owner; }
      if (!mgr && updates.collaborators && existing.owner && existing.owner !== user.sub && existing.createdBy !== user.sub) delete updates.collaborators;
      if (mgr && body.approvedBudget !== undefined) updates.approvedBudget = body.approvedBudget === '' || body.approvedBudget == null ? null : num(body.approvedBudget);
      if (mgr && body.isTemplate !== undefined) updates.isTemplate = !!body.isTemplate;
      let reReview = false;
      if (!mgr && ['approved', 'scheduled'].includes(cur) && isMaterialChange(present(existing, settings, user), updates)) { updates.status = 'submitted'; updates.submittedAt = new Date().toISOString(); reReview = true; }
      Object.assign(updates, { updatedAt: now, updatedBy: user.sub, version: (existing.version || 0) + 1 });
      const unset = existing.shoppingList !== undefined && updates.items !== undefined ? { shoppingList: '' } : null;
      const res = await col.updateOne({ _id, property, version: existing.version === undefined ? { $exists: false } : existing.version }, unset ? { $set: updates, $unset: unset } : { $set: updates });
      if (!res.matchedCount) return json(409, { error: 'This program was changed by someone else while you were saving. Reload and try again.' });
      await audit(db, { property, user, area: 'programs', action: reReview ? 'update-rereview' : 'update', entityId: _id, detail: { fields: Object.keys(updates).filter(k => !['updatedAt', 'updatedBy', 'version'].includes(k)) } });
      if (reReview) await notifySubmitted(db, property, existing, user, true);
      const fresh = await col.findOne({ _id, property });
      return json(200, present(fresh, settings, user));
    }

    if (event.httpMethod === 'DELETE') {
      const _id = oid(q.id || body.id);
      const existing = _id && await col.findOne({ _id, property });
      if (!existing) return { statusCode: 404, body: 'Not found' };
      const cur = normalizeStatus(existing.status);
      const ownerDelete = existing.createdBy === user.sub && ['draft', 'submitted', 'changes_requested', 'cancelled'].includes(cur);
      if (!isMgr(user) && !ownerDelete) return { statusCode: 403, body: 'Only drafts you created can be deleted. Ask your REC to cancel an approved program.' };
      await col.deleteOne({ _id, property });
      await db.collection('reslife_program_files').deleteMany({ property, programId: String(_id) });
      await audit(db, { property, user, area: 'programs', action: 'delete', entityId: _id, detail: { status: cur } });
      return json(200, { success: true });
    }

    return { statusCode: 405, body: 'Method Not Allowed' };
  } catch (e) {
    if (e instanceof SyntaxError) return { statusCode: 400, body: 'Invalid JSON' };
    console.error('[reslife-programs]', e.message);
    return { statusCode: 500, body: 'Server error' };
  }
}

async function notifySubmitted(db, property, p, user, reReview) {
  const to = p.rec ? [p.rec] : await managersForReslifeProperty(db, property);
  const recipients = to.filter(x => x && x !== user.sub);
  if (!recipients.length) return;
  await notify(db, { property, to: recipients, title: `${reReview ? 'Program changed — re-review needed' : 'Program submitted for review'}: ${p.title}`, message: `From ${user.sub}.`, type: 'program', link: 'programs', createdBy: user.sub });
}
