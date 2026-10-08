import crypto from 'crypto';
import { getDb as realGetDb } from './_db.js';

/**
 * Shared helpers for the Ivory University House Pulse Survey functions.
 *
 * Collections (all new; no existing collection is modified):
 *   pulse_surveys           one doc per survey (draft definition + settings + status)
 *   pulse_survey_versions   immutable published snapshots {surveyId, version, definition, settings}
 *   pulse_responses         anonymous submissions {surveyId, version, answers, other, submittedAt}
 *   pulse_templates         reusable survey templates
 *   pulse_reports           saved report snapshots
 *   pulse_actions           action-plan items per survey
 *   pulse_brand             property brand configuration (logo, colors)
 *   pulse_contact_requests  optional renewal-info requests, NEVER linked to responses
 *   pulse_rate              short-lived hashed rate-limit buckets (TTL 24h)
 */
export const PROPERTY_ID = 'ivory-university-house';
export const PROPERTY_NAME = 'Ivory University House';
export const C = {
  surveys: 'pulse_surveys', versions: 'pulse_survey_versions', responses: 'pulse_responses',
  templates: 'pulse_templates', reports: 'pulse_reports', actions: 'pulse_actions',
  brand: 'pulse_brand', contacts: 'pulse_contact_requests', rate: 'pulse_rate',
};

/** Test hook: tests set globalThis.__PULSE_TEST_DB__ to an in-memory fake. */
export async function getDb() {
  if (globalThis.__PULSE_TEST_DB__) return globalThis.__PULSE_TEST_DB__;
  return realGetDb();
}

export const json = (statusCode, obj, extra = {}) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...extra },
  body: JSON.stringify(obj),
});

const RESLIFE_ROLES = ['reslife-ra', 'reslife-rec', 'reslife-admin'];
/** IUH access: admins, all-property users, or users assigned an Ivory/IUH property. */
export function canAccessIUH(user) {
  if (!user) return false;
  if (RESLIFE_ROLES.includes(user.role)) return false;
  if (user.role === 'admin') return true;
  const p = user.properties;
  if (p === '*') return true;
  if (Array.isArray(p)) return p.some((x) => x === '*' || /ivory|iuh/i.test(String(x)));
  return false;
}

/** Public base URL for share links. Never returns localhost. */
export function publicBaseUrl() {
  const cands = [process.env.PULSE_PUBLIC_BASE_URL, process.env.APP_BASE_URL, process.env.URL];
  for (const c of cands) {
    if (c && /^https:\/\//i.test(c) && !/localhost|127\.0\.0\.1/i.test(c)) return c.replace(/\/+$/, '');
  }
  return null;
}

export function randomToken(len = 12) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const bytes = crypto.randomBytes(len);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}
export const isPublicId = (s) => typeof s === 'string' && /^[A-Za-z0-9]{10,32}$/.test(s);

export const DEFAULT_BRAND = {
  propertyId: PROPERTY_ID,
  name: PROPERTY_NAME,
  shortName: 'IUH',
  location: 'Salt Lake City, Utah',
  logoDataUrl: '',          // uploaded in the tool's Branding dialog; none ships in the repo
  primaryColor: '#446472',  // existing IUH tool palette (iuh_wrs.html)
  accentColor: '#ffb732',
  accent2Color: '#52d5ff',
  backgroundColor: '#f8fafc',
};
export async function getBrand(db) {
  const b = await db.collection(C.brand).findOne({ propertyId: PROPERTY_ID });
  const out = { ...DEFAULT_BRAND, ...(b || {}) };
  delete out._id;
  return out;
}

let indexesDone = false;
export async function ensureIndexes(db) {
  if (indexesDone || globalThis.__PULSE_TEST_DB__) return;
  try {
    await Promise.all([
      db.collection(C.surveys).createIndex({ publicId: 1 }, { unique: true }),
      db.collection(C.surveys).createIndex({ propertyId: 1, status: 1, updatedAt: -1 }),
      db.collection(C.versions).createIndex({ surveyId: 1, version: 1 }, { unique: true }),
      db.collection(C.responses).createIndex({ surveyId: 1, submittedAt: -1 }),
      db.collection(C.responses).createIndex({ submissionId: 1 }, { unique: true }),
      db.collection(C.rate).createIndex({ createdAt: 1 }, { expireAfterSeconds: 86400 }),
      db.collection(C.rate).createIndex({ key: 1, createdAt: -1 }),
      db.collection(C.actions).createIndex({ surveyId: 1 }),
      db.collection(C.reports).createIndex({ propertyId: 1, createdAt: -1 }),
    ]);
    indexesDone = true;
  } catch (e) { console.error('pulse ensureIndexes', e.message); }
}

/** Survey open state, evaluated server-side. */
export function surveyState(s, now = new Date()) {
  if (!s || !s.currentVersion) return 'unavailable';
  if (s.status === 'paused') return 'paused';
  if (s.status === 'closed' || s.status === 'archived') return 'closed';
  if (s.status !== 'published') return 'unavailable';
  const st = s.settings || {};
  if (st.openAt && now < new Date(st.openAt)) return 'notyet';
  if (st.closeAt && now > new Date(st.closeAt)) return 'closed';
  return 'open';
}

/**
 * Privacy-preserving rate limit: the bucket key is a salted SHA-256 of
 * (client IP + survey + current UTC day). Raw IPs are never stored, the salt
 * rotates daily, and buckets self-delete after 24h (TTL index).
 */
export async function rateLimited(db, event, scope, max, windowMs) {
  const ip = event.headers['x-nf-client-connection-ip'] || event.headers['client-ip'] || (event.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  const day = new Date().toISOString().slice(0, 10);
  const secret = process.env.PULSE_RATE_SALT || process.env.JWT_SECRET || 'pulse';
  const key = crypto.createHash('sha256').update(`${ip}|${scope}|${day}|${secret}`).digest('hex').slice(0, 32);
  const since = new Date(Date.now() - windowMs);
  const n = await db.collection(C.rate).countDocuments({ key, createdAt: { $gte: since } });
  if (n >= max) return true;
  await db.collection(C.rate).insertOne({ key, createdAt: new Date() });
  return false;
}

export function parseBody(event) {
  try { return JSON.parse(event.body || '{}') || {}; } catch { return null; }
}

export function csvCell(v) {
  let s = v == null ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // neutralize spreadsheet formula injection
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
