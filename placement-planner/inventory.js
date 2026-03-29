/* ============================================================
   inventory.js — Master Unit Inventory Module
   Loads, manages, and provides utility functions for the
   Ivory House unit inventory (623 units).

   Inventory is now an array of objects:
     { unitNumber: string, unitType: string }

   - unitNumber = assignable unit ID (source of truth for assignments)
   - unitType   = floorplan type (source of truth for floorplan matching)

   All floorplan matching uses inventory.unitType.
   Building/floor parsing uses config.js parseUnitId() for navigation only.
   ============================================================ */

/**
 * Parse an inventory spreadsheet file (.xlsx or .csv).
 * Expects columns: "Unit Number" and "Unit Type".
 * Returns { units: Array<{unitNumber, unitType}>, warnings: string[] }
 *
 * @param {File} file - The uploaded inventory spreadsheet
 * @returns {Promise<{units: Array<{unitNumber: string, unitType: string}>, warnings: string[]}>}
 */
function parseInventorySpreadsheet(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error('Failed to read inventory file.'));

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
          reject(new Error('Inventory spreadsheet contains no sheets.'));
          return;
        }

        const sheet = workbook.Sheets[sheetName];
        const jsonRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        if (jsonRows.length === 0) {
          reject(new Error('Inventory spreadsheet is empty or has no data rows.'));
          return;
        }

        // Find the "Unit Number" and "Unit Type" columns (case-insensitive)
        const rawHeaders = Object.keys(jsonRows[0]);
        let unitNumberHeader = null;
        let unitTypeHeader = null;

        for (const h of rawHeaders) {
          const upper = h.trim().toUpperCase().replace(/_/g, ' ');
          if (upper === 'UNIT NUMBER' || upper === 'UNITNUMBER') {
            unitNumberHeader = h;
          } else if (upper === 'UNIT TYPE' || upper === 'UNITTYPE') {
            unitTypeHeader = h;
          }
        }

        if (!unitNumberHeader) {
          reject(new Error('Inventory spreadsheet missing required "Unit Number" column header.'));
          return;
        }

        if (!unitTypeHeader) {
          reject(new Error('Inventory spreadsheet missing required "Unit Type" column header.'));
          return;
        }

        const units = [];
        const seen = new Set();
        const warnings = [];

        for (let i = 0; i < jsonRows.length; i++) {
          const rawNumber = jsonRows[i][unitNumberHeader];
          const rawType = jsonRows[i][unitTypeHeader];
          const rowNum = i + 2; // 1-based + header

          let unitNumber = (rawNumber == null ? '' : String(rawNumber)).trim().replace(/\s+/g, ' ');
          let unitType = (rawType == null ? '' : String(rawType)).trim().replace(/\s+/g, ' ');

          // Skip blank rows (both empty)
          if (!unitNumber && !unitType) continue;

          // Missing Unit Number — skip and warn
          if (!unitNumber) {
            warnings.push(`Inventory row ${rowNum}: Missing Unit Number — skipped.`);
            continue;
          }

          // Missing Unit Type — keep unit but warn
          if (!unitType) {
            warnings.push(`Inventory row ${rowNum}: Blank Unit Type for unit "${unitNumber}" — unit kept but type is empty.`);
          }

          // Deduplicate by Unit Number (normalize to uppercase for comparison)
          const normalized = unitNumber.toUpperCase();
          if (seen.has(normalized)) {
            warnings.push(`Inventory row ${rowNum}: Duplicate unit "${unitNumber}" — skipped.`);
            continue;
          }

          seen.add(normalized);
          units.push({ unitNumber: unitNumber, unitType: unitType });
        }

        resolve({ units, warnings });
      } catch (err) {
        reject(new Error('Failed to parse inventory spreadsheet: ' + err.message));
      }
    };

    reader.readAsArrayBuffer(file);
  });
}

/**
 * Build the master inventory array from raw unit objects.
 * Normalizes by trimming whitespace, removes blanks, deduplicates by unitNumber.
 *
 * @param {Array<{unitNumber: string, unitType: string}>} rawUnits
 * @returns {Array<{unitNumber: string, unitType: string}>}
 */
function buildMasterInventory(rawUnits) {
  const seen = new Set();
  const inventory = [];

  for (const raw of rawUnits) {
    if (!raw || typeof raw === 'string') {
      // Legacy: if raw is a string (old format), convert
      const val = (typeof raw === 'string' ? raw : '').trim();
      if (!val) continue;
      const normalized = val.toUpperCase();
      if (seen.has(normalized)) continue;
      seen.add(normalized);
      inventory.push({ unitNumber: val, unitType: '' });
      continue;
    }

    const unitNumber = (raw.unitNumber == null ? '' : String(raw.unitNumber)).trim();
    if (!unitNumber) continue;

    const normalized = unitNumber.toUpperCase();
    if (seen.has(normalized)) continue;

    seen.add(normalized);
    inventory.push({
      unitNumber: unitNumber,
      unitType: (raw.unitType == null ? '' : String(raw.unitType)).trim(),
    });
  }

  return inventory;
}

/* ------------------------------------------------------------------
   INVENTORY LOOKUP HELPERS
   ------------------------------------------------------------------ */

/**
 * Extract just the unit number strings from inventory.
 * @param {Array<{unitNumber: string, unitType: string}>} inventory
 * @returns {string[]}
 */
function getInventoryUnitNumbers(inventory) {
  if (!inventory) return [];
  return inventory.map((item) => item.unitNumber);
}

/**
 * Build a Map from uppercase unitNumber -> inventory item for fast lookups.
 * @param {Array<{unitNumber: string, unitType: string}>} inventory
 * @returns {Map<string, {unitNumber: string, unitType: string}>}
 */
