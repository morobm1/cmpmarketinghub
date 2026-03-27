/* ============================================================
   ui.js — UI Rendering Module (Refactored)
   Provides rendering/display functions for the new app shell.
   Contains ONLY rendering logic — no event wiring (app.js handles that).

   DOM element IDs match the new index.html structure.
   ============================================================ */

/* ------------------------------------------------------------------
   ESCAPE HTML HELPER
   ------------------------------------------------------------------ */

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/* ------------------------------------------------------------------
   DEFAULT COLORS (for color editor reset)
   ------------------------------------------------------------------ */

const DEFAULT_COLORS = {
  leaseStatus: {
    'RENEWAL':                       '#22c55e',
    'NEW LEASE':                     '#3b82f6',
    'RENEWAL TRANSFER':              '#eab308',
    'NEW LEASE - MOMI':              '#3b82f6',
    'NEW LEASE - PARTIALLY COMPLETE':'#60a5fa',
    'NEW LEASE - COMPLETE':          '#2563eb',
    'NEW LEASE - STARTED':           '#93c5fd',
    'RENEWAL PENDING - STARTED':     '#ef4444',
    'RENEWAL PENDING - NOT STARTED': '#ef4444',
  },
  scholarship: {
    'FIRST ASCENT':  '#f97316',
    'HINKLEY':       '#7E57C2',
    'RBL':           '#14b8a6',
    'ONE REFUGEE':   '#ec4899',
    'BOYER':         '#0ea5e9',
  },
  sharedUnit: {
    blank:   '#e5e7eb',
    partial: '#fb923c',
    full:    '#6b7280',
  },
  blank: '#f3f4f6',
  stroke: '#94a3b8',
};

/* ------------------------------------------------------------------
   GENERIC MODAL HELPERS
   Uses #modal-overlay, #modal-title, #modal-body, #modal-footer,
   #modal-close from new index.html.
   ------------------------------------------------------------------ */

function showModal(title, bodyHtml, footerHtml) {
  const overlay = document.getElementById('modal-overlay');
  const titleEl = document.getElementById('modal-title');
  const bodyEl = document.getElementById('modal-body');
  const footerEl = document.getElementById('modal-footer');
  const closeBtn = document.getElementById('modal-close');

  if (!overlay) return;

  titleEl.textContent = title || '';
  bodyEl.innerHTML = bodyHtml || '';
  footerEl.innerHTML = footerHtml || '';

  overlay.style.display = 'flex';

  // Wire close button (clone to remove old listeners)
  const newClose = closeBtn.cloneNode(true);
  closeBtn.parentNode.replaceChild(newClose, closeBtn);
  newClose.addEventListener('click', hideModal);

  // Click outside to close
  overlay.onclick = function (e) {
    if (e.target === overlay) hideModal();
  };
}

function hideModal() {
  const overlay = document.getElementById('modal-overlay');
  if (overlay) {
    overlay.style.display = 'none';
    overlay.onclick = null;
  }
}

function showConfirmModal(title, message, onConfirm) {
  const bodyHtml = '<p>' + escapeHtml(message) + '</p>';
  const footerHtml =
    '<button class="btn btn-secondary" id="modal-cancel-btn">Cancel</button>' +
    '<button class="btn btn-primary" id="modal-confirm-btn">Confirm</button>';

  showModal(title, bodyHtml, footerHtml);

  document.getElementById('modal-cancel-btn').addEventListener('click', hideModal);
  document.getElementById('modal-confirm-btn').addEventListener('click', function () {
    hideModal();
    if (onConfirm) onConfirm();
  });
}

/* ------------------------------------------------------------------
   NAVIGATION — VIEW SWITCHING
   ------------------------------------------------------------------ */

function switchView(viewId) {
  // No-op: workbench layout shows everything at once
}

/* ------------------------------------------------------------------
   OCCUPANCY STATS DASHBOARD
   Renders property, building, and floor stats into #occupancy-stats.
   ------------------------------------------------------------------ */

function buildStatGroupHTML(label, stats) {
  if (!stats) {
    return '<div class="stats-group">' +
      '<div class="stats-group-label">' + escapeHtml(label) + '</div>' +
      '<div class="stats-cards"><span class="stat-card-dash">&mdash;</span></div></div>';
  }
  return '<div class="stats-group">' +
    '<div class="stats-group-label">' + escapeHtml(label) + '</div>' +
    '<div class="stats-cards">' +
      '<div class="stat-card"><div class="stat-card-value">' + stats.totalUnits + '</div><div class="stat-card-label">Total</div></div>' +
      '<div class="stat-card stat-occupied"><div class="stat-card-value">' + stats.occupiedUnits + '</div><div class="stat-card-label">Occupied</div></div>' +
      '<div class="stat-card stat-available"><div class="stat-card-value">' + stats.availableUnits + '</div><div class="stat-card-label">Available</div></div>' +
      '<div class="stat-card stat-percent"><div class="stat-card-value">' + stats.occupancyPercent + '%</div><div class="stat-card-label">Occupancy</div></div>' +
    '</div></div>';
}

function renderPropertyStats(stats) {
  var container = document.getElementById('occupancy-stats');
  if (!container) return;

  var existing = container.querySelector('.stats-property');
  if (existing) existing.remove();

  var div = document.createElement('div');
  div.className = 'stats-property';
  div.innerHTML = buildStatGroupHTML('Full Property', stats);
  container.insertBefore(div, container.firstChild);
}

function renderBuildingStats(stats, buildingKey) {
  var container = document.getElementById('occupancy-stats');
  if (!container) return;

  var existing = container.querySelector('.stats-building');
  if (existing) existing.remove();

  var div = document.createElement('div');
  div.className = 'stats-building';

  var label = buildingKey ? getBuildingLabel(buildingKey) : 'Building';
  div.innerHTML = buildStatGroupHTML(label, stats && buildingKey ? stats : null);

  var propRow = container.querySelector('.stats-property');
  if (propRow && propRow.nextSibling) {
    container.insertBefore(div, propRow.nextSibling);
  } else {
    container.appendChild(div);
  }
}

function renderFloorStats(stats, buildingKey, floor) {
  var container = document.getElementById('occupancy-stats');
  if (!container) return;

  var existing = container.querySelector('.stats-floor');
  if (existing) existing.remove();

  var div = document.createElement('div');
  div.className = 'stats-floor';

  var label = (buildingKey && floor != null) ? getBuildingLabel(buildingKey) + ' ' + getFloorLabel(floor) : 'Floor';
  div.innerHTML = buildStatGroupHTML(label, stats && buildingKey && floor != null ? stats : null);

  container.appendChild(div);
}

/* ------------------------------------------------------------------
   BUILDING / FLOOR SELECTORS
   ------------------------------------------------------------------ */

function populateBuildingSelector() {
  var select = document.getElementById('building-selector');
  if (!select) return;
  select.innerHTML = '';

  var buildings = getRegisteredBuildings();

  if (buildings.length === 0) {
    var opt = document.createElement('option');
    opt.value = '';
    opt.textContent = '(No buildings registered)';
    opt.disabled = true;
    select.appendChild(opt);
    return;
  }

  for (var i = 0; i < buildings.length; i++) {
    var bKey = buildings[i];
    var opt = document.createElement('option');
    opt.value = bKey;
    opt.textContent = getBuildingLabel(bKey);
    select.appendChild(opt);
  }
}

function setBuildingSelectorValue(buildingKey) {
  var el = document.getElementById('building-selector');
  if (el) el.value = buildingKey;
}

function populateFloorSelectorDropdown(buildingKey) {
  var select = document.getElementById('floor-selector');
  if (!select) return;
  select.innerHTML = '';

  if (!buildingKey) {
    var opt = document.createElement('option');
    opt.value = '';
    opt.textContent = '-- Select Building First --';
    opt.disabled = true;
    select.appendChild(opt);
    return;
  }

  var floors = getFloorsForBuilding(buildingKey);

  if (floors.length === 0) {
    var opt = document.createElement('option');
    opt.value = '';
    opt.textContent = '(No floors registered)';
    opt.disabled = true;
    select.appendChild(opt);
    return;
  }

  for (var i = 0; i < floors.length; i++) {
    var f = floors[i];
    var opt = document.createElement('option');
    opt.value = f;
    opt.textContent = getFloorLabel(f);
    select.appendChild(opt);
  }
}

function setFloorSelectorValue(floor) {
  var el = document.getElementById('floor-selector');
  if (el) el.value = floor;
}

function updateMapTitle(title) {
  var el = document.getElementById('app-title');
  if (el) el.textContent = title || 'Property Site Map';
}

/* ------------------------------------------------------------------
   LEGEND
   Renders into #map-legend.
   ------------------------------------------------------------------ */

function renderLegend() {
  var container = document.getElementById('map-legend');
  if (!container) return;
  container.innerHTML = '';

  LEGEND_ITEMS.forEach(function (item) {
    var el = document.createElement('div');
    el.className = 'legend-item';

    var swatch = document.createElement('span');
    swatch.className = 'legend-swatch';
    if (item.pattern) {
      swatch.style.background = 'repeating-linear-gradient(45deg,' + item.color + ',' + item.color + ' 2px,#fff 2px,#fff 4px)';
    } else {
      swatch.style.backgroundColor = item.color;
    }

    var label = document.createElement('span');
    label.textContent = item.label;

    el.appendChild(swatch);
    el.appendChild(label);
    container.appendChild(el);
  });

  var editorBtn = document.createElement('button');
  editorBtn.className = 'btn btn-sm btn-outline legend-color-editor-btn';
  editorBtn.textContent = 'Edit Colors';
  editorBtn.addEventListener('click', function () {
    openColorEditor({
      onSave: function () {
        renderLegend();
        if (typeof renderCurrentMap === 'function') renderCurrentMap();
      },
    });
  });
  container.appendChild(editorBtn);
}

/* ------------------------------------------------------------------
   DETAIL PANEL
   Renders into #unit-detail-panel.
   ------------------------------------------------------------------ */

function showDetailPanel(resident, unitId) {
  var panel = document.getElementById('unit-detail-panel');
  if (!panel) return;

  if (resident) {
    var scholarshipText =
      (resident.Scholarship && resident.Scholarship.toUpperCase() !== 'NONE')
        ? resident.Scholarship
        : '--';
    var color = getUnitColor(resident, false);

    panel.innerHTML =
      '<div class="detail-header-label">Unit Details</div>' +
      '<div class="detail-unit-id">' + escapeHtml(unitId || '--') + '</div>' +
      '<div class="detail-color-bar" style="background-color:' + color + '"></div>' +
      '<div class="detail-field"><div class="detail-field-label">Resident</div><div class="detail-field-value">' + escapeHtml(resident.Resident_Name || '--') + '</div></div>' +
      '<div class="detail-field"><div class="detail-field-label">Lease Status</div><div class="detail-field-value">' + escapeHtml(resident.Lease_Status || '--') + '</div></div>' +
      '<div class="detail-field"><div class="detail-field-label">Scholarship</div><div class="detail-field-value">' + escapeHtml(scholarshipText) + '</div></div>' +
      '<button class="btn btn-sm btn-secondary" id="detail-close-btn" style="margin-top:10px;width:100%">Clear Selection</button>';
  } else {
    panel.innerHTML =
      '<div class="detail-header-label">Unit Details</div>' +
      '<div class="detail-unit-id">' + escapeHtml(unitId || '--') + '</div>' +
      '<div class="detail-color-bar" style="background-color:' + COLOR_CONFIG.blank + '"></div>' +
      '<div class="detail-field"><div class="detail-field-label">Resident</div><div class="detail-field-value">Unassigned</div></div>' +
      '<div class="detail-field"><div class="detail-field-label">Lease Status</div><div class="detail-field-value">--</div></div>' +
      '<div class="detail-field"><div class="detail-field-label">Scholarship</div><div class="detail-field-value">--</div></div>' +
      '<button class="btn btn-sm btn-secondary" id="detail-close-btn" style="margin-top:10px;width:100%">Clear Selection</button>';
  }

  // Wire close button
  var closeBtn = document.getElementById('detail-close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', hideDetailPanel);
  }
}

function hideDetailPanel() {
  var panel = document.getElementById('unit-detail-panel');
  if (panel) {
    panel.innerHTML = '<div class="detail-placeholder"><p>Click a unit on the map to view details</p></div>';
  }

  // Clear unit selection in SVG
  var svg = document.getElementById('map-container');
  if (svg) {
    var svgEl = svg.querySelector('svg');
    if (svgEl) {
      svgEl.querySelectorAll('.unit-selected').forEach(function (el) {
        el.classList.remove('unit-selected');
      });
    }
  }
}

/* ------------------------------------------------------------------
   SEARCH
   Renders into #search-results dropdown.
   ------------------------------------------------------------------ */

