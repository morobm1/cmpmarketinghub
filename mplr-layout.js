// MPLR Modern Layout - Clean Dashboard with Settings Panel

window.addEventListener('load', () => {
  setTimeout(() => {
    initializeModernLayout();
  }, 200);
});

function initializeModernLayout() {
  console.log('Initializing modern MPLR layout...');
  
  // Move setup sections (don't clone, move the originals)
  moveSetupSections();
  
  // Add settings button
  addSettingsButton();
  
  // Create settings panel
  createSettingsPanel();
  
  // Add progress dashboard
  addProgressDashboard();
  
  // Reorganize quick actions
  reorganizeQuickActions();
  
  console.log('Modern MPLR layout complete');
}

function moveSetupSections() {
  const container = document.getElementById('appContainer');
  if (!container) return;
  
  // Find and hide (but don't remove) the setup sections
  const cards = container.querySelectorAll('.card');
  cards.forEach(card => {
    const h3 = card.querySelector('h3');
    if (h3) {
      const text = h3.textContent;
      if (text.includes('Property Configuration') || 
          text.includes('Floor Plan Tracker') || 
          text.includes('Tier Pricing Tracker')) {
        card.style.display = 'none';
        card.setAttribute('data-mplr-setup', 'true');
      }
    }
  });
}

function addSettingsButton() {
  const headerControls = document.querySelector('.header-controls');
  if (!headerControls || document.getElementById('mplrSettingsBtn')) return;
  
  const btn = document.createElement('button');
  btn.id = 'mplrSettingsBtn';
  btn.className = 'header-btn';
  btn.textContent = 'Settings';
  btn.onclick = () => toggleSettingsPanel();
  
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    headerControls.insertBefore(btn, logoutBtn);
  }
}

function createSettingsPanel() {
  if (document.getElementById('mplrSettingsPanel')) return;
  
  const panel = document.createElement('div');
  panel.id = 'mplrSettingsPanel';
  panel.className = 'mplr-settings-panel';
  panel.innerHTML = `
    <div class="mplr-settings-overlay" onclick="toggleSettingsPanel()"></div>
    <div class="mplr-settings-content">
      <div class="mplr-settings-header">
        <h2>MPLR Settings</h2>
        <button class="mplr-settings-close" onclick="toggleSettingsPanel()">×</button>
      </div>
      <div class="mplr-settings-tabs">
        <button class="mplr-settings-tab active" data-tab="property">Property</button>
        <button class="mplr-settings-tab" data-tab="floorplans">Floor Plans</button>
        <button class="mplr-settings-tab" data-tab="tiers">Tiers</button>
      </div>
      <div class="mplr-settings-body" id="mplrSettingsBody"></div>
    </div>
  `;
  
  document.body.appendChild(panel);
  
  // Add tab click handlers
  panel.querySelectorAll('.mplr-settings-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      panel.querySelectorAll('.mplr-settings-tab').forEach(t => t.classList.remove('active'));
      e.target.classList.add('active');
      loadSettingsTab(e.target.dataset.tab);
    });
  });
  
  addSettingsPanelStyles();
}