function buildInventoryMap(inventory) {
  const map = new Map();
  if (!inventory) return map;
  for (const item of inventory) {
    map.set(item.unitNumber.toUpperCase(), item);
  }
  return map;
}

/**
 * Look up the Unit Type for a given unit number from inventory.
 * Returns the unitType string, or null if not found.
 *
 * @param {string} unitNumber
 * @param {Array<{unitNumber: string, unitType: string}>} inventory
 * @returns {string|null}
 */
function getInventoryUnitType(unitNumber, inventory) {
  if (!unitNumber || !inventory) return null;
  const key = unitNumber.trim().toUpperCase();
  for (const item of inventory) {
    if (item.unitNumber.toUpperCase() === key) {
      return item.unitType || null;
    }
  }
  return null;
}

/* ------------------------------------------------------------------
   INVENTORY UTILITY FUNCTIONS
   ------------------------------------------------------------------ */

/**
 * Get list of available (unoccupied) unit numbers from inventory.
 *
 * @param {Array<{unitNumber: string, unitType: string}>} inventory
 * @param {Map<string, object>|null} residents
 * @returns {string[]} - Unit numbers not currently assigned
 */
function getAvailableUnits(inventory, residents) {
  if (!inventory || inventory.length === 0) return [];
  if (!residents || residents.size === 0) return inventory.map((i) => i.unitNumber);

  return inventory
    .filter((item) => !residents.has(item.unitNumber.toUpperCase()))
    .map((item) => item.unitNumber);
}

/**
 * Get list of occupied unit numbers.
 *
 * @param {Array<{unitNumber: string, unitType: string}>} inventory
 * @param {Map<string, object>|null} residents
 * @returns {string[]}
 */
function getOccupiedUnits(inventory, residents) {
  if (!inventory || inventory.length === 0) return [];
  if (!residents || residents.size === 0) return [];

  return inventory
    .filter((item) => residents.has(item.unitNumber.toUpperCase()))
    .map((item) => item.unitNumber);
}

/**
 * Get occupancy statistics for a given set of inventory items.
 *
 * @param {Array<{unitNumber: string, unitType: string}>} inventory
 * @param {Map<string, object>|null} residents
 * @returns {{ totalUnits: number, occupiedUnits: number, availableUnits: number, occupancyPercent: number }}
 */
function getOccupancyStats(inventory, residents) {
  const totalUnits = inventory ? inventory.length : 0;
  const occupied = getOccupiedUnits(inventory, residents);
  const occupiedUnits = occupied.length;
  const availableUnits = totalUnits - occupiedUnits;
  const occupancyPercent = totalUnits > 0
    ? Math.round((occupiedUnits / totalUnits) * 1000) / 10
    : 0;

  return { totalUnits, occupiedUnits, availableUnits, occupancyPercent };
}

/**
 * Filter inventory to items belonging to a specific building.
 *
 * @param {Array<{unitNumber: string, unitType: string}>} inventory
 * @param {string} buildingKey
 * @returns {Array<{unitNumber: string, unitType: string}>}
 */
function getInventoryForBuilding(inventory, buildingKey) {
  if (!inventory || !buildingKey) return [];
  return inventory.filter((item) => unitBelongsToBuilding(item.unitNumber, buildingKey));
}

/**
 * Filter inventory to items belonging to a specific building + floor.
 *
 * @param {Array<{unitNumber: string, unitType: string}>} inventory
 * @param {string} buildingKey
 * @param {number} floor
 * @returns {Array<{unitNumber: string, unitType: string}>}
 */
function getInventoryForFloor(inventory, buildingKey, floor) {
  if (!inventory || !buildingKey || floor == null) return [];
  return inventory.filter((item) => unitBelongsToFloor(item.unitNumber, buildingKey, floor));
}

/**
 * Get occupancy stats scoped to a building.
 */
function getBuildingOccupancyStats(inventory, residents, buildingKey) {
  const buildingInventory = getInventoryForBuilding(inventory, buildingKey);
  return getOccupancyStats(buildingInventory, residents);
}

/**
 * Get occupancy stats scoped to a building + floor.
 */
function getFloorOccupancyStats(inventory, residents, buildingKey, floor) {
  const floorInventory = getInventoryForFloor(inventory, buildingKey, floor);
  return getOccupancyStats(floorInventory, residents);
}

/**
 * Get available units filtered by Unit Type from inventory.
 * Uses inventory.unitType for matching — never infers from unit number.
 *
 * @param {Array<{unitNumber: string, unitType: string}>} inventory
 * @param {Map<string, object>|null} residents
 * @param {string} unitType - The unit type to match against
 * @returns {string[]} - Available unit numbers matching the type
 */
function getAvailableUnitsForUnitType(inventory, residents, unitType) {
  if (!inventory || inventory.length === 0) return [];

  const availableItems = inventory.filter((item) => !residents || !residents.has(item.unitNumber.toUpperCase()));

  if (!unitType) return availableItems.map((i) => i.unitNumber);

  const normalizedType = unitType.trim().toUpperCase();

  return availableItems
    .filter((item) => {
      const itemType = (item.unitType || '').trim().toUpperCase();
      return itemType === normalizedType;
    })
    .map((item) => item.unitNumber);
}

/**
 * Validate whether a unit can be assigned.
 * Returns { valid: boolean, message: string }
 *
 * @param {string} unitValue - The unit being assigned
 * @param {Array<{unitNumber: string, unitType: string}>} inventory
 * @param {Map<string, object>|null} residents
 * @param {string|null} originalUnitKey - If editing, the uppercase key of the original unit
 * @returns {{ valid: boolean, message: string }}
 */
