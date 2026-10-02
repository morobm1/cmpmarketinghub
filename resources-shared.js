/* Property Resources — one shared component used by BOTH the Creative Studio “Resources” page and the
   Reslife Hub “Resources” tab, so the two always show (and edit) the same list.
   Data: /api/reslife-creative-projects?resource=resources&propertyId=… (stored list) — falls back to the
   defaults in properties/<id>/property.config.js. REC/Admin get an Edit toggle; saves go to the shared list.

   RLResources.mount(el, { propertyId, canEdit, defaults, info, propertyName, onChange })                 */
(function () {
  if (window.RLResources) return;
  const css = `
  .rres-top{display:flex;justify-content:space-between;align-items:flex-end;gap:12px;flex-wrap:wrap;margin-bottom:16px}
  .rres-top h2{margin:0;font-size:22px;font-weight:800;color:var(--rl-primary,var(--brand-primary,#002D6A))}
  .rres-top p{margin:2px 0 0;font-size:13.5px;color:var(--rl-subtext,var(--ui-muted,#64748b))}
  .rres-edit-toggle{display:inline-flex;align-items:center;gap:10px;font-weight:700;font-size:13.5px;color:var(--rl-primary,var(--brand-primary,#002D6A));cursor:pointer;user-select:none}
  .rres-switch{position:relative;width:44px;height:24px;border-radius:999px;background:#cbd5e1;transition:background .15s;flex-shrink:0}
  .rres-switch::after{content:'';position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.25);transition:left .15s}
  .rres-edit-toggle.on .rres-switch{background:var(--rl-secondary,var(--brand-accent,#F99239))}
  .rres-edit-toggle.on .rres-switch::after{left:23px}
  .rres-bar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:14px}
  .rres-bar input{flex:1;min-width:220px;padding:9px 12px;border:1px solid var(--rl-border,var(--ui-border,#e2e8f0));border-radius:10px;font:inherit;font-size:14px}
  .rres-editbar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;background:#fff8f0;border:1px solid #fed7aa;border-radius:12px;padding:10px 12px;margin-bottom:14px;font-size:13px;color:#9a3412;position:sticky;top:64px;z-index:5}
  .rres-editbar span{flex:1;min-width:200px}
  .rres-btn{border:1.5px solid var(--rl-border,var(--ui-border,#e2e8f0));background:#fff;border-radius:999px;padding:7px 14px;font:inherit;font-size:13px;font-weight:700;cursor:pointer;color:var(--rl-primary,var(--brand-primary,#002D6A))}
  .rres-btn.primary{background:var(--rl-secondary,var(--brand-accent,#F99239));border-color:transparent;color:#fff}
  .rres-btn.danger{color:#b91c1c;border-color:#fecaca}
  .rres-btn.sm{padding:5px 10px;font-size:12px}
  .rres-groups{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px}
  .rres-group{border:1px solid var(--rl-border,var(--ui-border,#e2e8f0));border-radius:16px;padding:16px 18px;background:#fff}
  .rres-group h3{margin:0 0 10px;font-size:13.5px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:var(--rl-primary,var(--brand-primary,#002D6A));display:flex;justify-content:space-between;align-items:center;gap:8px}
  .rres-group h3 small{font-size:11px;color:var(--rl-subtext,var(--ui-muted,#64748b));font-weight:700}
  .rres-item{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:9px 0;border-top:1px solid #f1f5f9;font-size:13.5px}
  .rres-item:first-of-type{border-top:none}
  .rres-item b{display:block;color:var(--rl-text,#0f172a);font-weight:700}
  .rres-item small{display:block;color:var(--rl-subtext,var(--ui-muted,#64748b));font-size:12px;margin-top:1px}
  .rres-item a.rres-open{flex-shrink:0;font-weight:700;font-size:12.5px;color:#fff;background:var(--rl-primary,var(--brand-primary,#002D6A));padding:6px 12px;border-radius:999px;text-decoration:none}
  .rres-item a.rres-open:hover{background:var(--rl-secondary,var(--brand-accent,#F99239))}
  .rres-missing{color:#92400e;background:#fffbeb;border-radius:8px;padding:2px 8px;font-size:11.5px;font-weight:700;flex-shrink:0}
  .rres-erow{display:grid;grid-template-columns:1fr;gap:6px;padding:10px;border:1px dashed #cbd5e1;border-radius:12px;margin-bottom:8px;background:#f8fafc}
  .rres-erow input{width:100%;box-sizing:border-box;padding:7px 9px;border:1px solid var(--rl-border,#e2e8f0);border-radius:8px;font:inherit;font-size:13px;background:#fff}
  .rres-erow input.bad{border-color:#ef4444;background:#fef2f2}
  .rres-erow .rres-row-acts{display:flex;justify-content:flex-end;gap:6px}
  .rres-cat-input{flex:1;padding:6px 9px;border:1px solid var(--rl-border,#e2e8f0);border-radius:8px;font:inherit;font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;color:var(--rl-primary,#002D6A)}
  .rres-info h3{color:var(--rl-primary,var(--brand-primary,#002D6A))}
  .rres-meta{font-size:12px;color:var(--rl-subtext,var(--ui-muted,#64748b));margin-top:12px}
  .rres-section-h{margin:28px 0 12px;font-size:17px;font-weight:800;color:var(--rl-primary,var(--brand-primary,#002D6A))}
  .rres-msg{border-radius:10px;padding:9px 12px;font-size:13px;font-weight:600;margin-bottom:12px}
  .rres-msg.err{background:#fef2f2;color:#991b1b}.rres-msg.ok{background:#f0fdf4;color:#166534}`;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const okUrl = u => !u || /^(https?:\/\/|mailto:|tel:|[a-z0-9_-]+\.html)/i.test(u.trim());
  const API = p => '/api/reslife-creative-projects' + p;
  async function req(path, opts) {
    const r = await fetch(API(path), Object.assign({ credentials: 'include', headers: { 'Content-Type': 'application/json' } }, opts || {}));
    if (!r.ok) throw new Error((await r.text()) || ('HTTP ' + r.status));
    return r.json();
  }

  function mount(el, o) {
    if (!document.getElementById('rres-css')) { const st = document.createElement('style'); st.id = 'rres-css'; st.textContent = css; document.head.appendChild(st); }
    const S = { list: [], editing: false, draft: null, q: '', meta: null, msg: '' };
    const groups = list => { const g = {}; list.forEach(r => (g[r.category || 'Other'] = g[r.category || 'Other'] || []).push(r)); return g; };

    async function load() {
      el.innerHTML = '<div style="padding:20px;color:#64748b">Loading resources…</div>';
      try { const d = await req(`?resource=resources&propertyId=${encodeURIComponent(o.propertyId)}`); S.list = d.resources || JSON.parse(JSON.stringify(o.defaults || [])); S.meta = d.resources ? d : null; }
      catch (e) { S.list = JSON.parse(JSON.stringify(o.defaults || [])); }
      o.onChange && o.onChange(S.list);
      draw();
    }

    function draw() {
      const list = S.editing ? S.draft : S.list;
      const q = S.q.toLowerCase();
      const shown = S.editing ? list : list.filter(r => !q || [r.title, r.category, r.note, r.url].join(' ').toLowerCase().includes(q));
      const g = groups(shown);
      el.innerHTML = `
        <div class="rres-top"><div><h2>${esc(o.title || 'Property Resources')}</h2><p>Reference links and verified information for ${esc(o.propertyName || 'your property')} staff. ${o.canEdit ? 'Changes here also update the ' + (o.otherPage || 'other Resources page') + '.' : ''}</p></div>
          ${o.canEdit ? `<label class="rres-edit-toggle${S.editing ? ' on' : ''}" id="rresToggle"><span class="rres-switch"></span>Edit mode</label>` : ''}</div>
        ${S.msg}
        ${S.editing ? `<div class="rres-editbar"><span>Editing — change titles, links and notes, add or remove links and categories. Links must start with https://, mailto: or tel:.</span><button class="rres-btn" id="rresAddCat">+ Add category</button><button class="rres-btn" id="rresReset">Reset to defaults</button><button class="rres-btn" id="rresCancel">Cancel</button><button class="rres-btn primary" id="rresSave">Save changes</button></div>`
          : `<div class="rres-bar"><input id="rresSearch" placeholder="Search resources…" value="${esc(S.q)}"></div>`}
        <div class="rres-groups">${Object.entries(g).map(([cat, items]) => S.editing ? `
          <div class="rres-group" data-cat="${esc(cat)}"><h3><input class="rres-cat-input" data-catname="${esc(cat)}" value="${esc(cat)}"><button class="rres-btn sm danger" data-delcat="${esc(cat)}">Delete</button></h3>
            ${items.map(r => { const i = list.indexOf(r); return `<div class="rres-erow"><input data-i="${i}" data-k="title" value="${esc(r.title)}" placeholder="Title"><input data-i="${i}" data-k="url" value="${esc(r.url || '')}" placeholder="https://…" class="${okUrl(r.url) ? '' : 'bad'}"><input data-i="${i}" data-k="note" value="${esc(r.note || '')}" placeholder="Note (optional)"><div class="rres-row-acts"><button class="rres-btn sm danger" data-del="${i}">Remove</button></div></div>`; }).join('')}
            <button class="rres-btn sm" data-addto="${esc(cat)}">+ Add link</button></div>` : `
          <div class="rres-group"><h3>${esc(cat)} <small>${items.length}</small></h3>${items.map(r => `<div class="rres-item"><div><b>${esc(r.title)}</b>${r.note ? `<small>${esc(r.note)}</small>` : ''}</div>${r.url ? `<a class="rres-open" href="${esc(r.url)}" target="${/\.html$/i.test(r.url) ? '_self' : '_blank'}" rel="noopener">Open</a>` : '<span class="rres-missing">Link needed</span>'}</div>`).join('')}</div>`).join('') || '<div style="color:#64748b">No resources match.</div>'}</div>
        ${S.meta && S.meta.updatedAt ? `<div class="rres-meta">Last edited ${new Date(S.meta.updatedAt).toLocaleString()}${S.meta.updatedBy ? ' by ' + esc(S.meta.updatedBy) : ''}</div>` : ''}
        ${o.info && !S.editing ? `<div class="rres-section-h">${esc(o.infoTitle || 'Information Library')}</div><div class="rres-groups rres-info">${Object.entries(o.info).map(([cat, items]) => `<div class="rres-group"><h3>${esc(cat)}</h3>${items.map(i => i.q ? `<div class="rres-item"><div><b>${esc(i.q)}</b><small>${esc(i.a)}</small></div></div>` : i.fact ? `<div class="rres-item"><div>${esc(i.fact)}</div></div>` : `<div class="rres-item"><div><span class="rres-missing">Needs info</span> <small style="display:inline">${esc(i.ask)}</small></div></div>`).join('')}</div>`).join('')}</div>` : ''}`;
      S.msg = '';
      bind();
    }

    function bind() {
      const $ = s => el.querySelector(s);
      const t = $('#rresToggle'); if (t) t.onclick = () => { if (S.editing && JSON.stringify(S.draft) !== JSON.stringify(S.list) && !confirm('Discard unsaved changes?')) return; S.editing = !S.editing; S.draft = S.editing ? JSON.parse(JSON.stringify(S.list)) : null; draw(); };
      const s = $('#rresSearch'); if (s) s.oninput = e => { S.q = e.target.value; const pos = e.target.selectionStart; draw(); const n = el.querySelector('#rresSearch'); n.focus(); n.setSelectionRange(pos, pos); };
      if (!S.editing) return;
      el.querySelectorAll('[data-i]').forEach(inp => inp.oninput = () => { S.draft[+inp.getAttribute('data-i')][inp.getAttribute('data-k')] = inp.value; if (inp.getAttribute('data-k') === 'url') inp.classList.toggle('bad', !okUrl(inp.value)); });
      el.querySelectorAll('[data-catname]').forEach(inp => inp.onchange = () => { const old = inp.getAttribute('data-catname'), nw = inp.value.trim() || old; S.draft.forEach(r => { if ((r.category || 'Other') === old) r.category = nw; }); draw(); });
      el.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { S.draft.splice(+b.getAttribute('data-del'), 1); draw(); });
      el.querySelectorAll('[data-addto]').forEach(b => b.onclick = () => { const cat = b.getAttribute('data-addto'); const last = S.draft.map(r => r.category).lastIndexOf(cat); S.draft.splice(last + 1, 0, { category: cat, title: 'New link', url: '', note: '' }); draw(); });
      el.querySelectorAll('[data-delcat]').forEach(b => b.onclick = () => { const cat = b.getAttribute('data-delcat'); if (!confirm(`Delete the “${cat}” category and all its links?`)) return; S.draft = S.draft.filter(r => (r.category || 'Other') !== cat); draw(); });
      $('#rresAddCat').onclick = () => { const name = prompt('New category name:'); if (!name || !name.trim()) return; S.draft.push({ category: name.trim(), title: 'New link', url: '', note: '' }); draw(); };
      $('#rresReset').onclick = () => { if (!confirm('Replace the list with the original default resources? (You can still cancel before saving.)')) return; S.draft = JSON.parse(JSON.stringify(o.defaults || [])); draw(); };
      $('#rresCancel').onclick = () => { S.editing = false; S.draft = null; draw(); };
      $('#rresSave').onclick = async () => {
        const clean = S.draft.map(r => ({ category: (r.category || 'Other').trim(), title: (r.title || '').trim(), url: (r.url || '').trim(), note: (r.note || '').trim() })).filter(r => r.title);
        const bad = clean.find(r => !okUrl(r.url));
        if (bad) { S.msg = `<div class="rres-msg err">“${esc(bad.title)}” has an invalid link. Links must start with https://, mailto: or tel:.</div>`; draw(); return; }
        try {
          const r = await req('', { method: 'PUT', body: JSON.stringify({ propertyId: o.propertyId, resource: 'resources', resources: clean }) });
          S.list = clean; S.meta = { updatedAt: r.updatedAt, updatedBy: o.username || '' }; S.editing = false; S.draft = null;
          S.msg = `<div class="rres-msg ok">Saved — ${r.count} resources. Both Resources pages are now updated.</div>`;
          o.onChange && o.onChange(S.list); draw();
        } catch (e) { S.msg = `<div class="rres-msg err">${esc(e.message)}</div>`; draw(); }
      };
    }
    load();
    return { reload: load };
  }
  window.RLResources = { mount };
})();
