/* ============================================================
   config.js — Centralized Configuration
   Contains:
     0. App version (cache-busting)
     1. Color configuration for lease status and scholarship
     2. Map registry for local SVG files
     3. Building/floor display labels
     4. Unit parsing helpers (building/floor only — NOT floorplan type)
     5. Color persistence
     6. Approved bank unit types
     7. Allowed lease statuses and scholarships
     8. Delete confirmation constants
   ============================================================ */

/* ------------------------------------------------------------------
   0. APP VERSION — CACHE BUSTING
   Increment this value whenever you deploy updated JS, CSS, or SVG
   files. This forces browsers to fetch the latest versions instead
   of serving stale cached copies.
   Format: YYYYMMDD.NN (date + optional revision number)
   ------------------------------------------------------------------ */
const APP_VERSION = '20260321.1';

/* ------------------------------------------------------------------
   1. COLOR CONFIGURATION
   Edit colors here to change the entire app's color scheme.
   All color assignments flow from this single object.
   ------------------------------------------------------------------ */
const COLOR_CONFIG = {
  /* --- Base Lease Status Colors --- */
  leaseStatus: {
    'RENEWAL':                       '#22c55e',  // green
    'NEW LEASE':                     '#3b82f6',  // blue
    'RENEWAL TRANSFER':              '#eab308',  // yellow
    'NEW LEASE - MOMI':              '#3b82f6',  // blue (same as New Lease)
    'NEW LEASE - PARTIALLY COMPLETE':'#60a5fa',  // light blue
    'NEW LEASE - COMPLETE':          '#2563eb',  // dark blue
    'NEW LEASE - STARTED':           '#93c5fd',  // pale blue
    'RENEWAL PENDING - STARTED':     '#ef4444',  // red
    'RENEWAL PENDING - NOT STARTED': '#ef4444',  // red
    'BLANK':                         '#d1d5db',  // medium gray
  },

  /* --- Scholarship Override Colors ---
     These REPLACE lease-status colors when present.
     Only listed scholarships get overrides; all others use lease-status color. */
  scholarship: {
    'FIRST ASCENT':  '#f97316',  // orange
    'HINKLEY':       '#7E57C2',  // purple
    'RBL':           '#14b8a6',  // teal
    'ONE REFUGEE':   '#ec4899',  // pink
    'BOYER':         '#0ea5e9',  // sky blue
  },

  /* --- Shared Unit Occupancy Colors ---
     For multi-bed units (e.g. 3BR/3BA D003 with beds D003-A/B/C).
     Applied to the parent unit SVG element based on child bed occupancy. */
  sharedUnit: {
    blank:   '#e5e7eb',  // light neutral gray — no beds occupied (distinct from unit blank)
    partial: '#fb923c',  // light orange — some beds occupied but not all (distinct from First Ascent #f97316)
    full:    '#6b7280',  // dark gray — all beds occupied
  },

  /* --- Blank / Unassigned Unit Color --- */
  blank: '#f3f4f6',  // very light gray

  /* --- Stroke color for unit outlines --- */
  stroke: '#94a3b8',
  strokeWidth: 0.5,
};

/* ------------------------------------------------------------------
   Legend definitions used by UI module
   ------------------------------------------------------------------ */
const PATTERN_FILL_STATUSES = [
  'RENEWAL PENDING - STARTED',
  'RENEWAL PENDING - NOT STARTED',
  'NEW LEASE - PARTIALLY COMPLETE',
  'NEW LEASE - COMPLETE',
  'NEW LEASE - STARTED',
];

function isPatternFillStatus(leaseStatus) {
  if (!leaseStatus) return false;
  return PATTERN_FILL_STATUSES.indexOf(leaseStatus.toUpperCase().trim()) !== -1;
}

