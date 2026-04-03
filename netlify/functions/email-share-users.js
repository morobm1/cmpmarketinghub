import { verifyReqAuth } from './_auth.js';
import { getDb } from './_db.js';

/**
 * Email Share Users API - returns simple user list for sharing
 * Any authenticated user can access this (not admin-only).
 * GET - Returns list of { username, role } for all users
 */
export async function handler(event) {
  const user = verifyReqAuth(event);
  if (!user) return { statusCode: 401, body: 'Unauthorized' };

  const db = await getDb();
  const json = (data) => ({ statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });

  try {
    if (event.httpMethod === 'GET') {
      const docs = await db.collection('users')
        .find({}, { projection: { _id: 0, username: 1, role: 1 } })
        .toArray();
      // Exclude the requesting user from the list
      const filtered = docs.filter(d => d.username !== user.sub);
      return json(filtered);
    }
    return { statusCode: 405, body: 'Method not allowed' };
  } catch (err) {
    console.error('email-share-users error:', err);
    return { statusCode: 500, body: 'Internal server error' };
  }
}
