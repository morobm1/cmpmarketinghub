/** Responses dashboard, Pulse Report generator, saved snapshots, historical comparison, exports. */
import { state, el, api, toast, modal, confirmDialog, fmtDate, statusBadge, makeChart, destroyCharts, navigate, download, promptDialog } from './core.js';
import { answerChoices, answerToText, computeThemes, orderedQuestions, SMALL_GROUP_MIN, LOGIC_SOURCE_TYPES } from './engine.js';

const PALETTE = ['#446472', '#ffb732', '#52d5ff', '#8fb3c1', '#f59e0b', '#0ea5e9', '#64748b', '#a3c4bc', '#fcd34d', '#334155', '#94a3b8'];
const SCALE5 = ['#dc2626', '#f97316', '#cbd5e1', '#60a5fa', '#16a34a'];
const pctTxt = (v) => (v == null ? '—' : `${Math.round(v)}%`);
const meanTxt = (s) => (s.mean == null ? '—' : `${s.mean.toFixed(2)} / ${s.maxScore}`);

async function surveyPicker(root, tab, current, label) {
  const { surveys } = await api('list');
  const sel = el('select', { 'aria-label': 'Choose survey', style: 'max-width:420px' }, el('option', { value: '', text: 'Choose a survey…' }),
    surveys.map((s) => el('option', { value: s.id, text: `${s.settings.title} (${s.responseCount} responses) · ${s.status}`, selected: s.id === current })));
  sel.addEventListener('change', () => sel.value && navigate(tab, sel.value));
  return { sel, surveys, bar: el('div', { class: 'card no-print' }, el('div', { class: 'content', style: 'display:flex;gap:10px;align-items:center;flex-wrap:wrap' }, el('b', { text: label }), sel)) };
}

