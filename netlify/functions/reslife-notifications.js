import { verifyReqAuth } from './_auth.js';
import { getDb, ObjectId } from './_db.js';
import { canAccessReslifeProperty, getReslifeProperties, isReslifeManager, refreshReslifeUser, json } from './_reslife.js';
import { notify } from './_notify.js';

/**
 * Reslife Hub — Notifications & pushed announcements.
 *
 * GET  [?since=ISO]                 → { items:[...], unread }  (mine + broadcasts on my properties, newest 60)
 * POST { property, to:'*'|username|[usernames], title, message, priority }   push an announcement (REC/Admin)
 * PUT  { action:'read', ids:[] } | { action:'readAll' }
 * GET  ?recipients=1&property=X     → staff list for the push picker (REC/Admin)
 */
export async function handler(event) {
  const user = verifyReqAuth(event);
  if (!user) return { statusCode: 401, body: 'Unauthorized' };
  const db = await getDb();
  await refreshReslifeUser(db, user);
  const col = db.collection('reslife_notifications');
  const isMgr = user.role === 'admin' || isReslifeManager(user.role);
  const props = user.role === 'admin' ? null : getReslifeProperties(user);
  const q = event.queryStringParameters || {};

  // Notifications addressed to me, or broadcast ('*') to a property I belong to.
  const mineFilter = () => {
    const f = { $or: [{ to: user.sub }, { to: '*' }] };
    if (props) f.property = { $in: props };
    else if (q.property) f.property = q.property;
    return f;
  };

  try {
    if (event.httpMethod === 'GET') {
      if (q.recipients) {
        if (!isMgr) return { statusCode: 403, body: 'Forbidden' };
        const filter = { role: { $in: ['reslife-ra', 'reslife-rec', 'reslife-admin'] } };
        if (q.property) filter.properties = q.property;
        const users = await db.collection('users').find(filter, { projection: { _id: 0, username: 1, fullName: 1, role: 1 } }).sort({ fullName: 1, username: 1 }).toArray();
        return json(200, users);
      }
      const f = mineFilter();
      const items = await col.find(f).sort({ createdAt: -1 }).limit(60).toArray();
      const out = items.map(n => ({ id: n._id.toString(), property: n.property, title: n.title, message: n.message, type: n.type, priority: n.priority, link: n.link, createdBy: n.createdBy, createdAt: n.createdAt, read: (n.readBy || []).includes(user.sub), broadcast: n.to === '*' }));
      return json(200, { items: out, unread: out.filter(n => !n.read).length, now: new Date().toISOString() });
    }

    if (event.httpMethod === 'POST') {
      if (!isMgr) return { statusCode: 403, body: 'Only an REC or Admin can push announcements' };
      const b = JSON.parse(event.body || '{}');
      if (!b.property || !canAccessReslifeProperty(user, b.property)) return { statusCode: 403, body: 'Forbidden' };
      if (!String(b.title || '').trim()) return { statusCode: 400, body: 'Title is required' };
      const to = b.to === '*' || !b.to ? '*' : (Array.isArray(b.to) ? b.to : [b.to]);
      const count = await notify(db, { property: b.property, to, title: b.title.trim(), message: b.message, type: 'announcement', priority: b.priority, createdBy: user.sub });
      return json(200, { success: true, count });
    }

    if (event.httpMethod === 'PUT') {
      const b = JSON.parse(event.body || '{}');
      const f = mineFilter();
      if (b.action === 'read' && Array.isArray(b.ids)) f._id = { $in: b.ids.map(id => { try { return new ObjectId(id); } catch { return null; } }).filter(Boolean) };
      else if (b.action !== 'readAll') return { statusCode: 400, body: 'Bad action' };
      await col.updateMany(f, { $addToSet: { readBy: user.sub } });
      return json(200, { success: true });
    }

    return { statusCode: 405, body: 'Method Not Allowed' };
  } catch (e) {
    return { statusCode: 500, body: e.message };
  }
}
