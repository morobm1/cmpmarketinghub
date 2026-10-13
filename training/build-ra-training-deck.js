// Builds "ResLife Hub RA Training.pptx" — Harbour at OCC brand (navy #002D6A, orange #F99239, Montserrat).
const pptxgen = require('pptxgenjs');
const path = require('path');
const IMG = f => path.join(__dirname, 'img', f);
const NAVY = '002D6A', NAVY_D = '001B40', ORANGE = 'F99239', COAST = '1F5FA8', LIGHT = 'DCEBF7', SAND = 'FBF3E8', TEXT = '14213D', SUB = '64748B', BG = 'F3F5F8', BORDER = 'E2E8F0';
const F = 'Montserrat';

const p = new pptxgen();
p.layout = 'LAYOUT_WIDE'; // 13.33 x 7.5
p.author = 'The Harbour at OCC — Resident Life';
p.title = 'ResLife Hub & Creative Studio — RA Training';
p.theme = { headFontFace: F, bodyFontFace: F };

let n = 0;
const W = 13.333, H = 7.5;

// ---------- masters ----------
p.defineSlideMaster({
  title: 'CONTENT', background: { color: 'FFFFFF' },
  objects: [
    { rect: { x: 0, y: 0, w: W, h: 0.42, fill: { color: NAVY } } },
    { rect: { x: 0, y: 0.42, w: W, h: 0.06, fill: { color: ORANGE } } },
    { image: { path: IMG('logo-white.png'), x: 11.55, y: 0.07, w: 1.42, h: 0.28 } },
    { text: { text: 'RESLIFE HUB · RA TRAINING', options: { x: 0.45, y: 0.06, w: 6, h: 0.3, fontFace: F, fontSize: 10, bold: true, color: 'FFFFFF', charSpacing: 3 } } },
    { image: { path: IMG('footerwave.png'), x: 0, y: 6.72, w: W, h: 0.78, transparency: 30 } },
  ],
  slideNumber: { x: 12.45, y: 7.02, w: 0.6, h: 0.3, fontFace: F, fontSize: 10, color: NAVY, bold: true },
});

function notes(s, t) { s.addNotes(t); }
function title(s, t, kicker) {
  if (kicker) s.addText(kicker.toUpperCase(), { x: 0.6, y: 0.68, w: 9, h: 0.3, fontFace: F, fontSize: 11, bold: true, color: ORANGE, charSpacing: 2 });
  s.addText(t, { x: 0.6, y: kicker ? 0.95 : 0.75, w: 11.5, h: 0.65, fontFace: F, fontSize: 28, bold: true, color: NAVY });
  s.addShape(p.ShapeType.rect, { x: 0.62, y: kicker ? 1.62 : 1.42, w: 0.9, h: 0.07, fill: { color: ORANGE }, line: { color: ORANGE } });
}
// numbered steps column
function steps(s, items, o = {}) {
  const x = o.x ?? 0.6, y0 = o.y ?? 1.95, w = o.w ?? 6.3, gap = o.gap ?? 0.62, fs = o.fs ?? 13;
  items.forEach((t, i) => {
    const y = y0 + i * gap;
    s.addShape(p.ShapeType.ellipse, { x, y: y + 0.02, w: 0.38, h: 0.38, fill: { color: i % 2 ? NAVY : ORANGE }, line: { color: 'FFFFFF' } });
    s.addText(String(i + 1), { x, y: y + 0.02, w: 0.38, h: 0.38, align: 'center', valign: 'middle', fontFace: F, fontSize: 12, bold: true, color: 'FFFFFF' });
    s.addText(rich(t), { x: x + 0.5, y: y - 0.04, w: w - 0.5, h: gap, fontFace: F, fontSize: fs, color: TEXT, valign: 'top', paraSpaceAfter: 0 });
  });
}
// **bold** markup -> runs
function rich(t) {
  const out = []; t.split(/(\*\*[^*]+\*\*)/).forEach(seg => { if (!seg) return; if (seg.startsWith('**')) out.push({ text: seg.slice(2, -2), options: { bold: true, color: NAVY } }); else out.push({ text: seg }); });
  return out;
}
function bullets(s, items, o = {}) {
  const runs = [];
  items.forEach((t, i) => { rich(t).forEach((r, j) => runs.push(Object.assign({}, r, { options: Object.assign({}, r.options, j === 0 ? { bullet: { code: '25CF' }, indentLevel: 0 } : {}, i < items.length - 1 && j === rich(t).length - 1 ? { breakLine: true } : {}) }))); });
  s.addText(runs, { x: o.x ?? 0.6, y: o.y ?? 1.95, w: o.w ?? 6.3, h: o.h ?? 4.5, fontFace: F, fontSize: o.fs ?? 13, color: TEXT, valign: 'top', paraSpaceAfter: 7, lineSpacingMultiple: 1.05 });
}
// card with header
function card(s, x, y, w, h, head, body, color = NAVY, o = {}) {
  s.addShape(p.ShapeType.roundRect, { x, y, w, h, rectRadius: 0.08, fill: { color: o.fill || 'FFFFFF' }, line: { color: BORDER, width: 1 }, shadow: { type: 'outer', color: '000000', opacity: 0.08, blur: 6, offset: 2, angle: 90 } });
  s.addShape(p.ShapeType.rect, { x, y, w: 0.08, h, fill: { color }, line: { color } });
  s.addText(head, { x: x + 0.22, y: y + 0.1, w: w - 0.35, h: 0.38, fontFace: F, fontSize: o.hs || 13, bold: true, color });
  if (Array.isArray(body)) bullets(s, body, { x: x + 0.15, y: y + 0.5, w: w - 0.3, h: h - 0.6, fs: o.fs || 11 });
  else s.addText(rich(body), { x: x + 0.22, y: y + 0.5, w: w - 0.4, h: h - 0.6, fontFace: F, fontSize: o.fs || 11, color: TEXT, valign: 'top' });
}
function tip(s, text, o = {}) {
  const x = o.x ?? 7.3, y = o.y ?? 5.55, w = o.w ?? 5.45, h = o.h ?? 0.95;
  s.addShape(p.ShapeType.roundRect, { x, y, w, h, rectRadius: 0.08, fill: { color: 'FFF7ED' }, line: { color: 'FED7AA' } });
  s.addShape(p.ShapeType.rect, { x, y, w: 0.08, h, fill: { color: ORANGE }, line: { color: ORANGE } });
  s.addText([{ text: (o.label || 'TIP') + '  ', options: { bold: true, color: 'C2410C' } }, ...rich(text)], { x: x + 0.2, y, w: w - 0.3, h, fontFace: F, fontSize: o.fs || 11, color: TEXT, valign: 'middle' });
}
function warn(s, text, o = {}) { tip(s, text, Object.assign({ label: 'IMPORTANT' }, o)); }
// stylised hub screen mock: sidebar + header + panel with given rows
function mock(s, x, y, w, h, o) {
  s.addShape(p.ShapeType.roundRect, { x, y, w, h, rectRadius: 0.06, fill: { color: BG }, line: { color: 'CBD5E1' }, shadow: { type: 'outer', color: '000000', opacity: 0.15, blur: 10, offset: 3, angle: 90 } });
  const sb = w * 0.24;
  s.addShape(p.ShapeType.rect, { x, y, w: sb, h, fill: { color: NAVY }, line: { color: NAVY } });
  s.addImage({ path: IMG('logo-white.png'), x: x + 0.12, y: y + 0.12, w: Math.min(sb - 0.24, 1.1), h: Math.min(sb - 0.24, 1.1) * 0.39 });
  let navList = o.nav || []; const maxN = Math.floor((h - 0.75) / 0.27); if (navList.length > maxN) { const ai = Math.max(0, navList.indexOf(o.active)); const st = Math.min(Math.max(0, ai - maxN + 2), navList.length - maxN); navList = navList.slice(st, st + maxN); }
  navList.forEach((t, i) => {
    const yy = y + 0.65 + i * 0.27; const act = t === o.active;
    if (act) s.addShape(p.ShapeType.rect, { x, y: yy - 0.02, w: sb, h: 0.26, fill: { color: ORANGE }, line: { color: ORANGE } });
    s.addText(t, { x: x + 0.12, y: yy - 0.02, w: sb - 0.15, h: 0.26, fontFace: F, fontSize: 7.5, color: 'FFFFFF', bold: act, valign: 'middle' });
  });
  s.addShape(p.ShapeType.rect, { x: x + sb, y, w: w - sb, h: 0.38, fill: { color: 'FFFFFF' }, line: { color: BORDER } });
  s.addText(o.head || 'The Harbour at OCC', { x: x + sb + 0.15, y, w: 3, h: 0.38, fontFace: F, fontSize: 9, bold: true, color: NAVY, valign: 'middle' });
  s.addText('🔔   RA   Log Out', { x: x + w - 1.9, y, w: 1.8, h: 0.38, fontFace: F, fontSize: 8, color: SUB, align: 'right', valign: 'middle' });
  const px = x + sb + 0.18, pw = w - sb - 0.36; let py = y + 0.55;
  s.addShape(p.ShapeType.rect, { x: px, y: py, w: pw, h: h - 0.75, fill: { color: 'FFFFFF' }, line: { color: BORDER } });
  s.addText((o.panel || '').toUpperCase(), { x: px + 0.12, y: py + 0.05, w: pw - 1.6, h: 0.35, fontFace: F, fontSize: 9, bold: true, color: NAVY, valign: 'middle' });
  if (o.button) { s.addShape(p.ShapeType.roundRect, { x: px + pw - 1.55, y: py + 0.08, w: 1.45, h: 0.28, rectRadius: 0.05, fill: { color: ORANGE }, line: { color: ORANGE } }); s.addText(o.button, { x: px + pw - 1.55, y: py + 0.08, w: 1.45, h: 0.28, fontFace: F, fontSize: 7, bold: true, color: 'FFFFFF', align: 'center', valign: 'middle' }); }
  py += 0.48;
  (o.rows || []).forEach((r, i) => {
    const rh = 0.34;
    s.addShape(p.ShapeType.rect, { x: px + 0.1, y: py + i * (rh + 0.06), w: pw - 0.2, h: rh, fill: { color: i % 2 ? 'FFFFFF' : 'F8FAFC' }, line: { color: BORDER } });
    s.addText(r, { x: px + 0.2, y: py + i * (rh + 0.06), w: pw - 0.4, h: rh, fontFace: F, fontSize: 8, color: TEXT, valign: 'middle' });
  });
}
const NAV = ['Dashboard', 'Announcements', 'Program Proposals', 'Committees', 'Schedule & On-Call', 'Duty Log', 'Guest Log', 'Incident Reports', 'Maintenance & Keys', 'Resident Directory', 'Campus Contacts', 'Curriculum Tracker', 'SOP Library', 'Resources', 'Training Modules'];

