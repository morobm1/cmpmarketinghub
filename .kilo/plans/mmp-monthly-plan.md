# Plan: New "Monthly Marketing Plan" (MMP) Web App Page

## Goal recap
1. New page, branded exactly like the rest of the CMP Marketing Hub (same header/logo/fonts/colors, same `standard-nav.js` sidebar), but with a **card-based dashboard feel** (inspired by the GRO Reporting screenshot: KPI stat cards + a row of pill/tab quick-links) instead of a giant, ugly full-month calendar grid (the EZ-style screenshot is an example of what to avoid).
2. Fully analyze `CMP - MMP - Community Name - 2026 - 2027.xlsx` and reproduce its functionality (key dates, hot spots/contacts, per-month budget tracking, resident/prospect engagement requirements + effort log, digital engagement requirements + effort log) in a friendlier web UI.
3. **No month tabs.** One continuously scrolling ("flowing") page with collapsible month sections, quick-jump nav, inline editing, and autosave **per property** (and per academic year), using the same Netlify Functions + MongoDB pattern as the rest of the site.

## Research findings (already completed)
- Site is static HTML/CSS/JS, no build step (except unrelated `email-shop/`). Hosted on Netlify with Functions in `netlify/functions/`, redirected via `/api/*` → `/.netlify/functions/:splat` (see `netlify.toml`).
- Persistence pattern used everywhere: `fetch('/api/...', {credentials:'include'})` → Netlify Function → MongoDB (`netlify/functions/_db.js` `getDb()`), auth via JWT cookie `mmp_token` verified with `netlify/functions/_auth.js` `verifyReqAuth(event)`. Property-level authorization via `canAccessProperty(user, property)` helper (copy pattern from `netlify/functions/marketing-plans.js`).
- **Best template to copy**: `marketing_plans.html` + `netlify/functions/marketing-plans.js`. Reuse: boot/login flow (`#bootLoader` → `#loginView` → `#appHeader`+`#appContainer`), `apiFetch()` wrapper, property `<select>` pattern (`GET /api/properties`), brand CSS variables, header markup, card/button/badge/modal CSS classes.
- Brand CSS variables (copy verbatim into new page `<style>`):
  ```css
  :root{ --brand-primary:#446472; --brand-accent:#ffb732; --brand-accent-2:#52d5ff; --brand-gray:#929497; --page-bg:#f8fafc; --bg:#ffffff; --panel:#ffffff; --text:#1e293b; --subtext:#64748b; --accent:var(--brand-accent-2); --border:#e2e8f0; --success:#22c55e; --warning:#f59e0b; --danger:#ef4444; }
  ```
  Fonts: Open Sans (body) + Roboto (headings) via Google Fonts, logo wordmark font `zooja-pro` via Typekit kit `hqv8hwr` (see exact `<link>` tags in `marketing_plans.html` lines 7-12).
- Header markup to copy verbatim (logo `logo-main.svg`, title "Marketing Hub", property select, sign out button, company name span) — see `marketing_plans.html` lines 331-342.
- `standard-nav.js` injects the real sidebar nav via JS after the `<header>` element and wraps remaining body content in `.main-content`. New page just needs `<header>...</header>` + `<script src="standard-nav.js"></script>` before `</body>`. Must add a new entry to `fullNavStructure.main` array and a matching SVG entry in the `icons` map (keyed by exact label) in `standard-nav.js`.
- Do NOT replicate `mmp_calendar_app.html`'s legacy localStorage migration code, and do NOT use `mmp_web_app.html` (unrelated Excel viewer tool, despite the name).

## Excel analysis (source of truth for data model)
File has per-sheet structure repeated for each of 12 months (AUG 2026 → JUL 2027), plus two reference sheets and a Legend sheet:

**Key Dates sheet** — flat list of `Event | Date` rows (16-17 generic academic-calendar labels, dates blank in template): First Day of Classes, Move In Day, First Day of Classes, Fall Housing Fair, Homecoming Game/Week, Parents/Family Weekend, Mid Terms Week, Thanksgiving Break/Fall Break, Finals Week, Winter Break, Spring Classes Start, Spring Housing Fair, Parents/Family Weekend, Mid Terms Week, Spring Break, Finals Week, Graduation.

**Hot Spots & Contacts sheet** — `Location | Type | Contact` rows, 4 blank rows each for types: Bar / Nightlife, Campus Hot Spot / Landmark, Restaurant, Things To Do.

