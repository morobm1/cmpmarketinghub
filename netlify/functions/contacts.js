import { verifyReqAuth } from './_auth.js';
import { getDb, ObjectId } from './_db.js';

const TYPES = new Set(['general','partnership','department']);

export async function handler(event){
  const user = verifyReqAuth(event);
  if (!user) return { statusCode: 401, body: 'Unauthorized' };
  const db = await getDb();
  try{
    if (event.httpMethod === 'GET'){
      const { property, type } = event.queryStringParameters || {};
      if (!property) return { statusCode: 400, body: 'Missing property' };
      if (user.role !== 'admin' && !(user.properties||[]).includes(property)) return { statusCode: 403, body: 'Forbidden' };
      if (type){
        if (!TYPES.has(type)) return { statusCode: 400, body: 'Invalid type' };
        const docs = await db.collection('contacts').find({ property, type }).toArray();
        return { statusCode: 200, body: JSON.stringify(docs.map(({ _id, ...rest }) => ({ id: _id.toString(), ...rest }))) };
      }
      const [general, partnerships, departments] = await Promise.all([
        db.collection('contacts').find({ property, type: 'general' }).toArray(),
        db.collection('contacts').find({ property, type: 'partnership' }).toArray(),
        db.collection('contacts').find({ property, type: 'department' }).toArray(),
      ]);
      const map = arr => arr.map(({ _id, ...rest }) => ({ id: _id.toString(), ...rest }));
      return { statusCode: 200, body: JSON.stringify({ general: map(general), partnerships: map(partnerships), departments: map(departments) }) };
    }
    if (event.httpMethod === 'POST'){
      const payload = JSON.parse(event.body||'{}');
      const { property, type } = payload || {};
      if (!property || !type) return { statusCode: 400, body: 'Missing property/type' };
      if (!TYPES.has(type)) return { statusCode: 400, body: 'Invalid type' };
      if (user.role !== 'admin' && !(user.properties||[]).includes(property)) return { statusCode: 403, body: 'Forbidden' };
      const doc = { ...payload, createdAt: new Date() };
      const res = await db.collection('contacts').insertOne(doc);
      return { statusCode: 200, body: JSON.stringify({ id: res.insertedId.toString() }) };
    }
    if (event.httpMethod === 'PUT'){
      const payload = JSON.parse(event.body||'{}');
      const { id, property, pushVisit, ...updates } = payload || {};
      if (!id || !property) return { statusCode: 400, body: 'Missing id/property' };
      if (user.role !== 'admin' && !(user.properties||[]).includes(property)) return { statusCode: 403, body: 'Forbidden' };
      const q = { _id: new ObjectId(id), property };
      if (pushVisit){
        await db.collection('contacts').updateOne(q, { $push: { visits: pushVisit }, $set: { updatedAt: new Date() } });
      } else {
        await db.collection('contacts').updateOne(q, { $set: { ...updates, updatedAt: new Date() } });
      }
      return { statusCode: 200, body: 'OK' };
    }
    if (event.httpMethod === 'DELETE'){
      const { id, property } = JSON.parse(event.body||'{}');
      if (!id || !property) return { statusCode: 400, body: 'Missing id/property' };
      if (user.role !== 'admin' && !(user.properties||[]).includes(property)) return { statusCode: 403, body: 'Forbidden' };
      await db.collection('contacts').deleteOne({ _id: new ObjectId(id), property });
      return { statusCode: 200, body: 'OK' };
    }
    return { statusCode: 405, body: 'Method Not Allowed' };
  }catch(e){ return { statusCode: 500, body: e.message }; }
}
