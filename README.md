# FieldWork App V2

Sistem Terpadu Manajemen Inventaris, Pemantauan Operasional Lapangan (Presensi GPS & Anomali), dan Eksekusi *Pest Control* (Pengendalian Hama Terpadu & Anti Rayap) yang dirancang khusus untuk sektor B2B komersial.

FieldWork V2 dibangun menggunakan **React 19 + Vite 6** dengan antarmuka modern yang mengadopsi standar **Feature-Sliced Design (FSD)**. Aplikasi ini didukung oleh **Node.js (Express)** sebagai backend API dan **Supabase (PostgreSQL)** sebagai penyedia basis data yang terpusat. Dilengkapi dengan kemampuan *Progressive Web App* (PWA) dan sinkronisasi data luring (*offline-queue*), memungkinkan teknisi bekerja penuh di area minim sinyal.

---

## 🚀 Fitur Utama & Keunggulan

- **FSD Architecture & Modern UI:** Struktur kode bersih dan *scalable* dengan desain antarmuka gaya *editorial/warm* (Framer Motion, Tailwind v4).
- **Maker-Checker Workflow:** Alur perizinan logis yang memisahkan otoritas antara **ADMIN** (Pembuat Penugasan & Peninjau) dan **EXECUTOR** (Teknisi Lapangan/Pelaksana).
- **PWA & Offline Geo-Tracking:** Pelacakan lokasi *real-time* berbasis satelit. Check-in/Check-out dapat dilakukan saat *offline* dan akan disinkronisasi ke server secara aman ketika sinyal kembali.
- **Kamera AR 3D & Smart Measurement:** Alat ukur bangunan digital (*WebXR*). Memiliki *fallback* cerdas berupa *Photo Annotation* dengan kalibrasi otomatis yang dapat mengkalkulasi kebutuhan liter bahan kimia berdasar SNI 2404.
- **Risk & Anomaly Engine:** Engine analitik di backend (*Risk Engine*) yang secara otomatis menandai laporan mencurigakan (contoh: Check-out di luar radius proyek > 300 meter, durasi kerja terlalu sebentar, manipulasi koordinat).
- **Quotation & Modul Ekspor:** Terintegrasi dengan PDF Generator (*jsPDF*) dan Excel Exporter (*xlsx*) untuk mencetak Surat Perintah Kerja (SPK), Laporan Pemeriksaan, dan Riwayat Gudang secara komersial profesional.

---

## 🛠 Tech Stack

- **Frontend:** React 19, Vite 6, Tailwind CSS v4, Zustand, jsPDF (PDF dibuat di browser, teks vektor)
- **Backend:** Node.js, Express, Zod, jose (verifikasi JWT), helmet, express-rate-limit
- **Database & Auth:** PostgreSQL + Supabase Auth (+ Storage untuk foto bukti)
- **Multi-tenant:** setiap perusahaan hanya melihat datanya sendiri (RLS di Supabase + filter `company_id` di backend)

## 👥 Role

| Role | Akses |
|---|---|
| `SUPERADMIN` | Semua perusahaan (memilih perusahaan di sidebar) |
| `ADMIN` | Admin perusahaan: dashboard, laporan, user, aturan risiko, **template dokumen**, log |
| `MARKETING` | Penawaran harga, garansi rayap |
| `INVENTORY` | Gudang & stok |
| `TEKNISI_LAPANGAN` | Aplikasi lapangan (check-in/out, foto, treatment) |

## 📦 Setup Development

Butuh **Node.js 20+**, **PostgreSQL 15+** (atau proyek Supabase).

```bash
npm install
cp .env.example .env     # isi DATABASE_URL, SUPABASE_URL, SUPABASE_JWT_SECRET / SUPABASE_SERVICE_ROLE_KEY
npm run db:migrate       # menerapkan supabase/migrations/*.sql berurutan (dilacak di schema_migrations)
npm run db:seed          # data demo; SEED_SUPABASE_AUTH=true untuk sekaligus membuat akun login di Supabase Auth
npm run dev              # http://localhost:3000
```

> **Database yang sudah berjalan (produksi):** jalankan `npm run db:migrate` — jika tabel `users` sudah ada dan belum ada
> pelacakan, migrasi `00`/`01` otomatis dianggap sudah diterapkan dan hanya `02`+ yang dijalankan. Baca
> [docs/PANDUAN_DEPLOY.md](docs/PANDUAN_DEPLOY.md) sebelum menerapkannya di produksi.

## ✅ Pengujian

```bash
npm run lint                      # tsc --noEmit
npm run test:integration          # 50 skenario Express + Postgres (butuh DB hasil migrate+seed)
npm run test:templates            # sistem template: sanitasi, markup, dua perusahaan
psql -d <db> -f supabase/tests/rls_test.sql   # 48 skenario RLS/RPC lintas perusahaan & role
npm run pdf:samples               # render contoh PDF ke ./out/pdf-samples
```

## 🏗 Build & Deploy

```bash
npm run build && npm start
```

Vercel: `vercel.json` sudah memuat rewrite API dan cron retensi harian. Panduan lengkap: [docs/PANDUAN_DEPLOY.md](docs/PANDUAN_DEPLOY.md).

## 📚 Dokumentasi

- [docs/ARSITEKTUR.md](docs/ARSITEKTUR.md) — alur autentikasi, isolasi tenant, risk engine
- [docs/PANDUAN_ADMIN_TEMPLATE.md](docs/PANDUAN_ADMIN_TEMPLATE.md) — mengatur kop, footer, dan template dokumen perusahaan
- [docs/PANDUAN_DEPLOY.md](docs/PANDUAN_DEPLOY.md) — env, migrasi, Supabase, rollback
- [docs/LAPORAN_AUDIT.md](docs/LAPORAN_AUDIT.md) — hasil audit & perbaikan

## 🛡 Aturan Keamanan

- **Identitas hanya dari Supabase Auth.** Backend memverifikasi access token (HS256 / JWKS) lalu memuat role, perusahaan, dan status aktif dari database pada setiap request. Tidak ada rahasia JWT bawaan; Express tidak menyimpan kata sandi.
- **Isolasi perusahaan berlapis:** RLS pada tabel yang dibaca browser; tabel khusus backend di-RLS tanpa policy; semua query backend dibatasi `company_id`.
- **Jangan** pernah mengekspos `SUPABASE_SERVICE_ROLE_KEY` ke browser (hanya server).
- Mutasi stok, persetujuan laporan, penomoran surat, undangan, dan penyimpanan template berjalan lewat RPC server berotorisasi — bukan tulis langsung dari klien.
