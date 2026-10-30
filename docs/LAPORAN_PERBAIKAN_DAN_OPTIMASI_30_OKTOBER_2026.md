# Laporan Resmi Perbaikan Bugs, Optimasi Performa, & Sinkronisasi Geofencing — FieldWork App V2

**Tanggal Rilis & Audit:** 30 Oktober 2026  
**Auditor / Tim:** FieldWork Operations & Ayling Systems Engineering  
**Lingkup Pemeriksaan:**
1. Generator PDF Dokumen Penawaran (`src/shared/lib/quotationLetterPdf.ts`)
2. Layar Kamera Lapangan & Watermarking Canvas (`src/widgets/camera/CameraCaptureModal.tsx`)
3. Penugasan Kerja & Modal Formulir Mobile (`src/widgets/executor/CreateProjectModal.tsx`)
4. Virtual Keyboard Viewport Engine (`src/shared/hooks/useVirtualKeyboard.ts`)
5. Service Transaksi Laporan Kerja Lapangan (`src/shared/api/workReports.ts`)
6. Penomoran Surat Resmi Bersih Kategori (`AR` & `PCO`) tanpa kode `APR`

---

## 1. Perbaikan Cetakan PDF Penawaran (`quotationLetterPdf.ts`)

| No | Temuan Bug | Lokasi Kode | Akar Masalah (Root Cause) | Solusi yang Diterapkan | Status |
|:---:|:---|:---|:---|:---|:---:|
| **1.1** | Teks kontak bertumpuk di bagian PENUTUP (Halaman 3). | `quotationLetterPdf.ts:261, 749` | Lebar label dipatok statis `labelW: 32mm`, padahal nama akun demo (*Rafi — Master All-Role...*) memiliki lebar ~62mm sehingga titik dua `:` menimpa teks. | • Diterapkan fungsi `cleanPersonDisplayName()` untuk memangkas embel-embel jabatan internal.<br>• Kolom label dihitung otomatis (*auto-fit*) dengan `getTextWidth()` teks terpanjang. | **RESOLVED** |
| **1.2** | Tag HTML `<i>Trapping</i>` dan `<i>Baiting</i>` tercetak mentah pada Halaman 2. | `quotationLetterPdf.ts:270, 819` | Kolom label kiri pada `private kv()` digambar dengan `doc.text(k)` mentah tanpa parser tag HTML. | Kolom label kiri kini dirender via `this.rich(k, ...)` sehingga tag `<i>`, `<b>`, dan `<u>` langsung diubah menjadi font miring/tebal resmi. | **RESOLVED** |
| **1.3** | Kata menyatu tanpa spasi setelah teks miring (*"Glue Trappinguntuk..."*). | `quotationLetterPdf.ts:191-234` | Font Helvetica Italic pada jsPDF memiliki kemiringan tepi (*italic overhang* ~0.65mm) yang membuat kata tegak berikutnya menempel. | Ditambahkan kompensasi jarak (*kerning compensation*) sebesar `+0.65mm` pada transisi dari token italic ke token normal. | **RESOLVED** |
| **1.4** | Baris baru (`\n`) di dalam sel tabel biaya menyatu menjadi satu baris. | `quotationLetterPdf.ts:99-116` | Regex `part.split(/(\s+)/)` menelan `\n` menjadi spasi biasa (`space = true`), menghilangkan line break. | Parser `tokenize()` kini memisahkan `\r?\n` sebagai token `{ br: true }`, dan `rich()` memotong baris baru secara eksplisit di dalam sel tabel. | **RESOLVED** |

---

## 2. Akurasi & Sinkronisasi Geofencing Teknisi Lapangan

### A. Solusi "Null Island" (Proyek Tanpa Titik Peta / Koordinat 0,0)
* **Kondisi Sebelumnya:** Saat proyek dibuat dari dokumen SPK tanpa pin peta, koordinat tersimpan `0, 0`. Saat teknisi check-in, kalkulasi Haversine menghitung jarak terhadap ekuator Afrika (10.500 km) dan otomatis memicu alarm `FLAGGED / Di Luar Radius`.
* **Solusi Diterapkan:**
  1. **Auto-Anchor Check-In Pertama (`workReports.ts`):** Jika proyek belum memiliki koordinat valid (`projectLatitude === 0 && projectLongitude === 0`), titik GPS fisik teknisi saat check-in pertama otomatis dikunci sebagai titik jangkar resmi proyek (`projects.latitude` & `longitude`), jarak dihitung `0 meter`, dan status geofence langsung **Valid (`check_in_valid: true`)**.
  2. **HUD Kamera Adaptif (`CameraCaptureModal.tsx`):** Jika proyek baru belum memiliki koordinat, HUD kamera menampilkan badge hijau informatif: **`✓ Titik Jangkar Baru (Valid)`** dan mengizinkan pengambilan foto tanpa penalti anomali.
  3. **Fallback Progres & Check-Out:** Jika proyek belum di-anchor, foto progres dan check-out otomatis merujuk ke koordinat check-in pertama teknisi (`checkInLatitude` & `checkInLongitude`).

