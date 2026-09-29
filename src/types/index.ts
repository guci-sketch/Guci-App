export type UserRole =
    | "super_admin"
    | "administrator"
    | "admin_ops"
    | "marketing"
    | "teknisi";

export interface AppUser {
    uid: string;
    email: string;
    name: string;
    role: UserRole;
    companyId: string;
    avatar?: string;
    isActive: boolean;
    wa?: string;
    jabatan?: string;
}

export interface Company {
    id: string;
    name: string;
    isActive: boolean;
    plan: "free" | "pro";
    expiredAt?: Date;
}

export interface Customer {
    id: string;
    name: string;
    phone: string;
    company?: string;
    address?: string;
    email?: string;
    pic?: string;
    source: "manual_quick" | "import";
    createdBy: string;
    lastServiceDate?: Date;
    totalProjects: number;
    companyId: string;
    createdAt: Date;
}

export type QuotationStatus = "draft" | "pending" | "approved" | "rejected" | "sent_to_client" | "deal" | "cancelled";
export type ServiceType = "pest_control" | "anti_rayap";
export type ServiceMethod =
    | "spraying"
    | "fogging"
    | "baiting_tikus"
    | "injeksi"
    | "pipanisasi"
    | "baiting_system";

// ─── QUOTATION MODULE TYPES ───────────────────────────────────────────────────

export type JenisLayanan =
    | "anti_rayap_injeksi"
    | "anti_rayap_pipanisasi"
    | "anti_rayap_baiting"
    | "anti_rayap_soil"
    | "anti_rayap_fumigasi"
    | "pest_spraying"
    | "pest_fogging"
    | "pest_rodent"
    | "pest_baiting"
    | "pest_umum"
;

export type KondisiBangunan = "pasca_konstruksi" | "pra_konstruksi" | "renovasi" | null;

export type TipeKontrak = "U" | "K" | "PH";
export type KategoriSurat = "AR" | "PCO";

export interface QuotationItem {
    desc: string;
    qty: number;
    unit: string;
    harga: number;
}

export interface BiayaTambahan {
    label: string;
    amount: number;
}

// ── Survey & Technical Data ───────────────────────────────────────────────────

export interface SurveyPhoto {
    base64: string;
    caption?: string;
}

export interface ChemicalItem {
    bahanAktif: string;
    merkDagang: string;
}

export const DEFAULT_CHEMICALS_AR: ChemicalItem[] = [
    { bahanAktif: "Cypermethrin", merkDagang: "Cypergard 100 EC" },
    { bahanAktif: "Imidakloprid", merkDagang: "Safe 1 200 SL" },
];

export const DEFAULT_CHEMICALS_PCO: ChemicalItem[] = [
    { bahanAktif: "Cypermethrin + Lambda Cyhalothrin", merkDagang: "Cypergard 100 EC" },
    { bahanAktif: "Lambda Cyhalothrin", merkDagang: "Demand CS" },
    { bahanAktif: "Brodifacum", merkDagang: "Klerat" },
];

export const DEFAULT_HAMA_PCO =
    "Nyamuk, Kecoa, Lalat, Tikus, Ngengat, Kaki Seribu dan Semut";

export const DEFAULT_TEKNIK_PCO = [
    "Penyemprotan pada seluruh area luar bangunan gedung dengan menggunakan swing fog.",
    "Penyemprotan secara residual dengan menggunakan Cold Fogger ULV atau B&G (disesuaikan dengan kondisi lapangan) dilakukan pada: Koridor dan Office.",
    "Penyemprotan secara residual dengan menggunakan B&G (disesuaikan dengan kondisi lapangan) dilakukan pada: Area Luar Bangunan.",
    "Memberikan racun/umpan tikus pada tempat-tempat yang biasa dilalui tikus dan sekeliling luar bangunan dengan menggunakan umpan tikus.",
];

