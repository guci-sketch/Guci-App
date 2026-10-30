# Dokumentasi Fungsional — FieldWork App V2

Dokumen ini memuat panduan fungsional fitur utama dalam sistem yang dapat digunakan oleh pengguna tanpa memaparkan data sensitif terkait kredensial maupun rahasia koneksi basis data.

---

## 1. Peta Peran Pengguna (6-Role SaaS Hierarchy)

Sistem menerapkan kontrol akses berbasis peran yang ketat (*Strict RBAC*) terverifikasi pada level API dan UI:

1. **MASTER_SUPER_ADMIN (Owner SaaS Platform)**
   - Mengelola entitas multi-perusahaan/tenant dan token aktivasi admin.

2. **SUPERADMIN (Direktur Utama / Eksekutif)**
   - Memiliki wewenang eksklusif melihat **Analisis Untung Rugi Proyek & Margin Keuntungan Chemical** per ID Proyek.
   - Approval penawaran resmi, pemantauan seluruh surveyor marketing, dan konfigurasi legal/Kop Surat/TTD.

3. **ADMIN (Admin Operasional Perusahaan)**
   - Mengelola penugasan SPK, audit kehadiran teknisi, verifikasi anomali geofence, dan template operasional.
   - Meninjau alokasi chemical gudang tanpa akses ke margin laba/rugi sensitif direktur.

4. **MARKETING (Surveyor & Sales Specialist)**
   - Membuat draft penawaran (*Quotation Dual-Stage* `GP-DRF` ke Nomor Surat Resmi `GP/AR/...` atau `GP/PCO/...`).
   - Akses **Visual Performa Bulanan (MoM) Terisolasi**: Staf marketing hanya dapat memantau rasio closing deal dan volume quotation miliknya sendiri (data staf lain tersembunyi), lengkap dengan breakdown kategori **Anti Rayap (Termite Control)** dan **Pest Control (PCO)**.

5. **INVENTORY (Staf Gudang & Logistik Chemical)**
   - Mengelola stok bahan kimia, alat, dan perangkap.
   - Mencatat alokasi kuantitas fisik chemical (Botol/Liter) ke masing-masing ID Proyek. Seluruh nominal nilai kontrak, biaya HPP, dan margin keuntungan diproteksi khusus Direktur.

6. **TEKNISI_LAPANGAN (Executor Lapangan)**
   - Antarmuka mobile-first PWA dengan navigasi *Dynamic Island Floating Pill*.
   - Melakukan GPS Check-in/out, melampirkan foto bukti WebP, pencatatan dosis chemical (SNI 2404), dan kalibrator kamera AR.

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

## 4. Modul Visual Performa Bulanan (Marketing MoM Analytics)

Modul analitik performa berbasis *Month-over-Month* (MoM) yang dirancang khusus menjaga privasi antar-staf:
- **Data Isolation per Marketing:** Akun login dengan role `MARKETING` hanya dapat melihat quotation dan rasio closing yang dibuat oleh dirinya sendiri.
- **Breakdown Kategori Spesifik:**
  - **Anti Rayap (Termite Control):** Menampilkan total quotation AR, jumlah deal, persentase konversi deal (`deal %`), total nilai deal (Rp), dan selisih MoM dibanding bulan sebelumnya.
  - **Pest Control (PCO):** Menampilkan total quotation pest control, jumlah deal, persentase konversi deal (`deal %`), total nilai deal (Rp), dan selisih MoM.
  - **Total Deal:** Akumulasi rasio closing deal keseluruhan dan perbandingan terhadap target benchmark bulanan.
- **Kartu Tim Surveyor:** Hanya menampilkan kartu pencapaian pribadi untuk marketing; sedangkan Direktur dan Admin dapat memantau seluruh anggota tim dan mengatur target bulanan.

---

## 5. Keamanan & Proteksi Keuntungan Chemical (Director-Only)

- **Akses Terbatas:** Kolom finansial Nilai Kontrak, Biaya HPP Chemical & Operasional, Estimasi Untung/Rugi (Rp), dan Margin (%) per ID Proyek di `InventoryPage` dilindungi secara eksklusif untuk Direktur (`SUPERADMIN`, `MASTER_SUPER_ADMIN`, dan tim direksi Izumi & Ayling).
- **Pemisahan Tugas Gudang:** Staf gudang (`INVENTORY`) dan Admin operasional tetap dapat mencatat alokasi pemakaian fisik bahan kimia ke ID Proyek, namun nilai finansial dilindungi oleh badge `🔒 Khusus Direktur`.
- **Isolasi Role:** Role `MARKETING` dibatasi dan tidak memiliki akses ke modul stok gudang internal.

---

## 6. Optimasi Responsivitas Mobile & Tablet (Keyboard Shield)

- **Virtual Keyboard Shield:** Terintegrasi hook `useVirtualKeyboard` berbasis `window.visualViewport`. Navigasi melayang otomatis disembunyikan saat keyboard virtual terbuka.
- **Global Auto-Scroll Centering:** Setiap elemen formulir (`input`, `textarea`, `select`) yang menerima fokus otomatis bergeser ke tengah layar (`block: 'center'`) sehingga tidak pernah tertutup keyboard di Android dan iOS.
- **Anti-Zoom Safari:** Standardisasi ukuran font input minimal 16px dan clearance scroll bawah `scroll-padding-bottom: 20rem`.
- **Dynamic Island Navigation:** Menggunakan kapsul melayang tengah bawah (`fixed bottom-5 left-1/2 -translate-x-1/2`) dengan spring physics Framer Motion.
---

