# Paid Media Budget Increase Analyzer - Implementation Plan

## Overview

Create a new custom marketing analysis tool that evaluates paid media performance, calculates recommended budget increases, predicts results, and generates client-ready narratives. The tool will be accessible via the Custom Tools library.

## Design Decisions

Based on clarifications:
- **Settings Storage**: Global user settings (not per-analysis)
- **Chart Placement**: Mini-charts on dashboard + detailed charts section
- **Narrative Editing**: Editable textarea with restore original button
- **Budget Override**: Editable column in campaign data table
- **UI Layout**: Wizard/step progression (4 steps)
- **Saved Analyses**: Landing page with list → enter wizard
- **Data Table**: Custom grid component with add/delete/sort
- **Property Selection**: Dropdown from /api/properties
- **Export Formats**: Full suite (txt, md, docx, pdf) - requires adding libraries
- **Recommendation Logic**: Fully configurable scoring weights in settings
- **Access Control**: All authenticated users (not admin-only)

## Architecture

### Frontend: `paid_media_analyzer.html`
Single-page HTML application with:
- Embedded CSS matching project style guide
- Vanilla JavaScript (no framework)
- Wizard/step UI with navigation controls
- Custom data grid component
- Chart.js for visualizations
- SheetJS (XLSX) for Excel exports
- docx.js for Word document generation
- jsPDF for PDF generation

### Backend: `netlify/functions/paid-media-analyzer.js`
Netlify Function with:
- MongoDB collection: `paidMediaAnalyses`
- CRUD endpoints (GET, POST, PUT, DELETE)
- User-scoped data (username field)
- Separate collection for user settings: `paidMediaSettings`

### Backend: `netlify/functions/paid-media-settings.js`
Settings endpoint for global user assumptions and scoring weights.

## Database Schema

### Collection: `paidMediaAnalyses`
```javascript
{
  _id: ObjectId,
  username: String,              // User who created
  propertyId: String,             // From /api/properties
  propertyName: String,
  reportingStartDate: String,     // ISO date
  reportingEndDate: String,       // ISO date
  campaigns: [                    // Array of campaign rows
    {
      id: String,                 // Unique row ID
      channel: String,            // Meta, Google Search, etc.
      platform: String,           // Facebook, Instagram, Google, etc.
      campaignName: String,
      adName: String,
      objective: String,          // Traffic, Leads, etc.
      spend: Number,
      impressions: Number,
      reach: Number,
      clicks: Number,
      linkClicks: Number,
      landingPageViews: Number,
      leads: Number,
      tours: Number,
      applications: Number,
      leases: Number,
      engagements: Number,
      follows: Number,
      notes: String,
      manualIncreaseOverride: Number  // Manual budget increase override
    }
  ],
  calculatedSummary: {            // Computed metrics
    totalSpend: Number,
    totalImpressions: Number,
    totalReach: Number,
    totalClicks: Number,
    totalLinkClicks: Number,
    totalLeads: Number,
    totalTours: Number,
    totalApplications: Number,
    totalLeases: Number,
    blendedCTR: Number,
    blendedCPC: Number,
    blendedCostPerLinkClick: Number,
    blendedCPM: Number,
    blendedCostPerLead: Number,
    blendedCostPerLease: Number,
    bestPerformingChannel: String,
    bestPerformingCampaign: String,
    weakestPerformingCampaign: String
  },
  recommendation: {
    status: String,               // Increase, Controlled Increase, Hold, Optimize First, Insufficient Data
    suggestedAdditionalBudget: Number,
    suggestedNewTotalBudget: Number,
    score: Number,                // Overall performance score
    scoreBreakdown: Object,       // Detailed scoring by factor
    reasoningPoints: [String],    // Array of reasoning strings
    optimizationActions: [String] // If Optimize First status
  },
  predictions: {
    campaignPredictions: [        // Per-campaign predictions
      {
        campaignId: String,
        additionalBudget: Number,
        predictedAdditionalClicks: Number,
        predictedAdditionalLinkClicks: Number,
        predictedAdditionalLeads: Number,
        predictedAdditionalTours: Number,
        predictedAdditionalApplications: Number,
        predictedAdditionalLeases: Number
      }
    ],
    totalPredictedAdditionalClicks: Number,
    totalPredictedAdditionalLeads: Number,
    totalPredictedAdditionalTours: Number,
    totalPredictedAdditionalApplications: Number,
    totalPredictedAdditionalLeases: Number
  },
  narrativeGenerated: String,     // Auto-generated narrative
  narrativeCustom: String,        // User-edited narrative (if different)
  createdAt: String,              // ISO timestamp
  updatedAt: String               // ISO timestamp
}
```

