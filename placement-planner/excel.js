/* ============================================================
   excel.js — Spreadsheet Parsing Module
   Handles .xlsx and .csv uploads using SheetJS.
   Normalizes data, validates headers, and builds the resident
   lookup keyed by Unit_Assigned.
   ============================================================ */

/**
 * Required spreadsheet headers for placed residents (case-insensitive match).
 */
const REQUIRED_HEADERS = [
  'Resident_Name',
  'Unit_Assigned',
  'Lease_Status',
  'Scholarship'
];

/**
 * Parse a placed-residents spreadsheet File object (.xlsx or .csv).
 * Returns { residents: Map<string, object>, warnings: string[] }
 *
 * residents is a Map keyed by normalized (trimmed, uppercase) Unit_Assigned.
 * Each value is the full row object with trimmed values.
 */
function parseSpreadsheet(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error('Failed to read file.'));

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
          reject(new Error('Spreadsheet contains no sheets.'));
          return;
        }

        const sheet = workbook.Sheets[sheetName];
        const jsonRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        if (jsonRows.length === 0) {
          reject(new Error('Spreadsheet is empty or has no data rows.'));
          return;
        }

        // Validate headers
        const rawHeaders = Object.keys(jsonRows[0]);
        const headerMap = buildHeaderMap(rawHeaders);
        const missingHeaders = [];
        for (const req of REQUIRED_HEADERS) {
          if (!headerMap[req.toUpperCase()]) {
            missingHeaders.push(req);
          }
        }
        if (missingHeaders.length > 0) {
          reject(new Error(`Missing required headers: ${missingHeaders.join(', ')}`));
          return;
        }

        // Process rows
        const residents = new Map();
        const warnings = [];

        for (let i = 0; i < jsonRows.length; i++) {
          const raw = jsonRows[i];
          const row = normalizeRow(raw, headerMap);
          const rowNum = i + 2; // +2 for 1-based + header row

          // Skip rows with missing Unit_Assigned
          if (!row.Unit_Assigned) {
            warnings.push(`Row ${rowNum}: Missing Unit_Assigned — skipped.`);
            continue;
          }

          // Validate that at least Resident_Name exists
          if (!row.Resident_Name) {
            warnings.push(`Row ${rowNum}: Missing Resident_Name for unit ${row.Unit_Assigned} — skipped.`);
            continue;
          }

          const unitKey = row.Unit_Assigned.toUpperCase();

          // Check for duplicate unit assignments
          if (residents.has(unitKey)) {
            warnings.push(`Row ${rowNum}: Duplicate Unit_Assigned "${row.Unit_Assigned}" — using first occurrence.`);
            continue;
          }

          residents.set(unitKey, row);
        }

        resolve({ residents, warnings });
      } catch (err) {
        reject(new Error('Failed to parse spreadsheet: ' + err.message));
      }
    };

    reader.readAsArrayBuffer(file);
  });
}

/**
 * Build a map from UPPERCASE header name → actual header key in the row object.
 * This allows case-insensitive header matching.
 */
function buildHeaderMap(headers) {
  const map = {};
  for (const h of headers) {
    map[h.trim().toUpperCase()] = h;
  }
  return map;
}

/**
 * Normalize a raw row object: trim whitespace from all values,
 * normalize repeated spaces, and map to canonical field names.
 */
function normalizeRow(raw, headerMap) {
  const get = (canonical) => {
    const key = headerMap[canonical.toUpperCase()];
    if (!key) return '';
    const val = raw[key];
    return (val == null ? '' : String(val)).trim().replace(/\s+/g, ' ');
  };

  return {
    Resident_Name: get('Resident_Name'),
    Unit_Assigned: get('Unit_Assigned'),
    Lease_Status: get('Lease_Status'),
    Scholarship: get('Scholarship')
  };
}

/* ------------------------------------------------------------------
   BANK SPREADSHEET PARSER
   Parses a resident waiting bank file with columns:
     Unit Type | Name | Lease status
   ------------------------------------------------------------------ */

