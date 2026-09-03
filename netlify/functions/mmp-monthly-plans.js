import { getDb, ObjectId } from './_db.js';
import { verifyReqAuth } from './_auth.js';

function json(status, body) { return { statusCode: status, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }; }

function canAccessProperty(user, property) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  const props = Array.isArray(user.properties) ? user.properties : (user.properties === '*' ? ['*'] : []);
  if (props.includes('*')) return true;
  return props.includes(property);
}

function str(v) { return String(v == null ? '' : v).trim(); }
function num(v) { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; }
function bool(v) { return v === true || v === 'true' || v === 1; }
function arr(v) { return Array.isArray(v) ? v : []; }

function normalizeKeyDate(k) { return { label: str(k?.label), date: str(k?.date) }; }
function normalizeHotSpot(h) { return { location: str(h?.location), type: str(h?.type), contact: str(h?.contact) }; }

function normalizeEffort(e) {
  return {
    id: str(e?.id) || ('e' + Math.random().toString(36).slice(2, 10)),
    name: str(e?.name),
    type: str(e?.type),
    date: str(e?.date),
    description: str(e?.description),
    cost: num(e?.cost),
    supplies: str(e?.supplies),
    actionDesired: str(e?.actionDesired),
    designLink: str(e?.designLink),
    flyersPosted: bool(e?.flyersPosted),
    eblastSent: bool(e?.eblastSent),
  };
}

function normalizeDigitalEffort(e) {
  return {
    id: str(e?.id) || ('d' + Math.random().toString(36).slice(2, 10)),
    title: str(e?.title),
    type: str(e?.type),
    date: str(e?.date),
    contentDetails: str(e?.contentDetails),
    caption: str(e?.caption),
    hashtags: str(e?.hashtags),
    actionDesired: str(e?.actionDesired),
    postedToSocial: bool(e?.postedToSocial),
  };
}

function normalizeMonth(m, idx) {
  const requirements = m?.requirements || {};
  const digitalRequirements = m?.digitalRequirements || {};
  const budget = m?.budget || {};
  function bcat(c) { return { budget: num(c?.budget), spend: num(c?.spend) }; }
  return {
    key: str(m?.key) || ('M' + idx),
    label: str(m?.label),
    year: Number.isFinite(+m?.year) ? +m.year : null,
    month: Number.isFinite(+m?.month) ? +m.month : null,
    leadGoal: num(m?.leadGoal),
    leaseGoal: num(m?.leaseGoal),
    notes: str(m?.notes),
    budget: {
      residentLife: bcat(budget.residentLife),
      modelLeasing: bcat(budget.modelLeasing),
      collateral: bcat(budget.collateral),
      sponsorships: bcat(budget.sponsorships),
    },
    requirements: {
      residentEvent: str(requirements.residentEvent),
      renewalRetention: str(requirements.renewalRetention),
      outreaching: str(requirements.outreaching),
      streetMarketing: str(requirements.streetMarketing),
      crossMarketing: str(requirements.crossMarketing),
      reviewCampaign: str(requirements.reviewCampaign),
    },
    digitalRequirements: {
      gmb: str(digitalRequirements.gmb),
      tiktok: str(digitalRequirements.tiktok),
      igReel: str(digitalRequirements.igReel),
      igGrid: str(digitalRequirements.igGrid),
      igStory: str(digitalRequirements.igStory),
      fbPage: str(digitalRequirements.fbPage),
      communityGroups: str(digitalRequirements.communityGroups),
    },
    engagementEfforts: arr(m?.engagementEfforts).map(normalizeEffort),
    digitalEfforts: arr(m?.digitalEfforts).map(normalizeDigitalEffort),
  };
}

function normalizePlan(body) {
  return {
    property: str(body.property),
    academicYear: str(body.academicYear),
    communityName: str(body.communityName),
    keyDates: arr(body.keyDates).map(normalizeKeyDate),
    hotSpots: arr(body.hotSpots).map(normalizeHotSpot),
    months: arr(body.months).map(normalizeMonth),
  };
}

