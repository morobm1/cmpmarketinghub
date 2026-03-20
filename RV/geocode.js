#!/usr/bin/env node
/**
 * UWB Admit Radius Map — Data Preprocessor
 * 
 * Reads the Excel file, geocodes addresses using:
 *   1. US zip code centroid database (instant, via `zipcodes` package)
 *   2. Nominatim API fallback for international/unknown zips (rate-limited 1 req/sec)
 * 
 * Outputs:
 *   - data.json: All records with lat/lng and distance bands
 *   - geocode-cache.json: Geocoding cache for fast re-runs
 * 
 * Usage:
 *   node geocode.js
 *   node geocode.js "path/to/other-file.xlsx"
 */

const XLSX = require('xlsx');
const zipcodes = require('zipcodes');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// ── CONFIG ──────────────────────────────────────────────────────────
const ORIGIN = { lat: 47.7596, lng: -122.1892, label: '17927 113th Ave NE, Bothell, WA 98011' };
const EXCEL_PATH = process.argv[2] || path.join(__dirname, 'ALL Admits for Autumn 2026_as of 3_13_2026.xlsx');
const CACHE_PATH = path.join(__dirname, 'geocode-cache.json');
const OUTPUT_PATH = path.join(__dirname, 'data.json');

const DISTANCE_BANDS = [
  { min: 0, max: 10, label: '0–10 mi', color: '#22c55e' },
  { min: 10, max: 50, label: '10–50 mi', color: '#f97316' },
  { min: 50, max: 100, label: '50–100 mi', color: '#ef4444' },
  { min: 100, max: Infinity, label: '100+ mi', color: '#8b5cf6' }
];

// ── HELPERS ─────────────────────────────────────────────────────────

/** Haversine distance in miles */
function haversine(lat1, lon1, lat2, lon2) {
  const R = 3958.8; // Earth radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getDistanceBand(miles) {
  for (const band of DISTANCE_BANDS) {
    if (miles >= band.min && miles < band.max) return band.label;
  }
  return '100+ mi';
}

function cleanStr(val) {
  if (val == null) return '';
  return String(val).trim().replace(/\s+/g, ' ');
}

function cleanZip(val) {
  if (val == null) return '';
  let z = String(val).trim();
  // Remove +4 extension
  z = z.replace(/-\d{4}$/, '');
  // Pad to 5 digits if numeric
  if (/^\d+$/.test(z) && z.length < 5) z = z.padStart(5, '0');
  return z;
}

