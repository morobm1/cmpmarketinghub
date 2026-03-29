/* ============================================================
   map.js — SVG Map Handling Module
   Loads SVG files (local or uploaded), matches units to resident
   data, applies colors, inserts labels, and binds click events.
   Color config and map registry are in config.js.
   ============================================================ */

/* ------------------------------------------------------------------
   SVG LOADING — LOCAL REGISTRY FILES
   ------------------------------------------------------------------ */

/**
 * Fetch and parse a local SVG file by its path from the map registry.
 * @param {string} svgPath
 * @param {string} label
 * @returns {Promise<{name: string, svgElement: SVGSVGElement, svgText: string}>}
 */
function fetchLocalSVG(svgPath, label) {
  var cacheBustPath = svgPath + '?v=' + (typeof APP_VERSION !== 'undefined' ? APP_VERSION : Date.now());
  return fetch(cacheBustPath)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to load SVG "${label}" from "${svgPath}": HTTP ${response.status}`);
      }
      return response.text();
    })
    .then((svgText) => {
      return parseSVGString(svgText, label);
    });
}

/**
 * Load the SVG for a given building + floor from the MAP_REGISTRY.
 * Returns null (with a warning) if the registry entry or file is missing.
 */
async function loadMapFromRegistry(buildingKey, floor) {
  const entry = getRegistryEntry(buildingKey, floor);

  if (!entry) {
    console.warn(`No map registry entry for ${getBuildingLabel(buildingKey)} ${getFloorLabel(floor)}.`);
    return null;
  }

  try {
    const result = await fetchLocalSVG(entry.svgPath, entry.label);
    return result;
  } catch (err) {
    console.warn(`Failed to load map: ${err.message}`);
    return null;
  }
}

/**
 * Preload all SVG maps from the registry.
 * Returns a Map keyed by "buildingKey:floor" with the parsed SVG data.
 */
async function preloadAllMaps() {
  const cache = new Map();
  const errors = [];

  for (const entry of MAP_REGISTRY) {
    const key = entry.buildingKey + ':' + entry.floor;
    try {
      const result = await fetchLocalSVG(entry.svgPath, entry.label);
      cache.set(key, result);
    } catch (err) {
      errors.push(err.message);
    }
  }

  if (errors.length > 0) {
    console.warn('Map preload errors:', errors);
  }

  return cache;
}

/* ------------------------------------------------------------------
   SVG PARSING — FILE UPLOAD + STRING
   ------------------------------------------------------------------ */

function parseSVGFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`Failed to read SVG file: ${file.name}`));
    reader.onload = (e) => {
      try {
        const rawText = e.target.result;
        const result = parseSVGString(rawText, file.name);
        resolve(result);
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsText(file);
  });
}

function parseSVGString(svgText, name) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, 'image/svg+xml');
  const errorNode = doc.querySelector('parsererror');
  if (errorNode) {
    throw new Error(`SVG parse error in "${name}": ${errorNode.textContent.slice(0, 120)}`);
  }
  const svg = doc.documentElement;
  return { name, svgElement: svg, svgText };
}

/* ------------------------------------------------------------------
   MAP RENDERING
   ------------------------------------------------------------------ */

/**
 * Render an SVG into any container element, apply colors and labels.
 * This is the core rendering function used by both the main map and
 * the split-view modal map.
 *
 * @param {HTMLElement} container - Target DOM element to render into
 * @param {SVGSVGElement} svgElement - The SVG DOM element (will be cloned)
 * @param {Map<string, object>} residents - Resident lookup keyed by UPPERCASE Unit_Assigned
 * @param {object} options - { showNames, scholarshipOnly, inventory, onUnitClick }
 * @returns {{ unmatchedUnits: string[], svgUnitIds: Set<string> }}
 */
function renderMapIntoContainer(container, svgElement, residents, options = {}) {
  const { showNames = false, scholarshipOnly = false, inventory = null, onUnitClick = null } = options;

  container.innerHTML = '';
  container.style.backgroundImage = 'none';
  container.style.display = 'flex';

  // Clone SVG to avoid mutating the stored original
  const svg = svgElement.cloneNode(true);

  // Inject SVG pattern definitions for hatched/patterned lease statuses
  _injectPatternDefs(svg);

  // Ensure SVG is responsive
  svg.removeAttribute('width');
  svg.removeAttribute('height');
  if (!svg.getAttribute('viewBox')) {
    const w = svgElement.getAttribute('width') || 800;
    const h = svgElement.getAttribute('height') || 600;
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  }
  svg.style.width = '100%';
  svg.style.height = '100%';

  const allWithId = svg.querySelectorAll('[id]');

  const matchedUnits = new Set();
  const svgUnitIds = new Set();

  allWithId.forEach((el) => {
    const rawId = el.id.trim();
    if (!rawId) return;
    const normalizedId = rawId.toUpperCase();
    svgUnitIds.add(normalizedId);

    const resident = residents.get(normalizedId);

    el.setAttribute('data-unit', rawId);

    if (resident) {
      matchedUnits.add(normalizedId);
      const fillColor = getUnitColor(resident, scholarshipOnly);
      const leaseUpper = (resident.Lease_Status || '').toUpperCase().trim();
      const scholarship = (resident.Scholarship || '').toUpperCase().trim();
      const hasScholarshipOverride = scholarship && scholarship !== 'NONE' && COLOR_CONFIG.scholarship[scholarship];

      if (!hasScholarshipOverride && !scholarshipOnly && isPatternFillStatus(resident.Lease_Status)) {
        var patternId = _getPatternIdForStatus(leaseUpper);
        if (patternId) {
          el.style.fill = 'url(#' + patternId + ')';
        } else {
          el.style.fill = fillColor;
        }
      } else {
        el.style.fill = fillColor;
      }
      el.style.stroke = COLOR_CONFIG.stroke;
      el.style.strokeWidth = COLOR_CONFIG.strokeWidth;

      const tooltipText = `${resident.Resident_Name}\nUnit: ${resident.Unit_Assigned}\nLease: ${resident.Lease_Status}\nScholarship: ${resident.Scholarship || 'None'}`;
      setTooltip(el, tooltipText);

      if (showNames) {
        addUnitLabel(svg, el, resident.Resident_Name, fillColor);
      }
    } else {
      // Blank / unassigned unit
      el.style.fill = COLOR_CONFIG.blank;
      el.style.stroke = COLOR_CONFIG.stroke;
      el.style.strokeWidth = COLOR_CONFIG.strokeWidth;

      if (scholarshipOnly) {
        el.style.fill = COLOR_CONFIG.blank;
        el.style.opacity = '0.4';
      }
    }
  });

  // --- Shared-unit parent coloring pass ---
  // After normal bed-level coloring, compute parent-unit occupancy and apply color.
  // CRITICAL: Parent and child bed elements must be targeted by EXACT ID only.
  // Never fall back from a missing parent to a bed element or vice versa.
  if (inventory && inventory.length > 0) {
    const parentUnits = discoverParentUnitsFromInventory(inventory);
    const debugWarnings = [];

    // Build a strict ID -> element map for exact lookups (no fallbacks)
    const svgIdMap = new Map();
    allWithId.forEach((el) => {
      const eid = el.id.trim();
      if (!eid) return;
      const upper = eid.toUpperCase();
      // If duplicate IDs exist, warn and keep first occurrence
      if (svgIdMap.has(upper)) {
        debugWarnings.push(`Duplicate SVG ID detected: "${eid}"`);
      } else {
        svgIdMap.set(upper, el);
      }
    });

    parentUnits.forEach((parentUpper) => {
      // STRICT exact ID lookup — no querySelector fallback, no partial matching
      const parentEl = svgIdMap.get(parentUpper);

      if (!parentEl) {
        // Parent SVG element not on this floor — not an error, just skip
        return;
      }

      // Safety check: the element we found must NOT be a bed assignment itself
      if (isBedAssignment(parentEl.id)) {
        debugWarnings.push(`Parent lookup for "${parentUpper}" resolved to bed element "${parentEl.id}" — skipped to prevent collision.`);
        return;
      }

      const siblings = getBedSiblingsFromInventory(parentUpper, inventory);
      if (siblings.length === 0) {
        debugWarnings.push(`Shared parent "${parentUpper}" found in SVG but no bed children in inventory.`);
        return;
      }

      // Verify all expected bed SVG elements exist
      for (const bed of siblings) {
        if (!svgIdMap.has(bed.toUpperCase())) {
          debugWarnings.push(`Expected bed SVG element "${bed}" not found in SVG for parent "${parentUpper}".`);
        }
      }

      const state = getSharedUnitOccupancyState(parentUpper, residents, inventory);

      // Mark parent as shared-unit so it doesn't intercept child bed clicks
      parentEl.setAttribute('data-shared-parent', 'true');

      // CRITICAL: Always explicitly reset parent style to prevent stale colors
      // from previous renders (e.g. old pink/full) bleeding through.
      parentEl.style.opacity = '';
      parentEl.classList.remove('unit-highlight', 'unit-selected');

      if (state === 'blank') {
        parentEl.style.fill = COLOR_CONFIG.sharedUnit.blank;
        parentEl.style.stroke = COLOR_CONFIG.stroke;
        parentEl.style.strokeWidth = COLOR_CONFIG.strokeWidth;
        setTooltip(parentEl, `${parentUpper}\nShared unit: 0/${siblings.length} beds occupied`);
      } else if (state === 'partial') {
        parentEl.style.fill = COLOR_CONFIG.sharedUnit.partial;
        parentEl.style.stroke = COLOR_CONFIG.stroke;
        parentEl.style.strokeWidth = COLOR_CONFIG.strokeWidth;
        const occupied = getBedAssignmentsForParent(parentUpper, residents, inventory)
          .filter((a) => a.resident !== null).length;
        setTooltip(parentEl, `${parentUpper}\nShared unit: ${occupied}/${siblings.length} beds occupied`);
      } else if (state === 'full') {
        parentEl.style.fill = COLOR_CONFIG.sharedUnit.full;
        parentEl.style.stroke = COLOR_CONFIG.stroke;
        parentEl.style.strokeWidth = COLOR_CONFIG.strokeWidth;
        setTooltip(parentEl, `${parentUpper}\nShared unit: All ${siblings.length} beds occupied`);
      } else {
        // Unexpected state — fail safely to blank
        console.warn(`Shared parent "${parentUpper}" returned unexpected occupancy state: "${state}" — defaulting to blank.`);
        parentEl.style.fill = COLOR_CONFIG.sharedUnit.blank;
        parentEl.style.stroke = COLOR_CONFIG.stroke;
        parentEl.style.strokeWidth = COLOR_CONFIG.strokeWidth;
        debugWarnings.push(`Shared parent "${parentUpper}" had unexpected occupancy state "${state}" — defaulted to blank.`);
      }
    });

    if (debugWarnings.length > 0 && typeof addDebugWarnings === 'function') {
      addDebugWarnings(debugWarnings, 'warn');
    }
  }

  container.appendChild(svg);

  // Bind unit click delegation if a callback was provided
  if (onUnitClick) {
    svg.addEventListener('click', function (e) {
      var unitId = getClickableUnitIdFromSvgEvent(e, svg);
      if (unitId) onUnitClick(unitId, e);
    });
  }

  // Find unmatched spreadsheet units (in spreadsheet but not in SVG)
  const unmatchedUnits = [];
  residents.forEach((_, unitKey) => {
    if (!svgUnitIds.has(unitKey)) {
      unmatchedUnits.push(unitKey);
    }
  });

  return { unmatchedUnits, svgUnitIds };
}

/**
 * Render an SVG into the main #map-container. Thin wrapper around
 * renderMapIntoContainer for backward compatibility.
 * @param {SVGSVGElement} svgElement
 * @param {Map<string, object>} residents
 * @param {object} options - { showNames, scholarshipOnly, inventory }
 * @returns {{ unmatchedUnits: string[], svgUnitIds: Set<string> }}
 */
function renderMap(svgElement, residents, options = {}) {
  const container = document.getElementById('map-container');
  const emptyState = document.getElementById('emptyState');
  if (emptyState) emptyState.style.display = 'none';
  return renderMapIntoContainer(container, svgElement, residents, options);
}

/* ------------------------------------------------------------------
   COLOR LOGIC
   Priority:
   1. Scholarship override color wins first
   2. Otherwise use lease-status color
   3. If no resident is assigned, keep the unit blank
   ------------------------------------------------------------------ */

/**
 * Determine the fill color for a unit based on priority rules.
 * @param {object} resident
 * @param {boolean} scholarshipOnly
 * @returns {string} CSS color
 */
function getUnitColor(resident, scholarshipOnly = false) {
  const scholarship = (resident.Scholarship || '').toUpperCase().trim();
  const leaseStatus = (resident.Lease_Status || '').toUpperCase().trim();

  // 1. Check scholarship override (NONE means no override)
  if (scholarship && scholarship !== 'NONE') {
    const scholarshipColor = COLOR_CONFIG.scholarship[scholarship];
    if (scholarshipColor) {
      return scholarshipColor;
    }
  }

  // If scholarshipOnly mode, units without scholarship override get blanked
  if (scholarshipOnly) {
    return COLOR_CONFIG.blank;
  }

  // 2. Lease status color
  if (leaseStatus && COLOR_CONFIG.leaseStatus[leaseStatus]) {
    return COLOR_CONFIG.leaseStatus[leaseStatus];
  }

  // 3. Fallback to blank
  return COLOR_CONFIG.blank;
}

/* ------------------------------------------------------------------
   SVG HELPERS
   ------------------------------------------------------------------ */

function setTooltip(el, text) {
  const existing = el.querySelector('title');
  if (existing) existing.remove();

  const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
  title.textContent = text;
  el.prepend(title);
}

function addUnitLabel(svg, el, name, bgColor) {
  try {
    el.setAttribute('data-label', name);
    el.setAttribute('data-label-bg', bgColor);
  } catch (e) {
    // Silently ignore
  }
}

/**
 * Post-render: add text labels to all units that have data-label in any container.
 * Must be called AFTER the SVG is in the DOM so getBBox() works.
 * @param {HTMLElement} container - The container holding the SVG
 */
function applyLabelsPostRenderInContainer(container) {
  var svg = container.querySelector('svg');
  if (!svg) return;

  var units = svg.querySelectorAll('[data-label]');
  units.forEach(function (el) {
    var name = el.getAttribute('data-label');
    var bgColor = el.getAttribute('data-label-bg') || '#ffffff';

    try {
      var bbox = el.getBBox();
      if (bbox.width < 5 || bbox.height < 5) return;

      var cx = bbox.x + bbox.width / 2;
      var cy = bbox.y + bbox.height / 2;

      var displayName = abbreviateName(name, bbox.width);

      var text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', cx);
      text.setAttribute('y', cy);
      text.classList.add('unit-label');

      if (isColorDark(bgColor)) {
        text.classList.add('dark-bg');
      } else {
        text.classList.add('light-bg');
      }

      var fontSize = Math.min(Math.max(bbox.width / 8, 6), 11);
      text.style.fontSize = fontSize + 'px';

      text.textContent = displayName;
      svg.appendChild(text);
    } catch (e) {
      // getBBox can throw if element is not rendered; silently skip
    }
  });
}

/**
 * Post-render: add text labels in the main #map-container.
 * Backward-compatible wrapper around applyLabelsPostRenderInContainer.
 */
function applyLabelsPostRender() {
  applyLabelsPostRenderInContainer(document.getElementById('map-container'));
}

function abbreviateName(name, availableWidth) {
  if (!name) return '';

  const maxChars = Math.floor(availableWidth / 5);
  if (name.length <= maxChars) return name;

  const parts = name.split(/\s+/);
  if (parts.length >= 2) {
    const short = parts[0] + ' ' + parts[parts.length - 1][0] + '.';
    if (short.length <= maxChars) return short;
    if (parts[0].length <= maxChars) return parts[0];
  }

  if (maxChars > 3) {
    return name.slice(0, maxChars - 1) + '…';
  }

  return name.slice(0, maxChars);
}

function isColorDark(color) {
  let hex = color.replace('#', '');
  if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.55;
}

/* ------------------------------------------------------------------
   UNIT INTERACTION — HIGHLIGHT, SELECT, CLICK BINDING
   ------------------------------------------------------------------ */

/**
 * Highlight a unit in any container's SVG.
 * @param {HTMLElement} container - The container holding the SVG
 * @param {string} unitId - Unit ID to highlight
 */
function highlightUnitInContainer(container, unitId) {
  var svg = container.querySelector('svg');
  if (!svg) return;

  svg.querySelectorAll('.unit-highlight').forEach(function (el) {
    el.classList.remove('unit-highlight');
  });

  var normalized = unitId.toUpperCase();
  svg.querySelectorAll('[data-unit]').forEach(function (u) {
    if (u.getAttribute('data-unit').toUpperCase() === normalized) {
      u.classList.add('unit-highlight');
      u.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    }
  });
}

function highlightUnit(unitId) {
  var container = document.getElementById('map-container');
  highlightUnitInContainer(container, unitId);
}

function selectUnit(unitId) {
  const container = document.getElementById('map-container');
  const svg = container.querySelector('svg');
  if (!svg) return;

  svg.querySelectorAll('.unit-selected').forEach((el) => {
    el.classList.remove('unit-selected');
  });

  const normalized = unitId.toUpperCase();
  const allUnits = svg.querySelectorAll('[data-unit]');
  allUnits.forEach((u) => {
    if (u.getAttribute('data-unit').toUpperCase() === normalized) {
      u.classList.add('unit-selected');
    }
  });
}

/**
 * Bind click handling using event delegation from the SVG root.
 * Walks up from event.target to find the NEAREST (most specific) ancestor
 * with a data-unit attribute. This ensures child bed IDs like D412-B are
 * always preferred over parent group IDs like D412.
 *
 * @param {function} onClick - Callback receiving (unitId, event)
 */
function bindUnitClicks(onClick) {
  const container = document.getElementById('map-container');
  const svg = container.querySelector('svg');
  if (!svg) return;

  svg.addEventListener('click', (e) => {
    const unitId = getClickableUnitIdFromSvgEvent(e, svg);
    if (unitId) {
      onClick(unitId, e);
    }
  });
}

/**
 * Walk up from the click target to find the nearest (most specific)
 * ancestor element with a data-unit attribute. Stops at the SVG root.
 * This guarantees child bed IDs are always resolved before parent IDs.
 *
 * @param {Event} event
 * @param {SVGSVGElement} svgRoot
 * @returns {string|null} - The exact unit ID, or null if no unit was clicked
 */
function getClickableUnitIdFromSvgEvent(event, svgRoot) {
  let node = event.target;

  while (node && node !== svgRoot && node !== document) {
    if (node.hasAttribute && node.hasAttribute('data-unit')) {
      return node.getAttribute('data-unit');
    }
    node = node.parentElement || node.parentNode;
  }

  return null;
}

/* ------------------------------------------------------------------
   SVG PATTERN FILLS — Diagonal lines for pending/incomplete statuses
   ------------------------------------------------------------------ */

function _sanitizePatternId(statusKey) {
  return 'pattern-' + statusKey.replace(/[^A-Z0-9]/g, '-').toLowerCase();
}

function _getPatternIdForStatus(leaseStatusUpper) {
  if (!leaseStatusUpper) return null;
  if (PATTERN_FILL_STATUSES.indexOf(leaseStatusUpper) === -1) return null;
  return _sanitizePatternId(leaseStatusUpper);
}

function _injectPatternDefs(svg) {
  var existingDefs = svg.querySelector('defs');
  if (!existingDefs) {
    existingDefs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    svg.insertBefore(existingDefs, svg.firstChild);
  }

  for (var i = 0; i < PATTERN_FILL_STATUSES.length; i++) {
    var statusKey = PATTERN_FILL_STATUSES[i];
    var color = COLOR_CONFIG.leaseStatus[statusKey] || '#999999';
    var patternId = _sanitizePatternId(statusKey);

    if (existingDefs.querySelector('#' + patternId)) continue;

    var pattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
    pattern.setAttribute('id', patternId);
    pattern.setAttribute('patternUnits', 'userSpaceOnUse');
    pattern.setAttribute('width', '6');
    pattern.setAttribute('height', '6');
    pattern.setAttribute('patternTransform', 'rotate(45)');

    var bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bg.setAttribute('width', '6');
    bg.setAttribute('height', '6');
    bg.setAttribute('fill', color);

    var line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', '0');
    line.setAttribute('y1', '0');
    line.setAttribute('x2', '0');
    line.setAttribute('y2', '6');
    line.setAttribute('stroke', '#ffffff');
    line.setAttribute('stroke-width', '2');
    line.setAttribute('stroke-opacity', '0.5');

    pattern.appendChild(bg);
    pattern.appendChild(line);
    existingDefs.appendChild(pattern);
  }
}