**Each month sheet (AUG…JUL)** contains, in order:
1. A full month calendar grid with `Lead Goal` / `Lease Goal` columns per week + `Notes:` cell — **we will NOT reproduce the calendar grid visually** (per explicit user request); we keep `leadGoal`, `leaseGoal` (single per-month numeric targets) and `notes` (free text) only.
2. `L&M BUDGET SUMMARY`: 4 line-item categories — **Resident Life**, **Model/Leasing Experience**, **Collateral & Promotional**, **Sponsorships** — each with `Budget` and `Estimated Spend` columns; `Left to Spend` = Budget − Spend; `Total` row sums all 4.
3. `Resident / Prospect Engagement Requirements`: 6 frequency targets — Resident Event, Renewal/Retention Efforts, Outreaching Effort, Street Marketing, Cross-Marketing Partnership, Review Campaign — value is a free-text cadence string (e.g. "1x / Week", "3-4x / Week ( When Applicable)"). **Values differ by month** — see table below.
4. `Resident / Prospect Engagement Efforts` log — blank template rows (pre-tagged by Type) with columns: Name, Type, Date, Description of Event, Cost, Supplies Needed, What Action Is Desired?, Linked digital design (URL), Flyers Posted (bool), Eblast Sent (bool).
5. Second calendar grid (duplicate, no goals columns) — **skip, redundant**.
6. `Digital Engagement Requirements` (link to a Social Media SOP doc): 7 frequency targets — GMB Post, Tik Tok post, Instagram Reel, Instagram Grid Post, Instagram Story, Facebook Page Post, Community Groups Post/Engagement. **Identical every month**: GMB 2x/Week, TikTok 1x/Week, IG Reel 1x/Week, IG Grid 3x/Week, IG Story 4x/Week, FB Page 2x/Week, Community Groups 2x/Week.
7. `Digital Engagement Efforts` log — blank template rows (pre-tagged by Type) with columns: Title, Type, Date, Content Details, Caption, Hashtags, What Action Is Desired?, Posted to Social (bool).

**Per-month Resident/Prospect requirement defaults** (from actual sheet values, to seed new plans — all editable after creation):

| Month | Resident Event | Renewal/Retention | Outreaching | Street Marketing | Cross-Marketing | Review Campaign |
|---|---|---|---|---|---|---|
| Aug | 1x/Week | 1-2x/Week (When Applicable) | 2x/Month | 1x/Week | 1x/Month | 1x/Week |
| Sep | 1x/Week | 3-4x/Week (When Applicable) | 1x/Week | 2x/Week | 1x/Week | 1x/Week |
| Oct | 1x/Week | 3-4x/Week (When Applicable) | 1x/Week | 2x/Week | 1x/Week | 1x/Week |
| Nov | 1x/Week | 3-4x/Week (When Applicable) | 1x/Week | 2x/Week | 1x/Week | 1x/Week |
| Dec | 2x/Month | 2x/Week (When Applicable) | 2x/Month | 2x/Week | 2x/Month | 1x/Week |
| Jan | 3x/Month | 2x/Week (When Applicable) | 2x/Month | 2x/Week | 2x/Month | 1x/Week |
| Feb | 3x/Month | 2x/Week (When Applicable) | 1x/Week | 4x/Week | 1x/Week | 1x/Week |
| Mar | 3x/Month | 1-2x/Week (When Applicable) | 2x/Week | 4x/Week | 1x/Week | 1x/Week |
| Apr | 3x/Month | 1x/Week (When Applicable) | 2x/Week | 4x/Week | 1x/Week | 1x/Week |
| May | 2x/Month | 1x/Week (When Applicable) | 2x/Week | 4x/Week | 1x/Week | 1x/Week |
| Jun | 2x/Month | 1x/Week (When Applicable) | 2x/Week | 4x/Week | 1x/Week | 1x/Week |
| Jul | 2x/Month | 1-2x/Week (When Applicable) | 2x/Week | 2x/Week | 1x/Week | 1x/Week |

Digital requirement defaults (same all 12 months): GMB `2x / Week`, TikTok `1x / Week`, IG Reel `1x / Week`, IG Grid Post `3x / Week`, IG Story `4x / Week`, FB Page Post `2x / Week`, Community Groups `2x / Week`.

