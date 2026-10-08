/**
 * Ivory University House - Pulse Survey (admin entry)
 * Tabs: Dashboard · Survey Builder · Survey Manager · Responses · Pulse Reports
 * Routing uses the URL hash: #dashboard, #builder/<surveyId>, #manager, #responses/<id>, #reports/<id>
 */
import { state, el, api, toast, modal, confirmDialog, promptDialog, menu, fmtDate, statusBadge, lifecycle, publicUrl, destroyCharts, makeChart, routes, navigate, download } from './core.js';
import { renderBuilder } from './builder.js';
import { renderResponses, renderReports } from './insights.js';

const view = document.getElementById('view');

/* --------------------------------------------------------------- boot */
async function boot() {
  try {
    const me = await fetch('/api/me', { credentials: 'include' });
    if (!me.ok) { location.href = '../index.html'; return; }
    const b = await api('bootstrap');
    Object.assign(state, { user: b.user, brand: b.brand, publicBaseUrl: b.publicBaseUrl, categories: b.categories });
  } catch (e) {
    document.getElementById('bootMsg').textContent = e.status === 403 ? 'You do not have access to Ivory University House tools.' : 'Could not load the Pulse Survey tool: ' + e.message;
    return;
  }
  document.getElementById('bootLoader').style.display = 'none';
  document.getElementById('appHeader').style.display = '';
  document.getElementById('appContainer').style.display = '';
  document.getElementById('logoutBtn').onclick = async () => { await fetch('/api/auth-logout', { method: 'POST', credentials: 'include' }).catch(() => {}); location.href = '../index.html'; };
  document.getElementById('brandBtn').onclick = brandingDialog;
  document.querySelectorAll('#tabs button').forEach((b) => b.addEventListener('click', () => navigate(b.dataset.tab)));
  window.addEventListener('hashchange', route);
  window.addEventListener('beforeunload', (e) => { if (state.leaveGuard && state.leaveGuard()) { e.preventDefault(); e.returnValue = ''; } });
  route();
}

let lastHash = '';
async function route() {
  const [tab = 'dashboard', param] = (location.hash.slice(1) || 'dashboard').split('/');
  if (state.leaveGuard && state.leaveGuard() && lastHash && lastHash !== location.hash) {
    const ok = await confirmDialog('Unsaved changes', 'Your latest builder changes have not finished saving. Leave anyway?', 'Leave', true);
    if (!ok) { history.replaceState(null, '', lastHash); return; }
  }
  state.leaveGuard = null; lastHash = location.hash || '#dashboard';
  destroyCharts();
  document.querySelectorAll('#tabs button').forEach((b) => { const on = b.dataset.tab === tab; b.classList.toggle('active', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); });
  view.replaceChildren(el('div', { class: 'empty', text: 'Loading…' }));
  try { await (routes[tab] || routes.dashboard)(view, param); }
  catch (e) { console.error(e); view.replaceChildren(el('div', { class: 'card' }, el('div', { class: 'content' }, el('div', { class: 'alert err', text: e.message }), el('button', { onclick: route, text: 'Retry' })))); }
}

