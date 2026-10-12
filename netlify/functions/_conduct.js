/**
 * ResLife Hub — Conduct Meeting Notes: shared rules + official document generation.
 *
 * The official form is `templates/harbour-occ-accountability-meeting-record.v1.docx`
 * (the unmodified "Harbour OCC Resident Accountability Meeting Record.docx"). It is a
 * controlled resource: TEMPLATE_VERSION and TEMPLATE_SHA256 identify the exact file, and
 * buildDocx() refuses to run if the file's wording no longer matches the mapping below.
 *
 * DOCX: the template's own word/document.xml is filled in place (blank underscore lines,
 * "[ ]" checkbox positions, the empty response box). Header, footer, logo, styles, fonts,
 * page numbering and section order are copied byte-for-byte from the template.
 *
 * PDF: when CONDUCT_PDF_CONVERTER_URL points at a Gotenberg/LibreOffice service, the filled
 * DOCX itself is converted (pixel-faithful). Otherwise a built-in renderer draws the same
 * form with the template's own header/footer artwork and Play font, using the template's
 * measurements, colours and wording. Neither path summarises or truncates any text.
 */
import JSZip from 'jszip';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const TEMPLATE_VERSION = 'harbour-occ-ram-v1';
export const TEMPLATE_FILE = 'harbour-occ-accountability-meeting-record.v1.docx';
export const TEMPLATE_SHA256 = '5ebf75f3ce9f3988356c825837001cd506c7d2f5a8af22c0fe42899cb9a0d281';

// ---- Official wording (must match the template exactly) ----
export const ROUTING = [
  'Harbour / CMP housing matter',
  'Potential BP/AP 5500 - OCC referral',
  'Other District policy / Campus Safety',
  'Leadership review required',
];
export const EDUCATION = [
  'Policy or agreement section reviewed',
  'Factual incident summary reviewed',
  'Community impact / reason for rule explained',
  'Expected behavior going forward reviewed',
  'Resident questions addressed',
  'Resources / support provided',
  'Repeat / escalation path reviewed at a high level',
  'Follow-up date confirmed',
];
export const OUTCOMES = [
  'Education completed - no additional action at this time',
  'Follow-up required',
  'Repeat / pattern review',
  'OCC / HRE / Student Conduct referral',
  'Campus Public Safety / safety follow-up',
  'Leadership review',
  'Resident no-show - outreach required',
];
export const CLOSEOUT = [
  'Entrata updated',
  'Resident follow-up sent',
  'Knowledge Reminder provided',
  'Referral documentation complete',
  'Record status checked',
];
export const DOC_NOTE_TITLE = 'Documentation note';
export const DOC_NOTE = 'Resident disagreement should be documented accurately. Do not erase or rewrite a prior factual record solely because the resident disputes the notice; use the approved correction / follow-up process if information needs to be amended.';

export const FIELD_LABELS = {
  residentName: 'Resident', bedspace: 'Unit / Bedspace', incidentViolation: 'Incident / Violation',
  noticeDate: 'Notice Date', meetingDateTime: 'Meeting Date / Time', staffPresent: 'Staff Present',
  routing: 'Routing', education: 'Education / Violation Knowledge Reminder',
  residentResponse: 'Resident response / additional information', outcomes: 'Outcome / next step',
  followUpDate: 'Follow-up date', assignedActionNotes: 'Notes / assigned action', closeout: 'Closeout',
};

/** Wizard field -> official document location. Shown in the UI and used by the tests. */
export const TEMPLATE_MAPPING = [
  { field: 'residentName', location: 'Resident (row 1 value cell, replaces the blank line)' },
  { field: 'bedspace', location: 'Unit / Bedspace (row 2 value cell)' },
  { field: 'incidentViolation', location: 'Incident / Violation (row 3 value cell)' },
  { field: 'noticeDate', location: 'Notice Date (row 4 value cell)' },
  { field: 'meetingDateTime', location: 'Meeting Date / Time (row 5 value cell)' },
  { field: 'staffPresent', location: 'Staff Present (row 6 value cell)' },
  { field: 'routing', location: 'Routing table — "[X] " placed before each selected bullet' },
  { field: 'education', location: 'Education / Violation Knowledge Reminder — "[ ]" becomes "[X]"' },
  { field: 'residentResponse', location: 'Resident response / additional information box (grows; never truncated)' },
  { field: 'outcomes', location: 'Outcome / next step — "[ ]" becomes "[X]"' },
  { field: 'followUpDate', location: 'Follow-up date: line' },
  { field: 'assignedActionNotes', location: 'Notes / assigned action: line (multi-line kept)' },
  { field: 'closeout', location: 'Closeout — "[ ]" becomes "[X]"' },
];

