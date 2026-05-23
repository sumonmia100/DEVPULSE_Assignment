# DevPulse 🚀

Internal Tech Issue & Feature Tracker — a collaborative platform for software teams to report bugs, suggest features, and coordinate resolutions.

**Live URL:** https://devpulse-assignment-mu.vercel.app/ 
**GitHub:** https://github.com/sumonmia100/DEVPULSE_Assignment

---

## Features

- JWT-based authentication with role-based access control
- Two roles: `contributor` and `maintainer`
- Full issue lifecycle: create, read, update, delete
- Filter issues by type and status; sort by newest or oldest
- Passwords hashed with bcrypt; never exposed in responses
- Raw SQL with PostgreSQL — no ORM, no JOINs

---

## Tech Stack

| Technology | Usage |
|---|---|
| Node.js 24.x | Runtime |
| TypeScript | Strict typing |
| Express.js | Web framework |
| PostgreSQL | Database |
| pg (native) | DB driver |
| bcrypt | Password hashing |
| jsonwebtoken | JWT auth |
| http-status-codes | Status code constants |

---

## Local Setup

```bash
# 1. Clone the repo
git clone https://github.com/yourusername/devpulse.git
cd devpulse

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Fill in your DATABASE_URL and JWT_SECRET in .env

# 4. Run schema.sql in your NeonDB / Supabase SQL editor

# 5. Start dev server
npm run dev
```

---

## API Endpoints

### Auth

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/auth/signup` | Public | Register new user |
| POST | `/api/auth/login` | Public | Login and get JWT |

### Issues

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/issues` | Public | Get all issues (filter/sort) |
| GET | `/api/issues/:id` | Public | Get single issue |
| POST | `/api/issues` | Authenticated | Create issue |
| PATCH | `/api/issues/:id` | Authenticated | Update issue |
| DELETE | `/api/issues/:id` | Maintainer only | Delete issue |

**Authorization header format:** `Authorization: <token>`

**GET /api/issues query params:**
- `sort` — `newest` (default) or `oldest`
- `type` — `bug` or `feature_request`
- `status` — `open`, `in_progress`, or `resolved`

---

## Database Schema

### users
| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL | Primary key |
| name | VARCHAR(255) | Required |
| email | VARCHAR(255) | Unique, required |
| password | VARCHAR(255) | Hashed, never returned |
| role | VARCHAR(20) | `contributor` (default) or `maintainer` |
| created_at | TIMESTAMP | Auto-set |
| updated_at | TIMESTAMP | Auto-updated |

### issues
| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL | Primary key |
| title | VARCHAR(150) | Required, max 150 chars |
| description | TEXT | Required, min 20 chars |
| type | VARCHAR(20) | `bug` or `feature_request` |
| status | VARCHAR(20) | `open` (default), `in_progress`, `resolved` |
| reporter_id | INTEGER | References users.id |
| created_at | TIMESTAMP | Auto-set |
| updated_at | TIMESTAMP | Auto-updated |

---

## Project Structure

```
src/
├── config/         → Database connection pool
├── middleware/     → JWT auth & role checks
├── modules/
│   ├── auth/       → Signup & login
│   └── issues/     → Issue CRUD
├── types/          → TypeScript interfaces
├── utils/          → Response helpers
└── index.ts        → App entry point
```