Budget defaults: all categories start at `$0` budget / `$0` spend (the Excel's `$10`/`$5` placeholder values are just example data, not meaningful defaults).

## Data model (MongoDB collection `mmp_monthly_plans`)
One document per **property + academicYear** (e.g. "Ivory University House" / "2026-2027"):

```js
{
  _id, property, academicYear,      // e.g. "2026-2027"
  communityName: '',                 // optional display name override
  keyDates: [ { label, date } ],           // seeded from Excel list, addable/removable
  hotSpots: [ { location, type, contact } ], // type: Bar/Nightlife | Campus Hot Spot/Landmark | Restaurant | Things To Do
  months: [                          // exactly 12, Aug..Jul, in order
    {
      key: 'AUG', label: 'August 2026', year: 2026, month: 8,
      leadGoal: 0, leaseGoal: 0, notes: '',
      budget: {
        residentLife:  { budget: 0, spend: 0 },
        modelLeasing:  { budget: 0, spend: 0 },
        collateral:    { budget: 0, spend: 0 },
        sponsorships:  { budget: 0, spend: 0 },
      },
      requirements: { residentEvent, renewalRetention, outreaching, streetMarketing, crossMarketing, reviewCampaign }, // strings
      digitalRequirements: { gmb, tiktok, igReel, igGrid, igStory, fbPage, communityGroups }, // strings
      engagementEfforts: [ { id, name, type, date, description, cost, supplies, actionDesired, designLink, flyersPosted, eblastSent } ],
      digitalEfforts: [ { id, title, type, date, contentDetails, caption, hashtags, actionDesired, postedToSocial } ],
    },
    // ... SEP..JUL
  ],
  createdByUserId, createdAt, updatedAt
}
```

`engagementEfforts[].type` options: `Resident Event`, `Renewal/Retention Efforts`, `Outreaching Effort`, `Street Marketing`, `Cross-Marketing Partnership`, `Review Campaign`.
`digitalEfforts[].type` options: `GMB Post`, `Tik Tok Post`, `Instagram Reel`, `Instagram Grid Post`, `Instagram Story`, `Facebook Page Post`, `Community Groups Post`.

## New file 1: `netlify/functions/mmp-monthly-plans.js`
Copy the shape of `marketing-plans.js` (same imports `getDb, ObjectId` from `_db.js`, `verifyReqAuth` from `_auth.js`, same `canAccessProperty` helper). Collection: `mmp_monthly_plans`.

- `GET ?property=X` → list of `{id, property, academicYear, createdAt, updatedAt}` sorted by `academicYear desc` (for the year selector).
- `GET ?id=X` → full document.
- `POST` body `{property, academicYear, ...fullDoc}` → create. If a doc with same `property+academicYear` already exists, return `409 {error:'exists', id}` instead of creating a duplicate.
- `POST` body `{action:'duplicate', id, academicYear}` → clone an existing plan's structure/requirements/budgets/keyDates/hotSpots into a new academic year, but **reset** each month's `engagementEfforts`, `digitalEfforts`, `notes`, and `spend` fields to empty/0 (this supports the "reuse template every year" workflow). 409 if target year already exists for that property.
- `PUT` body `{id, ...fields}` → whole-document field overwrite (merge with existing doc then normalize), bump `updatedAt`. `property`/`academicYear` are immutable after creation (stripped from `$set`).
- `DELETE` body `{id}` → delete.
- All mutating/read operations must call `verifyReqAuth` first (401 if missing) then `canAccessProperty(user, doc.property)` (403 if not authorized), exactly like `marketing-plans.js`.
- Write small `normalizePlan`/`normalizeMonth`/`normalizeEffort`/`normalizeDigitalEffort`/`normalizeKeyDate`/`normalizeHotSpot` server-side sanitizers (trim strings, coerce numbers, coerce booleans, ensure arrays) mirroring the style already in `marketing-plans.js` (`toISO`, `normalizeWeek`, `normalizePlan` functions there are the direct precedent). A full draft implementation was already written during planning and can be reused verbatim by the implementer — see "Draft server code" section below.

### Draft server code (ready to paste into `netlify/functions/mmp-monthly-plans.js`)
```js
import { getDb, ObjectId } from './_db.js';
import { verifyReqAuth } from './_auth.js';

function json(status, body) { return { statusCode: status, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }; }

function canAccessProperty(user, property) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  const props = Array.isArray(user.properties) ? user.properties : (user.properties === '*' ? ['*'] : []);
  if (props.includes('*')) return true;
  return props.includes(property);
}

function str(v) { return String(v == null ? '' : v).trim(); }
function num(v) { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; }
function bool(v) { return v === true || v === 'true' || v === 1; }
function arr(v) { return Array.isArray(v) ? v : []; }

function normalizeKeyDate(k) { return { label: str(k?.label), date: str(k?.date) }; }
function normalizeHotSpot(h) { return { location: str(h?.location), type: str(h?.type), contact: str(h?.contact) }; }

function normalizeEffort(e) {
  return {
    id: str(e?.id) || ('e' + Math.random().toString(36).slice(2, 10)),
    name: str(e?.name), type: str(e?.type), date: str(e?.date),
    description: str(e?.description), cost: num(e?.cost), supplies: str(e?.supplies),
    actionDesired: str(e?.actionDesired), designLink: str(e?.designLink),
    flyersPosted: bool(e?.flyersPosted), eblastSent: bool(e?.eblastSent),
  };
}

function normalizeDigitalEffort(e) {
  return {
    id: str(e?.id) || ('d' + Math.random().toString(36).slice(2, 10)),
    title: str(e?.title), type: str(e?.type), date: str(e?.date),
    contentDetails: str(e?.contentDetails), caption: str(e?.caption), hashtags: str(e?.hashtags),
    actionDesired: str(e?.actionDesired), postedToSocial: bool(e?.postedToSocial),
  };
}

function normalizeMonth(m, idx) {
  const requirements = m?.requirements || {};
  const digitalRequirements = m?.digitalRequirements || {};
  const budget = m?.budget || {};
  function bcat(c) { return { budget: num(c?.budget), spend: num(c?.spend) }; }
  return {
    key: str(m?.key) || ('M' + idx), label: str(m?.label),
    year: Number.isFinite(+m?.year) ? +m.year : null, month: Number.isFinite(+m?.month) ? +m.month : null,
    leadGoal: num(m?.leadGoal), leaseGoal: num(m?.leaseGoal), notes: str(m?.notes),
    budget: {
      residentLife: bcat(budget.residentLife), modelLeasing: bcat(budget.modelLeasing),
      collateral: bcat(budget.collateral), sponsorships: bcat(budget.sponsorships),
    },
    requirements: {
      residentEvent: str(requirements.residentEvent), renewalRetention: str(requirements.renewalRetention),
      outreaching: str(requirements.outreaching), streetMarketing: str(requirements.streetMarketing),
      crossMarketing: str(requirements.crossMarketing), reviewCampaign: str(requirements.reviewCampaign),
    },
    digitalRequirements: {
      gmb: str(digitalRequirements.gmb), tiktok: str(digitalRequirements.tiktok),
      igReel: str(digitalRequirements.igReel), igGrid: str(digitalRequirements.igGrid),
      igStory: str(digitalRequirements.igStory), fbPage: str(digitalRequirements.fbPage),
      communityGroups: str(digitalRequirements.communityGroups),
    },
    engagementEfforts: arr(m?.engagementEfforts).map(normalizeEffort),
    digitalEfforts: arr(m?.digitalEfforts).map(normalizeDigitalEffort),
  };
}

function normalizePlan(body) {
  return {
    property: str(body.property), academicYear: str(body.academicYear), communityName: str(body.communityName),
    keyDates: arr(body.keyDates).map(normalizeKeyDate), hotSpots: arr(body.hotSpots).map(normalizeHotSpot),
    months: arr(body.months).map(normalizeMonth),
  };
}

export async function handler(event) {
  const user = verifyReqAuth(event);
  if (!user) return json(401, { error: 'unauthorized' });
  const method = event.httpMethod || 'GET';
  const url = new URL(event.rawUrl || `http://localhost${event.path}`);
  const qs = event.queryStringParameters || {};
  const property = url.searchParams.get('property') || qs.property || '';
  const id = url.searchParams.get('id') || qs.id || '';

  try {
    const db = await getDb();
    const col = db.collection('mmp_monthly_plans');

    if (method === 'GET') {
      if (id) {
        const doc = await col.findOne({ _id: new ObjectId(id) });
        if (!doc) return json(404, { error: 'not_found' });
        if (!canAccessProperty(user, doc.property)) return json(403, { error: 'forbidden' });
        return json(200, { id: doc._id.toString(), ...doc, _id: undefined });
      }
      if (!property) return json(400, { error: 'property required' });
      if (!canAccessProperty(user, property)) return json(403, { error: 'forbidden' });
      const list = await col.find({ property }).project({ property: 1, academicYear: 1, createdAt: 1, updatedAt: 1 }).sort({ academicYear: -1 }).toArray();
      return json(200, list.map(d => ({ id: d._id.toString(), property: d.property, academicYear: d.academicYear, createdAt: d.createdAt || null, updatedAt: d.updatedAt || null })));
    }

    if (method === 'POST') {
      let body = {};
      try { body = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'invalid_json' }); }
      const action = str(body.action);

      if (action === 'duplicate') {
        const srcId = str(body.id); const newYear = str(body.academicYear);
        if (!srcId || !newYear) return json(400, { error: 'id and academicYear required' });
        const src = await col.findOne({ _id: new ObjectId(srcId) });
        if (!src) return json(404, { error: 'not_found' });
        if (!canAccessProperty(user, src.property)) return json(403, { error: 'forbidden' });
        const existing = await col.findOne({ property: src.property, academicYear: newYear });
        if (existing) return json(409, { error: 'exists', id: existing._id.toString() });
        const clone = JSON.parse(JSON.stringify(src));
        delete clone._id; clone.academicYear = newYear;
        if (Array.isArray(clone.months)) {
          for (const m of clone.months) {
            m.engagementEfforts = []; m.digitalEfforts = []; m.notes = '';
            if (m.budget) { for (const k of Object.keys(m.budget)) { m.budget[k].spend = 0; } }
          }
        }
        clone.createdByUserId = user.sub; clone.createdAt = new Date(); clone.updatedAt = new Date();
        const res = await col.insertOne(clone);
        return json(200, { id: res.insertedId.toString() });
      }

      const prop = str(body.property || property); const year = str(body.academicYear);
      if (!prop || !year) return json(400, { error: 'property and academicYear required' });
      if (!canAccessProperty(user, prop)) return json(403, { error: 'forbidden' });
      const existing = await col.findOne({ property: prop, academicYear: year });
      if (existing) return json(409, { error: 'exists', id: existing._id.toString() });
      const plan = normalizePlan({ ...body, property: prop, academicYear: year });
      const doc = { ...plan, createdByUserId: user.sub, createdAt: new Date(), updatedAt: new Date() };
      const res = await col.insertOne(doc);
      return json(200, { id: res.insertedId.toString() });
    }

    if (method === 'PUT') {
      let body = {};
      try { body = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'invalid_json' }); }
      const planId = str(body.id);
      if (!planId) return json(400, { error: 'id required' });
      const existing = await col.findOne({ _id: new ObjectId(planId) });
      if (!existing) return json(404, { error: 'not_found' });
      if (!canAccessProperty(user, existing.property)) return json(403, { error: 'forbidden' });
      const updates = normalizePlan({ ...existing, ...body, property: existing.property, academicYear: existing.academicYear });
      updates.updatedAt = new Date(); delete updates.property; delete updates.academicYear;
      await col.updateOne({ _id: new ObjectId(planId) }, { $set: updates });
      return json(200, { ok: true });
    }

    if (method === 'DELETE') {
      let body = {};
      try { body = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'invalid_json' }); }
      const planId = str(body.id);
      if (!planId) return json(400, { error: 'id required' });
      const existing = await col.findOne({ _id: new ObjectId(planId) });
      if (!existing) return json(404, { error: 'not_found' });
      if (!canAccessProperty(user, existing.property)) return json(403, { error: 'forbidden' });
      await col.deleteOne({ _id: new ObjectId(planId) });
      return json(200, { ok: true });
    }

    return json(405, { error: 'method_not_allowed' });
  } catch (e) {
    return json(500, { error: 'server_error', detail: String(e?.message || e) });
  }
}
```
No changes to `netlify.toml` needed — `/api/mmp-monthly-plans` will automatically route to this function via the existing `/api/*` redirect rule.

## New file 2: `mmp_monthly_plan.html`
Single self-contained file (inline `<style>` + inline `<script>`, no build step), structurally modeled on `marketing_plans.html`.

### Boot/auth/property pattern (copy near-verbatim from `marketing_plans.html`)
- `#bootLoader` spinner → `#loginView` (inline login form posting to `/api/auth-login`) → `initAuth()` via `GET /api/me` → `#appHeader` + `#appContainer`.
- `apiFetch(path, opts)` wrapper identical to existing pattern, hitting `/api/mmp-monthly-plans`.
- Header: same brand markup (logo, "Marketing Hub" title, company name) plus:
  - Property `<select id="propertySelect">` populated via `GET /api/properties` (identical to `marketing_plans.html`).
  - Academic Year `<select id="yearSelect">` populated from `GET /api/mmp-monthly-plans?property=X` (list of years with existing plans for that property) **plus** the computed "current" academic year label if not already in the list (shown as `2026-2027 (new)`). Selecting a not-yet-created year shows a "Create Plan for 2026-2027" empty state (button calls `POST` with the default scaffold, or `POST {action:'duplicate', id: mostRecentYearId, academicYear:newYear}` if a prior year exists for that property, prompting user "Copy structure from 2025-2026?" vs "Start blank").
  - Sign Out button, Admin button (same as existing).
- `<script src="standard-nav.js"></script>` before `</body>` — do NOT hand-roll sidebar markup/CSS.

### Default academic year helper
```js
function computeDefaultAcademicYear(d = new Date()) {
  const y = d.getFullYear();
  const start = d.getMonth() >= 5 ? y : y - 1; // academic year starts ~June/Aug
  return `${start}-${start + 1}`;
}
```

### Default plan scaffold generator (client-side, used when creating a brand-new plan)
`MONTHS_META` constant array of 12 entries `{ key, label, monthNum, yearOffset }` in order Aug→Jul (yearOffset 0 for Aug-Dec, 1 for Jan-Jul, applied to the academic year's start year). Build `months[]` by mapping `MONTHS_META` to `{ ...meta, leadGoal:0, leaseGoal:0, notes:'', budget: zeroed 4-category object, requirements: <per-month table from Excel analysis above>, digitalRequirements: <constant 7-key object>, engagementEfforts: [], digitalEfforts: [] }`.
`DEFAULT_KEY_DATES` = the 17 labels from the Excel Key Dates sheet, each `{label, date:''}`.
`DEFAULT_HOT_SPOTS` = 4 blank rows × 4 types (`Bar / Nightlife`, `Campus Hot Spot / Landmark`, `Restaurant`, `Things To Do`), each `{location:'', type, contact:''}`.

### Page layout (no giant calendar; dashboard/card feel; single flowing scroll)
1. **Overview dashboard row** (sticky-ish, right under header, GRO-style KPI cards): 5 stat cards computed live from `plan.months`: Annual Budget (sum of all `budget.*.budget`), Total Spent (sum of `budget.*.spend`), Budget Remaining (computed, red if negative), Efforts Logged (sum `engagementEfforts.length`), Digital Posts Logged (sum `digitalEfforts.length`). Style: reuse `.metric-card`/`.metrics-grid` classes from `marketing_plans.html` CSS.
2. **Quick-jump pill nav** (GRO-style horizontal tab strip): "Overview" + one pill per month (`Aug`, `Sep`, … `Jul`) + "Key Dates & Hot Spots". Clicking scrolls (`scrollIntoView({behavior:'smooth', block:'start'})`) to the matching anchor and, if the target is a `<details>`, sets `.open = true`. Highlight the pill of the section currently in view using an `IntersectionObserver` (optional polish).
3. **Key Dates & Hot Spots** — a `<details class="card">` (open by default) with two sub-sections:
   - Key Dates: list of rows `[text input: label] [date input] [remove btn]`, "+ Add Key Date" button.
   - Hot Spots & Contacts: grouped by type (4 fixed type groups) with rows `[text: location] [text: contact] [remove]`, "+ Add" per group.
4. **12 month sections**, each a `<details class="month-card" id="month-AUG">` (native HTML disclosure widget — no custom JS needed for expand/collapse, accessible, lightweight). Only the current calendar month (relative to today's date) is `open` by default; all others start collapsed — this is what keeps the page "flowing" instead of one huge dump.
   - `<summary>`: Month label (e.g. "August 2026") + inline dashboard chips: Lead Goal (number input, stopPropagation on click so it doesn't toggle the details), Lease Goal (number input), Budget Remaining (computed badge, colored), Efforts count badge, Digital count badge.
   - Body sections inside each month:
     a. **Notes** — single full-width `<textarea>`.
     b. **Budget** — compact table: rows = 4 categories, columns = Budget ($ input) | Spend ($ input) | Left (computed, read-only) ; footer row = Total. Inputs update `plan.months[i].budget.X.{budget|spend}` on `input` (debounced save), recompute Left/Total/overview cards without full re-render (targeted DOM update).
     c. **Requirements** — two side-by-side small card-grids (CSS `grid-template-columns:repeat(auto-fit,minmax(200px,1fr))`): "Resident/Prospect Engagement Requirements" (6 chip-cards: label + text input for cadence) and "Digital Engagement Requirements" (7 chip-cards).
     d. **Resident/Prospect Engagement Efforts** — card-grid of effort "record cards" (NOT a wide spreadsheet table): each card shows Type badge + Name + Date + Cost + Delete button on the top row, Description textarea below, then a 2-col row (Supplies Needed, Action Desired), then Design Link input + Flyers Posted / Eblast Sent checkboxes. Filter chips above the grid (All / by type) using the 6 type names. "+ Add Effort" button (opens a small inline new card with a Type `<select>` at minimum required fields, or simply appends a blank card directly into the grid for immediate inline editing — prefer the latter for simplicity/flow).
     e. **Digital Engagement Efforts** — same card pattern: Type badge + Title + Date + Delete on top row, Content Details textarea, Caption + Hashtags 2-col row, Action Desired + Posted-to-Social checkbox row. Filter chips for the 7 digital types. "+ Add Digital Effort" button.
5. No FullCalendar / month-grid widget anywhere on the page.

### Editing & save behavior
- Single in-memory `window.__plan` object mirrors the full document (same pattern as `marketing_plans.html`'s `window.__currentPlan`).
- Use **event delegation**: one `input`/`change` listener per month container (or per page) reading `data-path` attributes (e.g. `data-path="months.0.budget.residentLife.budget"`) to update `window.__plan` via a small `setByPath(obj, path, value)` helper — avoids re-rendering the whole month on every keystroke (preserves focus/cursor position).
- Structural changes (add/remove effort card, add/remove key date or hot spot row) re-render only the specific sub-container (targeted `innerHTML` replace), not the whole page.
- **Debounced autosave**: on any change, mark `dirty = true`, show a small "Saving…" / "Saved ✓ HH:MM" / "Save failed – retry" indicator near the header (a `<span id="saveStatus">`), and call `saveDebounced()` (800ms debounce) → `apiFetch('/mmp-monthly-plans', {method:'PUT', body: JSON.stringify({id, ...window.__plan})})`. Also add a manual "Save Now" button and a `beforeunload` warning if `dirty`.
- Deleting an effort card: no confirm needed for simple rows (low risk, easily re-added) — but confirm() for deleting the whole property/year plan (not exposed in v1) — keep scope to plan editing only, no destructive whole-plan delete UI needed initially (can add a small "Delete this year's plan" admin-only action in overflow menu later, out of v1 scope unless trivial).

### CSS to add (new, on top of the copied brand/base/card/badge/button/modal CSS from `marketing_plans.html`)
- `.kpi-dash-grid` (reuse `.metrics-grid`/`.metric-card` almost as-is).
- `.quick-jump { display:flex; gap:6px; overflow-x:auto; padding:12px 24px; background:#fff; border-bottom:1px solid var(--border); position:sticky; top:64px; z-index:30 }` `.quick-jump-pill { padding:6px 14px; border-radius:999px; border:1px solid var(--border); background:#f8fafc; font-size:12px; font-weight:600; white-space:nowrap; cursor:pointer }` `.quick-jump-pill.active{ background:var(--brand-accent-2); border-color:var(--brand-accent-2); color:#fff }`
- `.month-card { background:#fff; border:1px solid var(--border); border-radius:14px; margin-bottom:16px; overflow:hidden }` `.month-card summary { list-style:none; cursor:pointer; padding:16px 20px; display:flex; align-items:center; gap:12px; flex-wrap:wrap; background:#f8fafc }` `.month-card summary::-webkit-details-marker{display:none}` `.month-card[open] summary{ border-bottom:1px solid var(--border) }` `.month-card .month-body{ padding:20px }`
- `.chip-input-card` (requirement mini-cards) — small bordered box, label on top (uppercase, 11px, subtext color), text input below, similar to `.kpi-item`.
- `.effort-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(300px,1fr)); gap:12px }` `.effort-card { border:1px solid var(--border); border-radius:10px; padding:12px; background:#fff }` with a colored left-border per type (map type→brand color) for quick visual scanning.
- Budget mini-table: reuse `.outreach-table`/plain `<table>` styles already defined for compact tabular inputs (`<input>` cells with reduced padding).

### Nav registration
Edit `standard-nav.js`:
- Add to `fullNavStructure.main` (right after `marketing_plans.html`): `{ href: 'mmp_monthly_plan.html', label: 'Monthly Marketing Plan' }`.
- Add a matching SVG entry to the `icons` map keyed by `'Monthly Marketing Plan'` (reuse a simple calendar/checklist-style stroke icon consistent with the existing icon set, e.g. a calendar-with-checkmark icon).

No changes required to `netlify.toml`, `_headers`, or other pages' hardcoded top `nav-tab` bars (only a handful of pages have that redundant secondary bar; the real/functional navigation is the `standard-nav.js` sidebar, which is sufficient. Optional/low-priority: also add an entry to `marketing_plans.html`'s `<nav class="nav-bar">` tab list for cross-linking convenience since it's a 1-line addition, but not required).

## Implementation task list (for build phase)
1. Create `netlify/functions/mmp-monthly-plans.js` using the draft code above.
2. Create `mmp_monthly_plan.html`:
   a. `<head>`: title, meta, Typekit/Google Fonts links (copy from `marketing_plans.html`), `<style>` block (brand vars + copied base/card/button/badge/modal CSS + new dashboard/quick-jump/month-card/effort-card CSS above).
   b. `<body>`: bootLoader, loginView, header (brand + property select + year select + save status + sign out/admin), main container with Overview KPI row, quick-jump pill nav, Key Dates & Hot Spots `<details>`, 12 month `<details>` sections generated by JS (not hardcoded HTML — render from `MONTHS_META`/`window.__plan.months`).
   c. `<script>`: state vars, `els` map, utils (`esc`, `fmtMoney`, `setByPath`, `getByPath`, `debounce`), auth functions (copy), `apiFetch`, `loadProperties`/`renderPropertyOptions`/`setActiveProperty`, year list loading (`loadYearsForProperty`), plan create/load/duplicate, `MONTHS_META` + `DEFAULT_KEY_DATES` + `DEFAULT_HOT_SPOTS` + `buildDefaultPlan(property, academicYear)`, render functions (`renderOverview`, `renderQuickJump`, `renderKeyDatesHotSpots`, `renderMonth(monthIndex)`, `renderEffortCard`, `renderDigitalEffortCard`), event delegation handlers, debounced save, add/remove row handlers for key dates/hot spots/efforts/digital efforts.
   d. `<script src="standard-nav.js"></script>` at the very end.
3. Edit `standard-nav.js`: add nav entry + icon (2 small edits, ~3 lines total).
4. Manual verification (no automated test suite in this repo):
   - Open the page locally (`netlify dev` or by deploying), log in, confirm sidebar shows new "Monthly Marketing Plan" item and highlights active on this page.
   - Select a property with no existing MMP plan for the default academic year → confirm "Create Plan" flow seeds all 12 months with correct per-month requirement defaults and empty budgets/efforts.
   - Edit a budget number, a requirement cadence string, add/remove an effort card and a digital effort card, add/remove a key date and a hot spot row → confirm the "Saving… / Saved" indicator behaves and a page reload reloads the same saved values (i.e., PUT round-trip works).
   - Confirm quick-jump pills scroll to and expand the right month; confirm collapsed months don't render a giant calendar grid anywhere (visual check against the "avoid this" screenshot).
   - Confirm switching property/year resets state correctly and doesn't leak data between properties.
   - Resize to a narrow width to confirm effort cards and requirement chip-grids reflow responsively (mobile/tablet friendliness), consistent with "flowing and easy to use."

## Explicit non-goals / scope boundaries
- No FullCalendar or any full month-grid calendar widget on this page.
- No month-per-tab / month-per-page navigation — one continuously scrollable document with collapsible `<details>` sections instead.
- Do not touch/modify `mmp_calendar_app.html` (separate existing "Marketing Calendar" tool) or `mmp_web_app.html` (unrelated Excel viewer) — this is a net-new page.
- Do not introduce a build step, framework, or new npm dependency — plain HTML/CSS/JS, consistent with the rest of the site.
