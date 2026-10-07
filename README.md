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

### Frontend
- **Framework:** React 19, Vite 6
- **Styling:** Tailwind CSS v4, Lucide React, Framer Motion
- **Architecture:** Feature-Sliced Design (FSD)
- **Komputasi & 3D:** Three.js, WebXR API
- **Document Exporter:** jsPDF, jspdf-autotable, xlsx

### Backend & Database
- **Server:** Node.js, Express, esbuild
- **Language:** TypeScript, Zod (Schema Validation)
- **Database:** PostgreSQL (Supabase)
- **Security:** JWT (JSON Web Tokens), bcryptjs, Role-Based Access Control (RBAC)

---

## 📦 Panduan Instalasi (Development)

Pastikan lingkungan lokal Anda sudah memiliki **Node.js** (v20+) dan **npm**.

1. Klon repositori ini dan masuk ke direktori:
   ```bash
   git clone https://github.com/USERNAME_ANDA/NAMA_REPO_ANDA.git
   cd FieldWork-V2
   ```

2. Konfigurasi *Environment Variable*:
   Salin `.env.example` menjadi `.env`.
   ```bash
   cp .env.example .env
   ```
   *Isi `VITE_SUPABASE_URL`, rahasia *Database* `DATABASE_URL`, serta `JWT_SECRET` sesuai dengan konfigurasi Supabase proyek Anda.*

3. Instal seluruh dependensi:
   ```bash
   npm install
   ```

4. Menyiapkan Database (Migrasi & Seeding):
   *(Perintah ini akan melakukan sinkronisasi schema tabel dan membuat user uji coba `ADMIN` & `EXECUTOR`)*
   ```bash
   npm run db:seed
   ```

5. Jalankan server lokal (Frontend & Backend akan berjalan bersamaan via `tsx` dan `vite`):
   ```bash
   npm run dev
   ```

Aplikasi dapat diakses melalui `http://localhost:3000`.

---

## 🏗 Build & Deployment

Untuk melakukan _type-check_ kompilasi ketat dan memastikan bundel siap untuk lingkungan _Production_ (misal: Vercel atau VPS node.js server):

```bash
# Melakukan kompilasi React dan bundle Express backend
npm run build
```

Setelah kompilasi, Anda dapat menguji hasil *build* *production-ready*:
```bash
npm run start
```

---

## 🛡 Aturan Kontribusi & Keamanan

- **Konvensi Basis Data:** Seluruh intervensi logika *project lock* saat pekerjaan dimulai telah dijaga pada level Database *Triggers* PostgreSQL (`Final-Database-Schema.sql`).
- **Penanganan Akses (RBAC):** Seluruh API Backend (*routes*) diakses menggunakan autentikasi *Bearer Token JWT*. Kredensial *plaintext* tidak boleh disimpan atau diproses tanpa di-*hash* via `bcryptjs`.
- **TypeScript Strict Mode:** Pembangunan kode menolak penggunaan tipe `any` tanpa pengecekan tipe yang jelas (`unknown` / *Type Guard*).

---
*Dibangun untuk merevolusi efisiensi operasional B2B Pest Control Field Services.*