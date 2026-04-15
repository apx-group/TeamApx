# AGENTS.md â€” TeamApx

---

Reference document for AI coding agents (Claude Code, Codex, etc.). Read this before making any changes.


## Project Overview

---

**TeamApx** is an e-sports team website for a competitive gaming organization. It provides:

- Public team roster and stats (Rainbow Six Siege, Assetto Corsa Competizione)
- Online application form for prospective team members
- User accounts with profiles, avatars, banners
- OAuth account linking (Discord, Twitch, ChallengerMode, YouTube)
- Email-based 2FA with trusted device support
- Badge system
- Item shop and inventory system
- Progression system with leaderboard
- Team log / news entries
- Organization chart
- Admin panel for managing users, applications, team roster, badges, items, and logs
- Multilingual UI (German + English via `/i18n/`)

## Commands

---

### Frontend

```bash
cd frontend
npm install          # Install dependencies
npm run dev          # Start dev server on http://localhost:5173
npm run build        # Production build â†’ frontend/dist/
npm run lint         # ESLint check
npm run preview      # Preview production build locally
```

### Backend

```bash
cd backend/cmd
go run .             # Start server on :8080
go build -o server . # Compile binary
```

### Docker (Production)

```bash
cd deployment/docker
docker compose up -d         # Start full stack (backend + nginx)
docker compose down          # Stop
docker compose logs backend  # View backend logs
```

---

## Technology Stack

### Frontend

| Tool | Version | Purpose |
|------|---------|---------|
| React | 19.2 | UI framework |
| TypeScript | 5.9 | Type safety |
| React Router | 7.1 | Client-side routing |
| Vite | 7.3 | Build tool, dev server |
| Axios | 1.7 | HTTP client |

- **Path alias:** `@/` maps to `frontend/src/`
- **Dev proxy:** `/api`, `/auth`, `/public` â†’ `http://localhost:8080`
- **Build output:** `frontend/dist/`
- **Styling:** Plain CSS â€” global vars in `src/styles/variables.css`, per-page files in `src/styles/`

### Backend

| Tool | Version | Purpose |
|------|---------|---------|
| Go | 1.21 | Runtime |
| `modernc.org/sqlite` | latest | Database driver (CGo-free) |
| `golang.org/x/crypto` | latest | bcrypt password hashing |

- **HTTP:** Standard `net/http` â€” no external router framework
- **Databases:** Two SQLite files (`users.db`, `data.db`)
- **Images:** Uploaded files converted to WebP where possible
- **Server port:** 8080

---

## Architecture

```
Browser
  â”‚  HTTP/HTTPS (cookie-based session)
  â–¼
Nginx (port 80/443)
  â”‚  reverse proxy
  â–¼
Go Backend (:8080)
  â”œâ”€â”€ Serves React SPA (frontend/dist/) for all non-API routes
  â”œâ”€â”€ REST API under /api/
  â”œâ”€â”€ OAuth callbacks under /auth/
  â””â”€â”€ Static uploads under /public/uploads/
        â”‚
        â”œâ”€â”€ users.db  (auth, sessions, applications, linked accounts, badges)
        â””â”€â”€ data.db   (team roster, staff, statistics)
```

**Session flow:** Backend sets an HttpOnly `session` cookie (7-day TTL). The Axios client sends it automatically (`withCredentials: true`). `AuthContext` holds the current user in React state and exposes `refetch()` to reload it after mutations.

**Admin access:** Routes under `/admin/*` check `is_admin` on the user row. Sensitive operations (e.g. deleting users) additionally require a `MASTERPASSWORD` env var via `/api/admin/verify-master`.

**File uploads:** Max 10 MB. Images are converted to WebP and stored in `public/uploads/profile/` (avatars/banners) or `public/uploads/badge/`.

---

## Route Structure

### Frontend Routes (`frontend/src/App.tsx`)

