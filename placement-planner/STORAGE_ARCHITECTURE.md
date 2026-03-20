# Ivory Housing Placement Planner — Storage Architecture

## Source of Truth

**MongoDB Atlas** (shared, hosted) via Netlify Functions API at `/api/placement-planner`.

All authenticated users read/write from the **same shared document** (`_key: 'shared'`)
in the `placement_planner` collection. There is NO user-scoping or per-user namespacing.

`localStorage` is used as a **write-through cache** for fast initial render, but the
API is always the primary source of truth. If the API is unreachable, the app displays
a warning banner and operates in offline/read-only-cache mode.

---

## Data Flow

### Import Flow
1. User uploads Excel/CSV file in the browser
2. File is parsed client-side using SheetJS (`excel.js`, `inventory.js`)
3. Parsed records are stored in `AppState` (in-memory JS objects)
4. `persistProject()` is called, which:
   - Writes to `localStorage` immediately (fast cache)
   - Debounces (500ms) then POSTs to `/api/placement-planner` (shared DB)
5. The API upserts the entire project blob into MongoDB under `_key: 'shared'`

### Read Flow (Page Load)
1. `loadPersistedProject()` fetches `GET /api/placement-planner` (with auth cookie)
2. If API returns valid project data → restore into `AppState`, update localStorage cache
3. If API fails or returns empty → fall back to localStorage cache (READ-ONLY, no push-back)
4. UI renders from `AppState`

### Edit Flow
1. User edits resident, assigns bank entry, transfers scholarship, etc.
2. `AppState` is mutated in-memory
3. `persistProject()` writes to localStorage + API (same as import flow)
4. All other users will see the updated data on their next page load or refresh

### Delete Flow
1. User confirms deletion (single or bulk)
2. Records removed from `AppState`
3. `persistProject()` saves the updated state to localStorage + API
4. "Clear Session" also calls `DELETE /api/placement-planner` to wipe the shared doc

---

## Multi-User Synchronization

- All users share the **same MongoDB document** — no user-scoped namespaces
- Last-write-wins: the most recent `persistProject()` call overwrites the shared doc
- `updatedAt` and `updatedBy` fields track who last modified the data
- `localStorage` is a per-browser cache only; it never overrides API data
- If the API is unreachable, a warning banner is shown and edits are blocked

---

## Audit: Root Cause of "Data Missing on Other Computers" (Fixed 2026-03-20)

### Problem
Data uploaded on Computer A was visible there but missing on Computer B.

### Root Cause
The original code had a **silent localStorage→API push-back bug**: when the API
GET failed on Computer B (e.g., intermittent network, auth cookie not sent), the
app fell back to localStorage (which was empty on Computer B), and then **pushed
that empty localStorage back to the API**, overwriting Computer A's data.

Additionally, API persist failures were only logged to `console.warn` with no
user-visible notification, so users had no way to know their data wasn't actually
being saved to the shared backend.

### Fix Applied
1. **Removed dangerous push-back**: localStorage fallback is now read-only — stale
   local data is never pushed back to the API
2. **Added API connection status banner**: users see a clear warning when the API
   is unreachable, and edit controls are disabled in offline mode
3. **Added persist failure notifications**: if the API POST fails, a visible error
   toast is shown so users know to retry
4. **Added `updatedAt` display**: the last-saved timestamp is shown so users can
   verify data freshness
5. **Added retry logic**: failed API persists are retried up to 2 times

---

## Files Involved

| File | Role |
|------|------|
| `placement-planner/app.js` | Application state, persistence logic, event wiring |
| `placement-planner/config.js` | Color config, map registry, constants, color persistence |
| `placement-planner/excel.js` | Excel/CSV parsing (residents, bank, prelease, scholarships) |
| `placement-planner/inventory.js` | Inventory parsing, unit helpers, stats, search |
| `placement-planner/ui.js` | All DOM rendering functions |
| `placement-planner/map.js` | SVG map loading and rendering |
| `netlify/functions/placement-planner.js` | API: GET/POST/DELETE shared project data |
| `netlify/functions/_db.js` | MongoDB Atlas connection |
| `netlify/functions/_auth.js` | JWT auth, cookie parsing |
