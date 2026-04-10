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
- **Optimistic concurrency control** via `_rev` counter prevents stale overwrites:
  - Every save increments `_rev` in MongoDB
  - Clients track the `_rev` they last loaded/saved
  - On save, the client sends its `_rev`; the server **rejects** the write with
    `409 Conflict` if the server `_rev` has advanced (another user saved)
  - On conflict, the client **fetches the latest server data and merges** it with
    local changes (union of residents, bank entries, scholarships, etc.)
  - After merging, the client re-saves with the updated `_rev`
- **Background sync polling** (every 30 seconds + on tab visibility change):
  - Client GETs the API and compares `_rev` with its local `_rev`
  - If the server is ahead, the client merges server data into local state
  - Users see a notification: "Another user saved changes — merged automatically"
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

## Audit: "Stale Cache Overwrites Other User's Data" (Fixed 2026-04-10)

### Problem
User A adds residents and saves. User B had the planner open with OLD data (loaded
before User A's changes). When User B makes any edit, `persistProject()` blindly
overwrites the API with User B's stale data, wiping User A's residents.

This is the classic **last-write-wins race condition**: the system had no mechanism
to detect that another user had modified the shared document since User B loaded it.

### Root Cause
The POST `/api/placement-planner` endpoint accepted any save unconditionally —
it had no revision tracking or conflict detection. Whichever client called POST
last would overwrite the entire shared document, regardless of whether it had
seen the latest version.

### Fix Applied
1. **Server-side optimistic concurrency control** (`_rev` counter):
   - MongoDB document now includes a `_rev` field that increments on every save
   - POST endpoint requires the client to send its known `_rev`
   - If the server `_rev` is ahead (another user saved), the POST returns **409 Conflict**
     with the current server data so the client can merge
   - Legacy clients without `_rev` still work (blind overwrite, but `_rev` is initialized)

2. **Client-side conflict detection and merge**:
   - Client tracks `_serverRev` from the last load/save
   - On 409, `_handleSaveConflict()` merges server data with local changes:
     - Inventory: uses whichever is larger (more complete import)
     - Residents: union by unit key (both server and local placements preserved)
     - Waiting bank / scholarships: union by `_id` or name (deduplicated)
     - Scholarship reserved units: union (server base, local additions preserved)
   - After merging, the client re-saves with the updated `_rev`

3. **Background sync polling** (every 30 seconds + tab visibility):
   - Client periodically checks if `_rev` has advanced on the server
   - If another user saved, the client auto-merges without waiting for a save attempt
   - User sees a notification: "Another user saved changes — merged automatically"

4. **User notifications**: merge events are shown as warning toasts so users
   know when their data was combined with another user's changes

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
