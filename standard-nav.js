/**
 * Standard Vertical Navigation for Marketing Hub
 * Include this script in all HTML pages: <script src="standard-nav.js"></script>
 * Place it before the closing </body> tag
 */

(function() {
  'use strict';

  // Navigation structure
  const navStructure = {
    main: [
      { href: 'mmp_calendar_app.html', label: 'Marketing Calendar' },
      { href: 'marketing_plans.html', label: 'Marketing Plans' },
      { href: 'velocity_tracker.html', label: 'Velocity Tracker' },
      { href: 'mplr.html', label: 'MPLR' }
    ],
    tools: [
      { href: 'promo_order_tracker.html', label: 'Promo Order Tracker' },
      { href: 'uniform_shop.html', label: 'Uniform Shop' },
      { href: 'creative_library.html', label: 'Creative Library' },
      { href: 'marketing_contacts.html', label: 'Marketing Contacts' }
    ],
    resources: [
      { href: 'renewal_campaign.html', label: 'Renewal Campaign' },
      { href: 'leasing_sop.html', label: 'Leasing SOP' },
      { href: 'sop_library.html', label: 'SOP Library' }
    ]
  };

  // CSS for the navigation
  const navCSS = `
    /* Vertical Sidebar Navigation */
    .sidebar-nav {
      position: fixed;
      left: 0;
      top: 60px;
      width: 240px;
      height: calc(100vh - 60px);
      background: #1e293b;
      overflow-y: auto;
      z-index: 30;
      transition: transform .3s ease;
    }
    .sidebar-nav::-webkit-scrollbar { width: 6px; }
    .sidebar-nav::-webkit-scrollbar-track { background: #0f172a; }
    .sidebar-nav::-webkit-scrollbar-thumb { background: #475569; border-radius: 3px; }
    .sidebar-nav::-webkit-scrollbar-thumb:hover { background: #64748b; }
    
    .nav-section {
      padding: 20px 0 8px 0;
    }
    .nav-section-title {
      padding: 0 16px 8px 16px;
      font-size: 11px;
      font-weight: 700;
      color: rgba(255,255,255,0.5);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .nav-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 16px;
      color: rgba(255,255,255,0.7);
      text-decoration: none;
      font-size: 14px;
      font-weight: 500;
      transition: all .15s;
      border-left: 3px solid transparent;
      position: relative;
    }
    .nav-item:hover {
      background: rgba(255,255,255,0.05);
      color: #fff;
      border-left-color: transparent;
    }
    .nav-item.active {
      background: rgba(82,213,255,0.15);
      color: #fff;
      border-left-color: var(--brand-accent-2);
      font-weight: 600;
    }
    
    .nav-toggle {
      display: none;
      position: fixed;
      top: 70px;
      left: 16px;
      width: 40px;
      height: 40px;
      background: var(--brand-primary);
      border: none;
      border-radius: 8px;
      color: #fff;
      font-size: 20px;
      cursor: pointer;
      z-index: 35;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    }
    
    .main-content {
      margin-left: 240px;
      min-height: calc(100vh - 60px);
      transition: margin-left .3s ease;
    }
    
    @media(max-width: 1100px) {
      .sidebar-nav { transform: translateX(-100%); }
      .sidebar-nav.open { transform: translateX(0); }
      .main-content { margin-left: 0; }
      .nav-toggle { display: flex; align-items: center; justify-content: center; }
    }
  `;

  // Inject CSS
  function injectCSS() {
    const style = document.createElement('style');
    style.textContent = navCSS;
    document.head.appendChild(style);
  }

  // Build navigation HTML
  function buildNavHTML() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
    function buildSection(title, items) {
      const itemsHTML = items.map(item => {
        const isActive = currentPage === item.href ? ' active' : '';
        return `<a href="${item.href}" class="nav-item${isActive}">
          <span>${item.label}</span>
        </a>`;
      }).join('');
      
      return `
        <div class="nav-section">
          <div class="nav-section-title">${title}</div>
          ${itemsHTML}
        </div>
      `;
    }

    return `
      <button class="nav-toggle" id="navToggle" onclick="document.getElementById('sidebarNav').classList.toggle('open')">☰</button>
      <aside class="sidebar-nav" id="sidebarNav">
        <nav>
          ${buildSection('MAIN', navStructure.main)}
          ${buildSection('TOOLS', navStructure.tools)}
          ${buildSection('RESOURCES', navStructure.resources)}
        </nav>
      </aside>
    `;
  }

  // Inject navigation into page
  function injectNav() {
    // Check if navigation already exists
    if (document.getElementById('sidebarNav')) {
      return; // Already injected
    }

    const navHTML = buildNavHTML();
    
    // Insert after header or at beginning of body
    const header = document.querySelector('header');
    if (header && header.nextSibling) {
      header.insertAdjacentHTML('afterend', navHTML);
    } else {
      document.body.insertAdjacentHTML('afterbegin', navHTML);
    }
  }

  // Wrap existing content in main-content div if not already wrapped
  function wrapContent() {
    // Check if main-content already exists
    if (document.querySelector('.main-content')) {
      return; // Already wrapped
    }

    const body = document.body;
    const header = document.querySelector('header');
    const sidebarNav = document.getElementById('sidebarNav');
    const navToggle = document.getElementById('navToggle');
    
    // Get all body children except header, sidebar, and toggle
    const children = Array.from(body.children).filter(child => 
      child !== header && child !== sidebarNav && child !== navToggle
    );
    
    // Create main-content wrapper
    const mainContent = document.createElement('div');
    mainContent.className = 'main-content';
    
    // Move children into wrapper
    children.forEach(child => mainContent.appendChild(child));
    
    // Append wrapper to body
    body.appendChild(mainContent);
  }

  // Initialize
  function init() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
      return;
    }

    injectCSS();
    injectNav();
    wrapContent();
  }

  // Run initialization
  init();
})();

/**
 * Inactivity Auto-Logout (12 hours)
 * Tracks user activity across all pages via localStorage.
 * If no activity for 12 hours, redirects to login.
 */
(function() {
  'use strict';
  var INACTIVITY_MS = 12 * 60 * 60 * 1000; // 12 hours
  var STORAGE_KEY = 'mmp_last_activity';
  var CHECK_INTERVAL = 60 * 1000; // check every 60 seconds

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

  // Skip on login page
  if (/index\.html$/.test(window.location.pathname) || window.location.pathname === '/') return;

  // Record activity on user interactions
  updateActivity();
  ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'].forEach(function(evt) {
    document.addEventListener(evt, updateActivity, { passive: true });
  });

  // Periodically check for inactivity
  setInterval(checkInactivity, CHECK_INTERVAL);

  // Also check immediately on page load (catches tabs left open)
  checkInactivity();
})();
