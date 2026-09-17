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

  // ---- Bootstrap Icons (free, CDN, no API key/build step) ----
  function ensureIconFont() {
    if (document.getElementById('bi-icon-font')) return;
    var link = document.createElement('link');
    link.id = 'bi-icon-font';
    link.rel = 'stylesheet';
    link.href = 'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css';
    document.head.appendChild(link);
  }

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
    ensureIconFont();
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
      var cls = (item && item.icon) || 'bi-link-45deg';
      return '<i class="bi ' + escHTML(cls) + '" aria-hidden="true"></i>';
    }

    function buildSection(title, items) {
      if (!items || items.length === 0) return '';
      var itemsHTML = items.map(function(item) {
        var isActive = (!item.external && currentPage === item.href) ? ' active' : '';
        var target = item.external ? ' target="_blank" rel="noopener noreferrer"' : '';
        var extBadge = item.external ? '<span class="nav-item-ext-icon" title="Opens in a new tab"><i class="bi bi-box-arrow-up-right" aria-hidden="true"></i></span>' : '';
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