export const LIMITS = { short: 300, staffName: 120, staffCount: 25, longText: 200000 };

// ---- Access rules (server-side authority) ----
export const CONDUCT_ROLES = ['admin', 'reslife-admin', 'reslife-rec'];
export function isConductRole(role) { return CONDUCT_ROLES.includes(role); }
export function isConductAdmin(user) { return user.role === 'admin' || user.role === 'reslife-admin'; }
export function canUseConduct(user, property) {
  if (!property || !isConductRole(user.role)) return false;
  if (user.role === 'admin') return true;
  return Array.isArray(user.properties) && user.properties.includes(property);
}
/** Drafts: creator + admin tier. Submitted/amended: any REC/Admin for the property. */
export function canViewMeeting(user, m) {
  if (!m || !canUseConduct(user, m.property)) return false;
  if (m.status === 'submitted' || m.status === 'amended' || m.status === 'amending') return true;
  return m.createdBy === user.sub || isConductAdmin(user);
}

// ---- Data hygiene ----
const CTRL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g;
const clean = v => String(v == null ? '' : v).replace(/\r\n?/g, '\n').replace(CTRL, '');
const pick = (arr, list) => list.filter(l => Array.isArray(arr) && arr.includes(l)); // canonical order, exact wording only
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DT_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

export function emptyData() {
  return {
    residentId: '', residentName: '', bedspace: '', bedspaceSource: '', bedspaceNeedsReview: false,
    incidentViolation: '', noticeDate: '', meetingDateTime: '', staffPresent: [],
    routing: [], education: [], residentResponse: '', outcomes: [], followUpDate: '', assignedActionNotes: '', closeout: [],
  };
}

/**
 * Normalises client input. Never shortens text: anything over a limit is an error,
 * so the caller can refuse the save instead of silently dropping words.
 */
export function sanitizeData(input) {
  const src = input && typeof input === 'object' ? input : {};
  const d = emptyData();
  const errors = [];
  const short = (k, max = LIMITS.short) => {
    const v = clean(src[k]).replace(/\n+/g, ' ').trim();
    if (v.length > max) errors.push(`${FIELD_LABELS[k] || k} is longer than ${max} characters`);
    d[k] = v;
  };
  const long = k => {
    const v = clean(src[k]);
    if (v.length > LIMITS.longText) errors.push(`${FIELD_LABELS[k] || k} is longer than ${LIMITS.longText} characters`);
    d[k] = v.replace(/\s+$/, ''); // trailing whitespace only; content and line breaks are untouched
  };
  d.residentId = /^[a-f0-9]{24}$/i.test(String(src.residentId || '')) ? String(src.residentId) : '';
  short('residentName'); short('bedspace', 80); short('incidentViolation', 1000);
  d.bedspaceSource = ['directory', 'manual', 'history'].includes(src.bedspaceSource) ? src.bedspaceSource : '';
  d.bedspaceNeedsReview = !!src.bedspaceNeedsReview;
  d.noticeDate = DATE_RE.test(src.noticeDate || '') ? src.noticeDate : '';
  d.meetingDateTime = DT_RE.test(src.meetingDateTime || '') ? src.meetingDateTime : '';
  d.followUpDate = DATE_RE.test(src.followUpDate || '') ? src.followUpDate : '';
  const staff = Array.isArray(src.staffPresent) ? src.staffPresent : [];
  if (staff.length > LIMITS.staffCount) errors.push(`Staff Present allows up to ${LIMITS.staffCount} people`);
  const seen = new Set();
  d.staffPresent = staff.map(s => ({
    name: clean(s && s.name).replace(/\s+/g, ' ').trim().slice(0, LIMITS.staffName),
    username: clean(s && s.username).trim().slice(0, 80),
  })).filter(s => s.name && !seen.has(s.name.toLowerCase()) && seen.add(s.name.toLowerCase()));
  d.routing = pick(src.routing, ROUTING);
  d.education = pick(src.education, EDUCATION);
  d.outcomes = pick(src.outcomes, OUTCOMES);
  d.closeout = pick(src.closeout, CLOSEOUT);
  long('residentResponse'); long('assignedActionNotes');
  return { data: d, errors };
}

