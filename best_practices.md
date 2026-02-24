# 📘 Project Best Practices

## 1. Project Purpose

**CMP Marketing Hub** is a comprehensive marketing management platform for Capstone Management Partners (CMP) that manages multi-property student housing marketing operations. The platform provides:

- **Marketing Calendar**: Event planning, budget tracking, and campaign management across multiple properties
- **Marketing Plans**: 30-day and 60-day leasing and marketing strategy templates with task tracking
- **MPLR (Marketing Performance Lease Registry)**: Lease tracking, floor plan management, and tier pricing analysis
- **Promo Order Tracker**: Uniform and promotional item ordering system with catalog management
- **Creative Library**: Digital asset management for marketing materials
- **Velocity Tracker**: Leasing velocity and occupancy analytics
- **Renewal Campaign**: Resident retention campaign management
- **Marketing Contacts**: Contact database for partnerships, departments, and general marketing contacts

The platform is deployed on **Netlify** with a **MongoDB Atlas** backend, using **JWT-based authentication** with role-based access control (admin/user) and property-level permissions.

---

## 2. Project Structure

### Root Directory Layout

```
cmpmarketinghub/
├── netlify/
│   └── functions/          # Serverless backend API endpoints
│       ├── _auth.js        # Authentication helpers (JWT, bcrypt)
│       ├── _db.js          # MongoDB connection and caching
│       ├── auth-*.js       # Auth endpoints (login, logout, users)
│       ├── *.js            # Feature-specific endpoints (events, budgets, etc.)
├── backups/                # Backup files
├── ref/                    # Reference documents (Excel, Word templates)
├── SOP/                    # Standard Operating Procedures (Markdown)
├── *.html                  # Frontend pages (one per feature)
├── *.js                    # Frontend JavaScript modules
├── netlify.toml            # Netlify configuration
├── package.json            # Node dependencies
├── .gitignore              # Git ignore rules
└── README.md               # Setup and deployment instructions
```

### Key Directories

- **`netlify/functions/`**: All backend logic lives here as serverless functions
  - `_auth.js` and `_db.js` are **shared utilities** (prefixed with `_`)
  - Each feature has its own endpoint file (e.g., `events.js`, `budgets.js`, `campaigns.js`)
  
- **Root HTML files**: Each feature is a standalone HTML page with embedded styles and scripts
  - Examples: `mmp_calendar_app.html`, `marketing_plans.html`, `mplr.html`
  - Pages share a common navigation bar and authentication flow
  
- **Root JS modules**: Reusable frontend logic
  - `custom-tools-nav.js`: Dynamically adds admin-only navigation links
  - `mplr-*.js`: Modular components for the MPLR feature (floor plans, tier pricing, import, stats, UI)

---

## 3. Test Strategy

### Current State
- **No formal test framework** is currently in place
- Testing is manual via local development (`netlify dev`) and production deployment

### Recommended Approach (for future implementation)
- **Unit Tests**: Use **Jest** for testing utility functions in `netlify/functions/`
  - Test authentication logic (`_auth.js`)
  - Test data normalization functions (e.g., `normalizePlan` in `marketing-plans.js`)
  
- **Integration Tests**: Test API endpoints with mock MongoDB connections
  - Use `mongodb-memory-server` for in-memory database testing
  
- **Frontend Tests**: Use **Playwright** or **Cypress** for end-to-end testing
  - Test login flow, property switching, event creation, budget updates
  
- **Mocking Strategy**:
  - Mock `getDb()` for database operations
  - Mock `verifyReqAuth()` for authentication in endpoint tests
  - Use `fetch` mocks for frontend API calls

---

## 4. Code Style

### Backend (Netlify Functions)

#### Language & Patterns
- **ES Modules**: Use `import`/`export` syntax (configured in `netlify.toml`)
- **Async/Await**: All database operations use `async/await` (no callbacks or raw promises)
- **Error Handling**: Use `try/catch` blocks; return structured error responses