### Collection: `paidMediaSettings`
```javascript
{
  _id: ObjectId,
  username: String,               // User who owns these settings
  assumptions: {
    targetCPC: Number,
    targetCostPerLinkClick: Number,
    targetCTR: Number,              // Percentage (e.g., 2.5 for 2.5%)
    targetCostPerLead: Number,
    targetCostPerLease: Number,
    defaultLeadConversionRate: Number,    // From clicks (e.g., 0.05 for 5%)
    defaultTourConversionRate: Number,    // From leads (e.g., 0.30 for 30%)
    defaultApplicationConversionRate: Number,  // From leads
    defaultLeaseConversionRate: Number,   // From leads
    recommendedIncreasePercentage: Number, // Default 25
    maxSuggestedIncreasePercentage: Number, // Default 50
    minSpendThreshold: Number,      // Default 100
    minClickThreshold: Number       // Default 100
  },
  scoringWeights: {
    cpcWeight: Number,              // Default 25
    ctrWeight: Number,              // Default 20
    costPerLeadWeight: Number,      // Default 30
    costPerLeaseWeight: Number,     // Default 25
    // Sum should equal 100
  },
  updatedAt: String                 // ISO timestamp
}
```

## File Structure

```
/
├── paid_media_analyzer.html          [NEW]
├── package.json                      [EDIT - add docx, jsPDF]
├── custom_tools.html                 [EDIT - add to TOOL_LIBRARY]
└── netlify/
    └── functions/
        ├── paid-media-analyzer.js    [NEW]
        └── paid-media-settings.js    [NEW]
```

## Implementation Steps

### 1. Dependencies
Add to package.json:
```json
"docx": "^8.5.0",
"jspdf": "^2.5.1"
```

### 2. Backend Functions

#### 2.1 `netlify/functions/paid-media-settings.js`
- **GET**: Return user's settings (or create defaults if not exist)
- **PUT**: Update user's settings (assumptions and scoring weights)
- Defaults:
  - targetCPC: 2.00
  - targetCostPerLinkClick: 1.50
  - targetCTR: 2.0
  - targetCostPerLead: 50.00
  - targetCostPerLease: 500.00
  - defaultLeadConversionRate: 0.05
  - defaultTourConversionRate: 0.30
  - defaultApplicationConversionRate: 0.15
  - defaultLeaseConversionRate: 0.10
  - recommendedIncreasePercentage: 25
  - maxSuggestedIncreasePercentage: 50
  - minSpendThreshold: 100
  - minClickThreshold: 100
  - cpcWeight: 25
  - ctrWeight: 20
  - costPerLeadWeight: 30
  - costPerLeaseWeight: 25

#### 2.2 `netlify/functions/paid-media-analyzer.js`
- **GET**: Return all analyses for current user (username scoped), sorted by updatedAt DESC
- **POST**: Create new analysis (validate property, dates, campaigns)
- **PUT**: Update existing analysis (match by _id and username)
- **DELETE**: Delete analysis (match by _id and username)
- All authenticated users can access (no admin-only restriction)

### 3. Frontend HTML Structure

#### 3.1 Page Structure
```
Header (standard project header)
Main Content Container
  ├── Landing View (default view)
  │   ├── Card: Saved Analyses Grid
  │   │   ├── Analysis cards (property, dates, status, metrics)
  │   │   └── Empty state with "New Analysis" button
  │   └── Button: "New Analysis"
  │
  └── Wizard View (hidden by default)
      ├── Progress Indicator (Step 1/2/3/4)
      ├── Step 1: Data Entry
      │   ├── Property Selection (dropdown from /api/properties)
      │   ├── Date Range (start and end date inputs)
      │   └── Campaign Data Grid
      │       ├── Editable columns (all input fields)
      │       ├── Calculated columns (read-only, live updates)
      │       ├── Add Row button
      │       ├── Delete Row button per row
      │       ├── Column sorting
      │       └── Sample data button
      │
      ├── Step 2: Settings & Review
      │   ├── Dashboard Summary Card (computed metrics)
      │   ├── Mini Charts (2 charts: Spend by Channel, CPC by Channel)
      │   ├── Assumptions Panel (editable from global settings)
      │   └── Scoring Weights Panel (editable from global settings)
      │
      ├── Step 3: Analysis & Recommendations
      │   ├── Recommendation Card (status, reasoning, score)
      │   ├── Budget Allocation Table (suggested increase per campaign)
      │   ├── Predictions Card (expected results)
      │   └── Detailed Charts Section (5 charts total)
      │
      └── Step 4: Narrative & Export
          ├── Narrative Preview/Editor (editable textarea)
          ├── Restore Original button
          ├── Export Buttons
          │   ├── Copy to Clipboard
          │   ├── Download as Text
          │   ├── Download as Markdown
          │   ├── Download as Word (DOCX)
          │   └── Download as PDF
          ├── Save Analysis button
          └── Return to Analyses List button
```