function content(t, kicker) { const s = p.addSlide({ masterName: 'CONTENT' }); n++; title(s, t, kicker); return s; }
function section(num, t, sub, photo) {
  const s = p.addSlide(); n++;
  s.background = { color: NAVY };
  if (photo) s.addImage({ path: IMG(photo), x: 7.6, y: 0, w: 5.73, h: H, sizing: { type: 'cover', w: 5.73, h: H } });
  if (photo) s.addShape(p.ShapeType.rect, { x: 7.6, y: 0, w: 5.73, h: H, fill: { color: NAVY, transparency: 55 }, line: { color: NAVY, transparency: 100 } });
  s.addShape(p.ShapeType.rect, { x: 7.52, y: 0, w: 0.08, h: H, fill: { color: ORANGE }, line: { color: ORANGE } });
  s.addImage({ path: IMG('logo-white.png'), x: 0.7, y: 0.6, w: 2.0, h: 0.79 });
  s.addText(num, { x: 0.7, y: 2.2, w: 3, h: 1.2, fontFace: F, fontSize: 72, bold: true, color: ORANGE });
  s.addText(t, { x: 0.7, y: 3.45, w: 6.6, h: 1.1, fontFace: F, fontSize: 36, bold: true, color: 'FFFFFF' });
  s.addText(sub, { x: 0.7, y: 4.6, w: 6.4, h: 1.2, fontFace: F, fontSize: 15, color: 'DCEBF7', valign: 'top' });
  return s;
}

// =====================================================================
// 1. TITLE
// =====================================================================
{
  const s = p.addSlide(); n++;
  s.addImage({ path: IMG('rooftop-terrace-0235.jpg'), x: 0, y: 0, w: W, h: H, sizing: { type: 'cover', w: W, h: H } });
  s.addShape(p.ShapeType.rect, { x: 0, y: 0, w: W, h: H, fill: { color: NAVY_D, transparency: 30 }, line: { color: NAVY_D, transparency: 100 } });
  s.addShape(p.ShapeType.rect, { x: 0, y: 0, w: 7.6, h: H, fill: { color: NAVY, transparency: 12 }, line: { color: NAVY, transparency: 100 } });
  s.addImage({ path: IMG('logo-white.png'), x: 0.8, y: 0.8, w: 2.8, h: 1.1 });
  s.addText('RESIDENT ASSISTANT TRAINING', { x: 0.8, y: 2.55, w: 6.5, h: 0.4, fontFace: F, fontSize: 14, bold: true, color: ORANGE, charSpacing: 4 });
  s.addText('ResLife Hub & Creative Studio', { x: 0.8, y: 2.95, w: 6.6, h: 1.5, fontFace: F, fontSize: 34, fit: 'none', bold: true, color: 'FFFFFF' });
  s.addShape(p.ShapeType.rect, { x: 0.82, y: 4.5, w: 1.2, h: 0.08, fill: { color: ORANGE }, line: { color: ORANGE } });
  s.addText('Every tab you can use as an RA — and exactly how to use it.', { x: 0.8, y: 4.75, w: 6.2, h: 0.8, fontFace: F, fontSize: 16, color: 'DCEBF7' });
  s.addText('The Harbour at Orange Coast College · Resident Life', { x: 0.8, y: 6.55, w: 6.5, h: 0.4, fontFace: F, fontSize: 11, color: 'FFFFFF' });
  notes(s, 'Welcome to The Harbour at Orange Coast College Resident Assistant training for the ResLife Hub and the Creative Studio. In this video we will walk through every tab you have access to as an RA, what each one is for, and step by step how to use it. Keep the Hub open in another window so you can follow along.');
}

// 2. AGENDA
{
  const s = content('What you will learn', 'Agenda');
  const groups = [
    ['Getting Started', ['Logging in', 'The header & notifications', 'Your sidebar map', 'Dashboard'], ORANGE],
    ['Team & Programs', ['Announcements', 'Program Proposals', 'Committees', 'Schedule & On-Call'], NAVY],
    ['On Duty', ['Duty Log (desktop & phone)', 'Guest Log', 'Incident Reports', 'Maintenance & Keys'], COAST],
    ['Reference & Creative', ['Resident Directory', 'Contacts, Curriculum, SOPs, Resources', 'Training Modules', 'Creative Studio'], ORANGE],
  ];
  groups.forEach(([h, items, c], i) => card(s, 0.6 + i * 3.08, 2.0, 2.88, 3.6, h, items, c, { fs: 12, hs: 15 }));
  tip(s, 'Pause the video at any step and try it in the Hub. Nothing you click in this training changes another RA\'s work.', { x: 0.6, y: 5.85, w: 12.1, h: 0.6 });
  notes(s, 'Here is the plan. We start with the basics: logging in, the header, your sidebar, and the Dashboard. Then team and program tools: Announcements, Program Proposals, Committees, and the Schedule. Then your on-duty tools: the Duty Log, Guest Log, Incident Reports, and Maintenance and Keys. We finish with reference tabs and the Creative Studio.');
}

// =====================================================================
section('01', 'Getting Started', 'Logging in, finding your way around, and staying on top of notifications.', 'occ-campus-students-walking.jpg').addNotes('Section one: getting started.');

// 3. LOGIN
{
  const s = content('Logging in & landing', 'Getting Started');
  steps(s, [
    'Go to the **Hub login page** and enter your **Username** and **Password**. Tick **Show password** if you need to check it.',
    'Click **Sign In**. RA accounts go straight to the **ResLife Hub**.',
    'You land on the **Dashboard**. Bookmarked links (like the Duty Log shortcut) open that tab directly.',
    'If you see “Your account is not tied to a property yet” — contact your **Reslife Admin**.',
    'You are signed out after **12 hours of inactivity**. Use **Log Out** on shared computers.',
  ], { gap: 0.8 });
  mock(s, 7.3, 1.95, 5.45, 3.35, { nav: NAV.slice(0, 9), active: 'Dashboard', panel: 'Dashboard', rows: ['Open Incidents · Open Maintenance · My Upcoming Shifts', 'Pinned & Recent Announcements', 'On Call Now · My next duty', 'Incident Report Assistant · + New Report'] });
  warn(s, 'Never share your login. Everything you submit is recorded under your name.');
  notes(s, 'To log in, go to the Hub login page and enter the username and password your Reslife Admin gave you. Click Sign In and you will land on the ResLife Hub Dashboard. If you ever see a message that your account is not tied to a property, reach out to your Reslife Admin. For security, the Hub signs you out after twelve hours of inactivity, and you should always click Log Out on a shared computer. Never share your login, because everything you submit is recorded under your name.');
}

// 4. HEADER
{
  const s = content('The header: notifications, feedback & your account', 'Getting Started');
  card(s, 0.6, 1.95, 3.9, 2.05, '🔔  Notifications bell', ['Badge shows unread items (checks every 20 sec)', 'Click an item to jump to its tab', '**Mark all read** · **Sound on/off**', 'Urgent announcements pop up — click **Got it**'], ORANGE);
  card(s, 4.7, 1.95, 3.9, 2.05, '💬  Feedback button', ['Navy pill, bottom-right of every page', 'Choose **Error / Bug**, **Feature request** or **Question**', 'Add a summary + optional screenshot (paste with Ctrl/⌘+V)', 'Click **Send**'], NAVY);
  card(s, 8.8, 1.95, 3.95, 2.05, '👤  Your account', ['Role badge reads **Reslife - RA**', 'Property switcher appears only if you have more than one property', '**Log Out** button', 'Sidebar **Collapse / Expand** at the bottom'], COAST);
  s.addShape(p.ShapeType.roundRect, { x: 0.6, y: 4.3, w: 12.15, h: 0.62, rectRadius: 0.05, fill: { color: 'FFFFFF' }, line: { color: BORDER } });
  s.addText([{ text: '☰  The Harbour at OCC  ', options: { bold: true, color: NAVY } }, { text: 'RESLIFE HUB', options: { bold: true, color: ORANGE } }, { text: '                                                           🔔 3     Reslife - RA     username     Log Out', options: { color: SUB } }], { x: 0.8, y: 4.3, w: 11.8, h: 0.62, fontFace: F, fontSize: 12, valign: 'middle' });
  tip(s, 'Turn on browser notifications so you hear about urgent announcements, swaps and creative approvals right away.', { x: 0.6, y: 5.2, w: 12.15, h: 0.65 });
  notes(s, 'Across the top of every page is the header. The bell shows your unread notifications: announcements, program updates, shift changes and creative approvals. Click any item to jump right to it, or click Mark all read. Urgent announcements pop up on screen; read them and click Got it. At the bottom right of every page is the Feedback button. Use it to report a bug, request a feature, or ask a question, and you can paste in a screenshot. Your role badge shows Reslife RA, and if you work at more than one property you will see a property switcher. Log Out is on the right.');
}