/* ---------------------------------------------------------- dashboard */
routes.dashboard = async (root) => {
  const d = await api('dashboard');
  const t = d.totals;
  const kpi = (k, v, s) => el('div', { class: 'kpi' }, el('div', { class: 'k', text: k }), el('div', { class: 'v', text: v }), s ? el('div', { class: 's', text: s }) : null);
  const canvas = el('canvas', { 'aria-label': 'Responses per day, last 60 days', role: 'img' });
  const recent = d.surveys.filter((s) => s.status !== 'archived').slice(0, 6);
  root.replaceChildren(
    el('div', { class: 'button-group no-print', style: 'margin-bottom:16px' },
      el('button', { class: 'primary', onclick: () => createDialog(), text: '+ Create Survey' }),
      el('button', { onclick: () => navigate('manager', 'live'), text: 'View Live Surveys' }),
      el('button', { class: 'warn', onclick: () => navigate('reports'), text: 'Generate Report' })),
    el('div', { class: 'kpis' },
      kpi('Total Surveys', t.surveys, 'excluding archived'),
      kpi('Active Surveys', t.active, 'accepting responses now'),
      kpi('Total Responses', t.responses, 'submissions (anonymous; not unique residents)'),
      kpi('Average Satisfaction', t.avgSatisfaction != null ? `${t.avgSatisfaction.toFixed(2)} / 5` : '—', t.avgSatisfactionN ? `${t.avgSatisfactionN} valid ratings` : 'no ratings yet')),
    el('div', { class: 'grid-2' },
      el('div', { class: 'card' }, el('h2', {}, 'Recent Surveys', el('span', { class: 'spacer' }), el('button', { class: 'sm', onclick: () => navigate('manager'), text: 'All surveys' })),
        recent.length ? el('div', { class: 'tbl-wrap' }, el('table', { class: 'tbl' }, el('thead', {}, el('tr', {}, ['Survey', 'Status', 'Responses', ''].map((h) => el('th', { text: h })))),
          el('tbody', {}, recent.map((s) => el('tr', {},
            el('td', {}, el('div', { style: 'font-weight:600', text: s.settings.title }), el('div', { class: 'small muted', text: `${s.settings.academicYear || ''} ${s.settings.term ? '· ' + s.settings.term : ''}` }), lifecycle(s)),
            el('td', {}, statusBadge(s), s.hasUnpublishedChanges ? el('div', { class: 'small muted', text: 'unpublished edits' }) : null),
            el('td', { text: s.responseCount }),
            el('td', {}, quickActions(s))))))) : el('div', { class: 'empty' }, 'No surveys yet. ', el('button', { class: 'primary sm', onclick: () => createDialog(), text: '+ Create Survey' })),
      ),
      el('div', {},
        el('div', { class: 'card' }, el('h2', { text: 'Response Activity (60 days)' }), el('div', { class: 'content' }, el('div', { class: 'chart-wrap', style: 'height:200px' }, canvas))),
        el('div', { class: 'card' }, el('h2', { text: 'Recent Reports' }), d.reports.length ? el('div', { class: 'content' }, d.reports.map((r) => el('div', { style: 'padding:6px 0;border-bottom:1px solid var(--border)' },
          el('button', { class: 'link', onclick: () => navigate('reports', 'saved:' + r._id), text: r.name }), el('span', { class: 'small muted', text: ' · ' + fmtDate(r.createdAt) })))) : el('div', { class: 'empty', text: 'No saved reports yet.' })))),
  );
  const days = []; for (let i = 59; i >= 0; i--) { const x = new Date(Date.now() - i * 864e5); days.push(new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Denver' }).format(x)); }
  makeChart(canvas, { type: 'bar', data: { labels: days.map((k) => k.slice(5)), datasets: [{ label: 'Responses', data: days.map((k) => d.byDate[k] || 0), backgroundColor: '#446472', borderRadius: 3 }] },
    options: { maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } }, x: { ticks: { maxTicksLimit: 10 } } } } });
};

function quickActions(s) {
  return menu('Actions ▾', surveyActions(s));
}

