# Weekly Admit Comparison Tool - User Guide

## Overview
The Weekly Admit Comparison Tool allows users to upload two Excel files (Previous Week and Current Week admit lists), compare them to identify new admits, generate downloadable reports, and maintain a running weekly history log.

## Features

### 1. File Upload
- **Supported file types**: `.xlsx` and `.csv`
- **Drag & drop** or click to upload functionality
- **Visual feedback** when files are successfully loaded
- **File validation** to ensure correct file types

### 2. Smart Matching Logic
The tool uses intelligent matching to identify unique records:

**Primary Identifier**: Email Address
- Automatically detects email columns (email, email address, e-mail, emailaddress)

**Fallback Identifier**: First Name + Last Name
- If no email is found, combines first and last name fields
- Detects various column name formats (first name, firstname, first, fname, etc.)

**Custom Identifier**: 
- Optional dropdown to manually select which column to use as the unique identifier
- Useful for datasets with non-standard column names

### 3. Automatic Deduplication
- Removes duplicate records from both files before comparison
- Displays warning message showing how many duplicates were removed
- Ensures accurate comparison results

### 4. Results Display
After comparison, the tool displays:
- **Total Students Last Week**: Count from previous week file
- **Total Students This Week**: Count from current week file  
- **New Students This Week**: Highlighted count of new admits (emphasized with larger font and blue color)

### 5. Downloadable Excel Report
- Click "Download New Admits Report" to generate Excel file
- File naming format: `New_Admits_YYYY-MM-DD.xlsx`
- Includes all original columns from Current Week file
- Adds new column: "Week Identified As New" with current date
- Only contains rows identified as new admits

### 6. Details View
- Click "View Details" to see a table of all new admits
- Shows all columns from the original file
- Collapsible for easy navigation

### 7. Weekly History Log
**Persistent Storage**: All comparison history is saved locally in your browser

**History Table Columns**:
- Week Processed (date comparison was run)
- Previous File Date (extracted from filename)
- Current File Date (extracted from filename)
- Total Current (total students in current week)
- New This Week (count of new admits)
- Actions (Download or Delete buttons)

**History Features**:
- Download any previous comparison as Excel
- Delete individual history entries
- Export entire history log to Excel
- Clear all history (with confirmation)
- Stores up to 50 most recent comparisons

## How to Use

### Step 1: Upload Files
1. Navigate to the tool from Custom Tools menu
2. Click or drag & drop your **Previous Week** file into the left upload zone
3. Click or drag & drop your **Current Week** file into the right upload zone
4. Wait for files to be processed (green checkmark appears when ready)

### Step 2: Select Identifier (Optional)
- By default, the tool auto-detects Email or First Name + Last Name
- If needed, select a different column from the dropdown

### Step 3: Compare Files
1. Click the "Compare Files" button
2. Wait for processing (loading indicator appears)
3. Review any warnings about duplicates or column mismatches

### Step 4: Review Results
- Check the summary statistics
- Click "View Details" to see the full list of new admits
- Review any warnings or errors

### Step 5: Download Report
- Click "Download New Admits Report" to save Excel file
- File includes all new admits with "Week Identified As New" date column

### Step 6: Start New Comparison
- Click "Reset" to clear current files and start over
- Previous comparison is automatically saved to history

## Error Handling

### Common Errors and Solutions

**"Invalid file type"**
- Solution: Only upload .xlsx or .csv files

**"Column headers do not match"**
- Warning only - comparison continues
- Indicates files may have different structures
- Review results carefully

**"One or both files are empty"**
- Solution: Ensure files contain data rows (not just headers)

**"Failed to read file"**
- Solution: Ensure file is not corrupted and is a valid Excel/CSV file

## Data Privacy & Storage

- **All data is processed locally** in your browser
- **No data is sent to servers** (except for authentication)
- **History is stored in browser localStorage**
- **Clearing browser data will delete history**
- **Each user has their own private history**

## Tips & Best Practices

1. **Consistent File Formats**: Use the same column structure in both files for best results
2. **File Naming**: Include dates in filenames (e.g., `Admits_2024-03-01.xlsx`) for better history tracking
3. **Regular Backups**: Export history log periodically as Excel for backup
4. **Review Warnings**: Always check warning messages about duplicates or column mismatches
5. **Clean Data**: Remove test data or incomplete records before uploading

## Technical Details

### Matching Algorithm
1. Extract unique identifier from each record
2. Normalize identifiers (lowercase, trim whitespace)
3. Build Set of identifiers from Previous Week
4. Build Set of identifiers from Current Week
5. Find identifiers in Current Week that don't exist in Previous Week
6. Return full records for those identifiers

### Browser Compatibility
- Modern browsers (Chrome, Firefox, Safari, Edge)
- Requires JavaScript enabled
- Requires localStorage support

### File Size Limits
- No hard limit enforced by tool
- Browser memory limitations apply (typically handles files with 10,000+ rows)
- Very large files (100MB+) may cause performance issues

## Troubleshooting

**Tool won't load**
- Ensure you're logged into Marketing Hub
- Check browser console for errors
- Try refreshing the page

**Files won't upload**
- Check file type (.xlsx or .csv only)
- Ensure file is not open in Excel
- Try a different browser

**Comparison takes too long**
- Large files may take 10-30 seconds
- Don't refresh page during processing
- Check browser console for errors

**History not saving**
- Check browser localStorage is enabled
- Not in private/incognito mode
- Browser storage quota not exceeded

## Support

For issues or questions:
1. Check this guide first
2. Review error messages carefully
3. Contact Marketing Hub administrator
4. Provide screenshots of any errors

## Version History

**v1.0** (March 2024)
- Initial release
- File upload and comparison
- Excel export
- Weekly history log
- Auto-deduplication
- Smart identifier detection