// 5. SIDEBAR MAP
{
  const s = content('Your sidebar: the tabs RAs can use', 'Getting Started');
  const tabs = [
    ['Dashboard', 'Your property at a glance'], ['Announcements', 'Team news (read-only)'], ['Program Proposals', 'Plan & submit programs'], ['Committees', 'Rosters & meeting minutes'],
    ['Schedule & On-Call', 'Shifts, swaps, availability'], ['Duty Log', 'Calls & incidents per shift'], ['Guest Log', 'Check guests in & out'], ['Incident Reports', 'Quick incident log'],
    ['Maintenance & Keys', 'Work orders & lockouts'], ['Resident Directory', 'Residents & history'], ['Campus Contacts', 'Who to call on campus'], ['Curriculum Tracker', 'Your required items'],
    ['SOP Library', 'Written procedures'], ['Resources', 'Links & property info'], ['Training Modules', 'Lessons & quizzes'], ['Creative Studio ↗', 'Flyers, posts, emails'],
  ];
  tabs.forEach(([t, d], i) => {
    const c = i % 4, r = Math.floor(i / 4), x = 0.6 + c * 3.06, y = 1.95 + r * 1.0;
    s.addShape(p.ShapeType.roundRect, { x, y, w: 2.9, h: 0.85, rectRadius: 0.06, fill: { color: i === 15 ? 'FFF7ED' : 'F8FAFC' }, line: { color: i === 15 ? ORANGE : BORDER } });
    s.addText([{ text: t, options: { bold: true, color: NAVY, fontSize: 13, breakLine: true } }, { text: d, options: { color: SUB, fontSize: 10.5 } }], { x: x + 0.15, y, w: 2.7, h: 0.85, fontFace: F, valign: 'middle' });
  });
  s.addText('Also in the sidebar (open in a new page): Incident Report Assistant · Curriculum Management · Collateral Hub', { x: 0.6, y: 6.05, w: 12, h: 0.4, fontFace: F, fontSize: 11, italic: true, color: SUB });
  notes(s, 'This is your sidebar map. As an RA you can use the Dashboard, Announcements, Program Proposals, Committees, Schedule and On-Call, Duty Log, Guest Log, Incident Reports, Maintenance and Keys, Resident Directory, Campus Contacts, the Curriculum Tracker, the SOP Library, Resources, Training Modules, and the Creative Studio. A few sidebar links, like the Incident Report Assistant, Curriculum Management and the Collateral Hub, open their own pages. Some tabs you may hear about, such as Safety Records or Manage Users, are for RECs and Admins only, so you will not see them.');
}

// 6. DASHBOARD
{
  const s = content('Dashboard', 'Getting Started');
  bullets(s, [
    '**Stat cards** — Open Incidents, Open Maintenance & Keys, My Upcoming Shifts, Active Program Proposals, Committees, SOP entries, Training Modules. **Click a card** to open that tab.',
    '**Pinned & Recent Announcements** — the five latest, pinned first.',
    '**On Call Now** — who is on call, **My next duty**, and **View Schedule**.',
    '**Incident Report Assistant** — **+ New Report** and your last five drafts with **Continue**.',
  ], { fs: 13.5 });
  mock(s, 7.3, 1.95, 5.45, 3.4, { nav: NAV.slice(0, 9), active: 'Dashboard', panel: 'Signed in as you (Reslife - RA)', rows: ['3 Open Incidents   ·   2 Open Maintenance   ·   4 My Shifts', '📌 Pinned: Fall Opening Duty Expectations', 'On Call Now: RA on duty · Duty phone', 'Draft · Noise complaint 10/12 — Continue'] });
  tip(s, 'Start every shift on the Dashboard: check On Call Now and any pinned announcements first.');
  notes(s, 'The Dashboard is your home base. The stat cards across the top show open incidents, open maintenance and key requests, your upcoming shifts, active program proposals and more. Click any card to jump into that tab. Below that you will see pinned and recent announcements, the On Call Now panel showing who is on duty and your next duty shift, and the Incident Report Assistant where you can start a new report or continue a draft. A good habit is to start every shift here.');
}

// 7. ANNOUNCEMENTS
{
  const s = content('Announcements', 'Team & Programs');
  bullets(s, [
    'Your team’s news feed: posts from RECs and Admins with text, images, GIFs and video.',
    '**📌 Pinned** posts stay at the top — these are expectations you are responsible for.',
    'Each post shows the author, how long ago it was posted, and if it was **edited**.',
    '**Urgent** announcements also pop up and appear in your 🔔 bell.',
    'RAs read announcements; posting, editing and pinning are for RECs and Admins.',
  ]);
  mock(s, 7.3, 1.95, 5.45, 3.4, { nav: NAV.slice(0, 9), active: 'Announcements', panel: 'Announcements', rows: ['📌 Pinned · Duty phone hand-off reminder · REC · 2d', 'Halloween program sign-ups are open · 5h', 'Fire drill Thursday 10 AM · edited · 1d', 'Welcome back! · 1w'] });
  tip(s, 'If something in an announcement is unclear, ask your REC — do not guess on policy.');
  notes(s, 'Announcements is your team news feed. RECs and Admins post updates here, sometimes with images or video. Pinned posts stay at the top and usually contain expectations you are responsible for, so read them carefully. Urgent announcements will also pop up on your screen and show in your bell. As an RA you read announcements; posting and pinning is handled by RECs and Admins.');
}

// =====================================================================
section('02', 'Program Proposals', 'Plan, budget and submit programs for REC approval — then track tasks and report results.', 'lifestyle-friends-walking.jpg').addNotes('Section two: Program Proposals, where you plan and submit your programs.');

// 8. PROGRAMMING OVERVIEW
{
  const s = content('Program Proposals: the overview', 'Team & Programs');
  bullets(s, [
    'Switch views: **Dashboard / List / Calendar** (Month or Week).',
    'Stat strip: Upcoming, Awaiting approval, **Needs revision**, Missing action items, Pending purchases, Overdue tasks, Completed, Est. budget.',
    'Filter by status, type, category, RA, REC and dates — or tick **Mine only**.',
    'Dashboard cards show what needs you: **Changes requested**, **Missing Action Item List**, **Awaiting evaluation**, and deadlines in the next 7 days.',
    'Buttons: **Templates** and **+ New Program Proposal**.',
  ]);
  mock(s, 7.3, 1.95, 5.45, 3.4, { nav: NAV.slice(0, 9), active: 'Program Proposals', panel: 'Programming', button: '+ New Program Proposal', rows: ['Upcoming 4 · Awaiting 2 · Needs revision 1', '⚠ Changes requested — Study Snacks Night', 'Missing Action Item List — Movie Night', 'Due in 7 days: Purchase request — Craft Night'] });
  tip(s, 'Check **Needs revision** and **Missing action items** weekly — those are waiting on you, not your REC.');
  notes(s, 'Program Proposals is where you plan your programs. You can view everything as a dashboard, a list, or a calendar. The stat strip shows what is upcoming, what is awaiting approval, and anything that needs revision. Use the filters or tick Mine only to see just your programs. The dashboard cards highlight what needs your attention, like changes your REC requested or missing action items. To start, click New Program Proposal, or click Templates to begin from a template or a past program.');
}

// 9. WIZARD STEPS 1-2
{
  const s = content('Creating a proposal: Steps 1 & 2', 'Team & Programs');
  card(s, 0.6, 1.95, 6.0, 3.55, 'Step 1 · Program Information', [
    '**Program Title*** — e.g. “Valentine’s Day Craft Night”',
    '**Program Type*** — Phase 1: Individual · Phase 2: Collaborative (add **Collaborating RAs***) · Large Scale',
    '**Format** — Active (in-person) or Passive (bulletin board, tabling, kits)',
    '**Programming Category*** — Academic Excellence, Campus Pride, EDI, Health & Wellness, Holistic Development, Safety & Bystander Prevention',
    'Assigned REC, Estimated Attendance, **Program Date***, Start/End Time, **Location***, Target Audience',
  ], ORANGE, { fs: 11 });
  card(s, 6.75, 1.95, 6.0, 3.55, 'Step 2 · Program Purpose', [
    '**Program Description*** — click the ⓘ and **Insert this template** for a guide: vision, what residents will do, partners',
    '**Learning Objectives*** — “Residents will be able to…”',
    'Engagement goals, connection to category, intended outcomes',
    '**Stations & Assignments** — Station, who’s involved, location, their job (**+ Add station**)',
  ], NAVY, { fs: 11 });
  tip(s, 'Fields marked * are required to submit — but you can **Save Draft** anytime. Drafts also auto-save once you add a title.', { x: 0.6, y: 5.75, w: 12.15, h: 0.65 });
  notes(s, 'Click New Program Proposal to open the five-step wizard. In step one, Program Information, enter a title, choose the program type, either Individual, Collaborative, or Large Scale, and pick Active or Passive format. Choose your programming category, your assigned REC, the date, times and location. In step two, Program Purpose, write your description. Click the little i icon and Insert this template for a helpful outline. Then add your learning objectives, starting with Residents will be able to. If your program has stations, list who runs each one. Fields with a star are required to submit, but you can save a draft at any time, and drafts auto-save once there is a title.');
}