#### 3.2 Wizard Navigation
- Step indicator with clickable steps (after initial completion)
- "Next Step" button (disabled until current step valid)
- "Previous Step" button (except Step 1)
- "Save & Exit" button available from any step
- Auto-save to localStorage as draft (prevent data loss)

### 4. Custom Data Grid Component

Build `CampaignDataGrid` JavaScript class:

**Features:**
- Dynamic add/remove rows
- Column definitions with types (editable, calculated, currency, percent, number)
- Live calculation on input change
- Column sorting (click header to sort)
- Validation indicators (red border for invalid, warnings for suspicious values)
- Mobile-responsive (horizontal scroll on small screens)
- Keyboard navigation (Tab, Enter to move between cells)

**Column Groups:**
1. **Editable Input Columns** (blue background):
   - Channel (select dropdown)
   - Platform (select dropdown)
   - Campaign Name
   - Ad Name / Creative Name
   - Objective (select dropdown)
   - Spend
   - Impressions
   - Reach
   - Clicks
   - Link Clicks
   - Landing Page Views
   - Leads
   - Tours
   - Applications
   - Leases
   - Engagements
   - Follows
   - Notes

2. **Calculated Columns** (yellow background):
   - CTR (Clicks / Impressions)
   - Link Click Rate (Link Clicks / Impressions)
   - CPC (Spend / Clicks)
   - Cost per Link Click (Spend / Link Clicks)
   - CPM (Spend / Impressions * 1000)
   - Lead Rate (Leads / Clicks)
   - Cost per Lead (Spend / Leads)
   - Tour Rate (Tours / Leads)
   - Application Rate (Applications / Leads)
   - Lease Rate (Leases / Leads)
   - Cost per Lease (Spend / Leases)

3. **Budget Allocation Column** (Step 3 only):
   - Manual Increase Override (editable, shows system suggestion as placeholder)

**Calculation Safety:**
- All divisions check for zero/null/undefined
- Display "N/A" for undefined calculations
- Display "—" for zero values
- Format percentages to 2 decimals + "%"
- Format currency to 2 decimals with "$" prefix
- Format large numbers with commas

**Sample Data Button:**
Preload sample rows:
```javascript
[
  {
    channel: 'Meta',
    platform: 'Facebook/Instagram',
    campaignName: 'Fall 2026 Brand Awareness',
    spend: 315.21,
    impressions: 37986,
    clicks: 819,
    linkClicks: 712
  },
  {
    channel: 'Google Search',
    platform: 'Google',
    campaignName: 'Brand Terms',
    spend: 985.92,
    impressions: 9920,
    clicks: 458
  }
]
```

### 5. Dashboard Summary Calculations

Implement `calculateDashboardSummary(campaigns, settings)` function:

**Totals:**
- Sum all numeric fields across campaigns

**Blended Metrics:**
- Blended CTR = Total Clicks / Total Impressions
- Blended CPC = Total Spend / Total Clicks
- Blended Cost per Link Click = Total Spend / Total Link Clicks
- Blended CPM = Total Spend / Total Impressions * 1000
- Blended Cost per Lead = Total Spend / Total Leads
- Blended Cost per Lease = Total Spend / Total Leases

**Best/Worst Performers:**
- Best Performing Channel: Channel with lowest CPC (min 50 clicks)
- Best Performing Campaign: Campaign with lowest Cost per Lead (min 10 leads) OR lowest CPC if no leads
- Weakest Performing Campaign: Campaign with highest CPC or lowest CTR (min 50 impressions)

### 6. Recommendation Scoring Engine

Implement `calculateRecommendation(campaigns, summary, settings)` function:

**Scoring Logic:**