/** Minimum fields for a submitted record. A no-show and unchecked education items are allowed. */
export function validateForSubmit(d) {
  const missing = [];
  if (!d.residentId) missing.push('Resident (select a resident from the Resident Directory)');
  if (!d.incidentViolation) missing.push('Incident / Violation');
  if (!d.meetingDateTime) missing.push('Meeting Date / Time');
  if (!d.staffPresent || !d.staffPresent.length) missing.push('Staff Present');
  return missing;
}

/** Field-level differences, used for the amendment history. */
export function diffData(before, after) {
  const out = [];
  for (const k of Object.keys(FIELD_LABELS)) {
    const a = JSON.stringify(before[k] ?? ''), b = JSON.stringify(after[k] ?? '');
    if (a !== b) out.push({ field: k, label: FIELD_LABELS[k], before: before[k] ?? '', after: after[k] ?? '' });
  }
  return out;
}

// ---- Display formatting shared by DOCX/PDF/UI ----
export function fmtDateUS(s) {
  if (!DATE_RE.test(s || '')) return '';
  const [y, m, d] = s.split('-'); return `${m}/${d}/${y}`;
}
export function fmtDateTimeUS(s) {
  if (!DT_RE.test(s || '')) return '';
  const [date, time] = s.split('T'); let [h, mi] = time.split(':').map(Number);
  const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12;
  return `${fmtDateUS(date)} ${h}:${String(mi).padStart(2, '0')} ${ap}`;
}
export function staffText(d) { return (d.staffPresent || []).map(s => s.name).join('; '); }
export function docFields(d) {
  return {
    resident: d.residentName, bedspace: d.bedspace, incident: d.incidentViolation,
    notice: fmtDateUS(d.noticeDate), meeting: fmtDateTimeUS(d.meetingDateTime), staff: staffText(d),
    followUp: fmtDateUS(d.followUpDate), notes: d.assignedActionNotes || '', response: d.residentResponse || '',
  };
}

// ---- Template loading ----
let templateCache = null;
function templateCandidates() {
  const here = (() => { try { return path.dirname(fileURLToPath(import.meta.url)); } catch (e) { return ''; } })();
  return [
    process.env.CONDUCT_TEMPLATE_PATH,
    here && path.join(here, 'templates', TEMPLATE_FILE),
    path.join(process.cwd(), 'netlify', 'functions', 'templates', TEMPLATE_FILE),
    typeof __dirname !== 'undefined' ? path.join(__dirname, 'templates', TEMPLATE_FILE) : '',
    path.join('/var/task', 'netlify', 'functions', 'templates', TEMPLATE_FILE),
  ].filter(Boolean);
}
export async function loadTemplate() {
  if (templateCache && !process.env.CONDUCT_TEMPLATE_PATH) return templateCache;
  const file = templateCandidates().find(p => existsSync(p));
  if (!file) throw new Error('Official meeting record template is missing (' + TEMPLATE_FILE + ')');
  const buf = await readFile(file);
  const sha = createHash('sha256').update(buf).digest('hex');
  if (sha !== TEMPLATE_SHA256) throw new Error('Official meeting record template does not match the controlled version ' + TEMPLATE_VERSION);
  if (!process.env.CONDUCT_TEMPLATE_PATH) templateCache = buf;
  return buf;
}

