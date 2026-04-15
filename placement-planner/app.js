/* ============================================================
   app.js -- Application Entry Point & Shared State
   Initializes the app, wires up event listeners, and manages
   the shared state between modules (config.js, inventory.js,
   excel.js, map.js, ui.js).

   3-column workbench layout: left sidebar, center map panel,
   right detail panel. Collapsible sections, modal-based imports.
   ============================================================ */

/* ------------------------------------------------------------------
   SHARED APPLICATION STATE
   ------------------------------------------------------------------ */
const AppState = {
  /** @type {Array<{unitNumber: string, unitType: string}>|null} Master unit inventory */
  inventory: null,

  /** @type {Map<string, object>|null} Resident lookup keyed by UPPERCASE Unit_Assigned */
  residents: null,

  /** @type {Array<object>} Waiting bank residents (not yet assigned to a unit) */
  waitingBank: [],

  /** @type {Array<{name: string, scholarship: string, _id: string}>} Unassigned scholarship records */
  unassignedScholarships: [],

  /** @type {Map<string, object>} Cache of loaded SVG maps keyed by "buildingKey:floor" */
  mapCache: new Map(),

  /** @type {string|null} Currently selected building key */
  selectedBuilding: null,

  /** @type {number|null} Currently selected floor number */
  selectedFloor: null,

  /** @type {boolean} Whether to show resident name labels */
  showNames: false,

  /** @type {boolean} Whether to highlight scholarship overrides only */
  scholarshipOnly: false,



  /** @type {string} Current prelease progress scope (legacy compat) */
  preleaseProgressScope: 'property',

  /** @type {object} Current filter state */
  filters: {
    occupancy: 'all',
    scholarship: 'all',
    lease: 'all',
    floorplan: 'all',
  },

  /** @type {string} Currently active view section */
  currentView: DEFAULT_VIEW,



  /** @type {object} Prelease scope state for enhanced prelease */
  preleaseScope: { type: 'property' },

  /** @type {Map<string, string>} Scholarship-reserved units: uppercase unitKey -> scholarship name */
  scholarshipReservedUnits: new Map(),
};

/* ------------------------------------------------------------------
   API + LOCAL STORAGE PERSISTENCE -- FULL PROJECT
   ─────────────────────────────────────────────────────────────────
   Source of Truth: MongoDB Atlas via /api/placement-planner
   Cache: localStorage (write-through, never authoritative)

   IMPORTANT: localStorage is a READ-ONLY fallback. If the API is
   unreachable, stale localStorage data is shown but NEVER pushed
   back to the API to avoid overwriting shared data.

   See STORAGE_ARCHITECTURE.md for full documentation.
   ------------------------------------------------------------------ */
const STORAGE_KEY = 'propertySiteMap_project';
const PROJECT_VERSION = 5;
const API_BASE = '/api/placement-planner';

/** Flag: true once initial API load has completed (success or fail) */
var _apiLoadComplete = false;

/** Flag: true if the last API operation succeeded (for connection status) */
var _apiConnected = false;

/** Timestamp from the shared document's last save */
var _lastUpdatedAt = null;

/** Username who last updated the shared document */
var _lastUpdatedBy = null;

/** Number of consecutive API persist failures (for retry logic) */
var _persistFailCount = 0;
var _MAX_PERSIST_RETRIES = 2;

/** Revision counter for optimistic concurrency control.
 *  Tracks the _rev from the server so we can detect stale overwrites.
 *  null = never loaded from server (legacy/first-time) */
var _serverRev = null;

/** Flag: true while a conflict-resolution reload is in progress */
var _conflictReloading = false;

/** Flag: true while an API save is in-flight (prevents background sync interference) */
var _savingInProgress = false;

/**
 * Build a serializable project object from current AppState.
 */
function buildProjectData() {
  var residentsArr = [];
  if (AppState.residents) {
    AppState.residents.forEach(function (r) { residentsArr.push(r); });
  }

  return {
    version: PROJECT_VERSION,
    savedAt: new Date().toISOString(),
    inventory: AppState.inventory || [],
    residents: residentsArr,
    waitingBank: AppState.waitingBank || [],
    unassignedScholarships: AppState.unassignedScholarships || [],

    scholarshipReservedUnits: (function () {
      var arr = [];
      if (AppState.scholarshipReservedUnits) {
        AppState.scholarshipReservedUnits.forEach(function (scholarship, unitKey) {
          arr.push({ unitKey: unitKey, scholarship: scholarship });
        });
      }
      return arr;
    })(),
    settings: {
      selectedBuilding: AppState.selectedBuilding,
      selectedFloor: AppState.selectedFloor,
      showNames: AppState.showNames,
      scholarshipOnly: AppState.scholarshipOnly,
      currentView: AppState.currentView,
    },
  };
}

/* ------------------------------------------------------------------
   STATE RECONCILIATION — Single source of truth enforcement
   ─────────────────────────────────────────────────────────────────
   Called after every import, merge, restore, and before every save.
   Ensures:
     1. No bank entry references a resident already placed in a unit
     2. No duplicate bank entries (by normalized name + unitType)
     3. Bank entries have stable _id values
     4. Placed residents map is clean (no empty keys)
   ------------------------------------------------------------------ */

/**
 * Normalize a name for dedup comparison.
 * Strips whitespace, lowercases, and removes punctuation.
 */
function _normalizeName(name) {
  if (!name) return '';
  return name.trim().toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ');
}

/**
 * Generate a stable dedup key for a bank entry based on name + unitType.
 * Used to detect duplicates regardless of _id differences.
 */
function _bankDedupKey(entry) {
  var name = _normalizeName(entry.name || '');
  var unitType = (entry.unitType || '').trim().toUpperCase();
  return name + '|' + unitType;
}

/**
 * Reconcile AppState to enforce consistency between placed residents
 * and the waiting bank. This is the core guardrail against ghost entries.
 *
 * @param {object} [opts] - Options
 * @param {boolean} [opts.silent] - If true, don't log reconciliation actions
 * @returns {{ removedFromBank: number, dedupedBank: number, cleanedResidents: number }}
 */
function _reconcileState(opts) {
  opts = opts || {};
  var stats = { removedFromBank: 0, dedupedBank: 0, cleanedResidents: 0 };

  var residents = AppState.residents || new Map();
  var bank = AppState.waitingBank || [];

  // --- 1. Build a set of normalized names of all placed residents ---
  var placedNames = new Set();
  residents.forEach(function (r) {
    var norm = _normalizeName(r.Resident_Name);
    if (norm) placedNames.add(norm);
  });

  // --- 2. Remove bank entries whose name matches a placed resident ---
  var cleanedBank = [];
  for (var i = 0; i < bank.length; i++) {
    var entry = bank[i];
    var normName = _normalizeName(entry.name);
    if (normName && placedNames.has(normName)) {
      stats.removedFromBank++;
      if (!opts.silent) {
        console.info('[Reconcile] Removed "' + entry.name + '" from bank — already placed in a unit.');
      }
      continue;
    }
    cleanedBank.push(entry);
  }

  // --- 3. Deduplicate bank entries by normalized name + unitType ---
  var seenKeys = new Set();
  var dedupedBank = [];
  for (var j = 0; j < cleanedBank.length; j++) {
    var entry = cleanedBank[j];
    var key = _bankDedupKey(entry);

    if (seenKeys.has(key)) {
      stats.dedupedBank++;
      if (!opts.silent) {
        console.info('[Reconcile] Removed duplicate bank entry: "' + entry.name + '" / "' + entry.unitType + '"');
      }
      continue;
    }
    seenKeys.add(key);

    // Ensure entry has a stable _id
    if (!entry._id) {
      entry._id = 'bank_' + key.replace(/[^a-z0-9]/g, '_') + '_' + Date.now();
    }

    dedupedBank.push(entry);
  }

  AppState.waitingBank = dedupedBank;

  // --- 4. Deduplicate placed residents (same person at multiple units) ---
  // If the same person is placed at two different unit keys, keep only the
  // most recently placed one (the one whose unit key matches their Unit_Assigned).
  if (residents.size > 0) {
    var nameToUnits = new Map(); // normName → [unitKey, ...]
    residents.forEach(function (r, unitKey) {
      var normName = _normalizeName(r.Resident_Name);
      if (!normName) return;
      if (!nameToUnits.has(normName)) nameToUnits.set(normName, []);
      nameToUnits.get(normName).push(unitKey);
    });

    nameToUnits.forEach(function (units, normName) {
      if (units.length <= 1) return; // No duplicate
      // Same person at multiple units — keep the one where unitKey matches Unit_Assigned
      var keepKey = null;
      for (var u = 0; u < units.length; u++) {
        var r = residents.get(units[u]);
        if (r && r.Unit_Assigned && r.Unit_Assigned.toUpperCase() === units[u]) {
          keepKey = units[u];
        }
      }
      // If no clear match, keep the last one (most recent edit)
      if (!keepKey) keepKey = units[units.length - 1];

      for (var u = 0; u < units.length; u++) {
        if (units[u] !== keepKey) {
          if (!opts.silent) {
            console.info('[Reconcile] Removed duplicate placement for "' +
              residents.get(units[u]).Resident_Name + '" at ' + units[u] +
              ' (keeping ' + keepKey + ')');
          }
          residents.delete(units[u]);
          stats.cleanedResidents++;
        }
      }
    });
  }

  // --- 5. Clean placed residents map (remove empty keys) ---
  if (residents.size > 0) {
    var keysToRemove = [];
    residents.forEach(function (r, unitKey) {
      if (!unitKey || !r || !r.Resident_Name) {
        keysToRemove.push(unitKey);
      }
    });
    keysToRemove.forEach(function (k) {
      residents.delete(k);
      stats.cleanedResidents++;
    });
  }

  if (!opts.silent && (stats.removedFromBank > 0 || stats.dedupedBank > 0 || stats.cleanedResidents > 0)) {
    console.info('[Reconcile] Summary:', stats);
  }

  return stats;
}

/**
 * Persist project to API (primary) and localStorage (cache).
 * Uses debounce internally so rapid calls don't flood the server.
 *
 * Write order:
 *   1. localStorage (synchronous, fast cache)
 *   2. API POST (debounced 500ms, retries on failure)
 */
var _persistTimer = null;
function persistProject() {
  // Reconcile state before every save to prevent persisting inconsistent data
  _reconcileState({ silent: true });

  // Always write to localStorage immediately (fast cache)
  try {
    var data = buildProjectData();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to persist project to localStorage:', e);
  }

  // Debounce the API call (500ms)
  if (_persistTimer) clearTimeout(_persistTimer);
  _persistTimer = setTimeout(function () {
    _persistProjectToApi();
  }, 500);
}

/**
 * Send current project data to the API.
 * Uses optimistic concurrency control: sends _rev so the server can
 * reject stale writes (409 Conflict). On conflict, fetches the latest
 * server data and merges it with local changes instead of overwriting.
 *
 * Shows a user-visible notification on failure and retries up to
 * _MAX_PERSIST_RETRIES times before giving up.
 */
function _persistProjectToApi() {
  if (_conflictReloading) return; // Don't save while resolving a conflict

  _savingInProgress = true;
  var data = buildProjectData();
  var payload = { project: data };

  // Send _rev for optimistic concurrency control
  if (_serverRev !== null) {
    payload._rev = _serverRev;
  }

  fetch(API_BASE, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).then(function (res) {
    if (res.status === 409) {
      // Conflict: another user saved while we had stale data
      return res.json().then(function (conflict) {
        _savingInProgress = false;
        _handleSaveConflict(conflict);
      });
    }
    if (!res.ok) {
      throw new Error('HTTP ' + res.status);
    }
    return res.json().then(function (json) {
      _persistFailCount = 0;
      _savingInProgress = false;
      _setApiConnected(true);
      _lastUpdatedAt = new Date().toISOString();

      // Update our _rev to the new server revision
      if (typeof json._rev === 'number') {
        _serverRev = json._rev;
      }

      _renderSyncStatus();
    });
  }).catch(function (err) {
    _savingInProgress = false;
    console.warn('API persist error:', err);
    _persistFailCount++;
    _setApiConnected(false);

    if (_persistFailCount <= _MAX_PERSIST_RETRIES) {
      // Retry after a short delay
      console.info('Retrying API persist (attempt ' + (_persistFailCount + 1) + ')...');
      setTimeout(function () { _persistProjectToApi(); }, 1500 * _persistFailCount);
    } else {
      // Show user-visible error after retries exhausted
      showNotification(
        'Failed to save to shared database after ' + _MAX_PERSIST_RETRIES + ' retries. ' +
        'Your changes are saved locally but may not be visible to other users. ' +
        'Check your network connection and refresh.',
        'error'
      );
      _persistFailCount = 0; // Reset for next save attempt
    }
  });
}

/**
 * Handle a 409 Conflict from the server. The server returns the current
 * server-side project data so we can merge instead of blindly overwriting.
 *
 * Strategy: Fetch the latest server data and merge it with local changes.
 * - Inventory: use whichever is larger (more units = more complete)
 * - Residents: union by unit key (server wins on duplicates, local adds preserved)
 * - Waiting bank: union by _id or name (deduplicated)
 * - Scholarships: union by _id or name (deduplicated)
 * - Scholarship reserved units: union (server wins on same unit key)
 *
 * After merging, re-persist with the fresh _rev from the server.
 */
function _handleSaveConflict(conflict) {
  console.warn('Save conflict detected — merging with server data from ' +
    (conflict.updatedBy || 'unknown') + ' at ' + (conflict.updatedAt || '?'));

  _conflictReloading = true;

  // Update our _rev to match the server's current revision
  _serverRev = (typeof conflict.serverRev === 'number') ? conflict.serverRev : null;
  _lastUpdatedAt = conflict.updatedAt || null;
  _lastUpdatedBy = conflict.updatedBy || null;

  var serverProject = conflict.project;
  if (!serverProject || typeof serverProject !== 'object') {
    // No valid server data — just re-persist with updated _rev
    _conflictReloading = false;
    showNotification('Sync conflict detected — retrying save...', 'warning');
    _persistProjectToApi();
    return;
  }

  // Build arrays from current local state for merging
  var localData = buildProjectData();

  // --- MERGE INVENTORY ---
  // Use whichever inventory is larger (more complete import)
  var mergedInventory = localData.inventory || [];
  var serverInventory = serverProject.inventory || [];
  if (serverInventory.length > mergedInventory.length) {
    mergedInventory = serverInventory;
  }

  // --- MERGE RESIDENTS ---
  // Smart merge: detects MOVES (same person at different units) to avoid duplicates.
  // Local edits win because the local user just made them intentionally.
  var mergedResidents = new Map();

  // Build name→unitKey maps for both sides to detect moves
  var serverByName = new Map(); // normName → { unitKey, resident }
  var localByName = new Map();

  (serverProject.residents || []).forEach(function (r) {
    var key = (r.Unit_Assigned || '').toUpperCase();
    var normName = _normalizeName(r.Resident_Name);
    if (key) {
      mergedResidents.set(key, r);
      if (normName) serverByName.set(normName, { unitKey: key, resident: r });
    }
  });

  (localData.residents || []).forEach(function (r) {
    var key = (r.Unit_Assigned || '').toUpperCase();
    var normName = _normalizeName(r.Resident_Name);
    if (key) {
      // Check if this person exists on the server at a DIFFERENT unit (= MOVE)
      if (normName) {
        var serverEntry = serverByName.get(normName);
        if (serverEntry && serverEntry.unitKey !== key) {
          // This is a MOVE: local says unit B, server says unit A.
          // Remove the server's stale placement at the old unit.
          mergedResidents.delete(serverEntry.unitKey);
          console.info('[Merge] Detected move: "' + r.Resident_Name + '" moved from ' +
            serverEntry.unitKey + ' → ' + key + ' (local edit wins)');
        }
        localByName.set(normName, { unitKey: key, resident: r });
      }
      mergedResidents.set(key, r);
    }
  });

  var mergedResidentsArr = [];
  mergedResidents.forEach(function (r) { mergedResidentsArr.push(r); });

  // --- MERGE WAITING BANK ---
  var mergedBank = _mergeArrayByKey(
    serverProject.waitingBank || [],
    localData.waitingBank || [],
    function (item) { return item._id || item.name || JSON.stringify(item); }
  );

  // --- MERGE UNASSIGNED SCHOLARSHIPS ---
  var mergedScholarships = _mergeArrayByKey(
    serverProject.unassignedScholarships || [],
    localData.unassignedScholarships || [],
    function (item) { return item._id || item.name || JSON.stringify(item); }
  );

  // --- MERGE SCHOLARSHIP RESERVED UNITS ---
  var mergedReserved = new Map();
  (serverProject.scholarshipReservedUnits || []).forEach(function (entry) {
    if (entry.unitKey && entry.scholarship) {
      mergedReserved.set(entry.unitKey.toUpperCase(), entry.scholarship);
    }
  });
  (localData.scholarshipReservedUnits || []).forEach(function (entry) {
    if (entry.unitKey && entry.scholarship) {
      mergedReserved.set(entry.unitKey.toUpperCase(), entry.scholarship);
    }
  });

  // Apply merged data to AppState
  AppState.inventory = buildMasterInventory(mergedInventory);
  AppState.residents = new Map();
  mergedResidentsArr.forEach(function (r) {
    var key = (r.Unit_Assigned || '').toUpperCase();
    if (key) AppState.residents.set(key, r);
  });
  AppState.waitingBank = mergedBank;
  AppState.unassignedScholarships = mergedScholarships;
  AppState.scholarshipReservedUnits = mergedReserved;

  // CRITICAL: Reconcile after merge to remove bank entries for placed residents
  // and deduplicate any entries that both server and local had
  _reconcileState({ silent: false });

  // Update localStorage cache
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(buildProjectData()));
  } catch (e) { /* ignore */ }

  // Refresh all UI
  if (typeof refreshAllAfterImport === 'function') {
    refreshAllAfterImport();
  }

  _conflictReloading = false;

  // Show a user-friendly notification
  showNotification(
    'Another user (' + (conflict.updatedBy || 'unknown') + ') saved changes while you were editing. ' +
    'Your changes have been merged with theirs automatically.',
    'warning'
  );

  // Re-persist the merged result with the current server _rev
  _persistProjectToApi();
}