const BANK_REQUIRED_HEADERS = ['Unit Type', 'Name', 'Lease status'];

/**
 * Parse a resident bank spreadsheet file (.xlsx or .csv).
 * Expects columns: Unit Type, Name, Lease status.
 *
 * Returns { entries: Array<{unitType, name, leaseStatus, _id}>, warnings: string[] }
 */
function parseBankSpreadsheet(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read bank file.'));

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
          reject(new Error('Bank spreadsheet contains no sheets.'));
          return;
        }

        const sheet = workbook.Sheets[sheetName];
        const jsonRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        if (jsonRows.length === 0) {
          reject(new Error('Bank spreadsheet is empty or has no data rows.'));
          return;
        }

        // Find columns (case-insensitive, flexible matching)
        const rawHeaders = Object.keys(jsonRows[0]);
        const headerMap = {};
        for (const h of rawHeaders) {
          const upper = h.trim().toUpperCase().replace(/_/g, ' ');
          headerMap[upper] = h;
        }

        const unitTypeCol = headerMap['UNIT TYPE'] || headerMap['UNITTYPE'] || headerMap['UNIT_TYPE'] || null;
        const nameCol = headerMap['NAME'] || null;
        const leaseCol = headerMap['LEASE STATUS'] || headerMap['LEASESTATUS'] || headerMap['LEASE_STATUS'] || null;

        const missingCols = [];
        if (!unitTypeCol) missingCols.push('Unit Type');
        if (!nameCol) missingCols.push('Name');
        if (!leaseCol) missingCols.push('Lease status');

        if (missingCols.length > 0) {
          reject(new Error(`Bank spreadsheet missing required column(s): ${missingCols.join(', ')}`));
          return;
        }

        const entries = [];
        const warnings = [];
        const seenKeys = new Set();
        let idCounter = 0;

        for (let i = 0; i < jsonRows.length; i++) {
          const raw = jsonRows[i];
          const rowNum = i + 2;

          let unitType = (raw[unitTypeCol] == null ? '' : String(raw[unitTypeCol])).trim().replace(/\s+/g, ' ');
          let name = (raw[nameCol] == null ? '' : String(raw[nameCol])).trim().replace(/\s+/g, ' ');
          let leaseStatus = (raw[leaseCol] == null ? '' : String(raw[leaseCol])).trim().replace(/\s+/g, ' ');

          // Skip blank rows
          if (!unitType && !name && !leaseStatus) continue;

          // Validate Name
          if (!name) {
            warnings.push(`Bank row ${rowNum}: Missing Name — skipped.`);
            continue;
          }

          // Validate Unit Type
          if (!unitType) {
            warnings.push(`Bank row ${rowNum}: Missing Unit Type for "${name}" — skipped.`);
            continue;
          }

          // Validate Unit Type is approved
          if (!isApprovedBankUnitType(unitType)) {
            warnings.push(`Bank row ${rowNum}: Invalid Unit Type "${unitType}" for "${name}" — not in approved list. Skipped.`);
            continue;
          }

          // Check for duplicate (same Name + Unit Type + Lease status)
          const dupKey = `${name.toUpperCase()}|${unitType.toUpperCase()}|${leaseStatus.toUpperCase()}`;
          if (seenKeys.has(dupKey)) {
            warnings.push(`Bank row ${rowNum}: Duplicate entry "${name}" / "${unitType}" / "${leaseStatus}" — skipped.`);
            continue;
          }
          seenKeys.add(dupKey);

          idCounter++;
          // Generate a stable _id based on content so re-imports don't create duplicates
          var stableKey = (name + '|' + unitType + '|' + leaseStatus).toLowerCase().replace(/[^a-z0-9|]/g, '_');
          entries.push({
            _id: 'bank_' + stableKey,
            unitType: unitType,
            name: name,
            leaseStatus: leaseStatus,
          });
        }

        resolve({ entries, warnings });
      } catch (err) {
        reject(new Error('Failed to parse bank spreadsheet: ' + err.message));
      }
    };

    reader.readAsArrayBuffer(file);
  });
}

