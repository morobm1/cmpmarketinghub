# HOW TO USE REPORT BUILDER - Complete Instructions

## THE PROBLEM

Your PDF shows the WIZARD PAGE is printing instead of the ACTUAL REPORT. This means:
- Report checkboxes were not checked in the gallery
- reportSelected object is empty
- No competitor data to build the report

---

## CORRECT WORKFLOW (Step by Step)

### Method 1: Start from Gallery (RECOMMENDED)

#### Step 1: Check Report Boxes in Gallery
1. Go to **Competitor Cards** page (main gallery view)
2. **IMPORTANT**: Look for the **"Report" checkbox on the LEFT side** of each card image
3. **Check the "Report" box** on EVERY card you want in your report
4. You should see the **"Report Builder" button** in toolbar update to show count:
   - Before: `Report Builder`
   - After: `Report Builder (6)` ← Shows 6 cards selected

#### Step 2: Open Report Builder
1. Click the **"Report Builder (6)"** button in the toolbar
2. The wizard opens to Step 1
3. You'll see your 6 competitors already checked ✓

#### Step 3: Wizard Step 1 - Verify Selection
1. All the competitors you checked should already be selected
2. Adjust if needed (check/uncheck)
3. Click **"Next Step"**

#### Step 4: Wizard Step 2 - Choose Sections
1. All 5 sections are checked by default:
   - ✓ Subject Property Card
   - ✓ Competitor Cards
   - ✓ Comparison Table
   - ✓ Rate Comparison
   - ✓ Amenity Cart
2. Uncheck any you don't want
3. Click **"Next Step"**

#### Step 5: Wizard Step 3 - Generate Report
1. **VERIFY**: You should see:
   - "6 Competitors" in summary
   - List of competitor names below
   - "5 Sections" enabled
2. **If you DON'T see competitor names**, go back to gallery and check Report boxes!
3. Choose one of three options:
   - **Preview Report**: Opens full report for review
   - **Export to Excel**: Downloads spreadsheet
   - **Print / PDF**: Opens report then print dialog

#### Step 6: Preview Report
1. Click **"Preview Report"** button
2. You should see FULL REPORT with:
   - ✅ Cover page with property name and date
   - ✅ Subject property full card (if you have one set up)
   - ✅ Full card for EACH of the 6 competitors
   - ✅ Comparison table
   - ✅ Rate comparison with colored arrows
   - ✅ Amenity cart comparison
3. Scroll through to verify all content
4. Click **"Print / PDF"** button in toolbar
5. Browser print dialog opens
6. Choose "Save as PDF" or print to printer

---

### Method 2: Start from Report Builder (Alternative)

#### Step 1: Open Report Builder
1. Click **"Report Builder"** button (even if no count shown)
2. Wizard opens to Step 1

#### Step 2: Select Competitors in Wizard
1. **Check the boxes** next to each competitor you want
2. Watch the counter: "6 competitors selected"
3. Click **"Next Step"**

#### Step 3: Continue Through Wizard
(Same as Method 1 Steps 4-6 above)

---

## DEBUGGING: How to Check if Selections Work

### Open Browser Console
1. Press **F12** to open Developer Tools
2. Click **Console** tab
3. Leave it open while using Report Builder

### What to Look For

#### When Checking Report Boxes in Gallery:
```
Report selected: {card-id-1: true, card-id-2: true, ...}
Total selected for report: 6
```

#### When Opening Report Builder:
```
Step 3 - reportSelected: {card-id-1: true, card-id-2: true, ...}
Step 3 - selectedCount: 6
Step 3 - reportCards: [Object, Object, Object, Object, Object, Object]
```

#### When Clicking Preview/Print:
```
Preview button clicked
reportSelected: {card-id-1: true, card-id-2: true, ...}
=== renderReportPreview START ===
reportCards found: 6
  - The Bowery at Southside
  - South 400
  - CoHo Apartments
  - Ramble & Rose
  - MAG & MAY
  - Willow & Wise
```

