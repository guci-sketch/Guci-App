/**
 * QuotationEditPage — Edit Quotation (Full)
 *
 * Membuka halaman full-screen edit yang setara dengan form buat baru:
 *   Step 1 → Data Klien (nama, alamat, U.p., WA, catatan)
 *   Step 2 → Tabel Harga (item, biaya tambahan, diskon, PPN, garansi)
 *   Step 3 → Teknis & Foto (survey photos, chemical, metode/teknik)
 *
 * Nomor surat TIDAK berubah (hanya data quotation yang diedit).
 * Simpan memanggil updateQuotationData() + recalc total.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    ArrowLeft, ArrowRight, Check, Save,
    Plus, Trash2, Loader2, AlertCircle,
    FileText, Hash,
    Camera, X, FlaskConical, ChevronDown, ChevronUp,
    MessageCircle, MapPin, Tag, Info,
} from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { getQuotationById, updateQuotationData } from "../../services/quotationService";
import { calcTotals, fmtIDR, LAYANAN_CONFIG, TIPE_LABELS } from "../../lib/quotationConfig";
import type {
    JenisLayanan, QuotationItem, BiayaTambahan,
    SurveyPhoto, ChemicalItem,
} from "../../types";
import {
    DEFAULT_CHEMICALS_AR, DEFAULT_CHEMICALS_PCO,
    DEFAULT_HAMA_PCO, DEFAULT_TEKNIK_PCO, METODE_BY_LAYANAN,
} from "../../types";
import type { Quotation } from "../../types";

// ─── STEP DEFINITIONS ─────────────────────────────────────────────────────────

const EDIT_STEPS = [
    { label: "Data Klien" },
    { label: "Tabel Harga" },
    { label: "Teknis & Foto" },
];

// ─── SHARED HELPERS ───────────────────────────────────────────────────────────

const inputCls = "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white text-slate-800";
const inputCls2 = "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white text-slate-800";

interface NominatimResult {
    place_id: number;
    display_name: string;
    address: {
        road?: string; suburb?: string; city_district?: string;
        city?: string; town?: string; village?: string;
        state?: string; postcode?: string;
    };
}

function Field({ label, required, hint, error, children }: {
    label: string; required?: boolean; hint?: string; error?: string; children: React.ReactNode;
}) {
    return (
        <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
                {label}{required && <span className="text-red-500 ml-0.5">*</span>}
            </label>
            {children}
            {hint  && <p className="text-[11px] text-slate-400 italic">{hint}</p>}
            {error && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={11}/>{error}</p>}
        </div>
    );
}

// ─── STEP INDICATOR ───────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: number }) {
    return (
        <div className="flex items-center gap-0 mb-8 mx-auto max-w-lg">
            {EDIT_STEPS.map((s, i) => (
                <div key={i} className="flex-1 flex flex-col items-center">
                    <div className="flex items-center w-full">
                        <div className={`flex-1 h-0.5 ${i === 0 ? "opacity-0" : i <= current ? "bg-blue-500" : "bg-slate-200"}`} />
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                            ${i < current  ? "bg-blue-600 text-white"
                            : i === current ? "bg-blue-600 text-white ring-4 ring-blue-100"
                            : "bg-slate-100 text-slate-400"}`}>
                            {i < current ? <Check size={14} /> : i + 1}
                        </div>
                        <div className={`flex-1 h-0.5 ${i === EDIT_STEPS.length - 1 ? "opacity-0" : i < current ? "bg-blue-500" : "bg-slate-200"}`} />
                    </div>
                    <span className={`text-xs mt-1.5 font-medium hidden sm:block
                        ${i === current ? "text-blue-600" : i < current ? "text-slate-500" : "text-slate-300"}`}>
                        {s.label}
                    </span>
                </div>
            ))}
        </div>
    );
}

// ─── ADDRESS SEARCH (Nominatim) ───────────────────────────────────────────────

function AddressSearch({ onSelect }: { onSelect: (lines: string[]) => void }) {
    const [query,       setQuery]       = useState("");
    const [results,     setResults]     = useState<NominatimResult[]>([]);
    const [loading,     setLoading]     = useState(false);
    const [showDrop,    setShowDrop]    = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const search = async (q: string) => {
        if (q.length < 3) { setResults([]); return; }
        setLoading(true);
        try {
            const res = await fetch(
                `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&addressdetails=1&limit=6&countrycodes=id&accept-language=id`,
                { headers: { "User-Agent": "ERP-PestControl/1.0" } }
            );
            const data: NominatimResult[] = await res.json();
            setResults(data);
            setShowDrop(true);
        } catch { setResults([]); }
        finally { setLoading(false); }
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
        const cityLine = [a.city || a.town || a.village, a.state, a.postcode].filter(Boolean).join(", ");
        if (cityLine) lines.push(cityLine);
        if (!lines.length) lines.push(r.display_name.split(",").slice(0, 3).join(",").trim());
        onSelect(lines);
        setQuery(""); setResults([]); setShowDrop(false);
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
                    className="w-full pl-9 pr-3 py-2 text-sm border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
                    value={query}
                    onChange={e => handleChange(e.target.value)}
                    onFocus={() => results.length > 0 && setShowDrop(true)}
                    onBlur={() => setTimeout(() => setShowDrop(false), 200)}
                    placeholder="Ketik nama jalan atau lokasi..."
                />
                {loading && (
                    <div className="absolute inset-y-0 right-3 flex items-center">
                        <Loader2 size={13} className="animate-spin text-blue-400" />
                    </div>
                )}
            </div>
            {showDrop && results.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-blue-200 rounded-xl shadow-xl overflow-hidden max-h-60 overflow-y-auto">
                    <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400 bg-blue-50 border-b border-blue-100">
                        {results.length} lokasi ditemukan — klik untuk isi otomatis
                    </p>
                    {results.map(r => (
                        <button key={r.place_id} type="button" onMouseDown={() => handleSelect(r)}
                            className="w-full px-3 py-2.5 text-left hover:bg-blue-50 transition-colors border-b border-slate-50 last:border-0">
                            <p className="text-xs font-semibold text-slate-800 leading-snug line-clamp-2">{r.display_name}</p>
                        </button>
                    ))}
                    <p className="px-3 py-1.5 text-[10px] text-slate-400 bg-slate-50">© OpenStreetMap contributors</p>
                </div>
            )}
        </div>
    );
}

// ─── STEP 1 : DATA KLIEN ──────────────────────────────────────────────────────

function Step1Edit({
    nama, alamatLines, up, wa, notes,
    onNama, onAlamat, onUp, onWa, onNotes, errors,
}: {
    nama: string; alamatLines: string[]; up: string; wa: string; notes: string;
    onNama: (v: string) => void; onAlamat: (v: string[]) => void;
    onUp: (v: string) => void; onWa: (v: string) => void;
    onNotes: (v: string) => void;
    errors: Record<string, string>;
}) {
    const updateLine = (i: number, v: string) => {
        const lines = [...alamatLines]; lines[i] = v; onAlamat(lines);
    };

    return (
        <div className="space-y-5">
            <Field label="Nama Klien / Perusahaan" required error={errors.nama}>
                <input className={inputCls} value={nama}
                    onChange={e => onNama(e.target.value)}
                    placeholder="PT Contoh Indonesia / Bapak Ahmad..." />
            </Field>

            {/* Alamat multi-baris */}
            <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
                    Alamat Klien <span className="text-slate-300 font-normal ml-1">(bisa multiple baris)</span>
                </label>
                {alamatLines.map((line, i) => (
                    <div key={i} className="flex gap-2">
                        <input className={inputCls} value={line}
                            onChange={e => updateLine(i, e.target.value)}
                            placeholder={`Baris alamat ${i + 1}`} />
                        {i > 0 && (
                            <button type="button"
                                onClick={() => onAlamat(alamatLines.filter((_, idx) => idx !== i))}
                                className="p-2 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 border border-slate-200">
                                <Trash2 size={14} />
                            </button>
                        )}
                    </div>
                ))}
                <button type="button" onClick={() => onAlamat([...alamatLines, ""])}
                    className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium mt-1">
                    <Plus size={12} /> Tambah baris alamat
                </button>
            </div>

            {/* Address autocomplete */}
            <AddressSearch onSelect={lines => onAlamat(lines)} />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="U.p. / Contact Person">
                    <input className={inputCls} value={up}
                        onChange={e => onUp(e.target.value)}
                        placeholder="Bpk. Ahmad Santoso (opsional)" />
                </Field>
                <Field label="Nomor WhatsApp Klien"
                    hint="Format: 08xxx — untuk kirim penawaran langsung">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                            <MessageCircle size={14} className="text-green-500" />
                        </div>
                        <input className={`${inputCls} pl-9`} value={wa}
                            onChange={e => onWa(e.target.value)}
                            placeholder="081234567890 (opsional)"
                            type="tel" inputMode="numeric" />
                    </div>
                    {wa && (
                        <a href={`https://wa.me/${wa.replace(/^0/, "62").replace(/\D/g, "")}`}
                            target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 mt-1 text-xs text-green-600 font-semibold hover:text-green-700">
                            <MessageCircle size={11} /> Preview link WA →
                        </a>
                    )}
                </Field>
            </div>

            <Field label="Catatan Marketing" hint="Catatan internal untuk admin (tidak tampil di PDF)">
                <textarea rows={3} className={`${inputCls} resize-none`}
                    value={notes} onChange={e => onNotes(e.target.value)}
                    placeholder="Catatan tambahan untuk admin..." />
            </Field>
        </div>
    );
}