/* ------------------------------------------------------------------
   ENTRATA PRELEASE REPORT PARSER
   Parses a raw Entrata Prelease export (.xlsx) directly.
   Transforms Bldg-Unit, Resident name, and Lease Status fields
   into app-compatible records for placed residents and waiting bank.
   ------------------------------------------------------------------ */

/**
 * Check if a filename matches the Entrata Prelease naming pattern.
 * Supports: Prelease.xlsx, Prelease (1).xlsx, Prelease (5).xlsx
 * @param {string} filename
 * @returns {boolean}
 */
function isPreleaseFilename(filename) {
  if (!filename) return false;
  return PRELEASE_FILENAME_PATTERN.test(filename.trim());
}

/**
 * Detect whether a workbook sheet looks like an Entrata Prelease report
 * by inspecting the expected header row (row 21).
 * This is the strongest source of truth for detection.
 *
 * @param {object} sheet - SheetJS worksheet object
 * @returns {boolean}
 */
function detectPreleaseHeaders(sheet) {
  if (!sheet) return false;

  const headerRowIdx = PRELEASE_HEADER_ROW - 1; // 0-based for SheetJS
  const allRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  if (!allRows || allRows.length < PRELEASE_HEADER_ROW) return false;

  const headerRow = allRows[headerRowIdx];
  if (!headerRow || !Array.isArray(headerRow)) return false;

  // Check for expected header values at expected column positions
  let matchCount = 0;
  for (const [headerName, colIdx] of Object.entries(PRELEASE_EXPECTED_HEADERS)) {
    const cellValue = (headerRow[colIdx] || '').toString().trim();
    if (cellValue.toUpperCase() === headerName.toUpperCase()) {
      matchCount++;
    }
  }

  // Require at least 2 of 3 expected headers to match
  return matchCount >= 2;
}

/**
 * Transform raw Entrata Bldg-Unit value into app unit ID.
 *
 * Removes building prefixes:
 *   "Building A-A108" -> "A108"
 *   "Building C-C003-B" -> "C003-B"
 *   "Building D-D417-B" -> "D417-B"
 *
 * @param {string} rawBldgUnit
 * @returns {string} Transformed unit ID, or empty string if blank/invalid
 */
function transformBldgUnit(rawBldgUnit) {
  if (!rawBldgUnit) return '';
  let val = rawBldgUnit.toString().trim().replace(/\s+/g, ' ');
  if (!val) return '';

  for (const prefix of PRELEASE_BUILDING_PREFIXES) {
    if (val.toUpperCase().startsWith(prefix.toUpperCase())) {
      val = val.substring(prefix.length);
      break;
    }
  }

  return val.trim();
}

/**
 * Transform raw Entrata Resident name to "First Last" format.
 *
 * Input format: "LASTNAME, FIRSTNAME" possibly with parenthetical data:
 *   "SMITH, JOHN"
 *   "SMITH, JOHN (JOHNNY)"
 *   "SMITH, JOHN (JOHNNY)(ONE REFUGEE)"
 *
 * Output: "John Smith"
 *
 * Steps:
 *   1. Remove all parenthetical groups: (...)
 *   2. Split on first comma
 *   3. Reverse to First Last
 *   4. Title-case each word
 *
 * @param {string} rawResident
 * @returns {string} Cleaned "First Last" name, or empty string if invalid
 */
