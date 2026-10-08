import { getDb, json, C, PROPERTY_ID, getBrand, ensureIndexes, surveyState, rateLimited, isPublicId, parseBody, randomToken } from './_pulse.js';
import { validateAnswers } from '../../pulse-survey/engine.js';

/**
 * Netlify Function: pulse-survey-public  (NO LOGIN – resident-facing)
 *
 * GET  ?id=<publicId>&part=brand  → property branding (logo + colors) only
 * GET  ?id=<publicId>             → current published version + public settings
 * POST { action:'submit', id, version, answers, other, submissionId, website }
 * POST { action:'contact', id, name, email, phone, message }   (optional follow-up; never linked to answers)
 *
 * Only data needed to render the PUBLISHED survey is returned. Drafts, other
 * responses, analytics and admin data are never reachable from this endpoint.
 *
 * Anonymity: a stored response contains only survey id, version, answers,
 * timestamp and a random submission id. No IP address, user agent, cookie, or
 * resident identifier is stored. Rate limiting uses salted, daily-rotating
 * hashes that expire after 24h.
 */
const GRACE_MS = 48 * 3600e3; // in-progress respondents may finish on a superseded version for 48h
const STATE_MSG = {
  paused: 'This survey is temporarily paused. Please check back soon.',
  closed: 'This survey is now closed. Thank you for your interest!',
  notyet: 'This survey is not open yet.',
  unavailable: 'This survey is not available.',
};

function publicSettings(s) {
  const st = s.settings || {};
  return {
    title: st.title, intro: st.intro, thankYou: st.thankYou, anonymous: st.anonymous !== false,
    estimatedMinutes: st.estimatedMinutes || '', openAt: st.openAt || null, closeAt: st.closeAt || null,
    followUp: st.followUp && st.followUp.enabled ? { enabled: true, label: st.followUp.label } : { enabled: false },
  };
}

