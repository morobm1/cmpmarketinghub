// MPLR Page Reorganization - Admin vs User View

// Wait for everything to be fully loaded
window.addEventListener('load', () => {
  // Small delay to ensure all other scripts have initialized
  setTimeout(() => {
    initializePageLayout();
    checkUserRole();
  }, 100);
});

function initializePageLayout() {
  console.log('Initializing MPLR layout reorganization...');
  
  // Move setup sections to admin area
  reorganizePageSections();
  
  // Add visual progress indicators
  addProgressBars();
  
  // Add quick action buttons
  addQuickActions();
  
  console.log('MPLR layout reorganization complete');
}

function checkUserRole() {
  // Check if user is admin
  const isAdmin = currentUser?.role === 'admin';
  
  const adminSection = document.getElementById('adminSetupSection');
  if (adminSection) {
    if (isAdmin) {
      // Show admin section but collapsed
      adminSection.style.display = 'block';
    } else {
      // Hide admin section completely for non-admins
      adminSection.style.display = 'none';
    }
  }
}

function reorganizePageSections() {
  const container = document.getElementById('appContainer');
  if (!container) return;
  
  // Create admin setup section (collapsible)
  const adminSection = document.createElement('div');
  adminSection.id = 'adminSetupSection';
  adminSection.className = 'admin-setup-section';
  adminSection.innerHTML = `
    <div class="admin-header" onclick="toggleAdminSection()">
      <div style="display:flex;align-items:center;gap:12px">
        <span class="admin-icon">⚙️</span>
        <div>
          <h2 style="margin:0;font-size:18px;font-weight:700;color:#374151">Admin Setup & Configuration</h2>
          <p style="margin:0;font-size:13px;color:#64748b">Configure property settings, floor plans, and tier pricing</p>
        </div>
      </div>
      <span class="collapse-arrow" id="adminCollapseArrow">▼</span>
    </div>
    <div class="admin-content" id="adminSetupContent" style="display:none">
      <!-- Admin sections will be moved here -->
    </div>
  `;
  
  // Insert admin section after stats
  const statsGrid = container.querySelector('.stats-grid');
  if (statsGrid) {
    statsGrid.after(adminSection);
  }
  
  // Move setup cards to admin section
  const adminContent = document.getElementById('adminSetupContent');
  if (adminContent) {
    // Move Property Configuration
    const propertyConfig = Array.from(container.querySelectorAll('.card')).find(card => 
      card.querySelector('h3')?.textContent.includes('Property Configuration')
    );
    if (propertyConfig) {
      propertyConfig.querySelector('h3').textContent = '1. Property Configuration';
      adminContent.appendChild(propertyConfig);
    }
    
    // Move Floor Plan Tracker
    const floorPlanTracker = Array.from(container.querySelectorAll('.card')).find(card => 
      card.querySelector('h3')?.textContent.includes('Floor Plan Tracker')
    );
    if (floorPlanTracker) {
      floorPlanTracker.querySelector('h3').textContent = '2. Floor Plan Tracker';
      adminContent.appendChild(floorPlanTracker);
    }
    
    // Move Tier Pricing Tracker
    const tierPricing = Array.from(container.querySelectorAll('.card')).find(card => 
      card.querySelector('h3')?.textContent.includes('Tier Pricing Tracker')
    );
    if (tierPricing) {
      tierPricing.querySelector('h3').textContent = '3. Tier Pricing Tracker';
      adminContent.appendChild(tierPricing);
    }
  }
  
  // Add styles
  addAdminSectionStyles();
}

function toggleAdminSection() {
  const content = document.getElementById('adminSetupContent');
  const arrow = document.getElementById('adminCollapseArrow');
  
  if (content && arrow) {
    if (content.style.display === 'none') {
      content.style.display = 'block';
      arrow.textContent = '▲';
      localStorage.setItem('mplr_admin_section_open', 'true');
    } else {
      content.style.display = 'none';
      arrow.textContent = '▼';
      localStorage.setItem('mplr_admin_section_open', 'false');
    }
  }
}

function addAdminSectionStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .admin-setup-section {
      background: #f8fafc;
      border: 2px solid #e2e8f0;
      border-radius: 14px;
      margin-bottom: 24px;
      overflow: hidden;
    }
    
    .admin-header {
      padding: 20px 24px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: space-between;
      transition: all 0.2s;
    }
    
    .admin-header:hover {
      background: linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%);
    }
    
    .admin-icon {
      font-size: 32px;
      animation: rotate 3s linear infinite;
    }
    
    @keyframes rotate {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    
    .collapse-arrow {
      font-size: 20px;
      transition: transform 0.2s;
    }
    
    .admin-content {
      padding: 20px;
      background: #ffffff;
    }
    
    .admin-content .card {
      margin-bottom: 16px;
    }
    
    .admin-content .card h3 {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    
    /* Progress bars */
    .progress-container {
      margin-bottom: 24px;
    }
    
    .progress-card {
      background: white;
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 16px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
      transition: all 0.2s;
    }
    
    .progress-card:hover {
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      transform: translateY(-2px);
    }
    
    .progress-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    
    .progress-title {
      font-size: 14px;
      font-weight: 700;
      color: #374151;
    }
    
    .progress-value {
      font-size: 24px;
      font-weight: 700;
      color: var(--brand-primary);
    }
    
    .progress-bar-container {
      width: 100%;
      height: 24px;
      background: #e5e7eb;
      border-radius: 12px;
      overflow: hidden;
      position: relative;
    }
    
    .progress-bar {
      height: 100%;
      background: linear-gradient(90deg, var(--brand-accent-2) 0%, var(--brand-primary) 100%);
      border-radius: 12px;
      transition: width 0.5s ease;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      padding-right: 12px;
      color: white;
      font-size: 12px;
      font-weight: 700;
    }
    
    .progress-bar.success {
      background: linear-gradient(90deg, #22c55e 0%, #16a34a 100%);
    }
    
    .progress-bar.warning {
      background: linear-gradient(90deg, #f59e0b 0%, #d97706 100%);
    }
    
    .progress-bar.danger {
      background: linear-gradient(90deg, #ef4444 0%, #dc2626 100%);
    }
    
    .progress-details {
      display: flex;
      justify-content: space-between;
      margin-top: 8px;
      font-size: 12px;
      color: #64748b;
    }
    
    /* Quick actions */
    .quick-actions {
      display: flex;
      gap: 12px;
      margin-bottom: 24px;
      flex-wrap: wrap;
    }
    
    .quick-action-btn {
      flex: 1;
      min-width: 200px;
      padding: 16px 20px;
      background: white;
      border: 2px solid var(--border);
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 14px;
      font-weight: 600;
      color: #374151;
    }
    
    .quick-action-btn:hover {
      border-color: var(--brand-accent-2);
      background: #f0f9ff;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(82, 213, 255, 0.2);
    }
    
    .quick-action-icon {
      font-size: 24px;
    }
  `;
  document.head.appendChild(style);
}

function addProgressBars() {
  const container = document.getElementById('appContainer');
  if (!container) return;
  
  // Create progress section
  const progressSection = document.createElement('div');
  progressSection.className = 'progress-container';
  progressSection.innerHTML = `
    <h2 style="font-size:20px;font-weight:700;color:#374151;margin-bottom:16px">📊 Leasing Progress</h2>
    <div id="progressBarsContainer"></div>
  `;
  
  // Insert after admin section or stats
  const adminSection = document.getElementById('adminSetupSection');
  const statsGrid = container.querySelector('.stats-grid');
  
  if (adminSection) {
    adminSection.after(progressSection);
  } else if (statsGrid) {
    statsGrid.after(progressSection);
  }
  
  // Render progress bars
  renderProgressBars();
}

async function renderProgressBars() {
  const progressContainer = document.getElementById('progressBarsContainer');
  if (!progressContainer) return;
  
  // Get total beds (handle async)
  let totalBeds = 0;
  if (typeof getPropertyTotalBeds === 'function') {
    totalBeds = await getPropertyTotalBeds() || 0;
  }
  
  const totalLeased = leases ? leases.length : 0;
  const remaining = Math.max(0, totalBeds - totalLeased);
  const percentLeased = totalBeds > 0 ? ((totalLeased / totalBeds) * 100).toFixed(1) : 0;
  
  // Get floor plans progress
  const floorPlansHTML = renderFloorPlanProgress();
  
  // Get tier progress
  const tierProgressHTML = renderTierProgress();
  
  progressContainer.innerHTML = `
    <!-- Overall Progress -->
    <div class="progress-card">
      <div class="progress-header">
        <div>
          <div class="progress-title">Overall Occupancy</div>
          <div style="font-size:12px;color:#64748b;margin-top:4px">${totalLeased} of ${totalBeds} beds leased</div>
        </div>
        <div class="progress-value">${percentLeased}%</div>
      </div>
      <div class="progress-bar-container">
        <div class="progress-bar ${getProgressClass(percentLeased)}" style="width:${percentLeased}%">
          ${percentLeased}%
        </div>
      </div>
      <div class="progress-details">
        <span>🎯 Target: 100%</span>
        <span>📍 Remaining: ${remaining} beds</span>
      </div>
    </div>
    
    ${floorPlansHTML}
    ${tierProgressHTML}
  `;
}

function renderFloorPlanProgress() {
  if (!window.getFloorPlans || typeof window.getFloorPlans !== 'function') {
    return '';
  }
  
  const floorPlans = window.getFloorPlans();
  if (!floorPlans || floorPlans.length === 0) {
    return '';
  }
  
  // Count leased units by unit type
  const leasedCounts = {};
  leases.forEach(lease => {
    const unitType = lease.unitType || '';
    leasedCounts[unitType] = (leasedCounts[unitType] || 0) + 1;
  });
  
  return `
    <h3 style="font-size:16px;font-weight:700;color:#374151;margin:24px 0 12px 0">Floor Plan Progress</h3>
    ${floorPlans.map(fp => {
      const leased = leasedCounts[fp.type] || 0;
      const percent = fp.total > 0 ? ((leased / fp.total) * 100).toFixed(1) : 0;
      const remaining = Math.max(0, fp.total - leased);
      
      return `
        <div class="progress-card">
          <div class="progress-header">
            <div>
              <div class="progress-title">${fp.type}</div>
              <div style="font-size:12px;color:#64748b;margin-top:4px">${leased} of ${fp.total} units leased</div>
            </div>
            <div class="progress-value">${percent}%</div>
          </div>
          <div class="progress-bar-container">
            <div class="progress-bar ${getProgressClass(percent)}" style="width:${percent}%">
              ${percent}%
            </div>
          </div>
          <div class="progress-details">
            <span>📦 Total: ${fp.total}</span>
            <span>✅ Leased: ${leased}</span>
            <span>📍 Available: ${remaining}</span>
          </div>
        </div>
      `;
    }).join('')}
  `;
}

function renderTierProgress() {
  // Get tier data
  const newLeaseTiers = window.newLeaseTiers || [];
  const renewalTiers = window.renewalTiers || [];
  
  if (newLeaseTiers.length === 0 && renewalTiers.length === 0) {
    return '';
  }
  
  let html = '<h3 style="font-size:16px;font-weight:700;color:#374151;margin:24px 0 12px 0">Tier Pricing Progress</h3>';
  
  // Render new lease tiers
  if (newLeaseTiers.length > 0) {
    html += renderTierCategoryProgress('New Lease Tiers', newLeaseTiers, 'new');
  }
  
  // Render renewal tiers
  if (renewalTiers.length > 0) {
    html += renderTierCategoryProgress('Renewal Tiers', renewalTiers, 'renewal');
  }
  
  return html;
}

function renderTierCategoryProgress(title, tiers, category) {
  const leasesList = category === 'new' 
    ? leases.filter(l => (l.leaseType || '').toLowerCase().includes('new'))
    : leases.filter(l => {
        const lt = (l.leaseType || '').toLowerCase();
        return lt.includes('renewal') || lt.includes('transfer');
      });
  
  // Count leases by unit type and rate
  const leaseCounts = {};
  leasesList.forEach(lease => {
    const unitType = lease.unitType || '';
    const monthlyRent = parseFloat(lease.monthlyRent) || 0;
    const key = `${unitType}|${monthlyRent}`;
    leaseCounts[key] = (leaseCounts[key] || 0) + 1;
  });
  
  return tiers.map(tier => {
    let tierTotal = 0;
    let tierCap = 0;
    
    tier.unitTypes.forEach(ut => {
      const key = `${ut.type}|${ut.rate}`;
      const count = leaseCounts[key] || 0;
      tierTotal += count;
      tierCap += ut.cap;
    });
    
    const percent = tierCap > 0 ? ((tierTotal / tierCap) * 100).toFixed(1) : 0;
    const remaining = Math.max(0, tierCap - tierTotal);
    
    return `
      <div class="progress-card">
        <div class="progress-header">
          <div>
            <div class="progress-title">${tier.tier} - ${title}</div>
            <div style="font-size:12px;color:#64748b;margin-top:4px">${tierTotal} of ${tierCap} units leased</div>
          </div>
          <div class="progress-value">${percent}%</div>
        </div>
        <div class="progress-bar-container">
          <div class="progress-bar ${getProgressClass(percent)}" style="width:${percent}%">
            ${percent}%
          </div>
        </div>
        <div class="progress-details">
          <span>🎯 Cap: ${tierCap}</span>
          <span>✅ Leased: ${tierTotal}</span>
          <span>📍 Remaining: ${remaining}</span>
        </div>
      </div>
    `;
  }).join('');
}

function getProgressClass(percent) {
  if (percent >= 90) return 'success';
  if (percent >= 70) return '';
  if (percent >= 50) return 'warning';
  return 'danger';
}

function addQuickActions() {
  const container = document.getElementById('appContainer');
  if (!container) return;
  
  const quickActions = document.createElement('div');
  quickActions.className = 'quick-actions';
  quickActions.innerHTML = `
    <button class="quick-action-btn" onclick="document.getElementById('importFile').click()">
      <span class="quick-action-icon">📥</span>
      <div>
        <div>Import Leases</div>
        <div style="font-size:11px;color:#64748b;font-weight:400">Upload Excel/CSV file</div>
      </div>
    </button>
    
    <button class="quick-action-btn" onclick="document.getElementById('addLeaseBtn').click()">
      <span class="quick-action-icon">➕</span>
      <div>
        <div>Add Single Lease</div>
        <div style="font-size:11px;color:#64748b;font-weight:400">Manual entry form</div>
      </div>
    </button>
    
    <button class="quick-action-btn" onclick="document.getElementById('exportBtn').click()">
      <span class="quick-action-icon">📤</span>
      <div>
        <div>Export Data</div>
        <div style="font-size:11px;color:#64748b;font-weight:400">Download as CSV</div>
      </div>
    </button>
  `;
  
  // Insert before Import Section
  const importSection = Array.from(container.querySelectorAll('.card')).find(card => 
    card.querySelector('h3')?.textContent.includes('Import Data')
  );
  
  if (importSection) {
    importSection.before(quickActions);
  }
}

// Update progress bars when data changes
const originalUpdateStats = window.updateStats;
if (originalUpdateStats) {
  window.updateStats = function() {
    originalUpdateStats();
    if (typeof renderProgressBars === 'function') {
      renderProgressBars();
    }
  };
}

// Expose functions
window.toggleAdminSection = toggleAdminSection;
window.renderProgressBars = renderProgressBars;