function transformResidentName(rawResident) {
  if (!rawResident) return '';
  let val = rawResident.toString().trim();
  if (!val) return '';

  // Remove all parenthetical groups
  val = val.replace(/\([^)]*\)/g, '').trim();

  // Normalize whitespace
  val = val.replace(/\s+/g, ' ').trim();

  if (!val) return '';

  // Split on first comma
  const commaIdx = val.indexOf(',');
  if (commaIdx === -1) {
    // No comma found — return title-cased as-is
    return titleCase(val);
  }

  const lastName = val.substring(0, commaIdx).trim();
  const firstName = val.substring(commaIdx + 1).trim();

  if (!firstName && !lastName) return '';
  if (!firstName) return titleCase(lastName);
  if (!lastName) return titleCase(firstName);

  return titleCase(firstName) + ' ' + titleCase(lastName);
}

/**
 * Convert a string to Title Case (each word capitalized, rest lowercase).
 * @param {string} str
 * @returns {string}
 */
function titleCase(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Determine if a Prelease data row is a real resident record vs. a group label/sorting row.
 *
 * Non-resident rows typically:
 *   - Have a value in Unit Type column but nothing in Resident column
 *   - Are grouping/sorting labels for unit types
 *   - Have no Bldg-Unit AND no Resident name
 *
 * @param {object} fields - { bldgUnit, unitType, resident, leaseStatus }
 * @returns {boolean} true if this looks like a real resident row
 */
function isResidentRow(fields) {
  // Must have a resident name to be a real record
  if (!fields.resident || !fields.resident.toString().trim()) {
    return false;
  }
  return true;
}

/**
 * Parse an Entrata Prelease report file (.xlsx).
 *
 * Returns:
 * {
 *   placed: Array<{ Resident_Name, Unit_Assigned, Lease_Status, Scholarship }>,
 *   bank: Array<{ _id, unitType, name, leaseStatus }>,
 *   summary: { ... import statistics },
 *   reportSummary: { ... values from V7:Y17 for audit },
 *   warnings: string[]
 * }
 *
 * @param {File} file
 * @returns {Promise<object>}
 */
function parsePreleaseReport(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read Prelease file.'));

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
          reject(new Error('Prelease file contains no sheets.'));
          return;
        }

        const sheet = workbook.Sheets[sheetName];

        // Validate this is actually a Prelease report using header inspection
        if (!detectPreleaseHeaders(sheet)) {
          reject(new Error(
            'This file does not appear to be an Entrata Prelease report. ' +
            'Expected headers (Bldg-Unit, Unit Type, Resident) were not found at row 21.'
          ));
          return;
        }

        // Read all rows as a 2D array (header: 1 gives array-of-arrays)
        const allRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

        // --- Extract report summary from V7:Y17 for audit ---
        const reportSummary = extractPreleaseReportSummary(allRows);

        // --- Identify the header row and find column indices ---
        const headerRowIdx = PRELEASE_HEADER_ROW - 1; // 0-based
        const headerRow = allRows[headerRowIdx];

        // Build column index map from actual header row
        const colMap = {};
        if (headerRow && Array.isArray(headerRow)) {
          for (let c = 0; c < headerRow.length; c++) {
            const hdr = (headerRow[c] || '').toString().trim();
            if (hdr) {
              colMap[hdr.toUpperCase()] = c;
            }
          }
        }

        const bldgUnitCol = colMap['BLDG-UNIT'] != null ? colMap['BLDG-UNIT'] : PRELEASE_EXPECTED_HEADERS['Bldg-Unit'];
        const unitTypeCol = colMap['UNIT TYPE'] != null ? colMap['UNIT TYPE'] : PRELEASE_EXPECTED_HEADERS['Unit Type'];
        const residentCol = colMap['RESIDENT'] != null ? colMap['RESIDENT'] : PRELEASE_EXPECTED_HEADERS['Resident'];

        // Try to find lease status column dynamically
        let leaseStatusCol = PRELEASE_LEASE_STATUS_COL_INDEX;
        if (colMap['LEASE STATUS'] != null) {
          leaseStatusCol = colMap['LEASE STATUS'];
        } else if (colMap['STATUS'] != null) {
          leaseStatusCol = colMap['STATUS'];
        }

        // --- Process data rows (starting after header row) ---
        const placed = [];
        const bank = [];
        const warnings = [];

        let totalRowsScanned = 0;
        let validResidentRows = 0;
        let placedCount = 0;
        let bankCount = 0;
        let skippedLabelRows = 0;
        let skippedUnsupportedType = 0;
        let skippedLeaseStartedBank = 0;
        let skippedMalformed = 0;
        let skippedBlankRows = 0;
        let newLeaseCount = 0;
        let renewalCount = 0;
        let renewalPendingStartedCount = 0;

        let bankIdCounter = 0;

        // Start processing from the row after the header
        const dataStartRow = headerRowIdx + 1;

        for (let r = dataStartRow; r < allRows.length; r++) {
          const row = allRows[r];
          totalRowsScanned++;

          if (!row || !Array.isArray(row)) {
            skippedBlankRows++;
            continue;
          }

          // Extract raw field values
          const rawBldgUnit = (row[bldgUnitCol] || '').toString().trim();
          const rawUnitType = (row[unitTypeCol] || '').toString().trim();
          const rawResident = (row[residentCol] || '').toString().trim();
          const rawLeaseStatus = (row[leaseStatusCol] || '').toString().trim();

          // Skip fully blank rows
          if (!rawBldgUnit && !rawUnitType && !rawResident && !rawLeaseStatus) {
            skippedBlankRows++;
            continue;
          }

          // Check if this is a real resident row
          if (!isResidentRow({ bldgUnit: rawBldgUnit, unitType: rawUnitType, resident: rawResident, leaseStatus: rawLeaseStatus })) {
            skippedLabelRows++;
            continue;
          }

          validResidentRows++;

          // Transform fields
          const transformedUnit = transformBldgUnit(rawBldgUnit);
          const transformedName = transformResidentName(rawResident);
          const mappedStatus = mapPreleaseLeaseStatus(rawLeaseStatus);

          // Validate transformed name
          if (!transformedName) {
            skippedMalformed++;
            warnings.push(`Row ${r + 1}: Resident name empty after transformation (raw: "${rawResident}") — skipped.`);
            continue;
          }

          // Handle unrecognized lease status
          if (mappedStatus === undefined) {
            skippedMalformed++;
            warnings.push(`Row ${r + 1}: Unrecognized lease status "${rawLeaseStatus}" for "${transformedName}" — skipped.`);
            continue;
          }

          // Count statuses
          if (mappedStatus === 'New Lease') newLeaseCount++;
          else if (mappedStatus === 'Renewal') renewalCount++;
          else if (mappedStatus === 'Renewal Pending - Started') renewalPendingStartedCount++;

          // --- Route: Unit assigned -> placed resident ---
          if (transformedUnit) {
            placedCount++;
            placed.push({
              Resident_Name: transformedName,
              Unit_Assigned: transformedUnit,
              Lease_Status: mappedStatus || 'New Lease',
              Scholarship: 'NONE',
            });
            continue;
          }

          // --- Route: No unit, check for bank placement ---
          // Lease Started should NOT go to bank
          if (mappedStatus === null) {
            skippedLeaseStartedBank++;
            warnings.push(`Row ${r + 1}: "${transformedName}" has status "Lease Started" with no unit — skipped (not imported to bank).`);
            continue;
          }

          // Check if unit type is a supported bank type
          const normalizedUnitType = rawUnitType.replace(/\s+/g, ' ').trim();
          if (isApprovedBankUnitType(normalizedUnitType)) {
            bankIdCounter++;
            bankCount++;
            // Stable _id based on content for dedup across re-imports
            var bankStableKey = (transformedName + '|' + normalizedUnitType + '|' + mappedStatus).toLowerCase().replace(/[^a-z0-9|]/g, '_');
            bank.push({
              _id: 'prelease_bank_' + bankStableKey,
              unitType: normalizedUnitType,
              name: transformedName,
              leaseStatus: mappedStatus,
            });
            continue;
          }

          // Unit type not supported for bank
          skippedUnsupportedType++;
          warnings.push(`Row ${r + 1}: "${transformedName}" has blank unit and unsupported Unit Type "${normalizedUnitType}" — skipped.`);
        }

        const summary = {
          totalRowsScanned,
          validResidentRows,
          placedCount,
          bankCount,
          skippedLabelRows,
          skippedUnsupportedType,
          skippedLeaseStartedBank,
          skippedMalformed,
          skippedBlankRows,
          newLeaseCount,
          renewalCount,
          renewalPendingStartedCount,
        };

        resolve({ placed, bank, summary, reportSummary, warnings });
      } catch (err) {
        reject(new Error('Failed to parse Prelease report: ' + err.message));
      }
    };

    reader.readAsArrayBuffer(file);
  });
}

