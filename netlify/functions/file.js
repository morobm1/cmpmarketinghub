import { verifyReqAuth } from './_auth.js';
import { getDb, ObjectId } from './_db.js';

export async function handler(event){
  try{
    const user = verifyReqAuth(event);
    if (!user) return { statusCode: 401, body: 'Unauthorized' };
    if (event.httpMethod !== 'GET') return { statusCode: 405, body: 'Method Not Allowed' };
    const { id } = event.queryStringParameters || {};
    if (!id) return { statusCode: 400, body: 'Missing id' };
    const db = await getDb();
    const file = await db.collection('files').findOne({ _id: new ObjectId(id) });
    if (!file) return { statusCode: 404, body: 'Not found' };
    // Property access restriction
    if (user.role !== 'admin' && !(user.properties||[]).includes(file.property)) return { statusCode: 403, body: 'Forbidden' };

    return {
      statusCode: 200,
      headers: {
        'Content-Type': file.contentType || 'application/octet-stream',
        'Content-Length': String(file.size || 0),
        'Cache-Control': 'private, max-age=31536000',
        'Content-Disposition': `inline; filename="${file.filename||'file'}"`
      },
      body: file.data.toString('base64'),
      isBase64Encoded: true,
    };
  }catch(e){ return { statusCode: 500, body: e.message }; }
}
