import { verifyReqAuth } from './_auth.js';
import { getDb, ObjectId } from './_db.js';
import { canAccessReslifeProperty, isReslifeManager, refreshReslifeUser, json } from './_reslife.js';
import { notify } from './_notify.js';
import { DEFAULT_SHIFT_TYPES, COLOR_TOKENS, todayLocal, validDate, validTime, addDays, weekdayOf, shiftInstants, overlaps, availabilityFor, isWeekend } from './_sched.js';

/**
 * Reslife Hub — Schedule & On-Call (replaces the old Duty Roster; old reslife_roster docs are migrated, never deleted).
 *
 * GET  ?property=X&resource=overview                     who's on call now / next / my next / status
 * GET  ?property=X&resource=shifts&from=&to=[&user=&type=&status=]
 * GET  ?property=X&resource=shift&id=                    detail + duty log status + handoffs
 * GET  ?property=X&resource=staff | settings | availability[&user=] | requests | history&user=&from=&to=&type= | audit | candidates&id=
 * POST { property, resource:'shifts', action:'bulk', typeId, from, to, repeat, days[], dates[], start, end, assignedUser, notes }   (mgr)
 * POST { property, resource:'shifts', action:'autobuild', from, to, typeIds[], users[], maxPer, weekendFair }                      (mgr)
 * POST { property, resource:'publish'|'unpublish', from, to }                                                                    (mgr)
 * POST { property, resource:'confirm', publicationId }
 * POST { property, resource:'availability', kind, weekday|date|endDate, status, from, to, reason }
 * POST { property, resource:'requests', type:'giveaway'|'swap'|'pickup', shiftId, to?, reason? }
 * POST { property, resource:'handoff', shiftId, notes }
 * PUT  { property, resource:'shift', id, ...fields, override }   edit / assign / unassign (mgr)
 * PUT  { property, resource:'requests', id, action:'accept'|'approve'|'deny'|'cancel', comment }
 * PUT  { property, resource:'availability', id, approval:'approved'|'denied', comment }   (mgr, time-off)
 * PUT  { property, resource:'staff', username, title, phone, eligibleTypes, maxShifts, active }  (mgr)
 * PUT  { property, resource:'settings', ... }   (mgr)
 * DELETE ?property=X&resource=shift|availability&id=
 */
const isMgr = u => u.role === 'admin' || isReslifeManager(u.role);
const clip = (s, n) => String(s == null ? '' : s).trim().slice(0, n);
const oid = id => { try { return new ObjectId(String(id)); } catch { return null; } };