/* ================================================================ RESPONSES */
export async function renderResponses(root, surveyId) {
  const { bar } = await surveyPicker(root, 'responses', surveyId, 'Survey:');
  if (!surveyId) { root.replaceChildren(bar, el('div', { class: 'empty', text: 'Choose a survey to view its responses.' }), contactRequestsCard()); return; }
  const filter = { from: '', to: '', version: '', questionId: '', values: [] };
  const out = el('div'); const listCard = el('div');
  const { survey: meta } = await api('get', { surveyId });

  const from = el('input', { type: 'date', 'aria-label': 'From date' }); const to = el('input', { type: 'date', 'aria-label': 'To date' });
  const ver = el('select', { 'aria-label': 'Version' }, el('option', { value: '', text: 'All versions' }), Array.from({ length: meta.currentVersion }, (_, i) => el('option', { value: String(i + 1), text: `Version ${i + 1}` })));
  const segQ = el('select', { 'aria-label': 'Segment by question' }, el('option', { value: '', text: 'No segment filter' }), orderedQuestions(meta.draft).filter((q) => LOGIC_SOURCE_TYPES.has(q.type)).map((q) => el('option', { value: q.id, text: q.text.slice(0, 60) })));
  const segV = el('select', { 'aria-label': 'Segment answer' });
  segQ.addEventListener('change', () => { const q = meta.draft.questions.find((x) => x.id === segQ.value); segV.replaceChildren(...(q ? answerChoices(q).map((c) => el('option', { value: c.id, text: c.label })) : [])); });
  const apply = async () => { Object.assign(filter, { from: from.value, to: to.value, version: ver.value, questionId: segQ.value, values: segQ.value && segV.value ? [segV.value] : [] }); await draw(); };
  const filters = el('div', { class: 'card no-print' }, el('div', { class: 'content', style: 'display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;align-items:end' },
    el('div', {}, el('label', { text: 'From' }), from), el('div', {}, el('label', { text: 'To' }), to), el('div', {}, el('label', { text: 'Version' }), ver),
    el('div', {}, el('label', { text: 'Segment: question' }), segQ), el('div', {}, el('label', { text: 'Segment: answer' }), segV),
    el('div', { class: 'button-group' }, el('button', { class: 'primary', text: 'Apply' }),
      el('a', { href: `/api/pulse-survey?action=export&surveyId=${encodeURIComponent(surveyId)}`, download: '' }, el('button', { type: 'button', text: 'Export CSV' })))));

  async function draw() {
    destroyCharts();
    out.replaceChildren(el('div', { class: 'empty', text: 'Loading results…' }));
    const { analytics: a, survey } = await api('analytics', { surveyId, filter });
    if (a.suppressed) { out.replaceChildren(el('div', { class: 'alert warn', text: `Only ${a.total} response(s) match this segment. Results for groups smaller than ${a.minGroup} are hidden to protect anonymity.` })); return; }
    const k = a.kpis; const st = survey.settings;
    const kpi = (label, v, s) => el('div', { class: 'kpi' }, el('div', { class: 'k', text: label }), el('div', { class: 'v', text: v }), s ? el('div', { class: 's', text: s }) : null);
    const rate = st.eligibleCount ? Math.round((a.total / st.eligibleCount) * 1000) / 10 : null;
    const trend = el('canvas', { role: 'img', 'aria-label': 'Responses by date' });
    out.replaceChildren(
      el('div', { class: 'kpis' },
        kpi('Total Submissions', a.total, 'anonymous submissions (may include repeats)'),
        kpi('Status', survey.status, survey.state === 'open' ? 'accepting responses' : survey.state),
        kpi('Overall Satisfaction', k.overallSatisfaction && k.overallSatisfaction.mean != null ? `${k.overallSatisfaction.mean.toFixed(2)}` : '—', k.overallSatisfaction ? `${pctTxt(k.overallSatisfaction.favorablePct)} favorable · n=${k.overallSatisfaction.n}` : 'no satisfaction question'),
        rate != null ? kpi('Response Rate (est.)', `${rate}%`, `${a.total} submissions ÷ ${st.eligibleCount} eligible; estimate — submissions are not verified unique residents`) : kpi('Response Rate', '—', 'set “Eligible residents” in settings')),
      k.renewal ? el('div', { class: 'kpis' },
        kpi('Positive Renewal Interest', pctTxt(k.renewal.positivePct), `${k.renewal.positive} of ${k.renewal.valid} valid`),
        kpi('Undecided', pctTxt(k.renewal.undecidedPct), `${k.renewal.undecided} of ${k.renewal.valid}`),
        kpi('Negative Renewal Interest', pctTxt(k.renewal.negativePct), `${k.renewal.negative} of ${k.renewal.valid}`),
        kpi('Note', 'Interest ≠ lease', 'survey intent only, not renewal commitments')) : null,
      el('div', { class: 'card' }, el('h2', { text: 'Responses by date' }), el('div', { class: 'content' }, el('div', { class: 'chart-wrap', style: 'height:200px' }, trend))),
      a.total ? el('div', { class: 'charts' }, a.questions.map((x) => questionCard(x))) : el('div', { class: 'empty', text: 'No responses yet. Share the survey link to start collecting.' }));
    const days = Object.keys(a.byDate).sort();
    makeChart(trend, { type: 'line', data: { labels: days, datasets: [{ label: 'Submissions', data: days.map((d) => a.byDate[d]), borderColor: '#446472', backgroundColor: 'rgba(68,100,114,.15)', fill: true, tension: 0.25 }] }, options: { maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } } });
    out.querySelectorAll('canvas[data-q]').forEach((c) => { const x = a.questions.find((q) => q.question.id === c.dataset.q); if (x) makeChart(c, chartConfig(x.question, x.stats)); });
  }

  let page = 1;
  async function drawList() {
    const r = await api('responses', { surveyId, page, pageSize: 20, version: ver.value || undefined, from: from.value || undefined, to: to.value || undefined });
    const vmap = new Map(r.versions.map((v) => [v.version, v.definition]));
    const pages = Math.max(1, Math.ceil(r.total / r.pageSize));
    listCard.replaceChildren(el('div', { class: 'card' }, el('h2', {}, `Individual responses (${r.total})`),
      el('div', { class: 'content' }, el('div', { class: 'alert info small', text: 'Responses are anonymous and identified only by a random response number. Written answers may contain details residents chose to share; do not treat them as verified identities.' }),
        r.items.length ? el('div', { class: 'tbl-wrap' }, el('table', { class: 'tbl' }, el('thead', {}, el('tr', {}, ['#', 'Submitted', 'Version', 'Answers', ''].map((h) => el('th', { text: h })))),
          el('tbody', {}, r.items.map((it) => {
            const def = vmap.get(it.version);
            const qs = def ? orderedQuestions(def).filter((q) => q.type !== 'heading' && it.answers[q.id] !== undefined) : [];
            const det = el('details', {}, el('summary', { style: 'cursor:pointer', text: `${qs.length} answered` }),
              el('div', { style: 'margin-top:8px;display:grid;gap:6px' }, qs.map((q) => el('div', {}, el('div', { class: 'small muted', text: q.text }), el('div', { text: answerToText(q, it.answers[q.id], (it.other || {})[q.id]) })))));
            return el('tr', {}, el('td', { text: it.seq || '—' }), el('td', { text: fmtDate(it.submittedAt, true) }), el('td', { text: `v${it.version}` }), el('td', {}, det),
              el('td', {}, state.user.role === 'admin' ? el('button', { class: 'sm', style: 'color:#dc2626', onclick: async () => { if (!(await confirmDialog('Delete response', 'Permanently delete this response? This cannot be undone.', 'Delete', true))) return; await api('deleteResponse', { responseId: it.id }); toast('Response deleted'); drawList(); draw(); }, text: 'Delete' }) : null));
          })))) : el('div', { class: 'empty', text: 'No responses for these filters.' }),
        el('div', { class: 'button-group', style: 'margin-top:12px;align-items:center' },
          el('button', { class: 'sm', disabled: page <= 1, onclick: () => { page--; drawList(); }, text: '← Newer' }), el('span', { class: 'small muted', text: `Page ${r.page} of ${pages}` }),
          el('button', { class: 'sm', disabled: page >= pages, onclick: () => { page++; drawList(); }, text: 'Older →' })))));
  }
  const origApply = apply;
  filters.querySelector('button.primary').onclick = async () => { page = 1; await origApply(); await drawList(); };

  root.replaceChildren(bar, el('div', { style: 'display:flex;gap:10px;align-items:center;margin-bottom:12px;flex-wrap:wrap' }, el('h2', { style: 'font-size:18px', text: meta.settings.title }), statusBadge(meta),
    el('button', { class: 'sm no-print', onclick: () => navigate('reports', surveyId), text: 'Generate Pulse Report →' })), filters, out, listCard, contactRequestsCard());
  await draw(); await drawList();
}