#### Naming Conventions
- **Files**: Lowercase with hyphens (e.g., `auth-login.js`, `marketing-plans.js`)
- **Functions**: camelCase (e.g., `verifyReqAuth`, `ensureSeedAdmin`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `JWT_SECRET`, `ALLOWED_STATUS`)
- **Database Collections**: Lowercase, plural (e.g., `users`, `events`, `properties`)

#### Function Structure
```javascript
export async function handler(event) {
  const user = verifyReqAuth(event);
  if (!user) return { statusCode: 401, body: 'Unauthorized' };
  
  const db = await getDb();
  try {
    // Business logic here
    return { statusCode: 200, body: JSON.stringify(result) };
  } catch (e) {
    return { statusCode: 500, body: e.message };
  }
}
```

#### Authentication Pattern
- Always call `verifyReqAuth(event)` at the start of protected endpoints
- Check `user.role` for admin-only operations
- Validate property access with `user.properties` (array or `'*'` for admin)

#### Database Patterns
- Use **connection caching** via `cachedDb` in `_db.js`
- Always use `ObjectId` from `_db.js` for MongoDB ID operations
- Use `updateOne` with `{ upsert: true }` for create-or-update operations

### Frontend (HTML/JavaScript)

#### Language & Patterns
- **Vanilla JavaScript**: No frameworks (React, Vue, etc.)
- **Inline Scripts**: Most logic is embedded in `<script>` tags within HTML files
- **External Libraries**: FullCalendar, Chart.js loaded via CDN
- **LocalStorage**: Used for client-side caching and fallback when offline

#### Naming Conventions
- **Variables**: camelCase (e.g., `currentProperty`, `monthlyBudgets`)
- **Functions**: camelCase (e.g., `initCalendar`, `refreshCalendar`, `updateSummary`)
- **DOM Elements**: Stored in `els` object (e.g., `els.title`, `els.saveBtn`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `STORE_EVENTS_KEY`, `SESSION_TTL_MS`)

#### CSS Conventions
- **CSS Variables**: Defined in `:root` for theming (e.g., `--brand-primary`, `--text`)
- **Class Names**: Lowercase with hyphens (e.g., `.nav-tab`, `.modal-backdrop`)
- **Utility Classes**: `.mini`, `.muted`, `.hidden`, `.good`, `.warn`, `.bad`

#### Error Handling
- Use `try/catch` for `fetch` calls and localStorage operations
- Display user-friendly alerts for errors (e.g., `alert('Save failed: ' + e.message)`)
- Silently fail for non-critical operations (e.g., localStorage in private browsing)

#### Commenting
- **Minimal comments**: Code is self-documenting with clear function names
- **Section headers**: Use `// ===== SECTION NAME =====` for major sections
- **Inline comments**: Only for complex logic or non-obvious behavior

---

## 5. Common Patterns

### Authentication Flow
1. **Login**: POST to `/api/auth-login` → Sets `mmp_token` HttpOnly cookie
2. **Session Check**: GET `/api/me` → Returns user info if authenticated
3. **Auto-Logout**: 8-hour session timeout (configurable via `JWT_EXPIRES`)
4. **Logout**: POST to `/api/auth-logout` → Clears cookie and redirects to `index.html`

### Property-Based Data Scoping
- All data (events, budgets, marketing plans) is scoped by `property` field
- Users have a `properties` array (or `'*'` for admin access to all)
- Frontend filters property dropdown based on user permissions
- Backend validates property access in every endpoint

### LocalStorage Fallback Pattern
```javascript
// Try server-backed storage first
if (SESSION_ACTIVE) {
  await apiFetch('/api/endpoint', { method: 'POST', body: JSON.stringify(data) });
} else {
  // Fallback to localStorage
  localStorage.setItem('key', JSON.stringify(data));
}
```

### MongoDB Upsert Pattern
```javascript
await db.collection('collectionName').updateOne(
  { property: propertyName },
  { $set: { ...data, updatedAt: new Date() } },
  { upsert: true }
);
```

