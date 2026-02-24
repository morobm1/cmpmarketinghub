// MPLR Statistics and Property Configuration

// ==================== PROPERTY CONFIG ====================
function getPropertyTotalBeds() {
  if (!currentProperty) return 0;
  const key = `mplr_total_beds_${currentProperty}`;
  return parseInt(localStorage.getItem(key)) || 0;
}

function savePropertyTotalBeds(totalBeds) {
  if (!currentProperty) return;
  const key = `mplr_total_beds_${currentProperty}`;
  localStorage.setItem(key, totalBeds.toString());
}

function loadPropertyConfig() {
  const totalBeds = getPropertyTotalBeds();
  const input = document.getElementById('propertyTotalBeds');
  if (input) input.value = totalBeds || '';
}

// Initialize property config button
document.addEventListener('DOMContentLoaded', () => {
  const saveBtn = document.getElementById('saveTotalBedsBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const input = document.getElementById('propertyTotalBeds');
      const value = parseInt(input.value);
      if (isNaN(value) || value < 0) {
        alert('Please enter a valid number of beds');
        return;
      }
      savePropertyTotalBeds(value);
      updateStats();
      alert('Total beds saved successfully!');
    });
  }
});

// ==================== UPDATED STATS CALCULATION ====================
// Override the updateStats function
window.updateStatsOriginal = window.updateStats;
window.updateStats = function() {
  const totalBedsLeased = leases.length;
  const propertyTotalBeds = getPropertyTotalBeds();
  
  // Prelease % = (Total Beds Leased / Property Total Beds) * 100
  const preleasePercent = propertyTotalBeds > 0 
    ? ((totalBedsLeased / propertyTotalBeds) * 100).toFixed(2) 
    : 0;
  
  // Left to Lease = Property Total Beds - Total Beds Leased
  const leftToLease = Math.max(0, propertyTotalBeds - totalBedsLeased);
  
  // Total Renewals = count of leases where leaseType contains "Renewal" or "RT"
  const totalRenewals = leases.filter(l => {
    const type = (l.leaseType || '').toUpperCase();
    return type.includes('RENEWAL') || type === 'RT' || type === 'R/T';
  }).length;
  
  // Renewal Ratio = (Total Renewals / Property Total Beds) * 100
  const renewalRatio = propertyTotalBeds > 0
    ? ((totalRenewals / propertyTotalBeds) * 100).toFixed(2)
    : 0;
  
  // Renewal Transfer = count of leases where leaseType contains "Transfer" or is "RT"
  const renewalTransfer = leases.filter(l => {
    const type = (l.leaseType || '').toUpperCase();
    return type.includes('TRANSFER') || type === 'RT' || type === 'R/T';
  }).length;

  // Update UI
  const statPreleasePercent = document.getElementById('statPreleasePercent');
  const statTotalBedsLeased = document.getElementById('statTotalBedsLeased');
  const statLeftToLease = document.getElementById('statLeftToLease');
  const statTotalRenewals = document.getElementById('statTotalRenewals');
  const statRenewalRatio = document.getElementById('statRenewalRatio');
  const statRenewalTransfer = document.getElementById('statRenewalTransfer');
  
  if (statPreleasePercent) statPreleasePercent.textContent = preleasePercent + '%';
  if (statTotalBedsLeased) statTotalBedsLeased.textContent = totalBedsLeased;
  if (statLeftToLease) statLeftToLease.textContent = leftToLease;
  if (statTotalRenewals) statTotalRenewals.textContent = totalRenewals;
  if (statRenewalRatio) statRenewalRatio.textContent = renewalRatio + '%';
  if (statRenewalTransfer) statRenewalTransfer.textContent = renewalTransfer;
  
  // Load property config
  loadPropertyConfig();
};
