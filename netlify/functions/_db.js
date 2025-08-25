import { MongoClient, ObjectId } from 'mongodb';

let cachedClient = null;
let cachedDb = null;

export async function getDb(){
  if (cachedDb) return cachedDb;
  const uri = process.env.MONGODB_ATLAS_URI;
  const dbName = process.env.MONGODB_DB_NAME || 'mmp';
  if (!uri) throw new Error('Missing MONGODB_ATLAS_URI env var');
  const client = new MongoClient(uri, { maxPoolSize: 5 });
  await client.connect();
  cachedClient = client;
  cachedDb = client.db(dbName);
  return cachedDb;
}

export { ObjectId };