1. **CPC Score** (weight from settings.scoringWeights.cpcWeight):
   - If blendedCPC < targetCPC: score = 100
   - If blendedCPC < targetCPC * 1.5: score = 50
   - Else: score = 0

2. **CTR Score** (weight from settings.scoringWeights.ctrWeight):
   - If blendedCTR > targetCTR: score = 100
   - If blendedCTR > targetCTR * 0.75: score = 50
   - Else: score = 0

3. **Cost per Lead Score** (weight from settings.scoringWeights.costPerLeadWeight):
   - If no leads: score = N/A (skip this weight)
   - If costPerLead <= targetCostPerLead: score = 100
   - If costPerLead <= targetCostPerLead * 1.5: score = 50
   - Else: score = 0

4. **Cost per Lease Score** (weight from settings.scoringWeights.costPerLeaseWeight):
   - If no leases: score = N/A (skip this weight)
   - If costPerLease <= targetCostPerLease: score = 100
   - If costPerLease <= targetCostPerLease * 1.5: score = 50
   - Else: score = 0

**Overall Score:**
- Weighted average of available scores (0-100)
- Store scoreBreakdown object with individual factor scores

**Status Determination:**
- If totalSpend < minSpendThreshold OR totalClicks < minClickThreshold:
  - Status = "Insufficient Data"
  - Suggested Increase = 0
  
- Else if overall score >= 70:
  - Status = "Increase"
  - Suggested Increase = totalSpend * (recommendedIncreasePercentage / 100) up to maxSuggestedIncreasePercentage
  
- Else if overall score >= 50:
  - Status = "Controlled Increase"
  - Suggested Increase = totalSpend * (recommendedIncreasePercentage / 2 / 100)
  
- Else if blendedCTR < targetCTR * 0.5:
  - Status = "Optimize First"
  - Suggested Increase = 0
  - Add optimization action: "Creative Refresh: CTR is below target. Test new ad creative before scaling spend."
  
- Else if totalLeads > 0 AND (totalLeads / totalClicks) < defaultLeadConversionRate * 0.5:
  - Status = "Optimize First"
  - Suggested Increase = 0
  - Add optimization action: "Landing Page Optimization: Lead conversion rate is low. Improve landing page or lead form."
  
- Else:
  - Status = "Hold"
  - Suggested Increase = 0

**Reasoning Points:**
Generate array of human-readable reasoning strings based on scoring factors:
- "CPC of $X.XX is below target of $X.XX (efficient)"
- "CTR of X.X% exceeds target of X.X%"
- "Cost per Lead of $XX is within target range"
- "Limited data volume: only X clicks recorded"
- etc.

### 7. Budget Allocation Model

Implement `allocateBudget(campaigns, suggestedAdditionalBudget, settings)` function:

**Allocation Logic:**
1. Filter campaigns with meaningful delivery (impressions > 100, spend > 10)
2. Rank campaigns by performance score (combination of CPC efficiency, CTR, conversion rates)
3. Allocate budget proportionally to performance score, with higher weights to top performers
4. If campaign has manualIncreaseOverride, use that instead of system allocation
5. Do not allocate to campaigns with zero delivery unless manually overridden

**Performance Score per Campaign:**
- Same scoring logic as overall, but per-campaign
- Campaigns with higher scores get more budget

**Output:**
- Array of campaign predictions with additionalBudget field
- Sum of all allocations = suggestedAdditionalBudget (unless manual overrides change it)

### 8. Predictive Results Model

Implement `predictResults(campaignAllocations, campaigns, settings)` function:

For each campaign with additionalBudget > 0:

**Predicted Additional Clicks:**
- If campaign has clicks and spend:
  - currentCPC = campaign.spend / campaign.clicks
  - predictedClicks = additionalBudget / currentCPC
- Else:
  - Use settings.targetCPC
  - predictedClicks = additionalBudget / settings.targetCPC

**Predicted Additional Link Clicks:**
- If campaign has linkClicks and spend:
  - currentCostPerLinkClick = campaign.spend / campaign.linkClicks
  - predictedLinkClicks = additionalBudget / currentCostPerLinkClick
- Else:
  - Use settings.targetCostPerLinkClick
  - predictedLinkClicks = additionalBudget / settings.targetCostPerLinkClick

**Predicted Additional Leads:**
- If campaign has leads and clicks:
  - leadRate = campaign.leads / campaign.clicks
  - predictedLeads = predictedClicks * leadRate