function addSettingsPanelStyles() {
  if (document.getElementById('mplrPanelStyles')) return;
  
  const style = document.createElement('style');
  style.id = 'mplrPanelStyles';
  style.textContent = `
    .mplr-settings-panel {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 9999;
      display: none;
    }
    
    .mplr-settings-panel.active {
      display: block;
    }
    
    .mplr-settings-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(4px);
    }
    
    .mplr-settings-content {
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      width: 90%;
      max-width: 1000px;
      background: white;
      box-shadow: -4px 0 24px rgba(0, 0, 0, 0.2);
      display: flex;
      flex-direction: column;
      transform: translateX(100%);
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    .mplr-settings-panel.active .mplr-settings-content {
      transform: translateX(0);
    }
    
    .mplr-settings-header {
      padding: 24px;
      background: var(--brand-primary);
      color: white;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid rgba(255,255,255,0.1);
    }
    
    .mplr-settings-header h2 {
      margin: 0;
      font-size: 24px;
      font-weight: 700;
    }
    
    .mplr-settings-close {
      background: rgba(255,255,255,0.2);
      border: none;
      color: white;
      font-size: 32px;
      width: 44px;
      height: 44px;
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.2s;
      line-height: 1;
      padding: 0;
    }
    
    .mplr-settings-close:hover {
      background: rgba(255,255,255,0.3);
    }
    
    .mplr-settings-tabs {
      display: flex;
      gap: 8px;
      padding: 16px 24px;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
    }
    
    .mplr-settings-tab {
      padding: 10px 20px;
      background: transparent;
      border: none;
      border-radius: 6px;
      color: #64748b;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .mplr-settings-tab:hover {
      background: rgba(68, 100, 114, 0.1);
      color: var(--brand-primary);
    }
    
    .mplr-settings-tab.active {
      background: var(--brand-primary);
      color: white;
    }
    
    .mplr-settings-body {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
    }
    
    /* Dashboard Styles */
    .mplr-dashboard-section {
      margin-bottom: 32px;
    }
    
    .mplr-section-title {
      font-size: 20px;
      font-weight: 700;
      color: #374151;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 2px solid #e2e8f0;
    }
    
    .mplr-progress-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 20px;
    }
    
    .mplr-progress-card {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      transition: all 0.2s;
    }
    
    .mplr-progress-card:hover {
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      transform: translateY(-2px);
    }
    
    .mplr-progress-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 16px;
    }
    
    .mplr-progress-label {
      font-size: 12px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .mplr-progress-percent {
      font-size: 32px;
      font-weight: 700;
      color: var(--brand-primary);
      line-height: 1;
    }
    
    .mplr-progress-bar {
      width: 100%;
      height: 10px;
      background: #e5e7eb;
      border-radius: 999px;
      overflow: hidden;
      margin-top: 12px;
    }
    
    .mplr-progress-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--brand-accent-2), var(--brand-primary));
      border-radius: 999px;
      transition: width 0.5s ease;
    }
    
    .mplr-progress-fill.success {
      background: linear-gradient(90deg, #22c55e, #16a34a);
    }
    
    .mplr-progress-fill.warning {
      background: linear-gradient(90deg, #f59e0b, #d97706);
    }
    
    .mplr-progress-fill.danger {
      background: linear-gradient(90deg, #ef4444, #dc2626);
    }
    
    .mplr-progress-stats {
      display: flex;
      justify-content: space-between;
      margin-top: 12px;
      font-size: 13px;
      color: #64748b;
    }
    
    /* Quick Actions */
    .mplr-actions-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 16px;
      margin-bottom: 32px;
    }
    
    .mplr-action-btn {
      background: white;
      border: 2px solid #e2e8f0;
      border-radius: 12px;
      padding: 20px;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 16px;
      text-align: left;
    }
    
    .mplr-action-btn:hover {
      border-color: var(--brand-accent-2);
      background: #f0f9ff;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(82, 213, 255, 0.3);
    }
    
    .mplr-action-icon {
      width: 48px;
      height: 48px;
      background: linear-gradient(135deg, var(--brand-accent-2), var(--brand-primary));
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      flex-shrink: 0;
    }
    
    .mplr-action-text h3 {
      margin: 0 0 4px 0;
      font-size: 16px;
      font-weight: 700;
      color: #374151;
    }
    
    .mplr-action-text p {
      margin: 0;
      font-size: 13px;
      color: #64748b;
    }
  `;
  document.head.appendChild(style);
}

function toggleSettingsPanel() {
  const panel = document.getElementById('mplrSettingsPanel');
  if (!panel) return;
  
  if (panel.classList.contains('active')) {
    panel.classList.remove('active');
  } else {
    panel.classList.add('active');
    loadSettingsTab('property');
  }
}

function loadSettingsTab(tab) {
  const body = document.getElementById('mplrSettingsBody');
  const container = document.getElementById('appContainer');
  if (!body || !container) return;
  
  let section = null;
  if (tab === 'property') {
    section = Array.from(container.querySelectorAll('[data-mplr-setup]')).find(card => 
      card.querySelector('h3')?.textContent.includes('Property Configuration')
    );
  } else if (tab === 'floorplans') {
    section = Array.from(container.querySelectorAll('[data-mplr-setup]')).find(card => 
      card.querySelector('h3')?.textContent.includes('Floor Plan Tracker')
    );
  } else if (tab === 'tiers') {
    section = Array.from(container.querySelectorAll('[data-mplr-setup]')).find(card => 
      card.querySelector('h3')?.textContent.includes('Tier Pricing Tracker')
    );
  }
  
  if (section) {
    // Move the actual section (not clone) so event handlers work
    body.innerHTML = '';
    section.style.display = 'block';
    body.appendChild(section);
  }
}

