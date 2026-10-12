/*
 * ResLife Hub — Conduct Meeting Notes (REC + ADMIN only).
 *
 * Visibility rules here are cosmetic; netlify/functions/reslife-conduct.js enforces role, property and
 * draft-ownership checks on every request, including document downloads. Meeting content is never written
 * to localStorage, URLs or console. Autosave is server-backed: "All changes saved" is shown only after the
 * server confirms the exact save sequence that holds the latest edit.
 *
 * Globals used at call time: apiFetch, esc, me, isManager, currentProperty, propParam, dirDocs,
 * goToTab, openResidentModal, closeResidentModal.
 */
/* global apiFetch, esc, me, isManager, currentProperty, propParam, dirDocs, goToTab, openResidentModal, closeResidentModal */
(function () {
  const API = '/reslife-conduct';
  const $ = id => document.getElementById(id);
  const ROLE = () => (me && me.role) || '';
  const canUse = () => !!isManager && ['admin', 'reslife-admin', 'reslife-rec'].includes(ROLE());
  const isAdm = () => ['admin', 'reslife-admin'].includes(ROLE());
  const STEPS = ['Resident Information', 'Routing', 'Education Reminder', 'Resident Response', 'Outcome', 'Closeout', 'Review & Submit'];
  const STATUS = { draft: 'Draft', submitting: 'Submitting…', submitted: 'Submitted', amending: 'Amending…', amended: 'Amended' };
  const DEBOUNCE = 1200;

  let META = null;
  let list = [];
  let filter = { q: '', status: '', card: '' };
  let staffAccounts = [];
  let S = null; // active wizard/record session

  const errText = e => { try { const j = JSON.parse(e.message); return j; } catch (x) { return { error: e.message || String(e) }; } };
  const errHTML = j => `<div class="cm-err" role="alert"><b>${esc(j.error || 'Something went wrong')}</b>${(j.missing || j.errors || []).length ? '<ul>' + (j.missing || j.errors).map(m => `<li>${esc(m)}</li>`).join('') + '</ul>' : ''}</div>`;
  const fmtDT = s => { if (!s) return '—'; const d = new Date(s); return isNaN(d) ? esc(s) : d.toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }); };
  const fmtMeeting = s => { if (!s) return '—'; const d = new Date(s); return isNaN(d) ? esc(s) : d.toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }); };
  const fmtD = s => { if (!s) return '—'; const d = new Date(s + 'T00:00'); return isNaN(d) ? esc(s) : d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }); };
  const badge = st => `<span class="cm-status ${esc(st)}">${esc(STATUS[st] || st)}</span>`;
  const q = (extra) => API + propParam() + (extra || '');

  async function meta() { if (!META) META = await apiFetch(q('&meta=1')); return META; }
  async function ensureDirectory() {
    if (typeof dirDocs !== 'undefined' && Array.isArray(dirDocs) && dirDocs.length && dirDocs[0].property === currentProperty) return dirDocs;
    const docs = await apiFetch('/reslife-directory' + propParam());
    try { dirDocs = docs; } catch (e) { /* hub owns dirDocs */ }
    return docs;
  }
  const residentById = id => (typeof dirDocs !== 'undefined' && Array.isArray(dirDocs) ? dirDocs : []).find(r => r.id === id);

  // ---------- binary documents (auth cookie; never a public URL) ----------
  async function fetchBlob(extra) {
    const r = await fetch('/api' + q(extra), { credentials: 'include' });
    if (!r.ok) { let t = ''; try { t = await r.text(); } catch (e) { /* */ } throw new Error(t || ('HTTP ' + r.status)); }
    const cd = r.headers.get('Content-Disposition') || '';
    const m = /filename="([^"]+)"/.exec(cd);
    return { blob: await r.blob(), name: m ? m[1] : 'record' };
  }
  async function download(id, fmt, version) {
    try {
      const { blob, name } = await fetchBlob(`&id=${encodeURIComponent(id)}&file=${fmt}${version ? '&version=' + version : ''}`);
      const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) { alert(errText(e).error); }
  }
  async function viewPdf(id, version) {
    const w = window.open('', '_blank');
    try {
      const { blob } = await fetchBlob(`&id=${encodeURIComponent(id)}&file=pdf&inline=1${version ? '&version=' + version : ''}`);
      const url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      if (w) w.location = url; else window.location.assign(url);
      setTimeout(() => URL.revokeObjectURL(url), 300000);
    } catch (e) { if (w) w.close(); alert(errText(e).error); }
  }

  // ---------- overlay ----------
  function overlay(title, sub, html, wide) {
    let ov = $('cmOverlay');
    if (!ov) { ov = document.createElement('div'); ov.id = 'cmOverlay'; ov.className = 'pp-overlay'; document.body.appendChild(ov); ov.addEventListener('click', e => { if (e.target === ov) closeOverlay(); }); }
    ov.innerHTML = `<div class="pp-modal" role="dialog" aria-modal="true" aria-label="${esc(title)}" style="max-width:${wide ? '1040px' : '640px'}"><div class="pp-head"><div class="pp-head-ico">&#128221;</div><div><h3>${esc(title)}</h3><p>${esc(sub || '')}</p></div><button class="pp-close" type="button" data-cm-close aria-label="Close">&times;</button></div><div style="padding:16px 20px">${html}</div></div>`;
    ov.classList.add('show');
    ov.querySelectorAll('[data-cm-close]').forEach(b => { b.onclick = closeOverlay; });
    const f = ov.querySelector('textarea,input,button.rl-btn'); if (f) setTimeout(() => f.focus(), 30);
    return ov;
  }
  function closeOverlay() { const ov = $('cmOverlay'); if (ov) { ov.classList.remove('show'); const fr = ov.querySelector('iframe'); if (fr && fr.dataset.url) URL.revokeObjectURL(fr.dataset.url); ov.innerHTML = ''; } }

  // =====================================================================
  // DASHBOARD
  // =====================================================================
  async function load() {
    const root = $('cmRoot'); if (!root) return;
    if (!canUse()) { root.innerHTML = '<div class="rl-empty">Conduct Meeting Notes is available to REC and Admin accounts only.</div>'; return; }
    if (S && S.view !== 'dashboard') return renderSession();
    root.innerHTML = '<div class="rl-loading">Loading meeting records…</div>';
    try { await meta(); list = await apiFetch(q()); } catch (e) { root.innerHTML = errHTML(errText(e)); return; }
    renderDashboard();
  }

  function rowsFor(card) {
    const mine = m => m.createdBy === me.username;
    let rows = list.slice();
    if (card === 'mine') rows = rows.filter(m => m.status === 'draft' && mine(m));
    else if (card === 'progress') rows = rows.filter(m => m.status === 'draft' && !mine(m));
    else if (card === 'submitted') rows = rows.filter(m => ['submitted', 'amended'].includes(m.status));
    if (filter.status) rows = rows.filter(m => m.status === filter.status);
    if (filter.q) { const s = filter.q.toLowerCase(); rows = rows.filter(m => [m.residentName, m.bedspace, m.incidentViolation, m.createdByName].some(v => String(v || '').toLowerCase().includes(s))); }
    return rows;
  }

  function table(rows, empty) {
    if (!rows.length) return `<div class="rl-empty">${esc(empty)}</div>`;
    return `<div class="dt-table-wrap"><table class="rl-table"><thead><tr><th>Resident</th><th>Bedspace</th><th>Meeting Date</th><th>Incident / Violation</th><th>Status</th><th>Last Updated</th><th>Created By</th><th>Actions</th></tr></thead><tbody>${rows.map(m => {
      const own = m.createdBy === me.username;
      const acts = m.status === 'draft'
        ? `<button class="rl-btn sm primary" data-cm-resume="${m.id}">Resume</button>${own || isAdm() ? `<button class="rl-btn sm" data-cm-discard="${m.id}">Discard</button>` : ''}`
        : `<button class="rl-btn sm primary" data-cm-view="${m.id}">View</button><button class="rl-btn sm" data-cm-dl="${m.id}" data-fmt="pdf">PDF</button><button class="rl-btn sm" data-cm-dl="${m.id}" data-fmt="docx">DOCX</button><button class="rl-btn sm" data-cm-amend="${m.id}">Amend</button>`;
      return `<tr><td><b>${esc(m.residentName || '(no resident selected)')}</b></td><td>${esc(m.bedspace || '—')}${m.bedspaceNeedsReview ? ' <span class="cm-flag" title="No confirmed bedspace in the Resident Directory">review</span>' : ''}</td><td>${fmtMeeting(m.meetingDateTime)}</td><td>${esc(m.incidentViolation || '—')}</td><td>${badge(m.status)}${m.documentVersion > 1 ? ` <small>v${m.documentVersion}</small>` : ''}</td><td>${fmtDT(m.updatedAt)}</td><td>${esc(m.createdByName)}</td><td><div class="cm-actions">${acts}</div></td></tr>`;
    }).join('')}</tbody></table></div>`;
  }

  function renderDashboard() {
    const root = $('cmRoot');
    const c = k => rowsFor(k).length;
    const cards = [['mine', 'My Drafts', c('mine')], ['progress', 'Meetings in Progress', c('progress')], ['submitted', 'Submitted Meetings', c('submitted')], ['', 'All Records', c('')]];
    root.innerHTML = `
      <div class="cm-stats">${cards.map(([k, l, n]) => `<button type="button" class="cm-stat${filter.card === k ? ' active' : ''}" data-cm-card="${k}"><b>${n}</b><span>${esc(l)}</span></button>`).join('')}</div>
      <div class="cm-filters"><input id="cmSearch" type="search" placeholder="Search resident, bedspace, incident or staff" value="${esc(filter.q)}" aria-label="Search meetings" />
        <select id="cmStatus" aria-label="Status filter"><option value="">All statuses</option>${['draft', 'submitted', 'amended'].map(s => `<option value="${s}" ${filter.status === s ? 'selected' : ''}>${STATUS[s]}</option>`).join('')}</select></div>
      ${filter.card ? `<h4 class="cm-h4">${esc(cards.find(x => x[0] === filter.card)[1])}</h4>${table(rowsFor(filter.card), 'Nothing here yet.')}` : `
      <h4 class="cm-h4">My Drafts</h4>${table(rowsFor('mine'), 'You have no drafts. Start a meeting with “New Conduct Meeting”.')}
      ${isAdm() ? `<h4 class="cm-h4">Meetings in Progress (other staff)</h4>${table(rowsFor('progress'), 'No other meetings in progress.')}` : ''}
      <h4 class="cm-h4">Recent Meeting Records</h4>${table(rowsFor('submitted').slice(0, 50), 'No submitted meeting records yet.')}`}`;
    $('cmSearch').oninput = e => { filter.q = e.target.value; const pos = e.target.selectionStart; renderDashboard(); const s = $('cmSearch'); s.focus(); s.setSelectionRange(pos, pos); };
    $('cmStatus').onchange = e => { filter.status = e.target.value; renderDashboard(); };
    root.querySelectorAll('[data-cm-card]').forEach(b => { b.onclick = () => { filter.card = filter.card === b.dataset.cmCard ? '' : b.dataset.cmCard; renderDashboard(); }; });
    bindRowActions(root);
  }

  function bindRowActions(root) {
    root.querySelectorAll('[data-cm-resume]').forEach(b => { b.onclick = () => openMeeting(b.dataset.cmResume); });
    root.querySelectorAll('[data-cm-view]').forEach(b => { b.onclick = () => openMeeting(b.dataset.cmView); });
    root.querySelectorAll('[data-cm-amend]').forEach(b => { b.onclick = () => openMeeting(b.dataset.cmAmend, 'amend'); });
    root.querySelectorAll('[data-cm-dl]').forEach(b => { b.onclick = () => download(b.dataset.cmDl, b.dataset.fmt); });
    root.querySelectorAll('[data-cm-discard]').forEach(b => {
      b.onclick = async () => {
        if (!confirm('Discard this draft? It will no longer appear in your drafts. Submitted records are never affected.')) return;
        try { await apiFetch(API, { method: 'POST', body: JSON.stringify({ action: 'discard', property: currentProperty, id: b.dataset.cmDiscard }) }); load(); } catch (e) { alert(errText(e).error); }
      };
    });
  }

  // =====================================================================
  // SESSION (wizard / record view / amendment)
  // =====================================================================
  async function newMeeting(prefillResidentId) {
    if (!canUse()) return;
    try {
      await meta();
      const rec = await apiFetch(API, { method: 'POST', body: JSON.stringify({ action: 'create', property: currentProperty, data: prefillResidentId ? { residentId: prefillResidentId } : {} }) });
      startSession(rec, 'edit');
    } catch (e) { alert(errText(e).error); }
  }
  async function openMeeting(id, mode) {
    try {
      await meta();
      const rec = await apiFetch(q('&id=' + encodeURIComponent(id)));
      startSession(rec, rec.status === 'draft' ? 'edit' : (mode === 'amend' ? 'amend' : 'view'));
    } catch (e) { alert(errText(e).error); }
  }

  function startSession(rec, mode) {
    if (S && S.view !== 'dashboard' && S !== null) teardown();
    S = {
      view: mode, rec, data: JSON.parse(JSON.stringify(rec.data)), step: mode === 'edit' ? Math.min(rec.lastStep || 0, 6) : 6,
      seq: Math.max(rec.saveSeq || 0, Date.now() * 1000), counter: 0, savedSeq: rec.saveSeq || 0, latestSeq: rec.saveSeq || 0,
      timer: null, inflight: null, retry: 0, retryTimer: null, saveState: 'saved', saveMsg: 'All changes saved', invalid: [], resQuery: '',
      original: mode === 'amend' ? JSON.stringify(rec.data) : null,
    };
    if (typeof goToTab === 'function' && !document.querySelector('#tab-conduct.active')) goToTab('conduct');
    window.addEventListener('beforeunload', beforeUnload);
    window.addEventListener('pagehide', flushKeepalive);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('online', onOnline);
    renderSession();
    ensureDirectory().then(() => { if (S && S.step === 0) renderSession(); }).catch(() => {});
    if (!staffAccounts.length) apiFetch(q('&staff=1')).then(r => { staffAccounts = r || []; if (S && S.step === 0) renderSession(); }).catch(() => {});
  }
  function teardown() {
    if (!S) return;
    clearTimeout(S.timer); clearTimeout(S.retryTimer);
    window.removeEventListener('beforeunload', beforeUnload);
    window.removeEventListener('pagehide', flushKeepalive);
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('online', onOnline);
  }
  async function exitSession() {
    if (S && S.view === 'edit' && S.latestSeq > S.savedSeq) {
      await saveNow();
      if (S.latestSeq > S.savedSeq && !confirm('Some changes have not been confirmed by the server yet. Leave anyway? Unsaved changes may be lost.')) return;
    }
    if (S && S.view === 'amend' && JSON.stringify(S.data) !== S.original && !confirm('Discard this unsubmitted amendment?')) return;
    teardown(); S = null; load();
  }
  const unsaved = () => S && ((S.view === 'edit' && S.latestSeq > S.savedSeq) || (S.view === 'amend' && JSON.stringify(S.data) !== S.original));
  function beforeUnload(e) { if (unsaved()) { e.preventDefault(); e.returnValue = ''; } }
  function onVisibility() { if (document.visibilityState === 'hidden') flushKeepalive(); }
  function onOnline() { if (S && S.view === 'edit' && S.latestSeq > S.savedSeq) saveNow(); }

  // ---------- autosave ----------
  function setSave(state, msg) {
    if (!S) return; S.saveState = state; S.saveMsg = msg;
    const el = $('cmSave'); if (el) { el.className = 'cm-save ' + state; el.textContent = msg; }
  }
  function nextSeq() { S.seq = Math.max(S.seq + 1, Date.now() * 1000 + (++S.counter % 1000)); return S.seq; }
  function changed(immediate) {
    if (!S || S.view !== 'edit') return;
    S.latestSeq = nextSeq();
    setSave('saving', 'Saving…');
    clearTimeout(S.timer);
    if (immediate) saveNow(); else S.timer = setTimeout(saveNow, DEBOUNCE);
  }
  function payload(seq) { return JSON.stringify({ property: currentProperty, id: S.rec.id, seq, lastStep: S.step, data: S.data }); }
  async function saveNow() {
    if (!S || S.view !== 'edit') return;
    clearTimeout(S.timer);
    if (S.inflight) { await S.inflight.catch(() => {}); if (!S || S.latestSeq <= S.savedSeq) return; }
    if (S.latestSeq <= S.savedSeq) return;
    const seq = S.latestSeq;
    const sess = S;
    sess.inflight = (async () => {
      try {
        const r = await apiFetch(API, { method: 'PUT', body: payload(seq) });
        if (S !== sess) return;
        sess.retry = 0;
        if (r && r.ok) {
          sess.savedSeq = Math.max(sess.savedSeq, seq);
          if (r.data) { // server-derived snapshot fields (directory name, bedspace flags)
            ['residentName', 'bedspaceSource', 'bedspaceNeedsReview'].forEach(k => { sess.data[k] = r.data[k]; });
            if (!sess.data.bedspace && r.data.bedspace) sess.data.bedspace = r.data.bedspace;
            updateBar();
          }
        } else if (r && r.stale) {
          sess.savedSeq = Math.max(sess.savedSeq, seq);
          setSave('error', 'A newer version of this draft was saved in another window. Reload before continuing.');
          return;
        }
        if (sess.latestSeq > sess.savedSeq) { sess.inflight = null; return saveNow(); }
        setSave('saved', 'All changes saved · ' + new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }));
      } catch (e) {
        if (S !== sess) return;
        if (e.status === 422) { const j = errText(e); setSave('error', 'Not saved: ' + ((j.errors || [])[0] || j.error)); return; }
        if (e.status === 409) { setSave('error', 'This record was submitted elsewhere — further edits are not saved.'); return; }
        if (e.status === 401) { setSave('error', 'Signed out — changes are NOT saved. Sign in again in another tab, then keep this page open.'); }
        else setSave('error', (navigator.onLine === false ? 'Offline' : 'Connection problem') + ' — changes NOT saved yet. Retrying…');
        sess.retry = Math.min(sess.retry + 1, 6);
        clearTimeout(sess.retryTimer);
        sess.retryTimer = setTimeout(() => { if (S === sess) saveNow(); }, 2000 * Math.pow(1.6, sess.retry));
      } finally { if (S === sess) sess.inflight = null; }
    })();
    return sess.inflight;
  }
  function flushKeepalive() {
    if (!S || S.view !== 'edit' || S.latestSeq <= S.savedSeq) return;
    const body = payload(S.latestSeq);
    if (body.length > 60000) return; // keepalive limit; beforeunload warning still protects the user
    try { fetch('/api' + API, { method: 'PUT', credentials: 'include', keepalive: true, headers: { 'Content-Type': 'application/json' }, body }); } catch (e) { /* best effort */ }
  }

  // ---------- render ----------
  function updateBar() {
    const who = $('cmWho'); if (!who || !S) return;
    who.innerHTML = `${esc(S.data.residentName || 'No resident selected')}<small>${esc(S.data.bedspace || 'Bedspace —')} · ${S.view === 'edit' ? 'Draft' : S.view === 'amend' ? 'Amending v' + S.rec.documentVersion : badge(S.rec.status)}</small>`;
  }

  function renderSession() {
    const root = $('cmRoot'); if (!root || !S) return;
    const editing = S.view !== 'view';
    root.innerHTML = `
      <div class="cm-bar"><button class="rl-btn sm" type="button" id="cmExit">&larr; Dashboard</button><div class="cm-who" id="cmWho" aria-live="polite"></div>
        ${S.view === 'edit' ? `<div class="cm-save ${S.saveState}" id="cmSave" role="status" aria-live="polite">${esc(S.saveMsg)}</div>` : S.view === 'amend' ? '<div class="cm-save" style="margin-left:auto">Amendment — not saved until you submit it with a reason</div>' : '<div style="margin-left:auto"></div>'}</div>
      ${editing ? `<nav class="cm-steps" aria-label="Meeting sections">${STEPS.map((s, i) => `<button type="button" class="cm-step${i === S.step ? ' active' : ''}${i < S.step ? ' done' : ''}" data-cm-step="${i}" ${i === S.step ? 'aria-current="step"' : ''}><i>${i < S.step ? '&#10003;' : i + 1}</i><span>${esc(s)}</span></button>`).join('')}</nav>` : ''}
      <div id="cmStepHost"></div>`;
    updateBar();
    $('cmExit').onclick = exitSession;
    root.querySelectorAll('[data-cm-step]').forEach(b => { b.onclick = () => go(+b.dataset.cmStep); });
    const host = $('cmStepHost');
    if (S.view === 'view') return renderRecord(host);
    [stepResident, stepRouting, stepEducation, stepResponse, stepOutcome, stepCloseout, stepReview][S.step](host);
    const first = host.querySelector('[data-autofocus]'); if (first) first.focus();
  }
  function go(step) {
    if (!S) return;
    S.step = Math.max(0, Math.min(6, step));
    if (S.view === 'edit') changed(true); // persist last section + any pending text immediately
    renderSession();
    const root = $('cmRoot'); if (root) root.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }
  const navHTML = () => `<div class="cm-nav"><div>${S.step > 0 ? '<button class="rl-btn outline" type="button" data-cm-prev>&larr; Back</button>' : ''}</div><div class="cm-row" style="flex:0 0 auto">${S.view === 'edit' ? '<button class="rl-btn" type="button" data-cm-savedraft>Save Draft</button>' : ''}<button class="rl-btn primary" type="button" data-cm-next>Next: ${esc(STEPS[S.step + 1] || '')} &rarr;</button></div></div>`;
  function bindNav(host) {
    const p = host.querySelector('[data-cm-prev]'); if (p) p.onclick = () => go(S.step - 1);
    const n = host.querySelector('[data-cm-next]'); if (n) n.onclick = () => go(S.step + 1);
    const sd = host.querySelector('[data-cm-savedraft]'); if (sd) sd.onclick = saveDraftClick;
  }
  async function saveDraftClick() {
    if (S.latestSeq <= S.savedSeq) { S.latestSeq = nextSeq(); }
    setSave('saving', 'Saving…');
    await saveNow();
  }
  // generic bindings: data-f (text), data-list (checkbox arrays)
  function bindFields(host) {
    host.querySelectorAll('[data-f]').forEach(el => {
      const k = el.dataset.f;
      const ev = el.tagName === 'SELECT' || el.type === 'date' || el.type === 'datetime-local' ? 'change' : 'input';
      el.addEventListener(ev, () => { S.data[k] = el.value; if (el.dataset.grow) grow(el); changed(ev === 'change'); if (k === 'bedspace') updateBar(); });
      if (el.dataset.grow) grow(el);
    });
    host.querySelectorAll('[data-list]').forEach(el => {
      el.addEventListener('change', () => {
        const k = el.dataset.list, v = el.value, cur = new Set(S.data[k] || []);
        if (el.checked) cur.add(v); else cur.delete(v);
        const order = { routing: META.routing, education: META.education, outcomes: META.outcomes, closeout: META.closeout }[k];
        S.data[k] = order.filter(x => cur.has(x));
        el.closest('.cm-check').classList.toggle('on', el.checked);
        changed(true);
      });
    });
  }
  function grow(el) { el.style.height = 'auto'; el.style.height = Math.max(el.scrollHeight + 4, 320) + 'px'; }
  const checks = (key, items, cols) => `<div class="cm-checks${cols === 3 ? ' cols3' : ''}" role="group">${items.map((it, i) => { const on = (S.data[key] || []).includes(it); return `<label class="cm-check${on ? ' on' : ''}"><input type="checkbox" data-list="${key}" value="${esc(it)}" ${on ? 'checked' : ''} ${i === 0 ? 'data-autofocus' : ''}/> <span>${esc(it)}</span></label>`; }).join('')}</div>`;
  const inv = k => (S.invalid.includes(k) ? ' invalid' : '');

  // ---- Step 1 ----
  function stepResident(host) {
    const d = S.data;
    const r = d.residentId ? residentById(d.residentId) : null;
    const dirUnit = r ? (r.unit || r.room || '') : '';
    const locked = S.view === 'amend';
    const picked = d.residentId ? `<div class="cm-res-picked">
        <div class="av">${esc((d.residentName || '?').split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase())}</div>
        <dl><dt>Resident</dt><dd>${esc(d.residentName || (r && r.displayName) || '')}</dd>
          <dt>Directory unit</dt><dd>${esc(dirUnit || 'None on file')}</dd>
          ${r && r.building ? `<dt>Building / Floor</dt><dd>${esc(r.building)} · ${esc(r.floor || '—')}</dd>` : ''}
          ${r && r.email ? `<dt>Email</dt><dd>${esc(r.email)}</dd>` : ''}
          ${r && r.occupantType ? `<dt>Occupant type</dt><dd>${esc(r.occupantType)}</dd>` : ''}</dl>
        ${locked ? '<small style="margin-left:auto">The resident link of a submitted record cannot change.</small>' : '<button class="rl-btn sm" type="button" id="cmResChange" style="margin-left:auto">Change resident</button>'}</div>` : '';
    const bedOpts = [];
    if (dirUnit) bedOpts.push([dirUnit, 'Current directory assignment']);
    (S.priorBeds || []).filter(b => b && b !== dirUnit).forEach(b => bedOpts.push([b, 'Used in a prior meeting record']));
    const manual = d.bedspace && !bedOpts.some(o => o[0] === d.bedspace);
    host.innerHTML = `<div class="cm-card"><h3>Resident Information</h3><p class="cm-sub">Resident details come from the Resident Directory. Fields marked <span style="color:#dc2626">*</span> are required to submit.</p>
      <div class="cm-grid">
        <div class="cm-field full${inv('residentId')}"><label for="cmResQ">Resident <span class="req">*</span></label>
          ${picked || `<div class="cm-res-search"><input id="cmResQ" type="search" autocomplete="off" placeholder="Search the Resident Directory by name, unit or email" value="${esc(S.resQuery)}" data-autofocus aria-describedby="cmResHint" /><div id="cmResList"></div><small id="cmResHint" style="color:var(--rl-subtext)">Only residents in the directory can be linked to a meeting record.</small></div>`}</div>
        <div class="cm-field${inv('bedspace')}"><label for="cmBed">Unit / Bedspace</label>
          ${d.residentId ? `<select id="cmBedSel" aria-label="Bedspace source">${bedOpts.map(([v, l]) => `<option value="${esc(v)}" ${d.bedspace === v ? 'selected' : ''}>${esc(v)} — ${esc(l)}</option>`).join('')}<option value="__manual" ${manual || !bedOpts.length ? 'selected' : ''}>Enter a different bedspace…</option></select>` : ''}
          <input id="cmBed" data-f="bedspace" value="${esc(d.bedspace)}" placeholder="e.g. 1111-B" style="margin-top:6px;${d.residentId && !manual && bedOpts.length ? 'display:none' : ''}" maxlength="80" />
          ${d.residentId && !dirUnit ? '<div class="cm-flag" style="margin-top:4px">No confirmed bedspace in the Resident Directory — enter it manually; it will be flagged for review.</div>' : ''}</div>
        <div class="cm-field${inv('incidentViolation')}"><label for="cmInc">Incident / Violation <span class="req">*</span></label><input id="cmInc" data-f="incidentViolation" value="${esc(d.incidentViolation)}" maxlength="1000" /></div>
        <div class="cm-field"><label for="cmNotice">Notice Date</label><input id="cmNotice" type="date" data-f="noticeDate" value="${esc(d.noticeDate)}" /></div>
        <div class="cm-field${inv('meetingDateTime')}"><label for="cmMeet">Meeting Date / Time <span class="req">*</span></label><div class="cm-row"><input id="cmMeet" type="datetime-local" data-f="meetingDateTime" value="${esc(d.meetingDateTime)}" /><button class="rl-btn sm" type="button" id="cmNow" style="flex:0 0 auto">Now</button></div></div>
        <div class="cm-field full${inv('staffPresent')}"><label for="cmStaffSel">Staff Present <span class="req">*</span></label>
          <div class="cm-chips">${(d.staffPresent || []).map((s, i) => `<span class="cm-chip">${esc(s.name)}<button type="button" data-cm-rmstaff="${i}" aria-label="Remove ${esc(s.name)}">&times;</button></span>`).join('') || '<small style="color:var(--rl-subtext)">No staff listed yet.</small>'}</div>
          <div class="cm-row"><select id="cmStaffSel"><option value="">Add a staff account…</option>${staffAccounts.filter(a => !(d.staffPresent || []).some(s => s.username === a.username)).map(a => `<option value="${esc(a.username)}">${esc(a.name)}</option>`).join('')}</select>
            <input id="cmStaffManual" placeholder="Or type a name (e.g. guest staff)" maxlength="120" /><button class="rl-btn sm" type="button" id="cmStaffAdd" style="flex:0 0 auto">Add</button></div></div>
      </div>${navHTML()}</div>`;
    bindFields(host); bindNav(host);
    const rq = $('cmResQ');
    if (rq) { const run = () => { S.resQuery = rq.value; renderResList(); }; rq.addEventListener('input', run); if (S.resQuery) renderResList(); }
    const ch = $('cmResChange'); if (ch) ch.onclick = () => { Object.assign(S.data, { residentId: '', residentName: '', bedspace: '', bedspaceSource: '', bedspaceNeedsReview: false }); S.priorBeds = []; changed(true); renderSession(); };
    const bs = $('cmBedSel');
    if (bs) bs.onchange = () => { const bed = $('cmBed'); if (bs.value === '__manual') { bed.style.display = ''; bed.value = ''; S.data.bedspace = ''; bed.focus(); } else { bed.style.display = 'none'; bed.value = bs.value; S.data.bedspace = bs.value; } S.data.bedspaceSource = bs.value === '__manual' ? 'manual' : (bs.value === dirUnit ? 'directory' : 'history'); updateBar(); changed(true); };
    $('cmNow').onclick = () => { const n = new Date(); n.setSeconds(0, 0); const v = new Date(n - n.getTimezoneOffset() * 60000).toISOString().slice(0, 16); $('cmMeet').value = v; S.data.meetingDateTime = v; changed(true); };
    host.querySelectorAll('[data-cm-rmstaff]').forEach(b => { b.onclick = () => { S.data.staffPresent.splice(+b.dataset.cmRmstaff, 1); changed(true); renderSession(); }; });
    $('cmStaffAdd').onclick = () => {
      const sel = $('cmStaffSel'), man = $('cmStaffManual');
      if (sel.value) { const a = staffAccounts.find(x => x.username === sel.value); if (a) S.data.staffPresent.push({ name: a.name, username: a.username }); }
      if (man.value.trim()) S.data.staffPresent.push({ name: man.value.trim(), username: '' });
      if (sel.value || man.value.trim()) { changed(true); renderSession(); }
    };
    if (d.residentId && !S.priorBeds) loadPriorBeds(d.residentId);
  }
  async function loadPriorBeds(rid) {
    S.priorBeds = [];
    try { const rows = await apiFetch(q('&residentId=' + encodeURIComponent(rid))); if (!S) return; S.priorBeds = [...new Set(rows.map(r => r.bedspace).filter(Boolean))]; if (S.step === 0 && S.priorBeds.length) renderSession(); } catch (e) { /* optional */ }
  }
  function renderResList() {
    const box = $('cmResList'); if (!box) return;
    const s = S.resQuery.trim().toLowerCase();
    if (s.length < 2) { box.innerHTML = ''; return; }
    const docs = (typeof dirDocs !== 'undefined' && Array.isArray(dirDocs)) ? dirDocs : [];
    const hits = docs.filter(r => [r.residentName, r.displayName, r.unit, r.room, r.email].some(v => String(v || '').toLowerCase().includes(s))).slice(0, 25);
    box.innerHTML = `<div class="cm-res-list" role="listbox">${hits.length ? hits.map(r => `<button type="button" class="cm-res-item" role="option" data-cm-pick="${esc(r.id)}"><span><b>${esc(r.displayName || r.residentName)}</b><br><small>${esc(r.residentName)}${r.email ? ' · ' + esc(r.email) : ''}</small></span><small>${esc(r.unit || r.room || 'No unit')}</small></button>`).join('') : `<div class="rl-empty" style="padding:14px">${docs.length ? 'No matching resident in the directory.' : 'Loading the Resident Directory…'}</div>`}</div>`;
    box.querySelectorAll('[data-cm-pick]').forEach(b => {
      b.onclick = () => {
        const r = residentById(b.dataset.cmPick); if (!r) return;
        const unit = r.unit || r.room || '';
        Object.assign(S.data, { residentId: r.id, residentName: r.displayName || r.residentName, bedspace: unit, bedspaceSource: unit ? 'directory' : 'manual', bedspaceNeedsReview: !unit });
        S.resQuery = ''; S.priorBeds = null; S.invalid = S.invalid.filter(k => k !== 'residentId');
        changed(true); renderSession();
      };
    });
  }

  // ---- Steps 2-6 ----
  function stepRouting(host) { host.innerHTML = `<div class="cm-card"><h3>Routing</h3><p class="cm-sub">Select every route that applies.</p>${checks('routing', META.routing)}${navHTML()}</div>`; bindFields(host); bindNav(host); }
  function stepEducation(host) { host.innerHTML = `<div class="cm-card"><h3>Education / Violation Knowledge Reminder</h3><p class="cm-sub">Check only the items actually completed in this meeting. Nothing is checked automatically.</p>${checks('education', META.education)}${navHTML()}</div>`; bindFields(host); bindNav(host); }
  function stepResponse(host) {
    host.innerHTML = `<div class="cm-card"><h3>Resident response / additional information</h3><p class="cm-sub">Record the resident’s own statements and factual staff observations. Text is saved exactly as typed — it is never rewritten or summarised.</p>
      <div class="cm-field"><label for="cmResp" class="sr-only" style="position:absolute;left:-9999px">Resident response / additional information</label><textarea id="cmResp" class="cm-notes" data-f="residentResponse" data-grow="1" data-autofocus spellcheck="true">${esc(S.data.residentResponse)}</textarea>
      <small style="color:var(--rl-subtext)" id="cmRespCount">${(S.data.residentResponse || '').length.toLocaleString()} characters</small></div>${navHTML()}</div>`;
    bindFields(host); bindNav(host);
    $('cmResp').addEventListener('input', e => { $('cmRespCount').textContent = e.target.value.length.toLocaleString() + ' characters'; });
  }
  function stepOutcome(host) {
    host.innerHTML = `<div class="cm-card"><h3>Outcome / next step</h3><p class="cm-sub">Select all that apply. No outcome is chosen for you.</p>${checks('outcomes', META.outcomes)}
      <div class="cm-grid" style="margin-top:14px"><div class="cm-field"><label for="cmFu">Follow-up date</label><input id="cmFu" type="date" data-f="followUpDate" value="${esc(S.data.followUpDate)}" /></div>
      <div class="cm-field full"><label for="cmAct">Notes / assigned action</label><textarea id="cmAct" rows="5" data-f="assignedActionNotes" style="min-height:120px">${esc(S.data.assignedActionNotes)}</textarea></div></div>${navHTML()}</div>`;
    bindFields(host); bindNav(host);
  }
  function stepCloseout(host) {
    host.innerHTML = `<div class="cm-card"><h3>Closeout</h3><p class="cm-sub">Manual staff confirmations — check an item only after you have completed it yourself.</p>${checks('closeout', META.closeout, 3)}
      <div class="cm-docnote"><div><b>Documentation note</b>${esc(META.docNote)}</div></div>${navHTML()}</div>`;
    bindFields(host); bindNav(host);
  }

  // ---- Review (shared by Step 7, record view and amendment) ----
  function reviewHTML(d, editable) {
    const edit = i => (editable ? `<button class="rl-btn sm" type="button" data-cm-step="${i}">Edit</button>` : '');
    const boxes = (items, sel, mark) => `<ul>${items.map(it => `<li><span class="x">${sel.includes(it) ? '[X]' : mark ? '[ ]' : '•'}</span> ${esc(it)}</li>`).join('')}</ul>`;
    return `<div class="cm-review">
      <section><h4>Resident information ${edit(0)}</h4><dl>
        <dt>Resident</dt><dd>${esc(d.residentName || '—')}</dd>
        <dt>Unit / Bedspace</dt><dd>${esc(d.bedspace || '—')}${d.bedspaceNeedsReview ? ' <span class="cm-flag">(no confirmed directory bedspace — review)</span>' : ''}</dd>
        <dt>Incident / Violation</dt><dd>${esc(d.incidentViolation || '—')}</dd>
        <dt>Notice Date</dt><dd>${fmtD(d.noticeDate)}</dd>
        <dt>Meeting Date / Time</dt><dd>${fmtMeeting(d.meetingDateTime)}</dd>
        <dt>Staff Present</dt><dd>${esc((d.staffPresent || []).map(s => s.name).join('; ') || '—')}</dd></dl></section>
      <section><h4>Routing ${edit(1)}</h4>${boxes(META.routing, d.routing || [], false)}</section>
      <section><h4>Education / Violation Knowledge Reminder ${edit(2)}</h4>${boxes(META.education, d.education || [], true)}</section>
      <section><h4>Resident response / additional information ${edit(3)}</h4><div class="cm-pre">${esc(d.residentResponse || '')}</div></section>
      <section><h4>Outcome / next step ${edit(4)}</h4>${boxes(META.outcomes, d.outcomes || [], true)}<dl style="margin-top:8px"><dt>Follow-up date</dt><dd>${fmtD(d.followUpDate)}</dd><dt>Notes / assigned action</dt><dd>${esc(d.assignedActionNotes || '—')}</dd></dl></section>
      <section><h4>Closeout ${edit(5)}</h4>${boxes(META.closeout, d.closeout || [], true)}<div class="cm-docnote"><div><b>Documentation note</b>${esc(META.docNote)}</div></div></section></div>`;
  }
  function clientMissing(d) {
    const m = [];
    if (!d.residentId) m.push(['residentId', 'Resident (select a resident from the Resident Directory)']);
    if (!String(d.incidentViolation || '').trim()) m.push(['incidentViolation', 'Incident / Violation']);
    if (!d.meetingDateTime) m.push(['meetingDateTime', 'Meeting Date / Time']);
    if (!(d.staffPresent || []).length) m.push(['staffPresent', 'Staff Present']);
    return m;
  }
  function stepReview(host) {
    const amend = S.view === 'amend';
    const missing = clientMissing(S.data);
    host.innerHTML = `<div class="cm-card"><h3>${amend ? 'Review amendment' : 'Review & Submit'}</h3><p class="cm-sub">Shown in the same order as the official Resident Accountability Meeting Record.</p>
      ${missing.length ? errHTML({ error: 'Required before submitting:', missing: missing.map(x => x[1]) }) : ''}
      ${reviewHTML(S.data, true)}
      ${amend ? `<div class="cm-field" style="margin-top:12px"><label for="cmReason">Reason for correction <span class="req">*</span></label><textarea id="cmReason" rows="3" maxlength="2000" placeholder="Why is this submitted record being corrected? The original version is preserved."></textarea></div>` : ''}
      <div id="cmSubmitMsg"></div>
      <div class="cm-nav"><button class="rl-btn outline" type="button" data-cm-prev>&larr; Back</button><div class="cm-row" style="flex:0 0 auto">
        ${amend ? '' : '<button class="rl-btn" type="button" data-cm-savedraft>Save Draft</button>'}
        <button class="rl-btn" type="button" id="cmPreview">Preview Document</button>
        <button class="rl-btn primary" type="button" id="cmSubmit">${amend ? 'Submit Amendment' : 'Submit Meeting Record'}</button></div></div></div>`;
    host.querySelectorAll('[data-cm-step]').forEach(b => { b.onclick = () => go(+b.dataset.cmStep); });
    bindNav(host);
    $('cmPreview').onclick = () => previewDoc();
    $('cmSubmit').onclick = amend ? submitAmendment : submitMeeting;
  }

  async function previewDoc() {
    const ov = overlay('Document preview', 'Official Harbour form — not submitted', '<div class="rl-loading">Generating the official form…</div>', true);
    try {
      if (S.view === 'edit') { await saveNow(); if (S.latestSeq > S.savedSeq) throw new Error(JSON.stringify({ error: 'Changes could not be saved, so the preview would be out of date. Check your connection and try again.' })); }
      let blob;
      if (S.view === 'amend') {
        // Amendment edits are not stored until submitted; preview the current text without saving.
        blob = await previewAmendment();
      } else blob = (await fetchBlob(`&id=${encodeURIComponent(S.rec.id)}&preview=pdf`)).blob;
      const url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      ov.querySelector('.pp-modal > div:last-child').innerHTML = `<iframe class="cm-preview" title="Document preview" src="${url}" data-url="${url}"></iframe><div class="cm-nav"><small style="color:var(--rl-subtext)">Preview only — nothing has been submitted.</small><div class="cm-row" style="flex:0 0 auto">${S.view === 'edit' ? '<button class="rl-btn" type="button" id="cmPrevDocx">Download preview DOCX</button>' : ''}<button class="rl-btn primary" type="button" data-cm-close>Close preview</button></div></div>`;
      ov.querySelectorAll('[data-cm-close]').forEach(b => { b.onclick = closeOverlay; });
      const pd = $('cmPrevDocx'); if (pd) pd.onclick = async () => { const { blob: b, name } = await fetchBlob(`&id=${encodeURIComponent(S.rec.id)}&preview=docx`); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(u), 60000); };
    } catch (e) { ov.querySelector('.pp-modal > div:last-child').innerHTML = errHTML(errText(e)); }
  }
  async function previewAmendment() {
    const r = await apiFetch(API, { method: 'POST', body: JSON.stringify({ action: 'preview', property: currentProperty, id: S.rec.id, data: S.data }) });
    const bin = atob(r.pdf); const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: 'application/pdf' });
  }

  async function submitMeeting() {
    const btn = $('cmSubmit'); if (btn.disabled) return;
    const missing = clientMissing(S.data);
    if (missing.length) { S.invalid = missing.map(x => x[0]); $('cmSubmitMsg').innerHTML = errHTML({ error: 'Required before submitting:', missing: missing.map(x => x[1]) }); return; }
    const d = S.data;
    if (!confirm(`Submit this meeting record?\n\nResident: ${d.residentName}\nMeeting: ${fmtMeeting(d.meetingDateTime)}\n\nThe official DOCX and PDF will be generated and attached to the resident's profile. After submission, changes require an amendment with a reason.`)) return;
    btn.disabled = true; btn.textContent = 'Submitting…';
    document.querySelectorAll('#cmStepHost button').forEach(b => { b.disabled = true; });
    $('cmSubmitMsg').innerHTML = '<div class="rl-loading">Saving the record and generating the official documents… Do not close this page.</div>';
    try {
      clearTimeout(S.timer);
      if (S.inflight) await S.inflight.catch(() => {});
      const r = await apiFetch(API, { method: 'POST', body: JSON.stringify({ action: 'submit', property: currentProperty, id: S.rec.id, data: S.data }) });
      if (!r || !['submitted', 'amended'].includes(r.status)) throw new Error(JSON.stringify({ error: 'The server did not confirm the submission. The record remains a draft.' }));
      S.savedSeq = S.latestSeq;
      submittedScreen(r);
    } catch (e) {
      const j = errText(e);
      if (j.missing) S.invalid = clientMissing(S.data).map(x => x[0]);
      $('cmSubmitMsg').innerHTML = errHTML(Object.assign({}, j, { error: (j.error || 'Submission failed') + (e.status ? '' : ' (connection problem — the record was not confirmed as submitted)') }));
      document.querySelectorAll('#cmStepHost button').forEach(b => { b.disabled = false; });
      btn.textContent = 'Submit Meeting Record';
    }
  }
  function submittedScreen(r) {
    teardown();
    S = { view: 'view', rec: r, data: r.data, step: 6, saveState: 'saved', saveMsg: '', invalid: [] };
    const root = $('cmRoot');
    root.innerHTML = `<div class="cm-card"><div class="pg-ok" role="status">Meeting record submitted. The official DOCX and PDF were generated and attached to ${esc(r.data.residentName)}’s resident profile.</div>
      <dl class="rl-wizard-review"><dt>Resident</dt><dd>${esc(r.data.residentName)}</dd><dt>Meeting</dt><dd>${fmtMeeting(r.data.meetingDateTime)}</dd><dt>Submitted</dt><dd>${fmtDT(r.submittedAt)} by ${esc(r.submittedByName)}</dd><dt>Document version</dt><dd>v${r.documentVersion} · template ${esc(r.templateVersion)}</dd></dl>
      <div class="cm-row" style="margin-top:12px"><button class="rl-btn primary" type="button" id="cmGoRes">View in Resident Directory</button><button class="rl-btn" type="button" id="cmViewPdf">View PDF</button><button class="rl-btn" type="button" id="cmDlDocx">Download DOCX</button><button class="rl-btn" type="button" id="cmDlPdf">Download PDF</button><button class="rl-btn outline" type="button" id="cmBack">Back to dashboard</button></div></div>`;
    $('cmGoRes').onclick = () => openResidentProfile(r.data.residentId);
    $('cmViewPdf').onclick = () => viewPdf(r.id);
    $('cmDlDocx').onclick = () => download(r.id, 'docx');
    $('cmDlPdf').onclick = () => download(r.id, 'pdf');
    $('cmBack').onclick = () => { S = null; load(); };
  }
  async function openResidentProfile(residentId) {
    S = null;
    if (typeof goToTab === 'function') goToTab('directory');
    try { await ensureDirectory(); } catch (e) { /* */ }
    setTimeout(() => { if (typeof openResidentModal === 'function') { window.ConductUI.profileTab = 'conduct'; openResidentModal(residentId); } }, 300);
  }

  async function submitAmendment() {
    const btn = $('cmSubmit'); if (btn.disabled) return;
    const reason = ($('cmReason').value || '').trim();
    const missing = clientMissing(S.data).map(x => x[1]);
    if (reason.length < 5) missing.push('Reason for correction');
    if (missing.length) { $('cmSubmitMsg').innerHTML = errHTML({ error: 'Required before submitting the amendment:', missing }); return; }
    if (JSON.stringify(S.data) === S.original) { $('cmSubmitMsg').innerHTML = errHTML({ error: 'No changes have been made.' }); return; }
    if (!confirm('Submit this amendment? The original version and its documents are preserved; a new document version will be generated.')) return;
    btn.disabled = true; btn.textContent = 'Submitting…';
    try {
      const r = await apiFetch(API, { method: 'POST', body: JSON.stringify({ action: 'amend', property: currentProperty, id: S.rec.id, data: S.data, reason }) });
      S.original = JSON.stringify(S.data);
      submittedScreen(r);
      $('cmRoot').querySelector('.pg-ok').textContent = `Amendment saved as version ${r.documentVersion}. Prior versions remain in the amendment history.`;
    } catch (e) { $('cmSubmitMsg').innerHTML = errHTML(errText(e)); btn.disabled = false; btn.textContent = 'Submit Amendment'; }
  }

  // ---- Submitted record view ----
  function renderRecord(host) {
    const r = S.rec;
    host.innerHTML = `<div class="cm-card"><div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:center"><div><h3>Resident Accountability Meeting Record</h3><p class="cm-sub">${badge(r.status)} · v${r.documentVersion} · Submitted ${fmtDT(r.submittedAt)} by ${esc(r.submittedByName)}${r.lastAmendedAt ? ' · Last amended ' + fmtDT(r.lastAmendedAt) : ''}</p></div>
      <div class="cm-actions"><button class="rl-btn primary" type="button" id="cmRvPdf">View PDF</button><button class="rl-btn" type="button" id="cmRvDocx">Download DOCX</button><button class="rl-btn" type="button" id="cmRvDlPdf">Download PDF</button><button class="rl-btn" type="button" id="cmRvHist">Amendment History</button><button class="rl-btn outline" type="button" id="cmRvAmend">Amend</button><button class="rl-btn outline" type="button" id="cmRvRes">Resident profile</button></div></div>
      ${reviewHTML(r.data, false)}</div>`;
    $('cmRvPdf').onclick = () => viewPdf(r.id);
    $('cmRvDocx').onclick = () => download(r.id, 'docx');
    $('cmRvDlPdf').onclick = () => download(r.id, 'pdf');
    $('cmRvHist').onclick = () => showHistory(r.id);
    $('cmRvAmend').onclick = () => startSession(r, 'amend');
    $('cmRvRes').onclick = () => openResidentProfile(r.data.residentId);
  }

  async function showHistory(id) {
    const ov = overlay('Amendment history', 'Every version is preserved', '<div class="rl-loading">Loading…</div>', true);
    const body = ov.querySelector('.pp-modal > div:last-child');
    try {
      await meta();
      const h = await apiFetch(q('&id=' + encodeURIComponent(id) + '&history=1'));
      const val = v => Array.isArray(v) ? (v.length ? v.map(x => (x && x.name) || x).join('; ') : '(none)') : (v === '' || v == null ? '(blank)' : String(v));
      body.innerHTML = h.versions.slice().reverse().map(v => `<div class="cm-change"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap"><b>Version ${v.version} — ${v.kind === 'original' ? 'Original submission' : 'Amendment'}</b><span class="cm-actions"><button class="rl-btn sm" type="button" data-hv-pdf="${v.version}">PDF</button><button class="rl-btn sm" type="button" data-hv-docx="${v.version}">DOCX</button></span></div>
          <div style="color:var(--rl-subtext);font-size:12.5px">${fmtDT(v.at)} by ${esc(v.byName || v.by)} · template ${esc(v.templateVersion)}</div>
          ${v.reason ? `<div style="margin-top:6px"><b>Reason:</b> ${esc(v.reason)}</div>` : ''}
          ${(v.changes || []).map(c => `<div style="margin-top:6px"><b>${esc(c.label)}</b><div><del>${esc(val(c.before))}</del></div><div><ins>${esc(val(c.after))}</ins></div></div>`).join('')}</div>`).join('') +
        `<h4 class="cm-h4">Audit trail</h4><table class="rl-table"><thead><tr><th>When</th><th>Action</th><th>Staff</th><th>Detail</th></tr></thead><tbody>${h.audit.map(a => `<tr><td>${fmtDT(a.at)}</td><td>${esc(a.action.replace(/_/g, ' '))}</td><td>${esc(a.by)}</td><td>${esc(a.detail)}</td></tr>`).join('')}</tbody></table>`;
      body.querySelectorAll('[data-hv-pdf]').forEach(b => { b.onclick = () => viewPdf(id, b.dataset.hvPdf); });
      body.querySelectorAll('[data-hv-docx]').forEach(b => { b.onclick = () => download(id, 'docx', b.dataset.hvDocx); });
    } catch (e) { body.innerHTML = errHTML(errText(e)); }
  }

  // =====================================================================
  // RESIDENT PROFILE: "Conduct Meeting Records" section
  // =====================================================================
  async function renderResidentRecords(host, residentId) {
    if (!host) return;
    if (!canUse()) { host.innerHTML = ''; return; }
    host.innerHTML = '<div class="rl-loading">Loading conduct meeting records…</div>';
    try {
      const rows = (await apiFetch(q('&residentId=' + encodeURIComponent(residentId)))).sort((a, b) => String(b.meetingDateTime).localeCompare(String(a.meetingDateTime)));
      host.innerHTML = `<div class="res-sec-title">Conduct Meeting Records <span>${rows.length}</span></div>
        <div class="res-add"><button class="rl-btn primary" type="button" id="cmResNew">+ New Conduct Meeting for this resident</button></div>
        ${rows.length ? `<div class="dt-table-wrap"><table class="rl-table"><thead><tr><th>Meeting date</th><th>Incident / Violation</th><th>Status</th><th>Created by</th><th>Submitted</th><th>Last amended</th><th>Actions</th></tr></thead><tbody>${rows.map(m => `<tr>
          <td>${fmtMeeting(m.meetingDateTime)}<br><small>Bedspace at meeting: ${esc(m.bedspace || '—')}</small></td><td>${esc(m.incidentViolation)}</td><td>${badge(m.status)} <small>v${m.documentVersion}</small></td><td>${esc(m.createdByName)}</td><td>${fmtDT(m.submittedAt)}</td><td>${m.lastAmendedAt ? fmtDT(m.lastAmendedAt) : '—'}</td>
          <td><div class="cm-actions"><button class="rl-btn sm primary" type="button" data-rv="${m.id}">View Record</button><button class="rl-btn sm" type="button" data-rpdf="${m.id}">View PDF</button><button class="rl-btn sm" type="button" data-rdl="${m.id}" data-fmt="docx">Download DOCX</button><button class="rl-btn sm" type="button" data-rdl="${m.id}" data-fmt="pdf">Download PDF</button><button class="rl-btn sm" type="button" data-rh="${m.id}">Amendment History</button></div></td></tr>`).join('')}</tbody></table></div>` : '<div class="res-none">No submitted conduct meeting records for this resident.</div>'}`;
      $('cmResNew').onclick = () => { if (typeof closeResidentModal === 'function') closeResidentModal(); newMeeting(residentId); };
      host.querySelectorAll('[data-rv]').forEach(b => { b.onclick = () => { if (typeof closeResidentModal === 'function') closeResidentModal(); openMeeting(b.dataset.rv); }; });
      host.querySelectorAll('[data-rpdf]').forEach(b => { b.onclick = () => viewPdf(b.dataset.rpdf); });
      host.querySelectorAll('[data-rdl]').forEach(b => { b.onclick = () => download(b.dataset.rdl, b.dataset.fmt); });
      host.querySelectorAll('[data-rh]').forEach(b => { b.onclick = () => showHistory(b.dataset.rh); });
    } catch (e) { host.innerHTML = errHTML(errText(e)); }
  }

  window.ConductUI = {
    canUse, load, newMeeting, openMeeting, renderResidentRecords, profileTab: null,
    hasUnsaved: () => !!unsaved(),
    leave: () => { if (S) { if (S.view === 'edit') saveNow(); } },
  };
  document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('#cmNewBtn'); if (b) newMeeting(); });
})();