/** Nominatim geocode with rate limiting */
function nominatimGeocode(query) {
  return new Promise((resolve, reject) => {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
    const options = {
      headers: { 'User-Agent': 'UWB-AdmitRadiusMap/1.0 (educational-tool)' }
    };
    
    https.get(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const results = JSON.parse(data);
          if (results && results.length > 0) {
            resolve({ lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) });
          } else {
            resolve(null);
          }
        } catch (e) {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── MAIN ────────────────────────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  UWB Admit Radius Map — Data Preprocessor');
  console.log('═══════════════════════════════════════════════════════\n');

  // Load geocode cache
  let cache = {};
  if (fs.existsSync(CACHE_PATH)) {
    try {
      cache = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'));
      console.log(`✓ Loaded geocode cache: ${Object.keys(cache).length} entries`);
    } catch (e) {
      console.log('⚠ Cache file corrupted, starting fresh');
    }
  }

  // Read Excel
  console.log(`\n📂 Reading Excel: ${path.basename(EXCEL_PATH)}`);
  const wb = XLSX.readFile(EXCEL_PATH);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rawData = XLSX.utils.sheet_to_json(ws);
  console.log(`   Found ${rawData.length} records on sheet "${wb.SheetNames[0]}"`);

  // Detect headers
  const headers = XLSX.utils.sheet_to_json(ws, { header: 1 })[0];
  console.log(`   Headers: ${headers.join(', ')}`);

  // Collect unique geocode keys
  const uniqueLocations = new Map(); // key → { zip, city, state, street }
  
  rawData.forEach(row => {
    const zip = cleanZip(row['ZipCode']);
    const city = cleanStr(row['City']);
    const state = cleanStr(row['State']);
    const street = cleanStr(row['Street 1']);
    
    // Primary key: zip code (most reliable for distance)
    // Fallback key: city+state
    const key = zip ? `zip:${zip}` : `cs:${city}|${state}`;
    if (!uniqueLocations.has(key)) {
      uniqueLocations.set(key, { zip, city, state, street });
    }
  });

  console.log(`\n🌍 Unique locations to geocode: ${uniqueLocations.size}`);

  // Geocode all unique locations
  let geocoded = 0, fromCache = 0, fromZipDb = 0, fromNominatim = 0, failed = 0;
  const failedLocations = [];

  for (const [key, loc] of uniqueLocations) {
    // Check cache first
    if (cache[key]) {
      fromCache++;
      geocoded++;
      continue;
    }

    // Try US zip code database
    if (loc.zip && /^\d{5}$/.test(loc.zip)) {
      const zipData = zipcodes.lookup(loc.zip);
      if (zipData) {
        cache[key] = { lat: zipData.latitude, lng: zipData.longitude, source: 'zipdb' };
        fromZipDb++;
        geocoded++;
        continue;
      }
    }

    // Try Nominatim
    const queries = [];
    if (loc.street && loc.city && loc.state) {
      queries.push(`${loc.street}, ${loc.city}, ${loc.state}`);
    }
    if (loc.city && loc.state) {
      queries.push(`${loc.city}, ${loc.state}`);
    }
    if (loc.zip) {
      queries.push(loc.zip);
    }
    if (loc.state && !loc.city) {
      queries.push(loc.state);
    }

    let found = false;
    for (const q of queries) {
      process.stdout.write(`  🔍 Nominatim: "${q}"...`);
      await sleep(1100); // Respect rate limit
      const result = await nominatimGeocode(q);
      if (result) {
        cache[key] = { lat: result.lat, lng: result.lng, source: 'nominatim' };
        fromNominatim++;
        geocoded++;
        found = true;
        console.log(` ✓ (${result.lat.toFixed(4)}, ${result.lng.toFixed(4)})`);
        break;
      } else {
        console.log(' ✗');
      }
    }

    if (!found) {
      failed++;
      failedLocations.push(key);
      // Use null coordinates — these will be excluded from mapping
      cache[key] = null;
    }

    // Save cache periodically
    if ((geocoded + failed) % 50 === 0) {
      fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));
    }
  }

  // Final cache save
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));

  console.log(`\n📊 Geocoding Results:`);
  console.log(`   From cache:     ${fromCache}`);
  console.log(`   From zip DB:    ${fromZipDb}`);
  console.log(`   From Nominatim: ${fromNominatim}`);
  console.log(`   Failed:         ${failed}`);
  if (failedLocations.length > 0) {
    console.log(`   Failed keys:    ${failedLocations.join(', ')}`);
  }

  // Build output records
  const records = [];
  const seen = new Set(); // deduplication

  rawData.forEach((row, idx) => {
    const zip = cleanZip(row['ZipCode']);
    const city = cleanStr(row['City']);
    const state = cleanStr(row['State']);
    const key = zip ? `zip:${zip}` : `cs:${city}|${state}`;
    const geo = cache[key];

    // Build dedup key (address + status + app type)
    const dedupKey = `${cleanStr(row['Status'])}|${cleanStr(row['Application Type'])}|${cleanStr(row['Street 1'])}|${city}|${state}|${zip}`;
    const isDuplicate = seen.has(dedupKey);
    seen.add(dedupKey);

    const record = {
      id: idx + 1,
      status: cleanStr(row['Status']),
      releasedStatus: cleanStr(row['Released Status']),
      appType: cleanStr(row['Application Type']),
      appSubtype: cleanStr(row['Application Subtype']),
      city: city,
      state: state,
      zip: zip,
      street: cleanStr(row['Street 1']),
      street2: cleanStr(row['Street 2']),
      housing: cleanStr(row['Interested in Campus Housing?']),
      lat: geo ? geo.lat : null,
      lng: geo ? geo.lng : null,
      geocoded: !!geo,
      duplicate: isDuplicate
    };

    // Calculate distance
    if (record.lat && record.lng) {
      record.distance = Math.round(haversine(ORIGIN.lat, ORIGIN.lng, record.lat, record.lng) * 10) / 10;
      record.band = getDistanceBand(record.distance);
    } else {
      record.distance = null;
      record.band = 'Unknown';
    }

    records.push(record);
  });

  // Stats
  const geocodedCount = records.filter(r => r.geocoded).length;
  const dupeCount = records.filter(r => r.duplicate).length;
  const bandCounts = {};
  DISTANCE_BANDS.forEach(b => bandCounts[b.label] = 0);
  bandCounts['Unknown'] = 0;
  records.forEach(r => { bandCounts[r.band] = (bandCounts[r.band] || 0) + 1; });

  console.log(`\n📋 Output Summary:`);
  console.log(`   Total records:  ${records.length}`);
  console.log(`   Geocoded:       ${geocodedCount}`);
  console.log(`   Not geocoded:   ${records.length - geocodedCount}`);
  console.log(`   Duplicates:     ${dupeCount}`);
  console.log(`   Distance bands:`);
  Object.entries(bandCounts).forEach(([band, count]) => {
    console.log(`     ${band}: ${count}`);
  });

  // Write output
  const output = {
    meta: {
      generatedAt: new Date().toISOString(),
      sourceFile: path.basename(EXCEL_PATH),
      totalRecords: records.length,
      geocodedRecords: geocodedCount,
      failedGeocode: records.length - geocodedCount,
      duplicateRecords: dupeCount,
      origin: ORIGIN,
      distanceBands: DISTANCE_BANDS,
      bandCounts
    },
    records
  };

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output));
  console.log(`\n✅ Written: ${OUTPUT_PATH} (${(fs.statSync(OUTPUT_PATH).size / 1024).toFixed(0)} KB)`);
  console.log(`✅ Written: ${CACHE_PATH} (${(fs.statSync(CACHE_PATH).size / 1024).toFixed(0)} KB)`);
  console.log('\nDone! Open index.html to view the map.\n');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