- Else:
  - predictedLeads = predictedClicks * settings.defaultLeadConversionRate

**Predicted Additional Tours:**
- If campaign has tours and leads:
  - tourRate = campaign.tours / campaign.leads
  - predictedTours = predictedLeads * tourRate
- Else:
  - predictedTours = predictedLeads * settings.defaultTourConversionRate

**Predicted Additional Applications:**
- If campaign has applications and leads:
  - applicationRate = campaign.applications / campaign.leads
  - predictedApplications = predictedLeads * applicationRate
- Else:
  - predictedApplications = predictedLeads * settings.defaultApplicationConversionRate

**Predicted Additional Leases:**
- If campaign has leases and leads:
  - leaseRate = campaign.leases / campaign.leads
  - predictedLeases = predictedLeads * leaseRate
- Else:
  - predictedLeases = predictedLeads * settings.defaultLeaseConversionRate

**Aggregate Totals:**
Sum all campaign predictions for overall predicted results.

### 9. Narrative Generation

Implement `generateNarrative(analysis, settings)` function:

**Template Structure:**

```
=== PAID MEDIA BUDGET ANALYSIS ===
Property: {propertyName}
Reporting Period: {startDate} to {endDate}
Analysis Date: {currentDate}

--- EXECUTIVE SUMMARY ---

Based on the current paid media performance for {propertyName} from {startDate} to {endDate}, the campaigns generated {totalImpressions:comma} impressions, {totalClicks:comma} clicks{includeLeadsIfAvailable}, from ${totalSpend:currency} in total spend. The blended cost per click was ${blendedCPC:currency}, with {bestChannel} producing the strongest traffic efficiency.

{if leads > 0}
The campaigns generated {totalLeads} leads at a blended cost per lead of ${blendedCostPerLead:currency}. {tourInfo} {applicationInfo} {leaseInfo}
{endif}

--- RECOMMENDATION ---

The data supports a "{recommendationStatus}" recommendation.

{if status === "Increase"}
The strongest opportunity is to increase budget behind {bestPerformingCampaign}, which produced {proofPoint}. We do not recommend increasing budget evenly across all ads. Instead, spend should be prioritized toward the highest-performing campaigns while lower-performing ads are paused, refreshed, or tested with new creative.

Based on the suggested additional budget of ${suggestedAdditionalBudget:currency}, projected results are approximately {predictedClicks} additional clicks, {predictedLeads} additional leads, {predictedTours} tours, {predictedApplications} applications, and {predictedLeases} leases, assuming performance remains consistent with current benchmarks.
{endif}

{if status === "Controlled Increase"}
Performance is solid but not exceptional. A controlled increase of ${suggestedAdditionalBudget:currency} is recommended, with close monitoring of efficiency metrics. Focus additional spend on the top-performing campaigns: {topCampaigns}.

Projected results from the controlled increase: {predictedClicks} additional clicks, {predictedLeads} additional leads.
{endif}

{if status === "Hold"}
Current performance does not support a budget increase at this time. {reasoningPoints}. We recommend monitoring performance for another reporting period before scaling spend.
{endif}

{if status === "Optimize First"}
We do not recommend increasing spend until the following optimizations are completed:

{optimizationActions as bullet list}

Once these optimizations are implemented and performance improves, revisit the budget increase decision.
{endif}

{if status === "Insufficient Data"}
The current data volume is too limited to make a reliable recommendation. {dataLimitations}. We recommend continuing current spend levels until a larger sample size is available, or implementing a small test budget increase of ${suggestedTestBudget:currency} to gather more data.
{endif}

--- CHANNEL PERFORMANCE ---

{for each channel with spend > 0}
{channelName}:
- Spend: ${channelSpend:currency}
- Clicks: {channelClicks}
- CPC: ${channelCPC:currency}
- {channelLeads} leads{if available} at ${channelCostPerLead:currency} per lead{endif}
{endfor}

--- WINNING CAMPAIGNS ---

{bestPerformingCampaign}: {proofPoints}

--- AREAS FOR IMPROVEMENT ---

{weakestPerformingCampaign}: {issuePoints}

--- NEXT STEPS ---

1. {if status === Increase}Allocate the additional ${suggestedAdditionalBudget:currency} to the recommended campaigns.{endif}
2. {if status === Optimize First}Complete the optimization actions listed above.{endif}
3. Monitor performance closely for the next {reportingDays} days.
4. {trackingRecommendations if applicable}
5. Schedule a follow-up analysis in {followUpDays} days.
```