function validateUnitAssignment(unitValue, inventory, residents, originalUnitKey) {
  if (!unitValue || !unitValue.trim()) {
    return { valid: false, message: 'Unit is required.' };
  }

  const key = unitValue.trim().toUpperCase();

  // Check if unit exists in inventory
  if (inventory && inventory.length > 0) {
    const inInventory = inventory.some((item) => item.unitNumber.toUpperCase() === key);
    if (!inInventory) {
      return { valid: false, message: `Unit "${unitValue}" is not in the master inventory.` };
    }
  }

  // Check if unit is already occupied by a different resident
  if (residents && residents.has(key)) {
    const isSelf = originalUnitKey && originalUnitKey === key;
    if (!isSelf) {
      const existing = residents.get(key);
      return {
        valid: false,
        message: `Unit "${unitValue}" is already assigned to "${existing.Resident_Name}".`,
      };
    }
  }

  return { valid: true, message: '' };
}

/**
 * Validate that a bank resident's unit type matches the target unit's inventory type.
 *
 * @param {string} bankUnitType - The bank resident's unit type
 * @param {string} targetUnit - The unit number being assigned
 * @param {Array<{unitNumber: string, unitType: string}>} inventory
 * @returns {{ valid: boolean, message: string }}
 */
function validateUnitTypeMatch(bankUnitType, targetUnit, inventory) {
  if (!bankUnitType || !targetUnit || !inventory) {
    return { valid: false, message: 'Missing unit type or target unit information.' };
  }

  const inventoryType = getInventoryUnitType(targetUnit, inventory);
  if (!inventoryType) {
    return { valid: false, message: `Unit "${targetUnit}" has no Unit Type in inventory.` };
  }

  if (inventoryType.trim().toUpperCase() !== bankUnitType.trim().toUpperCase()) {
    return {
      valid: false,
      message: `Type mismatch: bank resident is "${bankUnitType}" but unit "${targetUnit}" is "${inventoryType}".`,
    };
  }

  return { valid: true, message: '' };
}

/**
 * Get the floorplan type for a placed resident by looking up their Unit_Assigned
 * in the inventory. Returns the inventory unitType or null.
 *
 * @param {object} resident - Placed resident with Unit_Assigned
 * @param {Array<{unitNumber: string, unitType: string}>} inventory
 * @returns {string|null}
 */
function getResidentFloorplanType(resident, inventory) {
  if (!resident || !resident.Unit_Assigned) return null;
  return getInventoryUnitType(resident.Unit_Assigned, inventory);
}

/**
 * Get inventory-related warnings for the debug panel.
 *
 * @param {Array<{unitNumber: string, unitType: string}>} inventory
 * @param {Map<string, object>|null} residents
 * @param {Set<string>|null} svgUnitIds
 * @returns {string[]}
 */
function getInventoryWarnings(inventory, residents, svgUnitIds) {
  const warnings = [];

  if (!inventory || inventory.length === 0) return warnings;

  const inventorySet = new Set(inventory.map((item) => item.unitNumber.toUpperCase()));

  // 1. Assigned units not in inventory
  if (residents && residents.size > 0) {
    residents.forEach((resident, unitKey) => {
      if (!inventorySet.has(unitKey)) {
        warnings.push(
          `Assigned unit "${resident.Unit_Assigned}" (resident: ${resident.Resident_Name}) is NOT in the master inventory.`
        );
      }
    });
  }

  // 2. Units that parse ambiguously for building/floor
  for (const item of inventory) {
    const parsed = parseUnitId(item.unitNumber);
    if (parsed.ambiguous) {
      warnings.push(
        `Inventory unit "${item.unitNumber}" could not be parsed into building/floor — ambiguous format.`
      );
    }
  }

  return warnings;
}

/**
 * Get floor-specific inventory warnings for the debug panel.
 *
 * @param {Array<{unitNumber: string, unitType: string}>} inventory
 * @param {Map<string, object>|null} residents
 * @param {Set<string>|null} svgUnitIds
 * @param {string} buildingKey
 * @param {number} floor
 * @returns {string[]}
 */
function getFloorMapWarnings(inventory, residents, svgUnitIds, buildingKey, floor) {
  const warnings = [];

  if (!inventory || inventory.length === 0) return warnings;

  const floorInventory = getInventoryForFloor(inventory, buildingKey, floor);
  const inventorySet = new Set(inventory.map((item) => item.unitNumber.toUpperCase()));

  // Inventory units for this floor not found in SVG
  if (svgUnitIds && svgUnitIds.size > 0) {
    for (const item of floorInventory) {
      const key = item.unitNumber.toUpperCase();
      if (!svgUnitIds.has(key)) {
        warnings.push(
          `Inventory unit "${item.unitNumber}" (${getBuildingLabel(buildingKey)} ${getFloorLabel(floor)}) not found in current SVG map.`
        );
      }
    }
  }

  // Assigned units on this floor not in inventory
  if (residents && residents.size > 0) {
    residents.forEach((resident, unitKey) => {
      if (!inventorySet.has(unitKey)) {
        const parsed = parseUnitId(unitKey);
        if (!parsed.ambiguous && parsed.building === buildingKey && parsed.floor === floor) {
          warnings.push(
            `Assigned unit "${resident.Unit_Assigned}" (resident: ${resident.Resident_Name}) is NOT in the master inventory.`
          );
        }
      }
    });
  }

  // Duplicate resident assignments check
  if (residents && residents.size > 0) {
    const seen = new Map();
    residents.forEach((resident, unitKey) => {
      if (seen.has(unitKey)) {
        warnings.push(
          `Duplicate assignment: Unit "${unitKey}" assigned to both "${seen.get(unitKey)}" and "${resident.Resident_Name}".`
        );
      } else {
        seen.set(unitKey, resident.Resident_Name);
      }
    });
  }

  return warnings;
}