function renderSearchResults(results, onClickResult) {
  var container = document.getElementById('search-results');
  if (!container) return;
  container.innerHTML = '';

  if (!results || results.length === 0) {
    var noResult = document.createElement('div');
    noResult.className = 'search-no-results';
    noResult.textContent = 'No matching residents or units found.';
    container.appendChild(noResult);
    container.style.display = 'block';
    return;
  }

  container.style.display = 'block';

  results.forEach(function (result) {
    var item = document.createElement('div');
    item.className = 'search-result-item';

    var unitTag = document.createElement('span');
    unitTag.className = 'unit-tag';

    var nameSpan = document.createElement('span');

    if (result.type) {
      unitTag.textContent = result.label;
      nameSpan.textContent = result.sublabel;
      if (result.type === 'unit') {
        nameSpan.className = 'available-tag';
      }
    } else if (result.source) {
      // New-format result from searchResidents()
      var nameEl = document.createElement('strong');
      nameEl.textContent = result.name;

      var infoText = '';
      if (result.unit) {
        infoText += result.unit;
      }
      if (result.building) {
        infoText += (infoText ? ' / ' : '') + 'Bldg ' + result.building;
      }
      if (result.floor != null) {
        infoText += ' Fl ' + result.floor;
      }

      var badge = document.createElement('span');
      badge.className = 'source-badge source-' + result.source;
      badge.textContent = result.source === 'placed' ? 'Placed' : 'Bank';

      item.appendChild(nameEl);
      if (infoText) {
        var infoSpan = document.createElement('span');
        infoSpan.className = 'search-result-info';
        infoSpan.textContent = infoText;
        item.appendChild(infoSpan);
      }
      item.appendChild(badge);

      item.addEventListener('click', function () {
        if (onClickResult) onClickResult(result);
      });
      container.appendChild(item);
      return;
    } else {
      unitTag.textContent = result.Unit_Assigned;
      nameSpan.textContent = result.Resident_Name;
    }

    item.appendChild(unitTag);
    item.appendChild(nameSpan);

    item.addEventListener('click', function () {
      if (onClickResult) onClickResult(result);
    });

    container.appendChild(item);
  });
}

function clearSearchResults() {
  var container = document.getElementById('search-results');
  if (container) {
    container.innerHTML = '';
    container.style.display = 'none';
  }
}

/* ------------------------------------------------------------------
   DEBUG WARNINGS
   Renders into #debug-output.
   ------------------------------------------------------------------ */

function addDebugWarnings(warnings, level) {
  level = level || 'warn';
  var output = document.getElementById('debug-output');
  if (!output) return;

  // Ensure a list element exists
  var list = output.querySelector('.debug-list');
  if (!list) {
    list = document.createElement('ul');
    list.className = 'debug-list';
    output.appendChild(list);
  }

  warnings.forEach(function (msg) {
    var li = document.createElement('li');
    li.className = 'debug-' + level;
    li.textContent = msg;
    list.appendChild(li);
  });

  updateDebugCount();
}

function clearDebugWarnings() {
  var output = document.getElementById('debug-output');
  if (output) {
    var list = output.querySelector('.debug-list');
    if (list) list.innerHTML = '';
  }
  updateDebugCount();
}

function updateDebugCount() {
  var output = document.getElementById('debug-output');
  if (!output) return;
  var list = output.querySelector('.debug-list');
  var count = list ? list.children.length : 0;

  // Update debug section header badge in right panel
  var debugSection = document.getElementById('debug-section');
  if (debugSection) {
    var sectionHeader = debugSection.closest('.panel-section');
    if (sectionHeader) {
      var titleEl = sectionHeader.querySelector('.section-title');
      if (titleEl) {
        // Remove old badge
        var oldBadge = titleEl.querySelector('.debug-count-badge');
        if (oldBadge) oldBadge.remove();
        if (count > 0) {
          var badge = document.createElement('span');
          badge.className = 'debug-count-badge';
          badge.textContent = ' (' + count + ')';
          titleEl.appendChild(badge);
        }
      }
    }
  }
}

/* ------------------------------------------------------------------
   MASTER LIST
   Renders into #resident-master-list.
   ------------------------------------------------------------------ */

/**
 * Render the master list table from current residents, inventory, and filters.
 * @param {Map<string, object>} residents
 * @param {Array<{unitNumber: string, unitType: string}>} inventory
 * @param {object} filters - { occupancy, scholarship, lease, floorplan }
 * @param {object} callbacks - { onEdit, onDelete, onRowClick }
 */
function renderMasterList(residents, inventory, filters, callbacks) {
  var container = document.getElementById('resident-master-list');
  if (!container) return;

  // Build or reuse table structure
  var table = container.querySelector('table.master-list-table');
  if (!table) {
    container.innerHTML = '';
    // Search box
    var searchDiv = document.createElement('div');
    searchDiv.className = 'master-list-search-bar';
    searchDiv.innerHTML =
      '<input type="text" id="master-list-search" class="search-input" placeholder="Search master list..." />';
    container.appendChild(searchDiv);

    // Filter bar
    var filterDiv = document.createElement('div');
    filterDiv.className = 'master-list-filters';
    filterDiv.innerHTML =
      '<select id="filter-occupancy" class="select-input">' +
        '<option value="all">All</option><option value="occupied">Occupied</option><option value="available">Available</option>' +
      '</select>' +
      '<select id="filter-scholarship" class="select-input">' +
        '<option value="all">All Scholarships</option><option value="overrides">Has Scholarship</option>' +
      '</select>' +
      '<select id="filter-lease" class="select-input">' +
        '<option value="all">All Leases</option>' +
      '</select>' +
      '<select id="filter-floorplan" class="select-input">' +
        '<option value="all">All Floorplans</option>' +
      '</select>' +
      '<button id="clear-filters-btn" class="btn btn-secondary">Clear Filters</button>';
    container.appendChild(filterDiv);

    table = document.createElement('table');
    table.className = 'master-list-table';
    table.innerHTML =
      '<thead><tr>' +
        '<th>Name</th><th>Unit</th><th>Floorplan</th><th>Lease Status</th><th>Scholarship</th><th>Actions</th>' +
      '</tr></thead>' +
      '<tbody id="master-table-body"></tbody>';
    container.appendChild(table);

    var emptyMsg = document.createElement('div');
    emptyMsg.id = 'master-list-empty';
    emptyMsg.className = 'section-empty';
    emptyMsg.style.display = 'none';
    container.appendChild(emptyMsg);
  }

  var tbody = document.getElementById('master-table-body');
  var emptyMsg = document.getElementById('master-list-empty');
  var searchBox = document.getElementById('master-list-search');
  var query = (searchBox ? searchBox.value.trim().toUpperCase() : '');

  if (!tbody) return;
  tbody.innerHTML = '';

  var rows = [];

  if (inventory && inventory.length > 0) {
    for (var i = 0; i < inventory.length; i++) {
      var item = inventory[i];
      var key = item.unitNumber.toUpperCase();
      var resident = residents ? residents.get(key) : null;
      rows.push({ unit: item.unitNumber, key: key, resident: resident, unitType: item.unitType });
    }

    // Also add residents assigned to units NOT in inventory
    if (residents) {
      var inventorySet = new Set(inventory.map(function (item) { return item.unitNumber.toUpperCase(); }));
      residents.forEach(function (resident, unitKey) {
        if (!inventorySet.has(unitKey)) {
          rows.push({ unit: resident.Unit_Assigned, key: unitKey, resident: resident, unitType: '' });
        }
      });
    }
  } else if (residents && residents.size > 0) {
    residents.forEach(function (resident, unitKey) {
      rows.push({ unit: resident.Unit_Assigned, key: unitKey, resident: resident, unitType: '' });
    });
  }

  if (rows.length === 0) {
    if (emptyMsg) {
      emptyMsg.textContent = 'No residents or inventory loaded.';
      emptyMsg.style.display = 'block';
    }
    return;
  }

  if (emptyMsg) emptyMsg.style.display = 'none';
  var visibleCount = 0;

  for (var r = 0; r < rows.length; r++) {
    var row = rows[r];
    var unit = row.unit;
    var rowKey = row.key;
    var rowResident = row.resident;
    var unitType = row.unitType;
    var isOccupied = !!rowResident;

    // Apply filters
    if (filters.occupancy === 'occupied' && !isOccupied) continue;
    if (filters.occupancy === 'available' && isOccupied) continue;

    if (filters.scholarship !== 'all') {
      if (filters.scholarship === 'overrides') {
        if (!isOccupied) continue;
        var sch = (rowResident.Scholarship || '').toUpperCase();
        if (!sch || sch === 'NONE') continue;
      } else {
        if (!isOccupied) continue;
        var sch = (rowResident.Scholarship || '').toUpperCase();
        if (sch !== filters.scholarship.toUpperCase()) continue;
      }
    }

    if (filters.lease !== 'all') {
      if (!isOccupied) continue;
      if ((rowResident.Lease_Status || '') !== filters.lease) continue;
    }

    if (filters.floorplan && filters.floorplan !== 'all') {
      var rowFp = (unitType || '').trim().toUpperCase();
      if (rowFp !== filters.floorplan.trim().toUpperCase()) continue;
    }

    if (query) {
      var nameMatch = isOccupied && (rowResident.Resident_Name || '').toUpperCase().includes(query);
      var unitMatch = rowKey.includes(query);
      if (!nameMatch && !unitMatch) continue;
    }

    visibleCount++;
    var tr = document.createElement('tr');
    tr.setAttribute('data-unit-row', rowKey);
    if (!isOccupied) tr.classList.add('row-available');

    var tdName = document.createElement('td');
    tdName.textContent = isOccupied ? (rowResident.Resident_Name || '--') : '';

    var tdUnit = document.createElement('td');
    tdUnit.textContent = unit || '--';

    var tdFloorplan = document.createElement('td');
    tdFloorplan.textContent = unitType || '--';

    var tdLease = document.createElement('td');
    tdLease.textContent = isOccupied ? (rowResident.Lease_Status || '--') : '';

    var tdScholarship = document.createElement('td');
    tdScholarship.textContent = isOccupied ? (rowResident.Scholarship || '--') : '';

    var tdActions = document.createElement('td');
    tdActions.addEventListener('click', function (e) { e.stopPropagation(); });

    if (isOccupied) {
      (function (res, k) {
        var editBtn = document.createElement('button');
        editBtn.className = 'action-btn';
        editBtn.textContent = 'Edit';
        editBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          if (callbacks.onEdit) callbacks.onEdit(res, k);
        });

        var deleteBtn = document.createElement('button');
        deleteBtn.className = 'action-btn delete';
        deleteBtn.textContent = 'Delete';
        deleteBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          if (callbacks.onDelete) callbacks.onDelete(res, k);
        });

        tdActions.appendChild(editBtn);
        tdActions.appendChild(deleteBtn);
      })(rowResident, rowKey);
    }

    tr.appendChild(tdName);
    tr.appendChild(tdUnit);
    tr.appendChild(tdFloorplan);
    tr.appendChild(tdLease);
    tr.appendChild(tdScholarship);
    tr.appendChild(tdActions);

    (function (res, k, occ) {
      tr.addEventListener('click', function () {
        if (occ && callbacks.onRowClick) callbacks.onRowClick(res, k);
      });
    })(rowResident, rowKey, isOccupied);

    tbody.appendChild(tr);
  }

  if (visibleCount === 0 && emptyMsg) {
    emptyMsg.textContent = 'No matching results found.';
    emptyMsg.style.display = 'block';
  }
}

function highlightMasterListRow(unitKey) {
  var tbody = document.getElementById('master-table-body');
  if (!tbody) return;
  tbody.querySelectorAll('tr.row-active').forEach(function (r) { r.classList.remove('row-active'); });
  var row = tbody.querySelector('tr[data-unit-row="' + unitKey + '"]');
  if (row) {
    row.classList.add('row-active');
    row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

/* ------------------------------------------------------------------
   RESIDENT MODAL — ADD/EDIT
   Uses generic modal overlay.
   ------------------------------------------------------------------ */

function populateUnitDropdown(selectEl, inventory, residents, currentUnitValue, reservedUnitsMap) {
  selectEl.innerHTML = '<option value="">-- Select Unit --</option>';

  if (!inventory || inventory.length === 0) {
    var opt = document.createElement('option');
    opt.value = '';
    opt.textContent = '(No inventory loaded)';
    opt.disabled = true;
    selectEl.appendChild(opt);
    return;
  }

  var available = getAvailableUnits(inventory, residents);
  var currentKey = currentUnitValue ? currentUnitValue.toUpperCase() : null;

  var unitsToShow = available.slice();
  if (currentKey) {
    var alreadyInList = unitsToShow.some(function (u) { return u.toUpperCase() === currentKey; });
    if (!alreadyInList) {
      var fromInventory = inventory.find(function (item) { return item.unitNumber.toUpperCase() === currentKey; });
      if (fromInventory) {
        unitsToShow.unshift(fromInventory.unitNumber);
      } else {
        unitsToShow.unshift(currentUnitValue);
      }
    }
  }

  unitsToShow.sort(function (a, b) { return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }); });

  var resMap = reservedUnitsMap || new Map();

  for (var i = 0; i < unitsToShow.length; i++) {
    var unitNum = unitsToShow[i];
    var reservation = getUnitScholarshipReservation(unitNum, resMap);
    var opt = document.createElement('option');
    opt.value = unitNum;
    opt.textContent = unitNum + (reservation ? ' \u2014 Reserved for ' + reservation : '');
    if (reservation) {
      opt.setAttribute('data-reserved', reservation);
    }
    selectEl.appendChild(opt);
  }
}

