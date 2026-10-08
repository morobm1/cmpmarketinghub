/**
 * Public resident survey runtime  (/survey/<publicId>)
 * Also used for admin preview: /pulse-survey/public.html?preview=<surveyId>
 * (preview loads the DRAFT through the authenticated API and never submits).
 *
 * Loading progress (BrandedLogoLoader) is driven by real initialization tasks:
 *   brand   20%  branding request + logo image decode           (milestones)
 *   config  40%  published survey version download              (byte-level when Content-Length is sent)
 *   fonts   10%  web fonts ready                                (milestone)
 *   ui      20%  survey interface built                         (milestone)
 *   first   10%  first interactive question painted             (milestone)
 * 100% is only displayed after all of the above have finished.
 */
import { BrandedLogoLoader, ProgressTracker, fetchJsonWithProgress } from './loader.js';
import { orderedQuestions, computeVisibility, validateAnswers, answerChoices, hasAnswer, OTHER_ID } from './engine.js';

const app = document.getElementById('app');
const params = new URLSearchParams(location.search);
const previewId = params.get('preview');
const publicId = previewId ? null : (params.get('id') || (location.pathname.match(/\/survey\/([A-Za-z0-9]{10,32})\/?$/) || [])[1] || null);

let brand = null, survey = null, version = null, def = null;
let answers = {}, other = {}, page = 0, pages = [], errors = {};
let submitting = false;
const submissionId = (crypto.randomUUID ? crypto.randomUUID() : Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('')).replace(/[^A-Za-z0-9_-]/g, '');
const storeKey = () => `pulse:${publicId}:v${version}`;

const el = (tag, attrs = {}, ...kids) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') n.className = v; else if (k === 'text') n.textContent = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v); else n.setAttribute(k, v === true ? '' : v);
  }
  kids.flat().forEach((c) => c != null && n.append(c.nodeType ? c : document.createTextNode(String(c))));
  return n;
};

/* ------------------------------------------------------------- loading */
const DEFAULT_BRAND = { name: 'Ivory University House', location: 'Salt Lake City, Utah', logoDataUrl: '', primaryColor: '#446472', accentColor: '#ffb732', accent2Color: '#52d5ff', backgroundColor: '#f8fafc' };

let loader = null;
function makeLoader(b) {
  return new BrandedLogoLoader({
    logoUrl: b.logoDataUrl || null, logoAlt: b.name, wordmark: b.name, wordmarkSub: b.location,
    accentColor: b.primaryColor, glowColor: b.accentColor, background: `radial-gradient(circle at 50% 38%, #ffffff 0%, ${b.backgroundColor} 70%)`,
    message: 'Preparing your survey...', fontFamily: "'Open Sans', system-ui, sans-serif",
  });
}

