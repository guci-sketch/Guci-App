# Skema Pembayaran Kontrak Proyek — Anti Rayap (AR) & Pest Control (PCO)
**Platform Operasional & Komersial PT Guci Emas Pratama**  
*Dokumentasi Arsitektur Pembayaran, Termin, dan Siklus Penagihan Piutang Proyek*

---

## 🧭 Ringkasan Eksekutif & Karakteristik Kontrak

Dalam proses bisnis PT Guci Emas Pratama, pengelolaan pembayaran proyek terbagi tegas berdasarkan 2 kategori utama:

```
                     ┌─────────────────────────────────────────────────────────┐
                     │          KONTRAK PENAWARAN HARGA DEAL (QUOTATION)       │
                     └────────────────────────────┬────────────────────────────┘
                                                  │
                    ┌─────────────────────────────┴─────────────────────────────┐
                    ▼                                                           ▼
       [KATEGORI ANTI RAYAP (AR)]                                  [KATEGORI PEST CONTROL (PCO)]
     Model: 2 Termin (Pekerjaan Fisik)                           Model: Kontrak Berkala 1 Tahun (12 Bln)
 ┌───────────────────────────────────────┐                   ┌──────────────────────────────────────────┐
 │ • Termin 1 (DP):                      │                   │ • Durasi Standar: 12 Bulan (1 Tahun)     │
 │   - Default: 50% Kontrak              │                   │ • Nilai Flat Sama Rata Setiap Bulan:     │
 │   - Fleksibel: Kustom % atau Nominal  │                   │   Nominal/Bulan = Total Kontrak / 12     │
 │ • Termin 2 (Pelunasan):               │                   │ • Penanganan Selisih Pembulatan (Sisa Rp)│
 │   - Sisa Kontrak (Total - DP)         │                   │ • Tanggal Jatuh Tempo Berulang Bulanan   │
 │   - Dibayar setelah pengerjaan selesai│                   │ • Pemantauan Status: Lunas / Nunggak     │
 └───────────────────────────────────────┘                   └──────────────────────────────────────────┘
```

---

## 🐜 1. Skema Pembayaran Anti Rayap (AR — 2 Termin)

Layanan Anti Rayap (Pra-Konstruksi, Pasca-Konstruksi, Pipanisasi, dan Retreatment) berbasis **proyek fisik** dengan garansi sertifikat 1 s/d 5 tahun.

### Aturan Bisnis & Mekanisme Termin:
1. **Termin 1 — Uang Muka (Down Payment / DP):**
   - **Nilai Bawaan (*Default*):** **50%** dari total nilai kontrak (sesuai klausul baku `PEMBAYARAN_AR_DUA_TAHAP`).
   - **Fleksibilitas Kustom (*Random DP*):** Klien dapat menegosiasikan DP acak, baik dalam bentuk **Persentase** (mis. 20%, 30%, 40%) maupun **Nominal Rupiah Bulat** (mis. DP Rp 2.500.000 dari total kontrak Rp 6.000.000).
   - **Jatuh Tempo:** Ditagihkan sebelum teknisi memulai tindakan fisik di lapangan (pengeboran/injeksi/pipanisasi).
2. **Termin 2 — Pelunasan:**
   - **Nominal:** Otomatis dihitung dari sisa kontrak: $\text{Nominal Pelunasan} = \text{Total Kontrak} - \text{Nominal DP}$.
   - **Persentase:** Otomatis menyesuaikan: $100\% - \%\text{DP}$.
   - **Jatuh Tempo:** Ditagihkan setelah seluruh aplikasi perlakuan anti rayap di lapangan selesai dan Berita Acara Pekerjaan ditandatangani oleh pelanggan.
3. **Integritas Monotonik:**
   - Pembayaran Pelunasan tidak dapat ditandai lunas sebelum DP terbayar (kecuali klien melakukan pembayaran langsung 100% di awal).

---

## 🪳 2. Skema Pembayaran Pest Control (PCO — Cicilan Bulanan 1 Tahun)

Layanan Pest Control & Rodent Control (Pengendalian Serangga & Tikus) berbasis **pemeliharaan berkala berulang (*recurring*)**.

### Aturan Bisnis & Mekanisme Cicilan:
1. **Durasi Standar Kontrak:** **1 Tahun Penuh (12 Bulan)**.
   - Pilihan durasi lain (3, 6, 24 bulan) tetap didukung untuk kontrak adendum khusus.
