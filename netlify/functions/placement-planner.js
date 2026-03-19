import { getDb } from './_db.js';
import { verifyReqAuth } from './_auth.js';

/**
 * Netlify Function: placement-planner
 *
 * Stores and retrieves Ivory Housing Placement Planner project data
 * and color configuration in MongoDB, replacing localStorage.
 *
 * Collection: placement_planner
 * Document structure per user:
 *   { username, project: {...}, colors: {...}, updatedAt }
 *
 * Endpoints (via /api/placement-planner):
 *   GET    /                  → Load project + colors for authenticated user
 *   POST   /                  → Save/update project data
 *   POST   /colors            → Save/update color configuration
 *   DELETE /                  → Clear all project data for user
 */

const COLLECTION = 'placement_planner';
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
    // GET / — Load full document (project + colors)
    // ──────────────────────────────────────────────
    if (event.httpMethod === 'GET' && segments.length === 0) {
      const doc = await collection.findOne({ username });

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
        }),
      };
    }

    // ──────────────────────────────────────────────
    // POST / — Save project data
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
        { username },
        {
          $set: {
            username,
            project: body.project,
            updatedAt: new Date().toISOString(),
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
    // POST /colors — Save color configuration
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
        { username },
        {
          $set: {
            username,
            colors: body.colors,
            updatedAt: new Date().toISOString(),
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
    // DELETE / — Clear all data for user
    // ──────────────────────────────────────────────
    if (event.httpMethod === 'DELETE' && segments.length === 0) {
      await collection.deleteOne({ username });

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