/* ------------------------------------------------------------ manager */
routes.manager = async (root, param) => {
  const { surveys } = await api('list');
  const search = el('input', { type: 'search', placeholder: 'Search surveys…', 'aria-label': 'Search surveys', style: 'max-width:280px' });
  const statusSel = el('select', { 'aria-label': 'Filter by status', style: 'max-width:180px' }, ['active (not archived)', 'live', 'all', 'draft', 'published', 'paused', 'closed', 'archived'].map((v) => el('option', { value: v, text: v[0].toUpperCase() + v.slice(1) })));
  if (param === 'live') statusSel.value = 'live';
  const yearSel = el('select', { 'aria-label': 'Filter by academic year', style: 'max-width:160px' }, el('option', { value: '', text: 'All years' }), [...new Set(surveys.map((s) => s.settings.academicYear).filter(Boolean))].map((y) => el('option', { value: y, text: y })));
  const tbody = el('tbody');
  const draw = () => {
    const q = search.value.toLowerCase(); const st = statusSel.value; const yr = yearSel.value;
    const rows = surveys.filter((s) => (!q || s.settings.title.toLowerCase().includes(q) || (s.settings.category || '').toLowerCase().includes(q))
      && (st === 'all' || (st === 'live' ? s.state === 'open' : st.startsWith('active') ? s.status !== 'archived' : s.status === st)) && (!yr || s.settings.academicYear === yr));
    tbody.replaceChildren(...(rows.length ? rows.map((s) => el('tr', {},
      el('td', {}, el('button', { class: 'link', style: 'font-weight:700;padding:0;text-align:left;white-space:normal', onclick: () => navigate('builder', s.id), text: s.settings.title }), lifecycle(s)),
      el('td', { text: s.settings.academicYear || '—' }), el('td', { text: s.settings.category || '—' }),
      el('td', {}, statusBadge(s), s.currentVersion ? el('div', { class: 'small muted', text: `v${s.currentVersion}${s.hasUnpublishedChanges ? ' · unpublished edits' : ''}` }) : null),
      el('td', { text: fmtDate(s.createdAt) }), el('td', { text: fmtDate(s.updatedAt) }), el('td', { text: s.responseCount }),
      el('td', { class: 'small', text: `${s.settings.openAt ? fmtDate(s.settings.openAt) : 'Any time'} → ${s.settings.closeAt ? fmtDate(s.settings.closeAt) : 'No end'}` }),
      el('td', {}, menu('Actions ▾', surveyActions(s, () => routes.manager(root, param)))))) : [el('tr', {}, el('td', { colspan: '9', class: 'empty', text: 'No surveys match.' }))]));
  };
  [search, statusSel, yearSel].forEach((x) => x.addEventListener('input', draw));
  root.replaceChildren(el('div', { class: 'card' },
    el('h2', {}, 'Survey Manager', el('span', { class: 'spacer' }), el('button', { class: 'sm', onclick: templatesDialog, text: 'Templates' }), el('button', { class: 'primary sm', onclick: () => createDialog(), text: '+ Create New Survey' })),
    el('div', { class: 'content', style: 'display:flex;gap:10px;flex-wrap:wrap;padding-bottom:0' }, search, statusSel, yearSel),
    el('div', { class: 'content tbl-wrap' }, el('table', { class: 'tbl' },
      el('thead', {}, el('tr', {}, ['Survey Name', 'Academic Year', 'Category', 'Status', 'Created', 'Last Updated', 'Responses', 'Open / Close', 'Actions'].map((h) => el('th', { text: h })))), tbody))));
  draw();
};

/** Shared action list: Edit | Preview | Publish | Share | Responses | Report | Duplicate | Close | Archive */
export function surveyActions(s, refresh = () => routes[(location.hash.slice(1).split('/')[0]) || 'dashboard'](view)) {
  const set = (status, msg, danger) => async () => {
    if (!(await confirmDialog('Confirm', msg, 'Yes, continue', danger))) return;
    try { await api('setStatus', { surveyId: s.id, status }); toast('Survey updated'); refresh(); } catch (e) { toast(e.message, true); }
  };
  return [
    { label: 'Edit', onClick: () => navigate('builder', s.id) },
    { label: 'Preview', onClick: () => window.open(`public.html?preview=${encodeURIComponent(s.id)}`, '_blank') },
    s.status !== 'archived' && { label: s.currentVersion ? 'Publish changes' : 'Publish', onClick: () => publishFlow(s.id, refresh) },
    s.currentVersion && { label: 'Share link & QR', onClick: () => shareDialog(s) },
    { label: 'Responses', onClick: () => navigate('responses', s.id) },
    { label: 'Report', onClick: () => navigate('reports', s.id) },
    '-',
    { label: 'Duplicate', onClick: async () => { const t = await promptDialog('Duplicate survey', 'New survey name', `${s.settings.title} (Copy)`); if (t == null) return; const r = await api('duplicate', { surveyId: s.id, title: t }); toast('Duplicated as a new draft (new link, no responses copied)'); navigate('builder', r.survey.id); } },
    { label: 'Save as template', onClick: async () => { const n = await promptDialog('Save as template', 'Template name', s.settings.title); if (!n) return; await api('saveTemplate', { surveyId: s.id, name: n }); toast('Template saved'); } },
    s.status === 'published' && { label: 'Pause responses', onClick: set('paused', 'Pause this survey? The link will show a “temporarily paused” message.') },
    s.status === 'paused' && { label: 'Resume responses', onClick: set('published', 'Resume accepting responses?') },
    ['published', 'paused'].includes(s.status) && { label: 'Close survey', onClick: set('closed', 'Close this survey? Residents will see that it is closed. You can reopen it later.') },
    s.status === 'closed' && { label: 'Reopen survey', onClick: set('published', 'Reopen this survey for responses? A past close date will be cleared.') },
    s.status !== 'archived' && { label: 'Archive', danger: true, onClick: set('archived', 'Archive this survey? It will stop accepting responses and be hidden from active lists. Responses are kept.', true) },
    s.status === 'archived' && { label: 'Restore from archive', onClick: set('draft', 'Restore this survey? Previously published surveys come back as Closed.') },
  ];
}

