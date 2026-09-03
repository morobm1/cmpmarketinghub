import { verifyReqAuth } from './_auth.js';
import { getDb, ObjectId } from './_db.js';
import { canAccessReslifeProperty, refreshReslifeUser, json } from './_reslife.js';

/**
 * Curriculum Management — In-app Notification Center
 *
 * This app has no email/SMS sending infrastructure anywhere, so curriculum
 * notifications are in-app only (created server-side by
 * reslife-curriculum-assignments.js at the moment relevant events happen —
 * see notify()/managersForProperty() there). This endpoint only reads and
 * marks them read for the current user.
 *
 * GET ?property=X                        - the caller's own notifications (most recent 50)
 * PUT { id, property, action:'markRead' } - mark one notification read
 * PUT { property, action:'markAllRead' }  - mark all of the caller's notifications read
 */
export async function handler(event) {
  const user = verifyReqAuth(event);
  if (!user) return { statusCode: 401, body: 'Unauthorized' };

  const db = await getDb();
  await refreshReslifeUser(db, user);
  const col = db.collection('reslife_curriculum_notifications');

  try {
    if (event.httpMethod === 'GET') {
      const { property } = event.queryStringParameters || {};
      if (!property) return { statusCode: 400, body: 'Missing property' };
      if (!canAccessReslifeProperty(user, property)) return { statusCode: 403, body: 'Forbidden' };
      const docs = await col.find({ property, forUsername: user.sub }).sort({ createdAt: -1 }).limit(50).toArray();
      docs.forEach(d => { d.id = d._id.toString(); });
      return json(200, docs);
    }

    if (event.httpMethod === 'PUT') {
      const body = JSON.parse(event.body || '{}');
      const { property, action, id } = body;
      if (!property) return { statusCode: 400, body: 'Missing property' };
      if (!canAccessReslifeProperty(user, property)) return { statusCode: 403, body: 'Forbidden' };
      if (action === 'markAllRead') {
        await col.updateMany({ property, forUsername: user.sub, read: false }, { $set: { read: true } });
        return json(200, { success: true });
      }
      if (action === 'markRead' && id) {
        await col.updateOne({ _id: new ObjectId(id), property, forUsername: user.sub }, { $set: { read: true } });
        return json(200, { success: true });
      }
      return { statusCode: 400, body: 'Unknown action' };
    }

    return { statusCode: 405, body: 'Method Not Allowed' };
  } catch (e) {
    return { statusCode: 500, body: e.message };
  }
}
