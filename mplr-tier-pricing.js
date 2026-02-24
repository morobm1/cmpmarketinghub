// MPLR Tier Pricing Tracker Functionality

let tierPricingConfig = []; // Array of {tier: string, unitTypes: [{type: string, rate: number}]}

// Initialize tier pricing tracker
document.addEventListener('DOMContentLoaded', () => {
  const addTierBtn = document.getElementById('addTierBtn');
  const addUnitTypeToTierBtn = document.getElementById('addUnitTypeToTierBtn');
  
  if (addTierBtn) {
    addTierBtn.addEventListener('click', addTier);
  }
  
  if (addUnitTypeToTierBtn) {
    addUnitTypeToTierBtn.addEventListener('click', addUnitTypeToTier);
  }
  
  // Load tier pricing when property changes
  const originalSetActiveProperty = window.setActiveProperty;
  if (originalSetActiveProperty) {
    window.setActiveProperty = async function(prop) {
      await originalSetActiveProperty(prop);
      loadTierPricing();
      renderTierPricingTracker();
    };
  }
});

// Load tier pricing from localStorage
function loadTierPricing() {
  if (!currentProperty) {
    tierPricingConfig = [];
    return;
  }
  
  const key = `mplr_tier_pricing_${currentProperty}`;
  const stored = localStorage.getItem(key);
  tierPricingConfig = stored ? JSON.parse(stored) : [];
}

// Save tier pricing to localStorage
function saveTierPricing() {
  if (!currentProperty) return;
  
  const key = `mplr_tier_pricing_${currentProperty}`;
  localStorage.setItem(key, JSON.stringify(tierPricingConfig));
}

// Add a new tier
function addTier() {
  const tierNameInput = document.getElementById('tierName');
  const tierName = tierNameInput.value.trim();
  
  if (!tierName) {
    alert('Please enter a tier name');
    return;
  }
  
  // Check if tier already exists
  const existing = tierPricingConfig.find(t => t.tier.toLowerCase() === tierName.toLowerCase());
  if (existing) {
    alert(`Tier "${tierName}" already exists`);
    return;
  }
  
  tierPricingConfig.push({ tier: tierName, unitTypes: [] });
  saveTierPricing();
  renderTierPricingTracker();
  
  // Clear input and populate tier selector
  tierNameInput.value = '';
  updateTierSelector();
}

// Add unit type to a tier
function addUnitTypeToTier() {
  const tierSelect = document.getElementById('tierSelect');
  const unitTypeInput = document.getElementById('tierUnitType');
  const rateInput = document.getElementById('tierRate');
  
  const tierName = tierSelect.value;
  const unitType = unitTypeInput.value.trim();
  const rate = parseFloat(rateInput.value);
  
  if (!tierName) {
    alert('Please select a tier');
    return;
  }
  
  if (!unitType) {
    alert('Please enter a unit type');
    return;
  }
  
  if (isNaN(rate) || rate < 0) {
    alert('Please enter a valid rate');
    return;
  }
  
  const tier = tierPricingConfig.find(t => t.tier === tierName);
  if (!tier) {
    alert('Tier not found');
    return;
  }
  
  // Check if unit type already exists in this tier
  const existing = tier.unitTypes.find(ut => ut.type.toLowerCase() === unitType.toLowerCase());
  if (existing) {
    if (!confirm(`Unit type "${unitType}" already exists in ${tierName} with rate $${existing.rate}. Update to $${rate}?`)) {
      return;
    }
    existing.rate = rate;
  } else {
    tier.unitTypes.push({ type: unitType, rate });
  }
  
  saveTierPricing();
  renderTierPricingTracker();
  
  // Clear inputs
  unitTypeInput.value = '';
  rateInput.value = '';
}

// Update tier selector dropdown
function updateTierSelector() {
  const tierSelect = document.getElementById('tierSelect');
  if (!tierSelect) return;
  
  tierSelect.innerHTML = '<option value="">-- Select Tier --</option>' +
    tierPricingConfig.map(t => `<option value="${esc(t.tier)}">${esc(t.tier)}</option>`).join('');
}

// Delete a tier
window.deleteTier = function(tierName) {
  if (!confirm(`Delete tier "${tierName}" and all its unit types? This cannot be undone.`)) {
    return;
  }
  
  tierPricingConfig = tierPricingConfig.filter(t => t.tier !== tierName);
  saveTierPricing();
  renderTierPricingTracker();
  updateTierSelector();
};

