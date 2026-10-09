/*
 * ResLife Hub — Programming module (Program Proposals + Action Item Lists + budget + checklist +
 * approvals + evaluation + dashboard/calendar).
 *
 * Loaded as a classic script by reslife_hub.html BEFORE the main inline script. It only defines
 * functions at load time; it relies on the hub's globals at call time:
 *   apiFetch, esc, fmtDate, me, isManager, isAdminTier, currentProperty, propParam,
 *   toggleForm, initWizard, resetWizard, reviewRow
 * The hub calls loadPrograms() (tab load) and bindProgramForm() (once, from bindAllForms).
 *
 * The server (netlify/functions/reslife-programs.js) is the authority for permissions, status
 * transitions, budget totals and policy warnings. The client mirrors the budget math only so the
 * form can update live while an RA types.
 */
/* global apiFetch, esc, fmtDate, me, isManager, isAdminTier, currentProperty, propParam, toggleForm, initWizard, resetWizard, reviewRow */

const PG_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const PG_STATUS = {
  draft: 'Draft', submitted: 'Submitted', under_review: 'Under review', changes_requested: 'Changes requested', approved: 'Approved',
  scheduled: 'Scheduled', completed: 'Completed', rejected: 'Not approved', cancelled: 'Cancelled',
};
const PG_PTYPE = { individual: 'Individual', collaborative: 'Collaborative', large_scale: 'Large Scale' };
const PG_ITEM_KINDS = { purchase: { label: 'Purchase', pill: 'maintenance' }, supply: { label: 'Supply on hand', pill: 'key' }, flyer: { label: 'Flyer / Marketing', pill: 'in-progress' }, task: { label: 'Task / Other', pill: 'open' } };
const PG_ITEM_STATUS = { planned: 'Planned', approved: 'Approved', ordered: 'Ordered', received: 'Received', cancelled: 'Cancelled' };
const PG_FULFILL = { '': 'Select…', delivery: 'Delivery', pickup: 'Order pickup', in_store: 'In-store purchase', on_hand: 'Already on hand', other: 'Other' };
const PG_TASK_STATUS = { not_started: 'Not started', in_progress: 'In progress', done: 'Done', blocked: 'Blocked' };
const PG_DESC_TEMPLATE = `The vision: [One sentence — what is this program?]
What residents will do: [Arrival → activity → wrap-up]
Partners: [Campus or community partner, if any]`;

let progDocs = [];
let progLocations = [];
let pgSettings = null;
let pgStaff = [];
let pgCanAdmin = false;
let progView = 'dashboard';
let pgCalMode = 'month';
let pgCalAnchor = new Date();
// Form state
let pgForm = { id: '', version: undefined, status: 'draft', dirty: false, saving: false, timer: null, lastSaved: null, base: null };