/**
 * Extract all unit IDs from the current SVG in the DOM.
 * Returns a Set of UPPERCASE unit IDs.
 *
 * @returns {Set<string>}
 */
function getSVGUnitIds() {
  const container = document.getElementById('map-container');
  const svg = container ? container.querySelector('svg') : null;
  const ids = new Set();

  if (!svg) return ids;

  const allWithId = svg.querySelectorAll('[id]');
  allWithId.forEach((el) => {
    const rawId = el.id.trim();
    if (rawId) {
      ids.add(rawId.toUpperCase());
    }
  });

  return ids;
}

/**
 * Get all unique Unit Types present in the inventory.
 * @param {Array<{unitNumber: string, unitType: string}>} inventory
 * @returns {string[]}
 */
function getInventoryUnitTypes(inventory) {
  if (!inventory) return [];
  const types = new Set();
  for (const item of inventory) {
    if (item.unitType) {
      types.add(item.unitType);
    }
  }
  return Array.from(types).sort();
}

/* ------------------------------------------------------------------
   SHARED / MULTI-BED UNIT HELPERS
   For units like D003 with beds D003-A, D003-B, D003-C.
   Pattern: {ParentUnit}-{SingleLetter} is a bed assignment.
   ------------------------------------------------------------------ */

/**
 * Check if a unit ID represents a bed-level assignment.
 * Pattern: ends with "-" followed by a single letter (A-Z).
 * Examples: D003-A -> true, D003 -> false, A101 -> false
 *
 * @param {string} unitId
 * @returns {boolean}
 */
function isBedAssignment(unitId) {
  if (!unitId || typeof unitId !== 'string') return false;
  return /^.+-[A-Za-z]$/.test(unitId.trim());
}

/**
 * Derive the parent unit ID from a bed-level assignment.
 * Example: D003-A -> D003, D003-B -> D003
 * Returns null if not a bed assignment.
 *
 * @param {string} unitId
 * @returns {string|null}
 */
function getParentUnitFromBed(unitId) {
  if (!isBedAssignment(unitId)) return null;
  const trimmed = unitId.trim();
  return trimmed.slice(0, trimmed.length - 2); // remove "-X"
}

/**
 * Get all sibling bed unit numbers for a given parent unit from inventory.
 * Scans inventory for items whose unitNumber matches the pattern {parent}-{letter}.
 *
 * @param {string} parentUnit - e.g. "D003"
 * @param {Array<{unitNumber: string, unitType: string}>} inventory
 * @returns {string[]} - e.g. ["D003-A", "D003-B", "D003-C"]
 */
function getBedSiblingsFromInventory(parentUnit, inventory) {
  if (!parentUnit || !inventory) return [];
  const prefix = parentUnit.toUpperCase() + '-';
  return inventory
    .filter((item) => {
      const upper = item.unitNumber.toUpperCase();
      return upper.startsWith(prefix) && upper.length === prefix.length + 1 && /[A-Z]$/.test(upper);
    })
    .map((item) => item.unitNumber);
}

/**
 * Get all placed resident assignments for the beds of a parent unit.
 *
 * @param {string} parentUnit - e.g. "D003"
 * @param {Map<string, object>} residents - Placed residents keyed by UPPERCASE Unit_Assigned
 * @param {Array<{unitNumber: string, unitType: string}>} inventory
 * @returns {Array<{bed: string, resident: object|null}>}
 */
function getBedAssignmentsForParent(parentUnit, residents, inventory) {
  const siblings = getBedSiblingsFromInventory(parentUnit, inventory);
  return siblings.map((bed) => {
    const key = bed.toUpperCase();
    const resident = residents ? residents.get(key) : null;
    return { bed, resident };
  });
}

/**
 * Determine the shared-unit occupancy state for a parent unit.
 *
 * @param {string} parentUnit - e.g. "D003"
 * @param {Map<string, object>} residents
 * @param {Array<{unitNumber: string, unitType: string}>} inventory
 * @returns {'blank'|'partial'|'full'} - Occupancy state
 */
function getSharedUnitOccupancyState(parentUnit, residents, inventory) {
  const assignments = getBedAssignmentsForParent(parentUnit, residents, inventory);
  if (assignments.length === 0) return 'blank';

  const occupiedCount = assignments.filter((a) => a.resident !== null).length;
  if (occupiedCount === 0) return 'blank';
  if (occupiedCount >= assignments.length) return 'full';
  return 'partial';
}

/**
 * Discover all parent units from inventory by scanning for bed-level entries.
 * Returns a Set of uppercase parent unit IDs.
 *
 * @param {Array<{unitNumber: string, unitType: string}>} inventory
 * @returns {Set<string>}
 */
function discoverParentUnitsFromInventory(inventory) {
  const parents = new Set();
  if (!inventory) return parents;
  for (const item of inventory) {
    if (isBedAssignment(item.unitNumber)) {
      const parent = getParentUnitFromBed(item.unitNumber);
      if (parent) parents.add(parent.toUpperCase());
    }
  }
  return parents;
}

/* ------------------------------------------------------------------
   PRELEASE PROGRESS AGGREGATION HELPERS
   Calculate prelease progress by floorplan using inventory + residents.
   ------------------------------------------------------------------ */

/**
 * Build prelease progress data grouped by floorplan.
 *
 * For each floorplan (inventory Unit Type):
 *   - totalUnits: count of inventory units with that type
 *   - newLease: count of placed residents whose lease status is in PRELEASE_NEW_LEASE_STATUSES
 *   - renewal: count of placed residents whose lease status is in PRELEASE_RENEWAL_STATUSES
 *   - totalPreleased: newLease + renewal
 *   - percent: totalPreleased / totalUnits * 100
 *
 * Renewal Pending - Started is counted under Renewal.
 *
 * @param {Array<{unitNumber: string, unitType: string}>} inventory
 * @param {Map<string, object>|null} residents
 * @returns {Array<{floorplan: string, totalUnits: number, newLease: number, renewal: number, totalPreleased: number, percent: number}>}
 */
