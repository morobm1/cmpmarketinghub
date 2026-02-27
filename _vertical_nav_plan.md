# Marketing Calendar - Vertical Sidebar Navigation Update

## Summary
The current `mmp_calendar_app.html` has a horizontal navigation bar. We need to convert it to a modern vertical sidebar navigation similar to the reference image provided.

## Current Structure
- **Header**: Top bar with logo, title, property selector, and logout button
- **Horizontal Nav**: Below header with tabs for all pages
- **Main Content**: Two-column grid (sidebar form + calendar/content)

## Target Structure
- **Vertical Sidebar**: Fixed left sidebar (240px wide) with:
  - Logo/branding at top
  - Search box
  - Navigation items grouped by category
  - User info at bottom
- **Main Content**: Shifted right by 240px
  - Top bar with page title and controls
  - Content area below

## Key Changes Needed

### 1. Remove Old Navigation
```html
<!-- REMOVE THIS -->
<nav class="nav-bar">
  <div class="nav-wrap">
    <a href="..." class="nav-tab">...</a>
  </div>
</nav>
```

### 2. Add Vertical Sidebar
```html
<aside class="sidebar" id="sidebar">
  <div class="sidebar-header">
    <div class="sidebar-logo">M</div>
    <div class="sidebar-title">Marketing Hub</div>
  </div>
  
  <div class="sidebar-search">
    <input type="text" placeholder="Search..." />
  </div>
  
  <nav class="sidebar-nav">
    <div class="nav-section-title">MAIN</div>
    <a href="mmp_calendar_app.html" class="nav-item active">
      <span class="nav-icon">📅</span>
      <span>Marketing Calendar</span>
    </a>
    <!-- More nav items -->
  </nav>
  
  <div class="sidebar-footer">
    <div class="user-info">
      <!-- User avatar and details -->
    </div>
  </div>
</aside>
```

### 3. Update Main Content Wrapper
```html
<div class="main-wrapper">
  <div class="top-bar">
    <h1 class="page-title">Marketing Calendar</h1>
    <div class="top-bar-controls">
      <select id="propertySelect"></select>
      <button class="btn" id="adminPageBtn">Admin</button>
    </div>
  </div>
  
  <div class="main-content">
    <!-- Existing content grid -->
  </div>
</div>
```

### 4. CSS Updates
The CSS for the vertical sidebar has already been added to the file. Key classes:
- `.sidebar` - Fixed left sidebar
- `.sidebar-nav` - Navigation container
- `.nav-item` - Individual nav links
- `.main-wrapper` - Content area with left margin
- `.top-bar` - New top bar for page title and controls

### 5. Mobile Responsiveness
- Sidebar slides out on mobile (< 1100px)
- Toggle button appears
- Main content takes full width

## Navigation Structure

### Main Section
- 📅 Marketing Calendar (active)
- 📋 Marketing Plans
- 📊 Velocity Tracker
- 🏢 MPLR

### Tools Section
- 🛍️ Promo Order Tracker
- 👕 Uniform Shop
- 🎨 Creative Library
- 👥 Marketing Contacts

### Resources Section
- 🔄 Renewal Campaign
- 📝 Leasing SOP
- 📚 SOP Library

## Implementation Options

### Option 1: Minimal Changes (Recommended)
Keep all existing JavaScript and functionality, only update:
1. Remove old `<nav class="nav-bar">` element
2. Add new `<aside class="sidebar">` before main content
3. Wrap content in `<div class="main-wrapper">`
4. Add mobile toggle button
5. Update header to be simpler (remove nav-related items)

### Option 2: Complete Rewrite
Create a brand new file with:
- Clean, modern structure
- Simplified code
- Same functionality
- Better organization

## Recommendation
I recommend **Option 1** to preserve all existing functionality and data handling while modernizing the UI. The CSS is already in place, we just need to restructure the HTML elements.

Would you like me to proceed with Option 1?
