/* Creative Studio — views (home, create, templates, communications, examples, brand kit, photos, projects, resources). */
(function (CS) {
  const esc = s => CS.esc(s);
  const V = CS.views = {};

  const CREATE_TILES = [
    { key: 'flyer', ico: '&#9638;', title: 'Create a Flyer', desc: 'Print-ready and digital flyers.', go: ['templates', 'all'] },
    { key: 'comm', ico: '&#9993;', title: 'Resident Communication', desc: 'Email, text, notices and community announcements.', go: ['communications', 'email'] },
    { key: 'social', ico: '#', title: 'Social Media', desc: 'Instagram posts, captions, stories and promotions.', go: ['templates', 'social'] },
    { key: 'event', ico: '&#9733;', title: 'ResLife Event', desc: 'Promote programming and community events.', go: ['templates', 'events'] },
    { key: 'signage', ico: '&#9873;', title: 'Signage', desc: 'Door, lobby, digital and directional signs.', go: ['templates', 'signage'] },
    { key: 'resource', ico: '&#9783;', title: 'Resource Guide', desc: 'Campus resources, how-tos, FAQs and education.', go: ['templates', 'occ'] },
    { key: 'parent', ico: '&#9829;', title: 'Parent & Guardian', desc: 'Communications written for families.', go: ['templates', 'parent'] },
    { key: 'example', ico: '&#10003;', title: 'Start From Example', desc: 'Browse approved examples and past work.', go: ['examples'] },
  ];

  CS.tpl = id => CS.data.templates.find(t => t.id === id);

  function card(t, opts) {
    opts = opts || {};
    const th = CS.render.thumbHTML(t);
    const fav = CS.state.favorites.includes(t.id);
    return `<div class="cs-card">
      <div class="cs-thumb ${th.cls}" data-preview="${t.id}">
        ${t.approved && !opts.hideBadge ? '<span class="cs-badge-approved">Approved</span>' : ''}
        <button class="cs-fav ${fav ? 'on' : ''}" data-fav="${t.id}" title="Favorite">${fav ? '&#9733;' : '&#9734;'}</button>
        ${th.html}
        <div class="cs-thumb-actions"><button class="cs-btn sm" data-use="${t.id}">Use Template</button><button class="cs-btn ghost sm" data-preview="${t.id}">Preview</button></div>
      </div>
      <div class="cs-card-body"><b>${esc(t.name)}</b><div class="cs-card-meta"><span class="cs-chip fmt">${esc(CS.fmtLabel(t.format))}</span><span class="cs-chip">${esc(t.group)}</span></div></div>
    </div>`;
  }
  CS.card = card;

  function projectCard(p) {
    const th = p.type === 'entrata' ? `<div class="cs-entrata-thumb"><b>HTML</b><span>Entrata</span></div>` : (p.type === 'email' || p.type === 'sms' || p.type === 'social') && !p.thumbnail ? `<div class="cs-entrata-thumb"><b>${p.type === 'sms' ? 'SMS' : p.type === 'social' ? 'POST' : 'EMAIL'}</b><span>${esc(p.name)}</span></div>` : p.thumbnail ? `<img src="${p.thumbnail}" alt="" style="width:100%;height:100%;object-fit:cover;object-position:top">` : CS.render.thumbHTML({ format: p.format, layout: p.layout, content: p.content }).html;
    const cls = p.format === 'post' ? 'sq' : p.format === 'story' ? 'story' : p.format === 'sign' ? 'sign' : '';
    return `<div class="cs-card">
      <div class="cs-thumb ${cls}" data-open-project="${p.id}">${th}</div>
      <div class="cs-card-body"><b>${esc(p.name)}</b>
        <div class="cs-card-meta"><span class="cs-chip fmt">${esc(CS.fmtLabel(p.format))}</span><span class="cs-chip ${p.status === 'final' ? 'ok' : p.status === 'pending' ? 'warn' : ''}">${esc(CS.statusLabel(p.status))}</span>${p.folder ? `<span class="cs-chip">${esc(p.folder)}</span>` : ''}</div>
        <div style="font-size:11.5px;color:var(--ui-muted);margin-top:6px">Edited ${new Date(p.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })} by ${esc(p.updatedBy || p.createdBy)}</div>
      </div>
      ${CS.canApprove(p) ? `<div class="cs-proj-actions" style="padding-bottom:6px"><button class="cs-btn xs navy" data-approve="${p.id}">Approve</button><button class="cs-btn danger xs" data-reject="${p.id}">Send back</button></div>` : ''}
      ${p.status === 'draft' && p.reviewNote ? `<div style="margin:0 14px 8px;font-size:11.5px;background:#fef2f2;color:#991b1b;border-radius:8px;padding:6px 8px">Sent back: ${esc(p.reviewNote)}</div>` : ''}
      <div class="cs-proj-actions">
        <button class="cs-btn xs" data-open-project="${p.id}">Edit</button>
        <button class="cs-btn ghost xs" data-dup-project="${p.id}">Duplicate</button>
        <button class="cs-btn ghost xs" data-dl-project="${p.id}">Download</button>
        <button class="cs-btn ghost xs" data-arch-project="${p.id}">${p.status === 'archived' ? 'Restore' : 'Archive'}</button>
      </div>
    </div>`;
  }

  function bindProjects(root) {
    root.querySelectorAll('[data-approve],[data-reject]').forEach(b => b.onclick = async () => {
      const approve = b.hasAttribute('data-approve'); const id = b.getAttribute(approve ? 'data-approve' : 'data-reject');
      let note = '';
      if (!approve) { note = prompt('What should be changed? (sent to the creator)') || ''; if (note === null) return; }
      try { await CS.api('/reslife-creative-projects', { method: 'PUT', body: JSON.stringify({ propertyId: CS.propertyId, id, action: approve ? 'approve' : 'reject', note }) }); const p = CS.state.projects.find(x => x.id === id); if (p) { p.status = approve ? 'final' : 'draft'; p.reviewNote = note; p.approvedBy = approve ? CS.user.username : ''; } CS.toast(approve ? 'Approved' : 'Sent back to creator'); CS.go(CS.state.view); }
      catch (e) { CS.toast('Review failed: ' + e.message); }
    });
    root.querySelectorAll('[data-open-project]').forEach(b => b.onclick = () => CS.openProject(b.getAttribute('data-open-project')));
    root.querySelectorAll('[data-dup-project]').forEach(b => b.onclick = async () => {
      try { const p = await CS.api('/reslife-creative-projects', { method: 'POST', body: JSON.stringify({ propertyId: CS.propertyId, action: 'duplicate', id: b.getAttribute('data-dup-project') }) }); CS.state.projects.unshift(p); CS.toast('Duplicated'); CS.go(CS.state.view); } catch (e) { CS.toast('Duplicate failed'); }
    });
    root.querySelectorAll('[data-dl-project]').forEach(b => b.onclick = () => { const p = CS.state.projects.find(x => x.id === b.getAttribute('data-dl-project')) || (CS.state.archived || []).find(x => x.id === b.getAttribute('data-dl-project')); if (p) CS.exportDesign({ format: p.format, layout: p.layout, content: p.content }, p.name, 'png'); });
    root.querySelectorAll('[data-arch-project]').forEach(b => b.onclick = async () => {
      const id = b.getAttribute('data-arch-project');
      const p = CS.state.projects.find(x => x.id === id) || (CS.state.archived || []).find(x => x.id === id);
      const status = p && p.status === 'archived' ? 'draft' : 'archived';
      try { await CS.api('/reslife-creative-projects', { method: 'PUT', body: JSON.stringify({ propertyId: CS.propertyId, id, status }) }); CS.state.projects = await CS.api('/reslife-creative-projects?propertyId=' + CS.propertyId); CS.toast(status === 'archived' ? 'Archived' : 'Restored'); CS.go('projects'); } catch (e) { CS.toast('Update failed'); }
    });
  }

  // ───────────── HOME ─────────────
  V.home = () => {
    const cfg = CS.cfg;
    const heroPhoto = CS.photo((cfg.photos.find(p => p.kind === 'property') || {}).id);
    const favs = CS.state.favorites.map(CS.tpl).filter(Boolean);
    const recommended = CS.data.templates.filter(t => t.approved).slice(0, 8);
    const popular = ['harbour-community-event', 'harbour-game-night', 'harbour-maintenance-notice', 'harbour-move-in-checklist', 'harbour-ig-event', 'harbour-parent-guide'].map(CS.tpl).filter(Boolean);
    const recent = CS.state.projects.slice(0, 4);
    return `
    <section class="cs-hero">
      ${heroPhoto ? `<div class="cs-hero-photo" style="background-image:url('${heroPhoto.src}')"></div>` : ''}
      <div class="cs-hero-inner">
        <small>${esc(cfg.name)}</small>
        <h1>Create something for your community.</h1>
        <p>Branded communications, flyers, event materials and resident resources — ready in minutes.</p>
        <div class="cs-quick">
          <button class="primary" data-quick="event">Create Event</button>
          <button data-quick="flyer">Create Flyer</button>
          <button data-quick="update">Send Resident Update</button>
          <button data-quick="social">Create Social Post</button>
          <button data-quick="sign">Create Sign</button>
          <button data-quick="guide">Create Resource Guide</button>
        </div>
      </div>
    </section>

    ${(() => { const n = CS.state.projects.filter(p => CS.canApprove(p)).length; return n ? `<div class="cs-panel" style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:12px;border-color:#fde68a;background:#fffbeb"><b style="color:#92400e">${n} creative${n > 1 ? 's' : ''} waiting for your approval</b><button class="cs-btn sm" data-go="projects" data-arg="pending">Review now</button></div>` : ''; })()}
    <div class="cs-panel" style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-bottom:6px;background:var(--brand-sand);border:none">
      <b style="color:var(--brand-primary);white-space:nowrap">&#10022; AI Assistant</b>
      <input class="cs-input" id="csHomeAi" style="flex:1;min-width:260px;background:#fff" placeholder="e.g. “Make me a flyer for a resident game night next Thursday at 7 PM in the community room”" />
      <select class="cs-select" id="csHomeAiAud" style="width:auto;background:#fff"><option value="residents">Residents</option><option value="parents">Parent / Guardian</option><option value="applicants">Applicants</option></select>
      <button class="cs-btn" id="csHomeAiGo">Create</button>
    </div>

    <section class="cs-section">
      <div class="cs-section-h"><div><h2>What do you want to create?</h2></div></div>
      <div class="cs-tiles">${CREATE_TILES.map(t => `<button class="cs-tile" data-tile="${t.key}"><span class="cs-tile-ico">${t.ico}</span><b>${t.title}</b><span>${t.desc}</span></button>`).join('')}</div>
    </section>

    ${favs.length ? `<section class="cs-section"><div class="cs-section-h"><div><h2>Favorites</h2></div></div><div class="cs-grid">${favs.slice(0, 6).map(t => card(t)).join('')}</div></section>` : ''}

    <section class="cs-section">
      <div class="cs-section-h"><div><h2>Recommended Templates</h2><p>Approved, ready-to-use designs for ${esc(cfg.shortName)}.</p></div><button class="cs-link" data-go="templates">View all &rarr;</button></div>
      <div class="cs-grid">${recommended.map(t => card(t)).join('')}</div>
    </section>

    <section class="cs-section">
      <div class="cs-section-h"><div><h2>Recent Projects</h2></div><button class="cs-link" data-go="projects">My projects &rarr;</button></div>
      ${recent.length ? `<div class="cs-grid">${recent.map(projectCard).join('')}</div>` : `<div class="cs-empty"><b>No projects yet</b>Pick a template above — your saved work will show up here.</div>`}
    </section>

    <section class="cs-section">
      <div class="cs-section-h"><div><h2>Popular Templates</h2></div><button class="cs-link" data-go="templates">Browse &rarr;</button></div>
      <div class="cs-grid">${popular.map(t => card(t)).join('')}</div>
    </section>

    <section class="cs-section">
      <div class="cs-section-h"><div><h2>Approved Examples</h2><p>See what great ${esc(cfg.shortName)} communications look like.</p></div><button class="cs-link" data-go="examples">See all &rarr;</button></div>
      <div class="cs-grid wide">${CS.data.communications.filter(c => c.channel === 'email').slice(0, 3).map(commCard).join('')}</div>
    </section>

    <section class="cs-section">
      <div class="cs-section-h"><div><h2>${esc(cfg.name)} Brand Kit</h2><p>Applied automatically to everything you create.</p></div><button class="cs-link" data-go="brand">Open brand kit &rarr;</button></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:16px">
        <div class="cs-panel" style="display:flex;align-items:center;justify-content:center;min-height:140px">${CS.logo('primary') ? `<img src="${CS.logo('primary').src}" style="max-height:80px;max-width:100%">` : ''}</div>
        <div class="cs-panel" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">${Object.values(cfg.colors).map(c => `<span title="${esc(c.name)} ${c.hex}" style="width:44px;height:44px;border-radius:12px;background:${c.hex};border:1px solid var(--ui-border)"></span>`).join('')}<div style="width:100%;font-size:12.5px;color:var(--ui-muted)">Fonts: <b style="color:var(--ui-text)">${esc(cfg.fonts.heading.family)}</b></div></div>
        <div class="cs-panel" style="padding:0;overflow:hidden;min-height:140px;background:url('${CS.graphic('wave-footer')}') bottom/100% 60% no-repeat,#fff;display:flex;align-items:flex-start"><div style="padding:18px;font-size:13px;color:var(--ui-muted)"><b style="display:block;color:var(--brand-primary)">Coastal graphics</b>Waves, dividers and corners</div></div>
      </div>
    </section>`;
  };
  V.after_home = () => {
    const main = CS.$('#csMain');
    main.querySelectorAll('[data-tile]').forEach(b => b.onclick = () => { const t = CREATE_TILES.find(x => x.key === b.getAttribute('data-tile')); CS.go(t.go[0], t.go[1]); });
    const quick = { event: () => CS.openTemplate('harbour-community-event'), flyer: () => CS.go('templates', 'all'), update: () => CS.go('communications', 'email'), social: () => CS.openTemplate('harbour-ig-event'), sign: () => CS.openTemplate('harbour-sign-lobby'), guide: () => CS.go('templates', 'occ') };
    main.querySelectorAll('[data-quick]').forEach(b => b.onclick = () => quick[b.getAttribute('data-quick')]());
    const go = () => { const v = CS.$('#csHomeAi').value.trim(); if (v) CS.aiCreateFromPrompt(v, CS.$('#csHomeAiAud').value); };
    CS.$('#csHomeAiGo').onclick = go;
    CS.$('#csHomeAi').onkeydown = e => { if (e.key === 'Enter') go(); };
    bindProjects(main); bindComms(main);
  };

  // ───────────── CREATE ─────────────
  V.create = () => `
    <div class="cs-page-h"><h1>Create</h1><p>Choose what you’re making. Everything is branded for ${esc(CS.cfg.name)} automatically.</p></div>
    <div class="cs-tiles">${CREATE_TILES.map(t => `<button class="cs-tile" data-tile="${t.key}"><span class="cs-tile-ico">${t.ico}</span><b>${t.title}</b><span>${t.desc}</span></button>`).join('')}
      <button class="cs-tile" data-go="campaigns"><span class="cs-tile-ico">&#10022;</span><b>Create Campaign</b><span>One event → flyer, posts, story, email, SMS and digital sign.</span></button>
      <button class="cs-tile" data-blank="1"><span class="cs-tile-ico">&#9744;</span><b>Blank Flyer</b><span>Start from a clean branded layout.</span></button>
    </div>`;
  V.after_create = () => {
    const main = CS.$('#csMain');
    main.querySelectorAll('[data-tile]').forEach(b => b.onclick = () => { const t = CREATE_TILES.find(x => x.key === b.getAttribute('data-tile')); CS.go(t.go[0], t.go[1]); });
    main.querySelector('[data-blank]').onclick = () => CS.openBuilder({ name: 'Untitled flyer', format: 'letter', layout: 'event', content: { headline: 'Your Headline', subheadline: 'Add a short subheadline', body: '', footer: '' } });
  };

  // ───────────── TEMPLATES ─────────────
  V.templates = (group) => {
    CS.state.tplGroup = group && group !== 'all' ? group : (group === 'all' ? '' : CS.state.tplGroup || '');
    const groups = CS.data.templateGroups;
    return `
    <div class="cs-page-h"><h1>Templates</h1><p>${CS.data.templates.length} branded templates. Hover a card to preview or use it.</p></div>
    <div class="cs-filters" id="csTplFilters">
      <button class="cs-pill ${!CS.state.tplGroup ? 'active' : ''}" data-grp="">All</button>
      <button class="cs-pill ${CS.state.tplGroup === 'fav' ? 'active' : ''}" data-grp="fav">&#9733; Favorites</button>
      ${Object.entries(groups).map(([k, v]) => `<button class="cs-pill ${CS.state.tplGroup === k ? 'active' : ''}" data-grp="${k}">${esc(v)}</button>`).join('')}
      <select class="cs-select" id="csTplFormat" style="width:auto;margin-left:auto"><option value="">All formats</option>${Object.entries(CS.data.formats).filter(([k]) => !['email', 'sms'].includes(k)).map(([k, f]) => `<option value="${k}">${esc(f.label)}</option>`).join('')}</select>
    </div>
    <div id="csTplGrid"></div>`;
  };
  V.after_templates = () => {
    const draw = () => {
      const g = CS.state.tplGroup, f = CS.$('#csTplFormat').value;
      let list = CS.data.templates;
      if (g === 'fav') list = list.filter(t => CS.state.favorites.includes(t.id));
      else if (g) list = list.filter(t => t.category === g);
      if (f) list = list.filter(t => t.format === f);
      const grid = CS.$('#csTplGrid');
      if (!list.length) { grid.innerHTML = `<div class="cs-empty"><b>${g === 'fav' ? 'No favorites yet' : 'No templates'}</b>${g === 'fav' ? 'Tap the star on any template to save it here.' : 'Try a different filter.'}</div>`; return; }
      // Group headings when showing all
      if (!g) {
        const by = {};
        list.forEach(t => (by[t.group] = by[t.group] || []).push(t));
        grid.innerHTML = Object.entries(by).map(([name, items]) => `<section class="cs-section" style="margin-top:22px"><div class="cs-section-h"><div><h2>${esc(name)}</h2></div><span class="cs-chip">${items.length}</span></div><div class="cs-grid">${items.map(t => card(t)).join('')}</div></section>`).join('');
      } else grid.innerHTML = `<div class="cs-grid">${list.map(t => card(t)).join('')}</div>`;
      CS.bindCommon(grid);
      requestAnimationFrame(() => CS.render.scaleThumbs(grid));
    };
    CS.$('#csTplFilters').querySelectorAll('[data-grp]').forEach(b => b.onclick = () => { CS.state.tplGroup = b.getAttribute('data-grp'); CS.$('#csTplFilters').querySelectorAll('[data-grp]').forEach(x => x.classList.toggle('active', x === b)); draw(); });
    CS.$('#csTplFormat').onchange = draw;
    draw();
  };

  CS.previewTemplate = (id) => {
    const t = CS.tpl(id); if (!t) return;
    const { w, h } = CS.render.size(t.format);
    const maxW = Math.min(560, window.innerWidth - 120), maxH = window.innerHeight * 0.7;
    const s = Math.min(maxW / w, maxH / h);
    CS.modal(`
      <div style="display:grid;grid-template-columns:auto minmax(220px,300px);gap:26px;align-items:start">
        <div class="cs-preview-wrap"><div style="width:${w * s}px;height:${h * s}px;position:relative;box-shadow:0 10px 30px rgba(0,0,0,.15)"><div style="transform:scale(${s});transform-origin:top left;position:absolute">${CS.render.renderDesign(t)}</div></div></div>
        <div>
          ${t.approved ? '<span class="cs-chip ok">Approved example</span>' : ''}
          <h2 style="margin:10px 0 6px;color:var(--brand-primary);font-size:24px;font-weight:900">${esc(t.name)}</h2>
          <div class="cs-card-meta"><span class="cs-chip fmt">${esc(CS.fmtLabel(t.format))}</span><span class="cs-chip">${esc(t.group)}</span><span class="cs-chip">Audience: ${esc(t.audience)}</span></div>
          <p style="color:var(--ui-muted);font-size:13.5px;line-height:1.5;margin:14px 0">Highlighted text marks details you’ll fill in or verify. Brand colors, logo and fonts are applied automatically.</p>
          <div style="display:flex;flex-direction:column;gap:8px">
            <button class="cs-btn" id="csPrevUse">Use Template</button>
            <button class="cs-btn ghost" id="csPrevFav">${CS.state.favorites.includes(t.id) ? '&#9733; Favorited' : '&#9734; Add to Favorites'}</button>
          </div>
        </div>
      </div>`);
    CS.$('#csPrevUse').onclick = () => { CS.closeModal(); CS.openTemplate(id); };
    CS.$('#csPrevFav').onclick = () => { CS.toggleFavorite(id); CS.$('#csPrevFav').innerHTML = CS.state.favorites.includes(id) ? '&#9733; Favorited' : '&#9734; Add to Favorites'; };
  };

  // ───────────── COMMUNICATIONS ─────────────
  function commCard(c) {
    const preview = c.channel === 'social' ? `${c.graphicCopy}\n\n${c.caption}` : c.body;
    return `<div class="cs-comm">
      <div class="cs-comm-meta"><span class="cs-chip fmt">${c.channel === 'sms' ? 'SMS' : c.channel === 'social' ? 'Social' : 'Email'}</span><span class="cs-chip">${esc(c.audience)}</span>${c.channel === 'sms' ? `<span class="cs-chip">${c.body.length} chars</span>` : ''}</div>
      <h3>${esc(c.title)}</h3>
      <div style="font-size:12.5px;color:var(--ui-muted)">${esc(c.purpose)}</div>
      ${c.verify ? '<div class="cs-verify">Emergency template — staff must verify final language before sending.</div>' : ''}
      <div class="cs-comm-preview">${esc(c.subject ? 'Subject: ' + c.subject + '\n\n' : '')}${esc(preview)}</div>
      <div class="cs-comm-actions"><button class="cs-btn sm" data-comm="${c.id}">Use This Template</button><button class="cs-btn ghost sm" data-comm-copy="${c.id}">${c.channel === 'email' ? 'Copy HTML' : 'Copy'}</button></div>
    </div>`;
  }
  CS.commCard = commCard;
  function bindComms(root) {
    root.querySelectorAll('[data-comm]').forEach(b => b.onclick = () => CS.openCommunication(b.getAttribute('data-comm')));
    root.querySelectorAll('[data-comm-copy]').forEach(b => b.onclick = () => { const c = CS.data.communications.find(x => x.id === b.getAttribute('data-comm-copy')); CS.copy(c.channel === 'social' ? `${c.caption}\n\n${c.hashtags || ''}` : c.channel === 'email' && c.email ? CS.email.html(c.email) : c.body); });
  }

  V.communications = (channel) => {
    CS.state.commChannel = channel || CS.state.commChannel || '';
    return `
    <div class="cs-page-h"><h1>Communication Library</h1><p>Approved starter copy for emails, texts and social posts. Pick one, personalize it, send it.</p></div>
    <div class="cs-filters" id="csCommFilters">
      ${[['', 'All'], ['email', 'Emails'], ['sms', 'Text Messages'], ['social', 'Social Media']].map(([k, l]) => `<button class="cs-pill ${CS.state.commChannel === k ? 'active' : ''}" data-ch="${k}">${l}</button>`).join('')}
      <select class="cs-select" id="csCommCat" style="width:auto;margin-left:auto"><option value="">All categories</option>${[...new Set(CS.data.communications.map(c => c.category))].map(c => `<option value="${c}">${esc(c.replace(/-/g, ' '))}</option>`).join('')}</select>
    </div>
    <div class="cs-grid wide" id="csCommGrid"></div>`;
  };
  V.after_communications = () => {
    const draw = () => {
      const ch = CS.state.commChannel, cat = CS.$('#csCommCat').value;
      const list = CS.data.communications.filter(c => (!ch || c.channel === ch) && (!cat || c.category === cat));
      CS.$('#csCommGrid').innerHTML = list.map(commCard).join('') || '<div class="cs-empty">No examples in this category.</div>';
      bindComms(CS.$('#csCommGrid'));
    };
    CS.$('#csCommFilters').querySelectorAll('[data-ch]').forEach(b => b.onclick = () => { CS.state.commChannel = b.getAttribute('data-ch'); CS.$('#csCommFilters').querySelectorAll('[data-ch]').forEach(x => x.classList.toggle('active', x === b)); draw(); });
    CS.$('#csCommCat').onchange = draw;
    draw();
  };

  // Text-channel editor (email / sms / social copy) with AI options and terminology check.
  CS.openCommunication = (id, preset) => {
    const c = preset || CS.data.communications.find(x => x.id === id); if (!c) return;
    if (c.channel === 'email') {
      const e = c.email || { subject: c.subject || c.title, preheader: '', eyebrow: 'Resident Update', headline: c.title, intro: '', greeting: '', paragraphs: String(c.body || '').split(/\n\s*\n/).map(x => x.trim()).filter(Boolean), steps: [], closing: '' };
      CS.email.editor(Object.assign({}, e, { verify: c.verify || e.verify }), { title: c.title, purpose: c.purpose, audience: c.audience, projectId: c.projectId });
      return;
    }
    const isSocial = c.channel === 'social', isSms = c.channel === 'sms';
    CS.modal(`
      <div class="cs-card-meta"><span class="cs-chip fmt">${isSms ? 'SMS' : isSocial ? 'Social' : 'Email'}</span><span class="cs-chip">${esc(c.audience)}</span></div>
      <h2 style="margin:8px 0 4px;color:var(--brand-primary);font-weight:900">${esc(c.title)}</h2>
      <p style="margin:0 0 16px;color:var(--ui-muted);font-size:13.5px">${esc(c.purpose)}</p>
      ${c.verify ? '<div class="cs-verify" style="margin-bottom:14px">Emergency template — verify every detail with your supervisor before sending.</div>' : ''}
      <div style="display:grid;grid-template-columns:1fr 280px;gap:20px">
        <div>
          ${c.subject !== undefined ? `<div class="cs-field"><label class="cs-label">Subject</label><input class="cs-input" id="ccSubject" value="${esc(c.subject)}"></div>` : ''}
          ${isSocial ? `<div class="cs-field"><label class="cs-label">Graphic copy</label><textarea class="cs-textarea" id="ccGraphic" style="min-height:60px">${esc(c.graphicCopy)}</textarea></div>
            <div class="cs-field"><label class="cs-label">Caption</label><textarea class="cs-textarea" id="ccBody">${esc(c.caption)}</textarea></div>
            <div class="cs-row"><div class="cs-field"><label class="cs-label">CTA</label><input class="cs-input" id="ccCta" value="${esc(c.cta || '')}"></div><div class="cs-field"><label class="cs-label">Hashtags (optional)</label><input class="cs-input" id="ccTags" value="${esc(c.hashtags || '')}"></div></div>`
            : `<div class="cs-field"><label class="cs-label">${isSms ? 'Message' : 'Body'} <span class="cs-count" id="ccCount"></span></label><textarea class="cs-textarea" id="ccBody" style="min-height:${isSms ? 110 : 320}px">${esc(c.body)}</textarea></div>`}
          <div id="ccGuard" class="cs-guard" style="max-width:none"></div>
        </div>
        <div>
          <label class="cs-label">AI options</label>
          <div class="cs-ai-actions" id="ccAi">${['Make Friendlier', 'Make Shorter', 'Make More Professional', 'Make More Exciting', 'Parent Focused', 'Make It More Harbour', 'Fix Grammar', 'Create SMS Version', 'Create Social Caption', 'Create Email Version'].map(a => `<button data-a="${a}">${a}</button>`).join('')}</div>
          <div style="display:flex;flex-direction:column;gap:8px;margin-top:18px">
            <button class="cs-btn" id="ccCopy">Copy</button>
            ${isSocial ? '<button class="cs-btn ghost" id="ccDesign">Design the graphic</button>' : '<button class="cs-btn ghost" id="ccFlyer">Turn into a flyer</button>'}
            <button class="cs-btn ghost" id="ccSave">Save to My Projects</button>
          </div>
        </div>
      </div>`);
    const body = CS.$('#ccBody');
    const guard = () => {
      const txt = body.value;
      const issues = CS.guardText(txt);
      if (isSms) { const n = txt.length; CS.$('#ccCount').textContent = `${n} / 160 · ${Math.ceil(n / 160) || 1} segment${n > 160 ? 's' : ''}`; CS.$('#ccCount').classList.toggle('over', n > 160); }
      CS.$('#ccGuard').innerHTML = issues.map(i => `<div class="warn">${i}</div>`).join('');
    };
    body.addEventListener('input', guard); guard();
    CS.$('#ccCopy').onclick = () => CS.copy((CS.$('#ccSubject') ? 'Subject: ' + CS.$('#ccSubject').value + '\n\n' : '') + (isSocial ? `${body.value}\n\n${CS.$('#ccTags').value}` : body.value));
    CS.$('#ccAi').querySelectorAll('[data-a]').forEach(b => b.onclick = async () => {
      const action = b.getAttribute('data-a');
      b.disabled = true;
      const out = await CS.aiRewriteText(body.value, action, c.channel, CS.$('#ccSubject') ? CS.$('#ccSubject').value : '');
      b.disabled = false;
      if (out.channel && out.channel !== c.channel) {
        CS.openCommunication(null, Object.assign({}, c, { id: c.id + '-' + out.channel, channel: out.channel, title: c.title + ' — ' + (out.channel === 'sms' ? 'SMS' : out.channel === 'social' ? 'Social' : 'Email'), body: out.body, caption: out.body, graphicCopy: out.graphicCopy || c.title, subject: out.channel === 'email' ? (out.subject || c.title) : undefined, hashtags: out.hashtags || CS.cfg.defaults.hashtags.slice(0, 3).join(' ') }));
        return;
      }
      body.value = out.body; if (out.subject && CS.$('#ccSubject')) CS.$('#ccSubject').value = out.subject; guard();
    });
    const flyer = CS.$('#ccFlyer') || CS.$('#ccDesign');
    flyer.onclick = () => { CS.closeModal(); CS.aiCreateFromPrompt((CS.$('#ccSubject') ? CS.$('#ccSubject').value + '. ' : '') + body.value, /parent/i.test(c.audience) ? 'parents' : 'residents', isSocial ? 'post' : 'letter'); };
    CS.$('#ccSave').onclick = async () => {
      try {
        const p = await CS.api('/reslife-creative-projects', { method: 'POST', body: JSON.stringify({ propertyId: CS.propertyId, name: c.title, type: c.channel, format: c.channel === 'social' ? 'post' : c.channel, folder: isSocial ? 'Social Media' : 'Resident Communications', content: { subject: CS.$('#ccSubject') ? CS.$('#ccSubject').value : '', body: body.value, headline: c.title } }) });
        CS.state.projects.unshift(p); CS.toast('Saved to My Projects');
      } catch (e) { CS.toast('Save failed: ' + e.message); }
    };
  };

  // ───────────── APPROVED EXAMPLES ─────────────
  V.examples = () => `
    <div class="cs-page-h"><h1>Approved Examples</h1><p>Strong, on-brand pieces to learn from. Use any of them as a starting point.</p></div>
    <section class="cs-section" style="margin-top:0"><div class="cs-section-h"><div><h2>Flyers &amp; Print</h2></div></div>
      <div class="cs-grid">${CS.data.templates.filter(t => t.approved).map(t => card(t, { hideBadge: true })).join('')}</div></section>
    <section class="cs-section"><div class="cs-section-h"><div><h2>Resident Emails</h2></div></div>
      <div class="cs-grid wide">${CS.data.communications.filter(c => c.channel === 'email').map(commCard).join('')}</div></section>
    <section class="cs-section"><div class="cs-section-h"><div><h2>Text Messages</h2></div></div>
      <div class="cs-grid wide">${CS.data.communications.filter(c => c.channel === 'sms').map(commCard).join('')}</div></section>
    <section class="cs-section"><div class="cs-section-h"><div><h2>Social Media</h2></div></div>
      <div class="cs-grid wide">${CS.data.communications.filter(c => c.channel === 'social').map(commCard).join('')}</div></section>`;
  V.after_examples = () => bindComms(CS.$('#csMain'));

  // ───────────── BRAND KIT ─────────────
  V.brand = () => {
    const cfg = CS.cfg;
    return `
    <div class="cs-page-h"><h1>${esc(cfg.name)} Brand Kit</h1><p>${esc(cfg.personality.join(' · '))}</p></div>
    <section class="cs-section" style="margin-top:0"><div class="cs-section-h"><div><h2>Logos</h2><p>Official files only — never recreate or alter the logo.</p></div></div>
      <div class="cs-logos">${cfg.logos.map(l => `<div class="cs-logo"><div class="cs-logo-art ${l.background === 'dark' ? 'dark' : ''} ${l.src ? '' : 'missing'}">${l.src ? `<img src="${l.src}" alt="${esc(l.label)}">` : 'Not uploaded yet'}</div><p><b>${esc(l.label)}</b>${esc(l.note)}${l.src ? ` · <a href="${l.src}" download>Download</a>` : ''}</p></div>`).join('')}</div>
      <div class="cs-rules" style="margin-top:14px">${cfg.logoRules.map(r => `<div class="cs-rule">${esc(r)}</div>`).join('')}</div>
    </section>
    <section class="cs-section"><div class="cs-section-h"><div><h2>Colors</h2><p>Click a swatch to copy its hex value. ${esc(cfg.colors.orange.name)} stays the dominant accent.</p></div></div>
      <div class="cs-swatches">${Object.values(cfg.colors).map(c => `<div class="cs-swatch" data-hex="${c.hex}"><div style="background:${c.hex}"></div><p><b>${esc(c.name)}</b>${c.hex} · ${esc(c.use)}</p></div>`).join('')}</div>
    </section>
    <section class="cs-section"><div class="cs-section-h"><div><h2>Typography</h2></div></div>
      <div class="cs-type"><div style="font-size:44px;font-weight:900;color:var(--brand-primary);line-height:1">Bold Headlines</div><div style="font-size:20px;font-weight:600;color:var(--brand-accent);margin:8px 0">Friendly subheadlines in ${esc(cfg.fonts.heading.family)}</div><div style="font-size:15px;line-height:1.6;max-width:640px">Body copy is ${esc(cfg.fonts.body.family)} Medium. Keep sentences short and scannable, with generous white space. Avoid unrelated fonts.</div></div>
    </section>
    <section class="cs-section"><div class="cs-section-h"><div><h2>Graphic Elements</h2><p>Coastal waves, dividers and corners used across every template.</p></div></div>
      <div class="cs-graphics">${cfg.graphics.map(g => `<div class="cs-graphic"><div style="background-image:url('${g.src}')"></div><p>${esc(g.label)} · <a href="${g.src}" download>SVG</a></p></div>`).join('')}</div>
    </section>
    <section class="cs-section"><div class="cs-section-h"><div><h2>Voice &amp; Terminology</h2></div></div>
      <div class="cs-rules">
        <div class="cs-rule"><b>Resident voice</b>${esc(cfg.voice.default)}</div>
        <div class="cs-rule"><b>Parent &amp; guardian voice</b>${esc(cfg.voice.parent)}</div>
        <div class="cs-rule"><b>Emergency voice</b>${esc(cfg.voice.emergency)}</div>
        <div class="cs-rule"><b>Preferred terms</b>${esc(cfg.terminology.prefer.join(' · '))}</div>
        <div class="cs-rule"><b>License Agreement</b>${esc(cfg.terminology.notes)}</div>
      </div>
    </section>
    <section class="cs-section"><div class="cs-section-h"><div><h2>Brand Guardrails</h2><p>The studio checks these for you as you design.</p></div></div>
      <div class="cs-rules">${['Logos are never distorted or recolored', 'Text over photos always sits on a contrast scrim or solid panel', 'Only brand fonts and colors are available', 'Layouts keep 0.5" print margins', 'Long copy triggers a warning before it overcrowds a layout', 'No AI-generated or altered property photos — placeholders instead', 'Unknown policies, prices or dates are flagged, never invented', '“Lease” is flagged and replaced with “License Agreement”'].map(r => `<div class="cs-rule">&#10003; ${r}</div>`).join('')}</div>
    </section>`;
  };
  V.after_brand = () => CS.$('#csMain').querySelectorAll('[data-hex]').forEach(s => s.onclick = () => CS.copy(s.getAttribute('data-hex')));

  // ───────────── PHOTOS (shared library for every editor) ─────────────
  const SRC_LABEL = { property: 'Harbour photo', campus: 'OCC campus', lifestyle: 'Lifestyle', stock: 'Stock', entrata: 'Entrata library' };
  V.photos = () => `
    <div class="cs-page-h" style="display:flex;justify-content:space-between;align-items:flex-end;gap:12px;flex-wrap:wrap">
      <div><h1>Photo Library</h1><p>Approved images for every Creative Studio editor — flyers, social posts and the Monthly Newsletter. Real photography only.</p></div>
      ${CS.isManager() ? '<button class="cs-btn" id="phAdd">+ Add Entrata Image</button>' : ''}
    </div>
    <div class="cs-ph-bar">
      <input class="cs-input" id="phSearch" placeholder="Search by name, alt text or tag…">
      <select class="cs-select" id="phCat"><option value="">All categories</option></select>
      <select class="cs-select" id="phSrc"><option value="">All sources</option><option value="entrata">Entrata library</option><option value="property">Harbour photos</option><option value="campus">OCC campus</option><option value="lifestyle">Lifestyle / stock</option></select>
      <div class="pp-viewtoggle cs-ph-view"><button type="button" class="active" data-phv="grid">Grid</button><button type="button" data-phv="list">List</button></div>
    </div>
    <div class="cs-ph-cats" id="phCats"></div>
    <div id="phGrid"></div>
    <p class="cs-hint" style="margin-top:14px">Need an image that isn’t here? Upload it to the Entrata Media Library, then ${CS.isManager() ? 'use “+ Add Entrata Image” and paste its link' : 'ask an REC or Admin to add its link here'}. Entrata links start with <code>${CS.ENTRATA_MEDIA}</code>.</p>`;

  V.after_photos = () => {
    const cats = [...new Set([...CS.cfg.photoCategories, ...CS.cfg.photos.map(p => p.category)])].filter(Boolean);
    let cat = '', view = 'grid';
    CS.$('#phCat').innerHTML = '<option value="">All categories</option>' + cats.map(c => `<option>${esc(c)}</option>`).join('');
    const draw = () => {
      const q = CS.$('#phSearch').value.trim().toLowerCase(), src = CS.$('#phSrc').value; cat = CS.$('#phCat').value;
      const all = CS.cfg.photos;
      const list = all.filter(p => (!cat || p.category === cat) && (!src || p.kind === src || (src === 'lifestyle' && p.kind === 'stock')) && (!q || [p.alt, p.title, p.category, (p.tags || []).join(' '), p.src].join(' ').toLowerCase().includes(q)));
      CS.$('#phCats').innerHTML = `<button class="cs-pill ${!cat ? 'active' : ''}" data-phc="">All <small>${all.length}</small></button>` + cats.map(c => { const n = all.filter(p => p.category === c).length; return `<button class="cs-pill ${cat === c ? 'active' : ''}${n ? '' : ' empty'}" data-phc="${esc(c)}">${esc(c)} <small>${n}</small></button>`; }).join('');
      CS.$('#phCats').querySelectorAll('[data-phc]').forEach(b => b.onclick = () => { CS.$('#phCat').value = b.getAttribute('data-phc'); draw(); });
      const grid = CS.$('#phGrid');
      if (!list.length) { grid.innerHTML = `<div class="cs-empty"><b>No images${cat ? ' in ' + esc(cat) : ''}</b>${CS.isManager() ? 'Add one from the Entrata Media Library with “+ Add Entrata Image”.' : 'Ask an REC or Admin to add images from the Entrata Media Library.'}</div>`; return; }
      grid.innerHTML = `<div class="cs-ph-${view}">${list.map(p => `
        <div class="cs-ph-card">
          <div class="cs-ph-img" data-phprev="${esc(p.id)}"><img src="${esc(p.src)}" alt="${esc(p.alt)}" loading="lazy" onerror="this.closest('.cs-ph-img').classList.add('broken')"><span class="cs-ph-broken">Image link not loading</span></div>
          <div class="cs-ph-body">
            <b>${esc(p.title || p.alt || 'Untitled image')}</b>
            <div class="cs-card-meta"><span class="cs-chip fmt">${esc(p.category)}</span><span class="cs-chip ${p.kind === 'entrata' ? 'ok' : p.kind === 'stock' ? 'warn' : ''}">${esc(SRC_LABEL[p.kind] || p.kind)}</span>${(p.tags || []).map(t => `<span class="cs-chip">${esc(t)}</span>`).join('')}</div>
            ${p.alt && p.title ? `<small>${esc(p.alt)}</small>` : ''}
            <div class="cs-ph-acts"><button class="cs-btn ghost xs" data-phcopy="${esc(p.id)}">Copy link</button>${CS.isManager() && p.kind === 'entrata' ? `<button class="cs-btn ghost xs" data-phedit="${esc(p.id)}">Edit</button><button class="cs-btn danger xs" data-phdel="${esc(p.id)}">Remove</button>` : ''}</div>
          </div>
        </div>`).join('')}</div>`;
      grid.querySelectorAll('[data-phcopy]').forEach(b => b.onclick = () => { const p = all.find(x => x.id === b.getAttribute('data-phcopy')); CS.copy(/^https?:/.test(p.src) ? p.src : location.origin + p.src); });
      grid.querySelectorAll('[data-phprev]').forEach(b => b.onclick = () => { const p = all.find(x => x.id === b.getAttribute('data-phprev')); CS.modal(`<h2 style="margin:0 0 8px;color:var(--brand-primary)">${esc(p.title || p.alt || 'Image')}</h2><div class="cs-preview-wrap"><img src="${esc(p.src)}" alt="${esc(p.alt)}" style="max-width:100%;max-height:70vh"></div><p class="cs-hint" style="word-break:break-all">${esc(/^https?:/.test(p.src) ? p.src : location.origin + p.src)}</p>`); });
      grid.querySelectorAll('[data-phedit]').forEach(b => b.onclick = () => CS.mediaForm(all.find(x => x.id === b.getAttribute('data-phedit')), () => CS.go('photos')));
      grid.querySelectorAll('[data-phdel]').forEach(b => b.onclick = async () => {
        const p = all.find(x => x.id === b.getAttribute('data-phdel'));
        if (!confirm(`Remove “${p.title || p.alt || 'this image'}” from the library? Designs that already use it keep working.`)) return;
        try { await CS.api('/reslife-creative-projects?resource=media&propertyId=' + CS.propertyId + '&id=' + p.mediaId, { method: 'DELETE' }); await CS.loadMedia(); CS.toast('Removed'); CS.go('photos'); } catch (e) { CS.toast(e.message); }
      });
    };
    ['phSearch', 'phCat', 'phSrc'].forEach(id => CS.$('#' + id).addEventListener(id === 'phSearch' ? 'input' : 'change', draw));
    CS.$('#csMain').querySelectorAll('[data-phv]').forEach(b => b.onclick = () => { view = b.getAttribute('data-phv'); CS.$('#csMain').querySelectorAll('[data-phv]').forEach(x => x.classList.toggle('active', x === b)); draw(); });
    const add = CS.$('#phAdd'); if (add) add.onclick = () => CS.mediaForm(null, () => CS.go('photos'));
    draw();
  };

  // Add / edit an Entrata Media Library image (REC/Admin). Only https://medialibrarycf.entrata.com/ links are accepted.
  CS.mediaForm = function (p, done) {
    const cats = [...new Set([...CS.cfg.photoCategories, ...CS.cfg.photos.map(x => x.category)])].filter(Boolean);
    CS.modal(`<h2 style="margin:0 0 6px;color:var(--brand-primary)">${p ? 'Edit image' : 'Add Entrata Image'}</h2>
      <p style="margin:0 0 12px;color:var(--ui-muted);font-size:13.5px">Paste the image link from the Entrata Media Library. It must start with <code>${CS.ENTRATA_MEDIA}</code></p>
      <div class="cs-field"><label class="cs-label">Entrata image link *</label><input class="cs-input" id="mfUrl" value="${esc(p ? p.src : '')}" placeholder="${CS.ENTRATA_MEDIA}2342/MLv3/…/image.jpg"></div>
      <div class="cs-ph-prev" id="mfPrev">${p ? `<img src="${esc(p.src)}" alt="">` : '<span>Preview appears here</span>'}</div>
      <div class="cs-row"><div class="cs-field"><label class="cs-label">Title</label><input class="cs-input" id="mfTitle" value="${esc(p ? p.title : '')}" placeholder="e.g. Rooftop terrace at sunset"></div>
      <div class="cs-field"><label class="cs-label">Category</label><select class="cs-select" id="mfCat">${cats.map(c => `<option${p && p.category === c ? ' selected' : ''}>${esc(c)}</option>`).join('')}<option value="Other"${p && p.category === 'Other' ? ' selected' : ''}>Other</option></select></div></div>
      <div class="cs-field"><label class="cs-label">Alt text (describe the image) *</label><input class="cs-input" id="mfAlt" value="${esc(p ? p.alt : '')}"></div>
      <div class="cs-field"><label class="cs-label">Tags (comma separated)</label><input class="cs-input" id="mfTags" value="${esc(p ? (p.tags || []).join(', ') : '')}"></div>
      <div id="mfErr"></div>
      <button class="cs-btn" id="mfSave" style="width:100%">${p ? 'Save changes' : 'Add to Photo Library'}</button>`);
    const prev = () => { const u = CS.$('#mfUrl').value.trim(); CS.$('#mfErr').innerHTML = u && !CS.isEntrataUrl(u) ? `<div class="cs-verify">Only Entrata Media Library links are allowed. The link must start with ${CS.ENTRATA_MEDIA}</div>` : ''; CS.$('#mfPrev').innerHTML = CS.isEntrataUrl(u) ? `<img src="${esc(u)}" alt="" onerror="this.parentNode.innerHTML='<span>That link didn’t load — check it in Entrata.</span>'">` : '<span>Preview appears here</span>'; };
    CS.$('#mfUrl').addEventListener('input', prev);
    CS.$('#mfSave').onclick = async () => {
      const url = CS.$('#mfUrl').value.trim(), alt = CS.$('#mfAlt').value.trim();
      if (!CS.isEntrataUrl(url)) { CS.$('#mfErr').innerHTML = `<div class="cs-verify">Only Entrata Media Library links are allowed. The link must start with ${CS.ENTRATA_MEDIA}</div>`; return; }
      if (!alt) { CS.$('#mfErr').innerHTML = '<div class="cs-verify">Add alt text so the image is accessible.</div>'; return; }
      const payload = { propertyId: CS.propertyId, resource: 'media', url, alt, title: CS.$('#mfTitle').value.trim(), category: CS.$('#mfCat').value, tags: CS.$('#mfTags').value };
      try {
        if (p) await CS.api('/reslife-creative-projects', { method: 'PUT', body: JSON.stringify(Object.assign({ id: p.mediaId }, payload)) });
        else await CS.api('/reslife-creative-projects', { method: 'POST', body: JSON.stringify(payload) });
        await CS.loadMedia(); CS.closeModal(); CS.toast(p ? 'Image updated' : 'Added to the Photo Library'); done && done();
      } catch (e) { CS.$('#mfErr').innerHTML = `<div class="cs-verify">${esc(e.message)}</div>`; }
    };
  };

  /** Shared image picker for every editor: library only, plus a pasted Entrata link. Calls done({ src, alt, link }). */
  CS.pickImage = function (done, opts) {
    opts = opts || {};
    const photos = CS.cfg.photos.filter(p => p.kind !== 'upload' && (!opts.emailSafe || true));
    const cats = [...new Set(photos.map(p => p.category))];
    CS.modal(`<h2 style="margin:0 0 6px;color:var(--brand-primary)">Choose an image</h2>
      <div class="cs-ph-bar" style="margin-bottom:10px"><input class="cs-input" id="pkQ" placeholder="Search…"><select class="cs-select" id="pkCat"><option value="">All categories</option>${cats.map(c => `<option>${esc(c)}</option>`).join('')}</select></div>
      <div class="cs-pick-grid" id="pkGrid"></div>
      <div class="cs-pick-note"><b>Don’t see the image you need?</b> Images come from the Photo Library only. Upload it to the Entrata Media Library, then paste its link below${CS.isManager() ? ' (it’s also saved to the Photo Library for everyone)' : ''}.</div>
      <div class="cs-field"><label class="cs-label">Entrata Media Library link</label><div style="display:flex;gap:6px"><input class="cs-input" id="pkUrl" placeholder="${CS.ENTRATA_MEDIA}…"><button class="cs-btn sm" id="pkUse">Use link</button></div></div>
      <div id="pkErr"></div>`);
    const draw = () => {
      const q = CS.$('#pkQ').value.trim().toLowerCase(), c = CS.$('#pkCat').value;
      const list = photos.filter(p => (!c || p.category === c) && (!q || [p.alt, p.title, p.category, (p.tags || []).join(' ')].join(' ').toLowerCase().includes(q)));
      CS.$('#pkGrid').innerHTML = list.map(p => `<button type="button" data-pk="${esc(p.id)}" title="${esc(p.alt)}"><img src="${esc(p.src)}" alt="" loading="lazy"><span>${esc(p.title || p.category)}</span>${p.kind === 'entrata' ? '<em>Entrata</em>' : ''}</button>`).join('') || '<div class="cs-empty">No images match.</div>';
      CS.$('#pkGrid').querySelectorAll('[data-pk]').forEach(b => b.onclick = () => { const p = photos.find(x => x.id === b.getAttribute('data-pk')); CS.closeModal(); done({ id: p.id, src: /^https?:/.test(p.src) ? p.src : location.origin + p.src, alt: p.alt || '', link: '' }); });
    };
    CS.$('#pkQ').oninput = draw; CS.$('#pkCat').onchange = draw; draw();
    CS.$('#pkUse').onclick = async () => {
      const u = CS.$('#pkUrl').value.trim();
      if (!CS.isEntrataUrl(u)) { CS.$('#pkErr').innerHTML = `<div class="cs-verify">That link isn’t from the Entrata Media Library. Image links must start with ${CS.ENTRATA_MEDIA}</div>`; return; }
      if (CS.isManager() && !CS.cfg.photos.some(p => p.src === u)) { try { await CS.api('/reslife-creative-projects', { method: 'POST', body: JSON.stringify({ propertyId: CS.propertyId, resource: 'media', url: u, alt: '', category: 'Other' }) }); await CS.loadMedia(); } catch (e) {} }
      CS.closeModal(); done({ src: u, alt: '', link: '' });
    };
  };

  // ───────────── PROJECTS ─────────────
  V.projects = (arg) => (arg === 'pending' && (CS.state.projectFolder = '__pending'), `
    <div class="cs-page-h" style="display:flex;justify-content:space-between;align-items:flex-end;gap:12px;flex-wrap:wrap"><div><h1>My Projects</h1><p>Everything your team has saved for ${esc(CS.cfg.shortName)}.</p></div><button class="cs-btn" data-go="create">+ New Project</button></div>
    <div class="cs-proj-layout">
      <div>
        <div class="cs-folders" id="csFolders"></div>
        <div style="display:flex;gap:6px;margin-top:10px"><input class="cs-input" id="csNewFolder" placeholder="New folder" style="padding:8px 10px;font-size:13px"><button class="cs-btn sm" id="csAddFolder">Add</button></div>
      </div>
      <div><input class="cs-input" id="csProjSearch" placeholder="Search projects…" style="margin-bottom:16px;max-width:360px"><div id="csProjGrid"></div></div>
    </div>`);
  V.after_projects = async () => {
    const folderNames = () => [...new Set([...CS.cfg.projectFolders, ...CS.state.folders.map(f => f.name)])];
    const drawFolders = () => {
      const all = CS.state.projects;
      const items = [['all', 'All projects', all.length], ['__pending', CS.isManager() ? 'Pending approval' : 'My pending', all.filter(p => p.status === 'pending').length], ['__final', 'Approved', all.filter(p => p.status === 'final').length], ['__drafts', 'Drafts', all.filter(p => p.status === 'draft').length], ...folderNames().map(n => [n, n, all.filter(p => p.folder === n).length]), ['__none', 'Unfiled', all.filter(p => !p.folder).length], ['__archived', 'Archived', (CS.state.archived || []).length]];
      CS.$('#csFolders').innerHTML = items.map(([k, l, n]) => `<button class="${CS.state.projectFolder === k ? 'active' : ''}" data-folder="${esc(k)}"><span>${esc(l)}</span><small>${n}</small></button>`).join('');
      CS.$('#csFolders').querySelectorAll('[data-folder]').forEach(b => b.onclick = async () => { CS.state.projectFolder = b.getAttribute('data-folder'); if (CS.state.projectFolder === '__archived') { try { CS.state.archived = await CS.api('/reslife-creative-projects?archived=1&propertyId=' + CS.propertyId); } catch (e) { CS.state.archived = []; } } drawFolders(); drawGrid(); });
    };
    const drawGrid = () => {
      const f = CS.state.projectFolder, q = CS.$('#csProjSearch').value.trim().toLowerCase();
      let list = f === '__archived' ? (CS.state.archived || []) : CS.state.projects;
      const st = { __pending: 'pending', __final: 'final', __drafts: 'draft' }[f];
      if (st) list = list.filter(p => p.status === st);
      else if (f === '__none') list = list.filter(p => !p.folder); else if (f !== 'all' && f !== '__archived') list = list.filter(p => p.folder === f);
      if (q) list = list.filter(p => (p.name + ' ' + p.type).toLowerCase().includes(q));
      const grid = CS.$('#csProjGrid');
      grid.innerHTML = list.length ? `<div class="cs-grid">${list.map(projectCard).join('')}</div>` : '<div class="cs-empty"><b>Nothing here yet</b>Save a design from the builder and choose this folder.</div>';
      bindProjects(grid); requestAnimationFrame(() => CS.render.scaleThumbs(grid));
    };
    CS.$('#csProjSearch').oninput = drawGrid;
    CS.$('#csAddFolder').onclick = async () => {
      const name = CS.$('#csNewFolder').value.trim(); if (!name) return;
      try { const f = await CS.api('/reslife-creative-projects', { method: 'POST', body: JSON.stringify({ propertyId: CS.propertyId, resource: 'folders', name }) }); CS.state.folders.push(f); CS.$('#csNewFolder').value = ''; drawFolders(); } catch (e) { CS.toast('Could not add folder'); }
    };
    drawFolders(); drawGrid();
  };

  // ───────────── RESOURCES (shared with the Reslife Hub “Resources” tab via resources-shared.js) ─────────────
  V.resources = () => '<div id="csResources"></div>';
  V.after_resources = () => {
    RLResources.mount(CS.$('#csResources'), {
      propertyId: CS.propertyId, propertyName: CS.cfg.name, canEdit: CS.isManager(), username: CS.user.username,
      defaults: CS.cfg.defaultResources || CS.cfg.resources, info: CS.cfg.info, infoTitle: CS.cfg.shortName + ' Information Library',
      title: 'Property Resources', otherPage: 'Reslife Hub Resources tab',
      onChange: list => { CS.cfg.resources = list; },
    });
  };
})(window.CS = window.CS || {});