// ---- DOCX ----
const xmlEsc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const T = s => `<w:t xml:space="preserve">${xmlEsc(s)}</w:t>`;
const multiline = s => String(s).split('\n').map(T).join('<w:br/>');
const BODY_RPR = '<w:rPr><w:rFonts w:ascii="Aptos" w:cs="Aptos" w:eastAsia="Aptos" w:hAnsi="Aptos"/><w:color w:val="27313b"/><w:sz w:val="17"/><w:szCs w:val="17"/></w:rPr>';
const P_SPACING = '<w:pPr><w:spacing w:after="0" w:before="0" w:line="240" w:lineRule="auto"/></w:pPr>';

function replaceOnce(xml, find, repl, what) {
  const i = xml.indexOf(find);
  if (i < 0 || xml.indexOf(find, i + find.length) >= 0) throw new Error('Template mismatch at "' + what + '"');
  return xml.slice(0, i) + repl + xml.slice(i + find.length);
}

/** Fills the official document.xml in place. Exported for tests. */
export function fillDocumentXml(xml, d) {
  const f = docFields(d);
  // 1) Blank lines, in template order.
  const blanks = [f.resident, f.bedspace, f.incident, f.notice, f.meeting, f.staff, f.followUp, f.notes];
  const re = /<w:t xml:space="preserve">_{5,}<\/w:t>/g;
  const found = xml.match(re) || [];
  if (found.length !== blanks.length) throw new Error('Template mismatch: expected ' + blanks.length + ' blank lines, found ' + found.length);
  let n = 0;
  xml = xml.replace(re, m => { const v = blanks[n++]; return v ? multiline(v) : m; });
  // 2) Checkbox positions.
  const box = (list, sel) => { for (const l of list) xml = replaceOnce(xml, T('[ ] ' + l), T((sel.includes(l) ? '[X] ' : '[ ] ') + l), l); };
  box(EDUCATION, d.education || []); box(OUTCOMES, d.outcomes || []); box(CLOSEOUT, d.closeout || []);
  // 3) Routing bullets have no printed box; a selection is marked "[X] " before the unchanged wording.
  for (const l of ROUTING) xml = replaceOnce(xml, T(l), T((d.routing || []).includes(l) ? '[X] ' + l : l), l);
  // 4) Resident response box — every line kept, one paragraph per line.
  const h = xml.indexOf(T('Resident response / additional information'));
  if (h < 0) throw new Error('Template mismatch at "Resident response"');
  if (f.response) {
    const tc = xml.indexOf('<w:tc>', h), pStart = xml.indexOf('<w:p ', tc), tcEnd = xml.indexOf('</w:tc>', pStart);
    if (tc < 0 || pStart < 0 || tcEnd < 0) throw new Error('Template mismatch at response box');
    const paras = f.response.split('\n').map(line => `<w:p>${P_SPACING}<w:r>${BODY_RPR}${line ? T(line) : ''}</w:r></w:p>`).join('');
    xml = xml.slice(0, pStart) + paras + xml.slice(tcEnd);
  }
  // Guard: official wording must still be present.
  for (const s of ['RESIDENT ACCOUNTABILITY MEETING RECORD', 'INTERNAL USE ONLY - Not for resident distribution', DOC_NOTE_TITLE, DOC_NOTE]) {
    if (xml.indexOf(xmlEsc(s)) < 0) throw new Error('Template wording missing: ' + s);
  }
  return xml;
}