const LEGEND_ITEMS = [
  { label: 'Renewal',                    color: COLOR_CONFIG.leaseStatus['RENEWAL'] },
  { label: 'New Lease',                  color: COLOR_CONFIG.leaseStatus['NEW LEASE'] },
  { label: 'Renewal Transfer',           color: COLOR_CONFIG.leaseStatus['RENEWAL TRANSFER'] },
  { label: 'New Lease - MOMI',           color: COLOR_CONFIG.leaseStatus['NEW LEASE - MOMI'] },
  { label: 'New Lease - Part. Complete',  color: COLOR_CONFIG.leaseStatus['NEW LEASE - PARTIALLY COMPLETE'], pattern: true },
  { label: 'New Lease - Complete',        color: COLOR_CONFIG.leaseStatus['NEW LEASE - COMPLETE'], pattern: true },
  { label: 'New Lease - Started',         color: COLOR_CONFIG.leaseStatus['NEW LEASE - STARTED'], pattern: true },
  { label: 'Renewal Pending - Started',   color: COLOR_CONFIG.leaseStatus['RENEWAL PENDING - STARTED'], pattern: true },
  { label: 'Renewal Pending - Not Start', color: COLOR_CONFIG.leaseStatus['RENEWAL PENDING - NOT STARTED'], pattern: true },
  { label: 'First Ascent',       color: COLOR_CONFIG.scholarship['FIRST ASCENT'] },
  { label: 'Hinkley',            color: COLOR_CONFIG.scholarship['HINKLEY'] },
  { label: 'RBL',                color: COLOR_CONFIG.scholarship['RBL'] },
  { label: 'One Refugee',        color: COLOR_CONFIG.scholarship['ONE REFUGEE'] },
  { label: 'Boyer',              color: COLOR_CONFIG.scholarship['BOYER'] },
  { label: 'Shared - Blank',     color: COLOR_CONFIG.sharedUnit.blank },
  { label: 'Shared - Partial',   color: COLOR_CONFIG.sharedUnit.partial },
  { label: 'Shared - Full',      color: COLOR_CONFIG.sharedUnit.full },
  { label: 'Blank / Unassigned', color: COLOR_CONFIG.blank },
];

/* ------------------------------------------------------------------
   2. MAP REGISTRY
   Central registry of all local SVG maps.
   To add a new building or floor, add an entry here and place
   the SVG file in the /Map folder.
   ------------------------------------------------------------------ */
