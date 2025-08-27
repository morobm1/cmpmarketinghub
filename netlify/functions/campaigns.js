import { getDb } from './_db.js';
import { verifyReqAuth } from './_auth.js';

function json(status, body){ return { statusCode: status, headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) }; }

export async function handler(event){
  const method = event.httpMethod || 'GET';
  const url = new URL(event.rawUrl || `http://localhost${event.path}`);
  const property = url.searchParams.get('property');

  if (method === 'GET'){
    if (!property) return json(400, { error:'property required' });
    try{
      const db = await getDb();
      const doc = await db.collection('campaigns').findOne({ property });
      if (!doc) return json(404, { error:'not found' });
      return json(200, { property, campaigns: doc.campaigns || [] });
    }catch(e){ return json(500, { error:'server_error', detail: String(e?.message||e) }); }
  }

  if (method === 'PUT'){
    const auth = verifyReqAuth(event);
    if (!auth || auth.role !== 'admin') return json(403, { error:'forbidden' });
    let body = {};
    try{ body = JSON.parse(event.body||'{}'); }catch(e){ return json(400, { error:'invalid_json' }); }
    const { property: propBody, campaigns } = body || {};
    const prop = propBody || property;
    if (!prop || !Array.isArray(campaigns)) return json(400, { error:'property and campaigns required' });
    const norm = (c)=>({
      id: String(c.id||'').trim() || String((c.label||'').toLowerCase().replace(/[^a-z0-9]+/g,'-')).slice(0,32),
      label: String(c.label||'').trim(),
      visible: c.visible !== false,
      color: String(c.color||'').trim() || ''
    });
    const list = campaigns.map(norm).filter(c => c.label);
    try{
      const db = await getDb();
      await db.collection('campaigns').updateOne(
        { property: prop },
        { $set:{ property: prop, campaigns: list, updatedAt: new Date(), updatedBy: auth.sub } },
        { upsert:true }
      );
      return json(200, { property: prop, campaigns: list });
    }catch(e){ return json(500, { error:'server_error', detail: String(e?.message||e) }); }
  }

  return json(405, { error:'method_not_allowed' });
}
