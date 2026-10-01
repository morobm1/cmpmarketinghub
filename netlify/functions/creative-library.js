import { verifyReqAuth } from './_auth.js';
import { getDb } from './_db.js';

// Reslife approval rules: RA/REC uploads start 'pending' until an Admin or REC approves.
// Other roles (marketing, admins) publish immediately. Legacy assets without a status count as approved.
const RESLIFE_REVIEWERS = ['admin', 'reslife-admin', 'reslife-rec'];
const NEEDS_APPROVAL = ['reslife-ra', 'reslife-rec'];

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

      const filter = { property };
      if (user.role === 'reslife-ra') filter.$or = [{ uploadedBy: user.sub }, { uploadedBy: user.username }, { status: { $ne: 'pending' } }];
      const assets = await collection.find(filter).toArray();
      
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
        uploadedBy: user.username || user.sub,
        status: NEEDS_APPROVAL.includes(user.role) ? 'pending' : 'approved',
        sharedWith: ['reslife-admin', 'reslife-rec'],
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
      const existing = await collection.findOne({ id, property });
      const me = user.username || user.sub;
      if (updateData.status && existing && updateData.status !== (existing.status || 'approved')) {
        if (!RESLIFE_REVIEWERS.includes(user.role)) return { statusCode: 403, body: 'Only an Admin or REC can approve' };
        if (existing.uploadedBy === me && user.role === 'reslife-rec') return { statusCode: 403, body: 'Another Admin or REC must approve your upload' };
        updateData.reviewedBy = me; updateData.reviewedAt = new Date().toISOString();
      } else if (existing && NEEDS_APPROVAL.includes(user.role) && existing.uploadedBy !== me && user.role === 'reslife-ra') {
        return { statusCode: 403, body: 'You can only edit your own uploads' };
      }
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

      if (user.role === 'reslife-ra') {
        const ex = await collection.findOne({ id, property });
        if (ex && ex.uploadedBy !== (user.username || user.sub)) return { statusCode: 403, body: 'You can only delete your own uploads' };
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
