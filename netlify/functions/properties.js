import { verifyReqAuth } from './_auth.js';
import { getDb } from './_db.js';

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
      const res = await db.collection('properties').insertOne({ name });
      return { statusCode: 200, body: JSON.stringify({ id: res.insertedId.toString(), name }) };
    }
    return { statusCode: 405, body: 'Method Not Allowed' };
  }catch(e){ return { statusCode: 500, body: e.message }; }
}
