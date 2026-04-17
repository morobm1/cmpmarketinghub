import { getDb } from './_db.js';
import { verifyReqAuth } from './_auth.js';

/**
 * Netlify Function: riverhouse-leasing
 *
 * Stores and retrieves River House 2026-2027 Leasing Generator data
 * in MongoDB. Follows the same shared-document + optimistic concurrency
 * pattern used by placement-planner.
 *
 * Collection: riverhouse_leasing
 * Single shared document:
 *   { _key: 'shared', data: {...}, updatedAt, updatedBy, _rev }
 *
 * Endpoints (via /api/riverhouse-leasing):
 *   GET    /        → Load shared data
 *   POST   /        → Save/update shared data (with _rev concurrency)
 *   DELETE /        → Clear all shared data (admin only)
 */

const COLLECTION = 'riverhouse_leasing';
const SHARED_KEY = 'shared';
const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
};

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  const user = verifyReqAuth(event);
  if (!user) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  const username = user.sub;
  const path = event.path
    .replace('/.netlify/functions/riverhouse-leasing', '')
    .replace('/api/riverhouse-leasing', '');
  const segments = path.split('/').filter(Boolean);

  try {
    const db = await getDb();
    const collection = db.collection(COLLECTION);

    // GET / — Load shared document
    if (event.httpMethod === 'GET' && segments.length === 0) {
      const doc = await collection.findOne({ _key: SHARED_KEY });
      if (!doc) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ data: null, _rev: 0 }),
        };
      }
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          data: doc.data || null,
          updatedAt: doc.updatedAt || null,
          updatedBy: doc.updatedBy || null,
          _rev: doc._rev || 0,
        }),
      };
    }

    // POST / — Save shared data with optimistic concurrency
    if (event.httpMethod === 'POST' && segments.length === 0) {
      const body = JSON.parse(event.body || '{}');

      if (!body.data || typeof body.data !== 'object') {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Request body must include a "data" object' }),
        };
      }

      const clientRev = typeof body._rev === 'number' ? body._rev : null;
      const now = new Date().toISOString();

      if (clientRev !== null) {
        const result = await collection.updateOne(
          { _key: SHARED_KEY, $or: [{ _rev: clientRev }, { _rev: { $exists: false } }] },
          {
            $set: {
              _key: SHARED_KEY,
              data: body.data,
              updatedAt: now,
              updatedBy: username,
            },
            $inc: { _rev: 1 },
          },
          { upsert: false }
        );

        if (result.matchedCount === 0) {
          const existing = await collection.findOne({ _key: SHARED_KEY });
          if (!existing) {
            await collection.insertOne({
              _key: SHARED_KEY,
              data: body.data,
              updatedAt: now,
              updatedBy: username,
              _rev: 1,
            });
            return {
              statusCode: 200,
              headers,
              body: JSON.stringify({ success: true, _rev: 1 }),
            };
          }

          return {
            statusCode: 409,
            headers,
            body: JSON.stringify({
              error: 'Conflict: data was modified by another user',
              serverRev: existing._rev || 0,
              updatedBy: existing.updatedBy || null,
              updatedAt: existing.updatedAt || null,
              data: existing.data || null,
            }),
          };
        }

        const newRev = clientRev + 1;
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, _rev: newRev }),
        };
      }

      // Legacy path: no _rev supplied
      const existing = await collection.findOne({ _key: SHARED_KEY });
      const nextRev = (existing && typeof existing._rev === 'number') ? existing._rev + 1 : 1;

      await collection.updateOne(
        { _key: SHARED_KEY },
        {
          $set: {
            _key: SHARED_KEY,
            data: body.data,
            updatedAt: now,
            updatedBy: username,
            _rev: nextRev,
          },
        },
        { upsert: true }
      );

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, _rev: nextRev }),
      };
    }

    // DELETE / — Clear all shared data
    if (event.httpMethod === 'DELETE' && segments.length === 0) {
      await collection.deleteOne({ _key: SHARED_KEY });
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true }),
      };
    }

    return { statusCode: 404, headers, body: JSON.stringify({ error: 'Not found' }) };
  } catch (error) {
    console.error('River House Leasing API Error:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
}
