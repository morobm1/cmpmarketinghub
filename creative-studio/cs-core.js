/* Creative Studio — core: boot, auth/property access, theme, API, search, favorites, routing. */
(function (CS) {
  const RESLIFE_ROLES = ['reslife-ra', 'reslife-rec', 'reslife-admin'];
  const ROLE_LABELS = { 'reslife-ra': 'RA', 'reslife-rec': 'REC', 'reslife-admin': 'ResLife Admin', admin: 'Site Admin' };
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  Object.assign(CS, {
    $, esc,
    state: { view: 'home', projects: [], folders: [], favorites: [], projectFolder: 'all' },
    color: k => (CS.cfg.colors[k] || {}).hex || '#000',
    photo: id => (CS.cfg.photos || []).find(p => p.id === id || p.src === id) || (CS.isEntrataUrl && CS.isEntrataUrl(id) ? { id, src: id, alt: '', kind: 'entrata', category: 'Entrata' } : null),
    logo: id => (CS.cfg.logos || []).find(l => l.id === id && l.src) || null,
    graphic: id => ((CS.cfg.graphics || []).find(g => g.id === id) || {}).src || '',
    fmtLabel: f => (CS.data.formats[f] || {}).label || f,
    isAdmin: () => CS.user && (CS.user.role === 'admin' || CS.user.role === 'reslife-admin'),
    isManager: () => CS.user && ['admin', 'reslife-admin', 'reslife-rec'].includes(CS.user.role),
    // Label for the 'final' save action: Admin finals publish immediately; RA/REC finals go to approval.
    finalLabel: () => (CS.user && (CS.user.role === 'admin' || CS.user.role === 'reslife-admin')) ? 'Save as Final' : 'Submit for Approval',
    statusLabel: s => ({ draft: 'Draft', pending: 'Pending approval', final: 'Approved', archived: 'Archived', 'in-review': 'Pending approval' }[s] || s),
    canApprove: p => CS.isManager() && p.status === 'pending' && (p.createdBy !== CS.user.username || CS.isAdmin()),
    toast(msg) {
      const t = $('#csToast'); t.textContent = msg; t.classList.remove('hidden');
      clearTimeout(t._h); t._h = setTimeout(() => t.classList.add('hidden'), 2600);
    },
    async api(path, opts) {
      opts = opts || {};
      const res = await fetch('/api' + path, Object.assign({ credentials: 'include', headers: { 'Content-Type': 'application/json' } }, opts));
      if (!res.ok) { const t = await res.text(); const e = new Error(t || res.statusText); e.status = res.status; throw e; }
      return res.json();
    },
    modal(html) { $('#csModalBody').innerHTML = html; $('#csModal').classList.remove('hidden'); requestAnimationFrame(() => CS.render.scaleThumbs($('#csModal'))); },
    closeModal() { $('#csModal').classList.add('hidden'); $('#csModalBody').innerHTML = ''; },
    copy(text) { navigator.clipboard.writeText(text).then(() => CS.toast('Copied to clipboard')).catch(() => CS.toast('Copy failed')); },
  });

  // Apply the property's brand tokens to the app UI.
  function applyTheme() {
    const r = document.documentElement.style;
    r.setProperty('--brand-accent', CS.color('orange'));
    r.setProperty('--brand-primary', CS.color('navy'));
    r.setProperty('--brand-blue', CS.color('blue'));
    r.setProperty('--brand-light', CS.color('lightBlue'));
    r.setProperty('--brand-sand', CS.color('sand'));
    r.setProperty('--brand-text', CS.color('darkText'));
    r.setProperty('--brand-font', CS.cfg.fonts.body.css);
    r.setProperty('--wave-orange', `url('${CS.graphic('orange-wave')}')`);
    r.setProperty('--divider', `url('${CS.graphic('coastal-divider')}')`);
    const logo = CS.logo('primary');
    if (logo) $('#csTopLogo').src = logo.src; else $('#csTopLogo').classList.add('hidden');
    $('#csPropName').textContent = CS.cfg.name;
    document.title = `Creative Studio • ${CS.cfg.name}`;
  }

  async function loadProperty(id) {
    CS.data = await CSRegistry.loadProperty(id);
    CS.cfg = CS.data.config;
    CS.propertyId = id;
    applyTheme();
    try { CS.state.projects = await CS.api('/reslife-creative-projects?propertyId=' + id); } catch (e) { CS.state.projects = []; }
    try { CS.state.folders = await CS.api('/reslife-creative-projects?resource=folders&propertyId=' + id); } catch (e) { CS.state.folders = []; }
    try { CS.state.favorites = (await CS.api('/reslife-creative-projects?resource=favorites&propertyId=' + id)).templateIds || []; }
    catch (e) { try { CS.state.favorites = JSON.parse(localStorage.getItem('cs_fav_' + id) || '[]'); } catch (x) { CS.state.favorites = []; } }
    await CS.loadMedia();
    CS.cfg.defaultResources = CS.cfg.defaultResources || JSON.parse(JSON.stringify(CS.cfg.resources || []));
    try { const r = await CS.api('/reslife-creative-projects?resource=resources&propertyId=' + id); if (r && Array.isArray(r.resources)) CS.cfg.resources = r.resources; } catch (e) {}
  }

  // Shared photo library: built-in Harbour photos + Entrata Media Library links added by RECs/Admins.
  // Every editor (flyers, social, newsletter) picks images from CS.cfg.photos.
  CS.ENTRATA_MEDIA = 'https://medialibrarycf.entrata.com/';
  CS.isEntrataUrl = u => typeof u === 'string' && u.trim().startsWith(CS.ENTRATA_MEDIA) && !/\s/.test(u.trim());
  CS.loadMedia = async function () {
    CS.cfg.photos = (CS.cfg.photos || []).filter(p => p.kind !== 'entrata' && p.kind !== 'upload');
    try {
      const m = await CS.api('/reslife-creative-projects?resource=media&propertyId=' + CS.propertyId);
      CS.state.media = m;
      m.forEach(x => CS.cfg.photos.push({ id: 'm-' + x.id, mediaId: x.id, src: x.url, category: x.category || 'Other', alt: x.alt || x.title || '', title: x.title || '', tags: x.tags || [], kind: 'entrata', createdBy: x.createdBy }));
    } catch (e) { CS.state.media = []; }
  };

  CS.toggleFavorite = async function (tplId) {
    const f = CS.state.favorites;
    const i = f.indexOf(tplId);
    if (i >= 0) f.splice(i, 1); else f.unshift(tplId);
    try { localStorage.setItem('cs_fav_' + CS.propertyId, JSON.stringify(f)); } catch (e) {}
    try { await CS.api('/reslife-creative-projects', { method: 'PUT', body: JSON.stringify({ propertyId: CS.propertyId, resource: 'favorites', templateIds: f }) }); } catch (e) {}
    document.querySelectorAll(`[data-fav="${tplId}"]`).forEach(b => { b.classList.toggle('on', f.includes(tplId)); b.innerHTML = f.includes(tplId) ? '&#9733;' : '&#9734;'; });
    CS.toast(i >= 0 ? 'Removed from favorites' : 'Added to favorites');
  };

  CS.go = function (view, arg) {
    CS.state.view = view;
    document.querySelectorAll('#csNav button').forEach(b => b.classList.toggle('active', b.getAttribute('data-view') === view));
    const main = $('#csMain');
    main.innerHTML = (CS.views[view] || CS.views.home)(arg);
    main.scrollTop = 0; window.scrollTo(0, 0);
    if (CS.views['after_' + view]) CS.views['after_' + view](arg);
    CS.bindCommon(main);
    requestAnimationFrame(() => CS.render.scaleThumbs(main));
  };

  // Shared click handlers for anything rendered by views (template cards, favorites, etc.)
  CS.bindCommon = function (root) {
    root.querySelectorAll('[data-fav]').forEach(b => b.onclick = e => { e.stopPropagation(); CS.toggleFavorite(b.getAttribute('data-fav')); });
    root.querySelectorAll('[data-use]').forEach(b => b.onclick = e => { e.stopPropagation(); CS.openTemplate(b.getAttribute('data-use')); });
    root.querySelectorAll('[data-preview]').forEach(b => b.onclick = e => { e.stopPropagation(); CS.previewTemplate(b.getAttribute('data-preview')); });
    root.querySelectorAll('[data-go]').forEach(b => b.onclick = () => CS.go(b.getAttribute('data-go'), b.getAttribute('data-arg') || undefined));
  };

  // ───────────── Global search ─────────────
  function search(q) {
    q = q.trim().toLowerCase();
    if (q.length < 2) return [];
    const words = q.split(/\s+/);
    const hit = (...fields) => { const t = fields.join(' ').toLowerCase(); return words.every(w => t.includes(w)); };
    const out = [];
    CS.data.templates.forEach(t => { if (hit(t.name, t.group, (t.tags || []).join(' '), t.content.headline, t.content.body)) out.push({ g: 'Templates', label: t.name, sub: `${t.group} · ${CS.fmtLabel(t.format)}`, act: () => CS.previewTemplate(t.id), ico: 'T' }); });
    CS.data.communications.forEach(c => { if (hit(c.title, c.category, c.purpose, c.body || '', c.caption || '', c.graphicCopy || '')) out.push({ g: 'Communications', label: c.title, sub: `${c.channel.toUpperCase()} · ${c.audience}`, act: () => CS.openCommunication(c.id), ico: c.channel === 'sms' ? 'S' : c.channel === 'social' ? '#' : '@' }); });
    CS.cfg.resources.forEach(r => { if (hit(r.title, r.category, r.note || '')) out.push({ g: 'Resources', label: r.title, sub: r.category, act: () => CS.go('resources'), ico: 'R' }); });
    Object.entries(CS.cfg.info).forEach(([cat, items]) => items.forEach(i => { const txt = i.fact || i.q || ''; if (txt && hit(cat, txt, i.a || '')) out.push({ g: 'Property Info', label: txt.length > 70 ? txt.slice(0, 70) + '…' : txt, sub: cat, act: () => CS.go('resources'), ico: 'i' }); }));
    CS.state.projects.forEach(p => { if (hit(p.name, p.type, p.folder || '')) out.push({ g: 'My Projects', label: p.name, sub: `${p.type} · ${p.status}`, act: () => CS.openProject(p.id), ico: 'P' }); });
    return out.slice(0, 40);
  }
  function bindSearch() {
    const input = $('#csSearch'), box = $('#csSearchResults');
    let results = [];
    input.addEventListener('input', () => {
      results = search(input.value);
      if (!input.value.trim()) { box.classList.add('hidden'); return; }
      const groups = {};
      results.forEach((r, i) => { (groups[r.g] = groups[r.g] || []).push([r, i]); });
      box.innerHTML = results.length ? Object.entries(groups).map(([g, items]) => `<div class="cs-sr-group">${g}</div>` + items.map(([r, i]) => `<div class="cs-sr-item" data-sr="${i}"><span class="cs-sr-dot">${esc(r.ico)}</span><div><b>${esc(r.label)}</b><small>${esc(r.sub)}</small></div></div>`).join('')).join('')
        : '<div class="cs-empty" style="border:none">No matches. Try “move in”, “parent” or “game night”.</div>';
      box.classList.remove('hidden');
      box.querySelectorAll('[data-sr]').forEach(el => el.onclick = () => { box.classList.add('hidden'); input.value = ''; results[+el.getAttribute('data-sr')].act(); });
    });
    input.addEventListener('keydown', e => { if (e.key === 'Escape') { box.classList.add('hidden'); input.blur(); } if (e.key === 'Enter' && results[0]) { box.classList.add('hidden'); results[0].act(); } });
    document.addEventListener('click', e => { if (!e.target.closest('.cs-search')) box.classList.add('hidden'); });
  }

  async function boot() {
    let me;
    try {
      const r = await fetch('/.netlify/functions/me', { credentials: 'include' });
      if (!r.ok) throw new Error('auth');
      me = await r.json();
    } catch (e) { location.href = 'index.html?redirect=reslife_creative_studio.html'; return; }
    if (me.role !== 'admin' && !RESLIFE_ROLES.includes(me.role)) { location.href = 'mmp_calendar_app.html'; return; }
    CS.user = me;
    $('#csRole').textContent = ROLE_LABELS[me.role] || me.role;

    const allowed = CSRegistry.propertiesForUser(me);
    if (!allowed.length) {
      $('#csBoot').innerHTML = '<div style="max-width:420px;text-align:center"><b style="color:#0f172a;font-size:18px">Creative Studio isn’t set up for your property yet.</b><p>Your account isn’t assigned to a property with a Creative Studio brand kit. Contact your ResLife Admin.</p><a href="reslife_hub.html">Back to Reslife Hub</a></div>';
      return;
    }
    const saved = localStorage.getItem('cs_property');
    await loadProperty(allowed.includes(saved) ? saved : allowed[0]);

    // Portfolio switcher: only for admins with more than one property; standard users never see it.
    if ((me.role === 'admin' || me.properties === '*') && allowed.length > 1) {
      const sel = $('#csPropSwitch');
      sel.innerHTML = allowed.map(id => `<option value="${id}"${id === CS.propertyId ? ' selected' : ''}>${esc((CSRegistry.PROPERTIES.find(p => p.id === id) || {}).name || id)}</option>`).join('');
      sel.classList.remove('hidden');
      sel.onchange = async () => { localStorage.setItem('cs_property', sel.value); await loadProperty(sel.value); CS.go('home'); };
    }

    document.querySelectorAll('#csNav button').forEach(b => b.onclick = () => CS.go(b.getAttribute('data-view')));
    $('#csLogout').onclick = () => fetch('/.netlify/functions/auth-logout', { method: 'POST', credentials: 'include' }).finally(() => { location.href = 'index.html'; });
    $('#csModalX').onclick = CS.closeModal;
    $('#csModal').addEventListener('click', e => { if (e.target.id === 'csModal') CS.closeModal(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#csModal').classList.contains('hidden')) CS.closeModal(); });
    window.addEventListener('resize', () => CS.render.scaleThumbs());
    bindSearch();

    // Inactivity logout (matches the rest of the Reslife Hub)
    const KEY = 'mmp_last_activity', LIMIT = 12 * 3600 * 1000;
    const touch = () => { try { localStorage.setItem(KEY, Date.now().toString()); } catch (e) {} };
    touch(); ['mousedown', 'keydown', 'touchstart'].forEach(ev => document.addEventListener(ev, touch, { passive: true }));
    setInterval(() => { const l = +localStorage.getItem(KEY) || 0; if (l && Date.now() - l > LIMIT) location.href = 'index.html'; }, 60000);

    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    $('#csBoot').classList.add('hidden');
    $('#csApp').classList.remove('hidden');
    const hash = location.hash.replace('#', '');
    CS.go(CS.views[hash] ? hash : 'home');
  }

  CS.boot = boot;
})(window.CS = window.CS || {});
