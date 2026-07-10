# Excel Export - Important Clarification

## What the Excel Export Does

The **"Export to Excel"** button generates a **standalone spreadsheet** with a competitor comparison table, similar to the format shown in your example screenshot.

### Excel File Contains:
- **Property names** as column headers (Our Property, Competitor 1, Competitor 2, etc.)
- **Rate comparison rows** by bedroom type:
  - Studios (rate + sqft)
  - 1BR (rate + sqft)
  - 2BR (rate + sqft)
  - 3BR, 4BR, etc. (if available)
- **Current specials** row
- **Amenities** rows (in-unit and community)
- **Additional notes** row

### It Does NOT Include:
- ❌ Full competitor card details (those are in the PDF/Preview)
- ❌ Photos or images
- ❌ Detailed strategic analysis
- ❌ Market performance metrics

### Purpose
The Excel export is specifically designed for:
✅ Quick rate comparison
✅ Side-by-side floorplan analysis
✅ Spreadsheet manipulation and formulas
✅ Sharing with team members who prefer Excel
✅ Importing into other tools

---

## Two Different Outputs

### 1. Preview Report / PDF
- **What**: Full detailed report with all selected sections
- **Includes**:
  - Cover page
  - Subject property card (full details)
  - Individual competitor cards (full details)
  - Comparison table
  - Rate comparison with arrows
  - Amenity cart
- **Format**: HTML/PDF - Professional document
- **Use Case**: Presentations, archiving, comprehensive review

### 2. Export to Excel
- **What**: Competitor comparison spreadsheet
- **Includes**:
  - Rate comparison by bedroom type
  - Square footage comparisons
  - Specials and amenities
  - Notes
- **Format**: .xlsx spreadsheet
- **Use Case**: Quick analysis, rate shopping, data manipulation

---

## Why Report Shows "Nothing"

If you're seeing an empty report, it's because:

### Issue: No Competitors Actually Selected
Even though Step 3 might show "6 competitors", if you didn't actually **check the boxes** in Step 1, they won't be included.

### Solution:
1. Click "Previous" or "Go Back to Step 1"
2. **Check the boxes** next to the competitors you want
3. Or click "Select All" to include everyone
4. Click "Next Step" to proceed
5. Step 3 will now show the actual selected competitors

### Debugging Added
We've added console logging to help identify the issue:
- Check browser console (F12) for messages showing:
  - `reportSelected` object
  - `selectedCount` number
  - `reportCards` array

---

## How to Use Report Builder Correctly

### Step 1: Select Competitors ☑️
1. **Check the boxes** next to competitors you want to include
2. Or use "Select All" checkbox
3. Watch the counter update: "X competitors selected"
4. Click "Next Step"

### Step 2: Choose Sections
1. Toggle sections on/off (all are enabled by default)
2. For Excel export, sections don't affect the output
3. Excel always exports the same comparison format
4. Click "Next Step"

### Step 3: Preview & Generate
1. Review your selections
2. You should see:
   - Competitor count (should match Step 1)
   - List of selected competitor names
   - Enabled sections list
3. Choose your output:
   - **Preview Report**: See full HTML report
   - **Export to Excel**: Download comparison spreadsheet
   - **Print / PDF**: Generate and print/save

---

## Warning Messages Added

### If No Competitors Selected (Step 3)
You'll now see a red warning:
```
🔴 No Competitors Selected
Please go back to Step 1 and select at least one competitor to include in your report.
[Go Back to Step 1]
```

### If Trying to Preview Empty Report
You'll see:
```
⚠️ No Competitors Selected
Please select at least one competitor in Step 1 to generate a report.
[Go to Step 1]
```

---

## Excel Export Details

### File Naming
`PropertyName_Competitor_Comparison_YYYY-MM-DD.xlsx`

Example:
`Bryan_Flats_Competitor_Comparison_2026-07-10.xlsx`

### Row Structure
| Row Label | Bryan Flats | Competitor 1 | Competitor 2 | etc. |
|-----------|-------------|--------------|--------------|------|
| Studios | $999-$1,125 | $1,194-$1,250 | - | - |
| Studio Sq. Ft | 327-346 | 465-600 | - | - |
| 1BR | - | $1,535-$1,654 | $1,436-$1,683 | - |
| 1BR Sq. FT | - | 722-770 | 720-780 | - |
| 2BR | - | $2,129-$2,504 | $1,821-$2,051 | - |
| 2BR Sq. FT | - | 1,052 | 1,082-1,108 | - |
| *(empty)* | | | | |
| Current specials | Waived app... | 4 weeks free... | 4-6 weeks... | - |
| *(empty)* | | | | |
| In Unit Amenities | amenities... | amenities... | amenities... | - |
| Community Amenities | amenities... | amenities... | amenities... | - |
| Additional notes | notes... | notes... | notes... | - |

### What Gets Included
- **Our Property**: If subject card exists and is enabled in sections
- **Competitors**: All selected in Step 1
- **Data**: From competitor card floorplan details and fields

---

## Testing Checklist

To ensure it works:

### ✅ Step 1
- [ ] Open Report Builder
- [ ] See list of competitors
- [ ] **Check boxes next to competitors you want**
- [ ] Counter shows correct number
- [ ] Click "Next Step"

### ✅ Step 2
- [ ] See sections list
- [ ] All are checked by default
- [ ] Toggle if needed
- [ ] Click "Next Step"

### ✅ Step 3
- [ ] See correct competitor count (matches Step 1)
- [ ] See list of competitor names (should show the ones you checked)
- [ ] If list is empty, go back to Step 1
- [ ] Click "Export to Excel"
- [ ] File downloads
- [ ] Open in Excel/Sheets
- [ ] See comparison table with your selected properties

---

## Summary

**Key Points:**
1. ✅ Excel export is **standalone** - just the comparison table
2. ✅ You must **check boxes in Step 1** to select competitors
3. ✅ Step 3 count should match what you selected in Step 1
4. ✅ If nothing appears, go back and check the boxes
5. ✅ Console logs now help debug selection issues
6. ✅ Warning messages guide you if selection is empty

**The Excel file matches your screenshot format** - it's a clean comparison table with rates, square footage, amenities, and notes for each property.