export async function handler(event) {
  let db;
  try { db = await getDb(); await ensureIndexes(db); }
  catch (e) { console.error('pulse public db', e); return json(503, { ok: false, error: 'The survey service is temporarily unavailable. Please try again.' }); }

  try {
    if (event.httpMethod === 'GET') {
      const qs = event.queryStringParameters || {};
      if (!isPublicId(qs.id)) return json(404, { ok: false, error: STATE_MSG.unavailable, state: 'unavailable' });
      const s = await db.collection(C.surveys).findOne({ publicId: qs.id, propertyId: PROPERTY_ID });
      if (!s) return json(404, { ok: false, error: STATE_MSG.unavailable, state: 'unavailable' });
      if (qs.part === 'brand') {
        const b = await getBrand(db);
        return json(200, { ok: true, brand: { name: b.name, location: b.location, logoDataUrl: b.logoDataUrl, primaryColor: b.primaryColor, accentColor: b.accentColor, accent2Color: b.accent2Color, backgroundColor: b.backgroundColor } }, { 'Cache-Control': 'public, max-age=300' });
      }
      const state = surveyState(s);
      if (state !== 'open') return json(200, { ok: true, state, message: STATE_MSG[state], survey: { title: s.settings.title } });
      const v = await db.collection(C.versions).findOne({ surveyId: s._id, version: s.currentVersion });
      if (!v) return json(404, { ok: false, error: STATE_MSG.unavailable, state: 'unavailable' });
      return json(200, { ok: true, state, survey: publicSettings(s), version: { version: v.version, definition: v.definition } });
    }

    if (event.httpMethod !== 'POST') return json(405, { ok: false, error: 'Method not allowed' });
    const body = parseBody(event);
    if (!body) return json(400, { ok: false, error: 'Invalid request.' });
    if (String(event.body || '').length > 200_000) return json(413, { ok: false, error: 'Submission too large.' });
    if (!isPublicId(body.id)) return json(404, { ok: false, error: STATE_MSG.unavailable });
    const s = await db.collection(C.surveys).findOne({ publicId: body.id, propertyId: PROPERTY_ID });
    if (!s) return json(404, { ok: false, error: STATE_MSG.unavailable });
    const state = surveyState(s);

    if (body.action === 'submit') {
      if (state !== 'open') return json(409, { ok: false, error: STATE_MSG[state], state });
      if (body.website) return json(200, { ok: true }); // honeypot: silently drop bots
      const submissionId = String(body.submissionId || '');
      if (!/^[A-Za-z0-9_-]{16,64}$/.test(submissionId)) return json(400, { ok: false, error: 'Invalid submission. Please reload the survey.' });
      if (await rateLimited(db, event, 'submit:' + s.publicId, 15, 3600e3)) return json(429, { ok: false, error: 'Too many submissions from this connection. Please try again later.' });

      const versionNo = Number(body.version);
      const v = await db.collection(C.versions).findOne({ surveyId: s._id, version: versionNo });
      if (!v) return json(409, { ok: false, error: 'This survey was updated. Please reload to continue.', reload: true });
      if (versionNo !== s.currentVersion) {
        const next = await db.collection(C.versions).findOne({ surveyId: s._id, version: versionNo + 1 });
        if (next && Date.now() - new Date(next.publishedAt).getTime() > GRACE_MS) return json(409, { ok: false, error: 'This survey was updated. Please reload to continue.', reload: true });
      }
      const res = validateAnswers(v.definition, body.answers, body.other);
      if (!res.ok) return json(422, { ok: false, error: 'Please review the highlighted questions.', errors: res.errors });

      const dup = await db.collection(C.responses).findOne({ submissionId });
      if (dup) return json(200, { ok: true, duplicate: true });
      const now = new Date().toISOString();
      const upd = await db.collection(C.surveys).findOneAndUpdate({ _id: s._id }, { $inc: { responseCount: 1, seqCounter: 1 }, $set: { lastResponseAt: now } }, { returnDocument: 'after' });
      const after = upd && (upd.value !== undefined ? upd.value : upd);
      try {
        await db.collection(C.responses).insertOne({
          _id: 'rsp_' + randomToken(16), submissionId, surveyId: s._id, propertyId: PROPERTY_ID, version: v.version,
          seq: (after && after.seqCounter) || null, answers: res.answers, other: res.other, status: 'submitted', submittedAt: now,
        });
      } catch (e) {
        await db.collection(C.surveys).updateOne({ _id: s._id }, { $inc: { responseCount: -1 } });
        if (e && e.code === 11000) return json(200, { ok: true, duplicate: true });
        throw e;
      }
      return json(200, { ok: true });
    }

    if (body.action === 'contact') {
      if (!(s.settings.followUp && s.settings.followUp.enabled)) return json(404, { ok: false, error: 'Not available.' });
      if (await rateLimited(db, event, 'contact:' + s.publicId, 5, 3600e3)) return json(429, { ok: false, error: 'Too many requests. Please try again later.' });
      const name = String(body.name || '').trim().slice(0, 120);
      const email = String(body.email || '').trim().slice(0, 200);
      const phone = String(body.phone || '').trim().slice(0, 40);
      if (!name || !(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || phone.replace(/\D/g, '').length >= 10)) return json(422, { ok: false, error: 'Please share your name and an email or phone number.' });
      // Deliberately stores NO survey response reference, version, or timing link.
      await db.collection(C.contacts).insertOne({ _id: 'con_' + randomToken(14), propertyId: PROPERTY_ID, topic: 'renewal-info', surveyTitle: s.settings.title, name, email, phone, message: String(body.message || '').slice(0, 1000), createdAt: new Date().toISOString().slice(0, 10) });
      return json(200, { ok: true });
    }

    return json(400, { ok: false, error: 'Unknown action' });
  } catch (e) {
    console.error('pulse public error', e);
    return json(500, { ok: false, error: 'Something went wrong. Please try again.' });
  }
}