/**
 * Merge two arrays, deduplicating by a key function.
 * Items from arrayB (local) override items from arrayA (server) with the same key.
 * Items unique to either array are included.
 */
function _mergeArrayByKey(arrayA, arrayB, keyFn) {
  var map = new Map();
  arrayA.forEach(function (item) { map.set(keyFn(item), item); });
  arrayB.forEach(function (item) { map.set(keyFn(item), item); });
  var result = [];
  map.forEach(function (item) { result.push(item); });
  return result;
}

function persistResidents() {
  persistProject();
}

/**
 * Load project from the API first, falling back to localStorage.
 *
 * CRITICAL: If the API fails, localStorage is used as a READ-ONLY
 * cache. We do NOT push stale localStorage data back to the API,
 * because that would overwrite shared data with per-browser state.
 *
 * @returns {Promise<boolean>} true if a project was restored
 */
async function loadPersistedProject() {
  // Try API first
  try {
    var res = await fetch(API_BASE, { credentials: 'include' });
    if (res.ok) {
      var json = await res.json();
      if (json.project && typeof json.project === 'object') {
        var restored = restoreProjectData(json.project);
        if (restored) {
          // Update localStorage cache with API data
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(json.project));
          } catch (e) { /* ignore cache write failure */ }
          _apiLoadComplete = true;
          _setApiConnected(true);

          // Track server revision for optimistic concurrency control
          _serverRev = (typeof json._rev === 'number') ? json._rev : null;

          // Track shared document metadata from API response
          _lastUpdatedAt = json.updatedAt || json.project.savedAt || null;
          _lastUpdatedBy = json.updatedBy || null;

          // Also restore colors if present in the same response
          if (json.colors && typeof json.colors === 'object') {
            _restoreColorsFromData(json.colors);
          }

          return true;
        }
      }
      // API returned OK but no valid project — still connected
      _apiLoadComplete = true;
      _setApiConnected(true);
      return false;
    }
  } catch (e) {
    console.warn('API load failed, falling back to localStorage (READ-ONLY):', e);
  }

  // Mark API as disconnected — show warning banner
  _setApiConnected(false);

  // Fallback to localStorage (READ-ONLY — never push back to API)
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    var data = JSON.parse(raw);
    var result = restoreProjectData(data);
    _apiLoadComplete = true;

    // DO NOT push localStorage data back to API.
    // This was the root cause of the cross-computer data loss bug:
    // Computer B had empty localStorage, API GET failed, empty data
    // was pushed back to API, overwriting Computer A's real data.

    return result;
  } catch (e) {
    console.warn('Failed to load persisted project:', e);
    return false;
  }
}

/**
 * Update the API connection status and render the sync banner.
 * When disconnected, a warning banner is shown and edit controls
 * may be dimmed to discourage edits that can't be shared.
 */
function _setApiConnected(connected) {
  var wasConnected = _apiConnected;
  _apiConnected = connected;

  // Only re-render banner if status changed
  if (wasConnected !== connected) {
    _renderSyncBanner();
  }
}

/**
 * Render/hide the API connection warning banner at the top of the page.
 */
function _renderSyncBanner() {
  var existingBanner = document.getElementById('api-sync-banner');

  if (_apiConnected) {
    // Remove banner if present
    if (existingBanner) existingBanner.remove();
    return;
  }

  // Show disconnected banner
  if (!existingBanner) {
    existingBanner = document.createElement('div');
    existingBanner.id = 'api-sync-banner';
    existingBanner.style.cssText =
      'position:fixed;top:0;left:0;right:0;z-index:10000;' +
      'background:#fbbf24;color:#78350f;text-align:center;' +
      'padding:6px 16px;font-size:0.82rem;font-weight:600;' +
      'box-shadow:0 2px 8px rgba(0,0,0,0.15);';
    document.body.appendChild(existingBanner);
  }

  existingBanner.textContent =
    '⚠ Unable to reach shared database — showing cached data. ' +
    'Changes may not sync to other users until connection is restored.';
}

/**
 * Render the last-synced timestamp in the header (if element exists).
 */
function _renderSyncStatus() {
  var el = document.getElementById('sync-status');
  if (!el) return;

  if (_lastUpdatedAt) {
    try {
      var d = new Date(_lastUpdatedAt);
      el.textContent = 'Synced: ' + d.toLocaleTimeString();
      el.title = 'Last saved to shared database: ' + d.toLocaleString() +
        (_lastUpdatedBy ? ' by ' + _lastUpdatedBy : '');
    } catch (e) {
      el.textContent = '';
    }
  } else {
    el.textContent = '';
  }
}

/**
 * Restore a project data object into AppState.
 * Handles both old format (inventory as string[]) and new format (inventory as object[]).
 */
function restoreProjectData(data) {
  if (!data || typeof data !== 'object') return false;

  if (data.version && data.version > PROJECT_VERSION) {
    console.warn('Project version ' + data.version + ' is newer than supported (' + PROJECT_VERSION + ').');
  }

  // Restore inventory
  if (Array.isArray(data.inventory) && data.inventory.length > 0) {
    AppState.inventory = buildMasterInventory(data.inventory);
  } else {
    AppState.inventory = null;
  }

  // Restore residents
  if (Array.isArray(data.residents) && data.residents.length > 0) {
    var map = new Map();
    data.residents.forEach(function (r) {
      var key = (r.Unit_Assigned || '').toUpperCase();
      if (key) map.set(key, r);
    });
    AppState.residents = map;
  } else {
    AppState.residents = null;
  }

  // Restore waiting bank
  if (Array.isArray(data.waitingBank) && data.waitingBank.length > 0) {
    AppState.waitingBank = data.waitingBank;
  } else {
    AppState.waitingBank = [];
  }

  // Restore unassigned scholarships
  if (Array.isArray(data.unassignedScholarships) && data.unassignedScholarships.length > 0) {
    AppState.unassignedScholarships = data.unassignedScholarships;
  } else {
    AppState.unassignedScholarships = [];
  }



  // Restore scholarship reserved units
  if (Array.isArray(data.scholarshipReservedUnits) && data.scholarshipReservedUnits.length > 0) {
    var reservedMap = new Map();
    data.scholarshipReservedUnits.forEach(function (entry) {
      if (entry.unitKey && entry.scholarship) {
        reservedMap.set(entry.unitKey.toUpperCase(), entry.scholarship);
      }
    });
    AppState.scholarshipReservedUnits = reservedMap;
  } else {
    AppState.scholarshipReservedUnits = new Map();
  }

  // Restore settings
  if (data.settings) {
    AppState.selectedBuilding = data.settings.selectedBuilding || null;
    AppState.selectedFloor = data.settings.selectedFloor != null ? data.settings.selectedFloor : null;
    AppState.showNames = !!data.settings.showNames;
    AppState.scholarshipOnly = !!data.settings.scholarshipOnly;
    if (data.settings.currentView) {
      AppState.currentView = data.settings.currentView;
    }
  }

  // Reconcile state after every restore to fix any inconsistencies
  // (e.g., bank entries for residents who are already placed)
  _reconcileState({ silent: false });

  return true;
}

/* ------------------------------------------------------------------
   PERSISTENCE HELPERS
   ------------------------------------------------------------------ */

function savePersistedState() {
  persistProject();
}

function loadPersistedState() {
  return loadPersistedProject();
}

/**
 * Clear persisted state from both API and localStorage.
 * The API DELETE removes the shared document; localStorage is cleared locally.
 */
function clearPersistedState() {
  // Clear localStorage
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(COLOR_STORAGE_KEY);
  } catch (e) {
    console.warn('Failed to clear persisted state:', e);
  }

  // Reset revision tracking
  _serverRev = null;

  // Clear API data (shared document)
  fetch(API_BASE, {
    method: 'DELETE',
    credentials: 'include',
  }).then(function (res) {
    if (!res.ok) {
      console.warn('API clear failed: HTTP ' + res.status);
      showNotification('Warning: shared database clear may have failed. Other users may still see old data.', 'error');
    } else {
      _setApiConnected(true);
      _lastUpdatedAt = null;
      _lastUpdatedBy = null;
      _renderSyncStatus();
    }
  }).catch(function (err) {
    console.warn('API clear error:', err);
    _setApiConnected(false);
    showNotification('Warning: could not reach shared database to clear data.', 'error');
  });
}

function sanitizePersistedState(data) {
  if (!data || typeof data !== 'object') return null;
  if (!Array.isArray(data.inventory)) data.inventory = [];
  if (!Array.isArray(data.residents)) data.residents = [];
  if (!Array.isArray(data.waitingBank)) data.waitingBank = [];

  if (!data.settings || typeof data.settings !== 'object') data.settings = {};
  return data;
}

/* ------------------------------------------------------------------
   BACKGROUND SYNC — Periodically check if the server _rev has
   advanced (another user saved). If so, fetch latest data and merge
   so that this client doesn't sit on stale data indefinitely.
   Runs every 30 seconds when the tab is visible.
   ------------------------------------------------------------------ */
var _bgSyncInterval = null;
var _BG_SYNC_MS = 10000; // 10 seconds — more responsive multi-user sync

function _startBackgroundSync() {
  if (_bgSyncInterval) return;
  _bgSyncInterval = setInterval(_backgroundSyncCheck, _BG_SYNC_MS);

  // Also sync when tab becomes visible again (user switched back)
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) {
      _backgroundSyncCheck();
    }
  });
}

function _backgroundSyncCheck() {
  if (_conflictReloading) return; // Skip if already resolving a conflict
  if (!_apiLoadComplete) return;  // Skip if initial load hasn't finished
  if (_persistTimer) return;      // Skip if a save is pending (debounce in-flight)
  if (_savingInProgress) return;  // Skip if an API save is actively in-flight

  fetch(API_BASE, { credentials: 'include' })
    .then(function (res) {
      if (!res.ok) return null;
      return res.json();
    })
    .then(function (json) {
      if (!json) return;
      _setApiConnected(true);

      var serverRev = (typeof json._rev === 'number') ? json._rev : null;

      // If server _rev is ahead of ours, another user saved
      if (serverRev !== null && _serverRev !== null && serverRev > _serverRev) {
        console.info('Background sync: server _rev ' + serverRev + ' > local _rev ' + _serverRev +
          ' (updated by ' + (json.updatedBy || '?') + ')');

        // Merge server data with our local state
        _handleSaveConflict({
          serverRev: serverRev,
          updatedBy: json.updatedBy || null,
          updatedAt: json.updatedAt || null,
          project: json.project || null,
        });
      } else if (serverRev !== null && _serverRev === null) {
        // First time seeing a _rev from the server — just track it
        _serverRev = serverRev;
      }

      // Update metadata
      _lastUpdatedAt = json.updatedAt || _lastUpdatedAt;
      _lastUpdatedBy = json.updatedBy || _lastUpdatedBy;
      _renderSyncStatus();
    })
    .catch(function (err) {
      // Silently ignore background sync failures — don't spam the user
      console.warn('Background sync check failed:', err);
    });
}

/* ------------------------------------------------------------------
   DEBOUNCE UTILITY
   ------------------------------------------------------------------ */
function debounce(fn, delay) {
  var timer = null;
  return function () {
    var context = this;
    var args = arguments;
    if (timer) clearTimeout(timer);
    timer = setTimeout(function () {
      fn.apply(context, args);
    }, delay);
  };
}

/* ------------------------------------------------------------------
   AUTHENTICATION & ROLE-BASED ACCESS
   Admin users can add/edit/delete data.
   Regular users can only view data.
   ------------------------------------------------------------------ */
var AppUserRole = 'viewer'; // default to viewer (read-only)

async function initAuth() {
  try {
    var meRes = await fetch('/api/me', { credentials: 'include' });
    if (meRes.ok) {
      var me = await meRes.json();
      AppUserRole = (me.role || '').toLowerCase() === 'admin' ? 'admin' : 'viewer';
      return true;
    }
  } catch (e) {
    console.warn('Auth check failed, running in local/offline mode as admin:', e);
    AppUserRole = 'admin'; // Allow full access when running locally
    return true;
  }
  // Not authenticated — redirect to hub login
  window.location.href = '../index.html';
  return false;
}

function applyRoleRestrictions() {
  if (AppUserRole === 'admin') return; // Admins have full access

  // Non-admins get the Staff View by default (handled in _initViewModeToggle).
  // The admin workbench edit controls are also disabled as a safety net.
  var editElements = [
    '#import-section',
    '#add-resident-btn',
    '#swap-unit-btn',
    '.sidebar-footer',
    '#restore-section',
  ];

  editElements.forEach(function (sel) {
    var el = document.querySelector(sel);
    if (el) el.style.display = 'none';
  });

  // Disable all bank assign buttons
  document.querySelectorAll('.bank-assign-btn').forEach(function (btn) {
    btn.disabled = true;
    btn.style.opacity = '0.4';
    btn.style.cursor = 'not-allowed';
    btn.title = 'View-only mode';
  });

  // Disable action buttons in master list (edit/delete)
  document.querySelectorAll('.action-btn').forEach(function (btn) {
    btn.disabled = true;
    btn.style.opacity = '0.4';
    btn.style.cursor = 'not-allowed';
    btn.title = 'View-only mode';
  });
}

// Re-apply restrictions after dynamic content renders
function reapplyViewerRestrictions() {
  if (AppUserRole === 'admin') return;

  document.querySelectorAll('.bank-assign-btn, .action-btn').forEach(function (btn) {
    btn.disabled = true;
    btn.style.opacity = '0.4';
    btn.style.cursor = 'not-allowed';
    btn.title = 'View-only mode';
  });
}

/* ------------------------------------------------------------------
   VIEW MODE — Admin View vs Staff View
   Admins default to Admin View but can toggle to Staff View.
   Non-admin users always see Staff View (read-only, polished).
   ------------------------------------------------------------------ */
var AppViewMode = 'admin'; // 'admin' or 'staff'

/**
 * Switch between Admin and Staff view modes.
 * @param {'admin'|'staff'} mode
 */
function switchViewMode(mode) {
  AppViewMode = mode;
  var workbench = document.getElementById('workbench');
  var staffView = document.getElementById('staff-view');
  var toggleBtn = document.getElementById('view-mode-toggle');

  if (mode === 'staff') {
    if (workbench) workbench.style.display = 'none';
    if (staffView) staffView.style.display = 'flex';
    if (toggleBtn) {
      toggleBtn.classList.add('active-staff');
      var icon = document.getElementById('view-mode-icon');
      var label = document.getElementById('view-mode-label');
      if (icon) icon.textContent = '⚙️';
      if (label) label.textContent = 'Admin View';
    }
    _initStaffView();
  } else {
    if (workbench) workbench.style.display = 'flex';
    if (staffView) staffView.style.display = 'none';
    if (toggleBtn) {
      toggleBtn.classList.remove('active-staff');
      var icon = document.getElementById('view-mode-icon');
      var label = document.getElementById('view-mode-label');
      if (icon) icon.textContent = '👤';
      if (label) label.textContent = 'Staff View';
    }
  }
}

/**
 * Initialize the view mode toggle button and set initial view based on role.
 * - Admins: show toggle button, default to admin view
 * - Non-admins: hide toggle, always show staff view
 */
function _initViewModeToggle() {
  var toggleBtn = document.getElementById('view-mode-toggle');

  if (AppUserRole === 'admin') {
    // Show the toggle button for admins
    if (toggleBtn) {
      toggleBtn.style.display = 'flex';
      toggleBtn.addEventListener('click', function () {
        switchViewMode(AppViewMode === 'admin' ? 'staff' : 'admin');
      });
    }
    // Admins start in admin view (default)
    switchViewMode('admin');
  } else {
    // Non-admin users always see staff view
    if (toggleBtn) toggleBtn.style.display = 'none';
    // Hide backup/restore buttons for non-admins
    var backupBtn = document.getElementById('backup-btn');
    var restoreBtn = document.getElementById('restore-btn');
    if (backupBtn) backupBtn.style.display = 'none';
    if (restoreBtn) restoreBtn.style.display = 'none';
    switchViewMode('staff');
  }
}

