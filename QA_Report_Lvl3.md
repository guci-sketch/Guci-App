# Laporan QA Testing - Skenario Level 3 (Integrasi Maker-Checker)

**Target:** Validasi isu kritikal konkurensi dan batasan role (ISS-01, ISS-02, ISS-03, ISS-07).
**Status Aplikasi:** Isu terkonfirmasi `Belum fix` pada `CLAUDE.md`.

---

## Skenario 1: Race Condition OUT (ISS-01, ISS-02)
- **Tujuan:** Validasi race condition pada update stok.
- **Kondisi Awal:** Stok barang `15`.
- **Aksi:** 
  1. Pencatat A request OUT `10`.
  2. Pencatat B request OUT `10`.
  3. Pengawas approve A, lalu approve B.
- **Hasil Aktual:** Approve B sukses. Stok menjadi `-5` (negatif).
- **Status:** ❌ **FAIL**. Update stok non-atomik dan terdapat *stale stock value* (TOCTOU).

## Skenario 2: Double Approval (ISS-03)
- **Tujuan:** Validasi sistem terhadap *double-approval*.
- **Kondisi Awal:** 1 log berstatus `PENDING`.
- **Aksi:** 2 Pengawas menekan tombol Approve secara bersamaan pada log yang sama.
- **Hasil Aktual:** Keduanya berhasil melakukan approve. Stok terpotong 2 kali.
- **Status:** ❌ **FAIL**. Tidak ada re-check status log di sisi server sebelum update.

## Skenario 3: Validasi Stale Data di Form OUT (ISS-07)
- **Tujuan:** Mencegah request barang keluar melebihi stok akibat *stale data* di klien.
- **Kondisi Awal:** Stok barang `10`.
- **Aksi:** 
  1. Pencatat A membuka form OUT.
  2. Transaksi lain disetujui, stok turun menjadi `5`.
  3. Pencatat A submit OUT `8` dari form.
- **Hasil Aktual:** Request OUT `8` berhasil masuk menjadi log `PENDING`.
- **Status:** ❌ **FAIL**. Validasi limitasi stok hanya terjadi di UI dengan data lama (stale data).

## Skenario 4: Eskalasi Privilege 
- **Tujuan:** Memastikan Pencatat tidak dapat mengakses API/UI Pengawas.
- **Kondisi Awal:** Login sebagai `pencatat`.
- **Aksi:** Mengakses rute `/pengawas/approval` atau melakukan request API `update` pada tabel `inventory_logs` (status).
- **Hasil Aktual:** Rute UI redirect ke `/pencatat`. Akses API DB (Supabase) terhadap tabel log ditolak oleh RLS.
- **Status:** ✅ **PASS**. Proteksi rute (`RoleGuard`) dan Supabase RLS berfungsi.

## Skenario 5: Update Kuantitas oleh Pengawas
- **Tujuan:** Validasi koreksi kuantitas dan pencatatan log.
- **Kondisi Awal:** Request IN `100`.
- **Aksi:** Pengawas mengubah kuantitas menjadi `50`, lalu Approve.
- **Hasil Aktual:** Kuantitas tersimpan, stok bertambah `50`. Audit trail tidak mencatat nilai awal `100`.
- **Status:** ❌ **FAIL**. Perubahan kuantitas berhasil namun riwayat koreksi (*audit trail*) hilang (terkait ISS-17).

---
**Kesimpulan:** Infrastruktur database membutuhkan perbaikan struktur kueri (transaksi atomik, validasi row-level sebelum commit) untuk memperbaiki celah kritikal pada alur Maker-Checker.