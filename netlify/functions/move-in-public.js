import { getDb } from './_db.js';
import { normName, normEmail, normPhone } from './move-in.js';

/**
 * Move-In Day App — PUBLIC endpoint used by move_in.html (resident phones). No login.
 * Access is scoped by the property's secret link key (k).
 *
 * POST { action:'config', k }                        → branding for the check-in screen
 * POST { action:'verify', k, name, email, phone }    → { ok, resident:{firstName, unit}, page:{...} }
 *
 * Verification: full name must match the directory (case/punctuation-insensitive) AND
 * either the email or the phone number must match that same directory record.
 */
const json = (statusCode, obj) => ({ statusCode, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(obj) });
const MAX_FAILS = 15;      // per property per 10 minutes
const BRAND = ['brandName', 'logoUrl', 'primaryColor', 'accentColor', 'heroImageUrl', 'welcomeTitle'];
const PAGE = [...BRAND, 'welcomeMessage', 'wifiNetwork', 'wifiPassword', 'wifiInstructions', 'mapImage', 'mapNotes',
  'communityInfo', 'hours', 'workOrderInstructions', 'workOrderUrl', 'contactPhone', 'contactEmail'];
const pick = (o, keys) => Object.fromEntries(keys.map(k => [k, o[k] || '']));

export async function handler(event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  let body;
  try { body = JSON.parse(event.body || '{}'); } catch { return json(400, { ok: false, error: 'Bad request' }); }
  const k = String(body.k || '');
  if (k.length < 16) return json(404, { ok: false, error: 'This move-in link is not valid.' });

  try {
    const db = await getDb();
    const settingsCol = db.collection('movein_settings');
    const s = await settingsCol.findOne({ key: k });
    if (!s) return json(404, { ok: false, error: 'This move-in link is not valid. Please see the leasing office.' });

    if (body.action === 'config') return json(200, { ok: true, brand: pick(s, BRAND) });

    if (body.action === 'verify') {
      const now = new Date();
      const recent = (s.fails || []).filter(t => now - new Date(t) < 10 * 60e3);
      if (recent.length >= MAX_FAILS) return json(429, { ok: false, error: 'Too many attempts. Please wait a few minutes or see the leasing office.' });

      const nameKey = normName(body.name), emailKey = normEmail(body.email), phoneKey = normPhone(body.phone);
      let match = null;
      if (nameKey && (emailKey || phoneKey.length === 10)) {
        const candidates = await db.collection('movein_residents').find({ property: s.property, nameKey }).limit(20).toArray();
        match = candidates.find(r => (emailKey && r.emailKey && r.emailKey === emailKey) || (phoneKey.length === 10 && r.phoneKey === phoneKey)) || null;
      }
      if (!match) {
        await settingsCol.updateOne({ _id: s._id }, { $set: { fails: [...recent, now.toISOString()] } });
        return json(404, { ok: false, error: 'We couldn’t find you on our move-in list. Please check that your name, email, and phone match your lease, or see the leasing office.' });
      }
      await db.collection('movein_checkins').insertOne({ property: s.property, residentId: match._id.toString(), name: match.name, unit: match.unit, at: now });
      return json(200, { ok: true, resident: { firstName: match.name.trim().split(/\s+/)[0], name: match.name, unit: match.unit }, page: pick(s, PAGE) });
    }

    return json(400, { ok: false, error: 'Unknown action' });
  } catch (e) {
    console.error('move-in-public error', e);
    return json(500, { ok: false, error: 'Something went wrong. Please try again.' });
  }
}