async function apiAdmin(body) {
  const r = await fetch('/api/pulse-survey', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', 'X-Pulse-Request': '1' }, body: JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(d.error || 'Request failed'), { status: r.status });
  return d;
}

async function init() {
  // A loader exists from the very first frame (it stays invisible for ~180ms so fast loads don't flash).
  loader = makeLoader(DEFAULT_BRAND);
  const tracker = new ProgressTracker({ brand: 20, config: 40, fonts: 10, ui: 20, first: 10 }, (p) => loader.setProgress(p));
  try {
    if (!publicId && !previewId) throw Object.assign(new Error('This survey link is incomplete. Please check the link you received.'), { fatal: true });

    const brandTask = (async () => {
      let b = DEFAULT_BRAND;
      if (previewId) { const d = await apiAdmin({ action: 'bootstrap' }); b = d.brand; }
      else {
        const r = await fetch(`/api/pulse-survey-public?id=${encodeURIComponent(publicId)}&part=brand`);
        if (r.status === 404) throw Object.assign(new Error('This survey is not available.'), { fatal: true });
        if (!r.ok) throw new Error('Could not load survey branding.');
        b = (await r.json()).brand;
      }
      tracker.update('brand', 0.5);
      brand = { ...DEFAULT_BRAND, ...b };
      if (brand.logoDataUrl) { const img = new Image(); img.src = brand.logoDataUrl; try { await img.decode(); } catch { brand.logoDataUrl = ''; } }
      tracker.update('brand', 1);
    })();

    const configTask = (async () => {
      if (previewId) {
        const d = await apiAdmin({ action: 'get', surveyId: previewId });
        tracker.update('config', 1);
        return { ok: true, state: 'open', survey: { ...d.survey.settings }, version: { version: 0, definition: d.survey.draft } };
      }
      const { res, data } = await fetchJsonWithProgress(`/api/pulse-survey-public?id=${encodeURIComponent(publicId)}`, (f) => tracker.update('config', f));
      if (res.status === 404) throw Object.assign(new Error((data && data.error) || 'This survey is not available.'), { fatal: true });
      if (!res.ok || !data) throw new Error((data && data.error) || 'Could not load the survey.');
      return data;
    })();

    const fontsTask = (document.fonts ? Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 2500))]) : Promise.resolve()).then(() => tracker.update('fonts', 1));

    await brandTask;
    applyBrand();
    const cfg = await configTask;
    await fontsTask;

    if (cfg.state !== 'open') { buildState(cfg.message || 'This survey is not available.', cfg.survey && cfg.survey.title); tracker.update('ui', 1); }
    else {
      survey = cfg.survey; version = cfg.version.version; def = cfg.version.definition;
      restoreProgress();
      buildPages(); renderIntro();
      tracker.update('ui', 1);
    }
    app.hidden = false;
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    tracker.update('first', 1);
    await loader.complete();
    app.classList.add('ps-fade-in');
    const h = app.querySelector('h1,h2'); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
  } catch (e) {
    console.error(e);
    if (e.fatal) { applyBrand(); buildState(e.message); app.hidden = false; await loader.complete(); return; }
    const msg = e.status === 401 || e.status === 403 ? 'Sign in to the Marketing Hub to preview this survey.' : 'We couldn’t load the survey. Please check your connection and try again.';
    loader.error(msg, () => { loader.destroy(); init(); });
  }
}

function applyBrand() {
  const b = brand || DEFAULT_BRAND; const r = document.documentElement.style;
  r.setProperty('--p', b.primaryColor); r.setProperty('--a', b.accentColor); r.setProperty('--a2', b.accent2Color); r.setProperty('--bg', b.backgroundColor);
  const m = document.querySelector('meta[name="theme-color"]') || document.head.appendChild(el('meta', { name: 'theme-color' }));
  m.setAttribute('content', b.primaryColor);
}

function header(title) {
  const b = brand || DEFAULT_BRAND;
  return el('header', { class: 'ps-header' },
    b.logoDataUrl ? el('img', { src: b.logoDataUrl, alt: b.name }) : null,
    el('div', { class: 'ps-brand', text: b.name }),
    title ? el('h1', { class: 'ps-title', text: title }) : null);
}
function previewBar() { return previewId ? el('div', { class: 'ps-preview-bar', role: 'note', text: 'Preview mode — this is how residents will see the current draft. Responses are not saved.' }) : document.createComment('pulse'); }

function buildState(message, title) {
  app.replaceChildren(previewBar(), header(title || 'Resident Survey'), el('div', { class: 'ps-card', role: 'status' }, el('p', { text: message })));
}

/* -------------------------------------------------------------- pages */
function buildPages() {
  const qs = orderedQuestions(def).filter((q) => q.enabled !== false);
  pages = def.sections.map((s) => ({ section: s, questions: qs.filter((q) => q.sectionId === s.id) })).filter((p) => p.questions.length);
}
const visibleSet = () => computeVisibility(def, answers);
const pageVisible = (p, vis) => p.questions.some((q) => vis.has(q.id));
function visiblePages() { const vis = visibleSet(); return pages.map((p, i) => ({ ...p, i })).filter((p) => pageVisible(p, vis)); }

function saveProgress() { if (previewId) return; try { sessionStorage.setItem(storeKey(), JSON.stringify({ answers, other })); } catch { /* storage unavailable */ } }
function restoreProgress() { if (previewId) return; try { const s = JSON.parse(sessionStorage.getItem(storeKey()) || 'null'); if (s) { answers = s.answers || {}; other = s.other || {}; } } catch { /* ignore */ } }
function clearProgress() { try { Object.keys(sessionStorage).filter((k) => k.startsWith(`pulse:${publicId}:`)).forEach((k) => sessionStorage.removeItem(k)); } catch { /* ignore */ } }

