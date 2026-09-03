import { verifyReqAuth } from './_auth.js';
import { getDb, ObjectId } from './_db.js';
import { canAccessReslifeProperty, isReslifeManager, refreshReslifeUser, json } from './_reslife.js';

/**
 * Collateral — In-app Notifications + Friendly Reminders
 *
 * This app has no outbound email/SMS infrastructure anywhere, so every
 * "Send Reminder" / "Gentle Nudge" surfaces as a real in-app notification
 * only — never a faked email/text. Logged permanently as reminder history
 * (type: 'reminder') so REC/Admin can see what's already been nudged.
 *
 * GET  ?property=X                                   - the caller's own notifications (most recent 50)
 * POST { property, toUsername, title, message }        - send a reminder (manager tier only)
 * PUT  { id, property, action:'markRead' }              - mark one read
 * PUT  { property, action:'markAllRead' }               - mark all of the caller's notifications read
 */
export async function handler(event) {
  const user = verifyReqAuth(event);
  if (!user) return { statusCode: 401, body: 'Unauthorized' };

  const db = await getDb();
  await refreshReslifeUser(db, user);
  const col = db.collection('reslife_collateral_notifications');

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

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { property, toUsername, title, message } = body;
      if (!property || !toUsername || !title || !message) return { statusCode: 400, body: 'Missing property/toUsername/title/message' };
      if (!canAccessReslifeProperty(user, property)) return { statusCode: 403, body: 'Forbidden' };
      if (user.role !== 'admin' && !isReslifeManager(user.role)) return { statusCode: 403, body: 'Only REC/Admin can send reminders' };
      const now = new Date().toISOString();
      const doc = { property, forUsername: toUsername, type: 'reminder', title, message, sentBy: user.sub, read: false, createdAt: now };
      const result = await col.insertOne(doc);
      doc.id = result.insertedId.toString();
      return json(200, doc);
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

/**
 * Called from other collateral endpoints in-process would require an HTTP
 * round trip, so instead each write endpoint that needs to notify someone
 * (task assigned, revision requested, etc.) inserts directly into this
 * same `reslife_collateral_notifications` collection — see
 * reslife-collateral-tasks.js / reslife-collateral-projects.js for
 * server-side notify() calls at the moment those events actually happen.
 */
