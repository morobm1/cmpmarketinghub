# UW Bothell — Admit Radius Map

An interactive admissions radius mapping dashboard for the University of Washington Bothell Residential Village. Visualizes where admitted students and applicants are located relative to campus, categorized by distance bands.

## Quick Start

1. **Pre-process data** (one-time, or when refreshing the Excel file):
   ```bash
   cd RV
   node geocode.js
   ```
2. **Open the app**: Open `index.html` in a browser (or via Live Server)

## How It Works

### Excel Parsing
- The preprocessor (`geocode.js`) reads the Excel file using the SheetJS (`xlsx`) library
- It auto-detects all column headers from the first row
- Key fields used: `Status`, `Application Type`, `Street 1`, `Street 2`, `City`, `State`, `ZipCode`, `Interested in Campus Housing?`
- Text values are normalized (trimmed, extra spaces removed)
- Zip codes are cleaned: `+4` extensions removed, padded to 5 digits if needed

### Geocoding
- **Primary method**: US zip code centroid lookup via the `zipcodes` npm package (instant, no API calls)
- **Fallback**: OpenStreetMap Nominatim API for international/unknown locations (rate-limited to 1 request/second)
- **Fallback chain**: Full address → City + State → Zip code alone → State alone
- **Cache**: All geocoding results are saved to `geocode-cache.json`
- On subsequent runs, cached results are used first (making re-runs nearly instant)
- The web app also stores cache in `localStorage` for browser-based re-uploads

### Distance Bands
- Distance calculated using the **Haversine formula** from the origin point to each geocoded location
- Origin: **17927 113th Ave NE, Bothell, WA 98011** (lat: 47.7596, lng: -122.1892)
- Bands:
  - **0–10 miles** (green) — Local/campus area
  - **10–50 miles** (orange) — Greater Seattle/Puget Sound region
  - **50–100 miles** (red) — Extended Washington state
  - **100+ miles** (purple) — Out-of-state and international

### Deduplication
- Records with identical Status + Application Type + Street + City + State + Zip are flagged as duplicates
- Duplicates are included in the data but flagged for awareness

## Refreshing the Dataset

There are two ways to bring in a new extract:

