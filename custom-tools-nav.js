// Shared navigation helper for Marketing Hub
// This script dynamically adds the Custom Tools link for admin users

(function() {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCustomToolsNav);
  } else {
    initCustomToolsNav();
  }

  async function initCustomToolsNav() {
    // Check if user is authenticated and is an admin
    try {
      const meRes = await fetch('/api/me', { credentials: 'include' });
      if (meRes.ok) {
        const me = await meRes.json();
        if (me.role === 'admin') {
          addCustomToolsLink();
        }
      }
    } catch (e) {
      // Silently fail if not authenticated
    }
  }

  function addCustomToolsLink() {
    // Find the nav-wrap element
    const navWrap = document.querySelector('.nav-wrap');
    if (!navWrap) return;

    // Check if Custom Tools link already exists
    if (navWrap.querySelector('a[href="custom_tools.html"]')) return;

    // Create the Custom Tools link
    const customToolsLink = document.createElement('a');
    customToolsLink.href = 'custom_tools.html';
    customToolsLink.className = 'nav-tab';
    customToolsLink.textContent = 'Custom Tools';

    // Check if we're on the custom tools page to mark it active
    const currentPath = (location.pathname || '').toLowerCase();
    if (currentPath.endsWith('custom_tools.html') || currentPath.endsWith('/custom_tools.html')) {
      customToolsLink.classList.add('active');
    }

    // Append to navigation
    navWrap.appendChild(customToolsLink);
  }
})();
