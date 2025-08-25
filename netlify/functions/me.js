import { verifyReqAuth } from './_auth.js';
import { findUser } from './_auth.js';

export async function handler(event){
  const claims = verifyReqAuth(event);
  if (!claims) return { statusCode: 401, body: 'Unauthorized' };
  // Optionally re-fetch user for latest role/properties
  const user = await findUser(claims.sub);
  if (!user) return { statusCode: 401, body: 'Unauthorized' };
  return { statusCode: 200, body: JSON.stringify({ username: user.username, role: user.role, properties: user.properties }) };
}
