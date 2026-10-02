/* Reslife Hub — Feedback widget ("Report an issue / Request a feature").
   Include on any Reslife page: <script src="reslife-feedback.js" defer></script>
   Self-contained (own styles, no dependencies). Submits to /api/reslife-feedback, which emails the admin. */
(function () {
  if (window.__rlFeedback) return; window.__rlFeedback = true;
  const HIDE_KEY = 'rl_fb_hidden';
  const css = `
  .rlfb-launch{position:fixed;right:18px;bottom:18px;z-index:290;display:flex;align-items:center;gap:8px;border:none;border-radius:999px;background:#002D6A;color:#fff;font:700 13.5px/1 Montserrat,system-ui,sans-serif;padding:12px 16px 12px 14px;box-shadow:0 10px 26px rgba(0,20,50,.3);cursor:pointer;transition:transform .15s,box-shadow .15s}
  .rlfb-launch:hover{transform:translateY(-2px);box-shadow:0 14px 30px rgba(0,20,50,.35)}
  .rlfb-launch svg{flex-shrink:0}
  .rlfb-launch .rlfb-x{display:none;margin-left:2px;width:20px;height:20px;border-radius:50%;background:rgba(255,255,255,.18);align-items:center;justify-content:center;font-size:14px;line-height:1}
  .rlfb-tab{position:fixed;right:0;bottom:90px;z-index:290;border:none;background:#002D6A;color:#fff;border-radius:10px 0 0 10px;padding:10px 6px;cursor:pointer;box-shadow:0 6px 16px rgba(0,0,0,.25);display:none}
  .rlfb-ov{position:fixed;inset:0;z-index:700;background:rgba(0,20,45,.5);display:none;align-items:flex-end;justify-content:flex-end;padding:18px}
  .rlfb-ov.show{display:flex}
  .rlfb-panel{width:420px;max-width:100%;max-height:calc(100vh - 36px);max-height:calc(100dvh - 36px);overflow:auto;background:#fff;border-radius:18px;box-shadow:0 30px 70px rgba(0,0,0,.35);font-family:Montserrat,system-ui,sans-serif;color:#0f172a;animation:rlfbIn .2s ease-out}
  @keyframes rlfbIn{from{transform:translateY(16px);opacity:0}to{transform:none;opacity:1}}
  .rlfb-head{position:relative;background:linear-gradient(135deg,#002D6A,#001B40);color:#fff;padding:18px 20px 22px}
  .rlfb-head::after{content:'';position:absolute;left:0;right:0;bottom:0;height:5px;background:#F99239}
  .rlfb-head b{display:block;font-size:17px}
  .rlfb-head span{font-size:12.5px;opacity:.85}
  .rlfb-close{position:absolute;top:12px;right:12px;width:32px;height:32px;border-radius:50%;border:1px solid rgba(255,255,255,.3);background:rgba(255,255,255,.12);color:#fff;font-size:18px;cursor:pointer}
  .rlfb-body{padding:16px 20px 18px}
  .rlfb-types{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:12px}
  .rlfb-types button{border:1.5px solid #e2e8f0;background:#fff;border-radius:12px;padding:10px 4px;font:700 12.5px Montserrat,system-ui,sans-serif;cursor:pointer;color:#334155;display:flex;flex-direction:column;align-items:center;gap:4px}
  .rlfb-types button i{font-style:normal;font-size:18px}
  .rlfb-types button.on{border-color:#F99239;background:#fff8f0;color:#002D6A}
  .rlfb-body label{display:block;font-size:11.5px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:#475569;margin:10px 0 5px}
  .rlfb-body input,.rlfb-body textarea{width:100%;box-sizing:border-box;border:1.5px solid #e2e8f0;border-radius:10px;padding:10px 12px;font:14px Montserrat,system-ui,sans-serif;color:#0f172a}
  .rlfb-body textarea{min-height:110px;resize:vertical}
  .rlfb-body input:focus,.rlfb-body textarea:focus{outline:none;border-color:#F99239}
  .rlfb-drop{border:2px dashed #cbd5e1;border-radius:12px;padding:14px;text-align:center;font-size:12.5px;color:#64748b;cursor:pointer;background:#f8fafc}
  .rlfb-drop.drag{border-color:#F99239;background:#fff8f0}
  .rlfb-drop b{color:#002D6A}
  .rlfb-shot{position:relative;margin-top:8px;display:none}
  .rlfb-shot img{width:100%;max-height:180px;object-fit:contain;border-radius:10px;border:1px solid #e2e8f0;background:#f8fafc}
  .rlfb-shot button{position:absolute;top:6px;right:6px;border:none;background:rgba(15,23,42,.75);color:#fff;border-radius:999px;padding:4px 10px;font:700 11.5px Montserrat,sans-serif;cursor:pointer}
  .rlfb-meta{font-size:11.5px;color:#94a3b8;margin-top:10px;line-height:1.4}
  .rlfb-actions{display:flex;gap:8px;margin-top:14px}
  .rlfb-send{flex:1;border:none;border-radius:999px;background:#F99239;color:#fff;font:800 14.5px Montserrat,sans-serif;padding:12px;cursor:pointer;box-shadow:0 8px 18px rgba(249,146,57,.35)}
  .rlfb-send:disabled{opacity:.6;cursor:wait}
  .rlfb-hide{border:1.5px solid #e2e8f0;background:#fff;border-radius:999px;padding:12px 14px;font:700 12.5px Montserrat,sans-serif;color:#475569;cursor:pointer}
  .rlfb-msg{border-radius:10px;padding:10px 12px;font-size:13px;font-weight:600;margin-top:10px}
  .rlfb-msg.err{background:#fef2f2;color:#991b1b}
  .rlfb-done{text-align:center;padding:26px 20px}
  .rlfb-done .ck{width:64px;height:64px;border-radius:50%;background:#16a34a;color:#fff;font-size:32px;display:flex;align-items:center;justify-content:center;margin:0 auto 12px}
  .rlfb-done b{display:block;font-size:18px;color:#002D6A}
  .rlfb-done p{color:#64748b;font-size:13.5px}
  @media (max-width:640px){
    .rlfb-launch{right:12px;bottom:calc(12px + env(safe-area-inset-bottom));padding:11px}
    .rlfb-launch .rlfb-label{display:none}
    .rlfb-launch .rlfb-x{display:inline-flex}
    .rlfb-ov{padding:0;align-items:flex-end}
    .rlfb-panel{width:100%;border-radius:20px 20px 0 0;max-height:92vh;max-height:92dvh;padding-bottom:env(safe-area-inset-bottom)}
  }
  @media print{.rlfb-launch,.rlfb-tab,.rlfb-ov{display:none!important}}`;

  function el(html) { const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstChild; }
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function mount() {
    const style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);
    const icon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><line x1="12" y1="7" x2="12" y2="11"/><line x1="12" y1="14.5" x2="12.01" y2="14.5"/></svg>';
    const launch = el(`<button type="button" class="rlfb-launch" aria-label="Report an issue or request a feature">${icon}<span class="rlfb-label">Feedback</span><span class="rlfb-x" title="Hide" aria-label="Hide feedback button">&times;</span></button>`);
    const tab = el(`<button type="button" class="rlfb-tab" aria-label="Show feedback button" title="Show feedback">${icon}</button>`);
    const ov = el(`<div class="rlfb-ov" role="dialog" aria-modal="true" aria-label="Send feedback"><div class="rlfb-panel"></div></div>`);
    document.body.append(launch, tab, ov);
    const panel = ov.firstChild;
    const setHidden = h => { localStorage.setItem(HIDE_KEY, h ? '1' : ''); launch.style.display = h ? 'none' : ''; tab.style.display = h ? 'block' : 'none'; };
    setHidden(localStorage.getItem(HIDE_KEY) === '1' && window.innerWidth <= 640);
    launch.addEventListener('click', e => { if (e.target.closest('.rlfb-x')) { e.stopPropagation(); setHidden(true); return; } open(); });
    tab.addEventListener('click', () => setHidden(false));
    ov.addEventListener('mousedown', e => { if (e.target === ov) close(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && ov.classList.contains('show')) close(); });

    let type = 'bug', shot = '';
    function close() { ov.classList.remove('show'); }
    function open() {
      type = 'bug'; shot = '';
      panel.innerHTML = `
        <div class="rlfb-head"><b>Report an issue or idea</b><span>Goes straight to the Hub admin.</span><button type="button" class="rlfb-close" aria-label="Close">&times;</button></div>
        <div class="rlfb-body">
          <div class="rlfb-types">
            <button type="button" data-t="bug" class="on"><i>&#9888;</i>Error / Bug</button>
            <button type="button" data-t="feature"><i>&#10022;</i>Feature request</button>
            <button type="button" data-t="question"><i>?</i>Question</button>
          </div>
          <label for="rlfbTitle">Short summary</label>
          <input id="rlfbTitle" maxlength="140" placeholder="e.g. Guest check-in won't submit" />
          <label for="rlfbDesc" id="rlfbDescL">What happened?</label>
          <textarea id="rlfbDesc" placeholder="What were you doing, what did you expect, and what happened instead?"></textarea>
          <label>Screenshot (optional)</label>
          <div class="rlfb-drop" id="rlfbDrop" tabindex="0"><b>Tap to upload</b>, drag an image here, or paste (Ctrl/⌘ + V)</div>
          <input type="file" id="rlfbFile" accept="image/*" hidden />
          <div class="rlfb-shot" id="rlfbShot"><img alt="Screenshot preview" /><button type="button">Remove</button></div>
          <div class="rlfb-meta">We’ll include this page, your name and your device info automatically.</div>
          <div id="rlfbMsg"></div>
          <div class="rlfb-actions"><button type="button" class="rlfb-send" id="rlfbSend">Send</button>${window.innerWidth <= 640 ? '<button type="button" class="rlfb-hide" id="rlfbHide">Hide button</button>' : ''}</div>
        </div>`;
      ov.classList.add('show');
      const $ = s => panel.querySelector(s);
      $('.rlfb-close').onclick = close;
      panel.querySelectorAll('[data-t]').forEach(b => b.onclick = () => {
        type = b.dataset.t; panel.querySelectorAll('[data-t]').forEach(x => x.classList.toggle('on', x === b));
        $('#rlfbDescL').textContent = type === 'bug' ? 'What happened?' : type === 'feature' ? 'What would you like it to do?' : 'Your question';
        $('#rlfbDesc').placeholder = type === 'bug' ? 'What were you doing, what did you expect, and what happened instead?' : type === 'feature' ? 'Describe the feature and how it would help your team.' : 'Ask away…';
      });
      const setShot = async file => {
        if (!file || !/^image\//.test(file.type)) return;
        shot = await compress(file);
        $('#rlfbShot img').src = shot; $('#rlfbShot').style.display = 'block'; $('#rlfbDrop').style.display = 'none';
      };
      $('#rlfbDrop').onclick = () => $('#rlfbFile').click();
      $('#rlfbDrop').onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('#rlfbFile').click(); } };
      $('#rlfbFile').onchange = e => setShot(e.target.files[0]);
      ['dragover', 'dragenter'].forEach(ev => $('#rlfbDrop').addEventListener(ev, e => { e.preventDefault(); $('#rlfbDrop').classList.add('drag'); }));
      ['dragleave', 'drop'].forEach(ev => $('#rlfbDrop').addEventListener(ev, e => { e.preventDefault(); $('#rlfbDrop').classList.remove('drag'); }));
      $('#rlfbDrop').addEventListener('drop', e => setShot(e.dataTransfer.files[0]));
      panel.onpaste = e => { const it = [...(e.clipboardData || {}).items || []].find(i => i.type.startsWith('image/')); if (it) { e.preventDefault(); setShot(it.getAsFile()); } };
      $('#rlfbShot button').onclick = () => { shot = ''; $('#rlfbShot').style.display = 'none'; $('#rlfbDrop').style.display = ''; };
      const hide = $('#rlfbHide'); if (hide) hide.onclick = () => { close(); setHidden(true); };
      $('#rlfbSend').onclick = submit;
      setTimeout(() => $('#rlfbTitle').focus(), 60);
    }

    async function submit() {
      const $ = s => panel.querySelector(s);
      const title = $('#rlfbTitle').value.trim(), description = $('#rlfbDesc').value.trim();
      if (!title && !description) { $('#rlfbMsg').innerHTML = '<div class="rlfb-msg err">Please add a short summary or description.</div>'; return; }
      const btn = $('#rlfbSend'); btn.disabled = true; btn.textContent = 'Sending…';
      try {
        const res = await fetch('/api/reslife-feedback', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
          type, title, description, screenshot: shot, page: location.href, pageTitle: document.title,
          property: localStorage.getItem('reslife_current_property') || '', userAgent: navigator.userAgent, viewport: `${window.innerWidth}×${window.innerHeight}`,
        }) });
        if (!res.ok) throw new Error((await res.text()) || 'Could not send');
        panel.innerHTML = `<div class="rlfb-done"><div class="ck">&#10003;</div><b>Thanks — it’s been sent!</b><p>${type === 'feature' ? 'Your idea' : type === 'question' ? 'Your question' : 'Your report'} went to the Hub admin. We’ll follow up if we need more details.</p><button type="button" class="rlfb-send" style="max-width:220px">Done</button></div>`;
        panel.querySelector('.rlfb-send').onclick = close;
        setTimeout(() => { if (ov.classList.contains('show') && panel.querySelector('.rlfb-done')) close(); }, 6000);
      } catch (e) {
        $('#rlfbMsg').innerHTML = `<div class="rlfb-msg err">${esc(/sign in/i.test(e.message) ? 'Please sign in to the Hub to send feedback.' : 'Couldn’t send: ' + e.message)}</div>`;
        btn.disabled = false; btn.textContent = 'Send';
      }
    }
  }

  // Shrink screenshots to ≤1600px JPEG so uploads stay small.
  function compress(file) {
    return new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => { const img = new Image(); img.onload = () => { const s = Math.min(1, 1600 / Math.max(img.width, img.height)); const c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); res(c.toDataURL('image/jpeg', 0.8)); }; img.onerror = rej; img.src = fr.result; };
      fr.onerror = rej; fr.readAsDataURL(file);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
