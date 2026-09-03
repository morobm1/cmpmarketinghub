import { verifyReqAuth } from './_auth.js';
import { getDb, ObjectId } from './_db.js';
import { canAccessReslifeProperty, isReslifeManager, refreshReslifeUser, json } from './_reslife.js';

/**
 * Collateral / Recognition — Staff Shout-Outs
 * The digital complement to the Recognition committee's physical
 * positive-note box. Always attributed (never anonymous) since every
 * caller is an authenticated Reslife account.
 *
 * GET    ?property=X   - shout-outs visible to the caller: anything sent TO them,
 *                         anything they sent, and anything visible to 'staff_meeting'/'team'.
 *                         Managers see everything for oversight.
 * POST                  - create a shout-out (any Reslife role + admin)
 * DELETE ?id=X&property=Y - remove (author or manager tier — light moderation, not silent deletion by others)
 */
const VISIBILITIES = ['private', 'staff_meeting', 'team'];

export async function handler(event) {
  const user = verifyReqAuth(event);
  if (!user) return { statusCode: 401, body: 'Unauthorized' };

  const db = await getDb();
  await refreshReslifeUser(db, user);
  const col = db.collection('reslife_collateral_shoutouts');
  const manager = user.role === 'admin' || isReslifeManager(user.role);

  try {
    if (event.httpMethod === 'GET') {
      const { property } = event.queryStringParameters || {};
      if (!property) return { statusCode: 400, body: 'Missing property' };
      if (!canAccessReslifeProperty(user, property)) return { statusCode: 403, body: 'Forbidden' };
      const filter = { property };
      if (!manager) {
        filter.$or = [{ toUsername: user.sub }, { fromUsername: user.sub }, { visibility: { $in: ['staff_meeting', 'team'] } }];
      }
      const docs = await col.find(filter).sort({ createdAt: -1 }).limit(200).toArray();
      docs.forEach(d => { d.id = d._id.toString(); });
      return json(200, docs);
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { property, toUsername, message } = body;
      if (!property || !toUsername || !message) return { statusCode: 400, body: 'Missing property/toUsername/message' };
      if (!canAccessReslifeProperty(user, property)) return { statusCode: 403, body: 'Forbidden' };
      const now = new Date().toISOString();
      const doc = {
        property, fromUsername: user.sub, toUsername, message,
        visibility: VISIBILITIES.includes(body.visibility) ? body.visibility : 'team',
        createdAt: now,
      };
      const result = await col.insertOne(doc);
      doc.id = result.insertedId.toString();
      return json(200, doc);
    }

    if (event.httpMethod === 'DELETE') {
      const { id, property } = event.queryStringParameters || {};
      if (!id || !property) return { statusCode: 400, body: 'Missing id/property' };
      const existing = await col.findOne({ _id: new ObjectId(id), property });
      if (!existing) return { statusCode: 404, body: 'Not found' };
      if (existing.fromUsername !== user.sub && !manager) return { statusCode: 403, body: 'Forbidden' };
      await col.deleteOne({ _id: new ObjectId(id), property });
      return json(200, { success: true });
    }

    return { statusCode: 405, body: 'Method Not Allowed' };
  } catch (e) {
    return { statusCode: 500, body: e.message };
  }
}
