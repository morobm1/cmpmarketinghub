import { verifyReqAuth } from './_auth.js';
import { getDb } from './_db.js';

export async function handler(event) {
  const user = verifyReqAuth(event);
  if (!user) return { statusCode: 401, body: 'Unauthorized' };

  const db = await getDb();
  const collection = db.collection('creative_library');

  try {
    // GET - Retrieve library for a property
    if (event.httpMethod === 'GET') {
      const params = new URLSearchParams(event.rawQuery || '');
      const property = params.get('property');
      
      if (!property) {
        return { statusCode: 400, body: 'Property parameter required' };
      }

      // Check if user has access to this property
      if (user.role !== 'admin' && user.properties !== '*') {
        const allowed = Array.isArray(user.properties) ? user.properties : [];
        if (!allowed.includes(property)) {
          return { statusCode: 403, body: 'Access denied to this property' };
        }
      }

      const assets = await collection.find({ property }).toArray();
      
      // Map _id to id for frontend compatibility
      const result = assets.map(asset => ({
        ...asset,
        id: asset.id || asset._id.toString(),
        _id: undefined
      }));
      
      return { 
        statusCode: 200, 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result) 
      };
    }

    // POST - Add new assets
    if (event.httpMethod === 'POST') {
      const { property, assets } = JSON.parse(event.body || '{}');
      
      if (!property || !assets || !Array.isArray(assets)) {
        return { statusCode: 400, body: 'Property and assets array required' };
      }

      // Check if user has access to this property
      if (user.role !== 'admin' && user.properties !== '*') {
        const allowed = Array.isArray(user.properties) ? user.properties : [];
        if (!allowed.includes(property)) {
          return { statusCode: 403, body: 'Access denied to this property' };
        }
      }

      // Add property and uploadedBy to each asset
      const assetsToInsert = assets.map(asset => ({
        ...asset,
        property,
        uploadedBy: user.username,
        uploadedAt: asset.uploadedAt || new Date().toISOString()
      }));

      await collection.insertMany(assetsToInsert);
      
      return { 
        statusCode: 200, 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true, count: assetsToInsert.length }) 
      };
    }

    // PUT - Update an asset
    if (event.httpMethod === 'PUT') {
      const { property, asset } = JSON.parse(event.body || '{}');
      
      if (!property || !asset || !asset.id) {
        return { statusCode: 400, body: 'Property and asset with id required' };
      }

      // Check if user has access to this property
      if (user.role !== 'admin' && user.properties !== '*') {
        const allowed = Array.isArray(user.properties) ? user.properties : [];
        if (!allowed.includes(property)) {
          return { statusCode: 403, body: 'Access denied to this property' };
        }
      }

      const { id, ...updateData } = asset;
      await collection.updateOne(
        { id, property },
        { $set: { ...updateData, updatedAt: new Date().toISOString(), updatedBy: user.username } }
      );
      
      return { 
        statusCode: 200, 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true }) 
      };
    }

    // DELETE - Remove an asset
    if (event.httpMethod === 'DELETE') {
      const { property, id } = JSON.parse(event.body || '{}');
      
      if (!property || !id) {
        return { statusCode: 400, body: 'Property and id required' };
      }

      // Check if user has access to this property
      if (user.role !== 'admin' && user.properties !== '*') {
        const allowed = Array.isArray(user.properties) ? user.properties : [];
        if (!allowed.includes(property)) {
          return { statusCode: 403, body: 'Access denied to this property' };
        }
      }

      await collection.deleteOne({ id, property });
      
      return { 
        statusCode: 200, 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true }) 
      };
    }

    return { statusCode: 405, body: 'Method Not Allowed' };
  } catch (e) {
    console.error('Creative Library API error:', e);
    return { statusCode: 500, body: e.message };
  }
}
