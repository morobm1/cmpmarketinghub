/* Creative Studio — Entrata email builder.
   Produces paste-ready HTML in the property's live Entrata template (table layout, inline
   styles, mobile media query, preheader, accent bars, navy hero, callout, numbered steps,
   button, signature, footer). Shell values come from CS.cfg.email.

   Structured email object:
   { subject, preheader, eyebrow, headline, intro, greeting, paragraphs:[], callout:{label,title,text},
     stepsTitle, steps:[{title,text}], button:{label,url}, closing, verify } */
(function (CS) {
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // Inline formatting: **bold** → navy strong, [[x]] kept visible for staff to replace.
  const fmt = (s, navy) => esc(s).replace(/\*\*(.+?)\*\*/g, `<strong style="color:${navy};">$1</strong>`).replace(/\n/g, '<br />');

  function html(e) {
    const E = CS.cfg.email, C = E.colors, F = E.font, f = E.footer;
    const p = (txt, last) => `<p style="font-family:${F};margin:0${last ? '' : ' 0 15px'};font-size:16px;line-height:27px;color:${C.text};">${fmt(txt, C.navy)}</p>`;
    const paras = [e.greeting, ...(e.paragraphs || [])].filter(x => String(x || '').trim());
    const steps = (e.steps || []).filter(s => s && (s.title || s.text));
    const callout = e.callout && (e.callout.title || e.callout.text);
    const btn = e.button && e.button.label && e.button.url;
    const preheader = e.preheader || e.intro || e.headline || '';

    return `<meta charset="UTF-8"><meta content="width=device-width, initial-scale=1.0" name="viewport"><meta name="x-apple-disable-message-reformatting"><meta name="color-scheme" content="light only">
<style type="text/css">@media only screen and (max-width:680px){
  .email-container{width:100%!important;}
  .mobile-pad{padding-left:22px!important;padding-right:22px!important;}
  .button-link{display:block!important;width:100%!important;box-sizing:border-box!important;text-align:center!important;}
  .headline{font-size:29px!important;line-height:35px!important;}
}
</style>
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${esc(preheader)}</div>

<table border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;background:${C.page};border-collapse:collapse;" width="100%">
	<tbody>
		<tr>
			<td align="center" style="padding:28px 10px;">
			<table border="0" cellpadding="0" cellspacing="0" class="email-container" role="presentation" style="width:680px;max-width:680px;background:#ffffff;border-collapse:collapse;border-radius:16px;overflow:hidden;box-shadow:0 8px 28px rgba(16,59,120,.11);" width="680">
				<tbody>
					<tr>
						<td style="height:6px;background:${C.accent};font-size:0;line-height:0;">&nbsp;</td>
					</tr>
					<tr>
						<td align="center" style="padding:22px 28px 19px;background:#ffffff;border-bottom:1px solid ${C.border};"><a href="${E.siteUrl}" target="_blank"><img alt="${esc(E.logoAlt)}" src="${E.logo}" style="display:block;width:150px;max-width:78%;border:0;height:58px;" /> </a></td>
					</tr>
					<tr>
						<td class="mobile-pad" style="padding:34px 46px 30px;background:${C.navy};">
						${e.eyebrow ? `<div style="font-family:${F};font-size:12px;line-height:18px;font-weight:bold;letter-spacing:1.5px;text-transform:uppercase;color:${C.accent};margin-bottom:9px;">${esc(e.eyebrow)}</div>\n` : ''}
						<div class="headline" style="font-family:${F};font-size:34px;line-height:41px;font-weight:700;color:#ffffff;margin-bottom:10px;">${esc(e.headline)}</div>
						${e.intro ? `\n						<div style="font-family:${F};font-size:16px;line-height:26px;color:${C.heroText};max-width:560px;">${fmt(e.intro, '#ffffff')}</div>` : ''}
						</td>
					</tr>
					${paras.length ? `<tr>
						<td class="mobile-pad" style="padding:33px 46px 20px;">
						${paras.map((x, i) => p(x, i === paras.length - 1)).join('\n\n						')}
						</td>
					</tr>` : ''}
					${callout ? `<tr>
						<td class="mobile-pad" style="padding:${paras.length ? '0' : '33px'} 46px 24px;">
						<table border="0" cellpadding="0" cellspacing="0" role="presentation" style="background:${C.calloutBg};border-left:4px solid ${C.accent};border-collapse:collapse;" width="100%">
							<tbody>
								<tr>
									<td style="padding:22px 24px;">
									${e.callout.label ? `<div style="font-family:${F};font-size:12px;line-height:18px;font-weight:bold;letter-spacing:1.1px;text-transform:uppercase;color:${C.accent};margin-bottom:6px;">${esc(e.callout.label)}</div>` : ''}
									${e.callout.title ? `<h2 style="font-family:${F};margin:0 0 13px;font-size:24px;line-height:30px;color:${C.navy};">${esc(e.callout.title)}</h2>` : ''}
									${e.callout.text ? `<p style="font-family:${F};margin:0;font-size:15.5px;line-height:25px;color:${C.text};">${fmt(e.callout.text, C.navy)}</p>` : ''}
									</td>
								</tr>
							</tbody>
						</table>
						</td>
					</tr>` : ''}
					${steps.length || btn ? `<tr>
						<td class="mobile-pad" style="padding:0 46px 28px;">
						${steps.length ? `${e.stepsTitle ? `<h2 style="font-family:${F};margin:0 0 15px;font-size:25px;line-height:31px;color:${C.navy};">${esc(e.stepsTitle)}</h2>` : ''}

						<table border="0" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;" width="100%">
							<tbody>
								${steps.map((s, i) => `<tr>
									<td style="padding:0 0 ${i === steps.length - 1 ? 21 : 15}px;">
									<div style="font-family:${F};font-size:15.5px;line-height:25px;color:${C.text};">${s.title ? `<strong style="color:${C.navy};">${i + 1}. ${esc(s.title)}</strong>${s.text ? '<br />\n									' : ''}` : ''}${s.text ? fmt(s.text, C.navy) : ''}</div>
									</td>
								</tr>`).join('\n								')}
							</tbody>
						</table>` : ''}
						${btn ? `
						<table border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 auto;">
							<tbody>
								<tr>
									<td bgcolor="${C.accent}" style="border-radius:4px;"><a class="button-link" href="${esc(e.button.url)}" style="font-family:${F};display:inline-block;padding:15px 27px;font-size:15px;line-height:21px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:4px;" target="_blank">${esc(e.button.label)} </a></td>
								</tr>
							</tbody>
						</table>` : ''}
						</td>
					</tr>` : ''}
					<tr>
						<td class="mobile-pad" style="padding:0 46px 36px;">
						<table border="0" cellpadding="0" cellspacing="0" role="presentation" style="border-top:1px solid ${C.border};border-collapse:collapse;" width="100%">
							<tbody>
								<tr>
									<td style="padding:24px 0 0;">
									${e.closing ? `<p style="font-family:${F};margin:0 0 15px;font-size:16px;line-height:27px;color:${C.text};">${fmt(e.closing, C.navy)}</p>\n\n									` : ''}<p style="font-family:${F};margin:0;font-size:16px;line-height:25px;color:${C.text};"><strong style="color:${C.navy};">${esc(E.signature.name)}</strong><br />
									${esc(E.signature.line)}</p>
									</td>
								</tr>
							</tbody>
						</table>
						</td>
					</tr>
					<tr>
						<td class="mobile-pad" style="padding:24px 38px;background:${C.navy};text-align:center;">
						<div style="font-family:${F};font-size:13px;line-height:22px;color:${C.footerText};"><strong style="color:#ffffff;">${esc(f.name)}</strong><br />
						${esc(f.address).replace('•', '&bull;')}<br />
						<a href="tel:${f.phoneHref}" style="color:#ffffff;text-decoration:none;">${esc(f.phone)}</a> &bull; Text <a href="sms:${f.textHref}" style="color:#ffffff;text-decoration:none;">${esc(f.text)}</a> &bull; <a href="mailto:${esc(f.email)}" style="color:#ffffff;text-decoration:none;">${esc(f.email)}</a><br />
						<a href="${E.siteUrl}" style="color:#ffffff;text-decoration:underline;" target="_blank">${esc(f.site)}</a></div>
						</td>
					</tr>
					<tr>
						<td style="height:6px;background:${C.accent};font-size:0;line-height:0;">&nbsp;</td>
					</tr>
				</tbody>
			</table>
			</td>
		</tr>
	</tbody>
</table>`;
  }

  // Plain-text version (for SMS-style copy, Gmail, or text-only sends).
  function text(e) {
    const E = CS.cfg.email;
    const lines = [e.headline, e.intro, '', e.greeting, ...(e.paragraphs || [])];
    if (e.callout && (e.callout.title || e.callout.text)) lines.push('', [e.callout.label, e.callout.title].filter(Boolean).join(': '), e.callout.text);
    if ((e.steps || []).length) { lines.push('', e.stepsTitle || ''); e.steps.forEach((s, i) => lines.push(`${i + 1}. ${s.title || ''}${s.title && s.text ? ' — ' : ''}${s.text || ''}`)); }
    if (e.button && e.button.label) lines.push('', `${e.button.label}: ${e.button.url}`);
    lines.push('', e.closing || '', '', E.signature.name, E.signature.line);
    return lines.filter(x => x !== undefined && x !== null).join('\n').replace(/\*\*/g, '').replace(/\n{3,}/g, '\n\n').trim();
  }

  // Build a structured email from flat design content (flyer → email, campaigns, AI output).
  function fromContent(c, opts) {
    opts = opts || {};
    const b = CS.render.parseBody(c.body || '');
    const details = [['Date', c.date], ['Time', c.time], ['Location', c.location]].filter(x => x[1]);
    const steps = b.bullets.length ? b.bullets.map(x => splitStep(x)) : b.features.map(f => ({ title: f.title, text: f.text }));
    return {
      subject: opts.subject || `${c.headline}${c.date ? ' — ' + c.date : ''}`,
      preheader: [c.subheadline, details.map(d => d[1]).join(' • ')].filter(Boolean).join(' · '),
      eyebrow: opts.eyebrow || (details.length ? 'Community Event' : 'Resident Update'),
      headline: c.headline || '',
      intro: c.subheadline || '',
      greeting: opts.audience === 'parents' ? 'Dear Parents and Guardians,' : 'Hello,',
      paragraphs: b.paragraphs.length ? b.paragraphs : [],
      callout: details.length ? { label: 'Details', title: details.map(d => d[1]).join(' • '), text: details.map(d => `**${d[0]}:** ${d[1]}`).join('\n') } : { label: '', title: '', text: '' },
      stepsTitle: steps.length ? 'What to know' : '',
      steps,
      button: c.qr ? { label: c.cta || 'Learn more', url: c.qr } : { label: '', url: '' },
      closing: c.cta && !c.qr ? c.cta + (c.cta.endsWith('.') || c.cta.endsWith('!') ? '' : '.') + ' If you have questions, please contact our team.' : 'If you have questions, please contact our team. We are happy to help.',
    };
  }
  function splitStep(s) {
    const m = String(s).match(/^(.{3,60}?)(?:\s+[—–-]\s+|:\s+)(.+)$/);
    return m ? { title: m[1].replace(/[.:]$/, '') + '.', text: m[2] } : { title: '', text: s };
  }

  // ───────── Editor modal ─────────
  function editor(e, meta) {
    meta = meta || {};
    e = JSON.parse(JSON.stringify(e));
    e.callout = e.callout || { label: '', title: '', text: '' };
    e.button = e.button || { label: '', url: '' };
    e.steps = e.steps || [];
    e.paragraphs = e.paragraphs || [];
    const v = x => esc(x || '');
    const stepRow = (s, i) => `<div class="cs-em-step" data-step="${i}"><input class="cs-input" data-st="title" value="${v(s.title)}" placeholder="Step title"><textarea class="cs-textarea" data-st="text" style="min-height:52px" placeholder="Step details">${v(s.text)}</textarea><button class="cs-btn ghost xs" data-st-del="${i}">Remove</button></div>`;
    CS.modal(`
      <div class="cs-card-meta"><span class="cs-chip fmt">Entrata Email</span>${meta.audience ? `<span class="cs-chip">${esc(meta.audience)}</span>` : ''}</div>
      <h2 style="margin:8px 0 4px;color:var(--brand-primary);font-weight:900">${esc(meta.title || e.headline || 'Email')}</h2>
      ${meta.purpose ? `<p style="margin:0 0 12px;color:var(--ui-muted);font-size:13.5px">${esc(meta.purpose)}</p>` : ''}
      ${e.verify ? '<div class="cs-verify" style="margin-bottom:12px">Emergency template — verify every detail with your supervisor before sending.</div>' : ''}
      <div class="cs-em-grid">
        <div class="cs-em-form">
          <div class="cs-em-sec">Inbox</div>
          <div class="cs-field"><label class="cs-label">Subject line</label><input class="cs-input" data-e="subject" value="${v(e.subject)}"></div>
          <div class="cs-field"><label class="cs-label">Preview text (preheader)</label><input class="cs-input" data-e="preheader" value="${v(e.preheader)}" placeholder="Shown after the subject in the inbox"></div>
          <div class="cs-em-sec">Header</div>
          <div class="cs-field"><label class="cs-label">Eyebrow</label><input class="cs-input" data-e="eyebrow" value="${v(e.eyebrow)}" placeholder="e.g. Community Event"></div>
          <div class="cs-field"><label class="cs-label">Headline</label><input class="cs-input" data-e="headline" value="${v(e.headline)}"></div>
          <div class="cs-field"><label class="cs-label">Intro</label><textarea class="cs-textarea" data-e="intro" style="min-height:60px">${v(e.intro)}</textarea></div>
          <div class="cs-em-sec">Message</div>
          <div class="cs-field"><label class="cs-label">Greeting</label><input class="cs-input" data-e="greeting" value="${v(e.greeting)}"></div>
          <div class="cs-field"><label class="cs-label">Body <small style="text-transform:none;font-weight:600;color:var(--ui-muted)">— blank line between paragraphs · **bold**</small></label><textarea class="cs-textarea" data-e="paragraphs" style="min-height:140px">${v(e.paragraphs.join('\n\n'))}</textarea></div>
          <div class="cs-em-sec">Callout box <small>(optional)</small></div>
          <div class="cs-row"><div class="cs-field"><label class="cs-label">Label</label><input class="cs-input" data-c="label" value="${v(e.callout.label)}" placeholder="Required Next Step"></div><div class="cs-field"><label class="cs-label">Title</label><input class="cs-input" data-c="title" value="${v(e.callout.title)}"></div></div>
          <div class="cs-field"><textarea class="cs-textarea" data-c="text" style="min-height:60px" placeholder="Callout text">${v(e.callout.text)}</textarea></div>
          <div class="cs-em-sec">Numbered steps <small>(optional)</small></div>
          <div class="cs-field"><input class="cs-input" data-e="stepsTitle" value="${v(e.stepsTitle)}" placeholder="What to do now"></div>
          <div id="emSteps">${e.steps.map(stepRow).join('')}</div>
          <button class="cs-btn ghost xs" id="emAddStep">+ Add step</button>
          <div class="cs-em-sec">Button <small>(optional)</small></div>
          <div class="cs-row"><div class="cs-field"><label class="cs-label">Label</label><input class="cs-input" data-b="label" value="${v(e.button.label)}" placeholder="Open Resident Portal"></div><div class="cs-field"><label class="cs-label">Link</label><input class="cs-input" data-b="url" value="${v(e.button.url)}" placeholder="${esc(CS.cfg.email.portalUrl)}"></div></div>
          <div class="cs-field" style="display:flex;gap:6px;flex-wrap:wrap">${[['Resident Portal', CS.cfg.email.portalUrl], ['Website', CS.cfg.email.siteUrl], ['Email us', 'mailto:' + CS.cfg.email.footer.email]].map(([l, u]) => `<button class="cs-btn light xs" data-quick-url="${esc(u)}">${l}</button>`).join('')}</div>
          <div class="cs-em-sec">Closing</div>
          <div class="cs-field"><textarea class="cs-textarea" data-e="closing" style="min-height:60px">${v(e.closing)}</textarea></div>
          <div id="emGuard" class="cs-guard" style="max-width:none"></div>
          <label class="cs-label" style="margin-top:12px">AI options</label>
          <div class="cs-ai-actions" id="emAi">${['Make Friendlier', 'Make Shorter', 'Make More Professional', 'Parent Focused', 'Fix Grammar', 'Create SMS Version', 'Create Social Caption'].map(a => `<button data-a="${a}">${a}</button>`).join('')}</div>
        </div>
        <div class="cs-em-preview">
          <div class="cs-em-tabs"><button class="active" data-pv="desktop">Desktop</button><button data-pv="mobile">Mobile</button></div>
          <div class="cs-em-frame" id="emFrameWrap"><iframe id="emFrame" title="Email preview"></iframe></div>
          <div class="cs-em-actions">
            <button class="cs-btn" id="emCopyHtml">Copy HTML for Entrata</button>
            <button class="cs-btn ghost" id="emCopyRich">Copy formatted</button>
            <button class="cs-btn ghost" id="emDownload">Download .html</button>
            <button class="cs-btn ghost" id="emSave">Save to My Projects</button>
          </div>
          <p style="font-size:12px;color:var(--ui-muted);margin:8px 0 0">In Entrata, open the message editor’s <b>Source / HTML</b> view and paste. Replace any highlighted [[placeholders]] before sending.</p>
        </div>
      </div>`);
    const box = CS.$('#csModalBody');
    CS.$('#csModal .cs-modal-box').style.maxWidth = '1240px';
    const read = () => {
      box.querySelectorAll('[data-e]').forEach(i => { const k = i.getAttribute('data-e'); e[k] = k === 'paragraphs' ? i.value.split(/\n\s*\n/).map(x => x.trim()).filter(Boolean) : i.value; });
      box.querySelectorAll('[data-c]').forEach(i => { e.callout[i.getAttribute('data-c')] = i.value; });
      box.querySelectorAll('[data-b]').forEach(i => { e.button[i.getAttribute('data-b')] = i.value; });
      e.steps = [...box.querySelectorAll('[data-step]')].map(r => ({ title: r.querySelector('[data-st="title"]').value, text: r.querySelector('[data-st="text"]').value }));
    };
    const refresh = () => {
      read();
      const out = html(e).replace(/\[\[(.+?)\]\]/g, '<span style="background:#fff3c4;outline:1px dashed #f59e0b">[[$1]]</span>');
      CS.$('#emFrame').srcdoc = `<!doctype html><html><head></head><body style="margin:0">${out}</body></html>`;
      CS.$('#emGuard').innerHTML = CS.guardText(text(e) + ' ' + e.subject).map(i => `<div class="warn">${i}</div>`).join('');
    };
    let t; box.addEventListener('input', () => { clearTimeout(t); t = setTimeout(refresh, 200); });
    const bindSteps = () => box.querySelectorAll('[data-st-del]').forEach(b => b.onclick = () => { b.closest('[data-step]').remove(); [...box.querySelectorAll('[data-step]')].forEach((r, i) => r.setAttribute('data-step', i)); refresh(); });
    bindSteps();
    CS.$('#emAddStep').onclick = () => { CS.$('#emSteps').insertAdjacentHTML('beforeend', stepRow({ title: '', text: '' }, box.querySelectorAll('[data-step]').length)); bindSteps(); };
    box.querySelectorAll('[data-quick-url]').forEach(b => b.onclick = () => { box.querySelector('[data-b="url"]').value = b.getAttribute('data-quick-url'); if (!box.querySelector('[data-b="label"]').value) box.querySelector('[data-b="label"]').value = b.textContent === 'Resident Portal' ? 'Open Resident Portal' : b.textContent === 'Website' ? 'Visit theharbourocc.com' : 'Email Our Team'; refresh(); });
    box.querySelectorAll('[data-pv]').forEach(b => b.onclick = () => { box.querySelectorAll('[data-pv]').forEach(x => x.classList.toggle('active', x === b)); CS.$('#emFrameWrap').classList.toggle('mobile', b.getAttribute('data-pv') === 'mobile'); });
    CS.$('#emCopyHtml').onclick = () => { read(); CS.copy(html(e)); };
    CS.$('#emCopyRich').onclick = async () => { read(); try { await navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([html(e)], { type: 'text/html' }), 'text/plain': new Blob([text(e)], { type: 'text/plain' }) })]); CS.toast('Formatted email copied'); } catch (x) { CS.toast('Rich copy blocked — use Copy HTML'); } };
    CS.$('#emDownload').onclick = () => { read(); const blob = new Blob([`<!doctype html>\n<html><head>${html(e).match(/^[\s\S]*?<\/style>/)[0]}</head><body style="margin:0">${html(e).replace(/^[\s\S]*?<\/style>/, '')}</body></html>`], { type: 'text/html' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = (e.headline || 'email').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50) + '.html'; a.click(); URL.revokeObjectURL(a.href); };
    CS.$('#emSave').onclick = async () => {
      read();
      try {
        const body = { propertyId: CS.propertyId, name: meta.title || e.headline || 'Email', type: 'email', format: 'email', folder: meta.folder || 'Resident Communications', content: { email: e, subject: e.subject, body: text(e), headline: e.headline } };
        if (meta.projectId) { await CS.api('/reslife-creative-projects', { method: 'PUT', body: JSON.stringify(Object.assign({ id: meta.projectId }, body)) }); const p = CS.state.projects.find(x => x.id === meta.projectId); if (p) Object.assign(p, body, { updatedAt: new Date().toISOString() }); }
        else { const p = await CS.api('/reslife-creative-projects', { method: 'POST', body: JSON.stringify(body) }); CS.state.projects.unshift(p); meta.projectId = p.id; }
        CS.toast('Saved to My Projects');
      } catch (x) { CS.toast('Save failed: ' + x.message); }
    };
    box.querySelectorAll('#emAi [data-a]').forEach(b => b.onclick = async () => {
      read();
      const action = b.getAttribute('data-a');
      b.disabled = true;
      if (/^Create/.test(action)) {
        const out = await CS.aiRewriteText(text(e), action, 'email', e.subject);
        b.disabled = false;
        CS.openCommunication(null, { id: 'conv', title: (meta.title || e.headline) + (out.channel === 'sms' ? ' — SMS' : ' — Social'), channel: out.channel, audience: meta.audience || 'Residents', purpose: 'Converted from email', body: out.body, caption: out.body, graphicCopy: out.graphicCopy || e.headline, hashtags: out.hashtags || CS.cfg.defaults.hashtags.slice(0, 3).join(' ') });
        return;
      }
      const joined = e.paragraphs.join('\n\n');
      const out = await CS.aiRewriteText(joined, action, 'email', e.subject);
      b.disabled = false;
      e.paragraphs = String(out.body || joined).split(/\n\s*\n/).map(x => x.trim()).filter(Boolean);
      if (action === 'Parent Focused') e.greeting = 'Dear Parents and Guardians,';
      if (action === 'Fix Grammar' || action === 'Make More Professional') { e.headline = CS.brandTerms(e.headline); e.intro = CS.brandTerms(e.intro); }
      box.querySelector('[data-e="paragraphs"]').value = e.paragraphs.join('\n\n');
      box.querySelector('[data-e="greeting"]').value = e.greeting || '';
      box.querySelector('[data-e="headline"]').value = e.headline;
      refresh();
    });
    refresh();
  }

  CS.email = { html, text, fromContent, editor };
})(window.CS = window.CS || {});
