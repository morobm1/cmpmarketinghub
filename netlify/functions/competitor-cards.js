import { getDb, ObjectId } from './_db.js';
import { verifyReqAuth } from './_auth.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

function json(statusCode, data) {
  return {
    statusCode,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  };
}

function checkPropertyAccess(user, property) {
  if (user.role === 'admin') return true;
  if (user.properties === '*') return true;
  const allowed = Array.isArray(user.properties) ? user.properties : [];
  return allowed.includes(property);
}

export async function handler(event) {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  // Verify authentication
  const user = verifyReqAuth(event);
  if (!user) {
    return json(401, { error: 'Unauthorized' });
  }

  const db = await getDb();
  const collection = db.collection('competitor_cards');

  try {
    // ── GET: List all cards for a property ──
    if (event.httpMethod === 'GET') {
      const params = event.queryStringParameters || {};
      const property = params.property;

      if (!property) {
        return json(400, { error: 'Property parameter required' });
      }

      if (!checkPropertyAccess(user, property)) {
        return json(403, { error: 'Access denied to this property' });
      }

      const docs = await collection
        .find({ property })
        .sort({ updatedAt: -1 })
        .toArray();

      // Convert _id to id string for frontend
      const cards = docs.map(doc => {
        const { _id, ...rest } = doc;
        return { id: _id.toString(), ...rest };
      });

      return json(200, cards);
    }

    // ── POST: Create a new card ──
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { property } = body;

      if (!property) {
        return json(400, { error: 'Property field required' });
      }

      if (!checkPropertyAccess(user, property)) {
        return json(403, { error: 'Access denied to this property' });
      }

      const now = new Date().toISOString();
      const doc = {
        ...body,
        createdBy: user.sub,
        createdAt: now,
        updatedAt: now
      };
      // Remove client-side id if present
      delete doc.id;

      const result = await collection.insertOne(doc);

      return json(200, { id: result.insertedId.toString(), createdAt: now, updatedAt: now });
    }

    // ── PUT: Update an existing card ──
    if (event.httpMethod === 'PUT') {
      const body = JSON.parse(event.body || '{}');
      const { id, ...updates } = body;

      if (!id) {
        return json(400, { error: 'Card id required' });
      }

      // Look up the card to verify property access
      const existing = await collection.findOne({ _id: new ObjectId(id) });
      if (!existing) {
        return json(404, { error: 'Card not found' });
      }

      const property = updates.property || existing.property;
      if (!checkPropertyAccess(user, property)) {
        return json(403, { error: 'Access denied to this property' });
      }

      const now = new Date().toISOString();
      updates.updatedAt = now;
      // Don't overwrite createdBy or createdAt
      delete updates.createdBy;
      delete updates.createdAt;

      await collection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updates }
      );

      return json(200, { ok: true, updatedAt: now });
    }

    // ── DELETE: Delete/archive a card ──
    if (event.httpMethod === 'DELETE') {
      const body = JSON.parse(event.body || '{}');
      const { id, archive } = body;

      if (!id) {
        return json(400, { error: 'Card id required' });
      }

      const existing = await collection.findOne({ _id: new ObjectId(id) });
      if (!existing) {
        return json(404, { error: 'Card not found' });
      }

      if (!checkPropertyAccess(user, existing.property)) {
        return json(403, { error: 'Access denied to this property' });
      }

      if (archive) {
        // Soft delete — set status to archived
        const now = new Date().toISOString();
        await collection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { status: 'archived', updatedAt: now } }
        );
        return json(200, { ok: true, archived: true, updatedAt: now });
      } else {
        // Hard delete
        await collection.deleteOne({ _id: new ObjectId(id) });
        return json(200, { ok: true, deleted: true });
      }
    }

    return json(405, { error: 'Method Not Allowed' });

  } catch (err) {
    console.error('competitor-cards error:', err);
    return json(500, { error: 'Internal server error' });
  }
}
