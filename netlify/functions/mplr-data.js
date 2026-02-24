import { getDb, ObjectId } from './_db.js';

const COLLECTION = 'mplr_data';

export const handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  try {
    const db = await getDb();
    const collection = db.collection(COLLECTION);
    const path = event.path.replace('/.netlify/functions/mplr-data', '');
    const segments = path.split('/').filter(Boolean);

    // GET /mplr-data/:property - Get all MPLR data for a property
    if (event.httpMethod === 'GET' && segments.length === 1) {
      const property = decodeURIComponent(segments[0]);
      const doc = await collection.findOne({ property });
      
      if (!doc) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            property,
            leases: [],
            floorPlans: [],
            newLeaseTiers: [],
            renewalTiers: [],
            totalBeds: 0
          })
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          property: doc.property,
          leases: doc.leases || [],
          floorPlans: doc.floorPlans || [],
          newLeaseTiers: doc.newLeaseTiers || [],
          renewalTiers: doc.renewalTiers || [],
          totalBeds: doc.totalBeds || 0
        })
      };
    }

    // POST /mplr-data/:property - Save/Update MPLR data for a property
    if (event.httpMethod === 'POST' && segments.length === 1) {
      const property = decodeURIComponent(segments[0]);
      const body = JSON.parse(event.body || '{}');

      const updateData = {
        property,
        updatedAt: new Date().toISOString()
      };

      // Only update fields that are provided
      if (body.leases !== undefined) updateData.leases = body.leases;
      if (body.floorPlans !== undefined) updateData.floorPlans = body.floorPlans;
      if (body.newLeaseTiers !== undefined) updateData.newLeaseTiers = body.newLeaseTiers;
      if (body.renewalTiers !== undefined) updateData.renewalTiers = body.renewalTiers;
      if (body.totalBeds !== undefined) updateData.totalBeds = body.totalBeds;

      const result = await collection.updateOne(
        { property },
        { $set: updateData },
        { upsert: true }
      );

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true, 
          property,
          modified: result.modifiedCount,
          upserted: result.upsertedCount
        })
      };
    }

    // DELETE /mplr-data/:property - Delete all MPLR data for a property
    if (event.httpMethod === 'DELETE' && segments.length === 1) {
      const property = decodeURIComponent(segments[0]);
      
      await collection.deleteOne({ property });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, property })
      };
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Not found' })
    };

  } catch (error) {
    console.error('MPLR Data API Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
