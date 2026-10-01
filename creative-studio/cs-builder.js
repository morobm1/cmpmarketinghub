/* Creative Studio — builder (editor), brand guardrails, exports, campaigns. */
(function (CS) {
  const esc = s => CS.esc(s);
  const $ = CS.$;
  const LAYOUTS = { event: 'Event', guide: 'Step Guide', checklist: 'Checklist', notice: 'Notice', spotlight: 'Spotlight', parent: 'Parent Guide' };
  const LIMITS = { headline: 40, subheadline: 80, body: 420, cta: 32 };
  let B = null; // current builder session

  // ───────── Guardrails ─────────
  CS.guardText = function (txt) {
    const issues = [];
    if (/\blease\b/i.test(txt) && !/license agreement/i.test(txt.match(/.{0,20}\blease\b.{0,20}/i)[0])) issues.push('Uses “lease” — this property uses <b>License Agreement</b>. Use the AI “Fix Grammar” option to correct it.');
    if (/\btenants?\b/i.test(txt)) issues.push('Uses “tenant” — prefer <b>Resident</b>.');
    if (/\bthe harbor\b/i.test(txt)) issues.push('Spelling: <b>The Harbour</b>.');
    const ph = (txt.match(/\[\[(.+?)\]\]/g) || []).length;
    if (ph) issues.push(`${ph} detail${ph > 1 ? 's' : ''} still need${ph > 1 ? '' : 's'} to be filled in or verified (highlighted [[like this]]).`);
    if (/\$\s?\d/.test(txt)) issues.push('Contains a price — confirm it matches the current approved figure before publishing.');
    return issues;
  };
  function guardDesign(doc) {
    const c = doc.content, issues = [];
    ['headline', 'subheadline', 'body', 'cta'].forEach(k => { if (String(c[k] || '').length > LIMITS[k] * (doc.format === 'letter' || doc.format === 'notice' ? 1 : 0.6)) issues.push(`${k[0].toUpperCase() + k.slice(1)} is long — shorten it to avoid an overcrowded layout.`); });
    const lines = CS.render.parseBody(c.body).lines.length;
    if (lines > 8) issues.push('More than 8 body lines — consider splitting into two pieces.');
    const p = CS.photo(c.photo);
    if (!c.photo && ['event', 'spotlight', 'parent'].includes(doc.layout)) issues.push('No photo selected — a placeholder is showing. Choose a real photo in Images.');
    if (p && p.kind === 'stock') issues.push('This is a stock image, not The Harbour — don’t present it as the property.');
    if (c.qr && !/^(https?:\/\/|mailto:|tel:)/i.test(c.qr)) issues.push('QR destination should be a full link (https://…).');
    issues.push(...CS.guardText([c.headline, c.subheadline, c.body, c.cta, c.date, c.time, c.location, c.contact].join(' \n ')));
    return issues;
  }

  // ───────── Export ─────────
  async function renderToCanvas(doc, scale, clean) {
    const host = $('#csRenderHost');
    host.innerHTML = CS.render.renderDesign(doc, { clean });
    const el = host.firstElementChild;
    await Promise.all([...el.querySelectorAll('img')].map(img => img.complete ? null : new Promise(r => { img.onload = img.onerror = r; })));
    const bgs = [...el.querySelectorAll('[style*="background-image"]')].map(n => (n.style.backgroundImage.match(/url\(["']?(.*?)["']?\)/) || [])[1]).filter(Boolean);
    await Promise.all(bgs.map(src => new Promise(r => { const i = new Image(); i.onload = i.onerror = r; i.src = src; })));
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    const canvas = await html2canvas(el, { scale, useCORS: true, backgroundColor: '#ffffff', logging: false });
    host.innerHTML = '';
    return canvas;
  }
  function download(url, name) { const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); }
  const slug = s => String(s || 'design').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

  CS.exportDesign = async function (doc, name, kind) {
    const placeholders = /\[\[/.test(JSON.stringify(doc.content));
    if (placeholders && !confirm('Some details are still highlighted as [[placeholders]]. Export anyway?')) return;
    CS.toast('Preparing your file…');
    try {
      const fmt = CS.data.formats[doc.format] || {};
      // Letter/notice: 3× = 288 dpi (png & standard pdf), 3.125× = 300 dpi (print pdf). Social/sign export at native size ×1–2.
      const isPrint = !!fmt.print;
      const scale = kind === 'print' ? 3.125 : isPrint ? 3 : (fmt.w > 1200 ? 1 : 2);
      const canvas = await renderToCanvas(doc, scale, true);
      if (kind === 'png') { download(canvas.toDataURL('image/png'), slug(name) + '.png'); }
      else {
        const { jsPDF } = window.jspdf;
        const wIn = isPrint ? fmt.print.w : fmt.w / 96, hIn = isPrint ? fmt.print.h : fmt.h / 96;
        const pdf = new jsPDF({ unit: 'in', format: [wIn, hIn], orientation: wIn > hIn ? 'landscape' : 'portrait', compress: kind !== 'print' });
        const img = kind === 'print' ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', 0.92);
        pdf.addImage(img, kind === 'print' ? 'PNG' : 'JPEG', 0, 0, wIn, hIn, undefined, kind === 'print' ? 'NONE' : 'FAST');
        pdf.save(slug(name) + (kind === 'print' ? '-print' : '') + '.pdf');
      }
      CS.toast('Downloaded');
    } catch (e) { console.error(e); CS.toast('Export failed: ' + e.message); }
  };
  async function thumbnail(doc) {
    try {
      const { w } = CS.render.size(doc.format);
      const canvas = await renderToCanvas(doc, Math.min(1, 360 / w), true);
      return canvas.toDataURL('image/jpeg', 0.72);
    } catch (e) { return ''; }
  }

  // ───────── Open helpers ─────────
  CS.openTemplate = function (id) {
    const t = CS.tpl(id); if (!t) return;
    CS.openBuilder({ name: t.name, format: t.format, layout: t.layout, templateId: t.id, audience: t.audience, folder: folderFor(t), content: JSON.parse(JSON.stringify(t.content)) });
  };
  CS.openProject = function (id) {
    const p = CS.state.projects.find(x => x.id === id) || (CS.state.archived || []).find(x => x.id === id); if (!p) return;
    if (p.type === 'entrata') { CS.go('entrata', p.id); return; }
    if (p.type === 'email' && p.content && p.content.email) { CS.email.editor(p.content.email, { title: p.name, projectId: p.id, folder: p.folder }); return; }
    if (['email', 'sms', 'social'].includes(p.type) && !['post', 'story', 'sign', 'letter', 'notice'].includes(p.format)) {
      CS.openCommunication(null, { id: p.id, title: p.name, channel: p.type, audience: 'Residents', purpose: 'Saved project', subject: p.type === 'email' ? (p.content.subject || '') : undefined, body: p.content.body || '', caption: p.content.body || '', graphicCopy: p.content.headline || '' });
      return;
    }
    CS.openBuilder({ projectId: p.id, name: p.name, format: p.format, layout: p.layout, templateId: p.templateId, folder: p.folder, status: p.status, content: JSON.parse(JSON.stringify(p.content || {})) });
  };
  function folderFor(t) {
    return { events: 'Events', resident: 'Resident Communications', occ: 'Resources', housing: 'Housing Information', parent: 'Parent Resources', social: 'Social Media', signage: 'Events' }[t.category] || '';
  }

  // ───────── Builder ─────────
  CS.openBuilder = function (opts) {
    B = Object.assign({ tab: 'content', zoom: 'fit', status: 'draft', folder: '', audience: 'residents' }, opts);
    B.content = Object.assign({ headline: '', subheadline: '', body: '', date: '', time: '', location: '', cta: '', qr: '', contact: '', photo: '', footer: '' }, B.content);
    const el = $('#csBuilder');
    el.innerHTML = `
      <div class="cs-b-top">
        <button class="cs-btn ghost sm" id="bBack">&larr; Back</button>
        <input class="cs-b-title" id="bName" value="${esc(B.name)}" aria-label="Project name" />
        <span class="cs-chip fmt" id="bFmt">${esc(CS.fmtLabel(B.format))}</span>
        <div style="margin-left:auto;display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <select class="cs-select" id="bFolder" style="width:auto;padding:7px 10px;font-size:13px"><option value="">No folder</option>${[...new Set([...CS.cfg.projectFolders, ...CS.state.folders.map(f => f.name)])].map(f => `<option${f === B.folder ? ' selected' : ''}>${esc(f)}</option>`).join('')}</select>
          <span class="cs-chip ${B.status === 'final' ? 'ok' : B.status === 'pending' ? 'warn' : ''}" id="bStatusChip">${esc(CS.statusLabel(B.status))}</span>
          <button class="cs-btn ghost sm" id="bSave">Save Draft</button>
          <button class="cs-btn navy sm" id="bFinal">${esc(CS.finalLabel())}</button>
          <div style="position:relative">
            <button class="cs-btn sm" id="bExport">Download &#9662;</button>
            <div id="bExportMenu" class="hidden" style="position:absolute;right:0;top:calc(100% + 6px);background:#fff;border:1px solid var(--ui-border);border-radius:14px;box-shadow:var(--shadow-hover);padding:6px;min-width:220px;z-index:5">
              <button class="cs-btn ghost sm" style="width:100%;justify-content:flex-start;border:none" data-exp="png">PNG image</button>
              <button class="cs-btn ghost sm" style="width:100%;justify-content:flex-start;border:none" data-exp="pdf">PDF</button>
              <button class="cs-btn ghost sm" style="width:100%;justify-content:flex-start;border:none" data-exp="print">Print-quality PDF (300 dpi)</button>
            </div>
          </div>
        </div>
      </div>
      <div class="cs-b-body">
        <div class="cs-b-tabs">
          <button data-btab="content" class="active"><i>&#9998;</i>Content</button>
          <button data-btab="images"><i>&#9635;</i>Images</button>
          <button data-btab="brand"><i>&#9673;</i>Brand</button>
          <button data-btab="layout"><i>&#9638;</i>Layout</button>
        </div>
        <div class="cs-b-panel" id="bPanel"></div>
        <div class="cs-b-stage" id="bStage">
          <div class="cs-b-zoom"><button class="cs-btn ghost xs" data-zoom="fit">Fit</button><button class="cs-btn ghost xs" data-zoom="0.5">50%</button><button class="cs-btn ghost xs" data-zoom="1">100%</button></div>
          <div class="cs-b-canvas" id="bCanvas"><div class="cs-b-canvas-inner" id="bCanvasInner"></div></div>
          <div class="cs-guard" id="bGuard"></div>
        </div>
      </div>`;
    el.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    $('#bBack').onclick = closeBuilder;
    $('#bName').oninput = e => { B.name = e.target.value; };
    $('#bFolder').onchange = e => { B.folder = e.target.value; };
    $('#bSave').onclick = () => save('draft');
    $('#bFinal').onclick = () => save('final');
    $('#bExport').onclick = e => { e.stopPropagation(); $('#bExportMenu').classList.toggle('hidden'); };
    el.querySelectorAll('[data-exp]').forEach(b => b.onclick = () => { $('#bExportMenu').classList.add('hidden'); CS.exportDesign(doc(), B.name, b.getAttribute('data-exp')); });
    el.addEventListener('click', e => { if (!e.target.closest('#bExport')) $('#bExportMenu') && $('#bExportMenu').classList.add('hidden'); });
    el.querySelectorAll('[data-btab]').forEach(b => b.onclick = () => { B.tab = b.getAttribute('data-btab'); el.querySelectorAll('[data-btab]').forEach(x => x.classList.toggle('active', x === b)); panel(); });
    el.querySelectorAll('[data-zoom]').forEach(b => b.onclick = () => { B.zoom = b.getAttribute('data-zoom'); preview(); });
    window.addEventListener('resize', preview);
    panel(); preview();
    if (B.aiNote) CS.toast(B.aiNote);
  };

  function closeBuilder() {
    $('#csBuilder').classList.add('hidden'); $('#csBuilder').innerHTML = '';
    document.body.style.overflow = '';
    window.removeEventListener('resize', preview);
    B = null;
    CS.go(CS.state.view);
  }

  const doc = () => ({ format: B.format, layout: B.layout, content: B.content });
  const isSocialFmt = () => ['post', 'story', 'sign'].includes(B.format);

  function preview() {
    if (!B) return;
    const { w, h } = CS.render.size(B.format);
    const stage = $('#bStage');
    const avail = Math.max(280, stage.clientWidth - 56), availH = Math.max(320, window.innerHeight - 62 - 140);
    const s = B.zoom === 'fit' ? Math.min(avail / w, availH / h, 1) : +B.zoom;
    $('#bCanvas').style.width = w * s + 'px'; $('#bCanvas').style.height = h * s + 'px';
    const inner = $('#bCanvasInner');
    inner.style.transform = `scale(${s})`;
    inner.innerHTML = CS.render.renderDesign(doc());
    const issues = guardDesign(doc());
    $('#bGuard').innerHTML = issues.length ? issues.map(i => `<div class="warn">&#9888; ${i}</div>`).join('') : '<div class="ok">&#10003; Looks on-brand and ready to export.</div>';
  }

  function field(key, label, type, ph) {
    const v = B.content[key] || '';
    const lim = LIMITS[key];
    const count = lim ? `<span class="cs-count${v.length > lim ? ' over' : ''}" data-count="${key}">${v.length}/${lim}</span>` : '';
    if (type === 'textarea') return `<div class="cs-field"><label class="cs-label">${label}${count}</label><textarea class="cs-textarea" data-f="${key}" placeholder="${esc(ph || '')}">${esc(v)}</textarea></div>`;
    return `<div class="cs-field"><label class="cs-label">${label}${count}</label><input class="cs-input" data-f="${key}" value="${esc(v)}" placeholder="${esc(ph || '')}" /></div>`;
  }

  function panel() {
    const p = $('#bPanel');
    if (B.tab === 'content') {
      p.innerHTML = `<h3>Content</h3>
        ${field('headline', 'Headline')}
        ${field('subheadline', 'Subheadline')}
        ${isSocialFmt() ? '' : field('body', 'Body', 'textarea', 'Start lines with "- " for bullet steps, or "Title: text" for feature cards')}
        <div class="cs-row">${field('date', 'Date', 'text', 'Thursday, Oct 9')}${field('time', 'Time', 'text', '7:00 PM')}</div>
        ${field('location', 'Location', 'text', 'Community Room')}
        ${isSocialFmt() ? '' : field('cta', 'Call to action')}
        ${isSocialFmt() ? '' : field('qr', 'QR code link', 'text', CS.cfg.defaults.ctaUrl)}
        ${isSocialFmt() ? '' : field('contact', 'Contact', 'text', 'Office email or phone')}
        ${isSocialFmt() ? '' : field('footer', 'Footer (optional)', 'text', CS.cfg.defaults.footer)}
        <div class="cs-ai">
          <label class="cs-label">&#10022; AI assistant</label>
          <div style="display:flex;gap:6px;margin-bottom:10px"><input class="cs-input" id="bAiReq" placeholder="Describe it: “resident taco night Friday 6pm courtyard”" /><button class="cs-btn sm" id="bAiGo">Write</button></div>
          <div class="cs-ai-actions">${['Make Friendlier', 'Make Shorter', 'Make More Professional', 'Make More Exciting', 'Resident Focused', 'Parent Focused', 'Make It More Harbour', 'Fix Grammar', 'Create Social Caption', 'Create SMS Version', 'Create Email Version'].map(a => `<button data-ai="${a}">${a}</button>`).join('')}</div>
        </div>`;
      p.querySelectorAll('[data-f]').forEach(inp => inp.oninput = () => {
        const k = inp.getAttribute('data-f'); B.content[k] = inp.value;
        const c = p.querySelector(`[data-count="${k}"]`); if (c) { c.textContent = `${inp.value.length}/${LIMITS[k]}`; c.classList.toggle('over', inp.value.length > LIMITS[k]); }
        preview();
      });
      $('#bAiGo').onclick = async () => {
        const req = $('#bAiReq').value.trim(); if (!req) return;
        $('#bAiGo').disabled = true;
        const r = await CS.aiGenerate(req, B.audience, B.format);
        $('#bAiGo').disabled = false;
        ['headline', 'subheadline', 'body', 'date', 'time', 'location', 'cta', 'contact'].forEach(k => { if (r[k]) B.content[k] = r[k]; });
        if (r.layout && !isSocialFmt() && B.format !== 'notice') B.layout = r.layout;
        panel(); preview(); CS.toast(r._provider === 'built-in' ? 'Drafted — review highlighted details' : 'Drafted with AI');
      };
      p.querySelectorAll('[data-ai]').forEach(b => b.onclick = async () => {
        const action = b.getAttribute('data-ai');
        b.disabled = true;
        const out = await CS.aiRewriteFields(Object.assign({ layout: B.layout }, B.content), action, B.format, B.audience);
        b.disabled = false;
        if (out.convert) { showConverted(out); return; }
        if (out.layout && out.layout !== B.layout && !isSocialFmt()) B.layout = out.layout;
        if (action === 'Parent Focused') B.audience = 'parents';
        delete out.layout; Object.assign(B.content, out);
        panel(); preview();
      });
    } else if (B.tab === 'images') {
      const photos = CS.cfg.photos;
      p.innerHTML = `<h3>Images</h3>
        <p style="font-size:12.5px;color:var(--ui-muted);margin:0 0 12px">Approved photos only. Photos keep their original proportions and are never AI-altered.</p>
        <div class="cs-photo-pick">
          <button data-photo="" class="${!B.content.photo ? 'active' : ''}" style="display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:var(--ui-muted)">Placeholder</button>
          ${photos.map(ph => `<button data-photo="${ph.id}" class="${B.content.photo === ph.id ? 'active' : ''}" title="${esc(ph.alt)}${ph.kind === 'stock' ? ' (stock)' : ''}"><img src="${ph.src}" alt="${esc(ph.alt)}"></button>`).join('')}
        </div>
        <div class="cs-field" style="margin-top:16px"><label class="cs-label">Use your own photo</label><input type="file" accept="image/*" id="bUpload" class="cs-input" /><small style="color:var(--ui-muted);font-size:11.5px">Real photos only. Kept in this project for this session; ask an admin to add it to the library permanently.</small></div>`;
      p.querySelectorAll('[data-photo]').forEach(b => b.onclick = () => { B.content.photo = b.getAttribute('data-photo'); panel(); preview(); });
      $('#bUpload').onchange = e => {
        const f = e.target.files[0]; if (!f) return;
        const r = new FileReader();
        r.onload = () => { const id = 'upload-' + Date.now(); CS.cfg.photos.push({ id, src: r.result, category: 'Students/community', alt: f.name, kind: 'upload' }); B.content.photo = id; panel(); preview(); };
        r.readAsDataURL(f);
      };
    } else if (B.tab === 'brand') {
      const cfg = CS.cfg;
      p.innerHTML = `<h3>Brand</h3>
        <p style="font-size:12.5px;color:var(--ui-muted);margin:0 0 14px">The ${esc(cfg.name)} brand kit is applied automatically. Colors, fonts and logos are locked to keep everything on-brand.</p>
        <label class="cs-label">Logo</label>
        <div style="display:flex;gap:8px;margin-bottom:16px">${cfg.logos.filter(l => l.src).map(l => `<div style="flex:1;border:1px solid var(--ui-border);border-radius:12px;padding:10px;display:flex;align-items:center;justify-content:center;height:70px;${l.background === 'dark' ? 'background:var(--brand-primary)' : ''}"><img src="${l.src}" style="max-height:44px;max-width:100%"></div>`).join('')}</div>
        <label class="cs-label">Colors</label>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px">${Object.values(cfg.colors).map(c => `<span title="${esc(c.name)}" style="width:36px;height:36px;border-radius:10px;background:${c.hex};border:1px solid var(--ui-border)"></span>`).join('')}</div>
        <label class="cs-label">Audience</label>
        <select class="cs-select" id="bAudience"><option value="residents">Residents</option><option value="parents">Parent / Guardian</option><option value="applicants">Applicants</option></select>
        <div class="cs-rule" style="margin-top:16px;font-size:12.5px"><b>Terminology</b>${esc(cfg.terminology.notes)}</div>`;
      $('#bAudience').value = B.audience;
      $('#bAudience').onchange = e => { B.audience = e.target.value; };
    } else {
      const formats = ['letter', 'notice', 'post', 'story', 'sign'];
      p.innerHTML = `<h3>Layout</h3>
        ${!isSocialFmt() ? `<label class="cs-label">Design</label><div class="cs-layouts" style="margin-bottom:18px">${Object.entries(LAYOUTS).map(([k, l]) => `<button data-layout="${k}" class="${B.layout === k ? 'active' : ''}">${l}</button>`).join('')}</div>` : ''}
        <label class="cs-label">Format</label>
        <div class="cs-layouts">${formats.map(f => `<button data-format="${f}" class="${B.format === f ? 'active' : ''}">${esc(CS.fmtLabel(f))}</button>`).join('')}</div>
        <p style="font-size:12px;color:var(--ui-muted);margin-top:14px">Switching format keeps your content. Social formats use shorter copy automatically.</p>`;
      p.querySelectorAll('[data-layout]').forEach(b => b.onclick = () => { B.layout = b.getAttribute('data-layout'); panel(); preview(); });
      p.querySelectorAll('[data-format]').forEach(b => b.onclick = () => {
        const f = b.getAttribute('data-format'); B.format = f;
        if (f === 'notice') B.layout = 'notice'; else if (f === 'letter' && B.layout === 'notice') B.layout = 'event';
        if (!B.layout) B.layout = 'event';
        $('#bFmt').textContent = CS.fmtLabel(f); panel(); preview();
      });
    }
  }

  function showConverted(out) {
    if (out.convert === 'email' && B) { CS.email.editor(CS.email.fromContent(B.content, { audience: B.audience }), { title: B.name + ' — Email', audience: B.audience, folder: 'Resident Communications' }); return; }
    const label = out.convert === 'sms' ? 'SMS Version' : out.convert === 'email' ? 'Email Version' : 'Social Caption';
    CS.modal(`
      <h2 style="margin:0 0 12px;color:var(--brand-primary);font-weight:900">${label}</h2>
      ${out.subject ? `<div class="cs-field"><label class="cs-label">Subject</label><input class="cs-input" id="cvSubj" value="${esc(out.subject)}"></div>` : ''}
      <div class="cs-field"><label class="cs-label">${out.convert === 'social' ? 'Caption' : 'Message'} <span class="cs-count" id="cvCount"></span></label><textarea class="cs-textarea" id="cvBody" style="min-height:${out.convert === 'email' ? 280 : 120}px">${esc(out.body || '')}</textarea></div>
      ${out.hashtags ? `<div class="cs-field"><label class="cs-label">Hashtags (optional)</label><input class="cs-input" id="cvTags" value="${esc(out.hashtags)}"></div>` : ''}
      <div style="display:flex;gap:8px"><button class="cs-btn" id="cvCopy">Copy</button><button class="cs-btn ghost" id="cvSave">Save to My Projects</button></div>`);
    const upd = () => { const n = $('#cvBody').value.length; $('#cvCount').textContent = out.convert === 'sms' ? `${n}/160` : `${n} chars`; $('#cvCount').classList.toggle('over', out.convert === 'sms' && n > 160); };
    $('#cvBody').oninput = upd; upd();
    $('#cvCopy').onclick = () => CS.copy(($('#cvSubj') ? 'Subject: ' + $('#cvSubj').value + '\n\n' : '') + $('#cvBody').value + ($('#cvTags') ? '\n\n' + $('#cvTags').value : ''));
    $('#cvSave').onclick = async () => {
      try { const p = await CS.api('/reslife-creative-projects', { method: 'POST', body: JSON.stringify({ propertyId: CS.propertyId, name: (B ? B.name : 'Campaign') + ' — ' + label, type: out.convert, format: out.convert, folder: out.convert === 'social' ? 'Social Media' : 'Resident Communications', content: { subject: $('#cvSubj') ? $('#cvSubj').value : '', body: $('#cvBody').value, headline: B ? B.content.headline : '' } }) }); CS.state.projects.unshift(p); CS.toast('Saved'); }
      catch (e) { CS.toast('Save failed'); }
    };
  }

  async function save(kind) {
    const btn = kind === 'final' ? $('#bFinal') : $('#bSave'); const label = btn.textContent; btn.disabled = true; btn.textContent = 'Saving…';
    B.status = kind === 'final' ? 'final' : 'draft';
    try {
      const thumb = await thumbnail(doc());
      const payload = { propertyId: CS.propertyId, name: B.name, type: isSocialFmt() ? 'social' : B.format === 'notice' ? 'notice' : 'flyer', format: B.format, layout: B.layout, templateId: B.templateId || '', folder: B.folder, status: B.status, content: B.content, thumbnail: thumb, campaignId: B.campaignId || '' };
      if (B.projectId) {
        const r = await CS.api('/reslife-creative-projects', { method: 'PUT', body: JSON.stringify(Object.assign({ id: B.projectId }, payload)) });
        B.status = r.status || B.status;
        const i = CS.state.projects.findIndex(x => x.id === B.projectId);
        if (i >= 0) CS.state.projects[i] = Object.assign(CS.state.projects[i], payload, { status: B.status, updatedAt: new Date().toISOString(), updatedBy: CS.user.username });
      } else {
        const p = await CS.api('/reslife-creative-projects', { method: 'POST', body: JSON.stringify(payload) });
        B.projectId = p.id; B.status = p.status; CS.state.projects.unshift(p);
      }
      const chip = $('#bStatusChip'); chip.textContent = CS.statusLabel(B.status); chip.className = 'cs-chip ' + (B.status === 'final' ? 'ok' : B.status === 'pending' ? 'warn' : '');
      CS.toast(B.status === 'pending' ? 'Submitted — pending approval by an Admin or REC' : B.status === 'final' ? 'Saved as final' : 'Draft saved');
    } catch (e) { CS.toast('Save failed: ' + e.message); }
    btn.disabled = false; btn.textContent = label;
  }

  // ───────── CAMPAIGNS ─────────
  CS.views.campaigns = () => `
    <div class="cs-page-h"><h1>Create a Campaign</h1><p>Enter your event once. Get a matching flyer, Instagram post, story, digital sign, resident email and SMS reminder.</p></div>
    <div class="cs-campaign-form">
      <div class="cs-panel">
        <div class="cs-field"><label class="cs-label">Event name</label><input class="cs-input" id="cpName" placeholder="Resident Movie Night"></div>
        <div class="cs-row"><div class="cs-field"><label class="cs-label">Date</label><input class="cs-input" id="cpDate" type="date"></div><div class="cs-field"><label class="cs-label">Time</label><input class="cs-input" id="cpTime" type="time"></div></div>
        <div class="cs-field"><label class="cs-label">Location</label><input class="cs-input" id="cpLoc" placeholder="Community Room"></div>
        <div class="cs-field"><label class="cs-label">Description</label><textarea class="cs-textarea" id="cpDesc" placeholder="Popcorn, snacks and a fan-favorite film on the big screen."></textarea></div>
        <div class="cs-row">
          <div class="cs-field"><label class="cs-label">Photo</label><select class="cs-select" id="cpPhoto">${CS.cfg.photos.filter(p => p.kind !== 'stock').map(p => `<option value="${p.id}">${esc(p.alt)}</option>`).join('')}<option value="">Placeholder</option></select></div>
          <div class="cs-field"><label class="cs-label">Audience</label><select class="cs-select" id="cpAud"><option value="residents">Residents</option><option value="parents">Parent / Guardian</option></select></div>
        </div>
        <button class="cs-btn" id="cpGo" style="width:100%">Generate Campaign</button>
      </div>
      <div id="cpOut"><div class="cs-empty"><b>Your campaign will appear here</b>Six coordinated pieces using one consistent ${esc(CS.cfg.shortName)} design.</div></div>
    </div>`;
  CS.views.after_campaigns = () => {
    $('#cpGo').onclick = async () => {
      const name = $('#cpName').value.trim();
      if (!name) { CS.toast('Add an event name'); return; }
      const d = $('#cpDate').value, t = $('#cpTime').value;
      const date = d ? new Date(d + 'T00:00').toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' }) : '[[Date]]';
      const time = t ? new Date('2000-01-01T' + t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '[[Time]]';
      const loc = $('#cpLoc').value.trim() || '[[Location]]';
      const desc = $('#cpDesc').value.trim();
      const aud = $('#cpAud').value;
      $('#cpGo').disabled = true; $('#cpGo').textContent = 'Generating…';
      const ai = await CS.aiGenerate(`${name}. ${desc} ${date} ${time} at ${loc}`, aud, 'letter');
      $('#cpGo').disabled = false; $('#cpGo').textContent = 'Generate Campaign';
      const base = { headline: name, subheadline: ai.subheadline || 'Join your neighbors', body: desc || ai.body || '', date, time, location: loc, cta: ai.cta || 'All residents welcome', qr: '', contact: '', photo: $('#cpPhoto').value, footer: '' };
      const campaignId = 'cmp-' + Date.now();
      const pieces = [
        { label: '8.5 × 11 Flyer', format: 'letter', layout: 'event', content: base },
        { label: 'Instagram Post', format: 'post', layout: 'event', content: Object.assign({}, base, { subheadline: `${date} • ${time}` }) },
        { label: 'Instagram Story', format: 'story', layout: 'event', content: Object.assign({}, base, { subheadline: base.subheadline }) },
        { label: 'Digital Sign', format: 'sign', layout: 'event', content: Object.assign({}, base, { subheadline: base.subheadline }) },
      ];
      const emailObj = CS.email.fromContent(base, { audience: aud, eyebrow: 'Community Event' });
      const email = { subject: emailObj.subject, body: CS.email.text(emailObj), html: CS.email.html(emailObj), obj: emailObj };
      const sms = (await CS.aiRewriteFields(base, 'Create SMS Version', 'sms', aud));
      const social = (await CS.aiRewriteFields(base, 'Create Social Caption', 'social', aud));
      CS.state.campaign = { campaignId, name, pieces, email, sms, social };
      $('#cpOut').innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;gap:10px;flex-wrap:wrap"><h2 style="margin:0;color:var(--brand-primary)">${esc(name)}</h2><button class="cs-btn navy sm" id="cpSaveAll">Save all to My Projects</button></div>
        <div class="cs-campaign-grid">${pieces.map((p, i) => { const th = CS.render.thumbHTML(p); return `<div class="cs-card"><div class="cs-thumb ${th.cls}" data-cp-open="${i}">${th.html}<div class="cs-thumb-actions"><button class="cs-btn sm" data-cp-open="${i}">Edit</button><button class="cs-btn ghost sm" data-cp-dl="${i}">Download</button></div></div><div class="cs-card-body"><b>${p.label}</b></div></div>`; }).join('')}</div>
        <div class="cs-grid wide" style="margin-top:18px">
          <div class="cs-text-out"><b style="color:var(--brand-primary)">Resident Email <span class="cs-chip fmt">Entrata</span></b><small style="color:var(--ui-muted)">Subject: ${esc(email.subject || '')}</small><div style="border-radius:10px;overflow:hidden;border:1px solid var(--ui-border);height:220px"><iframe id="cpEmailFrame" style="width:200%;height:440px;border:0;transform:scale(.5);transform-origin:top left"></iframe></div><div style="display:flex;gap:6px"><button class="cs-btn sm" data-cp-email-edit="1">Edit email</button><button class="cs-btn ghost sm" data-cp-copy="email">Copy HTML</button></div></div>
          <div class="cs-text-out"><b style="color:var(--brand-primary)">SMS Reminder <span class="cs-chip">${(sms.body || '').length} chars</span></b><div class="cs-phone"><div class="cs-bubble">${esc(sms.body || '')}</div></div><button class="cs-btn ghost sm" data-cp-copy="sms">Copy</button></div>
          <div class="cs-text-out"><b style="color:var(--brand-primary)">Instagram Caption</b><pre>${esc((social.body || '') + '\n\n' + (social.hashtags || ''))}</pre><button class="cs-btn ghost sm" data-cp-copy="social">Copy</button></div>
        </div>`;
      const out = $('#cpOut');
      requestAnimationFrame(() => CS.render.scaleThumbs(out));
      $('#cpEmailFrame').srcdoc = `<!doctype html><html><body style="margin:0">${email.html}</body></html>`;
      out.querySelector('[data-cp-email-edit]').onclick = () => CS.email.editor(email.obj, { title: name + ' — Email', audience: aud, folder: 'Resident Communications' });
      out.querySelectorAll('[data-cp-open]').forEach(b => b.onclick = e => { e.stopPropagation(); const p = pieces[+b.getAttribute('data-cp-open')]; CS.openBuilder({ name: `${name} — ${p.label}`, format: p.format, layout: p.layout, content: JSON.parse(JSON.stringify(p.content)), folder: 'Events', campaignId }); });
      out.querySelectorAll('[data-cp-dl]').forEach(b => b.onclick = e => { e.stopPropagation(); const p = pieces[+b.getAttribute('data-cp-dl')]; CS.exportDesign(p, `${name} ${p.label}`, 'png'); });
      out.querySelectorAll('[data-cp-copy]').forEach(b => b.onclick = () => { const k = b.getAttribute('data-cp-copy'); CS.copy(k === 'email' ? email.html : k === 'sms' ? sms.body : `${social.body}\n\n${social.hashtags || ''}`); });
      $('#cpSaveAll').onclick = async () => {
        $('#cpSaveAll').disabled = true;
        try {
          for (const p of pieces) {
            const thumb = await thumbnail(p);
            const r = await CS.api('/reslife-creative-projects', { method: 'POST', body: JSON.stringify({ propertyId: CS.propertyId, name: `${name} — ${p.label}`, type: ['post', 'story', 'sign'].includes(p.format) ? 'social' : 'flyer', format: p.format, layout: p.layout, folder: 'Events', content: p.content, thumbnail: thumb, campaignId }) });
            CS.state.projects.unshift(r);
          }
          for (const [k, o] of [['email', email], ['sms', sms], ['social', social]]) {
            const r = await CS.api('/reslife-creative-projects', { method: 'POST', body: JSON.stringify({ propertyId: CS.propertyId, name: `${name} — ${k === 'email' ? 'Email' : k === 'sms' ? 'SMS' : 'Caption'}`, type: k, format: k, folder: k === 'social' ? 'Social Media' : 'Resident Communications', content: { subject: o.subject || '', body: k === 'social' ? `${o.body}\n\n${o.hashtags || ''}` : o.body, headline: name, email: k === 'email' ? o.obj : undefined }, campaignId }) });
            CS.state.projects.unshift(r);
          }
          CS.toast('Campaign saved to My Projects');
        } catch (e) { CS.toast('Save failed: ' + e.message); }
        $('#cpSaveAll').disabled = false;
      };
    };
  };
})(window.CS = window.CS || {});