### Property Grouping Pattern
- Some properties are grouped (e.g., `Cerca/Prisma/Zuma` combines 3 properties)
- Use `mapPropertyNameToGroup()` to normalize property names
- Migration logic consolidates old individual properties into groups

### Modular Frontend Pattern (MPLR)
- MPLR feature is split into multiple JS files:
  - `mplr-floorplan-tracker.js`: Floor plan management
  - `mplr-tier-pricing.js`: Tier pricing logic
  - `mplr-import.js`: Excel import functionality
  - `mplr-stats.js`: Statistics calculations
  - `mplr-ui.js`: Collapsible UI enhancements
- Each module extends `window` object to share state

---

## 6. Do's and Don'ts

### ✅ Do's

1. **Always validate user authentication** in backend endpoints using `verifyReqAuth(event)`
2. **Use property-based scoping** for all multi-tenant data
3. **Cache MongoDB connections** using the pattern in `_db.js`
4. **Hash passwords** with bcrypt (10 rounds) before storing
5. **Use JWT tokens** with expiration for session management
6. **Provide fallback to localStorage** for offline/unauthenticated scenarios
7. **Use `try/catch`** around all database operations and API calls
8. **Return structured JSON responses** from backend endpoints
9. **Use CSS variables** for theming and consistent styling
10. **Normalize and validate data** before saving to database (see `normalizePlan`, `normalizeTask`)
11. **Use `ObjectId` from `_db.js`** for MongoDB ID operations
12. **Set `credentials: 'include'`** in all `fetch` calls to send cookies

### ❌ Don'ts

1. **Don't store passwords in plain text** (always use bcrypt)
2. **Don't expose JWT_SECRET** in client-side code
3. **Don't trust client-side data** without server-side validation
4. **Don't use `localStorage` for sensitive data** (use HttpOnly cookies)
5. **Don't create new MongoDB connections** on every request (use caching)
6. **Don't forget to check `user.role`** for admin-only operations
7. **Don't use `eval()` or `innerHTML` with user input** (XSS risk)
8. **Don't hardcode property names** in logic (use dynamic property selection)
9. **Don't use synchronous operations** in backend functions (always async)
10. **Don't forget CORS headers** for cross-origin requests (see `velocity.js`)
11. **Don't use `var`** (use `const` or `let`)
12. **Don't create circular dependencies** between modules

---

## 7. Tools & Dependencies

### Backend Dependencies (package.json)
- **`mongodb`** (^5.9.2): MongoDB driver for database operations
- **`bcryptjs`** (^2.4.3): Password hashing
- **`jsonwebtoken`** (^9.0.2): JWT token generation and verification

### Frontend Libraries (CDN)
- **FullCalendar** (v6.1.10): Calendar UI for marketing events
- **Chart.js** (v4.4.0): Data visualization for budget trends
- **XLSX** (SheetJS): Excel file parsing for data import
- **Adobe Fonts (Typekit)**: Custom typography (zooja-pro, Open Sans)

### Development Tools
- **Netlify CLI**: Local development server (`netlify dev`)
- **Git**: Version control
- **VS Code**: Recommended editor

### Environment Variables (Netlify)
Required for production deployment:
- `MONGODB_ATLAS_URI`: MongoDB connection string
- `MONGODB_DB_NAME`: Database name (default: `mmp`)
- `JWT_SECRET`: Secret key for JWT signing (use strong random string)
- `JWT_EXPIRES`: Token expiration time (default: `8h`)

### Setup Instructions
1. **Install Netlify CLI**: `npm i -g netlify-cli`
2. **Install dependencies**: `npm install`
3. **Create `.env` file** (local dev only):
   ```
   MONGODB_ATLAS_URI=mongodb+srv://...
   MONGODB_DB_NAME=mmp
   JWT_SECRET=your-secret-key
   JWT_EXPIRES=8h
   ```
4. **Run locally**: `netlify dev`
5. **Deploy**: `netlify deploy --prod`

