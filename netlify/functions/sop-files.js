import { verifyReqAuth } from './_auth.js';
import { getDb, ObjectId } from './_db.js';

/* ──────────────────────────────────────────────
   SOP File Upload/Serve API
   Collection: sopFiles
   Document shape:
   {
     _id,
     filename: String,
     contentType: String,
     size: Number,
     data: Binary (base64 stored),
     uploadedBy: String,
     uploadedAt: Date
   }

   POST  — upload file (base64 body)
   GET   ?id=X — serve file
────────────────────────────────────────────── */

const MAX_SIZE = 5 * 1024 * 1024; // 5MB limit

export async function handler(event) {
  try {
    const user = verifyReqAuth(event);
    if (!user) return { statusCode: 401, body: 'Unauthorized' };

    const db = await getDb();
    const col = db.collection('sopFiles');
    const method = event.httpMethod;

    // ─── GET: serve file ───
    if (method === 'GET') {
      const { id } = event.queryStringParameters || {};
      if (!id) return { statusCode: 400, body: 'Missing id' };

      const file = await col.findOne({ _id: new ObjectId(id) });
      if (!file) return { statusCode: 404, body: 'Not found' };

      return {
        statusCode: 200,
        headers: {
          'Content-Type': file.contentType || 'application/octet-stream',
          'Content-Length': String(file.size || 0),
          'Cache-Control': 'public, max-age=31536000, immutable',
          'Content-Disposition': `inline; filename="${file.filename || 'file'}"`,
          'Access-Control-Allow-Origin': '*'
        },
        body: file.data,
        isBase64Encoded: true
      };
    }

    // ─── POST: upload file (admin only) ───
    if (method === 'POST') {
      if (user.role !== 'admin') return { statusCode: 403, body: 'Admin only' };

      const body = JSON.parse(event.body || '{}');
      const { filename, contentType, data } = body;

      if (!data) return { statusCode: 400, body: 'data (base64) is required' };
      if (!filename) return { statusCode: 400, body: 'filename is required' };

      // Check size (base64 is ~33% larger than raw)
      const rawSize = Math.ceil(data.length * 0.75);
      if (rawSize > MAX_SIZE) {
        return { statusCode: 400, body: 'File too large. Maximum size is 5MB.' };
      }

      const doc = {
        filename: filename.trim(),
        contentType: contentType || 'application/octet-stream',
        size: rawSize,
        data: data, // base64 string
        uploadedBy: user.sub,
        uploadedAt: new Date()
      };

      const res = await col.insertOne(doc);
      const fileId = res.insertedId.toString();

      return {
        statusCode: 200,
        body: JSON.stringify({
          id: fileId,
          filename: doc.filename,
          contentType: doc.contentType,
          size: doc.size,
          url: `/api/sop-files?id=${fileId}`
        })
      };
    }

    // ─── DELETE: remove file (admin only) ───
    if (method === 'DELETE') {
      if (user.role !== 'admin') return { statusCode: 403, body: 'Admin only' };
      const body = JSON.parse(event.body || '{}');
      const { id } = body;
      if (!id) return { statusCode: 400, body: 'id is required' };
      await col.deleteOne({ _id: new ObjectId(id) });
      return { statusCode: 200, body: JSON.stringify({ deleted: true }) };
    }

    return { statusCode: 405, body: 'Method Not Allowed' };
  } catch (e) {
    return { statusCode: 500, body: e.message };
  }
}