function openResidentModal(resident, options) {
  var onSave = options.onSave;
  var inventory = options.inventory;
  var residents = options.residents;
  var reservedUnitsMap = options.reservedUnitsMap || new Map();

  var isEdit = !!resident;
  var originalUnitKey = isEdit ? resident.Unit_Assigned.toUpperCase() : null;

  var title = isEdit ? 'Edit Resident' : 'Add Resident';

  // Build lease status options
  var leaseOptions = '';
  leaseOptions += '<option value="">-- Select --</option>';
  for (var i = 0; i < ALLOWED_LEASE_STATUSES.length; i++) {
    var ls = ALLOWED_LEASE_STATUSES[i];
    var sel = (isEdit && resident.Lease_Status === ls) ? ' selected' : '';
    leaseOptions += '<option value="' + escapeHtml(ls) + '"' + sel + '>' + escapeHtml(ls) + '</option>';
  }

  // Build scholarship options
  var scholarshipOptions = '';
  scholarshipOptions += '<option value="">-- Select --</option>';
  for (var i = 0; i < ALLOWED_SCHOLARSHIPS.length; i++) {
    var sc = ALLOWED_SCHOLARSHIPS[i];
    var sel = (isEdit && (resident.Scholarship || '') === sc) ? ' selected' : '';
    scholarshipOptions += '<option value="' + escapeHtml(sc) + '"' + sel + '>' + escapeHtml(sc) + '</option>';
  }

  var bodyHtml =
    '<form id="resident-form" class="modal-form">' +
      '<div class="form-group">' +
        '<label for="form-resident-name">Name</label>' +
        '<input type="text" id="form-resident-name" class="text-input" value="' + (isEdit ? escapeHtml(resident.Resident_Name) : '') + '" required />' +
      '</div>' +
      '<div class="form-group">' +
        '<label for="form-unit-assigned">Unit</label>' +
        '<select id="form-unit-assigned" class="select-input" required></select>' +
        '<div id="unit-validation-msg" class="validation-message"></div>' +
      '</div>' +
      '<div class="form-group">' +
        '<label for="form-lease-status">Lease Status</label>' +
        '<select id="form-lease-status" class="select-input" required>' + leaseOptions + '</select>' +
      '</div>' +
      '<div class="form-group">' +
        '<label for="form-scholarship">Scholarship</label>' +
        '<select id="form-scholarship" class="select-input" required>' + scholarshipOptions + '</select>' +
      '</div>' +
    '</form>';

  var footerHtml =
    '<button type="button" class="btn btn-secondary" id="resident-cancel-btn">Cancel</button>' +
    '<button type="submit" form="resident-form" class="btn btn-primary" id="resident-save-btn">Save</button>';

  showModal(title, bodyHtml, footerHtml);

  // Populate unit dropdown
  var unitSelect = document.getElementById('form-unit-assigned');
  populateUnitDropdown(unitSelect, inventory, residents, isEdit ? resident.Unit_Assigned : null, reservedUnitsMap);
  if (isEdit) {
    unitSelect.value = resident.Unit_Assigned;
  }

  // Validation on unit change
  unitSelect.addEventListener('change', function () {
    var selectedUnit = unitSelect.value;
    var validMsg = document.getElementById('unit-validation-msg');
    if (!selectedUnit) {
      validMsg.textContent = '';
      validMsg.className = 'validation-message';
      return;
    }
    var validation = validateUnitAssignment(selectedUnit, inventory, residents, originalUnitKey);
    if (!validation.valid) {
      validMsg.textContent = validation.message;
      validMsg.className = 'validation-message validation-error';
    } else {
      validMsg.textContent = '';
      validMsg.className = 'validation-message';
    }
  });

  // Cancel
  document.getElementById('resident-cancel-btn').addEventListener('click', function () {
    closeResidentModal();
  });

  // Form submit
  document.getElementById('resident-form').addEventListener('submit', function (e) {
    e.preventDefault();

    var formData = {
      Resident_Name: document.getElementById('form-resident-name').value.trim(),
      Unit_Assigned: document.getElementById('form-unit-assigned').value.trim(),
      Lease_Status: document.getElementById('form-lease-status').value,
      Scholarship: document.getElementById('form-scholarship').value,
    };

    if (!formData.Resident_Name || !formData.Unit_Assigned || !formData.Lease_Status || !formData.Scholarship) {
      alert('All fields are required.');
      return;
    }

    var validation = validateUnitAssignment(formData.Unit_Assigned, inventory, residents, originalUnitKey);
    if (!validation.valid) {
      var validMsg = document.getElementById('unit-validation-msg');
      validMsg.textContent = validation.message;
      validMsg.className = 'validation-message validation-error';
      return;
    }

    if (onSave) {
      onSave(formData, isEdit, originalUnitKey);
    }
  });
}

function closeResidentModal() {
  hideModal();
}

/* ------------------------------------------------------------------
   UPLOAD STATUS HELPERS
   ------------------------------------------------------------------ */

function setUploadStatus(elementId, text, type) {
  // Try direct ID first
  var el = document.getElementById(elementId);
  if (!el) {
    // For import cards, try to find the info element by import type
    var cardType = elementId.replace('Status', '').replace('UploadStatus', '').replace('uploadStatus', '');
    var card = document.querySelector('.import-card[data-import-type="' + cardType + '"]');
    if (card) {
      el = card.querySelector('.import-info');
    }
  }
  if (el) {
    el.textContent = text;
    el.className = 'import-info' + (type ? ' upload-' + type : '');
  }

  // Also update sidebar import row status
  var cardType2 = elementId.replace('Status', '').replace('UploadStatus', '').replace('uploadStatus', '');
  var sidebarRow = document.querySelector('.import-row[data-import-type="' + cardType2 + '"]');
  if (sidebarRow) {
    var statusEl = sidebarRow.querySelector('.import-status');
    if (statusEl) {
      statusEl.textContent = text || '';
    }
  }
}

/* ------------------------------------------------------------------
   PRINT / EXPORT
   ------------------------------------------------------------------ */

function printMap() {
  window.print();
}

function exportMapAsSVG() {
  var container = document.getElementById('map-container');
  if (!container) return;
  var svg = container.querySelector('svg');
  if (!svg) {
    alert('No map is currently displayed.');
    return;
  }

  var serializer = new XMLSerializer();
  var svgString = serializer.serializeToString(svg);
  var blob = new Blob([svgString], { type: 'image/svg+xml' });
  var url = URL.createObjectURL(blob);

  var a = document.createElement('a');
  a.href = url;
  a.download = 'property-map-export.svg';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ------------------------------------------------------------------
   EMPTY / ERROR STATES
   Renders into #map-container.
   ------------------------------------------------------------------ */

function showEmptyState(message) {
  var container = document.getElementById('map-container');
  if (!container) return;

  container.innerHTML = '';
  container.style.display = 'flex';

  var empty = document.createElement('div');
  empty.className = 'empty-state';
  empty.innerHTML =
    '<h2>No Map Loaded</h2>' +
    '<p>' + escapeHtml(message || 'Upload a unit inventory and resident spreadsheet, then select a building and floor to view the map.') + '</p>';
  container.appendChild(empty);
}

function showMapError(message) {
  var container = document.getElementById('map-container');
  if (!container) return;

  container.innerHTML = '';
  container.style.display = 'flex';

  var errorDiv = document.createElement('div');
  errorDiv.className = 'empty-state error-state';
  errorDiv.innerHTML =
    '<h2>Error</h2>' +
    '<p>' + escapeHtml(message) + '</p>';
  container.appendChild(errorDiv);
}

/* ------------------------------------------------------------------
   WAITING BANK UI
   Renders bank list into a section. Since the new HTML has no
   dedicated bank container, this renders into a dynamically created
   area inside the master list view or a modal.
   ------------------------------------------------------------------ */

/**
 * Render the waiting bank panel grouped by Unit Type.
 * @param {Array<object>} bankResidents
 * @param {object} callbacks - { onAssignClick: fn(bankEntry) }
 * @param {string} [searchQuery='']
 */
function renderWaitingBank(bankResidents, callbacks, searchQuery) {
  var bankSection = document.getElementById('bank-section');
  if (!bankSection) return;

  // Preserve the search input value if it exists
  var existingSearch = document.getElementById('bank-search-input');
  var bankList = document.getElementById('bank-list');
  if (!bankList) {
    // Fallback: render into bankSection directly
    bankList = bankSection;
  }
  bankList.innerHTML = '';

  if (!bankResidents || bankResidents.length === 0) {
    bankList.innerHTML = '<div class="bank-empty">No residents in waiting bank.</div>';
    return;
  }

  // Search filter
  var query = (searchQuery || '').trim().toUpperCase();
  var filtered = query
    ? bankResidents.filter(function (e) { return (e.name || '').toUpperCase().includes(query); })
    : bankResidents;

  // Update search input value if needed
  if (existingSearch && searchQuery != null) {
    existingSearch.value = searchQuery;
  }

  if (filtered.length === 0) {
    var noResults = document.createElement('div');
    noResults.className = 'bank-no-results';
    noResults.textContent = 'No residents match your search.';
    bankList.appendChild(noResults);
    return;
  }

  // Group by Unit Type
  var groups = {};
  for (var t = 0; t < APPROVED_BANK_UNIT_TYPES.length; t++) {
    groups[APPROVED_BANK_UNIT_TYPES[t]] = [];
  }

  for (var i = 0; i < filtered.length; i++) {
    var entry = filtered[i];
    var type = entry.unitType;
    if (!groups[type]) groups[type] = [];
    groups[type].push(entry);
  }

  for (var t = 0; t < APPROVED_BANK_UNIT_TYPES.length; t++) {
    var typeName = APPROVED_BANK_UNIT_TYPES[t];
    var entries = groups[typeName];
    if (!entries || entries.length === 0) continue;

    var groupEl = document.createElement('div');
    groupEl.className = 'bank-group';

    var header = document.createElement('div');
    header.className = 'bank-group-header';
    header.innerHTML =
      '<span class="bank-group-label">' + escapeHtml(typeName) + '</span>' +
      '<span class="bank-group-badge">' + entries.length + '</span>';
    groupEl.appendChild(header);

    var list = document.createElement('div');
    list.className = 'bank-group-list';

    for (var j = 0; j < entries.length; j++) {
      (function (bankEntry) {
        var itemEl = document.createElement('div');
        itemEl.className = 'bank-item';

        var nameEl = document.createElement('span');
        nameEl.className = 'bank-item-name';
        nameEl.textContent = bankEntry.name;

        var leaseEl = document.createElement('span');
        leaseEl.className = 'bank-item-lease';
        leaseEl.textContent = bankEntry.leaseStatus;

        var btnGroup = document.createElement('span');
        btnGroup.className = 'bank-item-actions';

        var editBtn = document.createElement('button');
        editBtn.className = 'bank-edit-btn';
        editBtn.textContent = 'Edit';
        editBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          if (callbacks.onEditClick) callbacks.onEditClick(bankEntry);
        });

        var assignBtn = document.createElement('button');
        assignBtn.className = 'bank-assign-btn';
        assignBtn.textContent = 'Assign';
        assignBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          if (callbacks.onAssignClick) callbacks.onAssignClick(bankEntry);
        });

        btnGroup.appendChild(editBtn);
        btnGroup.appendChild(assignBtn);

        itemEl.appendChild(nameEl);
        itemEl.appendChild(leaseEl);
        itemEl.appendChild(btnGroup);
        list.appendChild(itemEl);
      })(entries[j]);
    }

    groupEl.appendChild(list);
    bankList.appendChild(groupEl);
  }
}

/* ------------------------------------------------------------------
   BANK ASSIGNMENT MODAL
   Uses generic modal.
   ------------------------------------------------------------------ */

function openBankAssignmentModal(bankEntry, availableUnits, callbacks) {
  var title = 'Assign Bank Resident';
  var reservedUnitsMap = (callbacks && callbacks.reservedUnitsMap) || new Map();

  var infoHtml =
    '<div class="bank-assign-detail"><strong>Name:</strong> ' + escapeHtml(bankEntry.name) + '</div>' +
    '<div class="bank-assign-detail"><strong>Unit Type:</strong> ' + escapeHtml(bankEntry.unitType) + '</div>' +
    '<div class="bank-assign-detail"><strong>Lease Status:</strong> ' + escapeHtml(bankEntry.leaseStatus) + '</div>';

  var selectHtml = '<div class="form-group"><label for="bank-assign-unit">Select Unit</label><select id="bank-assign-unit" class="select-input bank-assign-unit-select">';
  selectHtml += '<option value="">-- Select Unit --</option>';

  if (availableUnits.length === 0) {
    selectHtml += '<option value="" disabled>(No available units for this type)</option>';
  } else {
    var sorted = availableUnits.slice().sort(function (a, b) {
      return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
    });
    for (var i = 0; i < sorted.length; i++) {
      var unitNum = sorted[i];
      var reservation = getUnitScholarshipReservation(unitNum, reservedUnitsMap);
      var optionLabel = escapeHtml(unitNum);
      if (reservation) {
        optionLabel += ' \u2014 Reserved for ' + escapeHtml(reservation);
      }
      selectHtml += '<option value="' + escapeHtml(unitNum) + '"' +
        (reservation ? ' data-reserved="' + escapeHtml(reservation) + '"' : '') +
        '>' + optionLabel + '</option>';
    }
  }
  selectHtml += '</select><div id="bank-assign-validation" class="validation-message"></div></div>';

  var bodyHtml = infoHtml + selectHtml;
  var footerHtml =
    '<button class="btn btn-secondary" id="bank-assign-cancel">Cancel</button>' +
    '<button class="btn btn-primary" id="bank-assign-confirm">Assign</button>';

  showModal(title, bodyHtml, footerHtml);

  if (availableUnits.length === 0) {
    var valEl = document.getElementById('bank-assign-validation');
    if (valEl) {
      valEl.textContent = 'No available units found for unit type "' + bankEntry.unitType + '".';
      valEl.className = 'validation-message validation-error';
    }
  }

  document.getElementById('bank-assign-cancel').addEventListener('click', function () {
    closeBankAssignmentModal();
  });

  document.getElementById('bank-assign-confirm').addEventListener('click', function () {
    var selectedUnit = document.getElementById('bank-assign-unit').value;
    if (!selectedUnit) {
      var v = document.getElementById('bank-assign-validation');
      v.textContent = 'Please select a unit.';
      v.className = 'validation-message validation-error';
      return;
    }
    closeBankAssignmentModal();
    if (callbacks.onAssign) callbacks.onAssign(bankEntry, selectedUnit);
  });
}

function closeBankAssignmentModal() {
  hideModal();
}

/* ------------------------------------------------------------------
   BANK RESIDENT EDIT MODAL
   Allows editing Name, Unit Type, and Lease Status of a bank entry.
   ------------------------------------------------------------------ */