export async function buildDocx(d, meta = {}) {
  const zip = await JSZip.loadAsync(await loadTemplate());
  const docXml = await zip.file('word/document.xml').async('string');
  zip.file('word/document.xml', fillDocumentXml(docXml, d));
  // Core properties only (not visible on the page): identify the record the file belongs to.
  const core = zip.file('docProps/core.xml');
  if (core && meta.meetingId) {
    let c = await core.async('string');
    const subj = `Resident Accountability Meeting Record ${meta.meetingId} v${meta.version || 1} (${TEMPLATE_VERSION})`;
    c = /<dc:subject>/.test(c) ? c.replace(/<dc:subject>[\s\S]*?<\/dc:subject>/, `<dc:subject>${xmlEsc(subj)}</dc:subject>`)
      : c.replace('</cp:coreProperties>', `<dc:subject>${xmlEsc(subj)}</dc:subject></cp:coreProperties>`);
    zip.file('docProps/core.xml', c);
  }
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

// ---- PDF ----
async function templateAssets() {
  const zip = await JSZip.loadAsync(await loadTemplate());
  const b64 = p => zip.file(p).async('base64');
  return {
    header: await b64('word/media/image1.png'),
    footer: await b64('word/media/image2.png'),
    playBold: await b64('word/fonts/Play-bold.ttf'),
    playRegular: await b64('word/fonts/Play-regular.ttf'),
  };
}

/** Optional pixel-faithful path: convert the filled DOCX with a Gotenberg (LibreOffice) service. */
async function convertWithService(docx) {
  const url = process.env.CONDUCT_PDF_CONVERTER_URL;
  if (!url) return null;
  const form = new FormData();
  form.append('files', new Blob([docx], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }), 'record.docx');
  const r = await fetch(url.replace(/\/$/, '') + '/forms/libreoffice/convert', { method: 'POST', body: form });
  if (!r.ok) throw new Error('PDF converter returned ' + r.status);
  return Buffer.from(await r.arrayBuffer());
}

export async function buildPdf(d, meta = {}, docxBuffer = null) {
  if (process.env.CONDUCT_PDF_CONVERTER_URL) {
    try {
      const out = await convertWithService(docxBuffer || await buildDocx(d, meta));
      if (out && out.length) return { buffer: out, engine: 'docx-converter' };
    } catch (e) { /* fall back to the built-in renderer below */ }
  }
  return { buffer: await renderPdf(d, meta), engine: 'builtin-' + TEMPLATE_VERSION };
}

const C = { navy: '#063c7a', text: '#27313b', sub: '#66727e', rule: '#4f81bd', bannerFill: '#eaf3fa', bannerLine: '#d6e7f4', labelFill: '#f4f6f8', rowLine: '#dde3e8', boxLine: '#cdd6de', boxFill: '#fbfcfd' };
const NON_LATIN1 = /[^\u0000-\u00FF\u2018\u2019\u201C\u201D\u2013\u2014\u2026\u2022\u20AC]/;

