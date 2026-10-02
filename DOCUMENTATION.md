# Dokumentasi Fungsional — FieldWork App V2

Dokumen ini memuat panduan fungsional fitur utama dalam sistem yang dapat digunakan oleh pengguna tanpa memaparkan data sensitif terkait konfigurasi sistem basis data produksi.

---

## 1. Peta Peran Pengguna (User Roles)

Sistem membagi aksesibilitas modul berdasarkan lapisan (*layer*) peran berikut:
- **SUPERADMIN / ADMIN:** Mengelola dasbor pusat (Monitoring), Penawaran Harga (*Quotation*), SPK, persetujuan aktivitas teknisi, *Bulk Import*, serta penyesuaian regulasi (rasio harga & batas stok).
- **TEKNISI LAPANGAN:** Akses _mobile-first_ (PWA) menuju pekerjaan aktif, menggunakan kamera GPS, dan melakukan pelaporan bukti pekerjaan, foto sebelum/sesudah, dan alat ukur bangunan.
- **MARKETING:** Mengelola prospek Klien, menyusun dan mengirimkan draf Surat Penawaran Harga (*Quotation*) dan melacak konversi SPK.

---

## 2. Modul Dasbor Utama (Admin)

### A. Navigasi Hierarki Tab (Framer Motion)
Seluruh rute manajerial dibungkus ke dalam *sidebar* yang dikelompokkan:
1. **Dasbor Utama:** Pantauan harian (*Key Performance Indicators*), Peta Pelacakan GPS, Penugasan SPK aktif.
2. **Komersial & Gudang:** Akses ke Surat Penawaran Harga (PDF), manajemen keluar-masuk Stok Inventaris Gudang, serta Garansi *Termite Control* (Anti Rayap).
3. **Audit & Eksekusi:** Meninjau daftar *Laporan Lapangan* yang dikirim dari _device_ teknisi, Laporan Anomali, dan Performa Teknisi.

### B. Bulk Import Ekosistem (Excel)
Admin tidak perlu menginput ratusan inventaris/klien satu per satu.
- **Cara Kerja:** Pada layar Inventaris atau Klien, Admin dapat mengklik **Unduh Template (Excel)**. Setelah dilengkapi, unggah kembali via **Import Bulk**.
- **Kecerdasan Sistem:** Baris/isian yang dikosongkan (*blank cell*) di Excel akan ditambal secara aman oleh sistem ke bentuk standar (seperti "Tanpa Nama" atau nilai "0"), mencegah kerusakan basis data.

### C. Ekspor Data Tabulasi
Setiap tabel pelaporan dilengkapi utilitas pemrosesan dokumen.
- **Unduh PDF:** Laporan dicetak menggunakan antarmuka grafis yang bersih (*auto-table*).
- **Unduh Excel / CSV:** Mencetak _spreadsheet_ baris (*row*) untuk keperluan integrasi akuntansi perusahaan.

---

## 3. Modul Pekerjaan Lapangan (Teknisi)

### A. Geo-Tracking Presensi (Mode Luring/Offline)
- Ketika teknisi membuka daftar tugas, sistem **secara konstan melacak lokasi satelit** untuk memvalidasi jarak (*radius*) dengan rumah/gedung klien.
- **Cerdas Sinyal:** Jika teknisi masuk ke ruang gudang / basemen yang tidak ada sinyal internet, absensi koordinat **tidak ditolak**, melainkan "dibungkus" di _cache_ _browser_. Begitu teknisi menemukan jaringan internet di luar bangunan, riwayat antrean lokasi (*offline queue*) akan disinkronkan langsung ke layar Peta Admin.

### B. Alat Ukur Kamera (AR & Kalibrasi Foto)
Teknisi difasilitasi alat ukur tembok/ruang digital untuk mempercepat kalkulasi kebutuhan liter bahan kimia (SNI 2404). Sistem memiliki dua lapis keamanan alat:

1. **Mode 3D WebXR (AR Camera):**
   Khusus *smartphone* mutakhir, sebuah **Cincin Hijau (Reticle)** akan menempel di atas lantai/tembok dunia nyata. Saat diketuk, akan timbul garis tiga dimensi dan angkanya dikirim langsung ke Dasbor.
   
2. **Mode Cadangan Anotasi Foto (Smart Fallback):**
   Apabila perangkat teknisi (contoh: HP lama atau beberapa perangkat Apple tanpa LiDAR aktif) menolak AR, sistem otomatis membuka mode **Mode Foto**.
   - Teknisi cukup **Memotret Dinding**, menarik **Satu Garis Kalibrasi** dan memasukkan angka dari _meteran fisik_ (misal: "5 Meter").
   - Selanjutnya, setiap garis yang digambar ulang di atas foto tersebut akan otomatis beradaptasi (menghitung sendiri panjang aslinya) sesuai skala *pixel* bangunan tersebut.
   - Layar _head-up_ (HUD) otomatis mengalkulasi **Total Meter Lari (m')**, **Banyaknya Lubang Bor**, dan **Total Liter Obat**.
   
### C. Penamaan B2B Bebas Istilah Hama Konvensional
Seluruh modul _frontend_, lembar ceklis dan sistem PDF Generator Klien telah dicuci bersih dari referensi kosakata vulgar seperti 'Tikus', 'Kecoa', dsb. 
Terminologi telah distandarkan ke kosa kata Komersial korporat (*Rodentia, Serangga Merayap / Crawling Insects, Fokus Target, Termitisida*).

---
*Dokumentasi Sistem — Diperbarui untuk FieldWork App V2*
