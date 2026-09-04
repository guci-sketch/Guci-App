# FIELDWORK

Field Work Documentation, Attendance & Anomaly Monitoring System — a real Express + PostgreSQL backend with a React/Vite frontend, built from the FIELDWORK PRD.

This is a two-part app:

```
fieldwork/
  backend/    Express + TypeScript + PostgreSQL API (auth, risk engine, evidence storage)
  frontend/   Vite + React + TypeScript app (Pelaksana mobile UI, Admin dashboard)
```

## What changed from the original prototype

The uploaded prototype ran entirely in the browser against `localStorage` — the client computed its own risk score, faked GPS coordinates with test buttons, and generated a synthetic photo when no camera was available. That's the opposite of what a system whose entire job is *trustworthy evidence* should do. This version fixes that:

- **Real backend.** Every check-in/check-out, GPS distance calculation, and risk score is computed server-side in PostgreSQL. The client only ever submits raw evidence — it can no longer talk itself into a valid check-in.
- **No fake evidence.** The camera flow uses `getUserMedia` and `navigator.geolocation` only. If either is unavailable, the app shows a clear error and stops — it never substitutes a generated image or a hand-picked coordinate.
- **Real auth.** JWT + bcrypt-hashed passwords, one session per login. The old "switch to any account with one click" header control and the plaintext-password quick-login list are gone.
- **Configurable risk engine.** Thresholds (late check-in minutes, radius points, minimum photos, etc.) live in a `risk_config` table an admin can edit from the dashboard, not hardcoded constants (PRD Section 21).
- **Protected evidence storage.** Photos are served from an authenticated endpoint checked against the report owner — never a public URL — matching PRD Section 50.
- **Filtering happens in SQL**, not by downloading everything to the browser and filtering client-side (PRD Section 28).
- Added: CSV export, an admin Risk Configuration screen, an Executors summary table, and a small offline queue so a check-in/check-out taken with no signal is queued locally and sent automatically once the connection returns (PRD Section 47).

## Quick start

### 1. Database

You need a local PostgreSQL 14+ instance.

```bash
# create a role and database (adjust as needed for your setup)
createuser fieldwork --pwprompt --createdb
createdb fieldwork_dev -O fieldwork
```

### 2. Backend

```bash
cd backend
cp .env.example .env      # edit DATABASE_URL / JWT_SECRET if needed
npm install
npm run db:migrate        # creates tables, triggers, and the risk_config row
npm run db:seed           # creates 4 demo users, 3 projects, 3 work reports
npm run dev                # http://localhost:3000
```

Demo accounts created by the seed script:

| Role | Identifier | Password | Scenario |
|---|---|---|---|
| Admin | `admin.fauzi@fieldwork.id` | `admin123` | Full dashboard access |
| Executor | `budi.santoso@fieldwork.id` | `lapangan123` | Job in progress |
| Executor | `sinta.maharani@fieldwork.id` | `lapangan123` | Flagged anomaly (GPS 740m out of radius) |
| Executor | `andi.pratama@fieldwork.id` | `lapangan123` | Ready to check in |

### 3. Frontend

```bash
cd frontend
cp .env.example .env      # VITE_API_URL, defaults to http://localhost:3000/api
npm install
npm run dev                # http://localhost:5173
```

Open `http://localhost:5173` and log in with one of the accounts above. Camera and GPS require either `localhost` or HTTPS — if you test from a phone on your network, use a tool like `ngrok` or set up a dev HTTPS cert, since browsers block camera/geolocation on plain HTTP over LAN.

## Moving to production (Supabase + Vercel)

The PRD's target architecture is Supabase (Postgres + Auth + Storage) behind Vercel, with Express used only for local development. The repository/service boundaries are already in place to make that swap contained:

- `backend/src/modules/photos/storage.ts` — swap the three functions for `supabase.storage.from('evidence')` calls; nothing above this layer changes.
- `backend/src/middleware/auth.ts` — swap the JWT issue/verify for Supabase Auth's session verification.
- `backend/src/db/pool.ts` — point `DATABASE_URL` at your Supabase connection string; the schema and queries are plain PostgreSQL and need no changes.
- The Express routes under `backend/src/modules/*` can be deployed as Vercel Functions largely as-is (they're already stateless request handlers).

## What's still Phase 2

Consistent with the PRD's own MVP scope (Section 62), these were intentionally left out:

- PDF export of reports (CSV export is implemented; PDF is listed as Phase 2 in the PRD itself)
- Full background sync via the Service Worker Background Sync API (the current offline queue retries on the browser's `online` event, which covers the common case of a signal dropping for a few minutes)
- Row Level Security policies (the API enforces the same access rules in code; RLS becomes relevant once Supabase Auth is wired in for production)