export async function handler(event) {
  const user = verifyReqAuth(event);
  if (!user) return { statusCode: 401, body: 'Unauthorized' };
  const db = await getDb();
  await refreshReslifeUser(db, user);
  const q = event.queryStringParameters || {};
  const body = event.body ? JSON.parse(event.body) : {};
  const property = q.property || body.property;
  const resource = q.resource || body.resource;
  if (!property) return { statusCode: 400, body: 'Missing property' };
  if (!canAccessReslifeProperty(user, property)) return { statusCode: 403, body: 'Forbidden' };
  const mgr = isMgr(user);
  const now = new Date();
  const nowIso = now.toISOString();

  const C = n => db.collection('sched_' + n);
  const audit = (action, shiftId, details) => C('audit').insertOne({ property, at: nowIso, by: user.sub, action, shiftId: shiftId || null, details: details || {} });
  const settings = await getSettings(db, property, user.sub);
  const types = settings.shiftTypes;
  const typeOf = id => types.find(t => t.id === id) || { id, name: id, color: 'slate', roles: [], level: 0 };

  // Staff for this property only (never other properties).
  async function staffList() {
    const users = await db.collection('users').find({ role: { $in: ['reslife-ra', 'reslife-rec', 'reslife-admin'] }, properties: property }, { projection: { _id: 0, username: 1, fullName: 1, role: 1, email: 1, phone: 1 } }).toArray();
    const profiles = await C('staff').find({ property }).toArray();
    return users.map(u => {
      const p = profiles.find(x => x.username === u.username) || {};
      const self = u.username === user.sub;
      return { username: u.username, name: u.fullName || u.username, role: u.role, title: p.title || roleTitle(u.role), active: p.active !== false, eligibleTypes: p.eligibleTypes || [], maxShifts: p.maxShifts || null,
        phone: mgr || self ? (p.phone || u.phone || '') : '', email: mgr || self ? (u.email || '') : '' };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }
  const pub = s => { s.id = s._id.toString(); delete s._id; s.type = typeOf(s.typeId); return s; };
  const visibleFilter = extra => Object.assign({ property, status: { $ne: 'cancelled' } }, mgr ? {} : { published: true }, extra || {});

  try {
    // ───────────────────────── GET ─────────────────────────
    if (event.httpMethod === 'GET') {
      if (resource === 'settings') return json(200, Object.assign({}, settings, { _id: undefined, colorTokens: COLOR_TOKENS, canManage: mgr, me: user.sub }));

      if (resource === 'staff') return json(200, await staffList());

      if (resource === 'overview') {
        const staff = await staffList();
        const nameOf = u => (staff.find(s => s.username === u) || {}).name || u || '';
        const current = await C('shifts').find(visibleFilter({ startAt: { $lte: nowIso }, endAt: { $gt: nowIso } })).toArray();
        const onCallNow = current.map(pub).filter(s => s.type.level > 0 || s.typeId.includes('on-call')).sort((a, b) => a.type.level - b.type.level)
          .map(s => ({ id: s.id, level: s.type.level, typeName: s.type.name, color: s.type.color, user: s.assignedUser, name: nameOf(s.assignedUser), title: (staff.find(x => x.username === s.assignedUser) || {}).title || '', phone: mgr ? ((staff.find(x => x.username === s.assignedUser) || {}).phone || '') : '', backup: s.backupUser ? nameOf(s.backupUser) : '', startAt: s.startAt, endAt: s.endAt, status: s.status }));
        const upcoming = await C('shifts').find(visibleFilter({ startAt: { $gt: nowIso } })).sort({ startAt: 1 }).limit(60).toArray();
        const nextPrimary = upcoming.map(pub).find(s => s.type.level === 1);
        const myNext = await C('shifts').find(visibleFilter({ endAt: { $gt: nowIso }, $or: [{ assignedUser: user.sub }, { backupUser: user.sub }] })).sort({ startAt: 1 }).limit(5).toArray();
        const openCount = await C('shifts').countDocuments({ property, published: true, status: 'open', startAt: { $gt: nowIso } });
        const pending = await C('requests').countDocuments(mgr ? { property, status: 'pending_approval' } : { property, $or: [{ to: user.sub, status: 'open' }, { from: user.sub, status: { $in: ['open', 'pending_approval'] } }] });
        const pendingTimeOff = mgr ? await C('availability').countDocuments({ property, kind: 'timeoff', approval: 'pending' }) : 0;
        const lastPub = (settings.publications || []).slice(-1)[0] || null;
        let confirmations = null, myConfirm = null;
        if (lastPub && settings.requireConfirmation) {
          const assigned = await C('shifts').distinct('assignedUser', { property, published: true, date: { $gte: lastPub.from, $lte: lastPub.to }, assignedUser: { $nin: [null, ''] } });
          const done = await C('confirmations').find({ property, publicationId: lastPub.id }).toArray();
          confirmations = { total: assigned.length, confirmed: done.filter(d => assigned.includes(d.user)).length, missing: assigned.filter(a => !done.some(d => d.user === a)).map(nameOf) };
          myConfirm = assigned.includes(user.sub) ? { publicationId: lastPub.id, from: lastPub.from, to: lastPub.to, confirmed: done.some(d => d.user === user.sub) } : null;
        }
        const gaps = mgr ? await C('shifts').countDocuments({ property, status: 'open', startAt: { $gt: nowIso }, date: { $lte: addDays(todayLocal(), 31) } }) : 0;
        return json(200, {
          onCallNow, nextOnCall: nextPrimary ? { name: nameOf(nextPrimary.assignedUser), typeName: nextPrimary.type.name, startAt: nextPrimary.startAt, endAt: nextPrimary.endAt, open: !nextPrimary.assignedUser } : null,
          myNext: myNext.map(pub).map(s => Object.assign(s, { asBackup: s.backupUser === user.sub && s.assignedUser !== user.sub })),
          publishedThrough: settings.publishedThrough || null, openCount, pendingRequests: pending, pendingTimeOff, coverageGaps: gaps,
          confirmations, myConfirm, dutyPhone: settings.dutyPhone || '', emergencyContact: settings.emergencyContact || '',
        });
      }

      if (resource === 'shifts') {
        const from = validDate(q.from) ? q.from : addDays(todayLocal(), -7), to = validDate(q.to) ? q.to : addDays(todayLocal(), 35);
        const f = visibleFilter({ date: { $gte: from, $lte: to } });
        if (q.user) f.$or = [{ assignedUser: q.user }, { backupUser: q.user }];
        if (q.type) f.typeId = q.type;
        if (q.status) f.status = q.status;
        const shifts = (await C('shifts').find(f).sort({ startAt: 1 }).limit(2000).toArray()).map(pub);
        const ids = shifts.map(s => s.id);
        const reqs = await C('requests').find({ property, shiftId: { $in: ids }, status: { $in: ['open', 'pending_approval'] } }).toArray();
        shifts.forEach(s => { const r = reqs.find(x => x.shiftId === s.id); if (r) s.request = { id: r._id.toString(), type: r.type, from: r.from, to: r.to, status: r.status }; });
        return json(200, shifts);
      }

      if (resource === 'shift') {
        const s = await C('shifts').findOne(visibleFilter({ _id: oid(q.id) }));
        if (!s) return { statusCode: 404, body: 'Shift not found' };
        const shift = pub(s);
        const session = await db.collection('reslife_duty_sessions').findOne({ property, duty_date: shift.date }, { projection: { status: 1, primary_ra_username: 1, entries: 1 } });
        shift.dutyLog = session ? { id: session._id.toString(), status: session.status === 'submitted' ? 'Submitted' : 'In Progress', entries: (session.entries || []).length, owner: session.primary_ra_username } : { status: 'Not Started' };
        shift.handoffs = await C('handoffs').find({ property, shiftId: shift.id }).sort({ createdAt: 1 }).toArray();
        shift.requests = await C('requests').find({ property, shiftId: shift.id }).sort({ createdAt: -1 }).limit(10).toArray();
        if (mgr) shift.audit = await C('audit').find({ property, shiftId: shift.id }).sort({ at: -1 }).limit(20).toArray();
        shift.dutyPhone = settings.dutyPhone || '';
        return json(200, shift);
      }

      if (resource === 'candidates') {
        if (!mgr) return { statusCode: 403, body: 'Forbidden' };
        const s = await C('shifts').findOne({ property, _id: oid(q.id) });
        if (!s) return { statusCode: 404, body: 'Shift not found' };
        const staff = (await staffList()).filter(x => x.active);
        const avail = await C('availability').find({ property }).toArray();
        const others = await C('shifts').find({ property, status: { $ne: 'cancelled' }, _id: { $ne: s._id }, startAt: { $lt: s.endAt }, endAt: { $gt: s.startAt } }).toArray();
        const t = typeOf(s.typeId);
        return json(200, staff.map(u => {
          const a = availabilityFor(u.username, s, avail);
          const conflict = others.find(o => o.assignedUser === u.username || o.backupUser === u.username);
          const roleOk = !t.roles || !t.roles.length || t.roles.includes(u.role);
          const typeOk = !u.eligibleTypes.length || u.eligibleTypes.includes(s.typeId);
          return { username: u.username, name: u.name, title: u.title, availability: a.status, reason: a.reason, conflict: conflict ? `Already on ${typeOf(conflict.typeId).name} ${conflict.start}–${conflict.end} (${conflict.date})` : '', eligible: roleOk && typeOk, eligibilityNote: !roleOk ? 'Role not eligible for this shift type' : (!typeOk ? 'Not marked eligible for this shift type' : '') };
        }));
      }

      if (resource === 'availability') {
        const f = { property };
        if (!mgr) f.user = user.sub; else if (q.user) f.user = q.user;
        return json(200, (await C('availability').find(f).sort({ kind: 1, weekday: 1, date: 1 }).toArray()).map(a => Object.assign(a, { id: a._id.toString() })));
      }

      if (resource === 'requests') {
        const f = { property };
        if (!mgr) f.$or = [{ from: user.sub }, { to: user.sub }, { type: 'giveaway', status: 'open' }];
        const reqs = await C('requests').find(f).sort({ createdAt: -1 }).limit(200).toArray();
        const shiftIds = reqs.map(r => oid(r.shiftId)).filter(Boolean);
        const shifts = await C('shifts').find({ property, _id: { $in: shiftIds } }).toArray();
        return json(200, reqs.map(r => { const s = shifts.find(x => x._id.toString() === r.shiftId); return Object.assign(r, { id: r._id.toString(), shift: s ? pub(Object.assign({}, s)) : null }); }));
      }

      if (resource === 'history') {
        const f = { property, status: { $ne: 'cancelled' }, published: true, endAt: { $lte: q.includeFuture ? '9999' : nowIso } };
        if (validDate(q.from)) f.date = Object.assign(f.date || {}, { $gte: q.from });
        if (validDate(q.to)) f.date = Object.assign(f.date || {}, { $lte: q.to });
        if (q.type) f.typeId = q.type;
        if (q.user) f.$or = [{ assignedUser: q.user }, { backupUser: q.user }];
        else if (!mgr) f.$or = [{ assignedUser: user.sub }, { backupUser: user.sub }];
        const shifts = (await C('shifts').find(f).sort({ startAt: -1 }).limit(1500).toArray()).map(pub);
        const dates = [...new Set(shifts.map(s => s.date))];
        const sessions = await db.collection('reslife_duty_sessions').find({ property, duty_date: { $in: dates } }, { projection: { duty_date: 1, status: 1 } }).toArray();
        shifts.forEach(s => { const ss = sessions.find(x => x.duty_date === s.date); s.dutyLogStatus = ss ? (ss.status === 'submitted' ? 'Submitted' : 'In Progress') : 'Not Started'; });
        return json(200, shifts);
      }

      if (resource === 'audit') {
        if (!mgr) return { statusCode: 403, body: 'Forbidden' };
        return json(200, await C('audit').find({ property }).sort({ at: -1 }).limit(300).toArray());
      }
      return { statusCode: 400, body: 'Unknown resource' };
    }

    // ───────────────────────── POST ─────────────────────────
    if (event.httpMethod === 'POST') {
      if (resource === 'shifts' && body.action === 'bulk') {
        if (!mgr) return { statusCode: 403, body: 'Forbidden' };
        const t = typeOf(body.typeId);
        if (!types.some(x => x.id === body.typeId)) return { statusCode: 400, body: 'Choose a shift type' };
        const start = validTime(body.start) ? body.start : t.start, end = validTime(body.end) ? body.end : t.end;
        let dates = [];
        if (body.repeat === 'dates') dates = (body.dates || []).filter(validDate);
        else {
          if (!validDate(body.from) || !validDate(body.to) || body.to < body.from) return { statusCode: 400, body: 'Choose a valid date range' };
          const days = body.repeat === 'weekends' ? [5, 6] : body.repeat === 'custom' || body.repeat === 'weekly' ? (body.days || []).map(Number) : [0, 1, 2, 3, 4, 5, 6];
          for (let d = body.from; d <= body.to && dates.length < 400; d = addDays(d, 1)) if (days.includes(weekdayOf(d))) dates.push(d);
        }
        if (!dates.length) return { statusCode: 400, body: 'No dates match those options' };
        const existing = await C('shifts').find({ property, typeId: t.id, date: { $in: dates }, status: { $ne: 'cancelled' } }).project({ date: 1 }).toArray();
        const skip = new Set(body.allowDuplicates ? [] : existing.map(e => e.date));
        const docs = dates.filter(d => !skip.has(d)).map(date => Object.assign({ property, typeId: t.id, date, start, end }, shiftInstants(date, start, end), {
          assignedUser: clip(body.assignedUser, 60) || '', backupUser: '', status: body.assignedUser ? 'assigned' : 'open', published: false,
          notes: clip(body.notes, 1000), location: clip(body.location, 120), eligibleRoles: t.roles || [], openDeadline: '', remindersSent: [], createdBy: user.sub, createdAt: nowIso, updatedAt: nowIso }));
        if (docs.length) await C('shifts').insertMany(docs);
        await audit('created_shifts', null, { type: t.name, count: docs.length, from: dates[0], to: dates[dates.length - 1], skippedDuplicates: dates.length - docs.length });
        return json(200, { created: docs.length, skipped: dates.length - docs.length });
      }

      if (resource === 'shifts' && body.action === 'autobuild') {
        if (!mgr) return { statusCode: 403, body: 'Forbidden' };
        if (!validDate(body.from) || !validDate(body.to)) return { statusCode: 400, body: 'Choose a valid date range' };
        const typeIds = (body.typeIds || []).length ? body.typeIds : types.filter(t => t.level === 1).map(t => t.id);
        const staff = (await staffList()).filter(s => s.active && (!body.users || !body.users.length || body.users.includes(s.username)));
        const avail = await C('availability').find({ property }).toArray();
        const inRange = await C('shifts').find({ property, status: { $ne: 'cancelled' }, date: { $gte: body.from, $lte: body.to } }).sort({ startAt: 1 }).toArray();
        const targets = inRange.filter(s => typeIds.includes(s.typeId) && !s.assignedUser && !s.published);
        const count = {}, wk = {};
        staff.forEach(s => { count[s.username] = 0; wk[s.username] = 0; });
        inRange.forEach(s => { if (s.assignedUser in count) { count[s.assignedUser]++; if (isWeekend(s.date)) wk[s.assignedUser]++; } });
        const maxPer = +body.maxPer || Infinity, minPer = +body.minPer || 0;
        let assigned = 0, unfilled = 0;
        for (const s of targets) {
          const t = typeOf(s.typeId);
          const pool = staff.filter(u => (!t.roles.length || t.roles.includes(u.role)) && (!u.eligibleTypes.length || u.eligibleTypes.includes(s.typeId)))
            .filter(u => count[u.username] < Math.min(maxPer, u.maxShifts || Infinity))
            .map(u => ({ u, a: availabilityFor(u.username, s, avail) }))
            .filter(x => x.a.status !== 'unavailable')
            .filter(x => !inRange.some(o => o !== s && (o.assignedUser === x.u.username || o.backupUser === x.u.username) && overlaps(o, s)));
          if (!pool.length) { unfilled++; continue; }
          pool.forEach(x => { x.score = count[x.u.username] * 10 + (body.weekendFair !== false && isWeekend(s.date) ? wk[x.u.username] * 15 : 0) - (x.a.status === 'preferred' ? 6 : 0) - (count[x.u.username] < minPer ? 20 : 0) + Math.random(); });
          pool.sort((a, b) => a.score - b.score);
          const pick = pool[0].u.username;
          s.assignedUser = pick; count[pick]++; if (isWeekend(s.date)) wk[pick]++;
          await C('shifts').updateOne({ _id: s._id }, { $set: { assignedUser: pick, status: 'assigned', autoAssigned: true, updatedAt: nowIso } });
          assigned++;
        }
        await audit('auto_build', null, { from: body.from, to: body.to, assigned, unfilled });
        return json(200, { assigned, unfilled, considered: targets.length, distribution: count });
      }

      if (resource === 'publish' || resource === 'unpublish') {
        if (!mgr) return { statusCode: 403, body: 'Forbidden' };
        if (!validDate(body.from) || !validDate(body.to)) return { statusCode: 400, body: 'Choose a valid date range' };
        if (resource === 'unpublish') {
          const from = body.from < todayLocal() ? todayLocal() : body.from; // never unpublish the past
          const r = await C('shifts').updateMany({ property, date: { $gte: from, $lte: body.to }, published: true }, { $set: { published: false, updatedAt: nowIso } });
          await audit('unpublished', null, { from, to: body.to, count: r.modifiedCount });
          return json(200, { count: r.modifiedCount });
        }
        const toPub = await C('shifts').find({ property, date: { $gte: body.from, $lte: body.to }, published: false, status: { $ne: 'cancelled' } }).toArray();
        await C('shifts').updateMany({ property, date: { $gte: body.from, $lte: body.to }, published: false, status: { $ne: 'cancelled' } }, { $set: { published: true, publishedAt: nowIso, updatedAt: nowIso } });
        const publicationId = 'pub-' + Date.now();
        const pt = !settings.publishedThrough || body.to > settings.publishedThrough ? body.to : settings.publishedThrough;
        await C('settings').updateOne({ property }, { $set: { publishedThrough: pt }, $push: { publications: { id: publicationId, from: body.from, to: body.to, at: nowIso, by: user.sub, count: toPub.length } } });
        const recipients = [...new Set(toPub.flatMap(s => [s.assignedUser, s.backupUser]).filter(Boolean))];
        if (recipients.length) await notify(db, { property, to: recipients, title: 'Your schedule has been published', message: `Shifts for ${body.from} – ${body.to} are live.${settings.requireConfirmation ? ' Please review and confirm your schedule.' : ''}`, type: 'schedule', link: 'roster', createdBy: user.sub });
        const open = toPub.filter(s => s.status === 'open').length;
        if (open) await notify(db, { property, to: '*', title: `${open} open shift${open > 1 ? 's' : ''} available`, message: 'Pick one up from Schedule & On-Call → Open Shifts.', type: 'schedule', link: 'roster', createdBy: user.sub });
        await audit('published', null, { from: body.from, to: body.to, count: toPub.length });
        return json(200, { count: toPub.length, publicationId, notified: recipients.length });
      }

      if (resource === 'confirm') {
        await C('confirmations').updateOne({ property, publicationId: body.publicationId, user: user.sub }, { $set: { confirmedAt: nowIso } }, { upsert: true });
        return json(200, { success: true });
      }

      if (resource === 'availability') {
        const kind = ['weekly', 'date', 'timeoff'].includes(body.kind) ? body.kind : 'date';
        const status = ['available', 'preferred', 'unavailable'].includes(body.status) ? body.status : 'unavailable';
        const who = mgr && body.user ? body.user : user.sub;
        const doc = { property, user: who, kind, status: kind === 'timeoff' ? 'unavailable' : status, reason: clip(body.reason, 200), createdAt: nowIso };
        if (kind === 'weekly') { doc.weekday = Math.min(6, Math.max(0, +body.weekday || 0)); doc.from = validTime(body.from) ? body.from : ''; doc.to = validTime(body.to) ? body.to : ''; await C('availability').deleteMany({ property, user: who, kind: 'weekly', weekday: doc.weekday }); }
        else {
          if (!validDate(body.date)) return { statusCode: 400, body: 'Choose a valid date' };
          doc.date = body.date;
          if (kind === 'timeoff') { doc.endDate = validDate(body.endDate) && body.endDate >= body.date ? body.endDate : body.date; doc.approval = mgr ? 'approved' : 'pending'; }
        }
        const r = await C('availability').insertOne(doc);
        if (kind === 'timeoff' && !mgr) await notify(db, { property, to: await managerUsernames(db, property), title: `Time-off request from ${user.sub}`, message: `${doc.date}${doc.endDate !== doc.date ? ' – ' + doc.endDate : ''}${doc.reason ? ' · ' + doc.reason : ''}`, type: 'schedule', link: 'roster', createdBy: user.sub });
        return json(200, Object.assign(doc, { id: r.insertedId.toString() }));
      }

      if (resource === 'requests') {
        const s = await C('shifts').findOne({ property, _id: oid(body.shiftId), published: true });
        if (!s) return { statusCode: 404, body: 'Shift not found or not published yet' };
        if (s.startAt < nowIso) return { statusCode: 400, body: 'This shift has already started' };
        const active = await C('requests').findOne({ property, shiftId: body.shiftId, status: { $in: ['open', 'pending_approval'] } });
        if (body.type === 'pickup') {
          if (s.status !== 'open' && !(active && active.type === 'giveaway')) return { statusCode: 400, body: 'This shift is not open' };
          const t = typeOf(s.typeId);
          if (t.roles.length && !t.roles.includes(user.role) && user.role !== 'admin') return { statusCode: 403, body: 'Your role isn’t eligible for this shift type' };
          if (s.openDeadline && s.openDeadline < nowIso) return { statusCode: 400, body: 'The pickup deadline has passed' };
          const clash = await C('shifts').findOne({ property, status: { $ne: 'cancelled' }, $or: [{ assignedUser: user.sub }, { backupUser: user.sub }], startAt: { $lt: s.endAt }, endAt: { $gt: s.startAt } });
          if (clash) return { statusCode: 409, body: 'You already have a shift that overlaps this one' };
          if (active && active.type === 'giveaway') {
            const status = settings.swapNeedsApproval ? 'pending_approval' : 'approved';
            await C('requests').updateOne({ _id: active._id }, { $set: { to: user.sub, status, updatedAt: nowIso }, $push: { history: { at: nowIso, by: user.sub, action: 'accepted' } } });
            if (status === 'approved') await reassign(s, active.from, user.sub, 'giveaway_auto_approved');
            else await notify(db, { property, to: await managerUsernames(db, property), title: 'Shift swap needs approval', message: `${active.from} → ${user.sub} · ${typeOf(s.typeId).name} ${s.date}`, type: 'schedule', link: 'roster', createdBy: user.sub });
            await audit('swap_accepted', s._id.toString(), { from: active.from, to: user.sub });
            return json(200, { status });
          }
          const status = settings.swapNeedsApproval ? 'pending_approval' : 'approved';
          const r = await C('requests').insertOne({ property, shiftId: body.shiftId, type: 'pickup', from: '', to: user.sub, status, reason: '', createdAt: nowIso, history: [{ at: nowIso, by: user.sub, action: 'requested' }] });
          if (status === 'approved') await reassign(s, '', user.sub, 'open_shift_pickup');
          else { await C('shifts').updateOne({ _id: s._id }, { $set: { status: 'pending', updatedAt: nowIso } }); await notify(db, { property, to: await managerUsernames(db, property), title: 'Open shift pickup needs approval', message: `${user.sub} wants ${typeOf(s.typeId).name} on ${s.date}`, type: 'schedule', link: 'roster', createdBy: user.sub }); }
          await audit('pickup_requested', s._id.toString(), { by: user.sub, status });
          return json(200, { id: r.insertedId.toString(), status });
        }
        // giveaway / swap — only the assigned staff member (or a manager on their behalf)
        if (s.assignedUser !== user.sub && !mgr) return { statusCode: 403, body: 'You can only offer your own shifts' };
        if (active) return { statusCode: 409, body: 'There is already an open request for this shift' };
        const type = body.type === 'swap' && body.to ? 'swap' : 'giveaway';
        const r = await C('requests').insertOne({ property, shiftId: body.shiftId, type, from: s.assignedUser, to: type === 'swap' ? clip(body.to, 60) : '', status: 'open', reason: clip(body.reason, 300), createdAt: nowIso, history: [{ at: nowIso, by: user.sub, action: 'created' }] });
        await C('shifts').updateOne({ _id: s._id }, { $set: { status: 'swap_requested', updatedAt: nowIso } });
        if (type === 'swap') await notify(db, { property, to: body.to, title: `${user.sub} asked you to cover a shift`, message: `${typeOf(s.typeId).name} · ${s.date} ${s.start}–${s.end}`, type: 'schedule', link: 'roster', createdBy: user.sub });
        else await notify(db, { property, to: '*', title: 'A shift is up for grabs', message: `${typeOf(s.typeId).name} · ${s.date} ${s.start}–${s.end}`, type: 'schedule', link: 'roster', createdBy: user.sub });
        await audit(type === 'swap' ? 'swap_requested' : 'shift_offered', s._id.toString(), { from: s.assignedUser, to: body.to || '' });
        return json(200, { id: r.insertedId.toString() });
      }

      if (resource === 'handoff') {
        const s = await C('shifts').findOne({ property, _id: oid(body.shiftId) });
        if (!s) return { statusCode: 404, body: 'Shift not found' };
        if (!mgr && s.assignedUser !== user.sub && s.backupUser !== user.sub) return { statusCode: 403, body: 'Only staff on this shift can add a handoff note' };
        const next = await C('shifts').findOne({ property, published: true, typeId: s.typeId, startAt: { $gte: s.endAt } }, { sort: { startAt: 1 } });
        const doc = { property, shiftId: body.shiftId, from: user.sub, to: next ? next.assignedUser : '', notes: clip(body.notes, 1500), createdAt: nowIso };
        await C('handoffs').insertOne(doc);
        if (doc.to) await notify(db, { property, to: doc.to, title: `Shift handoff from ${user.sub}`, message: doc.notes.slice(0, 200), type: 'schedule', link: 'roster', createdBy: user.sub });
        return json(200, doc);
      }
      return { statusCode: 400, body: 'Unknown resource' };
    }

    // ───────────────────────── PUT ─────────────────────────
    if (event.httpMethod === 'PUT') {
      if (resource === 'shift') {
        if (!mgr) return { statusCode: 403, body: 'Only an REC or Admin can edit shifts' };
        const s = await C('shifts').findOne({ property, _id: oid(body.id) });
        if (!s) return { statusCode: 404, body: 'Shift not found' };
        const upd = { updatedAt: nowIso };
        ['notes', 'location'].forEach(f => { if (body[f] !== undefined) upd[f] = clip(body[f], 1000); });
        if (body.typeId && types.some(t => t.id === body.typeId)) upd.typeId = body.typeId;
        if (body.openDeadline !== undefined) upd.openDeadline = body.openDeadline || '';
        const date = validDate(body.date) ? body.date : s.date, start = validTime(body.start) ? body.start : s.start, end = validTime(body.end) ? body.end : s.end;
        if (date !== s.date || start !== s.start || end !== s.end) Object.assign(upd, { date, start, end }, shiftInstants(date, start, end));
        const span = { startAt: upd.startAt || s.startAt, endAt: upd.endAt || s.endAt };
        const warnings = [];
        for (const key of ['assignedUser', 'backupUser']) {
          if (body[key] === undefined || body[key] === s[key]) continue;
          const who = clip(body[key], 60);
          if (who) {
            if (key === 'backupUser' && who === (body.assignedUser !== undefined ? body.assignedUser : s.assignedUser)) return { statusCode: 400, body: 'Primary and backup can’t be the same person' };
            const clash = await C('shifts').findOne({ property, _id: { $ne: s._id }, status: { $ne: 'cancelled' }, $or: [{ assignedUser: who }, { backupUser: who }], startAt: { $lt: span.endAt }, endAt: { $gt: span.startAt } });
            if (clash) warnings.push(`${who} is already on ${typeOf(clash.typeId).name} ${clash.date} ${clash.start}–${clash.end}`);
            const a = availabilityFor(who, Object.assign({}, s, upd), await C('availability').find({ property, user: who }).toArray());
            if (a.status === 'unavailable') warnings.push(`${who}: ${a.reason}`);
            const t = typeOf(upd.typeId || s.typeId);
            const u = await db.collection('users').findOne({ username: who, properties: property }, { projection: { role: 1 } });
            if (!u) return { statusCode: 400, body: `${who} is not on this property’s staff` };
            if (t.roles.length && !t.roles.includes(u.role)) warnings.push(`${who}’s role isn’t eligible for ${t.name}`);
          }
          upd[key] = who;
        }
        if (warnings.length && !body.override) return json(409, { ok: false, warnings });
        if (upd.assignedUser !== undefined) upd.status = upd.assignedUser ? 'assigned' : 'open';
        if (body.status === 'cancelled' || body.status === 'completed') upd.status = body.status;
        await C('shifts').updateOne({ _id: s._id }, { $set: upd });
        if (upd.assignedUser !== undefined && upd.assignedUser !== s.assignedUser) {
          await audit(upd.assignedUser ? (s.assignedUser ? 'reassigned' : 'assigned') : 'unassigned', s._id.toString(), { type: typeOf(s.typeId).name, date: s.date, from: s.assignedUser || '', to: upd.assignedUser || '', override: warnings.length ? warnings : undefined });
          if (s.published && upd.assignedUser) await notify(db, { property, to: upd.assignedUser, title: 'New shift assigned', message: `${typeOf(s.typeId).name} · ${date} ${start}–${end}`, type: 'schedule', link: 'roster', createdBy: user.sub });
          if (s.published && s.assignedUser) await notify(db, { property, to: s.assignedUser, title: 'Schedule changed', message: `You were removed from ${typeOf(s.typeId).name} on ${s.date}.`, type: 'schedule', link: 'roster', createdBy: user.sub });
        } else await audit('edited_shift', s._id.toString(), { fields: Object.keys(upd).filter(k => k !== 'updatedAt'), override: warnings.length ? warnings : undefined });
        return json(200, { ok: true, warnings });
      }

      if (resource === 'requests') {
        const r = await C('requests').findOne({ property, _id: oid(body.id) });
        if (!r) return { statusCode: 404, body: 'Request not found' };
        const s = await C('shifts').findOne({ property, _id: oid(r.shiftId) });
        const hist = { at: nowIso, by: user.sub, action: body.action, comment: clip(body.comment, 300) };
        if (body.action === 'accept') {
          if (r.status !== 'open' || (r.type === 'swap' && r.to !== user.sub)) return { statusCode: 400, body: 'This request can’t be accepted' };
          const status = settings.swapNeedsApproval ? 'pending_approval' : 'approved';
          await C('requests').updateOne({ _id: r._id }, { $set: { to: user.sub, status, updatedAt: nowIso }, $push: { history: hist } });
          if (status === 'approved' && s) await reassign(s, r.from, user.sub, 'swap_auto_approved');
          else await notify(db, { property, to: await managerUsernames(db, property), title: 'Shift swap needs approval', message: `${r.from} → ${user.sub} · ${s ? typeOf(s.typeId).name + ' ' + s.date : ''}`, type: 'schedule', link: 'roster', createdBy: user.sub });
          return json(200, { status });
        }
        if (body.action === 'approve' || body.action === 'deny') {
          if (!mgr) return { statusCode: 403, body: 'Only an REC or Admin can approve' };
          if (r.status !== 'pending_approval') return { statusCode: 400, body: 'Not awaiting approval' };
          if (body.action === 'approve' && s) await reassign(s, r.from, r.to, r.type + '_approved');
          if (body.action === 'deny' && s) await C('shifts').updateOne({ _id: s._id }, { $set: { status: s.assignedUser ? 'assigned' : 'open', updatedAt: nowIso } });
          await C('requests').updateOne({ _id: r._id }, { $set: { status: body.action === 'approve' ? 'approved' : 'denied', decidedBy: user.sub, decidedAt: nowIso, updatedAt: nowIso }, $push: { history: hist } });
          await audit(body.action === 'approve' ? 'swap_approved' : 'swap_denied', r.shiftId, { from: r.from, to: r.to, comment: hist.comment });
          await notify(db, { property, to: [r.from, r.to].filter(Boolean), title: `Shift ${r.type === 'pickup' ? 'pickup' : 'swap'} ${body.action === 'approve' ? 'approved' : 'denied'}`, message: s ? `${typeOf(s.typeId).name} · ${s.date}${hist.comment ? ' · ' + hist.comment : ''}` : '', type: 'schedule', link: 'roster', createdBy: user.sub });
          return json(200, { ok: true });
        }
        if (body.action === 'cancel') {
          if (r.from !== user.sub && r.to !== user.sub && !mgr) return { statusCode: 403, body: 'Forbidden' };
          await C('requests').updateOne({ _id: r._id }, { $set: { status: 'cancelled', updatedAt: nowIso }, $push: { history: hist } });
          if (s && ['swap_requested', 'pending'].includes(s.status)) await C('shifts').updateOne({ _id: s._id }, { $set: { status: s.assignedUser ? 'assigned' : 'open' } });
          return json(200, { ok: true });
        }
        return { statusCode: 400, body: 'Unknown action' };
      }

      if (resource === 'availability') {
        if (!mgr) return { statusCode: 403, body: 'Forbidden' };
        const a = await C('availability').findOne({ property, _id: oid(body.id) });
        if (!a) return { statusCode: 404, body: 'Not found' };
        await C('availability').updateOne({ _id: a._id }, { $set: { approval: body.approval === 'approved' ? 'approved' : 'denied', comment: clip(body.comment, 300), decidedBy: user.sub, decidedAt: nowIso } });
        await notify(db, { property, to: a.user, title: `Time off ${body.approval === 'approved' ? 'approved' : 'denied'}`, message: `${a.date}${a.endDate && a.endDate !== a.date ? ' – ' + a.endDate : ''}${body.comment ? ' · ' + body.comment : ''}`, type: 'schedule', link: 'roster', createdBy: user.sub });
        return json(200, { ok: true });
      }

      if (resource === 'staff') {
        if (!mgr) return { statusCode: 403, body: 'Forbidden' };
        const u = await db.collection('users').findOne({ username: body.username, properties: property });
        if (!u) return { statusCode: 404, body: 'Staff member not found on this property' };
        await C('staff').updateOne({ property, username: body.username }, { $set: { title: clip(body.title, 80), phone: clip(body.phone, 30), eligibleTypes: Array.isArray(body.eligibleTypes) ? body.eligibleTypes : [], maxShifts: +body.maxShifts || null, active: body.active !== false, updatedAt: nowIso } }, { upsert: true });
        return json(200, { ok: true });
      }

      if (resource === 'settings') {
        if (!mgr) return { statusCode: 403, body: 'Forbidden' };
        const upd = {};
        if (Array.isArray(body.shiftTypes)) upd.shiftTypes = body.shiftTypes.filter(t => t && t.name).map(t => ({ id: clip(t.id, 40) || clip(t.name, 40).toLowerCase().replace(/[^a-z0-9]+/g, '-'), name: clip(t.name, 40), color: COLOR_TOKENS.includes(t.color) ? t.color : 'slate', start: validTime(t.start) ? t.start : '18:00', end: validTime(t.end) ? t.end : '08:00', level: Math.min(3, Math.max(0, +t.level || 0)), minStaff: Math.max(1, +t.minStaff || 1), roles: Array.isArray(t.roles) ? t.roles : [], instructions: clip(t.instructions, 1000) }));
        ['requireConfirmation', 'swapNeedsApproval', 'giveawayKeepsResponsible'].forEach(k => { if (body[k] !== undefined) upd[k] = !!body[k]; });
        ['dutyPhone', 'emergencyContact'].forEach(k => { if (body[k] !== undefined) upd[k] = clip(body[k], 120); });
        if (Array.isArray(body.reminders)) upd.reminders = body.reminders.map(Number).filter(n => n > 0 && n <= 72 * 60).slice(0, 4);
        await C('settings').updateOne({ property }, { $set: upd });
        await audit('settings_changed', null, { fields: Object.keys(upd) });
        return json(200, { ok: true });
      }
      return { statusCode: 400, body: 'Unknown resource' };
    }

    // ───────────────────────── DELETE ─────────────────────────
    if (event.httpMethod === 'DELETE') {
      if (resource === 'availability') {
        const f = { property, _id: oid(q.id) }; if (!mgr) f.user = user.sub;
        await C('availability').deleteOne(f);
        return json(200, { ok: true });
      }
      if (resource === 'shift') {
        if (!mgr) return { statusCode: 403, body: 'Forbidden' };
        const s = await C('shifts').findOne({ property, _id: oid(q.id) });
        if (!s) return { statusCode: 404, body: 'Not found' };
        // Published shifts are cancelled (kept for history); drafts are removed.
        if (s.published) await C('shifts').updateOne({ _id: s._id }, { $set: { status: 'cancelled', updatedAt: nowIso } });
        else await C('shifts').deleteOne({ _id: s._id });
        await C('requests').updateMany({ property, shiftId: q.id, status: { $in: ['open', 'pending_approval'] } }, { $set: { status: 'cancelled' } });
        await audit(s.published ? 'cancelled_shift' : 'deleted_shift', q.id, { type: typeOf(s.typeId).name, date: s.date, assigned: s.assignedUser });
        if (s.published && s.assignedUser) await notify(db, { property, to: s.assignedUser, title: 'Shift cancelled', message: `${typeOf(s.typeId).name} on ${s.date} was cancelled.`, type: 'schedule', link: 'roster', createdBy: user.sub });
        return json(200, { ok: true });
      }
    }
    return { statusCode: 405, body: 'Method Not Allowed' };
  } catch (e) {
    console.error('schedule error', e);
    return { statusCode: 500, body: e.message };
  }

  async function reassign(s, from, to, reason) {
    await C('shifts').updateOne({ _id: s._id }, { $set: { assignedUser: to, status: 'assigned', updatedAt: nowIso } });
    await audit('reassigned', s._id.toString(), { from: from || '', to, reason });
  }
}

const roleTitle = r => ({ 'reslife-ra': 'Resident Assistant', 'reslife-rec': 'Resident Engagement Coordinator', 'reslife-admin': 'ResLife Admin' }[r] || 'Staff');

async function managerUsernames(db, property) {
  const m = await db.collection('users').find({ role: { $in: ['reslife-rec', 'reslife-admin'] }, properties: property }, { projection: { username: 1 } }).toArray();
  return m.map(x => x.username);
}

/** Load settings, creating defaults and migrating the old Duty Roster (reslife_roster) on first use. Old docs are never deleted. */
async function getSettings(db, property, by) {
  const col = db.collection('sched_settings');
  let s = await col.findOne({ property });
  if (s) return s;
  s = { property, shiftTypes: DEFAULT_SHIFT_TYPES, publishedThrough: null, requireConfirmation: true, swapNeedsApproval: true, giveawayKeepsResponsible: true, reminders: [24 * 60, 120], dutyPhone: '', emergencyContact: 'Emergencies: call 911', publications: [], createdAt: new Date().toISOString(), createdBy: by };
  await col.insertOne(s);
  try {
    const legacy = await db.collection('reslife_roster').find({ property }).toArray();
    if (legacy.length) {
      const users = await db.collection('users').find({ properties: property }, { projection: { username: 1, fullName: 1 } }).toArray();
      const match = name => { const n = String(name || '').trim().toLowerCase(); const u = users.find(x => x.username.toLowerCase() === n || String(x.fullName || '').toLowerCase() === n); return u ? u.username : ''; };
      const { localParts } = await import('./_sched.js');
      const docs = legacy.filter(r => r.shiftStart && r.shiftEnd).map(r => {
        const st = new Date(r.shiftStart), en = new Date(r.shiftEnd), a = localParts(st), b = localParts(en), p = n => String(n).padStart(2, '0');
        const assigned = match(r.assignedTo);
        return { property, typeId: 'primary-on-call', date: `${a.y}-${p(a.m)}-${p(a.d)}`, start: `${p(a.h)}:${p(a.min)}`, end: `${p(b.h)}:${p(b.min)}`, startAt: st.toISOString(), endAt: en.toISOString(), crossesMidnight: a.d !== b.d,
          assignedUser: assigned, backupUser: '', status: assigned ? 'assigned' : 'open', published: true, notes: [r.notes, assigned ? '' : `Legacy roster name: ${r.assignedTo}`].filter(Boolean).join(' · '), location: '', eligibleRoles: [], remindersSent: [], legacyRosterId: r._id.toString(), createdBy: r.createdBy || 'migration', createdAt: r.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() };
      });
      if (docs.length) await db.collection('sched_shifts').insertMany(docs);
      await col.updateOne({ property }, { $set: { migratedRoster: { count: docs.length, at: new Date().toISOString() } } });
      s.migratedRoster = { count: docs.length };
    }
  } catch (e) { console.error('roster migration failed', e.message); }
  return s;
}
