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

## Adapted for pest control operations

The system is now shaped around what a pest control / anti-rayap / fumigasi company actually needs to track, not just generic "field work":

- **Service taxonomy.** Every job is tagged with a `service_type` — Pest Control Umum, Anti Rayap, Fumigasi, Pengendalian Tikus, Nyamuk, Burung, Kutu Busuk, or Disinfeksi — which drives the icons, filters, and which fields the technician sees.
- **Treatment record.** A dedicated formulir (separate from the GPS/photo evidence) captures what was actually applied: chemical/product name, active ingredient, dosage, application method (spraying, baiting, drilling, trenching, fogging, misting, dusting, gel injection), and area treated. For Anti Rayap jobs it also asks for the number of drilling/injection points.
- **Fumigation safety data is enforced, not optional.** Fumigasi uses a toxic gas, so the treatment form requires the fumigant type, gas concentration, sealing start time, and — critically — the aeration/ventilation completion time before the job can be checked out without a risk engine flag. A fumigation job missing its aeration timestamp is treated as a **safety compliance gap** (`FUMIGATION_SAFETY_INCOMPLETE`, high point weight), not just missing paperwork.
- **Before/after photo tagging.** Progress photos can be tagged `BEFORE` or `AFTER`, so the admin gallery shows the infestation and the treated result side by side — the kind of evidence a pest control client actually wants to see.
- **Contracts & warranty.** Projects carry a contract type (one-time vs. recurring), a warranty period in months (the norm for termite treatments), and — for recurring contracts — the next scheduled service date, shown on both the technician's job list and the admin's project view.
- **Risk engine extended** with `MISSING_TREATMENT_RECORD` (a completed job with no chemical/dosage on file) and `FUMIGATION_SAFETY_INCOMPLETE`, both configurable from the same admin Risk Configuration screen as the original GPS/time thresholds.
- **CSV export** now includes service type, application method, product name, and dosage per job — useful for the regulatory/compliance recordkeeping pest control operators are typically expected to keep.

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
npm run db:seed           # creates 4 demo users, 4 projects, 4 work reports
npm run dev                # http://localhost:3000
```

Demo accounts created by the seed script:

| Role | Identifier | Password | Scenario |
|---|---|---|---|
| Admin | `admin.fauzi@fieldwork.id` | `admin123` | Full dashboard access |
| Teknisi | `budi.santoso@fieldwork.id` | `lapangan123` | Anti Rayap job in progress; a completed Pest Control Umum job with full treatment record |
| Teknisi | `sinta.maharani@fieldwork.id` | `lapangan123` | Fumigasi job flagged: GPS 740m out of radius **and** missing aeration data |
| Teknisi | `andi.pratama@fieldwork.id` | `lapangan123` | Pengendalian Tikus, recurring contract, ready to check in |

### 3. Frontend

```bash
cd frontend
cp .env.example .env      # VITE_API_URL, defaults to http://localhost:3000/api
npm install
npm run dev                # http://localhost:5173
```

Open `http://localhost:5173` and log in with one of the accounts above. Camera and GPS require either `localhost` or HTTPS — if you test from a phone on your network, use a tool like `ngrok` or set up a dev HTTPS cert, since browsers block camera/geolocation on plain HTTP over LAN.

## Deploying to production (Vercel + Supabase)

This is no longer just a suggestion — the codebase actively switches behavior based on environment variables, so the same code runs locally against local Postgres + local disk, and on Vercel against Supabase Postgres + Supabase Storage, with no branching in application logic. Both `backend/` and `frontend/` deploy as **separate Vercel projects**.

**Why Supabase rather than Firebase:** the entire data model (projects → work reports → photos → risk events, filtered with joins and aggregates in the admin dashboard) is relational and already written in plain PostgreSQL. Supabase *is* PostgreSQL, so the existing `schema.sql`, queries, and the SQL-side project-lock trigger all move over unchanged. Firebase's Firestore is a document store with no joins and no server-side aggregate queries — using it would mean redesigning the schema and rewriting every filtered query as multiple round-trips or denormalized documents, for a system whose whole value is exactly this kind of relational filtering (PRD Section 28–29). This matches the reasoning the original PRD gave for the same choice (Section 32).

