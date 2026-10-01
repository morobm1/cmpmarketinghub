import { verifyReqAuth } from './_auth.js';
import { getDb, ObjectId } from './_db.js';
import { canAccessReslifeProperty, canAdminReslifeProperty, refreshReslifeUser, json } from './_reslife.js';

/**
 * Reslife Hub — Unit Inventory
 *
 * A simple per-property catalog of every unit and its unit type, imported
 * in bulk from a "Property Unit Report" Excel export (Column A: Unit,
 * Column B: Unit Type). Used by the Resident Directory to show a resident's
 * unit type, and to cross-check which units exist even if no resident is
 * currently assigned to them.
 *
 * Document shape (reslife_unit_inventory collection):
 * { _id, property, unit, unitType, updatedBy, createdAt, updatedAt }
 *
 * GET    ?property=X          - list unit inventory for a property (any Reslife role + admin)
 * POST                          - create/upsert a single unit (Reslife Admin / site admin only)
 * POST   { action: 'import', rows: [...] }   - bulk import, replaces the property's entire
 *                                                inventory with the given rows (Reslife Admin / site admin only)
 * DELETE ?id=X&property=Y     - delete a unit (Reslife Admin / site admin only)
 */
export async function handler(event) {
  const user = verifyReqAuth(event);
  if (!user) return { statusCode: 401, body: 'Unauthorized' };

  const db = await getDb();
  await refreshReslifeUser(db, user);
  const col = db.collection('reslife_unit_inventory');

  try {
    if (event.httpMethod === 'GET') {
      const { property } = event.queryStringParameters || {};
      if (!property) return { statusCode: 400, body: 'Missing property' };
      if (!canAccessReslifeProperty(user, property)) return { statusCode: 403, body: 'Forbidden' };
      const docs = await col.find({ property }).sort({ unit: 1 }).toArray();
      docs.forEach(d => { d.id = d._id.toString(); });
      return json(200, docs);
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { property, action } = body;
      if (!property) return { statusCode: 400, body: 'Missing property' };
      if (!canAdminReslifeProperty(user, property)) return { statusCode: 403, body: 'Forbidden' };
      const now = new Date().toISOString();

      // ── Bulk import: replaces this property's entire unit inventory ──
      if (action === 'import') {
        const rows = Array.isArray(body.rows) ? body.rows : [];
        const clean = rows
          .map(r => ({ unit: String(r.unit || '').trim(), unitType: String(r.unitType || '').trim() }))
          .filter(r => r.unit);
        if (clean.length === 0) return { statusCode: 400, body: 'No valid rows to import (each row needs a unit value)' };

        await col.deleteMany({ property });
        const docs = clean.map(r => ({
          property, unit: r.unit, unitType: r.unitType, updatedBy: user.sub, createdAt: now, updatedAt: now,
        }));
        const result = await col.insertMany(docs);
        return json(200, { imported: result.insertedCount });
      }

      // ── Single unit create ──
      const { unit, unitType } = body;
      if (!unit) return { statusCode: 400, body: 'Missing unit' };
      const doc = { property, unit: String(unit).trim(), unitType: (unitType || '').trim(), updatedBy: user.sub, createdAt: now, updatedAt: now };
      const result = await col.insertOne(doc);
      doc.id = result.insertedId.toString();
      return json(200, doc);
    }

    if (event.httpMethod === 'DELETE') {
      const { id, property } = event.queryStringParameters || {};
      if (!id || !property) return { statusCode: 400, body: 'Missing id/property' };
      if (!canAdminReslifeProperty(user, property)) return { statusCode: 403, body: 'Forbidden' };
      await col.deleteOne({ _id: new ObjectId(id), property });
      return json(200, { success: true });
    }

    return { statusCode: 405, body: 'Method Not Allowed' };
  } catch (e) {
    return { statusCode: 500, body: e.message };
  }
}
