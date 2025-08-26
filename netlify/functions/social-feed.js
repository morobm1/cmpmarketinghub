import { verifyReqAuth } from './_auth.js';
import { getDb, ObjectId } from './_db.js';

export async function handler(event){
  // GET is available to any authenticated user with access to the property
  // POST/DELETE require authentication and property access; DELETE further requires admin
  const user = verifyReqAuth(event);
  if (!user) return { statusCode: 401, body: 'Unauthorized' };
  const db = await getDb();
  try{
    if (event.httpMethod === 'GET'){
      const { property, platform, limit } = event.queryStringParameters || {};
      if (!property) return { statusCode: 400, body: 'Missing property' };
      if (user.role !== 'admin' && !(user.properties||[]).includes(property)) return { statusCode: 403, body: 'Forbidden' };
      const q = { property };
      if (platform) q.platform = platform;
      const lim = Math.max(1, Math.min(200, parseInt(limit||'50', 10) || 50));
      const docs = await db.collection('social_posts')
        .find(q)
        .sort({ timestamp: -1 })
        .limit(lim)
        .toArray();
      return { statusCode: 200, body: JSON.stringify(docs.map(({ _id, ...rest }) => ({ id: _id.toString(), ...rest }))) };
    }
    if (event.httpMethod === 'POST'){
      const payload = JSON.parse(event.body||'{}');
      const { property, platform, imageUrl, timestamp, permalink, caption } = payload || {};
      if (!property || !platform || !imageUrl || !timestamp){
        return { statusCode: 400, body: 'Missing property/platform/imageUrl/timestamp' };
      }
      if (user.role !== 'admin' && !(user.properties||[]).includes(property)) return { statusCode: 403, body: 'Forbidden' };
      const doc = {
        property,
        platform: String(platform).toLowerCase(),
        imageUrl: String(imageUrl),
        timestamp: new Date(timestamp).toISOString(),
        permalink: permalink ? String(permalink) : '',
        caption: caption ? String(caption) : '',
        createdBy: user.username,
        createdAt: new Date(),
      };
      const res = await db.collection('social_posts').insertOne(doc);
      return { statusCode: 200, body: JSON.stringify({ id: res.insertedId.toString() }) };
    }
    if (event.httpMethod === 'DELETE'){
      if (user.role !== 'admin') return { statusCode: 403, body: 'Forbidden' };
      const { id, property } = JSON.parse(event.body||'{}');
      if (!id || !property) return { statusCode: 400, body: 'Missing id/property' };
      await db.collection('social_posts').deleteOne({ _id: new ObjectId(id), property });
      return { statusCode: 200, body: 'OK' };
    }
    return { statusCode: 405, body: 'Method Not Allowed' };
  }catch(e){ return { statusCode: 500, body: e.message }; }
}