/* ------------------------------------------------------------- create */
export async function createDialog() {
  const [{ templates }, { surveys }] = await Promise.all([api('listTemplates'), api('list')]);
  let mode = 'blank';
  const srcSel = el('select', {});
  const title = el('input', { type: 'text', placeholder: 'e.g. Winter 2027 Resident Pulse Survey #2' });
  const cat = el('select', {}, state.categories.map((c) => el('option', { value: c, text: c })));
  const year = el('input', { type: 'text', placeholder: '2026–2027' });
  const fillSrc = () => {
    const opts = mode === 'template' ? templates.map((t) => el('option', { value: t.id, text: `${t.name} (${t.questionCount} questions)` })) : surveys.map((s) => el('option', { value: s.id, text: `${s.settings.title} · ${s.status}` }));
    srcSel.replaceChildren(...opts); srcSel.parentElement.style.display = mode === 'blank' ? 'none' : '';
  };
  const radio = (v, label, desc) => el('label', { style: 'display:flex;gap:10px;align-items:flex-start;padding:10px;border:1px solid var(--border);border-radius:8px;margin-bottom:8px;font-weight:400;cursor:pointer' },
    el('input', { type: 'radio', name: 'cmode', value: v, checked: v === mode, onchange: () => { mode = v; fillSrc(); } }), el('span', {}, el('b', { text: label }), el('div', { class: 'small muted', text: desc })));
  const body = el('div', {},
    radio('blank', 'Start from a blank survey', 'An empty survey with one section.'),
    radio('template', 'Start from a saved template', 'Reuse a standard question set (keeps comparison keys for trend reports).'),
    radio('survey', 'Start from an existing survey', 'Copies structure and logic only — never responses or the public link.'),
    el('div', { class: 'form-group', style: 'display:none' }, el('label', { text: 'Source' }), srcSel),
    el('div', { class: 'form-group' }, el('label', { text: 'Survey title' }), title),
    el('div', { class: 'form-row' }, el('div', { class: 'form-group' }, el('label', { text: 'Category' }), cat), el('div', { class: 'form-group' }, el('label', { text: 'Academic year' }), year)));
  modal({ title: 'Create New Survey', body, actions: [{ label: 'Cancel' }, { label: 'Create & open builder', class: 'primary', onClick: async () => {
    const settings = {}; if (title.value.trim()) settings.title = title.value.trim(); if (year.value.trim()) settings.academicYear = year.value.trim(); settings.category = cat.value;
    if (mode !== 'blank' && !srcSel.value) { toast('Choose a source', true); return false; }
    const r = await api('create', { mode, sourceId: srcSel.value, settings });
    toast('Survey created as a draft'); navigate('builder', r.survey.id);
  } }] });
  fillSrc();
}

async function templatesDialog() {
  const { templates } = await api('listTemplates');
  const body = el('div', {}, templates.length ? el('table', { class: 'tbl' }, el('tbody', {}, templates.map((t) => el('tr', {},
    el('td', {}, el('b', { text: t.name }), el('div', { class: 'small muted', text: `${t.category || ''} · ${t.questionCount} questions · ${fmtDate(t.createdAt)}` })),
    el('td', { style: 'text-align:right' },
      el('button', { class: 'sm primary', onclick: async () => { const r = await api('create', { mode: 'template', sourceId: t.id, settings: {} }); document.querySelector('.modal-back').remove(); navigate('builder', r.survey.id); }, text: 'Use' }), ' ',
      el('button', { class: 'sm', onclick: async (e) => { if (!(await confirmDialog('Delete template', `Delete “${t.name}”? Surveys created from it are not affected.`, 'Delete', true))) return; await api('deleteTemplate', { id: t.id }); e.target.closest('tr').remove(); toast('Template deleted'); }, text: 'Delete' })))))) : el('div', { class: 'empty', text: 'No templates. Use “Save as template” on any survey.' }));
  modal({ title: 'Survey Templates', body, wide: true, actions: [{ label: 'Close' }] });
}