// 10. STEPS 3-5
{
  const s = content('Steps 3–5: logistics, action items & submit', 'Team & Programs');
  card(s, 0.6, 1.95, 3.9, 3.6, 'Step 3 · Logistics', ['Space reservation needs', 'Equipment requirements', 'Setup & breakdown (or install & removal)', 'Promotion / marketing', 'Accessibility considerations'], COAST, { fs: 11 });
  card(s, 4.7, 1.95, 4.1, 3.6, 'Step 4 · Action Items & Budget', ['**+ Purchase** — item, type, vendor, link, unit cost, qty, fulfillment, needed by', '**+ Supply on hand** · **+ Flyer / Marketing request** · **+ Task / Other**', 'Add each vendor’s **tax, delivery, service, Instacart fees & tip**', 'Or tick “No supplies, purchases or action items needed”'], ORANGE, { fs: 11 });
  card(s, 9.0, 1.95, 3.75, 3.6, 'Step 5 · Review & Submit', ['Shows anything **“Still needed before you can submit”**', 'Shows who it goes to (your REC or all RECs)', 'Click **Submit for Approval**'], NAVY, { fs: 11 });
  warn(s, 'All purchases use the **Emburse Card (MasterCard)**. Out-of-pocket reimbursements are **not** permitted.', { x: 0.6, y: 5.75, w: 12.15, h: 0.65 });
  notes(s, 'Step three covers logistics: space, equipment, setup and breakdown, promotion, and accessibility. Step four is your action item list and budget. Add purchases with the vendor, link, cost and quantity, plus any supplies you already have, flyer or marketing requests, and tasks. Enter each vendor’s tax, delivery fees, Instacart fees and tip, because nothing is assumed. If your program needs nothing, tick the No supplies box. Step five reviews everything and tells you what is still missing. When it is complete, click Submit for Approval. Remember: all purchases use the Emburse card, and out-of-pocket reimbursements are not permitted.');
}

// 11. PURCHASE RULES
{
  const s = content('Purchasing rules the Hub reminds you about', 'Team & Programs');
  const rules = [
    ['🛒  Amazon = non-food only', 'Supplies, decorations and other non-food items. Buy food & drinks locally (Costco, Vons, Target), often through Instacart.'],
    ['🚫  Costco Food Court', 'Does not accept MasterCard — it cannot be paid with the Emburse card.'],
    ['🚚  Delivery & Instacart', 'Add the vendor’s delivery/service fees and tip. Instacart orders must include Instacart fees and tip.'],
    ['🏬  Pickup orders', 'Add a needed-by date and the RA responsible, and coordinate pickup with your REC.'],
    ['🧊  Perishables', 'Confirm the pickup window and that refrigeration is available.'],
    ['💲  Over budget', 'The Hub flags it when your estimate is more than the approved budget.'],
  ];
  rules.forEach(([h, b], i) => card(s, 0.6 + (i % 3) * 4.1, 1.95 + Math.floor(i / 3) * 1.95, 3.9, 1.75, h, b, i % 2 ? NAVY : ORANGE, { fs: 11 }));
  s.addText('These are warnings only — the Hub never changes your numbers for you.', { x: 0.6, y: 5.95, w: 12, h: 0.4, fontFace: F, fontSize: 12, italic: true, color: SUB });
  notes(s, 'As you build your budget, the Hub shows purchasing reminders. Amazon is for non-food items only; buy food locally, often through Instacart. Costco Food Court does not take MasterCard, so it cannot be paid with the Emburse card. For delivery and Instacart, include all fees and the tip. Pickup orders need a needed-by date and a responsible RA. For perishables, confirm a pickup window and refrigeration. And you will see a flag if you go over the approved budget. These are warnings only; the Hub never changes your numbers for you.');
}

// 12. PROGRAM DETAIL
{
  const s = content('After you submit: track, update & evaluate', 'Team & Programs');
  steps(s, [
    'Click **Open** on a program to see **Overview, Action Items & Budget, Checklist, Review, Evaluation & Report, History**.',
    'If your REC requests changes, **Edit**, then **Submit for approval** again. Use **Withdraw to draft** to pull it back.',
    'On the **Checklist**, update each task: **Not started · In progress · Done · Blocked**.',
    'Editing an approved program? Saving may send it back to your REC for **re-review**.',
    'After the program, complete **Evaluation & Report**: attendance, actual expenses, results, feedback, photos — click **Save evaluation**.',
    'Use **Duplicate** or **Templates → Use** to reuse a great program.',
  ], { gap: 0.68, w: 7.0 });
  mock(s, 7.85, 1.95, 4.9, 3.2, { nav: NAV.slice(0, 8), active: 'Program Proposals', panel: 'Craft Night · Approved', rows: ['Overview · Checklist · Evaluation & Report', '✔ Submit proposal — Done', '◐ Order supplies — In progress', '○ Submit program evaluation — Not started'] });
  tip(s, 'Only RECs approve, request changes, set the approved budget or mark programs completed.', { x: 7.85, y: 5.4, w: 4.9, h: 0.95 });
  notes(s, 'Once submitted, click Open on any program to see its details. If your REC requests changes, click Edit, make the updates, and submit again. You can also withdraw a proposal back to draft. The Checklist tab tracks the standard tasks; update each one as Not started, In progress, Done, or Blocked. If you edit a program that is already approved, it may go back to your REC for re-review. After the program, fill in the Evaluation and Report with attendance, actual expenses, results, feedback and photos, then click Save evaluation. Use Duplicate or Templates to reuse a successful program.');
}

// 13. COMMITTEES
{
  const s = content('Committees & meeting minutes', 'Team & Programs');
  steps(s, [
    'Open **Committees** to see each committee’s advisors, lead, meeting frequency and members.',
    'Click **Meeting Minutes**, then **+ Add Meeting**.',
    'Step 1: enter the **Meeting Date** and **Agenda / Notes** (required).',
    'Step 2: add action items — **Task, Assigned To, Due Date** (**+ Add Action Item**).',
    'Step 3: review and click **Save Minutes**. You can edit or delete minutes **you** logged.',
  ], { gap: 0.78 });
  mock(s, 7.3, 1.95, 5.45, 3.35, { nav: NAV.slice(0, 9), active: 'Committees', panel: 'Collateral Committees', rows: ['Open Collateral Hub →', 'Social Media Committee · Lead · Weekly', 'Members: 5 RAs   [ Meeting Minutes ]', 'Events Committee · Bi-weekly   [ Meeting Minutes ]'] });
  tip(s, 'For full project tracking, use **Open Collateral Hub →** at the top of the tab.');
  notes(s, 'The Committees tab shows each committee roster: advisors, the lead, how often you meet, and members. To record a meeting, click Meeting Minutes, then Add Meeting. Enter the date and your agenda or notes, add action items with who is assigned and the due date, review, and click Save Minutes. You can edit or delete minutes that you logged. For deeper project tracking, use the Open Collateral Hub link.');
}

// =====================================================================
section('03', 'Schedule & On-Call', 'Know when you work, who is on call, and how to offer, swap or pick up shifts.', 'occ-study-students.jpg').addNotes('Section three: your schedule and on-call responsibilities.');

// 14. SCHEDULE OVERVIEW
{
  const s = content('Schedule & On-Call: your views', 'On Duty');
  card(s, 0.6, 1.95, 3.95, 3.5, 'Overview', ['**On call now** — duty phone, phone number, escalation list (Backup → on-call roles → Emergency)', '**Next on call** · **My next shift**', 'New schedule published? Click **Review schedule**, then **I have reviewed my schedule**'], ORANGE, { fs: 11 });
  card(s, 4.7, 1.95, 3.95, 3.5, 'My Schedule & Team Schedule', ['**My Schedule** — your next 90 days', '**📅 Add to my calendar (.ics)**', '**Team Schedule** — Month / Week / List, filter by staff, shift type, status, weekends'], NAVY, { fs: 11 });
  card(s, 8.8, 1.95, 3.95, 3.5, 'History', ['Your completed shifts (last 90 days by default)', 'Totals, weekend shifts and Duty Log counts'], COAST, { fs: 11 });
  warn(s, 'Always know your **escalation list** before your shift starts — check **On call now** on the Overview.', { x: 0.6, y: 5.7, w: 12.15, h: 0.65 });
  notes(s, 'In Schedule and On-Call, the Overview shows who is on call right now, the duty phone, and the escalation list: backup, other on-call roles, and emergency. When a new schedule is published you will see a banner; click Review schedule, then I have reviewed my schedule. My Schedule shows your next ninety days, and you can add it to your personal calendar with the dot-ics button. Team Schedule shows everyone in month, week, or list view. History shows the shifts you have completed.');
}

// 15. SWAPS
{
  const s = content('Offer, swap, pick up & set availability', 'On Duty');
  steps(s, [
    'Click any of **your** future shifts → **Offer shift** (optional reason) or **Request swap** (pick a teammate + message).',
    'See an open shift? **Open Shifts** → **Pick up shift**. Offered to you? **Take this shift** or **Accept swap**.',
    'Track everything in **Shift Requests**: Waiting for a taker · Pending manager approval · Approved · Denied.',
    '**Availability** → set each weekday to ✓ Available, ★ Preferred or ✕ Unavailable → **Save weekly availability**.',
    'Need time off? Add a **Time off / blackout** date with a reason — it needs approval.',
    'After a shift, use **Add handoff note** for the next person.',
  ], { gap: 0.68, w: 7.2 });
  tip(s, 'Until a swap or offer is approved, **the original staff member stays responsible** for the shift.', { x: 7.9, y: 1.95, w: 4.85, h: 1.1 });
  tip(s, 'Handoff notes are informal. Official incidents still go in the **Incident Report / Duty Log**.', { x: 7.9, y: 3.25, w: 4.85, h: 1.1, label: 'NOTE' });
  tip(s, 'Only managers build, assign or publish shifts and approve requests or time off.', { x: 7.9, y: 4.55, w: 4.85, h: 1.1, label: 'NOTE' });
  notes(s, 'To give away a shift, click one of your future shifts and choose Offer shift, or Request swap to ask a specific teammate. To pick up extra hours, go to Open Shifts and click Pick up shift. If someone offers you a shift or a swap, you can take or accept it. Track all requests in Shift Requests. In Availability, set each weekday as available, preferred, or unavailable and save, and request time off with a reason. Remember: until a swap is approved, the original person is still responsible for that shift. After your shift you can add a handoff note, but official incidents still belong in the Duty Log or an Incident Report.');
}

