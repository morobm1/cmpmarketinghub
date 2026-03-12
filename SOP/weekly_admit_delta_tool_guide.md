# Weekly Admit Delta Tool - User Guide

## Overview

The **Weekly Admit Delta Tool** is a custom tool designed to compare two CSV/Excel files (Previous Week and Current Week) to identify changes in admit lists. It provides detailed insights into new admits and removed records with comprehensive reporting capabilities.

## Features

### 1. File Upload
- **Supported Formats**: .xlsx, .xls, .csv
- **Drag & Drop**: Intuitive drag-and-drop interface
- **Visual Feedback**: Clear indicators when files are successfully loaded

### 2. Smart Matching Logic
The tool uses a two-tier matching strategy:

**Primary Match: Portal Email**
- Searches for columns named: "Portal Email", "PortalEmail", "Email", "Email Address", "E-mail", "EmailAddress"
- Case-insensitive and trimmed for accuracy

**Fallback Match: Name First + Name Last**
- If no email is found, matches using:
  - First Name fields: "Name First", "First Name", "FirstName", "First", "FName"
  - Last Name fields: "Name Last", "Last Name", "LastName", "Last", "LName"
- Case-insensitive and trimmed for accuracy

### 3. Comprehensive Statistics
The tool displays four key metrics:
- **Previous Week Total**: Total unique records in previous week file
- **Current Week Total**: Total unique records in current week file
- **New This Week**: Records present in current week but not in previous week
- **Removed from Current Week**: Records present in previous week but not in current week

### 4. Data Preview
- **New Admits Preview**: Shows first 10 rows of new admits with all original columns
- **Removed Admits Preview**: Shows first 10 rows of removed records with all original columns
- **Change Type Badge**: Visual indicator showing "New This Week" or "Removed from Current Week"

### 5. Excel Export
Two separate download options:
- **Download New Admits (.xlsx)**: Excel file containing all new admits
- **Download Removed Admits (.xlsx)**: Excel file containing all removed records

Both exports include:
- All original columns from the source files
- Additional "Change Type" column indicating the type of change

## How to Use

### Step 1: Access the Tool
1. Navigate to **Custom Tools** in the Marketing Hub
2. Add "Weekly Admit Delta Tool" from the library if not already added
3. Click on the tool card to open it

### Step 2: Upload Files
1. Click or drag-and-drop your **Previous Week CSV** file into the left upload zone
2. Click or drag-and-drop your **Current Week CSV** file into the right upload zone
3. Wait for both files to be processed (green checkmark indicates success)

### Step 3: Compare Files
1. Click the **"Compare Files"** button
2. The tool will process both files and identify changes
3. Results will appear automatically below

### Step 4: Review Results
1. Check the statistics cards for summary counts
2. Scroll down to preview new and removed records
3. Review the data in the preview tables

### Step 5: Export Results
1. Click **"Download New Admits (.xlsx)"** to export new records
2. Click **"Download Removed Admits (.xlsx)"** to export removed records
3. Files will download with timestamp in filename (e.g., `New_Admits_2024-01-15.xlsx`)

### Step 6: Reset (Optional)
- Click **"Reset"** button to clear all data and start a new comparison

## Data Quality Tips

### Best Practices
1. **Consistent Column Names**: Ensure both files use the same column headers
2. **Email Format**: Use valid email addresses in the Portal Email column
3. **Name Consistency**: Keep first and last name formatting consistent across weeks
4. **No Extra Spaces**: The tool trims spaces, but clean data is always better

### Common Issues
- **No Matches Found**: Check that column names match expected patterns
- **Unexpected Results**: Verify data quality (spelling, formatting, duplicates)
- **Missing Records**: Ensure all required columns (Email or Name fields) are present

## Technical Details

### Matching Algorithm
1. Normalize all strings (lowercase, trim whitespace)
2. Build identifier maps for both files
3. Compare identifiers to find differences
4. Generate separate lists for new and removed records

### Data Processing
- **Deduplication**: Automatically handled during comparison
- **Case Sensitivity**: All matching is case-insensitive
- **Whitespace**: Leading/trailing spaces are automatically trimmed
- **Empty Values**: Empty cells are handled gracefully

### Export Format
- **File Type**: True .xlsx (Excel) format
- **Sheet Names**: "New This Week" and "Removed from Current Week"
- **Column Order**: Original columns preserved, "Change Type" added at end
- **Formatting**: Standard Excel formatting with headers

## Security & Privacy

- **Authentication Required**: Must be logged into Marketing Hub
- **User-Scoped**: Each user's data is private
- **No Server Storage**: Files are processed in-browser only
- **Secure Connection**: All data transmitted over HTTPS

## Support

For questions or issues with the Weekly Admit Delta Tool:
1. Check this guide for common solutions
2. Verify your file format and column names
3. Contact your Marketing Hub administrator
4. Review the error messages for specific guidance

## Version History

- **v1.0** (2024): Initial release with core comparison features
  - Portal Email and Name matching
  - New/Removed record identification
  - Excel export with Change Type column
  - Preview tables with first 10 rows
  - Statistics dashboard