function buildPreleaseProgressByFloorplan(inventory, residents) {
  if (!inventory || inventory.length === 0) return [];

  // Count total units per floorplan
  const fpTotals = {};
  for (const item of inventory) {
    const fp = item.unitType || 'Unknown';
    fpTotals[fp] = (fpTotals[fp] || 0) + 1;
  }

  // Count placed residents per floorplan by lease status group
  const fpNewLease = {};
  const fpRenewal = {};

  if (residents && residents.size > 0) {
    residents.forEach((resident) => {
      const fp = getResidentFloorplanType(resident, inventory) || 'Unknown';
      const ls = resident.Lease_Status || '';

      if (isNewLeaseForProgress(ls)) {
        fpNewLease[fp] = (fpNewLease[fp] || 0) + 1;
      } else if (isRenewalForProgress(ls)) {
        fpRenewal[fp] = (fpRenewal[fp] || 0) + 1;
      }
    });
  }

  // Build result array
  const allFloorplans = Object.keys(fpTotals);
  const sorted = sortFloorplansByDisplayOrder(allFloorplans);

  return sorted.map((fp) => {
    const totalUnits = fpTotals[fp] || 0;
    const newLease = fpNewLease[fp] || 0;
    const renewal = fpRenewal[fp] || 0;
    const totalPreleased = newLease + renewal;
    const percent = totalUnits > 0 ? Math.round((totalPreleased / totalUnits) * 1000) / 10 : 0;

    return { floorplan: fp, totalUnits, newLease, renewal, totalPreleased, percent };
  });
}

/**
 * Build prelease progress filtered to a specific building.
 * @param {Array<{unitNumber: string, unitType: string}>} inventory
 * @param {Map<string, object>|null} residents
 * @param {string} buildingKey
 * @returns {Array<object>}
 */
function buildPreleaseProgressForBuilding(inventory, residents, buildingKey) {
  if (!inventory || !buildingKey) return [];
  const filteredInv = getInventoryForBuilding(inventory, buildingKey);
  const filteredRes = filterResidentsByInventorySubset(residents, filteredInv);
  return buildPreleaseProgressByFloorplan(filteredInv, filteredRes);
}

/**
 * Build prelease progress filtered to a specific building + floor.
 * @param {Array<{unitNumber: string, unitType: string}>} inventory
 * @param {Map<string, object>|null} residents
 * @param {string} buildingKey
 * @param {number} floor
 * @returns {Array<object>}
 */
function buildPreleaseProgressForFloor(inventory, residents, buildingKey, floor) {
  if (!inventory || !buildingKey || floor == null) return [];
  const filteredInv = getInventoryForFloor(inventory, buildingKey, floor);
  const filteredRes = filterResidentsByInventorySubset(residents, filteredInv);
  return buildPreleaseProgressByFloorplan(filteredInv, filteredRes);
}

/**
 * Filter a residents Map to only include residents whose Unit_Assigned
 * is in the given inventory subset.
 * @param {Map<string, object>|null} residents
 * @param {Array<{unitNumber: string, unitType: string}>} inventorySubset
 * @returns {Map<string, object>}
 */
function filterResidentsByInventorySubset(residents, inventorySubset) {
  const filtered = new Map();
  if (!residents || !inventorySubset || inventorySubset.length === 0) return filtered;

  const unitSet = new Set(inventorySubset.map((item) => item.unitNumber.toUpperCase()));
  residents.forEach((resident, unitKey) => {
    if (unitSet.has(unitKey)) {
      filtered.set(unitKey, resident);
    }
  });

  return filtered;
}

/**
 * Calculate the property-wide prelease progress totals (summary row).
 * @param {Array<object>} progressData - From buildPreleaseProgressByFloorplan
 * @returns {{ totalUnits: number, newLease: number, renewal: number, totalPreleased: number, percent: number }}
 */
function getPreleaseProgressTotals(progressData) {
  let totalUnits = 0, newLease = 0, renewal = 0;
  for (const row of progressData) {
    totalUnits += row.totalUnits;
    newLease += row.newLease;
    renewal += row.renewal;
  }
  const totalPreleased = newLease + renewal;
  const percent = totalUnits > 0 ? Math.round((totalPreleased / totalUnits) * 1000) / 10 : 0;
  return { totalUnits, newLease, renewal, totalPreleased, percent };
}

/* ------------------------------------------------------------------
   SCHOLARSHIP AUDIT AGGREGATION HELPERS
   ------------------------------------------------------------------ */

/**
 * Normalize a name for exact matching:
 * trim, collapse repeated spaces, uppercase.
 * @param {string} name
 * @returns {string}
 */
function normalizeNameForMatch(name) {
  if (!name) return '';
  return name.trim().replace(/\s+/g, ' ').toUpperCase();
}

/**
 * Exact-match a scholarship record name against placed residents.
 * Returns the unitKey of the matching resident, or null if no exact match.
 *
 * Matching rule: normalized (trimmed, collapsed spaces, case-insensitive) exact comparison.
 * No fuzzy, partial, contains, or similarity matching.
 *
 * @param {string} scholarshipName - Name from scholarship upload
 * @param {Map<string, object>} residents - Placed residents keyed by UPPERCASE unit
 * @returns {string|null} - The unitKey of the exact match, or null
 */