function renderIntro() {
  const card = el('section', { class: 'ps-card ps-intro', 'aria-labelledby': 'ps-intro-h' },
    el('h2', { id: 'ps-intro-h', class: 'ps-section-title', text: 'Welcome' }),
    ...(survey.intro || '').split(/\n{2,}/).map((p) => el('p', { text: p })),
    survey.estimatedMinutes ? el('p', { class: 'ps-meta', text: `Estimated time: ${survey.estimatedMinutes} minutes · ${visiblePages().length} short sections` }) : null,
    survey.anonymous ? el('div', { class: 'ps-anon', role: 'note' }, el('span', { 'aria-hidden': 'true', text: '🔒' }),
      el('span', { text: 'This survey is anonymous. We do not ask for your name, unit, or contact information, and we do not store your IP address or link your answers to your resident account. Please avoid including identifying details in written answers.' })) : null,
  );
  app.replaceChildren(previewBar(), header(survey.title), card,
    el('div', { class: 'ps-nav' }, el('button', { class: 'ps-btn primary', type: 'button', onclick: () => { page = 0; renderPage(); }, text: hasAnswer(answers) ? 'Continue survey' : 'Start survey' })));
}

function progressBar(pos, total) {
  const pct = Math.round((pos / total) * 100);
  return el('div', { class: 'ps-progress' },
    el('div', { class: 'ps-progress-bar', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(pct), 'aria-label': 'Survey progress' },
      (() => { const f = el('div', { class: 'ps-progress-fill' }); requestAnimationFrame(() => { f.style.width = pct + '%'; }); return f; })()),
    el('div', { class: 'ps-progress-label' }, el('span', { text: `Section ${pos + 1} of ${total}` }), el('span', { text: `${pct}% complete` })));
}

let qNumbers = new Map();
function numberQuestions() {
  const vis = visibleSet(); let n = 0; qNumbers = new Map();
  orderedQuestions(def).forEach((q) => { if (q.enabled !== false && q.type !== 'heading' && vis.has(q.id)) qNumbers.set(q.id, ++n); });
}

