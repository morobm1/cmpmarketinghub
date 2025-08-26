import { verifyReqAuth } from './_auth.js';
import { getDb, ObjectId } from './_db.js';

const ALLOWED_STATUS = new Set(['Submitted','Approved','Ordered','Shipped','Delivered','Rejected']);

export async function handler(event){
  const user = verifyReqAuth(event);
  if (!user) return { statusCode: 401, body: 'Unauthorized' };
  const db = await getDb();
  try{
    if (event.httpMethod === 'GET'){
      const { property, status } = event.queryStringParameters || {};
      if (!property) return { statusCode: 400, body: 'Missing property' };
      if (user.role !== 'admin' && !(user.properties||[]).includes(property)) return { statusCode: 403, body: 'Forbidden' };
      const q = { property };
      if (status && ALLOWED_STATUS.has(status)) q.status = status;
      const docs = await db.collection('orders').find(q).sort({ createdAt:-1 }).toArray();
      return { statusCode: 200, body: JSON.stringify(docs.map(({ _id, ...rest }) => ({ id: _id.toString(), ...rest }))) };
    }
    if (event.httpMethod === 'POST'){
      const payload = JSON.parse(event.body||'{}');
      const { property, title, items, neededBy, vendorPreference, budget, color, quantity, shippingAddress, notes, photoUrl } = payload || {};
      if (!property) return { statusCode: 400, body: 'Missing property' };
      if (user.role !== 'admin' && !(user.properties||[]).includes(property)) return { statusCode: 403, body: 'Forbidden' };
      if (!title && !items) return { statusCode: 400, body: 'Missing title/items' };
      const doc = {
        property,
        title: String(title||'').trim(),
        items: String(items||'').trim(),
        neededBy: neededBy ? String(neededBy) : '',
        vendorPreference: String(vendorPreference||'').trim(),
        budget: Number.isFinite(budget) ? budget : (budget ? parseFloat(budget) : 0),
        color: String(color||'').trim(),
        quantity: Number.isFinite(quantity) ? quantity : (quantity ? parseInt(quantity,10) : 0),
        shippingAddress: String(shippingAddress||'').trim(),
        photoUrl: String(photoUrl||'').trim(),
        notes: String(notes||'').trim(),
        status: 'Submitted',
        submittedAt: new Date(),
        approvalAt: null,
        trackingNumber: '',
        createdBy: user.username,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const res = await db.collection('orders').insertOne(doc);
      return { statusCode: 200, body: JSON.stringify({ id: res.insertedId.toString() }) };
    }
    if (event.httpMethod === 'PUT'){
      const payload = JSON.parse(event.body||'{}');
      const { id, property, ...updates } = payload || {};
      if (!id || !property) return { statusCode: 400, body: 'Missing id/property' };
      if (user.role !== 'admin' && !(user.properties||[]).includes(property)) return { statusCode: 403, body: 'Forbidden' };
      const set = { updatedAt: new Date() };
      if (typeof updates.title === 'string') set.title = updates.title;
      if (typeof updates.items === 'string') set.items = updates.items;
      if (typeof updates.neededBy === 'string') set.neededBy = updates.neededBy;
      if (typeof updates.vendorPreference === 'string') set.vendorPreference = updates.vendorPreference;
      if (typeof updates.budget !== 'undefined'){ const c = Number.isFinite(updates.budget) ? updates.budget : parseFloat(updates.budget); set.budget = Number.isFinite(c) ? c : 0; }
      if (typeof updates.color === 'string') set.color = updates.color;
      if (typeof updates.quantity !== 'undefined'){ const q = Number.isFinite(updates.quantity) ? updates.quantity : parseInt(updates.quantity,10); set.quantity = Number.isFinite(q) ? q : 0; }
      if (typeof updates.shippingAddress === 'string') set.shippingAddress = updates.shippingAddress;
      if (typeof updates.photoUrl === 'string') set.photoUrl = updates.photoUrl;
      if (typeof updates.notes === 'string') set.notes = updates.notes;
      if (typeof updates.trackingNumber === 'string') set.trackingNumber = updates.trackingNumber;
      if (typeof updates.status === 'string' && ALLOWED_STATUS.has(updates.status)){
        set.status = updates.status;
        if (updates.status === 'Approved') set.approvalAt = new Date();
      }
      await db.collection('orders').updateOne({ _id: new ObjectId(id), property }, { $set: set });
      return { statusCode: 200, body: 'OK' };
    }
    if (event.httpMethod === 'DELETE'){
      const { id, property } = JSON.parse(event.body||'{}');
      if (!id || !property) return { statusCode: 400, body: 'Missing id/property' };
      if (user.role !== 'admin' && !(user.properties||[]).includes(property)) return { statusCode: 403, body: 'Forbidden' };
      await db.collection('orders').deleteOne({ _id: new ObjectId(id), property });
      return { statusCode: 200, body: 'OK' };
    }
    return { statusCode: 405, body: 'Method Not Allowed' };
  }catch(e){ return { statusCode: 500, body: e.message }; }
}