const MAP_REGISTRY = [
  {
    buildingKey: 'A',
    floor: 1,
    label: 'Building A — Floor 1',
    svgPath: 'map/Building-A-Floor-1.svg',
  },
  {
    buildingKey: 'A',
    floor: 2,
    label: 'Building A — Floor 2',
    svgPath: 'map/Building-A-Floor-2.svg',
  },
  {
    buildingKey: 'A',
    floor: 3,
    label: 'Building A — Floor 3',
    svgPath: 'map/Building-A-Floor-3.svg',
  },
  {
    buildingKey: 'A',
    floor: 4,
    label: 'Building A — Floor 4',
    svgPath: 'map/Building-A-Floor-4.svg',
  },
  {
    buildingKey: 'B',
    floor: 1,
    label: 'Building B — Floor 1',
    svgPath: 'map/Building-B-Floor-1.svg',
  },
  {
    buildingKey: 'B',
    floor: 2,
    label: 'Building B — Floor 2',
    svgPath: 'map/Building-B-Floor-2.svg',
  },
  {
    buildingKey: 'B',
    floor: 3,
    label: 'Building B — Floor 3',
    svgPath: 'map/Building-B-Floor-3.svg',
  },
  {
    buildingKey: 'B',
    floor: 4,
    label: 'Building B — Floor 4',
    svgPath: 'map/Building-B-Floor-4.svg',
  },
  {
    buildingKey: 'C',
    floor: 0,
    label: 'Building C — Ground Floor',
    svgPath: 'map/Building-C-Floor-GROUND.svg',
  },
  {
    buildingKey: 'C',
    floor: 1,
    label: 'Building C — Floor 1',
    svgPath: 'map/Building-C-Floor-1.svg',
  },
  {
    buildingKey: 'C',
    floor: 2,
    label: 'Building C — Floor 2',
    svgPath: 'map/Building-C-Floor-2.svg',
  },
  {
    buildingKey: 'C',
    floor: 3,
    label: 'Building C — Floor 3',
    svgPath: 'map/Building-C-Floor-3.svg',
  },
  {
    buildingKey: 'C',
    floor: 4,
    label: 'Building C — Floor 4',
    svgPath: 'map/Building-C-Floor-4.svg',
  },
  {
    buildingKey: 'C',
    floor: 5,
    label: 'Building C — Floor 5',
    svgPath: 'map/Building-C-Floor-5.svg',
  },
  {
    buildingKey: 'D',
    floor: 0,
    label: 'Building D — Ground Floor',
    svgPath: 'map/Building-D-Floor-GROUND FLOOR.svg',
  },
  {
    buildingKey: 'D',
    floor: 1,
    label: 'Building D — Floor 1',
    svgPath: 'map/Building-D-Floor-1.svg',
  },
  {
    buildingKey: 'D',
    floor: 2,
    label: 'Building D — Floor 2',
    svgPath: 'map/Building-D-Floor-2.svg',
  },
  {
    buildingKey: 'D',
    floor: 3,
    label: 'Building D — Floor 3',
    svgPath: 'map/Building-D-Floor-3.svg',
  },
  {
    buildingKey: 'D',
    floor: 4,
    label: 'Building D — Floor 4',
    svgPath: 'map/Building-D-Floor-4.svg',
  },
];

/* ------------------------------------------------------------------
   3. BUILDING / FLOOR DISPLAY LABELS
   Derived automatically from MAP_REGISTRY.
   ------------------------------------------------------------------ */

function getRegisteredBuildings() {
  const set = new Set();
  for (const entry of MAP_REGISTRY) {
    set.add(entry.buildingKey);
  }
  return Array.from(set).sort();
}

function getFloorsForBuilding(buildingKey) {
  const floors = [];
  for (const entry of MAP_REGISTRY) {
    if (entry.buildingKey === buildingKey) {
      floors.push(entry.floor);
    }
  }
  return floors.sort((a, b) => a - b);
}

function getRegistryEntry(buildingKey, floor) {
  return MAP_REGISTRY.find(
    (e) => e.buildingKey === buildingKey && e.floor === floor
  ) || null;
}

function getBuildingLabel(buildingKey) {
  return 'Building ' + buildingKey;
}

function getFloorLabel(floor) {
  if (floor === 0) return 'Ground Floor';
  return 'Floor ' + floor;
}

/* ------------------------------------------------------------------
   4. UNIT PARSING HELPERS
   Isolates all logic for extracting building and floor from a unit
   ID string. These are ONLY used for building/floor navigation.
   Floorplan type is determined by inventory.UnitType — NOT by
   parsing the unit number.
   ------------------------------------------------------------------ */

/**
 * Parse a unit ID into its building, floor, and unit number components.
 *
 * Current convention (Ivory House):
 *   Unit ID format: {BuildingLetter}{FloorDigit}{UnitNumber}
 *   Examples: A101 → Building A, Floor 1, Unit 01
 *             A232 → Building A, Floor 2, Unit 32
 *             B315 → Building B, Floor 3, Unit 15
 *
 * @param {string} unitId - Raw unit identifier (e.g. "A101")
 * @returns {{ building: string|null, floor: number|null, unitNum: string|null, ambiguous: boolean }}
 */
