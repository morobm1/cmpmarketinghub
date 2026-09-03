/**
 * Reslife Access Guard
 *
 * Lightweight standalone guard for pages that don't include standard-nav.js
 * (one-off tool pages linked from custom_tools.html). Reslife credentials
 * (Reslife - RA, Reslife - REC, Reslife Admin) have no access to any
 * Marketing Hub page other than the Reslife Hub itself, so this redirects
 * them immediately, mirroring the enforcement built into standard-nav.js.
 *
 * Usage: <script src="reslife-guard.js"></script> (or "../reslife-guard.js"
 * from a subfolder) as early as possible in <head> or <body>.
 */
(function () {
  'use strict';
  var RESLIFE_ROLES = ['reslife-ra', 'reslife-rec', 'reslife-admin'];
  var depth = (document.currentScript && document.currentScript.getAttribute('src') || '').indexOf('../') === 0 ? '../' : '';

  fetch('/api/me', { credentials: 'include' })
    .then(function (res) { return res.ok ? res.json() : null; })
    .then(function (user) {
      if (user && RESLIFE_ROLES.indexOf(user.role) !== -1) {
        window.location.href = depth + 'reslife_hub.html';
      }
    })
    .catch(function () {});
})();