function contactRequestsCard() {
  const box = el('div', { class: 'card' }, el('h2', {}, 'Renewal information requests', el('span', { class: 'spacer' }),
    el('button', { class: 'sm', onclick: async () => {
      const { requests } = await api('listContactRequests');
      body.replaceChildren(requests.length ? el('table', { class: 'tbl' }, el('thead', {}, el('tr', {}, ['Date', 'Name', 'Email', 'Phone', 'Message', 'Survey'].map((h) => el('th', { text: h })))),
        el('tbody', {}, requests.map((r) => el('tr', {}, [r.createdAt, r.name, r.email, r.phone, r.message, r.surveyTitle].map((v) => el('td', { text: v || '' })))))) : el('div', { class: 'empty', text: 'No requests.' }));
    }, text: 'Load' })));
  const body = el('div', { class: 'content' }, el('p', { class: 'small muted', text: 'Optional follow-up requests residents submit after a survey. Stored separately and never linked to anonymous answers (only the date is kept).' }));
  box.append(body); return box;
}

/* --------------------------------------------------------- chart helpers */
function questionCard(x) {
  const { question: q, stats: s } = x;
  const flags = [x.drift ? el('div', { class: 'cmp-flag', text: '⚠ Scoring/structure changed between versions — combined results may not be directly comparable.' }) : null,
    x.wordingChanged ? el('div', { class: 'cmp-flag', text: '⚠ Wording changed between versions.' }) : null];
  const n = el('div', { class: 'n', text: nText(q, s) });
  if (s.kind === 'text') {
    return el('div', { class: 'chart-card', style: 'grid-column:1/-1' }, el('h4', { text: q.text }), n, ...flags,
      el('div', { class: 'note', text: 'Residents may voluntarily include identifying information in written answers.' }),
      el('div', { style: 'max-height:260px;overflow:auto;margin-top:6px' }, s.items.slice(-200).reverse().map((it) => el('div', { class: 'quote', text: it.text }))));
  }
  if (s.kind === 'date') return el('div', { class: 'chart-card' }, el('h4', { text: q.text }), n, el('div', { class: 'small', text: Object.entries(s.counts).sort().map(([d, c]) => `${d}: ${c}`).join(' · ') || 'No answers' }));
  const h = s.kind === 'grid' ? Math.max(200, 46 * (q.rows || []).length + 60) : Math.max(180, 30 * answerChoices(q).length + 50);
  const otherTexts = s.otherTexts && s.otherTexts.length ? el('details', { class: 'small', style: 'margin-top:6px' }, el('summary', { text: `“Other” write-ins (${s.otherTexts.length})` }), s.otherTexts.slice(0, 50).map((t) => el('div', { class: 'quote', text: t }))) : null;
  return el('div', { class: 'chart-card', style: s.kind === 'grid' ? 'grid-column:1/-1' : null }, el('h4', { text: q.text }), n, ...flags,
    el('div', { class: 'chart-wrap', style: `height:${h}px` }, el('canvas', { 'data-q': q.id, role: 'img', 'aria-label': `Chart: ${q.text}` })), otherTexts);
}
function nText(q, s) {
  if (s.kind === 'choice') return `${s.answered} valid responses${s.mean != null ? ` · average ${meanTxt(s)} · ${pctTxt(s.favorablePct)} favorable (top-two box, n=${s.scoredN}${s.naN ? `, ${s.naN} N/A excluded` : ''})` : ''}`;
  if (s.kind === 'multi') return `${s.answered} respondents · percentages are of respondents to this question (multiple selections allowed)`;
  if (s.kind === 'grid') return `${s.answered} valid responses · N/A excluded from averages`;
  return `${s.answered} responses`;
}
export function chartConfig(q, s) {
  const base = { maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false }, tooltip: { callbacks: {} } }, scales: { x: { beginAtZero: true, ticks: { precision: 0 } } } };
  if (s.kind === 'grid') {
    const cols = answerChoices(q);
    const scored = cols.filter((c) => !c.na);
    return { type: 'bar', data: { labels: q.rows.map((r) => wrap(r.label)), datasets: cols.map((c, i) => ({ label: c.label, data: q.rows.map((r) => { const rs = s.rows[r.id]; return rs.answered ? Math.round((rs.counts[c.id] || 0) / rs.answered * 1000) / 10 : 0; }), backgroundColor: c.na ? '#e2e8f0' : (scored.length === 5 ? SCALE5[scored.indexOf(c)] : PALETTE[i % PALETTE.length]) })) },
      options: { ...base, plugins: { legend: { display: true, position: 'bottom', labels: { boxWidth: 12 } }, tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${ctx.raw}%` } } }, scales: { x: { stacked: true, max: 100, ticks: { callback: (v) => v + '%' } }, y: { stacked: true } } } };
  }
  const choices = s.kind === 'multi' ? s.ranked.map((r) => ({ id: r.id, label: r.label })) : answerChoices(q);
  const denom = s.answered || 1;
  return { type: 'bar', data: { labels: choices.map((c) => wrap(c.label)), datasets: [{ label: 'Responses', data: choices.map((c) => s.counts[c.id] || 0), backgroundColor: choices.map((c, i) => (c.na ? '#cbd5e1' : q.type === 'rating' || q.type === 'likert' || typeof c.score === 'number' ? '#446472' : PALETTE[i % PALETTE.length])), borderRadius: 4 }] },
    options: { ...base, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => `${ctx.raw} (${Math.round(ctx.raw / denom * 100)}%)` } } } } };
}
const wrap = (t, n = 34) => { const w = String(t).split(' '); const lines = []; let cur = ''; w.forEach((x) => { if ((cur + ' ' + x).trim().length > n) { lines.push(cur.trim()); cur = x; } else cur += ' ' + x; }); lines.push(cur.trim()); return lines; };

/* ================================================================ REPORTS */
export async function renderReports(root, param) {
  if (param && param.startsWith('saved:')) return renderSaved(root, param.slice(6));
  const { surveys } = await api('list');
  const mode = el('select', { 'aria-label': 'Report type' }, el('option', { value: 'survey', text: 'Single survey Pulse Report' }), el('option', { value: 'compare', text: 'Compare Pulse Surveys' }));
  const one = el('select', { 'aria-label': 'Survey' }, surveys.map((s) => el('option', { value: s.id, text: `${s.settings.title} (${s.responseCount})`, selected: s.id === param })));
  const many = el('div', { style: 'display:none;max-height:180px;overflow:auto;border:1px solid var(--border);border-radius:8px;padding:8px' }, surveys.map((s) => el('label', { style: 'display:flex;gap:8px;font-weight:400' }, el('input', { type: 'checkbox', value: s.id }), `${s.settings.title} · ${s.settings.term || s.settings.academicYear || ''} (${s.responseCount})`)));
  mode.addEventListener('change', () => { one.style.display = mode.value === 'survey' ? '' : 'none'; many.style.display = mode.value === 'compare' ? '' : 'none'; });
  const out = el('div');
  const savedCard = el('div', { class: 'card no-print' });
  const gen = async () => {
    destroyCharts();
    out.replaceChildren(el('div', { class: 'empty', text: 'Generating report…' }));
    try {
      if (mode.value === 'survey') {
        if (!one.value) return;
        const [{ analytics, survey }, { actions }] = await Promise.all([api('analytics', { surveyId: one.value }), api('listActions', { surveyId: one.value })]);
        renderPulseReport(out, { survey, analytics, actions, generatedAt: new Date().toISOString(), live: true });
      } else {
        const ids = [...many.querySelectorAll('input:checked')].map((i) => i.value);
        if (ids.length < 2) { out.replaceChildren(el('div', { class: 'alert warn', text: 'Select at least two surveys to compare.' })); return; }
        const { comparison } = await api('compare', { surveyIds: ids });
        renderComparison(out, comparison, new Date().toISOString());
      }
    } catch (e) { out.replaceChildren(el('div', { class: 'alert err', text: e.message })); }
  };
  root.replaceChildren(el('div', { class: 'card no-print' }, el('h2', { text: 'Pulse Reports' }), el('div', { class: 'content', style: 'display:grid;gap:10px' },
    el('div', { style: 'display:flex;gap:10px;flex-wrap:wrap' }, mode, one), many,
    el('div', { class: 'button-group' }, el('button', { class: 'primary', onclick: gen, text: 'Generate Pulse Report' })))), out, savedCard);
  drawSaved(savedCard);
  if (param) gen();
}

async function drawSaved(card) {
  const { reports } = await api('listReports');
  card.replaceChildren(el('h2', { text: 'Saved report snapshots' }), reports.length ? el('div', { class: 'content tbl-wrap' }, el('table', { class: 'tbl' }, el('tbody', {}, reports.map((r) => el('tr', {},
    el('td', {}, el('button', { class: 'link', onclick: () => navigate('reports', 'saved:' + r._id), text: r.name })), el('td', { class: 'small muted', text: r.scope.type }), el('td', { class: 'small', text: fmtDate(r.createdAt, true) }), el('td', { class: 'small muted', text: r.createdBy }),
    el('td', {}, el('button', { class: 'sm', onclick: async () => { if (!(await confirmDialog('Delete snapshot', `Delete “${r.name}”?`, 'Delete', true))) return; await api('deleteReport', { id: r._id }); drawSaved(card); }, text: 'Delete' }))))))) : el('div', { class: 'empty', text: 'No saved snapshots yet.' }));
}

async function renderSaved(root, id) {
  const { report } = await api('getReport', { id });
  const out = el('div');
  root.replaceChildren(el('div', { class: 'alert info no-print' }, `Saved snapshot “${report.name}” · captured ${fmtDate(report.createdAt, true)} by ${report.createdBy}. Figures reflect responses at that time. `, el('button', { class: 'sm', onclick: () => navigate('reports'), text: '← All reports' })), out);
  if (report.scope.type === 'comparison') renderComparison(out, report.summary.comparison, report.createdAt, true);
  else renderPulseReport(out, { ...report.summary, live: false });
}

function toolbar(reportEl, { onSave, csvSurveyId, name }) {
  return el('div', { class: 'button-group no-print', style: 'margin:12px 0' },
    el('button', { onclick: () => window.print(), text: 'Print' }),
    el('button', { class: 'primary', onclick: () => exportPdf(reportEl, name), text: 'Download PDF' }),
    csvSurveyId ? el('a', { href: `/api/pulse-survey?action=export&surveyId=${encodeURIComponent(csvSurveyId)}` }, el('button', { type: 'button', text: 'Export CSV data' })) : null,
    onSave ? el('button', { class: 'good', onclick: onSave, text: 'Save report snapshot' }) : null);
}

async function exportPdf(node, name) {
  if (!window.html2canvas || !window.jspdf) { toast('PDF libraries did not load — use Print → Save as PDF instead.', true); return; }
  toast('Building PDF…');
  const hide = node.querySelectorAll('.no-print'); hide.forEach((x) => { x.dataset.d = x.style.display; x.style.display = 'none'; });
  try {
    const canvas = await window.html2canvas(node, { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false, windowWidth: 1100 });
    const pdf = new window.jspdf.jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });
    const pw = pdf.internal.pageSize.getWidth(); const ph = pdf.internal.pageSize.getHeight(); const m = 28;
    const w = pw - m * 2; const pxPerPt = canvas.width / w; const sliceH = Math.floor((ph - m * 2) * pxPerPt);
    for (let y = 0, p = 0; y < canvas.height; y += sliceH, p++) {
      const part = document.createElement('canvas'); part.width = canvas.width; part.height = Math.min(sliceH, canvas.height - y);
      part.getContext('2d').drawImage(canvas, 0, y, canvas.width, part.height, 0, 0, canvas.width, part.height);
      if (p) pdf.addPage();
      pdf.addImage(part.toDataURL('image/jpeg', 0.92), 'JPEG', m, m, w, part.height / pxPerPt);
    }
    pdf.save(`${(name || 'Pulse_Report').replace(/[^A-Za-z0-9]+/g, '_')}.pdf`);
  } catch (e) { console.error(e); toast('PDF export failed — use Print → Save as PDF.', true); }
  finally { hide.forEach((x) => { x.style.display = x.dataset.d || ''; }); }
}

/* ------------------------------------------------------- Pulse Report */
export function renderPulseReport(out, { survey, analytics: a, actions = [], generatedAt, live }) {
  const st = survey.settings; const b = state.brand || {};
  const Q = (role) => a.questions.find((x) => x.question.reportRole === role);
  const QS = (role) => a.questions.filter((x) => x.question.reportRole === role);
  const used = new Set();
  const take = (x) => { if (x) used.add(x.question.id); return x; };
  const rate = st.eligibleCount ? Math.round((a.total / st.eligibleCount) * 1000) / 10 : null;

  // Favorable % across every scored item (choice/rating/grid rows), N/A excluded.
  let fav = 0, scored = 0;
  a.questions.forEach(({ stats: s }) => {
    if (s.kind === 'choice' && s.favorablePct != null) { fav += s.favorable; scored += s.scoredN; }
    if (s.kind === 'grid') Object.values(s.rows).forEach((r) => { if (r.favorablePct != null) { fav += r.favorable; scored += r.scoredN; } });
  });
  const sat = take(Q('overall_satisfaction')); const exp = take(Q('experience_grid')); const comm = take(Q('community_agreement'));
  const pri = take(Q('priorities')); const ren = take(Q('renewal_likelihood')); const evr = take(Q('event_rating'));
  const commRow = comm && Object.values(comm.stats.rows).find((r) => /connect|welcom|community/i.test(r.label));
  const kpi = (k, v, s) => el('div', { class: 'kpi' }, el('div', { class: 'k', text: k }), el('div', { class: 'v', text: v }), s ? el('div', { class: 's', text: s }) : null);

  const report = el('article', { class: 'report', id: 'pulse-report' });
  const pend = []; // charts to create after insertion
  const chartCard = (x, title) => { take(x); const c = el('canvas', { role: 'img', 'aria-label': title || x.question.text }); pend.push([c, x]); const h = x.stats.kind === 'grid' ? Math.max(200, 46 * x.question.rows.length + 60) : Math.max(180, 28 * answerChoices(x.question).length + 50);
    return el('div', { class: 'chart-card' }, el('h4', { text: title || x.question.text }), el('div', { class: 'n', text: nText(x.question, x.stats) }), x.drift ? el('div', { class: 'cmp-flag', text: '⚠ Scoring changed between versions.' }) : null, el('div', { class: 'chart-wrap', style: `height:${h}px` }, c)); };
  const barList = (items) => {
    const valid = items.filter((i) => i.favorablePct != null);
    const hi = valid.length ? Math.max(...valid.map((i) => i.favorablePct)) : null; const lo = valid.length ? Math.min(...valid.map((i) => i.favorablePct)) : null;
    return el('div', { class: 'bar-list' }, items.map((i) => el('div', { class: 'row' }, el('div', { text: i.label }),
      el('div', { class: 'track', title: `${pctTxt(i.favorablePct)} favorable` }, el('div', { class: 'fill' + (valid.length > 1 && i.favorablePct === hi ? ' hi' : valid.length > 1 && i.favorablePct === lo ? ' lo' : ''), style: `width:${i.favorablePct || 0}%` })),
      el('div', { class: 'small', text: `${pctTxt(i.favorablePct)} · ${i.mean != null ? i.mean.toFixed(2) : '—'} · n=${i.n}` }))));
  };
  const gridItems = (x) => x ? Object.values(x.stats.rows).map((r) => ({ label: r.label, favorablePct: r.favorablePct, mean: r.mean, n: r.scoredN })) : [];
  const section = (n, title, ...kids) => el('section', {}, el('h3', { text: `Section ${n}: ${title}` }), ...kids);

  report.append(el('header', { class: 'rh' }, b.logoDataUrl ? el('img', { src: b.logoDataUrl, alt: b.name }) : null,
    el('div', {}, el('div', { class: 't1', text: 'IVORY UNIVERSITY HOUSE' }), el('div', { class: 't2', text: 'RESIDENT EXPERIENCE PULSE REPORT' }))),
  el('div', { class: 'meta-grid' },
    ...[['Survey', st.title], ['Academic year', st.academicYear || '—'], ['Reporting period', st.term || '—'], ['Report generated', fmtDate(generatedAt, true)],
      ['Total submissions', String(a.total)], ['Response rate', rate != null ? `${rate}% (estimate)` : 'not configured'], ['Survey status', survey.status]].map(([k, v]) => el('div', {}, el('b', { text: k }), v))),
  el('p', { class: 'note', style: 'margin-top:8px', text: 'Anonymous survey: counts are submissions and may include more than one submission per resident. Favorable = top-two box (e.g. 4–5 on a 5-point scale); “Not Applicable” answers are excluded from all percentages and averages.' }));

  if (!a.total) { report.append(el('div', { class: 'empty', text: 'No responses have been collected for this survey yet.' })); out.replaceChildren(report); return; }

  // 1 Executive summary
  const topPri = pri ? pri.stats.ranked.filter((r) => r.count).slice(0, 3) : [];
  report.append(section(1, 'Executive Summary', el('div', { class: 'exec' },
    sat ? kpi('Overall satisfaction', meanTxt(sat.stats), `${pctTxt(sat.stats.favorablePct)} favorable · n=${sat.stats.scoredN}`) : null,
    kpi('Favorable responses', pctTxt(scored ? fav / scored * 100 : null), `${fav} of ${scored} scored ratings`),
    commRow ? kpi('Community connection', pctTxt(commRow.favorablePct), `agree/strongly agree · n=${commRow.scoredN}`) : null,
    evr ? kpi('Event satisfaction', meanTxt(evr.stats), `${pctTxt(evr.stats.favorablePct)} favorable · n=${evr.stats.scoredN}`) : null,
    ren && ren.stats.sentiment ? kpi('Positive renewal interest', pctTxt(ren.stats.sentiment.positivePct), `n=${ren.stats.sentiment.valid} valid`) : null),
  topPri.length ? el('p', { style: 'margin-top:12px' }, el('b', { text: 'Top resident priorities: ' }), topPri.map((r) => `${r.label} (${pctTxt(r.pct)})`).join(' · ')) : null));

  // 2 Resident experience
  if (exp || comm || sat) {
    const items = gridItems(exp); const valid = items.filter((i) => i.favorablePct != null).sort((x, y) => y.favorablePct - x.favorablePct);
    report.append(section(2, 'Resident Experience',
      items.length ? el('div', {}, el('p', { class: 'small muted', text: 'Percent favorable (Good/Excellent) · average score · valid responses' }), barList(items)) : null,
      valid.length > 1 ? el('div', { class: 'hl', style: 'margin-top:12px' }, el('div', { class: 'alert info' }, el('b', { text: 'Highest rated: ' }), `${valid[0].label} (${pctTxt(valid[0].favorablePct)} favorable, n=${valid[0].n})`),
        el('div', { class: 'alert warn' }, el('b', { text: 'Lowest rated: ' }), `${valid[valid.length - 1].label} (${pctTxt(valid[valid.length - 1].favorablePct)} favorable, n=${valid[valid.length - 1].n})`)) : null,
      el('div', { class: 'charts', style: 'margin-top:12px' }, exp ? chartCard(exp) : null, comm ? chartCard(comm) : null, sat ? chartCard(sat) : null, pri ? chartCard(pri) : null)));
  }

  // 3 Events
  const evRoles = ['event_attendance', 'event_rating', 'refreshments', 'event_communication', 'event_variety', 'series_rating', 'event_interests', 'event_barriers', 'comm_channels'];
  const evs = evRoles.map(Q).filter(Boolean);
  if (evs.length) {
    const ratings = ['event_rating', 'refreshments', 'event_communication', 'event_variety', 'series_rating'].map(Q).filter(Boolean).map((x) => ({ label: REPORT_LABEL[x.question.reportRole], favorablePct: x.stats.favorablePct, mean: x.stats.mean, n: x.stats.scoredN }));
    report.append(section(3, 'Resident Events', ratings.length ? barList(ratings) : null, el('div', { class: 'charts', style: 'margin-top:12px' }, evs.map((x) => chartCard(x)))));
  }

  // 4 Renewal
  if (ren && ren.stats.sentiment) {
    const s = ren.stats.sentiment;
    const others = ['renewal_arrangement', 'renewal_timing', 'renewal_factors', 'renewal_leave_reason'].map(Q).filter(Boolean);
    report.append(section(4, 'Renewal Interest',
      el('div', { class: 'exec' }, kpi('Positive renewal interest', pctTxt(s.positivePct), `Definitely + Likely · ${s.positive} of ${s.valid}`), kpi('Undecided', pctTxt(s.undecidedPct), `${s.undecided} of ${s.valid}`), kpi('Negative renewal interest', pctTxt(s.negativePct), `Unlikely + Not returning · ${s.negative} of ${s.valid}`)),
      el('p', { class: 'note', style: 'margin-top:8px', text: 'These are preliminary survey responses for planning purposes only — they are not leases, applications, or executed renewal commitments.' }),
      el('div', { class: 'charts', style: 'margin-top:12px' }, chartCard(ren), others.map((x) => chartCard(x)))));
  }

  // 5 Feedback themes (real comments only)
  const texts = [];
  a.questions.forEach(({ question: q, stats: st2 }) => { if (st2.kind === 'text') { take({ question: q }); st2.items.forEach((i) => texts.push(i.text)); } if (st2.otherTexts) st2.otherTexts.forEach((t) => texts.push(t)); });
  const themes = computeThemes(texts);
  report.append(section(5, 'Resident Feedback',
    texts.length ? el('div', {}, el('p', { class: 'small muted', text: `${texts.length} written comments grouped by keyword theme (a comment can match several themes). Quotes are verbatim; residents may have included identifying details.` }),
      themes.map((t) => el('div', { style: 'margin:10px 0' }, el('b', { text: `${t.label} — ${t.count} comment${t.count === 1 ? '' : 's'}` }), t.quotes.map((qq) => el('div', { class: 'quote', text: qq }))))) : el('p', { class: 'muted', text: 'No written feedback was submitted.' })));

  // 6 Action plan
  const actWrap = el('div');
  report.append(section(6, 'Recommended Action Plan', el('p', { class: 'small muted', text: 'Suggested actions are generated from the lowest-rated items and top priorities; they are proposals for management review, not approved commitments.' }), actWrap));
  const drawActions = (list) => {
    const STAT = ['Proposed', 'Approved', 'In Progress', 'Completed', 'Deferred'];
    actWrap.replaceChildren(el('div', { class: 'tbl-wrap' }, el('table', { class: 'tbl' }, el('thead', {}, el('tr', {}, ['Priority', 'Resident Feedback', 'Recommended Action', 'Assigned Owner', 'Target Date', 'Status', ''].map((h) => el('th', { text: h })))),
      el('tbody', {}, list.length ? list.map((it) => {
        if (!live) return el('tr', {}, [it.priority, it.feedback, it.action, it.owner, it.targetDate, it.status].map((v) => el('td', { text: v || '' })), el('td'));
        const inp = (k, type = 'text') => { const i = type === 'select-p' ? el('select', {}, ['High', 'Medium', 'Low'].map((p) => el('option', { value: p, text: p, selected: it.priority === p }))) : type === 'select-s' ? el('select', {}, STAT.map((p) => el('option', { value: p, text: p, selected: it.status === p }))) : type === 'area' ? el('textarea', { value: it[k] || '', style: 'min-height:50px' }) : el('input', { type, value: it[k] || '' });
          i.addEventListener('change', async () => { it[k] = i.value; try { await api('saveAction', { item: { ...it, id: it._id } }); toast('Action saved'); } catch (e) { toast(e.message, true); } }); return i; };
        return el('tr', {}, el('td', {}, inp('priority', 'select-p')), el('td', {}, inp('feedback', 'area'), it.suggested ? el('span', { class: 'badge info', text: 'suggested' }) : null), el('td', {}, inp('action', 'area')), el('td', {}, inp('owner')), el('td', {}, inp('targetDate', 'date')), el('td', {}, inp('status', 'select-s')),
          el('td', { class: 'no-print' }, el('button', { class: 'sm', onclick: async () => { await api('deleteAction', { id: it._id }); drawActions(list.filter((x) => x !== it)); }, text: '✕' })));
      }) : [el('tr', {}, el('td', { colspan: '7', class: 'muted', text: 'No actions yet.' }))]))),
    live ? el('div', { class: 'button-group no-print', style: 'margin-top:10px' },
      el('button', { class: 'sm', onclick: async () => { const r = await api('saveAction', { surveyId: survey.id, item: { priority: 'Medium', status: 'Proposed' } }); const { actions: fresh } = await api('listActions', { surveyId: survey.id }); drawActions(fresh); return r; }, text: '+ Add action' }),
      el('button', { class: 'sm', onclick: async () => { const sug = suggestions(); if (!sug.length) { toast('No low-scoring items to suggest from'); return; } for (const s of sug) await api('saveAction', { surveyId: survey.id, item: s }); const { actions: fresh } = await api('listActions', { surveyId: survey.id }); drawActions(fresh); toast(`${sug.length} suggested action(s) added as Proposed`); }, text: 'Add suggested actions' })) : null);
  };
  const suggestions = () => {
    const out2 = [];
    gridItems(exp).filter((i) => i.favorablePct != null && i.favorablePct < 60 && i.n >= 3).sort((x, y) => x.favorablePct - y.favorablePct).slice(0, 3)
      .forEach((i) => out2.push({ priority: i.favorablePct < 40 ? 'High' : 'Medium', feedback: `${i.label}: ${pctTxt(i.favorablePct)} favorable (n=${i.n})`, action: `Review ${i.label.toLowerCase()} and define an improvement step with residents.`, status: 'Proposed', suggested: true }));
    topPri.slice(0, 2).forEach((r) => out2.push({ priority: 'Medium', feedback: `Top improvement priority: ${r.label} (${pctTxt(r.pct)} of respondents)`, action: `Investigate concerns about ${r.label.toLowerCase()} and communicate planned changes.`, status: 'Proposed', suggested: true }));
    return out2;
  };
  drawActions(actions);

  // Additional questions without a report role
  const rest = a.questions.filter((x) => !used.has(x.question.id) && x.stats.kind !== 'text' && x.stats.kind !== 'none');
  if (rest.length) report.append(el('section', {}, el('h3', { text: 'Additional Questions' }), el('div', { class: 'charts' }, rest.map((x) => chartCard(x)))));

  const onSave = live ? async () => { const n = await promptDialog('Save report snapshot', 'Snapshot name', `${st.title} – ${fmtDate(new Date())}`); if (!n) return; await api('saveReport', { name: n, type: 'survey', surveyIds: [survey.id], summary: { survey, analytics: a, actions, generatedAt } }); toast('Snapshot saved'); } : null;
  out.replaceChildren(toolbar(report, { onSave, csvSurveyId: survey.id, name: `${st.title} Pulse Report` }), report);
  pend.forEach(([c, x]) => makeChart(c, chartConfig(x.question, x.stats)));
}
const REPORT_LABEL = { event_rating: 'Overall event satisfaction', refreshments: 'Refreshments', event_communication: 'Event communication', event_variety: 'Event variety', series_rating: 'Finding Your Way series' };

/* ---------------------------------------------------------- comparison */
export function renderComparison(out, cmp, generatedAt, isSnapshot = false) {
  const S = cmp.surveys;
  const report = el('article', { class: 'report' });
  report.append(el('header', { class: 'rh' }, state.brand && state.brand.logoDataUrl ? el('img', { src: state.brand.logoDataUrl, alt: state.brand.name }) : null,
    el('div', {}, el('div', { class: 't1', text: 'IVORY UNIVERSITY HOUSE' }), el('div', { class: 't2', text: 'PULSE SURVEY COMPARISON' }), el('div', { class: 'small muted', text: `Generated ${fmtDate(generatedAt, true)}` }))),
  el('p', { class: 'note', text: 'Only questions sharing the same comparison key are compared — never by position. ⚠ marks indicate wording or scoring changes; designate equivalent questions by giving them the same comparison key in the Survey Builder. No historical data is assumed or imputed.' }));
  const scoredRows = cmp.rows.filter((r) => Object.values(r.cells).some((c) => c.favorablePct != null));
  const satRow = cmp.rows.find((r) => r.key === 'overall_satisfaction');
  const lc = el('canvas', { role: 'img', 'aria-label': 'Favorable trend across surveys' });
  report.append(el('h3', { text: 'Favorable trend (top-two box %)' }), el('div', { class: 'chart-card' }, el('div', { class: 'chart-wrap', style: 'height:300px' }, lc)));
  const tbl = el('table', { class: 'tbl' }, el('thead', {}, el('tr', {}, el('th', { text: 'Metric' }), S.map((s) => el('th', { text: `${s.title} (n=${s.total})` })), el('th', { text: 'Change' }))),
    el('tbody', {}, cmp.rows.map((r) => {
      const cells = S.map((s) => r.cells[s.id]);
      const first = cells.find((c) => c && c.favorablePct != null); const last = [...cells].reverse().find((c) => c && c.favorablePct != null);
      const delta = first && last && first !== last && !r.scaleMismatch ? Math.round(last.favorablePct - first.favorablePct) : null;
      return el('tr', {}, el('td', {}, el('div', { text: r.label }), el('div', { class: 'small muted', text: r.key }),
        r.scaleMismatch ? el('div', { class: 'cmp-flag', text: '⚠ scale/answers differ — not directly comparable' }) : null, r.wordingChanged ? el('div', { class: 'cmp-flag', text: '⚠ wording differs' }) : null),
      cells.map((c) => el('td', { text: !c ? '—' : c.sentiment ? `${pctTxt(c.sentiment.positivePct)} positive · ${pctTxt(c.sentiment.negativePct)} negative (n=${c.sentiment.valid})` : c.ranked ? c.ranked.slice(0, 3).map((x) => `${x.label} ${pctTxt(x.pct)}`).join('; ') : `${pctTxt(c.favorablePct)} fav · ${c.mean != null ? c.mean.toFixed(2) : '—'} (n=${c.n})` })),
      el('td', { style: delta == null ? '' : `font-weight:700;color:${delta >= 0 ? '#16a34a' : '#dc2626'}`, text: delta == null ? '—' : `${delta >= 0 ? '+' : ''}${delta} pts` }));
    })));
  report.append(el('h3', { text: 'Metric comparison' }), cmp.rows.length ? el('div', { class: 'tbl-wrap' }, tbl) : el('div', { class: 'alert warn', text: 'These surveys share no comparison keys.' }));
  const onSave = isSnapshot ? null : async () => { const n = await promptDialog('Save comparison snapshot', 'Snapshot name', `Pulse comparison – ${fmtDate(new Date())}`); if (!n) return; await api('saveReport', { name: n, type: 'comparison', surveyIds: S.map((s) => s.id), summary: { comparison: cmp } }); toast('Snapshot saved'); };
  out.replaceChildren(toolbar(report, { onSave, name: 'Pulse_Comparison' }), report);
  const lines = [satRow, ...scoredRows.filter((r) => r !== satRow && !r.scaleMismatch)].filter(Boolean).slice(0, 8);
  makeChart(lc, { type: 'line', data: { labels: S.map((s) => wrap(s.title, 24)), datasets: lines.map((r, i) => ({ label: r.label.slice(0, 40), data: S.map((s) => (r.cells[s.id] ? r.cells[s.id].favorablePct : null)), borderColor: PALETTE[i % PALETTE.length], backgroundColor: PALETTE[i % PALETTE.length], spanGaps: false, tension: 0.2 })) },
    options: { maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 12 } } }, scales: { y: { min: 0, max: 100, ticks: { callback: (v) => v + '%' } } } } });
}
