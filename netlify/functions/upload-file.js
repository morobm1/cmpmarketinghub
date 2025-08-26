import { verifyReqAuth } from './_auth.js';
import { getDb, ObjectId } from './_db.js';

export async function handler(event){
  try{
    const user = verifyReqAuth(event);
    if (!user) return { statusCode: 401, body: 'Unauthorized' };
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
    const qs = event.queryStringParameters || {};
    const property = qs.property || '';
    if (!property) return { statusCode: 400, body: 'Missing property' };
    // Restrict to user's properties unless admin
    if (user.role !== 'admin' && !(user.properties||[]).includes(property)) return { statusCode: 403, body: 'Forbidden' };

    const contentType = event.headers['content-type'] || event.headers['Content-Type'] || 'application/octet-stream';
    const filename = (qs.filename || 'upload_' + Date.now());

    // Decode body
    const isB64 = !!event.isBase64Encoded;
    const raw = event.body || '';
    if (!raw) return { statusCode: 400, body: 'Empty body' };
    const buf = Buffer.from(raw, isB64 ? 'base64' : 'utf8');

    // Basic size guard (15 MB)
    const maxBytes = 15 * 1024 * 1024;
    if (buf.length > maxBytes) return { statusCode: 413, body: 'File too large (max 15 MB)' };

    const db = await getDb();
    const doc = {
      property,
      filename,
      contentType,
      size: buf.length,
      data: buf,
      uploader: user.sub,
      createdAt: new Date(),
    };
    const res = await db.collection('files').insertOne(doc);
    const id = res.insertedId.toString();
    const url = `/api/file?id=${encodeURIComponent(id)}`;
    return { statusCode: 200, body: JSON.stringify({ id, url }) };
  }catch(e){
    return { statusCode: 500, body: e.message };
  }
}