// =====================================================================
section('04', 'Duty Log', 'Document every call and incident during your shift — on desktop or on your phone.', 'stock-student-phone.jpg').addNotes('Section four: the Duty Log, one of your most important on-duty tools.');

// 16. DUTY LOG START
{
  const s = content('Duty Log: open your shift log', 'On Duty');
  steps(s, [
    'Open **Duty Log**. The banner shows **Your duty shift** and **Shift details**.',
    'Click **+ {your shift}** for your scheduled shift, or pick a shift (Day, Evening, Overnight, Weekend…) and click **Start / open shift log**.',
    'There is **one shared log per shift**. Your duty partner opens the **same** log — use **Join** on the shift chip.',
    'Confirm **Duty RA** (you) and choose your **Duty Partner**.',
    'Quiet shift? Tick **No Calls / Incidents to Report**.',
  ], { gap: 0.78 });
  mock(s, 7.3, 1.95, 5.45, 3.35, { nav: NAV.slice(0, 9), active: 'Duty Log', panel: 'My Duty Log', button: '+ Add Call / Incident', rows: ['Today · 2 logs today · one per shift', 'Evening — In progress · You + Partner  [Join]', 'Duty RA: you    Duty Partner: ▼', '☐ No Calls / Incidents to Report'] });
  tip(s, 'Everyone on the shift can add entries — only **one** person needs to submit.');
  notes(s, 'Open the Duty Log at the start of your shift. Click the button for your scheduled shift, or choose a shift and click Start or open shift log. There is one shared log per shift, so your duty partner opens the same log; they can click Join on the shift chip. Confirm you are the Duty RA and select your Duty Partner. If your shift is quiet, tick No Calls or Incidents to Report. Everyone on the shift can add entries, and only one of you needs to submit.');
}

// 17. DUTY ENTRY
{
  const s = content('Adding a call or incident', 'On Duty');
  s.addText('Click + Add Call / Incident — every field saves as you type.', { x: 0.6, y: 1.8, w: 12, h: 0.35, fontFace: F, fontSize: 13, color: SUB, italic: true });
  const fields = [
    ['Incident Date & Time of Call', 'When it started'], ['Caller’s Name & Title', 'Resident, Guest, Parent/Family, RA, REC, Security/Campus Safety, Maintenance, Staff, Witness, Other'],
    ['Location', 'Building, room number or area'], ['Incident Type', 'Noise, Lockout, Resident Concern, Maintenance, Wellness Check, Policy Violation, Facility/Safety, Medical, Mental Health, Alcohol/Drug, Other'],
    ['Reason for Call', 'The initial information you were given'], ['Response / Follow-Up', '2–3 sentence summary of what you did'],
    ['Documentation Completed', 'None Required, Incident Report, Service Request, Other'], ['Done', 'Saves the entry — use Edit or Remove later'],
  ];
  fields.forEach(([h, d], i) => { const x = 0.6 + (i % 2) * 6.1, y = 2.25 + Math.floor(i / 2) * 0.86; s.addShape(p.ShapeType.roundRect, { x, y, w: 5.95, h: 0.76, rectRadius: 0.05, fill: { color: 'F8FAFC' }, line: { color: BORDER } }); s.addText([{ text: h, options: { bold: true, color: NAVY, breakLine: true } }, { text: d, options: { color: TEXT, fontSize: 10 } }], { x: x + 0.15, y, w: 5.7, h: 0.76, fontFace: F, fontSize: 12, valign: 'middle' }); });
  warn(s, '⚠️ **Do not include resident names or Student IDs** in the Response / Follow-Up section.', { x: 0.6, y: 5.75, w: 12.15, h: 0.6 });
  notes(s, 'To log a call, click Add Call or Incident. Enter the incident date and time of call, the caller’s name and title, the location with building and room, and the incident type. Under Reason for Call, write the initial information you were given. Under Response or Follow-Up, write a short two to three sentence summary of what you did. Important: do not include resident names or student IDs in that section. Choose what documentation was completed, then click Done. Every field saves as you type, and you can edit or remove entries later.');
}

// 18. SUBMIT DUTY LOG
{
  const s = content('Submitting, reopening & working offline', 'On Duty');
  steps(s, [
    'At the end of your duty period click **Submit {Shift} Duty Log** (needs at least one entry or **No Calls** ticked).',
    'Check the summary — date, Duty RA, partner, number of calls — and click **Submit Duty Log**.',
    'After submitting the log is **read-only**. Use **View report** (with Print).',
    'Need a fix? Same day: **Reopen to edit**. Otherwise open the report → **Request Edit Unlock** (shows “Edit Requested”).',
    'Use **Duty Resources** for **How to Write an Incident Report** and **Open Incident Report Form**.',
  ], { gap: 0.78, w: 7.0 });
  card(s, 7.85, 1.95, 4.9, 2.4, '📶  Lost connection?', ['Changes are kept on your device', 'Status shows **Offline — changes will sync**', 'Retries automatically, then **All changes synced**', 'You cannot **submit** while offline'], COAST, { fs: 11 });
  warn(s, 'Submit your log at the end of every duty period and follow your REC’s deadline. Past logs live in **My Duty Log History**.', { x: 7.85, y: 4.55, w: 4.9, h: 1.3 });
  notes(s, 'At the end of your duty period, click Submit Duty Log. You need at least one entry or the No Calls box ticked. Review the summary and confirm. Once submitted, the log becomes read-only; you can view and print the report. If you need to fix something the same day, use Reopen to edit; otherwise, click Request Edit Unlock and your REC or Admin will unlock it. If you lose connection, keep working: changes are saved on your device and sync automatically, but you will need a connection to submit. Always submit at the end of your duty period and follow your REC’s deadline.');
}

// 19. PHONE DUTY LOG
{
  const s = content('Duty Log on your phone', 'On Duty');
  steps(s, [
    'Open the Duty Log page on your phone and sign in.',
    '**iPhone:** Safari → Share → **Add to Home Screen**. **Android:** menu → **Install app / Add to Home screen**.',
    'Tap the **Duty Log** icon to open full screen.',
    '**Start Today’s Duty Log** → choose **Duty Partner** → **+ Add Call / Incident**.',
    'Entries auto-save; if the signal drops it shows **Offline — will retry**.',
    'Tap **Submit Daily Duty Log**. Use **Open full Reslife Hub** for desktop tools.',
  ], { gap: 0.7, w: 7.4 });
  s.addShape(p.ShapeType.roundRect, { x: 9.0, y: 1.85, w: 2.6, h: 4.6, rectRadius: 0.3, fill: { color: '111827' }, line: { color: '111827' } });
  s.addShape(p.ShapeType.roundRect, { x: 9.12, y: 2.05, w: 2.36, h: 4.2, rectRadius: 0.18, fill: { color: BG }, line: { color: BG } });
  s.addShape(p.ShapeType.rect, { x: 9.12, y: 2.15, w: 2.36, h: 0.5, fill: { color: NAVY }, line: { color: NAVY } });
  s.addText('Duty Log   🔔', { x: 9.2, y: 2.15, w: 2.2, h: 0.5, fontFace: F, fontSize: 10, bold: true, color: 'FFFFFF', valign: 'middle' });
  ['Start Today’s Duty Log', '+ Add Call / Incident', 'Submit Daily Duty Log'].forEach((t, i) => { s.addShape(p.ShapeType.roundRect, { x: 9.3, y: 2.95 + i * 0.75, w: 2.0, h: 0.5, rectRadius: 0.08, fill: { color: i === 2 ? NAVY : ORANGE }, line: { color: 'FFFFFF' } }); s.addText(t, { x: 9.3, y: 2.95 + i * 0.75, w: 2.0, h: 0.5, fontFace: F, fontSize: 8.5, bold: true, color: 'FFFFFF', align: 'center', valign: 'middle' }); });
  s.addImage({ path: IMG('harbour-logo-color.png'), x: 9.55, y: 5.4, w: 1.5, h: 0.59 });
  notes(s, 'You can also use the Duty Log on your phone. Open the Duty Log page and sign in, then add it to your home screen. On iPhone, tap Share in Safari and choose Add to Home Screen. On Android, choose Install app or Add to Home screen. Tap the Duty Log icon to open it full screen. Start today’s log, choose your duty partner, and add calls as they happen. Entries save automatically and retry if you lose signal. Submit when your duty period ends. Note: even on your phone, keep resident names and student IDs out of the response section.');
}

// =====================================================================
section('05', 'Guests, Incidents & Maintenance', 'Front-desk guest check-in, quick incident reports, and maintenance & key requests.', 'kitchen-0182.jpg').addNotes('Section five: Guest Log, Incident Reports, and Maintenance and Keys.');

// 20. GUEST LOG OVERVIEW
{
  const s = content('Guest Log: who is on property', 'On Duty');
  bullets(s, [
    'Buttons: **Restricted-Access Check**, **Open Kiosk**, **Send Pre-Registration Link**, **+ Log a Guest**.',
    'Stats: On property, Expected today, Check-ins today, Pre-registered, **Past expected time**.',
    '**Today / Week / Month** views and search by guest, resident or unit.',
    '**Pre-Registered** → click **Check In** when the guest arrives.',
    '**Currently On Property** → click **Check Out** when they leave. Watch for the **Past expected time** flag.',
    '**View ID** shows the guest’s ID photo.',
  ]);
  mock(s, 7.3, 1.95, 5.45, 3.4, { nav: NAV.slice(0, 9), active: 'Guest Log', panel: 'Guest Log', button: '+ Log a Guest', rows: ['On property 3 · Expected 2 · Past expected 1', 'Pre-Registered: Guest → Unit 1111  [Check In]', 'On Property: Guest → Unit 2204  [Check Out]', '⚠ Past expected time: Guest → Unit 3108'] });
  notes(s, 'The Guest Log tracks every guest on property. The top buttons let you run a restricted-access check, open the front-desk kiosk, send a pre-registration link, or log a guest yourself. The stats show who is on property, who is expected, and anyone past their expected time. Pre-registered guests appear in their own list; click Check In when they arrive. Guests on property have a Check Out button. View ID shows the photo of their ID.');
}