## 7. Kebijakan Otorisasi Unduh Penawaran (Marketing Preview Lockdown)

Guna melindungi integritas dan validitas komersial perusahaan:
1. **Status Draft (`GP-DRF`):**
   - Staf `MARKETING` **DILARANG MENGUNDUH (DOWNLOAD)** berkas PDF penawaran yang belum disetujui.
   - Dokumen draft hanya dapat dilihat melalui **Pratinjau Terbatas (Preview Saja)** dengan watermark diagonal: `DRAFT - BELUM DI-ACC DIREKTUR / ADMIN`.
   - Tindakan ini mencegah penawaran yang belum divalidasi harga/garansinya terkirim secara prematur ke klien.
2. **Status Disetujui (Nomor Surat Resmi):**
   - Setelah Admin atau Direktur melakukan peninjauan dan menekan tombol **Setujui (Approve)**, kode `-DRF` otomatis dihapus sehingga nomor surat langsung menjadi format resmi kategori (`GP/AR/PH/...` atau `GP/PCO/PH/...` tanpa kode `APR`).
   - Tombol **Unduh PDF Resmi** dan **Kirim WhatsApp** terbuka secara otomatis bagi Marketing dan Admin.

---

## 8. Standar Anti-Cluttering Penyesuaian Penawaran (`QuotationEditPage`)

- **Zero Data Overlap:** Baris item pekerjaan, rumus kalkulasi ukuran (mis. `37+37+5,5 = 99.5 m¹`), dan harga satuan disusun dalam kisi kartu mandiri berjarak lega.
- **Single Outer Container:** Seluruh rincian finansial (Subtotal, Diskon Upah, PPN 12% DPP Nilai Lain, dan Total Final) tertata rapi tanpa tumpukan kotak ganda (*nested card clutter*).
- **Integrasi Data Learning 64 Berkas PDF:**
  - Mengadopsi 5 template resmi dari folder `Data Penawaran/Contoh Penawaran`: Pra-Konstruksi Pipa (8 Hal), Pasca-Konstruksi Sloof & Plafon (4 Hal), Rodent Puskesmas (4 Hal), BOQ Korporat PLN (3 Hal), dan Jadwal Fogging 12 Bulan (1 Hal).

---

## 9. Fitur Efisiensi Operasional (Bulk Import & Penjadwalan Rutin)

Untuk mendukung efektivitas dan efisiensi penginputan data massal:
1. **Bulk Import Data Pelanggan (`CustomersPage`):**
   - **Pratinjau Tabel Interaktif:** Pengguna dapat meninjau seluruh baris data sebelum disimpan ke database.
   - **Deteksi Duplikat Cerdas:** Sistem memvalidasi nama pelanggan yang sudah ada di database dan menandainya dengan badge peringatan kuning agar tidak terjadi redundansi.
   - **Template Excel Siap Pakai:** Dilengkapi contoh format pengisian yang valid.
2. **Bulk Import Multi-Sheet Inventaris Gudang (`InventoryPage`):**
   - **Struktur 5 Kategori:** Template Excel terdiri dari 5 sheet terpisah (*Obat & Chemical*, *Alat Proyek*, *Perangkap & Sanitation*, *Pipa & Aksesoris*, *Sparepart*).
   - **Validasi Nilai & Stok:** Mencegah stok negatif dan format angka yang tidak valid.
   - **Pratinjau Sebelum Simpan:** Tabel ringkasan menampilkan status baris (*OK*, *Duplikat*, atau *Error*).
3. **Penjadwalan Rutin SPK / Work Order (`SPKPage`):**
   - **Drafter & Admin Quick Setup:** Pengaturan jadwal pengerjaan berulang (harian, mingguan, bulanan) langsung dari sistem tanpa perlu import file manual.
   - **Rotasi Teknisi Otomatis:** Mendukung penugasan multi-teknisi dengan pembagian tugas berurutan (*round-robin*) pada setiap tanggal kunjungan.
   - **Pratinjau Jadwal:** Menampilkan tanggal pengerjaan dan teknisi penanggung jawab sebelum konfirmasi massal.

---

## 10. Standarisasi Format Nomor Surat Resmi (Peniadaan Kode APR)

Format nomor surat diatur secara ketat tanpa kode sementara `APR`:
- **Saat Draft:** Memuat penanda draft `DRF`, contoh: `GP-DRF/AR/PH/YYYY/MM/NNNN` atau `GP-DRF/PCO/PH/YYYY/MM/NNNN`.
- **Saat Disetujui (Approved):** Kode `-DRF` langsung dihilangkan dan langsung mengadopsi kode kategori penawaran, contoh: `GP/AR/PH/YYYY/MM/NNNN` (Anti Rayap) atau `GP/PCO/PH/YYYY/MM/NNNN` (Pest Control).

---
*Dokumentasi Sistem — Diperbarui pada rilis Phase 7 FieldWork V2.*