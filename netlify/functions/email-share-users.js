import { verifyReqAuth } from './_auth.js';
import { getDb } from './_db.js';
import { RESLIFE_ROLES } from './_reslife.js';

/**
 * Email Share Users API - returns simple user list for sharing
 * Any authenticated user can access this (not admin-only).
 * GET - Returns list of { username, role } for all users
 *
 * Reslife accounts (RA/REC/Admin) and Marketing Hub staff are segregated:
 * a Reslife user only sees other Reslife accounts (+ site admin) in the
 * picker, and Marketing staff never see Reslife accounts, so the two
 * credential populations can't be cross-referenced through this endpoint.
 * Site admin always sees everyone.
 */
export async function handler(event) {
  const user = verifyReqAuth(event);
  if (!user) return { statusCode: 401, body: 'Unauthorized' };

  const db = await getDb();
  const json = (data) => ({ statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });

  // Refresh role from DB to avoid stale JWT claims
  const freshUser = await db.collection('users').findOne({ username: user.sub });
  if (freshUser) user.role = freshUser.role;

  try {
    if (event.httpMethod === 'GET') {
      const docs = await db.collection('users')
        .find({}, { projection: { _id: 0, username: 1, role: 1 } })
        .toArray();
      let filtered = docs.filter(d => d.username !== user.sub);

      if (user.role !== 'admin') {
        const viewerIsReslife = RESLIFE_ROLES.includes(user.role);
        filtered = filtered.filter(d => {
          const targetIsReslife = RESLIFE_ROLES.includes(d.role);
          if (d.role === 'admin') return true;
          return viewerIsReslife === targetIsReslife;
        });
      }

      return json(filtered);
    }
    return { statusCode: 405, body: 'Method not allowed' };
  } catch (err) {
    console.error('email-share-users error:', err);
    return { statusCode: 500, body: 'Internal server error' };
  }
}
