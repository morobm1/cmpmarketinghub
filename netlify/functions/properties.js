import { verifyReqAuth } from './_auth.js';
import { getDb } from './_db.js';

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export async function handler(event){
  const user = verifyReqAuth(event);
  if (!user) return { statusCode: 401, body: 'Unauthorized' };
  const db = await getDb();
  try{
    if (event.httpMethod === 'GET'){
      const docs = await db.collection('properties').find({}).toArray();
      return { statusCode: 200, body: JSON.stringify(docs.map(d => ({ id: d._id, name: d.name }))) };
    }
    if (event.httpMethod === 'POST'){
      if (user.role !== 'admin') return { statusCode: 403, body: 'Forbidden' };
      const { name } = JSON.parse(event.body||'{}');
      if (!name) return { statusCode: 400, body: 'Missing name' };
      const id = slugify(name);
      if (!id) return { statusCode: 400, body: 'Invalid name' };
      const existing = await db.collection('properties').findOne({ _id: id });
      if (existing) return { statusCode: 409, body: 'Property with this ID already exists' };
      await db.collection('properties').insertOne({ _id: id, name });
      return { statusCode: 200, body: JSON.stringify({ id, name }) };
    }
    if (event.httpMethod === 'PUT'){
      if (user.role !== 'admin') return { statusCode: 403, body: 'Forbidden' };
      const { id, name } = JSON.parse(event.body||'{}');
      if (!id || !name) return { statusCode: 400, body: 'Missing id or name' };
      const result = await db.collection('properties').updateOne({ _id: id }, { $set: { name } });
      if (result.matchedCount === 0) return { statusCode: 404, body: 'Property not found' };
      return { statusCode: 200, body: JSON.stringify({ id, name }) };
    }
    return { statusCode: 405, body: 'Method Not Allowed' };
  }catch(e){ return { statusCode: 500, body: e.message }; }
}