**Variable Replacement:**
- Replace all {variable} placeholders with actual data
- Format numbers with commas for thousands
- Format currency with $ and 2 decimals
- Format percentages with % and 2 decimals
- Use conditional logic for optional sections

**Store:**
- Save generated narrative to `narrativeGenerated` field
- Initially set `narrativeCustom` to null

### 10. Narrative Editing & Export

**Editing:**
- Display generated narrative in large `<textarea>` (20+ rows, full width)
- "Restore Original" button: revert `narrativeCustom` back to `narrativeGenerated`
- On any edit, set `narrativeCustom` = current textarea value
- Save both fields to database

**Export Functions:**

**10.1 Copy to Clipboard:**
```javascript
navigator.clipboard.writeText(narrative)
```

**10.2 Download as Text (.txt):**
```javascript
const blob = new Blob([narrative], { type: 'text/plain' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = `${propertyName}_PaidMediaAnalysis_${dateStr}.txt`;
a.click();
```

**10.3 Download as Markdown (.md):**
- Convert narrative template to markdown formatting
- Use `#` for headers, `**bold**`, `-` for bullets, etc.
- Same download pattern as text

**10.4 Download as Word (.docx):**
- Use docx.js library
- Create document with styled paragraphs
- Headers: 18pt bold
- Body: 11pt regular
- Preserve structure and formatting
- Trigger download via Blob

**10.5 Download as PDF:**
- Use jsPDF library
- Add text content with line breaks
- Style headers as bold, larger font
- Handle multi-page content
- Trigger download

**Export File Naming:**
`{PropertyName}_PaidMediaAnalysis_{YYYY-MM-DD}.{ext}`

### 11. Charts Implementation

Use Chart.js (already available in project patterns).

**Chart 1 & 2 (Dashboard Mini-Charts):**

**Chart 1: Spend by Channel (Doughnut)**
- Data: Total spend per channel
- Colors: Use project color palette
- Size: 200px x 200px
- Legend: bottom

**Chart 2: CPC by Channel (Bar)**
- Data: Blended CPC per channel
- Horizontal bar chart
- Size: 200px x 200px
- Y-axis: Channels
- X-axis: CPC ($)

**Detailed Charts Section (Step 3):**

**Chart 3: Clicks by Channel (Bar)**
- Vertical bar chart
- X-axis: Channels
- Y-axis: Total Clicks

**Chart 4: Cost per Lead by Channel (Bar)**
- Vertical bar chart
- X-axis: Channels with leads > 0
- Y-axis: Cost per Lead ($)
- Show "N/A" for channels with no leads

**Chart 5: Current vs Projected Spend (Grouped Bar)**
- X-axis: Channels or Campaigns (top 5)
- Y-axis: Spend ($)
- Two bars per group: Current Spend, Projected Total Spend
- Colors: Blue for current, Green for projected

**Chart 6: Projected Additional Results (Horizontal Bar)**
- Y-axis: Metrics (Clicks, Leads, Tours, Applications, Leases)
- X-axis: Count
- Single bar per metric showing predicted additional volume

**Chart 7: Campaign Performance Score (Horizontal Bar)**
- Y-axis: Campaign names (top 10 by spend)
- X-axis: Performance Score (0-100)
- Color gradient: Red → Yellow → Green

**Responsive:**
- Charts resize on window resize
- Mobile: stack charts vertically, reduce height

### 12. Settings Panel UI

**Settings Card (Step 2):**

Two collapsible sections:

**Section 1: Assumptions**
Form with labeled inputs:
- Target CPC ($): number input
- Target Cost per Link Click ($): number input
- Target CTR (%): number input
- Target Cost per Lead ($): number input
- Target Cost per Lease ($): number input
- Default Lead Conversion Rate (%): number input
- Default Tour Conversion Rate (%): number input
- Default Application Conversion Rate (%): number input
- Default Lease Conversion Rate (%): number input
- Recommended Increase Percentage (%): number input
- Max Suggested Increase Percentage (%): number input
- Minimum Spend Threshold ($): number input
- Minimum Click Threshold: number input

**Section 2: Scoring Weights**
Form with labeled inputs (must sum to 100):
- CPC Weight (%): number input
- CTR Weight (%): number input
- Cost per Lead Weight (%): number input
- Cost per Lease Weight (%): number input
- Total: {sum} / 100 (validation indicator)

