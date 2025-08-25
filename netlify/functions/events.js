import { verifyReqAuth } from './_auth.js';
import { getDb, ObjectId } from './_db.js';

export async function handler(event){
  const user = verifyReqAuth(event);
  if (!user) return { statusCode: 401, body: 'Unauthorized' };
  const db = await getDb();
  try{
    if (event.httpMethod === 'GET'){
      const { property } = event.queryStringParameters || {};
      if (!property) return { statusCode: 400, body: 'Missing property' };
      // Restrict to user's properties unless admin
      if (user.role !== 'admin' && !(user.properties||[]).includes(property)) return { statusCode: 403, body: 'Forbidden' };
      const docs = await db.collection('events').find({ property }).toArray();
      return { statusCode: 200, body: JSON.stringify(docs.map(({ _id, ...rest }) => ({ id: _id.toString(), ...rest }))) };
    }
    if (event.httpMethod === 'POST'){
      const payload = JSON.parse(event.body||'{}');
      const { property } = payload || {};
      if (!property) return { statusCode: 400, body: 'Missing property' };
      if (user.role !== 'admin' && !(user.properties||[]).includes(property)) return { statusCode: 403, body: 'Forbidden' };
      const res = await db.collection('events').insertOne({ ...payload, createdAt: new Date() });
      return { statusCode: 200, body: JSON.stringify({ id: res.insertedId.toString() }) };
    }
    if (event.httpMethod === 'PUT'){
      const payload = JSON.parse(event.body||'{}');
      const { id, property, ...updates } = payload || {};
      if (!id || !property) return { statusCode: 400, body: 'Missing id/property' };
      if (user.role !== 'admin' && !(user.properties||[]).includes(property)) return { statusCode: 403, body: 'Forbidden' };
      await db.collection('events').updateOne({ _id: new ObjectId(id), property }, { $set: { ...updates, updatedAt: new Date() } });
      return { statusCode: 200, body: 'OK' };
    }
    if (event.httpMethod === 'DELETE'){
      const { id, property } = JSON.parse(event.body||'{}');
      if (!id || !property) return { statusCode: 400, body: 'Missing id/property' };
      if (user.role !== 'admin' && !(user.properties||[]).includes(property)) return { statusCode: 403, body: 'Forbidden' };
      await db.collection('events').deleteOne({ _id: new ObjectId(id), property });
      return { statusCode: 200, body: 'OK' };
    }
    return { statusCode: 405, body: 'Method Not Allowed' };
  }catch(e){ return { statusCode: 500, body: e.message }; }
}