// ─── STEP 2 : TABEL HARGA ─────────────────────────────────────────────────────

function Step2Edit({
    items, biayaTambahan, diskonPct, ppn, ppnDppFaktor,
    garansiTahun, jenisGaransi, pembulatanRp, jenisLayanan,
    onItems, onBiaya, onDiskon, onPpn, onPpnDpp,
    onGaransi, onJenisGaransi, onPembulatan, errors,
}: {
    items: QuotationItem[]; biayaTambahan: BiayaTambahan[];
    diskonPct: number; ppn: boolean; ppnDppFaktor: number;
    garansiTahun: number; jenisGaransi: string; pembulatanRp: number;
    jenisLayanan: JenisLayanan;
    onItems: (v: QuotationItem[]) => void; onBiaya: (v: BiayaTambahan[]) => void;
    onDiskon: (v: number) => void; onPpn: (v: boolean) => void;
    onPpnDpp: (v: number) => void; onGaransi: (v: number) => void;
    onJenisGaransi: (v: string) => void; onPembulatan: (v: number) => void;
    errors: Record<string, string>;
}) {
    const isAR = LAYANAN_CONFIG[jenisLayanan]?.isAR ?? false;
    const calc = calcTotals({ items, biayaTambahan, diskonPct, ppn, ppnDppFaktor: ppnDppFaktor || undefined });
    const totalFinal = calc.total + pembulatanRp;
    const UNITS = ["m2", "m1", "m3", "Kali", "Titik", "Lot", "ls", "Unit"];

    const updateItem = (i: number, field: keyof QuotationItem, val: string | number) => {
        onItems(items.map((it, idx) => idx === i ? { ...it, [field]: val } : it));
    };
    const addItem = () => onItems([...items, { desc: "", qty: 1, unit: "m2", harga: 0 }]);
    const removeItem = (i: number) => onItems(items.filter((_, idx) => idx !== i));

    const updateBiaya = (i: number, field: keyof BiayaTambahan, val: string | number) => {
        onBiaya(biayaTambahan.map((b, idx) => idx === i ? { ...b, [field]: val } : b));
    };
    const addBiaya = () => onBiaya([...biayaTambahan, { label: "", amount: 0 }]);
    const removeBiaya = (i: number) => onBiaya(biayaTambahan.filter((_, idx) => idx !== i));

    return (
        <div className="space-y-6">

            {/* Items */}
            <div>
                <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Item Harga</label>
                    {errors.items && (
                        <p className="text-xs text-red-500 flex items-center gap-1">
                            <AlertCircle size={11} />{errors.items}
                        </p>
                    )}
                </div>

                {/* Header */}
                <div className="hidden sm:grid grid-cols-12 gap-2 px-1 mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    <div className="col-span-5">Deskripsi</div>
                    <div className="col-span-2">Qty</div>
                    <div className="col-span-1">Sat.</div>
                    <div className="col-span-3">Harga Satuan</div>
                    <div className="col-span-1"></div>
                </div>

                <div className="space-y-2">
                    {items.map((it, i) => (
                        <div key={i} className="grid grid-cols-12 gap-2 items-start">
                            <div className="col-span-12 sm:col-span-5">
                                <input className={inputCls} value={it.desc}
                                    onChange={e => updateItem(i, "desc", e.target.value)}
                                    placeholder="Deskripsi pekerjaan..." />
                            </div>
                            <div className="col-span-4 sm:col-span-2">
                                <input className={inputCls} type="number" min={0.1} step={0.1}
                                    value={it.qty}
                                    onChange={e => updateItem(i, "qty", parseFloat(e.target.value) || 0)} />
                            </div>
                            <div className="col-span-3 sm:col-span-1">
                                <select className={inputCls} value={it.unit}
                                    onChange={e => updateItem(i, "unit", e.target.value)}>
                                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                                </select>
                            </div>
                            <div className="col-span-4 sm:col-span-3">
                                <input className={inputCls} type="number" min={0} step={1000}
                                    value={it.harga}
                                    onChange={e => updateItem(i, "harga", parseInt(e.target.value) || 0)}
                                    placeholder="Harga satuan" />
                            </div>
                            <div className="col-span-1 flex justify-center pt-2">
                                {items.length > 1 && (
                                    <button type="button" onClick={() => removeItem(i)}
                                        className="text-red-400 hover:text-red-600">
                                        <Trash2 size={14} />
                                    </button>
                                )}
                            </div>
                            {/* Subtotal per item */}
                            <div className="col-span-12 text-right text-xs text-slate-400 -mt-1 pr-6">
                                = {fmtIDR(it.qty * it.harga)}
                            </div>
                        </div>
                    ))}
                </div>
                <button type="button" onClick={addItem}
                    className="mt-2 flex items-center gap-1.5 text-xs text-blue-600 font-medium hover:text-blue-700">
                    <Plus size={12} /> Tambah item
                </button>
            </div>

            {/* Biaya tambahan */}
            <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">
                    Biaya Tambahan <span className="font-normal text-slate-300">(opsional)</span>
                </label>
                {biayaTambahan.map((b, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 mb-2 items-center">
                        <div className="col-span-6">
                            <input className={inputCls} value={b.label}
                                onChange={e => updateBiaya(i, "label", e.target.value)}
                                placeholder="Label biaya (mis: Biaya Transportasi)" />
                        </div>
                        <div className="col-span-5">
                            <input className={inputCls} type="number" min={0} step={1000}
                                value={b.amount}
                                onChange={e => updateBiaya(i, "amount", parseInt(e.target.value) || 0)} />
                        </div>
                        <div className="col-span-1 flex justify-center">
                            <button type="button" onClick={() => removeBiaya(i)}
                                className="text-red-400 hover:text-red-600">
                                <Trash2 size={14} />
                            </button>
                        </div>
                    </div>
                ))}
                <button type="button" onClick={addBiaya}
                    className="flex items-center gap-1.5 text-xs text-blue-600 font-medium hover:text-blue-700">
                    <Plus size={12} /> Tambah biaya
                </button>
            </div>

            {/* Diskon + PPN + Pembulatan */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Diskon (%)" hint="0 = tidak ada diskon">
                    <input className={inputCls} type="number" min={0} max={100} step={0.5}
                        value={diskonPct}
                        onChange={e => onDiskon(parseFloat(e.target.value) || 0)} />
                </Field>
                <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">PPN</label>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                        <div onClick={() => onPpn(!ppn)}
                            className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${ppn ? "bg-blue-600" : "bg-slate-300"}`}>
                            <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ${ppn ? "translate-x-4" : ""}`} />
                        </div>
                        <span className="text-sm text-slate-600">{ppn ? "Kena PPN" : "Tidak kena PPN"}</span>
                    </label>
                    {ppn && (
                        <div>
                            <p className="text-[11px] text-slate-400 mb-1">Faktor DPP (0 = PPN 11% langsung)</p>
                            <input className={inputCls} type="number" min={0} max={1} step={0.01}
                                value={ppnDppFaktor || ""}
                                onChange={e => onPpnDpp(parseFloat(e.target.value) || 0)}
                                placeholder="mis: 0.11 untuk DPP 11/12" />
                        </div>
                    )}
                </div>
            </div>

            {/* Garansi (AR only) */}
            {isAR && (
                <div className="grid grid-cols-2 gap-4">
                    <Field label="Garansi (tahun)" hint="0 = tanpa garansi">
                        <input className={inputCls} type="number" min={0} max={10} step={1}
                            value={garansiTahun}
                            onChange={e => onGaransi(parseInt(e.target.value) || 0)} />
                    </Field>
                    <Field label="Jenis Garansi">
                        <input className={inputCls} value={jenisGaransi}
                            onChange={e => onJenisGaransi(e.target.value)} />
                    </Field>
                </div>
            )}

            {/* Pembulatan */}
            <Field label="Pembulatan Harga (Rp)" hint="Positif = tambah, negatif = kurangi">
                <input className={inputCls} type="number" step={1000}
                    value={pembulatanRp}
                    onChange={e => onPembulatan(parseInt(e.target.value) || 0)} />
            </Field>

            {/* Summary */}
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-2">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-3">Ringkasan Harga</p>
                {[
                    { label: "Subtotal",    val: fmtIDR(calc.subtotal) },
                    ...(calc.biayaExtra > 0 ? [{ label: "Biaya Tambahan", val: fmtIDR(calc.biayaExtra) }] : []),
                    ...(diskonPct > 0      ? [{ label: `Diskon ${diskonPct}%`, val: `- ${fmtIDR(calc.diskonRp)}` }] : []),
                    ...(ppn               ? [{ label: "PPN", val: fmtIDR(calc.ppnRp) }] : []),
                    ...(pembulatanRp !== 0 ? [{ label: "Pembulatan", val: fmtIDR(pembulatanRp) }] : []),
                ].map(({ label, val }) => (
                    <div key={label} className="flex justify-between text-sm">
                        <span className="text-slate-500">{label}</span>
                        <span className="text-slate-800 font-medium">{val}</span>
                    </div>
                ))}
                <div className="border-t border-slate-200 pt-2 flex justify-between">
                    <span className="text-sm font-bold text-slate-800">Total</span>
                    <span className="text-base font-extrabold text-blue-700">{fmtIDR(totalFinal)}</span>
                </div>
            </div>
        </div>
    );
}