export async function renderPdf(d, meta = {}) {
  const { jsPDF } = await import('jspdf');
  const a = await templateAssets();
  const doc = new jsPDF({ unit: 'pt', format: 'letter', compress: true });
  doc.addFileToVFS('Play-bold.ttf', a.playBold); doc.addFont('Play-bold.ttf', 'Play', 'bold');
  doc.addFileToVFS('Play-regular.ttf', a.playRegular); doc.addFont('Play-regular.ttf', 'Play', 'normal');
  doc.setProperties({ title: 'Resident Accountability Meeting Record', subject: `${meta.meetingId || 'preview'} v${meta.version || 1} (${TEMPLATE_VERSION})`, creator: 'ResLife Hub' });

  const f = docFields(d);
  const PW = 612, PH = 792, ML = 36, CW = 540, TOP = 74.9, BOTTOM = 738;
  const TBL_X = ML - 5.75; // tblInd -115 twips
  const PAD = 5.75, BODY = 8, LH = 10.4; // Helvetica runs ~6% wider than Aptos
  let y = TOP, page = 1;
  const designedBreaks = new Set([1]); // pages created by the form's own layout (no "continued" line)

  const font = (txt, bold) => { if (NON_LATIN1.test(txt || '')) doc.setFont('Play', bold ? 'bold' : 'normal'); else doc.setFont('helvetica', bold ? 'bold' : 'normal'); };
  const wrap = (txt, w, bold) => { font(txt, bold); doc.setFontSize(BODY); return doc.splitTextToSize(String(txt), w); };
  const newPage = designed => {
    doc.addPage(); page++; y = TOP;
    if (designed) designedBreaks.add(page);
    else {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(C.sub);
      doc.text(`Resident Accountability Meeting Record (continued) — ${f.resident || '—'}${meta.meetingId ? ' — Record ' + meta.meetingId : ''}`, ML, y + 8);
      y += 16;
    }
  };
  const ensure = h => { if (y + h > BOTTOM) newPage(false); };
  const blank = (n, size = 12) => { y += n * size; if (y > BOTTOM) newPage(false); };
  const heading = txt => { ensure(30); y += 4; doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.setTextColor(C.navy); doc.text(txt, ML, y + 10); y += 15; };

  // Title (preceded by the template's line break) with Title-style bottom rule.
  y += 22;
  doc.setFont('Play', 'bold'); doc.setFontSize(18); doc.setTextColor(C.navy);
  doc.text('RESIDENT ACCOUNTABILITY MEETING RECORD', ML, y + 14);
  y += 20; doc.setDrawColor(C.rule); doc.setLineWidth(1); doc.line(ML, y, ML + CW, y); y += 6;

  // INTERNAL USE ONLY banner.
  doc.setFillColor(C.bannerFill); doc.setDrawColor(C.bannerLine); doc.setLineWidth(0.75);
  doc.rect(TBL_X, y, CW, 14, 'FD');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(BODY); doc.setTextColor(C.navy);
  doc.text('INTERNAL USE ONLY - Not for resident distribution', TBL_X + PAD, y + 9.6); y += 14 + 10;

  // Resident information table.
  const rows = [['Resident', f.resident, 44], ['Unit / Bedspace', f.bedspace, 26], ['Incident / Violation', f.incident, 44], ['Notice Date', f.notice, 18], ['Meeting Date / Time', f.meeting, 44], ['Staff Present', f.staff, 44]];
  const colW = CW / 2, tx = ML;
  for (const [label, value, underscores] of rows) {
    const shown = value || '_'.repeat(underscores);
    const lines = wrap(shown, colW - 2 * PAD);
    const h = Math.max(1, lines.length) * LH + 4;
    ensure(h);
    doc.setFillColor(C.labelFill); doc.rect(tx, y, colW, h, 'F');
    doc.setDrawColor(C.rowLine); doc.setLineWidth(0.5); doc.line(tx, y + h, tx + CW, y + h);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(BODY); doc.setTextColor(C.navy); doc.text(label, tx + PAD, y + 9.5);
    font(shown, false); doc.setTextColor(C.text); doc.text(lines, tx + colW + PAD, y + 9.5, { lineHeightFactor: LH / BODY });
    y += h;
  }

  // Bulleted / checkbox grids.
  const grid = (items, cols, isSelected, bullet) => {
    const w = CW / cols;
    for (let i = 0; i < items.length; i += cols) {
      const cells = items.slice(i, i + cols).map(it => wrap(it, w - PAD - 36));
      const h = Math.max(...cells.map(c => c.length)) * LH + 3.5;
      ensure(h);
      cells.forEach((lines, j) => {
        const x = ML + j * w + PAD;
        doc.setFont('helvetica', 'normal'); doc.setFontSize(BODY); doc.setTextColor(C.text);
        if (bullet) doc.text('•', x + 18, y + 9);
        font(lines.join(' '), false); // same weight as the DOCX: only the box mark changes
        doc.text(lines, x + 36, y + 9, { lineHeightFactor: LH / BODY });
      });
      y += h;
    }
  };
  const boxed = (list, sel) => list.map(l => (sel.includes(l) ? '[X] ' : '[ ] ') + l);
  const isX = s => s.startsWith('[X] ');

  blank(1); heading('Routing');
  grid(ROUTING.map(l => ((d.routing || []).includes(l) ? '[X] ' : '') + l), 2, isX, true);

  blank(1); heading('Education / Violation Knowledge Reminder');
  grid(boxed(EDUCATION, d.education || []), 2, isX, true);

  blank(2); heading('Resident response / additional information');
  {
    const lines = f.response ? f.response.split('\n').flatMap(l => (l ? wrap(l, CW - 2 * PAD) : [''])) : [''];
    let i = 0; let first = true;
    while (i < lines.length || first) {
      const room = Math.floor((BOTTOM - y - 6) / LH);
      if (room < 2) { newPage(false); continue; }
      const chunk = lines.slice(i, i + room);
      const h = Math.max(first ? 67.5 : 0, chunk.length * LH + 6);
      doc.setFillColor(C.boxFill); doc.setDrawColor(C.boxLine); doc.setLineWidth(0.6);
      doc.rect(TBL_X, y, CW, h, 'FD');
      doc.setTextColor(C.text); doc.setFontSize(BODY);
      chunk.forEach((ln, k) => { font(ln, false); doc.text(ln, TBL_X + PAD, y + 9.5 + k * LH); });
      y += h; i += chunk.length; first = false;
      if (i < lines.length) newPage(false);
    }
  }

  blank(1); heading('Outcome / next step');
  grid(boxed(OUTCOMES, d.outcomes || []), 2, isX, true);

  // Follow-up date / Notes lines.
  blank(2, 10.5);
  const lineField = (label, value) => {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(C.navy);
    const lw = doc.getTextWidth(label);
    doc.setFontSize(BODY);
    const lines = []; // first line sits beside the label, the rest run full width; blank lines are kept
    if (!value) lines.push({ x: ML + lw, t: '_'.repeat(70) });
    else value.split('\n').forEach((para, idx) => {
      if (idx === 0) {
        const first = wrap(para, CW - lw - 2);
        lines.push({ x: ML + lw, t: first[0] || '' });
        const restText = first.slice(1).join(' ');
        if (restText) wrap(restText, CW).forEach(t => lines.push({ x: ML, t }));
      } else if (!para) lines.push({ x: ML, t: '' });
      else wrap(para, CW).forEach(t => lines.push({ x: ML, t }));
    });
    lines.forEach((ln, k) => {
      ensure(LH + 2);
      if (k === 0) { doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(C.navy); doc.text(label, ML, y + 9); }
      font(ln.t, false); doc.setFontSize(BODY); doc.setTextColor(C.text); doc.text(ln.t, ln.x, y + 9);
      y += LH + (k === 0 ? 2 : 0);
    });
  };
  lineField('Follow-up date: ', f.followUp);
  lineField('Notes / assigned action: ', f.notes);

  // Closeout starts page 2 in the official layout (the template pushes it with blank lines).
  if (page === 1) { newPage(true); y += 84; } else blank(2); // template's seven blank lines
  heading('Closeout');
  grid(boxed(CLOSEOUT, d.closeout || []), 3, isX, true);

  // Documentation note.
  blank(3, 10.5);
  {
    const nx = ML + (CW - 360) / 2, barW = 41.25, textW = 360 - barW - 2 * PAD;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
    const noteLines = doc.splitTextToSize(DOC_NOTE, textW);
    const h = 8 + 11 + noteLines.length * 9.8 + 6;
    ensure(h);
    doc.setFillColor(C.navy); doc.rect(nx, y, barW, h, 'F');
    doc.setFillColor(C.bannerFill); doc.rect(nx + barW, y, 360 - barW, h, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(C.navy); doc.text(DOC_NOTE_TITLE, nx + barW + PAD, y + 12);
    doc.setFont('helvetica', 'normal'); doc.setTextColor(C.text); doc.text(noteLines, nx + barW + PAD, y + 24, { lineHeightFactor: 9.8 / 8 });
    y += h;
  }

  // Header/footer artwork + "INTERNAL USE ONLY | page" on every page (template header1/footer1).
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.addImage(a.header, 'PNG', 0, 0, PW, 76.54, 'hdr', 'FAST');
    doc.addImage(a.footer, 'PNG', 0, PH - 8.65 - 34.94, PW, 34.94, 'ftr', 'FAST');
    doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(C.navy);
    const label = 'INTERNAL USE ONLY   |   ';
    doc.setFont('helvetica', 'normal'); const nW = doc.getTextWidth(String(p));
    doc.setFont('helvetica', 'bold'); const lW = doc.getTextWidth(label);
    const fy = PH - 8.65 - 34.94 - 3;
    doc.text(label, PW - ML - nW - lW, fy);
    doc.setFont('helvetica', 'normal'); doc.setTextColor(C.sub); doc.text(String(p), PW - ML - nW, fy);
  }
  return Buffer.from(doc.output('arraybuffer'));
}
