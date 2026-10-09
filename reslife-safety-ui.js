/*
 * ResLife Hub — Restricted Safety Records (verified trespass restrictions) + Housing Accommodations UI.
 *
 * Every rule here is cosmetic. The server endpoints (reslife-safety.js, reslife-accommodations.js) enforce
 * role and property access, and return role-filtered data. Nothing sensitive is written to console,
 * localStorage, URLs or notification text by this file.
 *
 * Globals used at call time: apiFetch, esc, fmtDate, me, isManager, isAdminTier, currentProperty, propParam, dirDocs.
 */
/* global apiFetch, esc, fmtDate, me, isManager, isAdminTier, currentProperty, propParam */
(function () {
  const $ = id => document.getElementById(id);
  const ROLE = () => (me && me.role) || '';
  const isAdm = () => isAdminTier && (ROLE() === 'admin' || ROLE() === 'reslife-admin');
  const isRecOrAdm = () => isManager && ['admin', 'reslife-admin', 'reslife-rec'].includes(ROLE());
  const err = e => { try { const j = JSON.parse(e.message); return j.missing ? j.error + ':\n• ' + j.missing.join('\n• ') : j.errors ? j.error + ':\n• ' + j.errors.join('\n• ') : (j.error || e.message); } catch (x) { return e.message; } };
  const R_STATUS = { pending_verification: 'Pending verification', active: 'Active', expired: 'Expired', revoked: 'Revoked' };
  const R_SCOPE = { entire_property: 'Entire property', residential_buildings: 'Residential buildings', specific_areas: 'Specific areas', other: 'Other (see detail)' };
  const A_CAT = { esa: 'Emotional Support Animal', service_animal: 'Service Animal', housing_accommodation: 'Housing Accommodation' };
  const A_STATUS = { not_documented: 'Not documented', pending_verification: 'Pending verification', approved: 'Approved', revoked: 'Revoked', expired: 'Expired' };
  const OUTCOMES = { escalated: 'Escalated to REC / Campus Safety', not_match_id_verified: 'Not a match — ID verified', unable_to_verify: 'Unable to verify identity', confirmed_match_escalated: 'Confirmed match — escalated to Campus Safety' };

  function overlay(html, wide) {
    let ov = $('sfOverlay');
    if (!ov) { ov = document.createElement('div'); ov.id = 'sfOverlay'; ov.className = 'pp-overlay'; document.body.appendChild(ov); ov.addEventListener('click', e => { if (e.target === ov) close(); }); }
    ov.innerHTML = `<div class="pp-modal${wide ? ' pg-modal-wide' : ''}" role="dialog" aria-modal="true" style="max-width:${wide ? '1040px' : '640px'}">${html}</div>`;
    ov.classList.add('show');
    const c = ov.querySelector('[data-sf-close]'); if (c) c.onclick = close;
    return ov;
  }
  function close() { const ov = $('sfOverlay'); if (ov) { ov.classList.remove('show'); ov.innerHTML = ''; } }
  const head = (title, sub) => `<div class="pp-head"><div class="pp-head-ico">&#128274;</div><div><h3>${esc(title)}</h3><p>${esc(sub || '')}</p></div><button class="pp-close" type="button" data-sf-close aria-label="Close">&times;</button></div>`;

  // ============ Guest Registry integration ============
  function guestFlagHTML(g) {
    if (!g || !g.safetyReview) return '';
    if (g.safetyReview.required) return ' <span class="gl-st overdue" title="Verify this guest’s identity and contact the on-call REC before admitting">Verification required</span>';
    return '';
  }
  function hitsHTML(hits, checkId) {
    const limited = hits.every(h => !h.name);
    const body = limited
      ? `<div class="sf-alert"><b>Possible restricted-access match — verification required</b>This name is similar to an active, verified restriction. This is <u>not</u> an identification. Do not confirm or deny anything to the guest or resident.
          <ol style="margin:8px 0 0 18px;padding:0"><li>Pause the check-in politely.</li><li>Contact the on-call REC now.</li><li>Follow the Campus Safety escalation process.</li></ol>
          ${hits.map(h => [h.raInstructions, h.escalation].filter(Boolean).map(t => `<div style="margin-top:6px">${esc(t)}</div>`).join('')).join('')}</div>`
      : hits.map(h => `<div class="sf-alert"><b>${h.level === 'strong' ? 'Strong name match' : 'Possible name match'} — identity not confirmed</b>
          <dl class="rl-wizard-review" style="margin:6px 0">
            <dt>Record name</dt><dd>${esc(h.name)}${(h.aliases || []).length ? ' (aka ' + esc(h.aliases.join(', ')) + ')' : ''}</dd>
            <dt>Scope</dt><dd>${esc(R_SCOPE[h.scope] || h.scope)}${h.scopeDetail ? ' — ' + esc(h.scopeDetail) : ''}</dd>
            <dt>Effective</dt><dd>${esc(h.effectiveDate)}${h.expiresAt ? ' → ' + esc(h.expiresAt) : ''}</dd>
            <dt>Authorized by</dt><dd>${esc(h.authorizingDepartment)} · Ref ${esc(h.referenceNumber)}</dd>
            ${h.identifyingNotes ? `<dt>Verify against</dt><dd>${esc(h.identifyingNotes)}</dd>` : ''}
            ${h.operationalInstructions ? `<dt>Instructions</dt><dd>${esc(h.operationalInstructions)}</dd>` : ''}
            ${h.escalation ? `<dt>Escalation</dt><dd>${esc(h.escalation)}</dd>` : ''}
          </dl>Compare the guest’s government ID with the record before drawing any conclusion. Campus Safety has final authority.</div>`).join('');
    return body + (checkId ? resolveFormHTML(checkId) : '');
  }
  function resolveFormHTML(checkId) {
    const opts = Object.entries(OUTCOMES).filter(([k]) => k !== 'confirmed_match_escalated' || isRecOrAdm());
    return `<div class="rl-form-grid" style="margin-top:10px" data-sf-resolve="${esc(checkId)}">
      <div class="rl-field"><label>Outcome</label><select class="sf-outcome">${opts.map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('')}</select></div>
      <div class="rl-field"><label>Note (how identity was verified / who was contacted)</label><input class="sf-note-in" maxlength="1000" /></div>
      <div class="rl-field full"><button class="rl-btn primary sf-resolve-btn" type="button">Record outcome</button></div></div>`;
  }
  function bindResolve(root, after) {
    root.querySelectorAll('[data-sf-resolve]').forEach(box => {
      box.querySelector('.sf-resolve-btn').onclick = async () => {
        try {
          await apiFetch('/reslife-safety', { method: 'PUT', body: JSON.stringify({ action: 'resolve', property: currentProperty, checkId: box.getAttribute('data-sf-resolve'), outcome: box.querySelector('.sf-outcome').value, note: box.querySelector('.sf-note-in').value }) });
          box.innerHTML = '<div class="pg-ok">Outcome recorded.</div>';
          if (after) after();
        } catch (e) { alert(err(e)); }
      };
    });
  }
  function showHits(resp) {
    if (!resp || !resp.safetyHits || !resp.safetyHits.length) return;
    const ov = overlay(head('Restricted-access check', 'Verification required before admitting this guest') + `<div style="padding:16px 20px">${hitsHTML(resp.safetyHits, resp.safetyReview && resp.safetyReview.checkId)}</div>`);
    bindResolve(ov, () => { if (typeof loadGuestLists === 'function') loadGuestLists(); });
  }
  function openScreen() {
    const ov = overlay(head('Restricted-access check', 'Screens a name against active, officially verified restrictions only') + `<div style="padding:16px 20px">
      <div class="sf-note">A result is a screening aid, never an identification. Similar names are common. Always verify ID and follow the Campus Safety escalation process.</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><input id="sfScreenName" placeholder="Guest full name" style="flex:1;min-width:200px;padding:9px 10px;border:1px solid var(--rl-border);border-radius:8px" autocomplete="off" /><button class="rl-btn primary" id="sfScreenGo" type="button">Check</button></div>
      <div id="sfScreenOut" style="margin-top:12px"></div></div>`);
    const go = async () => {
      const name = $('sfScreenName').value.trim(); const outBox = $('sfScreenOut');
      outBox.innerHTML = '<div class="rl-loading">Checking…</div>';
      try {
        const r = await apiFetch('/reslife-safety', { method: 'POST', body: JSON.stringify({ action: 'screen', property: currentProperty, guestName: name }) });
        outBox.innerHTML = r.hits.length ? hitsHTML(r.hits, r.checkId) : '<div class="pg-ok">No active, verified restriction matches this name. Continue the normal guest process.</div>';
        bindResolve(outBox);
      } catch (e) { outBox.innerHTML = `<div class="rl-empty">${esc(err(e))}</div>`; }
      $('sfScreenName').value = ''; // don't leave the name sitting in the field
    };
    $('sfScreenGo').onclick = go;
    $('sfScreenName').addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
    setTimeout(() => $('sfScreenName').focus(), 50);
  }
  async function loadGuestChecks() {
    const box = $('sfGuestChecks'); if (!box) return;
    if (!isRecOrAdm()) { box.innerHTML = ''; return; }
    try {
      const rows = await apiFetch('/reslife-safety' + propParam() + '&checks=1');
      box.innerHTML = rows.length ? `<div class="pg-warn" style="border-left-color:#dc2626"><b>${rows.length} guest check${rows.length > 1 ? 's' : ''} need verification</b>${rows.map(c => `<details style="margin-top:8px"><summary>${c.guest ? esc(c.guest.guestName) + ' visiting ' + esc(c.guest.hostResident || '') + (c.guest.room ? ' · ' + esc(c.guest.room) : '') : 'Name screened by staff'} — ${fmtDate(c.at)} (${esc(c.source)})</summary>${hitsHTML(c.hits, c.id)}</details>`).join('')}</div>` : '';
      bindResolve(box, loadGuestChecks);
    } catch (e) { box.innerHTML = ''; }
  }

  // ============ Safety Records tab (admin-tier list, REC report + checks) ============
  async function loadSafetyTab() {
    const host = $('sfMain'); if (!host) return;
    const admin = isAdm();
    $('sfNewBtn').textContent = admin ? '+ New Restriction Record' : '+ Report for Verification';
    $('sfAuditBtn').classList.toggle('hidden', !admin);
    $('sfChecksHost').innerHTML = '<div class="rl-loading">Loading…</div>';
    try {
      const rows = await apiFetch('/reslife-safety' + propParam() + '&checks=1');
      $('sfChecksHost').innerHTML = rows.length ? rows.map(c => `<details class="pg-dash-card" style="margin-bottom:8px"><summary><b>${c.guest ? esc(c.guest.guestName) : 'Staff name screen'}</b> · ${fmtDate(c.at)} · ${esc(c.source)}</summary>${hitsHTML(c.hits, c.id)}</details>`).join('') : '<div class="rl-empty">No guest checks awaiting verification.</div>';
      bindResolve($('sfChecksHost'), loadSafetyTab);
    } catch (e) { $('sfChecksHost').innerHTML = '<div class="rl-empty">Not available for your role.</div>'; }
    if (!admin) { host.innerHTML = '<div class="sf-note">Restriction records are visible only to Reslife Admins. You can submit a report for verification; it has no effect on guest checks until a Reslife Admin verifies official documentation.</div>'; return; }
    host.innerHTML = '<div class="rl-loading">Loading…</div>';
    try {
      const st = $('sfFilter').value;
      const recs = await apiFetch('/reslife-safety' + propParam() + '&list=1' + (st ? '&status=' + st : ''));
      host.innerHTML = recs.length ? `<div style="overflow-x:auto"><table class="rl-table pg-table"><thead><tr><th>Name</th><th>Subject</th><th>Status</th><th>Scope</th><th>Effective</th><th>Expires</th><th>Review</th><th>Ref #</th><th></th></tr></thead><tbody>${recs.map(r => `<tr><td><b>${esc(r.name)}</b></td><td>${r.subjectType === 'resident' ? 'Resident' : 'Guest / visitor'}</td><td><span class="sf-pill ${esc(r.effectiveStatus)}">${esc(R_STATUS[r.effectiveStatus])}</span>${r.reviewDue ? ' <span class="pg-over">Review due</span>' : ''}</td><td>${esc(R_SCOPE[r.scope] || '')}</td><td>${esc(r.effectiveDate)}</td><td>${esc(r.expiresAt || '—')}</td><td>${esc(r.reviewDate || '—')}</td><td>${esc(r.referenceNumber)}</td><td><button class="rl-btn sm" data-sf-open="${r.id}" type="button">Open</button></td></tr>`).join('')}</tbody></table></div>` : '<div class="rl-empty">No records.</div>';
      host.querySelectorAll('[data-sf-open]').forEach(b => b.onclick = () => openRecord(b.getAttribute('data-sf-open')));
    } catch (e) { host.innerHTML = `<div class="rl-empty">${esc(err(e))}</div>`; }
  }

  function recordFormHTML(r) {
    r = r || { subjectType: 'guest' };
    const residents = ((typeof dirDocs !== 'undefined' && dirDocs) || []);
    const f = (id, label, val, attrs = '') => `<div class="rl-field"><label for="${id}">${label}</label><input id="${id}" value="${esc(val || '')}" ${attrs}/></div>`;
    const t = (id, label, val, hint) => `<div class="rl-field full"><label for="${id}">${label}</label><textarea id="${id}" rows="2">${esc(val || '')}</textarea>${hint ? `<small class="pg-sub">${hint}</small>` : ''}</div>`;
    return `<div class="rl-form-grid cols-3">
      <div class="rl-field"><label for="sfSubject">Applies to</label><select id="sfSubject"><option value="guest"${r.subjectType === 'guest' ? ' selected' : ''}>Guest / visitor</option><option value="resident"${r.subjectType === 'resident' ? ' selected' : ''}>Current resident</option></select></div>
      <div class="rl-field ${r.subjectType === 'resident' ? '' : 'hidden'}" id="sfResWrap" style="grid-column:span 2"><label for="sfResident">Resident record</label><select id="sfResident"><option value="">${residents.length ? 'Select resident…' : 'Open the Resident Directory first to load residents'}</option>${residents.map(d => `<option value="${esc(d.id)}"${d.id === r.residentId ? ' selected' : ''}>${esc(d.residentName)} — ${esc(d.unit || d.room || '')}</option>`).join('')}</select></div>
      ${f('sfName', 'Name *', r.name, 'maxlength="120"')}
      ${f('sfAliases', 'Other names (separate with ;)', (r.aliases || []).join('; '))}
      <div class="rl-field"><label for="sfScope">Scope *</label><select id="sfScope"><option value="">Select…</option>${Object.entries(R_SCOPE).map(([k, v]) => `<option value="${k}"${r.scope === k ? ' selected' : ''}>${v}</option>`).join('')}</select></div>
      ${f('sfScopeDetail', 'Scope detail', r.scopeDetail)}
      ${f('sfEff', 'Effective date *', r.effectiveDate, 'type="date"')}
      ${f('sfExp', 'Expiration date', r.expiresAt, 'type="date"')}
      ${f('sfReview', 'Review date', r.reviewDate, 'type="date"')}
      ${f('sfDept', 'Authorizing department *', r.authorizingDepartment, 'placeholder="e.g., OCC Campus Safety"')}
      ${f('sfRef', 'Reference / incident # *', r.referenceNumber)}
      ${f('sfDoc', 'Secure document reference', r.documentRef, 'placeholder="Where the official document is stored (no uploads here)"')}
      ${t('sfIdNotes', 'Verified identifying information (only what is operationally necessary)', r.identifyingNotes, 'Shown to RECs and Admins on a possible match. No SSNs, full ID numbers or medical details.')}
      ${t('sfVerify', 'Verification note *', r.verificationNote, 'Which official document or Campus Safety authorization was reviewed, and by whom.')}
      ${t('sfOps', 'Operational instructions (REC / Admin)', r.operationalInstructions)}
      ${t('sfRaIns', 'Instructions RAs may see on a possible match', r.raInstructions, 'Keep generic, e.g., "Do not admit until the on-call REC arrives."')}
      ${t('sfEsc', 'Escalation instructions', r.escalationInstructions, 'e.g., Campus Safety phone number / process.')}
    </div>`;
  }
  const readForm = () => ({ subjectType: $('sfSubject').value, residentId: $('sfResident') ? $('sfResident').value : '', name: $('sfName').value, aliases: $('sfAliases').value.split(';'), scope: $('sfScope').value, scopeDetail: $('sfScopeDetail').value, effectiveDate: $('sfEff').value, expiresAt: $('sfExp').value, reviewDate: $('sfReview').value, authorizingDepartment: $('sfDept').value, referenceNumber: $('sfRef').value, documentRef: $('sfDoc').value, identifyingNotes: $('sfIdNotes').value, verificationNote: $('sfVerify').value, operationalInstructions: $('sfOps').value, raInstructions: $('sfRaIns').value, escalationInstructions: $('sfEsc').value });
  function bindSubject() { $('sfSubject').onchange = e => $('sfResWrap').classList.toggle('hidden', e.target.value !== 'resident'); }

  function openNew() {
    const admin = isAdm();
    overlay(head(admin ? 'New restriction record' : 'Report for verification', 'Saved as Pending Verification. Pending records never affect guest checks.') + `<div style="padding:16px 20px">${recordFormHTML()}<div style="margin-top:12px"><button class="rl-btn primary" id="sfSave" type="button">Save as pending</button></div></div>`, true);
    bindSubject();
    $('sfSave').onclick = async () => {
      try { await apiFetch('/reslife-safety', { method: 'POST', body: JSON.stringify(Object.assign({ action: admin ? 'create' : 'report', property: currentProperty }, readForm())) }); close(); loadSafetyTab(); }
      catch (e) { alert(err(e)); }
    };
  }

  async function openRecord(id) {
    let r;
    try { r = await apiFetch('/reslife-safety' + propParam() + '&id=' + encodeURIComponent(id)); } catch (e) { return alert(err(e)); }
    const st = r.effectiveStatus;
    overlay(head(r.name, `${R_STATUS[st]} · created by ${r.createdBy} ${fmtDate(r.createdAt)}${r.verifiedBy ? ' · verified by ' + r.verifiedBy + ' ' + fmtDate(r.verifiedAt) : ''}`) + `<div style="padding:16px 20px">${recordFormHTML(r)}
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">
        <button class="rl-btn" id="sfUpd" type="button">Save changes</button>
        ${['pending_verification', 'expired'].includes(st) ? `<label style="display:flex;gap:6px;align-items:center;font-size:13px"><input type="checkbox" id="sfAttest"/> I reviewed the official documentation / Campus Safety authorization</label><button class="rl-btn success" id="sfVerifyBtn" type="button">Verify &amp; activate</button>` : ''}
        ${st === 'active' ? '<button class="rl-btn danger" id="sfRevoke" type="button">Revoke</button>' : ''}
        ${st === 'revoked' ? '<button class="rl-btn" id="sfReopen" type="button">Return to pending</button>' : ''}
      </div>
      <h4 class="pg-h4">Record history</h4><ul class="pg-list">${(r.history || []).slice().reverse().map(h => `<li><b>${esc(h.by)}</b> ${esc(h.action)} <small>${fmtDate(h.at)}</small>${h.note ? ' — ' + esc(h.note) : ''}</li>`).join('')}</ul></div>`, true);
    bindSubject();
    const put = async payload => { try { await apiFetch('/reslife-safety', { method: 'PUT', body: JSON.stringify(Object.assign({ property: currentProperty, id }, payload)) }); close(); loadSafetyTab(); } catch (e) { alert(err(e)); } };
    $('sfUpd').onclick = () => put(Object.assign({ action: 'update', changeNote: prompt('Short reason for this change (kept in history):') || '' }, readForm()));
    if ($('sfVerifyBtn')) $('sfVerifyBtn').onclick = () => put(Object.assign({ action: 'verify', attest: $('sfAttest').checked }, readForm()));
    if ($('sfRevoke')) $('sfRevoke').onclick = () => { const note = prompt('Reason for revoking (required):'); if (note) put({ action: 'status', to: 'revoked', note }); };
    if ($('sfReopen')) $('sfReopen').onclick = () => { const note = prompt('Reason (required):'); if (note) put({ action: 'status', to: 'pending_verification', note }); };
  }

  async function openAudit(area) {
    try {
      const rows = await apiFetch(`/reslife-${area}` + propParam() + '&audit=1');
      overlay(head(area === 'safety' ? 'Safety audit log' : 'Accommodations audit log', 'Most recent 200 entries') + `<div style="padding:16px 20px;max-height:65vh;overflow:auto"><table class="rl-table pg-table"><thead><tr><th>When</th><th>Who</th><th>Role</th><th>Action</th><th>Record</th><th>Detail</th></tr></thead><tbody>${rows.map(r => `<tr><td>${fmtDate(r.at)}</td><td>${esc(r.by)}</td><td>${esc(r.role)}</td><td>${esc(r.action)}</td><td>${esc(String(r.entityId || '').slice(-6))}</td><td>${esc(JSON.stringify(r.detail || {}))}</td></tr>`).join('')}</tbody></table></div>`, true);
    } catch (e) { alert(err(e)); }
  }

  // ============ Resident Profile: accommodations + restriction flag ============
  function canSeeAccommodations() { return isRecOrAdm(); }
  async function renderResidentAccommodations(host, residentId) {
    host.innerHTML = '<div class="rl-loading">Loading…</div>';
    let data;
    try { data = await apiFetch('/reslife-accommodations' + propParam() + '&residentId=' + encodeURIComponent(residentId)); }
    catch (e) { host.innerHTML = '<div class="rl-empty">You don’t have access to this section.</div>'; return; }
    const admin = data.access === 'full';
    const byCat = new Map(data.records.map(r => [r.category, r]));
    const intro = `<div class="res-sec-title">Housing Accommodations &amp; Approved Animals <span class="sf-lock">&#128274; Restricted</span></div>
      <div class="sf-note">Operational status only. Do not record diagnoses, medical history, letters or justification here. “Not documented” does not mean no accommodation exists.</div>`;
    if (!admin) {
      host.innerHTML = intro + (data.records.length ? data.records.map(r => `<div class="pg-dash-card" style="margin-bottom:8px"><b>${esc(A_CAT[r.category])}</b> <span class="sf-pill approved">Approved</span>${r.operationalNotes ? `<div style="margin-top:6px">${esc(r.operationalNotes)}</div>` : ''}</div>`).join('') : '<div class="rl-empty">No approved records to show.</div>');
      return;
    }
    const restr = await residentRestrictionBadge(residentId);
    host.innerHTML = intro + restr + Object.keys(A_CAT).map(cat => {
      const r = byCat.get(cat) || { category: cat, status: 'not_documented', effectiveStatus: 'not_documented' };
      return `<div class="pg-dash-card" style="margin-bottom:10px" data-acc-cat="${cat}">
        <h4>${esc(A_CAT[cat])} <span class="sf-pill ${esc(r.effectiveStatus)}">${esc(A_STATUS[r.effectiveStatus])}</span></h4>
        ${r.reviewDue ? '<div class="pg-over" style="font-size:12px">Review date reached</div>' : ''}
        <div class="rl-form-grid cols-3">
          <div class="rl-field"><label>Status</label><select class="ac-status">${Object.entries(A_STATUS).map(([k, v]) => `<option value="${k}"${r.status === k ? ' selected' : ''}>${v}</option>`).join('')}</select></div>
          <div class="rl-field"><label>Verifying department</label><input class="ac-dept" value="${esc(r.verifyingDepartment || '')}" placeholder="e.g., OCC Disability Services / Property Mgmt" /></div>
          <div class="rl-field"><label>Date last verified</label><input class="ac-verified" type="date" value="${esc(r.lastVerifiedAt || '')}" /></div>
          <div class="rl-field"><label>Effective date</label><input class="ac-eff" type="date" value="${esc(r.effectiveDate || '')}" /></div>
          <div class="rl-field"><label>Review date</label><input class="ac-review" type="date" value="${esc(r.reviewDate || '')}" /></div>
          <div class="rl-field"><label>Expiration date</label><input class="ac-exp" type="date" value="${esc(r.expirationDate || '')}" /></div>
          <div class="rl-field"><label>Verification reference</label><input class="ac-ref" value="${esc(r.verificationRef || '')}" placeholder="Approval letter # / file location (not the document)" /></div>
          <div class="rl-field" style="grid-column:span 2"><label>Authorized operational notes (visible to RECs when Approved)</label><input class="ac-notes" maxlength="500" value="${esc(r.operationalNotes || '')}" placeholder="e.g., Approved ESA: one cat. Unit inspections: notify resident 24h ahead." /></div>
        </div>
        <button class="rl-btn sm primary ac-save" type="button">Save ${esc(A_CAT[cat])}</button>
        ${r.updatedBy ? `<small class="pg-sub"> Last updated by ${esc(r.updatedBy)} ${fmtDate(r.updatedAt)}</small>` : ''}
      </div>`;
    }).join('');
    host.querySelectorAll('[data-acc-cat]').forEach(card => {
      card.querySelector('.ac-save').onclick = async () => {
        const v = c => card.querySelector(c).value;
        try {
          await apiFetch('/reslife-accommodations', { method: 'POST', body: JSON.stringify({ action: 'save', property: currentProperty, residentId, category: card.getAttribute('data-acc-cat'), status: v('.ac-status'), verifyingDepartment: v('.ac-dept'), lastVerifiedAt: v('.ac-verified'), effectiveDate: v('.ac-eff'), reviewDate: v('.ac-review'), expirationDate: v('.ac-exp'), verificationRef: v('.ac-ref'), operationalNotes: v('.ac-notes') }) });
          accSummary = null; renderResidentAccommodations(host, residentId);
        } catch (e) { alert(err(e)); }
      };
    });
  }
  async function residentRestrictionBadge(residentId) {
    if (!isAdm()) return '';
    try { const r = await apiFetch('/reslife-safety' + propParam() + '&residentId=' + encodeURIComponent(residentId)); return r.active ? '<div class="sf-alert"><b>Active, verified restriction affects this resident record.</b>See Safety Records for details and instructions.</div>' : ''; }
    catch (e) { return ''; }
  }

  // ============ Directory filters (admin-tier only; data from server summary) ============
  let accSummary = null;
  async function loadDirectorySummary() {
    const sel = $('dirFAccom'); if (!sel) return;
    const show = isAdm();
    sel.classList.toggle('hidden', !show); $('dirAccImportBtn').classList.toggle('hidden', !show);
    if (!show) { sel.value = ''; accSummary = null; return; }
    try { accSummary = await apiFetch('/reslife-accommodations' + propParam() + '&summary=1'); } catch (e) { accSummary = null; }
  }
  function dirFilter(d) {
    const sel = $('dirFAccom'); const v = sel ? sel.value : '';
    if (!v || !accSummary || !isAdm()) return true;
    const mine = accSummary.filter(a => a.residentId === d.id);
    if (v === 'review_due') return mine.some(a => a.reviewDue);
    if (v === 'any_approved') return mine.some(a => a.status === 'approved');
    if (v === 'pending') return mine.some(a => a.status === 'pending_verification');
    const [cat, st] = v.split(':');
    if (st === 'not_documented') return !mine.some(a => a.category === cat && a.status !== 'not_documented');
    return mine.some(a => a.category === cat && a.status === st);
  }

  // ============ Post-audit import (CSV / Excel) ============
  function openImport() {
    const ov = overlay(head('Import verified accommodation records', 'Admin only · preview (dry run) first · nothing is written until you confirm') + `<div style="padding:16px 20px">
      <div class="sf-note">Columns: <code>residentId, category, status, verifyingDepartment, lastVerifiedAt, effectiveDate, reviewDate, expirationDate, verificationRef, operationalNotes</code>.<br>
      <b>residentId</b> is the Hub resident record ID (shown below for each resident) — the roster has no student or Entrata ID today. Categories: esa, service_animal, housing_accommodation. Statuses: not_documented, pending_verification, approved, revoked, expired. Dates YYYY-MM-DD.</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><input type="file" id="acFile" accept=".csv,.xlsx,.xls" /><label style="font-size:13px"><input type="checkbox" id="acOverwrite"/> Replace existing records (complete rows only)</label><button class="rl-btn" id="acIdsBtn" type="button">Download resident ID list</button></div>
      <div id="acOut" style="margin-top:12px"></div>
      <h4 class="pg-h4">Undo an import</h4><div style="display:flex;gap:8px"><input id="acBatch" placeholder="imp_…" style="padding:8px;border:1px solid var(--rl-border);border-radius:8px"/><button class="rl-btn danger" id="acRollback" type="button">Roll back batch</button></div></div>`, true);
    let rows = null;
    const send = async dryRun => apiFetch('/reslife-accommodations', { method: 'POST', body: JSON.stringify({ action: 'import', property: currentProperty, rows, dryRun, overwrite: $('acOverwrite').checked }) });
    const preview = async () => {
      const out = $('acOut'); out.innerHTML = '<div class="rl-loading">Validating…</div>';
      try {
        const r = await send(true);
        const s = r.summary;
        out.innerHTML = `<div class="pg-dash-card"><b>Preview:</b> ${['create', 'update', 'unchanged', 'conflict', 'error'].map(k => `${k} ${s[k] || 0}`).join(' · ')}
          ${r.plan.filter(p => p.errors.length).length ? `<div style="max-height:220px;overflow:auto;margin-top:8px"><table class="rl-table pg-table"><thead><tr><th>Row</th><th>Result</th><th>Problem</th></tr></thead><tbody>${r.plan.filter(p => p.errors.length).map(p => `<tr><td>${p.row}</td><td>${esc(p.action)}</td><td>${esc(p.errors.join('; '))}</td></tr>`).join('')}</tbody></table></div>` : ''}
          <div style="margin-top:10px">${s.error ? '<span class="pg-over">Fix errors and re-upload before importing.</span>' : `<button class="rl-btn primary" id="acCommit" type="button">Import ${(s.create || 0) + (s.update || 0)} record(s)</button>`}</div></div>`;
        const c = $('acCommit'); if (c) c.onclick = async () => {
          if (!confirm('Write these records? You can roll back this batch afterwards.')) return;
          try { const res = await send(false); out.innerHTML = `<div class="pg-ok">Imported. Batch ID <code>${esc(res.batchId)}</code> (keep this to roll back). ${JSON.stringify(res.summary)}</div>`; accSummary = null; loadDirectorySummary(); }
          catch (e) { alert(err(e)); }
        };
      } catch (e) { out.innerHTML = `<div class="rl-empty">${esc(err(e))}</div>`; }
    };
    $('acFile').onchange = async e => {
      const f = e.target.files[0]; if (!f || !window.XLSX) return;
      const wb = XLSX.read(await f.arrayBuffer(), { type: 'array', cellDates: false, raw: false });
      const json = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '', raw: false });
      rows = json.map(r => { const o = {}; Object.keys(r).forEach(k => { o[String(k).trim().replace(/\s+(\w)/g, (_, c) => c.toUpperCase()).replace(/^\w/, c => c.toLowerCase())] = String(r[k]).trim(); }); return o; });
      preview();
    };
    $('acOverwrite').onchange = () => { if (rows) preview(); };
    $('acIdsBtn').onclick = () => {
      const docs = (typeof dirDocs !== 'undefined' && dirDocs) || [];
      if (!docs.length || !window.XLSX) return alert('Open the Resident Directory first.');
      const ws = XLSX.utils.json_to_sheet(docs.map(d => ({ residentId: d.id, residentName: d.residentName, unit: d.unit || d.room || '', category: '', status: '', verifyingDepartment: '', lastVerifiedAt: '', effectiveDate: '', reviewDate: '', expirationDate: '', verificationRef: '', operationalNotes: '' })));
      const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Accommodations'); XLSX.writeFile(wb, 'accommodations_import_template.xlsx');
    };
    $('acRollback').onclick = async () => {
      const batchId = $('acBatch').value.trim(); if (!batchId || !confirm('Roll back batch ' + batchId + '?')) return;
      try { const r = await apiFetch('/reslife-accommodations', { method: 'POST', body: JSON.stringify({ action: 'rollback', property: currentProperty, batchId }) }); alert(`Removed ${r.removed}, restored ${r.restored}, skipped ${r.skipped} (edited since import).`); accSummary = null; loadDirectorySummary(); }
      catch (e) { alert(err(e)); }
    };
  }

  function bind() {
    const b = (id, fn) => { const el = $(id); if (el) el.addEventListener('click', fn); };
    b('glScreenBtn', openScreen); b('sfNewBtn', openNew); b('sfScreenBtn2', openScreen); b('sfAuditBtn', () => openAudit('safety'));
    b('dirAccImportBtn', openImport);
    const f = $('sfFilter'); if (f) f.addEventListener('change', loadSafetyTab);
  }

  window.SafetyUI = { bind, guestFlagHTML, showHits, loadGuestChecks, loadSafetyTab, canSeeAccommodations, renderResidentAccommodations, residentRestrictionBadge, loadDirectorySummary, dirFilter, openAudit };
})();
