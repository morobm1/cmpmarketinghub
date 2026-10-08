// Local smoke-test server: static files + Pulse Survey functions on an in-memory DB + /survey/* rewrite.
// Usage: node tests/pulse-survey/dev-server.mjs [port] [--slow=ms] [--fail-public]
// Prints the seeded survey's public URL after publishing it, for browser testing. NOT used in production.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import jwt from 'jsonwebtoken';
import { fakeDb } from './fake-db.mjs';

const port = Number(process.argv[2]) || 8899;
const slow = Number((process.argv.find((a) => a.startsWith('--slow=')) || '=0').split('=')[1]);
const failPublic = process.argv.includes('--fail-public');
globalThis.__PULSE_TEST_DB__ = fakeDb();
process.env.APP_BASE_URL = `https://cmpmarketinghub.netlify.app`;
const { handler: admin } = await import('../../netlify/functions/pulse-survey.js');
const { handler: pub } = await import('../../netlify/functions/pulse-survey-public.js');
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '../..');
const TOKEN = jwt.sign({ sub: 'morobm1', role: 'admin', properties: '*' }, 'dev-secret-change-me');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };
let failCount = 0;

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`);
  const body = await new Promise((r) => { let b = ''; req.on('data', (c) => { b += c; }); req.on('end', () => r(b)); });
  if (url.pathname === '/api/me') { res.end(JSON.stringify({ username: 'morobm1', role: 'admin', properties: '*' })); return; }
  const fn = url.pathname === '/api/pulse-survey' ? admin : url.pathname === '/api/pulse-survey-public' ? pub : null;
  if (fn) {
    if (slow) await new Promise((r) => setTimeout(r, slow));
    if (failPublic && fn === pub && failCount++ < 2) { res.writeHead(503); res.end('{"ok":false}'); return; }
    const headers = { ...req.headers, cookie: `mmp_token=${TOKEN}` };
    const out = await fn({ httpMethod: req.method, headers, body, queryStringParameters: Object.fromEntries(url.searchParams) });
    res.writeHead(out.statusCode, { 'Content-Type': 'application/json', ...(out.headers || {}) });
    res.end(out.isBase64Encoded ? Buffer.from(out.body, 'base64') : out.body); return;
  }
  let p = url.pathname.startsWith('/survey/') ? '/pulse-survey/public.html' : url.pathname;
  if (p.endsWith('/')) p += 'index.html';
  const file = path.join(root, decodeURIComponent(p));
  if (!file.startsWith(root) || !fs.existsSync(file)) { res.writeHead(404); res.end('not found'); return; }
  res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

server.listen(port, async () => {
  const call = (action, b = {}) => admin({ httpMethod: 'POST', headers: { cookie: `mmp_token=${TOKEN}`, 'x-pulse-request': '1' }, body: JSON.stringify({ action, ...b }) }).then((r) => JSON.parse(r.body));
  await call('bootstrap');
  const { surveys } = await call('list');
  const s = surveys[0];
  const p = await call('publish', { surveyId: s.id });
  console.log(`READY http://localhost:${port}/survey/${p.publicId}`);
  console.log(`ADMIN http://localhost:${port}/pulse-survey/index.html`);
  console.log(`SURVEY_ID ${s.id}`);
});