export async function handler(event) {
  const user = verifyReqAuth(event);
  if (!user) return json(401, { error: 'unauthorized' });

  const method = event.httpMethod || 'GET';
  const url = new URL(event.rawUrl || `http://localhost${event.path}`);
  const qs = event.queryStringParameters || {};
  const property = url.searchParams.get('property') || qs.property || '';
  const id = url.searchParams.get('id') || qs.id || '';

  try {
    const db = await getDb();
    const col = db.collection('mmp_monthly_plans');

    if (method === 'GET') {
      if (id) {
        const doc = await col.findOne({ _id: new ObjectId(id) });
        if (!doc) return json(404, { error: 'not_found' });
        if (!canAccessProperty(user, doc.property)) return json(403, { error: 'forbidden' });
        return json(200, { id: doc._id.toString(), ...doc, _id: undefined });
      }
      if (!property) return json(400, { error: 'property required' });
      if (!canAccessProperty(user, property)) return json(403, { error: 'forbidden' });
      const list = await col
        .find({ property })
        .project({ property: 1, academicYear: 1, createdAt: 1, updatedAt: 1 })
        .sort({ academicYear: -1 })
        .toArray();
      return json(200, list.map(d => ({
        id: d._id.toString(),
        property: d.property,
        academicYear: d.academicYear,
        createdAt: d.createdAt || null,
        updatedAt: d.updatedAt || null,
      })));
    }

    if (method === 'POST') {
      let body = {};
      try { body = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'invalid_json' }); }
      const action = str(body.action);

      if (action === 'duplicate') {
        const srcId = str(body.id);
        const newYear = str(body.academicYear);
        if (!srcId || !newYear) return json(400, { error: 'id and academicYear required' });
        const src = await col.findOne({ _id: new ObjectId(srcId) });
        if (!src) return json(404, { error: 'not_found' });
        if (!canAccessProperty(user, src.property)) return json(403, { error: 'forbidden' });
        const existing = await col.findOne({ property: src.property, academicYear: newYear });
        if (existing) return json(409, { error: 'exists', id: existing._id.toString() });
        const clone = JSON.parse(JSON.stringify(src));
        delete clone._id;
        clone.academicYear = newYear;
        // Carry over structure/requirements/budget targets but clear logged efforts + spend + notes for the new year
        if (Array.isArray(clone.months)) {
          for (const m of clone.months) {
            m.engagementEfforts = [];
            m.digitalEfforts = [];
            m.notes = '';
            if (m.budget) {
              for (const k of Object.keys(m.budget)) { m.budget[k].spend = 0; }
            }
          }
        }
        clone.createdByUserId = user.sub;
        clone.createdAt = new Date();
        clone.updatedAt = new Date();
        const res = await col.insertOne(clone);
        return json(200, { id: res.insertedId.toString() });
      }

      const prop = str(body.property || property);
      const year = str(body.academicYear);
      if (!prop || !year) return json(400, { error: 'property and academicYear required' });
      if (!canAccessProperty(user, prop)) return json(403, { error: 'forbidden' });
      const existing = await col.findOne({ property: prop, academicYear: year });
      if (existing) return json(409, { error: 'exists', id: existing._id.toString() });
      const plan = normalizePlan({ ...body, property: prop, academicYear: year });
      const doc = { ...plan, createdByUserId: user.sub, createdAt: new Date(), updatedAt: new Date() };
      const res = await col.insertOne(doc);
      return json(200, { id: res.insertedId.toString() });
    }

    if (method === 'PUT') {
      let body = {};
      try { body = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'invalid_json' }); }
      const planId = str(body.id);
      if (!planId) return json(400, { error: 'id required' });
      const existing = await col.findOne({ _id: new ObjectId(planId) });
      if (!existing) return json(404, { error: 'not_found' });
      if (!canAccessProperty(user, existing.property)) return json(403, { error: 'forbidden' });
      const updates = normalizePlan({ ...existing, ...body, property: existing.property, academicYear: existing.academicYear });
      updates.updatedAt = new Date();
      delete updates.property;
      delete updates.academicYear;
      await col.updateOne({ _id: new ObjectId(planId) }, { $set: updates });
      return json(200, { ok: true });
    }

    if (method === 'DELETE') {
      let body = {};
      try { body = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'invalid_json' }); }
      const planId = str(body.id);
      if (!planId) return json(400, { error: 'id required' });
      const existing = await col.findOne({ _id: new ObjectId(planId) });
      if (!existing) return json(404, { error: 'not_found' });
      if (!canAccessProperty(user, existing.property)) return json(403, { error: 'forbidden' });
      await col.deleteOne({ _id: new ObjectId(planId) });
      return json(200, { ok: true });
    }

    return json(405, { error: 'method_not_allowed' });
  } catch (e) {
    return json(500, { error: 'server_error', detail: String(e?.message || e) });
  }
}
