import { getDb, ObjectId } from './_db.js';

const SNAPSHOTS_COL = 'rv_snapshots';
const MAILERS_COL = 'rv_mailers';

export const handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  try {
    const db = await getDb();
    const path = event.path.replace('/.netlify/functions/rv-data', '');
    const segments = path.split('/').filter(Boolean);
    const resource = segments[0] || '';
    const resourceId = segments[1] || '';

    // ═══════════════════════════════════════════════════
    //  SNAPSHOTS
    // ═══════════════════════════════════════════════════

    // GET /rv-data/snapshots — list all snapshots (metadata only, no fingerprints)
    if (event.httpMethod === 'GET' && resource === 'snapshots' && !resourceId) {
      const col = db.collection(SNAPSHOTS_COL);
      const snapshots = await col.find({})
        .project({ fingerprints: 0 })
        .sort({ date: -1 })
        .limit(20)
        .toArray();
      return { statusCode: 200, headers, body: JSON.stringify(snapshots) };
    }

    // GET /rv-data/snapshots/latest — get latest snapshot with fingerprints
    if (event.httpMethod === 'GET' && resource === 'snapshots' && resourceId === 'latest') {
      const col = db.collection(SNAPSHOTS_COL);
      const snap = await col.findOne({}, { sort: { date: -1 } });
      return { statusCode: 200, headers, body: JSON.stringify(snap) };
    }

    // GET /rv-data/snapshots/:id — get specific snapshot with fingerprints
    if (event.httpMethod === 'GET' && resource === 'snapshots' && resourceId) {
      const col = db.collection(SNAPSHOTS_COL);
      let snap;
      try {
        snap = await col.findOne({ _id: new ObjectId(resourceId) });
      } catch (e) {
        snap = await col.findOne({ id: parseInt(resourceId) });
      }
      if (!snap) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Snapshot not found' }) };
      return { statusCode: 200, headers, body: JSON.stringify(snap) };
    }

    // POST /rv-data/snapshots — save new snapshot
    if (event.httpMethod === 'POST' && resource === 'snapshots') {
      const col = db.collection(SNAPSHOTS_COL);
      const body = JSON.parse(event.body || '{}');
      const doc = {
        id: Date.now(),
        date: body.date || new Date().toISOString(),
        filename: body.filename || 'Unknown',
        recordCount: body.recordCount || 0,
        fingerprints: body.fingerprints || [],
        createdAt: new Date().toISOString()
      };
      await col.insertOne(doc);

      // Keep only last 20 snapshots
      const count = await col.countDocuments();
      if (count > 20) {
        const oldest = await col.find({}).sort({ date: 1 }).limit(count - 20).toArray();
        const ids = oldest.map(s => s._id);
        await col.deleteMany({ _id: { $in: ids } });
      }

      return { statusCode: 201, headers, body: JSON.stringify({ success: true, id: doc.id }) };
    }

    // ═══════════════════════════════════════════════════
    //  MAILERS
    // ═══════════════════════════════════════════════════

    // GET /rv-data/mailers — list all mailers
    if (event.httpMethod === 'GET' && resource === 'mailers' && !resourceId) {
      const col = db.collection(MAILERS_COL);
      const mailers = await col.find({}).sort({ createdDate: -1 }).toArray();
      return { statusCode: 200, headers, body: JSON.stringify(mailers) };
    }

    // GET /rv-data/mailers/:id — get specific mailer
    if (event.httpMethod === 'GET' && resource === 'mailers' && resourceId) {
      const col = db.collection(MAILERS_COL);
      let mailer;
      try {
        mailer = await col.findOne({ _id: new ObjectId(resourceId) });
      } catch (e) {
        mailer = await col.findOne({ id: parseInt(resourceId) });
      }
      if (!mailer) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Mailer not found' }) };
      return { statusCode: 200, headers, body: JSON.stringify(mailer) };
    }

    // POST /rv-data/mailers — save new mailer
    if (event.httpMethod === 'POST' && resource === 'mailers') {
      const col = db.collection(MAILERS_COL);
      const body = JSON.parse(event.body || '{}');
      const doc = {
        id: Date.now(),
        segmentName: body.segmentName || 'Untitled',
        createdDate: body.createdDate || new Date().toISOString(),
        plannedSendDate: body.plannedSendDate || null,
        sentDate: body.sentDate || null,
        status: body.status || 'draft',
        exportFormat: body.exportFormat || 'csv',
        recordCount: body.recordCount || 0,
        addressKeys: body.addressKeys || [],
        filters: body.filters || {},
        records: body.records || [],
        createdAt: new Date().toISOString()
      };
      await col.insertOne(doc);
      return { statusCode: 201, headers, body: JSON.stringify({ success: true, id: doc.id }) };
    }

    // PUT /rv-data/mailers/:id — update mailer (send date, status, etc.)
    if (event.httpMethod === 'PUT' && resource === 'mailers' && resourceId) {
      const col = db.collection(MAILERS_COL);
      const body = JSON.parse(event.body || '{}');
      const updateFields = {};
      if (body.plannedSendDate !== undefined) updateFields.plannedSendDate = body.plannedSendDate;
      if (body.sentDate !== undefined) updateFields.sentDate = body.sentDate;
      if (body.status !== undefined) updateFields.status = body.status;
      if (body.segmentName !== undefined) updateFields.segmentName = body.segmentName;
      updateFields.updatedAt = new Date().toISOString();

      let result;
      try {
        result = await col.updateOne({ _id: new ObjectId(resourceId) }, { $set: updateFields });
      } catch (e) {
        result = await col.updateOne({ id: parseInt(resourceId) }, { $set: updateFields });
      }

      if (result.matchedCount === 0) {
        return { statusCode: 404, headers, body: JSON.stringify({ error: 'Mailer not found' }) };
      }
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    }

    // DELETE /rv-data/mailers/:id — delete a mailer
    if (event.httpMethod === 'DELETE' && resource === 'mailers' && resourceId) {
      const col = db.collection(MAILERS_COL);
      try {
        await col.deleteOne({ _id: new ObjectId(resourceId) });
      } catch (e) {
        await col.deleteOne({ id: parseInt(resourceId) });
      }
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    }

    // DELETE /rv-data/mailers — delete all mailers
    if (event.httpMethod === 'DELETE' && resource === 'mailers' && !resourceId) {
      const col = db.collection(MAILERS_COL);
      await col.deleteMany({});
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    }

    return { statusCode: 404, headers, body: JSON.stringify({ error: 'Not found' }) };

  } catch (err) {
    console.error('RV Data API error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
