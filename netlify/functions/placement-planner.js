import { getDb } from './_db.js';
import { verifyReqAuth } from './_auth.js';

/**
 * Netlify Function: placement-planner
 *
 * Stores and retrieves Ivory Housing Placement Planner project data
 * and color configuration in MongoDB, replacing localStorage.
 *
 * SHARED DATA MODEL: All authenticated users read/write from the SAME
 * document so that inventory, residents, bank, expected scholarships,
 * and colors are visible to every user in real-time.
 *
 * Collection: placement_planner
 * Single shared document:
 *   { _key: 'shared', project: {...}, colors: {...}, updatedAt, updatedBy }
 *
 * Endpoints (via /api/placement-planner):
 *   GET    /                  → Load shared project + colors
 *   POST   /                  → Save/update shared project data
 *   POST   /colors            → Save/update shared color configuration
 *   DELETE /                  → Clear all shared project data (admin only)
 */

const COLLECTION = 'placement_planner';
const SHARED_KEY = 'shared';
const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
};

export async function handler(event) {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  // Authenticate
  const user = verifyReqAuth(event);
  if (!user) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Unauthorized' }),
    };
  }

  const username = user.sub;

  // Parse path segments after the function name
  const path = event.path
    .replace('/.netlify/functions/placement-planner', '')
    .replace('/api/placement-planner', '');
  const segments = path.split('/').filter(Boolean);

  try {
    const db = await getDb();
    const collection = db.collection(COLLECTION);

    // ──────────────────────────────────────────────
    // GET / — Load shared document (project + colors)
    // ──────────────────────────────────────────────
    if (event.httpMethod === 'GET' && segments.length === 0) {
      const doc = await collection.findOne({ _key: SHARED_KEY });

      if (!doc) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ project: null, colors: null }),
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          project: doc.project || null,
          colors: doc.colors || null,
          updatedAt: doc.updatedAt || null,
          updatedBy: doc.updatedBy || null,
        }),
      };
    }

    // ──────────────────────────────────────────────
    // POST / — Save shared project data
    // ──────────────────────────────────────────────
    if (event.httpMethod === 'POST' && segments.length === 0) {
      const body = JSON.parse(event.body || '{}');

      if (!body.project || typeof body.project !== 'object') {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Request body must include a "project" object' }),
        };
      }

      await collection.updateOne(
        { _key: SHARED_KEY },
        {
          $set: {
            _key: SHARED_KEY,
            project: body.project,
            updatedAt: new Date().toISOString(),
            updatedBy: username,
          },
        },
        { upsert: true }
      );

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true }),
      };
    }

    // ──────────────────────────────────────────────
    // POST /colors — Save shared color configuration
    // ──────────────────────────────────────────────
    if (event.httpMethod === 'POST' && segments.length === 1 && segments[0] === 'colors') {
      const body = JSON.parse(event.body || '{}');

      if (!body.colors || typeof body.colors !== 'object') {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Request body must include a "colors" object' }),
        };
      }

      await collection.updateOne(
        { _key: SHARED_KEY },
        {
          $set: {
            _key: SHARED_KEY,
            colors: body.colors,
            updatedAt: new Date().toISOString(),
            updatedBy: username,
          },
        },
        { upsert: true }
      );

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true }),
      };
    }

    // ──────────────────────────────────────────────
    // DELETE / — Clear all shared data (admin only)
    // ──────────────────────────────────────────────
    if (event.httpMethod === 'DELETE' && segments.length === 0) {
      await collection.deleteOne({ _key: SHARED_KEY });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true }),
      };
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Not found' }),
    };
  } catch (error) {
    console.error('Placement Planner API Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message }),
    };
  }
}
