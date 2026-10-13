import { verifyReqAuth } from './_auth.js';
import { getDb } from './_db.js';
import { refreshReslifeUser, json } from './_reslife.js';

/**
 * Reslife Hub — Sidebar Nav Configuration (global, applies to every property)
 * GET  - any authenticated Reslife user / admin: returns { items: { [key]: { label, url, hidden } } }
 * PUT  - admin tier only (site admin or reslife-admin): replaces the overrides map
 */
const RESLIFE_ROLES = ['reslife-ra', 'reslife-rec', 'reslife-admin'];

export async function handler(event) {
  const user = verifyReqAuth(event);
  if (!user) return { statusCode: 401, body: 'Unauthorized' };

  const db = await getDb();
  await refreshReslifeUser(db, user);
  if (user.role !== 'admin' && !RESLIFE_ROLES.includes(user.role)) return { statusCode: 403, body: 'Forbidden' };
  const col = db.collection('reslife_settings');

  try {
    if (event.httpMethod === 'GET') {
      const doc = await col.findOne({ _id: 'nav_config' });
      return json(200, { items: (doc && doc.items) || {} });
    }

    if (event.httpMethod === 'PUT') {
      if (user.role !== 'admin' && user.role !== 'reslife-admin') return { statusCode: 403, body: 'Forbidden' };
      const body = JSON.parse(event.body || '{}');
      const input = body.items && typeof body.items === 'object' ? body.items : {};
      const items = {};
      for (const [key, v] of Object.entries(input).slice(0, 100)) {
        if (!/^[\w.\-:/]{1,200}$/.test(key) || !v || typeof v !== 'object') continue;
        const label = String(v.label || '').trim().slice(0, 60);
        let url = String(v.url || '').trim().slice(0, 500);
        if (url && !/^(https?:\/\/|\/|[\w\-]+\.html)/i.test(url)) url = '';
        items[key] = { label, url, hidden: !!v.hidden };
      }
      await col.updateOne(
        { _id: 'nav_config' },
        { $set: { items, updatedBy: user.sub, updatedAt: new Date().toISOString() } },
        { upsert: true }
      );
      return json(200, { items });
    }

    return { statusCode: 405, body: 'Method Not Allowed' };
  } catch (e) {
    return { statusCode: 500, body: e.message };
  }
}
