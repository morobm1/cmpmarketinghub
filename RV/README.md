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

1. Place the new Excel file in the `RV/` directory
2. Run: `node geocode.js "New_File_Name.xlsx"`
3. The script will use cached geocoding results for known locations and only query new ones
4. Refresh the browser to see updated data

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
| `index.html` | Main interactive web application |
| `geocode.js` | Node.js data preprocessor |
| `data.json` | Pre-processed geocoded data (generated) |
| `geocode-cache.json` | Geocoding cache (generated) |
| `ALL Admits for Autumn 2026_as of 3_13_2026.xlsx` | Source Excel file |

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
