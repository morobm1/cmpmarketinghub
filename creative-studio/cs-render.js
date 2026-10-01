/* Creative Studio — design renderer.
   renderDesign(doc, opts) returns an HTML string for a design at its native pixel size.
   doc = { format, layout, content:{headline, subheadline, body, date, time, location, cta, qr, contact, photo, footer}, logo? }
   Everything visual comes from the property config (CS.cfg) — no property is hard-coded. */
(function (CS) {
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // [[placeholder]] → highlighted in the editor; kept as plain text when exporting with marks hidden.
  function rich(s, opts) {
    const e = esc(s);
    return e.replace(/\[\[(.+?)\]\]/g, (m, x) => opts && opts.clean ? x : `<span class="d-fill">${x}</span>`);
  }

  function parseBody(body) {
    const lines = String(body || '').split('\n').map(l => l.trim()).filter(Boolean);
    const bullets = lines.filter(l => /^[-•*]\s+/.test(l)).map(l => l.replace(/^[-•*]\s+/, ''));
    const features = lines.filter(l => !/^[-•*]\s+/.test(l) && /^[^:]{2,32}:\s+\S/.test(l)).map(l => { const i = l.indexOf(':'); return { title: l.slice(0, i).trim(), text: l.slice(i + 1).trim() }; });
    const paragraphs = lines.filter(l => !/^[-•*]\s+/.test(l) && !/^[^:]{2,32}:\s+\S/.test(l));
    return { lines, bullets, features, paragraphs };
  }

  function qrSvg(text, px) {
    if (!text || typeof qrcode !== 'function') return '';
    try {
      const qr = qrcode(0, 'M'); qr.addData(String(text)); qr.make();
      const n = qr.getModuleCount(); const cell = px / n;
      let rects = '';
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) rects += `<rect x="${(c * cell).toFixed(3)}" y="${(r * cell).toFixed(3)}" width="${(cell + .02).toFixed(3)}" height="${(cell + .02).toFixed(3)}"/>`;
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 ${px} ${px}" shape-rendering="crispEdges"><rect width="${px}" height="${px}" fill="#fff"/><g fill="${CS.color('navy')}">${rects}</g></svg>`;
    } catch (e) { return ''; }
  }

  // Headline auto-fit: shrink type as copy gets longer so nothing overflows the safe area.
  function fit(text, max, min, perChar) {
    const len = String(text || '').length;
    return Math.max(min, Math.min(max, Math.round(max - Math.max(0, len - 12) * perChar)));
  }

  function photoStyle(id) {
    const p = CS.photo(id);
    return p ? `style="background-image:url('${p.src}')"` : '';
  }
  function photoBox(id, style, label) {
    const p = CS.photo(id);
    return p ? `<div class="d-photo" ${photoStyle(id).replace('style="', `style="${style};`)}></div>`
      : `<div class="d-photo ph" style="${style}">${esc(label || 'Photo placeholder — add a real photo')}</div>`;
  }
  function logo(kind, h, extra) {
    const l = CS.logo(kind) || CS.logo('primary');
    return l && l.src ? `<img class="d-logo" src="${l.src}" alt="${esc(CS.cfg.name)}" style="height:${h}px;${extra || ''}" />` : '';
  }
  const wave = (id, css) => `<div class="d-wave" style="background-image:url('${CS.graphic(id)}');${css}"></div>`;

  function details(c, size, opts) {
    const items = [['Date', c.date], ['Time', c.time], ['Where', c.location]].filter(x => x[1]);
    if (!items.length) return '';
    return `<div style="display:flex;gap:12px;flex-wrap:wrap">${items.map(([k, v]) => `<div class="d-chip" style="flex:1 1 0"><small>${k}</small><b style="font-size:${size}px">${rich(v, opts)}</b></div>`).join('')}</div>`;
  }
  function qrBlock(c, px, opts) {
    const svg = qrSvg(c.qr, px);
    return svg ? `<div class="d-qr">${svg}<small>Scan me</small></div>` : '';
  }
  function footerBar(c, opts, h) {
    const foot = c.footer || CS.cfg.defaults.footer;
    return `<div style="position:absolute;left:0;right:0;bottom:0;height:${h}px">
      ${wave('wave-footer', `inset:0;`)}
      <div style="position:absolute;left:48px;right:48px;bottom:22px;display:flex;align-items:flex-end;justify-content:space-between;gap:20px;color:#fff">
        ${logo('white', 46)}
        <div style="text-align:right;font-size:13px;font-weight:600;line-height:1.4">${c.contact ? rich(c.contact, opts) + '<br>' : ''}${esc(foot)}</div>
      </div></div>`;
  }

  // ───────────── Letter / notice layouts (816 × 1056) ─────────────
  const L = {};

  L.event = (c, o) => {
    const hs = fit(c.headline, 92, 54, 2.2);
    return `
    ${photoBox(c.photo, 'position:absolute;left:0;top:0;right:0;height:470px')}
    <div style="position:absolute;left:0;top:0;right:0;height:470px;background:linear-gradient(180deg,rgba(0,0,0,.0) 50%,rgba(0,0,0,.25))"></div>
    ${wave('orange-wave', 'top:392px;height:90px')}
    <div style="position:absolute;left:0;right:0;top:472px;bottom:0;background:#fff"></div>
    <div style="position:absolute;top:36px;right:40px;background:#fff;border-radius:16px;padding:12px 16px">${logo('primary', 54)}</div>
    <div style="position:absolute;left:56px;right:56px;top:500px">
      ${c.subheadline ? `<p class="d-sub" style="font-size:22px;text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px">${rich(c.subheadline, o)}</p>` : ''}
      <h1 class="d-h" style="font-size:${hs}px">${rich(c.headline, o)}</h1>
      <div style="margin-top:24px">${details(c, 21, o)}</div>
      ${c.body ? `<p class="d-body" style="font-size:18px;margin-top:20px;max-width:${c.qr ? 520 : 700}px">${rich(c.body, o).replace(/\n/g, '<br>')}</p>` : ''}
      <div style="display:flex;align-items:center;justify-content:space-between;margin-top:22px">
        ${c.cta ? `<span class="d-cta" style="font-size:19px;padding:13px 26px">${rich(c.cta, o)}</span>` : '<span></span>'}
        ${qrBlock(c, 104, o)}
      </div>
    </div>
    ${footerBar(c, o, 110)}`;
  };

  L.guide = (c, o) => {
    const b = parseBody(c.body);
    const hs = fit(c.headline, 60, 38, 1);
    const steps = b.bullets.length ? b.bullets : b.paragraphs;
    const fs = steps.length > 5 ? 17 : 19;
    return `
    <div style="position:absolute;left:0;top:0;right:0;height:300px;background:var(--d-primary)"></div>
    ${wave('orange-wave', 'top:250px;height:60px')}
    <div style="position:absolute;left:56px;right:56px;top:44px;color:#fff">
      ${logo('white', 50)}
      <h1 class="d-h" style="font-size:${hs}px;color:#fff;margin-top:30px;max-width:${c.photo ? 470 : 700}px">${rich(c.headline, o)}</h1>
      ${c.subheadline ? `<p style="font-size:19px;font-weight:600;margin:10px 0 0;opacity:.92;max-width:470px">${rich(c.subheadline, o)}</p>` : ''}
    </div>
    ${c.photo ? `<div style="position:absolute;right:48px;top:60px;width:230px;height:290px;border-radius:24px;overflow:hidden;border:6px solid #fff;box-shadow:0 12px 30px rgba(0,0,0,.18)">${photoBox(c.photo, 'width:100%;height:100%')}</div>` : ''}
    <div style="position:absolute;left:56px;right:56px;top:${c.photo ? 380 : 345}px">
      <ol class="d-list" style="display:flex;flex-direction:column;gap:16px">
        ${steps.map((s, i) => `<li><span class="d-num">${i + 1}</span><span class="d-body" style="font-size:${fs}px;padding-top:6px">${rich(s, o)}</span></li>`).join('')}
      </ol>
    </div>
    <div style="position:absolute;left:56px;right:56px;bottom:130px;display:flex;align-items:center;justify-content:space-between;gap:20px">
      ${c.cta ? `<span class="d-cta" style="font-size:18px;padding:12px 24px">${rich(c.cta, o)}</span>` : '<span></span>'}
      ${qrBlock(c, 96, o)}
    </div>
    ${footerBar(c, o, 110)}`;
  };

  L.checklist = (c, o) => {
    const b = parseBody(c.body);
    const items = b.bullets.length ? b.bullets : b.paragraphs;
    return `
    <div style="position:absolute;inset:0;background:var(--d-sand)"></div>
    <div style="position:absolute;right:0;top:0;width:300px;height:300px;background:url('${CS.graphic('orange-corner')}') top right/contain no-repeat"></div>
    <div style="position:absolute;left:56px;top:48px">${logo('primary', 52)}</div>
    <div style="position:absolute;left:56px;right:56px;top:150px">
      <h1 class="d-h" style="font-size:${fit(c.headline, 72, 44, 1.4)}px">${rich(c.headline, o)}</h1>
      ${c.subheadline ? `<p class="d-sub" style="font-size:21px;margin-top:10px">${rich(c.subheadline, o)}</p>` : ''}
      <div style="margin-top:30px;background:#fff;border-radius:28px;padding:30px 34px;box-shadow:0 10px 30px rgba(0,45,106,.08)">
        <ul class="d-list" style="display:flex;flex-direction:column;gap:${items.length > 6 ? 14 : 18}px">
          ${items.map(s => `<li><span class="d-check"></span><span class="d-body" style="font-size:${items.length > 6 ? 18 : 20}px;padding-top:2px">${rich(s, o)}</span></li>`).join('')}
        </ul>
      </div>
      ${c.cta ? `<p style="margin:26px 0 0;font-size:22px;font-weight:800;color:var(--d-primary)">${rich(c.cta, o)}</p>` : ''}
    </div>
    ${footerBar(c, o, 110)}`;
  };

  L.notice = (c, o) => {
    const rows = [['Date', c.date], ['Time', c.time], ['Location', c.location]].filter(x => x[1]);
    return `
    <div style="position:absolute;left:0;right:0;top:0;height:120px;background:var(--d-accent);display:flex;align-items:center;justify-content:space-between;padding:0 56px">
      <span style="color:#fff;font-weight:900;font-size:44px;letter-spacing:.18em">NOTICE</span>
      ${logo('white', 50)}
    </div>
    <div style="position:absolute;left:56px;right:56px;top:180px">
      <h1 class="d-h" style="font-size:${fit(c.headline, 64, 40, 1.2)}px">${rich(c.headline, o)}</h1>
      ${c.subheadline ? `<p class="d-sub" style="font-size:22px;margin-top:12px">${rich(c.subheadline, o)}</p>` : ''}
      <div style="width:120px;height:14px;margin:26px 0;background:url('${CS.graphic('coastal-divider')}') left/contain no-repeat"></div>
      ${c.body ? `<p class="d-body" style="font-size:21px">${rich(c.body, o).replace(/\n/g, '<br>')}</p>` : ''}
      ${rows.length ? `<table style="margin-top:30px;border-collapse:separate;border-spacing:0 10px;width:100%">${rows.map(([k, v]) => `<tr><td style="width:170px;font-weight:800;font-size:16px;text-transform:uppercase;letter-spacing:.08em;color:var(--d-accent)">${k}</td><td style="font-size:24px;font-weight:700;color:var(--d-primary)">${rich(v, o)}</td></tr>`).join('')}</table>` : ''}
    </div>
    ${c.contact ? `<div style="position:absolute;left:56px;right:56px;bottom:140px;background:var(--d-light);border-radius:18px;padding:18px 22px;font-size:18px"><b style="color:var(--d-primary)">Questions?</b> ${rich(c.contact, o)}</div>` : ''}
    ${footerBar(Object.assign({}, c, { contact: '' }), o, 110)}`;
  };

  L.spotlight = (c, o) => {
    const b = parseBody(c.body);
    const feats = b.features.length ? b.features : b.bullets.map(x => ({ title: '', text: x }));
    return `
    ${photoBox(c.photo, 'position:absolute;left:0;top:0;width:360px;bottom:0')}
    <div style="position:absolute;left:330px;top:0;bottom:0;width:60px;background:#fff;border-radius:60px 0 0 60px"></div>
    <div style="position:absolute;left:390px;right:48px;top:52px">
      ${logo('primary', 48)}
      <h1 class="d-h" style="font-size:${fit(c.headline, 54, 34, 1)}px;margin-top:34px">${rich(c.headline, o)}</h1>
      ${c.subheadline ? `<p class="d-sub" style="font-size:19px;margin-top:10px">${rich(c.subheadline, o)}</p>` : ''}
      <div style="display:flex;flex-direction:column;gap:12px;margin-top:26px">
        ${feats.map(f => `<div class="d-feature">${f.title ? `<b>${rich(f.title, o)}</b>` : ''}<span>${rich(f.text, o)}</span></div>`).join('')}
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;margin-top:24px">
        ${c.cta ? `<span class="d-cta" style="font-size:17px;padding:12px 22px">${rich(c.cta, o)}</span>` : '<span></span>'}
        ${qrBlock(c, 88, o)}
      </div>
    </div>
    ${footerBar(c, o, 100)}`;
  };

  L.parent = (c, o) => {
    const b = parseBody(c.body);
    const feats = b.features.length ? b.features : b.bullets.map(x => ({ title: '', text: x }));
    return `
    <div style="position:absolute;inset:0;background:var(--d-sand)"></div>
    <div style="position:absolute;left:56px;right:56px;top:46px;display:flex;justify-content:space-between;align-items:center">
      ${logo('primary', 50)}
      <span style="font-size:13px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--d-blue)">Parent &amp; Guardian</span>
    </div>
    <div style="position:absolute;left:56px;right:56px;top:136px;height:300px;border-radius:30px;overflow:hidden">${photoBox(c.photo, 'width:100%;height:100%')}</div>
    <div style="position:absolute;left:56px;right:56px;top:460px">
      <h1 class="d-h" style="font-size:${fit(c.headline, 50, 32, .8)}px">${rich(c.headline, o)}</h1>
      ${c.subheadline ? `<p style="font-size:18px;font-weight:600;margin:8px 0 0;color:var(--d-blue)">${rich(c.subheadline, o)}</p>` : ''}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:22px">
        ${feats.slice(0, 4).map(f => `<div class="d-feature" style="background:#fff">${f.title ? `<b style="font-size:17px">${rich(f.title, o)}</b>` : ''}<span style="font-size:14px">${rich(f.text, o)}</span></div>`).join('')}
      </div>
    </div>
    <div style="position:absolute;left:56px;right:56px;bottom:124px;display:flex;align-items:center;justify-content:space-between">
      ${c.cta ? `<span class="d-cta" style="font-size:16px;padding:11px 22px;background:var(--d-primary)">${rich(c.cta, o)}</span>` : '<span></span>'}
      ${qrBlock(c, 84, o)}
    </div>
    ${footerBar(c, o, 100)}`;
  };

  // ───────────── Social / signage ─────────────
  const SOCIAL = {
    post: (c, o) => `
      ${photoBox(c.photo, 'position:absolute;inset:0')}
      <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,20,50,.05) 30%,rgba(0,20,50,.78) 100%)"></div>
      <div style="position:absolute;top:44px;left:48px">${logo('white', 64)}</div>
      ${wave('orange-wave', 'bottom:-2px;height:120px')}
      <div style="position:absolute;left:60px;right:60px;bottom:150px;color:#fff">
        <h1 class="d-h" style="color:#fff;font-size:${fit(c.headline, 120, 70, 3)}px">${rich(c.headline, o)}</h1>
        ${c.subheadline ? `<p style="font-size:38px;font-weight:700;margin:16px 0 0">${rich(c.subheadline, o)}</p>` : ''}
      </div>`,
    story: (c, o) => `
      ${photoBox(c.photo, 'position:absolute;left:0;right:0;top:0;height:1150px')}
      ${wave('orange-wave', 'top:1060px;height:110px')}
      <div style="position:absolute;left:0;right:0;top:1168px;bottom:0;background:var(--d-primary)"></div>
      <div style="position:absolute;top:120px;left:0;right:0;text-align:center"><span style="background:#fff;border-radius:22px;padding:18px 26px;display:inline-block">${logo('primary', 80)}</span></div>
      <div style="position:absolute;left:80px;right:80px;top:1230px;color:#fff;text-align:center">
        <h1 class="d-h" style="color:#fff;font-size:${fit(c.headline, 150, 80, 3.5)}px">${rich(c.headline, o)}</h1>
        ${c.subheadline ? `<p style="font-size:46px;font-weight:700;margin:24px 0 0;color:var(--d-accent)">${rich(c.subheadline, o)}</p>` : ''}
        ${[c.date, c.time, c.location].filter(Boolean).length ? `<p style="font-size:40px;font-weight:600;margin:30px 0 0">${[c.date, c.time, c.location].filter(Boolean).map(x => rich(x, o)).join(' • ')}</p>` : ''}
      </div>`,
    sign: (c, o) => `
      <div style="position:absolute;inset:0;background:var(--d-primary)"></div>
      ${photoBox(c.photo, 'position:absolute;right:0;top:0;bottom:0;width:820px')}
      <div style="position:absolute;right:760px;top:0;bottom:0;width:120px;background:var(--d-primary);border-radius:0 120px 120px 0"></div>
      ${wave('orange-wave', 'bottom:-2px;left:0;right:820px;height:120px')}
      <div style="position:absolute;left:110px;top:110px;width:900px;color:#fff">
        ${logo('white', 90)}
        <h1 class="d-h" style="color:#fff;font-size:${fit(c.headline, 120, 72, 2.4)}px;margin-top:70px">${rich(c.headline, o)}</h1>
        ${c.subheadline ? `<p style="font-size:42px;font-weight:600;margin:24px 0 0;opacity:.95">${rich(c.subheadline, o)}</p>` : ''}
        ${[c.date, c.time, c.location].filter(Boolean).length ? `<p style="font-size:40px;font-weight:800;margin:34px 0 0;color:var(--d-accent)">${[c.date, c.time, c.location].filter(Boolean).map(x => rich(x, o)).join('  •  ')}</p>` : ''}
      </div>`,
  };

  function themeVars() {
    return `--d-primary:${CS.color('navy')};--d-accent:${CS.color('orange')};--d-blue:${CS.color('blue')};--d-light:${CS.color('lightBlue')};--d-sand:${CS.color('sand')};--d-text:${CS.color('darkText')};--d-font:${CS.cfg.fonts.body.css};`;
  }

  function size(format) {
    const f = CS.data.formats[format] || CS.data.formats.letter;
    return { w: f.w || 816, h: f.h || 1056 };
  }

  function renderDesign(doc, opts) {
    opts = opts || {};
    const c = Object.assign({}, doc.content || {});
    const fmt = doc.format || 'letter';
    const { w, h } = size(fmt);
    let inner;
    if (fmt === 'post' || fmt === 'story' || fmt === 'sign') inner = SOCIAL[fmt](c, opts);
    else inner = (L[doc.layout] || L.event)(c, opts);
    return `<div class="d" style="width:${w}px;height:${h}px;${themeVars()}">${inner}</div>`;
  }

  // Fit every .cs-thumb-inner to its container width.
  function scaleThumbs(root) {
    (root || document).querySelectorAll('[data-scale-fit]').forEach(el => {
      const box = el.parentElement; const nativeW = +el.getAttribute('data-w'); const nativeH = +el.getAttribute('data-h');
      if (!box || !nativeW) return;
      const s = Math.min(box.clientWidth / nativeW, box.clientHeight ? box.clientHeight / nativeH : Infinity);
      el.style.transform = `scale(${s})`;
      el.style.left = Math.max(0, (box.clientWidth - nativeW * s) / 2) + 'px';
    });
  }

  function thumbHTML(doc) {
    const { w, h } = size(doc.format);
    const cls = doc.format === 'post' ? 'sq' : doc.format === 'story' ? 'story' : doc.format === 'sign' ? 'sign' : '';
    return { cls, html: `<div class="cs-thumb-inner" data-scale-fit data-w="${w}" data-h="${h}">${renderDesign(doc)}</div>` };
  }

  CS.render = { renderDesign, thumbHTML, scaleThumbs, size, parseBody, qrSvg, esc, rich };
})(window.CS = window.CS || {});
