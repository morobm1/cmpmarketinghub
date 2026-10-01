import { verifyReqAuth } from './_auth.js';
import { json } from './_reslife.js';

/**
 * Reslife Creative Studio — AI copy assistant.
 *
 * POST {
 *   propertyContext: { name, institution, city, voice, terminology, facts[] },   // from property.config.js
 *   task: 'generate' | 'rewrite' | 'campaign',
 *   request,            // free-text ask, e.g. "game night next Thursday 7pm community room"
 *   action,             // rewrite action label, e.g. "Make Shorter", "Create SMS Version"
 *   audience,           // 'residents' | 'parents' | 'applicants'
 *   format,             // 'letter' | 'post' | 'story' | 'sign' | 'email' | 'sms' | 'notice'
 *   content,            // current fields { headline, subheadline, body, date, time, location, cta }
 *   today               // ISO date from the client so "next Thursday" resolves correctly
 * }
 * → { ok:true, provider, result:{ headline, subheadline, body, date, time, location, cta, layout, caption, hashtags, sms, emailSubject, emailBody, notes } }
 * → 501 { ok:false, fallback:true } when no AI key is configured (client uses its built-in generator).
 */
const SYSTEM = (ctx) => `You write on-brand communications for ${ctx.name}, student housing at ${ctx.institution} in ${ctx.city}.
Brand voice: ${ctx.voice}
Terminology: always say "License Agreement" (never "lease") unless the request explicitly asks for lease wording. Prefer: ${(ctx.terminology || []).join(', ')}.
Approved facts you MAY use (never invent others):
${(ctx.facts || []).map(f => '- ' + f).join('\n')}
Rules:
- Never fabricate policies, prices, deadlines, phone numbers, emails or dates. If something is needed but unknown, write it as [[placeholder]].
- Flyer copy must be short: headline <= 6 words, subheadline <= 12 words, body <= 45 words. Body bullets start with "- ".
- Parent/guardian audience: emphasize academic success, support, belonging, safety, proximity to class, financial clarity and License Agreement expectations; do not reuse student hype language.
- Emergency topics: calm, factual, no exclamation points, and include "STAFF: verify before sending." in notes.
- SMS <= 160 characters, start with "Harbour:".
Respond ONLY with a JSON object with keys: headline, subheadline, body, date, time, location, cta, layout (one of event|guide|checklist|notice|spotlight|parent), caption, hashtags, sms, emailSubject, emailBody, notes. Use "" for anything not applicable.`;

function userPrompt(b) {
  const parts = [`Task: ${b.task || 'generate'}`, `Audience: ${b.audience || 'residents'}`, `Output format: ${b.format || 'letter'}`, `Today is ${b.today || new Date().toISOString().slice(0, 10)}.`];
  if (b.request) parts.push(`Request: ${b.request}`);
  if (b.action) parts.push(`Rewrite action: ${b.action}`);
  if (b.content) parts.push(`Current content JSON: ${JSON.stringify(b.content)}`);
  return parts.join('\n');
}

function parseJson(text) {
  const m = String(text || '').match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}

export async function handler(event) {
  const user = verifyReqAuth(event);
  if (!user) return { statusCode: 401, body: 'Unauthorized' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  const b = JSON.parse(event.body || '{}');
  const ctx = b.propertyContext || {};
  if (!ctx.name) return { statusCode: 400, body: 'Missing propertyContext' };
  const system = SYSTEM(ctx);
  const prompt = userPrompt(b);

  try {
    if (process.env.ANTHROPIC_API_KEY) {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: process.env.CREATIVE_AI_MODEL || 'claude-sonnet-4-20250514', max_tokens: 1500, system, messages: [{ role: 'user', content: prompt }] }),
      });
      const data = await r.json();
      const result = parseJson(data.content && data.content[0] && data.content[0].text);
      if (result) return json(200, { ok: true, provider: 'anthropic', result });
    }
    if (process.env.OPENAI_API_KEY) {
      const r = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        body: JSON.stringify({ model: process.env.CREATIVE_AI_OPENAI_MODEL || 'gpt-4o', temperature: 0.6, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }] }),
      });
      const data = await r.json();
      const result = parseJson(data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content);
      if (result) return json(200, { ok: true, provider: 'openai', result });
    }
    return json(501, { ok: false, fallback: true, message: 'No AI provider configured' });
  } catch (e) {
    return json(502, { ok: false, fallback: true, message: e.message });
  }
}
