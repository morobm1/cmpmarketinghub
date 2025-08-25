import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { getDb } from './_db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '8h';

export async function findUser(username){
  const db = await getDb();
  return db.collection('users').findOne({ username });
}

export async function createUser({ username, password, role='user', properties=[] }){
  const db = await getDb();
  const passwordHash = await bcrypt.hash(password, 10);
  const doc = { username, passwordHash, role, properties };
  await db.collection('users').insertOne(doc);
  return doc;
}

export async function updateUser(username, updates){
  const db = await getDb();
  if (updates.password){
    updates.passwordHash = await bcrypt.hash(updates.password, 10);
    delete updates.password;
  }
  await db.collection('users').updateOne({ username }, { $set: updates });
}

export function signToken(user){
  const payload = { sub: user.username, role: user.role, properties: user.properties };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

function parseCookies(event){
  const raw = event.headers.cookie || event.headers.Cookie || '';
  const out = {};
  raw.split(';').forEach(p => {
    const i = p.indexOf('='); if (i === -1) return; const k = p.slice(0,i).trim(); const v = p.slice(i+1).trim(); out[k] = decodeURIComponent(v);
  });
  return out;
}

export function verifyReqAuth(event){
  let token = null;
  const auth = event.headers.authorization || event.headers.Authorization || '';
  if (auth && auth.startsWith('Bearer ')) token = auth.slice(7);
  if (!token){ const cookies = parseCookies(event); if (cookies.mmp_token) token = cookies.mmp_token; }
  if (!token) return null;
  try{ return jwt.verify(token, JWT_SECRET); }catch(e){ return null; }
}

export async function ensureSeedAdmin(){
  const db = await getDb();
  const admin = await db.collection('users').findOne({ username: 'morobm1' });
  if (!admin){
    const passwordHash = await bcrypt.hash('Admin0701!', 10);
    await db.collection('users').insertOne({ username:'morobm1', passwordHash, role:'admin', properties:'*' });
  }
}