**Public**
```
/                       Home
/rainbow-six            Rainbow Six Siege page
/assetto-corsa          Assetto Corsa Competizione page
/game                   Game page
/shop                   Item shop
/leaderboard            Progression leaderboard
/organization           Organization chart
/log                    Team log / news entries
/apply                  Team application form
/login                  Login
/register               Registration
/user?u=<username>      Public user profile
/betzh/privacy-policy   Betzh Bot privacy policy
/betzh/terms-of-service Betzh Bot terms of service
/de/impressum           Legal notice (DE)
/en/impressum           Legal notice (EN)
/de/datenschutz         Privacy policy (DE)
/en/datenschutz         Privacy policy (EN)
/de/nutzungsbedingungen Terms of use (DE)
/en/terms               Terms of use (EN)
```

**Protected** (require login via `<ProtectedRoute>`)
```
/profile                Edit own profile (avatar, banner, nickname)
/security               Change username/email, 2FA, trusted devices, account deletion
/settings               General settings
/my-application         View/edit own team application
/inventory              Item inventory
/myitems                My items
```

**Admin** (require `is_admin`)
```
/admin/applications     Review team applications
/admin/team             Manage team roster and stats
/admin/users            Manage user accounts (master password gated)
/admin/badges           Manage badge definitions
/admin/items            Manage shop items
/admin/log              Manage team log entries
```

### Backend API Routes (`backend/cmd/main.go`)

**Public**
```
POST /api/auth/register
POST /api/auth/verify-email
POST /api/auth/login
POST /api/auth/login-2fa
GET  /api/team
GET  /api/staff
GET  /api/user?u=<username>
GET  /api/users/search
GET  /api/log
GET  /api/progression/profile
GET  /api/progression/leaderboard
```

**Authenticated** (session cookie required)
```
GET  /api/auth/me
POST /api/auth/logout
PUT  /api/auth/profile
POST /api/auth/profile-settings
POST /api/auth/change-email
POST /api/auth/verify-email-change
POST /api/auth/deactivate
DELETE /api/auth/delete
POST /api/apply
GET|PUT  /api/auth/my-application
GET|DELETE /api/auth/links
GET|PUT  /api/auth/trust-devices
GET|DELETE /api/auth/devices
GET  /api/items/my
GET  /api/progression/me
```

**OAuth**
```
GET /auth/discord           â†’ /auth/discord/callback
GET /auth/challengermode    â†’ /auth/challengermode/callback
GET /auth/twitch            â†’ /auth/twitch/callback
GET /auth/youtube           â†’ /auth/youtube/callback
```

**Admin** (`is_admin` required)
```
POST /api/admin/verify-master
GET|DELETE             /api/admin/users/<username>
POST                   /api/admin/users/<username>/activate
POST                   /api/admin/users/<username>/deactivate
POST                   /api/admin/users/<username>/toggle-2fa
POST                   /api/admin/user/nickname
GET                    /api/admin/applications
GET|POST|PUT|DELETE    /api/admin/team
GET|POST|PUT|DELETE    /api/admin/staff
GET|POST|PUT|DELETE    /api/admin/badges
POST                   /api/admin/badges/image
GET|POST|DELETE        /api/admin/user-badges
GET|POST|PUT|DELETE    /api/admin/items
POST                   /api/admin/items/image
GET|POST|PUT|DELETE    /api/admin/log
```

---

## Code Conventions

### Frontend