function addProgressDashboard() {
  const container = document.getElementById('appContainer');
  if (!container || document.getElementById('mplrDashboard')) return;
  
  const dashboard = document.createElement('div');
  dashboard.id = 'mplrDashboard';
  dashboard.innerHTML = `
    <div class="mplr-dashboard-section">
      <h2 class="mplr-section-title">Leasing Progress</h2>
      <div class="mplr-progress-grid" id="mplrProgressGrid"></div>
    </div>
  `;
  
  const statsGrid = container.querySelector('.stats-grid');
  if (statsGrid) {
    statsGrid.after(dashboard);
  }
  
  renderProgressDashboard();
}

async function renderProgressDashboard() {
  const grid = document.getElementById('mplrProgressGrid');
  if (!grid) return;
  
  let totalBeds = 0;
  if (typeof getPropertyTotalBeds === 'function') {
    totalBeds = await getPropertyTotalBeds() || 0;
  }
  
  const totalLeased = leases ? leases.length : 0;
  const remaining = Math.max(0, totalBeds - totalLeased);
  const percent = totalBeds > 0 ? ((totalLeased / totalBeds) * 100).toFixed(1) : 0;
  
  let html = `
    <div class="mplr-progress-card">
      <div class="mplr-progress-header">
        <div>
          <div class="mplr-progress-label">Overall Occupancy</div>
          <div class="mplr-progress-percent">${percent}%</div>
        </div>
      </div>
      <div class="mplr-progress-bar">
        <div class="mplr-progress-fill ${getProgressClass(percent)}" style="width: ${percent}%"></div>
      </div>
      <div class="mplr-progress-stats">
        <span>${totalLeased} leased</span>
        <span>${remaining} remaining</span>
      </div>
    </div>
  `;
  
  // Floor plans
  if (window.getFloorPlans && typeof window.getFloorPlans === 'function') {
    const floorPlans = window.getFloorPlans();
    if (floorPlans && floorPlans.length > 0) {
      const leasedCounts = {};
      leases.forEach(lease => {
        const unitType = lease.unitType || '';
        leasedCounts[unitType] = (leasedCounts[unitType] || 0) + 1;
      });
      
      floorPlans.forEach(fp => {
        const leased = leasedCounts[fp.type] || 0;
        const fpPercent = fp.total > 0 ? ((leased / fp.total) * 100).toFixed(1) : 0;
        const available = Math.max(0, fp.total - leased);
        
        html += `
          <div class="mplr-progress-card">
            <div class="mplr-progress-header">
              <div>
                <div class="mplr-progress-label">${fp.type}</div>
                <div class="mplr-progress-percent">${fpPercent}%</div>
              </div>
            </div>
            <div class="mplr-progress-bar">
              <div class="mplr-progress-fill ${getProgressClass(fpPercent)}" style="width: ${fpPercent}%"></div>
            </div>
            <div class="mplr-progress-stats">
              <span>${leased}/${fp.total} leased</span>
              <span>${available} available</span>
            </div>
          </div>
        `;
      });
    }
  }
  
  // Tier progress
  const newLeaseTiers = window.newLeaseTiers || [];
  const renewalTiers = window.renewalTiers || [];
  
  if (newLeaseTiers.length > 0 || renewalTiers.length > 0) {
    const newLeases = leases.filter(l => (l.leaseType || '').toLowerCase().includes('new'));
    const renewalLeases = leases.filter(l => {
      const lt = (l.leaseType || '').toLowerCase();
      return lt.includes('renewal') || lt.includes('transfer');
    });
    
    // New lease tiers
    newLeaseTiers.forEach(tier => {
      const leaseCounts = {};
      newLeases.forEach(lease => {
        const key = `${lease.unitType}|${parseFloat(lease.monthlyRent) || 0}`;
        leaseCounts[key] = (leaseCounts[key] || 0) + 1;
      });
      
      let tierTotal = 0;
      let tierCap = 0;
      tier.unitTypes.forEach(ut => {
        const key = `${ut.type}|${ut.rate}`;
        tierTotal += leaseCounts[key] || 0;
        tierCap += ut.cap;
      });
      
      const tierPercent = tierCap > 0 ? ((tierTotal / tierCap) * 100).toFixed(1) : 0;
      const tierRemaining = Math.max(0, tierCap - tierTotal);
      
      html += `
        <div class="mplr-progress-card">
          <div class="mplr-progress-header">
            <div>
              <div class="mplr-progress-label">${tier.tier} (New Lease)</div>
              <div class="mplr-progress-percent">${tierPercent}%</div>
            </div>
          </div>
          <div class="mplr-progress-bar">
            <div class="mplr-progress-fill ${getProgressClass(tierPercent)}" style="width: ${tierPercent}%"></div>
          </div>
          <div class="mplr-progress-stats">
            <span>${tierTotal}/${tierCap} leased</span>
            <span>${tierRemaining} remaining</span>
          </div>
        </div>
      `;
    });
    
    // Renewal tiers
    renewalTiers.forEach(tier => {
      const leaseCounts = {};
      renewalLeases.forEach(lease => {
        const key = `${lease.unitType}|${parseFloat(lease.monthlyRent) || 0}`;
        leaseCounts[key] = (leaseCounts[key] || 0) + 1;
      });
      
      let tierTotal = 0;
      let tierCap = 0;
      tier.unitTypes.forEach(ut => {
        const key = `${ut.type}|${ut.rate}`;
        tierTotal += leaseCounts[key] || 0;
        tierCap += ut.cap;
      });
      
      const tierPercent = tierCap > 0 ? ((tierTotal / tierCap) * 100).toFixed(1) : 0;
      const tierRemaining = Math.max(0, tierCap - tierTotal);
      
      html += `
        <div class="mplr-progress-card">
          <div class="mplr-progress-header">
            <div>
              <div class="mplr-progress-label">${tier.tier} (Renewal)</div>
              <div class="mplr-progress-percent">${tierPercent}%</div>
            </div>
          </div>
          <div class="mplr-progress-bar">
            <div class="mplr-progress-fill ${getProgressClass(tierPercent)}" style="width: ${tierPercent}%"></div>
          </div>
          <div class="mplr-progress-stats">
            <span>${tierTotal}/${tierCap} leased</span>
            <span>${tierRemaining} remaining</span>
          </div>
        </div>
      `;
    });
  }
  
  grid.innerHTML = html;
}

