# Vertical Navigation Update Plan

## Goal
Update all HTML pages to have the same clean vertical navigation bar (no emojis, no branding section, no search).

## Navigation Structure

### MAIN
- Marketing Calendar (mmp_calendar_app.html)
- Marketing Plans (marketing_plans.html)
- Velocity Tracker (velocity_tracker.html)
- MPLR (mplr.html)

### TOOLS
- Promo Order Tracker (promo_order_tracker.html)
- Uniform Shop (uniform_shop.html)
- Creative Library (creative_library.html)
- Marketing Contacts (marketing_contacts.html)

### RESOURCES
- Renewal Campaign (renewal_campaign.html)
- Leasing SOP (leasing_sop.html)
- SOP Library (sop_library.html)

## Pages to Update

### ✅ Completed
1. mmp_calendar_app.html - DONE (removed branding, search, emojis)

### 🔄 To Do
2. marketing_plans.html
3. velocity_tracker.html
4. mplr.html
5. promo_order_tracker.html
6. uniform_shop.html
7. creative_library.html
8. marketing_contacts.html
9. renewal_campaign.html
10. leasing_sop.html
11. sop_library.html (special case - has its own internal sidebar)

## CSS Classes Needed

```css
/* Vertical Sidebar Navigation */
.sidebar-nav {
  position: fixed;
  left: 0;
  top: 60px;
  width: 240px;
  height: calc(100vh - 60px);
  background: #1e293b;
  overflow-y: auto;
  z-index: 30;
  transition: transform .3s ease;
}

.nav-section {
  padding: 20px 0 8px 0;
}

.nav-section-title {
  padding: 0 16px 8px 16px;
  font-size: 11px;
  font-weight: 700;
  color: rgba(255,255,255,0.5);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  color: rgba(255,255,255,0.7);
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  transition: all .15s;
  border-left: 3px solid transparent;
}

.nav-item:hover {
  background: rgba(255,255,255,0.05);
  color: #fff;
}

.nav-item.active {
  background: rgba(82,213,255,0.15);
  color: #fff;
  border-left-color: var(--brand-accent-2);
  font-weight: 600;
}

.nav-toggle {
  display: none;
  position: fixed;
  top: 70px;
  left: 16px;
  width: 40px;
  height: 40px;
  background: var(--brand-primary);
  border: none;
  border-radius: 8px;
  color: #fff;
  font-size: 20px;
  cursor: pointer;
  z-index: 35;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
}

.main-content {
  margin-left: 240px;
  min-height: calc(100vh - 60px);
  transition: margin-left .3s ease;
}

@media(max-width: 1100px) {
  .sidebar-nav { transform: translateX(-100%); }
  .sidebar-nav.open { transform: translateX(0); }
  .main-content { margin-left: 0; }
  .nav-toggle { display: flex; align-items: center; justify-content: center; }
}
```

## HTML Structure

```html
<!-- Mobile Toggle -->
<button class="nav-toggle" id="navToggle" onclick="document.getElementById('sidebarNav').classList.toggle('open')">☰</button>

<!-- Vertical Sidebar Navigation -->
<aside class="sidebar-nav" id="sidebarNav">
  <nav>
    <div class="nav-section">
      <div class="nav-section-title">MAIN</div>
      <a href="mmp_calendar_app.html" class="nav-item">
        <span>Marketing Calendar</span>
      </a>
      <a href="marketing_plans.html" class="nav-item">
        <span>Marketing Plans</span>
      </a>
      <a href="velocity_tracker.html" class="nav-item">
        <span>Velocity Tracker</span>
      </a>
      <a href="mplr.html" class="nav-item">
        <span>MPLR</span>
      </a>
    </div>
    
    <div class="nav-section">
      <div class="nav-section-title">TOOLS</div>
      <a href="promo_order_tracker.html" class="nav-item">
        <span>Promo Order Tracker</span>
      </a>
      <a href="uniform_shop.html" class="nav-item">
        <span>Uniform Shop</span>
      </a>
      <a href="creative_library.html" class="nav-item">
        <span>Creative Library</span>
      </a>
      <a href="marketing_contacts.html" class="nav-item">
        <span>Marketing Contacts</span>
      </a>
    </div>
    
    <div class="nav-section">
      <div class="nav-section-title">RESOURCES</div>
      <a href="renewal_campaign.html" class="nav-item">
        <span>Renewal Campaign</span>
      </a>
      <a href="leasing_sop.html" class="nav-item">
        <span>Leasing SOP</span>
      </a>
      <a href="sop_library.html" class="nav-item">
        <span>SOP Library</span>
      </a>
    </div>
  </nav>
</aside>

<div class="main-content">
  <!-- Page content goes here -->
</div>
```

## Special Cases

### SOP Library
- Has its own internal sidebar for SOP categories
- Need to add main vertical nav but keep internal sidebar
- May need adjusted layout to accommodate both sidebars

## Notes
- Remove all emojis from navigation
- Remove branding section (M icon + Marketing Hub text)
- Remove search box from main navigation
- Keep consistent dark theme (#1e293b)
- Active state uses cyan highlight (#52d5ff)
