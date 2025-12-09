import { getDb, ObjectId } from './_db.js';
import { verifyReqAuth } from './_auth.js';

function json(status, body){ return { statusCode: status, headers:{ 'Content-Type': 'application/json' }, body: JSON.stringify(body) }; }

function canAccessProperty(user, property){
  if (!user) return false;
  if (user.role === 'admin') return true;
  const props = Array.isArray(user.properties) ? user.properties : (user.properties === '*' ? ['*'] : []);
  if (props.includes('*')) return true;
  return props.includes(property);
}

function toISO(d){
  if (!d) return '';
  if (typeof d === 'string') return d.slice(0,10);
  try{ const z = new Date(d); const t = new Date(z.getTime() - z.getTimezoneOffset()*60000); return t.toISOString().slice(0,10); }catch(e){ return ''; }
}

function clamp(n, min, max){ return Math.max(min, Math.min(max, n)); }

function dateDiffDays(a, b){ try{ const da = new Date(a+'T00:00:00'); const db = new Date(b+'T00:00:00'); return Math.round((db-da)/86400000)+1; }catch(e){ return 0; } }

function addDaysISO(iso, days){ try{ const d = new Date(iso+'T00:00:00'); d.setDate(d.getDate()+days); return toISO(d); }catch(e){ return iso; } }

function autoGenerateWeeks(planType, startDate, endDate){
  const s = toISO(startDate); const e = toISO(endDate);
  const days = dateDiffDays(s, e) || (planType === '60_day' ? 60 : 30);
  let weeksCount = planType === '60_day' ? Math.round(days/7) : Math.round(days/7);
  if (planType === '30_day') weeksCount = clamp(weeksCount, 4, 5);
  else weeksCount = clamp(weeksCount, 8, 9);
  const out = [];
  let curStart = s;
  for (let i=1; i<=weeksCount; i++){
    const curEnd = i === weeksCount ? e : addDaysISO(curStart, 6);
    out.push({
      weekNumber: i,
      weekLabel: `Week ${i} (${curStart} – ${curEnd})`,
      dateRangeStart: curStart,
      dateRangeEnd: curEnd,
      leasingFocus: '',
      communityOutreach: '',
      socialDigital: '',
      weeklyTaskSummary: '',
      priority: i,
      tasks: []
    });
    curStart = addDaysISO(curEnd, 1);
    if (curStart > e) break;
  }
  return out;
}

function normalizeTask(t){
  if (!t || typeof t !== 'object') return null;
  return {
    id: String(t.id || new ObjectId().toString()),
    title: String(t.title||'').trim(),
    channel: String(t.channel||'').trim(),
    dueDate: t.dueDate ? toISO(t.dueDate) : '',
    status: ['not_started','in_progress','done'].includes(String(t.status||'not_started')) ? String(t.status||'not_started') : 'not_started',
    notes: String(t.notes||'').trim(),
  };
}

function normalizeWeek(w, idx){
  if (!w || typeof w !== 'object') return null;
  const tasks = Array.isArray(w.tasks) ? w.tasks.map(normalizeTask).filter(Boolean) : [];
  return {
    weekNumber: Number.isFinite(w.weekNumber) ? w.weekNumber : (idx+1),
    weekLabel: String(w.weekLabel||'').trim() || `Week ${(idx+1)}`,
    dateRangeStart: w.dateRangeStart ? toISO(w.dateRangeStart) : '',
    dateRangeEnd: w.dateRangeEnd ? toISO(w.dateRangeEnd) : '',
    leasingFocus: String(w.leasingFocus||'').trim(),
    communityOutreach: String(w.communityOutreach||'').trim(),
    socialDigital: String(w.socialDigital||'').trim(),
    weeklyTaskSummary: String(w.weeklyTaskSummary||'').trim(),
    priority: Number.isFinite(w.priority) ? w.priority : (idx+1),
    tasks,
  };
}

function normalizePlan(body, { forUpdate=false } = {}){
  const planType = (body.planType === '60_day') ? '60_day' : '30_day';
  const startDate = toISO(body.startDate || body.start || '');
  const endDate = toISO(body.endDate || body.end || '');
  const name = String(body.name||'').trim();
  const termLabel = String(body.termLabel||'').trim();
  const primaryGoals = String(body.primaryGoals||'').trim();
  const targetAudiences = String(body.targetAudiences||'').trim();
  const keyDates = Array.isArray(body.keyDates)
    ? (body.keyDates||[]).map(k => ({ label: String(k?.label||'').trim(), date: k?.date ? toISO(k.date) : '' }))
    : String(body.keyDates||'').trim();
  const keyTasks = String(body.keyTasks||'').trim();
  const ongoingTasks = String(body.ongoingTasks||body.keyTasks||'').trim();
  const preleaseStart = Number.isFinite(+body.preleaseStart) ? +body.preleaseStart : null;
  const preleaseEnd = Number.isFinite(+body.preleaseEnd) ? +body.preleaseEnd : null;
  const applicationsGoal = Number.isFinite(+body.applicationsGoal) ? +body.applicationsGoal : null;
  const applicationsActual = Number.isFinite(+body.applicationsActual) ? +body.applicationsActual : null;
  const leasesGoal = Number.isFinite(+body.leasesGoal) ? +body.leasesGoal : null;
  const leasesActual = Number.isFinite(+body.leasesActual) ? +body.leasesActual : null;
  const notes = String(body.notes||'').trim();
  let weeks = Array.isArray(body.weeks) ? body.weeks.map(normalizeWeek).filter(Boolean) : [];
  if (!weeks.length && startDate && endDate){ weeks = autoGenerateWeeks(planType, startDate, endDate); }
  const out = { name, planType, termLabel, startDate, endDate, primaryGoals, targetAudiences, keyDates, keyTasks, ongoingTasks, preleaseStart, preleaseEnd, applicationsGoal, applicationsActual, leasesGoal, leasesActual, notes, weeks };
  if (forUpdate){ return out; }
  return out;
}