function getProgressClass(percent) {
  const p = parseFloat(percent);
  if (p >= 90) return 'success';
  if (p >= 70) return '';
  if (p >= 50) return 'warning';
  return 'danger';
}

function reorganizeQuickActions() {
  const container = document.getElementById('appContainer');
  if (!container || document.getElementById('mplrActions')) return;
  
  const actions = document.createElement('div');
  actions.id = 'mplrActions';
  actions.innerHTML = `
    <div class="mplr-dashboard-section">
      <h2 class="mplr-section-title">Quick Actions</h2>
      <div class="mplr-actions-grid">
        <button class="mplr-action-btn" onclick="document.getElementById('importFile').click()">
          <div class="mplr-action-icon">↓</div>
          <div class="mplr-action-text">
            <h3>Import Leases</h3>
            <p>Upload Excel or CSV file</p>
          </div>
        </button>
        <button class="mplr-action-btn" onclick="document.getElementById('addLeaseBtn').click()">
          <div class="mplr-action-icon">+</div>
          <div class="mplr-action-text">
            <h3>Add Lease</h3>
            <p>Manual entry form</p>
          </div>
        </button>
        <button class="mplr-action-btn" onclick="document.getElementById('exportBtn').click()">
          <div class="mplr-action-icon">↑</div>
          <div class="mplr-action-text">
            <h3>Export Data</h3>
            <p>Download as CSV</p>
          </div>
        </button>
      </div>
    </div>
  `;
  
  const dashboard = document.getElementById('mplrDashboard');
  if (dashboard) {
    dashboard.after(actions);
  }
  
  // Hide original import section
  const importSection = Array.from(container.querySelectorAll('.card')).find(card => 
    card.querySelector('h3')?.textContent.includes('Import Data')
  );
  if (importSection) {
    importSection.style.display = 'none';
  }
}

// Update dashboard when data changes
if (window.updateStats && !window.updateStats._mplrWrapped) {
  const originalUpdateStats = window.updateStats;
  window.updateStats = function() {
    originalUpdateStats();
    if (typeof renderProgressDashboard === 'function') {
      renderProgressDashboard();
    }
  };
  window.updateStats._mplrWrapped = true;
}

window.toggleSettingsPanel = toggleSettingsPanel;
window.renderProgressDashboard = renderProgressDashboard;
