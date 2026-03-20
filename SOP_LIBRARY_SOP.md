# SOP Library – Standard Operating Procedure

## How the SOP Library Works & How to Add SOPs

---

## Overview

The **SOP Library** (`sop_library.html`) is a web-based document management system for Standard Operating Procedures at Capstone Management Partners. SOPs are stored in a **MongoDB database** via the Netlify serverless function `netlify/functions/sops.js` and managed through the admin UI.

---

## SOP Types

There are **two types** of SOPs in the system:

| Type | Description | Visibility |
|------|-------------|------------|
| **Company-wide** | Capstone company-wide SOPs | Visible to **all** authenticated users across all properties |
| **Site Specific** | Property-specific SOPs | Visible only to users **assigned to that property** (admins see all) |

---

## SOP Data Structure

Each SOP stored in the database contains these fields:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sopType` | `'company'` or `'site'` | Yes | Determines visibility scope |
| `property` | String or null | Yes (if site) | Property name (null for company-wide) |
| `title` | String | Yes | SOP title displayed in navigation |
| `category` | String | No | Groups SOPs in sidebar (e.g., Leasing, Operations) |
| `department` | String | No | Target department (e.g., Office Staff, Leasing Staff) |
| `system` | String | No | Software system (e.g., Entrata, Gmail, EZOS) |
| `content` | String (HTML) | Auto | Auto-generated HTML from the form fields below |
| `purpose` | String | No | Section 1 – Purpose description |
| `whenToUse` | String | No | Section 2 – When to use this process |
| `stepsData` | Array of objects | No | Section 3 – Step-by-step instructions |
| `expectedResults` | String | No | Section 4 – Expected outcome |
| `bestPractices` | String | No | Section 5 – Tips and recommendations |
| `trainingUrl` | String | No | YouTube, Loom, Vimeo, Google Drive, or image URL |
| `createdAt` | Date | Auto | Timestamp when created |
| `updatedAt` | Date | Auto | Timestamp when last updated |
| `createdBy` | String | Auto | Username of creator |

### Steps Data Structure

The `stepsData` field is an array of step objects:

```json
[
  {
    "title": "Log into Entrata",
    "description": "Open your browser and navigate to the Entrata login page. Enter your credentials and log in."
  },
  {
    "title": "Search for the Resident",
    "description": "Use the Search bar at the top.\n• Type the resident's name\n• Select the correct profile"
  }
]
```

**Note:** Within step descriptions, lines starting with `•`, `-`, or `*` are automatically rendered as bullet points.

---

## How to Add a New SOP (Admin Only)

### Method 1: Using the UI (Recommended)

1. **Log in** to the SOP Library as an **admin** user
2. Click the **"+ Create New SOP"** button at the bottom of the sidebar
3. Fill out the form:

#### SOP Information Section
- **SOP Title** – Required. Example: "Sending a Renewal Interview Invitation Email"
- **SOP Type** – Choose `Capstone Company-wide` or `Site Specific`
- **Property** – Only shown if Site Specific is selected; pick the property from the dropdown
- **System** – Select from presets (Entrata, Gmail, EZOS, Microsoft, Teams, Canva, Instagram, Facebook, TikTok) or choose "Other" to type a custom system name
- **Category** – Select from presets (Leasing, Operations, Maintenance, Accounting) or choose "Other" to type a custom category
- **Department** – Select from presets (Office Staff, Leasing Staff, Maintenance Team, University Partner) or choose "Third-Party Vendor" to type a custom vendor name

#### Training Video or Image (Optional)
- Paste a URL for a training video or image
- Supports: YouTube, Loom, Vimeo, Google Drive video links, or direct image URLs (.jpg, .png, .gif, .webp)
- Videos are automatically embedded as iframes; images are displayed inline

#### Section 1 – Purpose
- Describe why this SOP exists
- Example: "This Standard Operating Procedure outlines the process for sending a Renewal Interview Invitation email to residents who have renewed their lease."

#### Section 2 – When to Use This Process
- Describe the trigger or scenario for using this SOP
- Example: "This process should be used after a resident renews their lease and needs to receive the Renewal Interview Invitation email."

#### Section 3 – Step-by-Step Instructions
- Click **"+ Add Step"** to add steps
- Each step has a **Title** and a **Description**
- Use `•` or `-` at the start of lines in the description for bullet points
- Steps are automatically numbered
- Click the **×** button on a step to remove it
- Steps can be added/removed dynamically

#### Section 4 – Expected Results (Optional)
- Describe what should happen after completing the SOP
- Rendered inside a green success info box

#### Section 5 – Best Practices (Optional)
- List recommendations and tips
- Use `•` or `-` at the start of lines for bullet points
- Rendered inside a blue info box

4. Click **"Save SOP"** – The system auto-generates the HTML content and saves to the database

### Method 2: Direct API Call

Send a `POST` request to `/api/sops` with admin credentials:

```json
{
  "sopType": "site",
  "property": "Ivory University House",
  "title": "Sending a Renewal Interview Invitation Email",
  "category": "Resident Services",
  "department": "Leasing Team",
  "system": "Entrata",
  "trainingUrl": "https://www.youtube.com/watch?v=example",
  "purpose": "This SOP outlines the process for sending a Renewal Interview Invitation email.",
  "whenToUse": "Use after a resident renews their lease.",
  "stepsData": [
    {
      "title": "Log into Entrata",
      "description": "Open your browser and navigate to the Entrata login page."
    },
    {
      "title": "Search for the Resident",
      "description": "Use the Search bar at the top.\n• Type the resident's name\n• Select the correct profile"
    }
  ],
  "expectedResults": "The resident receives the Renewal Interview Invitation email.",
  "bestPractices": "• Always verify the resident has renewed their lease before sending\n• Use the Responses template instead of typing manually\n• Review the email before sending"
}
```

**Note:** The `content` field (rendered HTML) is auto-generated from the structured fields when saving through the UI. If using the API directly, you can either provide `content` as raw HTML or let the system use the structured fields as fallback.

---

## How SOPs Are Displayed

### Navigation Sidebar
- **Company-wide SOPs** are listed under "Capstone Company-wide SOP" with a blue dot indicator
- **Site-specific SOPs** are listed under "Site Specific SOP" with a gold dot indicator
- SOPs are grouped by **category** within each section
- Categories are collapsible sections in the sidebar
- Admins see a **site selector dropdown** to filter site SOPs by property
- Non-admin users only see SOPs for their assigned properties
- A **search box** filters SOPs by title, category, system, department, property, and purpose

### Content Rendering
When an SOP is selected, the system:
1. Checks if `sop.content` exists (pre-rendered HTML) and displays it directly
2. If no `content` field, falls back to rendering individual fields (`purpose`, `steps`, `resources`)

### Auto-Generated HTML Structure
The `buildContentHtml()` function generates this HTML structure from form fields:

```
<h1>[Property – ] Title</h1>
<p>[Category Badge] [Department Badge]</p>
<p>Property: X | System: Y</p>
[Training Video/Image Embed]

