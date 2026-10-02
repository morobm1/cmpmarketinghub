/* Creative Studio — Monthly Newsletter: dashboard/archive, modular editor, saved blocks, preview, Entrata export. */
(function (CS) {
  const NL = CS.nl;
  const esc = s => CS.esc(s);
  const API = '/reslife-newsletters';
  const STATUS = { draft: ['Draft', ''], review: ['Ready for Review', 'warn'], approved: ['Approved', 'ok'], sent: ['Sent', 'ok'], archived: ['Archived', ''] };
  const pill = s => `<span class="cs-chip ${STATUS[s] ? STATUS[s][1] : ''}">${esc(STATUS[s] ? STATUS[s][0] : s)}</span>`;
  const api = (path, opts) => CS.api(API + path, opts);
  const q = () => '?propertyId=' + encodeURIComponent(CS.propertyId);
  let list = [], blocks = [], E = null; // E = open editor state

  // ───────────────────────── DASHBOARD / ARCHIVE ─────────────────────────
  CS.views.newsletter = () => `
    <div class="cs-page-h" style="display:flex;justify-content:space-between;align-items:flex-end;gap:12px;flex-wrap:wrap">
      <div><h1>Monthly Newsletter</h1><p>Build ${esc(CS.cfg.name)}’s resident newsletter, save drafts, preview, and copy Entrata-ready HTML.</p></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="cs-btn ghost" id="nlBlocksBtn">Saved Blocks</button><button class="cs-btn ghost" id="nlDupBtn">Duplicate Previous Newsletter</button><button class="cs-btn" id="nlNewBtn">+ Create Monthly Newsletter</button></div>
    </div>
    <div class="cs-filters" id="nlFilters">
      <input class="cs-input" id="nlSearch" placeholder="Search newsletters…" style="max-width:260px">
      <select class="cs-select" id="nlFYear" style="width:auto"><option value="">All years</option></select>
      <select class="cs-select" id="nlFMonth" style="width:auto"><option value="">All months</option>${NL.MONTHS.map((m, i) => `<option value="${i + 1}">${m}</option>`).join('')}</select>
      <select class="cs-select" id="nlFStatus" style="width:auto"><option value="">All statuses</option>${Object.entries(STATUS).map(([k, v]) => `<option value="${k}">${v[0]}</option>`).join('')}</select>
    </div>
    <div id="nlList"><div class="cs-empty">Loading newsletters…</div></div>`;

  CS.views.after_newsletter = async (openId) => {
    CS.$('#nlNewBtn').onclick = () => createDialog();
    CS.$('#nlDupBtn').onclick = () => createDialog({ duplicate: true });
    CS.$('#nlBlocksBtn').onclick = blocksManager;
    ['nlSearch', 'nlFYear', 'nlFMonth', 'nlFStatus'].forEach(id => CS.$('#' + id).addEventListener(id === 'nlSearch' ? 'input' : 'change', drawList));
    await reloadList();
    if (openId) openEditor(openId);
  };

  async function reloadList() {
    try { list = await api(q()); } catch (e) { list = []; CS.$('#nlList') && (CS.$('#nlList').innerHTML = `<div class="cs-empty"><b>Couldn’t load newsletters</b>${esc(e.message)}</div>`); return; }
    const ys = [...new Set(list.map(n => n.year))].sort((a, b) => b - a);
    const sel = CS.$('#nlFYear'); if (sel) { const cur = sel.value; sel.innerHTML = '<option value="">All years</option>' + ys.map(y => `<option${String(y) === cur ? ' selected' : ''}>${y}</option>`).join(''); }
    drawList();
  }

  function drawList() {
    const box = CS.$('#nlList'); if (!box) return;
    const s = CS.$('#nlSearch').value.trim().toLowerCase(), fy = CS.$('#nlFYear').value, fm = CS.$('#nlFMonth').value, fs = CS.$('#nlFStatus').value;
    const rows = list.filter(n => (!fy || String(n.year) === fy) && (!fm || String(n.month) === fm) && (!fs || n.status === fs) && (!s || (n.title + ' ' + n.emailSubject).toLowerCase().includes(s)));
    if (!list.length) { box.innerHTML = '<div class="cs-empty"><b>No newsletters yet</b>Create your first monthly newsletter — The Harbour branding and default sections load automatically.</div>'; return; }
    if (!rows.length) { box.innerHTML = '<div class="cs-empty">No newsletters match these filters.</div>'; return; }
    const byYear = {};
    rows.forEach(n => (byYear[n.year] = byYear[n.year] || []).push(n));
    box.innerHTML = Object.keys(byYear).sort((a, b) => b - a).map(y => `<div class="nl-year">${y}</div><div class="nl-rows">${byYear[y].map(n => `
      <div class="nl-row" data-nl-open="${n.id}">
        <div class="nl-month"><b>${NL.MONTHS[n.month - 1].slice(0, 3)}</b><span>${n.year}</span></div>
        <div class="nl-main"><b>${esc(n.title)}</b><span>${pill(n.status)} · Edited ${new Date(n.updatedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}${n.updatedBy ? ' by ' + esc(n.updatedBy) : ''}${n.createdBy ? ' · created by ' + esc(n.createdBy) : ''}${n.sentAt ? ' · sent ' + new Date(n.sentAt).toLocaleDateString() : ''}</span></div>
        <div class="nl-acts">
          <button class="cs-btn xs" data-a="edit">Edit</button>
          <button class="cs-btn ghost xs" data-a="preview">Preview</button>
          <button class="cs-btn ghost xs" data-a="dup">Duplicate</button>
          <button class="cs-btn ghost xs" data-a="html">Export HTML</button>
          ${n.status !== 'sent' ? '<button class="cs-btn ghost xs" data-a="sent">Mark Sent</button>' : ''}
          ${n.status !== 'archived' ? '<button class="cs-btn ghost xs" data-a="archive">Archive</button>' : ''}
          <button class="cs-btn danger xs" data-a="delete">Delete</button>
        </div>
      </div>`).join('')}</div>`).join('');
    box.querySelectorAll('[data-nl-open]').forEach(row => row.addEventListener('click', async e => {
      const id = row.getAttribute('data-nl-open'), b = e.target.closest('[data-a]'), a = b ? b.getAttribute('data-a') : 'edit';
      e.stopPropagation();
      if (a === 'edit') return openEditor(id);
      if (a === 'dup') return createDialog({ duplicate: true, sourceId: id });
      const n = await api(q() + '&id=' + id).catch(err => { CS.toast(err.message); return null; }); if (!n) return;
      if (a === 'preview') return previewModal(n);
      if (a === 'html') return htmlModal(n);
      if (a === 'sent' || a === 'archive') { await setStatus(id, a === 'sent' ? 'sent' : 'archived'); return; }
      if (a === 'delete') { if (!confirm(`Delete “${n.title}”? This can’t be undone.`)) return; try { await api(q() + '&id=' + id, { method: 'DELETE' }); CS.toast('Deleted'); reloadList(); } catch (err) { CS.toast(err.message); } }
    }));
  }
  async function setStatus(id, status) {
    try { await api('', { method: 'PUT', body: JSON.stringify({ propertyId: CS.propertyId, id, status }) }); CS.toast('Marked ' + STATUS[status][0]); reloadList(); if (E && E.nl.id === id) { E.nl.status = status; drawTop(); } }
    catch (e) { CS.toast(e.message); }
  }

  function createDialog(opts) {
    opts = opts || {};
    const now = new Date(), next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const latest = list.slice().sort((a, b) => (b.year * 12 + b.month) - (a.year * 12 + a.month))[0];
    const src = opts.sourceId || (opts.duplicate && latest ? latest.id : '');
    const defTitle = (m, y) => `The Harbour Monthly Newsletter | ${NL.MONTHS[m - 1]} ${y}`;
    CS.modal(`<h2 style="margin:0 0 6px;color:var(--brand-primary)">${opts.duplicate ? 'Duplicate a Newsletter' : 'Create Monthly Newsletter'}</h2>
      <p style="margin:0 0 14px;color:var(--ui-muted);font-size:13.5px">${opts.duplicate ? 'Copies every section into a brand-new newsletter for the month you choose. The original stays untouched.' : 'The Harbour branding and default sections load automatically.'}</p>
      <div class="cs-row"><div class="cs-field"><label class="cs-label">Month</label><select class="cs-select" id="ncMonth">${NL.MONTHS.map((m, i) => `<option value="${i + 1}"${i === next.getMonth() ? ' selected' : ''}>${m}</option>`).join('')}</select></div>
      <div class="cs-field"><label class="cs-label">Year</label><input class="cs-input" type="number" id="ncYear" value="${next.getFullYear()}" min="2020" max="2100"></div></div>
      ${opts.duplicate ? `<div class="cs-field"><label class="cs-label">Copy from</label><select class="cs-select" id="ncSrc">${list.map(n => `<option value="${n.id}"${n.id === src ? ' selected' : ''}>${esc(n.title)} (${STATUS[n.status][0]})</option>`).join('') || '<option value="">No newsletters to copy yet</option>'}</select></div>` : ''}
      <div class="cs-field"><label class="cs-label">Newsletter title</label><input class="cs-input" id="ncTitle" value="${esc(defTitle(next.getMonth() + 1, next.getFullYear()))}"></div>
      <div id="ncWarn"></div>
      <button class="cs-btn" id="ncGo" style="width:100%">${opts.duplicate ? 'Create Copy' : 'Create Newsletter'}</button>`);
    const sync = () => {
      const m = +CS.$('#ncMonth').value, y = +CS.$('#ncYear').value, t = CS.$('#ncTitle');
      if (!t.dataset.touched) t.value = defTitle(m, y);
      const clash = list.find(n => n.month === m && n.year === y && n.status !== 'archived');
      CS.$('#ncWarn').innerHTML = clash ? `<div class="cs-verify" style="margin-bottom:10px;background:#fffbeb;color:#92400e;border-color:#fde68a">${NL.MONTHS[m - 1]} ${y} already has a newsletter (“${esc(clash.title)}”). A new one will be created separately — nothing is overwritten.</div>` : '';
    };
    CS.$('#ncMonth').onchange = sync; CS.$('#ncYear').oninput = sync; CS.$('#ncTitle').oninput = e => { e.target.dataset.touched = '1'; };
    sync();
    CS.$('#ncGo').onclick = async () => {
      const m = +CS.$('#ncMonth').value, y = +CS.$('#ncYear').value, title = CS.$('#ncTitle').value.trim() || defTitle(m, y);
      const body = { propertyId: CS.propertyId, action: 'create', month: m, year: y, title, emailSubject: title, preheader: `See what’s happening this month at The Harbour and around OCC.` };
      if (opts.duplicate) { const sid = CS.$('#ncSrc') && CS.$('#ncSrc').value; if (!sid) return CS.toast('Nothing to copy yet'); body.duplicateOf = sid; }
      else body.sections = NL.defaults(m, y);
      try {
        const n = await api('', { method: 'POST', body: JSON.stringify(body) });
        // Duplicates keep the source's sections but get this month's header label.
        if (opts.duplicate && n.sections) { const h = n.sections.find(s => s.type === 'header'); if (h) { h.content.monthLabel = `${NL.MONTHS[m - 1].toUpperCase()} ${y}`; await api('', { method: 'PUT', body: JSON.stringify({ propertyId: CS.propertyId, id: n.id, sections: n.sections }) }); } }
        CS.closeModal(); await reloadList(); openEditor(n.id);
      } catch (e) { CS.toast('Create failed: ' + e.message); }
    };
  }

  // ───────────────────────── EDITOR ─────────────────────────
  async function openEditor(id) {
    let nl; try { nl = await api(q() + '&id=' + id); } catch (e) { CS.toast(e.message); return; }
    // Recover unsaved work (e.g. lost connection / closed tab) from this browser's backup.
    try {
      const bk = JSON.parse(localStorage.getItem('nl_backup_' + id) || 'null');
      if (bk && bk.savedAt > nl.updatedAt && JSON.stringify(bk.data.sections) !== JSON.stringify(nl.sections) && confirm(`Unsaved changes from ${new Date(bk.savedAt).toLocaleString()} were found for this newsletter. Restore them?`)) Object.assign(nl, bk.data);
    } catch (e) {}
    try { blocks = await api(q() + '&resource=blocks'); } catch (e) { blocks = []; }
    E = { nl, sel: (nl.sections[0] || {}).id, dirty: false, timer: null, savedAt: nl.updatedAt, view: 'desktop' };
    const el = CS.$('#csBuilder');
    el.innerHTML = `
      <div class="cs-b-top nl-top">
        <button class="cs-btn ghost sm" id="nlBack">&larr; Newsletters</button>
        <div class="nl-top-title"><small>Monthly Newsletter</small><input class="cs-b-title" id="nlTitle" value="${esc(nl.title)}"></div>
        <select class="cs-select" id="nlStatus" style="width:auto;padding:7px 10px;font-size:13px">${Object.entries(STATUS).map(([k, v]) => `<option value="${k}"${k === 'approved' && !CS.isManager() ? ' disabled' : ''}>${v[0]}</option>`).join('')}</select>
        <span class="nl-saved" id="nlSaved"></span>
        <div class="nl-top-r">
          <button class="cs-btn ghost sm" id="nlImport">Import Sections</button>
          <button class="cs-btn ghost sm" id="nlPreview">Preview</button>
          <button class="cs-btn ghost sm" id="nlValidate">Validate</button>
          <button class="cs-btn ghost sm" id="nlTest">Send Test</button>
          <button class="cs-btn ghost sm" id="nlSave">Save Draft</button>
          <button class="cs-btn ghost sm" id="nlViewHtml">View HTML</button>
          <button class="cs-btn sm" id="nlCopy">Copy Entrata HTML</button>
        </div>
      </div>
      <div class="cs-b-body nl-body">
        <aside class="nl-left">
          <div class="nl-meta">
            <label class="cs-label">Email subject</label><input class="cs-input" id="nlSubject" value="${esc(nl.emailSubject || '')}">
            <label class="cs-label" style="margin-top:8px">Preheader text <span class="cs-count" id="nlPreCount"></span></label><input class="cs-input" id="nlPre" value="${esc(nl.preheader || '')}" maxlength="250">
          </div>
          <div class="nl-left-h"><b>Sections</b><button class="cs-btn xs" id="nlAdd">+ Add Section</button></div>
          <div id="nlSecList"></div>
        </aside>
        <div class="nl-canvas"><div class="cs-em-tabs nl-viewtabs"><button class="active" data-nlv="desktop">Desktop</button><button data-nlv="mobile">Mobile</button></div><div class="cs-em-frame nl-frame" id="nlFrameWrap"><iframe id="nlFrame" title="Newsletter canvas"></iframe></div><p class="nl-hint">Click any part of the newsletter to edit that section.</p></div>
        <aside class="nl-right" id="nlRight"></aside>
      </div>`;
    el.classList.remove('hidden'); document.body.style.overflow = 'hidden';
    const $ = s => el.querySelector(s);
    $('#nlBack').onclick = closeEditor;
    $('#nlTitle').oninput = e => { E.nl.title = e.target.value; dirty(false); };
    $('#nlSubject').oninput = e => { E.nl.emailSubject = e.target.value; dirty(false); };
    $('#nlPre').oninput = e => { E.nl.preheader = e.target.value; preCount(); dirty(false); };
    $('#nlStatus').value = nl.status;
    $('#nlStatus').onchange = async e => { const v = e.target.value; await save(true); await setStatus(E.nl.id, v); };
    $('#nlAdd').onclick = addSectionDialog;
    $('#nlImport').onclick = importDialog;
    $('#nlPreview').onclick = () => previewModal(E.nl);
    $('#nlValidate').onclick = () => validateModal(E.nl);
    $('#nlTest').onclick = () => sendTestModal(E.nl);
    $('#nlSave').onclick = () => save(true).then(() => CS.toast('Draft saved'));
    $('#nlViewHtml').onclick = () => htmlModal(E.nl);
    $('#nlCopy').onclick = () => copyEntrata(E.nl);
    el.querySelectorAll('[data-nlv]').forEach(b => b.onclick = () => { E.view = b.getAttribute('data-nlv'); el.querySelectorAll('[data-nlv]').forEach(x => x.classList.toggle('active', x === b)); $('#nlFrameWrap').classList.toggle('mobile', E.view === 'mobile'); drawCanvas(); });
    window.addEventListener('beforeunload', beforeUnload);
    preCount(); drawTop(); drawList2(); drawCanvas(); drawRight();
  }
  const beforeUnload = e => { if (E && E.dirty) { e.preventDefault(); e.returnValue = ''; } };
  function preCount() { const n = (E.nl.preheader || '').length; const c = CS.$('#nlPreCount'); if (c) { c.textContent = `${n} chars${n > 110 ? ' · keep it under ~110' : ''}`; c.classList.toggle('over', n > 110); } }
  async function closeEditor() {
    if (E && E.dirty) await save(true);
    window.removeEventListener('beforeunload', beforeUnload);
    CS.$('#csBuilder').classList.add('hidden'); CS.$('#csBuilder').innerHTML = ''; document.body.style.overflow = '';
    E = null; CS.go('newsletter');
  }
  function drawTop() { const s = CS.$('#nlStatus'); if (s && E) s.value = E.nl.status; }

  // Auto-save: debounce edits, back up to localStorage immediately.
  function dirty(redraw) {
    E.dirty = true;
    try { localStorage.setItem('nl_backup_' + E.nl.id, JSON.stringify({ savedAt: new Date().toISOString(), data: { title: E.nl.title, emailSubject: E.nl.emailSubject, preheader: E.nl.preheader, sections: E.nl.sections } })); } catch (e) {}
    CS.$('#nlSaved').textContent = 'Unsaved changes…'; CS.$('#nlSaved').className = 'nl-saved pending';
    clearTimeout(E.timer); E.timer = setTimeout(() => save(false), 1500);
    if (redraw !== false) drawCanvas();
  }
  async function save(force) {
    if (!E || (!E.dirty && !force)) return;
    clearTimeout(E.timer);
    const ind = CS.$('#nlSaved'); if (ind) { ind.textContent = 'Saving…'; ind.className = 'nl-saved pending'; }
    try {
      const r = await api('', { method: 'PUT', body: JSON.stringify({ propertyId: CS.propertyId, id: E.nl.id, title: E.nl.title, emailSubject: E.nl.emailSubject, preheader: E.nl.preheader, sections: E.nl.sections }) });
      E.dirty = false; E.nl.updatedAt = r.updatedAt;
      try { localStorage.removeItem('nl_backup_' + E.nl.id); } catch (e) {}
      if (ind) { ind.textContent = 'Draft saved at ' + new Date(r.updatedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); ind.className = 'nl-saved ok'; }
    } catch (e) { if (ind) { ind.textContent = 'Not saved — ' + e.message + ' (your work is backed up in this browser)'; ind.className = 'nl-saved err'; } }
  }

  // Left: section list with reorder/hide/duplicate/delete
  function drawList2() {
    const box = CS.$('#nlSecList'); if (!box) return;
    box.innerHTML = E.nl.sections.map((s, i) => { const t = NL.TYPES[s.type] || NL.TYPES.custom; const label = (s.content && (s.content.heading || s.content.title)) || t.name; return `
      <div class="nl-sec${s.id === E.sel ? ' on' : ''}${s.visible === false ? ' off' : ''}" data-sec="${s.id}" draggable="true">
        <span class="nl-grip" title="Drag to reorder"></span>
        <div class="nl-sec-txt"><b>${esc(String(label).replace(/\[\[|\]\]/g, ''))}</b><small>${esc(t.name)}${s.visible === false ? ' · hidden' : ''}</small></div>
        <div class="nl-sec-btns">
          <button title="Move up" data-x="up"${i === 0 ? ' disabled' : ''}>&#8593;</button><button title="Move down" data-x="down"${i === E.nl.sections.length - 1 ? ' disabled' : ''}>&#8595;</button>
          <button title="${s.visible === false ? 'Show' : 'Hide'}" data-x="vis">${s.visible === false ? 'Show' : 'Hide'}</button>
          <button title="Duplicate" data-x="dup">Copy</button><button title="Delete" data-x="del">Delete</button>
        </div></div>`; }).join('') || '<div class="cs-empty" style="padding:14px">No sections — click + Add Section.</div>';
    box.querySelectorAll('[data-sec]').forEach(row => {
      const id = row.getAttribute('data-sec');
      row.onclick = e => {
        const x = e.target.closest('[data-x]'); const idx = E.nl.sections.findIndex(s => s.id === id); const s = E.nl.sections[idx];
        if (!x) { E.sel = id; drawList2(); drawRight(); scrollCanvasTo(id); return; }
        const a = x.getAttribute('data-x');
        if (a === 'up' && idx > 0) [E.nl.sections[idx - 1], E.nl.sections[idx]] = [E.nl.sections[idx], E.nl.sections[idx - 1]];
        if (a === 'down' && idx < E.nl.sections.length - 1) [E.nl.sections[idx + 1], E.nl.sections[idx]] = [E.nl.sections[idx], E.nl.sections[idx + 1]];
        if (a === 'vis') s.visible = s.visible === false;
        if (a === 'dup') { const c = JSON.parse(JSON.stringify(s)); c.id = NL.uid(); E.nl.sections.splice(idx + 1, 0, c); E.sel = c.id; }
        if (a === 'del') { if (!confirm(`Delete the “${(NL.TYPES[s.type] || {}).name}” section? (Use the eye icon to hide it instead.)`)) return; E.nl.sections.splice(idx, 1); if (E.sel === id) E.sel = (E.nl.sections[idx] || E.nl.sections[idx - 1] || {}).id; }
        drawList2(); drawRight(); dirty();
      };
      row.addEventListener('dragstart', e => { e.dataTransfer.setData('text/plain', id); row.classList.add('drag'); });
      row.addEventListener('dragend', () => row.classList.remove('drag'));
      row.addEventListener('dragover', e => { e.preventDefault(); row.classList.add('over'); });
      row.addEventListener('dragleave', () => row.classList.remove('over'));
      row.addEventListener('drop', e => {
        e.preventDefault(); row.classList.remove('over');
        const from = E.nl.sections.findIndex(s => s.id === e.dataTransfer.getData('text/plain')), to = E.nl.sections.findIndex(s => s.id === id);
        if (from < 0 || from === to) return;
        const [m] = E.nl.sections.splice(from, 1); E.nl.sections.splice(to, 0, m); drawList2(); dirty();
      });
    });
  }

  // Center: live canvas — the exact export HTML (placeholders highlighted), click-to-select sections.
  function drawCanvas() {
    const f = CS.$('#nlFrame'); if (!f) return;
    const y = f.contentWindow ? f.contentWindow.scrollY : 0;
    f.onload = () => {
      const d = f.contentDocument; if (!d) return;
      d.querySelectorAll('a').forEach(a => a.addEventListener('click', ev => ev.preventDefault()));
      d.querySelectorAll('tr[id^="nl-"]').forEach(tr => {
        const sid = tr.id.slice(3);
        tr.style.cursor = 'pointer';
        if (sid === E.sel) tr.style.outline = '3px solid #F99239';
        tr.addEventListener('mouseenter', () => { if (sid !== E.sel) tr.style.outline = '2px dashed rgba(249,146,57,.7)'; });
        tr.addEventListener('mouseleave', () => { if (sid !== E.sel) tr.style.outline = ''; });
        tr.addEventListener('click', ev => { ev.preventDefault(); E.sel = sid; drawList2(); drawRight(); drawCanvas(); });
      });
      f.style.height = Math.max(700, d.documentElement.scrollHeight + 20) + 'px';
      try { f.contentWindow.scrollTo(0, y); } catch (e) {}
    };
    f.srcdoc = NL.render(E.nl, { highlightPlaceholders: true });
  }
  function scrollCanvasTo(id) { const d = CS.$('#nlFrame').contentDocument; const tr = d && d.getElementById('nl-' + id); if (tr) { tr.scrollIntoView({ behavior: 'smooth', block: 'start' }); drawCanvas(); } }

  // Right: selected section settings (generated from the schema)
  function drawRight() {
    const box = CS.$('#nlRight'); if (!box) return;
    const s = E.nl.sections.find(x => x.id === E.sel);
    if (!s) { box.innerHTML = '<div class="cs-empty" style="margin:14px">Select a section to edit it.</div>'; return; }
    const t = NL.TYPES[s.type] || NL.TYPES.custom;
    s.content = s.content || {};
    box.innerHTML = `
      <div class="nl-right-h"><div><b>${esc(t.name)}</b><small>${esc(t.desc || '')}${s.visible === false ? ' · Hidden — won’t be exported' : ''}</small></div></div>
      <div class="nl-fields">${t.fields.map(f => fieldHTML(f, s.content[f.key], f.key)).join('') || '<p class="cs-hint">This section has no settings.</p>'}</div>
      <div class="nl-right-foot"><button class="cs-btn ghost sm" id="nlSaveBlock">Save as reusable block</button></div>`;
    bindFields(box, s);
    box.querySelector('#nlSaveBlock').onclick = () => {
      const name = prompt('Name this saved block (e.g. “Service Request Instructions”):', (s.content.heading || t.name)); if (!name) return;
      const category = prompt('Category (optional):', t.name) || t.name;
      api('', { method: 'POST', body: JSON.stringify({ propertyId: CS.propertyId, resource: 'blocks', name, category, sectionType: s.type, content: s.content }) }).then(b => { blocks.push(b); CS.toast('Saved to Saved Blocks'); }).catch(e => CS.toast(e.message));
    };
  }

  const AI_ACTIONS = ['Improve Writing', 'Shorten', 'Make Friendlier', 'Make More Professional', 'Create Headline', 'Create CTA', 'Rewrite for Residents'];
  function fieldHTML(f, v, path) {
    const id = 'nlf_' + path.replace(/[^a-z0-9]/gi, '_');
    if (f.kind === 'items') {
      const items = Array.isArray(v) ? v : [];
      return `<div class="nl-items"><div class="nl-items-h"><label class="cs-label">${esc(f.label)}</label><button type="button" class="cs-btn xs" data-add-item="${esc(path)}">+ Add ${esc(f.itemLabel)}</button></div>
        ${items.map((it, i) => `<div class="nl-item" data-item="${i}"><div class="nl-item-h"><b>${esc(f.itemLabel)} ${i + 1}</b><span><button type="button" data-item-x="up" data-i="${i}"${i === 0 ? ' disabled' : ''}>&#8593;</button><button type="button" data-item-x="down" data-i="${i}"${i === items.length - 1 ? ' disabled' : ''}>&#8595;</button><button type="button" data-item-x="dup" data-i="${i}">Copy</button><button type="button" data-item-x="del" data-i="${i}">Remove</button></span></div>
          ${f.sub.map(sf => fieldHTML(sf, it[sf.key], `${path}.${i}.${sf.key}`)).join('')}</div>`).join('') || '<p class="cs-hint">None yet.</p>'}</div>`;
    }
    if (f.kind === 'image' || f.kind === 'image') {
      const im = v || null;
      return `<div class="cs-field"><label class="cs-label">${esc(f.label)}</label><div class="nl-img">${im && im.src ? `<img src="${esc(im.src)}" alt="">` : '<div class="nl-img-empty">No image</div>'}<div class="nl-img-btns"><button type="button" class="cs-btn xs" data-img="${esc(path)}">${im && im.src ? 'Replace' : 'Choose / Upload'}</button>${im && im.src ? `<button type="button" class="cs-btn ghost xs" data-img-rm="${esc(path)}">Remove</button>` : ''}</div></div>
        ${im && im.src ? `<input class="cs-input" data-path="${esc(path)}.alt" value="${esc(im.alt || '')}" placeholder="Alt text (describe the image)" style="margin-top:6px"><input class="cs-input" data-path="${esc(path)}.link" value="${esc(im.link || '')}" placeholder="Image link (optional)" style="margin-top:6px">` : ''}</div>`;
    }
    if (f.kind === 'select') return `<div class="cs-field"><label class="cs-label">${esc(f.label)}</label><select class="cs-select" data-path="${esc(path)}"><option value=""></option>${f.options.map(o => `<option${o === v ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select></div>`;
    if (f.kind === 'textarea') return `<div class="cs-field"><label class="cs-label">${esc(f.label)} <small style="text-transform:none;font-weight:600;color:var(--ui-muted)">**bold**</small></label><textarea class="cs-textarea" id="${id}" data-path="${esc(path)}" style="min-height:90px">${esc(v || '')}</textarea>
      <details class="nl-ai"><summary>AI writing help</summary><div class="cs-ai-actions">${AI_ACTIONS.map(a => `<button type="button" data-ai="${esc(path)}" data-act="${a}">${a}</button>`).join('')}</div><div class="nl-ai-out" data-ai-out="${esc(path)}"></div></details></div>`;
    const type = f.kind === 'date' ? 'date' : f.kind === 'time' ? 'time' : f.kind === 'url' ? 'url' : 'text';
    return `<div class="cs-field"><label class="cs-label">${esc(f.label)}</label><input class="cs-input" type="${type}" data-path="${esc(path)}" value="${esc(v || '')}"${f.kind === 'url' ? ' placeholder="https://…"' : ''}></div>`;
  }
  const getPath = (obj, path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
  function setPath(obj, path, val) { const ks = path.split('.'); let o = obj; ks.slice(0, -1).forEach((k, i) => { if (o[k] == null) o[k] = /^\d+$/.test(ks[i + 1]) ? [] : {}; o = o[k]; }); o[ks[ks.length - 1]] = val; }

  function bindFields(box, s) {
    box.querySelectorAll('[data-path]').forEach(inp => inp.addEventListener('input', () => { setPath(s.content, inp.getAttribute('data-path'), inp.value); dirty(); if (/heading|title/.test(inp.getAttribute('data-path'))) drawList2(); }));
    box.querySelectorAll('[data-add-item]').forEach(b => b.onclick = () => { const p = b.getAttribute('data-add-item'); const arr = getPath(s.content, p) || []; arr.push({}); setPath(s.content, p, arr); drawRight(); dirty(); });
    box.querySelectorAll('[data-item-x]').forEach(b => b.onclick = () => {
      const holder = b.closest('.nl-items'); const p = holder.querySelector('[data-add-item]').getAttribute('data-add-item'); const arr = getPath(s.content, p) || []; const i = +b.getAttribute('data-i'); const a = b.getAttribute('data-item-x');
      if (a === 'up' && i > 0) [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
      if (a === 'down' && i < arr.length - 1) [arr[i + 1], arr[i]] = [arr[i], arr[i + 1]];
      if (a === 'dup') arr.splice(i + 1, 0, JSON.parse(JSON.stringify(arr[i])));
      if (a === 'del') { if (!confirm('Remove this item?')) return; arr.splice(i, 1); }
      drawRight(); dirty();
    });
    box.querySelectorAll('[data-img]').forEach(b => b.onclick = () => CS.pickImage(im => { setPath(s.content, b.getAttribute('data-img'), im); drawRight(); dirty(); }));
    box.querySelectorAll('[data-img-rm]').forEach(b => b.onclick = () => { setPath(s.content, b.getAttribute('data-img-rm'), null); drawRight(); dirty(); });
    // AI: suggestions must be approved before they replace the text.
    box.querySelectorAll('[data-ai]').forEach(b => b.onclick = async () => {
      const p = b.getAttribute('data-ai'), act = b.getAttribute('data-act'), out = box.querySelector(`[data-ai-out="${p}"]`);
      const cur = String(getPath(s.content, p) || '').trim();
      if (!cur) { out.innerHTML = '<div class="cs-hint">Write a draft first, then choose how to improve it.</div>'; return; }
      out.innerHTML = '<div class="cs-hint">Writing…</div>';
      const r = await NL.aiAssist(cur, act, s.content.heading || s.content.headline || '');
      const sug = String(r.text || '').trim();
      if (!sug || sug === cur) { out.innerHTML = `<div class="cs-hint">No changes suggested for “${esc(act)}” — your text already reads well.</div>`; return; }
      const facts = t => (String(t).match(/https?:\/\/\S+|\b\d[\d,:./-]*\b|\$\d+/g) || []).sort().join('|');
      const changedFacts = !/Create/.test(act) && facts(cur) !== facts(sug);
      out.innerHTML = `<div class="nl-ai-sug">${esc(sug)}</div><div class="cs-hint" style="margin-top:4px">${r.source === 'ai' ? 'Suggested by AI' : 'Suggested by the built-in writer'} · review before using</div>${changedFacts ? '<div class="cs-verify" style="margin-top:6px">Heads up: this changed a date, number, price or link. Check it carefully.</div>' : ''}<div style="display:flex;gap:6px;margin-top:6px"><button type="button" class="cs-btn xs" data-ai-use>Use this</button><button type="button" class="cs-btn ghost xs" data-ai-no>Discard</button></div>`;
      out.querySelector('[data-ai-use]').onclick = () => {
        if (/Create Headline|Create CTA/.test(act)) { const hk = s.content.heading !== undefined ? 'heading' : (s.content.headline !== undefined ? 'headline' : null); if (act === 'Create Headline' && hk) { s.content[hk] = sug; } else if (act === 'Create CTA') { const ck = ['cta', 'buttonLabel', 'linkLabel'].find(k => k in s.content) || 'cta'; s.content[ck] = sug; } else setPath(s.content, p, sug); }
        else setPath(s.content, p, sug);
        drawRight(); drawList2(); dirty();
      };
      out.querySelector('[data-ai-no]').onclick = () => { out.innerHTML = ''; };
    });
  }

  // Image picker: property photo library or upload (hosted → absolute URL for email)
  function imagePicker(done) {
    const photos = (CS.cfg.photos || []).filter(p => p.kind !== 'upload');
    CS.modal(`<h2 style="margin:0 0 6px;color:var(--brand-primary)">Choose an image</h2><p style="margin:0 0 12px;color:var(--ui-muted);font-size:13.5px">Pick a Harbour photo or upload your own. Images keep their original proportions.</p>
      <div class="nl-photo-grid">${photos.map(p => `<button type="button" data-ph="${esc(p.id)}" title="${esc(p.alt)}"><img src="${esc(p.src)}" alt=""><span>${esc(p.category)}</span></button>`).join('')}</div>
      <div class="cs-field" style="margin-top:14px"><label class="cs-label">Upload an image (JPG/PNG, resized automatically)</label><input type="file" id="nlUp" accept="image/*" class="cs-input"></div><div id="nlUpMsg"></div>`);
    CS.$('#csModalBody').querySelectorAll('[data-ph]').forEach(b => b.onclick = () => { const p = photos.find(x => x.id === b.getAttribute('data-ph')); CS.closeModal(); done({ src: location.origin + p.src, alt: p.alt, link: '' }); });
    CS.$('#nlUp').onchange = async e => {
      const f = e.target.files[0]; if (!f) return;
      CS.$('#nlUpMsg').innerHTML = '<div class="cs-hint">Uploading…</div>';
      try {
        const data = await new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => { const im = new Image(); im.onload = () => { const sc = Math.min(1, 1360 / im.width); const c = document.createElement('canvas'); c.width = Math.round(im.width * sc); c.height = Math.round(im.height * sc); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); res(c.toDataURL('image/jpeg', 0.82)); }; im.onerror = rej; im.src = fr.result; }; fr.onerror = rej; fr.readAsDataURL(f); });
        const r = await api('', { method: 'POST', body: JSON.stringify({ propertyId: CS.propertyId, action: 'image', data, name: f.name }) });
        CS.closeModal(); done({ src: r.url, alt: '', link: '' });
      } catch (err) { CS.$('#nlUpMsg').innerHTML = `<div class="cs-verify">Upload failed: ${esc(err.message)}</div>`; }
    };
  }

  // Add Section: library + saved blocks
  function addSectionDialog() {
    const byGroup = NL.GROUPS.map(g => [g, NL.LIBRARY.filter(([, type]) => NL.TYPES[type].group === g)]).filter(([, l]) => l.length);
    CS.modal(`<h2 style="margin:0 0 4px;color:var(--brand-primary)">Add a section</h2><p style="margin:0 0 12px;color:var(--ui-muted);font-size:13.5px">Sections are inserted below the one you have selected.</p>
      ${byGroup.map(([g, l]) => `<div class="nl-lib-g">${esc(g)}</div><div class="nl-lib">${l.map(([label, type]) => `<button type="button" data-lib="${type}"><b>${esc(label)}</b><small>${esc(NL.TYPES[type].desc || '')}</small></button>`).join('')}</div>`).join('')}
      <div class="nl-lib-g">Saved Newsletter Blocks</div>
      ${blocks.length ? `<div class="nl-lib">${blocks.map(b => `<button type="button" data-blk="${b.id}"><b>${esc(b.name)}</b><small>${esc(b.category)} · ${esc((NL.TYPES[b.sectionType] || {}).name || b.sectionType)}</small></button>`).join('')}</div>` : '<p class="cs-hint">No saved blocks yet. Use “Save as reusable block” on any section.</p>'}`);
    CS.$('#csModal .cs-modal-box').style.maxWidth = '920px';
    const insert = sec => { const idx = E.nl.sections.findIndex(s => s.id === E.sel); const footerIdx = E.nl.sections.findIndex(s => s.type === 'footer'); const at = idx >= 0 ? idx + 1 : (footerIdx >= 0 ? footerIdx : E.nl.sections.length); E.nl.sections.splice(at, 0, sec); E.sel = sec.id; CS.closeModal(); drawList2(); drawRight(); dirty(); setTimeout(() => scrollCanvasTo(sec.id), 300); };
    CS.$('#csModalBody').querySelectorAll('[data-lib]').forEach(b => b.onclick = () => insert(NL.newSection(b.getAttribute('data-lib'))));
    CS.$('#csModalBody').querySelectorAll('[data-blk]').forEach(b => b.onclick = () => { const blk = blocks.find(x => x.id === b.getAttribute('data-blk')); insert(NL.newSection(blk.sectionType, blk.content)); });
  }

  // Import selected sections from a previous newsletter
  async function importDialog() {
    const others = list.filter(n => n.id !== E.nl.id);
    if (!others.length) return CS.toast('No other newsletters to import from yet');
    CS.modal(`<h2 style="margin:0 0 6px;color:var(--brand-primary)">Import Sections From Previous Newsletter</h2>
      <div class="cs-field"><label class="cs-label">From</label><select class="cs-select" id="imSrc">${others.map(n => `<option value="${n.id}">${esc(n.title)}</option>`).join('')}</select></div>
      <div id="imSecs"><div class="cs-hint">Loading…</div></div><button class="cs-btn" id="imGo" style="width:100%;margin-top:12px">Import Selected Sections</button>`);
    let src = null;
    const load = async () => {
      src = await api(q() + '&id=' + CS.$('#imSrc').value).catch(() => null);
      const recurring = ['quicklinks', 'footer', 'maintenance', 'occ', 'campus', 'social', 'reminders', 'tips', 'resource'];
      CS.$('#imSecs').innerHTML = src ? src.sections.map((s, i) => `<label class="nl-imp"><input type="checkbox" value="${i}"${recurring.includes(s.type) ? ' checked' : ''}> <b>${esc((NL.TYPES[s.type] || {}).name || s.type)}</b> <small>${esc((s.content && (s.content.heading || s.content.title)) || '')}</small></label>`).join('') : '<div class="cs-verify">Couldn’t load that newsletter.</div>';
    };
    CS.$('#imSrc').onchange = load; await load();
    CS.$('#imGo').onclick = () => {
      if (!src) return;
      const picks = [...CS.$('#imSecs').querySelectorAll('input:checked')].map(c => src.sections[+c.value]);
      if (!picks.length) return CS.toast('Choose at least one section');
      picks.forEach(p => {
        const copy = JSON.parse(JSON.stringify(p)); copy.id = NL.uid();
        const same = E.nl.sections.findIndex(s => s.type === p.type && ['quicklinks', 'footer', 'maintenance', 'social', 'header', 'masthead', 'contents'].includes(p.type));
        if (same >= 0) E.nl.sections[same] = copy; // replace singletons like the footer instead of duplicating
        else { const fi = E.nl.sections.findIndex(s => s.type === 'footer'); E.nl.sections.splice(fi >= 0 ? fi : E.nl.sections.length, 0, copy); }
      });
      CS.closeModal(); drawList2(); drawRight(); dirty(); CS.toast(`Imported ${picks.length} section${picks.length > 1 ? 's' : ''}`);
    };
  }

  // ───────────────────────── PREVIEW / HTML / VALIDATE / TEST ─────────────────────────
  function previewModal(nl) {
    const html = NL.render(nl);
    CS.modal(`<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:10px"><div><h2 style="margin:0;color:var(--brand-primary)">${esc(nl.title)}</h2><div style="font-size:13px;color:var(--ui-muted)"><b>Subject:</b> ${esc(nl.emailSubject || '')} · <b>Preheader:</b> ${esc(nl.preheader || '')}</div></div>
      <div class="cs-em-tabs" style="margin:0"><button class="active" data-pv="desktop">Desktop</button><button data-pv="mobile">Mobile</button><button data-pv="text">Plain Text</button></div></div>
      <div class="cs-em-frame" id="pvWrap"><iframe id="pvFrame" title="Newsletter preview" style="height:72vh"></iframe></div><pre id="pvText" class="nl-plain hidden"></pre>
      <p class="cs-hint">This preview uses the exact HTML that will be exported.</p>`);
    CS.$('#csModal .cs-modal-box').style.maxWidth = '1000px';
    CS.$('#pvFrame').srcdoc = html; CS.$('#pvText').textContent = NL.plainText(nl);
    CS.$('#csModalBody').querySelectorAll('[data-pv]').forEach(b => b.onclick = () => { const v = b.getAttribute('data-pv'); CS.$('#csModalBody').querySelectorAll('[data-pv]').forEach(x => x.classList.toggle('active', x === b)); CS.$('#pvWrap').classList.toggle('hidden', v === 'text'); CS.$('#pvText').classList.toggle('hidden', v !== 'text'); CS.$('#pvWrap').classList.toggle('mobile', v === 'mobile'); });
  }
  function validateResultHTML(nl) {
    const issues = NL.validate(nl, NL.render(nl));
    return issues.length ? `<div class="cs-verify" style="background:#fffbeb;color:#92400e;border-color:#fde68a"><b>Fix before sending (${issues.length}):</b><ul style="margin:6px 0 0 18px;padding:0">${issues.map(i => `<li>${esc(i)}</li>`).join('')}</ul></div>` : '<div class="cs-verify" style="background:#f0fdf4;color:#166534;border-color:#bbf7d0"><b>✓ Ready for Entrata</b> — no issues found.</div>';
  }
  function validateModal(nl) { CS.modal(`<h2 style="margin:0 0 10px;color:var(--brand-primary)">Validate Entrata HTML</h2>${validateResultHTML(nl)}<p class="cs-hint" style="margin-top:10px">Checks: subject & preheader, image URLs and alt text, empty links, scripts/forms, non-inlined CSS, width over 680px, contact info, unfilled placeholders and terminology.</p>`); }
  async function copyEntrata(nl) {
    if (E && E.nl === nl) await save(false);
    const html = NL.render(nl), issues = NL.validate(nl, html);
    if (issues.length && !confirm(`Validation found ${issues.length} item(s) to review:\n\n• ${issues.slice(0, 6).join('\n• ')}${issues.length > 6 ? '\n…' : ''}\n\nCopy the HTML anyway?`)) return;
    CS.copy(html);
    CS.toast('Entrata HTML copied — paste it into Message Center’s HTML/source view');
  }
  function htmlModal(nl) {
    const html = NL.render(nl);
    CS.modal(`<h2 style="margin:0 0 6px;color:var(--brand-primary)">Entrata HTML</h2><p style="margin:0 0 10px;color:var(--ui-muted);font-size:13.5px">Paste this into Entrata Message Center’s HTML / source editor. Use “${esc(nl.emailSubject || '')}” as the subject.</p>
      ${validateResultHTML(nl)}
      <textarea class="cs-textarea" readonly style="min-height:46vh;font-family:Consolas,monospace;font-size:11.5px;margin-top:10px" id="hxCode">${esc(html)}</textarea>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px"><button class="cs-btn" id="hxCopy">Copy HTML</button><button class="cs-btn ghost" id="hxDl">Download .html</button><button class="cs-btn ghost" id="hxPv">Preview HTML</button></div>`);
    CS.$('#csModal .cs-modal-box').style.maxWidth = '1000px';
    CS.$('#hxCopy').onclick = () => CS.copy(html);
    CS.$('#hxDl').onclick = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([html], { type: 'text/html' })); a.download = `harbour-newsletter-${nl.year}-${String(nl.month).padStart(2, '0')}.html`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); };
    CS.$('#hxPv').onclick = () => previewModal(nl);
  }
  function sendTestModal(nl) {
    CS.modal(`<h2 style="margin:0 0 6px;color:var(--brand-primary)">Send Test Email</h2><p style="margin:0 0 10px;color:var(--ui-muted);font-size:13.5px">Sends this newsletter (with “[TEST]” in the subject) through the Hub’s existing email service.</p>
      <div class="cs-field"><label class="cs-label">Send to</label><input class="cs-input" id="stTo" value="${esc((CS.user && CS.user.email) || '')}" placeholder="you@capstonemp.com, teammate@…"></div>
      <button class="cs-btn" id="stGo">Send Test</button><div id="stMsg" style="margin-top:10px"></div>`);
    CS.$('#stGo').onclick = async () => {
      CS.$('#stGo').disabled = true; CS.$('#stMsg').innerHTML = '<div class="cs-hint">Sending…</div>';
      try { const r = await api('', { method: 'POST', body: JSON.stringify({ propertyId: CS.propertyId, action: 'sendTest', to: CS.$('#stTo').value, subject: nl.emailSubject || nl.title, html: NL.render(nl) }) }); CS.$('#stMsg').innerHTML = `<div class="cs-verify" style="background:#f0fdf4;color:#166534;border-color:#bbf7d0">${esc(r.message)}</div>`; }
      catch (e) { let m = e.message; try { m = JSON.parse(m).message; } catch (x) {} CS.$('#stMsg').innerHTML = `<div class="cs-verify">${esc(m)}</div>`; }
      CS.$('#stGo').disabled = false;
    };
  }

  // ───────────────────────── SAVED BLOCKS MANAGER ─────────────────────────
  async function blocksManager() {
    try { blocks = await api(q() + '&resource=blocks'); } catch (e) { blocks = []; }
    const starters = [['Service Request Instructions', 'maintenance'], ['Pest Control Reminder', 'tips', { heading: 'Pest Prevention', items: [{ title: 'Keep pests out', body: 'Take out trash often, store food in sealed containers and report pests through the resident portal.' }] }], ['Quiet Hours', 'tips', { heading: 'Quiet Hours', items: [{ title: 'Quiet hours', body: '[[Quiet hours times]] — please keep noise down so everyone can rest and study.' }] }], ['Emergency Contact Information', 'news', { heading: 'Emergency Contacts', items: [{ title: 'In an emergency, call 911', body: '[[After-hours / on-call number]]' }] }], ['Resident Portal', 'ctaBanner', { heading: 'Your Resident Portal', body: 'Pay, submit service requests and stay up to date.', buttonLabel: 'Open Resident Portal', buttonUrl: CS.cfg.email.portalUrl }], ['OCC Counseling Resources', 'campus', { heading: 'Mental Health Support', items: [{ title: 'OCC Mental Health Care', body: 'Confidential support through the Student Health Center.', url: ((CS.cfg.resources || []).find(r => r.title === 'Mental Health Care') || {}).url || '', cta: 'Get Support' }] }], ['Parking Reminder', 'tips', { heading: 'Parking', items: [{ title: 'Parking reminder', body: '[[Parking rules]]' }] }], ['Guest Policy', 'tips', { heading: 'Guest Policy', items: [{ title: 'Register your guests', body: 'Guests must check in at the front desk. Residents are responsible for their guests.' }] }], ['Package Reminder', 'tips', { heading: 'Packages', items: [{ title: 'Package pickup', body: '[[Package room hours]] — bring your ID.' }] }]];
    const draw = () => {
      CS.modal(`<h2 style="margin:0 0 6px;color:var(--brand-primary)">Saved Newsletter Blocks</h2><p style="margin:0 0 12px;color:var(--ui-muted);font-size:13.5px">Reusable sections you can insert into any newsletter. Save one from the editor with “Save as reusable block”.</p>
        ${blocks.length ? blocks.map(b => `<div class="nl-blk"><div><b>${esc(b.name)}</b><small>${esc(b.category)} · ${esc((NL.TYPES[b.sectionType] || {}).name || b.sectionType)}</small></div><div class="nl-blk-btns"><button class="cs-btn ghost xs" data-be="${b.id}">Rename</button><button class="cs-btn ghost xs" data-bd="${b.id}">Duplicate</button><button class="cs-btn danger xs" data-bx="${b.id}">Delete</button></div></div>`).join('') : '<div class="cs-empty">No saved blocks yet.</div>'}
        <div style="margin-top:14px"><button class="cs-btn ghost sm" id="blkStarters">Add Harbour starter blocks</button></div>
        <p class="cs-hint">To edit a block’s content: insert it into a newsletter, edit it, then “Save as reusable block” again.</p>`);
      const body = CS.$('#csModalBody');
      body.querySelectorAll('[data-be]').forEach(b => b.onclick = async () => { const blk = blocks.find(x => x.id === b.getAttribute('data-be')); const name = prompt('Block name:', blk.name); if (!name) return; await api('', { method: 'PUT', body: JSON.stringify({ propertyId: CS.propertyId, resource: 'blocks', id: blk.id, name }) }); blk.name = name; draw(); });
      body.querySelectorAll('[data-bd]').forEach(b => b.onclick = async () => { const blk = blocks.find(x => x.id === b.getAttribute('data-bd')); const n = await api('', { method: 'POST', body: JSON.stringify({ propertyId: CS.propertyId, resource: 'blocks', name: blk.name + ' (copy)', category: blk.category, sectionType: blk.sectionType, content: blk.content }) }); blocks.push(n); draw(); });
      body.querySelectorAll('[data-bx]').forEach(b => b.onclick = async () => { if (!confirm('Delete this saved block?')) return; await api(q() + '&resource=blocks&id=' + b.getAttribute('data-bx'), { method: 'DELETE' }); blocks = blocks.filter(x => x.id !== b.getAttribute('data-bx')); draw(); });
      body.querySelector('#blkStarters').onclick = async () => {
        for (const [name, type, content] of starters) { if (blocks.some(b => b.name === name)) continue; const n = await api('', { method: 'POST', body: JSON.stringify({ propertyId: CS.propertyId, resource: 'blocks', name, category: 'Harbour Starters', sectionType: type, content: content || NL.newSection(type).content }) }); blocks.push(n); }
        draw(); CS.toast('Starter blocks added');
      };
    };
    draw();
  }
})(window.CS = window.CS || {});