/**
 * Extract summary values from the Prelease report range V7:Y17
 * for post-import audit/verification.
 *
 * These are report-level summary values (not resident records).
 * Structure varies by report but typically includes counts by status.
 *
 * @param {Array<Array>} allRows - 2D array of all sheet data
 * @returns {object} Extracted summary data with labels and values
 */
function extractPreleaseReportSummary(allRows) {
  const summary = { raw: [], parsed: {} };

  if (!allRows || allRows.length < 17) return summary;

  // V = column index 21, W = 22, X = 23, Y = 24 (0-based)
  // Rows 7-17 = indices 6-16
  for (let r = 6; r <= 16; r++) {
    if (r >= allRows.length) break;
    const row = allRows[r];
    if (!row) continue;

    const label = (row[21] || '').toString().trim();  // Column V
    const val1 = (row[22] || '').toString().trim();    // Column W
    const val2 = (row[23] || '').toString().trim();    // Column X
    const val3 = (row[24] || '').toString().trim();    // Column Y

    if (label || val1 || val2 || val3) {
      summary.raw.push({ row: r + 1, label, val1, val2, val3 });

      // Try to parse known labels for audit matching
      const upperLabel = label.toUpperCase();
      if (upperLabel.includes('NEW') || upperLabel.includes('LEASE')) {
        summary.parsed[label] = { val1, val2, val3 };
      }
      if (upperLabel.includes('RENEWAL')) {
        summary.parsed[label] = { val1, val2, val3 };
      }
      if (upperLabel.includes('TOTAL')) {
        summary.parsed[label] = { val1, val2, val3 };
      }
    }
  }

  return summary;
}