/** Initialize the staff view: populate selectors, stats, legend, wire events */
var _staffViewInitialized = false;
function _initStaffView() {
  _renderStaffStats();
  _renderStaffVacantUnits();
  _renderStaffMap();

  if (_staffViewInitialized) return;
  _staffViewInitialized = true;

  // Wire building/floor selectors
  var bldgSel = document.getElementById('sv-view-building-selector');
  var floorSel = document.getElementById('sv-view-floor-selector');

  if (bldgSel) {
    // Populate buildings
    var buildings = getRegisteredBuildings();
    bldgSel.innerHTML = '';
    buildings.forEach(function (b) {
      var opt = document.createElement('option');
      opt.value = b;
      opt.textContent = b.replace(/-/g, ' ');
      bldgSel.appendChild(opt);
    });
    if (AppState.selectedBuilding) bldgSel.value = AppState.selectedBuilding;

    bldgSel.addEventListener('change', function () {
      AppState.selectedBuilding = bldgSel.value;
      _populateStaffFloorSelector();
      var floors = getFloorsForBuilding(AppState.selectedBuilding);
      if (floors.length > 0) {
        AppState.selectedFloor = floors[0];
        if (floorSel) floorSel.value = floors[0];
      }
      _renderStaffMap();
    });
  }

  if (floorSel) {
    _populateStaffFloorSelector();
    if (AppState.selectedFloor != null) floorSel.value = AppState.selectedFloor;

    floorSel.addEventListener('change', function () {
      AppState.selectedFloor = isNaN(floorSel.value) ? floorSel.value : Number(floorSel.value);
      _renderStaffMap();
    });
  }

  // Wire display toggles
  var toggleNames = document.getElementById('sv-toggle-names');
  var toggleScholar = document.getElementById('sv-toggle-scholarship');
  if (toggleNames) {
    toggleNames.checked = AppState.showNames;
    toggleNames.addEventListener('change', function () {
      AppState.showNames = toggleNames.checked;
      _renderStaffMap();
    });
  }
  if (toggleScholar) {
    toggleScholar.checked = AppState.scholarshipOnly;
    toggleScholar.addEventListener('change', function () {
      AppState.scholarshipOnly = toggleScholar.checked;
      _renderStaffMap();
    });
  }

  // Wire search
  _initStaffSearch();

  // Wire card close button
  var closeBtn = document.getElementById('sv-card-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', function () {
      document.getElementById('sv-resident-card').style.display = 'none';
      document.getElementById('sv-resident-placeholder').style.display = 'block';
    });
  }
}

function _populateStaffFloorSelector() {
  var floorSel = document.getElementById('sv-view-floor-selector');
  if (!floorSel) return;
  var floors = getFloorsForBuilding(AppState.selectedBuilding);
  floorSel.innerHTML = '';
  floors.forEach(function (f) {
    var opt = document.createElement('option');
    opt.value = f;
    opt.textContent = isNaN(f) ? f : 'Floor ' + f;
    floorSel.appendChild(opt);
  });
}

/** Render occupancy stats in the staff view header */
function _renderStaffStats() {
  var row = document.getElementById('sv-stats-row');
  if (!row) return;

  var inventory = AppState.inventory || [];
  var residents = AppState.residents || new Map();
  var totalUnits = inventory.length;
  var occupied = 0;
  var vacant = 0;
  var scholarshipCount = 0;

  inventory.forEach(function (unit) {
    var key = (unit.unitNumber || '').toUpperCase();
    var r = residents.get(key);
    if (r) {
      occupied++;
      if (r.Scholarship && r.Scholarship !== 'NONE' && r.Scholarship !== '') {
        scholarshipCount++;
      }
    } else {
      vacant++;
    }
  });

  var pct = totalUnits > 0 ? Math.round((occupied / totalUnits) * 100) : 0;

  row.innerHTML =
    '<div class="sv-stat-card">' +
      '<div class="sv-stat-value">' + totalUnits + '</div>' +
      '<div class="sv-stat-label">Total Units</div>' +
    '</div>' +
    '<div class="sv-stat-card sv-stat-success">' +
      '<div class="sv-stat-value">' + occupied + '</div>' +
      '<div class="sv-stat-label">Occupied</div>' +
    '</div>' +
    '<div class="sv-stat-card sv-stat-warning">' +
      '<div class="sv-stat-value">' + vacant + '</div>' +
      '<div class="sv-stat-label">Vacant</div>' +
    '</div>' +
    '<div class="sv-stat-card sv-stat-accent">' +
      '<div class="sv-stat-value">' + pct + '%</div>' +
      '<div class="sv-stat-label">Occupancy</div>' +
    '</div>' +
    '<div class="sv-stat-card">' +
      '<div class="sv-stat-value">' + scholarshipCount + '</div>' +
      '<div class="sv-stat-label">Scholarships</div>' +
    '</div>';
}

/** Render the vacant units list organized by floorplan */
function _renderStaffVacantUnits() {
  var container = document.getElementById('sv-vacant-list');
  if (!container) return;

  var inventory = AppState.inventory || [];
  var residents = AppState.residents || new Map();

  if (inventory.length === 0) {
    container.innerHTML = '<p class="sv-vacant-none">No inventory loaded</p>';
    return;
  }

  // Build list of vacant units grouped by floorplan
  var groups = {}; // floorplan -> [{unitNumber, building, floor}]

  inventory.forEach(function (unit) {
    var key = (unit.unitNumber || '').toUpperCase();
    if (!key) return;
    if (residents.has(key)) return; // occupied

    // Also skip scholarship-reserved units
    if (AppState.scholarshipReservedUnits && AppState.scholarshipReservedUnits.has(key)) return;

    var fp = unit.unitType || 'Unknown';
    if (!groups[fp]) groups[fp] = [];

    var parsed = parseUnitId(unit.unitNumber);
    groups[fp].push({
      unitNumber: unit.unitNumber,
      building: parsed.ambiguous ? null : parsed.building,
      floor: parsed.ambiguous ? null : parsed.floor,
    });
  });

  var fpNames = Object.keys(groups).sort();

  if (fpNames.length === 0) {
    container.innerHTML = '<p class="sv-vacant-none">No vacant units — all units are occupied!</p>';
    return;
  }

  var totalVacant = 0;
  fpNames.forEach(function (fp) { totalVacant += groups[fp].length; });

  var html = '';
  fpNames.forEach(function (fp) {
    var units = groups[fp];
    // Sort units naturally
    units.sort(function (a, b) {
      return (a.unitNumber || '').localeCompare(b.unitNumber || '', undefined, { numeric: true });
    });

    html += '<div class="sv-vacant-group">' +
      '<div class="sv-vacant-group-header" data-fp="' + _escHtml(fp) + '">' +
        '<span class="sv-vacant-fp-name">' + _escHtml(fp) + '</span>' +
        '<span class="sv-vacant-count">' + units.length + '</span>' +
      '</div>' +
      '<div class="sv-vacant-units">';

    units.forEach(function (u) {
      html += '<span class="sv-vacant-unit-chip" ' +
        'data-unit="' + _escHtml(u.unitNumber) + '" ' +
        (u.building ? 'data-building="' + _escHtml(u.building) + '" ' : '') +
        (u.floor != null ? 'data-floor="' + u.floor + '" ' : '') +
        'title="Click to view on map">' +
        _escHtml(u.unitNumber) +
      '</span>';
    });

    html += '</div></div>';
  });

  container.innerHTML = html;

  // Wire click on unit chips to navigate the map
  container.querySelectorAll('.sv-vacant-unit-chip').forEach(function (chip) {
    chip.addEventListener('click', function () {
      var unit = chip.getAttribute('data-unit');
      var building = chip.getAttribute('data-building');
      var floor = chip.getAttribute('data-floor');

      if (building && floor != null) {
        _staffLocateUnit({
          unit: unit,
          building: building,
          floor: isNaN(floor) ? floor : Number(floor),
          name: 'Vacant Unit',
          source: 'vacant',
        });
      }
    });
  });

  // Wire floorplan group headers to toggle collapse
  container.querySelectorAll('.sv-vacant-group-header').forEach(function (header) {
    header.addEventListener('click', function () {
      var unitsDiv = header.nextElementSibling;
      if (unitsDiv) {
        unitsDiv.style.display = unitsDiv.style.display === 'none' ? 'flex' : 'none';
      }
    });
  });
}

/** Load and render the map in the staff view using the same
 *  loadMapFromRegistry / renderMapIntoContainer pipeline as the admin view. */
async function _renderStaffMap() {
  var container = document.getElementById('sv-map-viewer');
  if (!container) return;

  if (!AppState.selectedBuilding || AppState.selectedFloor == null) {
    container.innerHTML = '<p class="placeholder-text">Select a building and floor to view the map</p>';
    return;
  }

  var key = mapCacheKey(AppState.selectedBuilding, AppState.selectedFloor);

  // Load into cache if not already loaded
  if (!AppState.mapCache.has(key)) {
    var entry = getRegistryEntry(AppState.selectedBuilding, AppState.selectedFloor);
    if (!entry) {
      container.innerHTML = '<p class="placeholder-text">No map registered for this floor</p>';
      return;
    }
    container.innerHTML = '<p class="placeholder-text">Loading map...</p>';
    var result = await loadMapFromRegistry(AppState.selectedBuilding, AppState.selectedFloor);
    if (!result) {
      container.innerHTML = '<p class="placeholder-text">Failed to load map</p>';
      return;
    }
    AppState.mapCache.set(key, result);
  }

  var mapData = AppState.mapCache.get(key);
  if (!mapData || !mapData.svgElement) {
    container.innerHTML = '<p class="placeholder-text">Map not available</p>';
    return;
  }

  // Render using the shared renderMapIntoContainer function
  var residents = AppState.residents || new Map();
  renderMapIntoContainer(container, mapData.svgElement, residents, {
    showNames: AppState.showNames,
    scholarshipOnly: AppState.scholarshipOnly,
    inventory: AppState.inventory,
    onUnitClick: function (unitKey) {
      // Show unit detail in the staff card when clicking a map unit
      var r = residents.get(unitKey.toUpperCase());
      if (r) {
        var parsed = parseUnitId(r.Unit_Assigned);
        _showStaffResidentCard({
          name: r.Resident_Name,
          unit: r.Unit_Assigned || '',
          building: parsed.ambiguous ? null : parsed.building,
          floor: parsed.ambiguous ? null : parsed.floor,
          floorplan: getResidentFloorplanType(r, AppState.inventory) || '',
          source: 'placed',
          scholarship: r.Scholarship || '',
        });
      }
    },
  });
}

/** Initialize the staff view search functionality */
function _initStaffSearch() {
  var input = document.getElementById('sv-lookup-input');
  var dropdown = document.getElementById('sv-lookup-results');
  if (!input || !dropdown) return;

  var debounceTimer = null;

  input.addEventListener('input', function () {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function () {
      var query = input.value.trim();
      if (query.length < 2) {
        dropdown.classList.remove('visible');
        dropdown.innerHTML = '';
        return;
      }

      var results = searchResidents(AppState.residents, AppState.waitingBank, query, AppState.inventory);
      if (results.length === 0) {
        dropdown.innerHTML = '<div style="padding:12px 16px;color:var(--text-muted);font-size:0.85rem">No results found</div>';
        dropdown.classList.add('visible');
        return;
      }

      var html = '';
      results.forEach(function (r, idx) {
        var initials = _getInitials(r.name);
        var avatarClass = r.source === 'bank' ? 'sv-result-avatar bank' : 'sv-result-avatar';
        var badgeClass = r.source === 'bank' ? 'sv-result-badge bank' : 'sv-result-badge placed';
        var badgeText = r.source === 'bank' ? 'Bank' : 'Placed';
        var meta = r.unit ? 'Unit ' + r.unit : (r.floorplan || 'Unassigned');

        html += '<div class="sv-search-result-item" data-idx="' + idx + '">' +
          '<div class="' + avatarClass + '">' + initials + '</div>' +
          '<div class="sv-result-info">' +
            '<div class="sv-result-name">' + _escHtml(r.name) + '</div>' +
            '<div class="sv-result-meta">' + _escHtml(meta) + (r.floorplan ? ' · ' + _escHtml(r.floorplan) : '') + '</div>' +
          '</div>' +
          '<span class="' + badgeClass + '">' + badgeText + '</span>' +
        '</div>';
      });

      dropdown.innerHTML = html;
      dropdown.classList.add('visible');

      // Wire click on results
      dropdown.querySelectorAll('.sv-search-result-item').forEach(function (item) {
        item.addEventListener('click', function () {
          var idx = parseInt(item.getAttribute('data-idx'), 10);
          var selected = results[idx];
          if (selected) _showStaffResidentCard(selected);
          dropdown.classList.remove('visible');
          input.value = selected.name;
        });
      });
    }, 200);
  });

  // Close dropdown on click outside
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.sv-search-box')) {
      dropdown.classList.remove('visible');
    }
  });

  // Close dropdown on Escape
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      dropdown.classList.remove('visible');
    }
  });
}

/** Show the resident detail card in staff view */
function _showStaffResidentCard(result) {
  var card = document.getElementById('sv-resident-card');
  var placeholder = document.getElementById('sv-resident-placeholder');
  if (!card) return;

  card.style.display = 'block';
  if (placeholder) placeholder.style.display = 'none';

  var initials = _getInitials(result.name);
  document.getElementById('sv-card-avatar').textContent = initials;
  document.getElementById('sv-card-name').textContent = result.name || '—';
  document.getElementById('sv-card-subtitle').textContent = result.source === 'bank' ? 'Waiting Bank' : 'Placed Resident';

  document.getElementById('sv-card-unit').textContent = result.unit || '—';
  document.getElementById('sv-card-building').textContent = result.building ? result.building.replace(/-/g, ' ') : '—';
  document.getElementById('sv-card-floor').textContent = result.floor != null ? result.floor : '—';
  document.getElementById('sv-card-floorplan').textContent = result.floorplan || '—';

  // Get full resident data for extra fields
  var fullResident = null;
  if (result.unit && AppState.residents) {
    fullResident = AppState.residents.get(result.unit.toUpperCase());
  }

  document.getElementById('sv-card-lease').textContent = (fullResident && fullResident.Lease_Status) || '—';
  document.getElementById('sv-card-scholarship').textContent = (result.scholarship && result.scholarship !== 'NONE') ? result.scholarship : '—';
  document.getElementById('sv-card-status').textContent = result.source === 'bank' ? 'In Waiting Bank' : 'Assigned to Unit';

  // Wire "Show on Map" button
  var locateBtn = document.getElementById('sv-card-locate-btn');
  if (locateBtn) {
    // Remove old listeners by cloning
    var newBtn = locateBtn.cloneNode(true);
    locateBtn.parentNode.replaceChild(newBtn, locateBtn);

    if (result.building && result.floor != null) {
      newBtn.disabled = false;
      newBtn.textContent = 'Show on Map';
      newBtn.addEventListener('click', function () {
        _staffLocateUnit(result);
      });
    } else {
      newBtn.disabled = true;
      newBtn.textContent = result.source === 'bank' ? 'Not Yet Placed' : 'Location Unknown';
    }
  }
}