function renderPage(focusFirstError) {
  const vp = visiblePages();
  if (page >= vp.length) page = vp.length - 1;
  const cur = vp[page]; const vis = visibleSet(); numberQuestions();
  const card = el('section', { class: 'ps-card', 'aria-labelledby': 'ps-sec-h' },
    el('h2', { id: 'ps-sec-h', class: 'ps-section-title', text: cur.section.title || 'Questions' }),
    cur.section.description ? el('p', { class: 'ps-section-desc', text: cur.section.description }) : null);
  const qWrap = el('div');
  cur.questions.filter((q) => vis.has(q.id)).forEach((q) => qWrap.append(renderQuestion(q)));
  card.append(qWrap);
  const isLast = page === vp.length - 1;
  const nav = el('div', { class: 'ps-nav' },
    el('button', { class: 'ps-btn', type: 'button', onclick: () => { if (page === 0) renderIntro(); else { page--; renderPage(); } scrollTo({ top: 0 }); }, text: 'Back' }),
    el('button', { class: 'ps-btn primary', type: 'button', id: 'ps-next', onclick: () => next(isLast), text: isLast ? (previewId ? 'Finish preview' : 'Submit survey') : 'Next' }));
  const banner = el('div', { id: 'ps-banner', 'aria-live': 'assertive' });
  app.replaceChildren(previewBar(), header(survey.title), progressBar(page, vp.length), banner, card, nav,
    el('div', { class: 'ps-hp', 'aria-hidden': 'true' }, el('label', { text: 'Website' }, el('input', { id: 'ps-website', tabindex: '-1', autocomplete: 'off' }))));
  if (focusFirstError) { const e = app.querySelector('.has-err'); if (e) { e.scrollIntoView({ block: 'center' }); const f = e.querySelector('input,select,textarea'); f && f.focus({ preventScroll: true }); } }
  else { const h = card.querySelector('h2'); h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
}

function rerenderKeepScroll() { const y = scrollY; const active = document.activeElement && document.activeElement.id; renderPage(true); scrollTo({ top: y }); if (active) { const a = document.getElementById(active); a && a.focus({ preventScroll: true }); } }

function setAnswer(q, v) {
  const before = visibleSet();
  if (hasAnswer(v)) answers[q.id] = v; else delete answers[q.id];
  delete errors[q.id];
  saveProgress();
  const after = visibleSet();
  const changed = before.size !== after.size || [...before].some((x) => !after.has(x));
  return changed;
}

/* ---------------------------------------------------------- questions */
function renderQuestion(q) {
  if (q.type === 'heading') return el('div', { class: 'ps-card ps-heading', style: 'margin:0 0 14px;background:transparent;border:0;padding:0;box-shadow:none' }, el('h3', { text: q.text }), q.description ? el('p', { class: 'ps-help', text: q.description }) : null);
  const id = 'q-' + q.id; const err = errors[q.id];
  const wrap = el('fieldset', { class: 'ps-q' + (err ? ' has-err' : ''), id, style: 'margin-bottom:22px', 'aria-describedby': err ? id + '-err' : null, 'aria-invalid': err ? 'true' : null });
  wrap.append(el('legend', {}, el('span', { class: 'ps-num', text: `${qNumbers.get(q.id)}.` }), q.text, q.required ? el('span', { class: 'ps-req', 'aria-label': 'required', text: '*' }) : null));
  if (q.description) wrap.append(el('p', { class: 'ps-help', text: q.description }));
  const onChange = (v) => { if (setAnswer(q, v)) rerenderKeepScroll(); else refresh(); };
  let refresh = () => {};
  const choices = answerChoices(q);

  if (['single', 'likert', 'yesno'].includes(q.type)) {
    const box = el('div', { class: 'ps-opts', role: 'radiogroup' });
    choices.forEach((c) => box.append(optRow(q, c, 'radio', () => answers[q.id] === c.id, () => onChange(c.id))));
    wrap.append(box); refresh = () => syncOpts(box, (cid) => answers[q.id] === cid);
    addOther(q, wrap, () => answers[q.id] === OTHER_ID);
  } else if (q.type === 'checkbox') {
    const box = el('div', { class: 'ps-opts' });
    const sel = () => answers[q.id] || [];
    choices.forEach((c) => box.append(optRow(q, c, 'checkbox', () => sel().includes(c.id), () => {
      let s = sel().slice();
      if (s.includes(c.id)) s = s.filter((x) => x !== c.id);
      else if (c.exclusive) s = [c.id];
      else { s = s.filter((x) => !(q.choices.find((k) => k.id === x) || {}).exclusive); if (q.maxSelect && s.length >= q.maxSelect) return; s.push(c.id); }
      onChange(s);
    })));
    wrap.append(box);
    refresh = () => { syncOpts(box, (cid) => sel().includes(cid)); const full = q.maxSelect && sel().length >= q.maxSelect; box.querySelectorAll('.ps-opt').forEach((o) => { const dis = full && !sel().includes(o.dataset.cid); o.classList.toggle('dis', !!dis); o.querySelector('input').disabled = !!dis; }); };
    refresh();
    if (q.maxSelect) wrap.append(el('div', { class: 'ps-help', 'aria-live': 'polite', text: `Choose up to ${q.maxSelect}.` }));
    addOther(q, wrap, () => sel().includes(OTHER_ID));
  } else if (q.type === 'dropdown') {
    const s = el('select', { class: 'ps-select', id: id + '-in', onchange: (e) => onChange(e.target.value) }, el('option', { value: '', text: 'Select an option…' }), ...choices.map((c) => el('option', { value: c.id, text: c.label })));
    s.value = answers[q.id] || ''; wrap.append(s); addOther(q, wrap, () => answers[q.id] === OTHER_ID);
  } else if (q.type === 'rating') {
    const box = el('div', { class: 'ps-scale', role: 'radiogroup' });
    choices.forEach((c) => { const o = optRow(q, c, 'radio', () => answers[q.id] === c.id, () => onChange(c.id)); if (c.na) o.classList.add('na'); box.append(o); });
    wrap.append(box);
    if (q.scale && (q.scale.minLabel || q.scale.maxLabel)) wrap.append(el('div', { class: 'ps-scale-labels', 'aria-hidden': 'true' }, el('span', { text: `${q.scale.min} = ${q.scale.minLabel}` }), el('span', { text: `${q.scale.max} = ${q.scale.maxLabel}` })));
    refresh = () => syncOpts(box, (cid) => answers[q.id] === cid);
  } else if (q.type === 'grid') {
    const cur = () => answers[q.id] || {};
    (q.rows || []).forEach((r) => {
      const box = el('div', { class: 'ps-scale', role: 'radiogroup', 'aria-label': r.label });
      choices.forEach((c) => box.append(optRow({ ...q, id: q.id + '_' + r.id }, c, 'radio', () => cur()[r.id] === c.id, () => { const v = { ...cur(), [r.id]: c.id }; onChange(v); syncOpts(box, (cid) => (answers[q.id] || {})[r.id] === cid); })));
      wrap.append(el('div', { class: 'ps-grid-row' }, el('div', { class: 'ps-grid-label', text: r.label }), box));
    });
  } else if (q.type === 'short') {
    wrap.append(el('input', { class: 'ps-input', id: id + '-in', type: 'text', maxlength: '500', value: answers[q.id] || '', 'aria-label': q.text, oninput: (e) => setAnswer(q, e.target.value) }));
  } else if (q.type === 'long') {
    const t = el('textarea', { class: 'ps-textarea', id: id + '-in', maxlength: '5000', 'aria-label': q.text, oninput: (e) => setAnswer(q, e.target.value) }); t.value = answers[q.id] || ''; wrap.append(t);
  } else if (q.type === 'date') {
    wrap.append(el('input', { class: 'ps-input', id: id + '-in', type: 'date', value: answers[q.id] || '', 'aria-label': q.text, onchange: (e) => setAnswer(q, e.target.value) }));
  }
  if (err) wrap.append(el('div', { class: 'ps-errmsg', id: id + '-err', text: err }));
  return wrap;
}

function optRow(q, c, kind, isSel, onPick) {
  const inp = el('input', { type: kind, name: 'n-' + q.id, value: c.id, id: `o-${q.id}-${c.id}` });
  inp.checked = isSel();
  inp.addEventListener('change', onPick);
  if (kind === 'radio') inp.addEventListener('click', () => { if (inp.checked && isSel()) { /* keep selection */ } });
  const row = el('label', { class: 'ps-opt' + (kind === 'checkbox' ? ' cb' : '') + (isSel() ? ' sel' : ''), for: inp.id }, inp, el('span', { class: 'ps-dot', 'aria-hidden': 'true' }), el('span', { text: c.label }));
  row.dataset.cid = c.id;
  return row;
}
function syncOpts(box, isSel) { box.querySelectorAll('.ps-opt').forEach((o) => { const s = isSel(o.dataset.cid); o.classList.toggle('sel', s); o.querySelector('input').checked = s; }); }
function addOther(q, wrap, active) {
  if (!q.allowOther) return;
  const inp = el('input', { class: 'ps-input ps-other', id: `q-${q.id}-other`, type: 'text', maxlength: '500', placeholder: 'Please specify (optional)', 'aria-label': 'Other, please specify', value: other[q.id] || '', oninput: (e) => { other[q.id] = e.target.value; saveProgress(); } });
  inp.hidden = !active();
  wrap.append(inp);
  wrap.addEventListener('change', () => { inp.hidden = !active(); });
}

/* --------------------------------------------------------------- submit */
function pageErrors(pg) {
  const res = validateAnswers(def, answers, other, {});
  const ids = new Set(pg.questions.map((q) => q.id));
  return Object.fromEntries(Object.entries(res.errors).filter(([k]) => ids.has(k)));
}

async function next(isLast) {
  const vp = visiblePages(); const pg = vp[page];
  const pe = pageErrors(pg);
  if (Object.keys(pe).length) { errors = { ...errors, ...pe }; renderPage(true); const b = document.getElementById('ps-banner'); b.replaceChildren(el('div', { class: 'ps-banner err', text: 'Please answer the highlighted question(s) to continue.' })); return; }
  if (!isLast) { page++; renderPage(); scrollTo({ top: 0 }); return; }
  if (previewId) { renderDone(true); return; }
  if (submitting) return;
  submitting = true;
  const btn = document.getElementById('ps-next'); btn.disabled = true; btn.textContent = 'Submitting…';
  const res = validateAnswers(def, answers, other);
  try {
    const r = await fetch('/api/pulse-survey-public', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'submit', id: publicId, version, answers: res.answers, other: res.other, submissionId, website: (document.getElementById('ps-website') || {}).value || '' }) });
    const d = await r.json().catch(() => ({}));
    if (r.ok && d.ok) { clearProgress(); renderDone(false); return; }
    if (r.status === 422 && d.errors) {
      errors = d.errors; const first = visiblePages().findIndex((p) => p.questions.some((q) => d.errors[q.id]));
      if (first >= 0) page = first; renderPage(true); return;
    }
    showBanner(d.error || 'We couldn’t submit your survey. Please try again.', d.reload);
  } catch {
    showBanner('Network problem — your answers are still here. Please check your connection and tap Submit again.');
  } finally {
    submitting = false;
    const b = document.getElementById('ps-next'); if (b) { b.disabled = false; b.textContent = 'Submit survey'; }
  }
}
function showBanner(msg, reload) {
  const b = document.getElementById('ps-banner'); if (!b) return;
  b.replaceChildren(el('div', { class: 'ps-banner err', role: 'alert' }, msg, reload ? el('div', {}, el('button', { class: 'ps-btn', type: 'button', style: 'margin-top:8px', onclick: () => location.reload(), text: 'Reload survey' })) : null));
  b.scrollIntoView({ block: 'center' });
}