/* ------------------------------------------------------------ publish */
export async function publishFlow(surveyId, after) {
  const chk = await api('publishCheck', { surveyId });
  const v = chk.validation; const d = chk.diff;
  const body = el('div', {});
  if (v.errors.length) {
    body.append(el('div', { class: 'alert err' }, el('b', { text: 'Fix these before publishing:' }), el('ul', {}, v.errors.map((e) => el('li', { text: e.message })))));
    modal({ title: 'Cannot publish yet', body, actions: [{ label: 'Close' }, { label: 'Open builder', class: 'primary', onClick: () => navigate('builder', surveyId) }] });
    return;
  }
  if (v.warnings.length) body.append(el('div', { class: 'alert warn' }, el('b', { text: 'Warnings' }), el('ul', {}, v.warnings.map((e) => el('li', { text: e.message })))));
  if (chk.currentVersion) {
    body.append(el('p', { text: `This publishes version ${chk.currentVersion + 1}. The public link and QR code stay the same. New respondents get the new version; the ${chk.responseCount} existing response(s) stay linked to their original version.` }));
    const li = (arr, f) => el('ul', { style: 'margin:4px 0 10px 18px' }, arr.map((x) => el('li', { text: f(x) })));
    if (d.added.length) body.append(el('b', { text: 'Added' }), li(d.added, (x) => x.text));
    if (d.removed.length) body.append(el('b', { text: 'Removed (history preserved)' }), li(d.removed, (x) => x.text));
    if (d.reworded.length) body.append(el('b', { text: 'Reworded' }), li(d.reworded, (x) => `“${x.before}” → “${x.after}”`));
    if (d.significant.length) body.append(el('div', { class: 'alert warn' }, el('b', { text: 'Significant changes — direct comparison with earlier responses may no longer be valid:' }), li(d.significant, (x) => `${x.text}: ${x.reasons.join(', ')}`),
      el('div', { text: 'For major restructuring, consider “Duplicate” to start a new survey instead.' })));
    if (!d.added.length && !d.removed.length && !d.reworded.length && !d.significant.length) body.append(el('p', { class: 'muted', text: 'No question changes since the last version (settings changes only).' }));
  } else body.append(el('p', { text: 'Publishing creates a permanent public link residents can open without logging in.' }));
  const note = el('input', { type: 'text', placeholder: 'Optional version note (e.g. “fixed typo in Q8”)' });
  body.append(el('div', { class: 'form-group', style: 'margin-top:10px' }, el('label', { text: 'Version note' }), note));
  modal({ title: chk.currentVersion ? 'Publish revised version' : 'Publish survey', body, actions: [{ label: 'Cancel' }, { label: d.significant.length ? 'I understand — publish' : 'Publish', class: 'primary', onClick: async () => {
    const r = await api('publish', { surveyId, note: note.value, acknowledgeSignificant: d.significant.length > 0 });
    if (r.publicBaseUrl !== undefined) state.publicBaseUrl = r.publicBaseUrl;
    toast(`Published version ${r.version}`);
    const { survey } = await api('get', { surveyId });
    shareDialog(survey); after && after();
  } }] });
}

/* -------------------------------------------------------------- share */
export function shareDialog(s) {
  const url = publicUrl(s.publicId);
  const input = el('input', { type: 'text', value: url, readonly: true, 'aria-label': 'Permanent survey URL' });
  const qrCanvas = el('canvas', { width: '600', height: '600', 'aria-label': 'QR code for the survey link', role: 'img' });
  drawQr(qrCanvas, url);
  const st = s.settings;
  const body = el('div', {},
    !state.publicBaseUrl ? el('div', { class: 'alert warn', text: `No production URL is configured on the server (APP_BASE_URL / PULSE_PUBLIC_BASE_URL), so the default ${url.split('/survey/')[0]} is used. Verify it matches your live domain.` }) : null,
    el('label', { text: 'Permanent survey URL' }),
    el('div', { class: 'share-url' }, input,
      el('button', { class: 'primary', onclick: async () => { try { await navigator.clipboard.writeText(url); } catch { input.select(); document.execCommand('copy'); } toast('Link copied'); }, text: 'Copy Link' }),
      el('button', { onclick: () => window.open(url, '_blank', 'noopener'), text: 'Open Survey' })),
    el('div', { class: 'qr-box' }, qrCanvas,
      el('div', {},
        el('div', {}, el('b', { text: 'Status: ' }), statusBadge(s)),
        el('div', { class: 'small', style: 'margin-top:6px' }, `Version ${s.currentVersion} · published ${fmtDate(s.publishedAt, true)}`),
        el('div', { class: 'small', text: `Opens: ${st.openAt ? fmtDate(st.openAt, true) : 'immediately'}` }),
        el('div', { class: 'small', text: `Closes: ${st.closeAt ? fmtDate(st.closeAt, true) : 'no closing date'}` }),
        el('button', { class: 'good', style: 'margin-top:12px', onclick: () => qrCanvas.toBlob((b) => download(`${(st.title || 'survey').replace(/[^A-Za-z0-9]+/g, '_')}_QR.png`, b)), text: 'Download QR Code' }),
        el('p', { class: 'small muted', style: 'margin-top:8px;max-width:300px', text: 'Editing and republishing never changes this link or QR code.' }))));
  modal({ title: `Share · ${st.title}`, body, wide: true, actions: [{ label: 'Done', class: 'primary' }] });
}

