import { verifyReqAuth } from './_auth.js';
import { getDb, ObjectId } from './_db.js';
import { isReslifeManager, refreshReslifeUser } from './_reslife.js';

// Site-wide admin may upload/delete any SOP attachment, unscoped, as before.
// Reslife manager tier (reslife-rec / reslife-admin) may only upload a file
// tagged with one of their own properties, and may only delete a file
// tagged with one of their own properties. Files are often uploaded before
// the owning SOP document exists yet (e.g. pasting a step screenshot while
// still filling out the create wizard), so we can't require a sopId link at
// upload time — instead the file itself is tagged with the uploader's
// chosen `property`, and that tag is what DELETE checks against, closing
// the cross-property/cross-tenant gap without breaking that upload flow.
function reslifeProps(user) {
  return Array.isArray(user.properties) ? user.properties : [];
}
function canUploadSopFile(user, property) {
  if (user.role === 'admin') return true;
  if (!isReslifeManager(user.role)) return false;
  return !!property && reslifeProps(user).includes(property);
}
function canDeleteSopFile(user, file) {
  if (user.role === 'admin') return true;
  if (!isReslifeManager(user.role)) return false;
  // Files uploaded before this property-tagging fix (or by admin) have no
  // `property` tag; Reslife managers may not delete those ambiguous/legacy
  // files, only ones explicitly tagged with one of their own properties.
  return !!file.property && reslifeProps(user).includes(file.property);
}

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
     property: String | null,  // Reslife uploads only; null/absent for marketing-hub (admin) uploads
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

    if (isReslifeManager(user.role)) await refreshReslifeUser(db, user);

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

    // ─── POST: upload file (admin, or Reslife manager tier for their own property) ───
    if (method === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { filename, contentType, data, property } = body;

      if (!canUploadSopFile(user, property)) return { statusCode: 403, body: 'Forbidden' };
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
        property: user.role === 'admin' ? null : property,
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

    // ─── DELETE: remove file (admin, or Reslife manager tier for their own property) ───
    if (method === 'DELETE') {
      const body = JSON.parse(event.body || '{}');
      const { id } = body;
      if (!id) return { statusCode: 400, body: 'id is required' };
      if (user.role !== 'admin') {
        const file = await col.findOne({ _id: new ObjectId(id) });
        if (!file) return { statusCode: 404, body: 'Not found' };
        if (!canDeleteSopFile(user, file)) return { statusCode: 403, body: 'Forbidden' };
      }
      await col.deleteOne({ _id: new ObjectId(id) });
      return { statusCode: 200, body: JSON.stringify({ deleted: true }) };
    }

    return { statusCode: 405, body: 'Method Not Allowed' };
  } catch (e) {
    return { statusCode: 500, body: e.message };
  }
}
