/**
 * NOTE ON "property": every reslife_* collection scopes documents by the
 * property NAME string (e.g. "The Harbour at Occ"), matching the exact
 * convention used by `user.properties`, events, budgets, etc. elsewhere in
 * this app (see mmp_admin.html property checkboxes / best_practices.md).
 * This is distinct from the slug `id` used by the properties collection and
 * by email_brand_kits' `propertyId` field — the frontend resolves name -> id
 * only when it needs to look up a brand kit for theming.
 *
 * Shared helpers for Reslife Hub endpoints.
 * Reslife roles are restricted, property-scoped credential types:
 *   - reslife-ra    : Resident Assistant   (view + submit own items)
 *   - reslife-rec   : Resident Engagement Coordinator (RA powers + manage roster/announcements/resolve incidents)
 *   - reslife-admin : Property-level admin for Reslife Hub (full CRUD for their assigned properties + manage RA/REC accounts)
 *
 * Property access reuses the existing `user.properties` array on the user document
 * (same field used everywhere else in the app), so Reslife credentials stay tied
 * to the standard property key system. Site-wide `admin` always has full access
 * for support purposes.
 */

export const RESLIFE_ROLES = ['reslife-ra', 'reslife-rec', 'reslife-admin'];

export const RESLIFE_ROLE_LABELS = {
  'reslife-ra': 'Reslife - RA',
  'reslife-rec': 'Reslife - REC',
  'reslife-admin': 'Reslife Admin',
};

export function isReslifeRole(role) {
  return RESLIFE_ROLES.includes(role);
}

// RA + REC + Admin can all view / submit their own items
export function isReslifeUser(role) {
  return isReslifeRole(role);
}

// REC + Admin can manage roster, post announcements, resolve any incident/request
export function isReslifeManager(role) {
  return role === 'reslife-rec' || role === 'reslife-admin';
}

// Only Admin has full CRUD + user management
export function isReslifeAdmin(role) {
  return role === 'reslife-admin';
}

export function getReslifeProperties(user) {
  return Array.isArray(user.properties) ? user.properties : [];
}

/**
 * True if the user may access Reslife data scoped to `property`.
 * Site admin always passes. Reslife roles must have that property in their
 * `properties` array.
 */
export function canAccessReslifeProperty(user, property) {
  if (!property) return false;
  if (user.role === 'admin') return true;
  if (!isReslifeRole(user.role)) return false;
  return getReslifeProperties(user).includes(property);
}

/**
 * True if the user may create/edit/delete shared Reslife content
 * (announcements, roster, directory) for `property` — i.e. manager tier or above.
 */
export function canManageReslifeProperty(user, property) {
  if (!canAccessReslifeProperty(user, property)) return false;
  return user.role === 'admin' || isReslifeManager(user.role);
}

/**
 * True if the user may fully administer Reslife data (directory CRUD,
 * user management) for `property`.
 */
export function canAdminReslifeProperty(user, property) {
  if (!canAccessReslifeProperty(user, property)) return false;
  return user.role === 'admin' || isReslifeAdmin(user.role);
}

/**
 * True if the user may edit/delete a specific record they may not own outright:
 * owner of the record, or a manager/admin for that property.
 */
export function canModifyReslifeRecord(user, property, ownerUsername) {
  if (!canAccessReslifeProperty(user, property)) return false;
  if (user.role === 'admin' || isReslifeManager(user.role)) return true;
  return !!ownerUsername && ownerUsername === user.sub;
}

export function json(statusCode, data) {
  return { statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) };
}

/**
 * Re-fetch role/properties from the DB to avoid acting on stale JWT claims
 * (mirrors the pattern used in email-brand-kits.js).
 */
export async function refreshReslifeUser(db, user) {
  const fresh = await db.collection('users').findOne({ username: user.sub });
  if (fresh) {
    user.role = fresh.role;
    user.properties = fresh.properties;
  }
  return user;
}