/** Navigate the staff view map to highlight a resident's unit */
async function _staffLocateUnit(result) {
  if (!result.building || result.floor == null) return;

  // Switch building/floor selectors
  var bldgSel = document.getElementById('sv-view-building-selector');
  var floorSel = document.getElementById('sv-view-floor-selector');

  AppState.selectedBuilding = result.building;
  AppState.selectedFloor = result.floor;

  if (bldgSel) bldgSel.value = result.building;
  _populateStaffFloorSelector();
  if (floorSel) floorSel.value = result.floor;

  await _renderStaffMap();

  // Highlight the unit on the map
  if (result.unit) {
    var container = document.getElementById('sv-map-viewer');
    if (container) {
      var svg = container.querySelector('svg');
      if (svg) {
        // Remove any existing highlights
        svg.querySelectorAll('.sv-unit-highlight').forEach(function (el) {
          el.classList.remove('sv-unit-highlight');
        });

        // Find the unit element — renderMapIntoContainer sets data-unit on elements
        var unitKey = result.unit.toUpperCase();
        var unitEl = svg.querySelector('[data-unit="' + result.unit + '"]') ||
                     svg.querySelector('[data-unit="' + unitKey + '"]') ||
                     svg.querySelector('[id="' + unitKey + '"]') ||
                     svg.querySelector('[id="' + result.unit + '"]');
        if (unitEl) {
          unitEl.classList.add('sv-unit-highlight');
          // Scroll the map container so the unit is visible
          try { unitEl.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' }); } catch(e) {}
        }
      }
    }
  }
}

/** Get initials from a name string */
function _getInitials(name) {
  if (!name) return '?';
  var parts = name.trim().split(/[\s,]+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  // Handle "LAST, FIRST" format
  if (name.indexOf(',') !== -1) {
    return (parts[1].charAt(0) + parts[0].charAt(0)).toUpperCase();
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/** Escape HTML entities */
function _escHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ------------------------------------------------------------------
   INITIALIZATION
   ------------------------------------------------------------------ */
document.addEventListener('DOMContentLoaded', async function () {
  // Check authentication first
  var authOk = await initAuth();
  if (!authOk) return;

  loadPersistedColors();

  populateBuildingSelector();

  var restored = await loadPersistedProject();

  // Render sync status after initial load
  _renderSyncBanner();
  _renderSyncStatus();

  if (restored) {
    // Restore toggle states
    var toggleNames = document.getElementById('toggle-names');
    if (toggleNames) toggleNames.checked = AppState.showNames;
    var toggleScholarship = document.getElementById('toggle-scholarship');
    if (toggleScholarship) toggleScholarship.checked = AppState.scholarshipOnly;

    if (AppState.selectedBuilding) {
      setBuildingSelectorValue(AppState.selectedBuilding);
      populateFloorSelectorDropdown(AppState.selectedBuilding);
      if (AppState.selectedFloor != null) {
        setFloorSelectorValue(AppState.selectedFloor);
      }
    }
  } else {
    var buildings = getRegisteredBuildings();
    if (buildings.length > 0) {
      AppState.selectedBuilding = buildings[0];
      setBuildingSelectorValue(AppState.selectedBuilding);
      populateFloorSelectorDropdown(AppState.selectedBuilding);
      var floors = getFloorsForBuilding(AppState.selectedBuilding);
      if (floors.length > 0) {
        AppState.selectedFloor = floors[0];
        setFloorSelectorValue(AppState.selectedFloor);
      }
    }
  }

  // Wire up all event listeners
  initEventListeners();

  // Render legend
  renderLegend();

  // Initial debug count
  updateDebugCount();

  // Load and render the initial map
  await loadAndRenderCurrentMap();

  // Refresh all stats, lists, and views
  refreshAllStats();
  refreshMasterList();
  refreshBank();
  refreshUnassignedScholarships();
  refreshScholarshipRecap();

  // Populate floorplan filter and refresh prelease progress
  populateFloorplanFilter(AppState.inventory);
  refreshPreleaseProgress();

  // Update import card data counts
  renderImportCards(AppState);

  // Render all panels (workbench shows everything at once)
  renderDebugPanel(AppState);
  renderBackupRestore(AppState);

  // Refresh summary panel (prelease + scholarship)
  refreshSummaryPanel();

  // Refresh leapfrog checker
  refreshLeapfrogChecker();

  // Refresh reserved units
  refreshReservedUnits();

  // Apply role-based restrictions and set view mode
  applyRoleRestrictions();
  _initViewModeToggle();

  // Start background sync to detect changes from other users
  _startBackgroundSync();
});

/* ------------------------------------------------------------------
   EVENT LISTENER WIRING
   ------------------------------------------------------------------ */

function initEventListeners() {
  initCollapsibleSections();
  initGlobalSearch();
  initMapViewerEvents();
  initImportDataEvents();
  initImportSidebarButtons();
  initPreleaseDetailButton();
  initBackupRestoreEvents();
  initModalEvents();
  initDebugViewEvents();
  initReservedUnitsEvents();
  initSummaryToggle();
}

/* ------------------------------------------------------------------
   SUMMARY TOGGLE (Prelease / Scholarship)
   Wires the toggle buttons in #summary-toggle-bar.
   ------------------------------------------------------------------ */
function initSummaryToggle() {
  var buttons = document.querySelectorAll('#summary-toggle-bar .summary-toggle-btn');
  if (!buttons || buttons.length === 0) return;

  for (var i = 0; i < buttons.length; i++) {
    (function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation(); // prevent collapsible section from toggling

        var view = btn.getAttribute('data-view');
        if (!view) return;

        // Update active button
        for (var j = 0; j < buttons.length; j++) {
          buttons[j].classList.remove('active');
        }
        btn.classList.add('active');

        // Show/hide views
        var preView = document.getElementById('summary-view-prelease');
        var schView = document.getElementById('summary-view-scholarship');
        if (preView) preView.style.display = view === 'prelease' ? '' : 'none';
        if (schView) schView.style.display = view === 'scholarship' ? '' : 'none';
      });
    })(buttons[i]);
  }
}

/* ------------------------------------------------------------------
   1. COLLAPSIBLE SECTIONS
   ------------------------------------------------------------------ */

function initCollapsibleSections() {
  document.querySelectorAll('.collapsible .section-header').forEach(function (header) {
    header.addEventListener('click', function () {
      var section = header.closest('.collapsible');
      if (!section) return;
      var isCollapsed = section.dataset.collapsed === 'true';
      section.dataset.collapsed = isCollapsed ? 'false' : 'true';
    });
  });
}

/* ------------------------------------------------------------------
   1b. IMPORT SIDEBAR BUTTONS (open modal for each import type)
   ------------------------------------------------------------------ */

function initImportSidebarButtons() {
  var importSection = document.getElementById('import-section');
  if (!importSection) return;

  importSection.addEventListener('click', function (e) {
    var uploadBtn = e.target.closest('.import-upload-btn');
    if (!uploadBtn) return;

    var row = uploadBtn.closest('.import-row');
    if (!row) return;

    var importType = row.dataset.importType;
    openImportModal(importType);
  });
}

function openImportModal(importType) {
  // Find the hidden import card for this type
  var card = document.querySelector('#import-cards-grid .import-card[data-import-type="' + importType + '"]');
  if (!card) return;

  // Get the import type config
  var typeConfig = (typeof IMPORT_TYPES !== 'undefined') ? null : null;
  for (var i = 0; i < IMPORT_TYPES.length; i++) {
    if (IMPORT_TYPES[i].id === importType) {
      typeConfig = IMPORT_TYPES[i];
      break;
    }
  }
  var title = typeConfig ? typeConfig.label : importType;

  // Build modal body from the hidden card's content
  var cardClone = card.cloneNode(true);
  cardClone.style.display = 'block';

  // Create modal body HTML
  var bodyHtml = cardClone.outerHTML;

  showModal('Import: ' + title, bodyHtml, '');

  // Wire up the cloned card's buttons inside the modal
  var modalBody = document.getElementById('modal-body');

  // Upload button
  var modalUploadBtn = modalBody.querySelector('.import-upload-btn');
  var modalFileInput = modalBody.querySelector('.import-file-input');
  if (modalUploadBtn && modalFileInput) {
    modalUploadBtn.addEventListener('click', function () { modalFileInput.click(); });
    modalFileInput.addEventListener('change', function (e) {
      handleImportFile(importType, e.target.files[0]);
      hideModal();
    });
  }

  // Template button
  var modalTemplateBtn = modalBody.querySelector('.import-template-btn');
  if (modalTemplateBtn) {
    modalTemplateBtn.addEventListener('click', function () {
      if (typeof generateTemplateDownload === 'function') {
        generateTemplateDownload(importType);
      }
    });
  }

  // Clear button
  var modalClearBtn = modalBody.querySelector('.import-clear-btn');
  if (modalClearBtn) {
    modalClearBtn.addEventListener('click', function () {
      handleImportClear(importType);
    });
  }
}

/* ------------------------------------------------------------------
   1c. PRELEASE DETAIL BUTTON & MODAL
   ------------------------------------------------------------------ */

function initPreleaseDetailButton() {
  // Wire the "View Details" button in the prelease summary sidebar section
  var detailsBtn = document.getElementById('prelease-details-btn');
  if (detailsBtn) {
    detailsBtn.addEventListener('click', function () {
      openPreleaseDetailModal();
    });
  }

  // Also use event delegation for dynamically created buttons
  var preContent = document.getElementById('prelease-summary-content');
  if (preContent) {
    preContent.addEventListener('click', function (e) {
      if (e.target.id === 'prelease-detail-btn' || e.target.closest('#prelease-detail-btn')) {
        openPreleaseDetailModal();
      }
    });
  }
}

function openPreleaseDetailModal() {
  var container = document.getElementById('prelease-progress-container');
  if (!container) return;

  // Clone the hidden prelease content into a modal
  var content = container.innerHTML;
  showModal('Prelease Progress Report', '<div id="prelease-modal-content">' + content + '</div>', '');

  // Re-render the prelease data into the modal's cloned elements
  refreshPreleaseProgress();

  // Wire scope selectors in modal
  var modalBody = document.getElementById('modal-body');
  if (modalBody) {
    var scopeSelector = modalBody.querySelector('#prelease-scope-selector');
    var buildingSelector = modalBody.querySelector('#prelease-building-selector');
    var floorSelector = modalBody.querySelector('#prelease-floor-selector');

    // Populate building dropdown in modal
    if (buildingSelector) {
      buildingSelector.innerHTML = '';
      var defaultOpt = document.createElement('option');
      defaultOpt.value = '';
      defaultOpt.textContent = '-- Select --';
      buildingSelector.appendChild(defaultOpt);
      var buildings = getRegisteredBuildings();
      for (var i = 0; i < buildings.length; i++) {
        var opt = document.createElement('option');
        opt.value = buildings[i];
        opt.textContent = getBuildingLabel(buildings[i]);
        buildingSelector.appendChild(opt);
      }
    }

    if (scopeSelector) {
      scopeSelector.addEventListener('change', function () {
        AppState.preleaseScope.type = scopeSelector.value;
        // Show/hide building/floor selectors based on scope
        if (buildingSelector) {
          var bgParent = buildingSelector.closest('.control-group');
          if (bgParent) bgParent.style.display = (scopeSelector.value === 'building' || scopeSelector.value === 'floor') ? '' : 'none';
        }
        if (floorSelector) {
          var fgParent = floorSelector.closest('.control-group');
          if (fgParent) fgParent.style.display = (scopeSelector.value === 'floor') ? '' : 'none';
        }
        refreshPreleaseProgress();
      });
    }

    if (buildingSelector) {
      buildingSelector.addEventListener('change', function () {
        AppState.preleaseScope.building = buildingSelector.value || null;

        // Populate floor dropdown for selected building
        if (floorSelector && AppState.preleaseScope.building) {
          floorSelector.innerHTML = '';
          var defaultOpt = document.createElement('option');
          defaultOpt.value = '';
          defaultOpt.textContent = '-- Select --';
          floorSelector.appendChild(defaultOpt);
          var floors = getFloorsForBuilding(AppState.preleaseScope.building);
          for (var i = 0; i < floors.length; i++) {
            var opt = document.createElement('option');
            opt.value = floors[i];
            opt.textContent = getFloorLabel(floors[i]);
            floorSelector.appendChild(opt);
          }
        }

        refreshPreleaseProgress();
      });
    }

    if (floorSelector) {
      floorSelector.addEventListener('change', function () {
        var val = parseInt(floorSelector.value, 10);
        AppState.preleaseScope.floor = isNaN(val) ? null : val;
        refreshPreleaseProgress();
      });
    }

    updatePreleaseDropdownVisibility();
  }
}

/* ------------------------------------------------------------------
   2. GLOBAL SEARCH (with debounce)
   ------------------------------------------------------------------ */

function initGlobalSearch() {
  var searchInput = document.getElementById('search-input');
  if (!searchInput) return;

  var debouncedSearch = debounce(function () {
    var query = searchInput.value;
    if (!query || !query.trim()) {
      clearSearchResults();
      return;
    }

    // Use the enhanced search that covers both placed + bank
    var results = searchResidents(
      AppState.residents,
      AppState.waitingBank,
      query,
      AppState.inventory
    );

    if (results.length === 0) {
      // Fall back to old inventory-based search for available units
      var oldResults = searchAllUnits(query, AppState.inventory, AppState.residents);
      renderSearchResults(oldResults, handleSearchResultClick);
    } else {
      renderSearchResults(results, handleEnhancedSearchResultClick);
    }
  }, 300);

  searchInput.addEventListener('input', debouncedSearch);

  // Close on Escape
  searchInput.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      searchInput.value = '';
      clearSearchResults();
      searchInput.blur();
    }
  });

  // Close on click outside
  document.addEventListener('click', function (e) {
    var searchContainer = document.getElementById('global-search');
    if (searchContainer && !searchContainer.contains(e.target)) {
      clearSearchResults();
    }
  });
}

/**
 * Handle click on enhanced search result (from searchResidents).
 * Navigates to map viewer, switches building/floor, highlights unit.
 */
function handleEnhancedSearchResultClick(result) {
  if (result.source === 'placed' && result.unit) {
    navigateToUnit(result.unit, function () {
      highlightUnit(result.unit);
      selectUnit(result.unit);
      var resident = AppState.residents ? AppState.residents.get(result.unit.toUpperCase()) : null;
      showDetailPanel(resident, result.unit);
      highlightMasterListRow(result.unit.toUpperCase());
    });
  } else if (result.source === 'bank') {
    // Bank residents have no unit - show notification
    showNotification('"' + result.name + '" is in the waiting bank (no unit assigned).', 'info');
  }

  var searchInput = document.getElementById('search-input');
  if (searchInput) searchInput.value = '';
  clearSearchResults();
}

/* ------------------------------------------------------------------
   3. MAP VIEWER EVENTS
   ------------------------------------------------------------------ */

function initMapViewerEvents() {
  // Building selector
  var buildingSelector = document.getElementById('building-selector');
  if (buildingSelector) {
    buildingSelector.addEventListener('change', async function (e) {
      AppState.selectedBuilding = e.target.value || null;
      populateFloorSelectorDropdown(AppState.selectedBuilding);
      var floors = AppState.selectedBuilding ? getFloorsForBuilding(AppState.selectedBuilding) : [];
      AppState.selectedFloor = floors.length > 0 ? floors[0] : null;
      if (AppState.selectedFloor != null) {
        setFloorSelectorValue(AppState.selectedFloor);
      }
      persistProject();
      await loadAndRenderCurrentMap();
      refreshAllStats();
    });
  }

  // Floor selector
  var floorSelector = document.getElementById('floor-selector');
  if (floorSelector) {
    floorSelector.addEventListener('change', async function (e) {
      AppState.selectedFloor = parseInt(e.target.value, 10);
      if (isNaN(AppState.selectedFloor)) AppState.selectedFloor = null;
      persistProject();
      await loadAndRenderCurrentMap();
      refreshAllStats();
    });
  }

  // Toggle: Show Names
  var toggleNames = document.getElementById('toggle-names');
  if (toggleNames) {
    toggleNames.addEventListener('change', function () {
      AppState.showNames = toggleNames.checked;
      persistProject();
      renderCurrentMap();
    });
  }

  // Toggle: Scholarship Only
  var toggleScholarship = document.getElementById('toggle-scholarship');
  if (toggleScholarship) {
    toggleScholarship.addEventListener('change', function () {
      AppState.scholarshipOnly = toggleScholarship.checked;
      persistProject();
      renderCurrentMap();
    });
  }

  // Toggle: Unit Numbers
  var toggleUnitNumber = document.getElementById('toggle-unit-number');
  if (toggleUnitNumber) {
    toggleUnitNumber.addEventListener('change', function () {
      var container = document.getElementById('map-container');
      if (!container) return;
      var svg = container.querySelector('svg');
      if (!svg) return;
      var units = svg.querySelectorAll('[data-unit]');
      units.forEach(function (el) {
        var titleEl = el.querySelector('title');
        if (toggleUnitNumber.checked) {
          el.style.opacity = '';
        } else {
          // Unit numbers are shown via SVG text or IDs; toggle visibility
          el.style.opacity = '';
        }
      });
    });
  }

  // Add Resident button
  var addResidentBtn = document.getElementById('add-resident-btn');
  if (addResidentBtn) {
    addResidentBtn.addEventListener('click', function () {
      openResidentModal(null, {
        onSave: handleResidentSave,
        inventory: AppState.inventory,
        residents: AppState.residents,
        reservedUnitsMap: AppState.scholarshipReservedUnits,
      });
    });
  }

  // Toggle Master List — opens the split-view modal
  var toggleMasterBtn = document.getElementById('toggle-master-list-btn');
  if (toggleMasterBtn) {
    toggleMasterBtn.addEventListener('click', function () {
      openSplitViewModal();
    });
  }

  // Split-View close button
  var svCloseBtn = document.getElementById('sv-close-btn');
  if (svCloseBtn) {
    svCloseBtn.addEventListener('click', closeSplitViewModal);
  }

  // Split-View overlay: only close via the Close button (no click-outside)

  // Split-View export button
  var svExportBtn = document.getElementById('sv-export-btn');
  if (svExportBtn) {
    svExportBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      exportMasterListToExcel();
    });
  }

  // Split-View import button
  var svImportBtn = document.getElementById('sv-import-btn');
  var svImportFile = document.getElementById('sv-import-file');
  if (svImportBtn && svImportFile) {
    svImportBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      svImportFile.click();
    });
    svImportFile.addEventListener('change', function (e) {
      var file = e.target.files[0];
      if (!file) return;
      e.target.value = '';
      importResidentMasterListFromXlsx(file);
    });
  }

  // Split-View map selectors
  var svBuildingSel = document.getElementById('sv-building-selector');
  if (svBuildingSel) {
    svBuildingSel.addEventListener('change', function () {
      updateModalFloorSelector();
      var b = svBuildingSel.value;
      var fSel = document.getElementById('sv-floor-selector');
      var f = fSel ? parseInt(fSel.value) : 0;
      loadMapInSplitView(b, f);
    });
  }
  var svFloorSel = document.getElementById('sv-floor-selector');
  if (svFloorSel) {
    svFloorSel.addEventListener('change', function () {
      var bSel = document.getElementById('sv-building-selector');
      var b = bSel ? bSel.value : '';
      loadMapInSplitView(b, parseInt(svFloorSel.value));
    });
  }

  // Swap Unit button
  var swapUnitBtn = document.getElementById('swap-unit-btn');
  if (swapUnitBtn) {
    swapUnitBtn.addEventListener('click', openSwapUnitModal);
  }

  // Swap modal close/cancel
  var swapCloseBtn = document.getElementById('swap-close-btn');
  if (swapCloseBtn) swapCloseBtn.addEventListener('click', closeSwapUnitModal);
  var swapCancelBtn = document.getElementById('swap-cancel-btn');
  if (swapCancelBtn) swapCancelBtn.addEventListener('click', closeSwapUnitModal);
  // Swap overlay: only close via Cancel/Close buttons (no click-outside)

  // Swap search inputs
  var swapSearchA = document.getElementById('swap-search-a');
  if (swapSearchA) {
    swapSearchA.addEventListener('input', function () {
      renderSwapSearchResults(this.value, document.getElementById('swap-results-a'), 'a');
    });
  }
  var swapSearchB = document.getElementById('swap-search-b');
  if (swapSearchB) {
    swapSearchB.addEventListener('input', function () {
      renderSwapSearchResults(this.value, document.getElementById('swap-results-b'), 'b');
    });
  }

  // Swap confirm
  var swapConfirmBtn = document.getElementById('swap-confirm-btn');
  if (swapConfirmBtn) {
    swapConfirmBtn.addEventListener('click', function () {
      if (!_swapState.a || !_swapState.b) return;

      var resA = _swapState.a.resident;
      var resB = _swapState.b.resident;
      var unitA = resA.Unit_Assigned;
      var unitB = resB.Unit_Assigned;

      // Remove both from map
      AppState.residents.delete(unitA.toUpperCase());
      AppState.residents.delete(unitB.toUpperCase());

      // Swap assignments
      resA.Unit_Assigned = unitB;
      resB.Unit_Assigned = unitA;

      // Re-insert under swapped keys
      AppState.residents.set(unitB.toUpperCase(), resA);
      AppState.residents.set(unitA.toUpperCase(), resB);

      persistResidents();
      renderCurrentMap();
      refreshAllStats();
      refreshMasterList();
      refreshSplitViewMasterList();

      closeSwapUnitModal();
      showNotification('Swapped ' + resA.Resident_Name + ' (' + unitB + ') and ' + resB.Resident_Name + ' (' + unitA + ')', 'success');
    });
  }

  // Print Map button
  var printMapBtn = document.getElementById('print-map-btn');
  if (printMapBtn) {
    printMapBtn.addEventListener('click', printMap);
  }

  // Export Map button
  var exportMapBtn = document.getElementById('export-map-btn');
  if (exportMapBtn) {
    exportMapBtn.addEventListener('click', exportMapAsSVG);
  }

  // Master list search and filter controls are wired dynamically via
  // event delegation. Uses class-based selectors to support both the
  // hidden #resident-master-list and the split-view #sv-master-list.
  _wireMasterListDelegation(document.getElementById('resident-master-list'), refreshMasterList);
  _wireMasterListDelegation(document.getElementById('sv-master-list'), refreshSplitViewMasterList);

  // Bank search (event delegation - bank is rendered dynamically)
  var bankSection = document.getElementById('bank-section');
  if (bankSection) {
    bankSection.addEventListener('input', function (e) {
      if (e.target.id === 'bank-search-input') {
        refreshBank();
      }
    });
  }
}