### Step 1 — Create the Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. **Database**: open the SQL Editor and run the contents of `backend/src/db/schema.sql` once, directly (this is the same file `npm run db:migrate` runs locally — either works, but the SQL Editor doesn't need network access to your Supabase DB from your machine, which is convenient if you're behind a restrictive network).
3. **Seed data (optional)**: `cd backend`, set `DATABASE_URL` in a local `.env` to your Supabase **direct** connection string (port 5432, Project Settings → Database → Connection string → URI), then run `npm run db:seed` once from your machine. Switch back to the pooler URL (below) before deploying.
4. **Storage**: go to Storage → Create bucket → name it `evidence-photos` (or whatever you set `SUPABASE_STORAGE_BUCKET` to) → **make it private**. Evidence photos must never be a public bucket (PRD Section 50); the backend proxies every read through its own auth check (`GET /api/photos/:id/file`), so the bucket itself needs no public access at all.
5. Note down, from Project Settings → API: the **Project URL** and the **service_role key** (not the anon key). From Project Settings → Database: the **Transaction pooler** connection string (port 6543).

### Step 2 — Deploy the backend to Vercel

```bash
cd backend
npm i -g vercel   # if you don't have the CLI
vercel link       # creates/links a Vercel project for this folder
vercel env add DATABASE_URL          # paste the Supabase pooler connection string (port 6543)
vercel env add JWT_SECRET            # a long random string
vercel env add SUPABASE_URL          # from Project Settings -> API
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add SUPABASE_STORAGE_BUCKET   # e.g. evidence-photos
vercel env add CORS_ORIGIN           # your frontend's URL, set after Step 3 (or update later)
vercel --prod
```

Note the deployment URL Vercel prints (e.g. `https://fieldwork-api.vercel.app`) — the frontend needs it as `VITE_API_URL=https://fieldwork-api.vercel.app/api`.

**Two things that only matter in this serverless environment**, both already handled by the code:
- `backend/src/modules/photos/storage.ts` automatically switches from local disk to Supabase Storage as soon as `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set — Vercel's filesystem is ephemeral outside `/tmp`, so local-disk storage would silently lose every photo between invocations if this switch didn't exist.
- `backend/src/db/pool.ts` caps the connection pool at 1 connection when `process.env.VERCEL` is set (Vercel sets this automatically) and enables TLS for any non-localhost host, so a burst of concurrent function invocations doesn't exhaust Supabase's connection limit — this is why the pooler connection string (port 6543), not the direct one (5432), is what production should use.

**Vercel's request body limit (~4.5MB) applies to photo uploads.** The camera flow already compresses to JPEG quality 0.92 client-side, which is normally well under that for a phone photo, but lower `MAX_PHOTO_SIZE_MB` to `4` in the Vercel env vars as a hard backstop, or raise it only if you've confirmed your plan's limit is higher.

### Step 3 — Deploy the frontend to Vercel

```bash
cd frontend
vercel link
vercel env add VITE_API_URL   # https://fieldwork-api.vercel.app/api from Step 2
vercel --prod
```

Then go back to the backend project's `CORS_ORIGIN` env var and set it to this frontend's URL (comma-separate it with any other domains you use, e.g. a custom domain alongside the `*.vercel.app` one), then redeploy the backend so the new origin takes effect.

### What's still using custom auth, not Supabase Auth

The app keeps its own JWT + bcrypt auth in production rather than switching to Supabase Auth. This is a deliberate scope decision, not an oversight: Supabase Auth would mean migrating the `users` table to `auth.users`, rewriting `middleware/auth.ts` to verify Supabase-issued JWTs, and adding Row Level Security policies to every table (since Supabase Auth's value comes from RLS enforcing access at the database layer, not just in Express). All three are real, contained pieces of work — `middleware/auth.ts` is the single seam where that swap happens — but folding them in now would touch every route file for a change that isn't required to run this in production today. Treat it as the next milestone once RLS is actually wanted.

## What's still Phase 2

Consistent with the PRD's own MVP scope (Section 62), these were intentionally left out:

- PDF export of reports (CSV export is implemented; PDF is listed as Phase 2 in the PRD itself)
- Full background sync via the Service Worker Background Sync API (the current offline queue retries on the browser's `online` event, which covers the common case of a signal dropping for a few minutes)
- Supabase Auth + Row Level Security (see above — the API enforces the same access rules in code today)
- A printable warranty/service certificate (the data — warranty months, contract type, next service date — is already captured and shown in the admin Projects view; generating a PDF certificate from it is a natural next step)
- Automatic reminders for `next_service_date` on recurring contracts (the field is tracked and displayed, but nothing currently notifies anyone as the date approaches)
