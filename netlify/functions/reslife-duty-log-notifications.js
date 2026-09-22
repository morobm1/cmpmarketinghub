import { verifyReqAuth } from './_auth.js';
import { getDb, ObjectId } from './_db.js';
import { canAccessReslifeProperty, isReslifeManager, refreshReslifeUser, json } from './_reslife.js';

/**
 * Duty Log — In-app Notifications
 *
 * Private, per-user alerts for the Duty Log auto-submit/missed-log scheduled
 * job (see reslife-duty-log-autosubmit.js) and the RA "Request Edit" ->
 * REC/Admin "unlock" workflow (see reslife-duty-log.js requestEdit/reopen).
 * Every doc is addressed to exactly one `forUsername` — an RA only ever sees
 * their own notifications, never a teammate's; REC/Admin only ever see their
 * own management alerts (or, with &all=1, every Duty Log notification for
 * the property, for oversight — still never exposed to non-manager roles).
 *
 * GET  ?property=X            - the caller's own notifications (most recent 200)
 * GET  ?property=X&all=1      - every Duty Log notification for the property (manager tier only)
 * PUT  { id, property, action:'markRead' }   - mark one read
 * PUT  { property, action:'markAllRead' }    - mark all of the caller's notifications read
 */
export async function handler(event) {
  const user = verifyReqAuth(event);
  if (!user) return { statusCode: 401, body: 'Unauthorized' };

  const db = await getDb();
  await refreshReslifeUser(db, user);
  const col = db.collection('reslife_duty_log_notifications');

  try {
    if (event.httpMethod === 'GET') {
      const { property, all } = event.queryStringParameters || {};
      if (!property) return { statusCode: 400, body: 'Missing property' };
      if (!canAccessReslifeProperty(user, property)) return { statusCode: 403, body: 'Forbidden' };
      const manager = user.role === 'admin' || isReslifeManager(user.role);
      const filter = { property };
      if (!(all && manager)) filter.forUsername = user.sub;
      const docs = await col.find(filter).sort({ createdAt: -1 }).limit(200).toArray();
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