/* ------------------------------------------------------------------
   4. IMPORT DATA EVENTS
   ------------------------------------------------------------------ */

function initImportDataEvents() {
  var cardsGrid = document.getElementById('import-cards-grid');
  if (!cardsGrid) return;

  // Event delegation for all import cards
  cardsGrid.addEventListener('click', function (e) {
    var card = e.target.closest('.import-card');
    if (!card) return;
    var importType = card.getAttribute('data-import-type');
    if (!importType) return;

    // Upload button
    if (e.target.closest('.import-upload-btn')) {
      var fileInput = card.querySelector('.import-file-input');
      if (fileInput) fileInput.click();
      return;
    }

    // Template download button
    if (e.target.closest('.import-template-btn')) {
      generateTemplateDownload(importType);
      return;
    }

    // Clear button
    if (e.target.closest('.import-clear-btn')) {
      handleImportClear(importType);
      return;
    }
  });

  // File input change events (delegation)
  cardsGrid.addEventListener('change', function (e) {
    if (!e.target.classList.contains('import-file-input')) return;
    var card = e.target.closest('.import-card');
    if (!card) return;
    var importType = card.getAttribute('data-import-type');
    if (!importType) return;

    var file = e.target.files[0];
    if (!file) return;
    e.target.value = '';

    handleImportFile(importType, file);
  });


}

/**
 * Route an uploaded file to the appropriate parser based on import type.
 */
async function handleImportFile(importType, file) {
  try {
    switch (importType) {
      case 'inventory':
        await handleInventoryUpload(file);
        break;
      case 'residents':
        await handleSpreadsheetUpload(file);
        break;
      case 'bank':
        await handleBankUpload(file);
        break;
      case 'scholarships':
        await handleScholarshipUpload(file);
        break;
      case 'entrata':
        await handlePreleaseImport(file);
        break;

    }
  } catch (err) {
    showNotification('Import failed: ' + err.message, 'error');
    addDebugWarnings(['Import error (' + importType + '): ' + err.message], 'error');
  }
}

/**
 * Clear data for a given import type with confirmation.
 */
function handleImportClear(importType) {
  var importDef = null;
  for (var i = 0; i < IMPORT_TYPES.length; i++) {
    if (IMPORT_TYPES[i].id === importType) {
      importDef = IMPORT_TYPES[i];
      break;
    }
  }

  var label = importDef ? importDef.clearLabel : ('Clear ' + importType + ' data');

  showConfirmModal('Clear Data', label + ' -- This cannot be undone. Continue?', function () {
    switch (importType) {
      case 'inventory':
        AppState.inventory = null;
        break;
      case 'residents':
        AppState.residents = null;
        break;
      case 'bank':
        AppState.waitingBank = [];
        break;
      case 'scholarships':
        AppState.unassignedScholarships = [];
        break;
      case 'entrata':
        // Entrata merges into residents/bank; clear both
        AppState.residents = null;
        AppState.waitingBank = [];
        break;

    }

    persistProject();
    renderImportCards(AppState);
    refreshAllAfterImport();
    showNotification('Data cleared successfully.', 'success');
  });
}

/* ------------------------------------------------------------------
   5. SCHOLARSHIP RECAP (replaced former audit view events)
   ------------------------------------------------------------------ */

/* ------------------------------------------------------------------
   6. PRELEASE PROGRESS EVENTS
   ------------------------------------------------------------------ */

/**
 * initPreleaseProgressEvents() -- No-op for workbench layout.
 * Prelease scope selectors are in a hidden container and get cloned
 * into a modal by openPreleaseDetailModal(), which wires events there.
 */
function initPreleaseProgressEvents() {
  // Events are now wired inside openPreleaseDetailModal()
}

function updatePreleaseDropdownVisibility() {
  var scopeType = AppState.preleaseScope.type || 'property';
  var buildingGroup = document.getElementById('prelease-building-selector');
  var floorGroup = document.getElementById('prelease-floor-selector');

  if (buildingGroup) {
    var bgParent = buildingGroup.closest('.control-group');
    if (bgParent) {
      bgParent.style.display = (scopeType === 'building' || scopeType === 'floor') ? '' : 'none';
    }
  }
  if (floorGroup) {
    var fgParent = floorGroup.closest('.control-group');
    if (fgParent) {
      fgParent.style.display = (scopeType === 'floor') ? '' : 'none';
    }
  }
}

/* ------------------------------------------------------------------
   7. BACKUP & RESTORE EVENTS
   ------------------------------------------------------------------ */

function initBackupRestoreEvents() {
  // Header backup button
  var backupBtn = document.getElementById('backup-btn');
  if (backupBtn) {
    backupBtn.addEventListener('click', handleBackup);
  }

  // Header restore button
  var restoreBtn = document.getElementById('restore-btn');
  var restoreFileInputGlobal = document.getElementById('restore-file-input-global');
  if (restoreBtn && restoreFileInputGlobal) {
    restoreBtn.addEventListener('click', function () { restoreFileInputGlobal.click(); });
    restoreFileInputGlobal.addEventListener('change', handleRestore);
  }

  // Backup/Restore view buttons
  var backupDownloadBtn = document.getElementById('backup-download-btn');
  if (backupDownloadBtn) {
    backupDownloadBtn.addEventListener('click', handleBackup);
  }

  var restoreUploadBtn = document.getElementById('restore-upload-btn');
  var restoreFileInput = document.getElementById('restore-file-input');
  if (restoreUploadBtn && restoreFileInput) {
    restoreUploadBtn.addEventListener('click', function () { restoreFileInput.click(); });
    restoreFileInput.addEventListener('change', handleRestore);
  }
}

/* ------------------------------------------------------------------
   8. DEBUG VIEW EVENTS
   ------------------------------------------------------------------ */

function initDebugViewEvents() {
  // Debug actions are rendered by renderDebugPanel with inline listeners.
  // We use event delegation for the clear session button.
  var debugActions = document.getElementById('debug-actions');
  if (debugActions) {
    debugActions.addEventListener('click', function (e) {
      if (e.target.id === 'clear-session-debug-btn') {
        handleClearSession();
      }
    });
  }

  // Sidebar clear session button
  var sidebarClearBtn = document.getElementById('clear-session-btn');
  if (sidebarClearBtn) {
    sidebarClearBtn.addEventListener('click', function () {
      handleClearSession();
    });
  }
}

/* ------------------------------------------------------------------
   9. MODAL EVENTS
   ------------------------------------------------------------------ */

function initModalEvents() {
  document.addEventListener('keydown', function (e) {
    // Prevent backspace from navigating back when not in a text input
    if (e.key === 'Backspace') {
      var tag = (e.target.tagName || '').toLowerCase();
      var isEditable = tag === 'input' || tag === 'textarea' || e.target.isContentEditable;
      if (!isEditable) {
        e.preventDefault();
      }
    }

    // Escape key closes the topmost visible modal (but not while typing in an input)
    if (e.key === 'Escape') {
      // Close split-view first if open
      var svOverlay = document.getElementById('split-view-overlay');
      if (svOverlay && svOverlay.style.display !== 'none') {
        closeSplitViewModal();
        return;
      }
      // Close swap modal if open
      var swapOverlay = document.getElementById('swap-unit-overlay');
      if (swapOverlay && swapOverlay.style.display !== 'none') {
        closeSwapUnitModal();
        return;
      }
      // Close generic modal
      var overlay = document.getElementById('modal-overlay');
      if (overlay && overlay.style.display !== 'none') {
        hideModal();
      }
    }
  });

  // Prevent the main modal overlay from closing on click-outside
  // (only close via buttons)
  var mainOverlay = document.getElementById('modal-overlay');
  if (mainOverlay) {
    mainOverlay.addEventListener('click', function (e) {
      // Do nothing — modals are only closed via explicit buttons
      e.stopPropagation();
    });
  }
}

/* ------------------------------------------------------------------
   MAP LOADING & RENDERING
   ------------------------------------------------------------------ */

function mapCacheKey(buildingKey, floor) {
  return buildingKey + ':' + floor;
}

async function loadAndRenderCurrentMap() {
  if (!AppState.selectedBuilding || AppState.selectedFloor == null) {
    showEmptyState('Select a building and floor to view the map.');
    return;
  }

  var key = mapCacheKey(AppState.selectedBuilding, AppState.selectedFloor);

  if (!AppState.mapCache.has(key)) {
    var entry = getRegistryEntry(AppState.selectedBuilding, AppState.selectedFloor);
    if (!entry) {
      showEmptyState('No map registered for ' + getBuildingLabel(AppState.selectedBuilding) + ' ' + getFloorLabel(AppState.selectedFloor) + '.');
      addDebugWarnings(
        ['Map missing from registry: ' + getBuildingLabel(AppState.selectedBuilding) + ' ' + getFloorLabel(AppState.selectedFloor)],
        'warn'
      );
      return;
    }

    showEmptyState('Loading map...');

    var result = await loadMapFromRegistry(AppState.selectedBuilding, AppState.selectedFloor);
    if (!result) {
      showEmptyState('Failed to load map: ' + entry.label + '. Check that the SVG file exists at "' + entry.svgPath + '".');
      addDebugWarnings(
        ['Failed to load SVG for ' + entry.label + ' from "' + entry.svgPath + '".'],
        'error'
      );
      return;
    }

    AppState.mapCache.set(key, result);
  }

  renderCurrentMap();
}

function renderCurrentMap() {
  if (!AppState.selectedBuilding || AppState.selectedFloor == null) {
    showEmptyState('Select a building and floor to view the map.');
    return;
  }

  var key = mapCacheKey(AppState.selectedBuilding, AppState.selectedFloor);
  var mapData = AppState.mapCache.get(key);

  if (!mapData) {
    showEmptyState('Map not loaded. Try selecting the floor again.');
    return;
  }

  var entry = getRegistryEntry(AppState.selectedBuilding, AppState.selectedFloor);
  updateMapTitle(entry ? entry.label : (getBuildingLabel(AppState.selectedBuilding) + ' ' + getFloorLabel(AppState.selectedFloor)));

  var residents = AppState.residents || new Map();

  try {
    clearDebugWarnings();

    var renderResult = renderMap(mapData.svgElement, residents, {
      showNames: AppState.showNames,
      scholarshipOnly: AppState.scholarshipOnly,
      inventory: AppState.inventory,
    });

    var unmatchedUnits = renderResult.unmatchedUnits;
    var svgUnitIds = renderResult.svgUnitIds;

    if (AppState.showNames) {
      requestAnimationFrame(function () {
        applyLabelsPostRender();
      });
    }

    bindUnitClicks(handleUnitClick);

    var printBtn = document.getElementById('print-map-btn');
    if (printBtn) printBtn.disabled = false;

    // Debug warnings
    var floorUnmatched = unmatchedUnits.filter(function (u) {
      return unitBelongsToFloor(u, AppState.selectedBuilding, AppState.selectedFloor);
    });
    if (floorUnmatched.length > 0) {
      var msgs = floorUnmatched.map(function (u) {
        return 'Resident unit "' + u + '" not found in SVG for ' + (entry ? entry.label : 'current map') + '.';
      });
      addDebugWarnings(msgs, 'warn');
    }

    if (AppState.inventory && AppState.inventory.length > 0) {
      var floorWarnings = getFloorMapWarnings(
        AppState.inventory,
        AppState.residents,
        svgUnitIds,
        AppState.selectedBuilding,
        AppState.selectedFloor
      );
      if (floorWarnings.length > 0) {
        addDebugWarnings(floorWarnings, 'warn');
      }
    }

    if (AppState.inventory && AppState.inventory.length > 0) {
      var generalWarnings = getInventoryWarnings(AppState.inventory, AppState.residents, svgUnitIds);
      if (generalWarnings.length > 0) {
        addDebugWarnings(generalWarnings, 'info');
      }
    }
  } catch (err) {
    showMapError('Failed to render map: ' + err.message);
    addDebugWarnings([err.message], 'error');
  }
}

/* ------------------------------------------------------------------
   STATS REFRESH
   ------------------------------------------------------------------ */

function refreshAllStats() {
  var inventory = AppState.inventory || [];
  var residents = AppState.residents || new Map();

  var propertyStats = getOccupancyStats(inventory, residents);
  renderPropertyStats(propertyStats);

  if (AppState.selectedBuilding) {
    var buildingStats = getBuildingOccupancyStats(inventory, residents, AppState.selectedBuilding);
    renderBuildingStats(buildingStats, AppState.selectedBuilding);
  } else {
    renderBuildingStats(null, null);
  }

  if (AppState.selectedBuilding && AppState.selectedFloor != null) {
    var floorStats = getFloorOccupancyStats(inventory, residents, AppState.selectedBuilding, AppState.selectedFloor);
    renderFloorStats(floorStats, AppState.selectedBuilding, AppState.selectedFloor);
  } else {
    renderFloorStats(null, null, null);
  }
}

/* ------------------------------------------------------------------
   PRELEASE PROGRESS REFRESH
   ------------------------------------------------------------------ */

function refreshPreleaseProgress() {
  var inventory = AppState.inventory || [];
  var residents = AppState.residents || new Map();
  var bankList = AppState.waitingBank || [];
  var scope = AppState.preleaseScope || { type: 'property' };

  var scopeLabel;
  if (scope.type === 'floor' && scope.building && scope.floor != null) {
    scopeLabel = getBuildingLabel(scope.building) + ' ' + getFloorLabel(scope.floor);
  } else if (scope.type === 'building' && scope.building) {
    scopeLabel = getBuildingLabel(scope.building);
  } else {
    scopeLabel = 'Full Property';
  }

  // Use enhanced prelease progress (placed + bank deduplicated)
  var progressResult = computeEnhancedPreleaseProgress(inventory, residents, bankList, scope);
  renderEnhancedPreleaseProgress(progressResult, scopeLabel);
}