### If You See Empty Objects:
```
reportSelected: {}
selectedCount: 0
reportCards found: 0
```

**This means**: Report checkboxes were NOT checked in gallery!

**Fix**: Go to gallery and check the Report boxes on each card

---

## COMMON MISTAKES

### ❌ Mistake 1: Not Checking Report Boxes First
**Problem**: Opening Report Builder without checking Report boxes in gallery
**Result**: Step 3 shows "0 competitors", report is empty
**Fix**: Go to gallery, check Report boxes on cards, then reopen Report Builder

### ❌ Mistake 2: Checking Compare Instead of Report
**Problem**: Checking the "Compare" box (right side) instead of "Report" box (left side)
**Result**: Compare button works, but Report Builder has no selections
**Fix**: Check the **Report** box on the **LEFT side** of each card

### ❌ Mistake 3: Printing from Step 3 Wizard Page
**Problem**: Clicking Print/PDF when reportSelected is empty
**Result**: Prints the wizard page instead of the actual report
**Fix**: First click "Preview Report" to verify content loads, THEN print

### ❌ Mistake 4: Not Setting Up Subject Property
**Problem**: No "Our Property" card configured
**Result**: Report only has competitor cards, missing subject property section
**Fix**: Click "Set Up Our Property Card" in gallery, fill in details

### ❌ Mistake 5: Expecting Automatic Selection
**Problem**: Thinking all cards auto-select for reports
**Result**: Nothing selected, empty report
**Fix**: Manually check Report boxes - nothing auto-selects

---

## REPORT CONTENTS EXPLAINED

### What Gets Generated

#### Cover Page
- Property name (Bryan Flats)
- "Market Analysis Report" title
- Current date
- Capstone Management Partners
- List of all competitors included

#### Subject Property Card (Optional - if enabled)
- Full detailed card for YOUR property
- Same format as competitor cards
- Includes:
  - Property snapshot (address, type, distance)
  - Product summary (floorplans, units, rates)
  - Pricing & fees breakdown
  - Current specials
  - Amenities
  - Market performance
  - Competitive analysis

#### Competitor Cards (6 Full Cards)
Each of your 6 selected competitors gets a FULL PAGE with:
- Property photo
- Address and website
- Property type and target audience
- Distance from campus
- Floorplan options and rates (full table)
- Unit count and occupancy
- Current specials and concessions
- Top amenities
- Pet policy, parking, furnished options
- Monthly fees breakdown
- Market performance metrics
- Competitive takeaway analysis
- Notes

#### Comparison Table
Side-by-side matrix comparing:
- Address
- Property Type
- Target Audience
- Distance
- Floorplans
- Unit Count
- Starting Rate (highlighted)
- Occupancy (highlighted)
- Top Amenities
- Specials
- Competitive Takeaway

#### Rate Comparison
Floorplan-level rate analysis:
- Grouped by bedroom type (Studio, 1BR, 2BR, etc.)
- Rate ranges for each property
- **Colored arrows**:
  - 🔴 RED UP ARROW ↑ = Our rates are HIGHER than competitor
  - 🟢 GREEN DOWN ARROW ↓ = Our rates are LOWER than competitor
- Dollar difference amounts
- "(no comparable)" when bedroom types don't match

#### Amenity Cart
Comprehensive amenity comparison:
- Grouped by category:
  - Fitness & Recreation
  - Study & Work
  - Social & Lounge
  - Parking & Transportation
  - Pet & Lifestyle
  - Security & Access
  - Kitchen & Living
- Side-by-side for all properties
- ✓ Yes / -- No indicators
- Total amenity count per property

---

## PRINT / PDF PROCESS

### What Happens When You Click Print/PDF

1. **Validation Check**
   - Verifies at least one competitor is selected
   - If empty, shows alert: "Please select competitors..."

2. **Navigate to Preview**
   - Calls `renderReportPreview()` function
   - Builds full HTML report with all sections
   - Renders in browser

