import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
    ArrowLeft, ArrowRight, Check, FileText,
    Plus, Trash2, Loader2, AlertCircle,
    Clock, ExternalLink, Hash,
    FileCheck2, Database, ShieldCheck,
    Camera, X, FlaskConical, ChevronDown, ChevronUp, MessageCircle, MapPin,
} from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { commitNomorSurat, previewNomorSurat } from "../../services/nomorSuratService";
import { saveQuotationDraft, getQuotations } from "../../services/quotationService";
import { LAYANAN_CONFIG, calcTotals, fmtIDR, TIPE_LABELS, KONDISI_BANGUNAN_LABELS } from "../../lib/quotationConfig";
import type { JenisLayanan, TipeKontrak, KategoriSurat, QuotationItem, BiayaTambahan, SurveyPhoto, ChemicalItem, KondisiBangunan } from "../../types";
import {
    DEFAULT_CHEMICALS_AR, DEFAULT_CHEMICALS_PCO,
    DEFAULT_HAMA_PCO, DEFAULT_TEKNIK_PCO, METODE_BY_LAYANAN,
} from "../../types";

const STEPS = [
    { label: "Jenis & Tipe" },
    { label: "Data Klien" },
    { label: "Tabel Harga" },
    { label: "Teknis & Foto" },
    { label: "Konfirmasi" },
];