/* ------------------------------------------------------------------
   INVENTORY UPLOAD HANDLER
   ------------------------------------------------------------------ */

async function handleInventoryUpload(file) {
  setUploadStatus('inventory', 'Parsing inventory...', '');

  try {
    var result = await parseInventorySpreadsheet(file);
    AppState.inventory = buildMasterInventory(result.units);

    var count = AppState.inventory.length;
    setUploadStatus(
      'inventory',
      'Loaded ' + count + ' unit' + (count !== 1 ? 's' : '') + ' from ' + file.name,
      'success'
    );

    persistProject();

    if (result.warnings.length > 0) {
      addDebugWarnings(result.warnings, 'warn');
    }

    refreshAllAfterImport();
    populateFloorplanFilter(AppState.inventory);
    showNotification('Inventory loaded: ' + count + ' units', 'success');
  } catch (err) {
    setUploadStatus('inventory', err.message, 'error');
    addDebugWarnings([err.message], 'error');
  }
}

/* ------------------------------------------------------------------
   ENTRATA PRELEASE IMPORT HANDLER
   ------------------------------------------------------------------ */

async function handlePreleaseImport(file) {
  var filenameMatch = isPreleaseFilename(file.name);
  if (!filenameMatch) {
    console.info('Prelease import: filename "' + file.name + '" does not match typical pattern -- proceeding with header inspection.');
  }

  setUploadStatus('entrata', 'Parsing Entrata Prelease report...', '');

  try {
    var result = await parsePreleaseReport(file);
    var placed = result.placed;
    var bank = result.bank;
    var summary = result.summary;
    var reportSummary = result.reportSummary;
    var warnings = result.warnings;

    if (placed.length === 0 && bank.length === 0) {
      setUploadStatus('entrata', 'No importable resident records found in the report.', 'error');
      if (warnings.length > 0) {
        addDebugWarnings(warnings, 'warn');
      }
      renderPreleaseImportSummary(summary, reportSummary, warnings);
      return;
    }

    // Add placed residents to master list
    if (!AppState.residents) {
      AppState.residents = new Map();
    }

    var placedAdded = 0;
    var placedDuplicates = 0;

    for (var i = 0; i < placed.length; i++) {
      var record = placed[i];
      var unitKey = record.Unit_Assigned.toUpperCase();

      if (AppState.residents.has(unitKey)) {
        placedDuplicates++;
        warnings.push('Placed: Unit "' + record.Unit_Assigned + '" already occupied -- "' + record.Resident_Name + '" skipped.');
        continue;
      }

      AppState.residents.set(unitKey, {
        Resident_Name: record.Resident_Name,
        Unit_Assigned: record.Unit_Assigned,
        Lease_Status: record.Lease_Status,
        Scholarship: record.Scholarship,
      });
      placedAdded++;
    }

    // Add bank residents to waiting bank (with dedup against placed + existing bank)
    var bankAdded = 0;
    var bankSkippedPlaced = 0;
    var bankSkippedDup = 0;

    // Build sets for dedup
    var placedNamesSet = new Set();
    AppState.residents.forEach(function (r) {
      var norm = _normalizeName(r.Resident_Name);
      if (norm) placedNamesSet.add(norm);
    });
    var existingBankKeys = new Set();
    AppState.waitingBank.forEach(function (entry) {
      existingBankKeys.add(_bankDedupKey(entry));
    });

    for (var i = 0; i < bank.length; i++) {
      var bankEntry = bank[i];
      var normName = _normalizeName(bankEntry.name);

      // Skip if this person is already placed in a unit
      if (normName && placedNamesSet.has(normName)) {
        bankSkippedPlaced++;
        warnings.push('Bank: "' + bankEntry.name + '" skipped — already placed in a unit.');
        continue;
      }

      // Skip if duplicate of existing bank entry
      var dedupKey = _bankDedupKey(bankEntry);
      if (existingBankKeys.has(dedupKey)) {
        bankSkippedDup++;
        warnings.push('Bank: "' + bankEntry.name + '" / "' + bankEntry.unitType + '" skipped — already in bank.');
        continue;
      }

      existingBankKeys.add(dedupKey);
      AppState.waitingBank.push(bankEntry);
      bankAdded++;
    }

    // Final reconciliation after import
    _reconcileState({ silent: false });

    // Status message
    var parts = [];
    if (placedAdded > 0) parts.push(placedAdded + ' placed');
    if (bankAdded > 0) parts.push(bankAdded + ' to bank');
    if (placedDuplicates > 0) parts.push(placedDuplicates + ' duplicate(s) skipped');
    if (bankSkippedPlaced > 0) parts.push(bankSkippedPlaced + ' bank skipped (already placed)');
    if (bankSkippedDup > 0) parts.push(bankSkippedDup + ' bank skipped (duplicate)');
    var statusText = 'Prelease imported: ' + parts.join(', ') + ' from ' + file.name;
    setUploadStatus('entrata', statusText, 'success');

    persistProject();

    if (warnings.length > 0) {
      addDebugWarnings(warnings, 'warn');
    }

    addDebugWarnings([
      'Prelease import: ' + placedAdded + ' placed, ' + bankAdded + ' bank, ' + placedDuplicates + ' duplicate(s).',
      'Prelease summary: ' + summary.newLeaseCount + ' New Lease, ' + summary.renewalCount + ' Renewal, ' + summary.renewalPendingStartedCount + ' Renewal Pending - Started.',
    ], 'info');

    refreshAllAfterImport();
    await loadAndRenderCurrentMap();

    renderPreleaseImportSummary(summary, reportSummary, warnings);
    showNotification('Prelease imported: ' + (placedAdded + bankAdded) + ' records', 'success');

  } catch (err) {
    setUploadStatus('entrata', err.message, 'error');
    addDebugWarnings(['Prelease import error: ' + err.message], 'error');
  }
}

/* ------------------------------------------------------------------
   SPREADSHEET (RESIDENTS) UPLOAD HANDLER
   ------------------------------------------------------------------ */

async function handleSpreadsheetUpload(file) {
  setUploadStatus('residents', 'Parsing...', '');

  try {
    var result = await parseSpreadsheet(file);
    AppState.residents = result.residents;

    // Reconcile: remove bank entries for residents that are now placed
    _reconcileState({ silent: false });

    var count = result.residents.size;
    setUploadStatus('residents', 'Loaded ' + count + ' resident' + (count !== 1 ? 's' : '') + ' from ' + file.name, 'success');

    persistResidents();

    if (result.warnings.length > 0) {
      addDebugWarnings(result.warnings, 'warn');
    }

    refreshAllAfterImport();
    showNotification('Residents loaded: ' + count + ' records', 'success');
  } catch (err) {
    setUploadStatus('residents', err.message, 'error');
    AppState.residents = null;
    addDebugWarnings([err.message], 'error');
  }
}

/* ------------------------------------------------------------------
   BANK UPLOAD HANDLER
   ------------------------------------------------------------------ */

async function handleBankUpload(file) {
  setUploadStatus('bank', 'Parsing bank list...', '');

  try {
    var result = await parseBankSpreadsheet(file);

    if (result.entries.length === 0) {
      setUploadStatus('bank', 'No valid bank entries found.', 'error');
      if (result.warnings.length > 0) {
        addDebugWarnings(result.warnings, 'warn');
      }
      return;
    }

    AppState.waitingBank = result.entries;

    // Reconcile: remove any bank entries for residents already placed
    _reconcileState({ silent: false });

    setUploadStatus(
      'bank',
      'Loaded ' + AppState.waitingBank.length + ' resident(s) into waiting bank from ' + file.name,
      'success'
    );

    if (result.warnings.length > 0) {
      addDebugWarnings(result.warnings, 'warn');
    }

    persistProject();
    refreshBank();
    renderImportCards(AppState);
    showNotification('Bank loaded: ' + result.entries.length + ' entries', 'success');
  } catch (err) {
    setUploadStatus('bank', err.message, 'error');
    addDebugWarnings([err.message], 'error');
  }
}

/* ------------------------------------------------------------------
   SCHOLARSHIP UPLOAD HANDLER -- EXACT MATCH ONLY
   ------------------------------------------------------------------ */

async function handleScholarshipUpload(file) {
  if (!AppState.residents || AppState.residents.size === 0) {
    setUploadStatus('scholarships', 'Load resident data first before matching scholarships.', 'error');
    return;
  }

  setUploadStatus('scholarships', 'Parsing scholarship list...', '');

  try {
    var result = await parseScholarshipSpreadsheet(file);
    var entries = result.entries;
    var warnings = result.warnings;

    if (entries.length === 0) {
      setUploadStatus('scholarships', 'No valid scholarship entries found.', 'error');
      if (warnings.length > 0) addDebugWarnings(warnings, 'warn');
      return;
    }

    if (warnings.length > 0) {
      addDebugWarnings(warnings, 'warn');
    }

    // Process entries using exact matching only
    var exactMatches = 0;
    var unmatched = 0;
    var skipped = warnings.length;
    var idCounter = Date.now();

    for (var i = 0; i < entries.length; i++) {
      var entry = entries[i];
      var matchKey = getExactResidentMatchForScholarshipRecord(entry.name, AppState.residents);

      if (matchKey) {
        var resident = AppState.residents.get(matchKey);
        if (resident) {
          resident.Scholarship = entry.scholarship;
          AppState.residents.set(matchKey, resident);
          exactMatches++;
        }
      } else {
        idCounter++;
        AppState.unassignedScholarships.push({
          _id: 'usch_' + idCounter,
          name: entry.name,
          scholarship: entry.scholarship,
        });
        unmatched++;
        addDebugWarnings(
          ['Scholarship upload: No exact match for "' + entry.name + '" (' + entry.scholarship + ') -- added to Unassigned Scholarships.'],
          'warn'
        );
      }
    }

    var summaryText = 'Applied: ' + exactMatches + ' exact match(es). Unassigned: ' + unmatched + '. Skipped: ' + skipped + '.';
    setUploadStatus('scholarships', summaryText, exactMatches > 0 ? 'success' : '');

    persistProject();
    refreshAllAfterImport();
    showNotification('Scholarships processed: ' + exactMatches + ' matched, ' + unmatched + ' unassigned', 'success');

  } catch (err) {
    setUploadStatus('scholarships', err.message, 'error');
    addDebugWarnings([err.message], 'error');
  }
}



/* ------------------------------------------------------------------
   INTERACTION HANDLERS
   ------------------------------------------------------------------ */

function handleUnitClick(unitId) {
  var normalizedId = unitId.trim().toUpperCase();
  var resident = AppState.residents ? AppState.residents.get(normalizedId) : null;

  selectUnit(unitId);
  showDetailPanel(resident, unitId);
}

async function navigateToUnit(unitId, afterNav) {
  var parsed = parseUnitId(unitId);
  if (!parsed.ambiguous && parsed.building && parsed.floor != null) {
    if (parsed.building !== AppState.selectedBuilding || parsed.floor !== AppState.selectedFloor) {
      AppState.selectedBuilding = parsed.building;
      AppState.selectedFloor = parsed.floor;
      setBuildingSelectorValue(AppState.selectedBuilding);
      populateFloorSelectorDropdown(AppState.selectedBuilding);
      setFloorSelectorValue(AppState.selectedFloor);
      persistProject();
      await loadAndRenderCurrentMap();
      refreshAllStats();
    }
  }
  if (afterNav) afterNav();
}

function handleSearchResultClick(result) {
  if (result.type === 'resident') {
    var resident = result.data;
    var unitId = resident.Unit_Assigned;

    navigateToUnit(unitId, function () {
      highlightUnit(unitId);
      selectUnit(unitId);
      showDetailPanel(resident, unitId);
      highlightMasterListRow(unitId.toUpperCase());
    });
  } else if (result.type === 'unit') {
    var unitId = result.data;

    navigateToUnit(unitId, function () {
      highlightUnit(unitId);
      selectUnit(unitId);
      var resident = AppState.residents ? AppState.residents.get(unitId.toUpperCase()) : null;
      showDetailPanel(resident, unitId);
    });
  }

  var searchInput = document.getElementById('search-input');
  if (searchInput) searchInput.value = '';
  clearSearchResults();
}

/* ------------------------------------------------------------------
   IMPORT RESIDENT MASTER LIST FROM XLSX
   Reads an xlsx and overwrites the resident data.
   Expects columns: Name, Unit, Lease Status, Scholarship
   Optional: Old Unit, Requested Roommate 1, Requested Roommate 2, Placement Notes
   ------------------------------------------------------------------ */

function importResidentMasterListFromXlsx(file) {
  var reader = new FileReader();
  reader.onerror = function () {
    showNotification('Failed to read file.', 'error');
  };
  reader.onload = function (e) {
    try {
      var data = new Uint8Array(e.target.result);
      var workbook = XLSX.read(data, { type: 'array' });
      var sheetName = workbook.SheetNames[0];
      if (!sheetName) { showNotification('No sheets found in file.', 'error'); return; }

      var jsonRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
      if (jsonRows.length === 0) { showNotification('No data rows found.', 'error'); return; }

      // Build case-insensitive header map
      var rawHeaders = Object.keys(jsonRows[0]);
      var headerMap = {};
      for (var i = 0; i < rawHeaders.length; i++) {
        headerMap[rawHeaders[i].trim().toUpperCase()] = rawHeaders[i];
      }

      // Required columns
      var nameCol = headerMap['NAME'] || headerMap['RESIDENT'] || headerMap['RESIDENT_NAME'] || null;
      var unitCol = headerMap['UNIT'] || headerMap['UNIT #'] || headerMap['UNIT_ASSIGNED'] || headerMap['BLDG-UNIT'] || null;
      var leaseCol = headerMap['LEASE STATUS'] || headerMap['LEASE_STATUS'] || null;
      var schCol = headerMap['SCHOLARSHIP'] || null;

      // Optional columns
      var oldUnitCol = headerMap['OLD UNIT'] || headerMap['OLD_UNIT'] || null;
      var rm1Col = headerMap['REQUESTED ROOMMATE 1'] || headerMap['REQUESTED_ROOMMATE_1'] || headerMap['REQUESTED ROOMMATE'] || null;
      var rm2Col = headerMap['REQUESTED ROOMMATE 2'] || headerMap['REQUESTED_ROOMMATE_2'] || null;
      var notesCol = headerMap['PLACEMENT NOTES'] || headerMap['PLACEMENT_NOTES'] || headerMap['NOTES'] || null;

      if (!nameCol) {
        showNotification('Missing required column: Name.', 'error');
        return;
      }

      // Also look for floorplan column
      var fpCol = headerMap['FLOORPLAN'] || headerMap['UNIT TYPE'] || headerMap['UNIT_TYPE'] || null;

      // Build new residents map and bank list
      var newResidents = new Map();
      var newBank = [];
      var placedCount = 0;
      var bankCount = 0;

      for (var r = 0; r < jsonRows.length; r++) {
        var row = jsonRows[r];
        var name = (row[nameCol] != null ? String(row[nameCol]) : '').trim();
        var unit = unitCol ? (row[unitCol] != null ? String(row[unitCol]) : '').trim() : '';
        var floorplan = fpCol ? (row[fpCol] != null ? String(row[fpCol]) : '').trim() : '';

        if (!name) continue;

        var leaseStatus = leaseCol ? (row[leaseCol] != null ? String(row[leaseCol]) : '').trim() : '';
        var scholarship = schCol ? (row[schCol] != null ? String(row[schCol]) : 'NONE').trim() : 'NONE';

        if (!unit) {
          // No unit — add to bank
          newBank.push({
            _id: 'bank_import_' + Date.now() + '_' + bankCount,
            name: name,
            unitType: floorplan,
            leaseStatus: leaseStatus,
          });
          bankCount++;
        } else {
          var unitKey = unit.toUpperCase();
          var resident = {
            Resident_Name: name,
            Unit_Assigned: unit,
            Lease_Status: leaseStatus,
            Scholarship: scholarship,
            Old_Unit: oldUnitCol ? (row[oldUnitCol] != null ? String(row[oldUnitCol]) : '').trim() : '',
            Requested_Roommate_1: rm1Col ? (row[rm1Col] != null ? String(row[rm1Col]) : '').trim() : '',
            Requested_Roommate_2: rm2Col ? (row[rm2Col] != null ? String(row[rm2Col]) : '').trim() : '',
            Placement_Notes: notesCol ? (row[notesCol] != null ? String(row[notesCol]) : '').trim() : '',
          };
          newResidents.set(unitKey, resident);
          placedCount++;
        }
      }

      if (placedCount === 0 && bankCount === 0) {
        showNotification('No valid records found in file.', 'error');
        return;
      }

      // Overwrite residents and bank
      AppState.residents = newResidents;
      AppState.waitingBank = newBank;

      // Reconcile after import
      _reconcileState({ silent: false });

      persistProject();
      refreshAllAfterImport();

      var msg = 'Imported ' + placedCount + ' placed resident(s)';
      if (bankCount > 0) msg += ' and ' + bankCount + ' bank record(s)';
      msg += '. Previous data overwritten.';
      showNotification(msg, 'success');

    } catch (err) {
      showNotification('Import failed: ' + err.message, 'error');
    }
  };
  reader.readAsArrayBuffer(file);
}

