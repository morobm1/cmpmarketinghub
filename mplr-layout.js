// MPLR Modern Layout - Settings Modal + Dashboard View

// Wait for everything to be fully loaded
window.addEventListener('load', () => {
  setTimeout(() => {
    initializeModernLayout();
  }, 100);
});

function initializeModernLayout() {
  console.log('Initializing modern MPLR layout...');
  
  // Hide original setup sections
  hideSetupSections();
  
  // Add settings button to header
  addSettingsButton();
  
  // Create settings modal
  createSettingsModal();
  
  // Add visual progress dashboard
  addProgressDashboard();
  
  // Add quick action buttons
  addQuickActions();
  
  console.log('Modern MPLR layout complete');
}

function hideSetupSections() {
  const container = document.getElementById('appContainer');
  if (!container) return;
  
  // Hide Property Configuration, Floor Plan Tracker, and Tier Pricing Tracker
  const cards = container.querySelectorAll('.card');
  cards.forEach(card => {
    const h3 = card.querySelector('h3');
    if (h3) {
      const text = h3.textContent;
      if (text.includes('Property Configuration') || 
          text.includes('Floor Plan Tracker') || 
          text.includes('Tier Pricing Tracker')) {
        card.style.display = 'none';
        card.setAttribute('data-setup-section', 'true');
      }
    }
  });
}

function addSettingsButton() {
  const headerControls = document.querySelector('.header-controls');
  if (!headerControls) return;
  
  // Check if button already exists
  if (document.getElementById('mplrSettingsBtn')) return;
  
  const settingsBtn = document.createElement('button');
  settingsBtn.id = 'mplrSettingsBtn';
  settingsBtn.className = 'header-btn';
  settingsBtn.innerHTML = '⚙️ Settings';
  settingsBtn.onclick = openSettingsModal;
  
  // Insert before logout button
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    headerControls.insertBefore(settingsBtn, logoutBtn);
  } else {
    headerControls.appendChild(settingsBtn);
  }
}

