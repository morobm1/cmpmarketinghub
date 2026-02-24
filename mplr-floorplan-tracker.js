// MPLR Floor Plan Tracker Functionality

let floorPlans = []; // Array of {type: string, total: number}

// Initialize floor plan tracker
document.addEventListener('DOMContentLoaded', () => {
  const addFloorPlanBtn = document.getElementById('addFloorPlanBtn');
  
  if (addFloorPlanBtn) {
    addFloorPlanBtn.addEventListener('click', addFloorPlan);
  }
  
  // Load floor plans when property changes
  const originalSetActiveProperty = window.setActiveProperty;
  if (originalSetActiveProperty) {
    window.setActiveProperty = async function(prop) {
      await originalSetActiveProperty(prop);
      loadFloorPlans();
      renderFloorPlanTracker();
    };
  }
});

// Load floor plans from localStorage
function loadFloorPlans() {
  if (!currentProperty) {
    floorPlans = [];
    return;
  }
  
  const key = `mplr_floorplans_${currentProperty}`;
  const stored = localStorage.getItem(key);
  floorPlans = stored ? JSON.parse(stored) : [];
}

// Save floor plans to localStorage
function saveFloorPlans() {
  if (!currentProperty) return;
  
  const key = `mplr_floorplans_${currentProperty}`;
  localStorage.setItem(key, JSON.stringify(floorPlans));
}

// Add a new floor plan
function addFloorPlan() {
  const typeInput = document.getElementById('floorPlanType');
  const totalInput = document.getElementById('floorPlanTotal');
  
  const type = typeInput.value.trim();
  const total = parseInt(totalInput.value);
  
  if (!type) {
    alert('Please enter a floor plan type');
    return;
  }
  
  if (isNaN(total) || total < 0) {
    alert('Please enter a valid total number of units');
    return;
  }
  
  // Check if floor plan already exists
  const existing = floorPlans.find(fp => fp.type.toLowerCase() === type.toLowerCase());
  if (existing) {
    if (!confirm(`Floor plan "${type}" already exists with ${existing.total} units. Update to ${total} units?`)) {
      return;
    }
    existing.total = total;
  } else {
    floorPlans.push({ type, total });
  }
  
  saveFloorPlans();
  renderFloorPlanTracker();
  notifyFloorPlanChange();
  
  // Clear inputs
  typeInput.value = '';
  totalInput.value = '';
}

// Delete a floor plan
window.deleteFloorPlan = function(type) {
  if (!confirm(`Delete floor plan "${type}"? This cannot be undone.`)) {
    return;
  }
  
  floorPlans = floorPlans.filter(fp => fp.type !== type);
  saveFloorPlans();
  renderFloorPlanTracker();
  notifyFloorPlanChange();
};

// Render the floor plan tracker table
function renderFloorPlanTracker() {
  const floorPlanList = document.getElementById('floorPlanList');
  const floorPlanTableBody = document.getElementById('floorPlanTableBody');
  
  if (!floorPlans.length) {
    floorPlanList.style.display = 'none';
    return;
  }
  
  floorPlanList.style.display = 'block';
  
  // Count leased units by unit type from leases
  const leasedCounts = {};
  leases.forEach(lease => {
    const unitType = lease.unitType || '';
    leasedCounts[unitType] = (leasedCounts[unitType] || 0) + 1;
  });
  
  // Sort floor plans alphabetically
  const sortedFloorPlans = [...floorPlans].sort((a, b) => a.type.localeCompare(b.type));
  
  floorPlanTableBody.innerHTML = sortedFloorPlans.map(fp => {
    const leased = leasedCounts[fp.type] || 0;
    const available = Math.max(0, fp.total - leased);
    const percentLeased = fp.total > 0 ? ((leased / fp.total) * 100).toFixed(1) : 0;
    
    // Determine color based on percentage
    let percentColor = '#22c55e'; // green
    if (percentLeased < 50) {
      percentColor = '#ef4444'; // red
    } else if (percentLeased < 80) {
      percentColor = '#f59e0b'; // orange
    }
    
    return `
      <tr style="border-bottom:1px solid var(--border)">
        <td style="padding:10px 12px">
          <strong>${esc(fp.type)}</strong>
        </td>
        <td style="padding:10px 12px;text-align:center">
          ${fp.total}
        </td>
        <td style="padding:10px 12px;text-align:center">
          <span style="color:${percentColor};font-weight:700">${leased}</span>
        </td>
        <td style="padding:10px 12px;text-align:center">
          ${available}
        </td>
        <td style="padding:10px 12px;text-align:center">
          <span style="color:${percentColor};font-weight:700">${percentLeased}%</span>
        </td>
        <td style="padding:10px 12px;text-align:center">
          <button class="btn sm danger" onclick="deleteFloorPlan('${esc(fp.type)}')">Delete</button>
        </td>
      </tr>
    `;
  }).join('');
}

// Override updateStats to also update floor plan tracker
const originalUpdateStats = window.updateStats;
if (originalUpdateStats) {
  window.updateStats = function() {
    originalUpdateStats();
    renderFloorPlanTracker();
  };
}

// Helper function for escaping HTML
function esc(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Expose function to get floor plans for other modules (like tier pricing)
window.getFloorPlans = function() {
  return floorPlans;
};

// Notify tier pricing tracker when floor plans change
function notifyFloorPlanChange() {
  if (typeof window.updateUnitTypeSelector === 'function') {
    window.updateUnitTypeSelector();
  }
}

// Also call on initial load after floor plans are loaded
const originalLoadFloorPlans = loadFloorPlans;
loadFloorPlans = function() {
  originalLoadFloorPlans();
  // Notify tier pricing after floor plans are loaded
  setTimeout(() => {
    notifyFloorPlanChange();
  }, 100);
};