function getExactResidentMatchForScholarshipRecord(scholarshipName, residents) {
  if (!scholarshipName || !residents || residents.size === 0) return null;

  const normalizedQuery = normalizeNameForMatch(scholarshipName);
  if (!normalizedQuery) return null;

  let matchKey = null;
  residents.forEach((resident, unitKey) => {
    if (matchKey) return; // already found
    const normalizedResident = normalizeNameForMatch(resident.Resident_Name);
    if (normalizedResident === normalizedQuery) {
      matchKey = unitKey;
    }
  });

  return matchKey;
}



/* ------------------------------------------------------------------
   DEDUP HELPERS — Combined Placed + Bank Residents
   Used by enhanced prelease progress and search.
   ------------------------------------------------------------------ */

/**
 * Normalize a resident name for deduplication:
 * uppercase, trim, collapse multiple spaces to single.
 *
 * @param {string} name
 * @returns {string}
 */
function normalizeName(name) {
  if (!name) return '';
  return name.toUpperCase().trim().replace(/\s+/g, ' ');
}

/**
 * Build a combined, deduplicated list of residents from placed (Map) and bank (Array).
 *
 * If the same person (by normalized name) exists in both placed and bank,
 * only the placed version is kept.
 *
 * Each returned item is a unified object with:
 *   { name, unit, building, floor, floorplan, leaseStatus, scholarship, source }
 * where source is 'placed' or 'bank'.
 *
 * For placed residents, building/floor are derived via parseUnitId.
 * For bank residents, building/floor are null (no unit assigned).
 * Floorplan for placed residents uses inventory lookup; for bank it uses bankEntry.unitType.
 *
 * @param {Map<string, object>|null} residents - Placed residents keyed by UPPERCASE Unit_Assigned
 * @param {Array<object>} bankList - Waiting bank array: { _id, unitType, name, leaseStatus }
 * @param {Array<{unitNumber: string, unitType: string}>|null} inventory - For floorplan lookup
 * @returns {Array<object>}
 */
function getCombinedResidents(residents, bankList, inventory) {
  const combined = [];
  const seenNames = new Set();

  // Process placed residents first (they take priority)
  if (residents && residents.size > 0) {
    residents.forEach((r) => {
      const normalizedKey = normalizeName(r.Resident_Name);
      if (!normalizedKey) return;
      seenNames.add(normalizedKey);

      const parsed = parseUnitId(r.Unit_Assigned);
      const floorplan = getResidentFloorplanType(r, inventory) || '';

      combined.push({
        name: r.Resident_Name,
        unit: r.Unit_Assigned || '',
        building: parsed.ambiguous ? null : parsed.building,
        floor: parsed.ambiguous ? null : parsed.floor,
        floorplan: floorplan,
        leaseStatus: r.Lease_Status || '',
        scholarship: r.Scholarship || '',
        source: 'placed',
      });
    });
  }

  // Process bank residents (skip duplicates by name)
  if (bankList && bankList.length > 0) {
    for (const entry of bankList) {
      const normalizedKey = normalizeName(entry.name);
      if (!normalizedKey) continue;
      if (seenNames.has(normalizedKey)) continue;
      seenNames.add(normalizedKey);

      combined.push({
        name: entry.name,
        unit: '',
        building: null,
        floor: null,
        floorplan: entry.unitType || '',
        leaseStatus: entry.leaseStatus || '',
        scholarship: '',
        source: 'bank',
      });
    }
  }

  return combined;
}

/* ------------------------------------------------------------------
   ENHANCED PRELEASE PROGRESS — Counts Both Placed + Bank (Deduped)
   ------------------------------------------------------------------ */

/**
 * Compute enhanced prelease progress that counts both placed and bank
 * residents (deduplicated, placed wins). Supports scoping by property,
 * building, or floor.
 *
 * For placed residents, floorplan is resolved from inventory via unit assignment.
 * For bank residents, floorplan comes from their unitType field.
 *
 * Scope filtering:
 *   - 'property': all residents counted
 *   - 'building': only placed residents whose unit parses to the given building,
 *                 plus bank residents (bank has no unit, so they are excluded from
 *                 building/floor scoping since they have no location)
 *   - 'floor': only placed residents on the given building+floor
 *
 * Capacity (totalUnits) always comes from inventory filtered by scope.
 *
 * @param {Array<{unitNumber: string, unitType: string}>} inventory
 * @param {Map<string, object>|null} residents
 * @param {Array<object>} bankList
 * @param {object} scope - { type: 'property' } | { type: 'building', building: 'A' } | { type: 'floor', building: 'A', floor: 1 }
 * @returns {{ rows: Array<{floorplan: string, capacity: number, preleased: number, percent: number}>, totals: {capacity: number, preleased: number, percent: number} }}
 */