**Buttons:**
- "Save Settings" - POST to /api/paid-media-settings
- "Reset to Defaults" - Restore default values
- "Recalculate Analysis" - Re-run scoring and recommendations with new settings

**Validation:**
- Weights must sum to 100 (show error if not)
- All numeric fields must be >= 0
- Percentages must be 0-100

### 13. Wizard State Management

**State Object:**
```javascript
const wizardState = {
  currentStep: 1,
  analysisId: null,        // null for new, ObjectId string for editing
  isEditing: false,
  isDirty: false,          // Has unsaved changes
  propertyId: null,
  propertyName: null,
  reportingStartDate: null,
  reportingEndDate: null,
  campaigns: [],           // Array of campaign objects
  settings: null,          // Loaded from /api/paid-media-settings
  calculatedSummary: null,
  recommendation: null,
  predictions: null,
  narrativeGenerated: null,
  narrativeCustom: null
};
```

**Step Validation:**
- Step 1: Requires propertyId, startDate, endDate, at least 1 campaign row with spend > 0
- Step 2: Requires settings loaded, can edit settings
- Step 3: Requires recommendation calculated
- Step 4: Requires narrative generated

**Navigation:**
- "Next" button calls `validateStep(currentStep)` then increments
- "Previous" button decrements step
- Step indicator allows jumping if step is valid
- "Save & Exit" button saves to database and returns to landing page

**Auto-Save Draft:**
- Store wizardState in localStorage every 30 seconds
- On page load, check localStorage for draft
- Prompt: "You have an unsaved draft. Do you want to continue editing or start fresh?"

### 14. Saved Analyses Landing Page

**Layout:**
- Card with header "Saved Analyses"
- Button: "New Analysis" (primary button, top right)
- Grid of analysis cards (3 columns on desktop, 1 on mobile)

**Analysis Card:**
```
┌─────────────────────────────────┐
│ {PropertyName}                  │
│ {StartDate} - {EndDate}         │
│ ─────────────────────────────── │
│ Status: {RecommendationStatus}  │
│ Spend: ${TotalSpend}            │
│ Leads: {TotalLeads}             │
│ Suggested Increase: ${Amount}   │
│ ─────────────────────────────── │
│ Last Updated: {RelativeTime}    │
│ ─────────────────────────────── │
│ [Open] [Duplicate] [Delete]     │
└─────────────────────────────────┘
```

**Actions:**
- "Open": Load analysis into wizard, set isEditing = true
- "Duplicate": Create new analysis with same data (new ID, reset dates to current)
- "Delete": Confirm modal, then DELETE /api/paid-media-analyzer

**Empty State:**
```
No analyses yet.
Create your first paid media analysis to get started.

[New Analysis button]
```

**Sorting:**
- Default: Most recently updated first
- Dropdown filter: All / Increase / Hold / Optimize First

### 15. Styling Guidelines

**CSS Variables (match project):**
```css
--brand-primary: #446472
--brand-accent: #ffb732
--brand-accent-2: #52d5ff
--page-bg: #f8fafc
--border: #e2e8f0
--good: #22c55e
--warn: #ffb732
--bad: #ef4444
```

**Card Style:**
```css
.card {
  background: #ffffff;
  border: 1px solid var(--border);
  border-radius: 14px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  margin-bottom: 20px;
}
```

**Button Styles:**
```css
button.primary {
  background: var(--brand-primary);
  color: #fff;
}
button.good {
  background: #52d5ff;
  color: #0b1b24;
}
button.danger {
  background: #ef4444;
  color: #fff;
}
```

**Wizard Progress Indicator:**
- Horizontal stepper with 4 steps
- Completed steps: green circle with checkmark
- Current step: blue circle with number
- Future steps: gray circle with number
- Lines connecting steps