export async function handler(event){
  const user = verifyReqAuth(event);
  if (!user) return json(401, { error: 'unauthorized' });

  const method = event.httpMethod || 'GET';
  const url = new URL(event.rawUrl || `http://localhost${event.path}`);
  const qs = event.queryStringParameters || {};
  const property = url.searchParams.get('property') || qs.property || '';
  const id = url.searchParams.get('id') || qs.id || '';

  try{
    const db = await getDb();

    if (method === 'GET'){
      if (id){
        const doc = await db.collection('marketing_plans').findOne({ _id: new ObjectId(id) });
        if (!doc) return json(404, { error:'not_found' });
        if (!canAccessProperty(user, doc.property)) return json(403, { error:'forbidden' });
        return json(200, { id: doc._id.toString(), ...doc, _id: undefined });
      }
      if (!property) return json(400, { error:'property required' });
      if (!canAccessProperty(user, property)) return json(403, { error:'forbidden' });
      const list = await db.collection('marketing_plans')
        .find({ property })
        .project({
          name:1, planType:1, termLabel:1, startDate:1, endDate:1, createdByUserId:1, createdAt:1, updatedAt:1
        })
        .sort({ updatedAt: -1 })
        .toArray();
      return json(200, list.map(d => ({
        id: d._id.toString(),
        property,
        name: d.name,
        planType: d.planType,
        termLabel: d.termLabel || '',
        startDate: d.startDate || '',
        endDate: d.endDate || '',
        createdByUserId: d.createdByUserId || '',
        createdAt: d.createdAt || null,
        updatedAt: d.updatedAt || null,
      })));
    }

    if (method === 'POST'){
      let body = {};
      try{ body = JSON.parse(event.body||'{}'); }catch(e){ return json(400, { error:'invalid_json' }); }
      const action = String(body.action||'').trim();

      if (action === 'duplicate'){
        const srcId = String(body.id||'').trim();
        if (!srcId) return json(400, { error:'id required' });
        const src = await db.collection('marketing_plans').findOne({ _id: new ObjectId(srcId) });
        if (!src) return json(404, { error:'not_found' });
        if (!canAccessProperty(user, src.property)) return json(403, { error:'forbidden' });
        // Clone and reset task statuses
        const clone = JSON.parse(JSON.stringify(src));
        delete clone._id;
        clone.name = (body.name ? String(body.name).trim() : (src.name + ' (Copy)')).slice(0, 200);
        if (Array.isArray(clone.weeks)){
          for (const w of clone.weeks){ if (Array.isArray(w.tasks)){ for (const t of w.tasks){ t.status = 'not_started'; t.id = new ObjectId().toString(); } } }
        }
        clone.createdByUserId = user.sub;
        clone.createdAt = new Date();
        clone.updatedAt = new Date();
        const res = await db.collection('marketing_plans').insertOne(clone);
        return json(200, { id: res.insertedId.toString() });
      }

      const prop = String(body.property||property||'').trim();
      if (!prop) return json(400, { error:'property required' });
      if (!canAccessProperty(user, prop)) return json(403, { error:'forbidden' });
      const plan = normalizePlan(body||{});
      if (!plan.name || !plan.startDate || !plan.endDate) return json(400, { error:'name, startDate, endDate required' });
      const doc = { property: prop, ...plan, createdByUserId: user.sub, createdAt: new Date(), updatedAt: new Date() };
      const res = await db.collection('marketing_plans').insertOne(doc);
      return json(200, { id: res.insertedId.toString() });
    }

    if (method === 'PUT'){
      let body = {};
      try{ body = JSON.parse(event.body||'{}'); }catch(e){ return json(400, { error:'invalid_json' }); }
      const planId = String(body.id||'').trim();
      if (!planId) return json(400, { error:'id required' });
      const existing = await db.collection('marketing_plans').findOne({ _id: new ObjectId(planId) });
      if (!existing) return json(404, { error:'not_found' });
      if (!canAccessProperty(user, existing.property)) return json(403, { error:'forbidden' });
      const updates = normalizePlan(body||{}, { forUpdate: true });
      updates.updatedAt = new Date();
      await db.collection('marketing_plans').updateOne({ _id: new ObjectId(planId) }, { $set: updates });
      return json(200, { ok:true });
    }

    if (method === 'DELETE'){
      let body = {};
      try{ body = JSON.parse(event.body||'{}'); }catch(e){ return json(400, { error:'invalid_json' }); }
      const planId = String(body.id||'').trim();
      if (!planId) return json(400, { error:'id required' });
      const existing = await db.collection('marketing_plans').findOne({ _id: new ObjectId(planId) });
      if (!existing) return json(404, { error:'not_found' });
      if (!canAccessProperty(user, existing.property)) return json(403, { error:'forbidden' });
      await db.collection('marketing_plans').deleteOne({ _id: new ObjectId(planId) });
      return json(200, { ok:true });
    }

    return json(405, { error:'method_not_allowed' });
  }catch(e){
    return json(500, { error:'server_error', detail: String(e?.message||e) });
  }
}
