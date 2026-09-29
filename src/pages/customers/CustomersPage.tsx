import { useState, useEffect, useMemo } from "react";
import {
    Users, Search, X, RefreshCw, Loader2, FileText,
    ChevronDown, ChevronUp, CheckCircle2, MessageCircle,
    Shield, Clock, AlertTriangle, CalendarCheck,
    MapPin, ClipboardCheck, Phone, Building2, Wrench,
    Navigation, ExternalLink,
} from "lucide-react";
import { collection, query, where, getDocs, doc, setDoc, Timestamp } from "../../lib/firebase";
import { db } from "../../lib/firebase";
import { useAuthStore } from "../../store/authStore";
import { getQuotations } from "../../services/quotationService";
import { formatDate } from "../../lib/utils";
import { LAYANAN_CONFIG } from "../../lib/quotationConfig";
import type { Quotation } from "../../types";

interface ControlChecklist {
    id: string; tanggal: Date; teknisi: string; catatan: string;
    hasilKontrol: "baik" | "perlu_tindak_lanjut" | "darurat";
}
interface WarrantyInfo {
    quotationId: string; noSurat: string; garansiTahun: number; jenisGaransi?: string;
    dealAt: Date; expiredAt: Date; isActive: boolean; daysRemaining: number;
}
interface ServiceRecord {
    noSurat: string; kategori: "AR" | "PCO"; jenisLayanan: string;
    tanggal: Date; status: string; marketingNama: string;
    garansiTahun?: number; jenisGaransi?: string;
}
// ─── WILAYAH CLASSIFIER ──────────────────────────────────────────────────────

function extractWilayah(alamat: string): string {
    if (!alamat) return "Tidak Diketahui";
    const l = alamat.toLowerCase();
    if (l.includes("jakarta utara")  || l.includes("jakut"))           return "Jakarta Utara";
    if (l.includes("jakarta selatan")|| l.includes("jaksel"))          return "Jakarta Selatan";
    if (l.includes("jakarta barat")  || l.includes("jakbar"))          return "Jakarta Barat";
    if (l.includes("jakarta timur")  || l.includes("jaktim"))          return "Jakarta Timur";
    if (l.includes("jakarta pusat")  || l.includes("jakpus"))          return "Jakarta Pusat";
    if (l.includes("jakarta"))                                           return "Jakarta";
    if (l.includes("tangerang selatan") || l.includes("tangsel"))      return "Tangerang Selatan";
    if (l.includes("tangerang"))                                         return "Tangerang";
    if (l.includes("pamulang"))                                          return "Tangerang Selatan";
    if (l.includes("bogor"))                                             return "Bogor";
    if (l.includes("depok"))                                             return "Depok";
    if (l.includes("bekasi"))                                            return "Bekasi";
    if (l.includes("bandung"))                                           return "Bandung";
    if (l.includes("surabaya"))                                          return "Surabaya";
    if (l.includes("semarang"))                                          return "Semarang";
    if (l.includes("medan"))                                             return "Medan";
    if (l.includes("yogyakarta") || l.includes("jogja"))               return "Yogyakarta";
    if (l.includes("bali"))                                              return "Bali";
    const words = alamat.split(/[\s,./]+/).filter(w => w.length > 3);
    return words[0] ? words[0].charAt(0).toUpperCase() + words[0].slice(1).toLowerCase() : "Lainnya";
}

interface DerivedCustomer {
    id: string; name: string; address: string; addressFull: string[];
    up?: string; wa: string;
    wilayah: string;
    services: ServiceRecord[]; totalQuotations: number; totalDeal: number;
    lastServiceDate: Date | null; jasaDigunakan: string[];
    warranties: WarrantyInfo[]; activeWarranty: WarrantyInfo | null;
    checklists: ControlChecklist[];
}

function useDebounce<T>(value: T, delay = 350): T {
    const [d, setD] = useState(value);
    useEffect(() => { const t = setTimeout(() => setD(value), delay); return () => clearTimeout(t); }, [value, delay]);
    return d;
}