---

## 8. Other Notes

### For LLM Code Generation

#### When Adding New Features
1. **Create a new HTML page** in the root directory (e.g., `new_feature.html`)
2. **Create a new backend endpoint** in `netlify/functions/` (e.g., `new-feature.js`)
3. **Add navigation link** in the `.nav-wrap` section of all HTML pages
4. **Follow the authentication pattern**: Check `verifyReqAuth(event)` in backend
5. **Scope data by property**: Always include `property` field in database documents
6. **Use the existing CSS variables** for consistent styling

#### When Modifying Existing Features
1. **Read the entire file first** to understand context and dependencies
2. **Preserve the authentication flow** (don't break login/logout)
3. **Test property switching** to ensure data isolation
4. **Check for localStorage fallback logic** and maintain it
5. **Update both frontend and backend** if changing data structure

#### Database Schema Patterns
- **Users**: `{ username, passwordHash, role, properties }`
- **Events**: `{ property, title, start, end, campaign, budget, spend, ... }`
- **Budgets**: `{ property, months: { 'YYYY-MM': number } }`
- **Marketing Plans**: `{ property, planType, startDate, endDate, weeks: [...] }`
- **Properties**: `{ name }` (simple list)

#### Security Considerations
- **All endpoints** (except login) require authentication
- **Admin-only operations** must check `user.role === 'admin'`
- **Property access** must be validated against `user.properties`
- **Cookies** are HttpOnly, Secure (in prod), SameSite=Strict
- **Passwords** are hashed with bcrypt (10 rounds)
- **JWT tokens** expire after 8 hours (configurable)

#### Performance Considerations
- **MongoDB connection** is cached per function instance
- **LocalStorage** is used for client-side caching to reduce API calls
- **Calendar events** are filtered client-side for better UX
- **Lazy loading**: Only load data for the selected property

#### Browser Compatibility
- **Target**: Modern browsers (Chrome, Firefox, Safari, Edge)
- **No IE11 support**: Uses ES6+ features (arrow functions, async/await, template literals)
- **Fallbacks**: LocalStorage operations wrapped in try/catch for private browsing

#### Deployment Notes
- **Netlify Functions** auto-build from `netlify/functions/` directory
- **Redirects**: `/api/*` routes to `/.netlify/functions/:splat` (see `netlify.toml`)
- **CSP Headers**: Configured in `netlify.toml` for security
- **No build step**: Static HTML files served directly

#### Common Gotchas
1. **FullCalendar end dates are exclusive**: Add 1 day when displaying
2. **Property grouping**: Some properties are combined (e.g., Cerca/Prisma/Zuma)
3. **Session timeout**: Users are auto-logged out after 8 hours
4. **MongoDB ObjectId**: Must use `new ObjectId(id)` for queries
5. **LocalStorage limits**: ~5MB per domain (handle quota exceeded errors)
6. **Cookie flags**: Different for local (http) vs production (https)

#### Extending the Platform
- **New data types**: Add a new collection in MongoDB and create CRUD endpoints
- **New user roles**: Extend `role` field validation in `_auth.js`
- **New property groups**: Update `OLD_TO_GROUP` mapping in frontend
- **New calendar event types**: Add to `TYPE_DEFS` array in calendar pages
- **New admin tools**: Check `user.role === 'admin'` and add to `custom_tools.html`

---

## Summary

This project is a **multi-tenant marketing management platform** with:
- **Serverless architecture** (Netlify Functions + MongoDB Atlas)
- **JWT-based authentication** with role-based access control
- **Property-scoped data** for multi-property management
- **Vanilla JavaScript frontend** with minimal dependencies
- **LocalStorage fallback** for offline/unauthenticated scenarios
- **Modular design** with feature-specific HTML pages and backend endpoints

When generating code for this project, prioritize **security** (authentication, validation), **data isolation** (property scoping), and **consistency** (follow existing patterns for auth, database operations, and UI styling).
