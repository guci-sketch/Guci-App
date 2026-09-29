/**
 * Konfigurasi Quotation PT Guci Emas Pratama
 */

import type { JenisLayanan, KategoriSurat } from "../types";

export const COMPANY = {
    name: "PT GUCI EMAS PRATAMA",
    head: "Jln. Ganda Sasmita No.1 Serua, Ciputat - Tangerang Selatan 15414",
    telp: "(021) 74637054",
    wa: "0817 0795 959",
    email: "info@gucimaspratama.co.id",
    web: "www.gucimaspratama.co.id",
    branch: "Pondok Trosobo Indah Blok I No.3, Sidoarjo - Jawa Timur. Telp : (031) 70235866",
} as const;

export const BRAND = {
    green: "#1a5c38",
    greenLight: "#e8f4ed",
    greenMid: "#2d7a4f",
    dark: "#1a1a1a",
    gray: "#555555",
    grayLight: "#888888",
    border: "#cccccc",
    tableHeader: "#2d7a4f",
    tableAlt: "#f2f8f5",
    totalBg: "#1a5c38",
} as const;

export interface LayananConfig {
    label: string;
    kategori: KategoriSurat;
    perihal: string;
    isAR: boolean;
}

/**
 * PERUBAHAN: Fumigasi dipindah ke Anti Rayap (AR).
 * Fumigasi menarget rayap kayu & struktur bangunan, sehingga
 * secara teknis & bisnis masuk kategori Anti Rayap, bukan Pest Control.
 */
export const LAYANAN_CONFIG: Record<JenisLayanan, LayananConfig> = {
    // ── Anti Rayap ────────────────────────────────────────────────────────────
    anti_rayap_injeksi:    { label: "Anti Rayap — Injeksi",         kategori: "AR",  perihal: "Penawaran Harga Anti Rayap",               isAR: true  },
    anti_rayap_pipanisasi: { label: "Anti Rayap — Pipanisasi",      kategori: "AR",  perihal: "Penawaran Harga Anti Rayap",               isAR: true  },
    anti_rayap_baiting:    { label: "Anti Rayap — Baiting System",  kategori: "AR",  perihal: "Penawaran Harga Anti Rayap",               isAR: true  },
    anti_rayap_soil:       { label: "Anti Rayap — Soil",            kategori: "AR",  perihal: "Penawaran Harga Anti Rayap",               isAR: true  },
    anti_rayap_fumigasi:   { label: "Anti Rayap — Fumigasi",        kategori: "AR",  perihal: "Penawaran Harga Fumigasi Anti Rayap",      isAR: true  },
    // ── Pest Control ──────────────────────────────────────────────────────────
    pest_spraying:         { label: "Pest Control — Spraying",      kategori: "PCO", perihal: "Penawaran Harga Pest Control",             isAR: false },
    pest_fogging:          { label: "Pest Control — Fogging/ULV",   kategori: "PCO", perihal: "Penawaran Harga Pest Control (Fogging)",   isAR: false },
    pest_rodent:           { label: "Pest Control — Rodent Control",kategori: "PCO", perihal: "Penawaran Harga Rodent Control",           isAR: false },
    pest_baiting:          { label: "Pest Control — Baiting",       kategori: "PCO", perihal: "Penawaran Harga Pest Control",             isAR: false },
    pest_umum:             { label: "Pest Control — General",       kategori: "PCO", perihal: "Penawaran Harga Jasa Pengendalian Hama",   isAR: false },
};

export const KONDISI_BANGUNAN_LABELS: Record<string, string> = {
    pasca_konstruksi: "Pasca-Konstruksi",
    pra_konstruksi:   "Pra-Konstruksi",
    renovasi:         "Renovasi",
};

export const TIPE_LABELS: Record<string, string> = {
    U: "Umum",
    K: "Kontrak",
};

export function buildNomorSurat(
    kategori: KategoriSurat,
    tipe: string,
    yyyy: string,
    mm: string,
    seq: number,
): string {
    return `GP-${kategori}/${tipe}/${yyyy}/${mm}/${String(seq).padStart(4, "0")}`;
}

export const KATEGORI_LABELS: Record<string, string> = {
    AR: "Anti Rayap",
    PCO: "Pest Control",
};

export function fmtIDR(amount: number): string {
    return "Rp " + Math.round(amount).toLocaleString("id-ID");
}

export function fmtDateID(d: Date): string {
    return d.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });
}

export function isAntiRayap(jenisLayanan: JenisLayanan): boolean {
    return LAYANAN_CONFIG[jenisLayanan]?.isAR ?? false;
}

export function buildParagrafPembuka(
    jenisLayanan: JenisLayanan,
    kepadaNama: string,
    alamat: string,
): string {
    if (isAntiRayap(jenisLayanan)) {
        return alamat
            ? `Kami ucapkan terima kasih telah memberikan kesempatan kepada kami PT Guci Emas Pratama untuk melakukan survey dan memberikan penawaran untuk pekerjaan Jasa Anti Rayap pada bangunan yang berlokasi di ${alamat}.`
            : `Kami ucapkan terima kasih telah memberikan kesempatan kepada kami PT Guci Emas Pratama untuk melakukan survey dan memberikan penawaran untuk pekerjaan Jasa Anti Rayap.`;
    } else {
        return `Terima kasih atas kesempatan yang diberikan kepada kami PT Guci Emas Pratama untuk mengajukan surat penawaran harga Jasa Pengendalian Hama (Pest Control) untuk ${kepadaNama}` +
            (alamat ? ` yang beralamat di ${alamat}.` : `.`);
    }
}

export function calcTotals(params: {
    items: { qty: number; harga: number }[];
    biayaTambahan?: { amount: number }[];
    diskonPct?: number;
    ppn?: boolean;
    ppnDppFaktor?: number;
}) {
    const { items, biayaTambahan = [], diskonPct = 0, ppn = false, ppnDppFaktor } = params;

    const subtotal = items.reduce((s, i) => s + i.qty * i.harga, 0);
    const biayaExtra = biayaTambahan.reduce((s, b) => s + b.amount, 0);
    const subtotalGross = subtotal + biayaExtra;
    const diskonRp = subtotalGross * diskonPct / 100;
    const setelahDiskon = subtotalGross - diskonRp;

    let dpp: number | null = null;
    let ppnRp = 0;

    if (ppn) {
        if (ppnDppFaktor) {
            dpp = setelahDiskon * ppnDppFaktor;
            ppnRp = dpp * 0.12;
        } else {
            ppnRp = setelahDiskon * 0.11;
        }
    }

    return {
        subtotal,
        biayaExtra,
        subtotalGross,
        diskonPct,
        diskonRp,
        setelahDiskon,
        dpp,
        ppnRp,
        total: setelahDiskon + ppnRp,
    };
}

export function angkaKeKata(n: number): string {
    const m: Record<number, string> = {
        1: "satu", 2: "dua", 3: "tiga", 4: "empat", 5: "lima",
        6: "enam", 7: "tujuh", 8: "delapan", 9: "sembilan", 10: "sepuluh",
    };
    return m[n] ?? String(n);
}