// 21. LOG A GUEST
{
  const s = content('Logging a guest & sending pre-registration links', 'On Duty');
  steps(s, [
    'Click **+ Log a Guest** → choose **Check in now** or **Pre-register**.',
    'Search and select the **Resident*** (by name or unit).',
    'Enter **Guest full name*** (first and last), phone and email.',
    'Choose **ID type*** — Driver’s License, State ID or Student ID — and **Take / upload photo** of the ID.',
    'Set **Length of stay** (1–4 hours, Until 11:00 PM, Overnight). Add notes if needed.',
    'Click **Check In Guest** or **Pre-Register Guest**.',
  ], { gap: 0.66, w: 7.0 });
  card(s, 7.85, 1.95, 4.9, 2.9, '🔗  Pre-Registration Link', ['Click **Send Pre-Registration Link**', 'Pick the **Resident**, expected visit date and link length (3 / 7 / 14 days)', 'Click **Generate Link** → **Copy link** or **Email in Gmail**', 'The guest must **still check in at the front desk**'], ORANGE, { fs: 11 });
  tip(s, 'The resident and property inboxes are emailed by default — leave that box ticked.', { x: 7.85, y: 5.05, w: 4.9, h: 0.9 });
  notes(s, 'To log a guest, click Log a Guest, then choose Check in now or Pre-register. Select the resident they are visiting, enter the guest’s full name and contact information, choose the ID type, and take or upload a photo of the ID. Set the length of stay and click Check In Guest. Residents can also pre-register guests: click Send Pre-Registration Link, select the resident and date, generate the link, and copy or email it. Pre-registered guests must still check in at the front desk.');
}

// 22. RESTRICTED CHECK
{
  const s = content('Restricted-access check', 'On Duty');
  steps(s, [
    'Click **Restricted-Access Check**, type the guest’s full name, click **Check**.',
    'No match: “Continue the normal guest process.”',
    'Possible match: **pause the check-in politely**.',
    '**Contact the on-call REC now.**',
    'Follow the **Campus Safety escalation** process.',
    'Record the outcome: Escalated to REC / Campus Safety · Not a match — ID verified · Unable to verify identity.',
  ], { gap: 0.66, w: 7.0 });
  warn(s, 'A match is a screening aid, **not an identification**. Similar names are common. **Do not confirm or deny anything** to the guest or resident.', { x: 7.85, y: 1.95, w: 4.9, h: 1.6 });
  tip(s, 'Checks can also pop up automatically when you check a guest in. A flagged guest shows **Verification required**.', { x: 7.85, y: 3.75, w: 4.9, h: 1.3, label: 'NOTE' });
  notes(s, 'The restricted-access check screens a guest’s name against active, verified restrictions. Click Restricted-Access Check, type the full name, and click Check. If there is no match, continue as normal. If there is a possible match, pause the check-in politely, contact the on-call REC right away, and follow the Campus Safety escalation process. Then record the outcome. A match is never an identification, and you should not confirm or deny anything to the guest or resident. This check may also pop up automatically during check-in.');
}

// 23. INCIDENTS
{
  const s = content('Incident Reports', 'On Duty');
  card(s, 0.6, 1.95, 5.95, 3.55, 'Quick Log (this tab)', ['Click **+ New Incident Report**', '**Who & Where** — Resident Name, Room / Unit (optional), **Severity**: Low / Medium / High', '**What Happened** — **Description** (required)', 'Review → **Submit Report**', 'You can **Edit** or **Delete** your own reports'], NAVY, { fs: 12 });
  card(s, 6.8, 1.95, 5.95, 3.55, 'Incident Report Assistant (full report)', ['Use **Open Incident Report Assistant →** or **+ New Report** on the Dashboard', 'Guided narrative builder for **Maxient-ready** reports', 'Drafts show **Draft** or **Ready for Maxient** — click **Continue**', 'Duty Log → **How to Write an Incident Report**'], ORANGE, { fs: 12 });
  tip(s, 'Use the Quick Log to capture it fast — use the Assistant for the official, detailed report. RECs resolve and reopen reports.', { x: 0.6, y: 5.75, w: 12.15, h: 0.65 });
  notes(s, 'There are two ways to report incidents. The Incident Reports tab is a quick log: click New Incident Report, add who and where with a severity of low, medium or high, describe what happened, and submit. You can edit or delete your own reports. For the official, detailed report, use the Incident Report Assistant, which guides you through a Maxient-ready narrative. Your drafts appear on the Dashboard with a Continue link. RECs handle resolving and reopening reports.');
}

// 24. MAINTENANCE
{
  const s = content('Maintenance & Key requests', 'On Duty');
  steps(s, [
    'Click **+ New Request** → choose **Maintenance** or **Key / Lock**.',
    'Select the **Resident** (saved to their directory record) and the **Unit / Bed** or Common Area.',
    'Maintenance: **Category***, **Area**, **Priority** (Normal, Low, Urgent, Emergency).',
    'Key / Lock: **Key Request*** (Lockout, Lost Key, Lost Fob, Lock Change…) and **Item**.',
    'Add a **Note** (200 characters) and tick the **Entrata** boxes — resident notes and work order # .',
    'Review → **Submit Request**. Filter the list by type and status.',
  ], { gap: 0.66, w: 7.0 });
  mock(s, 7.85, 1.95, 4.9, 3.3, { nav: NAV.slice(0, 10), active: 'Maintenance & Keys', panel: 'Maintenance & Key Requests', button: '+ New Request', rows: ['Open 4 · In progress 2 · Resolved 18', 'Plumbing / Leak · Bathroom · Urgent', 'Lockout · Unit Key · ✓ Entrata notes', 'Light out · Hallway · ✗ Work order'] });
  tip(s, 'Always document in **Entrata** too. RECs mark requests in progress or resolved.', { x: 7.85, y: 5.45, w: 4.9, h: 0.9 });
  notes(s, 'Maintenance and Keys is where you log work orders and key or lock issues. Click New Request and choose Maintenance or Key and Lock. Select the resident, which saves the request to their record, and the unit or area. For maintenance, choose the category, area and priority. For keys, choose the request type and item. Add a short note and confirm whether you documented it in Entrata and submitted a work order. Then submit. RECs mark requests in progress or resolved.');
}

// 25. SOPs
{
  const s = content('Key & maintenance SOPs (shown beside the form)', 'On Duty');
  card(s, 0.6, 1.95, 5.95, 3.9, '🔑  Key / Lock SOP', ['**Verify photo ID** matches the resident on file', '**Never admit** anyone not on the License Agreement', 'Log the lockout and any charge', 'Lost fob: **deactivate** and request a lock change', 'Record key/fob numbers and get the resident’s **signature**', '**Never lend** master or staff keys'], NAVY, { fs: 12 });
  card(s, 6.8, 1.95, 5.95, 3.9, '🛠  Maintenance SOP', ['**Emergency** (flood, no heat in winter, gas smell, fire/life safety): call on-call maintenance **immediately**, then log', '**Urgent** (no water, toilet, no power): notify REC + on-call maintenance **same shift**', '**Normal:** submit here; remind resident to submit a portal work order', 'Ask about **permission to enter** and **pets**', 'Photograph damage · **follow up within 48 hours**'], ORANGE, { fs: 12 });
  notes(s, 'Next to the request form you will see the standard procedures. For keys and locks: verify photo ID, never admit anyone not on the License Agreement, log every lockout and charge, deactivate lost fobs, record key numbers with a signature, and never lend master or staff keys. For maintenance: emergencies like floods, gas smells, or fire safety issues mean calling on-call maintenance immediately, then logging. Urgent issues get reported to your REC and maintenance the same shift. Normal requests go here, and remind residents to submit a portal work order. Ask about permission to enter and pets, photograph damage, and follow up within forty-eight hours.');
}

// =====================================================================
section('06', 'Reference Tools', 'Resident Directory, Campus Contacts, Curriculum, SOPs, Resources and Training.', 'occ-campus-student-studying.jpg').addNotes('Section six: your reference tools.');

// 26. DIRECTORY
{
  const s = content('Resident Directory', 'Reference');
  steps(s, [
    'Search by **name, unit or email**; filter by building, floor, tag or RA (**Clear filters** resets).',
    'Click a resident to open their **profile**: unit, bed, building/floor, roommates, email and phone.',
    'Profile tabs: **Overview, Incidents, Violations, Duty Log, Guests, Keys / Locks, Maintenance**.',
    'On **Keys / Locks** you can add an entry: type + details → **Add Entry**.',
    'Click a roommate to jump to their profile. **Backspace** goes back, **Esc** closes.',
  ], { gap: 0.78, w: 7.0 });
  warn(s, '**Non-Leasing Occupant (minor)** notice: they are not on the License Agreement — contact the **primary resident** about anything involving them.', { x: 7.85, y: 1.95, w: 4.9, h: 1.55 });
  tip(s, 'Resident information is confidential. Only use it for your RA duties, and never share it with other residents.', { x: 7.85, y: 3.7, w: 4.9, h: 1.3, label: 'PRIVACY' });
  notes(s, 'The Resident Directory lets you look up residents. Search by name, unit or email, or filter by building, floor, tag or RA. Click a resident to open their profile with their unit, bed, roommates and contact information, plus tabs for incidents, violations, duty log mentions, guests, keys and maintenance. You can add key and lock entries from the profile. If you see a non-leasing occupant notice, that resident is a minor who is not on the License Agreement, so contact the primary resident. Resident information is confidential; use it only for your RA duties.');
}