3. **Wait for Content**
   - Waits 1500ms (1.5 seconds) for everything to render
   - Allows images, tables, cards to fully load

4. **Open Print Dialog**
   - Browser print dialog opens automatically
   - You can:
     - **Save as PDF**: Choose "Microsoft Print to PDF" or "Save as PDF"
     - **Print**: Select printer and print
     - **Cancel**: Go back and review

### The PDF Should Contain

✅ Cover page
✅ Subject property card (if configured)
✅ Full card for EACH competitor (6 pages)
✅ Comparison matrix table
✅ Rate comparison chart with colored arrows
✅ Amenity cart comparison grid

### The PDF Should NOT Contain

❌ Navigation bars
❌ Sidebars
❌ Wizard progress indicator
❌ Step 3 summary page
❌ Action buttons

---

## IF REPORT IS STILL EMPTY

### Checklist

1. **Open browser console** (F12)
   - Look for console.log messages
   - Check for errors in red

2. **Verify selections in console**:
   ```
   reportSelected: {id1: true, id2: true, ...}
   ```
   - Should show object with card IDs
   - If shows `{}` empty, nothing is selected

3. **Check Step 3**:
   - Does it show "6 Competitors"?
   - Are competitor names listed?
   - If not, selections aren't working

4. **Try this flow**:
   ```
   Gallery → Check Report boxes → Report Builder (6) →
   Step 1 → Verify checked → Next →
   Step 2 → Keep all enabled → Next →
   Step 3 → See 6 names listed → Preview Report →
   See full report → Print/PDF
   ```

5. **If still broken**:
   - Refresh page (F5)
   - Check Report boxes again
   - Open console
   - Try again
   - Look for console errors

---

## WHAT THE PDF SHOULD LOOK LIKE

### Page 1: Cover
```
[Capstone Logo]

Bryan Flats
Market Analysis Report

Prepared: July 10, 2026
Capstone Management Partners

Competitors Analyzed:
[The Bowery] [South 400] [CoHo] [Ramble & Rose] [MAG & MAY] [Willow & Wise]
```

### Page 2-3: Bryan Flats (Our Property)
```
[Full competitor card format with all details]
- Photos
- Property info
- Floorplan rates table
- Amenities
- Market performance
- Etc.
```

### Page 4-5: The Bowery at Southside
```
[Full competitor card with all details]
```

### Page 6-7: South 400
```
[Full competitor card]
```

### ... (Pages for each competitor)

### Page 14: Comparison Matrix
```
[Side-by-side comparison table]
```

### Page 15: Rate Comparison
```
[Rate comparison chart with arrows]
```

### Page 16: Amenity Cart
```
[Amenity comparison grid]
```

---

## SUMMARY

### The Core Issue
You were clicking Print/PDF from Step 3 **without having any competitors selected** in reportSelected object.

### The Solution
1. **ALWAYS check Report boxes in gallery FIRST**
2. **THEN open Report Builder**
3. **Verify selections in Step 1 and Step 3**
4. **Click Preview to verify content**
5. **THEN print**

### Quick Test
1. Go to gallery
2. Check Report box on ONE competitor
3. Report Builder button should show "(1)"
4. Open Report Builder
5. Go through wizard
6. Step 3 should show "1 Competitors" and the name
7. Click Preview
8. Should see cover + 1 competitor card
9. If this works, you know the system works

### Expected Behavior
- Checking Report box → Updates reportSelected
- Report Builder (X) → Shows count
- Step 1 → Shows checked boxes
- Step 3 → Shows competitor names
- Preview → Shows full report
- Print → Saves/prints report as PDF

If ANY of these steps fail, the issue is with the selection mechanism, not the report generator.

---

## FILES MODIFIED

Recent changes to help debug:
- Added console logging throughout
- Added validation alerts
- Increased print timeout to 1500ms
- Added clearer error messages
- Added step-by-step instructions in errors

Check browser console (F12) for debugging info!
