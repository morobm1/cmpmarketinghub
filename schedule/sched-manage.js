/* Schedule & On-Call — open shifts, availability, requests, history, builder, staff, settings. */
(function () {
  const S = window.SchedUI;
  const WD = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // ── Open Shifts ──
  S.views.open = async function (body) {
    const from = S.key(new Date()), to = S.key(new Date(Date.now() + 120 * 864e5));
    const [shifts, reqs] = await Promise.all([S.get('shifts', `&from=${from}&to=${to}`), S.get('requests')]);
    const offered = reqs.filter(r => r.type === 'giveaway' && r.status === 'open' && r.shift && new Date(r.shift.startAt) > new Date());
    const open = shifts.filter(s => s.status === 'open' && s.published && new Date(s.startAt) > new Date());
    const card = (s, r) => `<div class="sc-open" style="--tc:var(--sc-${esc(s.type.color)})">
      <div><div class="sc-row-top">${S.typeChip(s.type)} ${r ? `<span class="sc-badge st-swap_requested">⇄ Offered by ${esc(S.name(r.from))}</span>` : S.badge('open')}</div>
        <b>${S.dLong(s.date)}</b><span>${S.range(s)}${s.location ? ' · ' + esc(s.location) : ''}</span>
        ${r && r.reason ? `<em>“${esc(r.reason)}”</em>` : ''}${s.openDeadline ? `<em>Pick up by ${new Date(s.openDeadline).toLocaleString()}</em>` : ''}
        ${r && S.settings.giveawayKeepsResponsible ? `<em>${esc(S.name(r.from))} stays responsible until this is approved.</em>` : ''}</div>
      <div class="sc-open-btns">${r && r.from === me.username ? `<button class="rl-btn sm" data-cancel="${r.id}">Withdraw offer</button>` : `<button class="rl-btn primary sm" data-pick="${s.id}">Pick up shift</button>`}${S.mgr ? `<button class="rl-btn sm" data-sc-shift="${s.id}">Assign</button>` : ''}</div>
    </div>`;
    body.innerHTML = `<div class="sc-section-h"><h3>Open shifts</h3><span class="sc-hint">${S.settings.swapNeedsApproval ? 'Pickups are confirmed once a manager approves.' : 'Pickups are confirmed instantly.'}</span></div>
      ${open.length || offered.length ? `<div class="sc-open-list">${open.map(s => card(s)).join('')}${offered.map(r => card(r.shift, r)).join('')}</div>` : '<div class="rl-empty"><b>No open shifts</b><br>Everything is currently covered.</div>'}`;
    S.bind(body);
    body.querySelectorAll('[data-pick]').forEach(b => b.onclick = async () => {
      try { const r = await S.send('POST', 'requests', { type: 'pickup', shiftId: b.getAttribute('data-pick') }); alert(r.status === 'approved' ? 'The shift is yours!' : 'Requested — waiting for manager approval.'); S.go('open'); } catch (e) { S.err(e); }
    });
    body.querySelectorAll('[data-cancel]').forEach(b => b.onclick = async () => { try { await S.send('PUT', 'requests', { id: b.getAttribute('data-cancel'), action: 'cancel' }); S.go('open'); } catch (e) { S.err(e); } });
  };

  // ── Availability (+ time off) ──
  S.views.availability = async function (body) {
    const target = S.mgr && S.availUser ? S.availUser : me.username;
    const all = await S.get('availability', S.mgr ? (S.availUser ? '&user=' + encodeURIComponent(S.availUser) : '') : '');
    const mine = all.filter(a => a.user === target);
    const weekly = WD.map((d, i) => mine.find(a => a.kind === 'weekly' && +a.weekday === i));
    const pendingOff = S.mgr ? all.filter(a => a.kind === 'timeoff' && a.approval === 'pending') : [];
    const stIcon = s => ({ available: '✓', preferred: '★', unavailable: '✕' }[s] || '');
    body.innerHTML = `
      ${S.mgr ? `<div class="sc-toolbar"><label class="sc-check">Viewing availability for <select id="scAvUser">${S.staff.map(u => `<option value="${esc(u.username)}"${u.username === target ? ' selected' : ''}>${esc(u.name)}${u.username === me.username ? ' (me)' : ''}</option>`).join('')}</select></label></div>` : ''}
      ${pendingOff.length ? `<div class="sc-card" style="margin-bottom:16px"><div class="sc-card-h">Time-off requests awaiting approval</div>${pendingOff.map(a => `<div class="sc-req"><div><b>${esc(S.name(a.user))}</b><span>${S.dShort(a.date)}${a.endDate && a.endDate !== a.date ? ' – ' + S.dShort(a.endDate) : ''}${a.reason ? ' · ' + esc(a.reason) : ''}</span></div><div><button class="rl-btn sm primary" data-to="${a.id}" data-ap="approved">Approve</button> <button class="rl-btn sm" data-to="${a.id}" data-ap="denied">Deny</button></div></div>`).join('')}</div>` : ''}
      <div class="sc-two">
        <div class="sc-card">
          <div class="sc-card-h">Weekly availability</div>
          <p class="sc-hint">Your usual week. Leave “Available” if there’s no restriction.</p>
          ${WD.map((d, i) => { const w = weekly[i] || { status: 'available' }; return `<div class="sc-wk-row" data-wd="${i}">
            <b>${d}</b>
            <select data-f="status">${['available', 'preferred', 'unavailable'].map(s => `<option value="${s}"${w.status === s ? ' selected' : ''}>${stIcon(s)} ${s[0].toUpperCase() + s.slice(1)}</option>`).join('')}</select>
            <span class="sc-wk-win"><label>after <input type="time" data-f="from" value="${esc(w.from || '')}"></label><label>before <input type="time" data-f="to" value="${esc(w.to || '')}"></label></span>
          </div>`; }).join('')}
          <div class="sc-actions"><button class="rl-btn primary" id="scSaveWeekly">Save weekly availability</button></div>
        </div>
        <div class="sc-card">
          <div class="sc-card-h">Specific dates &amp; time off</div>
          <div class="sc-form">
            <label>Type<select id="avKind"><option value="date">One date</option><option value="timeoff">Time off / blackout (needs approval)</option></select></label>
            <label>Status<select id="avStatus"><option value="unavailable">✕ Unavailable</option><option value="preferred">★ Preferred</option><option value="available">✓ Available</option></select></label>
            <label>Date<input type="date" id="avDate"></label>
            <label id="avEndWrap" class="hidden">Through<input type="date" id="avEnd"></label>
            <label class="full">Reason (optional)<input id="avReason" placeholder="e.g. Out of town"></label>
          </div>
          <div class="sc-actions"><button class="rl-btn primary" id="scAddAv">Add</button></div>
          <div class="sc-sub-h">On file</div>
          ${mine.filter(a => a.kind !== 'weekly').sort((a, b) => a.date.localeCompare(b.date)).map(a => `<div class="sc-req"><div><b>${stIcon(a.status)} ${S.dShort(a.date)}${a.endDate && a.endDate !== a.date ? ' – ' + S.dShort(a.endDate) : ''}</b><span>${a.kind === 'timeoff' ? `Time off · <i>${esc(a.approval)}</i>` : esc(a.status)}${a.reason ? ' · ' + esc(a.reason) : ''}${a.comment ? ' · “' + esc(a.comment) + '”' : ''}</span></div><button class="rl-btn sm" data-delav="${a.id}">Remove</button></div>`).join('') || '<div class="rl-empty">No date exceptions yet.</div>'}
        </div>
      </div>`;
    const sel = body.querySelector('#scAvUser'); if (sel) sel.onchange = e => { S.availUser = e.target.value; S.go('availability'); };
    body.querySelector('#avKind').onchange = e => { body.querySelector('#avEndWrap').classList.toggle('hidden', e.target.value !== 'timeoff'); body.querySelector('#avStatus').disabled = e.target.value === 'timeoff'; };
    body.querySelector('#scSaveWeekly').onclick = async () => {
      try {
        for (const row of body.querySelectorAll('[data-wd]')) {
          const g = f => row.querySelector(`[data-f="${f}"]`).value;
          await S.send('POST', 'availability', { kind: 'weekly', user: target, weekday: +row.getAttribute('data-wd'), status: g('status'), from: g('from'), to: g('to') });
        }
        alert('Weekly availability saved.'); S.go('availability');
      } catch (e) { S.err(e); }
    };
    body.querySelector('#scAddAv').onclick = async () => {
      const g = id => body.querySelector('#' + id).value;
      if (!g('avDate')) return alert('Choose a date.');
      try { await S.send('POST', 'availability', { kind: g('avKind'), user: target, date: g('avDate'), endDate: g('avEnd'), status: g('avStatus'), reason: g('avReason') }); S.go('availability'); } catch (e) { S.err(e); }
    };
    body.querySelectorAll('[data-delav]').forEach(b => b.onclick = async () => { try { await S.del('availability', b.getAttribute('data-delav')); S.go('availability'); } catch (e) { S.err(e); } });
    body.querySelectorAll('[data-to]').forEach(b => b.onclick = async () => { const comment = b.getAttribute('data-ap') === 'denied' ? prompt('Comment (optional):') || '' : ''; try { await S.send('PUT', 'availability', { id: b.getAttribute('data-to'), approval: b.getAttribute('data-ap'), comment }); S.go('availability'); } catch (e) { S.err(e); } });
  };

  // ── Shift Requests (swaps / giveaways / pickups) ──
  S.views.requests = async function (body) {
    const reqs = await S.get('requests');
    const label = r => r.type === 'giveaway' ? `${esc(S.name(r.from))} offered this shift${r.to ? ' → ' + esc(S.name(r.to)) : ''}` : r.type === 'swap' ? `${esc(S.name(r.from))} → ${esc(S.name(r.to))}` : `${esc(S.name(r.to))} picking up open shift`;
    const stat = { open: '○ Waiting for a taker', pending_approval: '⏳ Pending manager approval', approved: '✓ Approved', denied: '✕ Denied', cancelled: '— Cancelled' };
    const row = r => `<div class="sc-req">
      <div><div class="sc-row-top">${r.shift ? S.typeChip(r.shift.type) : ''} <span class="sc-badge st-${r.status === 'pending_approval' ? 'pending' : r.status === 'approved' ? 'assigned' : r.status === 'open' ? 'swap_requested' : 'cancelled'}">${stat[r.status] || r.status}</span></div>
        <b>${label(r)}</b><span>${r.shift ? `${S.dLong(r.shift.date)} · ${S.range(r.shift)}` : 'Shift removed'}${r.reason ? ' · “' + esc(r.reason) + '”' : ''}</span></div>
      <div class="sc-open-btns">
        ${S.mgr && r.status === 'pending_approval' ? `<button class="rl-btn sm primary" data-ra="${r.id}" data-act="approve">Approve</button><button class="rl-btn sm" data-ra="${r.id}" data-act="deny">Deny</button>` : ''}
        ${r.status === 'open' && r.type === 'swap' && r.to === me.username ? `<button class="rl-btn sm primary" data-ra="${r.id}" data-act="accept">Accept</button>` : ''}
        ${r.status === 'open' && r.type === 'giveaway' && r.from !== me.username && r.shift ? `<button class="rl-btn sm primary" data-take="${r.shift.id}">Take shift</button>` : ''}
        ${['open', 'pending_approval'].includes(r.status) && (r.from === me.username || r.to === me.username || S.mgr) ? `<button class="rl-btn sm" data-ra="${r.id}" data-act="cancel">Cancel</button>` : ''}
        ${r.shift ? `<button class="rl-btn sm" data-sc-shift="${r.shift.id}">Shift</button>` : ''}
      </div></div>`;
    const active = reqs.filter(r => ['open', 'pending_approval'].includes(r.status)), past = reqs.filter(r => !['open', 'pending_approval'].includes(r.status)).slice(0, 30);
    body.innerHTML = `<div class="sc-section-h"><h3>Active requests</h3></div>${active.length ? active.map(row).join('') : '<div class="rl-empty">No active swap or pickup requests.</div>'}
      <div class="sc-section-h"><h3>Recent</h3></div>${past.length ? past.map(row).join('') : '<div class="rl-empty">Nothing yet.</div>'}`;
    S.bind(body);
    body.querySelectorAll('[data-ra]').forEach(b => b.onclick = async () => { const act = b.getAttribute('data-act'); const comment = act === 'deny' ? prompt('Reason (optional):') || '' : ''; try { await S.send('PUT', 'requests', { id: b.getAttribute('data-ra'), action: act, comment }); S.go('requests'); } catch (e) { S.err(e); } });
    body.querySelectorAll('[data-take]').forEach(b => b.onclick = async () => { try { const r = await S.send('POST', 'requests', { type: 'pickup', shiftId: b.getAttribute('data-take') }); alert(r.status === 'approved' ? 'The shift is yours!' : 'Accepted — waiting for manager approval.'); S.go('requests'); } catch (e) { S.err(e); } });
  };

  // ── History + lightweight reports ──
  S.views.history = async function (body) {
    const h = S.hist || (S.hist = { user: S.mgr ? '' : me.username, from: S.key(new Date(Date.now() - 90 * 864e5)), to: S.key(new Date()), type: '' });
    const shifts = await S.get('history', `&from=${h.from}&to=${h.to}${h.user ? '&user=' + encodeURIComponent(h.user) : ''}${h.type ? '&type=' + encodeURIComponent(h.type) : ''}`);
    const byStaff = {};
    shifts.forEach(s => { if (!s.assignedUser) return; const k = s.assignedUser; byStaff[k] = byStaff[k] || { total: 0, weekend: 0, types: {}, months: {}, logs: 0, logTotal: 0 }; const b = byStaff[k]; b.total++; if ([5, 6].includes(new Date(s.date + 'T12:00').getDay())) b.weekend++; b.types[s.type.name] = (b.types[s.type.name] || 0) + 1; const m = s.date.slice(0, 7); b.months[m] = (b.months[m] || 0) + 1; if (s.type.level === 1) { b.logTotal++; if (s.dutyLogStatus === 'Submitted') b.logs++; } });
    const names = Object.keys(byStaff);
    const avg = names.length ? names.reduce((n, k) => n + byStaff[k].total, 0) / names.length : 0;
    body.innerHTML = `
      <div class="sc-toolbar sc-filters">
        ${S.mgr ? `<select id="hUser"><option value="">All staff</option>${S.staff.map(u => `<option value="${esc(u.username)}"${h.user === u.username ? ' selected' : ''}>${esc(u.name)}</option>`).join('')}</select>` : ''}
        <select id="hType"><option value="">All types</option>${S.settings.shiftTypes.map(t => `<option value="${esc(t.id)}"${h.type === t.id ? ' selected' : ''}>${esc(t.name)}</option>`).join('')}</select>
        <label class="sc-check">From <input type="date" id="hFrom" value="${h.from}"></label><label class="sc-check">To <input type="date" id="hTo" value="${h.to}"></label>
        ${S.mgr ? '<button class="rl-btn sm" id="hCsv">Export CSV</button>' : ''}
      </div>
      ${names.length ? `<div class="sc-dist">${names.sort((a, b) => byStaff[b].total - byStaff[a].total).map(k => { const b = byStaff[k]; const diff = b.total - avg; return `<div class="sc-dist-row"><b>${esc(S.name(k))}</b><div class="sc-bar"><i style="width:${Math.min(100, b.total / Math.max(1, ...names.map(n => byStaff[n].total)) * 100)}%"></i></div><span>${b.total} shifts · ${b.weekend} weekend${b.logTotal ? ` · Duty logs ${b.logs}/${b.logTotal}` : ''}</span><small>${Object.entries(b.months).sort().map(([m, n]) => `${new Date(m + '-15').toLocaleDateString([], { month: 'short' })}: ${n}`).join(' · ')}</small>${S.mgr && names.length > 2 && diff >= 3 ? `<em class="warn">⚠ ${diff.toFixed(0)} more than team average</em>` : ''}</div>`; }).join('')}</div>` : ''}
      <div class="sc-section-h"><h3>${shifts.length} completed shift${shifts.length === 1 ? '' : 's'}</h3></div>
      <div class="sc-list">${shifts.length ? shifts.slice(0, 300).map(s => S.shiftRow(s, s.type.level === 1 ? `<div class="sc-row-time">Duty Log: ${esc(s.dutyLogStatus || '—')}</div>` : '')).join('') : '<div class="rl-empty">No shift history for these filters.</div>'}</div>`;
    S.bind(body);
    const set = (k, v) => { h[k] = v; S.go('history'); };
    const u = body.querySelector('#hUser'); if (u) u.onchange = e => set('user', e.target.value);
    body.querySelector('#hType').onchange = e => set('type', e.target.value);
    body.querySelector('#hFrom').onchange = e => set('from', e.target.value);
    body.querySelector('#hTo').onchange = e => set('to', e.target.value);
    const c = body.querySelector('#hCsv'); if (c) c.onclick = () => S.exportCsv(shifts, 'history-' + h.from + '-to-' + h.to);
  };

  // ── Schedule Builder (managers) ──
  S.views.builder = async function (body) {
    const pre = S.builderPreset || {}; S.builderPreset = null;
    const now = new Date(), mStart = new Date(now.getFullYear(), now.getMonth() + 1, 1), mEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0);
    const from = pre.from || S.key(mStart), to = pre.to || S.key(mEnd);
    const types = S.settings.shiftTypes;
    body.innerHTML = `
      <div class="sc-two">
        <div class="sc-card">
          <div class="sc-card-h">1 · Create shifts</div>
          <div class="sc-form">
            <label class="full">Shift type<select id="bType">${types.map(t => `<option value="${esc(t.id)}">${esc(t.name)} (${S.t12(t.start)}–${S.t12(t.end)})</option>`).join('')}</select></label>
            <label>From<input type="date" id="bFrom" value="${from}"></label>
            <label>To<input type="date" id="bTo" value="${to}"></label>
            <label>Start<input type="time" id="bStart"></label>
            <label>End<input type="time" id="bEnd"></label>
            <label class="full">Repeats<select id="bRepeat"><option value="daily"${pre.repeat === 'daily' ? ' selected' : ''}>Every day</option><option value="weekends">Weekends only (Fri &amp; Sat)</option><option value="custom">Custom days</option><option value="dates">Specific dates</option></select></label>
            <div class="full hidden" id="bDaysWrap"><div class="sc-days">${['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d, i) => `<label><input type="checkbox" value="${i}"> ${d}</label>`).join('')}</div></div>
            <label class="full hidden" id="bDatesWrap">Dates (comma separated, YYYY-MM-DD)<input id="bDates" placeholder="2026-10-09, 2026-10-16"></label>
            <label class="full">Assign to (optional)<select id="bAssign"><option value="">Leave open</option>${S.staff.filter(u => u.active).map(u => `<option value="${esc(u.username)}">${esc(u.name)}</option>`).join('')}</select></label>
            <label class="full">Notes (optional)<input id="bNotes" placeholder="e.g. Carry duty phone; rounds at 9 PM and 1 AM"></label>
          </div>
          <p class="sc-hint" id="bTypeHint"></p>
          <div class="sc-actions"><button class="rl-btn primary" id="bCreate">Create draft shifts</button></div>
        </div>
        <div class="sc-card">
          <div class="sc-card-h">2 · Auto build (draft)</div>
          <p class="sc-hint">Fills <b>open, unpublished</b> shifts in the range with a fair rotation. It respects availability, approved time off, overlaps, roles and each person’s max. Nothing is published until you review it.</p>
          <div class="sc-form">
            <label>From<input type="date" id="aFrom" value="${from}"></label>
            <label>To<input type="date" id="aTo" value="${to}"></label>
            <label class="full">Shift types<select id="aTypes" multiple size="${Math.min(5, types.length)}">${types.map(t => `<option value="${esc(t.id)}"${t.level === 1 ? ' selected' : ''}>${esc(t.name)}</option>`).join('')}</select></label>
            <label class="full">Eligible staff<select id="aUsers" multiple size="5">${S.staff.filter(u => u.active).map(u => `<option value="${esc(u.username)}" selected>${esc(u.name)}</option>`).join('')}</select></label>
            <label>Min per person<input type="number" id="aMin" min="0" placeholder="0"></label>
            <label>Max per person<input type="number" id="aMax" min="1" placeholder="no limit"></label>
            <label class="full sc-check"><input type="checkbox" id="aWeekend" checked> Spread weekends fairly</label>
          </div>
          <div class="sc-actions"><button class="rl-btn" id="aRun">Auto Build Schedule</button></div>
          <div id="aOut"></div>
        </div>
      </div>
      <div class="sc-card" style="margin-top:16px">
        <div class="sc-card-h">3 · Review &amp; publish</div>
        <div class="sc-toolbar"><label class="sc-check">From <input type="date" id="pFrom" value="${from}"></label><label class="sc-check">To <input type="date" id="pTo" value="${to}"></label><button class="rl-btn" id="pReview">Review range</button><button class="rl-btn primary" id="pPublish">Publish</button><button class="rl-btn danger" id="pUnpublish">Unpublish future</button></div>
        <div id="pOut"></div>
      </div>`;
    const $ = id => body.querySelector('#' + id);
    const syncType = () => { const t = types.find(x => x.id === $('bType').value); $('bStart').value = t.start; $('bEnd').value = t.end; $('bTypeHint').textContent = `${t.name}: ${S.t12(t.start)} – ${S.t12(t.end)}${t.end <= t.start ? ' (ends next morning)' : ''} · needs ${t.minStaff || 1} · ${t.roles && t.roles.length ? 'roles: ' + t.roles.map(r => (ROLE_LABELS[r] || r).replace('Reslife - ', '')).join(', ') : 'any role'}`; };
    $('bType').onchange = syncType; syncType();
    $('bRepeat').onchange = () => { $('bDaysWrap').classList.toggle('hidden', $('bRepeat').value !== 'custom'); $('bDatesWrap').classList.toggle('hidden', $('bRepeat').value !== 'dates'); };
    $('bCreate').onclick = async () => {
      const days = [...body.querySelectorAll('#bDaysWrap input:checked')].map(i => +i.value);
      const repeat = $('bRepeat').value;
      if (repeat === 'custom' && !days.length) return alert('Pick at least one day.');
      try {
        const r = await S.send('POST', 'shifts', { action: 'bulk', typeId: $('bType').value, from: $('bFrom').value, to: $('bTo').value, start: $('bStart').value, end: $('bEnd').value, repeat, days, dates: $('bDates').value.split(/[,\s]+/).filter(Boolean), assignedUser: $('bAssign').value, notes: $('bNotes').value });
        alert(`Created ${r.created} draft shift${r.created === 1 ? '' : 's'}.${r.skipped ? ` Skipped ${r.skipped} date(s) that already had this shift type.` : ''}`);
        review();
      } catch (e) { S.err(e); }
    };
    $('aRun').onclick = async () => {
      const sel = id => [...$(id).selectedOptions].map(o => o.value);
      try {
        const r = await S.send('POST', 'shifts', { action: 'autobuild', from: $('aFrom').value, to: $('aTo').value, typeIds: sel('aTypes'), users: sel('aUsers'), minPer: $('aMin').value, maxPer: $('aMax').value, weekendFair: $('aWeekend').checked });
        $('aOut').innerHTML = `<div class="sc-note">Assigned <b>${r.assigned}</b> of ${r.considered} open draft shifts.${r.unfilled ? ` <b>${r.unfilled}</b> couldn’t be filled (no eligible, available staff).` : ''} Review below, then publish.</div>`;
        review();
      } catch (e) { S.err(e); }
    };
    async function review() {
      const out = $('pOut'); out.innerHTML = '<div class="rl-loading">Loading…</div>';
      const shifts = await S.get('shifts', `&from=${$('pFrom').value}&to=${$('pTo').value}`);
      const drafts = shifts.filter(s => !s.published), open = shifts.filter(s => s.status === 'open');
      const staffCount = {}, wkCount = {};
      shifts.forEach(s => { if (s.assignedUser) { staffCount[s.assignedUser] = (staffCount[s.assignedUser] || 0) + 1; if ([5, 6].includes(new Date(s.date + 'T12:00').getDay())) wkCount[s.assignedUser] = (wkCount[s.assignedUser] || 0) + 1; } });
      const names = Object.keys(staffCount); const avg = names.length ? names.reduce((n, k) => n + staffCount[k], 0) / names.length : 0;
      // Coverage: fewer staff than a type's minimum on a date
      const gaps = [];
      const dates = [...new Set(shifts.map(s => s.date))];
      S.settings.shiftTypes.forEach(t => dates.forEach(d => { const n = shifts.filter(s => s.date === d && s.typeId === t.id); if (n.length && n.filter(s => s.assignedUser).length < (t.minStaff || 1)) gaps.push(`${S.dShort(d)} · ${t.name}`); }));
      out.innerHTML = `
        <div class="sc-review-stats"><div><b>${shifts.length}</b><span>shifts</span></div><div><b>${drafts.length}</b><span>drafts</span></div><div class="${open.length ? 'warn' : ''}"><b>${open.length}</b><span>open</span></div><div class="${gaps.length ? 'warn' : ''}"><b>${gaps.length}</b><span>below minimum</span></div></div>
        ${gaps.length ? `<details class="sc-audit" open><summary>Coverage gaps</summary>${gaps.slice(0, 40).map(g => `<div>⚠ ${esc(g)}</div>`).join('')}</details>` : ''}
        ${names.length ? `<div class="sc-sub-h">Duty distribution</div><div class="sc-dist">${names.sort((a, b) => staffCount[b] - staffCount[a]).map(k => `<div class="sc-dist-row"><b>${esc(S.name(k))}</b><div class="sc-bar"><i style="width:${staffCount[k] / Math.max(...names.map(n => staffCount[n])) * 100}%"></i></div><span>${staffCount[k]} total · ${wkCount[k] || 0} weekend</span>${names.length > 2 && staffCount[k] - avg >= 3 ? `<em class="warn">⚠ ${(staffCount[k] - avg).toFixed(0)} more than team average</em>` : ''}</div>`).join('')}</div>` : ''}
        <div class="sc-sub-h">Shifts</div>
        <div class="sc-list">${shifts.slice(0, 200).map(S.shiftRow).join('') || '<div class="rl-empty">No shifts in this range yet. Create some above.</div>'}</div>`;
      S.bind(out);
    }
    $('pReview').onclick = review;
    $('pPublish').onclick = async () => {
      if (!confirm(`Publish all draft shifts from ${S.dShort($('pFrom').value)} to ${S.dShort($('pTo').value)}?\n\nAssigned staff will be notified${S.settings.requireConfirmation ? ' and asked to confirm' : ''}.`)) return;
      try { const r = await S.send('POST', 'publish', { from: $('pFrom').value, to: $('pTo').value }); alert(`Published ${r.count} shift${r.count === 1 ? '' : 's'} · notified ${r.notified} staff.`); review(); } catch (e) { S.err(e); }
    };
    $('pUnpublish').onclick = async () => {
      if (!confirm('Unpublish future shifts in this range?\n\nStaff will no longer see them until you publish again. Past shifts are never unpublished.')) return;
      try { const r = await S.send('POST', 'unpublish', { from: $('pFrom').value, to: $('pTo').value }); alert(`Unpublished ${r.count} shift(s).`); review(); } catch (e) { S.err(e); }
    };
    review();
  };

  // ── Staff (scheduling directory) ──
  S.views.staff = async function (body) {
    const types = S.settings.shiftTypes;
    body.innerHTML = `<p class="sc-hint">Only staff assigned to ${esc(currentProperty)} appear here. Add or remove people in Manage Users.</p>
      <div class="sc-staff">${S.staff.map(u => `<div class="sc-staff-card${u.active ? '' : ' off'}">
        <div class="sc-oc-av">${esc(S.initials(u.name))}</div>
        <div class="sc-staff-main"><b>${esc(u.name)}</b><span>${esc(u.title)} · ${esc((ROLE_LABELS[u.role] || u.role).replace('Reslife - ', ''))}</span>
          <span>${u.phone ? '&#128241; ' + esc(u.phone) : '<i>No phone</i>'}${u.email ? ' · ' + esc(u.email) : ''}</span>
          <span>Eligible: ${u.eligibleTypes.length ? u.eligibleTypes.map(id => esc((types.find(t => t.id === id) || { name: id }).name)).join(', ') : 'all types allowed for their role'}${u.maxShifts ? ` · max ${u.maxShifts}/period` : ''}${u.active ? '' : ' · <b>Inactive</b>'}</span></div>
        <button class="rl-btn sm" data-edit-staff="${esc(u.username)}">Edit</button></div>`).join('') || '<div class="rl-empty">No staff on this property yet.</div>'}</div>`;
    body.querySelectorAll('[data-edit-staff]').forEach(b => b.onclick = () => {
      const u = S.staff.find(x => x.username === b.getAttribute('data-edit-staff'));
      const m = S.openModal(u.name, 'Scheduling profile', `
        <div class="sc-form">
          <label>Title<input id="stTitle" value="${esc(u.title)}"></label>
          <label>Mobile (managers only)<input id="stPhone" value="${esc(u.phone)}" placeholder="(555) 555-0100"></label>
          <label>Max shifts per period<input type="number" id="stMax" min="1" value="${esc(u.maxShifts || '')}"></label>
          <label class="sc-check"><input type="checkbox" id="stActive"${u.active ? ' checked' : ''}> Active (can be scheduled)</label>
          <div class="full"><b style="font-size:12px">Eligible shift types</b> <small>(none checked = any type their role allows)</small><div class="sc-days">${types.map(t => `<label><input type="checkbox" value="${esc(t.id)}"${u.eligibleTypes.includes(t.id) ? ' checked' : ''}> ${esc(t.name)}</label>`).join('')}</div></div>
        </div>
        <div class="sc-actions"><button class="rl-btn primary" id="stSave">Save</button></div>`, '&#128100;');
      m.querySelector('#stSave').onclick = async () => {
        try { await S.send('PUT', 'staff', { username: u.username, title: m.querySelector('#stTitle').value, phone: m.querySelector('#stPhone').value, maxShifts: m.querySelector('#stMax').value, active: m.querySelector('#stActive').checked, eligibleTypes: [...m.querySelectorAll('.sc-days input:checked')].map(i => i.value) }); S.closeModal(); S.staff = await S.get('staff'); S.go('staff'); } catch (e) { S.err(e); }
      };
    });
  };

  // ── Settings (shift types, rules, contacts, reminders) ──
  S.views.settings = async function (body) {
    const st = S.settings;
    const ROLES = [['reslife-ra', 'RA'], ['reslife-rec', 'REC'], ['reslife-admin', 'Admin']];
    const typeRow = t => `<div class="sc-type-row" data-type-row>
      <input data-k="name" value="${esc(t.name)}" placeholder="Shift type name"><input type="hidden" data-k="id" value="${esc(t.id || '')}">
      <select data-k="color">${st.colorTokens.map(c => `<option value="${c}"${t.color === c ? ' selected' : ''}>${c}</option>`).join('')}</select>
      <input type="time" data-k="start" value="${esc(t.start)}"><input type="time" data-k="end" value="${esc(t.end)}">
      <select data-k="level"><option value="0"${!t.level ? ' selected' : ''}>Regular</option><option value="1"${t.level == 1 ? ' selected' : ''}>On-call · Primary</option><option value="2"${t.level == 2 ? ' selected' : ''}>On-call · Secondary</option><option value="3"${t.level == 3 ? ' selected' : ''}>On-call · Manager</option></select>
      <input type="number" data-k="minStaff" min="1" value="${esc(t.minStaff || 1)}" title="Minimum staff">
      <span class="sc-roles">${ROLES.map(([r, l]) => `<label><input type="checkbox" data-role="${r}"${(t.roles || []).includes(r) ? ' checked' : ''}>${l}</label>`).join('')}</span>
      <textarea data-k="instructions" rows="1" placeholder="Instructions">${esc(t.instructions || '')}</textarea>
      <button class="rl-btn sm danger" data-rm-type>&times;</button></div>`;
    body.innerHTML = `
      <div class="sc-card"><div class="sc-card-h">Shift types</div>
        <p class="sc-hint">Name · color · default start/end · on-call level (drives “On call now” and escalation) · minimum staff · eligible roles (none = all) · instructions.</p>
        <div id="sTypes">${st.shiftTypes.map(typeRow).join('')}</div>
        <button class="rl-btn sm" id="sAddType">+ Add shift type</button></div>
      <div class="sc-two" style="margin-top:16px">
        <div class="sc-card"><div class="sc-card-h">Rules</div>
          <label class="sc-check"><input type="checkbox" id="sConfirm"${st.requireConfirmation ? ' checked' : ''}> Staff must confirm their schedule after publishing</label>
          <label class="sc-check"><input type="checkbox" id="sSwap"${st.swapNeedsApproval ? ' checked' : ''}> Swaps &amp; pickups need manager approval</label>
          <label class="sc-check"><input type="checkbox" id="sResp"${st.giveawayKeepsResponsible ? ' checked' : ''}> Original staff stays responsible until a giveaway is approved</label>
          <div class="sc-sub-h">Reminders before each shift</div>
          <div class="sc-days">${[[1440, '24 hours'], [120, '2 hours'], [30, '30 minutes'], [60, '1 hour']].map(([m, l]) => `<label><input type="checkbox" data-rem="${m}"${(st.reminders || []).includes(m) ? ' checked' : ''}> ${l}</label>`).join('')}</div>
        </div>
        <div class="sc-card"><div class="sc-card-h">Contacts &amp; privacy</div>
          <div class="sc-form">
            <label class="full">Public duty phone (shown to all staff)<input id="sPhone" value="${esc(st.dutyPhone || '')}" placeholder="Duty phone number"></label>
            <label class="full">Emergency escalation (shown to all staff)<input id="sEmerg" value="${esc(st.emergencyContact || '')}"></label>
          </div>
          <p class="sc-hint">Personal mobile numbers are only visible to managers and the person themselves.</p>
        </div>
      </div>
      <div class="sc-actions"><button class="rl-btn primary" id="sSave">Save settings</button><button class="rl-btn" id="sAudit">View audit log</button></div>
      ${st.migratedRoster ? `<p class="sc-hint">${st.migratedRoster.count} shift(s) were migrated from the old Duty Roster. The original roster data is kept unchanged.</p>` : ''}`;
    body.querySelector('#sAddType').onclick = () => body.querySelector('#sTypes').insertAdjacentHTML('beforeend', typeRow({ name: '', color: 'slate', start: '18:00', end: '22:00', level: 0, minStaff: 1, roles: [] }));
    body.querySelector('#sTypes').addEventListener('click', e => { if (e.target.hasAttribute('data-rm-type') && confirm('Remove this shift type? Existing shifts keep their data.')) e.target.closest('[data-type-row]').remove(); });
    body.querySelector('#sSave').onclick = async () => {
      const types = [...body.querySelectorAll('[data-type-row]')].map(r => { const g = k => r.querySelector(`[data-k="${k}"]`).value; return { id: g('id'), name: g('name'), color: g('color'), start: g('start'), end: g('end'), level: +g('level'), minStaff: +g('minStaff'), instructions: g('instructions'), roles: [...r.querySelectorAll('[data-role]:checked')].map(i => i.getAttribute('data-role')) }; }).filter(t => t.name.trim());
      try {
        await S.send('PUT', 'settings', { shiftTypes: types, requireConfirmation: body.querySelector('#sConfirm').checked, swapNeedsApproval: body.querySelector('#sSwap').checked, giveawayKeepsResponsible: body.querySelector('#sResp').checked, reminders: [...body.querySelectorAll('[data-rem]:checked')].map(i => +i.getAttribute('data-rem')), dutyPhone: body.querySelector('#sPhone').value, emergencyContact: body.querySelector('#sEmerg').value });
        S.settings = await S.get('settings'); alert('Settings saved.');
      } catch (e) { S.err(e); }
    };
    body.querySelector('#sAudit').onclick = async () => {
      const a = await S.get('audit');
      S.openModal('Audit log', 'Every scheduling change', `<div class="sc-audit-list">${a.map(x => `<div><span>${new Date(x.at).toLocaleString()}</span> <b>${esc(S.name(x.by))}</b> ${esc(x.action.replace(/_/g, ' '))} ${x.details ? `<small>${esc(Object.entries(x.details).filter(([k, v]) => v !== undefined && v !== '').map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join('; ') : (k === 'from' || k === 'to' ? S.name(v) : v)}`).join(' · '))}</small>` : ''}</div>`).join('') || '<div class="rl-empty">No changes yet.</div>'}</div>`, '&#128220;');
    };
  };
})();