/* ------------------------------------------------------------------
   EXPORT MASTER LIST TO EXCEL
   Builds an xlsx from inventory + residents with columns:
   Name, Unit, Floorplan, Lease Status, Scholarship
   ------------------------------------------------------------------ */

function exportMasterListToExcel() {
  var inventory = AppState.inventory || [];
  var residents = AppState.residents || new Map();

  var rows = [];

  // Build rows from inventory (all units), merging resident data
  if (inventory.length > 0) {
    for (var i = 0; i < inventory.length; i++) {
      var item = inventory[i];
      var key = item.unitNumber.toUpperCase();
      var r = residents.get(key);
      rows.push({
        Name: r ? (r.Resident_Name || '') : '',
        Unit: item.unitNumber || '',
        Floorplan: item.unitType || '',
        'Lease Status': r ? (r.Lease_Status || '') : '',
        Scholarship: r ? (r.Scholarship || '') : '',
        'Old Unit': r ? (r.Old_Unit || '') : '',
        'Requested Roommate 1': r ? (r.Requested_Roommate_1 || r.Requested_Roommate || '') : '',
        'Requested Roommate 2': r ? (r.Requested_Roommate_2 || '') : '',
        'Placement Notes': r ? (r.Placement_Notes || '') : '',
      });
    }
    // Also add residents not in inventory
    var inventorySet = new Set(inventory.map(function (item) { return item.unitNumber.toUpperCase(); }));
    residents.forEach(function (r, unitKey) {
      if (!inventorySet.has(unitKey)) {
        rows.push({
          Name: r.Resident_Name || '',
          Unit: r.Unit_Assigned || '',
          Floorplan: '',
          'Lease Status': r.Lease_Status || '',
          Scholarship: r.Scholarship || '',
          'Old Unit': r.Old_Unit || '',
          'Requested Roommate 1': r.Requested_Roommate_1 || r.Requested_Roommate || '',
          'Requested Roommate 2': r.Requested_Roommate_2 || '',
          'Placement Notes': r.Placement_Notes || '',
        });
      }
    });
  } else if (residents.size > 0) {
    residents.forEach(function (r) {
      rows.push({
        Name: r.Resident_Name || '',
        Unit: r.Unit_Assigned || '',
        Floorplan: '',
        'Lease Status': r.Lease_Status || '',
        Scholarship: r.Scholarship || '',
        'Old Unit': r.Old_Unit || '',
        'Requested Roommate': r.Requested_Roommate || '',
        'Placement Notes': r.Placement_Notes || '',
      });
    });
  }

  if (rows.length === 0) {
    showNotification('No data to export.', 'warning');
    return;
  }

  // Sort by unit number
  rows.sort(function (a, b) {
    return (a.Unit || '').localeCompare(b.Unit || '', undefined, { numeric: true, sensitivity: 'base' });
  });

  var ws = XLSX.utils.json_to_sheet(rows, { header: ['Name', 'Unit', 'Floorplan', 'Lease Status', 'Scholarship', 'Old Unit', 'Requested Roommate 1', 'Requested Roommate 2', 'Placement Notes'] });

  // Set column widths
  ws['!cols'] = [
    { wch: 28 }, // Name
    { wch: 14 }, // Unit
    { wch: 20 }, // Floorplan
    { wch: 24 }, // Lease Status
    { wch: 22 }, // Scholarship
    { wch: 14 }, // Old Unit
    { wch: 24 }, // Requested Roommate 1
    { wch: 24 }, // Requested Roommate 2
    { wch: 36 }, // Placement Notes
  ];

  var wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Resident Master List');

  var today = new Date();
  var dateStr = today.getFullYear() + '-' +
    String(today.getMonth() + 1).padStart(2, '0') + '-' +
    String(today.getDate()).padStart(2, '0');
  XLSX.writeFile(wb, 'Resident_Master_List_' + dateStr + '.xlsx');

  showNotification('Resident Master List exported.', 'success');
}

/* ------------------------------------------------------------------
   MASTER LIST HELPERS
   ------------------------------------------------------------------ */

function refreshMasterList() {
  var residents = AppState.residents || new Map();
  var inventory = AppState.inventory || [];
  renderMasterList(residents, inventory, AppState.filters, {
    onEdit: handleResidentEdit,
    onDelete: handleResidentDelete,
    onRowClick: handleMasterListRowClick,
  });
}

function handleMasterListRowClick(resident, unitKey) {
  navigateToUnit(unitKey, function () {
    highlightUnit(unitKey);
    selectUnit(unitKey);
    showDetailPanel(resident, resident.Unit_Assigned);
    highlightMasterListRow(unitKey);
  });
}

/**
 * Wire event delegation for master list search/filter controls.
 * Uses class-based selectors so it works for any master list container
 * (the hidden default one and the split-view modal one).
 */
function _wireMasterListDelegation(container, refreshFn) {
  if (!container) return;
  container.addEventListener('input', function (e) {
    if (e.target.classList.contains('master-list-search')) {
      refreshFn();
    }
  });
  container.addEventListener('change', function (e) {
    if (e.target.classList.contains('filter-occupancy')) {
      AppState.filters.occupancy = e.target.value;
      refreshFn();
    } else if (e.target.classList.contains('filter-scholarship')) {
      AppState.filters.scholarship = e.target.value;
      refreshFn();
    } else if (e.target.classList.contains('filter-lease')) {
      AppState.filters.lease = e.target.value;
      refreshFn();
    } else if (e.target.classList.contains('filter-floorplan')) {
      AppState.filters.floorplan = e.target.value;
      refreshFn();
    } else if (e.target.classList.contains('bank-toggle-checkbox')) {
      refreshFn();
    }
  });
  container.addEventListener('click', function (e) {
    if (e.target.classList.contains('clear-filters-btn')) {
      AppState.filters.occupancy = 'all';
      AppState.filters.scholarship = 'all';
      AppState.filters.lease = 'all';
      AppState.filters.floorplan = 'all';
      var fo = container.querySelector('.filter-occupancy');
      var fs = container.querySelector('.filter-scholarship');
      var fl = container.querySelector('.filter-lease');
      var ff = container.querySelector('.filter-floorplan');
      if (fo) fo.value = 'all';
      if (fs) fs.value = 'all';
      if (fl) fl.value = 'all';
      if (ff) ff.value = 'all';
      refreshFn();
    }
  });
}

/* ------------------------------------------------------------------
   SPLIT-VIEW HANDLERS
   ------------------------------------------------------------------ */

function handleSplitViewRowClick(resident, unitKey) {
  var parsed = parseUnitId(unitKey);
  if (parsed.ambiguous) return;

  // Update the modal's map selectors
  var bSelect = document.getElementById('sv-building-selector');
  var fSelect = document.getElementById('sv-floor-selector');
  if (bSelect) bSelect.value = parsed.building;
  updateModalFloorSelector();
  if (fSelect) fSelect.value = parsed.floor;

  // Load map and highlight
  loadMapInSplitView(parsed.building, parsed.floor, unitKey);

  // Highlight row in the split-view list
  highlightMasterListRowIn(document.getElementById('sv-master-list'), unitKey);
}

function handleSplitViewAddResident(unitNumber, unitType) {
  openResidentModal(null, {
    onSave: function (formData, isEdit, origKey) {
      handleResidentSave(formData, isEdit, origKey);
      // Refresh the split-view list after save
      refreshSplitViewMasterList();
    },
    inventory: AppState.inventory,
    residents: AppState.residents,
    reservedUnitsMap: AppState.scholarshipReservedUnits,
    prefillUnit: unitNumber,
    prefillFloorplan: unitType,
  });
}

function handleResidentEdit(resident, unitKey) {
  openResidentModal(resident, {
    onSave: handleResidentSave,
    inventory: AppState.inventory,
    residents: AppState.residents,
    reservedUnitsMap: AppState.scholarshipReservedUnits,
  });
}

function handleResidentDelete(resident, unitKey) {
  showConfirmModal(
    'Delete Resident',
    'Delete resident "' + resident.Resident_Name + '" from unit ' + resident.Unit_Assigned + '?',
    function () {
      if (AppState.residents) {
        AppState.residents.delete(unitKey);
        persistResidents();
        refreshAllStats();
        refreshMasterList();
        renderCurrentMap();
        refreshScholarshipRecap();
        refreshPreleaseProgress();
        refreshLeapfrogChecker();

        refreshSummaryPanel();

        showNotification('Deleted resident "' + resident.Resident_Name + '" from unit ' + resident.Unit_Assigned, 'success');
      }
    }
  );
}

/* ------------------------------------------------------------------
   RESIDENT DETAIL MODAL — View/edit Placement Notes & Requested Roommate
   ------------------------------------------------------------------ */

function handleResidentNameClick(resident, unitKey) {
  openResidentDetailModal(resident, unitKey, AppState.inventory, function (key, updates) {
    var r = AppState.residents ? AppState.residents.get(key) : null;
    if (!r) return;

    if (updates.Placement_Notes !== undefined) {
      r.Placement_Notes = updates.Placement_Notes;
    }
    if (updates.Requested_Roommate_1 !== undefined) {
      r.Requested_Roommate_1 = updates.Requested_Roommate_1;
    }
    if (updates.Requested_Roommate_2 !== undefined) {
      r.Requested_Roommate_2 = updates.Requested_Roommate_2;
    }

    AppState.residents.set(key, r);
    persistProject();
    showNotification('Resident details saved.', 'success');
  });
}

/* ------------------------------------------------------------------
   UNASSIGN RESIDENT — Move from unit to waiting bank
   ------------------------------------------------------------------ */

function handleUnassignResident(unitKey) {
  if (!AppState.residents || !AppState.residents.has(unitKey)) {
    showNotification('No resident found for this unit.', 'error');
    return;
  }

  var resident = AppState.residents.get(unitKey);
  var residentName = resident.Resident_Name || 'Unknown';
  var unitType = getResidentFloorplanType(resident, AppState.inventory || []) || '';

  showConfirmModal(
    'Unassign Resident',
    'Unassign "' + residentName + '" from unit ' + (resident.Unit_Assigned || unitKey) + '? They will be moved to the waiting bank.',
    function () {
      // Create bank entry
      var bankEntry = {
        _id: 'bank_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
        name: residentName,
        unitType: unitType,
        leaseStatus: resident.Lease_Status || '',
      };

      // Remove from placed residents
      AppState.residents.delete(unitKey);

      // Add to waiting bank
      if (!AppState.waitingBank) AppState.waitingBank = [];
      AppState.waitingBank.push(bankEntry);

      persistProject();
      refreshAllStats();
      refreshMasterList();
      renderCurrentMap();
      refreshBank();
      refreshScholarshipRecap();
      refreshPreleaseProgress();
      refreshLeapfrogChecker();
      refreshSummaryPanel();
      renderImportCards(AppState);
      hideDetailPanel();

      showNotification('Unassigned "' + residentName + '" and moved to waiting bank.', 'success');
    }
  );
}

function handleResidentSave(formData, isEdit, originalUnitKey) {
  if (!AppState.residents) {
    AppState.residents = new Map();
  }

  var newUnitKey = formData.Unit_Assigned.toUpperCase();

  var validation = validateUnitAssignment(
    formData.Unit_Assigned,
    AppState.inventory,
    AppState.residents,
    isEdit ? originalUnitKey : null
  );

  if (!validation.valid) {
    alert(validation.message);
    return;
  }

  var reservedScholarship = AppState.scholarshipReservedUnits.get(newUnitKey);
  if (reservedScholarship) {
    closeResidentModal();
    showConfirmModal(
      'Scholarship Reserved Unit',
      'Unit "' + formData.Unit_Assigned + '" is reserved for the "' + reservedScholarship + '" scholarship. Do you want to proceed with this placement?',
      function () {
        _completeResidentSave(formData, isEdit, originalUnitKey, newUnitKey);
      }
    );
    return;
  }

  _completeResidentSave(formData, isEdit, originalUnitKey, newUnitKey);
}

function _completeResidentSave(formData, isEdit, originalUnitKey, newUnitKey) {
  if (isEdit && originalUnitKey && originalUnitKey !== newUnitKey) {
    AppState.residents.delete(originalUnitKey);
  }

  AppState.residents.set(newUnitKey, {
    Resident_Name: formData.Resident_Name,
    Unit_Assigned: formData.Unit_Assigned,
    Lease_Status: formData.Lease_Status,
    Scholarship: formData.Scholarship,
    Old_Unit: formData.Old_Unit || '',
  });

  persistResidents();
  closeResidentModal();

  // Refresh all downstream systems
  refreshAllStats();
  refreshMasterList();
  renderCurrentMap();
  refreshScholarshipRecap();
  refreshPreleaseProgress();
  renderImportCards(AppState);
  refreshLeapfrogChecker();

  refreshSummaryPanel();

  var action = isEdit ? 'updated' : 'added';
  showNotification('Resident ' + action + ': ' + formData.Resident_Name + ' → ' + formData.Unit_Assigned, 'success');
}

/* ------------------------------------------------------------------
   SEARCH -- ENHANCED FOR INVENTORY (legacy fallback)
   ------------------------------------------------------------------ */

function searchAllUnits(query, inventory, residents) {
  if (!query) return [];

  var q = query.trim().toUpperCase();
  if (!q) return [];

  var results = [];
  var addedUnits = new Set();

  if (residents) {
    residents.forEach(function (resident, unitKey) {
      var nameMatch = (resident.Resident_Name || '').toUpperCase().includes(q);
      var unitMatch = unitKey.includes(q);
      if (nameMatch || unitMatch) {
        results.push({
          type: 'resident',
          data: resident,
          label: resident.Unit_Assigned,
          sublabel: resident.Resident_Name,
        });
        addedUnits.add(unitKey);
      }
    });
  }

  if (inventory) {
    for (var i = 0; i < inventory.length; i++) {
      var item = inventory[i];
      var key = item.unitNumber.toUpperCase();
      if (addedUnits.has(key)) continue;
      if (key.includes(q)) {
        results.push({
          type: 'unit',
          data: item.unitNumber,
          label: item.unitNumber,
          sublabel: 'Available',
        });
      }
    }
  }

  return results;
}

/* ------------------------------------------------------------------
   BACKUP / RESTORE
   ------------------------------------------------------------------ */

function handleBackup() {
  var data = buildProjectData();
  var json = JSON.stringify(data, null, 2);
  var blob = new Blob([json], { type: 'application/json' });

  var now = new Date();
  var dateStr = now.toISOString().slice(0, 10);
  var filename = 'property-site-map-backup-' + dateStr + '.json';

  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);

  showNotification('Backup downloaded: ' + filename, 'success');
}

async function handleRestore(e) {
  var file = e.target.files[0];
  if (!file) return;

  e.target.value = '';

  var reader = new FileReader();
  reader.onerror = function () {
    showNotification('Failed to read backup file.', 'error');
  };

  reader.onload = async function (evt) {
    try {
      var data = JSON.parse(evt.target.result);

      if (!data || typeof data !== 'object') {
        showNotification('Invalid backup file: not a JSON object.', 'error');
        return;
      }

      showConfirmModal(
        'Restore Backup',
        'Importing this backup will replace all current project data (inventory, residents, settings). Continue?',
        async function () {
          var success = restoreProjectData(data);
          if (!success) {
            showNotification('Failed to restore project data.', 'error');
            return;
          }

          persistProject();

          // Restore toggle states
          var tn = document.getElementById('toggle-names');
          if (tn) tn.checked = AppState.showNames;
          var ts = document.getElementById('toggle-scholarship');
          if (ts) ts.checked = AppState.scholarshipOnly;

          if (AppState.selectedBuilding) {
            setBuildingSelectorValue(AppState.selectedBuilding);
            populateFloorSelectorDropdown(AppState.selectedBuilding);
            if (AppState.selectedFloor != null) {
              setFloorSelectorValue(AppState.selectedFloor);
            }
          }

          await loadAndRenderCurrentMap();
          refreshAllAfterImport();

          var resCount = AppState.residents ? AppState.residents.size : 0;
          var invCount = AppState.inventory ? AppState.inventory.length : 0;
          var bankCount = AppState.waitingBank ? AppState.waitingBank.length : 0;
          showNotification(
            'Imported: ' + invCount + ' inventory units, ' + resCount + ' resident(s), ' + bankCount + ' bank resident(s).',
            'success'
          );

          renderBackupRestore(AppState);
        }
      );
    } catch (err) {
      showNotification('Malformed JSON: ' + err.message, 'error');
    }
  };

  reader.readAsText(file);
}

/* ------------------------------------------------------------------
   UNASSIGNED SCHOLARSHIPS -- REFRESH & MANUAL TRANSFER
   ------------------------------------------------------------------ */

function refreshUnassignedScholarships() {
  renderUnassignedScholarships(
    AppState.unassignedScholarships,
    AppState.residents,
    { onTransfer: handleScholarshipTransfer }
  );
}