function createSettingsModal() {
  // Check if modal already exists
  if (document.getElementById('mplrSettingsModal')) return;
  
  const modal = document.createElement('div');
  modal.id = 'mplrSettingsModal';
  modal.className = 'mplr-settings-modal';
  modal.innerHTML = `
    <div class="mplr-settings-overlay" onclick="closeSettingsModal()"></div>
    <div class="mplr-settings-panel">
      <div class="mplr-settings-header">
        <h2>⚙️ MPLR Settings</h2>
        <button class="mplr-close-btn" onclick="closeSettingsModal()">��</button>
      </div>
      <div class="mplr-settings-tabs">
        <button class="mplr-tab active" onclick="switchSettingsTab('property')">Property</button>
        <button class="mplr-tab" onclick="switchSettingsTab('floorplans')">Floor Plans</button>
        <button class="mplr-tab" onclick="switchSettingsTab('tiers')">Tier Pricing</button>
      </div>
      <div class="mplr-settings-content" id="mplrSettingsContent">
        <!-- Content will be loaded here -->
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  addSettingsStyles();
}

function addSettingsStyles() {
  if (document.getElementById('mplrSettingsStyles')) return;
  
  const style = document.createElement('style');
  style.id = 'mplrSettingsStyles';
  style.textContent = `
    .mplr-settings-modal {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 1000;
      display: none;
      opacity: 0;
      transition: opacity 0.3s ease;
    }
    
    .mplr-settings-modal.show {
      display: block;
      opacity: 1;
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
    
    .mplr-settings-panel {
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      width: 90%;
      max-width: 900px;
      background: white;
      box-shadow: -4px 0 24px rgba(0, 0, 0, 0.15);
      display: flex;
      flex-direction: column;
      transform: translateX(100%);
      transition: transform 0.3s ease;
    }
    
    .mplr-settings-modal.show .mplr-settings-panel {
      transform: translateX(0);
    }
    
    .mplr-settings-header {
      padding: 24px;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    
    .mplr-settings-header h2 {
      margin: 0;
      font-size: 24px;
      font-weight: 700;
    }
    
    .mplr-close-btn {
      background: rgba(255, 255, 255, 0.2);
      border: none;
      color: white;
      font-size: 24px;
      width: 40px;
      height: 40px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .mplr-close-btn:hover {
      background: rgba(255, 255, 255, 0.3);
    }
    
    .mplr-settings-tabs {
      display: flex;
      gap: 4px;
      padding: 16px 24px 0;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
    }
    
    .mplr-tab {
      padding: 12px 24px;
      background: transparent;
      border: none;
      border-bottom: 3px solid transparent;
      color: #64748b;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .mplr-tab:hover {
      color: #374151;
      background: rgba(102, 126, 234, 0.1);
    }
    
    .mplr-tab.active {
      color: #667eea;
      border-bottom-color: #667eea;
      background: white;
    }
    
    .mplr-settings-content {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
      background: white;
    }
    
    /* Progress Dashboard */
    .mplr-dashboard {
      margin-bottom: 24px;
    }
    
    .mplr-dashboard-title {
      font-size: 24px;
      font-weight: 700;
      color: #374151;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .mplr-progress-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
      margin-bottom: 32px;
    }
    
    .mplr-progress-card {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
      transition: all 0.3s ease;
    }
    
    .mplr-progress-card:hover {
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
      transform: translateY(-4px);
    }
    
    .mplr-progress-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 16px;
    }
    
    .mplr-progress-title {
      font-size: 14px;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .mplr-progress-value {
      font-size: 36px;
      font-weight: 700;
      color: #667eea;
      line-height: 1;
    }
    
    .mplr-progress-bar-wrapper {
      margin-top: 16px;
    }
    
    .mplr-progress-bar-bg {
      width: 100%;
      height: 12px;
      background: #e5e7eb;
      border-radius: 999px;
      overflow: hidden;
      position: relative;
    }
    
    .mplr-progress-bar-fill {
      height: 100%;
      background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
      border-radius: 999px;
      transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      overflow: hidden;
    }
    
    .mplr-progress-bar-fill::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
      animation: shimmer 2s infinite;
    }
    
    @keyframes shimmer {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }
    
    .mplr-progress-bar-fill.success {
      background: linear-gradient(90deg, #22c55e 0%, #16a34a 100%);
    }
    
    .mplr-progress-bar-fill.warning {
      background: linear-gradient(90deg, #f59e0b 0%, #d97706 100%);
    }
    
    .mplr-progress-bar-fill.danger {
      background: linear-gradient(90deg, #ef4444 0%, #dc2626 100%);
    }
    
    .mplr-progress-details {
      display: flex;
      justify-content: space-between;
      margin-top: 12px;
      font-size: 13px;
      color: #64748b;
    }
    
    .mplr-progress-stat {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    
    /* Quick Actions */
    .mplr-quick-actions {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 16px;
      margin-bottom: 32px;
    }
    
    .mplr-action-card {
      background: white;
      border: 2px solid #e2e8f0;
      border-radius: 12px;
      padding: 20px;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 16px;
    }
    
    .mplr-action-card:hover {
      border-color: #667eea;
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%);
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
    }
    
    .mplr-action-icon {
      font-size: 32px;
      width: 56px;
      height: 56px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 12px;
      flex-shrink: 0;
    }
    
    .mplr-action-content {
      flex: 1;
    }
    
    .mplr-action-title {
      font-size: 16px;
      font-weight: 700;
      color: #374151;
      margin-bottom: 4px;
    }
    
    .mplr-action-desc {
      font-size: 13px;
      color: #64748b;
    }
  `;
  document.head.appendChild(style);
}

function openSettingsModal() {
  const modal = document.getElementById('mplrSettingsModal');
  if (modal) {
    modal.classList.add('show');
    switchSettingsTab('property');
  }
}

function closeSettingsModal() {
  const modal = document.getElementById('mplrSettingsModal');
  if (modal) {
    modal.classList.remove('show');
  }
}

function switchSettingsTab(tab) {
  // Update active tab
  const tabs = document.querySelectorAll('.mplr-tab');
  tabs.forEach(t => t.classList.remove('active'));
  event?.target?.classList.add('active');
  
  const content = document.getElementById('mplrSettingsContent');
  if (!content) return;
  
  const container = document.getElementById('appContainer');
  if (!container) return;
  
  // Get the appropriate section
  let section = null;
  if (tab === 'property') {
    section = Array.from(container.querySelectorAll('.card')).find(card => 
      card.querySelector('h3')?.textContent.includes('Property Configuration')
    );
  } else if (tab === 'floorplans') {
    section = Array.from(container.querySelectorAll('.card')).find(card => 
      card.querySelector('h3')?.textContent.includes('Floor Plan Tracker')
    );
  } else if (tab === 'tiers') {
    section = Array.from(container.querySelectorAll('.card')).find(card => 
      card.querySelector('h3')?.textContent.includes('Tier Pricing Tracker')
    );
  }
  
  if (section) {
    content.innerHTML = '';
    const clone = section.cloneNode(true);
    clone.style.display = 'block';
    clone.style.marginBottom = '0';
    content.appendChild(clone);
  }
}

function addProgressDashboard() {
  const container = document.getElementById('appContainer');
  if (!container) return;
  
  // Check if dashboard already exists
  if (document.getElementById('mplrDashboard')) return;
  
  const dashboard = document.createElement('div');
  dashboard.id = 'mplrDashboard';
  dashboard.className = 'mplr-dashboard';
  dashboard.innerHTML = `
    <h1 class="mplr-dashboard-title">
      <span>📊</span>
      <span>Leasing Dashboard</span>
    </h1>
    <div class="mplr-progress-grid" id="mplrProgressGrid"></div>
  `;
  
  // Insert after stats
  const statsGrid = container.querySelector('.stats-grid');
  if (statsGrid) {
    statsGrid.after(dashboard);
  }
  
  renderProgressDashboard();
}

async function renderProgressDashboard() {
  const grid = document.getElementById('mplrProgressGrid');
  if (!grid) return;
  
  // Get total beds
  let totalBeds = 0;
  if (typeof getPropertyTotalBeds === 'function') {
    totalBeds = await getPropertyTotalBeds() || 0;
  }
  
  const totalLeased = leases ? leases.length : 0;
  const remaining = Math.max(0, totalBeds - totalLeased);
  const percentLeased = totalBeds > 0 ? ((totalLeased / totalBeds) * 100).toFixed(1) : 0;
  
  let html = `
    <!-- Overall Occupancy -->
    <div class="mplr-progress-card">
      <div class="mplr-progress-header">
        <div>
          <div class="mplr-progress-title">Overall Occupancy</div>
          <div class="mplr-progress-value">${percentLeased}%</div>
        </div>
      </div>
      <div class="mplr-progress-bar-wrapper">
        <div class="mplr-progress-bar-bg">
          <div class="mplr-progress-bar-fill ${getProgressClass(percentLeased)}" style="width: ${percentLeased}%"></div>
        </div>
      </div>
      <div class="mplr-progress-details">
        <span class="mplr-progress-stat">✅ ${totalLeased} leased</span>
        <span class="mplr-progress-stat">📍 ${remaining} remaining</span>
      </div>
    </div>
  `;
  
  // Add floor plan progress
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
        const percent = fp.total > 0 ? ((leased / fp.total) * 100).toFixed(1) : 0;
        const available = Math.max(0, fp.total - leased);
        
        html += `
          <div class="mplr-progress-card">
            <div class="mplr-progress-header">
              <div>
                <div class="mplr-progress-title">${fp.type}</div>
                <div class="mplr-progress-value">${percent}%</div>
              </div>
            </div>
            <div class="mplr-progress-bar-wrapper">
              <div class="mplr-progress-bar-bg">
                <div class="mplr-progress-bar-fill ${getProgressClass(percent)}" style="width: ${percent}%"></div>
              </div>
            </div>
            <div class="mplr-progress-details">
              <span class="mplr-progress-stat">✅ ${leased}/${fp.total}</span>
              <span class="mplr-progress-stat">📍 ${available} available</span>
            </div>
          </div>
        `;
      });
    }
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

function addQuickActions() {
  const container = document.getElementById('appContainer');
  if (!container) return;
  
  // Check if quick actions already exist
  if (document.getElementById('mplrQuickActions')) return;
  
  const quickActions = document.createElement('div');
  quickActions.id = 'mplrQuickActions';
  quickActions.className = 'mplr-quick-actions';
  quickActions.innerHTML = `
    <div class="mplr-action-card" onclick="document.getElementById('importFile').click()">
      <div class="mplr-action-icon">📥</div>
      <div class="mplr-action-content">
        <div class="mplr-action-title">Import Leases</div>
        <div class="mplr-action-desc">Upload Excel or CSV file</div>
      </div>
    </div>
    
    <div class="mplr-action-card" onclick="document.getElementById('addLeaseBtn').click()">
      <div class="mplr-action-icon">➕</div>
      <div class="mplr-action-content">
        <div class="mplr-action-title">Add Lease</div>
        <div class="mplr-action-desc">Manual entry form</div>
      </div>
    </div>
    
    <div class="mplr-action-card" onclick="document.getElementById('exportBtn').click()">
      <div class="mplr-action-icon">📤</div>
      <div class="mplr-action-content">
        <div class="mplr-action-title">Export Data</div>
        <div class="mplr-action-desc">Download as CSV</div>
      </div>
    </div>
  `;
  
  // Insert before Import Section
  const importSection = Array.from(container.querySelectorAll('.card')).find(card => 
    card.querySelector('h3')?.textContent.includes('Import Data')
  );
  
  if (importSection) {
    importSection.before(quickActions);
    // Hide the import section since we have quick actions
    importSection.style.display = 'none';
  }
}

// Update dashboard when data changes
if (window.updateStats && !window.updateStats._dashboardWrapped) {
  const originalUpdateStatsForDashboard = window.updateStats;
  window.updateStats = function() {
    originalUpdateStatsForDashboard();
    if (typeof renderProgressDashboard === 'function') {
      renderProgressDashboard();
    }
  };
  window.updateStats._dashboardWrapped = true;
}

// Expose functions
window.openSettingsModal = openSettingsModal;
window.closeSettingsModal = closeSettingsModal;
window.switchSettingsTab = switchSettingsTab;
window.renderProgressDashboard = renderProgressDashboard;
