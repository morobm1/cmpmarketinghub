/** Survey Builder: settings, sections, visual question editor, drag & drop, conditional logic, autosave. */
import { state, el, api, toast, confirmDialog, menu, fmtDate, statusBadge, lifecycle, toLocalInput, navigate } from './core.js';
import { QUESTION_TYPES, REPORT_ROLES, LOGIC_SOURCE_TYPES, defaultQuestion, orderedQuestions, validateDefinition, answerChoices, uid, AGREEMENT_CHOICES, QUALITY_CHOICES } from './engine.js';
import { publishFlow, shareDialog, createDialog } from './admin.js';

const AUTOSAVE_MS = 1200;

export async function renderBuilder(root, surveyId) {
  if (!surveyId) return renderPicker(root);
  const { survey } = await api('get', { surveyId });
  const B = {
    survey, settings: { ...survey.settings }, def: survey.draft, rev: survey.draftRev,
    selected: null, dirty: false, saving: false, error: null, timer: null, readOnly: survey.status === 'archived', showSettings: false,
  };
  if (!B.def.sections.length) B.def.sections.push({ id: uid('s'), title: 'Section 1', description: '' });
  state.leaveGuard = () => B.dirty || B.saving;

  const saveEl = el('span', { class: 'save-state', 'aria-live': 'polite' });
  const setSave = () => {
    saveEl.className = 'save-state' + (B.error ? ' err' : B.dirty ? ' dirty' : '');
    saveEl.textContent = B.error ? `⚠ ${B.error}` : B.saving ? 'Saving…' : B.dirty ? 'Unsaved changes' : `All changes saved${B.savedAt ? ' · ' + fmtDate(B.savedAt, true) : ''}`;
  };
  const save = async () => {
    clearTimeout(B.timer);
    if (!B.dirty || B.saving || B.readOnly) return;
    B.saving = true; B.dirty = false; B.error = null; setSave();
    try {
      const r = await api('saveDraft', { surveyId, draftRev: B.rev, definition: B.def, settings: B.settings });
      B.rev = r.draftRev; B.savedAt = r.updatedAt; B.survey.hasUnpublishedChanges = !!B.survey.currentVersion;
    } catch (e) {
      B.dirty = true; B.error = e.data && e.data.conflict ? 'Edited elsewhere — reload to continue' : e.message;
      if (!(e.data && e.data.conflict)) B.timer = setTimeout(save, 5000); // retry transient failures
    } finally { B.saving = false; setSave(); }
  };
  const touch = (opts = {}) => {
    B.dirty = true; setSave(); clearTimeout(B.timer); B.timer = setTimeout(save, AUTOSAVE_MS);
    if (opts.canvas) drawCanvas(); if (opts.panel) drawPanel(); if (opts.outline !== false) drawOutline();
    drawIssues();
  };
  window.addEventListener('pagehide', save, { once: true });

  const outline = el('div', { class: 'card b-outline' });
  const canvas = el('div');
  const panel = el('div', { class: 'card panel' });
  const issues = el('div');
  const settingsCard = el('div', { class: 'card', style: 'display:none' });

  const head = el('div', { class: 'card' }, el('div', { class: 'content', style: 'display:flex;gap:14px;align-items:center;flex-wrap:wrap' },
    el('div', { style: 'flex:1;min-width:240px' },
      el('div', { style: 'display:flex;gap:8px;align-items:center;flex-wrap:wrap' }, el('h2', { style: 'padding:0;border:0;font-size:18px', id: 'b-title', text: B.settings.title }), statusBadge(survey),
        survey.currentVersion ? el('span', { class: 'badge info', text: `live v${survey.currentVersion}` }) : null),
      lifecycle(survey), el('div', { style: 'margin-top:6px' }, saveEl)),
    el('div', { class: 'button-group' },
      el('button', { onclick: () => { B.showSettings = !B.showSettings; settingsCard.style.display = B.showSettings ? '' : 'none'; }, text: '⚙ Survey settings' }),
      el('button', { onclick: async () => { await save(); window.open(`public.html?preview=${encodeURIComponent(surveyId)}`, '_blank'); }, text: 'Preview' }),
      !B.readOnly ? el('button', { class: 'primary', onclick: async () => { await save(); if (B.dirty) { toast('Save failed — fix before publishing', true); return; } publishFlow(surveyId, () => navigate('builder', surveyId)); }, text: survey.currentVersion ? 'Publish changes' : 'Publish Survey' }) : null,
      survey.currentVersion ? el('button', { onclick: () => shareDialog(B.survey), text: 'Share' }) : null)));

  root.replaceChildren(
    B.readOnly ? el('div', { class: 'alert warn', text: 'This survey is archived and read-only. Restore it from the Survey Manager to edit.' }) : null,
    survey.currentVersion ? el('div', { class: 'alert info', text: 'You are editing the draft of a live survey. Residents keep seeing the published version until you click “Publish changes”. The public link never changes.' }) : null,
    head, settingsCard, issues,
    el('div', { class: 'builder' }, outline, el('div', {}, canvas), panel));

  /* ------------------------------------------------------- settings */
  function drawSettings() {
    const st = B.settings;
    const f = (key, label, input) => { input.addEventListener('input', () => { st[key] = input.type === 'checkbox' ? input.checked : input.value; if (key === 'title') document.getElementById('b-title').textContent = input.value; touch({ outline: false }); }); return el('div', { class: 'form-group' }, el('label', { text: label }), input); };
    const dt = (key, label) => { const i = el('input', { type: 'datetime-local', value: toLocalInput(st[key]) }); i.addEventListener('change', () => { st[key] = i.value ? new Date(i.value).toISOString() : null; touch({ outline: false }); }); return el('div', { class: 'form-group' }, el('label', { text: label }), i, el('div', { class: 'small muted', text: 'Your local time. Leave blank for no limit.' })); };
    const anon = el('input', { type: 'checkbox', checked: st.anonymous !== false });
    anon.addEventListener('change', () => { st.anonymous = anon.checked; touch({ outline: false }); });
    const fu = el('input', { type: 'checkbox', checked: !!(st.followUp && st.followUp.enabled) });
    const fuLabel = el('input', { type: 'text', value: (st.followUp && st.followUp.label) || 'Interested in discussing your renewal options? Request information.' });
    const syncFu = () => { st.followUp = { enabled: fu.checked, label: fuLabel.value }; touch({ outline: false }); };
    fu.addEventListener('change', syncFu); fuLabel.addEventListener('input', syncFu);
    settingsCard.replaceChildren(el('h2', { text: 'Survey settings' }), el('div', { class: 'content' },
      el('div', { class: 'form-row' }, f('title', 'Survey title', el('input', { type: 'text', value: st.title })),
        f('category', 'Category', el('select', {}, state.categories.map((c) => el('option', { value: c, text: c, selected: c === st.category }))))),
      f('description', 'Internal description (not shown to residents)', el('textarea', { value: st.description || '' })),
      el('div', { class: 'form-row-3' }, f('academicYear', 'Academic year', el('input', { type: 'text', value: st.academicYear || '' })), f('term', 'Term / reporting period', el('input', { type: 'text', value: st.term || '' })), f('audience', 'Intended audience', el('input', { type: 'text', value: st.audience || '' }))),
      el('div', { class: 'form-row-3' }, dt('openAt', 'Opening date'), dt('closeAt', 'Closing date'), f('eligibleCount', 'Eligible residents (for response-rate estimate)', el('input', { type: 'number', min: '0', value: st.eligibleCount || '' }))),
      el('div', { class: 'form-row' }, f('estimatedMinutes', 'Estimated duration (minutes)', el('input', { type: 'text', value: st.estimatedMinutes || '' })),
        el('div', { class: 'form-group' }, el('label', { text: 'Accepting responses' }), el('div', { class: 'small', text: survey.currentVersion ? `Currently ${survey.status}. Use Pause / Resume / Close in the Survey Manager.` : 'Starts accepting responses once published (subject to the dates above).' }))),
      f('intro', 'Survey introduction (shown to residents)', el('textarea', { value: st.intro || '', style: 'min-height:140px' })),
      f('thankYou', 'Completion / thank-you message', el('textarea', { value: st.thankYou || '', style: 'min-height:100px' })),
      el('label', { style: 'display:flex;gap:8px;align-items:center' }, anon, 'Anonymous responses (no names, contact info, IP addresses or account links are collected)'),
      el('label', { style: 'display:flex;gap:8px;align-items:center;margin-top:10px' }, fu, 'After submission, offer a separate renewal-information request form (not linked to answers)'),
      el('div', { class: 'form-group', style: 'margin-top:6px' }, fuLabel)));
    if (B.readOnly) settingsCard.querySelectorAll('input,textarea,select').forEach((x) => { x.disabled = true; });
  }

  /* -------------------------------------------------------- outline */
  function drawOutline() {
    const qs = B.def.questions; const errs = currentIssues();
    let n = 0;
    outline.replaceChildren(el('h2', { text: 'Outline' }), ...B.def.sections.flatMap((s) => [
      el('div', { class: 'o-sec', text: s.title || 'Untitled section' }),
      ...qs.filter((q) => q.sectionId === s.id).map((q) => el('div', { class: 'o-q' + (B.selected === q.id ? ' sel' : '') + (q.enabled === false ? ' off' : ''), title: q.text, style: errs.has(q.id) ? 'color:#b91c1c' : null,
        onclick: () => select(q.id, true), text: `${q.type === 'heading' ? '¶' : (q.enabled === false ? '–' : ++n) + '.'} ${q.text || 'Untitled'}` })),
    ]));
  }
  function currentIssues() { return new Set(validateDefinition(B.def, { anonymous: B.settings.anonymous }).errors.map((e) => e.questionId).filter(Boolean)); }
  function drawIssues() {
    const v = validateDefinition(B.def, { anonymous: B.settings.anonymous });
    issues.replaceChildren(v.errors.length ? el('div', { class: 'alert warn' }, el('b', { text: `${v.errors.length} item(s) to fix before publishing` }), el('ul', {}, v.errors.slice(0, 6).map((e) => el('li', {}, e.questionId ? el('button', { class: 'link', style: 'padding:0;text-align:left;white-space:normal', onclick: () => select(e.questionId, true), text: e.message }) : e.message)))) : null);
    canvas.querySelectorAll('.q-card').forEach((c) => c.classList.toggle('has-err', v.errors.some((e) => e.questionId === c.dataset.id)));
  }

  /* --------------------------------------------------------- canvas */
  let dragId = null;
  function drawCanvas() {
    const qs = B.def.questions; let num = 0;
    canvas.replaceChildren(...B.def.sections.map((s, si) => {
      const title = el('input', { type: 'text', value: s.title, 'aria-label': 'Section title', placeholder: 'Section title' });
      title.addEventListener('input', () => { s.title = title.value; touch(); });
      const desc = el('input', { type: 'text', value: s.description || '', placeholder: 'Section description (optional)', 'aria-label': 'Section description', style: 'margin:8px 10px 0;width:calc(100% - 20px)' });
      desc.addEventListener('input', () => { s.description = desc.value; touch({ outline: false }); });
      const sq = qs.filter((q) => q.sectionId === s.id);
      const body = el('div', { 'data-section': s.id });
      body.addEventListener('dragover', (e) => { if (dragId) e.preventDefault(); });
      body.addEventListener('drop', (e) => { if (!dragId || e.target.closest('.q-card')) return; e.preventDefault(); moveTo(dragId, s.id, null); });
      sq.forEach((q) => body.append(qCard(q, q.type === 'heading' || q.enabled === false ? null : ++num)));
      if (!sq.length) body.append(el('div', { class: 'empty small', text: 'No questions yet — add one below or drag one here.' }));
      return el('div', { class: 'sec-card' },
        el('div', { class: 'sec-head' }, el('span', { class: 'badge info', text: `Section ${si + 1}` }), title,
          B.readOnly ? null : menu('⋯', [
            { label: 'Move section up', disabled: si === 0, onClick: () => { swap(B.def.sections, si, si - 1); touch({ canvas: true }); } },
            { label: 'Move section down', disabled: si === B.def.sections.length - 1, onClick: () => { swap(B.def.sections, si, si + 1); touch({ canvas: true }); } },
            { label: 'Add section below', onClick: () => { B.def.sections.splice(si + 1, 0, { id: uid('s'), title: `Section ${B.def.sections.length + 1}`, description: '' }); touch({ canvas: true }); } },
            '-',
            { label: 'Delete section', danger: true, disabled: B.def.sections.length === 1, onClick: async () => {
              if (sq.length && !(await confirmDialog('Delete section', `Delete “${s.title}” and its ${sq.length} question(s)? Published versions and responses are not affected.`, 'Delete', true))) return;
              B.def.sections.splice(si, 1); B.def.questions = B.def.questions.filter((q) => q.sectionId !== s.id); B.selected = null; touch({ canvas: true, panel: true });
            } },
          ])),
        desc, body, B.readOnly ? null : addBar(s.id));
    }), B.readOnly ? el('span') : el('button', { onclick: () => { B.def.sections.push({ id: uid('s'), title: `Section ${B.def.sections.length + 1}`, description: '' }); touch({ canvas: true }); }, text: '+ Add section' }));
    drawIssues();
  }
  function addBar(sectionId) {
    const types = Object.entries(QUESTION_TYPES).map(([t, d]) => ({ label: d.label, onClick: () => addQuestion(t, sectionId) }));
    return el('div', { class: 'add-q' }, el('button', { class: 'sm primary', onclick: () => addQuestion('single', sectionId), text: '+ Add question' }), menu('+ Other type ▾', types));
  }
  function addQuestion(type, sectionId, after) {
    const q = defaultQuestion(type, sectionId);
    if (type !== 'heading') q.text = '';
    const idx = after ? B.def.questions.findIndex((x) => x.id === after) + 1 : lastIndexInSection(sectionId) + 1;
    B.def.questions.splice(idx, 0, q); B.selected = q.id; touch({ canvas: true, panel: true });
    setTimeout(() => { const t = panel.querySelector('#qp-text'); t && t.focus(); }, 30);
  }
  const lastIndexInSection = (sid) => { let i = -1; B.def.questions.forEach((q, k) => { if (q.sectionId === sid) i = k; }); return i === -1 ? B.def.questions.length - 1 : i; };

  function qCard(q, num) {
    const card = el('div', { class: 'q-card' + (B.selected === q.id ? ' sel' : '') + (q.enabled === false ? ' off' : ''), 'data-id': q.id, draggable: B.readOnly ? null : 'true', tabindex: '0', role: 'button', 'aria-label': `Edit question ${q.text}` });
    card.addEventListener('click', (e) => { if (!e.target.closest('.tools')) select(q.id); });
    card.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target === card) select(q.id); });
    card.addEventListener('dragstart', (e) => { dragId = q.id; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', q.id); });
    card.addEventListener('dragend', () => { dragId = null; canvas.querySelectorAll('.drag-over').forEach((x) => x.classList.remove('drag-over')); });
    card.addEventListener('dragover', (e) => { if (dragId && dragId !== q.id) { e.preventDefault(); card.classList.add('drag-over'); } });
    card.addEventListener('dragleave', () => card.classList.remove('drag-over'));
    card.addEventListener('drop', (e) => { e.preventDefault(); card.classList.remove('drag-over'); if (dragId && dragId !== q.id) moveTo(dragId, q.sectionId, q.id); });
    const tags = [el('span', { class: 'badge draft', text: QUESTION_TYPES[q.type].label })];
    if (q.required) tags.push(el('span', { class: 'badge closed', text: 'required' }));
    if (q.logic && q.logic.conditions.length) tags.push(el('span', { class: 'badge paused', text: 'conditional' }));
    if (q.enabled === false) tags.push(el('span', { class: 'badge archived', text: 'turned off' }));
    if (q.comparisonKey) tags.push(el('span', { class: 'badge info', text: `key: ${q.comparisonKey}` }));
    const i = B.def.questions.indexOf(q);
    card.append(el('span', { class: 'grip', 'aria-hidden': 'true', text: '⠿' }),
      el('div', { class: 'qt', text: `${num ? num + '. ' : ''}${q.text || 'Untitled question'}` }),
      choicePreview(q), el('div', { class: 'meta' }, tags),
      B.readOnly ? null : el('div', { class: 'tools' },
        el('button', { class: 'sm', title: 'Move up', 'aria-label': 'Move up', onclick: () => nudge(q, -1), text: '↑' }),
        el('button', { class: 'sm', title: 'Move down', 'aria-label': 'Move down', onclick: () => nudge(q, 1), text: '↓' }),
        el('button', { class: 'sm', title: 'Duplicate', onclick: () => duplicateQ(q, i), text: 'Duplicate' }),
        el('button', { class: 'sm', title: 'Delete', style: 'color:#dc2626', onclick: () => deleteQ(q), text: 'Delete' })));
    return card;
  }
  function choicePreview(q) {
    const ch = answerChoices(q);
    if (q.type === 'grid') return el('div', { class: 'small muted', text: `${q.rows.length} rows × ${ch.length} columns` });
    if (!ch.length) return q.description ? el('div', { class: 'small muted', text: q.description }) : null;
    return el('div', { class: 'small muted', text: ch.slice(0, 6).map((c) => c.label).join(' · ') + (ch.length > 6 ? ` · +${ch.length - 6}` : '') });
  }
  function moveTo(id, sectionId, beforeId) {
    const qs = B.def.questions; const from = qs.findIndex((x) => x.id === id); if (from < 0) return;
    const [q] = qs.splice(from, 1); q.sectionId = sectionId;
    let to = beforeId ? qs.findIndex((x) => x.id === beforeId) : lastIndexInSection(sectionId) + 1;
    if (to < 0) to = qs.length;
    qs.splice(to, 0, q); touch({ canvas: true, panel: true });
  }
  function nudge(q, dir) {
    const order = orderedQuestions(B.def); const k = order.indexOf(q); const other = order[k + dir];
    if (!other) return;
    if (other.sectionId !== q.sectionId) { q.sectionId = other.sectionId; }
    const qs = B.def.questions; const a = qs.indexOf(q); qs.splice(a, 1);
    const b = qs.indexOf(other); qs.splice(dir < 0 ? b : b + 1, 0, q);
    touch({ canvas: true, panel: true });
  }
  function duplicateQ(q, i) {
    const c = JSON.parse(JSON.stringify(q)); c.id = uid('q'); c.text = q.text + ' (copy)'; c.comparisonKey = '';
    B.def.questions.splice(i + 1, 0, c); B.selected = c.id; touch({ canvas: true, panel: true });
  }
  async function deleteQ(q) {
    const deps = B.def.questions.filter((x) => x.logic && x.logic.conditions.some((c) => c.questionId === q.id));
    const msg = `Delete “${q.text || 'this question'}”?${deps.length ? ` ${deps.length} conditional rule(s) depend on it and will be removed.` : ''} Responses already collected for published versions are preserved.`;
    if (!(await confirmDialog('Delete question', msg, 'Delete', true))) return;
    B.def.questions = B.def.questions.filter((x) => x.id !== q.id);
    deps.forEach((x) => { x.logic.conditions = x.logic.conditions.filter((c) => c.questionId !== q.id); if (!x.logic.conditions.length) x.logic = null; });
    if (B.selected === q.id) B.selected = null; touch({ canvas: true, panel: true });
  }
  function select(id, scroll) {
    B.selected = id; drawPanel(); drawOutline();
    canvas.querySelectorAll('.q-card').forEach((c) => c.classList.toggle('sel', c.dataset.id === id));
    if (scroll) { const c = canvas.querySelector(`.q-card[data-id="${CSS.escape(id)}"]`); c && c.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
  }
  const swap = (a, i, j) => { [a[i], a[j]] = [a[j], a[i]]; };
  const refreshCard = (q) => { const c = canvas.querySelector(`.q-card[data-id="${CSS.escape(q.id)}"]`); if (!c) return; const order = orderedQuestions(B.def).filter((x) => x.type !== 'heading' && x.enabled !== false); const n = order.indexOf(q) + 1; c.replaceWith(qCard(q, n || null)); };

  /* ---------------------------------------------------------- panel */
  function drawPanel() {
    const q = B.def.questions.find((x) => x.id === B.selected);
    if (!q) { panel.replaceChildren(el('h2', { text: 'Question editor' }), el('div', { class: 'empty', text: 'Select a question to edit it, or add a new one.' })); return; }
    const upd = (fn, opts = {}) => { fn(); touch({ outline: true, ...opts }); if (!opts.canvas) refreshCard(q); };
    const field = (label, input, help) => el('div', { class: 'form-group' }, el('label', { text: label }), input, help ? el('div', { class: 'small muted', text: help }) : null);
    const text = el('textarea', { id: 'qp-text', value: q.text, placeholder: 'Type the question residents will see', style: 'min-height:60px' });
    text.addEventListener('input', () => upd(() => { q.text = text.value; }));
    const desc = el('input', { type: 'text', value: q.description || '', placeholder: 'Optional helper text' });
    desc.addEventListener('input', () => upd(() => { q.description = desc.value; }));
    const typeSel = el('select', {}, Object.entries(QUESTION_TYPES).map(([t, d]) => el('option', { value: t, text: d.label, selected: t === q.type })));
    typeSel.addEventListener('change', () => upd(() => changeType(q, typeSel.value), { canvas: true, panel: true }));
    const chk = (label, get, set) => { const c = el('input', { type: 'checkbox', checked: get() }); c.addEventListener('change', () => upd(() => set(c.checked), { canvas: true, panel: true })); return el('label', { style: 'display:flex;gap:8px;align-items:center;font-weight:600' }, c, label); };

    const parts = [
      el('h2', {}, 'Edit question', el('span', { class: 'spacer' }), el('button', { class: 'sm', onclick: () => { B.selected = null; drawPanel(); drawOutline(); canvas.querySelectorAll('.q-card.sel').forEach((c) => c.classList.remove('sel')); }, text: 'Close' })),
    ];
    const c = el('div', { class: 'content' },
      field('Question type', typeSel),
      field(q.type === 'heading' ? 'Heading text' : 'Question wording', text),
      field(q.type === 'heading' ? 'Descriptive text' : 'Description', desc),
      q.type !== 'heading' ? el('div', { style: 'display:flex;gap:18px;flex-wrap:wrap;margin-bottom:14px' }, chk('Required', () => q.required, (v) => { q.required = v; }), chk('Include in survey', () => q.enabled !== false, (v) => { q.enabled = v; })) : chk('Include in survey', () => q.enabled !== false, (v) => { q.enabled = v; }),
      choicesEditor(q, upd), gridRowsEditor(q, upd), ratingEditor(q, upd), checkboxLimits(q, upd), otherEditor(q, upd),
      q.type !== 'heading' ? reportingEditor(q, upd) : null,
      logicEditor(q, upd));
    parts.push(c);
    panel.replaceChildren(...parts);
    if (B.readOnly) panel.querySelectorAll('input,textarea,select,button:not(.sm)').forEach((x) => { x.disabled = true; });
  }

  function changeType(q, t) {
    const keepChoices = ['single', 'checkbox', 'dropdown'].includes(t) && ['single', 'checkbox', 'dropdown', 'likert'].includes(q.type);
    const d = defaultQuestion(t, q.sectionId);
    q.type = t;
    if (!keepChoices) { q.choices = d.choices; q.rows = d.rows; }
    q.scale = d.scale; if (t !== 'rating') q.naOption = { enabled: false, label: 'N/A' };
    if (t !== 'checkbox') { q.minSelect = null; q.maxSelect = null; }
    if (!['single', 'checkbox', 'dropdown'].includes(t)) q.allowOther = false;
    // Logic that used this question as a source may now be invalid; validation will flag it.
  }

  function choicesEditor(q, upd) {
    if (!['single', 'checkbox', 'dropdown', 'likert', 'grid'].includes(q.type)) return null;
    const list = el('div');
    const draw = () => list.replaceChildren(...q.choices.map((ch, i) => {
      const lab = el('input', { type: 'text', value: ch.label, 'aria-label': `Choice ${i + 1}` });
      lab.addEventListener('input', () => upd(() => { ch.label = lab.value; }));
      const sc = el('input', { class: 'score', type: 'number', value: ch.score ?? '', placeholder: 'score', title: 'Score used for averages (blank = not scored)', 'aria-label': 'Score' });
      sc.addEventListener('input', () => upd(() => { if (sc.value === '') delete ch.score; else ch.score = Number(sc.value); }));
      const flags = menu('⋯', [
        { label: ch.na ? '✓ Not Applicable (excluded from scores)' : 'Mark as Not Applicable', onClick: () => upd(() => { ch.na = !ch.na; if (ch.na) delete ch.score; }, { panel: true }) },
        q.type === 'checkbox' && { label: ch.exclusive ? '✓ Exclusive (cannot combine)' : 'Make exclusive (e.g. “None”)', onClick: () => upd(() => { ch.exclusive = !ch.exclusive; }, { panel: true }) },
        q.type === 'single' && { label: `Renewal sentiment: ${ch.sentiment || 'none'}`, onClick: () => upd(() => { const o = [undefined, 'positive', 'undecided', 'negative']; ch.sentiment = o[(o.indexOf(ch.sentiment) + 1) % o.length]; if (!ch.sentiment) delete ch.sentiment; }, { panel: true }) },
        '-',
        { label: 'Move up', disabled: i === 0, onClick: () => upd(() => swap(q.choices, i, i - 1), { panel: true }) },
        { label: 'Move down', disabled: i === q.choices.length - 1, onClick: () => upd(() => swap(q.choices, i, i + 1), { panel: true }) },
        { label: 'Remove', danger: true, disabled: q.choices.length <= 2, onClick: () => upd(() => q.choices.splice(i, 1), { panel: true }) },
      ]);
      return el('div', { class: 'choice-row' }, lab, sc, flags, ch.na ? el('span', { class: 'badge archived', text: 'N/A' }) : null, ch.exclusive ? el('span', { class: 'badge paused', text: 'excl.' }) : null, ch.sentiment ? el('span', { class: 'badge info', text: ch.sentiment }) : null);
    }));
    draw();
    const presets = q.type === 'grid' || q.type === 'likert' ? menu('Presets ▾', [
      { label: 'Poor → Excellent (1–5)', onClick: () => upd(() => { q.choices = QUALITY_CHOICES(); }, { panel: true }) },
      { label: 'Strongly disagree → Strongly agree', onClick: () => upd(() => { q.choices = AGREEMENT_CHOICES(); }, { panel: true }) },
    ]) : null;
    return el('div', { class: 'form-group' }, el('label', { text: q.type === 'grid' ? 'Columns (rating options)' : 'Answer choices' }), list,
      el('div', { class: 'button-group', style: 'gap:6px' },
        el('button', { class: 'sm', onclick: () => upd(() => q.choices.push({ id: uid('c'), label: `Option ${q.choices.length + 1}` }), { panel: true }), text: '+ Add choice' }),
        el('button', { class: 'sm', onclick: () => upd(() => q.choices.push({ id: uid('c'), label: 'Not applicable', na: true }), { panel: true }), text: '+ Add “Not Applicable”' }), presets),
      el('div', { class: 'small muted', style: 'margin-top:4px', text: 'Scores drive averages and “favorable” (top-two box) results. N/A answers are never counted as negative.' }));
  }
  function gridRowsEditor(q, upd) {
    if (q.type !== 'grid') return null;
    return el('div', { class: 'form-group' }, el('label', { text: 'Rows (items being rated)' }),
      ...q.rows.map((r, i) => {
        const lab = el('input', { type: 'text', value: r.label, 'aria-label': `Row ${i + 1}` }); lab.addEventListener('input', () => upd(() => { r.label = lab.value; }));
        const key = el('input', { class: 'score', style: 'width:120px;flex-basis:120px', type: 'text', value: r.comparisonKey || '', placeholder: 'compare key', title: 'Comparison key for trend reports' }); key.addEventListener('input', () => upd(() => { r.comparisonKey = key.value.replace(/[^A-Za-z0-9_.-]/g, ''); }));
        return el('div', { class: 'choice-row' }, lab, key, menu('⋯', [
          { label: 'Move up', disabled: i === 0, onClick: () => upd(() => swap(q.rows, i, i - 1), { panel: true }) },
          { label: 'Move down', disabled: i === q.rows.length - 1, onClick: () => upd(() => swap(q.rows, i, i + 1), { panel: true }) },
          { label: 'Remove', danger: true, disabled: q.rows.length <= 1, onClick: () => upd(() => q.rows.splice(i, 1), { panel: true }) }]));
      }),
      el('button', { class: 'sm', onclick: () => upd(() => q.rows.push({ id: uid('r'), label: `Item ${q.rows.length + 1}`, comparisonKey: '' }), { panel: true }), text: '+ Add row' }));
  }
  function ratingEditor(q, upd) {
    if (q.type !== 'rating') return null;
    const s = q.scale;
    const num = (k) => { const i = el('input', { type: 'number', value: s[k] }); i.addEventListener('input', () => upd(() => { s[k] = parseInt(i.value, 10); })); return i; };
    const txt = (k) => { const i = el('input', { type: 'text', value: s[k] || '' }); i.addEventListener('input', () => upd(() => { s[k] = i.value; })); return i; };
    const na = el('input', { type: 'checkbox', checked: q.naOption.enabled }); na.addEventListener('change', () => upd(() => { q.naOption.enabled = na.checked; }, { panel: true }));
    const naL = el('input', { type: 'text', value: q.naOption.label }); naL.addEventListener('input', () => upd(() => { q.naOption.label = naL.value; }));
    return el('div', {}, el('div', { class: 'form-row' }, el('div', { class: 'form-group' }, el('label', { text: 'Scale from' }), num('min')), el('div', { class: 'form-group' }, el('label', { text: 'to' }), num('max'))),
      el('div', { class: 'form-row' }, el('div', { class: 'form-group' }, el('label', { text: 'Low label' }), txt('minLabel')), el('div', { class: 'form-group' }, el('label', { text: 'High label' }), txt('maxLabel'))),
      el('label', { style: 'display:flex;gap:8px;align-items:center' }, na, 'Include a Not Applicable option'), q.naOption.enabled ? el('div', { class: 'form-group' }, naL) : null);
  }
  function checkboxLimits(q, upd) {
    if (q.type !== 'checkbox') return null;
    const n = (k) => { const i = el('input', { type: 'number', min: '0', value: q[k] ?? '' }); i.addEventListener('input', () => upd(() => { q[k] = i.value === '' ? null : parseInt(i.value, 10); })); return i; };
    return el('div', { class: 'form-row' }, el('div', { class: 'form-group' }, el('label', { text: 'Minimum selections' }), n('minSelect')), el('div', { class: 'form-group' }, el('label', { text: 'Maximum selections' }), n('maxSelect')));
  }
  function otherEditor(q, upd) {
    if (!['single', 'checkbox', 'dropdown'].includes(q.type)) return null;
    const c = el('input', { type: 'checkbox', checked: q.allowOther }); c.addEventListener('change', () => upd(() => { q.allowOther = c.checked; }, { panel: true }));
    const l = el('input', { type: 'text', value: q.otherLabel || 'Other' }); l.addEventListener('input', () => upd(() => { q.otherLabel = l.value; }));
    return el('div', { class: 'form-group' }, el('label', { style: 'display:flex;gap:8px;align-items:center' }, c, 'Include an “Other” choice with a write-in box'), q.allowOther ? l : null);
  }
  function reportingEditor(q, upd) {
    const key = el('input', { type: 'text', value: q.comparisonKey || '', placeholder: 'e.g. overall_satisfaction' });
    key.addEventListener('input', () => upd(() => { q.comparisonKey = key.value.replace(/[^A-Za-z0-9_.-]/g, ''); }));
    const role = el('select', {}, Object.entries(REPORT_ROLES).map(([k, v]) => el('option', { value: k, text: v, selected: k === (q.reportRole || '') })));
    role.addEventListener('change', () => upd(() => { q.reportRole = role.value; }));
    return el('details', { class: 'form-group', open: !!(q.comparisonKey || q.reportRole) }, el('summary', { style: 'font-weight:700;cursor:pointer;margin-bottom:8px', text: 'Reporting & comparison' }),
      el('div', { class: 'form-group' }, el('label', { text: 'Comparison key' }), key, el('div', { class: 'small muted', text: 'Questions with the same key in different surveys are compared in trend reports. Give equivalent questions the same key; never reuse a key for a different question.' })),
      el('div', { class: 'form-group' }, el('label', { text: 'Pulse Report section' }), role));
  }

  function logicEditor(q, upd) {
    const order = orderedQuestions(B.def); const pos = order.indexOf(q);
    const sources = order.slice(0, pos).filter((x) => LOGIC_SOURCE_TYPES.has(x.type) && x.enabled !== false);
    const L = q.logic || { match: 'all', conditions: [] };
    const box = el('details', { class: 'form-group', open: !!(q.logic && q.logic.conditions.length) }, el('summary', { style: 'font-weight:700;cursor:pointer;margin-bottom:8px', text: `Conditional logic${q.logic ? ` (${q.logic.conditions.length})` : ''}` }));
    if (!sources.length) { box.append(el('div', { class: 'small muted', text: 'Conditions can only depend on earlier choice or rating questions. Add one above this question first.' })); return box; }
    const commit = () => { q.logic = L.conditions.length ? L : null; };
    const matchSel = el('select', { style: 'width:auto;display:inline-block' }, el('option', { value: 'all', text: 'ALL', selected: L.match !== 'any' }), el('option', { value: 'any', text: 'ANY', selected: L.match === 'any' }));
    matchSel.addEventListener('change', () => upd(() => { L.match = matchSel.value; commit(); }));
    box.append(el('div', { class: 'small', style: 'margin-bottom:8px' }, 'Show this question only when ', matchSel, ' of these are true (otherwise it is skipped):'));
    L.conditions.forEach((cnd, i) => {
      const src = sources.find((s) => s.id === cnd.questionId);
      const srcSel = el('select', {}, el('option', { value: '', text: 'Choose a question…' }), sources.map((s) => el('option', { value: s.id, text: (s.text || 'Untitled').slice(0, 70), selected: s.id === cnd.questionId })));
      srcSel.addEventListener('change', () => upd(() => { cnd.questionId = srcSel.value; cnd.values = []; commit(); }, { panel: true, canvas: true }));
      const op = el('select', {}, [['anyOf', 'answer is any of'], ['noneOf', 'answer is none of'], ['answered', 'is answered'], ['notAnswered', 'is not answered']].map(([v, t]) => el('option', { value: v, text: t, selected: v === cnd.operator })));
      op.addEventListener('change', () => upd(() => { cnd.operator = op.value; commit(); }, { panel: true }));
      const vals = src && ['anyOf', 'noneOf'].includes(cnd.operator) ? el('div', { style: 'margin-top:6px;display:grid;gap:4px' }, answerChoices(src).map((ch) => {
        const cb = el('input', { type: 'checkbox', checked: cnd.values.includes(ch.id) });
        cb.addEventListener('change', () => upd(() => { cnd.values = cb.checked ? [...cnd.values, ch.id] : cnd.values.filter((v) => v !== ch.id); commit(); }));
        return el('label', { style: 'display:flex;gap:6px;align-items:center;font-weight:400' }, cb, ch.label);
      })) : (cnd.questionId && !src ? el('div', { class: 'alert err small', text: 'This condition references a question that is missing, turned off or now comes after this one.' }) : null);
      box.append(el('div', { style: 'border:1px solid var(--border);border-radius:8px;padding:10px;margin-bottom:8px' }, srcSel, el('div', { style: 'margin-top:6px' }, op), vals,
        el('button', { class: 'sm', style: 'margin-top:6px;color:#dc2626', onclick: () => upd(() => { L.conditions.splice(i, 1); commit(); }, { panel: true, canvas: true }), text: 'Remove condition' })));
    });
    box.append(el('button', { class: 'sm', onclick: () => upd(() => { L.conditions.push({ questionId: '', operator: 'anyOf', values: [] }); commit(); }, { panel: true, canvas: true }), text: '+ Add condition' }));
    return box;
  }

  drawSettings(); drawOutline(); drawCanvas(); drawPanel(); setSave();
}

async function renderPicker(root) {
  const { surveys } = await api('list');
  const list = surveys.filter((s) => s.status !== 'archived');
  root.replaceChildren(el('div', { class: 'card' }, el('h2', {}, 'Survey Builder', el('span', { class: 'spacer' }), el('button', { class: 'primary sm', onclick: () => createDialog(), text: '+ Create New Survey' })),
    list.length ? el('div', { class: 'content' }, el('p', { class: 'muted', style: 'margin-bottom:10px', text: 'Choose a survey to edit:' }),
      ...list.map((s) => el('div', { style: 'display:flex;gap:10px;align-items:center;padding:10px 0;border-bottom:1px solid var(--border)' },
        el('div', { style: 'flex:1' }, el('b', { text: s.settings.title }), el('div', { class: 'small muted', text: `${s.settings.category} · updated ${fmtDate(s.updatedAt)}` })), statusBadge(s),
        el('button', { class: 'sm primary', onclick: () => navigate('builder', s.id), text: 'Open' })))) : el('div', { class: 'empty', text: 'No surveys yet.' })));
}