<h2>Section 1 – Purpose</h2>
<p>Purpose text...</p>

<h2>Section 2 – When to Use This Process</h2>
<p>When to use text...</p>

<h2>Section 3 – Step-by-Step Instructions</h2>
<h3><span class="step-number">1</span> Step Title</h3>
<p>Step description...</p>
...

<h2>Section 4 – Expected Result</h2>
<div class="info-box success">
  <h4>Expected Outcome</h4>
  <p>Expected result text...</p>
</div>

<h2>Section 5 – Best Practices</h2>
<div class="info-box">
  <h4>Recommendations</h4>
  <ul><li>Best practice items...</li></ul>
</div>

<hr>
<p><em>Document: Property – SOP: Title</em></p>
<p><em>System: X | Department: Y</em></p>
```

---

## Editing an Existing SOP

1. Navigate to the SOP in the sidebar and click it
2. As an admin, the **admin toolbar** appears above the content with badges and action buttons
3. Click **"Edit"** to open the edit modal pre-populated with all existing data
4. Make changes and click **"Save SOP"** – the HTML content is regenerated
5. The `updatedAt` timestamp is automatically updated

---

## Deleting an SOP

1. Navigate to the SOP and click it
2. Click **"Delete"** in the admin toolbar
3. Confirm the deletion in the dialog – **this cannot be undone**

The API call is `DELETE /api/sops` with body `{ "id": "sop_id_here" }`.

---

## Sharing & Deep Links

- Each SOP has a **"Copy Link"** button that generates a shareable URL with query parameter `?sop=<id>`
- When someone opens a deep link, the app auto-selects and displays that SOP after login
- For site-specific SOPs, the admin site filter is auto-set to show the correct property

---

## Export Features

### Export to Word (.doc)
- Generates an HTML file with Microsoft Word compatibility markup
- Includes a **cover page** with property name, SOP title, system, department, and date
- Includes **header and footer** on content pages
- Downloads as a `.doc` file

### Export to PDF
- Opens a new browser window with print-optimized HTML
- Includes a **cover page** and styled content
- Auto-triggers the browser's print dialog (Save as PDF)

---

## Property Grouping

The system supports property grouping for consolidated management:

| Old Property Names | Grouped As |
|---|---|
| Cerca Apartments, Prisma Apartments, Zuma Apartments | Cerca/Prisma/Zuma |
| Stateside Apartments, Monte Apartments | Stateside/Monte |
| Chorro SLO, Palomar SLO | Chorro/Palomar |

Users assigned to any property in a group will see SOPs for the grouped name.

---

## Access Control

| Action | Admin | Regular User |
|--------|-------|--------------|
| View company-wide SOPs | ✅ | ✅ |
| View site SOPs (own properties) | ✅ | ✅ |
| View site SOPs (all properties) | ✅ | ❌ |
| Create SOPs | ✅ | ❌ |
| Edit SOPs | ✅ | ❌ |
| Delete SOPs | ✅ | ❌ |
| Copy shareable link | ✅ | ✅ |
| Export Word/PDF | ✅ | ✅ |
| Site selector filter | ✅ | ❌ |

---

## Available Preset Options

### Systems
Entrata, Gmail, EZOS, Microsoft, Teams, Canva, Instagram, Facebook, TikTok, Other (custom)

### Categories
Leasing, Operations, Maintenance, Accounting, Other (custom)

### Departments
Office Staff, Leasing Staff, Maintenance Team, University Partner, Third-Party Vendor (custom)

---

## Backend API Reference

**Base URL:** `/api/sops`

| Method | Description | Auth |
|--------|-------------|------|
| `GET /api/sops` | List all accessible SOPs | Any user |
| `GET /api/sops?id=X` | Get single SOP by ID | Any user (with access) |
| `GET /api/sops?sopType=company` | List company-wide SOPs only | Any user |
| `GET /api/sops?sopType=site&property=X` | List site SOPs for property | Any user (with access) |
| `POST /api/sops` | Create new SOP | Admin only |
| `PUT /api/sops` | Update SOP (requires `id` in body) | Admin only |
| `DELETE /api/sops` | Delete SOP (requires `id` in body) | Admin only |

---

## File Locations

| File | Purpose |
|------|---------|
| `sop_library.html` | Main SOP Library page (UI + all client-side logic) |
| `netlify/functions/sops.js` | Backend API for CRUD operations on SOPs |
| `netlify/functions/_auth.js` | Authentication helper used by the API |
| `netlify/functions/_db.js` | MongoDB connection helper |
| `SOP/` | Directory with legacy markdown SOP files (not used by current system) |

---

*Document: SOP Library – Standard Operating Procedure*  
*Last Updated: March 2026*