function computeEnhancedPreleaseProgress(inventory, residents, bankList, scope) {
  if (!inventory || inventory.length === 0) {
    return { rows: [], totals: { capacity: 0, preleased: 0, percent: 0 } };
  }

  const scopeType = (scope && scope.type) || 'property';

  // Filter inventory by scope for capacity counts
  let scopedInventory;
  if (scopeType === 'floor' && scope.building && scope.floor != null) {
    scopedInventory = getInventoryForFloor(inventory, scope.building, scope.floor);
  } else if (scopeType === 'building' && scope.building) {
    scopedInventory = getInventoryForBuilding(inventory, scope.building);
  } else {
    scopedInventory = inventory;
  }

  // Build capacity per floorplan from scoped inventory
  const fpCapacity = {};
  for (const item of scopedInventory) {
    const fp = item.unitType || 'Unknown';
    fpCapacity[fp] = (fpCapacity[fp] || 0) + 1;
  }

  // Get combined deduplicated residents
  const combined = getCombinedResidents(residents, bankList, inventory);

  // Count preleased per floorplan, applying scope filter and lease status filter
  const fpPreleased = {};

  for (const person of combined) {
    // Check lease status qualifies for prelease counting
    if (!isNewLeaseForProgress(person.leaseStatus) && !isRenewalForProgress(person.leaseStatus)) {
      continue;
    }

    // Apply scope filter
    if (scopeType === 'building' && scope.building) {
      // Bank residents have no building — exclude from building scope
      if (person.source === 'bank') continue;
      if (person.building !== scope.building) continue;
    } else if (scopeType === 'floor' && scope.building && scope.floor != null) {
      // Bank residents have no floor — exclude from floor scope
      if (person.source === 'bank') continue;
      if (person.building !== scope.building || person.floor !== scope.floor) continue;
    }

    const fp = person.floorplan || 'Unknown';
    fpPreleased[fp] = (fpPreleased[fp] || 0) + 1;
  }

  // Build rows for all floorplans that appear in capacity
  const allFloorplans = Object.keys(fpCapacity);
  const sorted = sortFloorplansByDisplayOrder(allFloorplans);

  const rows = sorted.map((fp) => {
    const capacity = fpCapacity[fp] || 0;
    const preleased = fpPreleased[fp] || 0;
    const percent = capacity > 0 ? Math.round((preleased / capacity) * 1000) / 10 : 0;
    return { floorplan: fp, capacity, preleased, percent };
  });

  // Compute totals
  let totalCapacity = 0;
  let totalPreleased = 0;
  for (const row of rows) {
    totalCapacity += row.capacity;
    totalPreleased += row.preleased;
  }
  const totalPercent = totalCapacity > 0 ? Math.round((totalPreleased / totalCapacity) * 1000) / 10 : 0;

  return {
    rows,
    totals: { capacity: totalCapacity, preleased: totalPreleased, percent: totalPercent },
  };
}



/* ------------------------------------------------------------------
   PROPERTY SUMMARY — Placed-only Prelease + Scholarship Counts
   Source of truth: Resident Master List (placed residents Map).
   Bank residents are counted separately, not as "placed".
   ------------------------------------------------------------------ */

/**
 * Compute a property-level prelease summary using ONLY the Resident Master
 * List (placed residents).  Bank residents are counted as a separate number.
 *
 * Returns an object suitable for renderPreleaseSummary:
 *   {
 *     rows: [{ floorplan, capacity, placed, percent }],
 *     totals: { capacity, placed, bank, combined, percent, combinedPercent }
 *   }
 *
 * @param {Array<{unitNumber: string, unitType: string}>} inventory
 * @param {Map<string, object>|null} residents  – placed residents keyed by UPPERCASE unit
 * @param {Array<object>} bankList              – waiting bank array
 * @returns {object}
 */
function computePropertySummary(inventory, residents, bankList) {
  if (!inventory || inventory.length === 0) {
    return {
      rows: [],
      totals: { capacity: 0, placed: 0, bank: 0, combined: 0, percent: 0, combinedPercent: 0 },
    };
  }

  // Capacity per floorplan from inventory
  var fpCapacity = {};
  for (var i = 0; i < inventory.length; i++) {
    var fp = inventory[i].unitType || 'Unknown';
    fpCapacity[fp] = (fpCapacity[fp] || 0) + 1;
  }

  // Placed counts per floorplan from Resident Master List only
  var fpPlaced = {};
  var totalPlaced = 0;
  if (residents && residents.size > 0) {
    residents.forEach(function (r) {
      var fp = getResidentFloorplanType(r, inventory) || 'Unknown';
      fpPlaced[fp] = (fpPlaced[fp] || 0) + 1;
      totalPlaced++;
    });
  }

  // Bank count (not counted as placed)
  var bankCount = (bankList && bankList.length) || 0;

  // Build rows sorted by display order
  var allFloorplans = Object.keys(fpCapacity);
  var sorted = sortFloorplansByDisplayOrder(allFloorplans);

  var rows = [];
  var totalCapacity = 0;
  for (var j = 0; j < sorted.length; j++) {
    var fpKey = sorted[j];
    var cap = fpCapacity[fpKey] || 0;
    var placed = fpPlaced[fpKey] || 0;
    var pct = cap > 0 ? Math.round((placed / cap) * 1000) / 10 : 0;
    rows.push({ floorplan: fpKey, capacity: cap, placed: placed, percent: pct });
    totalCapacity += cap;
  }

  var totalPercent = totalCapacity > 0
    ? Math.round((totalPlaced / totalCapacity) * 1000) / 10
    : 0;

  var combined = totalPlaced + bankCount;
  var combinedPercent = totalCapacity > 0
    ? Math.round((combined / totalCapacity) * 1000) / 10
    : 0;

  return {
    rows: rows,
    totals: {
      capacity: totalCapacity,
      placed: totalPlaced,
      bank: bankCount,
      combined: combined,
      percent: totalPercent,
      combinedPercent: combinedPercent,
    },
  };
}

/**
 * Aggregate scholarship counts from the Resident Master List (placed
 * residents only).  Excludes NONE / empty.
 *
 * @param {Map<string, object>|null} residents
 * @returns {Array<{scholarship: string, count: number}>}  sorted descending
 */
function aggregateScholarshipCounts(residents) {
  var counts = {};
  if (!residents || residents.size === 0) return [];

  residents.forEach(function (r) {
    var sch = (r.Scholarship || '').toUpperCase().trim();
    if (!sch || sch === 'NONE') return;
    counts[sch] = (counts[sch] || 0) + 1;
  });

  var result = [];
  var keys = Object.keys(counts);
  for (var i = 0; i < keys.length; i++) {
    result.push({ scholarship: keys[i], count: counts[keys[i]] });
  }
  result.sort(function (a, b) { return b.count - a.count; });
  return result;
}