function openBankEditModal(bankEntry, callbacks) {
  var title = 'Edit Bank Resident';

  // Build unit type options
  var unitTypeOptions = '<option value="">-- Select Unit Type --</option>';
  for (var i = 0; i < APPROVED_BANK_UNIT_TYPES.length; i++) {
    var ut = APPROVED_BANK_UNIT_TYPES[i];
    var sel = (bankEntry.unitType === ut) ? ' selected' : '';
    unitTypeOptions += '<option value="' + escapeHtml(ut) + '"' + sel + '>' + escapeHtml(ut) + '</option>';
  }

  // Build lease status options
  var leaseOptions = '<option value="">-- Select --</option>';
  for (var i = 0; i < ALLOWED_LEASE_STATUSES.length; i++) {
    var ls = ALLOWED_LEASE_STATUSES[i];
    var sel = (bankEntry.leaseStatus === ls) ? ' selected' : '';
    leaseOptions += '<option value="' + escapeHtml(ls) + '"' + sel + '>' + escapeHtml(ls) + '</option>';
  }

  var bodyHtml =
    '<form id="bank-edit-form" class="modal-form">' +
      '<div class="form-group">' +
        '<label for="bank-edit-name">Name</label>' +
        '<input type="text" id="bank-edit-name" class="text-input" value="' + escapeHtml(bankEntry.name) + '" required />' +
      '</div>' +
      '<div class="form-group">' +
        '<label for="bank-edit-unit-type">Unit Type</label>' +
        '<select id="bank-edit-unit-type" class="select-input" required>' + unitTypeOptions + '</select>' +
      '</div>' +
      '<div class="form-group">' +
        '<label for="bank-edit-lease-status">Lease Status</label>' +
        '<select id="bank-edit-lease-status" class="select-input" required>' + leaseOptions + '</select>' +
      '</div>' +
    '</form>';

  var footerHtml =
    '<button type="button" class="btn btn-danger-outline" id="bank-edit-delete-btn">Delete</button>' +
    '<button type="button" class="btn btn-secondary" id="bank-edit-cancel-btn">Cancel</button>' +
    '<button type="submit" form="bank-edit-form" class="btn btn-primary" id="bank-edit-save-btn">Save</button>';

  showModal(title, bodyHtml, footerHtml);

  // Cancel
  document.getElementById('bank-edit-cancel-btn').addEventListener('click', function () {
    hideModal();
  });

  // Delete
  document.getElementById('bank-edit-delete-btn').addEventListener('click', function () {
    hideModal();
    if (callbacks.onDelete) callbacks.onDelete(bankEntry);
  });

  // Form submit
  document.getElementById('bank-edit-form').addEventListener('submit', function (e) {
    e.preventDefault();

    var updatedData = {
      name: document.getElementById('bank-edit-name').value.trim(),
      unitType: document.getElementById('bank-edit-unit-type').value,
      leaseStatus: document.getElementById('bank-edit-lease-status').value,
    };

    if (!updatedData.name || !updatedData.unitType || !updatedData.leaseStatus) {
      alert('All fields are required.');
      return;
    }

    hideModal();
    if (callbacks.onSave) callbacks.onSave(bankEntry, updatedData);
  });
}

/* ------------------------------------------------------------------
   COLOR EDITOR MODAL
   Uses generic modal.
   ------------------------------------------------------------------ */

function openColorEditor(callbacks) {
  var title = 'Customize Colors';

  var sections = [
    { title: 'Lease Status Colors', entries: COLOR_CONFIG.leaseStatus, group: 'leaseStatus' },
    { title: 'Scholarship Override Colors', entries: COLOR_CONFIG.scholarship, group: 'scholarship' },
    { title: 'Shared Unit Occupancy Colors', entries: COLOR_CONFIG.sharedUnit, group: 'sharedUnit' },
  ];

  var bodyHtml = '<div class="color-editor-content">';

  for (var s = 0; s < sections.length; s++) {
    var section = sections[s];
    bodyHtml += '<h3 class="color-section-title">' + escapeHtml(section.title) + '</h3>';
    var keys = Object.keys(section.entries);
    for (var k = 0; k < keys.length; k++) {
      var key = keys[k];
      var color = section.entries[key];
      bodyHtml +=
        '<div class="color-editor-row">' +
          '<span class="color-editor-label">' + escapeHtml(key) + '</span>' +
          '<input type="color" class="color-picker" value="' + color + '" data-group="' + section.group + '" data-key="' + escapeHtml(key) + '" />' +
        '</div>';
    }
  }

  // Other colors
  bodyHtml += '<h3 class="color-section-title">Other</h3>';
  bodyHtml +=
    '<div class="color-editor-row">' +
      '<span class="color-editor-label">Blank / Unassigned</span>' +
      '<input type="color" class="color-picker" value="' + COLOR_CONFIG.blank + '" data-group="blank" data-key="blank" />' +
    '</div>' +
    '<div class="color-editor-row">' +
      '<span class="color-editor-label">Unit Outline Stroke</span>' +
      '<input type="color" class="color-picker" value="' + COLOR_CONFIG.stroke + '" data-group="stroke" data-key="stroke" />' +
    '</div>';

  bodyHtml += '</div>';

  var footerHtml =
    '<button class="btn btn-secondary" id="color-cancel-btn">Cancel</button>' +
    '<button class="btn btn-secondary" id="color-reset-btn">Reset Defaults</button>' +
    '<button class="btn btn-primary" id="color-save-btn">Save</button>';

  showModal(title, bodyHtml, footerHtml);

  document.getElementById('color-save-btn').addEventListener('click', function () {
    var body = document.getElementById('modal-body');
    var pickers = body.querySelectorAll('.color-picker');
    pickers.forEach(function (picker) {
      var group = picker.getAttribute('data-group');
      var key = picker.getAttribute('data-key');
      if (group === 'leaseStatus') {
        COLOR_CONFIG.leaseStatus[key] = picker.value;
      } else if (group === 'scholarship') {
        COLOR_CONFIG.scholarship[key] = picker.value;
      } else if (group === 'sharedUnit') {
        COLOR_CONFIG.sharedUnit[key] = picker.value;
      } else if (group === 'blank') {
        COLOR_CONFIG.blank = picker.value;
      } else if (group === 'stroke') {
        COLOR_CONFIG.stroke = picker.value;
      }
    });

    rebuildLegendItems();
    persistColors();
    closeColorEditor();
    if (callbacks.onSave) callbacks.onSave();
  });

  document.getElementById('color-reset-btn').addEventListener('click', function () {
    if (!confirm('Reset all colors to factory defaults?')) return;

    var keys;
    keys = Object.keys(DEFAULT_COLORS.leaseStatus);
    for (var i = 0; i < keys.length; i++) {
      COLOR_CONFIG.leaseStatus[keys[i]] = DEFAULT_COLORS.leaseStatus[keys[i]];
    }
    keys = Object.keys(DEFAULT_COLORS.scholarship);
    for (var i = 0; i < keys.length; i++) {
      COLOR_CONFIG.scholarship[keys[i]] = DEFAULT_COLORS.scholarship[keys[i]];
    }
    keys = Object.keys(DEFAULT_COLORS.sharedUnit);
    for (var i = 0; i < keys.length; i++) {
      COLOR_CONFIG.sharedUnit[keys[i]] = DEFAULT_COLORS.sharedUnit[keys[i]];
    }
    COLOR_CONFIG.blank = DEFAULT_COLORS.blank;
    COLOR_CONFIG.stroke = DEFAULT_COLORS.stroke;

    rebuildLegendItems();
    persistColors();
    closeColorEditor();
    if (callbacks.onSave) callbacks.onSave();
  });

  document.getElementById('color-cancel-btn').addEventListener('click', function () {
    closeColorEditor();
  });
}

function closeColorEditor() {
  hideModal();
}

/* ------------------------------------------------------------------
   SCHOLARSHIP SPREADSHEET PARSING
   ------------------------------------------------------------------ */

function parseScholarshipSpreadsheet(file) {
  return new Promise(function (resolve, reject) {
    var reader = new FileReader();
    reader.onerror = function () { reject(new Error('Failed to read scholarship file.')); };

    reader.onload = function (e) {
      try {
        var data = new Uint8Array(e.target.result);
        var workbook = XLSX.read(data, { type: 'array' });
        var sheetName = workbook.SheetNames[0];
        if (!sheetName) { reject(new Error('No sheets found.')); return; }

        var sheet = workbook.Sheets[sheetName];
        var jsonRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        if (jsonRows.length === 0) { reject(new Error('Spreadsheet is empty.')); return; }

        var rawHeaders = Object.keys(jsonRows[0]);
        var nameCol = null;
        var scholarshipCol = null;

        for (var h = 0; h < rawHeaders.length; h++) {
          var upper = rawHeaders[h].trim().toUpperCase();
          if (upper === 'NAME') nameCol = rawHeaders[h];
          else if (upper === 'SCHOLARSHIP AWARDED' || upper === 'SCHOLARSHIP_AWARDED' || upper === 'SCHOLARSHIP') scholarshipCol = rawHeaders[h];
        }

        if (!nameCol) { reject(new Error('Missing "Name" column.')); return; }
        if (!scholarshipCol) { reject(new Error('Missing "Scholarship Awarded" column.')); return; }

        var entries = [];
        var warnings = [];

        for (var i = 0; i < jsonRows.length; i++) {
          var name = (jsonRows[i][nameCol] || '').toString().trim();
          var scholarship = (jsonRows[i][scholarshipCol] || '').toString().trim();
          if (!name) {
            warnings.push('Row ' + (i + 2) + ': Missing name -- skipped.');
            continue;
          }
          if (!scholarship) {
            warnings.push('Row ' + (i + 2) + ': Missing scholarship for "' + name + '" -- skipped.');
            continue;
          }
          entries.push({ name: name, scholarship: scholarship });
        }

        resolve({ entries: entries, warnings: warnings });
      } catch (err) {
        reject(new Error('Parse error: ' + err.message));
      }
    };

    reader.readAsArrayBuffer(file);
  });
}

function findResidentMatches(scholarshipName, residents) {
  if (!residents || residents.size === 0) return [];

  var normalizedQuery = scholarshipName.toUpperCase().trim();
  var queryParts = normalizedQuery.split(/\s+/);
  var matches = [];

  residents.forEach(function (resident, unitKey) {
    var residentName = (resident.Resident_Name || '').toUpperCase().trim();
    if (!residentName) return;

    if (residentName === normalizedQuery) {
      matches.push({ unitKey: unitKey, resident: resident, score: 100 });
      return;
    }

    var resParts = residentName.split(/\s+/);

    var allQueryInRes = queryParts.every(function (qp) { return resParts.some(function (rp) { return rp.includes(qp) || qp.includes(rp); }); });
    var allResInQuery = resParts.every(function (rp) { return queryParts.some(function (qp) { return qp.includes(rp) || rp.includes(qp); }); });

    if (allQueryInRes && allResInQuery) {
      matches.push({ unitKey: unitKey, resident: resident, score: 90 });
      return;
    }

    if (allQueryInRes || allResInQuery) {
      matches.push({ unitKey: unitKey, resident: resident, score: 70 });
      return;
    }

    var partialMatch = queryParts.some(function (qp) { return resParts.some(function (rp) { return rp.includes(qp) || qp.includes(rp); }); });
    if (partialMatch && queryParts.length > 1) {
      matches.push({ unitKey: unitKey, resident: resident, score: 40 });
    }
  });

  matches.sort(function (a, b) { return b.score - a.score; });
  return matches;
}

/* ------------------------------------------------------------------
   SCHOLARSHIP MATCHING WIZARD
   Uses generic modal.
   ------------------------------------------------------------------ */

function openScholarshipWizard(entries, residents, callbacks) {
  var currentIndex = 0;
  var updatedCount = 0;
  var selectedMatch = null;

  function renderStep() {
    if (currentIndex >= entries.length) {
      showModal(
        'Scholarship Matching Complete',
        '<div class="wizard-complete"><p>Matching complete. <strong>' + updatedCount + '</strong> resident record(s) updated.</p></div>',
        '<button class="btn btn-primary" id="wizard-done-btn">Done</button>'
      );
      document.getElementById('wizard-done-btn').addEventListener('click', function () {
        closeScholarshipWizard();
        if (callbacks.onComplete) callbacks.onComplete(updatedCount);
      });
      return;
    }

    var entry = entries[currentIndex];
    var matchList = findResidentMatches(entry.name, residents);
    selectedMatch = null;

    var bodyHtml =
      '<div class="wizard-progress">Entry ' + (currentIndex + 1) + ' of ' + entries.length + '</div>' +
      '<div class="wizard-entry-info">' +
        '<div class="wizard-entry-row"><strong>Scholarship Name:</strong> ' + escapeHtml(entry.name) + '</div>' +
        '<div class="wizard-entry-row"><strong>Scholarship Awarded:</strong> <span class="wizard-scholarship-badge">' + escapeHtml(entry.scholarship) + '</span></div>' +
      '</div>';

    if (matchList.length === 0) {
      bodyHtml += '<div class="wizard-no-match">No matching residents found for this name.</div>';
    } else {
      bodyHtml += '<div class="wizard-match-label">Potential matches (' + matchList.length + '):</div>';
      bodyHtml += '<div class="wizard-match-list">';
      for (var m = 0; m < matchList.length; m++) {
        var match = matchList[m];
        var scoreLabel = match.score >= 90 ? 'Exact' : match.score >= 70 ? 'Strong' : 'Partial';
        var scoreClass = match.score >= 90 ? 'score-exact' : match.score >= 70 ? 'score-strong' : 'score-partial';
        bodyHtml +=
          '<div class="wizard-match-item' + (m === 0 ? ' selected' : '') + '" data-match-idx="' + m + '">' +
            '<div class="wizard-match-name">' + escapeHtml(match.resident.Resident_Name) + '</div>' +
            '<div class="wizard-match-detail">Unit: ' + escapeHtml(match.resident.Unit_Assigned) + ' | Current Scholarship: ' + escapeHtml(match.resident.Scholarship || 'NONE') + '</div>' +
            '<span class="wizard-match-score ' + scoreClass + '">' + scoreLabel + '</span>' +
          '</div>';
      }
      bodyHtml += '</div>';
    }

    var footerHtml =
      '<button class="btn btn-primary" id="wizard-confirm-btn"' + (matchList.length === 0 ? ' disabled' : '') + '>Confirm Match</button>' +
      '<button class="btn btn-secondary" id="wizard-skip-btn">Skip</button>' +
      '<button class="btn btn-secondary" id="wizard-cancel-btn">Cancel</button>';

    showModal('Scholarship Matching Wizard', bodyHtml, footerHtml);

    // Set default selection
    if (matchList.length > 0) {
      selectedMatch = matchList[0];
    }

    // Wire match selection
    var matchItems = document.querySelectorAll('.wizard-match-item');
    matchItems.forEach(function (item) {
      item.addEventListener('click', function () {
        matchItems.forEach(function (el) { el.classList.remove('selected'); });
        item.classList.add('selected');
        var idx = parseInt(item.getAttribute('data-match-idx'));
        selectedMatch = matchList[idx];
        var confirmBtn = document.getElementById('wizard-confirm-btn');
        if (confirmBtn) confirmBtn.disabled = false;
      });
    });

    // Wire buttons
    document.getElementById('wizard-confirm-btn').addEventListener('click', function () {
      if (selectedMatch && currentIndex < entries.length) {
        var wizEntry = entries[currentIndex];
        if (callbacks.onUpdate) {
          callbacks.onUpdate(selectedMatch.unitKey, wizEntry.scholarship);
        }
        updatedCount++;
      }
      currentIndex++;
      renderStep();
    });

    document.getElementById('wizard-skip-btn').addEventListener('click', function () {
      currentIndex++;
      renderStep();
    });

    document.getElementById('wizard-cancel-btn').addEventListener('click', function () {
      closeScholarshipWizard();
      if (callbacks.onComplete) callbacks.onComplete(updatedCount);
    });
  }

  renderStep();
}

