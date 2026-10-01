/* Creative Studio — HTML · Entrata.
   Upload or paste existing Entrata email/page HTML, preview it, and edit TEXT ONLY.
   The HTML is split into tags and text runs; only text runs can change, so layout, styles,
   links and images are preserved byte-for-byte. Saved as projects (type 'entrata') with the
   same draft / approval workflow as other studio work. */
(function (CS) {
  const esc = s => CS.esc(s);
  const SKIP_BLOCK = /^<(style|script|title|head)\b/i;
  const TOKEN = /(<!--[\s\S]*?-->|<style\b[\s\S]*?<\/style>|<script\b[\s\S]*?<\/script>|<title\b[\s\S]*?<\/title>|<[^>]+>)/gi;
  let E = null; // current editor state

  // Split HTML into [{t:'tag'|'text', v, editable}] — joining v's reproduces the original exactly.
  function tokenize(html) {
    const parts = String(html).split(TOKEN).filter(p => p !== '' && p !== undefined);
    let inHead = false;
    return parts.map(v => {
      if (v[0] === '<') {
        if (/^<head\b/i.test(v)) inHead = true; else if (/^<\/head>/i.test(v)) inHead = false;
        return { t: 'tag', v };
      }
      return { t: 'text', v, editable: !inHead && /\S/.test(v.replace(/&nbsp;|&#160;/g, '')) };
    });
  }
  const decode = s => { const t = document.createElement('textarea'); t.innerHTML = s; return t.value; };
  const encode = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\u00a0/g, '&nbsp;');
  // Keep the run's original leading/trailing whitespace so indentation is untouched.
  function setRun(tok, text) {
    const m = tok.v.match(/^(\s*)([\s\S]*?)(\s*)$/);
    tok.v = m[1] + encode(text) + m[3];
    tok.changed = true;
  }
  const runText = tok => decode(tok.v).replace(/^\s+|\s+$/g, '');
  const serialize = () => E.tokens.map(t => t.v).join('');

  // Preview copy: wrap editable runs in spans so they can be clicked/edited in place.
  function previewHtml() {
    let i = -1;
    const body = E.tokens.map((t, idx) => {
      if (t.t !== 'text' || !t.editable) return t.v;
      i++;
      const m = t.v.match(/^(\s*)([\s\S]*?)(\s*)$/);
      return `${m[1]}<span data-run="${idx}" class="__cs_run">${m[2]}</span>${m[3]}`;
    }).join('');
    const css = `<style>.__cs_run{outline:1px dashed transparent;border-radius:3px;transition:outline-color .15s,background .15s;cursor:text}.__cs_run:hover{outline-color:#F99239;background:rgba(249,146,57,.08)}.__cs_run:focus{outline:2px solid #F99239;background:#fff8f0}.__cs_run.__chg{background:rgba(22,163,74,.12)}</style>`;
    return /<\/head>/i.test(body) ? body.replace(/<\/head>/i, css + '</head>') : css + body;
  }

  CS.views.entrata = () => `
    <div class="cs-page-h" style="display:flex;justify-content:space-between;align-items:flex-end;gap:12px;flex-wrap:wrap">
      <div><h1>HTML · Entrata</h1><p>Upload your Entrata HTML, preview it, and safely edit the text. Layout, styles, links and images can’t be changed here.</p></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="cs-btn ghost" id="enPaste">Paste HTML</button><button class="cs-btn" id="enUpload">Upload .html</button></div>
    </div>
    <input type="file" id="enFile" accept=".html,.htm,text/html" class="hidden">
    <div id="enWork"></div>
    <section class="cs-section"><div class="cs-section-h"><div><h2>Saved Entrata HTML</h2></div></div><div id="enSaved"></div></section>`;

  CS.views.after_entrata = (projectId) => {
    CS.$('#enUpload').onclick = () => CS.$('#enFile').click();
    CS.$('#enFile').onchange = e => { const f = e.target.files[0]; e.target.value = ''; if (!f) return; const r = new FileReader(); r.onload = () => open({ name: f.name.replace(/\.html?$/i, ''), html: r.result }); r.readAsText(f); };
    CS.$('#enPaste').onclick = () => {
      CS.modal(`<h2 style="margin:0 0 6px;color:var(--brand-primary)">Paste Entrata HTML</h2><p style="color:var(--ui-muted);font-size:13.5px;margin:0 0 10px">In Entrata, open the message’s Source / HTML view, copy everything and paste it here.</p>
        <div class="cs-field"><label class="cs-label">Name</label><input class="cs-input" id="enPName" placeholder="e.g. Guarantor required notice"></div>
        <textarea class="cs-textarea" id="enPHtml" style="min-height:300px;font-family:Consolas,monospace;font-size:12px" placeholder="<table …>"></textarea>
        <button class="cs-btn" id="enPGo" style="margin-top:10px">Open</button>`);
      CS.$('#enPGo').onclick = () => { const html = CS.$('#enPHtml').value; if (!/<[a-z]/i.test(html)) return CS.toast('That doesn’t look like HTML'); CS.closeModal(); open({ name: CS.$('#enPName').value.trim() || 'Entrata HTML', html }); };
    };
    drawSaved();
    if (projectId) { const p = CS.state.projects.find(x => x.id === projectId); if (p) open({ name: p.name, html: p.content.html, projectId: p.id, status: p.status, folder: p.folder }); }
  };

  function drawSaved() {
    const list = CS.state.projects.filter(p => p.type === 'entrata');
    const box = CS.$('#enSaved'); if (!box) return;
    box.innerHTML = list.length ? `<div class="cs-en-saved">${list.map(p => `<button class="cs-en-item" data-en="${p.id}"><b>${esc(p.name)}</b><span><span class="cs-chip ${p.status === 'final' ? 'ok' : p.status === 'pending' ? 'warn' : ''}">${esc(CS.statusLabel(p.status))}</span> · ${new Date(p.updatedAt).toLocaleDateString()} · ${esc(p.updatedBy || p.createdBy)}</span></button>`).join('')}</div>`
      : '<div class="cs-empty"><b>No Entrata HTML saved yet</b>Upload or paste an Entrata email to get started.</div>';
    box.querySelectorAll('[data-en]').forEach(b => b.onclick = () => { const p = CS.state.projects.find(x => x.id === b.getAttribute('data-en')); open({ name: p.name, html: p.content.html, projectId: p.id, status: p.status, folder: p.folder }); });
  }

  function open(doc) {
    E = { name: doc.name, original: doc.html, tokens: tokenize(doc.html), projectId: doc.projectId || '', status: doc.status || 'draft', folder: doc.folder || 'Resident Communications', view: 'desktop', q: '' };
    const runs = E.tokens.map((t, i) => ({ t, i })).filter(x => x.t.t === 'text' && x.t.editable);
    if (!runs.length) { CS.toast('No editable text found in that HTML'); return; }
    CS.$('#enWork').innerHTML = `
      <div class="cs-en">
        <div class="cs-en-top">
          <input class="cs-b-title" id="enName" value="${esc(E.name)}" aria-label="Name">
          <span class="cs-chip ${E.status === 'final' ? 'ok' : E.status === 'pending' ? 'warn' : ''}" id="enStatus">${esc(CS.statusLabel(E.status))}</span>
          <span class="cs-chip" id="enChanged">No changes</span>
          <div class="cs-en-top-r">
            <div class="cs-em-tabs" style="margin:0"><button class="active" data-env="desktop">Desktop</button><button data-env="mobile">Mobile</button></div>
            <button class="cs-btn ghost sm" id="enReset">Undo all</button>
            <button class="cs-btn ghost sm" id="enCopy">Copy HTML</button>
            <button class="cs-btn ghost sm" id="enDl">Download</button>
            <button class="cs-btn ghost sm" id="enSave">Save Draft</button>
            <button class="cs-btn navy sm" id="enFinal">${esc(CS.finalLabel())}</button>
          </div>
        </div>
        <div class="cs-en-body">
          <aside class="cs-en-side">
            <div class="cs-en-side-h"><b>Text blocks</b><span>${runs.length}</span></div>
            <input class="cs-input" id="enSearch" placeholder="Find text…" style="margin-bottom:8px">
            <div id="enRuns"></div>
          </aside>
          <div class="cs-en-preview"><p class="cs-en-tip">Click any text in the preview to edit it in place, or use the list. Only text changes are possible.</p><div class="cs-em-frame" id="enFrameWrap"><iframe id="enFrame" title="Entrata HTML preview"></iframe></div><div id="enGuard" class="cs-guard" style="max-width:none;margin-top:10px"></div></div>
        </div>
      </div>`;
    CS.$('#enWork').scrollIntoView({ behavior: 'smooth', block: 'start' });
    drawRuns(); drawPreview(); bindTop();
  }

  function drawRuns() {
    const q = E.q.toLowerCase();
    const runs = E.tokens.map((t, i) => ({ t, i })).filter(x => x.t.t === 'text' && x.t.editable && (!q || runText(x.t).toLowerCase().includes(q)));
    CS.$('#enRuns').innerHTML = runs.map(({ t, i }) => { const txt = runText(t); return `<label class="cs-en-run${t.changed ? ' chg' : ''}" data-run-field="${i}"><textarea rows="${Math.min(6, Math.max(1, Math.ceil(txt.length / 42)))}" data-ri="${i}">${esc(txt)}</textarea></label>`; }).join('') || '<div class="cs-empty" style="padding:14px">No matches.</div>';
    CS.$('#enRuns').querySelectorAll('[data-ri]').forEach(ta => {
      ta.addEventListener('input', () => { const i = +ta.getAttribute('data-ri'); setRun(E.tokens[i], ta.value.replace(/\n/g, ' ')); ta.closest('.cs-en-run').classList.add('chg'); syncPreviewRun(i); updateMeta(); });
      ta.addEventListener('focus', () => highlightInPreview(+ta.getAttribute('data-ri')));
      ta.addEventListener('keydown', e => { if (e.key === 'Enter') e.preventDefault(); }); // text only — no new lines/markup
    });
  }

  function drawPreview() {
    const f = CS.$('#enFrame');
    f.onload = () => {
      const d = f.contentDocument; if (!d) return;
      d.querySelectorAll('a').forEach(a => a.addEventListener('click', e => e.preventDefault())); // don't navigate away while editing
      d.querySelectorAll('.__cs_run').forEach(sp => {
        try { sp.contentEditable = 'plaintext-only'; } catch (x) { sp.contentEditable = 'true'; }
        if (sp.contentEditable !== 'plaintext-only') sp.contentEditable = 'true';
        const i = +sp.getAttribute('data-run');
        if (E.tokens[i].changed) sp.classList.add('__chg');
        sp.addEventListener('keydown', e => { if (e.key === 'Enter') e.preventDefault(); });
        sp.addEventListener('paste', e => { e.preventDefault(); const t = (e.clipboardData || window.clipboardData).getData('text/plain').replace(/\s+/g, ' '); d.execCommand('insertText', false, t); });
        sp.addEventListener('input', () => { setRun(E.tokens[i], sp.textContent); sp.classList.add('__chg'); const ta = CS.$(`[data-ri="${i}"]`); if (ta) { ta.value = sp.textContent; ta.closest('.cs-en-run').classList.add('chg'); } updateMeta(); });
        sp.addEventListener('focus', () => { const fld = CS.$(`[data-run-field="${i}"]`); if (fld) fld.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); CS.$('#enRuns').querySelectorAll('.cs-en-run').forEach(x => x.classList.toggle('focus', x === fld)); });
      });
      const h = d.documentElement.scrollHeight; f.style.height = Math.max(500, Math.min(2400, h + 20)) + 'px';
    };
    f.srcdoc = previewHtml();
    updateMeta();
  }
  function syncPreviewRun(i) {
    const d = CS.$('#enFrame').contentDocument; if (!d) return;
    const sp = d.querySelector(`[data-run="${i}"]`); if (sp && d.activeElement !== sp) { sp.textContent = runText(E.tokens[i]); sp.classList.add('__chg'); }
  }
  function highlightInPreview(i) {
    const d = CS.$('#enFrame').contentDocument; if (!d) return;
    const sp = d.querySelector(`[data-run="${i}"]`); if (!sp) return;
    sp.scrollIntoView({ block: 'center', behavior: 'smooth' });
    sp.style.outline = '2px solid #F99239'; setTimeout(() => { sp.style.outline = ''; }, 1200);
  }
  function updateMeta() {
    const n = E.tokens.filter(t => t.changed).length;
    CS.$('#enChanged').textContent = n ? `${n} text change${n === 1 ? '' : 's'}` : 'No changes';
    CS.$('#enChanged').className = 'cs-chip' + (n ? ' warn' : '');
    const all = E.tokens.filter(t => t.t === 'text' && t.editable).map(runText).join(' \n ');
    CS.$('#enGuard').innerHTML = CS.guardText(all).map(i => `<div class="warn">${i}</div>`).join('');
  }

  function bindTop() {
    CS.$('#enName').oninput = e => { E.name = e.target.value; };
    CS.$('#enSearch').oninput = e => { E.q = e.target.value; drawRuns(); };
    CS.$('#enWork').querySelectorAll('[data-env]').forEach(b => b.onclick = () => { CS.$('#enWork').querySelectorAll('[data-env]').forEach(x => x.classList.toggle('active', x === b)); CS.$('#enFrameWrap').classList.toggle('mobile', b.getAttribute('data-env') === 'mobile'); setTimeout(drawPreview, 50); });
    CS.$('#enReset').onclick = () => { if (!confirm('Undo all text changes since opening?')) return; E.tokens = tokenize(E.original); drawRuns(); drawPreview(); };
    CS.$('#enCopy').onclick = () => CS.copy(serialize());
    CS.$('#enDl').onclick = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([serialize()], { type: 'text/html' })); a.download = (E.name || 'entrata').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60) + '.html'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); };
    const save = async kind => {
      const body = { propertyId: CS.propertyId, name: E.name || 'Entrata HTML', type: 'entrata', format: 'email', status: kind, folder: E.folder, content: { html: serialize(), headline: E.name } };
      try {
        let status;
        if (E.projectId) { const r = await CS.api('/reslife-creative-projects', { method: 'PUT', body: JSON.stringify(Object.assign({ id: E.projectId }, body)) }); status = r.status; const p = CS.state.projects.find(x => x.id === E.projectId); if (p) Object.assign(p, body, { status, updatedAt: new Date().toISOString(), updatedBy: CS.user.username }); }
        else { const p = await CS.api('/reslife-creative-projects', { method: 'POST', body: JSON.stringify(body) }); status = p.status; E.projectId = p.id; CS.state.projects.unshift(p); }
        E.status = status; E.original = serialize(); E.tokens.forEach(t => { t.changed = false; });
        CS.$('#enStatus').textContent = CS.statusLabel(status); CS.$('#enStatus').className = 'cs-chip ' + (status === 'final' ? 'ok' : status === 'pending' ? 'warn' : '');
        drawRuns(); drawPreview(); drawSaved();
        CS.toast(status === 'pending' ? 'Submitted — pending approval by an Admin or REC' : status === 'final' ? 'Saved as final' : 'Draft saved');
      } catch (e) { CS.toast('Save failed: ' + e.message); }
    };
    CS.$('#enSave').onclick = () => save('draft');
    CS.$('#enFinal').onclick = () => save('final');
  }
})(window.CS = window.CS || {});
