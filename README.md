# MMP Calendar/Marketing App – Netlify + MongoDB Atlas backend

This project adds a serverless backend so you can deploy on Netlify and persist data in MongoDB Atlas.

What you get
- Netlify Functions (Node) for auth, users, properties, events, budgets
- MongoDB Atlas connection using a connection string env var
- JWT-based auth with 8h expiry (configurable)

Directory layout
- netlify/functions/_db.js – Mongo client and db helper
- netlify/functions/_auth.js – user helpers (seed admin), JWT issue/verify
- netlify/functions/auth-login.js – POST login
- netlify/functions/auth-users.js – admin-only CRUD for users
- netlify/functions/properties.js – list/create properties
- netlify/functions/events.js – CRUD events, scoped by property
- netlify/functions/budgets.js – read/write budgets per property
- netlify.toml – Netlify config + redirects /api/* => functions

Setup
1) Create MongoDB Atlas cluster
   - Get connection string: mongodb+srv://USER:PASS@cluster.xxxxxx.mongodb.net/?retryWrites=true&w=majority
   - Create a database name, e.g., mmp
   - Optionally pre-create collections: users, properties, events, budgets (they will auto-create on first write)
2) Netlify site
   - Create a new site from your repo/folder.
   - Set environment variables in Netlify (Site settings → Build & deploy → Environment):
     - MONGODB_ATLAS_URI = your Atlas connection string
     - MONGODB_DB_NAME = mmp (or your db name)
     - JWT_SECRET = a strong random secret
     - JWT_EXPIRES = 8h (optional; default is 8h)
3) Local dev (optional)
   - npm i -g netlify-cli
   - npm install
   - netlify dev

Endpoints (relative to site root)
- POST /api/auth-login
  body: { username, password }
  resp: { token, user: { username, role, properties } }

- Admin only (send Authorization: Bearer <token>)
  - GET /api/auth-users
  - POST /api/auth-users { username, password, role, properties }
  - PUT /api/auth-users { username, updates }
  - DELETE /api/auth-users { username }

- Properties
  - GET /api/properties
  - POST /api/properties { name } (admin only)

- Events (send property and enforce access)
  - GET /api/events?property=<name>
  - POST /api/events { property, title, start, end, ... }
  - PUT /api/events { id, property, ...updates }
  - DELETE /api/events { id, property }

- Budgets
  - GET /api/budgets?property=<name>
  - PUT /api/budgets { property, months: { 'YYYY-MM': number } }

Front-end integration plan
- Replace localStorage auth with token-based auth against /api/auth-login; store token in memory or localStorage.
- Replace events/budgets localStorage reads/writes with fetch calls to the functions.
- Limit property dropdown based on token payload (role/properties) + GET /api/properties for master list.
- Remove client-side seeded admin. Use ensureSeedAdmin in backend on first login call.

Security notes
- Tokens expire after JWT_EXPIRES (default 8h); refresh by logging in again.
- For production, prefer HTTP-only cookies over localStorage and add CSRF protection.