function StepIndicator({ current }: { current: number }) {
    return (
        <div className="flex items-center gap-0 mb-8 mx-auto max-w-lg">
            {STEPS.map((s, i) => (
                <div key={i} className="flex-1 flex flex-col items-center">
                    <div className="flex items-center w-full">
                        <div className={`flex-1 h-0.5 ${i === 0 ? "opacity-0" : i <= current ? "bg-blue-500" : "bg-slate-200"}`} />
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                            ${i < current ? "bg-blue-600 text-white" : i === current ? "bg-blue-600 text-white ring-4 ring-blue-100" : "bg-slate-100 text-slate-400"}`}>
                            {i < current ? <Check size={14} /> : i + 1}
                        </div>
                        <div className={`flex-1 h-0.5 ${i === STEPS.length - 1 ? "opacity-0" : i < current ? "bg-blue-500" : "bg-slate-200"}`} />
                    </div>
                    <span className={`text-xs mt-1.5 font-medium hidden sm:block ${i === current ? "text-blue-600" : i < current ? "text-slate-500" : "text-slate-300"}`}>
                        {s.label}
                    </span>
                    <span className={`text-xs mt-1.5 font-medium sm:hidden ${i === current ? "text-blue-600" : "text-transparent"}`}>
                        {i === current ? s.label : "."}
                    </span>
                </div>
            ))}
        </div>
    );
}

function Field({ label, required, error, hint, children }: {
    label: string; required?: boolean; error?: string; hint?: string; children: React.ReactNode;
}) {
    return (
        <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
                {label}{required && <span className="text-red-500 ml-0.5">*</span>}
            </label>
            {children}
            {hint && <p className="text-[11px] text-slate-400 italic">{hint}</p>}
            {error && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={11} />{error}</p>}
        </div>
    );
}

const inputCls = "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white text-slate-800";

// ─── STEP 1 ───────────────────────────────────────────────────────────────────

function Step1({ jenisLayanan, tipe, kepada, noPreview, kondisiBangunan,
    onLayanan, onTipe, onKepada, onKondisi, errors }: {
    jenisLayanan: JenisLayanan; tipe: TipeKontrak; kepada: string; noPreview: string;
    kondisiBangunan: KondisiBangunan;
    onLayanan: (v: JenisLayanan) => void; onTipe: (v: TipeKontrak) => void;
    onKepada: (v: string) => void;
    onKondisi: (v: KondisiBangunan) => void;
    errors: Record<string, string>;
}) {
    const kategori = LAYANAN_CONFIG[jenisLayanan]?.kategori ?? "PCO";
    const isAR = LAYANAN_CONFIG[jenisLayanan]?.isAR ?? false;
    const isPCO = !isAR;

    const arItems  = Object.entries(LAYANAN_CONFIG).filter(([k, c]) => c.isAR && !k.startsWith("ph_"));
    const pcoItems = Object.entries(LAYANAN_CONFIG).filter(([k, c]) => !c.isAR && !k.startsWith("ph_"));


    const KONDISI_OPTIONS: { val: KondisiBangunan; label: string; desc: string }[] = [
        { val: "pasca_konstruksi", label: "Pasca-Konstruksi", desc: "Bangunan sudah jadi / selesai dibangun" },
        { val: "pra_konstruksi",   label: "Pra-Konstruksi",   desc: "Sebelum konstruksi / tanah belum dibangun" },
        { val: "renovasi",         label: "Renovasi",          desc: "Saat proses renovasi berlangsung" },
    ];

    return (
        <div className="space-y-5">
            <Field label="Jenis Layanan" required error={errors.jenisLayanan}>
                {/* Anti Rayap */}
                <div className="mb-4">
                    <p className="text-xs font-semibold text-purple-600 mb-2 flex items-center gap-1">🛡️ Anti Rayap (AR)</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {arItems.map(([val, cfg]) => {
                            const sel = jenisLayanan === val;
                            return (
                                <button key={val} type="button" onClick={() => onLayanan(val as JenisLayanan)}
                                    className={`px-3 py-2.5 border rounded-lg text-left text-xs transition-all
                                        ${sel ? "border-purple-400 bg-purple-50 text-purple-700 font-semibold ring-1 ring-purple-300" : "border-slate-200 bg-white text-slate-600 hover:border-purple-200 hover:bg-purple-50/40"}`}>
                                    {cfg.label.replace("Anti Rayap — ", "")}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Pest Control */}
                <div className="mb-4">
                    <p className="text-xs font-semibold text-cyan-600 mb-2 flex items-center gap-1">🦟 Pest Control (PCO)</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {pcoItems.map(([val, cfg]) => {
                            const sel = jenisLayanan === val;
                            return (
                                <button key={val} type="button" onClick={() => onLayanan(val as JenisLayanan)}
                                    className={`px-3 py-2.5 border rounded-lg text-left text-xs transition-all
                                        ${sel ? "border-cyan-400 bg-cyan-50 text-cyan-700 font-semibold ring-1 ring-cyan-300" : "border-slate-200 bg-white text-slate-600 hover:border-cyan-200 hover:bg-cyan-50/40"}`}>
                                    {cfg.label.replace("Pest Control — ", "")}
                                </button>
                            );
                        })}
                    </div>
                </div>

            </Field>

            {/* Kondisi Bangunan — hanya untuk AR */}
            {isAR && (
                <Field label="Kondisi Bangunan" hint="Menentukan tipe pekerjaan dan beban kerja">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {KONDISI_OPTIONS.map(opt => {
                            const sel = kondisiBangunan === opt.val;
                            return (
                                <button key={opt.val} type="button"
                                    onClick={() => onKondisi(sel ? null : opt.val)}
                                    className={`px-3 py-3 border rounded-xl text-left transition-all
                                        ${sel ? "border-purple-400 bg-purple-50 ring-1 ring-purple-300" : "border-slate-200 bg-white hover:border-purple-200 hover:bg-purple-50/30"}`}>
                                    <div className={`text-xs font-bold ${sel ? "text-purple-700" : "text-slate-700"}`}>
                                        {opt.val === "pasca_konstruksi" ? "🏢" : opt.val === "pra_konstruksi" ? "🏗️" : "🔨"} {opt.label}
                                    </div>
                                    <div className={`text-[10px] mt-0.5 ${sel ? "text-purple-500" : "text-slate-400"}`}>{opt.desc}</div>
                                </button>
                            );
                        })}
                    </div>
                    {kondisiBangunan && (
                        <p className="text-xs text-purple-600 font-medium mt-1.5">
                            ✓ {KONDISI_OPTIONS.find(o => o.val === kondisiBangunan)?.label} dipilih
                            <button type="button" onClick={() => onKondisi(null)} className="ml-2 text-slate-400 hover:text-red-500">✕ Hapus</button>
                        </p>
                    )}
                </Field>
            )}

            {/* Tipe Surat */}
            <Field label="Tipe Surat" required>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {([
                        { v: "U",  label: "Umum",             desc: "Penawaran biasa / satu kali",    color: "blue"  },
                        { v: "K",  label: "Kontrak",          desc: "Kerjasama berkala / tahunan",    color: "blue"  },
                        { v: "PH", label: "Penawaran Harga",  desc: "GP-AR/PH atau GP-PCO/PH/…",     color: "amber" },
                    ] as const).map(({ v, label, desc, color }) => (
                        <button key={v} type="button" onClick={() => onTipe(v as TipeKontrak)}
                            className={`px-4 py-3 border rounded-xl text-left transition-all
                                ${tipe === v
                                    ? color === "amber"
                                        ? "border-amber-400 bg-amber-50 ring-1 ring-amber-300"
                                        : "border-blue-500 bg-blue-50"
                                    : "border-slate-200 bg-white hover:border-slate-300"}`}>
                            <div className={`text-sm font-bold ${tipe === v ? color === "amber" ? "text-amber-700" : "text-blue-700" : "text-slate-700"}`}>
                                {label}
                            </div>
                            <div className="text-xs text-slate-400 mt-0.5">{desc}</div>
                        </button>
                    ))}
                </div>
            </Field>

            {/* Klien */}
            <Field label="Ditujukan Kepada" required error={errors.kepada}>
                <input className={inputCls} value={kepada}
                    onChange={e => onKepada(e.target.value)}
                    placeholder="Nama klien / perusahaan tujuan" />
            </Field>


                        {/* Preview nomor surat */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">Preview Nomor Surat</p>
                <div className="flex items-center gap-2 flex-wrap">
                    <code className={`text-base font-bold px-3 py-1.5 rounded-lg font-mono
                        ${kategori === "AR" ? "bg-purple-100 text-purple-700" : "bg-cyan-100 text-cyan-700"}`}>
                        {noPreview || "GP-…"}
                    </code>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded
                        ${kategori === "AR" ? "bg-purple-100 text-purple-700" : "bg-cyan-100 text-cyan-700"}`}>
                        {kategori === "AR" ? "Anti Rayap" : "Pest Control"}
                    </span>
                    {tipe === "PH" ? (
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-300">
                            PH
                        </span>
                    ) : tipe === "K" ? (
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-700">
                            Kontrak
                        </span>
                    ) : (
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-500">
                            Umum
                        </span>
                    )}
                    {kondisiBangunan && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-700">
                            {kondisiBangunan === "pasca_konstruksi" ? "Pasca-Konstruksi" : kondisiBangunan === "pra_konstruksi" ? "Pra-Konstruksi" : "Renovasi"}
                        </span>
                    )}
                </div>
                <p className="text-xs text-slate-400 mt-2">Perihal: <em>{LAYANAN_CONFIG[jenisLayanan]?.perihal}</em></p>
            </div>
        </div>
    );
}

// ─── ADDRESS SEARCH (Nominatim / OpenStreetMap) ──────────────────────────────

interface NominatimResult {
    place_id: number;
    display_name: string;
    address: {
        road?: string; suburb?: string; city_district?: string;
        city?: string; town?: string; village?: string;
        state?: string; postcode?: string; country?: string;
    };
}

function AddressSearch({ onSelect }: {
    onSelect: (displayName: string, lines: string[]) => void;
}) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<NominatimResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const search = async (q: string) => {
        if (q.length < 3) { setResults([]); return; }
        setLoading(true);
        try {
            const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&addressdetails=1&limit=6&countrycodes=id&accept-language=id`;
            const res = await fetch(url, { headers: { "User-Agent": "ERP-PestControl/1.0" } });
            const data: NominatimResult[] = await res.json();
            setResults(data);
            setShowDropdown(true);
        } catch {
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (v: string) => {
        setQuery(v);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => search(v), 400);
    };

    const handleSelect = (r: NominatimResult) => {
        const a = r.address;
        const lines: string[] = [];
        const street = [a.road, a.suburb, a.city_district].filter(Boolean).join(", ");
        if (street) lines.push(street);
        const city = a.city || a.town || a.village || "";
        const state = a.state || "";
        const postal = a.postcode || "";
        const cityLine = [city, state, postal].filter(Boolean).join(", ");
        if (cityLine) lines.push(cityLine);
        if (!lines.length) lines.push(r.display_name.split(",").slice(0,3).join(",").trim());
        onSelect(r.display_name, lines);
        setQuery("");
        setResults([]);
        setShowDropdown(false);
    };

    return (
        <div className="relative">
            <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1.5">
                Cari Alamat Otomatis
            </label>
            <div className="relative">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <MapPin size={14} className="text-blue-400" />
                </div>
                <input
                    className="w-full pl-9 pr-3 py-2 text-sm border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white text-slate-800 placeholder:text-slate-400"
                    value={query}
                    onChange={e => handleChange(e.target.value)}
                    onFocus={() => results.length > 0 && setShowDropdown(true)}
                    onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                    placeholder="Ketik nama jalan, gedung, atau lokasi..."
                />
                {loading && (
                    <div className="absolute inset-y-0 right-3 flex items-center">
                        <Loader2 size={13} className="animate-spin text-blue-400" />
                    </div>
                )}
            </div>
            {showDropdown && results.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-blue-200 rounded-xl shadow-xl overflow-hidden max-h-64 overflow-y-auto">
                    <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400 bg-blue-50 border-b border-blue-100 flex items-center gap-1">
                        <MapPin size={9} /> {results.length} lokasi ditemukan — klik untuk isi otomatis
                    </p>
                    {results.map(r => (
                        <button key={r.place_id} type="button"
                            onMouseDown={() => handleSelect(r)}
                            className="w-full px-3 py-2.5 text-left hover:bg-blue-50 transition-colors border-b border-slate-50 last:border-0">
                            <p className="text-xs font-semibold text-slate-800 leading-snug line-clamp-2">{r.display_name}</p>
                        </button>
                    ))}
                    <p className="px-3 py-1.5 text-[10px] text-slate-400 bg-slate-50 flex items-center gap-1">
                        © OpenStreetMap contributors
                    </p>
                </div>
            )}
            {query.length >= 1 && query.length < 3 && (
                <p className="text-[11px] text-slate-400 mt-1">Ketik minimal 3 karakter untuk mencari...</p>
            )}
        </div>
    );
}

// ─── STEP 2 ───────────────────────────────────────────────────────────────────

interface KnownCustomer {
    name: string;
    alamatLines: string[];
    up: string;
    wa: string;
    // retreatment history
    lastNoSurat: string;
    lastLayanan: string;
    lastDealAt: Date | null;
    totalDeal: number;
}

type HistoryCheckState =
    | { status: "idle" }
    | { status: "checking" }
    | { status: "found"; match: KnownCustomer }
    | { status: "not_found" }
    | { status: "name_only"; candidates: KnownCustomer[] };  // nama cocok, alamat beda

function normalizeStr(s: string) {
    return s.toLowerCase().replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();
}

function addressMatch(a: string[], b: string[]): boolean {
    const normA = normalizeStr(a.join(" "));
    const normB = normalizeStr(b.join(" "));
    if (!normA || !normB) return false;
    // at least 60% word overlap
    const wordsA = new Set(normA.split(" ").filter(w => w.length > 2));
    const wordsB = new Set(normB.split(" ").filter(w => w.length > 2));
    if (wordsA.size === 0 || wordsB.size === 0) return false;
    let overlap = 0;
    wordsA.forEach(w => { if (wordsB.has(w)) overlap++; });
    return overlap / Math.max(wordsA.size, wordsB.size) >= 0.5;
}

function Step2({ nama, alamatLines, up, wa, knownCustomers, onNama, onAlamat, onUp, onWa, errors }: {
    nama: string; alamatLines: string[]; up: string; wa: string;
    knownCustomers: KnownCustomer[];
    onNama: (v: string) => void; onAlamat: (lines: string[]) => void;
    onUp: (v: string) => void; onWa: (v: string) => void;
    errors: Record<string, string>;
}) {
    const [historyState, setHistoryState] = useState<HistoryCheckState>({ status: "idle" });
    const [filledFrom, setFilledFrom] = useState<string | null>(null);

    // Reset check state when user edits name or address
    const handleNamaChange = (v: string) => {
        onNama(v);
        setFilledFrom(null);
        setHistoryState({ status: "idle" });
    };

    const handleAlamatChange = (lines: string[]) => {
        onAlamat(lines);
        setFilledFrom(null);
        setHistoryState({ status: "idle" });
    };

    const checkHistory = () => {
        if (!nama.trim()) return;
        setHistoryState({ status: "checking" });

        const normNama = normalizeStr(nama);
        const byName = knownCustomers.filter(c =>
            normalizeStr(c.name).includes(normNama) ||
            normNama.includes(normalizeStr(c.name))
        );

        if (byName.length === 0) {
            setHistoryState({ status: "not_found" });
            return;
        }

        // Try exact name + address match first
        const inputAlamat = alamatLines.filter(Boolean);
        const exactMatch = byName.find(c =>
            normalizeStr(c.name) === normNama && addressMatch(c.alamatLines, inputAlamat)
        );

        if (exactMatch) {
            setHistoryState({ status: "found", match: exactMatch });
            return;
        }

        // Name matches but address differs or empty
        setHistoryState({ status: "name_only", candidates: byName.slice(0, 5) });
    };

    const fillFromCustomer = (c: KnownCustomer) => {
        onNama(c.name);
        if (c.alamatLines.length > 0 && c.alamatLines[0]) onAlamat(c.alamatLines);
        if (c.up) onUp(c.up);
        if (c.wa) onWa(c.wa);
        setFilledFrom(c.name);
        setHistoryState({ status: "idle" });
    };

    const updateLine = (i: number, v: string) => {
        const lines = [...alamatLines]; lines[i] = v; handleAlamatChange(lines);
    };

    const fmtDate = (d: Date | null) => d
        ? d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
        : "—";

    return (
        <div className="space-y-5">
            <Field label="Nama Klien / Perusahaan" required error={errors.nama}>
                <div className="flex gap-2">
                    <input className={inputCls} value={nama}
                        onChange={e => handleNamaChange(e.target.value)}
                        placeholder="PT Contoh Indonesia / Bapak Ahmad..." />
                    <button
                        type="button"
                        onClick={checkHistory}
                        disabled={!nama.trim() || historyState.status === "checking"}
                        title="Cek apakah pelanggan ini pernah ditangani sebelumnya"
                        className="shrink-0 px-3 py-2 text-xs font-semibold rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5 whitespace-nowrap">
                        <Database size={13} />
                        {historyState.status === "checking" ? "Memeriksa..." : "Cek Riwayat"}
                    </button>
                </div>

                {/* History check result */}
                {historyState.status === "found" && (
                    <div className="mt-2 bg-emerald-50 border border-emerald-200 rounded-xl p-3 space-y-2">
                        <p className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                            <ShieldCheck size={13} /> Retreatment — Pelanggan ditemukan
                        </p>
                        <div className="bg-white rounded-lg p-2.5 border border-emerald-100 space-y-1 text-xs">
                            <div className="flex justify-between">
                                <span className="text-slate-500">Nama</span>
                                <span className="font-semibold text-slate-800">{historyState.match.name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Alamat</span>
                                <span className="font-semibold text-slate-800 text-right max-w-[60%]">{historyState.match.alamatLines[0] || "—"}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Terakhir dikerjakan</span>
                                <span className="font-semibold text-slate-800">{fmtDate(historyState.match.lastDealAt)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">No. surat terakhir</span>
                                <code className="font-mono text-blue-700 font-bold">{historyState.match.lastNoSurat}</code>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Layanan terakhir</span>
                                <span className="font-semibold text-slate-700">{historyState.match.lastLayanan}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Total deal</span>
                                <span className="font-bold text-emerald-700">{historyState.match.totalDeal}x</span>
                            </div>
                        </div>
                        <button type="button" onClick={() => fillFromCustomer(historyState.match)}
                            className="w-full py-2 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1.5">
                            <Check size={12} /> Isi Otomatis Data Pelanggan Ini
                        </button>
                    </div>
                )}

                {historyState.status === "not_found" && (
                    <div className="mt-2 bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center gap-2.5">
                        <FileCheck2 size={14} className="text-slate-400 shrink-0" />
                        <div>
                            <p className="text-xs font-semibold text-slate-600">Pelanggan baru</p>
                            <p className="text-[11px] text-slate-400">Tidak ditemukan riwayat pekerjaan atas nama ini.</p>
                        </div>
                    </div>
                )}

                {historyState.status === "name_only" && (
                    <div className="mt-2 bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
                        <p className="text-xs font-bold text-amber-700 flex items-center gap-1.5">
                            <AlertCircle size={13} /> Nama mirip tapi alamat belum cocok
                        </p>
                        <p className="text-[11px] text-amber-600">
                            Isi alamat terlebih dahulu lalu tekan "Cek Riwayat" lagi, atau pilih salah satu kandidat di bawah:
                        </p>
                        <div className="space-y-1.5">
                            {historyState.candidates.map((c, i) => (
                                <div key={i} className="bg-white border border-amber-100 rounded-lg p-2.5 space-y-1.5">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="text-xs font-semibold text-slate-800">{c.name}</p>
                                            <p className="text-[11px] text-slate-500 truncate">{c.alamatLines[0] || "Alamat tidak tersedia"}</p>
                                            <p className="text-[11px] text-slate-400">{fmtDate(c.lastDealAt)} · <code className="text-blue-600">{c.lastNoSurat}</code> · {c.totalDeal}x deal</p>
                                        </div>
                                    </div>
                                    <button type="button" onClick={() => fillFromCustomer(c)}
                                        className="w-full py-1.5 text-[11px] font-semibold bg-amber-100 text-amber-800 rounded-lg hover:bg-amber-200 transition-colors">
                                        Pilih & Isi Otomatis
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {filledFrom && historyState.status === "idle" && (
                    <p className="text-xs text-blue-600 font-medium mt-1 flex items-center gap-1">
                        ✓ Data diisi dari riwayat: <strong>{filledFrom}</strong>
                        <button type="button" onClick={() => setFilledFrom(null)} className="text-slate-400 hover:text-red-400 ml-1">✕</button>
                    </p>
                )}
            </Field>

            <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
                    Alamat Klien <span className="text-slate-300 font-normal ml-1">(bisa multiple baris)</span>
                    <span className="text-red-500 ml-0.5">*</span>
                </label>
                {alamatLines.map((line, i) => (
                    <div key={i} className="flex gap-2">
                        <input className={inputCls} value={line}
                            onChange={e => updateLine(i, e.target.value)}
                            placeholder={`Baris alamat ${i + 1}`} />
                        {i > 0 && (
                            <button type="button" onClick={() => onAlamat(alamatLines.filter((_, idx) => idx !== i))}
                                className="p-2 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors border border-slate-200">
                                <Trash2 size={14} />
                            </button>
                        )}
                    </div>
                ))}
                {errors.alamat && (
                    <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                        <AlertCircle size={11} />{errors.alamat}
                    </p>
                )}
                <button type="button" onClick={() => onAlamat([...alamatLines, ""])}
                    className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium mt-1">
                    <Plus size={12} /> Tambah baris alamat
                </button>
            </div>

            <AddressSearch onSelect={(_display, lines) => onAlamat(lines)} />

            <Field label="U.p. / Contact Person" required error={errors.up}>
                <input className={inputCls} value={up} onChange={e => onUp(e.target.value)}
                    placeholder="Bpk. Ahmad Santoso" />
            </Field>

            <Field label="Nomor WhatsApp Klien" required hint="Format: 08xxx atau 628xxx — untuk kirim penawaran langsung" error={errors.wa}>
                <div className="relative">
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                        <MessageCircle size={14} className="text-green-500" />
                    </div>
                    <input className={`${inputCls} pl-9`} value={wa} onChange={e => onWa(e.target.value)}
                        placeholder="081234567890"
                        type="tel"
                        inputMode="numeric" />
                </div>
                {wa && (
                    <a
                        href={`https://wa.me/${wa.replace(/^0/, "62").replace(/\D/g, "")}`}
                        target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 mt-1.5 text-xs text-green-600 font-semibold hover:text-green-700">
                        <MessageCircle size={11} /> Preview link WA →
                    </a>
                )}
            </Field>

        </div>
    );
}

