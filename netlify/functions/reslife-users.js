import crypto from 'crypto';
import { verifyReqAuth, createUser, updateUser, findUser } from './_auth.js';
import { getDb } from './_db.js';
import { getReslifeProperties, refreshReslifeUser, json } from './_reslife.js';

const LISTED_ROLES = ['reslife-ra', 'reslife-rec', 'reslife-admin'];

/**
 * Reslife Hub — Scoped User Management (REC, Reslife Admin, site admin)
 *
 * Scope: callers only see/manage accounts on properties they are assigned to (site admin: all).
 * Role rules:
 *   - REC          may create/edit RA and REC accounts, and change roles between RA ⇄ REC.
 *   - Reslife Admin may also assign/edit the Reslife Admin role.
 *   - Site admin   same as Reslife Admin, across all properties.
 *   - Excel bulk imports ALWAYS create RA accounts.
 *   - Nobody can change their own role or delete themselves here.
 *
 * User profile fields stored: username, fullName, email, phone, role, properties[], createdBy, createdAt,
 * credentialsIssuedAt.
 *
 * GET                                   - list accounts in scope (no password hashes)
 * POST   { username?, fullName, email, phone?, role, property, password? }   - create one (password auto-generated if blank)
 * POST   { action:'bulk', property, rows:[{ fullName, email, username?, phone? }] } - Excel import (role forced to RA)
 * POST   { action:'reissue', username }  - generate a new temporary password; returns it once
 * PUT    { username, updates:{ role?, property?, password?, fullName?, email?, phone? } }
 * DELETE { username }
 */
function tempPassword() {
  const words = ['Harbor', 'Coast', 'Wave', 'Tide', 'Sunny', 'Pier', 'Shore', 'Sail', 'Reef', 'Breeze'];
  const w = words[crypto.randomInt(words.length)];
  const sym = '!@#$%*'[crypto.randomInt(6)];
  return `${w}${crypto.randomInt(1000, 9999)}${sym}${crypto.randomBytes(2).toString('hex')}`;
}
const cleanEmail = e => String(e || '').trim().toLowerCase();
const validEmail = e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const usernameFrom = (email, name) => (cleanEmail(email).split('@')[0] || String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, '.')).replace(/[^a-z0-9._-]/g, '').slice(0, 40);

