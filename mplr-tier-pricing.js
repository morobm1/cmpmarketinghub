// MPLR Tier Pricing Tracker Functionality

let newLeaseTiers = []; // Array of {tier: string, unitTypes: [{type: string, rate: number, cap: number}]}
let renewalTiers = []; // Array of {tier: string, unitTypes: [{type: string, rate: number, cap: number}]}

// Initialize tier pricing tracker
document.addEventListener('DOMContentLoaded', () => {
  const addTierBtn = document.getElementById('addTierBtn');
  const addUnitTypeToTierBtn = document.getElementById('addUnitTypeToTierBtn');
  const tierCategorySelect = document.getElementById('tierCategory');
  
  if (addTierBtn) {
    addTierBtn.addEventListener('click', addTier);
  }
  
  if (addUnitTypeToTierBtn) {
    addUnitTypeToTierBtn.addEventListener('click', addUnitTypeToTier);
  }
  
  if (tierCategorySelect) {
    tierCategorySelect.addEventListener('change', updateTierSelector);
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
  
  // Initialize unit type selector on page load
  setTimeout(() => {
    updateUnitTypeSelector();
  }, 500);
});

// Load tier pricing from localStorage
function loadTierPricing() {
  if (!currentProperty) {
    newLeaseTiers = [];
    renewalTiers = [];
    return;
  }
  
  const keyNew = `mplr_new_lease_tiers_${currentProperty}`;
  const keyRenewal = `mplr_renewal_tiers_${currentProperty}`;
  
  const storedNew = localStorage.getItem(keyNew);
  const storedRenewal = localStorage.getItem(keyRenewal);
  
  newLeaseTiers = storedNew ? JSON.parse(storedNew) : [];
  renewalTiers = storedRenewal ? JSON.parse(storedRenewal) : [];
}

// Save tier pricing to localStorage
function saveTierPricing() {
  if (!currentProperty) return;
  
  const keyNew = `mplr_new_lease_tiers_${currentProperty}`;
  const keyRenewal = `mplr_renewal_tiers_${currentProperty}`;
  
  localStorage.setItem(keyNew, JSON.stringify(newLeaseTiers));
  localStorage.setItem(keyRenewal, JSON.stringify(renewalTiers));
}

// Get current tier category
function getCurrentCategory() {
  const tierCategorySelect = document.getElementById('tierCategory');
  return tierCategorySelect ? tierCategorySelect.value : 'new';
}

// Get tiers for current category
function getCurrentTiers() {
  return getCurrentCategory() === 'new' ? newLeaseTiers : renewalTiers;
}

// Add a new tier
function addTier() {
  const tierNameInput = document.getElementById('tierName');
  const tierName = tierNameInput.value.trim();
  const category = getCurrentCategory();
  
  if (!tierName) {
    alert('Please enter a tier name');
    return;
  }
  
  // Validate tier name (must be Tier 1, Tier 2, Tier 3, or Tier 4)
  const validTiers = ['Tier 1', 'Tier 2', 'Tier 3', 'Tier 4'];
  if (!validTiers.includes(tierName)) {
    alert('Tier name must be exactly: Tier 1, Tier 2, Tier 3, or Tier 4');
    return;
  }
  
  const tiers = getCurrentTiers();
  
  // Check if tier already exists
  const existing = tiers.find(t => t.tier === tierName);
  if (existing) {
    alert(`${tierName} already exists in ${category === 'new' ? 'New Lease' : 'Renewal'} tiers`);
    return;
  }
  
  tiers.push({ tier: tierName, unitTypes: [] });
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
  const capInput = document.getElementById('tierCap');
  const category = getCurrentCategory();
  
  const tierName = tierSelect.value;
  const unitType = unitTypeInput.value.trim();
  const rate = parseFloat(rateInput.value);
  const cap = parseInt(capInput.value);
  
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
  
  if (isNaN(cap) || cap < 0) {
    alert('Please enter a valid cap (number of units)');
    return;
  }
  
  const tiers = getCurrentTiers();
  const tier = tiers.find(t => t.tier === tierName);
  
  if (!tier) {
    alert('Tier not found');
    return;
  }
  
  // Check if unit type with SAME RATE already exists in ANY tier for this category
  const existingInOtherTier = tiers.find(t => 
    t.tier !== tierName && t.unitTypes.some(ut => 
      ut.type.toLowerCase() === unitType.toLowerCase() && ut.rate === rate
    )
  );
  
  if (existingInOtherTier) {
    alert(`Unit type "${unitType}" with rate ${rate} already exists in ${existingInOtherTier.tier}. Each unit type + rate combination can only be in one tier.`);
    return;
  }
  
  // Check if unit type with SAME RATE already exists in this tier
  const existing = tier.unitTypes.find(ut => 
    ut.type.toLowerCase() === unitType.toLowerCase() && ut.rate === rate
  );
  
  if (existing) {
    if (!confirm(`Unit type "${unitType}" with rate ${rate} already exists in ${tierName}. Update cap to ${cap}?`)) {
      return;
    }
    existing.cap = cap;
  } else {
    tier.unitTypes.push({ type: unitType, rate, cap });
  }
  
  saveTierPricing();
  renderTierPricingTracker();
  
  // Clear inputs
  unitTypeInput.value = '';
  rateInput.value = '';
  capInput.value = '';
}

// Update tier selector dropdown
function updateTierSelector() {
  const tierSelect = document.getElementById('tierSelect');
  if (!tierSelect) return;
  
  const tiers = getCurrentTiers();
  const category = getCurrentCategory();
  
  tierSelect.innerHTML = `<option value="">-- Select ${category === 'new' ? 'New Lease' : 'Renewal'} Tier --</option>` +
    tiers.map(t => `<option value="${esc(t.tier)}">${esc(t.tier)}</option>`).join('');
  
  // Also update unit type dropdown
  updateUnitTypeSelector();
}

// Update unit type selector dropdown with floor plans
function updateUnitTypeSelector() {
  const unitTypeSelect = document.getElementById('tierUnitType');
  if (!unitTypeSelect) return;
  
  // Get floor plans from the floor plan tracker
  let floorPlans = [];
  if (typeof window.getFloorPlans === 'function') {
    floorPlans = window.getFloorPlans();
  }
  
  if (floorPlans.length === 0) {
    unitTypeSelect.innerHTML = '<option value="">-- No Floor Plans Configured --</option>';
  } else {
    unitTypeSelect.innerHTML = '<option value="">-- Select Unit Type --</option>' +
      floorPlans.map(fp => `<option value="${esc(fp.type)}">${esc(fp.type)}</option>`).join('');
  }
}

// Expose updateUnitTypeSelector for floor plan tracker to call
window.updateUnitTypeSelector = updateUnitTypeSelector;

// Delete a tier
window.deleteTier = function(category, tierName) {
  if (!confirm(`Delete ${tierName} and all its unit types? This cannot be undone.`)) {
    return;
  }
  
  if (category === 'new') {
    newLeaseTiers = newLeaseTiers.filter(t => t.tier !== tierName);
  } else {
    renewalTiers = renewalTiers.filter(t => t.tier !== tierName);
  }
  
  saveTierPricing();
  renderTierPricingTracker();
  updateTierSelector();
};

// Delete a unit type from a tier
window.deleteUnitTypeFromTier = function(category, tierName, unitType) {
  if (!confirm(`Remove "${unitType}" from ${tierName}?`)) {
    return;
  }
  
  const tiers = category === 'new' ? newLeaseTiers : renewalTiers;
  const tier = tiers.find(t => t.tier === tierName);
  
  if (tier) {
    tier.unitTypes = tier.unitTypes.filter(ut => ut.type !== unitType);
    saveTierPricing();
    renderTierPricingTracker();
  }
};

// Render the tier pricing tracker
function renderTierPricingTracker() {
  const tierPricingList = document.getElementById('tierPricingList');
  
  if (!newLeaseTiers.length && !renewalTiers.length) {
    tierPricingList.style.display = 'none';
    return;
  }
  
  tierPricingList.style.display = 'block';
  updateTierSelector();
  
  // Separate leases by type
  const newLeases = leases.filter(l => (l.leaseType || '').toLowerCase().includes('new'));
  const renewalLeases = leases.filter(l => {
    const lt = (l.leaseType || '').toLowerCase();
    return lt.includes('renewal') || lt.includes('transfer');
  });
  
  // Track matched unit types
  const matchedNewLeaseTypes = new Set();
  const matchedRenewalTypes = new Set();
  
  // Generate HTML for New Lease Tiers
  const newLeaseHTML = renderTierCategory('New Lease Tiers', newLeaseTiers, newLeases, 'new', matchedNewLeaseTypes);
  
  // Generate HTML for Renewal Tiers
  const renewalHTML = renderTierCategory('Renewal Tiers', renewalTiers, renewalLeases, 'renewal', matchedRenewalTypes);
  
  // Find unmatched leases
  const unmatchedNewLeases = newLeases.filter(l => !matchedNewLeaseTypes.has(l.unitType));
  const unmatchedRenewalLeases = renewalLeases.filter(l => !matchedRenewalTypes.has(l.unitType));
  
  // Generate unmatched records HTML
  const unmatchedHTML = renderUnmatchedRecords(unmatchedNewLeases, unmatchedRenewalLeases);
  
  document.getElementById('tierPricingTables').innerHTML = newLeaseHTML + renewalHTML + unmatchedHTML;
}

// Render a tier category (New Lease or Renewal)
function renderTierCategory(title, tiers, leases, category, matchedTypes) {
  if (!tiers.length) {
    return `
      <div style="margin-bottom:32px">
        <h4 style="font-size:16px;font-weight:700;color:#374151;margin-bottom:12px">${title}</h4>
        <div style="padding:20px;background:#f8fafc;border:1px solid var(--border);border-radius:8px;text-align:center;color:#64748b">
          No tiers configured. Create Tier 1, Tier 2, Tier 3, or Tier 4 to get started.
        </div>
      </div>
    `;
  }
  
  // Count leases by unit type AND rate (monthly base rent)
  // Key format: "unitType|rate"
  const leaseCounts = {};
  leases.forEach(lease => {
    const unitType = lease.unitType || '';
    const monthlyRent = parseFloat(lease.monthlyRent) || 0;
    const key = `${unitType}|${monthlyRent}`;
    leaseCounts[key] = (leaseCounts[key] || 0) + 1;
  });
  
  // Sort tiers by name (Tier 1, Tier 2, Tier 3, Tier 4)
  const sortedTiers = [...tiers].sort((a, b) => {
    const aNum = parseInt(a.tier.replace('Tier ', ''));
    const bNum = parseInt(b.tier.replace('Tier ', ''));
    return aNum - bNum;
  });
  
  // Generate HTML for each tier
  const tiersHTML = sortedTiers.map(tier => {
    let tierTotal = 0;
    let tierCap = 0;
    
    const unitTypesHTML = tier.unitTypes.map(ut => {
      // Match by unit type AND rate (monthly base rent)
      const key = `${ut.type}|${ut.rate}`;
      const count = leaseCounts[key] || 0;
      tierTotal += count;
      tierCap += ut.cap;
      
      // Mark this unit type as matched
      if (count > 0) {
        matchedTypes.add(ut.type);
      }
      
      const remaining = Math.max(0, ut.cap - count);
      const percentFilled = ut.cap > 0 ? ((count / ut.cap) * 100).toFixed(1) : 0;
      
      return `
        <tr style="border-bottom:1px solid var(--border)">
          <td style="padding:8px 12px">${esc(ut.type)}</td>
          <td style="padding:8px 12px;text-align:center">${ut.cap}</td>
          <td style="padding:8px 12px;text-align:center;font-weight:700;color:${count > 0 ? 'var(--brand-accent-2)' : '#94a3b8'}">${count}</td>
          <td style="padding:8px 12px;text-align:center">${remaining}</td>
          <td style="padding:8px 12px;text-align:center">${percentFilled}%</td>
          <td style="padding:8px 12px;text-align:right">${formatCurrency(ut.rate)}</td>
          <td style="padding:8px 12px;text-align:center">
            <button class="btn sm danger" onclick="deleteUnitTypeFromTier('${category}', '${esc(tier.tier)}', '${esc(ut.type)}')">Remove</button>
          </td>
        </tr>
      `;
    }).join('');
    
    const tierRemaining = Math.max(0, tierCap - tierTotal);
    const tierPercent = tierCap > 0 ? ((tierTotal / tierCap) * 100).toFixed(1) : 0;
    
    return `
      <div style="margin-bottom:20px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
          <h5 style="font-size:14px;font-weight:700;color:#374151;margin:0">${esc(tier.tier)}</h5>
          <button class="btn sm danger" onclick="deleteTier('${category}', '${esc(tier.tier)}')">Delete Tier</button>
        </div>
        
        <div style="overflow-x:auto;border:1px solid var(--border);border-radius:8px">
          <table style="width:100%;border-collapse:collapse;font-size:13px">
            <thead style="background:#f8fafc">
              <tr>
                <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;border-bottom:2px solid var(--border)">Unit Type</th>
                <th style="padding:10px 12px;text-align:center;font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;border-bottom:2px solid var(--border)">Cap</th>
                <th style="padding:10px 12px;text-align:center;font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;border-bottom:2px solid var(--border)">Leased</th>
                <th style="padding:10px 12px;text-align:center;font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;border-bottom:2px solid var(--border)">Remaining</th>
                <th style="padding:10px 12px;text-align:center;font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;border-bottom:2px solid var(--border)">% Filled</th>
                <th style="padding:10px 12px;text-align:right;font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;border-bottom:2px solid var(--border)">Rate</th>
                <th style="padding:10px 12px;text-align:center;font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;border-bottom:2px solid var(--border)">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${unitTypesHTML || '<tr><td colspan="7" style="padding:20px;text-align:center;color:#94a3b8">No unit types configured for this tier</td></tr>'}
              ${tier.unitTypes.length > 0 ? `
                <tr style="background:#f8fafc;font-weight:700">
                  <td style="padding:10px 12px">Total:</td>
                  <td style="padding:10px 12px;text-align:center">${tierCap}</td>
                  <td style="padding:10px 12px;text-align:center;color:var(--brand-primary)">${tierTotal}</td>
                  <td style="padding:10px 12px;text-align:center">${tierRemaining}</td>
                  <td style="padding:10px 12px;text-align:center">${tierPercent}%</td>
                  <td colspan="2"></td>
                </tr>
              ` : ''}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }).join('');
  
  return `
    <div style="margin-bottom:32px">
      <h4 style="font-size:16px;font-weight:700;color:#374151;margin-bottom:16px">${title}</h4>
      ${tiersHTML}
    </div>
  `;
}

// Render unmatched records
function renderUnmatchedRecords(unmatchedNew, unmatchedRenewal) {
  if (!unmatchedNew.length && !unmatchedRenewal.length) {
    return '';
  }
  
  let html = `
    <div style="margin-top:32px;padding-top:32px;border-top:2px solid var(--border)">
      <h4 style="font-size:16px;font-weight:700;color:#ef4444;margin-bottom:12px">⚠️ Unmatched Records</h4>
      <p style="font-size:13px;color:#64748b;margin-bottom:16px">
        These leases don't match any configured tier. Add their unit types to the appropriate tier to include them in tracking.
      </p>
  `;
  
  if (unmatchedNew.length > 0) {
    html += `
      <div style="margin-bottom:20px">
        <h5 style="font-size:14px;font-weight:700;color:#374151;margin-bottom:8px">Unmatched New Leases (${unmatchedNew.length})</h5>
        <div style="overflow-x:auto;border:1px solid #fecaca;border-radius:8px;background:#fef2f2">
          <table style="width:100%;border-collapse:collapse;font-size:12px">
            <thead style="background:#fee2e2">
              <tr>
                <th style="padding:8px 10px;text-align:left;font-size:11px;font-weight:700;color:#991b1b;text-transform:uppercase;border-bottom:2px solid #fecaca">Unit Type</th>
                <th style="padding:8px 10px;text-align:left;font-size:11px;font-weight:700;color:#991b1b;text-transform:uppercase;border-bottom:2px solid #fecaca">Resident</th>
                <th style="padding:8px 10px;text-align:left;font-size:11px;font-weight:700;color:#991b1b;text-transform:uppercase;border-bottom:2px solid #fecaca">Apt/Bed</th>
                <th style="padding:8px 10px;text-align:left;font-size:11px;font-weight:700;color:#991b1b;text-transform:uppercase;border-bottom:2px solid #fecaca">Lease Start</th>
              </tr>
            </thead>
            <tbody>
              ${unmatchedNew.map(l => `
                <tr style="border-bottom:1px solid #fecaca">
                  <td style="padding:8px 10px;font-weight:700;color:#991b1b">${esc(l.unitType)}</td>
                  <td style="padding:8px 10px">${esc(l.firstName)} ${esc(l.lastName)}</td>
                  <td style="padding:8px 10px">${esc(l.floorPlan)}</td>
                  <td style="padding:8px 10px">${formatDate(l.leaseStart)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }
  
  if (unmatchedRenewal.length > 0) {
    html += `
      <div style="margin-bottom:20px">
        <h5 style="font-size:14px;font-weight:700;color:#374151;margin-bottom:8px">Unmatched Renewals (${unmatchedRenewal.length})</h5>
        <div style="overflow-x:auto;border:1px solid #fecaca;border-radius:8px;background:#fef2f2">
          <table style="width:100%;border-collapse:collapse;font-size:12px">
            <thead style="background:#fee2e2">
              <tr>
                <th style="padding:8px 10px;text-align:left;font-size:11px;font-weight:700;color:#991b1b;text-transform:uppercase;border-bottom:2px solid #fecaca">Unit Type</th>
                <th style="padding:8px 10px;text-align:left;font-size:11px;font-weight:700;color:#991b1b;text-transform:uppercase;border-bottom:2px solid #fecaca">Resident</th>
                <th style="padding:8px 10px;text-align:left;font-size:11px;font-weight:700;color:#991b1b;text-transform:uppercase;border-bottom:2px solid #fecaca">Apt/Bed</th>
                <th style="padding:8px 10px;text-align:left;font-size:11px;font-weight:700;color:#991b1b;text-transform:uppercase;border-bottom:2px solid #fecaca">Lease Type</th>
              </tr>
            </thead>
            <tbody>
              ${unmatchedRenewal.map(l => `
                <tr style="border-bottom:1px solid #fecaca">
                  <td style="padding:8px 10px;font-weight:700;color:#991b1b">${esc(l.unitType)}</td>
                  <td style="padding:8px 10px">${esc(l.firstName)} ${esc(l.lastName)}</td>
                  <td style="padding:8px 10px">${esc(l.floorPlan)}</td>
                  <td style="padding:8px 10px"><span class="badge warning">${esc(l.leaseType)}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }
  
  html += '</div>';
  return html;
}

// Helper function to format date
function formatDate(d) {
  if (!d) return '';
  try {
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch (e) {
    return d;
  }
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
