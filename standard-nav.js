/**
 * Standard Vertical Navigation for Marketing Hub
 * Include this script in all HTML pages: <script src="standard-nav.js"></script>
 * Place it before the closing </body> tag
 *
 * Features:
 * - Collapsible sidebar (full 240px or slim 60px icon rail)
 * - Professional SVG icons for each nav item
 * - Toggle arrow to collapse/expand
 * - State persisted in localStorage
 * - Smooth CSS transitions
 */

(function() {
  'use strict';

  var EXPANDED_W = 240;
  var COLLAPSED_W = 60;
  var STORAGE_KEY = 'mmp_nav_collapsed';

  // ---- SVG Icons (clean, professional line icons) ----
  var icons = {
    'Marketing Calendar': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
    'Marketing Plans': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>',
    'Monthly Marketing Plan': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M9 16l2 2 4-4"/></svg>',
    'Velocity Tracker': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
    'Competitor Cards': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>',
    'MPLR': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
    'Promo Order Tracker': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>',
    'Uniform Shop': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>',
    'Creative Studio': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>',
    'Creative Library': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
    'Marketing Contacts': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    'Project Management': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>',
    'Custom Tools': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    'SOP Library': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
    'collapse': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="11 17 6 12 11 7"/><polyline points="18 17 13 12 18 7"/></svg>',
    'expand': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/></svg>',
  };

  // Navigation structure
  var fullNavStructure = {
    main: [
      { href: 'mmp_calendar_app.html', label: 'Marketing Calendar' },
      { href: 'marketing_plans.html', label: 'Marketing Plans' },
      { href: 'mmp_monthly_plan.html', label: 'Monthly Marketing Plan' },
      { href: 'velocity_tracker.html', label: 'Velocity Tracker' },
      { href: 'competitor_cards.html', label: 'Competitor Cards' },
      { href: 'mplr.html', label: 'MPLR' }
    ],
    tools: [
      { href: 'promo_order_tracker.html', label: 'Promo Order Tracker' },
      { href: 'uniform_shop.html', label: 'Uniform Shop' },
      { href: 'creative_studio.html', label: 'Creative Studio' },
      { href: 'creative_library.html', label: 'Creative Library' },
      { href: 'marketing_contacts.html', label: 'Marketing Contacts' },
      { href: 'leasing_staff_list.html', label: 'Project Management' },
      { href: 'custom_tools.html', label: 'Custom Tools' }
    ],
    resources: [
      { href: 'sop_library.html', label: 'SOP Library' }
    ]
  };

  var maintenanceAllowedHrefs = [
    'custom_tools.html',
    'leasing_staff_list.html',
    'sop_library.html'
  ];

  function getNavStructure(role) {
    if (role !== 'maintenance') return fullNavStructure;
    function filterItems(items) {
      return items.filter(function(item) {
        return maintenanceAllowedHrefs.indexOf(item.href) !== -1;
      });
    }
    var filtered = {
      main: filterItems(fullNavStructure.main),
      tools: filterItems(fullNavStructure.tools),
      resources: filterItems(fullNavStructure.resources)
    };
    return filtered;
  }

  var navStructure = fullNavStructure;

  // Check initial state
  var isCollapsed = false;
  try { isCollapsed = localStorage.getItem(STORAGE_KEY) === '1'; } catch(e) {}

  // CSS for the navigation
  var navCSS = '\n\
    /* Vertical Sidebar Navigation */\n\
    .sidebar-nav {\n\
      position: fixed;\n\
      left: 0;\n\
      top: 60px;\n\
      width: ' + EXPANDED_W + 'px;\n\
      height: calc(100vh - 60px);\n\
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
    }\n\
    .nav-item-label {\n\
      transition: opacity .2s, width .2s;\n\
      overflow: hidden;\n\
    }\n\
    .sidebar-nav.collapsed .nav-item {\n\
      padding: 10px 0;\n\
      justify-content: center;\n\
      border-left-width: 0;\n\
    }\n\
    .sidebar-nav.collapsed .nav-item-label {\n\
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
      top: 70px;\n\
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
      min-height: calc(100vh - 60px);\n\
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
    var style = document.createElement('style');
    style.id = 'standard-nav-css';
    style.textContent = navCSS;
    document.head.appendChild(style);
  }

  // Build navigation HTML
  function buildNavHTML() {
    var currentPage = window.location.pathname.split('/').pop() || 'index.html';
    var collapsedClass = isCollapsed ? ' collapsed' : '';

    function getIcon(label) {
      return icons[label] || '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>';
    }

    function buildSection(title, items) {
      if (!items || items.length === 0) return '';
      var itemsHTML = items.map(function(item) {
        var isActive = currentPage === item.href ? ' active' : '';
        return '<a href="' + item.href + '" class="nav-item' + isActive + '" data-label="' + item.label + '">' +
          '<span class="nav-item-icon">' + getIcon(item.label) + '</span>' +
          '<span class="nav-item-label">' + item.label + '</span>' +
        '</a>';
      }).join('');

      return '<div class="nav-section">' +
        '<div class="nav-section-title">' + title + '</div>' +
        itemsHTML +
      '</div>';
    }

    var toggleIcon = isCollapsed ? icons.expand : icons.collapse;
    var toggleLabel = isCollapsed ? 'Expand' : 'Collapse';

    return '<button class="nav-toggle" id="navToggle">&#9776;</button>' +
      '<aside class="sidebar-nav' + collapsedClass + '" id="sidebarNav">' +
        '<nav>' +
          buildSection('MAIN', navStructure.main) +
          buildSection('TOOLS', navStructure.tools) +
          buildSection('RESOURCES', navStructure.resources) +
        '</nav>' +
        '<button class="nav-collapse-btn" id="navCollapseBtn" title="' + toggleLabel + '">' +
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
      if (iconEl) iconEl.innerHTML = isCollapsed ? icons.expand : icons.collapse;
      if (labelEl) labelEl.textContent = isCollapsed ? 'Expand' : 'Collapse';
      btn.title = isCollapsed ? 'Expand' : 'Collapse';
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
    if (header && header.nextSibling) {
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

  // Initialize
  function init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
      return;
    }
    injectCSS();
    injectNav();
    wrapContent();

    fetch('/api/me', { credentials: 'include' })
      .then(function(res) { return res.ok ? res.json() : null; })
      .then(function(user) {
        if (!user) return;
        if (user.role === 'maintenance') {
          navStructure = getNavStructure('maintenance');
          rebuildNav();
          enforceMaintenanceAccess();
        }
      })
      .catch(function() {});
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