export async function handler(event) {
  const user = verifyReqAuth(event);
  if (!user) return { statusCode: 401, body: 'Unauthorized' };

  const db = await getDb();
  await refreshReslifeUser(db, user);
  const users = db.collection('users');

  const isSiteAdmin = user.role === 'admin';
  const isAdminTier = isSiteAdmin || user.role === 'reslife-admin';
  const isRec = user.role === 'reslife-rec';
  if (!isAdminTier && !isRec) return { statusCode: 403, body: 'Forbidden' };

  const assignable = isAdminTier ? ['reslife-ra', 'reslife-rec', 'reslife-admin'] : ['reslife-ra', 'reslife-rec'];
  const editableTargets = isAdminTier ? LISTED_ROLES : ['reslife-ra', 'reslife-rec'];
  const myProperties = getReslifeProperties(user);
  const inScope = arr => isSiteAdmin || (Array.isArray(arr) && arr.length > 0 && arr.every(p => myProperties.includes(p)));
  const publicUser = u => ({ username: u.username, fullName: u.fullName || '', email: u.email || '', phone: u.phone || '', role: u.role, properties: u.properties || [], createdBy: u.createdBy || '', createdAt: u.createdAt || '', credentialsIssuedAt: u.credentialsIssuedAt || '' });

  async function uniqueUsername(base) {
    let name = base || 'user', i = 1;
    while (await findUser(name)) name = `${base}${++i}`;
    return name;
  }

  try {
    if (event.httpMethod === 'GET') {
      const filter = { role: { $in: LISTED_ROLES } };
      if (!isSiteAdmin) filter.properties = { $in: myProperties };
      const docs = await users.find(filter, { projection: { _id: 0, passwordHash: 0 } }).sort({ fullName: 1, username: 1 }).toArray();
      return json(200, { users: docs.map(publicUser), assignableRoles: assignable, editableRoles: editableTargets, me: user.sub });
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const now = new Date().toISOString();

      if (body.action === 'reissue') {
        const target = await findUser(body.username);
        if (!target || !editableTargets.includes(target.role) || !inScope(target.properties)) return { statusCode: 403, body: 'Forbidden' };
        const password = tempPassword();
        await updateUser(target.username, { password, credentialsIssuedAt: now, credentialsIssuedBy: user.sub });
        return json(200, { username: target.username, fullName: target.fullName || '', email: target.email || '', role: target.role, property: (target.properties || [])[0] || '', tempPassword: password });
      }

      if (body.action === 'bulk') {
        const property = body.property;
        if (!property || !inScope([property])) return { statusCode: 403, body: 'Property not in your scope' };
        const rows = Array.isArray(body.rows) ? body.rows.slice(0, 500) : [];
        const results = [];
        for (const r of rows) {
          const fullName = String(r.fullName || '').trim();
          const email = cleanEmail(r.email);
          if (!fullName && !email) continue;
          if (!validEmail(email)) { results.push({ fullName, email, status: 'error', message: 'Invalid or missing email' }); continue; }
          const dup = await users.findOne({ email });
          if (dup) { results.push({ fullName, email, username: dup.username, status: 'skipped', message: 'Email already has an account' }); continue; }
          const username = await uniqueUsername(String(r.username || '').trim() || usernameFrom(email, fullName));
          const password = tempPassword();
          await createUser({ username, password, role: 'reslife-ra', properties: [property] });
          await users.updateOne({ username }, { $set: { fullName, email, phone: String(r.phone || '').trim(), createdBy: user.sub, createdAt: now, credentialsIssuedAt: now } });
          results.push({ fullName, email, username, role: 'reslife-ra', property, tempPassword: password, status: 'created' });
        }
        return json(200, { results });
      }

      // Single create
      const fullName = String(body.fullName || '').trim();
      const email = cleanEmail(body.email);
      const role = body.role || 'reslife-ra';
      const property = body.property;
      if (!fullName || !email || !property) return { statusCode: 400, body: 'Full name, email and property are required' };
      if (!validEmail(email)) return { statusCode: 400, body: 'Invalid email' };
      if (!assignable.includes(role)) return { statusCode: 403, body: 'You cannot assign that role' };
      if (!inScope([property])) return { statusCode: 403, body: 'Property not in your scope' };
      if (await users.findOne({ email })) return { statusCode: 409, body: 'An account with that email already exists' };
      let username = String(body.username || '').trim();
      if (username) { if (await findUser(username)) return { statusCode: 409, body: 'Username already exists' }; }
      else username = await uniqueUsername(usernameFrom(email, fullName));
      const password = body.password || tempPassword();
      await createUser({ username, password, role, properties: [property] });
      await users.updateOne({ username }, { $set: { fullName, email, phone: String(body.phone || '').trim(), createdBy: user.sub, createdAt: now, credentialsIssuedAt: now } });
      return json(200, { username, fullName, email, role, property, tempPassword: password });
    }

    if (event.httpMethod === 'PUT') {
      const { username, updates } = JSON.parse(event.body || '{}');
      if (!username || !updates) return { statusCode: 400, body: 'Missing username/updates' };
      const target = await findUser(username);
      if (!target || !LISTED_ROLES.includes(target.role)) return { statusCode: 404, body: 'Not found' };
      if (!editableTargets.includes(target.role) || !inScope(target.properties)) return { statusCode: 403, body: 'Forbidden' };

      const safe = {};
      if (updates.password) safe.password = updates.password;
      if (updates.role && updates.role !== target.role) {
        if (username === user.sub) return { statusCode: 400, body: 'You cannot change your own role' };
        if (!assignable.includes(updates.role)) return { statusCode: 403, body: 'You cannot assign that role' };
        safe.role = updates.role;
      }
      if (updates.property) {
        if (!inScope([updates.property])) return { statusCode: 403, body: 'Property not in your scope' };
        safe.properties = [updates.property];
      }
      if (updates.fullName !== undefined) safe.fullName = String(updates.fullName).trim();
      if (updates.phone !== undefined) safe.phone = String(updates.phone).trim();
      if (updates.email !== undefined) {
        const email = cleanEmail(updates.email);
        if (email && !validEmail(email)) return { statusCode: 400, body: 'Invalid email' };
        if (email && email !== target.email && await users.findOne({ email })) return { statusCode: 409, body: 'Email already in use' };
        safe.email = email;
      }
      safe.updatedBy = user.sub; safe.updatedAt = new Date().toISOString();
      await updateUser(username, safe);
      return json(200, { success: true });
    }

    if (event.httpMethod === 'DELETE') {
      const { username } = JSON.parse(event.body || '{}');
      if (!username) return { statusCode: 400, body: 'Missing username' };
      if (username === user.sub) return { statusCode: 400, body: 'You cannot delete your own account' };
      const target = await findUser(username);
      if (!target || !editableTargets.includes(target.role) || !inScope(target.properties)) return { statusCode: 403, body: 'Forbidden' };
      await users.deleteOne({ username });
      return json(200, { success: true });
    }

    return { statusCode: 405, body: 'Method Not Allowed' };
  } catch (e) {
    return { statusCode: 500, body: e.message };
  }
}