function renderDone(preview) {
  const card = el('section', { class: 'ps-card ps-done ps-fade-in', 'aria-labelledby': 'ps-done-h' },
    el('div', { class: 'ps-check', 'aria-hidden': 'true' }),
    el('h2', { id: 'ps-done-h', class: 'ps-section-title', text: preview ? 'Preview complete' : 'Thank you!' }),
    el('p', { text: preview ? 'Your answers were validated but NOT saved (preview mode).' : (survey.thankYou || 'Your response has been recorded.') }));
  if (!preview && survey.followUp && survey.followUp.enabled) card.append(followUpBlock());
  app.replaceChildren(previewBar(), header(survey.title), card);
  const h = card.querySelector('h2'); h.setAttribute('tabindex', '-1'); h.focus();
  scrollTo({ top: 0 });
}

function followUpBlock() {
  const box = el('div', { style: 'margin-top:18px;text-align:left' });
  const btn = el('button', { class: 'ps-btn accent', type: 'button', style: 'width:100%', text: survey.followUp.label });
  box.append(btn);
  btn.addEventListener('click', () => {
    const f = el('form', { class: 'ps-card', style: 'margin-top:12px', novalidate: true },
      el('p', { class: 'ps-help', text: 'This request is separate from your anonymous survey answers and is not connected to them.' }),
      el('label', { text: 'Name' }, el('input', { class: 'ps-input', name: 'name', autocomplete: 'name', required: true })),
      el('label', { text: 'Email' }, el('input', { class: 'ps-input', name: 'email', type: 'email', autocomplete: 'email' })),
      el('label', { text: 'Phone (optional if email given)' }, el('input', { class: 'ps-input', name: 'phone', type: 'tel', autocomplete: 'tel' })),
      el('label', { text: 'Anything we should know? (optional)' }, el('textarea', { class: 'ps-textarea', name: 'message', maxlength: '1000' })),
      el('div', { id: 'ps-fu-msg', 'aria-live': 'polite' }),
      el('button', { class: 'ps-btn primary', type: 'submit', style: 'width:100%;margin-top:10px', text: 'Send request' }));
    f.addEventListener('submit', async (e) => {
      e.preventDefault(); const fd = new FormData(f); const msg = f.querySelector('#ps-fu-msg');
      const r = await fetch('/api/pulse-survey-public', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'contact', id: publicId, ...Object.fromEntries(fd) }) }).catch(() => null);
      const d = r ? await r.json().catch(() => ({})) : {};
      if (r && r.ok) box.replaceChildren(el('div', { class: 'ps-banner info', role: 'status', text: 'Thanks! Our leasing team will reach out.' }));
      else msg.replaceChildren(el('div', { class: 'ps-banner err', text: d.error || 'Could not send. Please try again.' }));
    });
    btn.replaceWith(f); f.querySelector('input').focus();
  });
  return box;
}

init();