export const METODE_BY_LAYANAN: Record<string, string[]> = {
    anti_rayap_injeksi: [
        "Melakukan pengeboran di setiap sisi pondasi luar dan dalam bangunan dengan jarak 10-15 cm dari dinding bangunan. Jarak antar lubang bor sebesar 30-40 cm dengan kedalaman lubang 30-40 cm.",
        "Melakukan injeksi larutan termitisida pada lubang bor sebanyak 2,5 Liter – 3 Liter.",
        "Menutup lubang bor dengan bahan yang warnanya sama dengan warna lantai.",
        "Melakukan pengeboran, penginjeksian larutan termitisida serta penambalan pada kusen pintu dan jendela.",
        "Melakukan penyemprotan larutan termitisida pada plafon.",
        "Membersihkan bekas pekerjaan anti rayap.",
    ],
    anti_rayap_soil: [
        "Melakukan pengeboran di setiap sisi pondasi luar dan dalam bangunan dengan jarak 10-15 cm dari dinding bangunan. Jarak antar lubang bor sebesar 30-40 cm dengan kedalaman lubang 30-40 cm.",
        "Melakukan injeksi larutan termitisida pada lubang bor sebanyak 2,5 Liter – 3 Liter.",
        "Menutup lubang bor dengan bahan yang warnanya sama dengan warna lantai.",
        "Melakukan pengeboran, penginjeksian larutan termitisida serta penambalan pada kusen pintu dan jendela.",
        "Membersihkan bekas pekerjaan anti rayap.",
    ],
    anti_rayap_pra: [
        "Melakukan pengolahan tanah dengan larutan termitisida menggunakan metode soil treatment sebelum konstruksi dimulai.",
        "Pengaplikasian dilakukan pada seluruh permukaan tanah yang akan dibangun dengan dosis yang sesuai SNI.",
        "Membuat barrier / penghalang kimia di antara tanah dan struktur bangunan.",
        "Membersihkan area setelah pekerjaan selesai.",
    ],
    anti_rayap_pipanisasi: [
        "Pemasangan sistem perpipaan permanen di dalam struktur bangunan.",
        "Larutan termitisida disuntikkan secara berkala melalui pipa yang telah terpasang.",
        "Sistem memungkinkan re-aplikasi tanpa perlu pengeboran ulang.",
        "Membersihkan area setelah pekerjaan selesai.",
    ],
    anti_rayap_baiting: [
        "Pemasangan stasiun umpan (bait station) di sekeliling bangunan dengan jarak 2-3 meter.",
        "Monitoring stasiun umpan secara berkala untuk mendeteksi aktivitas rayap.",
        "Penggantian umpan dengan bahan aktif apabila terdapat aktivitas rayap.",
        "Pencatatan dan pelaporan kondisi setiap stasiun umpan.",
    ],
    anti_rayap_fumigasi: [
        "Penutupan seluruh bangunan/area dengan tenda fumigasi yang kedap udara.",
        "Penginjeksian gas fumigan ke dalam ruang tertutup.",
        "Monitoring konsentrasi gas selama periode fumigasi berlangsung.",
        "Aerasi dan pemastian kadar gas aman sebelum bangunan dapat dihuni kembali.",
        "Pembersihan area setelah pekerjaan selesai.",
    ],
};

export interface NomorSuratLog {
    id: string;
    noSurat: string;
    kategori: KategoriSurat;
    tipe: TipeKontrak;
    tipeLabel: string;
    jenisLayanan: JenisLayanan;
    kepada: string;
    byUid: string;
    byName: string;
    dibuat: Date;
    status: QuotationStatus;
    quoId: string | null;
    companyId: string;
    isManual?: boolean;
    keteranganManual?: string;
}

export interface Quotation {
    id: string;
    noSurat: string;
    kategori: KategoriSurat;
    tipeKontrak: TipeKontrak;
    jenisLayanan: JenisLayanan;
    perihal: string;
    kepadaNama: string;
    kepadaAlamatLines: string[];
    kepadaUp?: string;
    kepadaWa?: string;      // Nomor WhatsApp klien
    tanggal: Date;
    items: QuotationItem[];
    biayaTambahan: BiayaTambahan[];
    diskonPct: number;
    ppn: boolean;
    ppnDppFaktor?: number;
    garansiTahun?: number;
    jenisGaransi?: string;
    subtotal: number;
    diskonRp: number;
    ppnRp: number;
    total: number;
    marketingUid: string;
    marketingNama: string;
    marketingWa?: string;
    status: QuotationStatus;
    rejectionReason?: string;
    approvedBy?: string;
    approvedAt?: Date;
    dealAt?: Date;
    sentToClientAt?: Date;
    pdfUrl?: string;
    pdfBase64?: string;
    signedPdfBase64?: string;
    signedAt?: Date;
    signedBy?: string;
    // Survey & Technical
    surveyPhotos?: SurveyPhoto[];
    chemicals?: ChemicalItem[];
    metode?: string[];          // AR: metode pelaksanaan
    hamaDikendalikan?: string;  // PCO: hama yang dikendalikan
    teknikPelaksanaan?: string[];
    peralatan?: string[];
    kondisiBangunan?: KondisiBangunan; // PCO: teknik pelaksanaan
    companyId: string;
    createdAt: Date;
    notesMarketing?: string;
}

export interface TariffRow {
    service: ServiceType;
    method: ServiceMethod;
    label: string;
    basis: "m2" | "m_linear" | "titik";
    hppRate: number;
    sellRate: number;
}

export interface PricingConfig {
    tariffTable: TariffRow[];
    bbmZones: { zona_a: number; zona_b: number; zona_c: number };
    warrantyMultiplier: { y1: number; y2: number; y3: number };
    marginGuard: { blockBelow: number; warnBelow: number; premiumAbove: number };
}

export interface SPK {
    id: string;
    quotationId: string;
    quotationNoSurat: string;
    customerId: string;
    customerName: string;
    technicianId: string;
    technicianName: string;
    scheduleDate: Date;
    actualStart?: Date;
    actualEnd?: Date;
    durationMin?: number;
    status: "assigned" | "in_progress" | "done";
    gpsStart?: { lat: number; lng: number };
    gpsEnd?: { lat: number; lng: number };
    serviceType: ServiceType;
    perihal: string;
    lokasi: string;
    notes: string;
    companyId: string;
    createdAt: Date;
    createdBy: string;
    createdByName: string;
}

export interface Report {
    id: string;
    spkId: string;
    technicianId: string;
    technicianName: string;
    customerId: string;
    customerName: string;
    serviceType: ServiceType;
    formData: Record<string, unknown>;
    photos: string[];
    submittedAt: Date;
    durationMin: number;
    pdfUrl: string;
    shareToken: string;
    sentToClient: boolean;
    sentAt?: Date;
    companyId: string;
}