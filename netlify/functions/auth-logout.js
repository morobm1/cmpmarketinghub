export async function handler(event){
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  const cookie = 'mmp_token=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0';
  return { statusCode: 200, headers: { 'Set-Cookie': cookie }, body: 'OK' };
}