function parseUnitId(unitId) {
  if (!unitId || typeof unitId !== 'string') {
    return { building: null, floor: null, unitNum: null, ambiguous: true };
  }

  const trimmed = unitId.trim().toUpperCase();

  // Pattern: one letter + one digit (floor) + one or more digits (unit number)
  const match = trimmed.match(/^([A-Z])(\d)(\d{2,})$/);

  if (!match) {
    return { building: null, floor: null, unitNum: null, ambiguous: true };
  }

  return {
    building: match[1],
    floor: parseInt(match[2]),
    unitNum: match[3],
    ambiguous: false,
  };
}

function unitBelongsToBuilding(unitId, buildingKey) {
  const parsed = parseUnitId(unitId);
  if (parsed.ambiguous) return false;
  return parsed.building === buildingKey.toUpperCase();
}

function unitBelongsToFloor(unitId, buildingKey, floor) {
  const parsed = parseUnitId(unitId);
  if (parsed.ambiguous) return false;
  return parsed.building === buildingKey.toUpperCase() && parsed.floor === floor;
}

/* ------------------------------------------------------------------
   5. COLOR PERSISTENCE
   Save/restore custom colors via API (primary) with localStorage cache.
   Colors are loaded from the API in loadPersistedProject() (app.js)
   and restored via _restoreColorsFromData(). persistColors() saves
   to both localStorage (fast) and API (durable).
   ------------------------------------------------------------------ */
const COLOR_STORAGE_KEY = 'propertySiteMap_colors';
const COLOR_API_BASE = '/api/placement-planner/colors';

/** Debounce timer for color API persist */
var _colorPersistTimer = null;

function _buildColorData() {
  return {
    leaseStatus: { ...COLOR_CONFIG.leaseStatus },
    scholarship: { ...COLOR_CONFIG.scholarship },
    sharedUnit: { ...COLOR_CONFIG.sharedUnit },
    blank: COLOR_CONFIG.blank,
    stroke: COLOR_CONFIG.stroke,
    strokeWidth: COLOR_CONFIG.strokeWidth,
  };
}

function persistColors() {
  // Write to localStorage immediately (fast cache)
  try {
    const data = _buildColorData();
    localStorage.setItem(COLOR_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to persist colors to localStorage:', e);
  }

  // Debounce the API call (500ms)
  if (_colorPersistTimer) clearTimeout(_colorPersistTimer);
  _colorPersistTimer = setTimeout(function () {
    const data = _buildColorData();
    fetch(COLOR_API_BASE, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ colors: data }),
    }).then(function (res) {
      if (!res.ok) {
        console.warn('API color persist failed: HTTP ' + res.status);
        if (typeof showNotification === 'function') {
          showNotification('Color changes may not be visible to other users (save failed).', 'error');
        }
      }
    }).catch(function (err) {
      console.warn('API color persist error:', err);
      if (typeof showNotification === 'function') {
        showNotification('Color changes may not be visible to other users (network error).', 'error');
      }
    });
  }, 500);
}

/**
 * Load persisted colors from localStorage cache.
 * API-sourced colors are restored via _restoreColorsFromData() during
 * loadPersistedProject() in app.js. This function handles the fast
 * localStorage path for initial render.
 */
