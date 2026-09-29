import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { getDb, ObjectId } from './_db.js';
import { verifyReqAuth, parseCookies } from './_auth.js';

// ─────────────────────────────────────────────────────────────────────────
//  RV Client Portal API
//
//  This is intentionally isolated from the main staff auth system (_auth.js
//  / JWT_SECRET / the `users` collection):
//    - A completely separate signing secret (RV_CLIENT_JWT_SECRET) is used,
//      so a client-portal token can NEVER be accepted by verifyReqAuth() /
//      the dozens of staff-only functions that just check "is there any
//      valid token" without checking role.
//    - A completely separate cookie name (rv_client_token) is used, so it
//      never collides with the staff session cookie (mmp_token).
//    - Every client-scoped token embeds the specific portalId it was issued
//      for; /view always re-derives the portal from the token, never from a
//      client-supplied id, so a client can only ever see their own portal.
//    - Admin routes (create/list/update/delete portals) require a normal
//      staff session via verifyReqAuth(), same as every other admin tool.
// ─────────────────────────────────────────────────────────────────────────

const PORTALS_COL = 'rv_client_portals';
const CLIENT_JWT_SECRET = process.env.RV_CLIENT_JWT_SECRET || 'dev-rv-client-secret-change-me';
const CLIENT_JWT_EXPIRES = '12h';
const CLIENT_COOKIE = 'rv_client_token';

function json(statusCode, body, extraHeaders) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      ...(extraHeaders || {})
    },
    body: JSON.stringify(body)
  };
}