- **Components:** PascalCase files and function names (`Profile.tsx`, `AccountLayout.tsx`)
- **Hooks/Contexts:** camelCase files (`useAuth`, `AuthContext.tsx`)
- **API calls:** Centralised in `src/api/` â€” never call `fetch`/`axios` directly in components
- **Styling:** Each page has a matching CSS file in `src/styles/` (e.g. `profile.css` for `Profile.tsx`). No CSS modules, no Tailwind â€” plain class names.
- **CSS classes:** BEM-like naming for components (`pubprofile__avatar-wrap`), flat names for simple elements (`sec-btn-save`)
- **i18n:** Use `const { t } = useI18n()` and translation keys from `/i18n/de.json` and `/i18n/en.json` for user-visible strings
- **Form validation:** Validate in the submit handler, store errors in `fieldErrors` state, apply `.error` class to `form-field` divs
- **Custom selects:** Use the existing `custom-select` / `custom-select-*` CSS classes when icons are needed in dropdowns (native `<select>` doesn't support icons)

### Backend

- **File layout:** One concern per file â€” `auth.go` for auth, `badges.go` for badges, etc.
- **DB helpers:** All SQL lives in `db.go`; handlers in other files call helper functions
- **Error responses:** JSON `{"error": "message"}` with appropriate HTTP status
- **Session auth:** Use the existing `getSessionUser(r)` helper to get the current user in handlers
- **Migrations:** Add new tables/columns in `db.go` inside the `initDB()` migration block â€” migrations run on every startup and are idempotent

---

## Claude Code Skills

The following Claude Code skills are available to streamline development workflows:

- **`/explain-code`** – Explains code with visual diagrams and analogies. Use when understanding how code works, teaching about a codebase, or exploring complex logic.

---

## Key Files

```
frontend/src/
  App.tsx                   Route definitions
  contexts/AuthContext.tsx   Global auth state (user, refetch)
  contexts/I18nContext.tsx   Translation helper
  api/client.ts             Axios instance
  styles/variables.css      CSS custom properties (colors, spacing, typography)

backend/cmd/
  main.go                   HTTP server setup, all route registrations
  db.go                     Database init, migrations, all DB helper functions
  auth.go                   Registration, login, 2FA, email, profile, account management
  admin.go                  Admin user management
  badges.go                 Badge CRUD and assignment
  items.go                  Shop item CRUD and inventory
  log.go                    Team log/news CRUD and handlers
  progression.go            Progression system and leaderboard
  youtube.go                YouTube OAuth integration
  middleware.go             HTTP middleware utilities

deployment/docker/
  docker-compose.yml        Production stack definition
  Dockerfile                Multi-stage Go build

i18n/
  de.json                   German translations
  en.json                   English translations
```

---

## Deployment

Production runs via Docker Compose:

1. **Build frontend:** `cd frontend && npm run build` â†’ outputs to `frontend/dist/`
2. **Docker Compose:** builds Go binary, copies `frontend/dist/` into the image, starts Nginx
3. **Nginx** terminates TLS and proxies to the Go backend on port 8080
4. **Volumes:** `users.db` and `data.db` are persisted on the host; same for `public/uploads/`

Environment variables are set in `docker-compose.yml` or an adjacent `.env` file. Required vars:

```
ADMIN_PASSWORD        # Initial admin account password
MASTERPASSWORD        # Required for destructive admin operations
SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS / SMTP_FROM
DISCORD_CLIENT_ID / DISCORD_CLIENT_SECRET / DISCORD_REDIRECT_URI
CM_CLIENT_ID / CM_CLIENT_SECRET / CM_REDIRECT_URI
TWITCH_CLIENT_ID / TWITCH_CLIENT_SECRET / TWITCH_REDIRECT_URI
APP_BASE_URL          # e.g. https://teamapx.gg
USER_DB_PATH          # e.g. /data/users.db
DATA_DB_PATH          # e.g. /data/data.db
UPLOAD_DIR            # e.g. /app/uploads
```

---

## CI/CD

No automated pipeline is configured. Deployment is manual:

1. Pull latest code on the server
2. Rebuild frontend (`npm run build`)
3. Rebuild and restart Docker Compose (`docker compose up -d --build`)

---

## Local Development Setup

### Prerequisites

- Node.js â‰¥ 18
- Go â‰¥ 1.21
- (Optional) Docker + Docker Compose for full-stack testing

### Steps

```bash
# 1. Clone the repo
git clone https://github.com/apx-group/TeamApx.git
cd TeamApx

# 2. Start the backend
cd backend/cmd
cp ../../.env.linux ../../.env   # fill in required vars
go run .
# â†’ API available at http://localhost:8080

# 3. Start the frontend (separate terminal)
cd frontend
npm install
npm run dev
# â†’ App available at http://localhost:5173
# â†’ /api/* and /auth/* requests are proxied to :8080
```

The Vite dev server proxies `/api`, `/auth`, and `/public` to `http://localhost:8080`, so the frontend works seamlessly against the local Go backend without CORS issues.

### SQLite databases

On first run, `db.go` automatically creates `users.db` and `data.db` (paths from env vars, defaulting to the working directory). No manual migration step is needed.

### Creating an admin user

After registering a normal account, set `is_admin = 1` directly in the database:

```bash
sqlite3 users.db "UPDATE users SET is_admin=1 WHERE username='yourname';"
```