// ─── STEP 3 : TEKNIS & FOTO ───────────────────────────────────────────────────

function Step3Edit({
    jenisLayanan, surveyPhotos, onPhotos,
    chemicals, onChemicals, metode, onMetode,
    hamaDikendalikan, onHama, teknikPelaksanaan, onTeknik,
}: {
    jenisLayanan: JenisLayanan;
    surveyPhotos: SurveyPhoto[];     onPhotos: (v: SurveyPhoto[]) => void;
    chemicals: ChemicalItem[];       onChemicals: (v: ChemicalItem[]) => void;
    metode: string[];                onMetode: (v: string[]) => void;
    hamaDikendalikan: string;        onHama: (v: string) => void;
    teknikPelaksanaan: string[];     onTeknik: (v: string[]) => void;
}) {
    const isAR = LAYANAN_CONFIG[jenisLayanan]?.isAR ?? false;
    const fileRef = useRef<HTMLInputElement>(null);
    const [showMetode, setShowMetode] = useState(false);
    const [showTeknik, setShowTeknik] = useState(false);

    const handleAddPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files ?? []);
        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = ev => {
                const base64 = (ev.target?.result as string) ?? "";
                onPhotos([...surveyPhotos, { base64, caption: file.name.replace(/\.[^.]+$/, "") }]);
            };
            reader.readAsDataURL(file);
        });
        e.target.value = "";
    };

    const updateCaption = (idx: number, caption: string) =>
        onPhotos(surveyPhotos.map((p, i) => i === idx ? { ...p, caption } : p));
    const removePhoto = (idx: number) => onPhotos(surveyPhotos.filter((_, i) => i !== idx));

    const updateChemical = (idx: number, field: keyof ChemicalItem, val: string) =>
        onChemicals(chemicals.map((c, i) => i === idx ? { ...c, [field]: val } : c));
    const addChemical = () => onChemicals([...chemicals, { bahanAktif: "", merkDagang: "" }]);
    const removeChemical = (idx: number) => onChemicals(chemicals.filter((_, i) => i !== idx));

    const updateMetodeItem = (idx: number, val: string) => onMetode(metode.map((m, i) => i === idx ? val : m));
    const addMetode = () => onMetode([...metode, ""]);
    const removeMetode = (idx: number) => onMetode(metode.filter((_, i) => i !== idx));

    const updateTeknikItem = (idx: number, val: string) => onTeknik(teknikPelaksanaan.map((t, i) => i === idx ? val : t));
    const addTeknik = () => onTeknik([...teknikPelaksanaan, ""]);
    const removeTeknik = (idx: number) => onTeknik(teknikPelaksanaan.filter((_, i) => i !== idx));

    return (
        <div className="space-y-5">

            {/* FOTO SURVEY */}
            {isAR && (
                <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-slate-700 flex items-center gap-2">
                            <Camera size={15} className="text-blue-500" /> Foto Survey
                        </p>
                        <button type="button" onClick={() => fileRef.current?.click()}
                            className="text-xs bg-blue-50 text-blue-600 border border-blue-200 rounded-lg px-3 py-1.5 font-medium hover:bg-blue-100">
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
                                <button type="button" onClick={() => removePhoto(idx)}
                                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center">
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
                    <button type="button"
                        className="w-full flex items-center justify-between px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
                        onClick={() => setShowMetode(v => !v)}>
                        <span className="flex items-center gap-2">
                            <FlaskConical size={14} className="text-green-600" /> Metode Pelaksanaan
                        </span>
                        {showMetode ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                    {showMetode && (
                        <div className="px-4 pb-4 space-y-2 border-t border-slate-100">
                            <p className="text-xs text-slate-400 pt-2">Edit jika diperlukan.</p>
                            {metode.map((item, idx) => (
                                <div key={idx} className="flex gap-2 items-start">
                                    <span className="text-xs text-slate-400 mt-2 shrink-0">{idx + 1}.</span>
                                    <textarea className={`${inputCls2} resize-none text-xs min-h-[52px]`}
                                        value={item} rows={2}
                                        onChange={e => updateMetodeItem(idx, e.target.value)} />
                                    <button type="button" onClick={() => removeMetode(idx)}
                                        className="mt-1.5 text-red-400 hover:text-red-600">
                                        <Trash2 size={13} />
                                    </button>
                                </div>
                            ))}
                            <button type="button" onClick={addMetode}
                                className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1">
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
                        <input className={inputCls2} value={hamaDikendalikan}
                            onChange={e => onHama(e.target.value)}
                            placeholder="Nyamuk, Kecoa, Lalat, Tikus, ..." />
                    </div>
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                        <button type="button"
                            className="w-full flex items-center justify-between px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
                            onClick={() => setShowTeknik(v => !v)}>
                            <span className="flex items-center gap-2">
                                <FlaskConical size={14} className="text-green-600" /> Teknik Pelaksanaan
                            </span>
                            {showTeknik ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                        {showTeknik && (
                            <div className="px-4 pb-4 space-y-2 border-t border-slate-100">
                                <p className="text-xs text-slate-400 pt-2">Edit jika diperlukan.</p>
                                {teknikPelaksanaan.map((item, idx) => (
                                    <div key={idx} className="flex gap-2 items-start">
                                        <span className="text-xs text-slate-400 mt-2 shrink-0">-</span>
                                        <textarea className={`${inputCls2} resize-none text-xs min-h-[52px]`}
                                            value={item} rows={2}
                                            onChange={e => updateTeknikItem(idx, e.target.value)} />
                                        <button type="button" onClick={() => removeTeknik(idx)}
                                            className="mt-1.5 text-red-400 hover:text-red-600">
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                ))}
                                <button type="button" onClick={addTeknik}
                                    className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1">
                                    <Plus size={12} /> Tambah poin
                                </button>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* CHEMICAL */}
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
                            <input className={inputCls2} value={chem.bahanAktif}
                                placeholder="Bahan aktif..."
                                onChange={e => updateChemical(idx, "bahanAktif", e.target.value)} />
                            <div className="flex gap-1">
                                <input className={inputCls2} value={chem.merkDagang}
                                    placeholder="Merk dagang..."
                                    onChange={e => updateChemical(idx, "merkDagang", e.target.value)} />
                                <button type="button" onClick={() => removeChemical(idx)}
                                    className="text-red-400 hover:text-red-600 shrink-0">
                                    <Trash2 size={13} />
                                </button>
                            </div>
                        </div>
                    ))}
                    <button type="button" onClick={addChemical}
                        className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                        <Plus size={12} /> Tambah chemical
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export function QuotationEditPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuthStore();

    const [step,    setStep]    = useState(0);
    const [loading, setLoading] = useState(true);
    const [saving,  setSaving]  = useState(false);
    const [saved,   setSaved]   = useState(false);
    const [error,   setError]   = useState("");
    const [errors,  setErrors]  = useState<Record<string, string>>({});

    // Quotation metadata (read-only display)
    const [quotation, setQuotation] = useState<Quotation | null>(null);

    // ── Editable state ────────────────────────────────────────────────────────
    const [nama,         setNama]         = useState("");
    const [alamatLines,  setAlamatLines]  = useState<string[]>([""]);
    const [up,           setUp]           = useState("");
    const [wa,           setWa]           = useState("");
    const [notes,        setNotes]        = useState("");

    const [items,           setItems]           = useState<QuotationItem[]>([]);
    const [biayaTambahan,   setBiayaTambahan]   = useState<BiayaTambahan[]>([]);
    const [diskonPct,       setDiskonPct]       = useState(0);
    const [ppn,             setPpn]             = useState(false);
    const [ppnDppFaktor,    setPpnDppFaktor]    = useState(0);
    const [garansiTahun,    setGaransiTahun]    = useState(0);
    const [jenisGaransi,    setJenisGaransi]    = useState("Anti Rayap");
    const [pembulatanRp,    setPembulatanRp]    = useState(0);

    const [surveyPhotos,      setSurveyPhotos]      = useState<SurveyPhoto[]>([]);
    const [chemicals,         setChemicals]         = useState<ChemicalItem[]>([]);
    const [metode,            setMetode]            = useState<string[]>([]);
    const [hamaDikendalikan,  setHamaDikendalikan]  = useState(DEFAULT_HAMA_PCO);
    const [teknikPelaksanaan, setTeknikPelaksanaan] = useState<string[]>(DEFAULT_TEKNIK_PCO.map(t => t));

    // ── Load existing quotation ───────────────────────────────────────────────
    useEffect(() => {
        if (!id) { navigate("/quotations"); return; }
        setLoading(true);
        getQuotationById(id)
            .then(q => {
                if (!q) { navigate("/quotations"); return; }
                setQuotation(q);

                // Populate editable state from existing quotation
                setNama(q.kepadaNama);
                setAlamatLines(q.kepadaAlamatLines?.length ? q.kepadaAlamatLines : [""]);
                setUp(q.kepadaUp ?? "");
                setWa(q.kepadaWa ?? "");
                setNotes(q.notesMarketing ?? "");

                setItems(q.items ?? [{ desc: "", qty: 1, unit: "m2", harga: 0 }]);
                setBiayaTambahan(q.biayaTambahan ?? []);
                setDiskonPct(q.diskonPct ?? 0);
                setPpn(q.ppn ?? false);
                setPpnDppFaktor(q.ppnDppFaktor ?? 0);
                setGaransiTahun(q.garansiTahun ?? 0);
                setJenisGaransi(q.jenisGaransi ?? "Anti Rayap");

                // Pembulatan = stored total - calc total (reverse-engineer)
                const calcResult = calcTotals({
                    items: q.items ?? [],
                    biayaTambahan: q.biayaTambahan ?? [],
                    diskonPct: q.diskonPct ?? 0,
                    ppn: q.ppn ?? false,
                    ppnDppFaktor: q.ppnDppFaktor || undefined,
                });
                setPembulatanRp(Math.round((q.total ?? 0) - calcResult.total));

                const isAR = LAYANAN_CONFIG[q.jenisLayanan]?.isAR ?? false;
                setSurveyPhotos(q.surveyPhotos ?? []);
                setChemicals(q.chemicals?.length
                    ? q.chemicals
                    : isAR ? DEFAULT_CHEMICALS_AR.map(c => ({ ...c })) : DEFAULT_CHEMICALS_PCO.map(c => ({ ...c }))
                );
                setMetode(q.metode?.length
                    ? q.metode
                    : (METODE_BY_LAYANAN[q.jenisLayanan] ?? METODE_BY_LAYANAN["anti_rayap_injeksi"]).map(m => m)
                );
                setHamaDikendalikan(q.hamaDikendalikan ?? DEFAULT_HAMA_PCO);
                setTeknikPelaksanaan(q.teknikPelaksanaan?.length ? q.teknikPelaksanaan : DEFAULT_TEKNIK_PCO.map(t => t));
            })
            .catch(() => navigate("/quotations"))
            .finally(() => setLoading(false));
    }, [id]);

    // ── Validation ────────────────────────────────────────────────────────────
    const validate = useCallback((): boolean => {
        const e: Record<string, string> = {};
        if (step === 0 && !nama.trim()) e.nama = "Nama klien wajib diisi.";
        if (step === 1) {
            if (items.length === 0)                       e.items = "Minimal 1 item harga.";
            else if (items.some(it => !it.desc.trim()))   e.items = "Deskripsi item tidak boleh kosong.";
            else if (items.some(it => it.qty <= 0))       e.items = "Qty harus lebih dari 0.";
            else if (items.some(it => it.harga <= 0))     e.items = "Harga satuan harus lebih dari 0.";
        }
        setErrors(e);
        return Object.keys(e).length === 0;
    }, [step, nama, items]);

    const handleNext = () => {
        if (!validate()) return;
        setStep(s => s + 1);
    };

    // ── Save ──────────────────────────────────────────────────────────────────
    const handleSave = async () => {
        if (!quotation || !id) return;
        setSaving(true); setError("");

        const calc = calcTotals({ items, biayaTambahan, diskonPct, ppn, ppnDppFaktor: ppnDppFaktor || undefined });
        const totalFinal = calc.total + pembulatanRp;
        const isAR = LAYANAN_CONFIG[quotation.jenisLayanan]?.isAR ?? false;

        try {
            await updateQuotationData(id, {
                kepadaNama:        nama.trim(),
                kepadaAlamatLines: alamatLines.map(l => l.trim()).filter(Boolean),
                kepadaUp:          up || undefined,
                kepadaWa:          wa || undefined,
                notesMarketing:    notes || undefined,
                items,
                biayaTambahan,
                diskonPct,
                ppn,
                ppnDppFaktor:      ppnDppFaktor || undefined,
                garansiTahun:      garansiTahun || undefined,
                jenisGaransi:      jenisGaransi || undefined,
                subtotal:          calc.subtotal,
                diskonRp:          calc.diskonRp,
                ppnRp:             calc.ppnRp,
                total:             totalFinal,
                surveyPhotos:      surveyPhotos.length > 0 ? surveyPhotos : undefined,
                chemicals:         chemicals.length > 0 ? chemicals : undefined,
                metode:            isAR && metode.length > 0 ? metode : undefined,
                hamaDikendalikan:  !isAR ? hamaDikendalikan : undefined,
                teknikPelaksanaan: !isAR && teknikPelaksanaan.length > 0 ? teknikPelaksanaan : undefined,
            });
            setSaved(true);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Gagal menyimpan perubahan. Coba lagi.");
        } finally {
            setSaving(false);
        }
    };

    // ── Loading screen ─────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <Loader2 size={28} className="animate-spin text-blue-600 mx-auto mb-3" />
                    <p className="text-slate-500 text-sm">Memuat data quotation...</p>
                </div>
            </div>
        );
    }

    // ── Success screen ─────────────────────────────────────────────────────────
    if (saved) {
        return (
            <div className="p-4 md:p-6 max-w-2xl mx-auto">
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm text-center">
                    <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center mx-auto mb-4">
                        <Check size={32} className="text-green-600" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 mb-1">Perubahan Tersimpan!</h2>
                    <p className="text-sm text-slate-500 mb-2">Quotation berhasil diupdate.</p>
                    <code className="text-sm font-bold font-mono bg-slate-100 text-slate-800 px-3 py-1 rounded-lg">
                        {quotation?.noSurat}
                    </code>

                    <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4 text-left">
                        <p className="text-xs font-bold text-amber-600 mb-1 uppercase tracking-wide">ℹ️ PDF Perlu Di-generate Ulang</p>
                        <p className="text-sm text-amber-700">
                            Jika quotation ini sudah disetujui, PDF lama mungkin tidak mencerminkan perubahan ini.
                            Admin bisa re-approve untuk generate PDF baru.
                        </p>
                    </div>

                    <button onClick={() => navigate("/quotations")}
                        className="mt-5 flex items-center justify-center gap-2 w-full px-5 py-3 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors">
                        Kembali ke Daftar Quotation →
                    </button>
                </div>
            </div>
        );
    }

    // ── Form ──────────────────────────────────────────────────────────────────
    const isAR    = LAYANAN_CONFIG[quotation?.jenisLayanan ?? "anti_rayap_injeksi"]?.isAR ?? false;
    const cfg     = LAYANAN_CONFIG[quotation?.jenisLayanan ?? "anti_rayap_injeksi"];
    const isLast  = step === EDIT_STEPS.length - 1;

    return (
        <div className="p-4 md:p-6 max-w-2xl mx-auto pb-12">

            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <button onClick={() => step > 0 ? setStep(s => s - 1) : navigate("/quotations")}
                    className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors">
                    <ArrowLeft size={16} />
                </button>
                <div className="flex-1 min-w-0">
                    <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <FileText size={18} className="text-blue-600 shrink-0" />
                        Edit Quotation
                    </h1>
                    <code className="text-xs text-blue-600 font-mono">{quotation?.noSurat}</code>
                </div>
            </div>

            {/* Info bar — read-only metadata */}
            {quotation && (
                <div className="mb-6 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 flex flex-wrap gap-x-6 gap-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Tag size={11} className="text-slate-400" />
                        <span className="font-medium text-slate-700">{cfg?.label ?? quotation.jenisLayanan}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Info size={11} className="text-slate-400" />
                        <span>Tipe: <span className="font-medium text-slate-700">{TIPE_LABELS[quotation.tipeKontrak] ?? quotation.tipeKontrak}</span></span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Hash size={11} className="text-slate-400" />
                        <span>Status: <span className={`font-semibold capitalize ${
                            quotation.status === "approved" ? "text-green-600"
                            : quotation.status === "rejected" ? "text-red-500"
                            : "text-amber-600"
                        }`}>{quotation.status}</span></span>
                    </div>
                    <p className="w-full text-[10px] text-slate-400 italic">
                        ⚠ Jenis layanan dan tipe kontrak tidak bisa diubah (terikat nomor surat).
                    </p>
                </div>
            )}

            {/* Step indicator */}
            <StepIndicator current={step} />

            {/* Step content */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-6 shadow-sm">
                {step === 0 && (
                    <Step1Edit
                        nama={nama} alamatLines={alamatLines} up={up} wa={wa} notes={notes}
                        onNama={setNama} onAlamat={setAlamatLines} onUp={setUp} onWa={setWa} onNotes={setNotes}
                        errors={errors}
                    />
                )}
                {step === 1 && quotation && (
                    <Step2Edit
                        items={items} biayaTambahan={biayaTambahan}
                        diskonPct={diskonPct} ppn={ppn} ppnDppFaktor={ppnDppFaktor}
                        garansiTahun={garansiTahun} jenisGaransi={jenisGaransi}
                        pembulatanRp={pembulatanRp}
                        jenisLayanan={quotation.jenisLayanan}
                        onItems={setItems} onBiaya={setBiayaTambahan}
                        onDiskon={setDiskonPct} onPpn={setPpn} onPpnDpp={setPpnDppFaktor}
                        onGaransi={setGaransiTahun} onJenisGaransi={setJenisGaransi}
                        onPembulatan={setPembulatanRp}
                        errors={errors}
                    />
                )}
                {step === 2 && quotation && (
                    <Step3Edit
                        jenisLayanan={quotation.jenisLayanan}
                        surveyPhotos={surveyPhotos}    onPhotos={setSurveyPhotos}
                        chemicals={chemicals}          onChemicals={setChemicals}
                        metode={metode}                onMetode={setMetode}
                        hamaDikendalikan={hamaDikendalikan} onHama={setHamaDikendalikan}
                        teknikPelaksanaan={teknikPelaksanaan} onTeknik={setTeknikPelaksanaan}
                    />
                )}

                {/* Global error */}
                {error && (
                    <div className="mt-4 flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                        <AlertCircle size={15} className="shrink-0 mt-0.5" />
                        <p>{error}</p>
                    </div>
                )}

                {/* Navigation */}
                <div className="flex justify-between mt-6 pt-4 border-t border-slate-100">
                    <button type="button"
                        onClick={() => step > 0 ? setStep(s => s - 1) : navigate("/quotations")}
                        className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 disabled:opacity-30 transition-colors">
                        <ArrowLeft size={14} />
                        {step === 0 ? "Batal" : "Kembali"}
                    </button>

                    {!isLast ? (
                        <button type="button" onClick={handleNext}
                            className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors">
                            Lanjut <ArrowRight size={14} />
                        </button>
                    ) : (
                        <button type="button" onClick={handleSave} disabled={saving}
                            className="flex items-center gap-2 px-5 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 disabled:opacity-60 transition-colors">
                            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                            {saving ? "Menyimpan..." : "Simpan Perubahan"}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}