import { getDb, ObjectId } from './_db.js';
import { verifyReqAuth } from './_auth.js';

/**
 * Global Marketing Hub navigation configuration — single source of truth consumed by
 * standard-nav.js on every Marketing Hub page. Read is available to any authenticated user
 * (nav item metadata isn't sensitive — hiding an item is a UX convenience, never a substitute
 * for the real page-level authorization each destination page already enforces). Writes are
 * restricted to site Admins.
 *
 * Item shape:
 * { id, name, icon, destinationType: 'project'|'custom'|'external', link, section, order,
 *   enabled, roles: string[] (empty/absent = visible to all roles) }
 */

const COLLECTION = 'navConfig';

// Mirrors the previously-hardcoded fullNavStructure in standard-nav.js so the very first
// read transparently seeds the exact set of links that already existed — zero-friction,
// lossless migration to the admin-editable system.
const DEFAULT_ITEMS = [
  { name: 'Marketing Calendar', icon: 'bi-calendar3', destinationType: 'project', link: 'mmp_calendar_app.html', section: 'main', order: 1, enabled: true, roles: [] },
  { name: 'Marketing Plans', icon: 'bi-file-earmark-text', destinationType: 'project', link: 'marketing_plans.html', section: 'main', order: 2, enabled: true, roles: [] },
  { name: 'Monthly Marketing Plan', icon: 'bi-calendar-check', destinationType: 'project', link: 'mmp_monthly_plan.html', section: 'main', order: 3, enabled: true, roles: [] },
  { name: 'Velocity Tracker', icon: 'bi-graph-up-arrow', destinationType: 'project', link: 'velocity_tracker.html', section: 'main', order: 4, enabled: true, roles: [] },
  { name: 'Competitor Cards', icon: 'bi-columns-gap', destinationType: 'project', link: 'competitor_cards.html', section: 'main', order: 5, enabled: true, roles: [] },
  { name: 'MPLR', icon: 'bi-bar-chart-steps', destinationType: 'project', link: 'mplr.html', section: 'main', order: 6, enabled: true, roles: [] },
  { name: 'Promo Order Tracker', icon: 'bi-cart3', destinationType: 'project', link: 'promo_order_tracker.html', section: 'tools', order: 1, enabled: true, roles: [] },
  { name: 'Uniform Shop', icon: 'bi-bag-check', destinationType: 'project', link: 'uniform_shop.html', section: 'tools', order: 2, enabled: true, roles: [] },
  { name: 'Creative Studio', icon: 'bi-magic', destinationType: 'project', link: 'creative_studio.html', section: 'tools', order: 3, enabled: true, roles: [] },
  { name: 'Creative Library', icon: 'bi-images', destinationType: 'project', link: 'creative_library.html', section: 'tools', order: 4, enabled: true, roles: [] },
  { name: 'Marketing Contacts', icon: 'bi-person-lines-fill', destinationType: 'project', link: 'marketing_contacts.html', section: 'tools', order: 5, enabled: true, roles: [] },
  { name: 'Project Management', icon: 'bi-kanban', destinationType: 'project', link: 'leasing_staff_list.html', section: 'tools', order: 6, enabled: true, roles: [] },
  { name: 'Custom Tools', icon: 'bi-gear-wide-connected', destinationType: 'project', link: 'custom_tools.html', section: 'tools', order: 7, enabled: true, roles: [] },
  { name: 'SOP Library', icon: 'bi-journal-bookmark', destinationType: 'project', link: 'sop_library.html', section: 'resources', order: 1, enabled: true, roles: [] },
];

function summarize(doc) {
  doc.id = doc._id.toString();
  delete doc._id;
  return doc;
}

async function ensureSeeded(col) {
  const count = await col.countDocuments();
  if (count > 0) return;
  const now = new Date().toISOString();
  await col.insertMany(DEFAULT_ITEMS.map(item => Object.assign({}, item, { createdAt: now, updatedAt: now })));
}

export async function handler(event) {
  const user = verifyReqAuth(event);
  if (!user) return { statusCode: 401, body: 'Unauthorized' };

  const db = await getDb();
  const col = db.collection(COLLECTION);

  try {
    if (event.httpMethod === 'GET') {
      await ensureSeeded(col);
      const items = await col.find({}).sort({ section: 1, order: 1 }).toArray();
      return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(items.map(summarize)) };
    }

    // All writes are Admin-only. Navigation visibility is a UX convenience, not a security
    // boundary — but the ability to CHANGE what every user sees/links to is an admin action.
    if (user.role !== 'admin') return { statusCode: 403, body: 'Only Admin can modify navigation configuration' };

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      if (!body.name || !body.link) return { statusCode: 400, body: 'Name and destination are required' };
      const now = new Date().toISOString();
      const section = body.section || 'tools';
      const maxOrderDoc = await col.find({ section }).sort({ order: -1 }).limit(1).toArray();
      const item = {
        name: body.name,
        icon: body.icon || 'bi-link-45deg',
        destinationType: body.destinationType || 'project',
        link: body.link,
        section,
        order: typeof body.order === 'number' ? body.order : ((maxOrderDoc[0] && maxOrderDoc[0].order) || 0) + 1,
        enabled: body.enabled !== false,
        roles: Array.isArray(body.roles) ? body.roles : [],
        createdAt: now,
        updatedAt: now,
      };
      const result = await col.insertOne(item);
      item._id = result.insertedId;
      return { statusCode: 201, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(summarize(item)) };
    }

    if (event.httpMethod === 'PUT') {
      const body = JSON.parse(event.body || '{}');

      // Bulk reorder: { action:'reorder', items:[{id, order, section}, ...] }
      if (body.action === 'reorder' && Array.isArray(body.items)) {
        const now = new Date().toISOString();
        await Promise.all(body.items.map(it =>
          col.updateOne({ _id: new ObjectId(it.id) }, { $set: { order: it.order, section: it.section, updatedAt: now } })
        ));
        return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: true }) };
      }

      const { id } = body;
      if (!id) return { statusCode: 400, body: 'Missing id' };
      const updates = { updatedAt: new Date().toISOString() };
      ['name', 'icon', 'destinationType', 'link', 'section', 'order', 'enabled', 'roles'].forEach(f => {
        if (body[f] !== undefined) updates[f] = body[f];
      });
      const result = await col.updateOne({ _id: new ObjectId(id) }, { $set: updates });
      if (result.matchedCount === 0) return { statusCode: 404, body: 'Navigation item not found' };
      return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: true }) };
    }

    if (event.httpMethod === 'DELETE') {
      const { id } = event.queryStringParameters || {};
      if (!id) return { statusCode: 400, body: 'Missing id' };
      const result = await col.deleteOne({ _id: new ObjectId(id) });
      if (result.deletedCount === 0) return { statusCode: 404, body: 'Navigation item not found' };
      return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: true }) };
    }

    return { statusCode: 405, body: 'Method Not Allowed' };
  } catch (e) {
    return { statusCode: 500, body: e.message };
  }
}