function slugify(str) {
  return String(str || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function generateSlug(clientName) {
  const base = slugify(clientName) || 'client';
  const suffix = crypto.randomBytes(3).toString('hex');
  return `${base}-${suffix}`;
}

function generatePassword(len = 14) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const bytes = crypto.randomBytes(len);
  let out = '';
  for (let i = 0; i < len; i++) out += chars[bytes[i] % chars.length];
  return out;
}

function signClientToken(portalId) {
  return jwt.sign({ scope: 'rv-client-portal', portalId: String(portalId) }, CLIENT_JWT_SECRET, { expiresIn: CLIENT_JWT_EXPIRES });
}

function verifyClientToken(event) {
  const cookies = parseCookies(event);
  const token = cookies[CLIENT_COOKIE];
  if (!token) return null;
  try {
    const payload = jwt.verify(token, CLIENT_JWT_SECRET);
    if (payload.scope !== 'rv-client-portal' || !payload.portalId) return null;
    return payload;
  } catch (e) {
    return null;
  }
}

function isLocalRequest(event) {
  const host = (event.headers && (event.headers.host || event.headers.Host)) || '';
  const proto = (event.headers && (event.headers['x-forwarded-proto'] || event.headers['X-Forwarded-Proto'])) || '';
  return /localhost|127\.0\.0\.1/.test(host) || /^http$/i.test(proto);
}

function setClientCookieHeader(event, token) {
  const ttlSeconds = 12 * 60 * 60; // align with CLIENT_JWT_EXPIRES
  const flags = isLocalRequest(event)
    ? `HttpOnly; SameSite=Lax; Path=/; Max-Age=${ttlSeconds}` // dev over http
    : `HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${ttlSeconds}`; // prod over https
  return `${CLIENT_COOKIE}=${encodeURIComponent(token)}; ${flags}`;
}

function clearClientCookieHeader(event) {
  const flags = isLocalRequest(event)
    ? 'HttpOnly; SameSite=Lax; Path=/; Max-Age=0'
    : 'HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0';
  return `${CLIENT_COOKIE}=; ${flags}`;
}

function findPortalFilter(idOrSlug) {
  try { return { _id: new ObjectId(idOrSlug) }; } catch (e) { /* not an ObjectId */ }
  if (/^\d+$/.test(idOrSlug)) return { id: parseInt(idOrSlug) };
  return { slug: idOrSlug };
}

function statsSummaryCsv(records) {
  const bandOrder = ['0–10 mi', '10–50 mi', '50–100 mi', '100+ mi'];
  const bandCounts = {}; bandOrder.forEach(b => bandCounts[b] = 0);
  const appTypeCounts = {};
  const statusCounts = {};
  const housingCounts = { Yes: 0, No: 0, Unknown: 0 };
  let depositsPaid = 0;
  records.forEach(r => {
    if (bandCounts[r.band] !== undefined) bandCounts[r.band]++;
    const at = r.appType || 'Unknown'; appTypeCounts[at] = (appTypeCounts[at] || 0) + 1;
    const st = r.status || 'Unknown'; statusCounts[st] = (statusCounts[st] || 0) + 1;
    if (r.housing === 'Yes') housingCounts.Yes++; else if (r.housing === 'No') housingCounts.No++; else housingCounts.Unknown++;
    if ((r.status || '').includes('Paid')) depositsPaid++;
  });

  let csv = 'Metric,Value\n';
  csv += `Total Records,${records.length}\n`;
  csv += `Deposits Paid,${depositsPaid}\n`;
  csv += '\nDistance Band,Count\n';
  bandOrder.forEach(b => { csv += `${b},${bandCounts[b]}\n`; });
  csv += '\nApplication Type,Count\n';
  Object.entries(appTypeCounts).forEach(([k, v]) => { csv += `"${k}",${v}\n`; });
  csv += '\nStatus,Count\n';
  Object.entries(statusCounts).forEach(([k, v]) => { csv += `"${k}",${v}\n`; });
  csv += '\nHousing Interest,Count\n';
  Object.entries(housingCounts).forEach(([k, v]) => { csv += `${k},${v}\n`; });
  return csv;
}

function residentSummaryCsv(records) {
  const bandOrder = ['0–10 mi', '10–50 mi', '50–100 mi', '100+ mi'];
  const bandCounts = {}; bandOrder.forEach(b => bandCounts[b] = 0);
  const occupantTypeCounts = {};
  let mapped = 0;
  records.forEach(r => {
    if (bandCounts[r.band] !== undefined) bandCounts[r.band]++;
    const ot = r.occupantType || 'Unknown'; occupantTypeCounts[ot] = (occupantTypeCounts[ot] || 0) + 1;
    if (r.lat && r.lng) mapped++;
  });

  let csv = 'Metric,Value\n';
  csv += `Total Residents,${records.length}\n`;
  csv += `Mapped Residents,${mapped}\n`;
  csv += '\nDistance Band,Count\n';
  bandOrder.forEach(b => { csv += `${b},${bandCounts[b]}\n`; });
  csv += '\nOccupant Type,Count\n';
  Object.entries(occupantTypeCounts).forEach(([k, v]) => { csv += `"${k}",${v}\n`; });
  return csv;
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(204, {});

  try {
    const db = await getDb();
    const path = event.path.replace('/.netlify/functions/rv-client-portal', '');
    const segments = path.split('/').filter(Boolean);
    const resource = segments[0] || '';
    const resourceId = segments[1] || '';
    const col = db.collection(PORTALS_COL);

    // ═══════════════════════════════════════════════════
    //  ADMIN ROUTES — require a normal staff session
    // ═══════════════════════════════════════════════════
    if (resource === 'admin') {
      const staff = verifyReqAuth(event);
      if (!staff) return json(401, { error: 'Unauthorized' });

      const sub = segments[1] || '';
      const subId = segments[2] || '';

      // GET /admin/portals — list (metadata only, no records/password)
      if (event.httpMethod === 'GET' && sub === 'portals' && !subId) {
        const portals = await col.find({})
          .project({
            passwordHash: 0,
            'primary.records': 0,
            'compare.a.records': 0,
            'compare.b.records': 0
          })
          .sort({ createdAt: -1 })
          .toArray();
        return json(200, portals);
      }

      // POST /admin/portals — create a new client portal
      if (event.httpMethod === 'POST' && sub === 'portals') {
        const body = JSON.parse(event.body || '{}');
        const clientName = String(body.clientName || '').trim();
        const username = String(body.username || '').trim();
        if (!clientName || !username) {
          return json(400, { error: 'clientName and username are required' });
        }
        if (!body.primary || !Array.isArray(body.primary.records) || !body.primary.records.length) {
          return json(400, { error: 'primary.records is required and must be non-empty' });
        }

        const existing = await col.findOne({ username });
        if (existing) return json(409, { error: 'That username is already used by another client link' });

        const password = generatePassword();
        const passwordHash = await bcrypt.hash(password, 10);
        const slug = generateSlug(clientName);

        const doc = {
          id: Date.now(),
          slug,
          clientName,
          username,
          passwordHash,
          status: 'active',
          type: body.type === 'resident' ? 'resident' : 'admissions',
          allowExport: !!body.allowExport,
          allowCompare: !!body.allowCompare,
          primary: {
            name: body.primary.name || 'Admit Radius Data',
            records: body.primary.records
          },
          primaryRecordCount: body.primary.records.length,
          compare: (body.allowCompare && body.compare && Array.isArray(body.compare.a?.records) && Array.isArray(body.compare.b?.records))
            ? {
                a: { name: body.compare.a.name || 'Dataset A', records: body.compare.a.records },
                b: { name: body.compare.b.name || 'Dataset B', records: body.compare.b.records }
              }
            : null,
          createdAt: new Date().toISOString(),
          createdBy: staff.sub || null
        };
        await col.insertOne(doc);

        return json(201, {
          success: true,
          id: doc.id,
          slug,
          username,
          password // returned exactly once — never retrievable again
        });
      }

      // PUT /admin/portals/:id — revoke/reactivate, rename, or reset password
      if (event.httpMethod === 'PUT' && sub === 'portals' && subId) {
        const body = JSON.parse(event.body || '{}');
        const filter = findPortalFilter(subId);
        const updateFields = { updatedAt: new Date().toISOString() };
        let newPassword = null;

        if (body.status && ['active', 'revoked'].includes(body.status)) updateFields.status = body.status;
        if (body.clientName !== undefined) updateFields.clientName = String(body.clientName).slice(0, 200);
        if (body.resetPassword) {
          newPassword = generatePassword();
          updateFields.passwordHash = await bcrypt.hash(newPassword, 10);
        }

        const result = await col.updateOne(filter, { $set: updateFields });
        if (result.matchedCount === 0) return json(404, { error: 'Client link not found' });
        return json(200, { success: true, password: newPassword });
      }

      // DELETE /admin/portals/:id — permanently delete
      if (event.httpMethod === 'DELETE' && sub === 'portals' && subId) {
        const filter = findPortalFilter(subId);
        const result = await col.deleteOne(filter);
        return json(200, { success: true, deletedCount: result.deletedCount });
      }

      return json(404, { error: 'Not found' });
    }

    // ═══════════════════════════════════════════════════
    //  CLIENT ROUTES — require the separate client-scoped token
    // ═══════════════════════════════════════════════════

    // POST /login — { slug, username, password }
    if (event.httpMethod === 'POST' && resource === 'login') {
      const body = JSON.parse(event.body || '{}');
      const { slug, username, password } = body;
      if (!slug || !username || !password) return json(400, { error: 'slug, username, and password are required' });

      const portal = await col.findOne({ slug, username });
      if (!portal || portal.status !== 'active') return json(401, { error: 'Invalid credentials' });

      const ok = await bcrypt.compare(password, portal.passwordHash);
      if (!ok) return json(401, { error: 'Invalid credentials' });

      const token = signClientToken(portal._id);
      return json(200, { success: true, clientName: portal.clientName }, { 'Set-Cookie': setClientCookieHeader(event, token) });
    }

    // GET /view — requires the client cookie; returns the frozen dataset(s)
    if (event.httpMethod === 'GET' && resource === 'view') {
      const claims = verifyClientToken(event);
      if (!claims) return json(401, { error: 'Unauthorized' });

      let portal;
      try { portal = await col.findOne({ _id: new ObjectId(claims.portalId) }); } catch (e) { portal = null; }
      if (!portal || portal.status !== 'active') return json(401, { error: 'Unauthorized' });

      // If the page also tells us which portal link it was opened from,
      // make sure it actually matches the session's portal — otherwise a
      // browser that's still logged into a different client's portal would
      // silently show that client's data under this URL.
      const requestedSlug = (event.queryStringParameters || {}).slug;
      if (requestedSlug && requestedSlug !== portal.slug) return json(401, { error: 'Session does not match this portal link' });

      return json(200, {
        clientName: portal.clientName,
        type: portal.type || 'admissions',
        allowExport: !!portal.allowExport,
        allowCompare: !!portal.allowCompare,
        primary: portal.primary,
        compare: portal.allowCompare ? portal.compare : null
      });
    }

    // GET /summary.csv — aggregate-only CSV export (requires client cookie)
    if (event.httpMethod === 'GET' && resource === 'summary.csv') {
      const claims = verifyClientToken(event);
      if (!claims) return json(401, { error: 'Unauthorized' });

      let portal;
      try { portal = await col.findOne({ _id: new ObjectId(claims.portalId) }); } catch (e) { portal = null; }
      if (!portal || portal.status !== 'active' || !portal.allowExport) return json(401, { error: 'Unauthorized' });

      const requestedSlug = (event.queryStringParameters || {}).slug;
      if (requestedSlug && requestedSlug !== portal.slug) return json(401, { error: 'Session does not match this portal link' });

      const csv = portal.type === 'resident' ? residentSummaryCsv(portal.primary.records) : statsSummaryCsv(portal.primary.records);
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${slugify(portal.clientName)}-summary.csv"`,
          'Access-Control-Allow-Origin': '*'
        },
        body: csv
      };
    }

    // POST /logout
    if (event.httpMethod === 'POST' && resource === 'logout') {
      return json(200, { success: true }, { 'Set-Cookie': clearClientCookieHeader(event) });
    }

    return json(404, { error: 'Not found' });
  } catch (err) {
    console.error('RV Client Portal API error:', err);
    return json(500, { error: err.message });
  }
};
