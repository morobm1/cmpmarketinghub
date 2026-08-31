# Import New Competitor Card (Excel/CSV) + Downloadable Template

## Goal
Add an "Import from Excel" flow to `competitor_cards.html` that lets a user upload an `.xlsx`/`.xls`/`.csv` file (a "Google Sheet" exported to one of these formats) and bulk-create one or more competitor cards for the currently selected property, reusing the existing `POST /api/competitor-cards` endpoint. Also add a "Download Template" button that generates a pre-formatted `.xlsx` template matching the competitor card schema.

**No backend/database changes.** MongoDB is schemaless and `netlify/functions/competitor-cards.js` already accepts an arbitrary JSON body on `POST` (only `property` is required, auth + `checkPropertyAccess` already enforced). All new code lives in `competitor_cards.html` (client-side), following the exact convention already used in `sop_library.html` (Excel upload modal + template generator) and using the SheetJS `XLSX` global already loaded via `<script src="https://cdn.sheetjs.com/...">` (CSP already permits `cdn.sheetjs.com`).

## Confirmed Decisions
1. **Google Sheets support** = "export first": user downloads their Google Sheet as `.xlsx` or `.csv` (File > Download) and uploads that file. No Google API/OAuth integration (none exists in this repo today).
2. **Bulk import**: each row in the sheet = one competitor card. All valid rows are POSTed in a loop to the existing endpoint.
3. **Property**: imported cards are always stamped with `currentProperty` (the property already selected in the page's dropdown). No `property` column in the template — avoids access-control/typo issues.
4. **Status**: a row's card is saved as `status: 'complete'` if both `competitorName` and `startingRate` are non-empty after parsing; otherwise `status: 'draft'` (mirrors the manual "Save Complete" requirement).
5. **Template coverage**: full flat schema (every field in `createEmptyCard()` except `property`, `cardType`, `status`) plus flattened `monthlyExtraFees` (prefixed `fee_`) and **6** flattened floorplan row-sets (`fp1..fp6`, each with `Name/BedsBaths/Sqft/Rate`).
6. **Enum validation** (`propertyType`, `targetAudience`, `leaseStyle`, `furnished`, `utilityStructure`, `leasingVelocity`, `impactToProperty`): lenient — normalize case/spacing and match against the allowed keys; if no match, leave the field blank and show a non-blocking warning in the preview (do not block the row).
7. **Duplicate detection**: if a row's `competitorName` (trimmed, case-insensitive) matches an existing card already loaded for `currentProperty` (the in-memory `cards` array), show a "⚠ possible duplicate" warning in the preview row but still allow import (creates a new separate card, never overwrites).
8. **Required field**: `competitorName` is required for a row to be importable at all — a card with no name can't be identified in the gallery/list UI. Rows missing it are flagged as a blocking error and excluded from import (checkbox disabled), but do not stop other valid rows from importing.
9. **Entry point**: new "Import from Excel" button added to the Gallery view toolbar, next to the existing "New Competitor Card" button (`renderGallery()` in `competitor_cards.html:692-697`).
10. **UI pattern**: implement as a new page **view** (`currentView = 'import'`), consistent with this file's existing view-swapping architecture (`gallery`, `editor`, `viewer`, etc. — see `els.mainContent.innerHTML` / `els.toolbarActions.innerHTML` pattern), rather than introducing a modal-dialog pattern that doesn't otherwise exist in this file. (`sop_library.html`'s modal is a reference for *behavior/flow* only, not literal markup/CSS to copy.)

## Column / Field Mapping Reference

Flat string fields (44) — column header == field name, matched case-insensitively:
```
competitorName, heroImage, website, address, distanceFromCampus, driveTimeToCampus,
propertyType, targetAudience, shortDescription, floorplans, unitCount, leaseStyle,
furnished, utilityStructure, topAmenities, parkingType, petPolicy, startingRate,
pricingNotes, applicationFee, adminFee, signingFee, deposit, estimatedCostAboveBase,
currentSpecials, specialsExpiration, historicalSpecials, pastConcessionsNote,
currentOccupancy, preleasedPercent, availabilitySummary, leasingVelocity,
impactToProperty, impactExplanation, competitiveTakeaway, biggestStrengths,
biggestWeaknesses, whoWeLoseTo, whoWeWinAgainst, closestComparableFloorplans,
recommendedPositioning, surveyDate, sourceOfInformation, lastUpdatedDate, notes,
analystName
```

Flattened `monthlyExtraFees` object (8 columns, `fee_` prefix):
```
fee_parking, fee_petRent, fee_packageLocker, fee_valetTrash, fee_internetTechFee,
fee_utilityBillingFee, fee_rentersInsurance, fee_otherRecurring
```

Flattened `floorplanDetails` array (6 slots × 4 columns = 24 columns):
```
fp1Name, fp1BedsBaths, fp1Sqft, fp1Rate
fp2Name, fp2BedsBaths, fp2Sqft, fp2Rate
... through fp6*
```
On parse, build `floorplanDetails` by iterating `fp1..fp6`; include an entry `{ name, bedsBaths, sqft, rate }` only if at least one of the 4 cell values for that slot is non-empty. Skip empty slots (don't pad with blanks).

Not columns (set programmatically, never read from the sheet):
- `property` → always `currentProperty`
- `cardType` → always `'competitor'`
- `status` → computed (see Decision 4)
- `createdBy`/`createdAt`/`updatedAt` → set server-side by the existing POST handler

Enum allow-lists (reuse the exact label maps already defined in `competitor_cards.html:560-572` as the canonical key sets):
- `propertyType`: student-housing, conventional, mixed-use, luxury-multifamily, cottage-townhome, other
- `targetAudience`: undergraduate, graduate, international, young-professionals, luxury-renter, budget-conscious, mixed
- `leaseStyle`: by-bed, conventional-joint
- `furnished`: furnished, unfurnished, optional
- `utilityStructure`: fully-included, partially-included, resident-paid
- `leasingVelocity`: strong, moderate, soft
- `impactToProperty`: high, medium, low

## Implementation Steps

### 1. Add an "upload" icon
In the `ICONS` map (`competitor_cards.html:527-554`), add a new `upload` SVG (arrow pointing up into a tray shape, mirroring the style of the existing `download` icon at line 551) for use on the new toolbar button.

### 2. Gallery toolbar button
In `renderGallery()` (`competitor_cards.html:692-697`), add a new button before/after "New Competitor Card":
```js
'<button class="btn btn-secondary" id="importCardsBtn">' + icon('upload') + ' Import from Excel</button>' +
```
Wire `document.getElementById('importCardsBtn').onclick = handleImportCards;` where `handleImportCards()` sets `currentView = 'import'` and calls a new `renderImportView()`.

### 3. New `renderImportView()` function
Add near the other `render*` view functions. Sets `els.pageTitle.textContent = 'Import Competitor Cards'`, subtitle referencing `currentProperty`, and `els.toolbarActions.innerHTML` with a single "Back to Gallery" button (`icon('arrowLeft')`) that calls `renderGallery()`.

Renders into `els.mainContent.innerHTML` a self-contained import UI with three states managed by local module vars (`importRows`, `importStage`: `'upload' | 'preview' | 'done'`):

**Upload stage:**
- Instructions block: brief text + a "Download Template (.xlsx)" button calling `downloadCompetitorCardTemplate()`.
- A dropzone (`<div id="importDropzone">`, click-to-browse + `dragover`/`drop` handlers, styled with existing CSS vars like `--border`/`--subtext` used elsewhere in the file) containing a hidden `<input type="file" id="importFileInput" accept=".xlsx,.xls,.csv">`.
- Calls `handleImportFile(file)` on file selection/drop.

**Preview stage** (after successful parse):
- Summary line: "`N` row(s) found — `V` valid, `W` with warnings, `E` blocked".
- A table with columns: Row #, Include (checkbox, checked by default and disabled+unchecked for blocking-error rows), Competitor Name, Property Type, Starting Rate, Status (draft/complete, computed), Issues (list of warning/error strings for that row).
- "Import N Card(s)" button (label reflects count of currently-checked rows) triggers `runImport()`.
- "Cancel" / "Choose a different file" link resets to upload stage.

**Import-in-progress / done stage:**
- Progress bar + text ("Importing 3 of 12…"), same visual pattern as `sop_library.html`'s `#uploadProgress`/`#uploadProgFill`.
- On completion: results list (✓ created / ✗ failed with error message per row), a "Done" button that calls `loadCards()` (existing function that refetches `GET /api/competitor-cards` and re-renders) then `renderGallery()`.

### 4. File parsing — `handleImportFile(file)`
- Validate extension is one of `xlsx`, `xls`, `csv`; else `alert(...)` and abort.
- `FileReader.readAsArrayBuffer(file)` → `XLSX.read(data, { type: 'array' })` → first sheet → `XLSX.utils.sheet_to_json(ws, { defval: '' })`.
- If `raw.length === 0`, show an inline error ("The spreadsheet is empty or has no data rows.") and stay on upload stage.
- For each raw row object, build a case-insensitive header lookup (`Object.keys(row)` → trim + exact-match against the known column list above, case-insensitively) — mirrors `sop_library.html`'s `k.trim().toLowerCase()` normalization, but since our headers are camelCase, build a lookup map `{ lowercasedHeader: value }` per row and read via `getVal(rowMap, 'competitorName')` = `rowMap[('competitorName').toLowerCase()]`.
- If **zero** recognized columns are found across all rows (e.g., user uploaded an unrelated file), show a blocking message: "No recognized competitor card columns found. Please use the template." and stay on upload stage.

### 5. Row transform + validation — `buildImportRow(rowMap, rowIndex)`
Returns `{ card, warnings: [], errors: [] }`:
1. Start from a card object with all 44 flat fields read via `getVal`, trimmed strings, default `''`.
2. `competitorName` missing/blank → push to `errors` ("Missing competitor name") — row will be excluded by default.
3. For each enum field, run `normalizeEnum(rawValue, allowedKeys)`:
   - Trim, lowercase, replace whitespace/underscores with `-`.
   - If it matches an allowed key exactly → use it.
   - Else if non-empty → push a `warnings` entry (e.g. `"propertyType: 'Multi Family' not recognized, left blank"`) and set field to `''`.
   - Empty input → leave `''`, no warning.
4. Build `monthlyExtraFees` object from the 8 `fee_*` columns.
5. Build `floorplanDetails` array from `fp1..fp6` per the skip-empty-slots rule above.
6. Compute `status`: `'complete'` if `competitorName && startingRate` both non-empty, else `'draft'`.
7. Duplicate check: if `cards.some(c => c.competitorName.trim().toLowerCase() === competitorName.trim().toLowerCase())` → push a `warnings` entry ("Possible duplicate — a card with this name already exists for this property").
8. Set `property: currentProperty`, `cardType: 'competitor'`.

### 6. Import execution — `runImport()`
- Filter to checked/included rows (errors-rows excluded automatically).
- Sequentially `await apiCreate(row.card)` for each (reuse the existing `apiCreate()` at `competitor_cards.html:647-651` unmodified), updating progress bar/text after each.
- Wrap each call in try/catch; collect `{ ok, name, error }` per row — one row's failure must not abort the loop.
- After completion, render results summary; on "Done", call `loadCards()` + `renderGallery()` so new cards appear immediately.
- Cap: if `importRows.length > 200`, show a blocking message before allowing import ("Please import 200 rows or fewer at a time.") — sanity limit given sequential per-row POSTs.

### 7. Template generator — `downloadCompetitorCardTemplate()`
- `headers` = ordered array of all columns from the "Column / Field Mapping Reference" above (44 flat + 8 fee_ + 24 fp*, in that order) — 76 total.
- `example` = one realistic sample row (a filled-out fictitious competitor, exercising a couple of enum fields with correctly-cased values, 2 of the 6 floorplan slots filled, all 8 fee columns filled) — build via `XLSX.utils.json_to_sheet([example], { header: headers })`.
- Add a short second row or a leading comment isn't supported by `json_to_sheet` cleanly — instead include a one-line legend of enum values either as a second sheet (`XLSX.utils.book_append_sheet(wb, legendWs, 'Allowed Values')`) listing each enum field and its allowed keys, or as inline instructions text already shown in the Import view UI (preferred — keep the template itself just data + header row, matching `sop_library.html`'s convention of putting instructions in the modal, not the sheet).
- `ws['!cols']` = column widths based on header length (same formula as `sop_library.html`: `h.length < 12 ? 16 : 30`).
- `XLSX.writeFile(wb, 'Competitor_Card_Import_Template.xlsx')`.

### 8. Minor CSS additions
Add a small block of dropzone/table/progress-bar styles scoped to the import view (new classes, e.g. `.import-dropzone`, `.import-preview-table`, `.import-progress`), reusing existing CSS custom properties already defined in `competitor_cards.html`'s `<style>` block (`--border`, `--subtext`, `--brand-accent-2`, `.btn`/`.btn-primary`/`.btn-secondary` etc.) rather than introducing a new design language.

## Explicitly Out of Scope
- Native Google Sheets API/live-link import (would require adding `googleapis` dependency + OAuth/service-account credentials that don't exist anywhere in this repo).
- A new/bulk backend Netlify function endpoint — sequential client-side loop against the existing single-record `POST /api/competitor-cards` is sufficient and matches the established convention (`sop_library.html`, `mplr-import.js`).
- Editing `subjectCard` (the "our property" master card) via import — this importer only ever creates `cardType: 'competitor'` cards, consistent with the feature name "Import New Competitor Card."
- Any change to `netlify/functions/competitor-cards.js` or the Mongo `competitor_cards` collection shape.

## Validation Plan (manual, no automated test suite exists for this file)
1. `downloadCompetitorCardTemplate()` produces a valid `.xlsx` that opens correctly in Excel/Google Sheets, with all 76 headers present and one sensible example row.
2. Fill in the downloaded template with 3 rows: (a) one fully complete row with valid enums, 3 floorplans, and fees; (b) one row with only `competitorName` filled (should end up `status: 'draft'`); (c) one row with an invalid `propertyType` value like "Multi Family" (should warn + blank that field, not block) and a `competitorName` matching an existing card for the currently selected property (should show duplicate warning).
3. Upload the file via the new "Import from Excel" button → verify the preview table shows correct row statuses/warnings and the correct default checked/excluded state.
4. Also test one row with a **blank** `competitorName` → confirm it's flagged as a blocking error and excluded/unimportable, while the other rows still import successfully.
5. Click Import → verify progress UI, then confirm in the Gallery that the new cards appear with `property` set to the currently selected property, correct `status`, and correct `floorplanDetails`/`monthlyExtraFees` by opening one imported card in the editor view.
6. Upload an invalid file type (e.g. `.txt`) and an empty `.xlsx` → confirm graceful inline error messages, no crash.
7. Confirm no changes were needed to `netlify/functions/competitor-cards.js`, `netlify.toml` (CSP already allows `cdn.sheetjs.com`), or `package.json`.