// ---------- small helpers ----------
const pg$ = id => document.getElementById(id);
const pgMoney = n => (n == null || isNaN(n) ? '—' : '$' + Number(n).toFixed(2));
const pgCents = v => Math.round((parseFloat(v) || 0) * 100);
const pgNameOf = u => { const s = pgStaff.find(x => x.username === u); return s ? (s.fullName || s.username) : (u || ''); };
const pgIsMember = p => p && (p.createdBy === me.username || p.owner === me.username || (p.collaborators || []).includes(me.username));
const pgToday = () => new Date().toISOString().slice(0, 10);
function pgErr(e) {
  try { const j = JSON.parse(e.message); return j; } catch (x) { return { error: e.message }; }
}
function pgTimeOptions(sel, blankLabel) {
  let html = `<option value="">${blankLabel}</option>`;
  for (let h = 6; h < 24; h++) for (let m = 0; m < 60; m += 15) {
    const v = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
    html += `<option value="${v}">${((h % 12) || 12)}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}</option>`;
  }
  sel.innerHTML = html;
}
function pgTime12(v) { if (!v) return ''; const [h, m] = v.split(':').map(Number); return ((h % 12) || 12) + ':' + String(m).padStart(2, '0') + (h < 12 ? ' AM' : ' PM'); }
function splitEventDate(iso) {
  if (!iso) return { date: '', time: '' };
  const d = new Date(iso); if (isNaN(d)) return { date: '', time: '' };
  const p = n => String(n).padStart(2, '0');
  return { date: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`, time: `${p(d.getHours())}:${p(Math.floor(d.getMinutes() / 15) * 15)}` };
}
function progMonthOf(p) { return p.month || (p.eventDate ? PG_MONTHS[new Date(p.eventDate).getMonth()] : ''); }

// ---------- budget (mirror of server computeBudget, integer cents) ----------
function pgComputeBudget(items, vendors, approved) {
  const key = s => String(s || '').trim().toLowerCase();
  const cfg = new Map((vendors || []).map(v => [key(v.vendor), v]));
  const groups = new Map();
  (items || []).filter(i => (i.kind || 'purchase') === 'purchase' && i.status !== 'cancelled').forEach(it => {
    const k = key(it.vendor) || '(no vendor)';
    if (!groups.has(k)) groups.set(k, { vendor: String(it.vendor || '').trim() || '(no vendor)', sub: 0, count: 0 });
    const g = groups.get(k); g.sub += pgCents(it.price) * Math.max(0, Math.round(+it.qty || 0)); g.count++;
  });
  for (const [k, v] of cfg) if (!groups.has(k)) groups.set(k, { vendor: v.vendor, sub: 0, count: 0 });
  let sub = 0, tax = 0, fees = 0, tips = 0, actual = 0, hasActual = false;
  const rows = [...groups.entries()].map(([k, g]) => {
    const v = cfg.get(k) || {};
    const t = Math.round(g.sub * Math.min(parseFloat(v.taxRate) || 0, 100) / 100);
    const f = pgCents(v.deliveryFee) + pgCents(v.serviceFee) + pgCents(v.instacartFee);
    const tp = pgCents(v.tip);
    sub += g.sub; tax += t; fees += f; tips += tp;
    if (v.actual != null && v.actual !== '') { hasActual = true; actual += pgCents(v.actual); }
    return { vendor: g.vendor, items: g.count, subtotal: g.sub / 100, tax: t / 100, fees: f / 100, tip: tp / 100, total: (g.sub + t + f + tp) / 100 };
  });
  const total = sub + tax + fees + tips;
  const ap = approved == null || approved === '' ? null : pgCents(approved);
  return { vendors: rows, subtotal: sub / 100, tax: tax / 100, fees: fees / 100, tips: tips / 100, total: total / 100, approvedBudget: ap == null ? null : ap / 100, remaining: ap == null ? null : (ap - total) / 100, overBudget: ap != null && ap > 0 && total > ap, actual: hasActual ? actual / 100 : null };
}
function pgWarnings(items, vendors, approved) {
  const R = (pgSettings && pgSettings.rules) || {};
  const food = new Set(((pgSettings && pgSettings.foodPurchaseTypes) || ['Food', 'Beverages']).map(x => x.toLowerCase()));
  const key = s => String(s || '').trim().toLowerCase();
  const vc = new Map((vendors || []).map(v => [key(v.vendor), v]));
  const out = []; const seen = new Set();
  const add = (r, id) => { if (R[r] && R[r].enabled && !seen.has(r + id)) { seen.add(r + id); out.push({ rule: r, itemId: id || '', message: R[r].message }); } };
  (items || []).filter(i => (i.kind || 'purchase') === 'purchase').forEach(it => {
    const v = key(it.vendor), cfg = vc.get(v) || {};
    if (/amazon/.test(v) && food.has(String(it.purchaseType || '').toLowerCase())) add('amazon_food', it.id);
    if (/costco/.test(v) && /food\s*court/.test(v)) add('costco_food_court', it.id);
    if (it.fulfillment === 'pickup' && (!it.neededBy || !it.assignedRA)) add('pickup_details', it.id);
    if (it.perishable) add('perishable', it.id);
    if (it.fulfillment === 'delivery' && !(+cfg.deliveryFee || +cfg.serviceFee || +cfg.instacartFee || +cfg.tip)) add('delivery_fees', 'v:' + v);
    if (/instacart/.test(v + ' ' + key(it.notes)) && !(+cfg.instacartFee || +cfg.serviceFee)) add('instacart_fees', 'v:' + v);
  });
  if (pgComputeBudget(items, vendors, approved).overBudget) add('over_budget');
  return out;
}
function pgBudgetHTML(b, opts) {
  opts = opts || {};
  const rows = b.vendors.length ? b.vendors.map(v => `<tr><td>${esc(v.vendor)}</td><td>${v.items}</td><td>${pgMoney(v.subtotal)}</td><td>${pgMoney(v.tax)}</td><td>${pgMoney(v.fees)}</td><td>${pgMoney(v.tip)}</td><td><b>${pgMoney(v.total)}</b></td></tr>`).join('') : '<tr><td colspan="7" style="color:var(--rl-subtext)">No purchases yet.</td></tr>';
  return `<div class="pg-budget">
    <div style="overflow-x:auto"><table class="rl-table pg-table"><thead><tr><th>Vendor</th><th>Items</th><th>Subtotal</th><th>Tax</th><th>Fees</th><th>Tip</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table></div>
    <div class="pg-budget-sum">
      <div><span>Items subtotal</span><b>${pgMoney(b.subtotal)}</b></div>
      <div><span>Est. sales tax</span><b>${pgMoney(b.tax)}</b></div>
      <div><span>Delivery / service / Instacart fees</span><b>${pgMoney(b.fees)}</b></div>
      <div><span>Tips</span><b>${pgMoney(b.tips)}</b></div>
      <div class="tot"><span>Total estimated budget</span><b>${pgMoney(b.total)}</b></div>
      <div><span>Approved budget</span><b>${b.approvedBudget == null ? 'Not set' : pgMoney(b.approvedBudget)}</b></div>
      ${b.approvedBudget != null ? `<div class="${b.remaining < 0 ? 'neg' : ''}"><span>Remaining</span><b>${pgMoney(b.remaining)}</b></div>` : ''}
      ${opts.actual != null || b.actual != null ? `<div><span>Actual expenditures</span><b>${pgMoney(opts.actual != null ? opts.actual : b.actual)}</b></div>` : ''}
    </div></div>`;
}
function pgWarnHTML(ws) {
  if (!ws || !ws.length) return '';
  const uniq = []; const m = new Set();
  ws.forEach(w => { if (!m.has(w.rule + w.message)) { m.add(w.rule + w.message); uniq.push(w); } });
  return `<div class="pg-warn" role="status"><b>Purchasing guidance</b><ul>${uniq.map(w => `<li>${esc(w.message)}</li>`).join('')}</ul><small>These are reminders only — nothing in your list or budget was changed.</small></div>`;
}

// ---------- data loading ----------
async function pgLoadMeta() {
  try {
    const r = await apiFetch('/reslife-programs' + propParam() + '&settings=1');
    pgSettings = r.settings; pgStaff = r.staff || []; pgCanAdmin = !!r.canAdmin;
  } catch (e) { pgSettings = pgSettings || { categories: [], purchaseTypes: [], rules: {}, defaultTasks: [] }; }
}
async function loadProgLocations() { try { progLocations = await apiFetch('/reslife-locations' + propParam()); } catch (e) { progLocations = []; } }

async function loadPrograms() {
  const host = pg$('progList');
  pg$('progDashboard').innerHTML = '<div class="rl-loading">Loading…</div>';
  try {
    const [docs] = await Promise.all([apiFetch('/reslife-programs' + propParam()), loadProgLocations(), pgLoadMeta()]);
    progDocs = docs || [];
  } catch (e) { pg$('progDashboard').innerHTML = '<div class="rl-empty">Failed to load programs.</div>'; host.innerHTML = ''; return; }
  pg$('pgSettingsBtn').classList.toggle('hidden', !(pgCanAdmin && isAdminTier));
  pgFillFilters();
  renderPrograms();
}

function pgFillFilters() {
  const keep = (id, html) => { const s = pg$(id); const v = s.value; s.innerHTML = html; s.value = v; };
  keep('progFilterStatus', '<option value="">All statuses</option>' + Object.entries(PG_STATUS).map(([k, v]) => `<option value="${k}">${v}</option>`).join(''));
  const cats = [...new Set([...(pgSettings.categories || []), ...progDocs.map(p => p.category).filter(Boolean)])];
  keep('progFilterCategory', '<option value="">All categories</option>' + cats.map(c => `<option>${esc(c)}</option>`).join(''));
  const ras = [...new Set(progDocs.flatMap(p => [p.owner, ...(p.collaborators || [])]).filter(Boolean))].sort();
  keep('progFilterRA', '<option value="">All RAs</option>' + ras.map(r => `<option value="${esc(r)}">${esc(pgNameOf(r))}</option>`).join(''));
  const recs = [...new Set(progDocs.map(p => p.rec).filter(Boolean))].sort();
  keep('progFilterRec', '<option value="">All RECs</option>' + recs.map(r => `<option value="${esc(r)}">${esc(pgNameOf(r))}</option>`).join(''));
}

function progFiltered() {
  const v = id => pg$(id).value;
  const q = v('progSearch').trim().toLowerCase();
  const from = v('progFrom'), to = v('progTo');
  const list = progDocs.filter(p => {
    const day = p.eventDate ? splitEventDate(p.eventDate).date : '';
    return (!v('progFilterStatus') || p.status === v('progFilterStatus')) &&
      (!v('progFilterPType') || p.programType === v('progFilterPType')) &&
      (!v('progFilterCategory') || p.category === v('progFilterCategory')) &&
      (!v('progFilterRA') || p.owner === v('progFilterRA') || (p.collaborators || []).includes(v('progFilterRA'))) &&
      (!v('progFilterRec') || p.rec === v('progFilterRec')) &&
      (!from || (day && day >= from)) && (!to || (day && day <= to)) &&
      (!pg$('progMineOnly').checked || pgIsMember(p)) &&
      (!q || [p.title, p.location, p.owner, pgNameOf(p.owner), p.category, p.description].some(x => String(x || '').toLowerCase().includes(q)));
  });
  const dv = p => p.eventDate ? new Date(p.eventDate).getTime() : Infinity;
  const sorters = { date: (a, b) => dv(a) - dv(b), 'date-desc': (a, b) => (b.eventDate ? new Date(b.eventDate) : 0) - (a.eventDate ? new Date(a.eventDate) : 0), updated: (a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')), title: (a, b) => String(a.title).localeCompare(String(b.title)) };
  return list.filter(p => !p.isTemplate).sort(sorters[v('progSort')] || sorters.date);
}

// ---------- dashboard / list / calendar ----------
function pgOverdueTasks(p) { const t = pgToday(); return (p.tasks || []).filter(x => x.status !== 'done' && x.due && x.due < t); }
function pgSoonTasks(p) { const t = pgToday(), s = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10); return (p.tasks || []).filter(x => x.status !== 'done' && x.due && x.due >= t && x.due <= s); }
function pgMissingAIL(p) { return !p.noItems && !(p.items || []).length && !['cancelled', 'rejected', 'completed'].includes(p.status); }
function pgPendingPurchases(p) { return (p.items || []).filter(i => i.kind === 'purchase' && ['planned', 'approved', 'ordered'].includes(i.status || 'planned')); }

function renderPrograms() {
  const docs = progFiltered();
  const live = docs.filter(p => !['cancelled', 'rejected'].includes(p.status));
  const now = Date.now();
  const stats = [
    ['Upcoming', live.filter(p => p.eventDate && new Date(p.eventDate) >= now && p.status !== 'completed').length],
    ['Awaiting approval', live.filter(p => ['submitted', 'under_review'].includes(p.status)).length],
    ['Needs revision', live.filter(p => p.status === 'changes_requested').length],
    ['Missing action items', live.filter(pgMissingAIL).length],
    ['Pending purchases', live.reduce((s, p) => s + pgPendingPurchases(p).length, 0)],
    ['Overdue tasks', live.reduce((s, p) => s + pgOverdueTasks(p).length, 0)],
    ['Completed', live.filter(p => p.status === 'completed').length],
    ['Est. budget', '$' + live.reduce((s, p) => s + ((p.budgetSummary && p.budgetSummary.total) || 0), 0).toFixed(0)],
  ];
  pg$('progStats').innerHTML = stats.map(([l, v]) => `<div class="prog-stat"><b>${v}</b><span>${l}</span></div>`).join('');
  ['progDashboard', 'progList', 'progCalendar'].forEach(id => pg$(id).classList.add('hidden'));
  if (progView === 'calendar') { pg$('progCalendar').classList.remove('hidden'); return renderProgCalendar(docs); }
  if (progView === 'list') { pg$('progList').classList.remove('hidden'); return renderProgList(docs); }
  pg$('progDashboard').classList.remove('hidden');
  renderProgDashboard(live);
}

function renderProgDashboard(docs) {
  const now = Date.now();
  const sec = (title, list, empty) => `<div class="pg-dash-card"><h4>${title} <span>${list.length}</span></h4>${list.length ? list.slice(0, 8).map(progMiniHTML).join('') : `<div class="rl-empty" style="padding:8px">${empty}</div>`}</div>`;
  const deadlines = [];
  docs.forEach(p => {
    [...pgOverdueTasks(p).map(t => ({ p, t, over: true })), ...pgSoonTasks(p).map(t => ({ p, t }))].forEach(x => deadlines.push(x));
    (p.items || []).filter(i => i.neededBy && i.status !== 'received' && i.status !== 'cancelled').forEach(i => { if (i.neededBy <= new Date(now + 7 * 864e5).toISOString().slice(0, 10)) deadlines.push({ p, t: { title: 'Need: ' + i.item, due: i.neededBy, assignee: i.assignedRA }, over: i.neededBy < pgToday() }); });
  });
  deadlines.sort((a, b) => a.t.due.localeCompare(b.t.due));
  pg$('progDashboard').innerHTML = `<div class="pg-dash">
    ${sec('Upcoming programs', docs.filter(p => p.eventDate && new Date(p.eventDate) >= now && !['completed'].includes(p.status)).sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate)), 'Nothing scheduled.')}
    ${sec('Awaiting approval', docs.filter(p => ['submitted', 'under_review'].includes(p.status)), 'No proposals waiting.')}
    ${sec('Changes requested', docs.filter(p => p.status === 'changes_requested'), 'No revisions pending.')}
    ${sec('Missing Action Item List', docs.filter(pgMissingAIL), 'Every program has an action item list.')}
    ${sec('Awaiting evaluation', docs.filter(p => ['approved', 'scheduled'].includes(p.status) && p.eventDate && new Date(p.eventDate) < now && !p.evaluation), 'All past programs are evaluated.')}
    <div class="pg-dash-card"><h4>Deadlines (next 7 days &amp; overdue) <span>${deadlines.length}</span></h4>${deadlines.length ? deadlines.slice(0, 12).map(d => `<button class="pg-mini" data-prog-open="${d.p.id}"><b class="${d.over ? 'pg-over' : ''}">${esc(d.t.due)}${d.over ? ' · overdue' : ''}</b> ${esc(d.t.title)} <small>${esc(d.p.title)}${d.t.assignee ? ' · ' + esc(pgNameOf(d.t.assignee)) : ''}</small></button>`).join('') : '<div class="rl-empty" style="padding:8px">No upcoming deadlines.</div>'}</div>
  </div>`;
  pg$('progDashboard').querySelectorAll('[data-prog-open]').forEach(b => b.onclick = () => openProgDetail(b.getAttribute('data-prog-open')));
}
function progMiniHTML(p) {
  const d = p.eventDate ? new Date(p.eventDate) : null;
  return `<button class="pg-mini" data-prog-open="${p.id}"><span class="pp-pill ${esc(p.status)}">${esc(PG_STATUS[p.status] || p.status)}</span> <b>${esc(p.title)}</b><small>${d ? d.toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'No date'} · ${esc(pgNameOf(p.owner))}${p.category ? ' · ' + esc(p.category) : ''}</small></button>`;
}

function renderProgList(docs) {
  const host = pg$('progList');
  if (!progDocs.filter(p => !p.isTemplate).length) { host.innerHTML = '<div class="rl-empty">No program proposals yet. Click “+ New Program Proposal” to start one.</div>'; return; }
  if (!docs.length) { host.innerHTML = '<div class="rl-empty">No programs match these filters.</div>'; return; }
  const groups = new Map();
  docs.forEach(p => { const k = progMonthOf(p) || 'No date set'; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(p); });
  host.innerHTML = [...groups.entries()].map(([g, items]) => `<div class="prog-month-h">${esc(g)} · ${items.length}</div>` + items.map(progCardHTML).join('')).join('');
  host.querySelectorAll('[data-prog-open]').forEach(b => b.onclick = () => openProgDetail(b.getAttribute('data-prog-open')));
}

function progCardHTML(p) {
  const d = p.eventDate ? new Date(p.eventDate) : null;
  const t = splitEventDate(p.eventDate).time;
  const b = p.budgetSummary || {};
  const od = pgOverdueTasks(p).length;
  return `<div class="prog-card st-${esc(p.status)}">
    <div class="prog-date">${d ? `<div class="m">${PG_MONTHS[d.getMonth()].slice(0, 3)}</div><div class="d">${d.getDate()}</div><div class="w">${d.toLocaleDateString([], { weekday: 'short' })}</div>` : '<div class="m">TBD</div><div class="d">—</div>'}</div>
    <div>
      <h4>${esc(p.title)} <span class="rl-pill blue">${esc(PG_PTYPE[p.programType] || '')}</span> <span class="pp-pill ${esc(p.status)}">${esc(PG_STATUS[p.status] || p.status)}</span></h4>
      <div class="prog-meta">
        ${t && t !== '00:00' ? `<span>${pgTime12(t)}</span>` : ''}
        ${p.location ? `<span>${esc(p.location)}</span>` : ''}
        ${p.category ? `<span>${esc(p.category)}</span>` : ''}
        <span>Est. ${pgMoney(b.total)}${b.approvedBudget != null ? ' / approved ' + pgMoney(b.approvedBudget) : ''}</span>
        <span>RA: ${esc(pgNameOf(p.owner))}${(p.collaborators || []).length ? ' +' + p.collaborators.length : ''}</span>
        ${pgMissingAIL(p) ? '<span class="pg-over">No action item list</span>' : ''}
        ${od ? `<span class="pg-over">${od} overdue task${od > 1 ? 's' : ''}</span>` : ''}
        ${(p.warnings || []).length ? `<span class="pg-warn-chip">${p.warnings.length} purchasing note${p.warnings.length > 1 ? 's' : ''}</span>` : ''}
      </div>
    </div>
    <div class="prog-actions"><button class="rl-btn sm primary" data-prog-open="${p.id}">Open</button></div>
  </div>`;
}

function renderProgCalendar(docs) {
  const cal = pg$('progCalendar');
  const a = pgCalAnchor;
  let start, days, title;
  if (pgCalMode === 'week') {
    start = new Date(a.getFullYear(), a.getMonth(), a.getDate() - a.getDay()); days = 7;
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
    title = `${start.toLocaleDateString([], { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}`;
  } else {
    const first = new Date(a.getFullYear(), a.getMonth(), 1);
    start = new Date(first.getFullYear(), first.getMonth(), 1 - first.getDay()); days = 42;
    title = `${PG_MONTHS[a.getMonth()]} ${a.getFullYear()}`;
  }
  const byDay = {};
  docs.filter(p => p.eventDate).forEach(p => { const k = new Date(p.eventDate).toDateString(); (byDay[k] = byDay[k] || []).push(p); });
  const todayKey = new Date().toDateString();
  let cells = '';
  for (let i = 0; i < days; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    if (pgCalMode === 'month' && i >= 35 && d.getMonth() !== a.getMonth()) break;
    const evs = (byDay[d.toDateString()] || []).sort((x, y) => new Date(x.eventDate) - new Date(y.eventDate));
    cells += `<div class="pp-cal-day${pgCalMode === 'month' && d.getMonth() !== a.getMonth() ? ' out' : ''}${d.toDateString() === todayKey ? ' today' : ''}${pgCalMode === 'week' ? ' wk' : ''}"><span class="pp-cal-num">${d.getDate()}</span>${evs.map(p => { const t = splitEventDate(p.eventDate).time; return `<button class="pp-ev ${esc(p.status)}" data-prog-open="${p.id}" title="${esc(p.title)} · ${esc(PG_STATUS[p.status])} · ${esc(pgNameOf(p.owner))}">${t && t !== '00:00' ? pgTime12(t).replace(':00', '') + ' ' : ''}${esc(p.title)}</button>`; }).join('')}</div>`;
  }
  cal.innerHTML = `<div class="pp-cal-head"><h3>${title}</h3>
      <div class="pp-viewtoggle"><button type="button" class="${pgCalMode === 'month' ? 'active' : ''}" data-cal-mode="month">Month</button><button type="button" class="${pgCalMode === 'week' ? 'active' : ''}" data-cal-mode="week">Week</button></div>
      <button class="rl-btn sm" data-cal-nav="-1" aria-label="Previous">&larr;</button><button class="rl-btn sm" data-cal-nav="0">Today</button><button class="rl-btn sm" data-cal-nav="1" aria-label="Next">&rarr;</button></div>
    <div class="pp-cal">${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => `<div class="pp-cal-dow">${d}</div>`).join('')}${cells}</div>
    <div class="pp-legend" style="margin-top:8px"><span><i class="pp-dot draft"></i>Draft / revision</span><span><i class="pp-dot pending"></i>Awaiting approval</span><span><i class="pp-dot approved"></i>Approved / scheduled</span></div>`;
  cal.querySelectorAll('[data-cal-mode]').forEach(b => b.onclick = () => { pgCalMode = b.getAttribute('data-cal-mode'); renderPrograms(); });
  cal.querySelectorAll('[data-cal-nav]').forEach(b => b.onclick = () => {
    const n = +b.getAttribute('data-cal-nav');
    pgCalAnchor = n === 0 ? new Date() : pgCalMode === 'week' ? new Date(a.getFullYear(), a.getMonth(), a.getDate() + 7 * n) : new Date(a.getFullYear(), a.getMonth() + n, 1);
    renderPrograms();
  });
  cal.querySelectorAll('[data-prog-open]').forEach(b => b.onclick = () => openProgDetail(b.getAttribute('data-prog-open')));
}

// ---------- detail modal (overview / action items / checklist / review / evaluation / history) ----------
function closeProgPreview() { const ov = pg$('progPreview'); if (ov) { ov.classList.remove('show'); document.body.style.overflow = ''; } }
function pgDetailOverlay() {
  let ov = pg$('progPreview');
  if (!ov) {
    ov = document.createElement('div'); ov.id = 'progPreview'; ov.className = 'pp-overlay';
    document.body.appendChild(ov);
    ov.addEventListener('click', e => { if (e.target === ov) closeProgPreview(); });
  }
  return ov;
}

async function openProgDetail(id, tab) {
  const p = progDocs.find(x => x.id === id);
  if (!p) return;
  const ov = pgDetailOverlay();
  const mgr = isManager, member = pgIsMember(p);
  const tabs = [['overview', 'Overview'], ['items', 'Action Items & Budget'], ['tasks', 'Checklist'], ['review', 'Review'], ['eval', 'Evaluation & Report'], ['history', 'History']];
  ov.innerHTML = `<div class="pp-modal pg-modal-wide" role="dialog" aria-modal="true" aria-label="${esc(p.title)}">
    <div class="pp-head"><div class="pp-head-ico">&#9733;</div><div><h3>${esc(p.title)}</h3><p>${esc(PG_PTYPE[p.programType])} · ${esc(PG_STATUS[p.status])} · Owner ${esc(pgNameOf(p.owner))}</p></div><button class="pp-close" type="button" data-pp-close aria-label="Close">&times;</button></div>
    <div class="pg-tabs" role="tablist">${tabs.map(([k, l]) => `<button type="button" role="tab" data-pg-tab="${k}">${l}</button>`).join('')}</div>
    <div class="pg-detail-body" id="pgDetailBody"></div>
    <div class="pg-detail-actions" id="pgDetailActions"></div>
  </div>`;
  ov.classList.add('show'); document.body.style.overflow = 'hidden';
  ov.querySelector('[data-pp-close]').onclick = closeProgPreview;
  const show = k => {
    ov.querySelectorAll('[data-pg-tab]').forEach(b => b.classList.toggle('active', b.getAttribute('data-pg-tab') === k));
    const body = pg$('pgDetailBody');
    if (k === 'overview') body.innerHTML = pgOverviewHTML(p);
    if (k === 'items') body.innerHTML = pgItemsViewHTML(p);
    if (k === 'tasks') { body.innerHTML = ''; pgRenderTasks(p, body); }
    if (k === 'review') body.innerHTML = pgReviewTabHTML(p);
    if (k === 'eval') { body.innerHTML = ''; pgRenderEval(p, body); }
    if (k === 'history') pgRenderHistory(p, body);
  };
  ov.querySelectorAll('[data-pg-tab]').forEach(b => b.onclick = () => show(b.getAttribute('data-pg-tab')));
  show(tab || 'overview');
  pgRenderActions(p, mgr, member);
}

function pgKV(rows) { return `<dl class="rl-wizard-review">${rows.filter(r => r[1] !== undefined).map(([k, v]) => reviewRow(k, v)).join('')}</dl>`; }
function pgOverviewHTML(p) {
  const s = splitEventDate(p.eventDate), e = splitEventDate(p.endDate);
  const lastReview = (p.reviewComments || []).slice(-1)[0];
  return `${lastReview && ['changes_requested', 'rejected'].includes(p.status) ? `<div class="pg-warn"><b>Feedback from ${esc(pgNameOf(lastReview.by))}</b><div style="white-space:pre-wrap">${esc(lastReview.comment)}</div></div>` : ''}
  ${pgKV([
    ['Program type', PG_PTYPE[p.programType]], ['Format', p.type === 'passive' ? 'Passive' : 'Active'], ['Category', p.category || ''], ['Week', p.weekLabel || ''],
    ['Date', s.date ? new Date(s.date + 'T00:00').toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : ''],
    ['Time', [pgTime12(s.time !== '00:00' ? s.time : ''), pgTime12(e.time)].filter(Boolean).join(' – ')], ['Location', p.location || ''],
    ['Primary RA', pgNameOf(p.owner)], ['Collaborators', (p.collaborators || []).map(pgNameOf).join(', ')], ['REC / Supervisor', pgNameOf(p.rec)],
    ['Estimated attendance', p.estAttendance == null ? '' : String(p.estAttendance)], ['Target audience', p.audience || ''],
    ['Description', p.description || ''], ['Learning objectives', p.objectives || ''], ['Engagement goals', p.engagementGoals || ''],
    ['Connection to category', p.categoryConnection || ''], ['Intended outcomes', p.outcomes || ''],
    ['Space reservation', p.spaceReservation || ''], ['Equipment', p.equipment || ''], ['Setup & breakdown', p.setup || ''], ['Marketing', p.marketing || ''],
    ['Accessibility', p.accessibility || ''], ['Other requirements', p.otherNeeds || ''],
    ['Stations', (p.stations || []).map(x => `${x.station}${x.people ? ' — ' + x.people : ''}${x.location ? ' @ ' + x.location : ''}${x.job ? ' (' + x.job + ')' : ''}`).join(' | ')],
  ])}
  <div style="font-size:12px;color:var(--rl-subtext)">Created by ${esc(pgNameOf(p.createdBy))} ${fmtDate(p.createdAt)} · last updated ${fmtDate(p.updatedAt)}${p.updatedBy ? ' by ' + esc(pgNameOf(p.updatedBy)) : ''}${p.approvedBy ? ' · approved by ' + esc(pgNameOf(p.approvedBy)) : ''}</div>`;
}

function pgItemsViewHTML(p) {
  const items = (p.items || []).slice().sort((a, b) => a.order - b.order);
  const purchases = items.filter(i => i.kind === 'purchase');
  const others = items.filter(i => i.kind !== 'purchase');
  const photo = i => i.photoId ? `<a href="/api/reslife-programs${propParam()}&file=${esc(i.photoId)}" target="_blank" rel="noopener"><img class="pg-thumb" alt="" src="/api/reslife-programs${propParam()}&file=${esc(i.photoId)}"/></a>` : (i.photoUrl ? `<a href="${esc(i.photoUrl)}" target="_blank" rel="noopener noreferrer">Image</a>` : '');
  return `${p.noItems ? '<div class="rl-empty">Marked as needing no supplies or purchases.</div>' : ''}
    ${purchases.length ? `<div style="overflow-x:auto"><table class="rl-table pg-table"><thead><tr><th></th><th>Item</th><th>Type</th><th>Vendor</th><th>Unit</th><th>Qty</th><th>Ext.</th><th>RA</th><th>Fulfillment</th><th>Needed by</th><th>Status</th></tr></thead><tbody>
      ${purchases.map(i => `<tr><td>${photo(i)}</td><td>${i.link ? `<a href="${esc(i.link)}" target="_blank" rel="noopener noreferrer">${esc(i.item)}</a>` : esc(i.item)}${i.perishable ? ' <span class="rl-pill high">Perishable</span>' : ''}${i.notes ? `<div class="pg-sub">${esc(i.notes)}</div>` : ''}</td><td>${esc(i.purchaseType || '')}</td><td>${esc(i.vendor || '')}</td><td>${pgMoney(i.price)}</td><td>${esc(i.qty)}</td><td>${pgMoney((pgCents(i.price) * (i.qty || 0)) / 100)}</td><td>${esc(pgNameOf(i.assignedRA))}</td><td>${esc(PG_FULFILL[i.fulfillment || ''] === 'Select…' ? '' : PG_FULFILL[i.fulfillment || ''])}</td><td>${esc(i.neededBy || '')}</td><td>${esc(PG_ITEM_STATUS[i.status] || 'Planned')}</td></tr>`).join('')}
    </tbody></table></div>` : ''}
    ${others.length ? `<ul class="pg-list">${others.map(i => `<li><span class="rl-pill ${PG_ITEM_KINDS[i.kind].pill}">${PG_ITEM_KINDS[i.kind].label}</span> <b>${esc(i.item)}</b> ${[i.qty ? 'qty ' + i.qty : '', i.source ? 'from ' + esc(i.source) : '', i.owner ? esc(pgNameOf(i.owner)) : '', i.due ? 'by ' + esc(i.due) : ''].filter(Boolean).join(' · ')}${i.notes ? `<div class="pg-sub">${esc(i.notes)}</div>` : ''}</li>`).join('')}</ul>` : ''}
    ${pgWarnHTML(p.warnings)}
    ${pgBudgetHTML(p.budgetSummary || pgComputeBudget(items, p.vendors, p.approvedBudget), { actual: p.evaluation && p.evaluation.actualExpenses })}
    ${pgPolicyHTML()}`;
}
function pgPolicyHTML() { const r = pgSettings && pgSettings.rules && pgSettings.rules.payment_policy; return r && r.enabled ? `<div class="pg-policy">${esc(r.message)}</div>` : ''; }

function pgStaffOptions(selected, blank) {
  return `<option value="">${blank || 'Unassigned'}</option>` + pgStaff.map(s => `<option value="${esc(s.username)}"${s.username === selected ? ' selected' : ''}>${esc(s.fullName || s.username)}</option>`).join('') +
    (selected && !pgStaff.some(s => s.username === selected) ? `<option value="${esc(selected)}" selected>${esc(selected)}</option>` : '');
}

function pgRenderTasks(p, host) {
  const editable = p.canEdit;
  let tasks = JSON.parse(JSON.stringify(p.tasks || []));
  const today = pgToday();
  const draw = () => {
    host.innerHTML = `<p class="pp-hint">Operational checklist. ${editable ? 'RECs can add tasks and set deadlines; anyone on the program can update status.' : ''}</p>
      <div id="pgTaskRows">${tasks.map((t, i) => `<div class="pg-task ${t.status === 'done' ? 'done' : ''} ${t.status !== 'done' && t.due && t.due < today ? 'over' : ''}" data-i="${i}">
        <input class="tk-title" value="${esc(t.title)}" ${editable ? '' : 'disabled'} aria-label="Task" />
        <select class="tk-assignee" ${editable ? '' : 'disabled'} aria-label="Assigned to">${pgStaffOptions(t.assignee)}</select>
        <input class="tk-due" type="date" value="${esc(t.due)}" ${editable ? '' : 'disabled'} aria-label="Due date" />
        <select class="tk-status" ${editable ? '' : 'disabled'} aria-label="Status">${Object.entries(PG_TASK_STATUS).map(([k, v]) => `<option value="${k}"${t.status === k ? ' selected' : ''}>${v}</option>`).join('')}</select>
        <input class="tk-notes" value="${esc(t.notes)}" placeholder="Notes" ${editable ? '' : 'disabled'} aria-label="Notes" />
        <span class="tk-att">${t.attachmentId ? `<a href="/api/reslife-programs${propParam()}&file=${esc(t.attachmentId)}" target="_blank" rel="noopener">File</a>` : ''}${editable ? `<label class="rl-btn sm" title="Attach file">&#128206;<input type="file" class="tk-file" accept="image/*,application/pdf" hidden /></label><button class="rl-btn sm danger tk-del" type="button" aria-label="Remove task">&times;</button>` : ''}</span>
        ${t.completedAt ? `<small class="tk-done">Completed ${fmtDate(t.completedAt)}</small>` : t.status !== 'done' && t.due && t.due < today ? '<small class="pg-over">Overdue</small>' : ''}
      </div>`).join('') || '<div class="rl-empty">No tasks.</div>'}</div>
      ${editable ? `<div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap"><button class="rl-btn sm" id="pgTaskAdd" type="button">+ Add task</button>${!tasks.length ? '<button class="rl-btn sm" id="pgTaskDefaults" type="button">Add standard checklist</button>' : ''}<button class="rl-btn sm primary" id="pgTaskSave" type="button">Save checklist</button><span id="pgTaskMsg" class="pg-sub"></span></div>` : ''}`;
    if (!editable) return;
    const read = () => { host.querySelectorAll('.pg-task').forEach(r => { const t = tasks[+r.dataset.i]; t.title = r.querySelector('.tk-title').value; t.assignee = r.querySelector('.tk-assignee').value; t.due = r.querySelector('.tk-due').value; const st = r.querySelector('.tk-status').value; if (st === 'done' && t.status !== 'done') t.completedAt = new Date().toISOString(); if (st !== 'done') t.completedAt = ''; t.status = st; t.notes = r.querySelector('.tk-notes').value; }); };
    host.querySelectorAll('.tk-del').forEach(b => b.onclick = () => { read(); tasks.splice(+b.closest('.pg-task').dataset.i, 1); draw(); });
    host.querySelectorAll('.tk-file').forEach(inp => inp.onchange = async () => {
      read(); const f = inp.files[0]; if (!f) return;
      try { const r = await pgUpload(p.id, f); tasks[+inp.closest('.pg-task').dataset.i].attachmentId = r.id; draw(); } catch (e) { alert(pgErr(e).error); }
    });
    const add = pg$('pgTaskAdd'); if (add) add.onclick = () => { read(); tasks.push({ title: '', status: 'not_started' }); draw(); };
    const defs = pg$('pgTaskDefaults'); if (defs) defs.onclick = () => { tasks = (pgSettings.defaultTasks || []).map(title => ({ title, status: 'not_started' })); draw(); };
    pg$('pgTaskSave').onclick = async () => {
      read();
      try {
        const fresh = await apiFetch('/reslife-programs', { method: 'PUT', body: JSON.stringify({ id: p.id, property: currentProperty, version: p.version, tasks: tasks.filter(t => t.title.trim()) }) });
        pgReplaceDoc(fresh); Object.assign(p, fresh); tasks = JSON.parse(JSON.stringify(fresh.tasks)); draw(); pg$('pgTaskMsg').textContent = 'Saved.'; renderPrograms();
      } catch (e) { const j = pgErr(e); alert(j.error || 'Save failed'); if (e.status === 409) { await loadPrograms(); openProgDetail(p.id, 'tasks'); } }
    };
  };
  draw();
}

function pgReviewTabHTML(p) {
  const rc = p.reviewComments || [];
  return `<div>${rc.length ? rc.map(c => `<div class="pg-comment"><b>${esc(pgNameOf(c.by))}</b> → ${esc(PG_STATUS[c.to] || c.to)} <small>${fmtDate(c.at)}</small><div style="white-space:pre-wrap">${esc(c.comment)}</div></div>`).join('') : '<div class="rl-empty">No review comments yet.</div>'}</div>
    ${p.submittedAt ? `<p class="pg-sub">Last submitted ${fmtDate(p.submittedAt)}</p>` : ''}`;
}

function pgRenderEval(p, host) {
  const e = p.evaluation || {};
  const canEval = (isManager || pgIsMember(p)) && ['approved', 'scheduled', 'completed'].includes(p.status);
  const b = p.budgetSummary || {};
  const cmp = (label, plan, actual) => `<tr><td>${label}</td><td>${plan}</td><td>${actual}</td></tr>`;
  host.innerHTML = `<h4 class="pg-h4">Planned vs. actual</h4>
    <div style="overflow-x:auto"><table class="rl-table pg-table"><thead><tr><th></th><th>Planned</th><th>Actual</th></tr></thead><tbody>
      ${cmp('Attendance', p.estAttendance == null ? '—' : p.estAttendance, e.actualAttendance == null ? '—' : e.actualAttendance)}
      ${cmp('Budget', pgMoney(b.total) + (b.approvedBudget != null ? ` (approved ${pgMoney(b.approvedBudget)})` : ''), e.actualExpenses == null ? (b.actual != null ? pgMoney(b.actual) : '—') : pgMoney(e.actualExpenses))}
      ${cmp('Outcomes', esc(p.outcomes || p.objectives || '—'), esc(e.results || '—'))}
    </tbody></table></div>
    ${canEval ? `<div class="rl-form-grid" style="margin-top:12px">
      <div class="rl-field"><label for="evAtt">Actual attendance</label><input id="evAtt" type="number" min="0" inputmode="numeric" value="${e.actualAttendance ?? ''}"/></div>
      <div class="rl-field"><label for="evExp">Actual expenses ($)</label><input id="evExp" type="number" min="0" step="0.01" inputmode="decimal" value="${e.actualExpenses ?? ''}"/></div>
      <div class="rl-field full"><label for="evRes">Program results</label><textarea id="evRes" rows="3">${esc(e.results || '')}</textarea></div>
      <div class="rl-field full"><label for="evFb">Resident feedback</label><textarea id="evFb" rows="3">${esc(e.feedback || '')}</textarea></div>
      <div class="rl-field"><label for="evCh">Challenges</label><textarea id="evCh" rows="3">${esc(e.challenges || '')}</textarea></div>
      <div class="rl-field"><label for="evRec">Recommendations</label><textarea id="evRec" rows="3">${esc(e.recommendations || '')}</textarea></div>
      <div class="rl-field full"><label>Photos / files</label><div id="evFiles">${(e.attachmentIds || []).map(id => `<a href="/api/reslife-programs${propParam()}&file=${esc(id)}" target="_blank" rel="noopener" class="rl-pill blue" data-ev-file="${esc(id)}">File</a>`).join(' ')}</div><input type="file" id="evFile" accept="image/*,application/pdf" /></div>
    </div><button class="rl-btn primary" id="evSave" type="button">Save evaluation</button> <span id="evMsg" class="pg-sub"></span>`
    : `<div class="rl-empty">${e.submittedAt ? `Evaluation submitted by ${esc(pgNameOf(e.submittedBy))} ${fmtDate(e.submittedAt)}.` : 'An evaluation can be entered once the program is approved.'}</div>
       ${e.feedback ? reviewRow('Resident feedback', e.feedback) : ''}`}`;
  if (!canEval) return;
  const ids = [...(e.attachmentIds || [])];
  pg$('evFile').onchange = async ev => {
    const f = ev.target.files[0]; if (!f) return;
    try { const r = await pgUpload(p.id, f); ids.push(r.id); pg$('evFiles').insertAdjacentHTML('beforeend', ` <span class="rl-pill blue">${esc(f.name)}</span>`); ev.target.value = ''; } catch (x) { alert(pgErr(x).error); }
  };
  pg$('evSave').onclick = async () => {
    const evaluation = { actualAttendance: pg$('evAtt').value, actualExpenses: pg$('evExp').value, results: pg$('evRes').value, feedback: pg$('evFb').value, challenges: pg$('evCh').value, recommendations: pg$('evRec').value, attachmentIds: ids };
    try { await apiFetch('/reslife-programs', { method: 'PUT', body: JSON.stringify({ action: 'evaluation', id: p.id, property: currentProperty, evaluation }) }); pg$('evMsg').textContent = 'Saved.'; await loadPrograms(); openProgDetail(p.id, 'eval'); }
    catch (x) { alert(pgErr(x).error || 'Save failed'); }
  };
}

async function pgRenderHistory(p, host) {
  host.innerHTML = '<div class="rl-loading">Loading…</div>';
  try {
    const rows = await apiFetch('/reslife-programs' + propParam() + '&id=' + encodeURIComponent(p.id) + '&history=1');
    host.innerHTML = rows.length ? `<ul class="pg-list">${rows.map(r => `<li><b>${esc(pgNameOf(r.by))}</b> ${esc(r.action)}${r.detail && r.detail.to ? ' → ' + esc(PG_STATUS[r.detail.to] || r.detail.to) : ''}${r.detail && r.detail.fields ? ' <small>(' + esc(r.detail.fields.join(', ')) + ')</small>' : ''} <small>${fmtDate(r.at)}</small></li>`).join('')}</ul>` : '<div class="rl-empty">No recorded history yet (history starts with this release).</div>';
  } catch (e) { host.innerHTML = '<div class="rl-empty">History is visible to the program team and managers.</div>'; }
}

function pgRenderActions(p, mgr, member) {
  const box = pg$('pgDetailActions');
  const b = (to, label, cls) => `<button class="rl-btn sm ${cls || ''}" data-pg-to="${to}" type="button">${label}</button>`;
  const acts = [];
  if (p.canEdit) acts.push(`<button class="rl-btn sm" data-pg-edit type="button">Edit</button>`);
  acts.push(`<button class="rl-btn sm" data-pg-dup type="button">Duplicate</button>`);
  if (member || mgr) {
    if (['draft', 'changes_requested'].includes(p.status)) acts.push(b('submitted', 'Submit for approval', 'primary'));
    if (p.status === 'submitted' && member) acts.push(b('draft', 'Withdraw to draft'));
  }
  if (mgr) {
    if (p.status === 'submitted') acts.push(b('under_review', 'Start review'));
    if (['submitted', 'under_review', 'changes_requested'].includes(p.status)) acts.push(b('approved', 'Approve', 'success'), b('changes_requested', 'Request changes'), b('rejected', 'Reject', 'danger'));
    if (p.status === 'approved') acts.push(b('scheduled', 'Mark scheduled'), b('changes_requested', 'Request changes'));
    if (['approved', 'scheduled'].includes(p.status)) acts.push(b('completed', 'Mark completed', 'success'));
    if (['rejected', 'cancelled'].includes(p.status)) acts.push(b('draft', 'Reopen as draft'));
    acts.push(`<button class="rl-btn sm" data-pg-template type="button">${p.isTemplate ? 'Remove from templates' : 'Save as template'}</button>`);
  }
  if (!['cancelled', 'completed', 'rejected'].includes(p.status) && (mgr || (member && ['draft', 'submitted', 'changes_requested'].includes(p.status)))) acts.push(b('cancelled', 'Cancel program', 'danger'));
  if (mgr || (p.createdBy === me.username && ['draft', 'submitted', 'changes_requested', 'cancelled'].includes(p.status))) acts.push(`<button class="rl-btn sm danger" data-pg-del type="button">Delete</button>`);
  box.innerHTML = acts.join('');
  box.querySelectorAll('[data-pg-to]').forEach(btn => btn.onclick = () => pgChangeStatus(p, btn.getAttribute('data-pg-to')));
  const ed = box.querySelector('[data-pg-edit]'); if (ed) ed.onclick = () => { closeProgPreview(); openProgramForm(p); };
  box.querySelector('[data-pg-dup]').onclick = () => pgDuplicate(p);
  const tp = box.querySelector('[data-pg-template]'); if (tp) tp.onclick = async () => {
    try { const fresh = await apiFetch('/reslife-programs', { method: 'PUT', body: JSON.stringify({ id: p.id, property: currentProperty, version: p.version, isTemplate: !p.isTemplate }) }); pgReplaceDoc(fresh); openProgDetail(p.id); }
    catch (e) { alert(pgErr(e).error); }
  };
  const del = box.querySelector('[data-pg-del]'); if (del) del.onclick = async () => {
    if (!confirm('Delete this program and its attachments? This cannot be undone.')) return;
    try { await apiFetch('/reslife-programs?id=' + encodeURIComponent(p.id) + '&property=' + encodeURIComponent(currentProperty), { method: 'DELETE' }); closeProgPreview(); await loadPrograms(); }
    catch (e) { alert(pgErr(e).error); }
  };
}

async function pgChangeStatus(p, to) {
  let comment = '', approvedBudget;
  if (['changes_requested', 'rejected'].includes(to)) {
    comment = prompt(to === 'rejected' ? 'Reason this program is not approved (sent to the RA):' : 'What should the RA change? (sent to the RA)') || '';
    if (!comment.trim()) return;
  } else if (to === 'approved') {
    const cur = p.approvedBudget != null ? p.approvedBudget : (p.budgetSummary ? p.budgetSummary.total.toFixed(2) : '');
    const v = prompt('Approved budget for this program ($). Leave blank to approve without setting a budget.', cur);
    if (v === null) return;
    approvedBudget = v.trim();
    comment = '';
  } else if (to === 'cancelled' && !confirm('Cancel this program?')) return;
  try {
    await apiFetch('/reslife-programs', { method: 'PUT', body: JSON.stringify({ action: 'status', id: p.id, property: currentProperty, to, comment, approvedBudget }) });
    await loadPrograms(); openProgDetail(p.id, to === 'changes_requested' ? 'review' : 'overview');
  } catch (e) {
    const j = pgErr(e);
    alert(j.missing ? 'Before submitting, please complete:\n• ' + j.missing.join('\n• ') : (j.error || 'Update failed'));
  }
}

async function pgDuplicate(p) {
  const title = prompt('Title for the new draft:', p.isTemplate ? p.title : p.title + ' (copy)');
  if (title === null) return;
  try { const doc = await apiFetch('/reslife-programs', { method: 'POST', body: JSON.stringify({ action: 'duplicate', id: p.id, property: currentProperty, title }) }); closeProgPreview(); await loadPrograms(); openProgramForm(progDocs.find(x => x.id === doc.id) || doc); }
  catch (e) { alert(pgErr(e).error); }
}

function pgReplaceDoc(fresh) { const i = progDocs.findIndex(x => x.id === fresh.id); if (i >= 0) progDocs[i] = fresh; else progDocs.push(fresh); }

function pgUpload(programId, file) {
  return new Promise((resolve, reject) => {
    if (file.size > 1.5 * 1024 * 1024) return reject(new Error('File must be 1.5 MB or smaller'));
    const r = new FileReader();
    r.onload = () => apiFetch('/reslife-programs', { method: 'POST', body: JSON.stringify({ action: 'upload', property: currentProperty, programId, name: file.name, mime: file.type, data: r.result }) }).then(resolve, reject);
    r.onerror = () => reject(new Error('Could not read file'));
    r.readAsDataURL(file);
  });
}

// ---------- templates + settings ----------
function pgOpenTemplates() {
  const ov = pgDetailOverlay();
  const tpl = progDocs.filter(p => p.isTemplate);
  const recent = progDocs.filter(p => !p.isTemplate && pgIsMember(p)).slice(-10).reverse();
  const row = p => `<div class="pg-mini" style="display:flex;justify-content:space-between;gap:8px;align-items:center"><span><b>${esc(p.title)}</b><small>${esc(PG_PTYPE[p.programType])}${p.category ? ' · ' + esc(p.category) : ''}</small></span><button class="rl-btn sm primary" data-dup="${p.id}" type="button">Use</button></div>`;
  ov.innerHTML = `<div class="pp-modal" style="max-width:640px"><div class="pp-head"><div class="pp-head-ico">&#9733;</div><div><h3>Templates &amp; past programs</h3><p>Start a new draft from a template or one of your previous proposals.</p></div><button class="pp-close" type="button" data-pp-close aria-label="Close">&times;</button></div>
    <div style="padding:16px 20px"><h4 class="pg-h4">Program templates</h4>${tpl.length ? tpl.map(row).join('') : '<div class="rl-empty">No templates yet. RECs can save any program as a template.</div>'}
    <h4 class="pg-h4">Duplicate one of my programs</h4>${recent.length ? recent.map(row).join('') : '<div class="rl-empty">No previous programs.</div>'}</div></div>`;
  ov.classList.add('show');
  ov.querySelector('[data-pp-close]').onclick = closeProgPreview;
  ov.querySelectorAll('[data-dup]').forEach(b => b.onclick = () => pgDuplicate(progDocs.find(p => p.id === b.getAttribute('data-dup'))));
}

function pgOpenSettings() {
  const s = pgSettings; const ov = pgDetailOverlay();
  const ta = (id, label, arr) => `<div class="rl-field full"><label for="${id}">${label} (one per line)</label><textarea id="${id}" rows="5">${esc((arr || []).join('\n'))}</textarea></div>`;
  const RULE_LABELS = { amazon_food: 'Amazon used for food/beverages', costco_food_court: 'Costco Food Court selected', delivery_fees: 'Delivery without fees/tip', instacart_fees: 'Instacart without fees', pickup_details: 'Pickup missing date/RA', perishable: 'Perishable item', over_budget: 'Over approved budget', payment_policy: 'Payment policy note' };
  ov.innerHTML = `<div class="pp-modal pg-modal-wide"><div class="pp-head"><div class="pp-head-ico">&#9881;</div><div><h3>Programming settings</h3><p>${esc(currentProperty)} · Reslife Admin only</p></div><button class="pp-close" type="button" data-pp-close aria-label="Close">&times;</button></div>
    <div style="padding:16px 20px" class="rl-form-grid">
      ${ta('psCats', 'Programming categories', s.categories)}${ta('psTypes', 'Purchase types', s.purchaseTypes)}${ta('psFood', 'Purchase types that count as food/beverage', s.foodPurchaseTypes)}${ta('psTasks', 'Standard checklist tasks', s.defaultTasks)}
      <div class="rl-field full"><label>Purchasing-policy warnings</label>${Object.entries(s.rules).map(([k, r]) => `<div class="pg-rule"><label><input type="checkbox" data-rule-on="${k}" ${r.enabled ? 'checked' : ''}/> ${esc(RULE_LABELS[k] || k)}</label><input data-rule-msg="${k}" value="${esc(r.message)}" /></div>`).join('')}</div>
      <div class="rl-field"><label for="psThreshold">Approval threshold ($, optional)</label><input id="psThreshold" type="number" min="0" step="0.01" value="${s.approvalThreshold ?? ''}" placeholder="Not set — confirm with leadership"/></div>
      <div class="rl-field"><label for="psDefBudget">Default program budget ($, optional)</label><input id="psDefBudget" type="number" min="0" step="0.01" value="${s.defaultBudget ?? ''}" placeholder="Not set"/></div>
      <div class="rl-field full"><button class="rl-btn primary" id="psSave" type="button">Save settings</button></div>
    </div></div>`;
  ov.classList.add('show');
  ov.querySelector('[data-pp-close]').onclick = closeProgPreview;
  const lines = id => pg$(id).value.split('\n').map(x => x.trim()).filter(Boolean);
  pg$('psSave').onclick = async () => {
    const rules = {}; ov.querySelectorAll('[data-rule-on]').forEach(c => { const k = c.getAttribute('data-rule-on'); rules[k] = { enabled: c.checked, message: ov.querySelector(`[data-rule-msg="${k}"]`).value }; });
    try { pgSettings = await apiFetch('/reslife-programs', { method: 'PUT', body: JSON.stringify({ action: 'settings', property: currentProperty, settings: { categories: lines('psCats'), purchaseTypes: lines('psTypes'), foodPurchaseTypes: lines('psFood'), defaultTasks: lines('psTasks'), rules, approvalThreshold: pg$('psThreshold').value, defaultBudget: pg$('psDefBudget').value } }) }); closeProgPreview(); loadPrograms(); }
    catch (e) { alert(pgErr(e).error); }
  };
}

// ---------- proposal form ----------
function stationRowHTML(s) {
  s = Object.assign({ station: '', people: '', location: '', job: '' }, typeof s === 'string' ? { station: s } : (s || {}));
  return `<div class="pp-station">
    <div><label>Station</label><input class="st-station" value="${esc(s.station)}" placeholder="Photo Booth" /></div>
    <div><label>Who’s involved</label><input class="st-people" value="${esc(s.people)}" /></div>
    <div><label>Location</label><input class="st-location" value="${esc(s.location)}" /></div>
    <div><label>Their job</label><input class="st-job" value="${esc(s.job)}" /></div>
    <button type="button" class="rl-btn sm danger" data-st-remove title="Remove" aria-label="Remove station">&times;</button></div>`;
}
function collectStations() {
  return Array.from(document.querySelectorAll('#progStationRows .pp-station')).map(r => ({ station: r.querySelector('.st-station').value.trim(), people: r.querySelector('.st-people').value.trim(), location: r.querySelector('.st-location').value.trim(), job: r.querySelector('.st-job').value.trim() })).filter(s => s.station || s.people || s.job);
}

function pgItemRowHTML(it, kind) {
  it = it || {}; const k = kind || it.kind || 'purchase';
  const id = it.id || ('n' + Math.random().toString(36).slice(2, 9));
  const f = (cls, label, val, attrs = '') => `<div class="rl-field"><label>${label}</label><input class="${cls}" value="${esc(val == null ? '' : val)}" ${attrs} /></div>`;
  const sel = (cls, label, opts, val) => `<div class="rl-field"><label>${label}</label><select class="${cls}">${opts}</select></div>`;
  let fields = '';
  if (k === 'purchase') {
    const types = ['', ...((pgSettings && pgSettings.purchaseTypes) || [])];
    fields = f('si-item', 'Item *', it.item, 'placeholder="e.g., Poster board" maxlength="200"') +
      sel('si-ptype', 'Purchase type', types.map(t => `<option value="${esc(t)}"${t === (it.purchaseType || '') ? ' selected' : ''}>${t ? esc(t) : 'Select…'}</option>`).join('')) +
      f('si-vendor', 'Vendor / store', it.vendor, 'list="pgVendorList" placeholder="Amazon, Vons, Costco…" maxlength="120"') +
      f('si-link', 'Direct link', it.link, 'type="url" placeholder="https://…" inputmode="url"') +
      f('si-price', 'Unit cost ($)', it.price, 'type="number" min="0" step="0.01" inputmode="decimal"') +
      f('si-qty', 'Quantity', it.qty == null ? 1 : it.qty, 'type="number" min="0" inputmode="numeric"') +
      `<div class="rl-field"><label>Extended total</label><div class="si-ext pg-ext">$0.00</div></div>` +
      sel('si-ra', 'Assigned RA', pgStaffOptions(it.assignedRA), '') +
      sel('si-fulfill', 'Fulfillment', Object.entries(PG_FULFILL).map(([v, l]) => `<option value="${v}"${v === (it.fulfillment || '') ? ' selected' : ''}>${l}</option>`).join('')) +
      f('si-needed', 'Needed by', it.neededBy, 'type="date"') +
      sel('si-status', 'Status', Object.entries(PG_ITEM_STATUS).map(([v, l]) => `<option value="${v}"${v === (it.status || 'planned') ? ' selected' : ''}>${l}</option>`).join('')) +
      `<div class="rl-field"><label>Photo (optional)</label><div class="si-photo-wrap"><input type="hidden" class="si-photoid" value="${esc(it.photoId || '')}"/>${it.photoId ? `<img class="pg-thumb" alt="" src="/api/reslife-programs${propParam()}&file=${esc(it.photoId)}"/>` : ''}<input type="file" class="si-photo" accept="image/*" aria-label="Item photo" /></div><input class="si-photourl" value="${esc(it.photoUrl || '')}" placeholder="or image URL" type="url" /></div>` +
      `<div class="rl-field"><label><input type="checkbox" class="si-perish" ${it.perishable ? 'checked' : ''}/> Perishable</label></div>` +
      `<div class="rl-field full"><label>Notes / delivery or pickup details</label><input class="si-notes" value="${esc(it.notes || '')}" maxlength="500" /></div>`;
  } else if (k === 'supply') {
    fields = f('si-item', 'Supply *', it.item) + f('si-qty', 'Qty', it.qty || 1, 'type="number" min="0"') + f('si-source', 'Where to get it', it.source) + sel('si-owner', 'Who will grab it', pgStaffOptions(it.owner));
  } else if (k === 'flyer') {
    fields = f('si-item', 'Request *', it.item || 'Event flyer') + f('si-qty', 'Qty / copies', it.qty || '', 'type="number" min="0"') + f('si-due', 'Needed by', it.due, 'type="date"') + `<div class="rl-field full"><label>Details for marketing</label><input class="si-notes" value="${esc(it.notes || '')}" /></div>`;
  } else {
    fields = f('si-item', 'Task *', it.item) + sel('si-owner', 'Owner', pgStaffOptions(it.owner)) + f('si-due', 'Due', it.due, 'type="date"');
  }
  return `<div class="shopping-row pg-item" data-kind="${k}" data-id="${esc(id)}">
    <div class="pg-item-head"><span class="rl-pill ${PG_ITEM_KINDS[k].pill}">${PG_ITEM_KINDS[k].label}</span>
      <span class="pg-item-btns"><button class="rl-btn sm" type="button" data-row-up aria-label="Move up">&uarr;</button><button class="rl-btn sm" type="button" data-row-down aria-label="Move down">&darr;</button><button class="rl-btn sm" type="button" data-row-dup>Duplicate</button><button class="rl-btn sm danger" type="button" data-remove-row>Remove</button></span></div>
    <div class="rl-form-grid cols-3">${fields}</div><div class="pg-item-warn"></div></div>`;
}

function collectShoppingList() {
  const v = (row, cls) => { const el = row.querySelector('.' + cls); return el ? el.value.trim() : ''; };
  return Array.from(document.querySelectorAll('#progShoppingRows .shopping-row')).map((row, i) => {
    const kind = row.getAttribute('data-kind');
    const it = { id: row.getAttribute('data-id'), kind, item: v(row, 'si-item'), qty: v(row, 'si-qty') === '' ? (kind === 'flyer' ? 0 : 1) : (parseInt(v(row, 'si-qty'), 10) || 0), order: i };
    if (kind === 'purchase') Object.assign(it, { purchaseType: v(row, 'si-ptype'), vendor: v(row, 'si-vendor'), link: v(row, 'si-link'), price: parseFloat(v(row, 'si-price')) || 0, assignedRA: v(row, 'si-ra'), fulfillment: v(row, 'si-fulfill'), neededBy: v(row, 'si-needed'), status: v(row, 'si-status') || 'planned', perishable: !!(row.querySelector('.si-perish') || {}).checked, photoId: v(row, 'si-photoid'), photoUrl: v(row, 'si-photourl'), notes: v(row, 'si-notes') });
    if (kind === 'supply') Object.assign(it, { source: v(row, 'si-source'), owner: v(row, 'si-owner') });
    if (kind === 'flyer') Object.assign(it, { due: v(row, 'si-due'), notes: v(row, 'si-notes') });
    if (kind === 'task') Object.assign(it, { owner: v(row, 'si-owner'), due: v(row, 'si-due') });
    return it;
  });
}

let pgVendorCfg = []; // [{vendor, taxRate, deliveryFee, serviceFee, instacartFee, tip, actual}]
function pgReadVendors() {
  document.querySelectorAll('#pgVendorRows .pg-vendor').forEach(r => {
    const name = r.getAttribute('data-vendor');
    let c = pgVendorCfg.find(x => x.vendor.toLowerCase() === name.toLowerCase());
    if (!c) { c = { vendor: name }; pgVendorCfg.push(c); }
    ['taxRate', 'deliveryFee', 'serviceFee', 'instacartFee', 'tip', 'actual'].forEach(k => { const el = r.querySelector(`[data-v="${k}"]`); if (el) c[k] = el.value; });
  });
  return pgVendorCfg;
}
function pgVendorsInUse(items) {
  const names = []; const seen = new Set();
  items.filter(i => i.kind === 'purchase' && i.vendor).forEach(i => { const k = i.vendor.toLowerCase(); if (!seen.has(k)) { seen.add(k); names.push(i.vendor); } });
  return names;
}
function updateItemsTotal() {
  const items = collectShoppingList();
  pgReadVendors();
  // per-row extended totals
  document.querySelectorAll('#progShoppingRows .pg-item[data-kind="purchase"]').forEach(r => {
    const p = parseFloat((r.querySelector('.si-price') || {}).value) || 0, q = parseInt((r.querySelector('.si-qty') || {}).value, 10) || 0;
    r.querySelector('.si-ext').textContent = pgMoney((pgCents(p) * q) / 100);
  });
  // vendor rows: keep focus-safe by only rebuilding when vendor set changes
  const names = pgVendorsInUse(items);
  const host = pg$('pgVendorRows');
  const current = Array.from(host.querySelectorAll('.pg-vendor')).map(r => r.getAttribute('data-vendor').toLowerCase()).join('|');
  if (current !== names.map(n => n.toLowerCase()).join('|')) {
    host.innerHTML = names.length ? names.map(n => {
      const c = pgVendorCfg.find(x => x.vendor.toLowerCase() === n.toLowerCase()) || {};
      const inp = (k, l, step) => `<label>${l}<input data-v="${k}" type="number" min="0" step="${step || '0.01'}" inputmode="decimal" value="${esc(c[k] ?? '')}"/></label>`;
      return `<div class="pg-vendor" data-vendor="${esc(n)}"><b>${esc(n)}</b>${inp('taxRate', 'Tax %', '0.001')}${inp('deliveryFee', 'Delivery $')}${inp('serviceFee', 'Service $')}${inp('instacartFee', 'Instacart $')}${inp('tip', 'Tip $')}${isManager || (pgForm.status && ['approved', 'scheduled', 'completed'].includes(pgForm.status)) ? inp('actual', 'Actual spent $') : ''}</div>`;
    }).join('') : '<div class="pg-sub">Add a vendor to a purchase to enter its taxes and fees.</div>';
  }
  const vendors = pgVendorCfg.filter(c => names.some(n => n.toLowerCase() === c.vendor.toLowerCase()));
  const approved = pgForm.base ? pgForm.base.approvedBudget : null;
  const ws = pgWarnings(items, vendors, approved);
  // inline per-item warnings
  document.querySelectorAll('#progShoppingRows .pg-item').forEach(r => { const id = r.getAttribute('data-id'); const mine = ws.filter(w => w.itemId === id); r.querySelector('.pg-item-warn').innerHTML = mine.map(w => `<div class="pg-inline-warn">${esc(w.message)}</div>`).join(''); });
  pg$('pgWarnings').innerHTML = pgWarnHTML(ws.filter(w => !w.itemId || w.itemId.startsWith('v:') || w.rule === 'over_budget'));
  pg$('pgBudgetPanel').innerHTML = pgBudgetHTML(pgComputeBudget(items, vendors, approved));
}

function pgSetPType(t) {
  pg$('pgProgramType').value = t;
  document.querySelectorAll('[data-pg-ptype]').forEach(b => { const on = b.getAttribute('data-pg-ptype') === t; b.classList.toggle('selected', on); b.setAttribute('aria-pressed', on); });
  pg$('pgCollabWrap').classList.toggle('hidden', t === 'individual');
}
function pgSetFormat(t) {
  pg$('progType').value = t;
  pg$('progDateLabel').textContent = t === 'passive' ? 'Install / Display Date *' : 'Program Date *';
  pg$('progTimeLabel').textContent = t === 'passive' ? 'Time (optional)' : 'Start Time';
  pg$('pgSetupWrap').querySelector('label').textContent = t === 'passive' ? 'Install & removal plan' : 'Setup & Breakdown';
}
function renderLocationOptions(selected) {
  const sel = pg$('progLocation');
  const names = progLocations.map(l => l.name);
  if (selected && !names.includes(selected)) names.unshift(selected);
  sel.innerHTML = '<option value="">Select location…</option>' + names.map(n => `<option${n === selected ? ' selected' : ''}>${esc(n)}</option>`).join('');
  pg$('progAddLocBtn').classList.toggle('hidden', !isManager);
}

function pgFormPayload() {
  const date = pg$('progDate').value, start = pg$('progTime').value, end = pg$('pgEndTime').value;
  const items = collectShoppingList();
  const names = pgVendorsInUse(items);
  return {
    property: currentProperty, title: pg$('progTitle').value.trim(), programType: pg$('pgProgramType').value, type: pg$('progType').value,
    category: pg$('pgCategory').value, weekLabel: pg$('pgWeek').value, owner: pg$('pgOwner').value, rec: pg$('pgRec').value,
    estAttendance: pg$('pgAttendance').value, audience: pg$('pgAudience').value,
    collaborators: Array.from(document.querySelectorAll('#pgCollaborators input:checked')).map(c => c.value),
    eventDate: date ? new Date(date + 'T' + (start || '00:00')).toISOString() : null,
    endDate: date && end ? new Date(date + 'T' + end).toISOString() : null,
    month: date ? PG_MONTHS[Number(date.slice(5, 7)) - 1] : '',
    location: pg$('progLocation').value, description: pg$('progDescription').value, objectives: pg$('pgObjectives').value,
    engagementGoals: pg$('pgEngagement').value, categoryConnection: pg$('pgCatConn').value, outcomes: pg$('pgOutcomes').value,
    spaceReservation: pg$('pgSpace').value, equipment: pg$('pgEquipment').value, setup: pg$('pgSetup').value, marketing: pg$('pgMarketing').value,
    accessibility: pg$('pgAccess').value, otherNeeds: pg$('pgOther').value, stations: collectStations(),
    noItems: pg$('progNoItems').checked, items: pg$('progNoItems').checked ? [] : items.filter(i => i.item),
    vendors: pgReadVendors().filter(c => names.some(n => n.toLowerCase() === c.vendor.toLowerCase())),
  };
}
function pgMissing(p) {
  const m = [];
  if (!p.title) m.push('Program title'); if (!p.category) m.push('Programming category'); if (!p.eventDate) m.push('Date');
  if (!p.location) m.push('Location'); if (!p.description.trim()) m.push('Program description'); if (!p.objectives.trim()) m.push('Learning objectives');
  if (p.programType === 'collaborative' && !p.collaborators.length) m.push('Collaborating RA(s)');
  if (!p.noItems && !p.items.length) m.push('Action Item List (or check "No supplies needed")');
  if (p.items.some(i => i.kind === 'purchase' && i.link && !/^https?:\/\//i.test(i.link))) m.push('Product links must start with http:// or https://');
  if (p.endDate && p.eventDate && p.endDate <= p.eventDate) m.push('End time must be after start time');
  return m;
}

// Local (device) draft cache — protects against refresh, navigation and dropped connections.
const pgCacheKey = id => `reslife_prog_draft:${me && me.username}:${currentProperty}:${id || 'new'}`;
function pgCacheWrite() { try { localStorage.setItem(pgCacheKey(pgForm.id), JSON.stringify({ at: new Date().toISOString(), version: pgForm.version, data: pgFormPayload() })); } catch (e) { /* storage full or disabled */ } }
function pgCacheRead(id) { try { return JSON.parse(localStorage.getItem(pgCacheKey(id)) || 'null'); } catch (e) { return null; } }
function pgCacheClear(id) { try { localStorage.removeItem(pgCacheKey(id)); } catch (e) {} }
function pgIndicator(text, cls) { const el = pg$('pgSaveInd'); el.textContent = text; el.className = 'pg-save-ind ' + (cls || ''); }

function pgMarkDirty() {
  pgForm.dirty = true; pgCacheWrite();
  pgIndicator(navigator.onLine ? 'Unsaved changes' : 'Offline — saved on this device', navigator.onLine ? '' : 'warn');
  clearTimeout(pgForm.timer);
  pgForm.timer = setTimeout(() => pgAutoSave(), 4000);
}
async function pgAutoSave() {
  // Auto-save only drafts / revisions to the server; approved programs require an explicit save
  // so an RA's in-progress edit doesn't silently trigger re-review.
  if (!pgForm.dirty || pgForm.saving || !navigator.onLine) return;
  if (!['draft', 'changes_requested'].includes(pgForm.status)) { pgIndicator('Unsaved changes (kept on this device)', 'warn'); return; }
  if (!pg$('progTitle').value.trim()) { pgIndicator('Add a title to start auto-saving', 'warn'); return; }
  await pgSave('autosave');
}

async function pgSave(mode) {
  // mode: 'autosave' | 'draft' | 'submit' | 'save'
  const payload = pgFormPayload();
  if (!payload.title) { if (mode !== 'autosave') { alert('Program title is required.'); pg$('progTitle').focus(); } return false; }
  if (mode === 'submit') {
    const miss = pgMissing(payload);
    if (miss.length) { renderProgReview(); alert('Before submitting, please complete:\n• ' + miss.join('\n• ')); return false; }
  }
  pgForm.saving = true; pgIndicator('Saving…', 'saving');
  const prevStatus = pgForm.status;
  try {
    let doc;
    if (pgForm.id) {
      doc = await apiFetch('/reslife-programs', { method: 'PUT', body: JSON.stringify(Object.assign({ id: pgForm.id, version: pgForm.version }, payload)) });
    } else {
      doc = await apiFetch('/reslife-programs', { method: 'POST', body: JSON.stringify(payload) });
      pgCacheClear(''); // the 'new' slot moves to the real id
    }
    pgForm.id = doc.id; pgForm.version = doc.version; pgForm.status = doc.status; pgForm.base = doc;
    pg$('progId').value = doc.id;
    if (mode === 'submit' && ['draft', 'changes_requested'].includes(doc.status)) {
      await apiFetch('/reslife-programs', { method: 'PUT', body: JSON.stringify({ action: 'status', id: doc.id, property: currentProperty, to: 'submitted' }) });
      doc.status = 'submitted';
    }
    pgForm.dirty = false; pgForm.lastSaved = new Date();
    pgCacheClear(doc.id);
    pgReplaceDoc(doc);
    pgIndicator('Saved ' + pgForm.lastSaved.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }), 'ok');
    if (mode === 'save' && doc.status === 'submitted' && ['approved', 'scheduled'].includes(prevStatus)) alert('Your change affects the approved plan, so the program was sent back to your REC for re-review.');
    return true;
  } catch (e) {
    const j = pgErr(e);
    if (e.status === 409) { pgIndicator('Conflict — not saved', 'err'); alert(j.error + '\n\nYour edits are still kept on this device.'); }
    else if (e.status === 422 && j.missing) { pgIndicator('Saved as draft', 'warn'); alert('Before submitting, please complete:\n• ' + j.missing.join('\n• ')); }
    else if (!e.status) pgIndicator('Offline — saved on this device', 'warn');
    else { pgIndicator('Save failed', 'err'); if (mode !== 'autosave') alert('Save failed: ' + (j.error || e.message)); }
    return false;
  } finally { pgForm.saving = false; }
}

function openProgramForm(p) {
  p = p || null;
  pgForm = { id: p ? p.id : '', version: p ? p.version : undefined, status: p ? p.status : 'draft', dirty: false, saving: false, timer: null, base: p };
  let src = p ? Object.assign({}, p) : { programType: 'individual', type: 'active', owner: me.username, items: [], vendors: [], stations: [] };
  const cached = pgCacheRead(pgForm.id);
  if (cached && cached.data && (!p || (cached.at > (p.updatedAt || '') && cached.version === p.version))) {
    if (confirm(`You have unsaved changes for this proposal from ${fmtDate(cached.at)} on this device. Restore them?`)) { src = Object.assign({}, src, cached.data); pgForm.dirty = true; }
    else pgCacheClear(pgForm.id);
  }
  pg$('progId').value = pgForm.id;
  pg$('progModalTitle').textContent = p ? p.title : 'New Program Proposal';
  pg$('progModalSub').textContent = p ? `Owner ${pgNameOf(p.owner)} · ${PG_PTYPE[p.programType] || ''}` : 'Plan it, staff it, budget it and send it for approval.';
  pg$('progModalStatus').textContent = p ? (PG_STATUS[p.status] || p.status) : 'New';
  pg$('progTitle').value = src.title || '';
  pgSetPType(src.programType || 'individual');
  pgSetFormat(src.type || 'active');
  const cats = [...new Set([...(pgSettings.categories || []), src.category].filter(Boolean))];
  pg$('pgCategory').innerHTML = '<option value="">Select category…</option>' + cats.map(c => `<option${c === src.category ? ' selected' : ''}>${esc(c)}</option>`).join('');
  pg$('pgWeek').value = src.weekLabel || '';
  pg$('pgOwner').innerHTML = pgStaffOptions(src.owner || me.username, 'Select RA…');
  pg$('pgOwner').disabled = !isManager;
  pg$('pgRec').innerHTML = `<option value="">Any REC</option>` + pgStaff.filter(s => s.role !== 'reslife-ra').map(s => `<option value="${esc(s.username)}"${s.username === src.rec ? ' selected' : ''}>${esc(s.fullName || s.username)}</option>`).join('');
  pg$('pgAttendance').value = src.estAttendance ?? '';
  pg$('pgAudience').value = src.audience || '';
  pg$('pgCollaborators').innerHTML = pgStaff.filter(s => s.username !== (src.owner || me.username)).map(s => `<label><input type="checkbox" value="${esc(s.username)}" ${(src.collaborators || []).includes(s.username) ? 'checked' : ''}/> ${esc(s.fullName || s.username)}</label>`).join('') || '<span class="pg-sub">No other staff accounts on this property.</span>';
  const dt = splitEventDate(src.eventDate), et = splitEventDate(src.endDate);
  pg$('progDate').value = dt.date; pg$('progTime').value = dt.time === '00:00' ? '' : dt.time; pg$('pgEndTime').value = et.time;
  renderLocationOptions(src.location || '');
  pg$('progNewLocRow').classList.add('hidden');
  pg$('progDescription').value = src.description || ''; pg$('pgObjectives').value = src.objectives || ''; pg$('pgEngagement').value = src.engagementGoals || '';
  pg$('pgCatConn').value = src.categoryConnection || ''; pg$('pgOutcomes').value = src.outcomes || '';
  pg$('pgSpace').value = src.spaceReservation || ''; pg$('pgEquipment').value = src.equipment || ''; pg$('pgSetup').value = src.setup || '';
  pg$('pgMarketing').value = src.marketing || ''; pg$('pgAccess').value = src.accessibility || ''; pg$('pgOther').value = src.otherNeeds || '';
  pg$('progStationRows').innerHTML = ((src.stations && src.stations.length) ? src.stations : [{}]).map(stationRowHTML).join('');
  pgVendorCfg = JSON.parse(JSON.stringify(src.vendors || []));
  pg$('pgVendorRows').innerHTML = '';
  pg$('progShoppingRows').innerHTML = (src.items || []).map(it => pgItemRowHTML(it)).join('');
  pg$('progNoItems').checked = !!src.noItems;
  pg$('progItemsWrap').classList.toggle('hidden', !!src.noItems);
  const pol = pgSettings.rules && pgSettings.rules.payment_policy;
  pg$('pgPolicyNote').innerHTML = pol && pol.enabled ? esc(pol.message) : '';
  pg$('pgPolicyNote').classList.toggle('hidden', !(pol && pol.enabled));
  updateItemsTotal();
  const st = pgForm.status;
  pg$('progDraftBtn').classList.toggle('hidden', !['draft', 'changes_requested'].includes(st));
  pg$('progSaveBtn').textContent = ['approved', 'scheduled'].includes(st) ? (isManager ? 'Save changes' : 'Save (may require re-review)') : st === 'submitted' || st === 'under_review' ? 'Save changes' : 'Submit for Approval';
  pgIndicator(pgForm.dirty ? 'Restored — not yet saved' : (p ? 'Saved' : ''), pgForm.dirty ? 'warn' : 'ok');
  toggleForm('progForm', true);
  resetWizard('progForm');
}

function renderProgReview() {
  const p = pgFormPayload();
  const miss = pgMissing(p);
  pg$('pgMissing').innerHTML = miss.length ? `<div class="pg-warn"><b>Still needed before you can submit</b><ul>${miss.map(m => `<li>${esc(m)}</li>`).join('')}</ul><small>You can still save this as a draft.</small></div>` : '<div class="pg-ok">Everything required is complete.</div>';
  const b = pgComputeBudget(p.items, p.vendors, pgForm.base ? pgForm.base.approvedBudget : null);
  const routeTo = p.rec ? pgNameOf(p.rec) : 'all RECs / Reslife Admins for this property';
  pg$('progReview').innerHTML =
    reviewRow('Title', p.title) + reviewRow('Program type', PG_PTYPE[p.programType]) + reviewRow('Format', p.type === 'passive' ? 'Passive' : 'Active') +
    reviewRow('Category', p.category) + reviewRow('Primary RA', pgNameOf(p.owner)) + reviewRow('Collaborators', p.collaborators.map(pgNameOf).join(', ')) +
    reviewRow('Date & time', p.eventDate ? new Date(p.eventDate).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) + (p.endDate ? ' – ' + new Date(p.endDate).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '') : '') +
    reviewRow('Location', p.location) + reviewRow('Estimated attendance', p.estAttendance) + reviewRow('Audience', p.audience) +
    reviewRow('Description', p.description) + reviewRow('Learning objectives', p.objectives) +
    reviewRow('Action items', p.noItems ? 'None needed' : `${p.items.length} item(s)`) +
    reviewRow('Estimated total', pgMoney(b.total) + ` (items ${pgMoney(b.subtotal)} · tax ${pgMoney(b.tax)} · fees ${pgMoney(b.fees)} · tips ${pgMoney(b.tips)})`) +
    reviewRow('Will be sent to', routeTo);
}

