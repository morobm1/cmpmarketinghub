import crypto from 'crypto';
import { verifyReqAuth } from './_auth.js';
import { getDb } from './_db.js';

/**
 * Move-In Day App — STAFF endpoint (login required, scoped to the user's properties).
 *
 * GET  ?property=ID                                → { settings, residents:[...], checkins:[...] }
 * POST { action:'saveResidents', property, residents:[{name,unit,email,phone}] }  (replaces directory)
 * POST { action:'saveSettings', property, settings:{...} }
 * POST { action:'rotateKey', property }            → new public link key
 *
 * Collections: movein_settings { property, key, brandName, colors, welcome, wifi..., mapImage, sections }
 *              movein_residents { property, name, unit, email, phone, nameKey, emailKey, phoneKey }
 *              movein_checkins  { property, residentId, name, unit, at }
 */
const json = (statusCode, obj) => ({ statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(obj) });
const clip = (s, n) => String(s ?? '').trim().slice(0, n);
export const normName = s => String(s || '').toLowerCase().replace(/[^a-z]/g, '');
export const normEmail = s => String(s || '').trim().toLowerCase();
export const normPhone = s => String(s || '').replace(/\D/g, '').slice(-10);

const SETTING_FIELDS = {
  brandName: 200, logoUrl: 2000, primaryColor: 20, accentColor: 20, heroImageUrl: 2000,
  welcomeTitle: 200, welcomeMessage: 4000,
  wifiNetwork: 200, wifiPassword: 200, wifiInstructions: 4000,
  mapImage: 3_000_000, mapNotes: 4000,
  communityInfo: 6000, hours: 4000, workOrderInstructions: 4000, workOrderUrl: 2000,
  contactPhone: 50, contactEmail: 200,
};

function canAccess(user, property) {
  if (user.role === 'admin') return true;
  const p = user.properties;
  return p === '*' || (Array.isArray(p) && (p.includes(property) || p.includes('*')));
}

export async function handler(event) {
  const user = verifyReqAuth(event);
  if (!user) return json(401, { error: 'Unauthorized' });
  const db = await getDb();
  const settingsCol = db.collection('movein_settings');
  const residentsCol = db.collection('movein_residents');

  try {
    if (event.httpMethod === 'GET') {
      const property = clip(event.queryStringParameters?.property, 200);
      if (!property) return json(400, { error: 'Missing property' });
      if (!canAccess(user, property)) return json(403, { error: 'Forbidden' });
      let settings = await settingsCol.findOne({ property });
      if (!settings) {
        settings = { property, key: crypto.randomBytes(12).toString('hex'), createdAt: new Date() };
        await settingsCol.insertOne(settings);
      }
      const residents = await residentsCol.find({ property }).project({ name: 1, unit: 1, email: 1, phone: 1 }).sort({ unit: 1 }).toArray();
      const checkins = await db.collection('movein_checkins').find({ property }).sort({ at: -1 }).limit(500).toArray();
      delete settings._id;
      return json(200, { settings, residents, checkins });
    }

    if (event.httpMethod !== 'POST') return json(405, { error: 'Method Not Allowed' });
    let body;
    try { body = JSON.parse(event.body || '{}'); } catch { return json(400, { error: 'Bad request' }); }
    const property = clip(body.property, 200);
    if (!property) return json(400, { error: 'Missing property' });
    if (!canAccess(user, property)) return json(403, { error: 'Forbidden' });

    if (body.action === 'saveResidents') {
      if (!Array.isArray(body.residents)) return json(400, { error: 'residents must be an array' });
      if (body.residents.length > 10000) return json(400, { error: 'Too many rows (max 10,000)' });
      const now = new Date();
      const docs = body.residents
        .map(r => ({ name: clip(r.name, 200), unit: clip(r.unit, 50), email: clip(r.email, 200), phone: clip(r.phone, 50) }))
        .filter(r => r.name)
        .map(r => ({ ...r, property, nameKey: normName(r.name), emailKey: normEmail(r.email), phoneKey: normPhone(r.phone), uploadedBy: user.sub, uploadedAt: now }));
      await residentsCol.deleteMany({ property });
      if (docs.length) await residentsCol.insertMany(docs);
      await settingsCol.updateOne({ property }, { $set: { directoryUpdatedAt: now, directoryUpdatedBy: user.sub } }, { upsert: true });
      return json(200, { ok: true, count: docs.length });
    }

    if (body.action === 'saveSettings') {
      const s = body.settings || {};
      const $set = { updatedAt: new Date(), updatedBy: user.sub };
      for (const [k, max] of Object.entries(SETTING_FIELDS)) if (k in s) $set[k] = clip(s[k], max);
      if ($set.mapImage && !/^data:image\/(png|jpe?g|webp|gif);base64,/.test($set.mapImage) && !/^https:\/\//.test($set.mapImage)) {
        return json(400, { error: 'Map must be an image upload or https URL' });
      }
      await settingsCol.updateOne({ property }, { $set, $setOnInsert: { key: crypto.randomBytes(12).toString('hex') } }, { upsert: true });
      return json(200, { ok: true });
    }

    if (body.action === 'rotateKey') {
      const key = crypto.randomBytes(12).toString('hex');
      await settingsCol.updateOne({ property }, { $set: { key } }, { upsert: true });
      return json(200, { ok: true, key });
    }

    return json(400, { error: 'Unknown action' });
  } catch (e) {
    console.error('move-in error', e);
    return json(500, { error: 'Server error' });
  }
}