// 27. CONTACTS
{
  const s = content('Campus Contacts', 'Reference');
  steps(s, [
    'Search by name, department, email or category (Academic, Safety, Financial, Health & Wellness, Student Organizations).',
    'Click a card to see **Why Contact Them**, **Capstone Contacts to Include** and notes.',
    'Click **✉ Email This Contact** — listed Capstone staff are copied automatically.',
    'Need several? **✉ Email Multiple Contacts** → tick contacts or **Select All** → **✉ Open Email**.',
  ], { gap: 0.85, w: 7.0 });
  mock(s, 7.85, 1.95, 4.9, 3.3, { nav: NAV.slice(0, 11), active: 'Campus Contacts', panel: 'Campus Partner Contacts', rows: ['Campus Safety · Safety · ✉ Email', 'Student Health Center · Health & Wellness', 'Financial Aid · Financial', 'Student Life · Student Organizations'] });
  notes(s, 'Campus Contacts is your directory of campus partners. Search by name, department or category. Click a contact to see why you would reach out to them and which Capstone staff to include. Email This Contact opens an email with those staff already copied. To email several partners at once, click Email Multiple Contacts, select them, and click Open Email.');
}

// 28. CURRICULUM / SOP / RESOURCES
{
  const s = content('Curriculum, SOP Library & Resources', 'Reference');
  card(s, 0.6, 1.95, 3.95, 3.7, '📋  Curriculum Tracker', ['Pick a semester to see the grid of **requirements and due dates** by RA', 'Read-only — your REC marks completions', '**Open Curriculum Management →** for the full view'], ORANGE, { fs: 12 });
  card(s, 4.7, 1.95, 3.95, 3.7, '📘  SOP Library', ['Opens the property’s **written procedures** in its own page', 'Search, read and follow the steps', 'Acknowledge SOPs when asked'], NAVY, { fs: 12 });
  card(s, 8.8, 1.95, 3.95, 3.7, '🔗  Resources', ['Reference links grouped by category — click **Open**', 'Includes **The Harbour Information Library**', 'Search with “Search resources…”'], COAST, { fs: 12 });
  tip(s, 'When you are unsure how to handle something, check the **SOP Library** first, then ask your REC.', { x: 0.6, y: 5.85, w: 12.15, h: 0.6 });
  notes(s, 'The Curriculum Tracker shows which requirements are due by semester. It is read-only for RAs; your REC marks completions, and Open Curriculum Management gives the full view. The SOP Library opens the property’s written procedures; read them, follow the steps, and acknowledge them when asked. Resources has helpful links grouped by category, including The Harbour Information Library. When you are unsure how to handle something, check the SOP Library first, then ask your REC.');
}

// 29. TRAINING
{
  const s = content('Training Modules', 'Reference');
  steps(s, [
    'Open **Training Modules** → each card shows the category, title, description and lesson.',
    'Some modules link to **Canvas / External Course** — complete that first.',
    'Click **Take Quiz (N questions)** and answer every question.',
    'Click **Submit Quiz** — you will see **✔ Passed** or **✘ Not Passed** with your score (pass mark usually **80%**).',
    'Not passed? Review the lesson and click **Retake Quiz**.',
  ], { gap: 0.8, w: 7.0 });
  mock(s, 7.85, 1.95, 4.9, 3.3, { nav: NAV, active: 'Training Modules', panel: 'Training Modules', rows: ['Emergency Response · Passed · 90%', 'Guest Policy · Attempted · 70%  [Retake]', 'Duty Log Basics · [Take Quiz (8 questions)]', 'Title IX Awareness · Open in Canvas'] });
  notes(s, 'Training Modules holds your required lessons and quizzes. Read the lesson on each card, and complete any linked Canvas or external course. Then click Take Quiz, answer every question, and Submit. You will see if you passed, with your score; the pass mark is usually eighty percent. If you did not pass, review the lesson and retake the quiz.');
}

// =====================================================================
section('07', 'Creative Studio', 'Create on-brand flyers, posts, signs, emails and campaigns — then submit for approval.', 'living-room-0104.jpg').addNotes('Section seven: the Creative Studio.');

// 30. CS HOME
{
  const s = content('Creative Studio: getting there & Home', 'Creative Studio');
  steps(s, [
    'In the Hub sidebar click **Creative Studio**. **← Hub** brings you back.',
    'Use **quick buttons**: Create Event, Create Flyer, Send Resident Update, Create Social Post, Create Sign, Create Resource Guide.',
    'Or use the **✦ AI Assistant**: describe it (e.g. “a flyer for a resident game night”), pick an audience, click **Create**.',
    'Home also shows **Favorites, Recommended, Recent Projects, Approved Examples** and the **Brand Kit**.',
    'Use the top **search** to find templates, examples, resources and projects.',
  ], { gap: 0.8, w: 7.0 });
  s.addShape(p.ShapeType.roundRect, { x: 7.85, y: 1.95, w: 4.9, h: 3.3, rectRadius: 0.08, fill: { color: SAND }, line: { color: BORDER } });
  s.addShape(p.ShapeType.rect, { x: 7.85, y: 1.95, w: 4.9, h: 0.45, fill: { color: 'FFFFFF' }, line: { color: BORDER } });
  s.addImage({ path: IMG('harbour-logo-color.png'), x: 8.0, y: 2.0, w: 0.9, h: 0.35 });
  s.addText('Creative Studio      RA', { x: 9.0, y: 1.95, w: 3.6, h: 0.45, fontFace: F, fontSize: 9, bold: true, color: NAVY, valign: 'middle', align: 'right' });
  s.addText('Create something for your community.', { x: 8.05, y: 2.5, w: 4.5, h: 0.5, fontFace: F, fontSize: 14, bold: true, color: NAVY });
  s.addShape(p.ShapeType.roundRect, { x: 8.05, y: 3.05, w: 4.5, h: 0.45, rectRadius: 0.06, fill: { color: 'FFFFFF' }, line: { color: ORANGE } });
  s.addText('✦  Make me a flyer for a resident game night…   [Create]', { x: 8.15, y: 3.05, w: 4.3, h: 0.45, fontFace: F, fontSize: 9, color: SUB, valign: 'middle' });
  ['Flyer', 'Social', 'Event', 'Sign'].forEach((t, i) => { s.addShape(p.ShapeType.roundRect, { x: 8.05 + i * 1.14, y: 3.7, w: 1.04, h: 1.2, rectRadius: 0.06, fill: { color: i % 2 ? NAVY : ORANGE }, line: { color: 'FFFFFF' } }); s.addText(t, { x: 8.05 + i * 1.14, y: 3.7, w: 1.04, h: 1.2, fontFace: F, fontSize: 10, bold: true, color: 'FFFFFF', align: 'center', valign: 'middle' }); });
  notes(s, 'The Creative Studio is where you make on-brand flyers, social posts, signs, emails and more. Open it from the Hub sidebar; the Hub link brings you back. On Home, use a quick button like Create Flyer, or try the AI Assistant: describe what you need, pick the audience, and click Create. You will also see your favorites, recent projects, approved examples, and the brand kit. The search bar at the top finds templates, examples and projects.');
}

// 31. TEMPLATES & EDITOR
{
  const s = content('Templates & the design editor', 'Creative Studio');
  card(s, 0.6, 1.95, 3.95, 3.75, '1 · Pick a template', ['Filter by group and format, or **★ Favorites**', 'Hover → **Preview** or **Use Template**', '☆ to favorite templates you reuse'], ORANGE, { fs: 12 });
  card(s, 4.7, 1.95, 3.95, 3.75, '2 · Edit', ['**Content:** headline, date, time, location, call to action, QR link, contact', '**AI:** Write, Make Shorter, Friendlier, Fix Grammar, Social Caption, SMS / Email version', '**Images:** Photo Library or an Entrata Media Library link', '**Layout:** Letter, Notice, Post, Story, Sign'], NAVY, { fs: 11 });
  card(s, 8.8, 1.95, 3.95, 3.75, '3 · Check & save', ['Brand check: **“Looks on-brand and ready to export”** or warnings to fix', '**Save Draft** anytime', '**Submit for Approval** when ready', '**Download ▾** PNG / PDF / Print PDF (300 dpi)'], COAST, { fs: 11 });
  warn(s, 'Brand colors, fonts and logos are **locked**. Always proofread dates, times and locations — AI drafts must be reviewed.', { x: 0.6, y: 5.9, w: 12.15, h: 0.6 });
  notes(s, 'In Templates, filter by type and format, preview a design, and click Use Template. In the editor, the Content tab holds your headline, date, time, location and call to action. AI tools can write copy, shorten it, fix grammar, or create a social caption, text or email version. Choose images from the Photo Library or an Entrata media link, and switch layouts between letter, post, story and sign. Brand colors, fonts and logos are locked so everything stays on-brand. Watch the brand check, save drafts as you go, and submit for approval when it is ready. Always proofread details, especially anything AI wrote.');
}

// 32. CAMPAIGNS & COMMS
{
  const s = content('Campaigns & Communications', 'Creative Studio');
  card(s, 0.6, 1.95, 5.95, 3.75, '📣  Campaigns — one event, every format', ['Enter **Event name, Date, Time, Location, Description, Photo, Audience**', 'Click **Generate Campaign**', 'Get an 8.5×11 flyer, Instagram post & story, digital sign, resident email, SMS reminder and caption', '**Save all to My Projects**'], ORANGE, { fs: 12 });
  card(s, 6.8, 1.95, 5.95, 3.75, '✉️  Communications — approved copy', ['Browse approved **email, text and social** templates by channel & category', '**Use This Template** or **Copy**', 'AI rewrites, **SMS counter** (160 characters per segment) and wording check', '**Turn into a flyer** · **Save to My Projects**'], NAVY, { fs: 12 });
  warn(s, 'Emergency templates: **verify every detail with your supervisor before sending.**', { x: 0.6, y: 5.9, w: 12.15, h: 0.6 });
  notes(s, 'Campaigns turns one event into every format at once. Enter the event details, click Generate Campaign, and you get a flyer, Instagram post and story, a digital sign, a resident email, a text reminder and a caption. Save them all to My Projects. Communications has approved email, text and social copy. Use a template or copy it, rewrite with AI, and watch the SMS counter. For emergency templates, always verify every detail with your supervisor before sending.');
}