function handleScholarshipTransfer(item, unitKey) {
  if (!AppState.residents) {
    addDebugWarnings(['Manual transfer attempted without loaded residents.'], 'warn');
    return;
  }

  var resident = AppState.residents.get(unitKey);
  if (!resident) {
    addDebugWarnings(['Manual transfer failed: no resident found for unit key "' + unitKey + '".'], 'warn');
    showNotification('Selected resident not found. They may have been deleted.', 'error');
    return;
  }

  showConfirmModal(
    'Transfer Scholarship',
    'Transfer scholarship "' + item.scholarship + '" to "' + resident.Resident_Name + '" (' + resident.Unit_Assigned + ')?',
    function () {
      resident.Scholarship = item.scholarship;
      AppState.residents.set(unitKey, resident);

      AppState.unassignedScholarships = AppState.unassignedScholarships.filter(function (s) { return s._id !== item._id; });

      persistProject();
      refreshUnassignedScholarships();
      refreshScholarshipRecap();
      refreshAllStats();
      refreshMasterList();
      renderCurrentMap();
    }
  );
}

/* ------------------------------------------------------------------
   SUMMARY PANEL — Prelease + Scholarship (toggle in left sidebar)
   Uses computePropertySummary & aggregateScholarshipCounts from inventory.js.
   ------------------------------------------------------------------ */

function refreshSummaryPanel() {
  // Prelease summary — placed-only from Resident Master List
  var summaryResult = computePropertySummary(
    AppState.inventory || [],
    AppState.residents,
    AppState.waitingBank || []
  );
  renderPreleaseSummary(summaryResult);

  // Scholarship summary — from Resident Master List
  renderScholarshipSummary(AppState.residents);
}

/** Legacy alias kept so existing refreshScholarshipRecap() calls still work */
function refreshScholarshipRecap() {
  refreshSummaryPanel();
}

/* ------------------------------------------------------------------
   LEAPFROG CHECKER -- REFRESH
   Computes and renders renewal transfer leapfrog conflicts.
   ------------------------------------------------------------------ */

function refreshLeapfrogChecker() {
  var conflicts = computeLeapfrogConflicts(AppState.residents);
  renderLeapfrogChecker(conflicts);
}

/* ------------------------------------------------------------------
   WAITING BANK HANDLERS
   ------------------------------------------------------------------ */

function refreshBank() {
  var bankSearchInput = document.getElementById('bank-search-input');
  var query = bankSearchInput ? bankSearchInput.value : '';
  renderWaitingBank(AppState.waitingBank, {
    onAssignClick: handleBankAssignClick,
    onEditClick: handleBankEditClick,
  }, query);
}

function handleBankEditClick(bankEntry) {
  openBankEditModal(bankEntry, {
    onSave: handleBankEditSave,
    onDelete: handleBankEditDelete,
  });
}

function handleBankEditSave(originalEntry, updatedData) {
  var idx = AppState.waitingBank.findIndex(function (e) { return e._id === originalEntry._id; });
  if (idx === -1) {
    showNotification('Bank entry not found. It may have been assigned or removed.', 'error');
    return;
  }

  AppState.waitingBank[idx].name = updatedData.name;
  AppState.waitingBank[idx].unitType = updatedData.unitType;
  AppState.waitingBank[idx].leaseStatus = updatedData.leaseStatus;

  persistProject();
  refreshBank();
  refreshPreleaseProgress();
  renderImportCards(AppState);

  refreshSummaryPanel();

  showNotification('Bank resident "' + updatedData.name + '" updated.', 'success');
}

function handleBankEditDelete(bankEntry) {
  showConfirmModal(
    'Delete Bank Resident',
    'Remove "' + bankEntry.name + '" from the waiting bank?',
    function () {
      AppState.waitingBank = AppState.waitingBank.filter(function (e) { return e._id !== bankEntry._id; });
      persistProject();
      refreshBank();
      refreshPreleaseProgress();
      renderImportCards(AppState);

      refreshSummaryPanel();

      showNotification('Bank resident "' + bankEntry.name + '" removed.', 'success');
    }
  );
}

function handleBankAssignClick(bankEntry) {
  var inventory = AppState.inventory || [];
  var residents = AppState.residents || new Map();

  var availableUnits = getAvailableUnitsForUnitType(inventory, residents, bankEntry.unitType);

  if (availableUnits.length === 0) {
    addDebugWarnings(
      ['No available units for bank resident "' + bankEntry.name + '" (Unit Type: ' + bankEntry.unitType + ').'],
      'warn'
    );
  }

  openBankAssignmentModal(bankEntry, availableUnits, {
    onAssign: handleBankAssignment,
    reservedUnitsMap: AppState.scholarshipReservedUnits,
  });
}

function handleBankAssignment(bankEntry, selectedUnit, selectedScholarship) {
  if (!AppState.residents) {
    AppState.residents = new Map();
  }

  var scholarship = selectedScholarship || 'NONE';
  var unitKey = selectedUnit.toUpperCase();

  if (AppState.residents.has(unitKey)) {
    var existing = AppState.residents.get(unitKey);
    showNotification('Unit "' + selectedUnit + '" is already assigned to "' + existing.Resident_Name + '". Cannot assign.', 'error');
    addDebugWarnings(
      ['Bank assignment failed: Unit "' + selectedUnit + '" already occupied by "' + existing.Resident_Name + '".'],
      'warn'
    );
    return;
  }

  if (AppState.inventory && AppState.inventory.length > 0) {
    var typeValidation = validateUnitTypeMatch(bankEntry.unitType, selectedUnit, AppState.inventory);
    if (!typeValidation.valid) {
      showNotification(typeValidation.message, 'error');
      addDebugWarnings(
        ['Bank assignment blocked: ' + typeValidation.message],
        'warn'
      );
      return;
    }
  }

  var reservedScholarship = AppState.scholarshipReservedUnits.get(unitKey);
  if (reservedScholarship) {
    showConfirmModal(
      'Scholarship Reserved Unit',
      'Unit "' + selectedUnit + '" is reserved for the "' + reservedScholarship + '" scholarship. Do you want to proceed with this placement?',
      function () {
        _completeBankAssignment(bankEntry, selectedUnit, unitKey, scholarship);
      }
    );
    return;
  }

  _completeBankAssignment(bankEntry, selectedUnit, unitKey, scholarship);
}

function _completeBankAssignment(bankEntry, selectedUnit, unitKey, scholarship) {
  AppState.residents.set(unitKey, {
    Resident_Name: bankEntry.name,
    Unit_Assigned: selectedUnit,
    Lease_Status: bankEntry.leaseStatus,
    Scholarship: scholarship || 'NONE',
  });

  // Remove from bank by _id
  var prevLength = AppState.waitingBank.length;
  AppState.waitingBank = AppState.waitingBank.filter(function (entry) { return entry._id !== bankEntry._id; });

  // Safety: also remove any other bank entries with the same normalized name
  // (handles edge case where the same person exists under different _ids)
  var normName = _normalizeName(bankEntry.name);
  if (normName) {
    AppState.waitingBank = AppState.waitingBank.filter(function (entry) {
      return _normalizeName(entry.name) !== normName;
    });
  }

  var removed = prevLength - AppState.waitingBank.length;
  console.info('[BankAssign] Placed "' + bankEntry.name + '" into ' + selectedUnit +
    ', removed ' + removed + ' bank entry(ies)');

  persistProject();
  refreshBank();
  refreshAllStats();
  refreshMasterList();
  renderCurrentMap();
  renderImportCards(AppState);
  refreshScholarshipRecap();
  refreshPreleaseProgress();

  refreshSummaryPanel();

  showNotification('Assigned "' + bankEntry.name + '" to unit ' + selectedUnit, 'success');
}

/* ------------------------------------------------------------------
   BULK DELETE FLOW -- WITH DOUBLE VERIFICATION
   ------------------------------------------------------------------ */

function findResidentsToDelete(mode, subValue) {
  if (!AppState.residents || AppState.residents.size === 0) return [];

  var matches = [];
  var inventory = AppState.inventory || [];

  AppState.residents.forEach(function (resident, unitKey) {
    var shouldDelete = false;

    switch (mode) {
      case 'all':
        shouldDelete = true;
        break;
      case 'floorplan':
        if (subValue) {
          var inventoryType = getInventoryUnitType(resident.Unit_Assigned, inventory);
          if (inventoryType && inventoryType.trim().toUpperCase() === subValue.trim().toUpperCase()) {
            shouldDelete = true;
          }
        }
        break;
      case 'scholarship':
        if (subValue) {
          var sch = (resident.Scholarship || '').toUpperCase().trim();
          if (sch === subValue.toUpperCase().trim()) {
            shouldDelete = true;
          }
        }
        break;
      case 'lease':
        if (subValue) {
          if ((resident.Lease_Status || '') === subValue) {
            shouldDelete = true;
          }
        }
        break;
    }

    if (shouldDelete) {
      matches.push({ unitKey: unitKey, resident: resident });
    }
  });

  return matches;
}

function buildDeleteDescription(mode, subValue) {
  switch (mode) {
    case 'all':
      return 'ALL placed residents will be deleted.';
    case 'floorplan':
      return 'All placed residents with floorplan type "' + subValue + '" will be deleted.';
    case 'scholarship':
      return 'All placed residents with scholarship "' + subValue + '" will be deleted.';
    case 'lease':
      return 'All placed residents with lease type "' + subValue + '" will be deleted.';
    default:
      return 'Selected residents will be deleted.';
  }
}

function handleBulkDelete() {
  var modeSelect = document.getElementById('delete-mode-select');
  var subSelect = document.getElementById('delete-sub-selector');

  if (!modeSelect) return;

  var mode = modeSelect.value;
  var subValue = (mode !== 'all' && subSelect) ? subSelect.value : null;

  if (mode !== 'all' && !subValue) {
    showNotification('Please select a specific value to delete by.', 'info');
    return;
  }

  var matches = findResidentsToDelete(mode, subValue);

  if (matches.length === 0) {
    showNotification('No residents match the selected criteria. Nothing to delete.', 'info');
    addDebugWarnings(
      ['Delete requested (' + mode + (subValue ? ': ' + subValue : '') + ') but zero residents matched.'],
      'info'
    );
    return;
  }

  var description = buildDeleteDescription(mode, subValue);

  showDeleteConfirmation1(description, matches.length, function () {
    showDeleteConfirmation2(function () {
      executeDelete(matches);
    });
  });
}

function executeDelete(matches) {
  if (!AppState.residents) return;

  var deletedCount = 0;

  for (var i = 0; i < matches.length; i++) {
    var unitKey = matches[i].unitKey;
    if (AppState.residents.has(unitKey)) {
      AppState.residents.delete(unitKey);
      deletedCount++;
    }
  }

  persistProject();
  refreshAllStats();
  refreshMasterList();
  renderCurrentMap();
  hideDetailPanel();

  showNotification('Successfully deleted ' + deletedCount + ' resident(s).', 'success');
  addDebugWarnings(
    ['Bulk delete completed: ' + deletedCount + ' resident(s) removed.'],
    'info'
  );
}

/* ------------------------------------------------------------------
   CLEAR SAVED SESSION
   ------------------------------------------------------------------ */

function handleClearSession() {
  showConfirmModal(
    'Clear All Session Data',
    'This will clear ALL saved session data from your browser, including inventory, placed residents, waiting bank, settings, and custom colors. This cannot be undone. Continue?',
    function () {
      showConfirmModal(
        'Final Confirmation',
        'Are you absolutely sure? All unsaved data will be permanently lost.',
        function () {
          clearPersistedState();

          // Reset AppState
          AppState.inventory = null;
          AppState.residents = null;
          AppState.waitingBank = [];
          AppState.unassignedScholarships = [];
          AppState.scholarshipReservedUnits = new Map();
          AppState.selectedBuilding = null;
          AppState.selectedFloor = null;
          AppState.showNames = false;
          AppState.scholarshipOnly = false;
          AppState.preleaseScope = { type: 'property' };
          AppState.filters = { occupancy: 'all', scholarship: 'all', lease: 'all', floorplan: 'all' };
          AppState.preleaseProgressScope = 'property';
          AppState.currentView = DEFAULT_VIEW;

          // Reset UI toggles
          var tn = document.getElementById('toggle-names');
          if (tn) tn.checked = false;
          var ts = document.getElementById('toggle-scholarship');
          if (ts) ts.checked = false;

          // Re-init selectors
          populateBuildingSelector();
          var buildings = getRegisteredBuildings();
          if (buildings.length > 0) {
            AppState.selectedBuilding = buildings[0];
            setBuildingSelectorValue(AppState.selectedBuilding);
            populateFloorSelectorDropdown(AppState.selectedBuilding);
            var floors = getFloorsForBuilding(AppState.selectedBuilding);
            if (floors.length > 0) {
              AppState.selectedFloor = floors[0];
              setFloorSelectorValue(AppState.selectedFloor);
            }
          }

          refreshAllStats();
          refreshMasterList();
          refreshBank();
          refreshUnassignedScholarships();
          refreshScholarshipRecap();
          refreshReservedUnits();
          renderImportCards(AppState);
          renderDebugPanel(AppState);
          renderBackupRestore(AppState);
          refreshPreleaseProgress();
          loadAndRenderCurrentMap();

          addDebugWarnings(['Session data cleared by user.'], 'info');
          showNotification('All session data has been cleared.', 'success');
        }
      );
    }
  );
}

/* ------------------------------------------------------------------
   SCHOLARSHIP RESERVED UNITS — MANAGEMENT
   ------------------------------------------------------------------ */

function refreshReservedUnits() {
  renderReservedUnits(AppState.scholarshipReservedUnits, {
    onRemove: handleRemoveReservedUnit,
    onEdit: handleEditReservedUnit,
  });
  renderReservedUnitsSummary(AppState.scholarshipReservedUnits);
}

function handleAddReservedUnit() {
  openReserveUnitModal(AppState.inventory, AppState.residents, AppState.scholarshipReservedUnits, {
    onReserve: function (unitNumber, scholarship) {
      var unitKey = unitNumber.toUpperCase();
      AppState.scholarshipReservedUnits.set(unitKey, scholarship);
      persistProject();
      refreshReservedUnits();
      renderCurrentMap();
      showNotification('Unit "' + unitNumber + '" reserved for "' + scholarship + '".', 'success');
    },
  });
}

function handleEditReservedUnit(unitKey, currentScholarship) {
  openEditReserveUnitModal(unitKey, currentScholarship, AppState.inventory, AppState.scholarshipReservedUnits, {
    onSave: function (unitKey, newScholarship) {
      AppState.scholarshipReservedUnits.set(unitKey, newScholarship);
      persistProject();
      refreshReservedUnits();
      renderCurrentMap();
      showNotification('Reservation updated: "' + unitKey + '" now reserved for "' + newScholarship + '".', 'success');
    },
  });
}

function handleRemoveReservedUnit(unitKey) {
  var scholarship = AppState.scholarshipReservedUnits.get(unitKey);
  showConfirmModal(
    'Remove Reservation',
    'Remove the "' + (scholarship || '') + '" scholarship reservation from unit "' + unitKey + '"?',
    function () {
      AppState.scholarshipReservedUnits.delete(unitKey);
      persistProject();
      refreshReservedUnits();
      renderCurrentMap();
      showNotification('Reservation removed from unit "' + unitKey + '".', 'success');
    }
  );
}

function initReservedUnitsEvents() {
  var addBtn = document.getElementById('add-reserved-unit-btn');
  if (addBtn) {
    addBtn.addEventListener('click', handleAddReservedUnit);
  }
}

/* ------------------------------------------------------------------
   REFRESH ALL AFTER IMPORT
   Central helper called after any data import to refresh all views.
   ------------------------------------------------------------------ */

function refreshAllAfterImport() {
  refreshAllStats();
  refreshMasterList();
  refreshBank();
  refreshUnassignedScholarships();
  refreshScholarshipRecap();
  renderImportCards(AppState);
  renderCurrentMap();
  refreshPreleaseProgress();
  renderDebugPanel(AppState);
  renderBackupRestore(AppState);
  refreshReservedUnits();
  refreshLeapfrogChecker();

  refreshSummaryPanel();

  // Update sidebar import row statuses
  updateImportSidebarStatuses();
}

/**
 * Update the import status indicators in the left sidebar import rows.
 */
function updateImportSidebarStatuses() {
  var rows = document.querySelectorAll('#import-section .import-row');
  rows.forEach(function (row) {
    var importType = row.dataset.importType;
    var statusEl = row.querySelector('.import-status');
    if (!statusEl) return;

    var hasData = false;
    switch (importType) {
      case 'inventory':
        hasData = AppState.inventory && AppState.inventory.length > 0;
        break;
      case 'residents':
        hasData = AppState.residents && AppState.residents.size > 0;
        break;
      case 'bank':
        hasData = AppState.waitingBank && AppState.waitingBank.length > 0;
        break;
      case 'scholarships':
        hasData = AppState.unassignedScholarships && AppState.unassignedScholarships.length > 0;
        // Also check if any residents have scholarships
        if (!hasData && AppState.residents) {
          AppState.residents.forEach(function (r) {
            if (r.Scholarship && r.Scholarship !== 'NONE') hasData = true;
          });
        }
        break;
      case 'entrata':
        hasData = AppState.residents && AppState.residents.size > 0;
        break;

    }

    statusEl.textContent = hasData ? 'Loaded' : '';
    statusEl.className = 'import-status' + (hasData ? ' has-data' : '');
  });
}
