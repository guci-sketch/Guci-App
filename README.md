# FIELDWORK (Guci App)

Field Work Documentation, Attendance & Anomaly Monitoring System for pest control / anti-rayap / fumigasi operations — React/Vite frontend + Express API, deployed as **one Vercel project** backed by Supabase (Postgres + Storage).

```
/
  src/                    Frontend (React + TypeScript + Vite)
  backend-src/            Backend (Express, mounted as a serverless function)
  api/index.ts            Vercel serverless entrypoint — re-exports the Express app
  vercel.json             Single deploy config for both
  FINAL_MIGRATION_BUNDLE.sql   Generated from backend-src/db/migrations/ — paste into Supabase SQL Editor
```

## This is a fix pass on top of a self-upgrade

The repo we received had already been extended with real, legitimate features — technician self-signup with admin approval, customer sign-off (name/phone/feedback/signature at check-out), live location tracking, a monolith Vercel restructuring — and those are all kept. But several things had broken along the way, most of it traceable to defensive code added at some point to make a broken connection *look* like it was working instead of fixing the actual break. If you're wondering why some of this is written the way it is, here's the honest list of what was found and fixed:

1. **`vercel.json` was swallowing every API call.** A catch-all rewrite (`"/(.*)" → "/index.html"`) meant `/api/auth/login`, `/api/projects`, everything, got served the HTML page instead of reaching the backend function. This alone explains most of "several buttons don't work" — the requests were never arriving. Fixed by removing the rewrite; this app has no client-side router, so there was never a reason for an SPA fallback in the first place.

2. **The database layer was silently swallowing every error.** `pool.ts` caught any connection or query failure and returned an empty result instead of throwing. A broken `DATABASE_URL` or a bad query would make check-ins *look* successful and dashboards *look* empty, with no error anywhere — the two states were indistinguishable from the UI. Rewritten to fail loudly, as it should.

3. **There was a login bypass.** If a user lookup failed, `authRoutes.ts` fell back to a hardcoded list of fake accounts (`mock-admin`, `mock-budi`, ...) with `password_hash: ''`, and then accepted *any* password for them. Combined with #2, this meant a failed database connection didn't block login — it quietly logged people into fake sessions with IDs that matched nothing real, so everything downstream (their own projects, their own reports) came back empty. **Removed entirely.** Every login now goes through a real row in the database, or it fails with a clear message.

4. **A hardcoded JWT fallback secret** (`'fallback-secret-for-ai-studio'`) meant that if `JWT_SECRET` wasn't set, anyone who read the (public) source could forge a valid admin token. Removed — the app now refuses to start without a real one.

5. **Local schema and production schema had drifted.** `backend-src/db/schema.sql` was missing the `approval_status` column that `FINAL_MIGRATION_BUNDLE.sql` (presumably already run on the live Supabase project) had. `seed.ts` didn't set `approval_status`/`is_active` either, so demo accounts came out `PENDING`/inactive under the new schema and couldn't really log in — which is likely *why* the bypass in #3 got added in the first place, to paper over accounts that seemed broken. Both are now fixed at the root: seed accounts are explicitly approved, and schema management was rebuilt as tracked, numbered migrations (`backend-src/db/migrations/001_init.sql`, `002_photo_retention.sql`, ...) so local and production can never silently diverge again — see `backend-src/db/migrate.ts`.

6. **Service type values didn't match between frontend, backend, and database.** The project-creation form and its backend validator had been simplified to 3 categories (`PEST_CONTROL`, `TERMITE_CONTROL`, `FUMIGATION`), but the database enum only knows `GENERAL_PEST_CONTROL` (not `PEST_CONTROL`) among its values. Every "Buat Proyek" submission for anything other than Anti Rayap or Fumigasi was rejected — first by the backend's own validator (wrong enum value), and even if that had matched, by Postgres itself. Fixed by renaming to `GENERAL_PEST_CONTROL` consistently everywhere, keeping the 3-category simplification (it's a reasonable UX choice) without fighting the database.

7. **CSV export used a different, stale API base URL** (`import.meta.env.VITE_API_URL || 'http://localhost:3000/api'`) than the rest of the app, which already correctly calls a hardcoded relative `/api`. In production this either hit `VITE_API_URL` if it happened to be set right, or literally tried to reach `localhost:3000` from the user's browser. Fixed to match the rest of the app.

8. Smaller things: `api/index.ts` imported `'../backend-src/app.ts'` with a `.ts` extension (works via Vite/esbuild's bundler resolution but is inconsistent); `app.ts` computed a CORS allow-list it never used, and CORS doesn't apply anyway now that frontend+API are one origin; `server.ts` had redundant Vite-middleware-embedding logic left over from an earlier local-dev pattern; the repo had two full duplicate copies of the frontend and backend (`frontend/`, `backend/`) — including `frontend/node_modules` and `frontend/dist` committed — plus a stray Puppeteer debug script and three different `.env.example` files. All cleaned up; this zip has one copy of everything and one `.gitignore` at the root (which the repo didn't have before, hence why `node_modules` ended up committed).

## Why your `.env` had 10 variables and now needs 4

Looking at the variables you had set, most of them were leftovers from an earlier two-project architecture (separate frontend/backend deployments) that no longer applies now that this is one monolith Vercel project:

| Variable | Still needed? | Why |
|---|---|---|
| `DATABASE_URL` | **Yes — core** | No default is possible; this is your Supabase connection. |
| `JWT_SECRET` | **Yes — core** | No default on purpose (see fix #4 above). |
| `SUPABASE_URL` | **Yes — core** | Needed to reach Supabase Storage. |
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes — core** | Same. |
| `SUPABASE_STORAGE_BUCKET` | Optional | Defaults to `evidence-photos` in code. |
| `JWT_EXPIRES_IN` | Optional | Defaults to `12h` in code. |
| `MAX_PHOTO_SIZE_MB` | Optional | Defaults to `8` in code. |
| `CORS_ORIGIN` | **No — delete it** | Was for cross-origin requests between two separate deployments. Frontend and API are the same origin now; the browser never makes a cross-origin request here, and the code no longer even sets up CORS middleware. |
| `UPLOAD_DIR` | **No — delete it** | Was the local-disk fallback path. Production always uses Supabase Storage once `SUPABASE_URL` is set; this only ever mattered for local dev, which already has a working default. |
| `VITE_API_URL` | **No — delete it** | The frontend calls a hardcoded relative `/api` path (same-origin), so this was never actually read even before this fix pass. |

See `.env.example` for the full breakdown with comments.

## New: photo retention (delete old photo files, keep everything else)

Admin dashboard → **Konfigurasi Risiko** tab → **Retensi Penyimpanan Foto** panel. Pick a window (1/2/3/6/12 months), see how many photo files are older than that, and delete them with one click.

**What gets deleted:** only the image file itself, from Supabase Storage (or local disk in dev).
**What's kept forever:** the photo's database row (GPS, timestamp, accuracy, which risk events it triggered), every work report, risk event, treatment record, customer review, and audit log entry. A purged photo shows a "Foto dihapus (retensi)" placeholder instead of a broken image, everywhere it would have appeared — the record that a photo existed, and everything it proved, is not lost.

Two ways to trigger it:
- **Manual**: the dashboard button above, calls `POST /api/admin/photos/purge`.
- **Scheduled**: set `CRON_SECRET` and `PHOTO_RETENTION_MONTHS` env vars, and Vercel's cron (configured in `vercel.json`) calls `POST /api/cron/purge-photos` on a schedule automatically. This is optional — the manual button works fine without it.
\
