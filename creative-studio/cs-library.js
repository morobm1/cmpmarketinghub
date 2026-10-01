/* Creative Studio — Creative Library (finished files: flyers, social graphics, PDFs, logos).
   Replaces the standalone reslife_creative_library.html. Uses /api/creative-library (keyed by the
   property NAME stored on user accounts) so existing uploads carry over.
   RA/REC uploads are 'pending' until an Admin or REC approves them; everything is visible to Admins/RECs. */
(function (CS) {
  const esc = s => CS.esc(s);
  const CATS = ['Flyers', 'Social Media', 'Email', 'Signage', 'Photos', 'Logos & Brand', 'Event Materials', 'Other'];
  const MAX_MB = 4;
  let assets = [], loaded = false;

  async function libraryProperty() {
    if (CS.libraryProperty) return CS.libraryProperty;
    const mine = (Array.isArray(CS.user.properties) ? CS.user.properties : []).find(n => CSRegistry.resolvePropertyId(n) === CS.propertyId);
    if (mine) return (CS.libraryProperty = mine);
    try { const props = await CS.api('/properties'); const hit = (props || []).find(p => CSRegistry.resolvePropertyId(p.name) === CS.propertyId || CSRegistry.resolvePropertyId(p.id) === CS.propertyId); if (hit) return (CS.libraryProperty = hit.name); } catch (e) {}
    return (CS.libraryProperty = CS.cfg.name);
  }
  async function load() {
    const prop = await libraryProperty();
    try { assets = await CS.api('/creative-library?property=' + encodeURIComponent(prop)); } catch (e) { assets = []; }
    assets.forEach(a => { a.status = a.status || 'approved'; });
    assets.sort((a, b) => String(b.uploadedAt || '').localeCompare(String(a.uploadedAt || '')));
    loaded = true;
  }
  const typeOf = a => { const u = String(a.url || ''); if (/^data:image|\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(u)) return 'image'; if (/^data:application\/pdf|\.pdf(\?|$)/i.test(u)) return 'pdf'; return 'file'; };
  const canEdit = a => CS.isManager() || a.uploadedBy === CS.user.username;
  const canApprove = a => a.status === 'pending' && CS.isManager() && (a.uploadedBy !== CS.user.username || CS.isAdmin());

  CS.views.library = () => `
    <div class="cs-page-h" style="display:flex;justify-content:space-between;align-items:flex-end;gap:12px;flex-wrap:wrap">
      <div><h1>Creative Library</h1><p>Finished, shareable files for ${esc(CS.cfg.shortName)}. Uploads by RAs and RECs are reviewed by an Admin or REC before they’re approved.</p></div>
      <button class="cs-btn" id="libUpload">+ Upload Creative</button>
    </div>
    <div class="cs-filters" id="libFilters"></div>
    <div id="libGrid"><div class="cs-empty">Loading library…</div></div>
    <section class="cs-section"><div class="cs-section-h"><div><h2>Approved Studio Creatives</h2><p>Final designs made in the studio.</p></div><button class="cs-link" data-go="projects">My Projects &rarr;</button></div><div id="libStudio"></div></section>`;

  CS.views.after_library = async () => {
    CS.$('#libUpload').onclick = uploadModal;
    if (!loaded) await load();
    let cat = '', status = '', q = '';
    const draw = () => {
      const counts = c => assets.filter(a => a.category === c).length;
      CS.$('#libFilters').innerHTML = `<button class="cs-pill ${!cat ? 'active' : ''}" data-cat="">All <small>${assets.length}</small></button>` +
        CATS.filter(c => counts(c)).map(c => `<button class="cs-pill ${cat === c ? 'active' : ''}" data-cat="${esc(c)}">${esc(c)} <small>${counts(c)}</small></button>`).join('') +
        `<select class="cs-select" id="libStatus" style="width:auto;margin-left:auto"><option value="">All statuses</option><option value="approved"${status === 'approved' ? ' selected' : ''}>Approved</option><option value="pending"${status === 'pending' ? ' selected' : ''}>Pending approval</option></select>
         <input class="cs-input" id="libSearch" placeholder="Search…" value="${esc(q)}" style="width:220px">`;
      CS.$('#libFilters').querySelectorAll('[data-cat]').forEach(b => b.onclick = () => { cat = b.getAttribute('data-cat'); draw(); });
      CS.$('#libStatus').onchange = e => { status = e.target.value; draw(); };
      const s = CS.$('#libSearch'); s.oninput = e => { q = e.target.value; drawGrid(); }; 
      drawGrid();
    };
    const drawGrid = () => {
      const ql = q.trim().toLowerCase();
      const list = assets.filter(a => (!cat || a.category === cat) && (!status || a.status === status) && (!ql || [a.name, a.description, (a.tags || []).join(' '), a.uploadedBy].join(' ').toLowerCase().includes(ql)));
      const grid = CS.$('#libGrid');
      if (!list.length) { grid.innerHTML = `<div class="cs-empty"><b>${assets.length ? 'No matches' : 'Your library is empty'}</b>${assets.length ? 'Try another filter.' : 'Upload finished flyers, graphics and PDFs to share them with your team.'}</div>`; return; }
      grid.innerHTML = `<div class="cs-grid">${list.map(a => {
        const t = typeOf(a);
        return `<div class="cs-card">
          <div class="cs-thumb sq" data-lib-view="${esc(a.id)}">
            ${a.status === 'pending' ? '<span class="cs-badge-approved" style="background:#f59e0b">Pending</span>' : ''}
            ${t === 'image' ? `<img src="${esc(a.url)}" alt="${esc(a.name)}" style="width:100%;height:100%;object-fit:cover">` : `<div style="font-size:30px;font-weight:900;color:var(--brand-primary)">${t === 'pdf' ? 'PDF' : 'FILE'}</div>`}
          </div>
          <div class="cs-card-body"><b>${esc(a.name)}</b>
            <div class="cs-card-meta"><span class="cs-chip fmt">${esc(a.category || 'Other')}</span><span class="cs-chip ${a.status === 'pending' ? 'warn' : 'ok'}">${a.status === 'pending' ? 'Pending approval' : 'Approved'}</span></div>
            <div style="font-size:11.5px;color:var(--ui-muted);margin-top:6px">by ${esc(a.uploadedBy || 'unknown')}${a.uploadedAt ? ' · ' + new Date(a.uploadedAt).toLocaleDateString() : ''}</div>
          </div>
          <div class="cs-proj-actions">
            ${canApprove(a) ? `<button class="cs-btn navy xs" data-lib-approve="${esc(a.id)}">Approve</button>` : ''}
            <a class="cs-btn ghost xs" href="${esc(a.url)}" download="${esc(a.name)}">Download</a>
            ${a.canvaLink ? `<a class="cs-btn ghost xs" href="${esc(a.canvaLink)}" target="_blank" rel="noopener">Canva</a>` : ''}
            ${canEdit(a) ? `<button class="cs-btn ghost xs" data-lib-edit="${esc(a.id)}">Edit</button>` : ''}
          </div>
        </div>`; }).join('')}</div>`;
      grid.querySelectorAll('[data-lib-view]').forEach(el => el.onclick = () => view(assets.find(a => a.id === el.getAttribute('data-lib-view'))));
      grid.querySelectorAll('[data-lib-edit]').forEach(el => el.onclick = () => editModal(assets.find(a => a.id === el.getAttribute('data-lib-edit'))));
      grid.querySelectorAll('[data-lib-approve]').forEach(el => el.onclick = async () => {
        const a = assets.find(x => x.id === el.getAttribute('data-lib-approve'));
        try { await CS.api('/creative-library', { method: 'PUT', body: JSON.stringify({ property: await libraryProperty(), asset: { id: a.id, status: 'approved' } }) }); a.status = 'approved'; CS.toast('Approved'); draw(); }
        catch (e) { CS.toast('Approve failed: ' + e.message); }
      });
    };
    CS.$('#libStudio').innerHTML = (() => { const finals = CS.state.projects.filter(p => p.status === 'final').slice(0, 8); return finals.length ? `<div class="cs-grid">${finals.map(p => `<div class="cs-card"><div class="cs-thumb ${p.format === 'post' ? 'sq' : p.format === 'story' ? 'story' : p.format === 'sign' ? 'sign' : ''}" data-open-project="${p.id}">${p.thumbnail ? `<img src="${p.thumbnail}" style="width:100%;height:100%;object-fit:cover;object-position:top">` : '<div style="font-weight:800;color:var(--ui-muted)">' + esc(CS.fmtLabel(p.format)) + '</div>'}</div><div class="cs-card-body"><b>${esc(p.name)}</b><div class="cs-card-meta"><span class="cs-chip ok">Approved</span></div></div></div>`).join('')}</div>` : '<div class="cs-empty">No approved studio creatives yet.</div>'; })();
    CS.$('#libStudio').querySelectorAll('[data-open-project]').forEach(el => el.onclick = () => CS.openProject(el.getAttribute('data-open-project')));
    CS._libDraw = draw;
    draw();
  };

  function view(a) {
    if (!a) return;
    const t = typeOf(a);
    CS.modal(`<h2 style="margin:0 0 6px;color:var(--brand-primary)">${esc(a.name)}</h2>
      <div class="cs-card-meta" style="margin-bottom:12px"><span class="cs-chip fmt">${esc(a.category || 'Other')}</span>${(a.tags || []).map(t => `<span class="cs-chip">${esc(t)}</span>`).join('')}</div>
      ${a.description ? `<p style="color:var(--ui-muted)">${esc(a.description)}</p>` : ''}
      <div class="cs-preview-wrap">${t === 'image' ? `<img src="${esc(a.url)}" style="max-width:100%;max-height:70vh">` : t === 'pdf' ? `<iframe src="${esc(a.url)}" style="width:100%;height:70vh;border:0"></iframe>` : '<div class="cs-empty">Preview not available — download the file.</div>'}</div>`);
  }

  function fieldsHTML(a) {
    a = a || {};
    return `<div class="cs-row"><div class="cs-field"><label class="cs-label">Category</label><select class="cs-select" id="libCat">${CATS.map(c => `<option${c === (a.category || 'Flyers') ? ' selected' : ''}>${c}</option>`).join('')}</select></div>
      <div class="cs-field"><label class="cs-label">Tags (comma separated)</label><input class="cs-input" id="libTags" value="${esc((a.tags || []).join(', '))}" placeholder="move-in, event"></div></div>
      <div class="cs-field"><label class="cs-label">Description</label><textarea class="cs-textarea" id="libDesc" style="min-height:70px">${esc(a.description || '')}</textarea></div>
      <div class="cs-field"><label class="cs-label">Canva link (optional)</label><input class="cs-input" id="libCanva" value="${esc(a.canvaLink || '')}" placeholder="https://www.canva.com/…"></div>`;
  }
  const readFields = () => ({ category: CS.$('#libCat').value, tags: CS.$('#libTags').value.split(',').map(s => s.trim()).filter(Boolean), description: CS.$('#libDesc').value.trim(), canvaLink: CS.$('#libCanva').value.trim() });

  function uploadModal() {
    CS.modal(`<h2 style="margin:0 0 6px;color:var(--brand-primary)">Upload Creative</h2>
      <p style="margin:0 0 14px;color:var(--ui-muted);font-size:13.5px">${CS.isAdmin() ? 'Your uploads are approved immediately.' : 'Your upload will be pending until an Admin or REC approves it.'} Images and PDFs up to ${MAX_MB} MB each.</p>
      <div class="cs-field"><input type="file" id="libFiles" multiple accept="image/*,application/pdf" class="cs-input"></div>
      ${fieldsHTML()}
      <button class="cs-btn" id="libDoUpload" style="width:100%">Upload</button>`);
    CS.$('#libDoUpload').onclick = async () => {
      const files = [...CS.$('#libFiles').files];
      if (!files.length) return CS.toast('Choose at least one file');
      const big = files.find(f => f.size > MAX_MB * 1048576);
      if (big) return CS.toast(`${big.name} is larger than ${MAX_MB} MB`);
      const meta = readFields();
      CS.$('#libDoUpload').disabled = true; CS.$('#libDoUpload').textContent = 'Uploading…';
      try {
        const now = new Date().toISOString();
        const items = await Promise.all(files.map(f => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(Object.assign({ id: 'a-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7), name: f.name, url: r.result, uploadedAt: now }, meta)); r.onerror = rej; r.readAsDataURL(f); })));
        for (const it of items) await CS.api('/creative-library', { method: 'POST', body: JSON.stringify({ property: await libraryProperty(), assets: [it] }) });
        CS.closeModal(); await load(); CS.toast(CS.isAdmin() ? 'Uploaded' : 'Uploaded — pending approval'); CS.go('library');
      } catch (e) { CS.toast('Upload failed: ' + e.message); CS.$('#libDoUpload').disabled = false; CS.$('#libDoUpload').textContent = 'Upload'; }
    };
  }

  function editModal(a) {
    if (!a) return;
    CS.modal(`<h2 style="margin:0 0 12px;color:var(--brand-primary)">Edit ${esc(a.name)}</h2>
      <div class="cs-field"><label class="cs-label">Name</label><input class="cs-input" id="libName" value="${esc(a.name)}"></div>
      ${fieldsHTML(a)}
      <div style="display:flex;gap:8px"><button class="cs-btn" id="libSave">Save</button><button class="cs-btn danger" id="libDel" style="margin-left:auto">Delete</button></div>`);
    CS.$('#libSave').onclick = async () => {
      const upd = Object.assign({ id: a.id, name: CS.$('#libName').value.trim() || a.name }, readFields());
      try { await CS.api('/creative-library', { method: 'PUT', body: JSON.stringify({ property: await libraryProperty(), asset: upd }) }); Object.assign(a, upd); CS.closeModal(); CS.toast('Saved'); CS._libDraw && CS._libDraw(); }
      catch (e) { CS.toast('Save failed: ' + e.message); }
    };
    CS.$('#libDel').onclick = async () => {
      if (!confirm(`Delete ${a.name}?`)) return;
      try { await CS.api('/creative-library', { method: 'DELETE', body: JSON.stringify({ property: await libraryProperty(), id: a.id }) }); assets = assets.filter(x => x.id !== a.id); CS.closeModal(); CS.toast('Deleted'); CS._libDraw && CS._libDraw(); }
      catch (e) { CS.toast('Delete failed: ' + e.message); }
    };
  }
})(window.CS = window.CS || {});