### B. Proteksi Anti-Geser Pin Peta (`CreateProjectModal.tsx`)
* **Kondisi Sebelumnya:** Debounced auto-geocoding 1,5 detik otomatis mengirim teks alamat ke Nominatim OpenStreetMap dan menimpa koordinat GPS riil teknisi dengan titik tengah kelurahan.
* **Solusi Diterapkan:**
  * Auto-geocoding latar belakang dimatikan total.
  * Pencarian koordinat alamat hanya berjalan jika teknisi secara eksplisit menekan tombol **"Cari dari Alamat"**.
  * Pengambilan GPS awal dan tombol **"Posisi GPS Saya (Akurat)"** dikunci menggunakan sensor presisi tinggi: `{ enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }`.

---

## 3. Optimasi Responsivitas & Performa Mobile (Lancar 60 FPS)

1. **Throttled Viewport Metrics (`useVirtualKeyboard.ts`):**
   * Pemantauan resize dan scroll pada `window.visualViewport` di-throttle dengan `requestAnimationFrame` dan batas selisih tinggi minimal `3px`.
   * Mencegah re-render berlebihan (*layout thrashing*) sehingga animasi keyboard Android/iOS berjalan mulus tanpa lag.
2. **Auto-Scroll Input Form:**
   * Ditambahkan handler `onFocus` yang memanggil `scrollInputIntoView()` pada field nama proyek, pelanggan, jadwal, dan textarea alamat.
   * Container form dilengkapi padding bawah ekstra (`pb-56`) dan kelas `scroll-mb-48` agar teks tidak tertutup keyboard saat mengetik.
3. **Zero Background HTTP Overhead:**
   * Pengetikan alamat tidak lagi mengirim request jaringan berulang-ulang, menghemat kuota seluler teknisi dan menjaga UI tetap enteng.

---

## 4. Standarisasi Penomoran Surat Resmi (Peniadaan Total Kode `APR`)

Sesuai arahan operasional manajemen, format penomoran surat dibersihkan dari imbuhan sementara `APR`:
* **Fase Draft (Surveyor/Marketing):** Memuat kode `-DRF`, contoh:
  * Anti Rayap: `GP-DRF/AR/PH/YYYY/MM/NNNN`
  * Pest Control: `GP-DRF/PCO/PH/YYYY/MM/NNNN`
* **Fase Disetujui (Admin/Direktur Approve):** Kode `-DRF` langsung tanggal dan langsung menjadi format resmi kategori (`AR` atau `PCO`), contoh:
  * Anti Rayap: **`GP/AR/PH/YYYY/MM/NNNN`**
  * Pest Control: **`GP/PCO/PH/YYYY/MM/NNNN`**

---

## 6. Konfigurasi Tema Bawaan (Light Theme Default)

* **Inisialisasi Bawaan:** Aplikasi kini langsung aktif dalam tema **Terang (Light)** pada kunjungan pertama atau saat penyimpanan `localStorage` masih kosong.
* **Mencegah Flash Tampilan (FOUC):** Tag `<html>` pada `index.html` dan skrip *pre-hydration* dikonfigurasi menggunakan `class="light" data-theme="light"`.
* **Pilihan Pengguna:** Pengguna tetap dapat berganti ke tema Gelap (*Dark*) atau Ikuti Sistem (*System*) melalui tombol toggle pada navigasi atas atau menu Pengaturan Profil.

---

## 7. Bukti Pengujian & Integritas Sistem

1. **Vite Production Build:**
   * Status: **SUCCESS** (2545 modules transformed, 0 error).
2. **Whitebox Unit Tests (`npm run test:whitebox`):**
   * Status: **56 / 56 PASS (100%)**
   * Termasuk pengujian baru **WB-15** (*PDF Formatting Sanitization & Geofence Auto-Anchor Invariants*).
3. **Blackbox Integration Tests (`npm run test:blackbox`):**
   * Status: **21 / 21 PASS (100%)**
   * Mencakup RBAC Matrix, State Machine SPK, Skor SUS Teknisi, dan Offline Queue Idempotency.
4. **Riwayat Git:**
   * Commit ID: `0356538` & `4e4dded` (`feat(ui): set light as default color theme`)
   * Branch: `origin/main`.
