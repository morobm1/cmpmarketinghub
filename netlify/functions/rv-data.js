import { getDb, ObjectId } from './_db.js';
import { verifyReqAuth } from './_auth.js';

const SNAPSHOTS_COL = 'rv_snapshots';
const MAILERS_COL = 'rv_mailers';
const DATASETS_COL = 'rv_datasets';
const RESIDENT_DATASET_COL = 'rv_resident_dataset';

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
    //  DATASETS (saved / named data sets, each fully self-contained)
    // ═══════════════════════════════════════════════════

    // GET /rv-data/datasets — list saved datasets (metadata only, no records)
    if (event.httpMethod === 'GET' && resource === 'datasets' && !resourceId) {
      const col = db.collection(DATASETS_COL);
      const datasets = await col.find({})
        .project({ records: 0 })
        .sort({ createdAt: -1 })
        .toArray();
      return { statusCode: 200, headers, body: JSON.stringify(datasets) };
    }

    // GET /rv-data/datasets/active — get the currently active dataset (with records)
    if (event.httpMethod === 'GET' && resource === 'datasets' && resourceId === 'active') {
      const col = db.collection(DATASETS_COL);
      const ds = await col.findOne({ active: true });
      return { statusCode: 200, headers, body: JSON.stringify(ds || null) };
    }

    // GET /rv-data/datasets/:id — get one specific dataset (with records)
    if (event.httpMethod === 'GET' && resource === 'datasets' && resourceId) {
      const col = db.collection(DATASETS_COL);
      let ds;
      try {
        ds = await col.findOne({ _id: new ObjectId(resourceId) });
      } catch (e) {
        ds = await col.findOne({ id: parseInt(resourceId) });
      }
      if (!ds) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Dataset not found' }) };
      return { statusCode: 200, headers, body: JSON.stringify(ds) };
    }

    // POST /rv-data/datasets — save a new dataset and mark it active
    if (event.httpMethod === 'POST' && resource === 'datasets') {
      const col = db.collection(DATASETS_COL);
      const body = JSON.parse(event.body || '{}');
      if (!body.name || !Array.isArray(body.records)) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'name and records are required' }) };
      }
      const doc = {
        id: Date.now(),
        name: String(body.name).slice(0, 200),
        sourceFile: body.sourceFile || 'Unknown',
        recordCount: body.records.length,
        bandCounts: body.bandCounts || {},
        records: body.records,
        active: true,
        createdAt: new Date().toISOString()
      };
      // Only one dataset may be active at a time
      await col.updateMany({}, { $set: { active: false } });
      await col.insertOne(doc);
      return { statusCode: 201, headers, body: JSON.stringify({ success: true, id: doc.id }) };
    }

    // PUT /rv-data/datasets/:id — activate or rename a saved dataset
    if (event.httpMethod === 'PUT' && resource === 'datasets' && resourceId) {
      const col = db.collection(DATASETS_COL);
      const body = JSON.parse(event.body || '{}');

      const findFilter = (() => {
        try { return { _id: new ObjectId(resourceId) }; } catch (e) { return { id: parseInt(resourceId) }; }
      })();

      if (body.activate) {
        await col.updateMany({}, { $set: { active: false } });
        const updateFields = { active: true, updatedAt: new Date().toISOString() };
        if (body.name !== undefined) updateFields.name = String(body.name).slice(0, 200);
        const result = await col.updateOne(findFilter, { $set: updateFields });
        if (result.matchedCount === 0) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Dataset not found' }) };
        return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
      }

      const updateFields = { updatedAt: new Date().toISOString() };
      if (body.name !== undefined) updateFields.name = String(body.name).slice(0, 200);
      const result = await col.updateOne(findFilter, { $set: updateFields });
      if (result.matchedCount === 0) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Dataset not found' }) };
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    }

    // DELETE /rv-data/datasets/:id — delete a saved dataset
    if (event.httpMethod === 'DELETE' && resource === 'datasets' && resourceId) {
      const col = db.collection(DATASETS_COL);
      let result;
      try {
        result = await col.deleteOne({ _id: new ObjectId(resourceId) });
      } catch (e) {
        result = await col.deleteOne({ id: parseInt(resourceId) });
      }
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, deletedCount: result.deletedCount }) };
    }

    // ═══════════════════════════════════════════════════
    //  RESIDENT DATASET (single persisted current-resident roster)
    //
    //  Unlike the admissions `datasets` resource (multiple named saves),
    //  there is only ever one stored resident dataset — each upload
    //  replaces it. Current residents' home addresses are sensitive, so
    //  (unlike the rest of this file) every route here requires a staff
    //  session via verifyReqAuth().
    // ═══════════════════════════════════════════════════
    if (resource === 'resident-dataset') {
      const staff = verifyReqAuth(event);
      if (!staff) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };

      const col = db.collection(RESIDENT_DATASET_COL);

      // GET /rv-data/resident-dataset — fetch the current stored roster, if any
      if (event.httpMethod === 'GET') {
        const doc = await col.findOne({ _key: 'current' });
        return { statusCode: 200, headers, body: JSON.stringify(doc || null) };
      }

      // POST /rv-data/resident-dataset — replace the stored roster
      if (event.httpMethod === 'POST') {
        const body = JSON.parse(event.body || '{}');
        if (!Array.isArray(body.records) || !body.records.length) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'records is required and must be non-empty' }) };
        }
        const doc = {
          _key: 'current',
          sourceFile: body.sourceFile || 'Unknown',
          recordCount: body.records.length,
          records: body.records,
          uploadedAt: new Date().toISOString(),
          uploadedBy: staff.sub || null
        };
        await col.updateOne({ _key: 'current' }, { $set: doc }, { upsert: true });
        return { statusCode: 200, headers, body: JSON.stringify({ success: true, recordCount: doc.recordCount }) };
      }

      // DELETE /rv-data/resident-dataset — clear the stored roster
      if (event.httpMethod === 'DELETE') {
        await col.deleteOne({ _key: 'current' });
        return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
      }

      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Not found' }) };
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
