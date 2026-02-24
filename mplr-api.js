// MPLR API Integration - Sync data across devices

// API helper function
async function mplrApiFetch(path, opts = {}) {
  const headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
  const res = await fetch('/api' + path, Object.assign({}, opts, { headers, credentials: 'include' }));
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || ('HTTP ' + res.status));
  }
  return res;
}

// Load all MPLR data for a property from the server
async function loadMPLRData(property) {
  if (!property) return null;
  
  try {
    const res = await mplrApiFetch(`/mplr-data/${encodeURIComponent(property)}`);
    const data = await res.json();
    return data;
  } catch (error) {
    console.error('Failed to load MPLR data from server:', error);
    // Fallback to localStorage
    return loadMPLRDataFromLocalStorage(property);
  }
}

// Save all MPLR data for a property to the server
async function saveMPLRData(property, data) {
  if (!property) return false;
  
  try {
    const res = await mplrApiFetch(`/mplr-data/${encodeURIComponent(property)}`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
    const result = await res.json();
    
    // Also save to localStorage as backup
    saveMPLRDataToLocalStorage(property, data);
    
    return result.success;
  } catch (error) {
    console.error('Failed to save MPLR data to server:', error);
    // Fallback to localStorage
    saveMPLRDataToLocalStorage(property, data);
    return false;
  }
}

// Delete all MPLR data for a property
async function deleteMPLRData(property) {
  if (!property) return false;
  
  try {
    const res = await mplrApiFetch(`/mplr-data/${encodeURIComponent(property)}`, {
      method: 'DELETE'
    });
    const result = await res.json();
    
    // Also delete from localStorage
    deleteMPLRDataFromLocalStorage(property);
    
    return result.success;
  } catch (error) {
    console.error('Failed to delete MPLR data from server:', error);
    // Fallback to localStorage
    deleteMPLRDataFromLocalStorage(property);
    return false;
  }
}

// ==================== LOCALSTORAGE FALLBACK ====================

function loadMPLRDataFromLocalStorage(property) {
  const leasesKey = `mplr_leases_${property}`;
  const floorPlansKey = `mplr_floorplans_${property}`;
  const newLeaseTiersKey = `mplr_new_lease_tiers_${property}`;
  const renewalTiersKey = `mplr_renewal_tiers_${property}`;
  const totalBedsKey = `mplr_total_beds_${property}`;
  
  return {
    property,
    leases: JSON.parse(localStorage.getItem(leasesKey) || '[]'),
    floorPlans: JSON.parse(localStorage.getItem(floorPlansKey) || '[]'),
    newLeaseTiers: JSON.parse(localStorage.getItem(newLeaseTiersKey) || '[]'),
    renewalTiers: JSON.parse(localStorage.getItem(renewalTiersKey) || '[]'),
    totalBeds: parseInt(localStorage.getItem(totalBedsKey) || '0')
  };
}

function saveMPLRDataToLocalStorage(property, data) {
  if (data.leases !== undefined) {
    localStorage.setItem(`mplr_leases_${property}`, JSON.stringify(data.leases));
  }
  if (data.floorPlans !== undefined) {
    localStorage.setItem(`mplr_floorplans_${property}`, JSON.stringify(data.floorPlans));
  }
  if (data.newLeaseTiers !== undefined) {
    localStorage.setItem(`mplr_new_lease_tiers_${property}`, JSON.stringify(data.newLeaseTiers));
  }
  if (data.renewalTiers !== undefined) {
    localStorage.setItem(`mplr_renewal_tiers_${property}`, JSON.stringify(data.renewalTiers));
  }
  if (data.totalBeds !== undefined) {
    localStorage.setItem(`mplr_total_beds_${property}`, data.totalBeds.toString());
  }
}

function deleteMPLRDataFromLocalStorage(property) {
  localStorage.removeItem(`mplr_leases_${property}`);
  localStorage.removeItem(`mplr_floorplans_${property}`);
  localStorage.removeItem(`mplr_new_lease_tiers_${property}`);
  localStorage.removeItem(`mplr_renewal_tiers_${property}`);
  localStorage.removeItem(`mplr_total_beds_${property}`);
}

// ==================== MIGRATION ====================

// Migrate existing localStorage data to server
async function migrateLocalStorageToServer(property) {
  if (!property) return;
  
  console.log(`Migrating MPLR data for ${property} to server...`);
  
  const localData = loadMPLRDataFromLocalStorage(property);
  
  // Check if there's any data to migrate
  const hasData = localData.leases.length > 0 || 
                  localData.floorPlans.length > 0 || 
                  localData.newLeaseTiers.length > 0 || 
                  localData.renewalTiers.length > 0 || 
                  localData.totalBeds > 0;
  
  if (hasData) {
    const success = await saveMPLRData(property, localData);
    if (success) {
      console.log(`Successfully migrated MPLR data for ${property}`);
    } else {
      console.warn(`Failed to migrate MPLR data for ${property}, keeping in localStorage`);
    }
  }
}

// Expose functions globally
window.loadMPLRData = loadMPLRData;
window.saveMPLRData = saveMPLRData;
window.deleteMPLRData = deleteMPLRData;
window.migrateLocalStorageToServer = migrateLocalStorageToServer;
