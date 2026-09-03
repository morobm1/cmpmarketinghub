import { verifyReqAuth, createUser, updateUser, findUser } from './_auth.js';
import { getDb } from './_db.js';
import { getReslifeProperties, refreshReslifeUser, json } from './_reslife.js';

const MANAGEABLE_ROLES = ['reslife-ra', 'reslife-rec'];

/**
 * Reslife Hub — Scoped User Management (Reslife Admin only)
 *
 * Reslife Admin can create/edit/delete "Reslife - RA" and "Reslife - REC" accounts,
 * but ONLY for properties they themselves are assigned to, and can never create/edit
 * another Reslife Admin or any other role. This is intentionally much narrower than
 * the site-wide /api/auth-users endpoint (which remains admin-only).
 *
 * GET                     - list RA/REC accounts scoped to the caller's properties
 * POST                    - create an RA/REC account { username, password, role, property }
 * PUT                     - update an RA/REC account { username, updates: { role?, property?, password? } }
 * DELETE                  - remove an RA/REC account { username }
 */
export async function handler(event) {
  const user = verifyReqAuth(event);
  if (!user) return { statusCode: 401, body: 'Unauthorized' };

  const db = await getDb();
  await refreshReslifeUser(db, user);

  const isSiteAdmin = user.role === 'admin';
  const isReslifeAdminUser = user.role === 'reslife-admin';
  if (!isSiteAdmin && !isReslifeAdminUser) return { statusCode: 403, body: 'Forbidden' };

  const myProperties = getReslifeProperties(user);

  function inScope(propertiesArr) {
    if (isSiteAdmin) return true;
    const props = Array.isArray(propertiesArr) ? propertiesArr : [];
    return props.length > 0 && props.every(p => myProperties.includes(p));
  }

  try {
    if (event.httpMethod === 'GET') {
      const filter = { role: { $in: MANAGEABLE_ROLES } };
      if (!isSiteAdmin) filter.properties = { $in: myProperties };
      const docs = await db.collection('users').find(filter, { projection: { _id: 0, passwordHash: 0 } }).toArray();
      return json(200, docs);
    }

    if (event.httpMethod === 'POST') {
      const { username, password, role, property } = JSON.parse(event.body || '{}');
      if (!username || !password || !role || !property) {
        return { statusCode: 400, body: 'Missing username/password/role/property' };
      }
      if (!MANAGEABLE_ROLES.includes(role)) return { statusCode: 400, body: 'Invalid role' };
      if (!inScope([property])) return { statusCode: 403, body: 'Property not in your scope' };
      const existing = await findUser(username);
      if (existing) return { statusCode: 409, body: 'Username already exists' };
      const doc = await createUser({ username, password, role, properties: [property] });
      return json(200, { username: doc.username, role: doc.role, properties: doc.properties });
    }

    if (event.httpMethod === 'PUT') {
      const { username, updates } = JSON.parse(event.body || '{}');
      if (!username || !updates) return { statusCode: 400, body: 'Missing username/updates' };
      const target = await findUser(username);
      if (!target || !MANAGEABLE_ROLES.includes(target.role)) return { statusCode: 404, body: 'Not found' };
      if (!inScope(target.properties)) return { statusCode: 403, body: 'Forbidden' };

      const safeUpdates = {};
      if (updates.password) safeUpdates.password = updates.password;
      if (updates.role) {
        if (!MANAGEABLE_ROLES.includes(updates.role)) return { statusCode: 400, body: 'Invalid role' };
        safeUpdates.role = updates.role;
      }
      if (updates.property) {
        if (!inScope([updates.property])) return { statusCode: 403, body: 'Property not in your scope' };
        safeUpdates.properties = [updates.property];
      }
      await updateUser(username, safeUpdates);
      return json(200, { success: true });
    }

    if (event.httpMethod === 'DELETE') {
      const { username } = JSON.parse(event.body || '{}');
      if (!username) return { statusCode: 400, body: 'Missing username' };
      const target = await findUser(username);
      if (!target || !MANAGEABLE_ROLES.includes(target.role)) return { statusCode: 404, body: 'Not found' };
      if (!inScope(target.properties)) return { statusCode: 403, body: 'Forbidden' };
      await db.collection('users').deleteOne({ username });
      return json(200, { success: true });
    }

    return { statusCode: 405, body: 'Method Not Allowed' };
  } catch (e) {
    return { statusCode: 500, body: e.message };
  }
}