function closeScholarshipWizard() {
  hideModal();
}

/* ------------------------------------------------------------------
   DELETE RESIDENTS — UI CONTROLS
   ------------------------------------------------------------------ */

function populateDeleteSubSelector(mode, inventory) {
  // This renders inside the generic modal or a dedicated delete section.
  // Find or create the sub-selector in the current modal body.
  var container = document.getElementById('delete-sub-selector-group');
  var select = document.getElementById('delete-sub-selector');

  if (!container || !select) return;

  select.innerHTML = '';

  if (mode === 'all') {
    container.style.display = 'none';
    return;
  }

  container.style.display = 'block';

  if (mode === 'floorplan') {
    var label = container.querySelector('label');
    if (label) label.textContent = 'Select Floorplan Type';

    var types = inventory ? getInventoryUnitTypes(inventory) : [];
    if (types.length === 0) {
      var opt = document.createElement('option');
      opt.value = '';
      opt.textContent = '(No floorplan types in inventory)';
      opt.disabled = true;
      select.appendChild(opt);
    } else {
      var defaultOpt = document.createElement('option');
      defaultOpt.value = '';
      defaultOpt.textContent = '-- Select Type --';
      select.appendChild(defaultOpt);
      for (var i = 0; i < types.length; i++) {
        var opt = document.createElement('option');
        opt.value = types[i];
        opt.textContent = types[i];
        select.appendChild(opt);
      }
    }
  } else if (mode === 'scholarship') {
    var label = container.querySelector('label');
    if (label) label.textContent = 'Select Scholarship';

    var defaultOpt = document.createElement('option');
    defaultOpt.value = '';
    defaultOpt.textContent = '-- Select Scholarship --';
    select.appendChild(defaultOpt);

    for (var i = 0; i < ALLOWED_SCHOLARSHIPS.length; i++) {
      var opt = document.createElement('option');
      opt.value = ALLOWED_SCHOLARSHIPS[i];
      opt.textContent = ALLOWED_SCHOLARSHIPS[i];
      select.appendChild(opt);
    }
  } else if (mode === 'lease') {
    var label = container.querySelector('label');
    if (label) label.textContent = 'Select Lease Type';

    var defaultOpt = document.createElement('option');
    defaultOpt.value = '';
    defaultOpt.textContent = '-- Select Lease Type --';
    select.appendChild(defaultOpt);

    for (var i = 0; i < ALLOWED_LEASE_STATUSES.length; i++) {
      var opt = document.createElement('option');
      opt.value = ALLOWED_LEASE_STATUSES[i];
      opt.textContent = ALLOWED_LEASE_STATUSES[i];
      select.appendChild(opt);
    }
  }
}

function showDeleteConfirmation1(description, count, onProceed) {
  showModal(
    'Confirm Deletion',
    '<p>' + escapeHtml(description) + '</p>' +
    '<p><strong>' + count + ' resident(s) will be deleted.</strong></p>',
    '<button class="btn btn-secondary" id="delete-cancel-1">Cancel</button>' +
    '<button class="btn btn-primary" id="delete-proceed-1">Proceed</button>'
  );

  document.getElementById('delete-cancel-1').addEventListener('click', hideModal);
  document.getElementById('delete-proceed-1').addEventListener('click', function () {
    hideModal();
    onProceed();
  });
}

function showDeleteConfirmation2(onConfirm) {
  showModal(
    'Final Confirmation',
    '<p>Type <strong>' + DELETE_CONFIRMATION_PHRASE + '</strong> to confirm deletion:</p>' +
    '<input type="text" id="delete-confirm-input" class="text-input" placeholder="Type ' + DELETE_CONFIRMATION_PHRASE + '" />' +
    '<div id="delete-confirm-error" class="validation-message"></div>',
    '<button class="btn btn-secondary" id="delete-cancel-2">Cancel</button>' +
    '<button class="btn btn-primary" id="delete-confirm-2">Confirm Delete</button>'
  );

  document.getElementById('delete-cancel-2').addEventListener('click', hideModal);
  document.getElementById('delete-confirm-2').addEventListener('click', function () {
    var val = document.getElementById('delete-confirm-input').value.trim().toUpperCase();
    if (val !== DELETE_CONFIRMATION_PHRASE) {
      var errEl = document.getElementById('delete-confirm-error');
      errEl.textContent = 'You must type "' + DELETE_CONFIRMATION_PHRASE + '" to confirm.';
      errEl.className = 'validation-message validation-error';
      return;
    }
    hideModal();
    onConfirm();
  });
}

function showDeleteSuccess(message) {
  // Show a temporary success notification
  showNotification(message, 'success');
}

function showDeleteInfo(message) {
  showNotification(message, 'info');
}

/**
 * Show a temporary notification toast.
 * @param {string} message
 * @param {string} type - 'success', 'info', 'error'
 */
function showNotification(message, type) {
  var existing = document.querySelector('.notification-toast');
  if (existing) existing.remove();

  var toast = document.createElement('div');
  toast.className = 'notification-toast notification-' + (type || 'info');
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(function () {
    toast.classList.add('notification-fade');
    setTimeout(function () {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 500);
  }, 4000);
}

/* ------------------------------------------------------------------
   UNASSIGNED SCHOLARSHIPS UI
   ------------------------------------------------------------------ */

function renderUnassignedScholarships(items, residents, callbacks) {
  // Render in scholarship section in the right panel
  var container = document.getElementById('scholarship-section');
  if (!container) return;

  var listEl = container.querySelector('.unassigned-scholarships-section');
  if (!listEl) {
    listEl = document.createElement('div');
    listEl.className = 'unassigned-scholarships-section';
    container.appendChild(listEl);
  }
  listEl.innerHTML = '';

  if (!items || items.length === 0) {
    listEl.innerHTML =
      '<h3>Unassigned Scholarships <span class="unassigned-count">0</span></h3>' +
      '<div class="section-empty">No unassigned scholarships.</div>';
    return;
  }

  var headerHtml = '<h3>Unassigned Scholarships <span class="unassigned-count">' + items.length + '</span></h3>';
  listEl.innerHTML = headerHtml;

  for (var i = 0; i < items.length; i++) {
    (function (item) {
      var card = document.createElement('div');
      card.className = 'unassigned-card';

      var infoDiv = document.createElement('div');
      infoDiv.className = 'unassigned-info';
      infoDiv.innerHTML =
        '<span class="unassigned-name">' + escapeHtml(item.name) + '</span>' +
        '<span class="unassigned-sch">' + escapeHtml(item.scholarship) + '</span>';

      var actionsDiv = document.createElement('div');
      actionsDiv.className = 'unassigned-actions';

      var selectEl = document.createElement('select');
      selectEl.className = 'select-input unassigned-select';
      selectEl.innerHTML = '<option value="">Select resident</option>';

      if (residents && residents.size > 0) {
        var sorted = [];
        residents.forEach(function (r, key) {
          sorted.push({ key: key, name: r.Resident_Name, unit: r.Unit_Assigned });
        });
        sorted.sort(function (a, b) { return (a.name || '').localeCompare(b.name || ''); });
        for (var j = 0; j < sorted.length; j++) {
          var opt = document.createElement('option');
          opt.value = sorted[j].key;
          opt.textContent = sorted[j].name + ' (' + sorted[j].unit + ')';
          selectEl.appendChild(opt);
        }
      }

      var transferBtn = document.createElement('button');
      transferBtn.className = 'btn btn-tiny';
      transferBtn.textContent = 'Transfer';
      transferBtn.addEventListener('click', function () {
        var selectedKey = selectEl.value;
        if (!selectedKey) {
          alert('Please select a resident to transfer the scholarship to.');
          return;
        }
        if (callbacks.onTransfer) callbacks.onTransfer(item, selectedKey);
      });

      actionsDiv.appendChild(selectEl);
      actionsDiv.appendChild(transferBtn);
      card.appendChild(infoDiv);
      card.appendChild(actionsDiv);
      listEl.appendChild(card);
    })(items[i]);
  }
}

/* ------------------------------------------------------------------
   SCHOLARSHIP RESERVED UNITS UI
   Renders into #reserved-units-list and #reserved-units-summary.
   ------------------------------------------------------------------ */

function renderReservedUnits(reservedUnitsMap, callbacks) {
  var listEl = document.getElementById('reserved-units-list');
  if (!listEl) return;
  listEl.innerHTML = '';

  if (!reservedUnitsMap || reservedUnitsMap.size === 0) {
    listEl.innerHTML = '<div class="section-empty">No units reserved.</div>';
    return;
  }

  var entries = [];
  reservedUnitsMap.forEach(function (scholarship, unitKey) {
    entries.push({ unitKey: unitKey, scholarship: scholarship });
  });

  entries.sort(function (a, b) {
    return a.unitKey.localeCompare(b.unitKey, undefined, { numeric: true, sensitivity: 'base' });
  });

  for (var i = 0; i < entries.length; i++) {
    (function (entry) {
      var row = document.createElement('div');
      row.className = 'reserved-unit-row';
      row.title = 'Click to edit';
      row.style.cursor = 'pointer';

      var unitSpan = document.createElement('span');
      unitSpan.className = 'reserved-unit-id';
      unitSpan.textContent = entry.unitKey;

      var schSpan = document.createElement('span');
      schSpan.className = 'reserved-unit-scholarship';
      schSpan.textContent = entry.scholarship;

      var removeBtn = document.createElement('button');
      removeBtn.className = 'reserved-unit-remove-btn';
      removeBtn.textContent = '×';
      removeBtn.title = 'Remove reservation';
      removeBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        if (callbacks.onRemove) callbacks.onRemove(entry.unitKey);
      });

      row.addEventListener('click', function () {
        if (callbacks.onEdit) callbacks.onEdit(entry.unitKey, entry.scholarship);
      });

      row.appendChild(unitSpan);
      row.appendChild(schSpan);
      row.appendChild(removeBtn);
      listEl.appendChild(row);
    })(entries[i]);
  }
}

function renderReservedUnitsSummary(reservedUnitsMap) {
  var summaryEl = document.getElementById('reserved-units-summary');
  if (!summaryEl) return;
  summaryEl.innerHTML = '';

  if (!reservedUnitsMap || reservedUnitsMap.size === 0) return;

  var counts = {};
  reservedUnitsMap.forEach(function (scholarship) {
    var key = scholarship.toUpperCase();
    counts[key] = (counts[key] || 0) + 1;
  });

  var total = 0;
  var sorted = Object.entries(counts).sort(function (a, b) { return b[1] - a[1]; });

  var html = '<div class="reserved-summary-grid">';
  for (var i = 0; i < sorted.length; i++) {
    html += '<div class="reserved-summary-row">' +
      '<span class="reserved-summary-label">' + escapeHtml(sorted[i][0]) + '</span>' +
      '<span class="reserved-summary-count">' + sorted[i][1] + '</span>' +
      '</div>';
    total += sorted[i][1];
  }
  html += '<div class="reserved-summary-row reserved-summary-total">' +
    '<span class="reserved-summary-label">Total Reserved</span>' +
    '<span class="reserved-summary-count">' + total + '</span>' +
    '</div>';
  html += '</div>';

  summaryEl.innerHTML = html;
}

