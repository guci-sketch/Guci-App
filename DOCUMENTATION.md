# Dokumentasi Fungsional — FieldWork App V2

Dokumen ini memuat panduan fungsional fitur utama dalam sistem yang dapat digunakan oleh pengguna tanpa memaparkan data sensitif terkait kredensial maupun rahasia koneksi basis data.

---

## 1. Peta Peran Pengguna (User Roles)

Sistem membagi aksesibilitas modul dalam dua peran spesifik (*strict RBAC*), dikonfigurasi langsung dari ENUM Database:

1. **ADMIN**
   - Mengelola Dasbor Pusat (*KPI & Monitoring*), Pemetaan (*Maps*).
   - Mengatur dan menugaskan Pekerjaan Baru (*SPK / Projects*).
   - Meninjau *Work Reports* yang telah dikirimkan dari aplikasi _mobile_ teknisi lapangan.
   - Mengakses pengaturan sistem (Retensi Foto Otomatis), ekspor data (PDF, Excel), dan pemantauan Laporan Anomali yang ditandai oleh *Risk Engine*.

2. **EXECUTOR (Teknisi Lapangan)**
   - Akses antarmuka _mobile-first_ yang ringan.
   - Melakukan eksekusi pekerjaan, GPS Check-in, dan GPS Check-out.
   - Melampirkan Bukti Foto (*Before / After / Progress*), dan input *Treatment Record* (misalnya: kalkulasi bahan kimia yang diaplikasikan, data aerasi gas fumigasi, titik injeksi).
   - Menggunakan alat ukur digital (AR & Fallback Photo-Measurement).

---

## 2. Modul Dasbor Utama (ADMIN)

### A. Hierarki Sidebar FSD (Framer Motion)
Seluruh panel operasi Admin dibungkus ke dalam navigasi *expandable sidebar* vertikal:
- **Dashboard:** Statistik harian, KPI Anomali Lapangan, Peta Lokasi proyek hari ini.
- **Data Proyek & SPK:** Pembuatan penugasan kerja yang ketat (Setelah teknisi *Check-in*, rincian seperti koordinat dan tanggal tidak dapat lagi diubah karena dikunci oleh *Trigger Database*).
- **Audit & Peninjauan:** Meninjau daftar *Laporan Lapangan* lengkap dengan cap waktu otentik, foto, dan tingkat keamanan laporan (Anomali).
- **Pengaturan & Manajemen:** Penambahan pengguna, konfigurasi profil, serta utilitas *Retensi Media* (penghapusan otomatis foto berumur > X bulan untuk menghemat biaya *storage* cloud).

### B. Risk & Anomaly Engine (Sistem Keamanan)
Admin dapat merasa tenang terkait manipulasi kunjungan. Backend dilengkapi lapisan `riskEngine` yang memindai setiap laporan yang masuk dari `EXECUTOR`:
- Laporan langsung mendapat cap **FLAGGED / HIGH RISK** jika:
  - Teknisi melakukan Check-in atau Check-out pada radius melebihi batas batas ambang yang wajar (> 300 meter).
  - Durasi penyelesaian kerja terlampau cepat dan tidak masuk akal (< 15 Menit).
  - Foto tidak disertakan, atau teknisi melompati prosedur aerasi/keselamatan pada saat mencatat operasi tipe `FUMIGATION`.

### C. Ekspor Data Dokumen Profesional
Laporan komersial didukung secara *native*.
- Laporan dan Surat Penawaran Kerja (SPK) diubah menjadi format PDF elegan menggunakan `jsPDF` dengan auto-pagination.
- Riwayat Pekerjaan untuk rekonsiliasi pembayaran dan absensi akhir bulan bisa diunduh via Excel / CSV.

---

## 3. Modul Pekerjaan Lapangan (EXECUTOR)

### A. Geo-Tracking & Mode PWA Offline (Antrean Sinyal)
Aplikasi didesain memiliki resiliensi tinggi bagi lingkungan lapangan keras.
- Saat pekerjaan dibuka, aplikasi menangkap sinyal presisi *latitude* & *longitude* untuk pembuktian *timestamp*.
- Jika `EXECUTOR` memasuki *blank spot* (Basemen / Area Pabrik Terisolasi), aplikasi **tidak akan mati/gagal**. Input disimpan di dalam *Service Worker / IndexedDB cache*. Ketika sinyal 4G/Wi-Fi kembali ditemukan, transaksi *Check-out* & *Upload* Foto akan disinkronisasi ke server secara aman di latar belakang.

### B. Alat Ukur Kamera (Augmented Reality & Visual Calibrator)
Sebuah utilitas inovatif guna mempermudah kalkulasi jumlah injeksi anti rayap (SNI 2404). Memiliki dua arsitektur yang beroperasi *seamless*:

1. **Mode 3D WebXR (AR Camera):**
   *Smartphone* modern akan membuka kamera belakang, mendeteksi permukaan lantai dan dinding, dan memproyeksikan Cincin (Reticle). Jarak dikalkulasi dan garis virtual dirender tepat di layar ponsel.
   
2. **Mode Cadangan Anotasi Foto (Smart Fallback):**
   Sistem penopang bagi perangkat yang tidak mendukung AR (tanpa sensor *LiDAR/ToF*). 
   `EXECUTOR` memotret dinding secara datar, menggambar 1 garis sebagai kalibrasi (misal, menginput secara manual bahwa panjang dinding dari pintu ke sudut pilar adalah "4 Meter"). Segala garis tambahan yang ditarik teknisi selanjutnya akan diproporsikan secara matematis sesuai *pixel density* rasio tersebut. Kalkulator HUD (*Head-Up Display*) akan mengekstrak **Total Meter Lari (m')**, **Perkiraan Titik Bor**, dan **Total Kebutuhan Cairan Kimia**.

---
*Dokumentasi Sistem — Diperbarui pada fase implementasi final FieldWork V2.*