**A. In the browser (fastest, no terminal needed)**
1. Click **New Session** in the left rail (this clears the view without affecting anything you've saved).
2. Click **Upload Excel File** and choose the new spreadsheet. Rows are geocoded instantly using the cached zip/city lookups already shipped in `geocode-cache.json` and anything saved in your browser's `localStorage`.
3. Review the map/table and the "Dataset Comparison" popup showing what changed vs. the previous view.
4. Click **Save Dataset**, give it a name, and it's persisted for everyone opening the page.
5. Rows whose zip/city aren't already in the cache won't have coordinates (see the "Data Quality" warning) — use option B below to geocode those before saving if completeness matters.

**B. Pre-processing on the command line (best geocoding coverage)**
1. Place the new Excel file in the `RV/` directory
2. Run: `node geocode.js "New_File_Name.xlsx"`
3. The script will use cached geocoding results for known locations and live-geocode (via Nominatim) anything new, updating `geocode-cache.json`
4. Refresh the browser, upload the same file (or let it load as the default `data.json`), and click **Save Dataset** to persist it

## Dataset Sessions: Save & New Session

The dashboard keeps a clear separation between the **dataset that's currently on screen** and what is **permanently saved**.

- **Save Dataset** — Persists everything currently loaded (whether it's the default preprocessed data or a file you just uploaded) to the shared backend (MongoDB via a Netlify Function) under a name you choose. The saved dataset becomes the one loaded by default the next time anyone opens the page. You can save as many named datasets as you like (e.g., "Autumn 2026 — March Extract", "Test Batch A") and switch between them from **Saved Datasets…**.
- **New Session** — Clears the map/table so you can upload a different Excel file to evaluate. This is purely a working view: it never merges with whatever was loaded before, and it does **not** touch anything you've already saved. Nothing is written to the shared backend until you explicitly click **Save Dataset** again.
- **Saved Datasets…** — Lists every dataset saved so far with the record count and save date. Use **Load** to switch the map to a saved dataset (this also marks it as the one shown by default going forward), **Rename** to relabel it, or **Delete** to remove it.
- The status pill at the top of the left rail always shows what you're currently looking at: a saved dataset, an unsaved session (uploaded but not saved), or the default preprocessed `data.json`.

Uploading a new Excel file (via **Upload Excel File**) always *replaces* the records on screen — it is never combined/merged with whatever was previously displayed, whether that was a saved dataset or another upload. If a previous dataset was on screen, an informational "Dataset Comparison" popup shows what changed (new/removed records) purely for your reference; it does not save or alter anything.

## Client Portal Links

Give an external client their own secure, read-only view of a filtered slice of the data — without giving them access to this admin dashboard or any other part of the site.

- **Access**: Click **Create Client Link** in the Export Tools section of the left rail.
- **What gets shared**: A frozen snapshot of whatever is currently filtered/displayed on your screen at the moment you click Create. It does not update later — refresh it by creating a new link (or ask to extend this feature to support re-syncing, if that becomes needed).
- **Comparison view (optional)**: You can pick two Saved Datasets to give the client a fixed, side-by-side comparison (maps + delta tables). The client cannot upload files or choose different datasets themselves.
- **Export (optional)**: If enabled, the client can download a polished PDF report and an aggregate summary CSV (counts/breakdowns only — no per-student names or addresses).
- **Credentials**: A username you choose plus an auto-generated password are shown exactly once after creation — copy them immediately, they cannot be retrieved again (only reset).
- **Managing links**: Click **View existing client links…** inside the Create Client Link dialog to see every link created, copy its URL again, reset its password, revoke/reactivate it, or delete it permanently.
- **Isolation**: The client portal (`client.html`) is a completely separate page with its own login form and its own authentication system (`netlify/functions/rv-client-portal.js`), signed with a dedicated secret (`RV_CLIENT_JWT_SECRET`, see `.env.example`) that is entirely independent of staff logins. A client credential only ever unlocks that one portal's frozen data — it cannot be used to reach this dashboard, any other Marketing Hub tool, or any other client's portal.

## Export Features

### Executive Map Report Export
Generate polished, presentation-ready PNG or PDF reports from the current filtered map view.

- **Access**: Click "Executive Map Report" in the Export Tools section of the left rail
- **Options**:
  - Custom report title and subtitle
  - Preset title quick-select buttons
  - PNG (high resolution) or PDF format
  - Map view: auto-fit filtered records, current zoom, or full region
  - Optional filter summary display
- **Output includes**: Header with title/date, KPI summary bar, rendered map, distance legend, band breakdown percentages, methodology footer
- **Privacy**: No personal names or sensitive details are included in the export
- **Best for**: Executive presentations, client reports, PowerPoint/Google Slides, email attachments

### Direct Mail Export Builder
A dedicated workflow for generating vendor-ready mailing list files.

- **Access**: Click "Direct Mail Export" in the Export Tools section of the left rail
- **3-Step Workflow**:
  1. **Define Audience** — Filter by state, distance band, status, application type, housing interest, city, zip code. Quick presets for common segments (Washington Only, Out of State, Within 50 Miles, Housing Interested Admits, Current App Filters)
  2. **Preview & Validate** — See audience count, address completeness warnings, state abbreviation checks, zip format validation, preview table
  3. **Export** — Choose CSV or Excel (.xlsx) format with options for PO Box exclusion, address deduplication, capitalization normalization, and optional name inclusion
- **Excel output** includes two sheets: Mailing List (vendor-ready rows with frozen headers) and Export Summary (segment metadata, filter details, band breakdown)
- **Privacy**: Names are excluded by default; can be opted in if needed
- **Best for**: Direct mail campaigns, vendor mailing files, audience segmentation

## File Structure

| File | Description |
|------|-------------|
| `index.html` | Main interactive web application (staff-only, requires site login) |
| `client.html` | Read-only client portal page — one file serves every client link, parameterized by `?p=<slug>`; has its own separate login |
| `geocode.js` | Node.js data preprocessor |
| `data.json` | Pre-processed geocoded data (generated) — used only as a fallback if no dataset has been saved yet |
| `geocode-cache.json` | Geocoding cache (generated) |
| `ALL Admits for Autumn 2026_as of 3_13_2026.xlsx` | Source Excel file |
| `../netlify/functions/rv-data.js` | Backend API for saved datasets, dataset diff snapshots, and mailer history (MongoDB-backed) |
| `../netlify/functions/rv-client-portal.js` | Backend API for creating/managing client portal links and serving the client-side login + data (isolated auth, MongoDB-backed) |

## Dependencies

### Node.js (for preprocessing)
- `xlsx` — Excel file parsing
- `zipcodes` — US zip code centroid database

### Browser (loaded via CDN)
- **Leaflet.js** — Interactive mapping
- **Leaflet.markercluster** — Marker clustering
- **SheetJS** — Client-side Excel parsing (for file re-uploads and XLSX export)
- **html2canvas** — Map and layout capture for PNG export
- **jsPDF** — PDF document generation

### Basemap
- Tiles are served by Esri's free **World Light Gray Canvas** basemap (`server.arcgisonline.com`), which does not require an API key.
- This replaced CARTO's `basemaps.cartocdn.com` tiles, which now require a CARTO account/API key (see carto.com/basemaps/apikey) and were showing an "API key required" tile error.

## Assumptions & Fallback Logic

- International addresses without recognized zip codes are geocoded to their city centroid
- If city+state geocoding fails, the record is excluded from the map but still appears in filtered counts
- Distance is calculated as straight-line (great-circle) distance, not driving distance
- Zip code centroids represent the geographic center of the zip code area, not the exact address
- Records with null/blank zip codes fall back to city+state geocoding

## Data Privacy

- No personal identifying information (names, emails, phone numbers) is exposed in the web interface
- Only aggregated location data (city, state, zip) is displayed
- The data.json file strips all PII fields from the source Excel
