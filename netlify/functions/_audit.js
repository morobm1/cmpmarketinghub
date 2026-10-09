/**
 * Shared Reslife audit trail.
 *
 * reslife_audit_log: { property, at, by, role, area, action, entityId, detail }
 *   area: 'programs' | 'safety' | 'accommodations'
 *   action: short verb, e.g. 'create', 'update', 'status', 'view', 'list', 'guest-check', 'import'
 *   detail: small, NON-SENSITIVE object (field names, status values, counts). Never put names,
 *           identifying details or notes from restricted records here.
 *
 * Audit writes must never break the request they describe, so failures are swallowed
 * and reported to stderr without any record content.
 */
export async function audit(db, { property, user, area, action, entityId, detail }) {
  try {
    await db.collection('reslife_audit_log').insertOne({
      property: property || '',
      at: new Date().toISOString(),
      by: (user && user.sub) || 'system',
      role: (user && user.role) || '',
      area: area || '',
      action: action || '',
      entityId: entityId ? String(entityId) : '',
      detail: detail && typeof detail === 'object' ? detail : {},
    });
  } catch (e) {
    console.error('[audit] write failed for', area, action);
  }
}

export async function readAudit(db, { property, area, entityId, limit }) {
  const q = { property };
  if (area) q.area = area;
  if (entityId) q.entityId = String(entityId);
  return db.collection('reslife_audit_log').find(q, { projection: { _id: 0 } })
    .sort({ at: -1 }).limit(Math.min(Number(limit) || 200, 500)).toArray();
}
