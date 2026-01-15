import { getDb } from './_db.js';
import { verifyReqAuth } from './_auth.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

export async function handler(event) {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  // Verify authentication
  const user = verifyReqAuth(event);
  if (!user) {
    return {
      statusCode: 401,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Unauthorized' })
    };
  }

  const db = await getDb();
  const collection = db.collection('velocity_data');

  try {
    if (event.httpMethod === 'GET') {
      // Get velocity data for a property
      const params = event.queryStringParameters || {};
      const property = params.property;

      if (!property) {
        return {
          statusCode: 400,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Property parameter required' })
        };
      }

      // Check if user has access to this property
      if (user.role !== 'admin' && user.properties !== '*') {
        const allowed = Array.isArray(user.properties) ? user.properties : [];
        if (!allowed.includes(property)) {
          return {
            statusCode: 403,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Access denied to this property' })
          };
        }
      }

      // Find velocity data for this property
      const doc = await collection.findOne({ property });

      if (!doc) {
        // Return empty data structure if no data exists
        return {
          statusCode: 200,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            property,
            velocityData: [],
            goalsData: {},
            unitMixData: []
          })
        };
      }

      return {
        statusCode: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          property: doc.property,
          velocityData: doc.velocityData || [],
          goalsData: doc.goalsData || {},
          unitMixData: doc.unitMixData || []
        })
      };
    }

    if (event.httpMethod === 'POST') {
      // Save velocity data for a property
      const body = JSON.parse(event.body || '{}');
      const { property, velocityData, goalsData, unitMixData } = body;

      if (!property) {
        return {
          statusCode: 400,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Property required' })
        };
      }

      // Check if user has access to this property
      if (user.role !== 'admin' && user.properties !== '*') {
        const allowed = Array.isArray(user.properties) ? user.properties : [];
        if (!allowed.includes(property)) {
          return {
            statusCode: 403,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Access denied to this property' })
          };
        }
      }

      // Upsert the velocity data
      const updateDoc = {
        property,
        velocityData: velocityData || [],
        goalsData: goalsData || {},
        unitMixData: unitMixData || [],
        updatedAt: new Date().toISOString(),
        updatedBy: user.sub
      };

      await collection.updateOne(
        { property },
        { $set: updateDoc },
        { upsert: true }
      );

      return {
        statusCode: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true, property })
      };
    }

    return {
      statusCode: 405,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' })
    };

  } catch (error) {
    console.error('Velocity API error:', error);
    return {
      statusCode: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
}
