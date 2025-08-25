import { verifyReqAuth, createUser, updateUser } from './_auth.js';
import { getDb } from './_db.js';

export async function handler(event){
  const user = verifyReqAuth(event);
  if (!user || user.role !== 'admin') return { statusCode: 401, body: 'Unauthorized' };
  const db = await getDb();
  try{
    if (event.httpMethod === 'GET'){
      const docs = await db.collection('users').find({}, { projection: { _id:0, passwordHash:0 } }).toArray();
      return { statusCode: 200, body: JSON.stringify(docs) };
    }
    if (event.httpMethod === 'POST'){
      const { username, password, role='user', properties=[] } = JSON.parse(event.body||'{}');
      if (!username || !password) return { statusCode: 400, body: 'Missing username/password' };
      const doc = await createUser({ username, password, role, properties });
      return { statusCode: 200, body: JSON.stringify({ username: doc.username, role: doc.role, properties: doc.properties }) };
    }
    if (event.httpMethod === 'PUT'){
      const { username, updates } = JSON.parse(event.body||'{}');
      if (!username || !updates) return { statusCode: 400, body: 'Missing username/updates' };
      await updateUser(username, updates);
      return { statusCode: 200, body: 'OK' };
    }
    if (event.httpMethod === 'DELETE'){
      const { username } = JSON.parse(event.body||'{}');
      if (!username) return { statusCode: 400, body: 'Missing username' };
      await db.collection('users').deleteOne({ username });
      return { statusCode: 200, body: 'OK' };
    }
    return { statusCode: 405, body: 'Method Not Allowed' };
  }catch(e){
    return { statusCode: 500, body: e.message };
  }
}
