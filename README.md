# FieldWork App V2

Sistem Terpadu Manajemen Inventaris, Pemantauan Operasional Lapangan (Presensi GPS & Anomali), dan Eksekusi *Pest Control* (Pengendalian Hama Terpadu & Anti Rayap).

Aplikasi ini dibangun menggunakan **React 19 + Vite 6**, dirancang sebagai aplikasi *Progressive Web App* (PWA) untuk mendukung *offline-queue* (kemampuan teknisi bekerja di area *blank spot*), dan menggunakan arsitektur *Serverless Express* yang dapat di-*deploy* dalam satu wadah proyek **Vercel** beriringan dengan **Supabase** (PostgreSQL) sebagai basis datanya.

## 🚀 Fitur Utama

- **PWA & Offline GPS Tracking:** Pelacakan lokasi *real-time* dengan antrean *offline* terintegrasi.
- **Kamera AR 3D & Alat Ukur Visual:** Pengukur meter lari tembok berbasis *WebXR* (ARCore) dilengkapi mode cadangan *Photo Annotation* dengan kalkulasi SNI 2404 otomatis.
- **Maker-Checker Workflow:** Alur pencatatan dan persetujuan tugas yang memisahkan otoritas admin lapangan dan supervisor.
- **Modul Quotation & Laporan Ekspor:** Terhubung dengan _pdf generator_ dan *exporter* (*jsPDF*, *xlsx*) guna mencetak SPK dan Riwayat Gudang.
- **Bulk Import (Inventori & Klien):** Ekstraksi fail `.xlsx` dan injeksi *batch* massal data master secara aman ke pangkalan data.

## 🛠 Tech Stack

- **Frontend:** React 19, Vite, Tailwind CSS v4, Framer Motion, Lucide React
- **PWA Support:** Vite PWA Plugin, Workbox
- **Komputasi 3D (AR):** Three.js, WebXR API
- **Backend/API Proxy:** Node.js (esbuild bundle), Express 
- **Database & Auth:** Supabase PostgreSQL, Supabase Auth
- **Ekspor Dokumen:** jsPDF, jspdf-autotable, xlsx

## 📦 Panduan Instalasi (Development)

Pastikan lingkungan lokal Anda sudah menginstal **Node.js** (v18+) dan manajer paket **npm**.

1. Klon repositori dan masuk ke dalam direktori.
2. Salin *environment file* dan sesuaikan dengan kredensial Supabase Anda.
   ```bash
   cp .env.example .env
   ```
   *(Isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY dengan kredensial Anda, pastikan tidak menyimpan kredensial produksi pada repo publik).*
3. Instal seluruh dependensi:
   ```bash
   npm install
   ```
4. Jalankan *server development*:
   ```bash
   npm run dev
   ```

## 🏗 Build & Deployment

Untuk melakukan pengecekan kompilasi yang ketat dan memastikan bundel siap untuk lingkungan _Production_:

```bash
# Melakukan type-check TypeScript dan membangun dist PWA
npm run build
```

Konfigurasi _deployment_ telah dioptimasi untuk platform **Vercel**. Berkas `vercel.json` dan `api/index.js` mengelola rute perlintasan fungsi server secara transparan tanpa menginterupsi *static routing* *frontend*.

## 🛡 Aturan Kontribusi

- **Keamanan:** Dilarang meletakkan data sensitif pelanggan (seperti koordinat presisi absolut) dan kredensial akses di dalam kode mentah. Semua _secret_ harus diakses melalui *environment variable*.
- **Konvensi TS:** Kompilasi tidak menoleransi deklarasi `any` tanpa pembatasan validasi terstruktur (`unknown` dan *Type Guard*).

---
*Dibangun untuk mengoptimalkan presisi operasional B2B Pest Control.*