function loadPersistedColors() {
  try {
    const raw = localStorage.getItem(COLOR_STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    _restoreColorsFromData(data);
  } catch (e) {
    console.warn('Failed to load persisted colors:', e);
  }
}

/**
 * Restore color configuration from a data object (API or localStorage).
 * Called by loadPersistedColors() and by app.js after API load.
 */
function _restoreColorsFromData(data) {
  if (!data || typeof data !== 'object') return;

  if (data.leaseStatus) {
    for (const key of Object.keys(data.leaseStatus)) {
      COLOR_CONFIG.leaseStatus[key] = data.leaseStatus[key];
    }
  }
  if (data.scholarship) {
    for (const key of Object.keys(data.scholarship)) {
      COLOR_CONFIG.scholarship[key] = data.scholarship[key];
    }
  }
  if (data.sharedUnit) {
    for (const key of Object.keys(data.sharedUnit)) {
      COLOR_CONFIG.sharedUnit[key] = data.sharedUnit[key];
    }
  }
  if (data.blank) COLOR_CONFIG.blank = data.blank;
  if (data.stroke) COLOR_CONFIG.stroke = data.stroke;
  if (data.strokeWidth != null) COLOR_CONFIG.strokeWidth = data.strokeWidth;

  // Also update localStorage cache
  try {
    localStorage.setItem(COLOR_STORAGE_KEY, JSON.stringify(data));
  } catch (e) { /* ignore */ }

  rebuildLegendItems();
}

function rebuildLegendItems() {
  LEGEND_ITEMS.length = 0;
  LEGEND_ITEMS.push(
    { label: 'Renewal',                    color: COLOR_CONFIG.leaseStatus['RENEWAL'] },
    { label: 'New Lease',                  color: COLOR_CONFIG.leaseStatus['NEW LEASE'] },
    { label: 'Renewal Transfer',           color: COLOR_CONFIG.leaseStatus['RENEWAL TRANSFER'] },
    { label: 'New Lease - MOMI',           color: COLOR_CONFIG.leaseStatus['NEW LEASE - MOMI'] },
    { label: 'New Lease - Part. Complete',  color: COLOR_CONFIG.leaseStatus['NEW LEASE - PARTIALLY COMPLETE'], pattern: true },
    { label: 'New Lease - Complete',        color: COLOR_CONFIG.leaseStatus['NEW LEASE - COMPLETE'], pattern: true },
    { label: 'New Lease - Started',         color: COLOR_CONFIG.leaseStatus['NEW LEASE - STARTED'], pattern: true },
    { label: 'Renewal Pending - Started',   color: COLOR_CONFIG.leaseStatus['RENEWAL PENDING - STARTED'], pattern: true },
    { label: 'Renewal Pending - Not Start', color: COLOR_CONFIG.leaseStatus['RENEWAL PENDING - NOT STARTED'], pattern: true },
    { label: 'First Ascent',       color: COLOR_CONFIG.scholarship['FIRST ASCENT'] },
    { label: 'Hinkley',            color: COLOR_CONFIG.scholarship['HINKLEY'] },
    { label: 'RBL',                color: COLOR_CONFIG.scholarship['RBL'] },
    { label: 'One Refugee',        color: COLOR_CONFIG.scholarship['ONE REFUGEE'] },
    { label: 'Boyer',              color: COLOR_CONFIG.scholarship['BOYER'] },
    { label: 'Shared - Blank',     color: COLOR_CONFIG.sharedUnit.blank },
    { label: 'Shared - Partial',   color: COLOR_CONFIG.sharedUnit.partial },
    { label: 'Shared - Full',      color: COLOR_CONFIG.sharedUnit.full },
    { label: 'Blank / Unassigned', color: COLOR_CONFIG.blank }
  );
}

/* ------------------------------------------------------------------
   6. APPROVED BANK UNIT TYPES
   The resident waiting bank groups residents by Unit Type.
   Only these exact unit type labels are accepted on import.
   ------------------------------------------------------------------ */
const APPROVED_BANK_UNIT_TYPES = [
  '3BR/3BA - D1',
  'Studio - A1',
  'Studio - A2',
  'Studio - B1',
  'Studio - C1',
  'Studio - C2',
  'Studio - C3',
];

function isApprovedBankUnitType(unitType) {
  if (!unitType) return false;
  const normalized = unitType.trim().toUpperCase();
  return APPROVED_BANK_UNIT_TYPES.some((t) => t.toUpperCase() === normalized);
}

/* ------------------------------------------------------------------
   7. ALLOWED LEASE STATUSES AND SCHOLARSHIPS
   Canonical lists used for validation and dropdowns.
   ------------------------------------------------------------------ */
const ALLOWED_LEASE_STATUSES = [
  'Renewal',
  'Renewal Transfer',
  'New Lease',
  'New Lease - Partially Complete',
  'New Lease - Complete',
  'New Lease - Started',
  'Renewal Pending - Started',
  'Renewal Pending - Not Started',
  'New Lease - MOMI',
];

const ALLOWED_SCHOLARSHIPS = [
  'SCHOLARSHIP',
  'BOYER',
  'HINKLEY',
  'RBL',
  'CHILD',
  'IVORY HOUSING',
  'FIRST ASCENT',
  'ONE REFUGEE',
  'MAXWELL',
  'GOCHNOUR',
  'SALT LAKE CITY',
  'MOSCRIP',
  'IVORY STUDENT SUPPORT FUND',
  'NONE',
];

/* ------------------------------------------------------------------
   8. DELETE CONFIRMATION CONSTANTS
   ------------------------------------------------------------------ */
const DELETE_CONFIRMATION_PHRASE = 'DELETE';
const DELETE_MODES = [
  { value: 'all',         label: 'All Residents' },
  { value: 'floorplan',   label: 'By Floorplan Type' },
  { value: 'scholarship', label: 'By Scholarship' },
  { value: 'lease',       label: 'By Lease Type' },
];

/* ------------------------------------------------------------------
   9. FLOORPLAN DISPLAY ORDER & PRELEASE PROGRESS
   Preferred display order for floorplan-level reporting.
   Floorplans not in this list appear after, sorted alphabetically.
   ------------------------------------------------------------------ */
const FLOORPLAN_DISPLAY_ORDER = [
  '3BR/3BA - D1',
  'Studio - A1',
  'Studio - A2',
  'Studio - B1',
  'Studio - C1',
  'Studio - C2',
  'Studio - C3',
];

/**
 * Lease statuses that count as "New Lease" for prelease progress.
 */
const PRELEASE_NEW_LEASE_STATUSES = [
  'New Lease',
  'New Lease - MOMI',
  'New Lease - Partially Complete',
  'New Lease - Complete',
  'New Lease - Started',
];

/**
 * Lease statuses that count as "Renewal" for prelease progress.
 * Renewal Pending - Started is counted under Renewal for progress reporting.
 */
const PRELEASE_RENEWAL_STATUSES = [
  'Renewal',
  'Renewal Transfer',
  'Renewal Pending - Started',
  'Renewal Pending - Not Started',
];

/**
 * Check if a lease status counts as New Lease for prelease progress.
 * @param {string} leaseStatus
 * @returns {boolean}
 */
function isNewLeaseForProgress(leaseStatus) {
  if (!leaseStatus) return false;
  const upper = leaseStatus.trim().toUpperCase();
  return PRELEASE_NEW_LEASE_STATUSES.some((s) => s.toUpperCase() === upper);
}

/**
 * Check if a lease status counts as Renewal for prelease progress.
 * @param {string} leaseStatus
 * @returns {boolean}
 */
function isRenewalForProgress(leaseStatus) {
  if (!leaseStatus) return false;
  const upper = leaseStatus.trim().toUpperCase();
  return PRELEASE_RENEWAL_STATUSES.some((s) => s.toUpperCase() === upper);
}

/**
 * Sort floorplan names using the preferred display order.
 * Known floorplans come first in FLOORPLAN_DISPLAY_ORDER order,
 * unknown floorplans come after, sorted alphabetically.
 * @param {string[]} floorplans
 * @returns {string[]}
 */
function sortFloorplansByDisplayOrder(floorplans) {
  const orderMap = new Map();
  FLOORPLAN_DISPLAY_ORDER.forEach((fp, i) => orderMap.set(fp.toUpperCase(), i));

  return [...floorplans].sort((a, b) => {
    const aIdx = orderMap.has(a.toUpperCase()) ? orderMap.get(a.toUpperCase()) : 9999;
    const bIdx = orderMap.has(b.toUpperCase()) ? orderMap.get(b.toUpperCase()) : 9999;
    if (aIdx !== bIdx) return aIdx - bIdx;
    return a.localeCompare(b);
  });
}

/* ------------------------------------------------------------------
   10. ENTRATA PRELEASE IMPORT CONFIGURATION
   Constants and mappings used by the Prelease report parser.
   ------------------------------------------------------------------ */

/**
 * Filename pattern for Entrata Prelease exports.
 * Matches: Prelease.xlsx, Prelease (1).xlsx, Prelease (5).xlsx, etc.
 */
const PRELEASE_FILENAME_PATTERN = /^Prelease(\s*\(\d+\))?\.xlsx$/i;

/**
 * Row (1-based) in the Prelease report that contains column headers.
 * B21 = Bldg-Unit, C21 = Unit Type, E21 = Resident
 */
const PRELEASE_HEADER_ROW = 21;

/**
 * Expected Prelease header values used for header-inspection detection.
 * Column letters mapped to 0-based column indices:
 *   B = index 1, C = index 2, E = index 4
 */
const PRELEASE_EXPECTED_HEADERS = {
  'Bldg-Unit':  1,  // Column B (0-based index 1)
  'Unit Type':  2,  // Column C (0-based index 2)
  'Resident':   4,  // Column E (0-based index 4)
};

/**
 * The lease status column in the Prelease report.
 * Based on standard Entrata Prelease layout, the lease status is in column H (0-based index 7).
 * This is the "Lease Status" column that appears after Resident, Occupant, Move-in columns.
 */
const PRELEASE_LEASE_STATUS_COL_INDEX = 7;

/**
 * Building prefixes to strip from the raw Bldg-Unit field.
 * After removing the prefix, the remainder is the unit ID.
 */
const PRELEASE_BUILDING_PREFIXES = [
  'Building A-',
  'Building B-',
  'Building C-',
  'Building D-',
];

/**
 * Entrata Prelease lease status → App lease status mapping.
 * Keys are the raw Entrata values (case-insensitive match).
 * Values are the mapped app lease statuses, or null to skip import.
 */
const PRELEASE_LEASE_STATUS_MAP = {
  'Lease Approved':                      'New Lease',
  'Lease Completed':                     'New Lease',
  'Lease Partially Completed':           'New Lease',
  'Lease Started':                       null,         // DO NOT IMPORT TO BANK
  'Renewal Lease Approved':              'Renewal',
  'Renewal Lease Completed':             'Renewal',
  'Renewal Lease Partially Completed':   'Renewal',
  'Renewal Lease Started':               'Renewal Pending - Started',
};

/**
 * Check if a raw Entrata lease status maps to a "do not import to bank" status.
 * @param {string} rawStatus
 * @returns {boolean}
 */
function isPreleaseStatusSkippedForBank(rawStatus) {
  if (!rawStatus) return true;
  const normalized = rawStatus.trim();
  for (const [key, val] of Object.entries(PRELEASE_LEASE_STATUS_MAP)) {
    if (key.toUpperCase() === normalized.toUpperCase()) {
      return val === null;
    }
  }
  return false;
}

/**
 * Map a raw Entrata Prelease lease status to the app's canonical status.
 * Returns the mapped status string, or null if the status should be skipped.
 * Returns undefined if the raw status is not recognized.
 * @param {string} rawStatus
 * @returns {string|null|undefined}
 */
function mapPreleaseLeaseStatus(rawStatus) {
  if (!rawStatus) return undefined;
  const normalized = rawStatus.trim();
  for (const [key, val] of Object.entries(PRELEASE_LEASE_STATUS_MAP)) {
    if (key.toUpperCase() === normalized.toUpperCase()) {
      return val;
    }
  }
  return undefined;
}

/* ------------------------------------------------------------------
   11. NAVIGATION CONFIGURATION
   Sidebar navigation items for the refactored UI.
   ------------------------------------------------------------------ */
const NAV_SECTIONS = [
  { id: 'map-viewer', label: 'Map Viewer', icon: 'map' },
  { id: 'import-data', label: 'Import Data', icon: 'upload' },
  { id: 'scholarships', label: 'Scholarships', icon: 'award' },
  { id: 'prelease-progress', label: 'Prelease Progress', icon: 'bar-chart' },
  { id: 'debug', label: 'Debug', icon: 'terminal' },
  { id: 'backup-restore', label: 'Backup &amp; Restore', icon: 'save' }
];

/* ------------------------------------------------------------------
   12. IMPORT TYPE DEFINITIONS
   Metadata for each spreadsheet import type. Column names and storage
   keys match the existing parsers in excel.js, inventory.js, and ui.js.
   ------------------------------------------------------------------ */
const IMPORT_TYPES = [
  {
    id: 'inventory',
    label: 'Inventory',
    description: 'Upload the unit inventory spreadsheet containing all units and their floorplan types.',
    requiredColumns: ['Unit Number', 'Unit Type'],
    exampleRow: { 'Unit Number': 'A101', 'Unit Type': 'Studio - A1' },
    storageKey: 'inventory',
    clearLabel: 'Clear Inventory Data'
  },
  {
    id: 'residents',
    label: 'Placed Residents',
    description: 'Upload the placed residents spreadsheet with unit assignments, lease status, and scholarship info.',
    requiredColumns: ['Resident_Name', 'Unit_Assigned', 'Lease_Status', 'Scholarship'],
    exampleRow: { 'Resident_Name': 'John Doe', 'Unit_Assigned': 'A101', 'Lease_Status': 'Renewal', 'Scholarship': 'NONE' },
    storageKey: 'residents',
    clearLabel: 'Clear Placed Residents'
  },
  {
    id: 'bank',
    label: 'Bank List',
    description: 'Upload the waiting bank list of residents awaiting unit assignment.',
    requiredColumns: ['Unit Type', 'Name', 'Lease status'],
    exampleRow: { 'Unit Type': 'Studio - A1', 'Name': 'Jane Smith', 'Lease status': 'New Lease' },
    storageKey: 'waitingBank',
    clearLabel: 'Clear Bank List'
  },
  {
    id: 'scholarships',
    label: 'Scholarships',
    description: 'Upload scholarship assignment data to match residents with scholarship programs.',
    requiredColumns: ['Name', 'Scholarship Awarded'],
    exampleRow: { 'Name': 'John Doe', 'Scholarship Awarded': 'FIRST ASCENT' },
    storageKey: 'unassignedScholarships',
    clearLabel: 'Clear Scholarship Data'
  },
  {
    id: 'entrata',
    label: 'Entrata Prelease',
    description: 'Import prelease data directly from an Entrata Prelease export spreadsheet. Residents are routed to placed or bank automatically.',
    requiredColumns: ['Bldg-Unit', 'Unit Type', 'Resident', 'Lease Status'],
    exampleRow: { 'Bldg-Unit': 'Building A-A108', 'Unit Type': 'Studio - A1', 'Resident': 'SMITH, JOHN', 'Lease Status': 'Lease Approved' },
    storageKey: 'entrataImport',
    clearLabel: 'Clear Entrata Data'
  }
];

/* ------------------------------------------------------------------
   13. DISPLAY OPTION DEFAULTS
   Default values for map display toggles. Property names match
   AppState fields used in app.js.
   ------------------------------------------------------------------ */
const DISPLAY_OPTION_DEFAULTS = {
  showNames: false,
  scholarshipOnly: false
};

/* ------------------------------------------------------------------
   14. DEFAULT VIEW
   The navigation section shown on initial load.
   ------------------------------------------------------------------ */
const DEFAULT_VIEW = 'map-viewer';
