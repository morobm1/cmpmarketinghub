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
 * Shows a user-visible notification on failure and retries up to
 * _MAX_PERSIST_RETRIES times before giving up.
 */
function _persistProjectToApi() {
  var data = buildProjectData();
  fetch(API_BASE, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ project: data }),
  }).then(function (res) {
    if (!res.ok) {
      throw new Error('HTTP ' + res.status);
    }
    _persistFailCount = 0;
    _setApiConnected(true);
    _lastUpdatedAt = new Date().toISOString();
    _renderSyncStatus();
  }).catch(function (err) {
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

  // Hide/disable edit controls for viewers
  var editElements = [
    '#import-section',
    '#add-resident-btn',
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

  // Add a viewer badge to the header
  var header = document.getElementById('app-header');
  if (header) {
    var badge = document.createElement('span');
    badge.style.cssText = 'font-size:0.68rem;color:rgba(255,255,255,0.5);padding:2px 8px;border:1px solid rgba(255,255,255,0.2);border-radius:4px;white-space:nowrap;';
    badge.textContent = 'View Only';
    header.appendChild(badge);
  }
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

  // Apply role-based restrictions (hide edit controls for viewers)
  applyRoleRestrictions();
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

  // Split-View overlay click-outside-to-close
  var svOverlay = document.getElementById('split-view-overlay');
  if (svOverlay) {
    svOverlay.addEventListener('click', function (e) {
      if (e.target === svOverlay) closeSplitViewModal();
    });
  }

  // Split-View export button
  var svExportBtn = document.getElementById('sv-export-btn');
  if (svExportBtn) {
    svExportBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      exportMasterListToExcel();
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
  var swapOverlay = document.getElementById('swap-unit-overlay');
  if (swapOverlay) {
    swapOverlay.addEventListener('click', function (e) {
      if (e.target === swapOverlay) closeSwapUnitModal();
    });
  }

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
  // Escape key closes modal
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      var overlay = document.getElementById('modal-overlay');
      if (overlay && overlay.style.display !== 'none') {
        hideModal();
      }
    }
  });
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

    // Add bank residents to waiting bank
    var bankAdded = 0;
    for (var i = 0; i < bank.length; i++) {
      AppState.waitingBank.push(bank[i]);
      bankAdded++;
    }

    // Status message
    var parts = [];
    if (placedAdded > 0) parts.push(placedAdded + ' placed');
    if (bankAdded > 0) parts.push(bankAdded + ' to bank');
    if (placedDuplicates > 0) parts.push(placedDuplicates + ' duplicate(s) skipped');
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

    setUploadStatus(
      'bank',
      'Loaded ' + result.entries.length + ' resident(s) into waiting bank from ' + file.name,
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

  var ws = XLSX.utils.json_to_sheet(rows, { header: ['Name', 'Unit', 'Floorplan', 'Lease Status', 'Scholarship', 'Old Unit'] });

  // Set column widths
  ws['!cols'] = [
    { wch: 28 }, // Name
    { wch: 14 }, // Unit
    { wch: 20 }, // Floorplan
    { wch: 24 }, // Lease Status
    { wch: 22 }, // Scholarship
    { wch: 14 }, // Old Unit
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

  AppState.waitingBank = AppState.waitingBank.filter(function (entry) { return entry._id !== bankEntry._id; });

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
