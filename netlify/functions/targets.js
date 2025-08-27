import { getDb } from './_db.js';
import { verifyReqAuth } from './_auth.js';

function json(statusCode, body){
  return { statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}

export async function handler(event){
  const method = event.httpMethod || event.requestContext?.http?.method || 'GET';
  const url = new URL(event.rawUrl || `http://localhost${event.path}${event.queryStringParameters ? ('?' + new URLSearchParams(event.queryStringParameters).toString()) : ''}`);
  const property = url.searchParams.get('property');

  if (method === 'GET'){
    if (!property) return json(400, { error: 'property required' });
    try{
      const db = await getDb();
      const doc = await db.collection('targets').findOne({ property });
      if (!doc) return json(404, { error: 'not found' });
      return json(200, { property, config: doc.config || {} });
    }catch(e){
      return json(500, { error: 'server_error', detail: String(e?.message||e) });
    }
  }

  if (method === 'PUT'){
    const auth = verifyReqAuth(event);
    if (!auth || auth.role !== 'admin') return json(403, { error: 'forbidden' });
    let body = {};
    try{ body = JSON.parse(event.body||'{}'); }catch(e){ return json(400, { error: 'invalid_json' }); }
    const { property: propBody, config } = body || {};
    const prop = propBody || property;
    if (!prop || !config) return json(400, { error: 'property and config required' });
    // Basic shape validation
    const safeConfig = { weekly: Array.isArray(config.weekly)?config.weekly:[], monthly: Array.isArray(config.monthly)?config.monthly:[] };
    // Normalize items
    function normItem(it){
      if (!it || typeof it !== 'object') return null;
      return {
        id: String(it.id||'').trim(),
        label: String(it.label||'').trim(),
        cadence: it.cadence === 'weekly' ? 'weekly' : 'monthly',
        visible: Boolean(it.visible),
        min: Number.isFinite(it.min)?it.min:0,
        max: Number.isFinite(it.max)?it.max:0,
      };
    }
    safeConfig.weekly = safeConfig.weekly.map(normItem).filter(Boolean);
    safeConfig.monthly = safeConfig.monthly.map(normItem).filter(Boolean);

    try{
      const db = await getDb();
      await db.collection('targets').updateOne(
        { property: prop },
        { $set: { property: prop, config: safeConfig, updatedAt: new Date(), updatedBy: auth.sub } },
        { upsert: true }
      );
      return json(200, { property: prop, config: safeConfig });
    }catch(e){
      return json(500, { error: 'server_error', detail: String(e?.message||e) });
    }
  }

  return json(405, { error: 'method_not_allowed' });
}