**Data Grid Styling:**
- Editable cells: light blue background (#e3f2fd)
- Calculated cells: light yellow background (#fff3cd)
- Header: sticky, dark background (#446472), white text
- Alternating row colors for readability
- Hover highlight on rows

### 16. Registration in Custom Tools Library

**Edit `custom_tools.html`:**

Add to TOOL_LIBRARY array (around line 335):
```javascript
{
  name: 'Paid Media Budget Increase Analyzer',
  url: 'paid_media_analyzer.html',
  description: 'Analyze paid media campaign performance across Meta, Google, and other channels. Calculate ROI, recommend budget increases, predict results, and generate client-ready performance narratives with data-driven recommendations.'
}
```

### 17. Validation & Error Handling

**Input Validation:**
- Dates: Ensure end date >= start date
- Numbers: Non-negative, handle decimals
- Required fields: Property, dates, at least one campaign

**Division by Zero:**
- All calculations check denominators
- Return null or "N/A" for undefined results

**API Error Handling:**
- Display user-friendly error messages in alerts or toast notifications
- Retry logic for transient network errors
- Graceful degradation if backend unavailable

**Data Quality Warnings:**
- Show warning icon if spend > 0 but clicks = 0
- Show warning if impressions < 100
- Show warning if CPC > $50 (likely data entry error)

### 18. Testing Checklist

**Data Grid:**
- [ ] Add row creates new empty row
- [ ] Delete row removes row
- [ ] Calculations update live on input change
- [ ] Sample data loads correctly
- [ ] Column sorting works
- [ ] Handles empty/null values without errors
- [ ] Mobile responsive (horizontal scroll)

**Calculations:**
- [ ] All calculated fields compute correctly
- [ ] No divide-by-zero errors
- [ ] Dashboard summary matches campaign totals
- [ ] Blended metrics are accurate

**Scoring:**
- [ ] Recommendation status matches scoring thresholds
- [ ] Scoring weights apply correctly
- [ ] Edge cases: no leads, no clicks, insufficient data

**Budget Allocation:**
- [ ] Allocates only to campaigns with delivery
- [ ] Manual overrides respected
- [ ] Total allocation equals suggested budget

**Predictions:**
- [ ] Uses actual rates when available
- [ ] Falls back to assumptions when needed
- [ ] All predictions are non-negative

**Narrative:**
- [ ] Generates complete narrative with all variables replaced
- [ ] Editable textarea allows modifications
- [ ] Restore original button works
- [ ] Export functions all work (clipboard, txt, md, docx, pdf)

**Settings:**
- [ ] Settings load from database or create defaults
- [ ] Settings save successfully
- [ ] Scoring weights validation (must sum to 100)
- [ ] Recalculate applies new settings

**Wizard:**
- [ ] Step validation prevents skipping incomplete steps
- [ ] Navigation works (next, prev, jump to step)
- [ ] Save & Exit stores data and returns to landing
- [ ] Auto-save draft to localStorage
- [ ] Draft recovery on reload

**Saved Analyses:**
- [ ] Landing page displays saved analyses
- [ ] Open loads analysis into wizard
- [ ] Duplicate creates new analysis
- [ ] Delete removes analysis
- [ ] Empty state displays correctly

**Auth & Backend:**
- [ ] All authenticated users can access
- [ ] User can only see their own analyses
- [ ] CRUD operations work
- [ ] Settings endpoint works

**Charts:**
- [ ] All 7 charts render correctly
- [ ] Charts update when data changes
- [ ] Responsive on different screen sizes

**Export:**
- [ ] Text file downloads
- [ ] Markdown file downloads
- [ ] DOCX file downloads with formatting
- [ ] PDF file downloads with formatting
- [ ] Copy to clipboard works

## Open Questions / Future Enhancements

None - all design decisions have been clarified.

## Rollout Plan

1. Install dependencies (docx, jsPDF)
2. Create backend functions (settings, analyzer)
3. Test backend endpoints with Postman/curl
4. Create frontend HTML structure and wizard navigation
5. Build custom data grid component
6. Implement calculation engines (summary, scoring, allocation, predictions)
7. Implement charts
8. Implement narrative generation
9. Implement export functions
10. Implement settings panel
11. Implement save/load functionality
12. Add to custom tools library
13. Test all workflows end-to-end
14. Document usage in tool description

## Estimated Complexity

- **Backend**: Medium (2 functions, straightforward CRUD)
- **Frontend**: High (complex wizard, custom grid, multiple calculation engines, 7 charts, 5 export formats)
- **Overall**: High complexity project, but well-defined scope

## Dependencies Summary

**New npm packages:**
- docx@^8.5.0 (for Word document generation)
- jspdf@^2.5.1 (for PDF generation)

**Existing libraries:**
- Chart.js (via CDN, already used in market_survey_analyze.html)
- SheetJS (via CDN, already used in lead_to_goal_calculator.html)

**Backend:**
- MongoDB (existing)
- Netlify Functions (existing)

**Auth:**
- Cookie-based auth (existing)