// Delete a unit type from a tier
window.deleteUnitTypeFromTier = function(tierName, unitType) {
  if (!confirm(`Remove "${unitType}" from tier "${tierName}"?`)) {
    return;
  }
  
  const tier = tierPricingConfig.find(t => t.tier === tierName);
  if (tier) {
    tier.unitTypes = tier.unitTypes.filter(ut => ut.type !== unitType);
    saveTierPricing();
    renderTierPricingTracker();
  }
};

// Render the tier pricing tracker
function renderTierPricingTracker() {
  const tierPricingList = document.getElementById('tierPricingList');
  
  if (!tierPricingConfig.length) {
    tierPricingList.style.display = 'none';
    return;
  }
  
  tierPricingList.style.display = 'block';
  updateTierSelector();
  
  // Count leases by unit type and lease type
  const newLeaseCounts = {};
  const renewalCounts = {};
  
  leases.forEach(lease => {
    const unitType = lease.unitType || '';
    const leaseType = (lease.leaseType || '').toLowerCase();
    
    if (leaseType.includes('new')) {
      newLeaseCounts[unitType] = (newLeaseCounts[unitType] || 0) + 1;
    } else if (leaseType.includes('renewal')) {
      renewalCounts[unitType] = (renewalCounts[unitType] || 0) + 1;
    }
  });
  
  // Generate HTML for each tier
  const tiersHTML = tierPricingConfig.map(tier => {
    let tierNewTotal = 0;
    let tierRenewalTotal = 0;
    
    const unitTypesHTML = tier.unitTypes.map(ut => {
      const newCount = newLeaseCounts[ut.type] || 0;
      const renewalCount = renewalCounts[ut.type] || 0;
      
      tierNewTotal += newCount;
      tierRenewalTotal += renewalCount;
      
      return `
        <tr style="border-bottom:1px solid var(--border)">
          <td style="padding:8px 12px">${esc(ut.type)}</td>
          <td style="padding:8px 12px;text-align:center">${newCount}</td>
          <td style="padding:8px 12px;text-align:center">${renewalCount}</td>
          <td style="padding:8px 12px;text-align:right">${formatCurrency(ut.rate)}</td>
          <td style="padding:8px 12px;text-align:center">
            <button class="btn sm danger" onclick="deleteUnitTypeFromTier('${esc(tier.tier)}', '${esc(ut.type)}')">Remove</button>
          </td>
        </tr>
      `;
    }).join('');
    
    return `
      <div style="margin-bottom:24px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
          <h4 style="font-size:16px;font-weight:700;color:#374151;margin:0">${esc(tier.tier)}</h4>
          <button class="btn sm danger" onclick="deleteTier('${esc(tier.tier)}')">Delete Tier</button>
        </div>
        
        <div style="overflow-x:auto;border:1px solid var(--border);border-radius:8px">
          <table style="width:100%;border-collapse:collapse;font-size:13px">
            <thead style="background:#f8fafc">
              <tr>
                <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;border-bottom:2px solid var(--border)">Unit Type</th>
                <th style="padding:10px 12px;text-align:center;font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;border-bottom:2px solid var(--border)">New Leases</th>
                <th style="padding:10px 12px;text-align:center;font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;border-bottom:2px solid var(--border)">Renewals</th>
                <th style="padding:10px 12px;text-align:right;font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;border-bottom:2px solid var(--border)">Current Rate</th>
                <th style="padding:10px 12px;text-align:center;font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;border-bottom:2px solid var(--border)">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${unitTypesHTML || '<tr><td colspan="5" style="padding:20px;text-align:center;color:#94a3b8">No unit types configured for this tier</td></tr>'}
              ${tier.unitTypes.length > 0 ? `
                <tr style="background:#f8fafc;font-weight:700">
                  <td style="padding:10px 12px">Total:</td>
                  <td style="padding:10px 12px;text-align:center;color:var(--brand-accent-2)">${tierNewTotal}</td>
                  <td style="padding:10px 12px;text-align:center;color:var(--success)">${tierRenewalTotal}</td>
                  <td colspan="2"></td>
                </tr>
              ` : ''}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }).join('');
  
  document.getElementById('tierPricingTables').innerHTML = tiersHTML;
}

// Override updateStats to also update tier pricing tracker
const originalUpdateStats2 = window.updateStats;
if (originalUpdateStats2) {
  window.updateStats = function() {
    originalUpdateStats2();
    renderTierPricingTracker();
  };
}

// Helper function for escaping HTML
function esc(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Helper function for formatting currency
function formatCurrency(n) {
  if (!isFinite(n)) return '$0.00';
  return '$' + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
