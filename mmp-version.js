/*
 * MMP calendar version switch (legacy mmp_calendar_app.html <-> Updated MMP calendar_test.html).
 *
 * - Every role except RA / REC can use the Updated MMP.
 * - Until the legacy cutoff, eligible users choose with a toggle (remembered in localStorage).
 * - From the cutoff onward, eligible users are always sent to the Updated MMP and the toggle disappears.
 * - RA / REC users always stay on the legacy page and never see the toggle.
 */
(function(){
  var LEGACY_URL = 'mmp_calendar_app.html';
  var UPDATED_URL = 'calendar_test.html';
  var PREF_KEY = 'mmp_calendar_version_v1';           // 'updated' | 'legacy'
  var LEGACY_LAST_DAY = new Date(2026, 9, 30);         // Oct 30, 2026 (legacy usable through end of this day, local time)
  var CUTOFF = new Date(2026, 9, 31, 0, 0, 0);         // first moment the legacy page is retired
  var EXCLUDED_ROLES = ['reslife-ra', 'reslife-rec', 'ra', 'rec'];

  function canUseUpdated(user){
    if (!user) return false;
    return EXCLUDED_ROLES.indexOf(String(user.role || '').toLowerCase()) === -1;
  }
  function legacyRetired(){ return Date.now() >= CUTOFF.getTime(); }
  function getPref(){ try { return localStorage.getItem(PREF_KEY) || ''; } catch(e){ return ''; } }
  function setPref(v){ try { localStorage.setItem(PREF_KEY, v); } catch(e){} }
  function lastDayLabel(){ return (LEGACY_LAST_DAY.getMonth() + 1) + '/' + LEGACY_LAST_DAY.getDate(); }
  function go(url){ window.location.replace(url + window.location.search + window.location.hash); }

  // Legacy page: returns true if it is navigating away (caller should stop initializing).
  function gateLegacy(user){
    if (!canUseUpdated(user)) return false;
    if (legacyRetired() || getPref() === 'updated'){ go(UPDATED_URL); return true; }
    var banner = document.getElementById('mmpVersionBanner');
    var toggle = document.getElementById('mmpVersionToggle');
    var date = document.getElementById('mmpLegacyDate');
    if (date) date.textContent = lastDayLabel();
    if (banner) banner.style.display = '';
    if (toggle && !toggle._mmpBound){
      toggle._mmpBound = true;
      toggle.checked = false;
      toggle.addEventListener('change', function(){
        if (!toggle.checked) return;
        setPref('updated');
        setTimeout(function(){ go(UPDATED_URL); }, 180); // let the switch animate
      });
    }
    return false;
  }

  // Updated page: returns true if it is navigating away (caller should stop initializing).
  function gateUpdated(user){
    if (!canUseUpdated(user)){ go(LEGACY_URL); return true; }
    var retired = legacyRetired();
    var banner = document.getElementById('mmpVersionBanner');
    var toggle = document.getElementById('mmpVersionToggle');
    var date = document.getElementById('mmpLegacyDate');
    if (date) date.textContent = lastDayLabel();
    if (!retired) setPref('updated');
    if (banner) banner.style.display = retired ? 'none' : '';
    if (toggle && !toggle._mmpBound){
      toggle._mmpBound = true;
      toggle.checked = true;
      toggle.addEventListener('change', function(){
        if (toggle.checked) return;
        setPref('legacy');
        setTimeout(function(){ go(LEGACY_URL); }, 180);
      });
    }
    return false;
  }

  window.MMPVersion = {
    canUseUpdated: canUseUpdated, legacyRetired: legacyRetired,
    gateLegacy: gateLegacy, gateUpdated: gateUpdated, lastDayLabel: lastDayLabel,
  };
})();
