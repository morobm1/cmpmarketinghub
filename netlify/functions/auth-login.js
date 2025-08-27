import { findUser, signToken, ensureSeedAdmin } from './_auth.js';
import bcrypt from 'bcryptjs';

export async function handler(event){
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  try{
    await ensureSeedAdmin();
    const { username, password } = JSON.parse(event.body||'{}');
    if (!username || !password) return { statusCode: 400, body: 'Missing credentials' };
    const user = await findUser(username);
    if (!user) return { statusCode: 401, body: 'Invalid' };
    const ok = await bcrypt.compare(password, user.passwordHash||'');
    if (!ok) return { statusCode: 401, body: 'Invalid' };
    const token = signToken(user);
    const ttlSeconds = 8*60*60; // align with 8h default
    const host = (event.headers && (event.headers.host || event.headers.Host)) || '';
    const proto = (event.headers && (event.headers['x-forwarded-proto'] || event.headers['X-Forwarded-Proto'])) || '';
    const isLocal = /localhost|127\.0\.0\.1/.test(host) || /^http$/i.test(proto);
    const flags = isLocal
      ? `HttpOnly; SameSite=Lax; Path=/; Max-Age=${ttlSeconds}` // dev over http
      : `HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${ttlSeconds}`; // prod over https
    const cookie = `mmp_token=${encodeURIComponent(token)}; ${flags}`;
    return {
      statusCode: 200,
      headers: { 'Set-Cookie': cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: { username: user.username, role: user.role, properties: user.properties } })
    };
  }catch(e){
    return { statusCode: 500, body: e.message };
  }
}