/* ------------------------------------------------------------------
   LEAPFROG CONFLICT DETECTION
   Finds Renewal Transfer residents assigned into another
   Renewal Transfer resident's Old_Unit.
   ------------------------------------------------------------------ */

/**
 * Compute leapfrog conflicts among Renewal Transfer residents.
 *
 * A conflict exists when Resident A (Renewal Transfer) has Unit_Assigned
 * that matches Resident B (Renewal Transfer) Old_Unit.
 *
 * @param {Map<string, object>|null} residents - placed residents
 * @returns {Array<{incoming: object, conflictsWith: object, unit: string}>}
 */
function computeLeapfrogConflicts(residents) {
  if (!residents || residents.size === 0) return [];

  // Collect all Renewal Transfer records
  var transfers = [];
  residents.forEach(function (r) {
    var ls = (r.Lease_Status || '').trim();
    if (ls === 'Renewal Transfer') {
      transfers.push(r);
    }
  });

  if (transfers.length < 2) return [];

  // Build a lookup: normalized Old_Unit -> resident who is vacating that unit
  var oldUnitMap = {};
  for (var i = 0; i < transfers.length; i++) {
    var oldUnit = (transfers[i].Old_Unit || '').trim().toUpperCase();
    if (!oldUnit) continue;
    // Multiple residents could share an old unit in theory
    if (!oldUnitMap[oldUnit]) oldUnitMap[oldUnit] = [];
    oldUnitMap[oldUnit].push(transfers[i]);
  }

  var conflicts = [];

  for (var j = 0; j < transfers.length; j++) {
    var incoming = transfers[j];
    var assignedUnit = (incoming.Unit_Assigned || '').trim().toUpperCase();
    if (!assignedUnit) continue;

    var vacating = oldUnitMap[assignedUnit];
    if (!vacating) continue;

    for (var k = 0; k < vacating.length; k++) {
      // Don't compare resident to themselves
      if (vacating[k] === incoming) continue;
      if ((vacating[k].Unit_Assigned || '').trim().toUpperCase() === assignedUnit &&
          (vacating[k].Resident_Name || '') === (incoming.Resident_Name || '')) continue;

      conflicts.push({
        incoming: incoming,
        conflictsWith: vacating[k],
        unit: incoming.Unit_Assigned,
      });
    }
  }

  return conflicts;
}

/* ------------------------------------------------------------------
   SCHOLARSHIP RESERVATION LOOKUP HELPERS
   Used by bank assignment UI to show reservation labels inline.
   ------------------------------------------------------------------ */

/**
 * Check if a unit is reserved for a scholarship.
 * @param {string} unitNumber - The unit number to check
 * @param {Map<string, string>} reservedUnitsMap - Uppercase unitKey -> scholarship name
 * @returns {boolean}
 */
function isUnitScholarshipReserved(unitNumber, reservedUnitsMap) {
  if (!unitNumber || !reservedUnitsMap || reservedUnitsMap.size === 0) return false;
  return reservedUnitsMap.has(unitNumber.trim().toUpperCase());
}

/**
 * Get the scholarship reservation label for a unit.
 * Returns the scholarship name if the unit is reserved, or null if not.
 * @param {string} unitNumber - The unit number to check
 * @param {Map<string, string>} reservedUnitsMap - Uppercase unitKey -> scholarship name
 * @returns {string|null}
 */
function getUnitScholarshipReservation(unitNumber, reservedUnitsMap) {
  if (!unitNumber || !reservedUnitsMap || reservedUnitsMap.size === 0) return null;
  var key = unitNumber.trim().toUpperCase();
  return reservedUnitsMap.has(key) ? reservedUnitsMap.get(key) : null;
}

/* ------------------------------------------------------------------
   GLOBAL SEARCH — Combined Placed + Bank Residents
   ------------------------------------------------------------------ */

/**
 * Search both placed residents and bank by name (case-insensitive partial match).
 * Returns a unified result array limited to 20 items for quick preview.
 *
 * @param {Map<string, object>|null} residents
 * @param {Array<object>} bankList
 * @param {string} query - Search query string
 * @param {Array<{unitNumber: string, unitType: string}>|null} inventory - For floorplan lookup
 * @returns {Array<{name: string, unit: string, building: string|null, floor: number|null, floorplan: string, source: string, scholarship: string}>}
 */
function searchResidents(residents, bankList, query, inventory) {
  if (!query || !query.trim()) return [];

  const q = query.trim().toUpperCase();
  const results = [];
  const MAX_RESULTS = 20;

  // Search placed residents
  if (residents && residents.size > 0) {
    residents.forEach((r) => {
      if (results.length >= MAX_RESULTS) return;
      const nameUpper = (r.Resident_Name || '').toUpperCase();
      if (nameUpper.includes(q)) {
        const parsed = parseUnitId(r.Unit_Assigned);
        results.push({
          name: r.Resident_Name,
          unit: r.Unit_Assigned || '',
          building: parsed.ambiguous ? null : parsed.building,
          floor: parsed.ambiguous ? null : parsed.floor,
          floorplan: getResidentFloorplanType(r, inventory) || '',
          source: 'placed',
          scholarship: r.Scholarship || '',
        });
      }
    });
  }

  // Search bank residents
  if (bankList && bankList.length > 0) {
    for (const entry of bankList) {
      if (results.length >= MAX_RESULTS) break;
      const nameUpper = (entry.name || '').toUpperCase();
      if (nameUpper.includes(q)) {
        results.push({
          name: entry.name,
          unit: '',
          building: null,
          floor: null,
          floorplan: entry.unitType || '',
          source: 'bank',
          scholarship: '',
        });
      }
    }
  }

  return results;
}