const STATUS_COLOR: Record<string, string> = {
    draft: "bg-slate-100 text-slate-500", pending: "bg-amber-100 text-amber-700",
    approved: "bg-blue-100 text-blue-700", rejected: "bg-red-100 text-red-600",
    sent_to_client: "bg-yellow-100 text-yellow-700", deal: "bg-emerald-100 text-emerald-700",
    cancelled: "bg-slate-100 text-slate-400",
};
const STATUS_LABEL: Record<string, string> = {
    draft: "Draft", pending: "Menunggu", approved: "Disetujui",
    rejected: "Ditolak", sent_to_client: "Dikirim", deal: "Deal", cancelled: "Batal",
};

function WarrantyBadge({ w }: { w: WarrantyInfo | null }) {
    if (!w) return null;
    const expiring = w.isActive && w.daysRemaining <= 90;
    const cls = !w.isActive ? "bg-slate-100 border-slate-200 text-slate-400"
        : expiring ? "bg-amber-50 border-amber-200 text-amber-700"
        : "bg-emerald-50 border-emerald-200 text-emerald-700";
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${cls}`}>
            {w.isActive ? <Shield size={10} /> : <Clock size={10} />}
            {w.isActive ? `Garansi aktif · ${w.daysRemaining} hari lagi` : "Garansi habis"}
        </span>
    );
}

function ChecklistModal({ customer, onClose, onSaved }: {
    customer: DerivedCustomer; onClose: () => void; onSaved: (c: ControlChecklist) => void;
}) {
    const { user } = useAuthStore();
    const [tanggal, setTanggal] = useState(new Date().toISOString().slice(0, 10));
    const [catatan, setCatatan] = useState("");
    const [hasil, setHasil] = useState<ControlChecklist["hasilKontrol"]>("baik");
    const [saving, setSaving] = useState(false);
    const opts = [
        { val: "baik" as const, label: "✓ Baik", cls: "bg-emerald-50 border-emerald-300 text-emerald-700" },
        { val: "perlu_tindak_lanjut" as const, label: "⚠ Perlu Tindak Lanjut", cls: "bg-amber-50 border-amber-300 text-amber-700" },
        { val: "darurat" as const, label: "🚨 Darurat", cls: "bg-red-50 border-red-300 text-red-700" },
    ];
    const handleSave = async () => {
        if (!user) return;
        setSaving(true);
        try {
            const id = `${customer.id}_${Date.now()}`;
            const entry: ControlChecklist = { id, tanggal: new Date(tanggal), teknisi: user.name, catatan, hasilKontrol: hasil };
            await setDoc(doc(db, "customerChecklists", id), {
                customerId: customer.id, customerName: customer.name, companyId: user.companyId,
                tanggal: Timestamp.fromDate(entry.tanggal), teknisi: entry.teknisi,
                catatan: entry.catatan, hasilKontrol: entry.hasilKontrol,
                createdAt: Timestamp.fromDate(new Date()),
            });
            onSaved(entry); onClose();
        } finally { setSaving(false); }
    };
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
                <div className="flex items-center gap-2">
                    <ClipboardCheck size={18} className="text-blue-600" />
                    <h3 className="font-bold text-slate-900">Tambah Kontrol Berkala</h3>
                    <button onClick={onClose} className="ml-auto text-slate-400 hover:text-slate-600"><X size={16} /></button>
                </div>
                <p className="text-xs text-slate-500">Pelanggan: <strong>{customer.name}</strong></p>
                <div className="space-y-3">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Tanggal Kontrol</label>
                        <input type="date" value={tanggal} onChange={e => setTanggal(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Hasil Kontrol</label>
                        <div className="grid grid-cols-3 gap-2">
                            {opts.map(o => (
                                <button key={o.val} type="button" onClick={() => setHasil(o.val)}
                                    className={`px-2 py-2 text-xs font-semibold border rounded-xl transition-all ${hasil === o.val ? o.cls + " ring-2 ring-offset-1" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"}`}>
                                    {o.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Catatan</label>
                        <textarea rows={3} value={catatan} onChange={e => setCatatan(e.target.value)}
                            placeholder="Kondisi lapangan, temuan, tindakan..."
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none" />
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={onClose} className="flex-1 py-2.5 text-sm rounded-xl bg-slate-100 text-slate-600 font-medium hover:bg-slate-200">Batal</button>
                    <button onClick={handleSave} disabled={saving}
                        className="flex-1 py-2.5 text-sm rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
                        {saving ? <Loader2 size={14} className="animate-spin" /> : <CalendarCheck size={14} />} Simpan
                    </button>
                </div>
            </div>
        </div>
    );
}

function CustomerCard({ customer, expanded, onToggle, onAddChecklist }: {
    customer: DerivedCustomer; expanded: boolean; onToggle: () => void; onAddChecklist: () => void;
}) {
    const lastCl = [...customer.checklists].sort((a, b) => b.tanggal.getTime() - a.tanggal.getTime())[0];
    return (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <button onClick={onToggle} className="w-full px-5 py-4 flex items-start gap-4 text-left hover:bg-slate-50 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm shrink-0">
                    {customer.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <p className="text-sm font-bold text-slate-900">{customer.name}</p>
                        <WarrantyBadge w={customer.activeWarranty} />
                    </div>
                    {customer.address && (
                        <p className="text-xs text-slate-400 truncate flex items-center gap-1 mb-0.5">
                            <MapPin size={10} className="shrink-0" /> {customer.address}
                            {customer.wilayah && customer.wilayah !== "Tidak Diketahui" && (
                                <span className="ml-1 text-[10px] font-semibold bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full shrink-0">
                                    {customer.wilayah}
                                </span>
                            )}
                        </p>
                    )}
                    {customer.wa && (
                        <a href={`https://wa.me/${customer.wa.replace(/^0/, "62").replace(/\D/g, "")}`}
                            target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-[10px] text-green-600 hover:text-green-700 font-medium mb-1">
                            <MessageCircle size={10} /> {customer.wa}
                        </a>
                    )}
                    <div className="flex items-center gap-1.5 flex-wrap mt-1">
                        {customer.jasaDigunakan.map(j => (
                            <span key={j} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{j}</span>
                        ))}
                        {customer.totalDeal > 0 && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 flex items-center gap-0.5">
                                <CheckCircle2 size={9} /> {customer.totalDeal}x deal
                            </span>
                        )}
                        {lastCl && (
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-0.5
                                ${lastCl.hasilKontrol === "baik" ? "bg-emerald-100 text-emerald-700"
                                : lastCl.hasilKontrol === "darurat" ? "bg-red-100 text-red-700"
                                : "bg-amber-100 text-amber-700"}`}>
                                <ClipboardCheck size={9} /> Kontrol {formatDate(lastCl.tanggal)}
                            </span>
                        )}
                    </div>
                </div>
                <div className="shrink-0 text-slate-400 mt-1">
                    {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
            </button>

            {expanded && (
                <div className="border-t border-slate-100">
                    {/* Info Klien */}
                    <div className="px-5 py-4 bg-slate-50 border-b border-slate-100 space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1">
                            <Building2 size={10} /> Informasi Klien
                        </p>
                        {customer.wilayah && customer.wilayah !== "Tidak Diketahui" && (
                            <div className="flex items-center gap-2 text-xs mb-1">
                                <MapPin size={12} className="text-blue-400 shrink-0" />
                                <span className="text-slate-600">Wilayah: <strong className="text-blue-600">{customer.wilayah}</strong></span>
                            </div>
                        )}
                        {customer.address && (
                            <div className="flex items-center gap-2 text-xs">
                                <Navigation size={12} className="text-blue-500 shrink-0" />
                                <div className="flex items-center gap-2 flex-wrap">
                                    <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(customer.addressFull.filter(Boolean).join(", "))}`}
                                        target="_blank" rel="noopener noreferrer"
                                        className="text-blue-600 hover:underline font-semibold text-[10px] flex items-center gap-0.5">
                                        <ExternalLink size={10}/> Lihat di Maps
                                    </a>
                                    <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(customer.addressFull.filter(Boolean).join(", "))}`}
                                        target="_blank" rel="noopener noreferrer"
                                        className="text-emerald-600 hover:underline font-semibold text-[10px] flex items-center gap-0.5">
                                        <Navigation size={10}/> Navigasi
                                    </a>
                                </div>
                            </div>
                        )}
                        {customer.addressFull.filter(Boolean).length > 0 && (
                            <div className="flex items-start gap-2 text-xs">
                                <MapPin size={12} className="text-slate-400 shrink-0 mt-0.5" />
                                <div>{customer.addressFull.filter(Boolean).map((l, i) => <p key={i} className="text-slate-700">{l}</p>)}</div>
                            </div>
                        )}
                        {customer.up && (
                            <div className="flex items-center gap-2 text-xs">
                                <Phone size={12} className="text-slate-400 shrink-0" />
                                <span className="text-slate-700">U.p. {customer.up}</span>
                            </div>
                        )}
                        {customer.wa && (
                            <div className="flex items-center gap-2 text-xs">
                                <MessageCircle size={12} className="text-green-500 shrink-0" />
                                <a href={`https://wa.me/${customer.wa.replace(/^0/, "62").replace(/\D/g, "")}`}
                                    target="_blank" rel="noopener noreferrer"
                                    className="text-green-600 hover:underline font-medium">{customer.wa}</a>
                            </div>
                        )}
                        {customer.lastServiceDate && (
                            <div className="flex items-center gap-2 text-xs">
                                <Wrench size={12} className="text-slate-400 shrink-0" />
                                <span className="text-slate-600">Terakhir dikerjakan: <strong>{formatDate(customer.lastServiceDate)}</strong></span>
                            </div>
                        )}
                    </div>

                    {/* Garansi */}
                    {customer.warranties.length > 0 && (
                        <div className="px-5 py-4 bg-purple-50 border-b border-purple-100">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-purple-500 mb-3 flex items-center gap-1">
                                <Shield size={10} /> Status Garansi
                            </p>
                            <div className="space-y-2">
                                {customer.warranties.map(w => (
                                    <div key={w.quotationId} className={`p-3 rounded-xl border text-xs ${w.isActive ? "bg-white border-purple-200" : "bg-slate-50 border-slate-200 opacity-60"}`}>
                                        <div className="flex items-center justify-between mb-1">
                                            <code className="font-mono font-bold text-purple-700">{w.noSurat}</code>
                                            {w.isActive
                                                ? <span className="font-bold text-emerald-600">{w.daysRemaining} hari lagi</span>
                                                : <span className="text-slate-400">Kadaluarsa</span>}
                                        </div>
                                        <p className="text-slate-600">{w.jenisGaransi ?? "Anti Rayap"} · {w.garansiTahun} tahun</p>
                                        <p className="text-slate-400 mt-0.5">{formatDate(w.dealAt)} — {formatDate(w.expiredAt)}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Kontrol Berkala */}
                    <div className="px-5 py-4 border-b border-slate-100">
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1">
                                <ClipboardCheck size={10} /> Kontrol Berkala
                            </p>
                            <button onClick={e => { e.stopPropagation(); onAddChecklist(); }}
                                className="text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                                + Tambah
                            </button>
                        </div>
                        {customer.checklists.length === 0 ? (
                            <p className="text-xs text-slate-400 italic">Belum ada riwayat kontrol.</p>
                        ) : (
                            <div className="space-y-2 max-h-44 overflow-y-auto">
                                {[...customer.checklists].sort((a, b) => b.tanggal.getTime() - a.tanggal.getTime()).map(c => (
                                    <div key={c.id} className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs
                                        ${c.hasilKontrol === "baik" ? "bg-emerald-50 border-emerald-100"
                                        : c.hasilKontrol === "darurat" ? "bg-red-50 border-red-100"
                                        : "bg-amber-50 border-amber-100"}`}>
                                        <div className="shrink-0 mt-0.5">
                                            {c.hasilKontrol === "baik" ? <CheckCircle2 size={13} className="text-emerald-600" />
                                            : c.hasilKontrol === "darurat" ? <AlertTriangle size={13} className="text-red-600" />
                                            : <Clock size={13} className="text-amber-600" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="font-semibold text-slate-700">{formatDate(c.tanggal)}</span>
                                                <span className="text-slate-400 text-[10px] shrink-0">{c.teknisi}</span>
                                            </div>
                                            {c.catatan && <p className="text-slate-500 mt-0.5">{c.catatan}</p>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Riwayat Pekerjaan */}
                    <div className="px-5 py-4">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1">
                            <FileText size={10} /> Riwayat Pekerjaan
                        </p>
                        <div className="space-y-2">
                            {customer.services.sort((a, b) => b.tanggal.getTime() - a.tanggal.getTime()).map(s => (
                                <div key={s.noSurat} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                    <div className="flex items-center gap-2 flex-wrap mb-1">
                                        <code className={`text-xs font-bold font-mono px-1.5 py-0.5 rounded ${s.kategori === "AR" ? "bg-purple-100 text-purple-700" : "bg-cyan-100 text-cyan-700"}`}>
                                            {s.noSurat}
                                        </code>
                                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${STATUS_COLOR[s.status] ?? "bg-slate-100 text-slate-500"}`}>
                                            {STATUS_LABEL[s.status] ?? s.status}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-700 font-medium">{s.jenisLayanan}</p>
                                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                        <span className="text-[10px] text-slate-400">{formatDate(s.tanggal)}</span>
                                        <span className="text-[10px] text-slate-400">· by {s.marketingNama}</span>
                                        {s.garansiTahun && s.garansiTahun > 0 && (
                                            <span className="text-[10px] text-purple-600 font-semibold">
                                                · Garansi {s.garansiTahun}thn ({s.jenisGaransi ?? "Anti Rayap"})
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export function CustomersPage() {
    const { user } = useAuthStore();
    const [quotations, setQuotations] = useState<Quotation[]>([]);
    const [checklists, setChecklists] = useState<(ControlChecklist & { customerId: string })[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQ, setSearchQ] = useState("");
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [sortBy, setSortBy] = useState<"date" | "name" | "deal" | "area">("date");
    const [filterWarranty, setFilterWarranty] = useState(false);
    const [checklistTarget, setChecklistTarget] = useState<DerivedCustomer | null>(null);

    const debouncedSearch = useDebounce(searchQ, 350);
    const canSeeAll = user?.role !== "marketing";

    const load = async () => {
        if (!user) return;
        setLoading(true);
        try {
            // Load quotations — this is the primary data source
            const quotesData = await getQuotations({
                companyId: user.companyId,
                byUid: canSeeAll ? undefined : user.uid,
            });
            setQuotations(quotesData);
        } catch (err) {
            console.error("[CustomersPage] load quotations error:", err);
        }

        // Load checklists separately — don't block quotations if this fails
        try {
            const checkSnap = await getDocs(
                query(collection(db, "customerChecklists"), where("companyId", "==", user.companyId))
            );
            setChecklists(checkSnap.docs.map(d => {
                const x = d.data();
                return {
                    id: d.id, customerId: x.customerId as string,
                    tanggal: (x.tanggal as Timestamp).toDate(),
                    teknisi: x.teknisi as string,
                    catatan: (x.catatan as string) ?? "",
                    hasilKontrol: x.hasilKontrol as ControlChecklist["hasilKontrol"],
                };
            }));
        } catch {
            // customerChecklists collection may not exist yet — silently ignore
            setChecklists([]);
        }

        setLoading(false);
    };

    useEffect(() => { load(); }, [user]);

    const customerMap = useMemo(() => {
        const map = new Map<string, DerivedCustomer>();
        const now = new Date();

        quotations.forEach(q => {
            const key = q.kepadaNama.trim().toLowerCase().replace(/\s+/g, "_");
            if (!map.has(key)) {
                const addr0 = q.kepadaAlamatLines?.[0] ?? "";
                map.set(key, {
                    id: key, name: q.kepadaNama,
                    address: addr0,
                    addressFull: q.kepadaAlamatLines ?? [],
                    up: q.kepadaUp, wa: q.kepadaWa ?? "",
                    wilayah: extractWilayah(addr0),
                    services: [], totalQuotations: 0, totalDeal: 0,
                    lastServiceDate: null, jasaDigunakan: [],
                    warranties: [], activeWarranty: null, checklists: [],
                });
            }
            const c = map.get(key)!;
            c.totalQuotations++;

            const jasa = LAYANAN_CONFIG[q.jenisLayanan]?.label.split("—")[1]?.trim() ?? q.jenisLayanan;
            c.services.push({
                noSurat: q.noSurat, kategori: q.kategori,
                jenisLayanan: jasa, tanggal: q.tanggal,
                status: q.status, marketingNama: q.marketingNama,
                garansiTahun: q.garansiTahun, jenisGaransi: q.jenisGaransi,
            });
            if (!c.jasaDigunakan.includes(jasa)) c.jasaDigunakan.push(jasa);

            if (q.status === "deal") {
                c.totalDeal++;
                const dealDate = (q as any).dealAt instanceof Date ? (q as any).dealAt : null;
                if (dealDate && (!c.lastServiceDate || dealDate > c.lastServiceDate)) {
                    c.lastServiceDate = dealDate;
                }
                if (q.garansiTahun && q.garansiTahun > 0 && dealDate) {
                    const expiredAt = new Date(dealDate);
                    expiredAt.setFullYear(expiredAt.getFullYear() + q.garansiTahun);
                    const daysRemaining = Math.ceil((expiredAt.getTime() - now.getTime()) / 86400000);
                    const w: WarrantyInfo = {
                        quotationId: q.id, noSurat: q.noSurat,
                        garansiTahun: q.garansiTahun, jenisGaransi: q.jenisGaransi,
                        dealAt: dealDate, expiredAt,
                        isActive: daysRemaining > 0, daysRemaining: Math.max(0, daysRemaining),
                    };
                    c.warranties.push(w);
                    if (w.isActive && (!c.activeWarranty || w.expiredAt > c.activeWarranty.expiredAt)) {
                        c.activeWarranty = w;
                    }
                }
            }

            if (!c.address && q.kepadaAlamatLines?.[0]) {
                c.address = q.kepadaAlamatLines[0];
                c.addressFull = q.kepadaAlamatLines;
            }
            if (!c.up && q.kepadaUp) c.up = q.kepadaUp;
            if (!c.wa && q.kepadaWa) c.wa = q.kepadaWa;
            // Re-compute wilayah if we now have better address
            if (c.wilayah === "Tidak Diketahui" && c.address) c.wilayah = extractWilayah(c.address);
        });

        checklists.forEach(cl => {
            const c = map.get(cl.customerId);
            if (c) c.checklists.push(cl);
        });

        return map;
    }, [quotations, checklists]);

    let customers = Array.from(customerMap.values());
    if (filterWarranty) customers = customers.filter(c => c.activeWarranty?.isActive);
    if (debouncedSearch) {
        const s = debouncedSearch.toLowerCase();
        customers = customers.filter(c =>
            c.name.toLowerCase().includes(s) ||
            c.address.toLowerCase().includes(s) ||
            c.wilayah.toLowerCase().includes(s) ||
            c.jasaDigunakan.some(j => j.toLowerCase().includes(s))
        );
    }
    customers.sort((a, b) =>
        sortBy === "name"    ? a.name.localeCompare(b.name)
        : sortBy === "deal"  ? b.totalDeal - a.totalDeal
        : sortBy === "area"  ? a.wilayah.localeCompare(b.wilayah)
        : b.services[0]?.tanggal?.getTime() - a.services[0]?.tanggal?.getTime()
    );

    const totalCustomers = customerMap.size;
    const withDeal = Array.from(customerMap.values()).filter(c => c.totalDeal > 0).length;
    const activeWarranties = Array.from(customerMap.values()).filter(c => c.activeWarranty?.isActive).length;
    const expiringWarranties = Array.from(customerMap.values()).filter(c =>
        c.activeWarranty?.isActive && c.activeWarranty.daysRemaining <= 90
    ).length;

    return (
        <div className="p-4 md:p-6 max-w-screen-lg mx-auto space-y-5">
            <div>
                <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <Users size={20} className="text-blue-600" /> Pelanggan
                </h1>
                <p className="text-sm text-slate-500 mt-0.5">
                    {canSeeAll ? "Database klien perusahaan" : "Klien dari quotation kamu"}
                </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
                <div className="bg-white border border-slate-200 rounded-xl p-3">
                    <p className="text-2xl font-bold text-slate-800">{totalCustomers}</p>
                    <p className="text-xs text-slate-500 mt-0.5">Total Klien</p>
                </div>
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                    <p className="text-2xl font-bold text-emerald-700">{withDeal}</p>
                    <p className="text-xs text-slate-500 mt-0.5">Pernah Deal</p>
                </div>
                <div className={`border rounded-xl p-3 ${expiringWarranties > 0 ? "bg-amber-50 border-amber-100" : "bg-purple-50 border-purple-100"}`}>
                    <p className={`text-2xl font-bold ${expiringWarranties > 0 ? "text-amber-700" : "text-purple-700"}`}>{activeWarranties}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Garansi Aktif{expiringWarranties > 0 ? ` · ${expiringWarranties} segera habis` : ""}
                    </p>
                </div>
            </div>

            {expiringWarranties > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
                    <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-bold text-amber-800">Garansi akan segera habis</p>
                        <p className="text-xs text-amber-700 mt-0.5">
                            {expiringWarranties} pelanggan memiliki garansi yang akan habis dalam 90 hari.
                        </p>
                    </div>
                </div>
            )}

            {/* ── Search bar — full width ── */}
            <div className="flex items-center gap-2 w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-300 transition-all">
                <Search size={16} className="text-slate-400 shrink-0" />
                <input
                    className="flex-1 text-sm bg-transparent outline-none text-slate-800 placeholder:text-slate-400"
                    placeholder="Cari nama klien, alamat, wilayah, atau jenis jasa..."
                    value={searchQ}
                    onChange={e => setSearchQ(e.target.value)}
                    autoComplete="off"
                />
                {searchQ && (
                    <button onClick={() => setSearchQ("")} className="text-slate-400 hover:text-slate-600 shrink-0 p-0.5 rounded">
                        <X size={14} />
                    </button>
                )}
            </div>

            {/* ── Filter chips row ── */}
            <div className="flex items-center gap-2 flex-wrap">
                <button
                    onClick={() => setFilterWarranty(v => !v)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                        filterWarranty
                            ? "bg-purple-600 text-white border-purple-600"
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}>
                    <Shield size={12} />
                    Bergaransi
                </button>

                <select
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value as typeof sortBy)}
                    className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-100">
                    <option value="date">Terbaru</option>
                    <option value="deal">Terbanyak Deal</option>
                    <option value="name">Nama A-Z</option>
                    <option value="area">Per Wilayah</option>
                </select>

                <button
                    onClick={load}
                    disabled={loading}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-slate-200 bg-white text-slate-500 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors">
                    <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
                    Refresh
                </button>

                {(searchQ || filterWarranty) && (
                    <button
                        onClick={() => { setSearchQ(""); setFilterWarranty(false); }}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg border border-slate-200 transition-colors">
                        <X size={11} /> Reset
                    </button>
                )}

                {/* Result count */}
                <span className="ml-auto text-xs text-slate-400 font-medium">
                    {loading ? "..." : `${customers.length} klien`}
                </span>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-16 text-slate-400">
                    <Loader2 size={24} className="animate-spin mr-2" /> Memuat data...
                </div>
            ) : customers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400 text-center">
                    <Users size={36} className="mb-3 opacity-20" />
                    <p className="font-medium text-slate-500">
                        {debouncedSearch || filterWarranty ? "Klien tidak ditemukan" : "Belum ada data klien"}
                    </p>
                    <p className="text-sm mt-1">
                        {debouncedSearch || filterWarranty ? "Coba ubah filter." : "Data muncul otomatis dari quotation."}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {customers.map(c => (
                        <CustomerCard key={c.id} customer={c}
                            expanded={expandedId === c.id}
                            onToggle={() => setExpandedId(prev => prev === c.id ? null : c.id)}
                            onAddChecklist={() => setChecklistTarget(c)} />
                    ))}
                    <p className="text-xs text-slate-400 text-center pt-1">
                        {customers.length} dari {totalCustomers} klien
                    </p>
                </div>
            )}

            {checklistTarget && (
                <ChecklistModal customer={checklistTarget}
                    onClose={() => setChecklistTarget(null)}
                    onSaved={entry => {
                        setChecklists(prev => [...prev, { ...entry, customerId: checklistTarget.id }]);
                        setChecklistTarget(null);
                    }} />
            )}
        </div>
    );
}