function openReserveUnitModal(inventory, residents, reservedUnitsMap, callbacks) {
  var title = 'Reserve Unit for Scholarship';

  var scholarshipOptions = '<option value="">-- Select Scholarship --</option>';
  for (var i = 0; i < ALLOWED_SCHOLARSHIPS.length; i++) {
    if (ALLOWED_SCHOLARSHIPS[i] === 'NONE') continue;
    scholarshipOptions += '<option value="' + escapeHtml(ALLOWED_SCHOLARSHIPS[i]) + '">' + escapeHtml(ALLOWED_SCHOLARSHIPS[i]) + '</option>';
  }

  var bodyHtml =
    '<form id="reserve-unit-form" class="modal-form">' +
      '<div class="form-group">' +
        '<label for="reserve-unit-search">Unit</label>' +
        '<div class="searchable-select-wrapper">' +
          '<input type="text" id="reserve-unit-search" class="text-input" placeholder="Type to search units..." autocomplete="off" />' +
          '<input type="hidden" id="reserve-unit-value" />' +
          '<div id="reserve-unit-dropdown" class="searchable-dropdown"></div>' +
        '</div>' +
      '</div>' +
      '<div class="form-group">' +
        '<label for="reserve-scholarship-select">Scholarship</label>' +
        '<select id="reserve-scholarship-select" class="select-input" required>' + scholarshipOptions + '</select>' +
      '</div>' +
    '</form>';

  var footerHtml =
    '<button type="button" class="btn btn-secondary" id="reserve-cancel-btn">Cancel</button>' +
    '<button type="submit" form="reserve-unit-form" class="btn btn-primary" id="reserve-confirm-btn">Reserve</button>';

  showModal(title, bodyHtml, footerHtml);

  var unitItems = [];
  if (inventory && inventory.length > 0) {
    var sorted = inventory.slice().sort(function (a, b) {
      return a.unitNumber.localeCompare(b.unitNumber, undefined, { numeric: true, sensitivity: 'base' });
    });
    for (var i = 0; i < sorted.length; i++) {
      var unitKey = sorted[i].unitNumber.toUpperCase();
      var alreadyReserved = reservedUnitsMap && reservedUnitsMap.has(unitKey);
      unitItems.push({
        value: sorted[i].unitNumber,
        label: sorted[i].unitNumber + (sorted[i].unitType ? ' (' + sorted[i].unitType + ')' : ''),
        disabled: alreadyReserved,
        tag: alreadyReserved ? 'RESERVED' : '',
      });
    }
  }

  var searchInput = document.getElementById('reserve-unit-search');
  var hiddenInput = document.getElementById('reserve-unit-value');
  var dropdown = document.getElementById('reserve-unit-dropdown');

  function renderDropdown(query) {
    dropdown.innerHTML = '';
    var q = (query || '').trim().toUpperCase();
    var matches = unitItems.filter(function (item) {
      if (!q) return true;
      return item.label.toUpperCase().includes(q);
    });

    if (matches.length === 0) {
      dropdown.innerHTML = '<div class="searchable-dropdown-empty">No matching units</div>';
      dropdown.style.display = 'block';
      return;
    }

    var maxShow = 30;
    var toShow = matches.slice(0, maxShow);
    for (var i = 0; i < toShow.length; i++) {
      (function (item) {
        var el = document.createElement('div');
        el.className = 'searchable-dropdown-item' + (item.disabled ? ' searchable-dropdown-disabled' : '');
        el.textContent = item.label + (item.tag ? ' [' + item.tag + ']' : '');
        if (!item.disabled) {
          el.addEventListener('mousedown', function (e) {
            e.preventDefault();
            searchInput.value = item.label;
            hiddenInput.value = item.value;
            dropdown.style.display = 'none';
          });
        }
        dropdown.appendChild(el);
      })(toShow[i]);
    }

    if (matches.length > maxShow) {
      var more = document.createElement('div');
      more.className = 'searchable-dropdown-more';
      more.textContent = '... ' + (matches.length - maxShow) + ' more — keep typing to narrow';
      dropdown.appendChild(more);
    }

    dropdown.style.display = 'block';
  }

  searchInput.addEventListener('focus', function () {
    renderDropdown(searchInput.value);
  });

  searchInput.addEventListener('input', function () {
    hiddenInput.value = '';
    renderDropdown(searchInput.value);
  });

  searchInput.addEventListener('blur', function () {
    setTimeout(function () { dropdown.style.display = 'none'; }, 150);
  });

  document.getElementById('reserve-cancel-btn').addEventListener('click', hideModal);

  document.getElementById('reserve-unit-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var selectedUnit = hiddenInput.value;
    var selectedScholarship = document.getElementById('reserve-scholarship-select').value;

    if (!selectedUnit) {
      searchInput.focus();
      renderDropdown(searchInput.value);
      return;
    }

    if (!selectedScholarship) {
      return;
    }

    hideModal();
    if (callbacks.onReserve) callbacks.onReserve(selectedUnit, selectedScholarship);
  });
}

function openEditReserveUnitModal(unitKey, currentScholarship, inventory, reservedUnitsMap, callbacks) {
  var title = 'Edit Reserved Unit';

  var unitLabel = unitKey;
  if (inventory && inventory.length > 0) {
    for (var i = 0; i < inventory.length; i++) {
      if (inventory[i].unitNumber.toUpperCase() === unitKey) {
        unitLabel = inventory[i].unitNumber + (inventory[i].unitType ? ' (' + inventory[i].unitType + ')' : '');
        break;
      }
    }
  }

  var scholarshipOptions = '';
  for (var i = 0; i < ALLOWED_SCHOLARSHIPS.length; i++) {
    if (ALLOWED_SCHOLARSHIPS[i] === 'NONE') continue;
    var sel = ALLOWED_SCHOLARSHIPS[i].toUpperCase() === currentScholarship.toUpperCase() ? ' selected' : '';
    scholarshipOptions += '<option value="' + escapeHtml(ALLOWED_SCHOLARSHIPS[i]) + '"' + sel + '>' + escapeHtml(ALLOWED_SCHOLARSHIPS[i]) + '</option>';
  }

  var bodyHtml =
    '<form id="edit-reserve-form" class="modal-form">' +
      '<div class="form-group">' +
        '<label>Unit</label>' +
        '<div class="edit-reserve-unit-display">' + escapeHtml(unitLabel) + '</div>' +
      '</div>' +
      '<div class="form-group">' +
        '<label for="edit-reserve-scholarship">Scholarship</label>' +
        '<select id="edit-reserve-scholarship" class="select-input" required>' + scholarshipOptions + '</select>' +
      '</div>' +
    '</form>';

  var footerHtml =
    '<button type="button" class="btn btn-secondary" id="edit-reserve-cancel-btn">Cancel</button>' +
    '<button type="submit" form="edit-reserve-form" class="btn btn-primary" id="edit-reserve-save-btn">Save</button>';

  showModal(title, bodyHtml, footerHtml);

  document.getElementById('edit-reserve-cancel-btn').addEventListener('click', hideModal);

  document.getElementById('edit-reserve-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var newScholarship = document.getElementById('edit-reserve-scholarship').value;
    if (!newScholarship) return;
    hideModal();
    if (callbacks.onSave) callbacks.onSave(unitKey, newScholarship);
  });
}

/* ------------------------------------------------------------------
   SCHOLARSHIP AUDIT UI
   Renders into #scholarship-audit-table.
   ------------------------------------------------------------------ */

function renderScholarshipAudit(tab, residents, inventory) {
  var content = document.getElementById('scholarship-audit-table');
  if (!content) return;
  content.innerHTML = '';

  if (!residents || residents.size === 0) {
    content.innerHTML = '<div class="section-empty">No resident data loaded.</div>';
    return;
  }

  // Update active tab styling
  var viewSelector = document.getElementById('scholarship-view-selector');
  if (viewSelector) viewSelector.value = tab;

  switch (tab) {
    case 'overall':
    case 'all':
      renderAuditOverall(content, residents);
      break;
    case 'floorplan':
      renderAuditByFloorplan(content, residents, inventory);
      break;
    case 'building':
      renderAuditByBuilding(content, residents);
      break;
    case 'floor':
      renderAuditByFloor(content, residents);
      break;
  }
}

function renderAuditOverall(container, residents) {
  var counts = getScholarshipCountsOverall(residents);
  if (Object.keys(counts).length === 0) {
    container.innerHTML = '<div class="section-empty">No scholarships assigned.</div>';
    return;
  }
  container.appendChild(buildAuditTable(counts, 'Scholarship', 'Count'));
}

function renderAuditByFloorplan(container, residents, inventory) {
  var grouped = getScholarshipCountsByFloorplan(residents, inventory);
  if (Object.keys(grouped).length === 0) {
    container.innerHTML = '<div class="section-empty">No scholarships assigned.</div>';
    return;
  }
  var sortedKeys = Object.keys(grouped).sort();
  for (var i = 0; i < sortedKeys.length; i++) {
    var fp = sortedKeys[i];
    var counts = grouped[fp];
    var heading = document.createElement('div');
    heading.className = 'audit-group-label';
    heading.textContent = fp;
    container.appendChild(heading);
    container.appendChild(buildAuditTable(counts, 'Scholarship', 'Count'));
  }
}

function renderAuditByBuilding(container, residents) {
  var grouped = getScholarshipCountsByBuilding(residents);
  if (Object.keys(grouped).length === 0) {
    container.innerHTML = '<div class="section-empty">No scholarships assigned.</div>';
    return;
  }
  var sortedKeys = Object.keys(grouped).sort();
  for (var i = 0; i < sortedKeys.length; i++) {
    var bld = sortedKeys[i];
    var counts = grouped[bld];
    var heading = document.createElement('div');
    heading.className = 'audit-group-label';
    heading.textContent = bld === 'Unknown' ? 'Unknown Building' : getBuildingLabel(bld);
    container.appendChild(heading);
    container.appendChild(buildAuditTable(counts, 'Scholarship', 'Count'));
  }
}

function renderAuditByFloor(container, residents) {
  var grouped = getScholarshipCountsByFloor(residents);
  if (Object.keys(grouped).length === 0) {
    container.innerHTML = '<div class="section-empty">No scholarships assigned.</div>';
    return;
  }
  var sortedKeys = Object.keys(grouped).sort();
  for (var i = 0; i < sortedKeys.length; i++) {
    var floorKey = sortedKeys[i];
    var counts = grouped[floorKey];
    var heading = document.createElement('div');
    heading.className = 'audit-group-label';
    if (floorKey === 'Unknown') {
      heading.textContent = 'Unknown Floor';
    } else {
      var parts = floorKey.split('-');
      heading.textContent = getBuildingLabel(parts[0]) + ' ' + getFloorLabel(parseInt(parts[1]));
    }
    container.appendChild(heading);
    container.appendChild(buildAuditTable(counts, 'Scholarship', 'Count'));
  }
}

function buildAuditTable(counts, col1, col2) {
  var table = document.createElement('table');
  table.className = 'audit-table';

  var thead = document.createElement('thead');
  thead.innerHTML = '<tr><th>' + col1 + '</th><th>' + col2 + '</th></tr>';
  table.appendChild(thead);

  var tbody = document.createElement('tbody');
  var sorted = Object.entries(counts).sort(function (a, b) { return b[1] - a[1]; });
  var total = 0;

  for (var i = 0; i < sorted.length; i++) {
    var key = sorted[i][0];
    var count = sorted[i][1];
    var tr = document.createElement('tr');
    tr.innerHTML = '<td>' + escapeHtml(key) + '</td><td>' + count + '</td>';
    tbody.appendChild(tr);
    total += count;
  }

  var totalTr = document.createElement('tr');
  totalTr.className = 'audit-total-row';
  totalTr.innerHTML = '<td><strong>Total</strong></td><td><strong>' + total + '</strong></td>';
  tbody.appendChild(totalTr);

  table.appendChild(tbody);
  return table;
}

/* ------------------------------------------------------------------
   VARIANCE ANALYSIS DISPLAY (NEW)
   Renders into #variance-analysis.
   ------------------------------------------------------------------ */

