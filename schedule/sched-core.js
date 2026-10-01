/* Schedule & On-Call — core UI (loaded by reslife_hub.html after its main script).
   Uses the Hub globals: apiFetch, esc, currentProperty, me, isManager, goToTab, ROLE_LABELS. */
(function () {
  const S = window.SchedUI = { view: 'overview', cal: 'month', anchor: new Date(), settings: null, staff: [], shifts: [], filters: { user: '', type: '', status: '' } };
  const API = '/reslife-schedule';
  const p = () => '?property=' + encodeURIComponent(currentProperty);
  S.get = (res, extra) => apiFetch(API + p() + '&resource=' + res + (extra || ''));
  S.send = (method, res, data) => apiFetch(API, { method, body: JSON.stringify(Object.assign({ property: currentProperty, resource: res }, data || {})) });
  S.del = (res, id) => apiFetch(API + p() + '&resource=' + res + '&id=' + encodeURIComponent(id), { method: 'DELETE' });

  // ── Formatting helpers ──
  const pad = n => String(n).padStart(2, '0');
  S.key = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  S.t12 = hhmm => { if (!hhmm) return ''; const [h, m] = hhmm.split(':').map(Number); return `${(h % 12) || 12}${m ? ':' + pad(m) : ''} ${h < 12 ? 'AM' : 'PM'}`; };
  S.dLong = ds => new Date(ds + 'T12:00').toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
  S.dShort = ds => new Date(ds + 'T12:00').toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  S.atTime = iso => new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  S.atDay = iso => new Date(iso).toLocaleDateString([], { weekday: 'long' });
  S.name = u => { if (!u) return ''; const s = S.staff.find(x => x.username === u); return s ? s.name : u; };
  S.initials = n => String(n || '?').split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
  S.range = s => `${S.t12(s.start)} – ${S.t12(s.end)}${s.crossesMidnight ? ' (next day)' : ''}`;
  // Status badges always pair an icon with text (never color alone).
  const STATUS = { assigned: ['✓', 'Assigned'], open: ['○', 'Open'], swap_requested: ['⇄', 'Swap requested'], pending: ['⏳', 'Pending approval'], completed: ['✔', 'Completed'], cancelled: ['✕', 'Cancelled'] };
  S.badge = (st, extra) => { const [i, l] = STATUS[st] || ['•', st]; return `<span class="sc-badge st-${esc(st)}">${i} ${l}${extra || ''}</span>`; };
  S.typeChip = t => `<span class="sc-type" style="--tc:var(--sc-${esc(t.color || 'slate')})">${esc(t.name)}</span>`;

  // ── Shell ──
  const TABS = [['overview', 'Overview'], ['mine', 'My Schedule'], ['team', 'Team Schedule'], ['open', 'Open Shifts'], ['availability', 'Availability'], ['requests', 'Shift Requests'], ['history', 'History']];
  const MGR_TABS = [['builder', 'Schedule Builder'], ['staff', 'Staff'], ['settings', 'Settings']];

  S.load = async function () {
    const root = document.getElementById('schedRoot');
    if (!root) return;
    if (!S.shell) {
      root.innerHTML = `
        <div class="sc-head"><div><h2>Schedule &amp; On-Call</h2><p>Duty rotation, coverage, swaps and who’s on call — all in one place.</p></div><div class="sc-head-actions" id="scHeadActions"></div></div>
        <nav class="sc-tabs" id="scTabs"></nav>
        <div id="scBody"><div class="rl-loading">Loading schedule…</div></div>
        <div class="pp-overlay" id="scModal"><div class="pp-modal sc-modal"><div class="pp-head"><div class="pp-head-ico" id="scModalIco">&#128197;</div><div><h3 id="scModalTitle"></h3><p id="scModalSub"></p></div><button type="button" class="pp-close" id="scModalClose">&times;</button></div><div class="sc-modal-body" id="scModalBody"></div></div></div>`;
      document.getElementById('scModalClose').onclick = S.closeModal;
      document.getElementById('scModal').addEventListener('mousedown', e => { if (e.target.id === 'scModal') S.closeModal(); });
      S.shell = true;
    }
    try { [S.settings, S.staff] = await Promise.all([S.get('settings'), S.get('staff')]); }
    catch (e) { document.getElementById('scBody').innerHTML = `<div class="rl-empty">Couldn’t load the schedule: ${esc(e.message)}</div>`; return; }
    S.mgr = !!S.settings.canManage && isManager;
    const tabs = TABS.concat(S.mgr ? MGR_TABS : []);
    document.getElementById('scTabs').innerHTML = tabs.map(([k, l]) => `<button type="button" data-sc-tab="${k}" class="${S.view === k ? 'on' : ''}">${l}</button>`).join('');
    document.querySelectorAll('[data-sc-tab]').forEach(b => b.onclick = () => S.go(b.getAttribute('data-sc-tab')));
    document.getElementById('scHeadActions').innerHTML = S.mgr ? `<button class="rl-btn" data-sc-go="builder">Schedule Builder</button><button class="rl-btn primary" id="scQuickAdd">+ Add Shifts</button>` : '';
    const qa = document.getElementById('scQuickAdd'); if (qa) qa.onclick = () => S.go('builder');
    document.querySelectorAll('[data-sc-go]').forEach(b => b.onclick = () => S.go(b.getAttribute('data-sc-go')));
    if (!tabs.some(t => t[0] === S.view)) S.view = 'overview';
    S.go(S.view);
  };

  S.go = async function (view) {
    S.view = view;
    document.querySelectorAll('[data-sc-tab]').forEach(b => b.classList.toggle('on', b.getAttribute('data-sc-tab') === view));
    const body = document.getElementById('scBody');
    body.innerHTML = '<div class="rl-loading">Loading…</div>';
    try { await (S.views[view] || S.views.overview)(body); }
    catch (e) { body.innerHTML = `<div class="rl-empty">Something went wrong: ${esc(e.message)}</div>`; }
  };
  S.views = {};

  S.openModal = (title, sub, html, ico) => {
    document.getElementById('scModalTitle').textContent = title;
    document.getElementById('scModalSub').textContent = sub || '';
    document.getElementById('scModalIco').innerHTML = ico || '&#128197;';
    document.getElementById('scModalBody').innerHTML = html;
    document.getElementById('scModal').classList.add('show');
    return document.getElementById('scModalBody');
  };
  S.closeModal = () => document.getElementById('scModal').classList.remove('show');
  S.err = e => alert(e.message || e);

  // ── Reusable "Currently on call" component (also used on the Hub dashboard) ──
  S.onCallCard = function (ov, compact) {
    const now = ov.onCallNow || [];
    if (!now.length) return `<div class="sc-oncall empty"><div class="sc-oc-label">On call now</div><div class="sc-oc-none">No one is scheduled on call right now.${ov.emergencyContact ? `<br><b>${esc(ov.emergencyContact)}</b>` : ''}</div></div>`;
    const primary = now[0];
    const chain = now.slice(1);
    return `<div class="sc-oncall">
      <div class="sc-oc-label"><span class="sc-live"></span>On call now</div>
      <div class="sc-oc-main">
        <div class="sc-oc-av">${esc(S.initials(primary.name || '?'))}</div>
        <div><b>${esc(primary.name || 'Open — not covered')}</b><span>${esc(primary.title || primary.typeName)}</span><em>${esc(primary.typeName)} · until ${S.atTime(primary.endAt)}</em></div>
      </div>
      ${compact ? '' : `
      <div class="sc-oc-contacts">
        ${ov.dutyPhone ? `<a href="tel:${esc(ov.dutyPhone.replace(/[^\d+]/g, ''))}">&#9742; Duty phone: <b>${esc(ov.dutyPhone)}</b></a>` : ''}
        ${primary.phone ? `<a href="tel:${esc(primary.phone.replace(/[^\d+]/g, ''))}">&#128241; ${esc(primary.phone)}</a>` : ''}
      </div>
      ${primary.backup || chain.length ? `<div class="sc-oc-chain"><div class="sc-oc-chain-h">Escalation</div>${primary.backup ? `<div><span>Backup</span><b>${esc(primary.backup)}</b></div>` : ''}${chain.map(c => `<div><span>${esc(c.typeName)}</span><b>${esc(c.name || 'Open')}</b>${c.phone ? ` · <a href="tel:${esc(c.phone.replace(/[^\d+]/g, ''))}">${esc(c.phone)}</a>` : ''}</div>`).join('')}${ov.emergencyContact ? `<div><span>Emergency</span><b>${esc(ov.emergencyContact)}</b></div>` : ''}</div>` : ''}
      <button class="rl-btn sm" data-sc-shift="${esc(primary.id)}">View details</button>`}
    </div>`;
  };

  // ── Overview ──
  S.views.overview = async function (body) {
    const ov = await S.get('overview');
    S.lastOverview = ov;
    const my = ov.myNext[0];
    body.innerHTML = `
      ${ov.myConfirm && !ov.myConfirm.confirmed ? `<div class="sc-banner"><div><b>Your schedule for ${S.dShort(ov.myConfirm.from)} – ${S.dShort(ov.myConfirm.to)} has been published.</b><span>Please review your shifts and confirm.</span></div><div style="display:flex;gap:8px"><button class="rl-btn" data-sc-go="mine">Review schedule</button><button class="rl-btn primary" id="scConfirm">I have reviewed my schedule</button></div></div>` : ''}
      <div class="sc-grid">
        ${S.onCallCard(ov)}
        <div class="sc-card">
          <div class="sc-card-h">Next on call</div>
          ${ov.nextOnCall ? `<div class="sc-big">${esc(ov.nextOnCall.open ? 'Open — needs coverage' : ov.nextOnCall.name)}</div><div class="sc-sub">${S.atDay(ov.nextOnCall.startAt)} · ${S.atTime(ov.nextOnCall.startAt)} – ${S.atTime(ov.nextOnCall.endAt)}</div>` : '<div class="sc-sub">No upcoming on-call shifts published yet.</div>'}
        </div>
        <div class="sc-card accent">
          <div class="sc-card-h">My next shift</div>
          ${my ? `<div class="sc-big">${S.atDay(my.startAt)}</div><div class="sc-sub">${esc(my.type.name)}${my.asBackup ? ' (backup)' : ''} · ${S.range(my)}</div><button class="rl-btn sm" data-sc-shift="${my.id}">Details</button>` : '<div class="sc-sub">You have no upcoming shifts.</div><button class="rl-btn sm" data-sc-go="open">Browse open shifts</button>'}
        </div>
        <div class="sc-card">
          <div class="sc-card-h">Schedule status</div>
          <ul class="sc-status">
            <li>${ov.publishedThrough ? `✓ Published through <b>${S.dShort(ov.publishedThrough)}</b>` : '○ <b>No schedule published yet</b>'}</li>
            <li><a href="#" data-sc-go="open">${ov.openCount} open shift${ov.openCount === 1 ? '' : 's'}</a></li>
            <li><a href="#" data-sc-go="requests">${ov.pendingRequests} pending ${S.mgr ? 'approval' : 'request'}${ov.pendingRequests === 1 ? '' : 's'}</a></li>
            ${S.mgr && ov.pendingTimeOff ? `<li><a href="#" data-sc-go="availability">${ov.pendingTimeOff} time-off request${ov.pendingTimeOff === 1 ? '' : 's'}</a></li>` : ''}
            ${S.mgr && ov.coverageGaps ? `<li class="warn">⚠ ${ov.coverageGaps} uncovered shift${ov.coverageGaps === 1 ? '' : 's'} in the next 31 days</li>` : ''}
            ${S.mgr && ov.confirmations ? `<li>Confirmations: <b>${ov.confirmations.confirmed} / ${ov.confirmations.total}</b>${ov.confirmations.missing.length ? `<small> · waiting on ${esc(ov.confirmations.missing.slice(0, 4).join(', '))}${ov.confirmations.missing.length > 4 ? '…' : ''}</small>` : ''}</li>` : ''}
          </ul>
        </div>
      </div>
      <div class="sc-section-h"><h3>My upcoming shifts</h3><a href="#" data-sc-go="mine">See all</a></div>
      <div class="sc-list">${ov.myNext.length ? ov.myNext.map(S.shiftRow).join('') : '<div class="rl-empty">No upcoming shifts. When your manager publishes the schedule, your shifts show up here.</div>'}</div>`;
    S.bind(body);
    const c = document.getElementById('scConfirm');
    if (c) c.onclick = async () => { try { await S.send('POST', 'confirm', { publicationId: ov.myConfirm.publicationId }); S.go('overview'); } catch (e) { S.err(e); } };
  };

  // Row used by list views (mobile-first)
  S.shiftRow = function (s, extra) {
    const mine = s.assignedUser === me.username || s.backupUser === me.username;
    return `<div class="sc-row${mine ? ' mine' : ''}" data-sc-shift="${s.id}" style="--tc:var(--sc-${esc(s.type.color || 'slate')})">
      <div class="sc-row-date"><b>${new Date(s.date + 'T12:00').getDate()}</b><span>${new Date(s.date + 'T12:00').toLocaleDateString([], { weekday: 'short' })}</span></div>
      <div class="sc-row-main">
        <div class="sc-row-top">${S.typeChip(s.type)} ${S.badge(s.status)} ${s.published ? '' : '<span class="sc-badge st-draft">✎ Draft</span>'}</div>
        <div class="sc-row-who"><b>${esc(s.assignedUser ? S.name(s.assignedUser) : 'Open shift')}</b>${s.backupUser ? `<span>Backup: ${esc(S.name(s.backupUser))}</span>` : ''}</div>
        <div class="sc-row-time">${S.dShort(s.date)} · ${S.range(s)}${s.location ? ' · ' + esc(s.location) : ''}</div>${extra || ''}
      </div>
      <div class="sc-row-go">›</div>
    </div>`;
  };

  // Common click bindings
  S.bind = function (root) {
    root.querySelectorAll('[data-sc-go]').forEach(b => b.onclick = e => { e.preventDefault(); S.go(b.getAttribute('data-sc-go')); });
    root.querySelectorAll('[data-sc-shift]').forEach(b => b.onclick = e => { if (e.target.closest('button:not([data-sc-shift])')) return; S.openShift(b.getAttribute('data-sc-shift')); });
  };

  // ── My Schedule ──
  S.views.mine = async function (body) {
    const from = S.key(new Date()), to = S.key(new Date(Date.now() + 90 * 864e5));
    const shifts = await S.get('shifts', `&from=${from}&to=${to}&user=${encodeURIComponent(me.username)}`);
    const upcoming = shifts.filter(s => new Date(s.endAt) > new Date());
    const ics = upcoming.length ? `<button class="rl-btn sm" id="scMyIcs">&#128197; Add to my calendar (.ics)</button>` : '';
    body.innerHTML = `<div class="sc-section-h"><h3>My upcoming shifts</h3>${ics}</div>
      <div class="sc-list">${upcoming.length ? upcoming.map(S.shiftRow).join('') : '<div class="rl-empty"><b>No shifts scheduled</b><br>Your manager hasn’t published shifts for you yet. Check Open Shifts to pick one up.</div>'}</div>`;
    S.bind(body);
    const b = document.getElementById('scMyIcs'); if (b) b.onclick = () => S.downloadIcs(upcoming, 'my-duty-schedule');
  };

  // ── Team Schedule: month / week / list ──
  S.views.team = async function (body) {
    const a = S.anchor;
    let from, to, label;
    if (S.cal === 'month') { const f = new Date(a.getFullYear(), a.getMonth(), 1); from = new Date(f); from.setDate(1 - f.getDay()); to = new Date(from); to.setDate(from.getDate() + 41); label = f.toLocaleDateString([], { month: 'long', year: 'numeric' }); }
    else if (S.cal === 'week') { from = new Date(a); from.setDate(a.getDate() - a.getDay()); to = new Date(from); to.setDate(from.getDate() + 6); label = `${from.toLocaleDateString([], { month: 'short', day: 'numeric' })} – ${to.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}`; }
    else { from = new Date(a); to = new Date(a); to.setDate(a.getDate() + 27); label = `${from.toLocaleDateString([], { month: 'short', day: 'numeric' })} – ${to.toLocaleDateString([], { month: 'short', day: 'numeric' })}`; }
    const f = S.filters;
    const shifts = await S.get('shifts', `&from=${S.key(from)}&to=${S.key(to)}${f.user ? '&user=' + encodeURIComponent(f.user) : ''}${f.type ? '&type=' + encodeURIComponent(f.type) : ''}${f.status ? '&status=' + f.status : ''}`);
    S.shifts = shifts;
    const weekendOnly = f.weekend;
    const list = weekendOnly ? shifts.filter(s => [5, 6].includes(new Date(s.date + 'T12:00').getDay())) : shifts;
    body.innerHTML = `
      <div class="sc-toolbar">
        <div class="pp-viewtoggle" style="margin-left:0">${['month', 'week', 'list'].map(v => `<button type="button" class="${S.cal === v ? 'active' : ''}" data-sc-cal="${v}">${v[0].toUpperCase() + v.slice(1)}</button>`).join('')}</div>
        <div class="sc-nav"><button class="rl-btn sm" data-sc-nav="-1">&larr;</button><b>${label}</b><button class="rl-btn sm" data-sc-nav="1">&rarr;</button><button class="rl-btn sm" data-sc-nav="0">Today</button></div>
        <div class="sc-filters">
          <select id="scFUser"><option value="">All staff</option>${S.staff.map(u => `<option value="${esc(u.username)}"${f.user === u.username ? ' selected' : ''}>${esc(u.name)}</option>`).join('')}</select>
          <select id="scFType"><option value="">All shift types</option>${S.settings.shiftTypes.map(t => `<option value="${esc(t.id)}"${f.type === t.id ? ' selected' : ''}>${esc(t.name)}</option>`).join('')}</select>
          <select id="scFStatus"><option value="">Any status</option>${['open', 'assigned', 'swap_requested', 'pending'].map(s => `<option value="${s}"${f.status === s ? ' selected' : ''}>${s.replace('_', ' ')}</option>`).join('')}</select>
          <label class="sc-check"><input type="checkbox" id="scFWeekend"${weekendOnly ? ' checked' : ''}> Weekends</label>
        </div>
        ${S.mgr ? `<div class="sc-export"><button class="rl-btn sm" id="scCsv">CSV</button><button class="rl-btn sm" id="scPrint">Print</button><button class="rl-btn sm" id="scIcs">Calendar</button></div>` : ''}
      </div>
      <div class="sc-legend">${S.settings.shiftTypes.map(S.typeChip).join('')}${S.mgr ? '<span class="sc-badge st-draft">✎ Draft (not visible to staff)</span>' : ''}</div>
      <div id="scCal"></div>`;
    const cal = document.getElementById('scCal');
    if (S.cal === 'list' || window.innerWidth < 760) S.renderList(cal, list);
    else if (S.cal === 'week') S.renderWeek(cal, list, from);
    else S.renderMonth(cal, list, from, a.getMonth());
    body.querySelectorAll('[data-sc-cal]').forEach(b => b.onclick = () => { S.cal = b.getAttribute('data-sc-cal'); S.go('team'); });
    body.querySelectorAll('[data-sc-nav]').forEach(b => b.onclick = () => {
      const n = +b.getAttribute('data-sc-nav');
      if (!n) S.anchor = new Date();
      else if (S.cal === 'month') S.anchor = new Date(a.getFullYear(), a.getMonth() + n, 1);
      else S.anchor = new Date(a.getTime() + n * (S.cal === 'week' ? 7 : 28) * 864e5);
      S.go('team');
    });
    document.getElementById('scFUser').onchange = e => { f.user = e.target.value; S.go('team'); };
    document.getElementById('scFType').onchange = e => { f.type = e.target.value; S.go('team'); };
    document.getElementById('scFStatus').onchange = e => { f.status = e.target.value; S.go('team'); };
    document.getElementById('scFWeekend').onchange = e => { f.weekend = e.target.checked; S.go('team'); };
    if (S.mgr) {
      document.getElementById('scCsv').onclick = () => S.exportCsv(list, label);
      document.getElementById('scPrint').onclick = () => S.print(list, label);
      document.getElementById('scIcs').onclick = () => S.downloadIcs(list.filter(s => s.published), 'duty-schedule');
    }
  };

  S.renderList = function (el, shifts) {
    if (!shifts.length) { el.innerHTML = '<div class="rl-empty"><b>Nothing scheduled</b><br>No shifts match this range and filter.</div>'; return; }
    const byDay = {};
    shifts.forEach(s => (byDay[s.date] = byDay[s.date] || []).push(s));
    el.innerHTML = Object.keys(byDay).sort().map(d => `<div class="sc-day-h">${S.dLong(d)}</div><div class="sc-list">${byDay[d].map(S.shiftRow).join('')}</div>`).join('');
    S.bind(el);
  };

  S.renderMonth = function (el, shifts, start, month) {
    const today = S.key(new Date());
    let cells = '';
    for (let i = 0; i < 42; i++) {
      const d = new Date(start); d.setDate(start.getDate() + i);
      if (i >= 35 && d.getMonth() !== month) break;
      const k = S.key(d);
      const items = shifts.filter(s => s.date === k).sort((a, b) => (a.type.level || 9) - (b.type.level || 9));
      cells += `<div class="sc-mday${d.getMonth() !== month ? ' out' : ''}${k === today ? ' today' : ''}" data-sc-day="${k}">
        <span class="sc-mnum">${d.getDate()}</span>
        ${items.map(s => `<button type="button" class="sc-mshift st-${esc(s.status)}${s.published ? '' : ' draft'}" data-sc-shift="${s.id}" draggable="${S.mgr}" data-sc-drag="${s.id}" style="--tc:var(--sc-${esc(s.type.color)})" title="${esc(s.type.name)} · ${esc(S.range(s))} · ${esc(S.name(s.assignedUser) || 'Open')}"><i>${esc(s.type.name.split(' ').map(w => w[0]).join(''))}</i>${esc(s.assignedUser ? S.name(s.assignedUser).split(' ')[0] : 'OPEN')}${s.backupUser ? `<small>+${esc(S.name(s.backupUser).split(' ')[0])}</small>` : ''}</button>`).join('')}
        ${S.mgr ? `<button type="button" class="sc-madd" data-sc-addday="${k}" title="Add shift">+</button>` : ''}
      </div>`;
    }
    el.innerHTML = `<div class="sc-month">${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => `<div class="sc-dow">${d}</div>`).join('')}${cells}</div>`;
    S.bind(el); S.bindDrag(el);
    el.querySelectorAll('[data-sc-addday]').forEach(b => b.onclick = e => { e.stopPropagation(); S.builderPreset = { from: b.getAttribute('data-sc-addday'), to: b.getAttribute('data-sc-addday'), repeat: 'daily' }; S.go('builder'); });
  };

  S.renderWeek = function (el, shifts, start) {
    const today = S.key(new Date());
    let cols = '';
    for (let i = 0; i < 7; i++) {
      const d = new Date(start); d.setDate(start.getDate() + i); const k = S.key(d);
      const items = shifts.filter(s => s.date === k).sort((a, b) => a.start.localeCompare(b.start));
      cols += `<div class="sc-wcol${k === today ? ' today' : ''}" data-sc-day="${k}"><div class="sc-wh"><span>${d.toLocaleDateString([], { weekday: 'short' })}</span><b>${d.getDate()}</b></div>
        ${items.map(s => `<div class="sc-wshift st-${esc(s.status)}${s.published ? '' : ' draft'}" data-sc-shift="${s.id}" draggable="${S.mgr}" data-sc-drag="${s.id}" style="--tc:var(--sc-${esc(s.type.color)})"><b>${esc(s.type.name)}</b><span>${S.range(s)}</span><em>${esc(s.assignedUser ? S.name(s.assignedUser) : 'Open shift')}</em>${s.backupUser ? `<small>Backup: ${esc(S.name(s.backupUser))}</small>` : ''}${s.request ? '<small>⇄ request pending</small>' : ''}</div>`).join('') || '<div class="sc-wnone">—</div>'}
        ${S.mgr ? `<button type="button" class="sc-wadd" data-sc-addday="${k}">+ Add</button>` : ''}</div>`;
    }
    el.innerHTML = `<div class="sc-week">${cols}</div>${S.mgr ? '<p class="sc-hint">Tip: drag a shift to another day to move it.</p>' : ''}`;
    S.bind(el); S.bindDrag(el);
    el.querySelectorAll('[data-sc-addday]').forEach(b => b.onclick = e => { e.stopPropagation(); S.builderPreset = { from: b.getAttribute('data-sc-addday'), to: b.getAttribute('data-sc-addday'), repeat: 'daily' }; S.go('builder'); });
  };

  // Managers: drag a shift onto another day to move it (keeps its times).
  S.bindDrag = function (el) {
    if (!S.mgr) return;
    el.querySelectorAll('[data-sc-drag]').forEach(n => n.addEventListener('dragstart', e => { e.dataTransfer.setData('text/plain', n.getAttribute('data-sc-drag')); }));
    el.querySelectorAll('[data-sc-day]').forEach(day => {
      day.addEventListener('dragover', e => { e.preventDefault(); day.classList.add('drop'); });
      day.addEventListener('dragleave', () => day.classList.remove('drop'));
      day.addEventListener('drop', async e => {
        e.preventDefault(); day.classList.remove('drop');
        const id = e.dataTransfer.getData('text/plain'); const s = S.shifts.find(x => x.id === id); const date = day.getAttribute('data-sc-day');
        if (!s || s.date === date) return;
        if (s.published && !confirm(`Move this published ${s.type.name} shift from ${S.dShort(s.date)} to ${S.dShort(date)}? Assigned staff will be notified.`)) return;
        await S.saveShift({ id, date });
        S.go('team');
      });
    });
  };

  // Save a shift; if the server returns conflicts, ask for a manager override.
  S.saveShift = async function (data) {
    try { return await S.send('PUT', 'shift', data); }
    catch (e) {
      let warnings = null; try { warnings = JSON.parse(e.message).warnings; } catch (x) {}
      if (warnings && confirm('⚠ Scheduling conflict:\n\n• ' + warnings.join('\n• ') + '\n\nAssign anyway (manager override)?')) return S.send('PUT', 'shift', Object.assign({ override: true }, data));
      if (!warnings) S.err(e);
      return null;
    }
  };

  // ── Shift detail panel ──
  S.openShift = async function (id) {
    const body = S.openModal('Loading…', '', '<div class="rl-loading">Loading shift…</div>');
    let s; try { s = await S.get('shift', '&id=' + encodeURIComponent(id)); } catch (e) { body.innerHTML = `<div class="rl-empty">${esc(e.message)}</div>`; return; }
    document.getElementById('scModalTitle').textContent = s.type.name;
    document.getElementById('scModalSub').textContent = `${S.dLong(s.date)} · ${S.range(s)}`;
    const mine = s.assignedUser === me.username;
    const future = new Date(s.startAt) > new Date();
    const active = (s.requests || []).find(r => ['open', 'pending_approval'].includes(r.status));
    const dl = s.dutyLog || { status: 'Not Started' };
    body.innerHTML = `
      <div class="sc-detail-top">${S.typeChip(s.type)} ${S.badge(s.status)} ${s.published ? '' : '<span class="sc-badge st-draft">✎ Draft</span>'}</div>
      <dl class="sc-dl">
        <dt>Date</dt><dd>${S.dLong(s.date)}</dd>
        <dt>Time</dt><dd>${S.range(s)}</dd>
        <dt>Assigned</dt><dd>${esc(s.assignedUser ? S.name(s.assignedUser) : 'Open — not covered')}</dd>
        <dt>Backup</dt><dd>${esc(s.backupUser ? S.name(s.backupUser) : '—')}</dd>
        ${s.dutyPhone ? `<dt>Duty phone</dt><dd><a href="tel:${esc(s.dutyPhone.replace(/[^\d+]/g, ''))}">${esc(s.dutyPhone)}</a></dd>` : ''}
        ${s.location ? `<dt>Location</dt><dd>${esc(s.location)}</dd>` : ''}
        ${s.notes ? `<dt>Notes</dt><dd>${esc(s.notes)}</dd>` : ''}
        ${s.type.instructions ? `<dt>Instructions</dt><dd>${esc(s.type.instructions)}</dd>` : ''}
        ${s.type.level === 1 ? `<dt>Duty Log</dt><dd><span class="sc-dlog ${dl.status.replace(' ', '-').toLowerCase()}">${dl.status === 'Submitted' ? '✔' : dl.status === 'In Progress' ? '✎' : '○'} ${dl.status}</span>${dl.entries ? ` · ${dl.entries} entr${dl.entries === 1 ? 'y' : 'ies'}` : ''}</dd>` : ''}
      </dl>
      ${active ? `<div class="sc-note">⇄ ${active.type === 'giveaway' ? 'Offered to the team' : active.type === 'swap' ? 'Swap requested with ' + esc(S.name(active.to)) : 'Pickup requested'} · ${active.status === 'pending_approval' ? 'waiting for manager approval' : 'waiting for someone to accept'}.${S.settings.giveawayKeepsResponsible ? ' <b>The original staff member stays responsible until approved.</b>' : ''}</div>` : ''}
      <div class="sc-actions">
        ${s.type.level === 1 && (mine || S.mgr) ? `<button class="rl-btn primary" id="scDutyLog">${dl.status === 'Submitted' ? 'View Duty Log' : dl.status === 'In Progress' ? 'Continue Duty Log' : 'Start Duty Log'}</button>` : ''}
        ${mine && future && s.published && !active ? `<button class="rl-btn" id="scOffer">Offer shift</button><button class="rl-btn" id="scSwap">Request swap</button>` : ''}
        ${!mine && s.status === 'open' && s.published && future ? `<button class="rl-btn primary" id="scPickup">Pick up shift</button>` : ''}
        ${active && active.type === 'giveaway' && active.status === 'open' && !mine && future ? `<button class="rl-btn primary" id="scTake">Take this shift</button>` : ''}
        ${active && active.status === 'open' && active.type === 'swap' && active.to === me.username ? `<button class="rl-btn primary" data-sc-req="${active._id}" data-act="accept">Accept swap</button>` : ''}
        ${S.mgr && active && active.status === 'pending_approval' ? `<button class="rl-btn primary" data-sc-req="${active._id}" data-act="approve">Approve</button><button class="rl-btn" data-sc-req="${active._id}" data-act="deny">Deny</button>` : ''}
        ${(mine || s.backupUser === me.username || S.mgr) && !future ? `<button class="rl-btn" id="scHandoff">Add handoff note</button>` : ''}
        ${S.mgr ? `<button class="rl-btn" id="scAssign">Assign staff</button><button class="rl-btn" id="scEdit">Edit</button><button class="rl-btn danger" id="scDelete">${s.published ? 'Cancel shift' : 'Delete'}</button>` : ''}
      </div>
      ${(s.handoffs || []).length ? `<div class="sc-sub-h">Shift handoff notes</div>${s.handoffs.map(h => `<div class="sc-handoff"><b>${esc(S.name(h.from))}${h.to ? ' → ' + esc(S.name(h.to)) : ''}</b><span>${new Date(h.createdAt).toLocaleString()}</span><p>${esc(h.notes)}</p></div>`).join('')}<p class="sc-hint">Handoff notes are informal. Official incidents still go in the Incident Report / Duty Log.</p>` : ''}
      ${S.mgr && (s.audit || []).length ? `<details class="sc-audit"><summary>Change history (${s.audit.length})</summary>${s.audit.map(a => `<div><span>${new Date(a.at).toLocaleString()}</span> <b>${esc(a.by)}</b> ${esc(a.action.replace(/_/g, ' '))}${a.details && a.details.from !== undefined ? ` — ${esc(S.name(a.details.from) || 'open')} → ${esc(S.name(a.details.to) || 'open')}` : ''}${a.details && a.details.override ? ' <em>(override)</em>' : ''}</div>`).join('')}</details>` : ''}`;
    const $ = id => document.getElementById(id);
    if ($('scDutyLog')) $('scDutyLog').onclick = () => { S.closeModal(); goToTab('dutylog'); };
    if ($('scOffer')) $('scOffer').onclick = async () => { const reason = prompt('Offer this shift to the team.\nReason (optional):'); if (reason === null) return; try { await S.send('POST', 'requests', { type: 'giveaway', shiftId: s.id, reason }); S.closeModal(); S.go(S.view); } catch (e) { S.err(e); } };
    if ($('scSwap')) $('scSwap').onclick = () => S.swapPicker(s);
    if ($('scPickup')) $('scPickup').onclick = async () => { try { const r = await S.send('POST', 'requests', { type: 'pickup', shiftId: s.id }); alert(r.status === 'approved' ? 'The shift is yours!' : 'Requested — a manager will approve it.'); S.closeModal(); S.go(S.view); } catch (e) { S.err(e); } };
    if ($('scTake')) $('scTake').onclick = async () => { try { const r = await S.send('POST', 'requests', { type: 'pickup', shiftId: s.id }); alert(r.status === 'approved' ? 'The shift is yours!' : 'Accepted — waiting for manager approval.'); S.closeModal(); S.go(S.view); } catch (e) { S.err(e); } };
    body.querySelectorAll('[data-sc-req]').forEach(b => b.onclick = async () => { const act = b.getAttribute('data-act'); const comment = act === 'deny' ? prompt('Reason (optional):') || '' : ''; try { await S.send('PUT', 'requests', { id: b.getAttribute('data-sc-req'), action: act, comment }); S.closeModal(); S.go(S.view); } catch (e) { S.err(e); } });
    if ($('scHandoff')) $('scHandoff').onclick = async () => { const notes = prompt('Handoff note for the next person on duty (not for official incident documentation):'); if (!notes) return; try { await S.send('POST', 'handoff', { shiftId: s.id, notes }); S.openShift(s.id); } catch (e) { S.err(e); } };
    if ($('scAssign')) $('scAssign').onclick = () => S.assignPanel(s);
    if ($('scEdit')) $('scEdit').onclick = () => S.editPanel(s);
    if ($('scDelete')) $('scDelete').onclick = async () => {
      if (!confirm(s.published ? `Cancel this published ${s.type.name} shift on ${S.dShort(s.date)}?${s.assignedUser ? ' ' + S.name(s.assignedUser) + ' will be notified.' : ''}` : 'Delete this draft shift?')) return;
      try { await S.del('shift', s.id); S.closeModal(); S.go(S.view); } catch (e) { S.err(e); }
    };
  };

  S.swapPicker = function (s) {
    const body = S.openModal('Request a swap', `${s.type.name} · ${S.dShort(s.date)}`, `
      <p class="sc-hint">Pick a teammate to ask. They’ll get a notification, and once they accept${S.settings.swapNeedsApproval ? ', a manager approves it' : ''}.</p>
      <select id="scSwapTo" class="sc-input">${S.staff.filter(u => u.username !== me.username && u.active).map(u => `<option value="${esc(u.username)}">${esc(u.name)} — ${esc(u.title)}</option>`).join('')}</select>
      <textarea id="scSwapWhy" class="sc-input" rows="3" placeholder="Message / reason (optional)"></textarea>
      <div class="sc-actions"><button class="rl-btn primary" id="scSwapGo">Send request</button></div>`, '&#8644;');
    body.querySelector('#scSwapGo').onclick = async () => { try { await S.send('POST', 'requests', { type: 'swap', shiftId: s.id, to: body.querySelector('#scSwapTo').value, reason: body.querySelector('#scSwapWhy').value }); S.closeModal(); S.go(S.view); } catch (e) { S.err(e); } };
  };

  // Assignment interface: available / unavailable / conflict, with override.
  S.assignPanel = async function (s) {
    const body = S.openModal('Assign staff', `${s.type.name} · ${S.dShort(s.date)} · ${S.range(s)}`, '<div class="rl-loading">Checking availability…</div>', '&#128100;');
    let c; try { c = await S.get('candidates', '&id=' + encodeURIComponent(s.id)); } catch (e) { body.innerHTML = esc(e.message); return; }
    const grp = { ok: c.filter(x => x.eligible && x.availability !== 'unavailable' && !x.conflict), un: c.filter(x => x.eligible && x.availability === 'unavailable' && !x.conflict), cf: c.filter(x => x.conflict), ne: c.filter(x => !x.eligible && !x.conflict) };
    const row = x => `<div class="sc-cand"><div><b>${esc(x.name)}</b><span>${esc(x.title)}</span>${x.availability === 'preferred' ? '<em class="ok">★ Prefers this</em>' : ''}${x.reason && x.availability === 'unavailable' ? `<em class="warn">⚠ ${esc(x.reason)}</em>` : ''}${x.conflict ? `<em class="warn">⚠ ${esc(x.conflict)}</em>` : ''}${x.eligibilityNote ? `<em class="warn">⚠ ${esc(x.eligibilityNote)}</em>` : ''}</div>
      <div class="sc-cand-btns"><button class="rl-btn sm${x.username === s.assignedUser ? ' primary' : ''}" data-as="assignedUser" data-u="${esc(x.username)}">${x.username === s.assignedUser ? '✓ Primary' : 'Primary'}</button><button class="rl-btn sm${x.username === s.backupUser ? ' primary' : ''}" data-as="backupUser" data-u="${esc(x.username)}">${x.username === s.backupUser ? '✓ Backup' : 'Backup'}</button></div></div>`;
    body.innerHTML = `
      ${grp.ok.length ? `<div class="sc-sub-h ok">✓ Available (${grp.ok.length})</div>${grp.ok.map(row).join('')}` : ''}
      ${grp.un.length ? `<div class="sc-sub-h warn">⚠ Unavailable (${grp.un.length})</div>${grp.un.map(row).join('')}` : ''}
      ${grp.cf.length ? `<div class="sc-sub-h warn">⚠ Schedule conflict (${grp.cf.length})</div>${grp.cf.map(row).join('')}` : ''}
      ${grp.ne.length ? `<div class="sc-sub-h">Not eligible for this shift type (${grp.ne.length})</div>${grp.ne.map(row).join('')}` : ''}
      ${!c.length ? '<div class="rl-empty">No staff on this property yet. Add users in Manage Users.</div>' : ''}
      <div class="sc-actions">${s.assignedUser ? '<button class="rl-btn danger" id="scUnassign">Remove assignment (leave open)</button>' : ''}${s.backupUser ? '<button class="rl-btn" id="scUnbackup">Remove backup</button>' : ''}</div>`;
    body.querySelectorAll('[data-as]').forEach(b => b.onclick = async () => {
      const r = await S.saveShift({ id: s.id, [b.getAttribute('data-as')]: b.getAttribute('data-u') });
      if (r) { S.closeModal(); S.go(S.view); }
    });
    const un = body.querySelector('#scUnassign');
    if (un) un.onclick = async () => { if (s.published && !confirm(`Remove ${S.name(s.assignedUser)} from this published shift?\n\nThis will leave the shift OPEN.`)) return; if (await S.saveShift({ id: s.id, assignedUser: '' })) { S.closeModal(); S.go(S.view); } };
    const ub = body.querySelector('#scUnbackup');
    if (ub) ub.onclick = async () => { if (await S.saveShift({ id: s.id, backupUser: '' })) { S.closeModal(); S.go(S.view); } };
  };

  S.editPanel = function (s) {
    const body = S.openModal('Edit shift', s.type.name, `
      <div class="sc-form">
        <label>Shift type<select id="eType">${S.settings.shiftTypes.map(t => `<option value="${esc(t.id)}"${t.id === s.typeId ? ' selected' : ''}>${esc(t.name)}</option>`).join('')}</select></label>
        <label>Date<input type="date" id="eDate" value="${esc(s.date)}"></label>
        <label>Start<input type="time" id="eStart" value="${esc(s.start)}"></label>
        <label>End<input type="time" id="eEnd" value="${esc(s.end)}"></label>
        <label class="full">Location<input id="eLoc" value="${esc(s.location || '')}"></label>
        <label class="full">Notes<textarea id="eNotes" rows="3">${esc(s.notes || '')}</textarea></label>
        ${s.status === 'open' ? `<label class="full">Pickup deadline (optional)<input type="datetime-local" id="eDeadline" value="${esc(s.openDeadline ? s.openDeadline.slice(0, 16) : '')}"></label>` : ''}
      </div>
      <p class="sc-hint">An end time earlier than the start time means the shift ends the next morning.</p>
      <div class="sc-actions"><button class="rl-btn primary" id="eSave">Save changes</button></div>`, '&#9998;');
    body.querySelector('#eSave').onclick = async () => {
      const g = id => body.querySelector('#' + id);
      const dl = g('eDeadline') && g('eDeadline').value ? new Date(g('eDeadline').value).toISOString() : (g('eDeadline') ? '' : undefined);
      const r = await S.saveShift({ id: s.id, typeId: g('eType').value, date: g('eDate').value, start: g('eStart').value, end: g('eEnd').value, location: g('eLoc').value, notes: g('eNotes').value, openDeadline: dl });
      if (r) { S.closeModal(); S.go(S.view); }
    };
  };

  // ── Exports ──
  S.exportCsv = function (shifts, label) {
    const rows = [['Date', 'Day', 'Shift type', 'Start', 'End', 'Assigned', 'Backup', 'Status', 'Published', 'Location', 'Notes']].concat(shifts.map(s => [s.date, new Date(s.date + 'T12:00').toLocaleDateString([], { weekday: 'short' }), s.type.name, s.start, s.end + (s.crossesMidnight ? ' (+1)' : ''), S.name(s.assignedUser), S.name(s.backupUser), s.status, s.published ? 'yes' : 'draft', s.location || '', s.notes || '']));
    const csv = rows.map(r => r.map(v => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`).join(',')).join('\n');
    S.download(new Blob([csv], { type: 'text/csv' }), `schedule-${label.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.csv`);
  };
  S.download = (blob, name) => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); };
  S.downloadIcs = function (shifts, name) {
    const fmt = iso => iso.replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const ev = shifts.map(s => ['BEGIN:VEVENT', `UID:${s.id}@reslife-hub`, `DTSTAMP:${fmt(new Date().toISOString())}`, `DTSTART:${fmt(s.startAt)}`, `DTEND:${fmt(s.endAt)}`, `SUMMARY:${s.type.name}${s.assignedUser ? ' — ' + S.name(s.assignedUser) : ' (open)'}`, `DESCRIPTION:${(s.notes || s.type.instructions || '').replace(/\n/g, '\\n')}`, s.location ? `LOCATION:${s.location}` : '', 'END:VEVENT'].filter(Boolean).join('\r\n'));
    S.download(new Blob([['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//ResLife Hub//Schedule//EN', ...ev, 'END:VCALENDAR'].join('\r\n')], { type: 'text/calendar' }), name + '.ics');
  };
  S.print = function (shifts, label) {
    const w = window.open('', '_blank');
    const byDay = {}; shifts.forEach(s => (byDay[s.date] = byDay[s.date] || []).push(s));
    w.document.write(`<html><head><title>${esc(currentProperty)} — ${esc(label)}</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#111}h1{font-size:20px;margin:0 0 4px}table{width:100%;border-collapse:collapse;margin-top:14px;font-size:12px}th,td{border:1px solid #ccc;padding:6px 8px;text-align:left}th{background:#f1f5f9}</style></head><body><h1>${esc(currentProperty)} — Duty Schedule</h1><div>${esc(label)}</div><table><tr><th>Date</th><th>Shift</th><th>Time</th><th>Assigned</th><th>Backup</th><th>Status</th></tr>${Object.keys(byDay).sort().map(d => byDay[d].map(s => `<tr><td>${S.dShort(d)}</td><td>${esc(s.type.name)}</td><td>${esc(S.range(s))}</td><td>${esc(S.name(s.assignedUser) || 'OPEN')}</td><td>${esc(S.name(s.backupUser))}</td><td>${esc(s.status)}${s.published ? '' : ' (draft)'}</td></tr>`).join('')).join('')}</table><script>window.print()<\/script></body></html>`);
    w.document.close();
  };

  // ── Dashboard widget + Duty Log banner (same data) ──
  S.dashboardWidget = async function (el) {
    try {
      if (!S.staff.length) { try { S.staff = await S.get('staff'); } catch (e) {} }
      const ov = await S.get('overview');
      const my = ov.myNext[0];
      el.innerHTML = `${S.onCallCard(ov, true)}
        <div class="sc-dash-next"><span>My next duty</span>${my ? `<b>${S.atDay(my.startAt)} · ${S.atTime(my.startAt)}</b><em>${esc(my.type.name)}</em>` : '<b>None scheduled</b>'}</div>
        <button class="rl-btn sm" onclick="goToTab('roster')">View Schedule</button>`;
      return ov;
    } catch (e) { el.innerHTML = '<div class="rl-empty">Schedule unavailable.</div>'; return null; }
  };
  S.dutyLogBanner = async function (el) {
    if (!el) return;
    try {
      const today = S.key(new Date()), yest = S.key(new Date(Date.now() - 864e5));
      const shifts = await S.get('shifts', `&from=${yest}&to=${today}&user=${encodeURIComponent(me.username)}`);
      const now = new Date();
      const s = shifts.find(x => x.type.level === 1 && new Date(x.startAt) <= new Date(now.getTime() + 6 * 3600e3) && new Date(x.endAt) > now);
      el.innerHTML = s ? `<div class="sc-dl-banner"><div><span>Your duty shift</span><b>${S.dLong(s.date)} · ${S.range(s)}</b><em>Staff: ${esc(S.name(s.assignedUser))}${s.backupUser ? ' · Backup: ' + esc(S.name(s.backupUser)) : ''}</em></div><button class="rl-btn sm" onclick="SchedUI.openShift('${s.id}')">Shift details</button></div>` : '';
    } catch (e) { el.innerHTML = ''; }
  };
})();
