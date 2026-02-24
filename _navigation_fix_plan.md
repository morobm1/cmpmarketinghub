## Navigation Bar Standardization - Action Plan

### ✅ Completed:
1. Updated `custom-tools-nav.js` to show Custom Tools for ALL users (not just admins)
2. Removed admin-only restriction from backend API (`netlify/functions/custom-tools.js`)
3. Removed admin-only restriction from frontend (`custom_tools.html`)

### 🔧 Required Actions:

Add `<script src="custom-tools-nav.js"></script>` to the `<head>` section of these files:

1. ✅ mmp_calendar_app.html - ALREADY HAS IT
2. ❌ marketing_plans.html - NEEDS IT
3. ❌ marketing_contacts.html - NEEDS IT
4. ❌ promo_order_tracker.html - NEEDS IT
5. ❌ renewal_campaign.html - NEEDS IT
6. ❌ velocity_tracker.html - NEEDS IT
7. ❌ uniform_shop.html - NEEDS IT
8. ❌ creative_library.html - NEEDS IT
9. ❌ mplr.html - NEEDS IT
10. ❌ custom_tools.html - NEEDS IT (for consistency)

### Standard Navigation Structure:
```html
<nav class="nav-bar">
  <div class="nav-wrap">
    <a href="mmp_calendar_app.html" class="nav-tab">Marketing Calendar</a>
    <a href="marketing_plans.html" class="nav-tab">Marketing Plans</a>
    <a href="marketing_contacts.html" class="nav-tab">Marketing Contacts</a>
    <a href="promo_order_tracker.html" class="nav-tab">Promo Order Tracker</a>
    <a href="renewal_campaign.html" class="nav-tab">Renewal Campaign</a>
    <a href="velocity_tracker.html" class="nav-tab">Velocity Tracker</a>
    <a href="uniform_shop.html" class="nav-tab">Uniform Shop</a>
    <a href="creative_library.html" class="nav-tab">Creative Library</a>
    <a href="mplr.html" class="nav-tab">MPLR</a>
    <!-- Custom Tools will be added dynamically by custom-tools-nav.js -->
  </div>
</nav>
```

### How It Works:
1. Each page loads `custom-tools-nav.js` in the `<head>`
2. The script checks if user is authenticated
3. If authenticated, it automatically adds "Custom Tools" link to the navigation
4. The link is marked as active if you're on the custom_tools.html page
5. All users (not just admins) will see the Custom Tools link

### Next Steps:
Brian needs to add `<script src="custom-tools-nav.js"></script>` before the closing `</head>` tag in each of the pages listed above.
