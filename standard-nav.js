/**
 * Standard Vertical Navigation + Shared Header System for Marketing Hub
 * Include this script in all HTML pages: <script src="standard-nav.js"></script>
 * Place it before the closing </body> tag
 *
 * Features:
 * - Collapsible sidebar (full 240px or slim 60px icon rail)
 * - Navigation items/icons/order/role-visibility loaded from /api/nav-config
 *   (Admin-editable via the Navigation Manager in mmp_admin.html), with the
 *   original hardcoded list kept only as an offline/error fallback.
 * - Bootstrap Icons (free, no build step) for nav item icons.
 * - Shared header CSS (logo/title/header-controls) so every page that already
 *   has a <header class="brand">...</header> renders identically, without
 *   each page keeping its own copy of the same rules.
 * - Header height is measured at runtime (not hardcoded) so the sidebar/content
 *   offset is always correct even if a page's header is taller, shorter, or
 *   not yet visible (e.g. rendered later by a client-side app shell).
 * - Toggle arrow to collapse/expand, state persisted in localStorage.
 * - Admin-only cross-hub link to the Reslife Hub.
 */

(function() {
  'use strict';

  var EXPANDED_W = 240;
  var COLLAPSED_W = 60;
  var STORAGE_KEY = 'mmp_nav_collapsed';
  var DEFAULT_HEADER_H = 60;

  // ---- Nav icon library: Lucide (https://lucide.dev, ISC license) ----
  // Single-color line icons rendered as inline SVG (stroke="currentColor"), so they need no
  // external font/CDN (the old Bootstrap Icons webfont was blocked by the site CSP font-src and
  // rendered as empty squares). Curated subset; legacy "bi-*" values are mapped automatically.
  var ICON_PATHS = {"calendar":"<path d=\"M8 2v4\"/><path d=\"M16 2v4\"/><rect width=\"18\" height=\"18\" x=\"3\" y=\"4\" rx=\"2\"/><path d=\"M3 10h18\"/>","calendar-check":"<path d=\"M8 2v4\"/><path d=\"M16 2v4\"/><rect width=\"18\" height=\"18\" x=\"3\" y=\"4\" rx=\"2\"/><path d=\"M3 10h18\"/><path d=\"m9 16 2 2 4-4\"/>","calendar-days":"<path d=\"M8 2v4\"/><path d=\"M16 2v4\"/><rect width=\"18\" height=\"18\" x=\"3\" y=\"4\" rx=\"2\"/><path d=\"M3 10h18\"/><path d=\"M8 14h.01\"/><path d=\"M12 14h.01\"/><path d=\"M16 14h.01\"/><path d=\"M8 18h.01\"/><path d=\"M12 18h.01\"/><path d=\"M16 18h.01\"/>","calendar-range":"<rect width=\"18\" height=\"18\" x=\"3\" y=\"4\" rx=\"2\"/><path d=\"M16 2v4\"/><path d=\"M3 10h18\"/><path d=\"M8 2v4\"/><path d=\"M17 14h-6\"/><path d=\"M13 18H7\"/><path d=\"M7 14h.01\"/><path d=\"M17 18h.01\"/>","clock":"<circle cx=\"12\" cy=\"12\" r=\"10\"/><polyline points=\"12 6 12 12 16 14\"/>","history":"<path d=\"M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8\"/><path d=\"M3 3v5h5\"/><path d=\"M12 7v5l4 2\"/>","alarm-clock":"<circle cx=\"12\" cy=\"13\" r=\"8\"/><path d=\"M12 9v4l2 2\"/><path d=\"M5 3 2 6\"/><path d=\"m22 6-3-3\"/><path d=\"M6.38 18.7 4 21\"/><path d=\"M17.64 18.67 20 21\"/>","trending-up":"<polyline points=\"22 7 13.5 15.5 8.5 10.5 2 17\"/><polyline points=\"16 7 22 7 22 13\"/>","line-chart":"<path d=\"M3 3v16a2 2 0 0 0 2 2h16\"/><path d=\"m19 9-5 5-4-4-3 3\"/>","bar-chart-3":"<path d=\"M3 3v16a2 2 0 0 0 2 2h16\"/><path d=\"M18 17V9\"/><path d=\"M13 17V5\"/><path d=\"M8 17v-3\"/>","bar-chart-big":"<path d=\"M3 3v16a2 2 0 0 0 2 2h16\"/><rect x=\"15\" y=\"5\" width=\"4\" height=\"12\" rx=\"1\"/><rect x=\"7\" y=\"8\" width=\"4\" height=\"9\" rx=\"1\"/>","pie-chart":"<path d=\"M21 12c.552 0 1.005-.449.95-.998a10 10 0 0 0-8.953-8.951c-.55-.055-.998.398-.998.95v8a1 1 0 0 0 1 1z\"/><path d=\"M21.21 15.89A10 10 0 1 1 8 2.83\"/>","activity":"<path d=\"M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2\"/>","gauge":"<path d=\"m12 14 4-4\"/><path d=\"M3.34 19a10 10 0 1 1 17.32 0\"/>","target":"<circle cx=\"12\" cy=\"12\" r=\"10\"/><circle cx=\"12\" cy=\"12\" r=\"6\"/><circle cx=\"12\" cy=\"12\" r=\"2\"/>","layout-grid":"<rect width=\"7\" height=\"7\" x=\"3\" y=\"3\" rx=\"1\"/><rect width=\"7\" height=\"7\" x=\"14\" y=\"3\" rx=\"1\"/><rect width=\"7\" height=\"7\" x=\"14\" y=\"14\" rx=\"1\"/><rect width=\"7\" height=\"7\" x=\"3\" y=\"14\" rx=\"1\"/>","layout-dashboard":"<rect width=\"7\" height=\"9\" x=\"3\" y=\"3\" rx=\"1\"/><rect width=\"7\" height=\"5\" x=\"14\" y=\"3\" rx=\"1\"/><rect width=\"7\" height=\"9\" x=\"14\" y=\"12\" rx=\"1\"/><rect width=\"7\" height=\"5\" x=\"3\" y=\"16\" rx=\"1\"/>","columns-3":"<rect width=\"18\" height=\"18\" x=\"3\" y=\"3\" rx=\"2\"/><path d=\"M9 3v18\"/><path d=\"M15 3v18\"/>","kanban-square":"<rect width=\"18\" height=\"18\" x=\"3\" y=\"3\" rx=\"2\"/><path d=\"M8 7v7\"/><path d=\"M12 7v4\"/><path d=\"M16 7v9\"/>","table":"<path d=\"M12 3v18\"/><rect width=\"18\" height=\"18\" x=\"3\" y=\"3\" rx=\"2\"/><path d=\"M3 9h18\"/><path d=\"M3 15h18\"/>","list":"<path d=\"M3 12h.01\"/><path d=\"M3 18h.01\"/><path d=\"M3 6h.01\"/><path d=\"M8 12h13\"/><path d=\"M8 18h13\"/><path d=\"M8 6h13\"/>","list-checks":"<path d=\"m3 17 2 2 4-4\"/><path d=\"m3 7 2 2 4-4\"/><path d=\"M13 6h8\"/><path d=\"M13 12h8\"/><path d=\"M13 18h8\"/>","check-square":"<path d=\"M21 10.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h12.5\"/><path d=\"m9 11 3 3L22 4\"/>","clipboard-check":"<rect width=\"8\" height=\"4\" x=\"8\" y=\"2\" rx=\"1\" ry=\"1\"/><path d=\"M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2\"/><path d=\"m9 14 2 2 4-4\"/>","clipboard-list":"<rect width=\"8\" height=\"4\" x=\"8\" y=\"2\" rx=\"1\" ry=\"1\"/><path d=\"M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2\"/><path d=\"M12 11h4\"/><path d=\"M12 16h4\"/><path d=\"M8 11h.01\"/><path d=\"M8 16h.01\"/>","shopping-cart":"<circle cx=\"8\" cy=\"21\" r=\"1\"/><circle cx=\"19\" cy=\"21\" r=\"1\"/><path d=\"M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12\"/>","shopping-bag":"<path d=\"M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z\"/><path d=\"M3 6h18\"/><path d=\"M16 10a4 4 0 0 1-8 0\"/>","store":"<path d=\"m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7\"/><path d=\"M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8\"/><path d=\"M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4\"/><path d=\"M2 7h20\"/><path d=\"M22 7v3a2 2 0 0 1-2 2a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12a2 2 0 0 1-2-2V7\"/>","package":"<path d=\"M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z\"/><path d=\"M12 22V12\"/><path d=\"m3.3 7 7.703 4.734a2 2 0 0 0 1.994 0L20.7 7\"/><path d=\"m7.5 4.27 9 5.15\"/>","boxes":"<path d=\"M2.97 12.92A2 2 0 0 0 2 14.63v3.24a2 2 0 0 0 .97 1.71l3 1.8a2 2 0 0 0 2.06 0L12 19v-5.5l-5-3-4.03 2.42Z\"/><path d=\"m7 16.5-4.74-2.85\"/><path d=\"m7 16.5 5-3\"/><path d=\"M7 16.5v5.17\"/><path d=\"M12 13.5V19l3.97 2.38a2 2 0 0 0 2.06 0l3-1.8a2 2 0 0 0 .97-1.71v-3.24a2 2 0 0 0-.97-1.71L17 10.5l-5 3Z\"/><path d=\"m17 16.5-5-3\"/><path d=\"m17 16.5 4.74-2.85\"/><path d=\"M17 16.5v5.17\"/><path d=\"M7.97 4.42A2 2 0 0 0 7 6.13v4.37l5 3 5-3V6.13a2 2 0 0 0-.97-1.71l-3-1.8a2 2 0 0 0-2.06 0l-3 1.8Z\"/><path d=\"M12 8 7.26 5.15\"/><path d=\"m12 8 4.74-2.85\"/><path d=\"M12 13.5V8\"/>","truck":"<path d=\"M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2\"/><path d=\"M15 18H9\"/><path d=\"M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14\"/><circle cx=\"17\" cy=\"18\" r=\"2\"/><circle cx=\"7\" cy=\"18\" r=\"2\"/>","tag":"<path d=\"M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z\"/><circle cx=\"7.5\" cy=\"7.5\" r=\".5\" fill=\"currentColor\"/>","tags":"<path d=\"m15 5 6.3 6.3a2.4 2.4 0 0 1 0 3.4L17 19\"/><path d=\"M9.586 5.586A2 2 0 0 0 8.172 5H3a1 1 0 0 0-1 1v5.172a2 2 0 0 0 .586 1.414L8.29 18.29a2.426 2.426 0 0 0 3.42 0l3.58-3.58a2.426 2.426 0 0 0 0-3.42z\"/><circle cx=\"6.5\" cy=\"9.5\" r=\".5\" fill=\"currentColor\"/>","receipt":"<path d=\"M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z\"/><path d=\"M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8\"/><path d=\"M12 17.5v-11\"/>","credit-card":"<rect width=\"20\" height=\"14\" x=\"2\" y=\"5\" rx=\"2\"/><line x1=\"2\" x2=\"22\" y1=\"10\" y2=\"10\"/>","wallet":"<path d=\"M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1\"/><path d=\"M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4\"/>","banknote":"<rect width=\"20\" height=\"12\" x=\"2\" y=\"6\" rx=\"2\"/><circle cx=\"12\" cy=\"12\" r=\"2\"/><path d=\"M6 12h.01M18 12h.01\"/>","landmark":"<line x1=\"3\" x2=\"21\" y1=\"22\" y2=\"22\"/><line x1=\"6\" x2=\"6\" y1=\"18\" y2=\"11\"/><line x1=\"10\" x2=\"10\" y1=\"18\" y2=\"11\"/><line x1=\"14\" x2=\"14\" y1=\"18\" y2=\"11\"/><line x1=\"18\" x2=\"18\" y1=\"18\" y2=\"11\"/><polygon points=\"12 2 20 7 4 7\"/>","wand-sparkles":"<path d=\"m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72\"/><path d=\"m14 7 3 3\"/><path d=\"M5 6v4\"/><path d=\"M19 14v4\"/><path d=\"M10 2v2\"/><path d=\"M7 8H3\"/><path d=\"M21 16h-4\"/><path d=\"M11 3H9\"/>","sparkles":"<path d=\"M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z\"/><path d=\"M20 3v4\"/><path d=\"M22 5h-4\"/><path d=\"M4 17v2\"/><path d=\"M5 18H3\"/>","image":"<rect width=\"18\" height=\"18\" x=\"3\" y=\"3\" rx=\"2\" ry=\"2\"/><circle cx=\"9\" cy=\"9\" r=\"2\"/><path d=\"m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21\"/>","images":"<path d=\"M18 22H4a2 2 0 0 1-2-2V6\"/><path d=\"m22 13-1.296-1.296a2.41 2.41 0 0 0-3.408 0L11 18\"/><circle cx=\"12\" cy=\"8\" r=\"2\"/><rect width=\"16\" height=\"16\" x=\"6\" y=\"2\" rx=\"2\"/>","camera":"<path d=\"M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z\"/><circle cx=\"12\" cy=\"13\" r=\"3\"/>","palette":"<circle cx=\"13.5\" cy=\"6.5\" r=\".5\" fill=\"currentColor\"/><circle cx=\"17.5\" cy=\"10.5\" r=\".5\" fill=\"currentColor\"/><circle cx=\"8.5\" cy=\"7.5\" r=\".5\" fill=\"currentColor\"/><circle cx=\"6.5\" cy=\"12.5\" r=\".5\" fill=\"currentColor\"/><path d=\"M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z\"/>","brush":"<path d=\"m9.06 11.9 8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08\"/><path d=\"M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.1 2.49 2.02 4 2.02 2.2 0 4-1.8 4-4.04a3.01 3.01 0 0 0-3-3.02z\"/>","pen-tool":"<path d=\"M15.707 21.293a1 1 0 0 1-1.414 0l-1.586-1.586a1 1 0 0 1 0-1.414l5.586-5.586a1 1 0 0 1 1.414 0l1.586 1.586a1 1 0 0 1 0 1.414z\"/><path d=\"m18 13-1.375-6.874a1 1 0 0 0-.746-.776L3.235 2.028a1 1 0 0 0-1.207 1.207L5.35 15.879a1 1 0 0 0 .776.746L13 18\"/><path d=\"m2.3 2.3 7.286 7.286\"/><circle cx=\"11\" cy=\"11\" r=\"2\"/>","paintbrush":"<path d=\"m14.622 17.897-10.68-2.913\"/><path d=\"M18.376 2.622a1 1 0 1 1 3.002 3.002L17.36 9.643a.5.5 0 0 0 0 .707l.944.944a2.41 2.41 0 0 1 0 3.408l-.944.944a.5.5 0 0 1-.707 0L8.354 7.348a.5.5 0 0 1 0-.707l.944-.944a2.41 2.41 0 0 1 3.408 0l.944.944a.5.5 0 0 0 .707 0z\"/><path d=\"M9 8c-1.804 2.71-3.97 3.46-6.583 3.948a.507.507 0 0 0-.302.819l7.32 8.883a1 1 0 0 0 1.185.204C12.735 20.405 16 16.792 16 15\"/>","film":"<rect width=\"18\" height=\"18\" x=\"3\" y=\"3\" rx=\"2\"/><path d=\"M7 3v18\"/><path d=\"M3 7.5h4\"/><path d=\"M3 12h18\"/><path d=\"M3 16.5h4\"/><path d=\"M17 3v18\"/><path d=\"M17 7.5h4\"/><path d=\"M17 16.5h4\"/>","video":"<path d=\"m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5\"/><rect x=\"2\" y=\"6\" width=\"14\" height=\"12\" rx=\"2\"/>","user":"<path d=\"M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2\"/><circle cx=\"12\" cy=\"7\" r=\"4\"/>","users":"<path d=\"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2\"/><circle cx=\"9\" cy=\"7\" r=\"4\"/><path d=\"M22 21v-2a4 4 0 0 0-3-3.87\"/><path d=\"M16 3.13a4 4 0 0 1 0 7.75\"/>","user-check":"<path d=\"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2\"/><circle cx=\"9\" cy=\"7\" r=\"4\"/><polyline points=\"16 11 18 13 22 9\"/>","user-cog":"<circle cx=\"18\" cy=\"15\" r=\"3\"/><circle cx=\"9\" cy=\"7\" r=\"4\"/><path d=\"M10 15H6a4 4 0 0 0-4 4v2\"/><path d=\"m21.7 16.4-.9-.3\"/><path d=\"m15.2 13.9-.9-.3\"/><path d=\"m16.6 18.7.3-.9\"/><path d=\"m19.1 12.2.3-.9\"/><path d=\"m19.6 18.7-.4-1\"/><path d=\"m16.8 12.3-.4-1\"/><path d=\"m14.3 16.6 1-.4\"/><path d=\"m20.7 13.8 1-.4\"/>","contact":"<path d=\"M16 2v2\"/><path d=\"M7 22v-2a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2\"/><path d=\"M8 2v2\"/><circle cx=\"12\" cy=\"11\" r=\"3\"/><rect x=\"3\" y=\"4\" width=\"18\" height=\"18\" rx=\"2\"/>","id-card":"<path d=\"M16 10h2\"/><path d=\"M16 14h2\"/><path d=\"M6.17 15a3 3 0 0 1 5.66 0\"/><circle cx=\"9\" cy=\"11\" r=\"2\"/><rect x=\"2\" y=\"5\" width=\"20\" height=\"14\" rx=\"2\"/>","user-round":"<circle cx=\"12\" cy=\"8\" r=\"5\"/><path d=\"M20 21a8 8 0 0 0-16 0\"/>","users-round":"<path d=\"M18 21a8 8 0 0 0-16 0\"/><circle cx=\"10\" cy=\"8\" r=\"5\"/><path d=\"M22 20c0-3.37-2-6.5-4-8a5 5 0 0 0-.45-8.3\"/>","settings":"<path d=\"M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/>","settings-2":"<path d=\"M20 7h-9\"/><path d=\"M14 17H5\"/><circle cx=\"17\" cy=\"17\" r=\"3\"/><circle cx=\"7\" cy=\"7\" r=\"3\"/>","sliders-horizontal":"<line x1=\"21\" x2=\"14\" y1=\"4\" y2=\"4\"/><line x1=\"10\" x2=\"3\" y1=\"4\" y2=\"4\"/><line x1=\"21\" x2=\"12\" y1=\"12\" y2=\"12\"/><line x1=\"8\" x2=\"3\" y1=\"12\" y2=\"12\"/><line x1=\"21\" x2=\"16\" y1=\"20\" y2=\"20\"/><line x1=\"12\" x2=\"3\" y1=\"20\" y2=\"20\"/><line x1=\"14\" x2=\"14\" y1=\"2\" y2=\"6\"/><line x1=\"8\" x2=\"8\" y1=\"10\" y2=\"14\"/><line x1=\"16\" x2=\"16\" y1=\"18\" y2=\"22\"/>","wrench":"<path d=\"M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z\"/>","hammer":"<path d=\"m15 12-8.373 8.373a1 1 0 1 1-3-3L12 9\"/><path d=\"m18 15 4-4\"/><path d=\"m21.5 11.5-1.914-1.914A2 2 0 0 1 19 8.172V7l-2.26-2.26a6 6 0 0 0-4.202-1.756L9 2.96l.92.82A6.18 6.18 0 0 1 12 8.4V10l2 2h1.172a2 2 0 0 1 1.414.586L18.5 14.5\"/>","cog":"<path d=\"M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z\"/><path d=\"M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z\"/><path d=\"M12 2v2\"/><path d=\"M12 22v-2\"/><path d=\"m17 20.66-1-1.73\"/><path d=\"M11 10.27 7 3.34\"/><path d=\"m20.66 17-1.73-1\"/><path d=\"m3.34 7 1.73 1\"/><path d=\"M14 12h8\"/><path d=\"M2 12h2\"/><path d=\"m20.66 7-1.73 1\"/><path d=\"m3.34 17 1.73-1\"/><path d=\"m17 3.34-1 1.73\"/><path d=\"m11 13.73-4 6.93\"/>","book":"<path d=\"M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20\"/>","book-open":"<path d=\"M12 7v14\"/><path d=\"M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z\"/>","book-marked":"<path d=\"M10 2v8l3-3 3 3V2\"/><path d=\"M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20\"/>","notebook":"<path d=\"M2 6h4\"/><path d=\"M2 10h4\"/><path d=\"M2 14h4\"/><path d=\"M2 18h4\"/><rect width=\"16\" height=\"20\" x=\"4\" y=\"2\" rx=\"2\"/><path d=\"M16 2v20\"/>","library":"<path d=\"m16 6 4 14\"/><path d=\"M12 6v14\"/><path d=\"M8 8v12\"/><path d=\"M4 4v16\"/>","graduation-cap":"<path d=\"M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z\"/><path d=\"M22 10v6\"/><path d=\"M6 12.5V16a6 3 0 0 0 12 0v-3.5\"/>","file":"<path d=\"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z\"/><path d=\"M14 2v4a2 2 0 0 0 2 2h4\"/>","file-text":"<path d=\"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z\"/><path d=\"M14 2v4a2 2 0 0 0 2 2h4\"/><path d=\"M10 9H8\"/><path d=\"M16 13H8\"/><path d=\"M16 17H8\"/>","files":"<path d=\"M20 7h-3a2 2 0 0 1-2-2V2\"/><path d=\"M9 18a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h7l4 4v10a2 2 0 0 1-2 2Z\"/><path d=\"M3 7.6v12.8A1.6 1.6 0 0 0 4.6 22h9.8\"/>","folder":"<path d=\"M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z\"/>","folder-open":"<path d=\"m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2\"/>","archive":"<rect width=\"20\" height=\"5\" x=\"2\" y=\"3\" rx=\"1\"/><path d=\"M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8\"/><path d=\"M10 12h4\"/>","clipboard":"<rect width=\"8\" height=\"4\" x=\"8\" y=\"2\" rx=\"1\" ry=\"1\"/><path d=\"M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2\"/>","link":"<path d=\"M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71\"/><path d=\"M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71\"/>","external-link":"<path d=\"M15 3h6v6\"/><path d=\"M10 14 21 3\"/><path d=\"M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6\"/>","globe":"<circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20\"/><path d=\"M2 12h20\"/>","map":"<path d=\"M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z\"/><path d=\"M15 5.764v15\"/><path d=\"M9 3.236v15\"/>","map-pin":"<path d=\"M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0\"/><circle cx=\"12\" cy=\"10\" r=\"3\"/>","compass":"<path d=\"m16.24 7.76-1.804 5.411a2 2 0 0 1-1.265 1.265L7.76 16.24l1.804-5.411a2 2 0 0 1 1.265-1.265z\"/><circle cx=\"12\" cy=\"12\" r=\"10\"/>","navigation":"<polygon points=\"3 11 22 2 13 21 11 13 3 11\"/>","home":"<path d=\"M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8\"/><path d=\"M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z\"/>","house":"<path d=\"M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8\"/><path d=\"M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z\"/>","building":"<rect width=\"16\" height=\"20\" x=\"4\" y=\"2\" rx=\"2\" ry=\"2\"/><path d=\"M9 22v-4h6v4\"/><path d=\"M8 6h.01\"/><path d=\"M16 6h.01\"/><path d=\"M12 6h.01\"/><path d=\"M12 10h.01\"/><path d=\"M12 14h.01\"/><path d=\"M16 10h.01\"/><path d=\"M16 14h.01\"/><path d=\"M8 10h.01\"/><path d=\"M8 14h.01\"/>","building-2":"<path d=\"M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z\"/><path d=\"M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2\"/><path d=\"M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2\"/><path d=\"M10 6h4\"/><path d=\"M10 10h4\"/><path d=\"M10 14h4\"/><path d=\"M10 18h4\"/>","door-open":"<path d=\"M13 4h3a2 2 0 0 1 2 2v14\"/><path d=\"M2 20h3\"/><path d=\"M13 20h9\"/><path d=\"M10 12v.01\"/><path d=\"M13 4.562v16.157a1 1 0 0 1-1.242.97L5 20V5.562a2 2 0 0 1 1.515-1.94l4-1A2 2 0 0 1 13 4.561Z\"/>","key":"<path d=\"m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4\"/><path d=\"m21 2-9.6 9.6\"/><circle cx=\"7.5\" cy=\"15.5\" r=\"5.5\"/>","lock":"<rect width=\"18\" height=\"11\" x=\"3\" y=\"11\" rx=\"2\" ry=\"2\"/><path d=\"M7 11V7a5 5 0 0 1 10 0v4\"/>","shield":"<path d=\"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z\"/>","shield-check":"<path d=\"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z\"/><path d=\"m9 12 2 2 4-4\"/>","mail":"<rect width=\"20\" height=\"16\" x=\"2\" y=\"4\" rx=\"2\"/><path d=\"m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7\"/>","inbox":"<polyline points=\"22 12 16 12 14 15 10 15 8 12 2 12\"/><path d=\"M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z\"/>","send":"<path d=\"M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z\"/><path d=\"m21.854 2.147-10.94 10.939\"/>","message-square":"<path d=\"M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z\"/>","message-circle":"<path d=\"M7.9 20A9 9 0 1 0 4 16.1L2 22Z\"/>","megaphone":"<path d=\"m3 11 18-5v12L3 14v-3z\"/><path d=\"M11.6 16.8a3 3 0 1 1-5.8-1.6\"/>","bell":"<path d=\"M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9\"/><path d=\"M10.3 21a1.94 1.94 0 0 0 3.4 0\"/>","phone":"<path d=\"M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z\"/>","star":"<path d=\"M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z\"/>","heart":"<path d=\"M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z\"/>","flag":"<path d=\"M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z\"/><line x1=\"4\" x2=\"4\" y1=\"22\" y2=\"15\"/>","award":"<path d=\"m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526\"/><circle cx=\"12\" cy=\"8\" r=\"6\"/>","trophy":"<path d=\"M6 9H4.5a2.5 2.5 0 0 1 0-5H6\"/><path d=\"M18 9h1.5a2.5 2.5 0 0 0 0-5H18\"/><path d=\"M4 22h16\"/><path d=\"M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22\"/><path d=\"M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22\"/><path d=\"M18 2H6v7a6 6 0 0 0 12 0V2Z\"/>","medal":"<path d=\"M7.21 15 2.66 7.14a2 2 0 0 1 .13-2.2L4.4 2.8A2 2 0 0 1 6 2h12a2 2 0 0 1 1.6.8l1.6 2.14a2 2 0 0 1 .14 2.2L16.79 15\"/><path d=\"M11 12 5.12 2.2\"/><path d=\"m13 12 5.88-9.8\"/><path d=\"M8 7h8\"/><circle cx=\"12\" cy=\"17\" r=\"5\"/><path d=\"M12 18v-2h-.5\"/>","thumbs-up":"<path d=\"M7 10v12\"/><path d=\"M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z\"/>","lightbulb":"<path d=\"M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5\"/><path d=\"M9 18h6\"/><path d=\"M10 22h4\"/>","zap":"<path d=\"M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z\"/>","rocket":"<path d=\"M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z\"/><path d=\"m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z\"/><path d=\"M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0\"/><path d=\"M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5\"/>","printer":"<path d=\"M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2\"/><path d=\"M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6\"/><rect x=\"6\" y=\"14\" width=\"12\" height=\"8\" rx=\"1\"/>","download":"<path d=\"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4\"/><polyline points=\"7 10 12 15 17 10\"/><line x1=\"12\" x2=\"12\" y1=\"15\" y2=\"3\"/>","upload":"<path d=\"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4\"/><polyline points=\"17 8 12 3 7 8\"/><line x1=\"12\" x2=\"12\" y1=\"3\" y2=\"15\"/>","share-2":"<circle cx=\"18\" cy=\"5\" r=\"3\"/><circle cx=\"6\" cy=\"12\" r=\"3\"/><circle cx=\"18\" cy=\"19\" r=\"3\"/><line x1=\"8.59\" x2=\"15.42\" y1=\"13.51\" y2=\"17.49\"/><line x1=\"15.41\" x2=\"8.59\" y1=\"6.51\" y2=\"10.49\"/>","search":"<circle cx=\"11\" cy=\"11\" r=\"8\"/><path d=\"m21 21-4.3-4.3\"/>","filter":"<polygon points=\"22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3\"/>","info":"<circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"M12 16v-4\"/><path d=\"M12 8h.01\"/>","circle-help":"<circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3\"/><path d=\"M12 17h.01\"/>","alert-triangle":"<path d=\"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3\"/><path d=\"M12 9v4\"/><path d=\"M12 17h.01\"/>","circle-check":"<circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"m9 12 2 2 4-4\"/>","arrow-left":"<path d=\"m12 19-7-7 7-7\"/><path d=\"M19 12H5\"/>","arrow-right":"<path d=\"M5 12h14\"/><path d=\"m12 5 7 7-7 7\"/>","arrow-left-circle":"<circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"M16 12H8\"/><path d=\"m12 8-4 4 4 4\"/>","chevron-right":"<path d=\"m9 18 6-6-6-6\"/>","briefcase":"<path d=\"M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16\"/><rect width=\"20\" height=\"14\" x=\"2\" y=\"6\" rx=\"2\"/>","presentation":"<path d=\"M2 3h20\"/><path d=\"M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3\"/><path d=\"m7 21 5-5 5 5\"/>","handshake":"<path d=\"m11 17 2 2a1 1 0 1 0 3-3\"/><path d=\"m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4\"/><path d=\"m21 3 1 11h-2\"/><path d=\"M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3\"/><path d=\"M3 4h8\"/>","party-popper":"<path d=\"M5.8 11.3 2 22l10.7-3.79\"/><path d=\"M4 3h.01\"/><path d=\"M22 8h.01\"/><path d=\"M15 2h.01\"/><path d=\"M22 20h.01\"/><path d=\"m22 2-2.24.75a2.9 2.9 0 0 0-1.96 3.12c.1.86-.57 1.63-1.45 1.63h-.38c-.86 0-1.6.6-1.76 1.44L14 10\"/><path d=\"m22 13-.82-.33c-.86-.34-1.82.2-1.98 1.11c-.11.7-.72 1.22-1.43 1.22H17\"/><path d=\"m11 2 .33.82c.34.86-.2 1.82-1.11 1.98C9.52 4.9 9 5.52 9 6.23V7\"/><path d=\"M11 13c1.93 1.93 2.83 4.17 2 5-.83.83-3.07-.07-5-2-1.93-1.93-2.83-4.17-2-5 .83-.83 3.07.07 5 2Z\"/>","gift":"<rect x=\"3\" y=\"8\" width=\"18\" height=\"4\" rx=\"1\"/><path d=\"M12 8v13\"/><path d=\"M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7\"/><path d=\"M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5\"/>","coffee":"<path d=\"M10 2v2\"/><path d=\"M14 2v2\"/><path d=\"M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1\"/><path d=\"M6 2v2\"/>","utensils":"<path d=\"M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2\"/><path d=\"M7 2v20\"/><path d=\"M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7\"/>","bed":"<path d=\"M2 4v16\"/><path d=\"M2 8h18a2 2 0 0 1 2 2v10\"/><path d=\"M2 17h20\"/><path d=\"M6 8v9\"/>","bus":"<path d=\"M8 6v6\"/><path d=\"M15 6v6\"/><path d=\"M2 12h19.6\"/><path d=\"M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3\"/><circle cx=\"7\" cy=\"18\" r=\"2\"/><path d=\"M9 18h5\"/><circle cx=\"16\" cy=\"18\" r=\"2\"/>","car":"<path d=\"M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2\"/><circle cx=\"7\" cy=\"17\" r=\"2\"/><path d=\"M9 17h6\"/><circle cx=\"17\" cy=\"17\" r=\"2\"/>","database":"<ellipse cx=\"12\" cy=\"5\" rx=\"9\" ry=\"3\"/><path d=\"M3 5V19A9 3 0 0 0 21 19V5\"/><path d=\"M3 12A9 3 0 0 0 21 12\"/>","server":"<rect width=\"20\" height=\"8\" x=\"2\" y=\"2\" rx=\"2\" ry=\"2\"/><rect width=\"20\" height=\"8\" x=\"2\" y=\"14\" rx=\"2\" ry=\"2\"/><line x1=\"6\" x2=\"6.01\" y1=\"6\" y2=\"6\"/><line x1=\"6\" x2=\"6.01\" y1=\"18\" y2=\"18\"/>","cloud":"<path d=\"M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z\"/>","monitor":"<rect width=\"20\" height=\"14\" x=\"2\" y=\"3\" rx=\"2\"/><line x1=\"8\" x2=\"16\" y1=\"21\" y2=\"21\"/><line x1=\"12\" x2=\"12\" y1=\"17\" y2=\"21\"/>","smartphone":"<rect width=\"14\" height=\"20\" x=\"5\" y=\"2\" rx=\"2\" ry=\"2\"/><path d=\"M12 18h.01\"/>","laptop":"<path d=\"M20 16V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9m16 0H4m16 0 1.28 2.55a1 1 0 0 1-.9 1.45H3.62a1 1 0 0 1-.9-1.45L4 16\"/>","qr-code":"<rect width=\"5\" height=\"5\" x=\"3\" y=\"3\" rx=\"1\"/><rect width=\"5\" height=\"5\" x=\"16\" y=\"3\" rx=\"1\"/><rect width=\"5\" height=\"5\" x=\"3\" y=\"16\" rx=\"1\"/><path d=\"M21 16h-3a2 2 0 0 0-2 2v3\"/><path d=\"M21 21v.01\"/><path d=\"M12 7v3a2 2 0 0 1-2 2H7\"/><path d=\"M3 12h.01\"/><path d=\"M12 3h.01\"/><path d=\"M12 16v.01\"/><path d=\"M16 12h1\"/><path d=\"M21 12v.01\"/><path d=\"M12 21v-1\"/>","layers":"<path d=\"m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z\"/><path d=\"m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65\"/><path d=\"m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65\"/>","grid-3x3":"<rect width=\"18\" height=\"18\" x=\"3\" y=\"3\" rx=\"2\"/><path d=\"M3 9h18\"/><path d=\"M3 15h18\"/><path d=\"M9 3v18\"/><path d=\"M15 3v18\"/>","puzzle":"<path d=\"M15.39 4.39a1 1 0 0 0 1.68-.474 2.5 2.5 0 1 1 3.014 3.015 1 1 0 0 0-.474 1.68l1.683 1.682a2.414 2.414 0 0 1 0 3.414L19.61 15.39a1 1 0 0 1-1.68-.474 2.5 2.5 0 1 0-3.014 3.015 1 1 0 0 1 .474 1.68l-1.683 1.682a2.414 2.414 0 0 1-3.414 0L8.61 19.61a1 1 0 0 0-1.68.474 2.5 2.5 0 1 1-3.014-3.015 1 1 0 0 0 .474-1.68l-1.683-1.682a2.414 2.414 0 0 1 0-3.414L4.39 8.61a1 1 0 0 1 1.68.474 2.5 2.5 0 1 0 3.014-3.015 1 1 0 0 1-.474-1.68l1.683-1.682a2.414 2.414 0 0 1 3.414 0z\"/>","bookmark":"<path d=\"m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z\"/>","newspaper":"<path d=\"M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2\"/><path d=\"M18 14h-8\"/><path d=\"M15 18h-5\"/><path d=\"M10 6h8v4h-8V6Z\"/>","scroll-text":"<path d=\"M15 12h-5\"/><path d=\"M15 8h-5\"/><path d=\"M19 17V5a2 2 0 0 0-2-2H4\"/><path d=\"M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3\"/>"};
  var LEGACY_BI_MAP = {"calendar3":"calendar","calendar-check":"calendar-check","calendar-week":"calendar-days","graph-up-arrow":"trending-up","graph-up":"line-chart","bar-chart-steps":"bar-chart-big","bar-chart":"bar-chart-3","columns-gap":"layout-grid","grid-3x3-gap":"grid-3x3","cart3":"shopping-cart","bag-check":"shopping-bag","bag":"shopping-bag","magic":"wand-sparkles","images":"images","image":"image","person-lines-fill":"contact","people":"users","person-badge":"id-card","kanban":"kanban-square","clipboard-check":"clipboard-check","gear-wide-connected":"settings","gear":"settings","sliders":"sliders-horizontal","journal-bookmark":"book-marked","journal-text":"notebook","file-earmark-text":"file-text","file-earmark":"file","folder":"folder","link-45deg":"link","box-arrow-up-right":"external-link","building":"building-2","house-door":"home","mailbox":"inbox","envelope":"mail","chat-dots":"message-square","megaphone":"megaphone","star":"star","flag":"flag","clock-history":"history","shield-check":"shield-check","tools":"wrench","wrench-adjustable":"wrench","printer":"printer","camera":"camera","palette":"palette","brush":"brush","pie-chart":"pie-chart","clipboard-data":"clipboard-list","list-check":"list-checks","check2-square":"check-square","award":"award","trophy":"trophy","lightbulb":"lightbulb","globe":"globe","map":"map","geo-alt":"map-pin","truck":"truck","boxes":"boxes","tag":"tag","tags":"tags","credit-card":"credit-card","cash-stack":"banknote","bank":"landmark","briefcase":"briefcase","book":"book","mortarboard":"graduation-cap","door-open":"door-open","key":"key","arrow-left-circle":"arrow-left-circle","house":"house","question-circle":"circle-help","info-circle":"info","bell":"bell"};
  function resolveIconName(name) {
    var n = String(name || '').trim().replace(/^bi\s+/, '');
    if (n.indexOf('bi-') === 0) n = LEGACY_BI_MAP[n.slice(3)] || '';
    return ICON_PATHS[n] ? n : 'link';
  }
  function iconSVG(name, size) {
    var s = size || 18;
    return '<svg class="mmp-icon" xmlns="http://www.w3.org/2000/svg" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + ICON_PATHS[resolveIconName(name)] + '</svg>';
  }
  window.MMPIcons = { svg: iconSVG, resolve: resolveIconName, names: function () { return Object.keys(ICON_PATHS); } };

  // ---- UI-chrome icons (collapse/expand chevrons — not nav-item data) ----
  var chromeIcons = {
    'collapse': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="11 17 6 12 11 7"/><polyline points="18 17 13 12 18 7"/></svg>',
    'expand': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/></svg>',
  };

  // Hardcoded fallback — used only if /api/nav-config can't be reached (offline/error) or
  // before it resolves, so the nav is never blank. This mirrors the previous static list.
  var fallbackNavStructure = {
    main: [
      { href: 'mmp_calendar_app.html', label: 'Marketing Calendar', icon: 'bi-calendar3' },
      { href: 'marketing_plans.html', label: 'Marketing Plans', icon: 'bi-file-earmark-text' },
      { href: 'mmp_monthly_plan.html', label: 'Monthly Marketing Plan', icon: 'bi-calendar-check' },
      { href: 'velocity_tracker.html', label: 'Velocity Tracker', icon: 'bi-graph-up-arrow' },
      { href: 'competitor_cards.html', label: 'Competitor Cards', icon: 'bi-columns-gap' },
      { href: 'mplr.html', label: 'MPLR', icon: 'bi-bar-chart-steps' }
    ],
    tools: [
      { href: 'promo_order_tracker.html', label: 'Promo Order Tracker', icon: 'bi-cart3' },
      { href: 'uniform_shop.html', label: 'Uniform Shop', icon: 'bi-bag-check' },
      { href: 'creative_studio.html', label: 'Creative Studio', icon: 'bi-magic' },
      { href: 'creative_library.html', label: 'Creative Library', icon: 'bi-images' },
      { href: 'marketing_contacts.html', label: 'Marketing Contacts', icon: 'bi-person-lines-fill' },
      { href: 'leasing_staff_list.html', label: 'Project Management', icon: 'bi-kanban' },
      { href: 'custom_tools.html', label: 'Custom Tools', icon: 'bi-gear-wide-connected' }
    ],
    resources: [
      { href: 'sop_library.html', label: 'SOP Library', icon: 'bi-journal-bookmark' }
    ],
    admin: []
  };

  var maintenanceAllowedHrefs = [
    'custom_tools.html',
    'leasing_staff_list.html',
    'sop_library.html'
  ];

  // Reslife credentials (Reslife - RA, Reslife - REC, Reslife Admin) are locked out of
  // the entire Marketing Hub and belong only in the branded Reslife Hub. They have their
  // own dedicated Creative Studio/Library (reslife_creative_studio.html,
  // reslife_creative_library.html), so no exception is needed here.
  var reslifeRoles = ['reslife-ra', 'reslife-rec', 'reslife-admin'];

  // Nav item name/link now come from admin-editable input (Navigation Manager), not just
  // hardcoded strings, so escape before interpolating into HTML attributes/text.
  function escHTML(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function itemVisibleForRole(item, role) {
    if (!item.roles || item.roles.length === 0) return true;
    return item.roles.indexOf(role) !== -1;
  }

  // Converts the flat, admin-editable /api/nav-config item list into the grouped
  // {main:[],tools:[],resources:[]} shape the existing render code already expects,
  // filtered to items this role may see and that are currently enabled.
  function buildStructureFromConfig(items, role) {
    var out = { main: [], tools: [], resources: [], admin: [] };
    items
      .filter(function(it) { return it.enabled !== false && itemVisibleForRole(it, role); })
      .sort(function(a, b) { return (a.order || 0) - (b.order || 0); })
      .forEach(function(it) {
        var section = out[it.section] ? it.section : 'tools';
        var target = it.link || '#';
        var external = it.destinationType === 'external';
        out[section].push({
          href: target,
          label: it.name,
          icon: it.icon || 'bi-link-45deg',
          external: external
        });
      });
    return out;
  }

  function getNavStructure(role, baseStructure) {
    if (role === 'maintenance') {
      function filterMaintenanceItems(items) {
        return items.filter(function(item) {
          return maintenanceAllowedHrefs.indexOf(item.href) !== -1;
        });
      }
      return {
        main: filterMaintenanceItems(baseStructure.main),
        tools: filterMaintenanceItems(baseStructure.tools),
        resources: filterMaintenanceItems(baseStructure.resources),
        admin: []
      };
    }
    if (reslifeRoles.indexOf(role) !== -1) {
      return {
        main: [{ href: 'reslife_hub.html', label: 'Back to Reslife Hub', icon: 'bi-arrow-left-circle' }],
        tools: [],
        resources: [],
        admin: []
      };
    }
    if (role === 'admin') {
      var withAdminLink = {
        main: baseStructure.main, tools: baseStructure.tools, resources: baseStructure.resources,
        admin: [{ href: 'reslife_hub.html', label: 'Reslife Hub', icon: 'bi-building' }]
      };
      return withAdminLink;
    }
    return baseStructure;
  }

  var navStructure = fallbackNavStructure;

  // Check initial state
  var isCollapsed = false;
  try { isCollapsed = localStorage.getItem(STORAGE_KEY) === '1'; } catch(e) {}

  // CSS for the navigation + shared header. Layout offsets use a CSS custom property
  // (--app-header-h) that is measured from the real header at runtime instead of a
  // hardcoded pixel value, so this works correctly even when a page's header is taller
  // than expected, wraps to two lines, or isn't visible yet at script-run time.
  var navCSS = '\n\
    :root { --app-header-h: ' + DEFAULT_HEADER_H + 'px; }\n\
    /* ===== Shared Header (single source of truth for logo/title/controls) ===== */\n\
    header{padding:12px 24px;border-bottom:1px solid var(--border,#e5e7eb);background:#fff;position:sticky;top:0;z-index:40;display:flex;align-items:center;gap:16px;flex-wrap:wrap}\n\
    .brand{display:flex;align-items:center;gap:10px}\n\
    .brand .logo-img{height:28px;width:auto;display:block}\n\
    .brand .title{color:#ffb732;font-family:zooja-pro,Arial,sans-serif;font-weight:400;font-size:clamp(32px,4vw,48px);line-height:1}\n\
    .header-controls{display:flex;align-items:center;gap:12px;margin-left:auto}\n\
    .header-controls select{background:#fff;border:1px solid var(--border,#e5e7eb);border-radius:6px;padding:8px 12px;font-size:13px;color:var(--text,#1f2937);min-width:200px;cursor:pointer}\n\
    .header-controls select:focus{outline:none;border-color:var(--brand-accent-2,#52d5ff);box-shadow:0 0 0 3px rgba(82,213,255,0.15)}\n\
    .header-btn{background:#fff;border:1px solid var(--border,#e5e7eb);border-radius:6px;padding:8px 14px;font-size:13px;font-weight:600;color:var(--text,#1f2937);cursor:pointer;transition:all .15s}\n\
    .header-btn:hover{background:#f8fafc;border-color:#cbd5e1}\n\
    .company-name{font-size:12px;color:var(--subtext,#6b7280);font-weight:500}\n\
    \n\
    /* Vertical Sidebar Navigation */\n\
    .sidebar-nav {\n\
      position: fixed;\n\
      left: 0;\n\
      top: var(--app-header-h, ' + DEFAULT_HEADER_H + 'px);\n\
      width: ' + EXPANDED_W + 'px;\n\
      height: calc(100vh - var(--app-header-h, ' + DEFAULT_HEADER_H + 'px));\n\
      background: #1e293b;\n\
      overflow-y: auto;\n\
      overflow-x: hidden;\n\
      z-index: 30;\n\
      transition: width .25s cubic-bezier(.4,0,.2,1);\n\
    }\n\
    .sidebar-nav.collapsed {\n\
      width: ' + COLLAPSED_W + 'px;\n\
    }\n\
    .sidebar-nav::-webkit-scrollbar { width: 6px; }\n\
    .sidebar-nav::-webkit-scrollbar-track { background: #0f172a; }\n\
    .sidebar-nav::-webkit-scrollbar-thumb { background: #475569; border-radius: 3px; }\n\
    .sidebar-nav::-webkit-scrollbar-thumb:hover { background: #64748b; }\n\
    \n\
    .nav-section {\n\
      padding: 20px 0 8px 0;\n\
    }\n\
    .nav-section-title {\n\
      padding: 0 16px 8px 16px;\n\
      font-size: 11px;\n\
      font-weight: 700;\n\
      color: rgba(255,255,255,0.5);\n\
      text-transform: uppercase;\n\
      letter-spacing: 0.5px;\n\
      white-space: nowrap;\n\
      overflow: hidden;\n\
      transition: opacity .2s;\n\
    }\n\
    .sidebar-nav.collapsed .nav-section-title {\n\
      opacity: 0;\n\
      height: 0;\n\
      padding: 0;\n\
      margin: 0;\n\
    }\n\
    \n\
    .nav-item {\n\
      display: flex;\n\
      align-items: center;\n\
      gap: 12px;\n\
      padding: 10px 16px;\n\
      color: rgba(255,255,255,0.7);\n\
      text-decoration: none;\n\
      font-size: 14px;\n\
      font-weight: 500;\n\
      transition: all .15s;\n\
      border-left: 3px solid transparent;\n\
      position: relative;\n\
      white-space: nowrap;\n\
      overflow: hidden;\n\
    }\n\
    .nav-item:hover {\n\
      background: rgba(255,255,255,0.05);\n\
      color: #fff;\n\
      border-left-color: transparent;\n\
    }\n\
    .nav-item:focus-visible {\n\
      outline: 2px solid #52d5ff;\n\
      outline-offset: -2px;\n\
    }\n\
    .nav-item.active {\n\
      background: rgba(82,213,255,0.15);\n\
      color: #fff;\n\
      border-left-color: #52d5ff;\n\
      font-weight: 600;\n\
    }\n\
    .nav-item-icon {\n\
      flex-shrink: 0;\n\
      width: 18px;\n\
      height: 18px;\n\
      display: flex;\n\
      align-items: center;\n\
      justify-content: center;\n\
      font-size: 16px;\n\
    }\n\
    .nav-item-label {\n\
      transition: opacity .2s, width .2s;\n\
      overflow: hidden;\n\
    }\n\
    .nav-item-ext-icon { margin-left: auto; opacity: .6; font-size: 12px; flex-shrink: 0; }\n\
    .sidebar-nav.collapsed .nav-item {\n\
      padding: 10px 0;\n\
      justify-content: center;\n\
      border-left-width: 0;\n\
    }\n\
    .sidebar-nav.collapsed .nav-item-label, .sidebar-nav.collapsed .nav-item-ext-icon {\n\
      opacity: 0;\n\
      width: 0;\n\
    }\n\
    .sidebar-nav.collapsed .nav-item:hover::after {\n\
      content: attr(data-label);\n\
      position: absolute;\n\
      left: ' + COLLAPSED_W + 'px;\n\
      top: 50%;\n\
      transform: translateY(-50%);\n\
      background: #0f172a;\n\
      color: #fff;\n\
      padding: 6px 12px;\n\
      border-radius: 6px;\n\
      font-size: 13px;\n\
      font-weight: 500;\n\
      white-space: nowrap;\n\
      z-index: 100;\n\
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);\n\
      pointer-events: none;\n\
    }\n\
    \n\
    /* Toggle button */\n\
    .nav-collapse-btn {\n\
      display: flex;\n\
      align-items: center;\n\
      justify-content: center;\n\
      width: 100%;\n\
      padding: 12px 16px;\n\
      background: rgba(255,255,255,0.03);\n\
      border: none;\n\
      border-top: 1px solid rgba(255,255,255,0.08);\n\
      color: rgba(255,255,255,0.5);\n\
      cursor: pointer;\n\
      transition: all .15s;\n\
      gap: 8px;\n\
      font-size: 12px;\n\
      font-family: inherit;\n\
    }\n\
    .nav-collapse-btn:hover {\n\
      background: rgba(255,255,255,0.06);\n\
      color: rgba(255,255,255,0.8);\n\
    }\n\
    .nav-collapse-btn:focus-visible { outline: 2px solid #52d5ff; outline-offset: -2px; }\n\
    .nav-collapse-btn .collapse-label {\n\
      transition: opacity .2s;\n\
      white-space: nowrap;\n\
    }\n\
    .sidebar-nav.collapsed .nav-collapse-btn .collapse-label {\n\
      opacity: 0;\n\
      width: 0;\n\
      overflow: hidden;\n\
    }\n\
    \n\
    /* Mobile toggle */\n\
    .nav-toggle {\n\
      display: none;\n\
      position: fixed;\n\
      top: calc(var(--app-header-h, ' + DEFAULT_HEADER_H + 'px) + 10px);\n\
      left: 16px;\n\
      width: 40px;\n\
      height: 40px;\n\
      background: #446472;\n\
      border: none;\n\
      border-radius: 8px;\n\
      color: #fff;\n\
      font-size: 20px;\n\
      cursor: pointer;\n\
      z-index: 35;\n\
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);\n\
    }\n\
    \n\
    .main-content {\n\
      margin-left: ' + EXPANDED_W + 'px;\n\
      min-height: calc(100vh - var(--app-header-h, ' + DEFAULT_HEADER_H + 'px));\n\
      transition: margin-left .25s cubic-bezier(.4,0,.2,1);\n\
    }\n\
    .main-content.nav-collapsed {\n\
      margin-left: ' + COLLAPSED_W + 'px;\n\
    }\n\
    \n\
    @media(max-width: 1100px) {\n\
      .sidebar-nav { transform: translateX(-100%); }\n\
      .sidebar-nav.open { transform: translateX(0); }\n\
      .main-content { margin-left: 0 !important; }\n\
      .nav-toggle { display: flex; align-items: center; justify-content: center; }\n\
    }\n\
  ';

  // Inject CSS
  function injectCSS() {
    if (document.getElementById('standard-nav-css')) return;
    var style = document.createElement('style');
    style.id = 'standard-nav-css';
    style.textContent = navCSS;
    document.head.appendChild(style);
  }

  // Measures the page's real <header> height (which may start at 0 if the header is
  // hidden until an async auth check resolves) and keeps --app-header-h in sync via
  // ResizeObserver/MutationObserver, plus a couple of cheap safety-net timeouts. This is
  // what makes the sidebar/content offset correct on every page automatically instead of
  // assuming a fixed 60px header everywhere.
  function syncHeaderHeight() {
    var header = document.querySelector('header');
    if (!header) return;
    function measure() {
      var h = header.offsetHeight;
      if (h > 0) document.documentElement.style.setProperty('--app-header-h', h + 'px');
    }
    measure();
    if (window.ResizeObserver) {
      try { new ResizeObserver(measure).observe(header); } catch (e) {}
    }
    try {
      new MutationObserver(measure).observe(header, { attributes: true, attributeFilter: ['style', 'class'], childList: true, subtree: true });
    } catch (e) {}
    window.addEventListener('load', measure);
    window.addEventListener('resize', measure);
    setTimeout(measure, 300);
    setTimeout(measure, 1200);
  }

  // Build navigation HTML
  function buildNavHTML() {
    var currentPage = window.location.pathname.split('/').pop() || 'index.html';
    var collapsedClass = isCollapsed ? ' collapsed' : '';

    function getIconHTML(item) {
      return iconSVG(item && item.icon, 18);
    }

    function buildSection(title, items) {
      if (!items || items.length === 0) return '';
      var itemsHTML = items.map(function(item) {
        var isActive = (!item.external && currentPage === item.href) ? ' active' : '';
        var target = item.external ? ' target="_blank" rel="noopener noreferrer"' : '';
        var extBadge = item.external ? '<span class="nav-item-ext-icon" title="Opens in a new tab">' + iconSVG('external-link', 12) + '</span>' : '';
        return '<a href="' + escHTML(item.href) + '" class="nav-item' + isActive + '" data-label="' + escHTML(item.label) + '"' + target + '>' +
          '<span class="nav-item-icon">' + getIconHTML(item) + '</span>' +
          '<span class="nav-item-label">' + escHTML(item.label) + '</span>' + extBadge +
        '</a>';
      }).join('');

      return '<div class="nav-section">' +
        '<div class="nav-section-title">' + title + '</div>' +
        itemsHTML +
      '</div>';
    }

    var toggleIcon = isCollapsed ? chromeIcons.expand : chromeIcons.collapse;
    var toggleLabel = isCollapsed ? 'Expand' : 'Collapse';

    return '<button class="nav-toggle" id="navToggle" aria-label="Toggle navigation menu" aria-controls="sidebarNav">&#9776;</button>' +
      '<aside class="sidebar-nav' + collapsedClass + '" id="sidebarNav">' +
        '<nav aria-label="Primary">' +
          buildSection('MAIN', navStructure.main) +
          buildSection('TOOLS', navStructure.tools) +
          buildSection('RESOURCES', navStructure.resources) +
          buildSection('ADMIN', navStructure.admin) +
        '</nav>' +
        '<button class="nav-collapse-btn" id="navCollapseBtn" type="button" aria-expanded="' + (!isCollapsed) + '" title="' + toggleLabel + '">' +
          '<span class="nav-collapse-icon">' + toggleIcon + '</span>' +
          '<span class="collapse-label">' + toggleLabel + '</span>' +
        '</button>' +
      '</aside>';
  }

  // Toggle collapsed state
  function toggleCollapse() {
    var sidebar = document.getElementById('sidebarNav');
    var mainContent = document.querySelector('.main-content');
    var btn = document.getElementById('navCollapseBtn');
    if (!sidebar) return;

    isCollapsed = !isCollapsed;
    sidebar.classList.toggle('collapsed', isCollapsed);
    if (mainContent) mainContent.classList.toggle('nav-collapsed', isCollapsed);

    // Update button icon and label
    if (btn) {
      var iconEl = btn.querySelector('.nav-collapse-icon');
      var labelEl = btn.querySelector('.collapse-label');
      if (iconEl) iconEl.innerHTML = isCollapsed ? chromeIcons.expand : chromeIcons.collapse;
      if (labelEl) labelEl.textContent = isCollapsed ? 'Expand' : 'Collapse';
      btn.title = isCollapsed ? 'Expand' : 'Collapse';
      btn.setAttribute('aria-expanded', String(!isCollapsed));
    }

    // Persist state
    try { localStorage.setItem(STORAGE_KEY, isCollapsed ? '1' : '0'); } catch(e) {}

    // Dispatch custom event so pages can react (e.g., Creative Studio)
    window.dispatchEvent(new CustomEvent('nav-collapse-change', { detail: { collapsed: isCollapsed } }));
  }

  // Inject navigation into page
  function injectNav() {
    if (document.getElementById('sidebarNav')) return;

    var navHTML = buildNavHTML();
    var header = document.querySelector('header');
    if (header) {
      header.insertAdjacentHTML('afterend', navHTML);
    } else {
      document.body.insertAdjacentHTML('afterbegin', navHTML);
    }

    // Bind collapse button
    var collapseBtn = document.getElementById('navCollapseBtn');
    if (collapseBtn) {
      collapseBtn.addEventListener('click', toggleCollapse);
    }

    // Bind mobile toggle
    var mobileToggle = document.getElementById('navToggle');
    if (mobileToggle) {
      mobileToggle.addEventListener('click', function() {
        var sidebar = document.getElementById('sidebarNav');
        if (sidebar) sidebar.classList.toggle('open');
      });
    }
  }

  // Wrap existing content in main-content div if not already wrapped
  function wrapContent() {
    if (document.querySelector('.main-content')) {
      // Already wrapped - just apply collapsed class if needed
      if (isCollapsed) {
        document.querySelector('.main-content').classList.add('nav-collapsed');
      }
      return;
    }

    var body = document.body;
    var header = document.querySelector('header');
    var sidebarNav = document.getElementById('sidebarNav');
    var navToggle = document.getElementById('navToggle');

    var children = Array.from(body.children).filter(function(child) {
      return child !== header && child !== sidebarNav && child !== navToggle;
    });

    var mainContent = document.createElement('div');
    mainContent.className = 'main-content' + (isCollapsed ? ' nav-collapsed' : '');

    children.forEach(function(child) { mainContent.appendChild(child); });
    body.appendChild(mainContent);
  }

  function rebuildNav() {
    var existing = document.getElementById('sidebarNav');
    if (existing) existing.remove();
    var existingToggle = document.getElementById('navToggle');
    if (existingToggle) existingToggle.remove();
    injectNav();
  }

  function enforceMaintenanceAccess() {
    var currentPage = window.location.pathname.split('/').pop() || 'index.html';
    if (currentPage === 'index.html' || currentPage === '') return;
    var isAllowed = maintenanceAllowedHrefs.indexOf(currentPage) !== -1;
    if (!isAllowed) {
      window.location.href = 'custom_tools.html';
    }
  }

  function enforceReslifeAccess() {
    var currentPage = window.location.pathname.split('/').pop() || 'index.html';
    if (currentPage === 'index.html' || currentPage === '') return;
    // Reslife credentials have no access to any Marketing Hub page, including this one.
    window.location.href = 'reslife_hub.html';
  }

  // Loads the Admin-editable navigation config's RAW items (unfiltered — the caller applies
  // role filtering once the current user's role is known). Never blocks/breaks the nav: any
  // failure (offline, API error, not-yet-seeded) resolves to null so the caller falls back
  // to the hardcoded structure instead.
  function loadNavConfigItems() {
    return fetch('/api/nav-config', { credentials: 'include' })
      .then(function(res) { return res.ok ? res.json() : null; })
      .then(function(items) { return (items && Array.isArray(items) && items.length > 0) ? items : null; })
      .catch(function() { return null; });
  }

  // Initialize
  function init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
      return;
    }
    injectCSS();
    injectNav();
    wrapContent();
    syncHeaderHeight();

    Promise.all([
      fetch('/api/me', { credentials: 'include' }).then(function(res) { return res.ok ? res.json() : null; }).catch(function() { return null; }),
      loadNavConfigItems()
    ]).then(function(results) {
      var user = results[0];
      var rawItems = results[1];
      if (!user) return;

      if (reslifeRoles.indexOf(user.role) !== -1) {
        // No Marketing Hub nav or content for Reslife credentials — redirect immediately.
        var existingNav = document.getElementById('sidebarNav');
        if (existingNav) existingNav.remove();
        var existingToggle = document.getElementById('navToggle');
        if (existingToggle) existingToggle.remove();
        enforceReslifeAccess();
        return;
      }

      // Build the role-filtered base structure now that we know the actual user role,
      // then layer maintenance/admin special-casing on top of it.
      var base = rawItems ? buildStructureFromConfig(rawItems, user.role) : fallbackNavStructure;
      navStructure = getNavStructure(user.role, base);
      rebuildNav();
      syncHeaderHeight();

      if (user.role === 'maintenance') enforceMaintenanceAccess();
    }).catch(function() {});
  }

  init();
})();

/**
 * Inactivity Auto-Logout (12 hours)
 * Tracks user activity across all pages via localStorage.
 * If no activity for 12 hours, redirects to login.
 */
(function() {
  'use strict';
  var INACTIVITY_MS = 12 * 60 * 60 * 1000;
  var STORAGE_KEY = 'mmp_last_activity';
  var CHECK_INTERVAL = 60 * 1000;

  function updateActivity() {
    try { localStorage.setItem(STORAGE_KEY, Date.now().toString()); } catch(e) {}
  }

  function checkInactivity() {
    try {
      var last = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10);
      if (last && (Date.now() - last) > INACTIVITY_MS) {
        localStorage.removeItem(STORAGE_KEY);
        fetch('/api/auth-logout', { method: 'POST', credentials: 'include' }).catch(function(){});
        window.location.href = (window.location.pathname.indexOf('/') > 0 ? '../' : '') + 'index.html';
      }
    } catch(e) {}
  }

  if (/index\.html$/.test(window.location.pathname) || window.location.pathname === '/') return;

  updateActivity();
  ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'].forEach(function(evt) {
    document.addEventListener(evt, updateActivity, { passive: true });
  });

  setInterval(checkInactivity, CHECK_INTERVAL);
  checkInactivity();
})();