2. **Nominal Sama Rata Setiap Bulan (*Flat Rate*):**
   - Setiap bulannya klien menerima tagihan dengan nilai yang sama persis:
     $$\text{Nominal Pokok Bulanan} = \left\lfloor \frac{\text{Total Kontrak}}{\text{Durasi Bulan}} \right\rfloor$$
3. **Penanganan Pembulatan Rupiah (*Zero-Loss Rounding*):**
   - Jika pembagian menghasilkan angka pecahan (contoh: Rp 10.000.000 / 12 = Rp 833.333,33):
     - Bulan 1 s/d Bulan 11: Ditagihkan Rp 833.333 per bulan.
     - Bulan ke-12: Menampung sisa pembulatan rupiah agar total 12 bulan tepat Rp 10.000.000:
       $$\text{Nominal Bulan 12} = \text{Nominal Pokok} + (\text{Total Kontrak} - (\text{Nominal Pokok} \times \text{Durasi}))$$
4. **Jatuh Tempo Berulang:**
   - Jatuh tempo diatur pada tanggal yang sama setiap bulannya (default: tanggal 1 atau tanggal kesepakatan kontrak).

---

## 📊 3. Status Pembayaran & Deteksi Otomatis

Status pembayaran dikalkulasi secara deterministik dari tanggal hari ini dan data riil pembayaran:

| Status Pembayaran | Kondisi pada Anti Rayap (AR) | Kondisi pada Pest Control (PCO) | Indikator Visual |
| :--- | :--- | :--- | :--- |
| **`belum_bayar`** | DP belum dibayar & belum melewati tanggal jatuh tempo | Belum ada cicilan yang dibayar & belum ada cicilan yang jatuh tempo | Badge Merah Muda |
| **`dp`** | DP sudah lunas dibayar, pelunasan belum dibayar | 1 atau beberapa bulan cicilan sudah dibayar (pembayaran bertahap) | Badge Kuning / Oranye |
| **`lunas`** | DP dan Pelunasan telah lunas 100% | Seluruh 12 bulan cicilan telah lunas 100% | Badge Hijau Emerald |
| **`nunggak`** | Melewati tanggal jatuh tempo DP/Pelunasan tanpa pelunasan | Ada minimal 1 bulan cicilan yang belum dibayar melewati tanggal jatuh tempo | Badge Ungu |

---

## 🛠️ 4. Spesifikasi Skema Data TypeScript (`OrderTracking`)

```typescript
export interface TerminDetailAR {
  nominal: number;
  persentase: number;
  tanggalJatuhTempo?: Date;
  dibayar: boolean;
  tanggalBayar?: Date;
  metodeBayar?: string;
  catatan?: string;
}

export interface SkemaPembayaranAR {
  modeDP: "PERSENTASE" | "NOMINAL_KUSTOM";
  nilaiInputDP: number;
  dp: TerminDetailAR;
  pelunasan: TerminDetailAR;
}

export interface CicilanBulanPCO {
  bulanKe: number;
  labelBulan: string;
  nominal: number;
  tanggalJatuhTempo: Date;
  dibayar: boolean;
  tanggalBayar?: Date;
  catatan?: string;
}

export interface SkemaPembayaranPCO {
  durasiKontrakBulan: number;      // 12 Bulan
  tanggalMulaiKontrak: Date;
  tanggalSelesaiKontrak: Date;
  hariJatuhTempoTiapBulan: number;
  nominalPerBulan: number;
  cicilan: CicilanBulanPCO[];
}
```

---

## 🛡️ 5. Invariant Gatekeeper (Izumi Gatekeeper)

1. **INV-PAY-01:** $\text{Nominal DP} + \text{Nominal Pelunasan} \equiv \text{Total Kontrak}$ (Zero-loss).
2. **INV-PAY-02:** $0 \le \text{Nominal DP} \le \text{Total Kontrak}$ (Batas non-negatif).
3. **INV-PAY-03:** $\sum_{i=1}^{12} \text{Cicilan}_i \equiv \text{Total Kontrak}$ (Presisi pembulatan 100%).
4. **INV-PAY-04:** Kalender 12 bulan mengakomodasi jumlah hari dinamis (28/29/30/31) dan pergantian tahun.
5. **INV-PAY-05:** Pelunasan terkunci sebelum DP diselesaikan.
6. **INV-PAY-06:** Deteksi nunggak otomatis memicu badge ungu pada Tracking Card dan dashboard ringkasan.