// 33. NEWSLETTER / BRAND
{
  const s = content('Newsletter, Entrata HTML, Brand Kit & Photos', 'Creative Studio');
  const items = [
    ['📰  Monthly Newsletter', 'Build with blocks, **Preview**, **Validate**, **Send Test**, **Save Draft**, **Copy Entrata HTML**. Approval is done by RECs/Admins.', ORANGE],
    ['🧩  HTML – Entrata', 'Paste or upload Entrata HTML and edit **text only** — layout, styles, links and images stay locked.', NAVY],
    ['🎨  Brand Kit', 'Logos, logo rules, colors (click to copy), typography, graphics and brand voice.', COAST],
    ['📷  Photos', 'Browse approved photos and copy links. Need a new image? **Ask an REC or Admin to add it.**', ORANGE],
  ];
  items.forEach(([h, b, c], i) => card(s, 0.6 + (i % 2) * 6.1, 1.95 + Math.floor(i / 2) * 1.95, 5.95, 1.75, h, b, c, { fs: 12 }));
  s.addText([{ text: 'Brand words: ', options: { bold: true, color: NAVY } }, { text: '“License Agreement” (not lease) · “Resident” (not tenant) · “The Harbour” (not Harbor) · “Guarantor” (not cosigner)' }], { x: 0.6, y: 5.95, w: 12.15, h: 0.45, fontFace: F, fontSize: 12, color: TEXT });
  notes(s, 'The Monthly Newsletter builder lets you assemble blocks, preview, validate, send a test, and copy the Entrata HTML; RECs and Admins approve it. HTML Entrata lets you safely edit just the text of an existing Entrata email. The Brand Kit has our logos, colors, fonts, graphics and voice. Photos lets you browse approved images; ask an REC or Admin if you need a new one added. And remember our brand words: License Agreement, not lease; Resident, not tenant; The Harbour, spelled H-A-R-B-O-U-R; and Guarantor, not cosigner.');
}

// 34. MY PROJECTS & APPROVAL
{
  const s = content('My Projects, Creative Library & approval', 'Creative Studio');
  const flow = [['Draft', 'Save Draft anytime', 'F8FAFC', NAVY], ['Pending approval', 'You click Submit for Approval', 'FFF7ED', 'C2410C'], ['Approved', 'REC/Admin approves — 🔔 you’re notified', 'F0FDF4', '166534'], ['Sent back', 'Fix using the reviewer’s note, resubmit', 'FEF2F2', 'B91C1C']];
  flow.forEach(([h, d, f, c], i) => {
    const x = 0.6 + i * 3.1;
    s.addShape(p.ShapeType.roundRect, { x, y: 1.95, w: 2.8, h: 1.25, rectRadius: 0.08, fill: { color: f }, line: { color: c } });
    s.addText([{ text: h, options: { bold: true, color: c, fontSize: 14, breakLine: true } }, { text: d, options: { color: TEXT, fontSize: 10.5 } }], { x: x + 0.1, y: 1.95, w: 2.6, h: 1.25, fontFace: F, align: 'center', valign: 'middle' });
    if (i < 3) s.addText('➜', { x: x + 2.8, y: 2.3, w: 0.3, h: 0.5, fontSize: 18, color: ORANGE, align: 'center' });
  });
  card(s, 0.6, 3.5, 5.95, 2.3, '📁  My Projects', ['Folders: All, **My pending**, Approved, Drafts, Archived', '**+ New Project**, new folders', 'Edit · Duplicate · Download · Archive / Restore'], NAVY, { fs: 12 });
  card(s, 6.8, 3.5, 5.95, 2.3, '🖼  Creative Library', ['**+ Upload Creative** (images & PDFs)', 'Uploads stay **pending until an Admin or REC approves**'], ORANGE, { fs: 12 });
  tip(s, 'Editing approved work sends it back to **pending**. Never post anything publicly until it is approved.', { x: 0.6, y: 5.95, w: 12.15, h: 0.55 });
  notes(s, 'Here is how creative approval works. Save drafts anytime. When you are ready, click Submit for Approval and the project becomes pending. An REC or Admin either approves it, or sends it back with a note; either way you get a bell notification. If it is sent back, fix it and resubmit. If you edit approved work, it goes back to pending. My Projects organizes your work into folders like My pending, Approved and Drafts. The Creative Library lets you upload images and PDFs, which stay pending until approved. Never post anything publicly until it is approved.');
}

// 35. QUICK REFERENCE
{
  const s = content('Quick reference: RA can / REC & Admin handle', 'Wrap-Up');
  card(s, 0.6, 1.95, 5.95, 4.1, '✅  You can', ['Read announcements & get notifications', 'Create, submit, edit & evaluate **your** programs', 'Log committee minutes', 'Offer, swap, pick up shifts; set availability', 'Start, add to and submit **Duty Logs**', 'Check guests in/out; run restricted-access checks', 'Log incidents, maintenance & key requests', 'Look up residents; add key/lock entries', 'Take training quizzes; create & submit creative'], '16A34A', { fs: 12 });
  card(s, 6.8, 1.95, 5.95, 4.1, '🔒  REC & Admin handle', ['Posting & pinning announcements', 'Approving programs, budgets & creative', 'Building & publishing schedules; approving swaps/time off', 'Reopening others’ duty logs; unlocking edits', 'Resolving incidents & maintenance requests', 'Editing resident records, tags & notes', 'Safety records, conduct meetings, accommodations', 'Managing users, contacts, locations & settings'], NAVY, { fs: 12 });
  notes(s, 'Here is a quick reference. As an RA you can read announcements, create and submit your programs, log committee minutes, manage your shifts and availability, complete Duty Logs, handle guests, log incidents and maintenance, look up residents, take training quizzes, and create creative work for approval. RECs and Admins handle approvals, publishing schedules, unlocking logs, resolving requests, editing resident records, restricted records like safety and conduct meetings, and system settings.');
}

// 36. BEST PRACTICES
{
  const s = content('Best practices', 'Wrap-Up');
  const bp = [
    ['🔐', 'Protect privacy', 'No resident names or Student IDs in Duty Log responses. Resident info is for RA duties only.'],
    ['⏱', 'Document in real time', 'Add Duty Log entries as calls happen — not from memory hours later.'],
    ['📤', 'Submit on time', 'Submit your Duty Log at the end of every duty period and meet program deadlines.'],
    ['📞', 'Escalate early', 'Know the on-call escalation list. When in doubt, call your on-call REC.'],
    ['🧾', 'Follow purchasing rules', 'Emburse card only, local vendors for food, include all fees and tips.'],
    ['💬', 'Speak up', 'Use the Feedback button to report bugs or suggest improvements.'],
  ];
  bp.forEach(([ic, h, d], i) => {
    const x = 0.6 + (i % 3) * 4.1, y = 1.95 + Math.floor(i / 3) * 2.05;
    s.addShape(p.ShapeType.roundRect, { x, y, w: 3.9, h: 1.85, rectRadius: 0.08, fill: { color: i % 2 ? LIGHT : SAND }, line: { color: BORDER } });
    s.addText(ic, { x: x + 0.15, y: y + 0.15, w: 0.6, h: 0.6, fontSize: 24 });
    s.addText(h, { x: x + 0.8, y: y + 0.18, w: 3.0, h: 0.5, fontFace: F, fontSize: 15, bold: true, color: NAVY });
    s.addText(d, { x: x + 0.2, y: y + 0.8, w: 3.55, h: 0.95, fontFace: F, fontSize: 11.5, color: TEXT, valign: 'top' });
  });
  notes(s, 'To wrap up, a few best practices. Protect resident privacy. Document in real time while details are fresh. Submit your Duty Log at the end of every duty period and meet your program deadlines. Escalate early; when in doubt, call your on-call REC. Follow the purchasing rules. And use the Feedback button whenever something is not working or could be better.');
}

// 37. CLOSING
{
  const s = p.addSlide(); n++;
  s.addImage({ path: IMG('rooftop-terrace-0235.jpg'), x: 0, y: 0, w: W, h: H, sizing: { type: 'cover', w: W, h: H } });
  s.addShape(p.ShapeType.rect, { x: 0, y: 0, w: W, h: H, fill: { color: NAVY, transparency: 18 }, line: { color: NAVY, transparency: 100 } });
  s.addImage({ path: IMG('logo-white.png'), x: (W - 3.2) / 2, y: 1.2, w: 3.2, h: 1.26 });
  s.addText('You’re ready!', { x: 0, y: 2.9, w: W, h: 1.0, fontFace: F, fontSize: 44, bold: true, color: 'FFFFFF', align: 'center' });
  s.addShape(p.ShapeType.rect, { x: (W - 1.4) / 2, y: 3.95, w: 1.4, h: 0.08, fill: { color: ORANGE }, line: { color: ORANGE } });
  s.addText('Questions? Ask your REC, or use the Feedback button in the Hub.', { x: 1, y: 4.25, w: W - 2, h: 0.6, fontFace: F, fontSize: 18, color: 'DCEBF7', align: 'center' });
  s.addText('theharbourocc.com', { x: 0, y: 6.6, w: W, h: 0.4, fontFace: F, fontSize: 13, bold: true, color: ORANGE, align: 'center' });
  notes(s, 'That completes your ResLife Hub and Creative Studio training. You are ready to go. If you have questions, ask your REC, or use the Feedback button in the Hub. Thank you for everything you do for our residents at The Harbour.');
}

const out = process.argv[2];
p.writeFile({ fileName: out }).then(f => console.log('wrote', f, 'slides', n));