function renderVarianceAnalysis(varianceData, overTargetRecords) {
  var container = document.getElementById('variance-analysis');
  if (!container) return;
  container.innerHTML = '';

  if (!varianceData || varianceData.length === 0) {
    container.innerHTML =
      '<div class="section-empty">No expected scholarship data uploaded. Upload expected recipients in the Import Data section (left sidebar) or below to see variance analysis.</div>';
    return;
  }

  var heading = document.createElement('h3');
  heading.textContent = 'Variance Analysis';
  container.appendChild(heading);

  var table = document.createElement('table');
  table.className = 'audit-table variance-table';

  var thead = document.createElement('thead');
  thead.innerHTML = '<tr><th>Scholarship</th><th>Floorplan</th><th>Expected</th><th>Actual</th><th>Variance</th></tr>';
  table.appendChild(thead);

  var tbody = document.createElement('tbody');

  for (var i = 0; i < varianceData.length; i++) {
    var row = varianceData[i];
    var tr = document.createElement('tr');

    if (row.scholarshipName === 'TOTAL') {
      tr.className = 'audit-total-row';
    }

    var varianceClass = '';
    if (row.variance > 0) varianceClass = 'variance-over';
    else if (row.variance < 0) varianceClass = 'variance-under';

    tr.innerHTML =
      '<td>' + (row.scholarshipName === 'TOTAL' ? '<strong>TOTAL</strong>' : escapeHtml(row.scholarshipName)) + '</td>' +
      '<td>' + escapeHtml(row.floorplan) + '</td>' +
      '<td>' + row.expected + '</td>' +
      '<td>' + row.actual + '</td>' +
      '<td class="' + varianceClass + '">' + (row.variance > 0 ? '+' : '') + row.variance + '</td>';

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  container.appendChild(table);

  // Over-target records button
  if (overTargetRecords && overTargetRecords.length > 0) {
    var pullBtn = document.createElement('button');
    pullBtn.className = 'btn btn-secondary';
    pullBtn.textContent = 'View Over-Target Records (' + overTargetRecords.length + ')';
    pullBtn.addEventListener('click', function () {
      showOverTargetRecordsModal(overTargetRecords);
    });
    container.appendChild(pullBtn);
  }
}

function showOverTargetRecordsModal(records) {
  var bodyHtml = '<table class="audit-table"><thead><tr><th>Name</th><th>Scholarship</th><th>Floorplan</th><th>Unit</th><th>Source</th></tr></thead><tbody>';
  for (var i = 0; i < records.length; i++) {
    var r = records[i];
    bodyHtml +=
      '<tr>' +
        '<td>' + escapeHtml(r.name) + '</td>' +
        '<td>' + escapeHtml(r.scholarship) + '</td>' +
        '<td>' + escapeHtml(r.floorplan) + '</td>' +
        '<td>' + escapeHtml(r.unit) + '</td>' +
        '<td>' + escapeHtml(r.source) + '</td>' +
      '</tr>';
  }
  bodyHtml += '</tbody></table>';

  showModal('Over-Target Scholarship Records', bodyHtml, '<button class="btn btn-primary" onclick="hideModal()">Close</button>');
}

/* ------------------------------------------------------------------
   MASTER LIST FLOORPLAN FILTER
   ------------------------------------------------------------------ */

function populateFloorplanFilter(inventory) {
  var select = document.getElementById('filter-floorplan');
  if (!select) return;

  var currentValue = select.value;
  select.innerHTML = '<option value="all">All Floorplans</option>';

  if (!inventory || inventory.length === 0) return;

  var types = getInventoryUnitTypes(inventory);
  var sorted = sortFloorplansByDisplayOrder(types);

  for (var i = 0; i < sorted.length; i++) {
    var opt = document.createElement('option');
    opt.value = sorted[i];
    opt.textContent = sorted[i];
    select.appendChild(opt);
  }

  if (currentValue && currentValue !== 'all') {
    var stillExists = sorted.some(function (fp) { return fp === currentValue; });
    if (stillExists) {
      select.value = currentValue;
    }
  }
}

/* ------------------------------------------------------------------
   PRELEASE PROGRESS
   Renders table into #prelease-table, chart into #prelease-chart.
   ------------------------------------------------------------------ */

function renderPreleaseProgress(progressData, scopeLabel) {
  var tableContainer = document.getElementById('prelease-table');
  var chartContainer = document.getElementById('prelease-chart');

  // Fall back to old container if new ones not found
  var oldContainer = document.getElementById('preleaseProgressContent');
  if (!tableContainer && oldContainer) {
    tableContainer = oldContainer;
    chartContainer = oldContainer;
  }

  if (!tableContainer) return;
  tableContainer.innerHTML = '';
  if (chartContainer && chartContainer !== tableContainer) chartContainer.innerHTML = '';

  // Scope label
  var scopeEl = document.createElement('div');
  scopeEl.className = 'prelease-scope-label';
  scopeEl.textContent = scopeLabel || 'Full Property';
  tableContainer.appendChild(scopeEl);

  if (!progressData || progressData.length === 0) {
    tableContainer.innerHTML += '<div class="section-empty">No inventory data available for prelease progress.</div>';
    return;
  }

  // Table
  var table = document.createElement('table');
  table.className = 'prelease-progress-table';

  var thead = document.createElement('thead');
  thead.innerHTML = '<tr><th>Unit Type</th><th>New Lease</th><th>Renewal</th><th>Total</th><th>Units</th><th>%</th></tr>';
  table.appendChild(thead);

  var tbody = document.createElement('tbody');

  for (var i = 0; i < progressData.length; i++) {
    var row = progressData[i];
    var tr = document.createElement('tr');
    var pctClass = row.percent >= 100 ? 'pct-full' : row.percent >= 75 ? 'pct-high' : row.percent >= 50 ? 'pct-mid' : 'pct-low';
    tr.innerHTML =
      '<td class="fp-name">' + escapeHtml(row.floorplan) + '</td>' +
      '<td>' + row.newLease + '</td>' +
      '<td>' + row.renewal + '</td>' +
      '<td><strong>' + row.totalPreleased + '</strong></td>' +
      '<td>' + row.totalUnits + '</td>' +
      '<td class="' + pctClass + '"><strong>' + row.percent + '%</strong></td>';
    tbody.appendChild(tr);
  }

  // Totals row
  var totals = getPreleaseProgressTotals(progressData);
  var totalPctClass = totals.percent >= 100 ? 'pct-full' : totals.percent >= 75 ? 'pct-high' : totals.percent >= 50 ? 'pct-mid' : 'pct-low';
  var totalTr = document.createElement('tr');
  totalTr.className = 'prelease-total-row';
  totalTr.innerHTML =
    '<td><strong>Total</strong></td>' +
    '<td><strong>' + totals.newLease + '</strong></td>' +
    '<td><strong>' + totals.renewal + '</strong></td>' +
    '<td><strong>' + totals.totalPreleased + '</strong></td>' +
    '<td><strong>' + totals.totalUnits + '</strong></td>' +
    '<td class="' + totalPctClass + '"><strong>' + totals.percent + '%</strong></td>';
  tbody.appendChild(totalTr);

  table.appendChild(tbody);
  tableContainer.appendChild(table);

  // Stacked bar chart
  var chartTarget = chartContainer || tableContainer;
  var chartDiv = document.createElement('div');
  chartDiv.className = 'prelease-chart';

  for (var i = 0; i < progressData.length; i++) {
    var row = progressData[i];
    if (row.totalUnits === 0) continue;

    var barRow = document.createElement('div');
    barRow.className = 'prelease-chart-row';

    var label = document.createElement('div');
    label.className = 'prelease-chart-label';
    label.textContent = row.floorplan;

    var barWrapper = document.createElement('div');
    barWrapper.className = 'prelease-chart-bar-wrapper';

    var newPct = (row.newLease / row.totalUnits) * 100;
    var renPct = (row.renewal / row.totalUnits) * 100;

    var barNew = document.createElement('div');
    barNew.className = 'prelease-chart-bar bar-new-lease';
    barNew.style.width = newPct + '%';
    if (row.newLease > 0) barNew.title = 'New Lease: ' + row.newLease;

    var barRen = document.createElement('div');
    barRen.className = 'prelease-chart-bar bar-renewal';
    barRen.style.width = renPct + '%';
    if (row.renewal > 0) barRen.title = 'Renewal: ' + row.renewal;

    barWrapper.appendChild(barNew);
    barWrapper.appendChild(barRen);

    var pctLabel = document.createElement('div');
    pctLabel.className = 'prelease-chart-pct';
    pctLabel.textContent = row.percent + '%';

    barRow.appendChild(label);
    barRow.appendChild(barWrapper);
    barRow.appendChild(pctLabel);
    chartDiv.appendChild(barRow);
  }

  // Chart legend
  var chartLegend = document.createElement('div');
  chartLegend.className = 'prelease-chart-legend';
  chartLegend.innerHTML =
    '<span class="prelease-chart-legend-item"><span class="prelease-legend-swatch bar-new-lease"></span> New Lease</span>' +
    '<span class="prelease-chart-legend-item"><span class="prelease-legend-swatch bar-renewal"></span> Renewal</span>';
  chartDiv.appendChild(chartLegend);

  chartTarget.appendChild(chartDiv);
}

/* ------------------------------------------------------------------
   ENHANCED PRELEASE PROGRESS (NEW)
   Uses computeEnhancedPreleaseProgress from inventory.js.
   Renders into #prelease-table + #prelease-chart.
   ------------------------------------------------------------------ */

function renderEnhancedPreleaseProgress(progressResult, scopeLabel) {
  var tableContainer = document.getElementById('prelease-table');
  var chartContainer = document.getElementById('prelease-chart');
  if (!tableContainer) return;

  tableContainer.innerHTML = '';
  if (chartContainer) chartContainer.innerHTML = '';

  var scopeEl = document.createElement('div');
  scopeEl.className = 'prelease-scope-label';
  scopeEl.textContent = scopeLabel || 'Full Property';
  tableContainer.appendChild(scopeEl);

  if (!progressResult || !progressResult.rows || progressResult.rows.length === 0) {
    tableContainer.innerHTML += '<div class="section-empty">No inventory data available for prelease progress.</div>';
    return;
  }

  var rows = progressResult.rows;
  var totals = progressResult.totals;

  // Table
  var table = document.createElement('table');
  table.className = 'prelease-progress-table';

  var thead = document.createElement('thead');
  thead.innerHTML = '<tr><th>Floorplan</th><th>Capacity</th><th>Preleased</th><th>% Progress</th></tr>';
  table.appendChild(thead);

  var tbody = document.createElement('tbody');

  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    var pctClass = row.percent >= 100 ? 'pct-full' : row.percent >= 75 ? 'pct-high' : row.percent >= 50 ? 'pct-mid' : 'pct-low';
    var tr = document.createElement('tr');
    tr.innerHTML =
      '<td class="fp-name">' + escapeHtml(row.floorplan) + '</td>' +
      '<td>' + row.capacity + '</td>' +
      '<td>' + row.preleased + '</td>' +
      '<td class="' + pctClass + '"><strong>' + row.percent + '%</strong></td>';
    tbody.appendChild(tr);
  }

  // Totals row
  var totalPctClass = totals.percent >= 100 ? 'pct-full' : totals.percent >= 75 ? 'pct-high' : totals.percent >= 50 ? 'pct-mid' : 'pct-low';
  var totalTr = document.createElement('tr');
  totalTr.className = 'prelease-total-row';
  totalTr.innerHTML =
    '<td><strong>Total</strong></td>' +
    '<td><strong>' + totals.capacity + '</strong></td>' +
    '<td><strong>' + totals.preleased + '</strong></td>' +
    '<td class="' + totalPctClass + '"><strong>' + totals.percent + '%</strong></td>';
  tbody.appendChild(totalTr);

  table.appendChild(tbody);
  tableContainer.appendChild(table);

  // Horizontal bar chart
  var chartTarget = chartContainer || tableContainer;
  var chartDiv = document.createElement('div');
  chartDiv.className = 'prelease-chart';

  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    if (row.capacity === 0) continue;

    var barRow = document.createElement('div');
    barRow.className = 'prelease-chart-row';

    var label = document.createElement('div');
    label.className = 'prelease-chart-label';
    label.textContent = row.floorplan;

    var barWrapper = document.createElement('div');
    barWrapper.className = 'prelease-chart-bar-wrapper';

    var barFill = document.createElement('div');
    barFill.className = 'prelease-chart-bar bar-new-lease';
    barFill.style.width = Math.min(row.percent, 100) + '%';
    barFill.title = row.preleased + ' / ' + row.capacity;
    barWrapper.appendChild(barFill);

    var pctLabel = document.createElement('div');
    pctLabel.className = 'prelease-chart-pct';
    pctLabel.textContent = row.percent + '%';

    barRow.appendChild(label);
    barRow.appendChild(barWrapper);
    barRow.appendChild(pctLabel);
    chartDiv.appendChild(barRow);
  }

  chartTarget.appendChild(chartDiv);
}

/* ------------------------------------------------------------------
   PRELEASE IMPORT SUMMARY
   Uses generic modal.
   ------------------------------------------------------------------ */

function renderPreleaseImportSummary(summary, reportSummary, warnings) {
  var bodyHtml = '';

  // Import Statistics
  bodyHtml += '<div class="prelease-summary-section"><h3 class="prelease-summary-subtitle">Import Statistics</h3>';
  bodyHtml += '<div class="prelease-stats-grid">';

  var statItems = [
    { label: 'Total Rows Scanned', value: summary.totalRowsScanned, cls: '' },
    { label: 'Valid Resident Rows', value: summary.validResidentRows, cls: '' },
    { label: 'Placed Residents Added', value: summary.placedCount, cls: 'stat-success' },
    { label: 'Bank Residents Added', value: summary.bankCount, cls: 'stat-success' },
    { label: 'Skipped Label/Non-Resident', value: summary.skippedLabelRows, cls: 'stat-muted' },
    { label: 'Skipped Unsupported Type', value: summary.skippedUnsupportedType, cls: 'stat-warn' },
    { label: 'Skipped Lease Started (Bank)', value: summary.skippedLeaseStartedBank, cls: 'stat-warn' },
    { label: 'Skipped Malformed Rows', value: summary.skippedMalformed, cls: 'stat-warn' },
    { label: 'Skipped Blank Rows', value: summary.skippedBlankRows, cls: 'stat-muted' },
  ];

  for (var i = 0; i < statItems.length; i++) {
    var item = statItems[i];
    bodyHtml += '<div class="prelease-stat-item ' + item.cls + '">' +
      '<span class="prelease-stat-value">' + item.value + '</span>' +
      '<span class="prelease-stat-label">' + escapeHtml(item.label) + '</span></div>';
  }
  bodyHtml += '</div></div>';

  // Lease Status Breakdown
  bodyHtml += '<div class="prelease-summary-section"><h3 class="prelease-summary-subtitle">Lease Status Breakdown</h3>';
  bodyHtml += '<table class="audit-table"><thead><tr><th>Status</th><th>Count</th></tr></thead><tbody>';
  bodyHtml += '<tr><td>New Lease</td><td>' + summary.newLeaseCount + '</td></tr>';
  bodyHtml += '<tr><td>Renewal</td><td>' + summary.renewalCount + '</td></tr>';
  bodyHtml += '<tr><td>Renewal Pending - Started</td><td>' + summary.renewalPendingStartedCount + '</td></tr>';
  bodyHtml += '<tr class="audit-total-row"><td><strong>Total Imported</strong></td><td><strong>' + (summary.placedCount + summary.bankCount) + '</strong></td></tr>';
  bodyHtml += '</tbody></table></div>';

  // Report Summary Audit
  if (reportSummary && reportSummary.raw && reportSummary.raw.length > 0) {
    bodyHtml += '<div class="prelease-summary-section"><h3 class="prelease-summary-subtitle">Report Summary Audit (V7:Y17)</h3>';
    bodyHtml += '<p class="prelease-audit-note">Values extracted from the Prelease report summary area for verification against imported counts.</p>';
    bodyHtml += '<table class="audit-table"><thead><tr><th>Row</th><th>Label (V)</th><th>W</th><th>X</th><th>Y</th></tr></thead><tbody>';
    for (var i = 0; i < reportSummary.raw.length; i++) {
      var entry = reportSummary.raw[i];
      bodyHtml += '<tr><td>' + entry.row + '</td><td>' + escapeHtml(entry.label) + '</td><td>' + escapeHtml(entry.val1) + '</td><td>' + escapeHtml(entry.val2) + '</td><td>' + escapeHtml(entry.val3) + '</td></tr>';
    }
    bodyHtml += '</tbody></table></div>';
  }

  // Warnings
  if (warnings && warnings.length > 0) {
    bodyHtml += '<div class="prelease-summary-section"><h3 class="prelease-summary-subtitle prelease-warn-title">Warnings (' + warnings.length + ')</h3>';
    bodyHtml += '<ul class="prelease-warn-list">';
    var maxShow = 50;
    var toShow = warnings.slice(0, maxShow);
    for (var i = 0; i < toShow.length; i++) {
      bodyHtml += '<li>' + escapeHtml(toShow[i]) + '</li>';
    }
    if (warnings.length > maxShow) {
      bodyHtml += '<li class="prelease-warn-overflow">... and ' + (warnings.length - maxShow) + ' more warning(s). Check debug panel for full list.</li>';
    }
    bodyHtml += '</ul></div>';
  }

  showModal(
    'Prelease Import Summary',
    bodyHtml,
    '<button class="btn btn-primary" onclick="hideModal()">Close</button>'
  );
}