function drawQr(canvas, text) {
  const ctx = canvas.getContext('2d');
  if (!window.qrcode) { ctx.fillStyle = '#64748b'; ctx.font = '24px sans-serif'; ctx.fillText('QR library failed to load', 40, 300); return; }
  const qr = window.qrcode(0, 'M'); qr.addData(text); qr.make();
  const n = qr.getModuleCount(); const quiet = 4; const size = canvas.width; const cell = Math.floor(size / (n + quiet * 2)); const off = Math.floor((size - cell * n) / 2);
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, size, size); ctx.fillStyle = '#000';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) ctx.fillRect(off + c * cell, off + r * cell, cell, cell);
}

/* ----------------------------------------------------------- branding */
function brandingDialog() {
  const b = { ...state.brand };
  const prev = el('div', { style: 'border:1px dashed var(--border);border-radius:10px;padding:16px;text-align:center;min-height:90px;background:#f8fafc' });
  const showPrev = () => prev.replaceChildren(b.logoDataUrl ? el('img', { src: b.logoDataUrl, alt: 'Logo preview', style: 'max-height:90px;max-width:100%;object-fit:contain' }) : el('div', { class: 'muted', text: 'No logo uploaded — the public survey shows the “Ivory University House” wordmark.' }));
  showPrev();
  const file = el('input', { type: 'file', accept: 'image/png,image/svg+xml,image/webp,image/jpeg' });
  file.addEventListener('change', () => { const f = file.files[0]; if (!f) return; if (f.size > 500 * 1024) { toast('Logo must be under 500 KB', true); return; } const r = new FileReader(); r.onload = () => { b.logoDataUrl = r.result; showPrev(); }; r.readAsDataURL(f); });
  const color = (k, label) => el('div', { class: 'form-group' }, el('label', { text: label }), el('input', { type: 'color', value: b[k], style: 'height:40px;padding:2px', oninput: (e) => { b[k] = e.target.value; } }));
  modal({ title: 'Ivory University House branding (public surveys & reports)', wide: true, body: el('div', {},
    el('p', { class: 'small muted', style: 'margin-bottom:12px', text: 'Applies only to IUH public survey pages, the branded loader and Pulse Reports — the Marketing Hub theme is unchanged. Upload the official IUH logo file (transparent PNG or SVG recommended); it is displayed as-is, never altered.' }),
    el('div', { class: 'form-group' }, el('label', { text: 'Official IUH logo' }), prev, el('div', { style: 'display:flex;gap:8px;margin-top:8px' }, file, el('button', { class: 'sm', onclick: () => { b.logoDataUrl = ''; showPrev(); }, text: 'Remove' }))),
    el('div', { class: 'form-row' }, color('primaryColor', 'Primary color'), color('accentColor', 'Accent color')),
    el('div', { class: 'form-row' }, color('accent2Color', 'Secondary accent'), color('backgroundColor', 'Page background'))),
  actions: [{ label: 'Cancel' }, { label: 'Save branding', class: 'primary', onClick: async () => { const r = await api('saveBrand', { brand: b }); state.brand = r.brand; toast('Branding saved'); } }] });
}

/* -------------------------------------------------------- other tabs */
routes.builder = (root, id) => renderBuilder(root, id);
routes.responses = (root, id) => renderResponses(root, id);
routes.reports = (root, id) => renderReports(root, id);

boot();
