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
    const cookie = `mmp_token=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${ttlSeconds}`;
    return {
      statusCode: 200,
      headers: { 'Set-Cookie': cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: { username: user.username, role: user.role, properties: user.properties } })
    };
  }catch(e){
    return { statusCode: 500, body: e.message };
  }
}
