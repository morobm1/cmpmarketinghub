import { verifyReqAuth } from './_auth.js';
import { getDb } from './_db.js';

export async function handler(event){
  const user = verifyReqAuth(event);
  if (!user) return { statusCode: 401, body: 'Unauthorized' };
  const db = await getDb();
  try{
    if (event.httpMethod === 'GET'){
      const { property } = event.queryStringParameters || {};
      if (!property) return { statusCode: 400, body: 'Missing property' };
      if (user.role !== 'admin' && !(user.properties||[]).includes(property)) return { statusCode: 403, body: 'Forbidden' };
      const doc = await db.collection('budgets').findOne({ property });
      return { statusCode: 200, body: JSON.stringify(doc?.months || {}) };
    }
    if (event.httpMethod === 'PUT'){
      const { property, months } = JSON.parse(event.body||'{}');
      if (!property || !months) return { statusCode: 400, body: 'Missing property/months' };
      if (user.role !== 'admin' && !(user.properties||[]).includes(property)) return { statusCode: 403, body: 'Forbidden' };
      await db.collection('budgets').updateOne({ property }, { $set: { months } }, { upsert: true });
      return { statusCode: 200, body: 'OK' };
    }
    return { statusCode: 405, body: 'Method Not Allowed' };
  }catch(e){ return { statusCode: 500, body: e.message }; }
}