/* ------------------------------------------------------------------
   TEMPLATE DOWNLOAD GENERATOR
   Generates a downloadable .xlsx template file for a given import type
   using the IMPORT_TYPES definitions from config.js.
   ------------------------------------------------------------------ */

/**
 * Generate and trigger download of a .xlsx template file for the given import type.
 *
 * Creates a workbook with one sheet containing:
 *   Row 1: required column headers
 *   Row 2: example data values
 *
 * @param {string} importTypeId - The id of the import type (e.g. 'inventory', 'residents', 'bank')
 */
function generateTemplateDownload(importTypeId) {
  var importType = null;
  for (var i = 0; i < IMPORT_TYPES.length; i++) {
    if (IMPORT_TYPES[i].id === importTypeId) {
      importType = IMPORT_TYPES[i];
      break;
    }
  }

  if (!importType) {
    console.error('Unknown import type: ' + importTypeId);
    return;
  }

  var headers = importType.requiredColumns;
  var exampleValues = [];
  for (var h = 0; h < headers.length; h++) {
    var col = headers[h];
    var val = importType.exampleRow[col];
    exampleValues.push(val != null ? String(val) : '');
  }

  var aoa = [headers, exampleValues];
  var ws = XLSX.utils.aoa_to_sheet(aoa);
  var wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template');

  var filename = importTypeId + '-template.xlsx';
  XLSX.writeFile(wb, filename);
}