/* ------------------------------------------------------------------
   IMPORT CARDS
   Updates import cards and sidebar import rows with data counts.
   ------------------------------------------------------------------ */

function renderImportCards(state) {
  var cards = document.querySelectorAll('.import-card');
  if (!cards || cards.length === 0) return;

  cards.forEach(function (card) {
    var importType = card.getAttribute('data-import-type');
    var infoEl = card.querySelector('.import-info');
    var clearBtn = card.querySelector('.import-clear-btn');
    if (!infoEl) return;

    var hasData = false;
    var infoText = '';

    switch (importType) {
      case 'inventory':
        if (state.inventory && state.inventory.length > 0) {
          hasData = true;
          infoText = state.inventory.length + ' units loaded';
        }
        break;
      case 'residents':
        if (state.residents && state.residents.size > 0) {
          hasData = true;
          infoText = state.residents.size + ' residents loaded';
        }
        break;
      case 'bank':
        if (state.waitingBank && state.waitingBank.length > 0) {
          hasData = true;
          infoText = state.waitingBank.length + ' bank residents loaded';
        }
        break;
      case 'scholarships':
        if (state.unassignedScholarships && state.unassignedScholarships.length > 0) {
          hasData = true;
          infoText = state.unassignedScholarships.length + ' unassigned scholarship records';
        }
        break;
      case 'entrata':
        // Entrata import merges into residents/bank; show combined status
        if ((state.residents && state.residents.size > 0) || (state.waitingBank && state.waitingBank.length > 0)) {
          var rCount = state.residents ? state.residents.size : 0;
          var bCount = state.waitingBank ? state.waitingBank.length : 0;
          infoText = rCount + ' placed, ' + bCount + ' bank (may include Entrata import)';
          hasData = rCount > 0 || bCount > 0;
        }
        break;
      case 'scholarship-expected':
        if (state.scholarshipExpectedData && state.scholarshipExpectedData.length > 0) {
          hasData = true;
          infoText = state.scholarshipExpectedData.length + ' expected recipient records loaded';
        }
        break;
    }

    infoEl.textContent = infoText;
    infoEl.className = 'import-info' + (hasData ? ' import-info-loaded' : '');

    if (clearBtn) {
      clearBtn.style.display = hasData ? 'inline-block' : 'none';
    }
  });

  // Also update sidebar import rows
  document.querySelectorAll('.import-row').forEach(function (row) {
    var type = row.dataset.importType;
    var statusEl = row.querySelector('.import-status');
    if (!statusEl || !state) return;

    var statusText = '';
    switch (type) {
      case 'inventory':
        if (state.inventory && state.inventory.length > 0) statusText = state.inventory.length + ' units';
        break;
      case 'residents':
        if (state.residents && state.residents.size > 0) statusText = state.residents.size + ' residents';
        break;
      case 'bank':
        if (state.waitingBank && state.waitingBank.length > 0) statusText = state.waitingBank.length + ' entries';
        break;
      case 'scholarships':
        if (state.unassignedScholarships && state.unassignedScholarships.length > 0) statusText = state.unassignedScholarships.length + ' records';
        break;
      case 'entrata':
        if ((state.residents && state.residents.size > 0) || (state.waitingBank && state.waitingBank.length > 0)) statusText = 'Loaded';
        break;
      case 'scholarship-expected':
        if (state.scholarshipExpectedData && state.scholarshipExpectedData.length > 0) statusText = state.scholarshipExpectedData.length + ' records';
        break;
    }
    statusEl.textContent = statusText;
  });
}

/* ------------------------------------------------------------------
   ENHANCED SCHOLARSHIP AUDIT TABLE (NEW)
   Uses computeScholarshipAudit from inventory.js.
   Renders into #scholarship-audit-table.
   ------------------------------------------------------------------ */

function renderEnhancedScholarshipAudit(auditResults, filterOptions) {
  var container = document.getElementById('scholarship-audit-table');
  if (!container) return;
  container.innerHTML = '';

  if (!auditResults || auditResults.length === 0) {
    container.innerHTML = '<div class="section-empty">No scholarship data found.</div>';
    return;
  }

  var view = (filterOptions && filterOptions.view) || 'all';
  var subFilter = (filterOptions && filterOptions.subFilter) || '';

  // Apply filtering
  var filtered = auditResults;
  if (view === 'floorplan' && subFilter) {
    filtered = auditResults.filter(function (r) { return r.floorplan.toUpperCase() === subFilter.toUpperCase(); });
  } else if (view === 'building' && subFilter) {
    filtered = auditResults.filter(function (r) { return r.building === subFilter; });
  } else if (view === 'floor' && subFilter) {
    var parts = subFilter.split('-');
    filtered = auditResults.filter(function (r) {
      return r.building === parts[0] && r.floor === parseInt(parts[1]);
    });
  }

  // Counts summary
  var summary = document.createElement('div');
  summary.className = 'audit-summary';
  summary.textContent = filtered.length + ' scholarship holder(s) found' + (subFilter ? ' (filtered)' : '');
  container.appendChild(summary);

  if (filtered.length === 0) {
    container.innerHTML += '<div class="section-empty">No records match the selected filter.</div>';
    return;
  }

  // Table
  var table = document.createElement('table');
  table.className = 'audit-table';

  var thead = document.createElement('thead');
  thead.innerHTML = '<tr><th>Name</th><th>Scholarship</th><th>Floorplan</th><th>Building</th><th>Floor</th><th>Unit</th><th>Source</th></tr>';
  table.appendChild(thead);

  var tbody = document.createElement('tbody');
  for (var i = 0; i < filtered.length; i++) {
    var r = filtered[i];
    var tr = document.createElement('tr');
    tr.innerHTML =
      '<td>' + escapeHtml(r.name) + '</td>' +
      '<td>' + escapeHtml(r.scholarship) + '</td>' +
      '<td>' + escapeHtml(r.floorplan) + '</td>' +
      '<td>' + (r.building ? escapeHtml(getBuildingLabel(r.building)) : '--') + '</td>' +
      '<td>' + (r.floor != null ? escapeHtml(getFloorLabel(r.floor)) : '--') + '</td>' +
      '<td>' + escapeHtml(r.unit || '--') + '</td>' +
      '<td><span class="source-badge source-' + r.source + '">' + escapeHtml(r.source) + '</span></td>';
    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  container.appendChild(table);
}

/* ------------------------------------------------------------------
   DEBUG PANEL (NEW)
   Renders debug info into #debug-output + #debug-actions.
   ------------------------------------------------------------------ */

function renderDebugPanel(state) {
  var output = document.getElementById('debug-output');
  var actions = document.getElementById('debug-actions');

  if (output) {
    // Preserve existing debug warnings list, add state summary above it
    var existingSummary = output.querySelector('.debug-state-summary');
    if (existingSummary) existingSummary.remove();

    var summary = document.createElement('div');
    summary.className = 'debug-state-summary';

    var invCount = (state.inventory && state.inventory.length) || 0;
    var resCount = (state.residents && state.residents.size) || 0;
    var bankCount = (state.waitingBank && state.waitingBank.length) || 0;
    var unassCount = (state.unassignedScholarships && state.unassignedScholarships.length) || 0;
    var mapCacheCount = (state.mapCache && state.mapCache.size) || 0;

    var lsUsage = 'Unknown';
    try {
      var totalSize = 0;
      for (var key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          totalSize += localStorage.getItem(key).length;
        }
      }
      lsUsage = Math.round(totalSize / 1024) + ' KB';
    } catch (e) {
      lsUsage = 'Error reading';
    }

    summary.innerHTML =
      '<h3>State Summary</h3>' +
      '<div class="debug-info-grid">' +
        '<div class="debug-info-item"><span class="debug-info-label">Inventory:</span> <span class="debug-info-value">' + invCount + ' units</span></div>' +
        '<div class="debug-info-item"><span class="debug-info-label">Residents:</span> <span class="debug-info-value">' + resCount + ' placed</span></div>' +
        '<div class="debug-info-item"><span class="debug-info-label">Waiting Bank:</span> <span class="debug-info-value">' + bankCount + ' entries</span></div>' +
        '<div class="debug-info-item"><span class="debug-info-label">Unassigned Scholarships:</span> <span class="debug-info-value">' + unassCount + ' entries</span></div>' +
        '<div class="debug-info-item"><span class="debug-info-label">Map Cache:</span> <span class="debug-info-value">' + mapCacheCount + ' maps loaded</span></div>' +
        '<div class="debug-info-item"><span class="debug-info-label">Selected:</span> <span class="debug-info-value">' + (state.selectedBuilding || 'none') + ' / ' + (state.selectedFloor != null ? state.selectedFloor : 'none') + '</span></div>' +
        '<div class="debug-info-item"><span class="debug-info-label">localStorage:</span> <span class="debug-info-value">' + lsUsage + '</span></div>' +
      '</div>';

    output.insertBefore(summary, output.firstChild);
  }

  if (actions) {
    actions.innerHTML = '';

    var clearWarningsBtn = document.createElement('button');
    clearWarningsBtn.className = 'btn btn-secondary';
    clearWarningsBtn.textContent = 'Clear Warnings';
    clearWarningsBtn.addEventListener('click', function () {
      clearDebugWarnings();
    });
    actions.appendChild(clearWarningsBtn);

    var clearSessionBtn = document.createElement('button');
    clearSessionBtn.className = 'btn btn-danger';
    clearSessionBtn.textContent = 'Clear All Session Data';
    clearSessionBtn.id = 'clear-session-debug-btn';
    actions.appendChild(clearSessionBtn);
  }
}

/* ------------------------------------------------------------------
   PRELEASE SUMMARY (LEFT SIDEBAR)
   Renders compact summary into #prelease-summary-content.
   ------------------------------------------------------------------ */

function renderPreleaseSummary(progressResult) {
  var container = document.getElementById('prelease-summary-content');
  if (!container) return;
  if (!progressResult || !progressResult.totals) {
    container.innerHTML = '<p class="placeholder-text">No prelease data loaded.</p>';
    return;
  }
  var t = progressResult.totals;
  container.innerHTML =
    '<div class="prelease-summary-compact">' +
      '<div class="summary-stat"><span class="stat-label">Target</span><span class="stat-value">' + (t.target || t.capacity || 0) + '</span></div>' +
      '<div class="summary-stat"><span class="stat-label">Placed</span><span class="stat-value">' + (t.placed || t.preleased || 0) + '</span></div>' +
      '<div class="summary-stat"><span class="stat-label">Bank</span><span class="stat-value">' + (t.bank || 0) + '</span></div>' +
      '<div class="summary-stat"><span class="stat-label">Total</span><span class="stat-value">' + (t.combined || t.total || 0) + '</span></div>' +
      '<div class="summary-stat"><span class="stat-label">Progress</span><span class="stat-value">' + (t.combinedPercent || t.percent || '0') + '%</span></div>' +
    '</div>';
}

/* ------------------------------------------------------------------
   BACKUP & RESTORE (LEFT SIDEBAR)
   Renders into #backup-restore-status.
   ------------------------------------------------------------------ */

function renderBackupRestore(state) {
  var statusEl = document.getElementById('backup-restore-status');
  if (!statusEl) return;

  statusEl.innerHTML = '';

  // Show data summary
  var invCount = (state.inventory && state.inventory.length) || 0;
  var resCount = (state.residents && state.residents.size) || 0;
  var bankCount = (state.waitingBank && state.waitingBank.length) || 0;

  var dataSize = 'Unknown';
  try {
    var raw = localStorage.getItem('propertySiteMap_project');
    if (raw) {
      dataSize = Math.round(raw.length / 1024) + ' KB';
    } else {
      dataSize = 'No saved data';
    }
  } catch (e) {
    dataSize = 'Error reading';
  }

  statusEl.innerHTML =
    '<div class="backup-status-info">' +
      '<h3>Current Data</h3>' +
      '<p>' + invCount + ' inventory units, ' + resCount + ' placed residents, ' + bankCount + ' bank residents</p>' +
      '<p>Stored data size: ' + dataSize + '</p>' +
    '</div>';
}
