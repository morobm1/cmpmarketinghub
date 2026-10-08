/** Shared admin helpers: DOM, API, toasts, modals, menus, routing, formatting. */

export const FALLBACK_PUBLIC_BASE = 'https://cmpmarketinghub.netlify.app'; // APP_BASE_URL in .env.example

// Admin views build DOM with optional (null/false) children; skip them instead of rendering "null".
// Scoped to this tool's page only (pulse-survey/index.html).
for (const m of ['append', 'replaceChildren']) {
  const orig = Element.prototype[m];
  Element.prototype[m] = function (...kids) { return orig.apply(this, kids.flat().filter((k) => k != null && k !== false)); };
}

export const state = { user: null, brand: null, publicBaseUrl: null, categories: [], leaveGuard: null, charts: [] };

export const el = (tag, attrs = {}, ...kids) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') n.className = v;
    else if (k === 'text') n.textContent = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(n.style, v);
    else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2), v);
    else if (k === 'value') n.value = v;
    else if (k === 'checked' || k === 'disabled' || k === 'selected') n[k] = !!v;
    else n.setAttribute(k, v === true ? '' : v);
  }
  kids.flat(Infinity).forEach((c) => { if (c != null && c !== false) n.append(c.nodeType ? c : document.createTextNode(String(c))); });
  return n;
};

export async function api(action, payload = {}) {
  let res;
  try {
    res = await fetch('/api/pulse-survey', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', 'X-Pulse-Request': '1' }, body: JSON.stringify({ action, ...payload }) });
  } catch { throw Object.assign(new Error('Network error — check your connection.'), { network: true }); }
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) { location.href = '../index.html'; throw new Error('Signed out'); }
  if (!res.ok || data.ok === false) throw Object.assign(new Error(data.error || `Request failed (${res.status})`), { status: res.status, data });
  return data;
}

let toastTimer;
export function toast(msg, isErr = false) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.toggle('err', !!isErr); t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), isErr ? 5000 : 2600);
}

export function modal({ title, body, actions = [], wide = false, onClose }) {
  const back = el('div', { class: 'modal-back', role: 'dialog', 'aria-modal': 'true', 'aria-label': title });
  const close = () => { back.remove(); document.removeEventListener('keydown', esc); onClose && onClose(); };
  const esc = (e) => { if (e.key === 'Escape') close(); };
  const foot = el('footer', {}, actions.map((a) => el('button', { class: a.class || '', type: 'button', onclick: async (e) => {
    const b = e.currentTarget; b.disabled = true;
    try { const r = a.onClick ? await a.onClick() : undefined; if (r !== false) close(); } catch (err) { toast(err.message, true); } finally { b.disabled = false; }
  }, text: a.label })));
  back.append(el('div', { class: 'modal' + (wide ? ' wide' : '') },
    el('header', {}, el('h3', { text: title }), el('button', { class: 'link', 'aria-label': 'Close', onclick: close, text: '✕' })),
    el('div', { class: 'body' }, body), actions.length ? foot : null));
  back.addEventListener('mousedown', (e) => { if (e.target === back) close(); });
  document.addEventListener('keydown', esc);
  document.body.append(back);
  const f = back.querySelector('.body input, .body select, .body textarea, footer button'); f && f.focus();
  return close;
}

export function confirmDialog(title, message, okLabel = 'Confirm', danger = false) {
  return new Promise((resolve) => {
    let ok = false;
    modal({ title, body: el('div', {}, typeof message === 'string' ? el('p', { text: message }) : message),
      actions: [{ label: 'Cancel' }, { label: okLabel, class: danger ? 'danger' : 'primary', onClick: () => { ok = true; } }],
      onClose: () => resolve(ok) });
  });
}

export function promptDialog(title, label, value = '') {
  return new Promise((resolve) => {
    let out = null; const inp = el('input', { type: 'text', value });
    modal({ title, body: el('div', { class: 'form-group' }, el('label', { text: label }), inp), actions: [{ label: 'Cancel' }, { label: 'Save', class: 'primary', onClick: () => { out = inp.value.trim(); } }], onClose: () => resolve(out) });
  });
}

export function menu(label, items, cls = 'sm') {
  const wrap = el('div', { class: 'menu' });
  const btn = el('button', { class: cls, type: 'button', 'aria-haspopup': 'true', text: label });
  const list = el('div', { class: 'menu-list', role: 'menu' });
  items.filter(Boolean).forEach((it) => list.append(it === '-' ? el('hr') : el('button', { role: 'menuitem', type: 'button', disabled: it.disabled, style: it.danger ? 'color:#dc2626' : null, onclick: (e) => { e.stopPropagation(); wrap.classList.remove('open'); it.onClick(); }, text: it.label })));
  btn.addEventListener('click', (e) => { e.stopPropagation(); document.querySelectorAll('.menu.open').forEach((m) => m !== wrap && m.classList.remove('open')); wrap.classList.toggle('open'); });
  wrap.append(btn, list);
  return wrap;
}
document.addEventListener('click', () => document.querySelectorAll('.menu.open').forEach((m) => m.classList.remove('open')));

export const fmtDate = (d, withTime = false) => {
  if (!d) return '—';
  const x = new Date(d); if (isNaN(x)) return '—';
  return x.toLocaleString('en-US', withTime ? { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' } : { month: 'short', day: 'numeric', year: 'numeric' });
};
export const toLocalInput = (iso) => { if (!iso) return ''; const d = new Date(iso); const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };

export function statusBadge(s) {
  const label = s.status === 'published' && s.state && s.state !== 'open' ? `published · ${s.state === 'notyet' ? 'not open yet' : s.state}` : s.status;
  return el('span', { class: 'badge ' + s.status, text: label });
}

/** Create → Build → Preview → Publish → Share → Collect → Analyze → Report */
export function lifecycle(s) {
  const steps = ['Create', 'Build', 'Publish', 'Collect', 'Analyze', 'Report'];
  let at = 1;
  if (s.currentVersion) at = 3;
  if ((s.responseCount || 0) > 0) at = 4;
  if (s.status === 'closed' || s.status === 'archived') at = 5;
  return el('div', { class: 'lifecycle', 'aria-label': 'Lifecycle stage' }, steps.map((t, i) => el('span', { class: i < at ? 'done' : i === at ? 'now' : '', text: t })));
}

export function publicUrl(publicId) {
  const base = state.publicBaseUrl || FALLBACK_PUBLIC_BASE;
  return `${base}/survey/${publicId}`;
}

export function destroyCharts() { state.charts.forEach((c) => { try { c.destroy(); } catch { /* ignore */ } }); state.charts = []; }
export function makeChart(canvas, cfg) {
  if (!window.Chart) { canvas.replaceWith(el('div', { class: 'muted small', text: 'Charts unavailable (Chart.js failed to load).' })); return null; }
  const c = new window.Chart(canvas, cfg); state.charts.push(c); return c;
}

export function download(filename, blob) {
  const a = el('a', { href: URL.createObjectURL(blob), download: filename });
  document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

export const routes = {};
export function navigate(tab, param) {
  location.hash = param ? `${tab}/${param}` : tab;
}