function bindProgramForm() {
  pgTimeOptions(pg$('progTime'), 'Select start…');
  pgTimeOptions(pg$('pgEndTime'), 'Select end…');
  if (!pg$('pgVendorList')) document.body.insertAdjacentHTML('beforeend', '<datalist id="pgVendorList"><option>Amazon</option><option>Costco</option><option>Vons</option><option>Target</option><option>Instacart - Costco</option><option>Instacart - Vons</option><option>Instacart - Target</option></datalist>');
  document.querySelectorAll('[data-pg-ptype]').forEach(b => b.addEventListener('click', () => { pgSetPType(b.getAttribute('data-pg-ptype')); pgMarkDirty(); }));
  pg$('progType').addEventListener('change', e => pgSetFormat(e.target.value));
  pg$('pgOwner').addEventListener('change', () => { const o = pg$('pgOwner').value; pg$('pgCollaborators').querySelectorAll('input').forEach(c => { c.closest('label').classList.toggle('hidden', c.value === o); if (c.value === o) c.checked = false; }); });
  pg$('progAddLocBtn').addEventListener('click', () => { pg$('progNewLocRow').classList.remove('hidden'); pg$('progNewLoc').focus(); });
  pg$('progCancelLocBtn').addEventListener('click', () => { pg$('progNewLoc').value = ''; pg$('progNewLocRow').classList.add('hidden'); });
  pg$('progSaveLocBtn').addEventListener('click', async () => {
    const name = pg$('progNewLoc').value.trim(); if (!name) return;
    try { const loc = await apiFetch('/reslife-locations', { method: 'POST', body: JSON.stringify({ property: currentProperty, name }) }); await loadProgLocations(); renderLocationOptions(loc.name); pg$('progNewLoc').value = ''; pg$('progNewLocRow').classList.add('hidden'); pgMarkDirty(); }
    catch (e) { alert('Could not add location: ' + e.message); }
  });
  pg$('progAddStation').addEventListener('click', () => { pg$('progStationRows').insertAdjacentHTML('beforeend', stationRowHTML({})); });
  pg$('progStationRows').addEventListener('click', e => { if (e.target.hasAttribute('data-st-remove')) { e.target.closest('.pp-station').remove(); pgMarkDirty(); } });
  pg$('progUseTemplate').addEventListener('click', e => { e.preventDefault(); const ta = pg$('progDescription'); if (ta.value.trim() && !confirm('Replace your current description with the template?')) return; ta.value = PG_DESC_TEMPLATE; ta.focus(); pgMarkDirty(); });

  // Action items: add / remove / duplicate / reorder / photo
  const rows = pg$('progShoppingRows');
  rows.addEventListener('click', e => {
    const row = e.target.closest('.shopping-row'); if (!row) return;
    if (e.target.hasAttribute('data-remove-row')) { if (!confirm('Remove this item?')) return; row.remove(); }
    else if (e.target.hasAttribute('data-row-dup')) {
      const it = collectShoppingList().find(x => x.id === row.getAttribute('data-id'));
      row.insertAdjacentHTML('afterend', pgItemRowHTML(Object.assign({}, it, { id: '', photoId: '', status: 'planned' })));
    } else if (e.target.hasAttribute('data-row-up') && row.previousElementSibling) row.parentNode.insertBefore(row, row.previousElementSibling);
    else if (e.target.hasAttribute('data-row-down') && row.nextElementSibling) row.parentNode.insertBefore(row.nextElementSibling, row);
    else return;
    updateItemsTotal(); pgMarkDirty();
  });
  rows.addEventListener('change', async e => {
    if (!e.target.classList.contains('si-photo')) return;
    const f = e.target.files[0]; if (!f) return;
    if (!pgForm.id) { const ok = await pgSave('draft'); if (!ok) { e.target.value = ''; return; } }
    try { const r = await pgUpload(pgForm.id, f); const wrap = e.target.closest('.si-photo-wrap'); wrap.querySelector('.si-photoid').value = r.id; const img = wrap.querySelector('img'); if (img) img.remove(); wrap.insertAdjacentHTML('afterbegin', `<img class="pg-thumb" alt="" src="/api/reslife-programs${propParam()}&file=${esc(r.id)}"/>`); pgMarkDirty(); }
    catch (x) { alert(pgErr(x).error); e.target.value = ''; }
  });
  pg$('pgVendorRows').addEventListener('input', () => { updateItemsTotal(); });
  document.querySelectorAll('[data-add-kind]').forEach(btn => btn.addEventListener('click', () => {
    rows.insertAdjacentHTML('beforeend', pgItemRowHTML(null, btn.getAttribute('data-add-kind')));
    const all = rows.querySelectorAll('.shopping-row'); const input = all[all.length - 1].querySelector('input'); if (input) input.focus();
    updateItemsTotal(); pgMarkDirty();
  }));
  pg$('progNoItems').addEventListener('change', e => { pg$('progItemsWrap').classList.toggle('hidden', e.target.checked); updateItemsTotal(); });

  // Any edit inside the form = dirty + local cache + debounced autosave
  const form = pg$('progForm');
  form.addEventListener('input', e => { if (e.target.closest('#progShoppingRows')) updateItemsTotal(); if (!e.target.matches('input[type=file]')) pgMarkDirty(); });
  form.addEventListener('change', e => { if (e.target.closest('#progShoppingRows')) updateItemsTotal(); if (!e.target.matches('input[type=file]')) pgMarkDirty(); });
  window.addEventListener('online', () => { if (pg$('progModal').classList.contains('show')) pgAutoSave(); });
  window.addEventListener('beforeunload', e => { if (pgForm.dirty && pg$('progModal').classList.contains('show')) { pgCacheWrite(); e.preventDefault(); e.returnValue = ''; } });

  // Filters / views
  ['progSearch', 'progFilterStatus', 'progFilterPType', 'progFilterCategory', 'progFilterRA', 'progFilterRec', 'progFrom', 'progTo', 'progSort', 'progMineOnly'].forEach(id =>
    pg$(id).addEventListener(id === 'progSearch' ? 'input' : 'change', renderPrograms));
  document.querySelectorAll('[data-prog-view]').forEach(b => b.addEventListener('click', () => {
    progView = b.getAttribute('data-prog-view');
    document.querySelectorAll('[data-prog-view]').forEach(x => x.classList.toggle('active', x === b));
    renderPrograms();
  }));

  // Modal open / close (closing never discards: unsaved work stays in the device cache)
  const close = () => {
    if (pgForm.dirty) { pgCacheWrite(); if (!confirm('You have unsaved changes. They are kept on this device and will be offered next time you open this proposal. Close anyway?')) return; }
    clearTimeout(pgForm.timer); toggleForm('progForm', false); loadPrograms();
  };
  pg$('progAddBtn').addEventListener('click', async () => { if (!pgSettings) await pgLoadMeta(); openProgramForm(null); });
  pg$('pgTemplatesBtn').addEventListener('click', pgOpenTemplates);
  pg$('pgSettingsBtn').addEventListener('click', pgOpenSettings);
  pg$('progCancelBtn').addEventListener('click', close);
  pg$('progModalClose').addEventListener('click', close);
  pg$('progModal').addEventListener('mousedown', e => { if (e.target.id === 'progModal') close(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { if (pg$('progModal').classList.contains('show')) close(); else closeProgPreview(); } });
  pg$('progDraftBtn').addEventListener('click', async () => { if (await pgSave('draft')) { /* stay open, indicator shows saved */ } });
  pg$('progSaveBtn').addEventListener('click', async () => {
    const st = pgForm.status;
    const mode = ['draft', 'changes_requested'].includes(st) ? 'submit' : 'save';
    if (await pgSave(mode)) { toggleForm('progForm', false); await loadPrograms(); if (pgForm.id) openProgDetail(pgForm.id); }
  });
  initWizard('progForm', ['Program', 'Purpose', 'Logistics', 'Action Items & Budget', 'Review'], { saveBtnId: 'progSaveBtn', onReview: renderProgReview });
}