// ─── STEP 3 ───────────────────────────────────────────────────────────────────

function Step3({ items, biayaTambahan, diskonPct, ppn, ppnDppFaktor, garansiTahun, jenisGaransi,
    pembulatanRp,
    onItems, onBiaya, onDiskon, onPpn, onPpnDpp, onGaransi, onJenisGaransi, onPembulatan, jenisLayanan }: {
    items: QuotationItem[]; biayaTambahan: BiayaTambahan[];
    diskonPct: number; ppn: boolean; ppnDppFaktor: number;
    garansiTahun: number; jenisGaransi: string;
    pembulatanRp: number;
    onItems: (v: QuotationItem[]) => void; onBiaya: (v: BiayaTambahan[]) => void;
    onDiskon: (v: number) => void; onPpn: (v: boolean) => void; onPpnDpp: (v: number) => void;
    onGaransi: (v: number) => void; onJenisGaransi: (v: string) => void;
    onPembulatan: (v: number) => void;
    jenisLayanan: JenisLayanan;
}) {
    const isAR = LAYANAN_CONFIG[jenisLayanan]?.isAR ?? false;
    const calc = calcTotals({ items, biayaTambahan, diskonPct, ppn, ppnDppFaktor: ppnDppFaktor || undefined });
    const totalSetelahPembulatan = calc.total + pembulatanRp;
    const UNITS = ["m2", "m1", "m3", "Kali", "Titik", "Lot", "ls", "Unit"];

    // ── Minimum price guard based on warranty years ──────────────────────────
    // AR: base margin 30%, each warranty year adds 8% minimum
    // PCO: base margin 25%, no warranty multiplier
    const minPriceMultiplier = isAR
        ? 1.30 + (garansiTahun * 0.08)
        : 1.25;
    const estimatedCost = calc.subtotal; // treat subtotal as cost base
    const minRecommendedPrice = Math.round(estimatedCost * minPriceMultiplier);
    const isBelowMinPrice = totalSetelahPembulatan > 0 && totalSetelahPembulatan < minRecommendedPrice;
    const marginPct = estimatedCost > 0 ? Math.round(((totalSetelahPembulatan - estimatedCost) / totalSetelahPembulatan) * 100) : 0;

    const updateItem  = (i: number, key: keyof QuotationItem, val: string | number) =>
        onItems(items.map((it, idx) => idx === i ? { ...it, [key]: val } : it));
    const updateBiaya = (i: number, key: keyof BiayaTambahan, val: string | number) =>
        onBiaya(biayaTambahan.map((b, idx) => idx === i ? { ...b, [key]: val } : b));

    return (
        <div className="space-y-6">
            <div>
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-slate-700">Item Pekerjaan</h3>
                    <button type="button" onClick={() => onItems([...items, { desc: "", qty: 1, unit: "m2", harga: 0 }])}
                        className="flex items-center gap-1.5 text-xs text-blue-600 font-semibold border border-blue-200 rounded-lg px-3 py-1.5 bg-blue-50 hover:bg-blue-100 transition-colors">
                        <Plus size={12} /> Tambah Item
                    </button>
                </div>

                {/* Card-based layout — works cleanly on mobile */}
                <div className="space-y-3">
                    {items.map((item, i) => (
                        <div key={i} className="border border-slate-200 rounded-xl p-3 bg-white space-y-2.5">
                            {/* Row header */}
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Item {i + 1}</span>
                                {items.length > 1 && (
                                    <button type="button" onClick={() => onItems(items.filter((_, idx) => idx !== i))}
                                        className="p-1 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                                        <Trash2 size={13} />
                                    </button>
                                )}
                            </div>
                            {/* Deskripsi — full width */}
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">Deskripsi Pekerjaan *</label>
                                <input
                                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
                                    value={item.desc}
                                    placeholder="Deskripsi pekerjaan..."
                                    onChange={e => updateItem(i, "desc", e.target.value)}
                                />
                            </div>
                            {/* Qty + Satuan + Harga in 3 cols */}
                            <div className="grid grid-cols-3 gap-2">
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">Qty *</label>
                                    <input type="number" min={0} step="0.01"
                                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
                                        value={item.qty}
                                        onChange={e => updateItem(i, "qty", parseFloat(e.target.value) || 0)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">Satuan</label>
                                    <select
                                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
                                        value={item.unit}
                                        onChange={e => updateItem(i, "unit", e.target.value)}>
                                        {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">Harga Satuan *</label>
                                    <input type="number" min={0} step="1000"
                                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
                                        value={item.harga}
                                        onChange={e => updateItem(i, "harga", parseInt(e.target.value) || 0)}
                                        placeholder="0"
                                    />
                                </div>
                            </div>
                            {/* Jumlah */}
                            <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                                <span className="text-[10px] text-slate-400 uppercase tracking-wide">Subtotal item</span>
                                <span className="text-sm font-bold text-slate-800 font-mono">{fmtIDR(item.qty * item.harga)}</span>
                            </div>
                        </div>
                    ))}

                    {items.length === 0 && (
                        <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center text-slate-400 text-xs">
                            Belum ada item. Klik "Tambah Item" untuk menambah.
                        </div>
                    )}
                </div>
            </div>

            <div>
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-slate-600">Biaya Tambahan <span className="text-slate-400 font-normal text-xs">(opsional)</span></h3>
                    <button type="button" onClick={() => onBiaya([...biayaTambahan, { label: "", amount: 0 }])}
                        className="text-xs text-slate-500 hover:text-blue-600 flex items-center gap-1">
                        <Plus size={11} /> Tambah
                    </button>
                </div>
                {biayaTambahan.map((b, i) => (
                    <div key={i} className="flex gap-2 mb-2">
                        <input className={`${inputCls} flex-1`} value={b.label}
                            placeholder="Label biaya (e.g. Biaya Transportasi)"
                            onChange={e => updateBiaya(i, "label", e.target.value)} />
                        <input type="number" min={0} className="w-36 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-300"
                            value={b.amount} placeholder="Nominal"
                            onChange={e => updateBiaya(i, "amount", parseInt(e.target.value) || 0)} />
                        <button type="button" onClick={() => onBiaya(biayaTambahan.filter((_, idx) => idx !== i))}
                            className="p-2 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 border border-slate-200 transition-colors">
                            <Trash2 size={14} />
                        </button>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Diskon (%)">
                    <input type="number" min={0} max={100} step="0.01" className={inputCls}
                        value={diskonPct} onChange={e => onDiskon(parseFloat(e.target.value) || 0)} />
                </Field>

                <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">PPN</label>
                    <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={ppn} onChange={e => onPpn(e.target.checked)}
                                className="w-4 h-4 rounded accent-blue-600" />
                            <span className="text-sm text-slate-700">Kena PPN</span>
                        </label>
                        {ppn && (
                            <select value={ppnDppFaktor || 0} onChange={e => onPpnDpp(parseFloat(e.target.value))}
                                className="px-2 py-1.5 text-xs border border-slate-200 rounded-lg bg-white">
                                <option value={0}>PPN 11% biasa</option>
                                <option value={11 / 12}>DPP Nilai Lain (11/12) + PPN 12%</option>
                            </select>
                        )}
                    </div>
                </div>

                {isAR && (
                    <Field label="Garansi (tahun)">
                        <input type="number" min={0} max={10} className={inputCls}
                            value={garansiTahun} onChange={e => onGaransi(parseInt(e.target.value) || 0)}
                            placeholder="0 = tidak ada garansi" />
                    </Field>
                )}

                {isAR && garansiTahun > 0 && (
                    <Field label="Jenis Garansi">
                        <input className={inputCls} value={jenisGaransi}
                            onChange={e => onJenisGaransi(e.target.value)}
                            placeholder="Anti Rayap / Anti Rayap Pra-Konstruksi" />
                    </Field>
                )}

                {/* Pembulatan harga */}
                <Field
                    label="Pembulatan Harga"
                    hint={pembulatanRp !== 0
                        ? `Total akhir: ${fmtIDR(totalSetelahPembulatan)}`
                        : "Bulatkan total ke bilangan bulat yang berakhiran 000"}
                >
                    <div className="space-y-2">
                        {/* Preset buttons: floor and ceil to nearest 1000 */}
                        <div className="grid grid-cols-2 gap-2">
                            <button type="button"
                                onClick={() => {
                                    const rawTotal = calc.total;
                                    const rounded = Math.floor(rawTotal / 1000) * 1000;
                                    onPembulatan(Math.round(rounded - rawTotal));
                                }}
                                className="flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:bg-red-50 hover:border-red-200 hover:text-red-700 transition-all">
                                <span className="text-base leading-none">↓</span>
                                Bulatkan ke Bawah
                            </button>
                            <button type="button"
                                onClick={() => {
                                    const rawTotal = calc.total;
                                    const rounded = Math.ceil(rawTotal / 1000) * 1000;
                                    onPembulatan(Math.round(rounded - rawTotal));
                                }}
                                className="flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition-all">
                                <span className="text-base leading-none">↑</span>
                                Bulatkan ke Atas
                            </button>
                        </div>
                        {/* Manual input */}
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                step="1000"
                                className={`${inputCls} font-mono text-center flex-1 ${pembulatanRp > 0 ? "text-emerald-700 border-emerald-200 bg-emerald-50" : pembulatanRp < 0 ? "text-red-600 border-red-200 bg-red-50" : ""}`}
                                value={pembulatanRp}
                                onChange={e => onPembulatan(parseInt(e.target.value) || 0)}
                                placeholder="0 (atau isi manual)"
                            />
                            {pembulatanRp !== 0 && (
                                <button type="button" onClick={() => onPembulatan(0)}
                                    className="p-2 rounded-lg border border-slate-200 text-slate-400 hover:text-red-500 hover:bg-red-50 shrink-0">
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                        {pembulatanRp !== 0 && (
                            <p className={`text-xs font-bold text-center py-1.5 rounded-lg ${pembulatanRp > 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
                                Total akhir → <span className="font-mono">{fmtIDR(totalSetelahPembulatan)}</span>
                            </p>
                        )}
                    </div>
                </Field>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">Ringkasan Harga</h3>
                {[
                    { label: "Subtotal", value: calc.subtotalGross, show: true },
                    { label: `Diskon (${diskonPct}%)`, value: -calc.diskonRp, show: calc.diskonRp > 0 },
                    { label: "Setelah Diskon", value: calc.setelahDiskon, show: calc.diskonRp > 0 },
                    { label: "PPN", value: calc.ppnRp, show: calc.ppnRp > 0 },
                    { label: `Pembulatan`, value: pembulatanRp, show: pembulatanRp !== 0 },
                ].filter(r => r.show).map(r => (
                    <div key={r.label} className="flex justify-between text-sm text-slate-600">
                        <span>{r.label}</span>
                        <span className={`font-mono ${r.value < 0 ? "text-red-500" : r.label === "Pembulatan" && r.value > 0 ? "text-emerald-600" : ""}`}>
                            {r.value < 0 ? `- ${fmtIDR(Math.abs(r.value))}` : fmtIDR(Math.abs(r.value))}
                        </span>
                    </div>
                ))}
                <div className="border-t border-slate-200 pt-2 flex justify-between font-bold">
                    <span className="text-slate-800">TOTAL</span>
                    <span className="text-green-700 text-base font-mono">{fmtIDR(totalSetelahPembulatan)}</span>
                </div>

                {/* Margin & minimum price indicator */}
                {totalSetelahPembulatan > 0 && (
                    <div className={`mt-3 rounded-xl p-3 border ${isBelowMinPrice ? "bg-red-50 border-red-200" : marginPct >= 35 ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}>
                        <div className="flex items-center justify-between mb-1">
                            <span className={`text-xs font-bold ${isBelowMinPrice ? "text-red-700" : marginPct >= 35 ? "text-emerald-700" : "text-amber-700"}`}>
                                {isBelowMinPrice ? "⚠ Di bawah harga minimum" : marginPct >= 35 ? "✓ Margin sehat" : "↗ Margin tipis"}
                            </span>
                            <span className={`text-xs font-mono font-bold ${isBelowMinPrice ? "text-red-700" : marginPct >= 35 ? "text-emerald-700" : "text-amber-700"}`}>
                                Margin {marginPct}%
                            </span>
                        </div>
                        {isBelowMinPrice && (
                            <p className="text-xs text-red-600 mt-0.5">
                                Min. direkomendasikan: <strong>{fmtIDR(minRecommendedPrice)}</strong>
                                {isAR && garansiTahun > 0 && ` (termasuk garansi ${garansiTahun} thn)`}
                            </p>
                        )}
                        <div className="w-full bg-white/60 rounded-full h-1.5 mt-2 overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${isBelowMinPrice ? "bg-red-500" : marginPct >= 35 ? "bg-emerald-500" : "bg-amber-400"}`}
                                style={{ width: `${Math.min(marginPct * 2, 100)}%` }} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── STEP 3b — TEKNIS & FOTO SURVEY ──────────────────────────────────────────

const inputCls2 = "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400";

function Step3b({
    jenisLayanan,
    surveyPhotos, onPhotos,
    chemicals, onChemicals,
    metode, onMetode,
    hamaDikendalikan, onHama,
    teknikPelaksanaan, onTeknik,
}: {
    jenisLayanan: JenisLayanan;
    surveyPhotos: SurveyPhoto[]; onPhotos: (p: SurveyPhoto[]) => void;
    chemicals: ChemicalItem[]; onChemicals: (c: ChemicalItem[]) => void;
    metode: string[]; onMetode: (m: string[]) => void;
    hamaDikendalikan: string; onHama: (h: string) => void;
    teknikPelaksanaan: string[]; onTeknik: (t: string[]) => void;
}) {
    const isAR = LAYANAN_CONFIG[jenisLayanan]?.isAR ?? false;

    const fileRef = useRef<HTMLInputElement>(null);
    const [showMetode, setShowMetode] = useState(false);
    const [showTeknik, setShowTeknik] = useState(false);

    const handleAddPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files ?? []);
        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (ev) => {
                const base64 = (ev.target?.result as string) ?? "";
                onPhotos([...surveyPhotos, { base64, caption: file.name.replace(/\.[^.]+$/, "") }]);
            };
            reader.readAsDataURL(file);
        });
        e.target.value = "";
    };

    const updateCaption = (idx: number, caption: string) => {
        const updated = surveyPhotos.map((p, i) => i === idx ? { ...p, caption } : p);
        onPhotos(updated);
    };

    const removePhoto = (idx: number) => {
        onPhotos(surveyPhotos.filter((_, i) => i !== idx));
    };

    const updateChemical = (idx: number, field: keyof ChemicalItem, val: string) => {
        const updated = chemicals.map((c, i) => i === idx ? { ...c, [field]: val } : c);
        onChemicals(updated);
    };

    const addChemical = () => onChemicals([...chemicals, { bahanAktif: "", merkDagang: "" }]);
    const removeChemical = (idx: number) => onChemicals(chemicals.filter((_, i) => i !== idx));

    const updateMetodeItem = (idx: number, val: string) => {
        onMetode(metode.map((m, i) => i === idx ? val : m));
    };
    const addMetode = () => onMetode([...metode, ""]);
    const removeMetode = (idx: number) => onMetode(metode.filter((_, i) => i !== idx));

    const updateTeknikItem = (idx: number, val: string) => {
        onTeknik(teknikPelaksanaan.map((t, i) => i === idx ? val : t));
    };
    const addTeknik = () => onTeknik([...teknikPelaksanaan, ""]);
    const removeTeknik = (idx: number) => onTeknik(teknikPelaksanaan.filter((_, i) => i !== idx));

    return (
        <div className="space-y-5">

            {/* FOTO SURVEY (AR only) */}
            {isAR && (
                <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-slate-700 flex items-center gap-2">
                            <Camera size={15} className="text-blue-500" /> Foto Survey
                        </p>
                        <button
                            type="button"
                            onClick={() => fileRef.current?.click()}
                            className="text-xs bg-blue-50 text-blue-600 border border-blue-200 rounded-lg px-3 py-1.5 font-medium hover:bg-blue-100"
                        >
                            + Tambah Foto
                        </button>
                        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleAddPhoto} />
                    </div>
                    {surveyPhotos.length === 0 && (
                        <p className="text-xs text-slate-400 text-center py-4 border border-dashed border-slate-200 rounded-lg">
                            Belum ada foto. Tap "+ Tambah Foto" untuk upload.
                        </p>
                    )}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {surveyPhotos.map((photo, idx) => (
                            <div key={idx} className="relative border border-slate-200 rounded-lg overflow-hidden">
                                <img src={photo.base64} alt={photo.caption} className="w-full h-28 object-cover" />
                                <button
                                    type="button"
                                    onClick={() => removePhoto(idx)}
                                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center"
                                >
                                    <X size={11} />
                                </button>
                                <input
                                    className="w-full border-0 border-t border-slate-200 px-2 py-1 text-xs text-slate-600 focus:outline-none bg-white"
                                    value={photo.caption ?? ""}
                                    placeholder="Keterangan foto..."
                                    onChange={e => updateCaption(idx, e.target.value)}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* METODE PELAKSANAAN (AR) */}
            {isAR && (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                    <button
                        type="button"
                        className="w-full flex items-center justify-between px-4 py-3 text-sm font-bold text-slate-700"
                        onClick={() => setShowMetode(v => !v)}
                    >
                        <span className="flex items-center gap-2">
                            <FlaskConical size={14} className="text-green-600" /> Metode Pelaksanaan
                        </span>
                        {showMetode ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                    {showMetode && (
                        <div className="px-4 pb-4 space-y-2 border-t border-slate-100">
                            <p className="text-xs text-slate-400 pt-2">Template sudah terisi sesuai jenis layanan. Edit jika diperlukan.</p>
                            {metode.map((item, idx) => (
                                <div key={idx} className="flex gap-2 items-start">
                                    <span className="text-xs text-slate-400 mt-2 shrink-0">{idx + 1}.</span>
                                    <textarea
                                        className={`${inputCls2} resize-none text-xs min-h-[52px]`}
                                        value={item}
                                        rows={2}
                                        onChange={e => updateMetodeItem(idx, e.target.value)}
                                    />
                                    <button type="button" onClick={() => removeMetode(idx)} className="mt-1.5 text-red-400 hover:text-red-600">
                                        <Trash2 size={13} />
                                    </button>
                                </div>
                            ))}
                            <button type="button" onClick={addMetode} className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1">
                                <Plus size={12} /> Tambah poin
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* HAMA & TEKNIK (PCO) */}
            {!isAR && (
                <>
                    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
                        <p className="text-sm font-bold text-slate-700 mb-1">Hama yang Dikendalikan</p>
                        <input
                            className={inputCls2}
                            value={hamaDikendalikan}
                            onChange={e => onHama(e.target.value)}
                            placeholder="Nyamuk, Kecoa, Lalat, Tikus, ..."
                        />
                    </div>
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                        <button
                            type="button"
                            className="w-full flex items-center justify-between px-4 py-3 text-sm font-bold text-slate-700"
                            onClick={() => setShowTeknik(v => !v)}
                        >
                            <span className="flex items-center gap-2">
                                <FlaskConical size={14} className="text-green-600" /> Teknik Pelaksanaan
                            </span>
                            {showTeknik ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                        {showTeknik && (
                            <div className="px-4 pb-4 space-y-2 border-t border-slate-100">
                                <p className="text-xs text-slate-400 pt-2">Template sudah terisi. Edit jika diperlukan.</p>
                                {teknikPelaksanaan.map((item, idx) => (
                                    <div key={idx} className="flex gap-2 items-start">
                                        <span className="text-xs text-slate-400 mt-2 shrink-0">-</span>
                                        <textarea
                                            className={`${inputCls2} resize-none text-xs min-h-[52px]`}
                                            value={item}
                                            rows={2}
                                            onChange={e => updateTeknikItem(idx, e.target.value)}
                                        />
                                        <button type="button" onClick={() => removeTeknik(idx)} className="mt-1.5 text-red-400 hover:text-red-600">
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                ))}
                                <button type="button" onClick={addTeknik} className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1">
                                    <Plus size={12} /> Tambah poin
                                </button>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* CHEMICAL / PESTISIDA */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                <p className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <FlaskConical size={14} className="text-purple-500" />
                    {isAR ? "Termitisida" : "Pestisida"}
                </p>
                <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-xs font-bold text-slate-500 px-1">
                        <span>Bahan Aktif</span>
                        <span>Merk Dagang</span>
                    </div>
                    {chemicals.map((chem, idx) => (
                        <div key={idx} className="grid grid-cols-2 gap-2 items-center">
                            <input
                                className={inputCls2}
                                value={chem.bahanAktif}
                                placeholder="Bahan aktif..."
                                onChange={e => updateChemical(idx, "bahanAktif", e.target.value)}
                            />
                            <div className="flex gap-1">
                                <input
                                    className={inputCls2}
                                    value={chem.merkDagang}
                                    placeholder="Merk dagang..."
                                    onChange={e => updateChemical(idx, "merkDagang", e.target.value)}
                                />
                                <button type="button" onClick={() => removeChemical(idx)} className="text-red-400 hover:text-red-600 shrink-0">
                                    <Trash2 size={13} />
                                </button>
                            </div>
                        </div>
                    ))}
                    <button type="button" onClick={addChemical} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                        <Plus size={12} /> Tambah chemical
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── STEP 5 (KONFIRMASI) ──────────────────────────────────────────────────────

function Step5({ noSurat, jenisLayanan, tipe, kepadaNama, kepadaAlamatLines, total, marketingNama, marketingWa }: {
    noSurat: string; jenisLayanan: JenisLayanan; tipe: TipeKontrak;
    kepadaNama: string; kepadaAlamatLines: string[];
    total: number; marketingNama: string; marketingWa?: string;
}) {
    const cfg = LAYANAN_CONFIG[jenisLayanan];
    const isAR = cfg?.isAR;
    return (
        <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-xs font-bold text-amber-600 mb-1 uppercase tracking-wide">⚠ Konfirmasi Generate</p>
                <p className="text-sm text-amber-700">Nomor surat akan dikunci dan PDF di-generate. Nomor tidak bisa diubah setelah ini.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                    { label: "Nomor Surat", value: noSurat, mono: true },
                    { label: "Jenis Layanan", value: cfg?.label, mono: false },
                    { label: "Tipe", value: TIPE_LABELS[tipe], mono: false },
                    { label: "Kepada", value: kepadaNama, mono: false },
                    { label: "Marketing", value: marketingNama, mono: false },
                    { label: "WA Marketing", value: marketingWa ?? "-", mono: true },
                    { label: "Total", value: fmtIDR(total), mono: true },
                    { label: "Kategori", value: isAR ? "Anti Rayap" : "Pest Control", mono: false },
                ].map(({ label, value, mono }) => (
                    <div key={label} className="bg-white border border-slate-100 rounded-lg p-3">
                        <div className="text-xs text-slate-400 uppercase tracking-wide mb-1">{label}</div>
                        <div className={`text-sm font-bold text-slate-800 ${mono ? "font-mono" : ""}`}>{value}</div>
                    </div>
                ))}
            </div>
            {kepadaAlamatLines.filter(Boolean).length > 0 && (
                <div className="bg-white border border-slate-100 rounded-lg p-3">
                    <div className="text-xs text-slate-400 uppercase tracking-wide mb-1">Alamat</div>
                    {kepadaAlamatLines.filter(Boolean).map((l, i) => (
                        <div key={i} className="text-sm text-slate-700">{l}</div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── SUCCESS SCREEN ───────────────────────────────────────────────────────────
// ─── GENERATING OVERLAY ──────────────────────────────────────────────────────
// Full-screen lock overlay yang muncul saat PDF sedang di-generate & disimpan.

type GenStep = "idle" | "nomor" | "db" | "done" | "error";

interface GenState {
    step: GenStep;
    errorMsg?: string;
}

const GEN_STEPS: { key: GenStep; label: string; sublabel: string; icon: React.ReactNode }[] = [
    {
        key: "nomor",
        label: "Mengunci nomor surat",
        sublabel: "Memesan nomor surat dari sistem...",
        icon: <Hash size={18} />,
    },
    {
        key: "db",
        label: "Menyimpan ke database",
        sublabel: "Mencatat quotation ke Firestore...",
        icon: <Database size={18} />,
    },
    {
        key: "done",
        label: "Selesai!",
        sublabel: "Data tersimpan. Menunggu persetujuan admin untuk generate PDF.",
        icon: <ShieldCheck size={18} />,
    },
];

function GeneratingOverlay({ genState }: { genState: GenState }) {
    if (genState.step === "idle") return null;

    const stepOrder: GenStep[] = ["nomor", "db", "done"];
    const currentIdx = stepOrder.indexOf(genState.step);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" />

            {/* Card */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">

                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5 text-white">
                    <div className="flex items-center gap-3">
                        {genState.step !== "done" && genState.step !== "error" ? (
                            <Loader2 size={22} className="animate-spin shrink-0" />
                        ) : genState.step === "done" ? (
                            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                                <Check size={14} className="text-white" />
                            </div>
                        ) : (
                            <AlertCircle size={22} className="text-red-300 shrink-0" />
                        )}
                        <div>
                            <p className="font-bold text-sm">
                                {genState.step === "done"
                                    ? "Quotation Berhasil Dibuat"
                                    : genState.step === "error"
                                    ? "Terjadi Kesalahan"
                                    : "Sedang Memproses..."}
                            </p>
                            <p className="text-xs text-blue-200 mt-0.5">
                                {genState.step === "done"
                                    ? "Menunggu persetujuan administrator"
                                    : genState.step === "error"
                                    ? "Proses gagal, silakan coba lagi"
                                    : "Mohon jangan tutup atau refresh halaman ini"}
                            </p>
                        </div>
                    </div>

                    {/* Progress bar */}
                    {genState.step !== "error" && (
                        <div className="mt-4 bg-blue-800/40 rounded-full h-1.5 overflow-hidden">
                            <div
                                className="h-full bg-white rounded-full transition-all duration-700 ease-out"
                                style={{
                                    width: genState.step === "done"
                                        ? "100%"
                                        : `${Math.max(8, (currentIdx / (stepOrder.length - 1)) * 100)}%`,
                                }}
                            />
                        </div>
                    )}
                </div>

                {/* Steps */}
                <div className="px-6 py-5 space-y-3">
                    {GEN_STEPS.map((s, idx) => {
                        const sIdx = stepOrder.indexOf(s.key);
                        const isDone    = sIdx < currentIdx || genState.step === "done";
                        const isActive  = s.key === genState.step;
                        const isPending = sIdx > currentIdx && genState.step !== "done";

                        return (
                            <div key={s.key} className="flex items-center gap-3">
                                {/* Step icon / status */}
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-300
                                    ${isDone
                                        ? "bg-green-100 text-green-600"
                                        : isActive
                                        ? "bg-blue-100 text-blue-600"
                                        : "bg-slate-100 text-slate-300"
                                    }`}>
                                    {isDone
                                        ? <Check size={14} className="text-green-600" />
                                        : isActive
                                        ? <Loader2 size={14} className="animate-spin" />
                                        : s.icon
                                    }
                                </div>

                                {/* Labels */}
                                <div className="min-w-0 flex-1">
                                    <p className={`text-sm font-semibold transition-colors
                                        ${isDone ? "text-green-700" : isActive ? "text-slate-900" : "text-slate-300"}`}>
                                        {s.label}
                                    </p>
                                    {isActive && (
                                        <p className="text-xs text-slate-400 mt-0.5 truncate">{s.sublabel}</p>
                                    )}
                                    {isDone && (
                                        <p className="text-xs text-green-500 mt-0.5">Selesai</p>
                                    )}
                                </div>

                                {/* Right indicator */}
                                <div className="shrink-0">
                                    {isDone && (
                                        <div className="w-2 h-2 rounded-full bg-green-400" />
                                    )}
                                    {isActive && (
                                        <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                                    )}
                                    {isPending && (
                                        <div className="w-2 h-2 rounded-full bg-slate-200" />
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Error message */}
                {genState.step === "error" && genState.errorMsg && (
                    <div className="px-6 pb-5">
                        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                            <p className="text-xs text-red-700 font-medium">Error:</p>
                            <p className="text-xs text-red-600 mt-1">{genState.errorMsg}</p>
                        </div>
                    </div>
                )}

                {/* Footer note */}
                {genState.step !== "done" && genState.step !== "error" && (
                    <div className="px-6 pb-5">
                        <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2.5 flex items-start gap-2">
                            <AlertCircle size={13} className="text-amber-500 shrink-0 mt-0.5" />
                            <p className="text-xs text-amber-700">
                                Proses ini memerlukan koneksi internet. Jangan tutup tab atau refresh halaman.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── SUCCESS SCREEN ───────────────────────────────────────────────────────────

interface SuccessData {
    noSurat: string;
    pdfBlob: Blob;
}

function SuccessScreen({ data, onGoToList }: { data: SuccessData; onGoToList: () => void }) {

    return (
        <div className="py-6 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center mb-5">
                <Clock size={32} className="text-amber-600" />
            </div>

            <h2 className="text-xl font-bold text-slate-900 mb-1">Quotation Terkirim!</h2>
            <p className="text-sm text-slate-500 mb-3">Menunggu persetujuan administrator</p>
            <div className="flex items-center gap-2 mb-6">
                <Hash size={13} className="text-slate-400" />
                <code className="text-sm font-bold font-mono bg-slate-100 text-slate-800 px-3 py-1 rounded-lg">
                    {data.noSurat}
                </code>
            </div>

            <div className="w-full max-w-xs space-y-3 mb-6">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-left">
                    <p className="text-xs font-bold text-amber-700 mb-1 uppercase tracking-wide">⏳ Menunggu Persetujuan Admin</p>
                    <p className="text-sm text-amber-700">
                        Data quotation sudah tersimpan. Admin akan memeriksa dan menyetujui atau menolak pengajuan ini.
                    </p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-left">
                    <p className="text-xs font-bold text-blue-600 mb-1 uppercase tracking-wide">📄 PDF otomatis dibuat saat disetujui</p>
                    <p className="text-sm text-blue-600">
                        Setelah admin menyetujui, PDF penawaran akan digenerate secara otomatis dan bisa langsung didownload.
                    </p>
                </div>

            </div>

            <button onClick={onGoToList}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors">
                Lihat Daftar Quotation →
            </button>
        </div>
    );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export function QuotationFormPage() {
    const navigate = useNavigate();
    const { user } = useAuthStore();

    const [step, setStep] = useState(0);

    // Load known customers for autocomplete
    useEffect(() => {
        if (!user) return;
        getQuotations({ companyId: user.companyId }).then(quotes => {
            const map = new Map<string, KnownCustomer>();
            // Only deals count as "pernah dikerjakan"
            const deals = quotes
                .filter(q => q.status === "deal")
                .sort((a, b) => (b.dealAt?.getTime() ?? 0) - (a.dealAt?.getTime() ?? 0));
            deals.forEach(q => {
                const key = q.kepadaNama.trim().toLowerCase();
                if (!map.has(key)) {
                    map.set(key, {
                        name: q.kepadaNama,
                        alamatLines: q.kepadaAlamatLines ?? [],
                        up: q.kepadaUp ?? "",
                        wa: q.kepadaWa ?? "",
                        lastNoSurat: q.noSurat,
                        lastLayanan: (LAYANAN_CONFIG[q.jenisLayanan]?.label?.split("—")[1]?.trim()) ?? q.jenisLayanan,
                        lastDealAt: q.dealAt ?? null,
                        totalDeal: 0,
                    });
                }
                const c = map.get(key)!;
                c.totalDeal++;
            });
            setKnownCustomers(Array.from(map.values()));
        }).catch(() => {});
    }, [user?.uid]);

    const [jenisLayanan, setJenisLayanan] = useState<JenisLayanan>("anti_rayap_injeksi");
    const [tipe, setTipe] = useState<TipeKontrak>("U");
    const [kepada, setKepada] = useState("");
    const [noPreview, setNoPreview] = useState("");

    const [kepadaNama, setKepadaNama] = useState("");
    const [kepadaAlamat, setKepadaAlamat] = useState<string[]>([""]);
    const [kepadaUp, setKepadaUp] = useState("");
    const [kepadaWa, setKepadaWa] = useState("");
    const [knownCustomers, setKnownCustomers] = useState<KnownCustomer[]>([]);

    const [items, setItems] = useState<QuotationItem[]>([{ desc: "", qty: 1, unit: "m2", harga: 0 }]);
    const [biayaTambahan, setBiayaTambahan] = useState<BiayaTambahan[]>([]);
    const [diskonPct, setDiskonPct] = useState(0);
    const [ppn, setPpn] = useState(false);
    const [ppnDppFaktor, setPpnDppFaktor] = useState(0);
    const [pembulatanRp, setPembulatanRp] = useState(0);
    const [peralatan, setPeralatan] = useState<string[]>([]);
    const [kondisiBangunan, setKondisiBangunan] = useState<KondisiBangunan>(null);
    const [garansiTahun, setGaransiTahun] = useState(0);
    const [jenisGaransi, setJenisGaransi] = useState("Anti Rayap");

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [genState, setGenState] = useState<GenState>({ step: "idle" });
    const [successData, setSuccessData] = useState<SuccessData | null>(null);

    // ── Technical & Survey state ───────────────────────────────────────────────
    const isAR = LAYANAN_CONFIG[jenisLayanan]?.isAR ?? false;

    // Reset items & peralatan saat ganti antara AR <-> PCO
    const handleLayanan = (v: JenisLayanan) => {
        const wasAR = LAYANAN_CONFIG[jenisLayanan]?.isAR ?? false;
        const willAR = LAYANAN_CONFIG[v]?.isAR ?? false;
        if (wasAR !== willAR) {
            setItems([{ desc: "", qty: 1, unit: "m2", harga: 0 }]);
            setPeralatan([]);
        }
        setKondisiBangunan(null);
        setJenisLayanan(v);
    };
    const [surveyPhotos, setSurveyPhotos] = useState<SurveyPhoto[]>([]);
    const [chemicals, setChemicals] = useState<ChemicalItem[]>(() =>
        isAR ? DEFAULT_CHEMICALS_AR.map(c => ({ ...c })) : DEFAULT_CHEMICALS_PCO.map(c => ({ ...c }))
    );
    const [metode, setMetode] = useState<string[]>(() =>
        (METODE_BY_LAYANAN[jenisLayanan] ?? METODE_BY_LAYANAN["anti_rayap_injeksi"]).map(m => m)
    );
    const [hamaDikendalikan, setHamaDikendalikan] = useState(DEFAULT_HAMA_PCO);
    const [teknikPelaksanaan, setTeknikPelaksanaan] = useState<string[]>(DEFAULT_TEKNIK_PCO.map(t => t));

    // Reset technical data when jenisLayanan changes
    useEffect(() => {
        const ar = LAYANAN_CONFIG[jenisLayanan]?.isAR ?? false;
        setChemicals(ar ? DEFAULT_CHEMICALS_AR.map(c => ({ ...c })) : DEFAULT_CHEMICALS_PCO.map(c => ({ ...c })));
        setMetode((METODE_BY_LAYANAN[jenisLayanan] ?? METODE_BY_LAYANAN["anti_rayap_injeksi"]).map(m => m));
    }, [jenisLayanan]);

    const kategori: KategoriSurat = LAYANAN_CONFIG[jenisLayanan]?.kategori ?? "PCO";

    useEffect(() => {
        if (!user?.companyId) return;
        let cancelled = false;
        const timer = setTimeout(async () => {
            const no = await previewNomorSurat(kategori, tipe, user.companyId, jenisLayanan);
            if (!cancelled) setNoPreview(no);
        }, 300);
        return () => { cancelled = true; clearTimeout(timer); };
    }, [kategori, tipe, user?.companyId]);

    useEffect(() => {
        if (kepadaNama === "" && kepada) setKepadaNama(kepada);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [step, kepada, kepadaNama]);

    const calc = calcTotals({ items, biayaTambahan, diskonPct, ppn, ppnDppFaktor: ppnDppFaktor || undefined });
    const totalFinal = calc.total + pembulatanRp;

    const validate = useCallback((): boolean => {
        const e: Record<string, string> = {};
        if (step === 0 && !kepada.trim()) e.kepada = "Nama klien wajib diisi.";
        if (step === 1) {
            if (!kepadaNama.trim()) e.nama = "Nama klien wajib diisi.";
            if (!kepadaAlamat.some(l => l.trim())) e.alamat = "Alamat klien wajib diisi minimal 1 baris.";
            if (!kepadaUp.trim()) e.up = "U.p. / Contact Person wajib diisi.";
            if (!kepadaWa.trim()) e.wa = "Nomor WhatsApp klien wajib diisi.";
        }
        if (step === 2) {
            if (items.length === 0)                           e.items = "Minimal 1 item harga.";
            else if (items.some(it => !it.desc.trim()))       e.items = "Deskripsi item tidak boleh kosong.";
            else if (items.some(it => it.qty <= 0))           e.items = "Qty harus lebih dari 0.";
            else if (items.some(it => it.harga <= 0))         e.items = "Harga satuan harus lebih dari 0.";
        }
        setErrors(e);
        return Object.keys(e).length === 0;
    }, [step, kepada, kepadaNama, kepadaAlamat, kepadaUp, kepadaWa, items]);

    const handleNext = () => {
        if (!validate()) return;
        if (step === 0 && !kepadaNama) setKepadaNama(kepada);
        setStep(s => s + 1);
    };

    const handleSubmit = async () => {
        if (!user) return;
        setGenState({ step: "nomor" });

        try {
            const kepadaFinal = kepadaNama || kepada;
            const now = new Date();

            // ── Step 1: Commit nomor surat ────────────────────────────────────
            const nomorEntry = await commitNomorSurat({
                kategori, tipe, jenisLayanan,
                kepada: kepadaFinal,
                byUid: user.uid, byName: user.name, companyId: user.companyId,
                noSurat: noPreview,
            });

            // ── Step 2: Simpan data quotation TANPA PDF ───────────────────────
            // PDF akan digenerate otomatis setelah admin approve.
            setGenState({ step: "db" });
            const saved = await saveQuotationDraft({
                noSurat: nomorEntry.noSurat, kategori, tipeKontrak: tipe, jenisLayanan,
                perihal: LAYANAN_CONFIG[jenisLayanan]?.perihal ?? "",
                kepadaNama: kepadaFinal,
                kepadaAlamatLines: kepadaAlamat.filter(Boolean),
                kepadaUp: kepadaUp || undefined,
                kepadaWa: kepadaWa || undefined,
                tanggal: now, items, biayaTambahan, diskonPct, ppn,
                ppnDppFaktor: ppnDppFaktor || undefined,
                garansiTahun: garansiTahun || undefined,
                jenisGaransi: jenisGaransi || undefined,
                subtotal: calc.subtotal, diskonRp: calc.diskonRp, ppnRp: calc.ppnRp, total: totalFinal,
                marketingUid: user.uid, marketingNama: user.name, marketingWa: user.wa,
                status: "pending", companyId: user.companyId,
                surveyPhotos: surveyPhotos.length > 0 ? surveyPhotos : undefined,
                chemicals: chemicals.length > 0 ? chemicals : undefined,
                metode: isAR && metode.length > 0 ? metode : undefined,
                hamaDikendalikan: !isAR ? hamaDikendalikan : undefined,
                teknikPelaksanaan: !isAR && teknikPelaksanaan.length > 0 ? teknikPelaksanaan : undefined,
                kondisiBangunan: kondisiBangunan || undefined,
            }, nomorEntry.id);

            // ── Done ──────────────────────────────────────────────────────────
            setGenState({ step: "done" });
            await new Promise(r => setTimeout(r, 400));
            setSuccessData({ noSurat: saved.noSurat, pdfBlob: null as any });
            setGenState({ step: "idle" });

        } catch (err) {
            setGenState({
                step: "error",
                errorMsg: err instanceof Error ? err.message : "Terjadi kesalahan. Coba lagi.",
            });
        }
    };

    const handleDismissError = () => setGenState({ step: "idle" });

    const isGenerating = genState.step !== "idle" && genState.step !== "error";

    // ── Render success ─────────────────────────────────────────────────────────
    if (successData) {
        return (
            <div className="p-4 md:p-6 max-w-2xl mx-auto">
                <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-6 shadow-sm">
                    <SuccessScreen data={successData} onGoToList={() => navigate("/quotations")} />
                </div>
            </div>
        );
    }

    // ── Render form ────────────────────────────────────────────────────────────
    return (
        <div className="p-4 md:p-6 max-w-2xl mx-auto">
            {/* Full-screen generating overlay */}
            <GeneratingOverlay genState={genState} />

            <div className="flex items-center gap-3 mb-6">
                <button onClick={() => navigate("/quotations")}
                    className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors">
                    <ArrowLeft size={16} />
                </button>
                <div>
                    <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <FileText size={18} className="text-blue-600" />
                        Buat Quotation Baru
                    </h1>
                    <p className="text-xs text-slate-400">PT Guci Emas Pratama — nomor surat otomatis</p>
                </div>
            </div>

            <StepIndicator current={step} />

            <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-6 shadow-sm">
                {step === 0 && <Step1 jenisLayanan={jenisLayanan} tipe={tipe} kepada={kepada} noPreview={noPreview}
                    kondisiBangunan={kondisiBangunan}
                    onLayanan={handleLayanan} onTipe={setTipe} onKepada={setKepada} onKondisi={setKondisiBangunan} errors={errors} />}
                {step === 1 && <Step2 nama={kepadaNama} alamatLines={kepadaAlamat} up={kepadaUp} wa={kepadaWa}
                    knownCustomers={knownCustomers}
                    onNama={setKepadaNama} onAlamat={setKepadaAlamat} onUp={setKepadaUp} onWa={setKepadaWa} errors={errors} />}
                {step === 2 && <Step3 items={items} biayaTambahan={biayaTambahan} diskonPct={diskonPct}
                    ppn={ppn} ppnDppFaktor={ppnDppFaktor} garansiTahun={garansiTahun} jenisGaransi={jenisGaransi}
                    pembulatanRp={pembulatanRp}
                    jenisLayanan={jenisLayanan} onItems={setItems} onBiaya={setBiayaTambahan}
                    onDiskon={setDiskonPct} onPpn={setPpn} onPpnDpp={setPpnDppFaktor}
                    onGaransi={setGaransiTahun} onJenisGaransi={setJenisGaransi}
                    onPembulatan={setPembulatanRp} />}
                {step === 3 && <Step3b
                    jenisLayanan={jenisLayanan}
                    surveyPhotos={surveyPhotos} onPhotos={setSurveyPhotos}
                    chemicals={chemicals} onChemicals={setChemicals}
                    metode={metode} onMetode={setMetode}
                    hamaDikendalikan={hamaDikendalikan} onHama={setHamaDikendalikan}
                    teknikPelaksanaan={teknikPelaksanaan} onTeknik={setTeknikPelaksanaan}
                />}
                {step === 4 && <Step5 noSurat={noPreview} jenisLayanan={jenisLayanan} tipe={tipe}
                    kepadaNama={kepadaNama || kepada} kepadaAlamatLines={kepadaAlamat}
                    total={totalFinal} marketingNama={user?.name ?? ""} marketingWa={user?.wa} />}

                {/* Error dari genState (muncul di bawah form setelah overlay ditutup) */}
                {genState.step === "error" && genState.errorMsg && (
                    <div className="mt-4 flex items-start gap-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                        <AlertCircle size={15} className="shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <p className="font-semibold mb-0.5">Gagal menyimpan quotation</p>
                            <p className="text-xs text-red-600">{genState.errorMsg}</p>
                        </div>
                        <button
                            onClick={handleDismissError}
                            className="text-xs text-red-500 hover:text-red-700 font-medium shrink-0 underline">
                            Tutup
                        </button>
                    </div>
                )}

                <div className="flex justify-between mt-6 pt-4 border-t border-slate-100">
                    <button type="button" onClick={() => setStep(s => s - 1)} disabled={step === 0 || isGenerating}
                        className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 disabled:opacity-30 transition-colors">
                        <ArrowLeft size={14} /> Kembali
                    </button>

                    {step < STEPS.length - 1 ? (
                        <button type="button" onClick={handleNext}
                            className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors">
                            Lanjut <ArrowRight size={14} />
                        </button>
                    ) : (
                        <button type="button" onClick={handleSubmit} disabled={isGenerating}
                            className="flex items-center gap-2 px-5 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 disabled:opacity-60 transition-colors">
                            {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                            {isGenerating ? "Memproses..." : "Generate PDF & Simpan"}
                        </button>
                    )}
                </div>
            </div>

        </div>
    );
}