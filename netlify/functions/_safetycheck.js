import { bestMatch, effectiveRestrictionStatus } from './_safety.js';
import { audit } from './_audit.js';
import { notify } from './_notify.js';

/**
 * Server-side guest screening against ACTIVE, verified restrictions only.
 * Pending/unverified reports, expired and revoked records never match.
 *
 * Writes one reslife_safety_checks row per hit set (no guest PII beyond the name already in the guest log),
 * and returns { checkId, hits: [{record, level}] }. Callers decide what to reveal per role.
 */
export async function screenGuest(db, { property, guestName, guestLogId, user, source }) {
  if (!guestName || !property) return { checkId: null, hits: [] };
  const now = new Date();
  const recs = await db.collection('reslife_safety_records').find({ property, subjectType: 'guest', status: 'active' }).toArray();
  const hits = [];
  for (const r of recs) {
    if (effectiveRestrictionStatus(r, now) !== 'active') continue;
    const level = bestMatch(guestName, r);
    if (level) hits.push({ record: r, level });
  }
  if (!hits.length) return { checkId: null, hits: [] };
  const doc = {
    property, at: now.toISOString(), by: (user && user.sub) || source || 'system', source: source || 'staff',
    guestLogId: guestLogId ? String(guestLogId) : '', recordIds: hits.map(h => String(h.record._id)), levels: hits.map(h => h.level),
    outcome: 'pending', resolvedBy: '', resolvedAt: '', note: '',
  };
  const r = await db.collection('reslife_safety_checks').insertOne(doc);
  await audit(db, { property, user: user || { sub: source || 'system', role: 'system' }, area: 'safety', action: 'guest-check-hit', entityId: r.insertedId, detail: { hits: hits.length, source: doc.source } });
  // Notification text is deliberately generic: no names or record details in previews.
  const mgrs = await db.collection('users').find({ properties: property, role: { $in: ['reslife-rec', 'reslife-admin'] } }, { projection: { username: 1 } }).toArray();
  await notify(db, { property, to: mgrs.map(m => m.username), title: 'Guest check needs verification', message: 'A guest entry needs a restricted-access verification. Open the Guest Log to review.', type: 'safety', priority: 'urgent', link: 'guestlog', createdBy: 'system' });
  return { checkId: String(r.insertedId), hits };
}
