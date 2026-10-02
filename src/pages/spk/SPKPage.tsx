import { useState, useEffect, useMemo } from "react";
import {
    ClipboardList, Plus, Search, RefreshCw, Loader2,
    ChevronRight, User, CalendarDays, AlertCircle,
    CheckCircle2, Clock, PlayCircle, X, MapPin,
    FileText, ArrowRight, Wrench, Filter,
} from "lucide-react";
import { collection, query, where, getDocs, Timestamp } from "../../lib/firebase";
import { db } from "../../lib/firebase";
import { useAuthStore } from "../../store/authStore";
import {
    createSPK, getSPKList, updateSPKStatus, reassignSPK,
} from "../../services/spkService";
import type { SPK, AppUser, Quotation } from "../../types";

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
    assigned: {
        label: "Assigned",
        color: "bg-blue-100 text-blue-700",
        icon: <Clock size={11} />,
        next: "in_progress" as SPK["status"],
        nextLabel: "Mulai Pengerjaan",
        nextColor: "bg-amber-500 hover:bg-amber-600",
        nextIcon: <PlayCircle size={13} />,
    },
    in_progress: {
        label: "In Progress",
        color: "bg-amber-100 text-amber-700",
        icon: <PlayCircle size={11} />,
        next: "done" as SPK["status"],
        nextLabel: "Selesaikan",
        nextColor: "bg-emerald-600 hover:bg-emerald-700",
        nextIcon: <CheckCircle2 size={13} />,
    },
    done: {
        label: "Selesai",
        color: "bg-emerald-100 text-emerald-700",
        icon: <CheckCircle2 size={11} />,
        next: null,
        nextLabel: null,
        nextColor: null,
        nextIcon: null,
    },
};

function fmt(d: Date) {
    return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtDatetime(d: Date) {
    return d.toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatRupiah(n: number) {
    return "Rp " + n.toLocaleString("id-ID");
}

// ─── CREATE SPK MODAL ─────────────────────────────────────────────────────────

function CreateSPKModal({
    companyId,
    user,
    onClose,
    onCreated,
}: {
    companyId: string;
    user: AppUser;
    onClose: () => void;
    onCreated: () => void;
}) {
    const [quotations, setQuotations] = useState<Quotation[]>([]);
    const [teknisis, setTeknisis] = useState<AppUser[]>([]);
    const [loadingData, setLoadingData] = useState(true);

    const [selectedQuo, setSelectedQuo] = useState<Quotation | null>(null);
    const [technicianId, setTechnicianId] = useState("");
    const [scheduleDate, setScheduleDate] = useState("");
    const [lokasi, setLokasi] = useState("");
    const [notes, setNotes] = useState("");
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState("");
    const [quoSearch, setQuoSearch] = useState("");

    useEffect(() => {
        const load = async () => {
            setLoadingData(true);
            try {
                // Load approved quotations yang belum punya SPK
                const [quoSnap, spkSnap, userSnap] = await Promise.all([
                    getDocs(query(
                        collection(db, "quotations"),
                        where("companyId", "==", companyId),
                        where("status", "==", "approved"),
                    )),
                    getDocs(query(
                        collection(db, "spk"),
                        where("companyId", "==", companyId),
                    )),
                    getDocs(query(
                        collection(db, "users"),
                        where("companyId", "==", companyId),
                        where("role", "==", "TEKNISI_LAPANGAN"),
                        where("isActive", "==", true),
                    )),
                ]);

                const usedQIds = new Set(spkSnap.docs.map(d => d.data().quotationId as string));
                const quoList = quoSnap.docs
                    .map(d => {
                        const data = d.data() as Record<string, unknown>;
                        return {
                            id: d.id,
                            noSurat: data.noSurat,
                            kepadaNama: data.kepadaNama,
                            perihal: data.perihal,
                            total: data.total,
                            jenisLayanan: data.jenisLayanan,
                            kategori: data.kategori,
                            kepadaAlamatLines: data.kepadaAlamatLines ?? [],
                            companyId: data.companyId,
                            tanggal: (data.tanggal as Timestamp).toDate(),
                            status: data.status,
                        } as unknown as Quotation;
                    })
                    .filter(q => !usedQIds.has(q.id));

                const tekList = userSnap.docs.map(d => ({ uid: d.id, ...d.data() } as AppUser));

                setQuotations(quoList);
                setTeknisis(tekList);
            } finally {
                setLoadingData(false);
            }
        };
        load();
    }, [companyId]);

    const filteredQuos = useMemo(() => {
        if (!quoSearch) return quotations;
        const s = quoSearch.toLowerCase();
        return quotations.filter(q =>
            q.noSurat.toLowerCase().includes(s) ||
            q.kepadaNama.toLowerCase().includes(s) ||
            q.perihal.toLowerCase().includes(s)
        );
    }, [quotations, quoSearch]);

    const handleSubmit = async () => {
        setErr("");
        if (!selectedQuo) { setErr("Pilih quotation terlebih dahulu."); return; }
        if (!technicianId) { setErr("Pilih teknisi."); return; }
        if (!scheduleDate) { setErr("Tentukan tanggal jadwal."); return; }

        const teknisi = teknisis.find(t => t.uid === technicianId);
        if (!teknisi) return;

        setSaving(true);
        try {
            await createSPK({
                quotationId: selectedQuo.id,
                quotationNoSurat: selectedQuo.noSurat,
                customerName: selectedQuo.kepadaNama,
                technicianId,
                technicianName: teknisi.name,
                scheduleDate: new Date(scheduleDate),
                serviceType: selectedQuo.kategori === "AR" ? "TERMITE_CONTROL" : "GENERAL_PEST_CONTROL",
                perihal: selectedQuo.perihal,
                lokasi: lokasi.trim(),
                notes: notes.trim(),
                companyId,
                createdBy: user.uid,
                createdByName: user.name,
            });
            onCreated();
        } catch (e) {
            setErr(e instanceof Error ? e.message : String(e));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <div>
                        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                            <ClipboardList size={18} className="text-blue-600" /> Buat SPK Baru
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">Dari quotation yang sudah disetujui</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100">
                        <X size={18} />
                    </button>
                </div>

                <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
                    {loadingData ? (
                        <div className="flex items-center justify-center py-12 text-slate-400">
                            <Loader2 size={20} className="animate-spin mr-2" /> Memuat data...
                        </div>
                    ) : (
                        <>
                            {/* Step 1: Pilih Quotation */}
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">
                                    1. Pilih Quotation (Approved) *
                                </label>
                                <div className="relative mb-2">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                                        placeholder="Cari nomor surat atau nama klien..."
                                        value={quoSearch}
                                        onChange={e => setQuoSearch(e.target.value)}
                                    />
                                </div>
                                {filteredQuos.length === 0 ? (
                                    <div className="text-center py-6 text-slate-400 bg-slate-50 rounded-xl border border-slate-100">
                                        <FileText size={24} className="mx-auto mb-2 opacity-30" />
                                        <p className="text-sm">
                                            {quotations.length === 0
                                                ? "Tidak ada quotation approved yang tersedia."
                                                : "Tidak ada hasil pencarian."}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                        {filteredQuos.map(q => (
                                            <button
                                                key={q.id}
                                                onClick={() => {
                                                    setSelectedQuo(q);
                                                    setLokasi((q.kepadaAlamatLines ?? []).join(", "));
                                                }}
                                                className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                                                    selectedQuo?.id === q.id
                                                        ? "border-blue-400 bg-blue-50 ring-1 ring-blue-300"
                                                        : "border-slate-200 hover:border-blue-200 hover:bg-slate-50"
                                                }`}
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-bold text-slate-900 font-mono">{q.noSurat}</p>
                                                        <p className="text-xs text-slate-600 mt-0.5 truncate">{q.kepadaNama}</p>
                                                        <p className="text-xs text-slate-400 truncate">{q.perihal}</p>
                                                    </div>
                                                    <div className="text-right flex-shrink-0">
                                                        <p className="text-xs font-semibold text-slate-700">{formatRupiah(q.total)}</p>
                                                        <p className="text-xs text-slate-400">{fmt(q.tanggal)}</p>
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Selected preview */}
                            {selectedQuo && (
                                <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center gap-3">
                                    <CheckCircle2 size={16} className="text-blue-600 flex-shrink-0" />
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-blue-900 font-mono">{selectedQuo.noSurat}</p>
                                        <p className="text-xs text-blue-700">{selectedQuo.kepadaNama} · {selectedQuo.perihal}</p>
                                    </div>
                                </div>
                            )}

                            {/* Step 2: Assign Teknisi */}
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">
                                    2. Assign Teknisi *
                                </label>
                                {teknisis.length === 0 ? (
                                    <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-center gap-2">
                                        <AlertCircle size={14} /> Belum ada teknisi aktif di perusahaan ini.
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {teknisis.map(t => (
                                            <button
                                                key={t.uid}
                                                onClick={() => setTechnicianId(t.uid)}
                                                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all ${
                                                    technicianId === t.uid
                                                        ? "border-blue-400 bg-blue-50 ring-1 ring-blue-300"
                                                        : "border-slate-200 hover:border-blue-200 hover:bg-slate-50"
                                                }`}
                                            >
                                                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-sm font-bold text-slate-600 flex-shrink-0">
                                                    {t.name[0]?.toUpperCase()}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-slate-900 truncate">{t.name}</p>
                                                    <p className="text-xs text-slate-400 truncate">{t.jabatan || "Teknisi"}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Step 3: Jadwal */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wide text-slate-400 mb-1">
                                        3. Tanggal Jadwal *
                                    </label>
                                    <input
                                        type="date"
                                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                                        value={scheduleDate}
                                        min={new Date().toISOString().split("T")[0]}
                                        onChange={e => setScheduleDate(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wide text-slate-400 mb-1">
                                        Lokasi
                                    </label>
                                    <input
                                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                                        placeholder="Alamat lokasi pekerjaan"
                                        value={lokasi}
                                        onChange={e => setLokasi(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Catatan */}
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wide text-slate-400 mb-1">
                                    Catatan (Opsional)
                                </label>
                                <textarea
                                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
                                    rows={2}
                                    placeholder="Instruksi khusus untuk teknisi..."
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                />
                            </div>

                            {err && (
                                <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg p-3">
                                    <AlertCircle size={14} className="flex-shrink-0 mt-0.5" /> {err}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-600 text-sm font-medium hover:bg-slate-200 transition-colors"
                    >
                        Batal
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={saving || loadingData}
                        className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                    >
                        {saving ? <><Loader2 size={13} className="animate-spin" /> Menyimpan...</> : <><ClipboardList size={13} /> Buat SPK</>}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── DETAIL / EDIT MODAL ──────────────────────────────────────────────────────

function SPKDetailModal({
    spk,
    canEdit,
    companyId,
    onClose,
    onUpdated,
}: {
    spk: SPK;
    canEdit: boolean;
    companyId: string;
    onClose: () => void;
    onUpdated: () => void;
}) {
    const cfg = STATUS_CONFIG[spk.status];
    const [updatingStatus, setUpdatingStatus] = useState(false);
    const [reassigning, setReassigning] = useState(false);
    const [teknisis, setTeknisis] = useState<AppUser[]>([]);
    const [newTechId, setNewTechId] = useState(spk.technicianId);
    const [newDate, setNewDate] = useState(spk.scheduleDate.toISOString().split("T")[0]);
    const [savingReassign, setSavingReassign] = useState(false);

    useEffect(() => {
        if (!reassigning) return;
        getDocs(query(
            collection(db, "users"),
            where("companyId", "==", companyId),
            where("role", "==", "TEKNISI_LAPANGAN"),
            where("isActive", "==", true),
        )).then(snap => {
            setTeknisis(snap.docs.map(d => ({ uid: d.id, ...d.data() } as AppUser)));
        });
    }, [reassigning, companyId]);

    const handleUpdateStatus = async () => {
        if (!cfg.next) return;
        setUpdatingStatus(true);
        try {
            await updateSPKStatus(spk.id, cfg.next);
            onUpdated();
        } finally {
            setUpdatingStatus(false);
        }
    };

    const handleReassign = async () => {
        const t = teknisis.find(x => x.uid === newTechId);
        if (!t) return;
        setSavingReassign(true);
        try {
            await reassignSPK(spk.id, newTechId, t.name, new Date(newDate));
            onUpdated();
        } finally {
            setSavingReassign(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col">

                {/* Header */}
                <div className="flex items-start justify-between px-6 py-4 border-b border-slate-100">
                    <div>
                        <p className="text-xs font-mono text-slate-400 mb-0.5">{(spk as any).quotationNoSurat}</p>
                        <h3 className="text-base font-bold text-slate-900">{spk.customerName}</h3>
                        <p className="text-sm text-slate-500">{(spk as any).perihal}</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 ml-3">
                        <X size={18} />
                    </button>
                </div>

                <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
                    {/* Status badge */}
                    <div className="flex items-center gap-3">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${cfg.color}`}>
                            {cfg.icon} {cfg.label}
                        </span>
                        {spk.status !== "done" && canEdit && !reassigning && (
                            <button
                                onClick={handleUpdateStatus}
                                disabled={updatingStatus}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-white transition-colors ${cfg.nextColor} disabled:opacity-50`}
                            >
                                {updatingStatus ? <Loader2 size={11} className="animate-spin" /> : cfg.nextIcon}
                                {cfg.nextLabel}
                            </button>
                        )}
                    </div>

                    {/* Info grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <InfoBlock icon={<User size={13} />} label="Teknisi" value={spk.technicianName} />
                        <InfoBlock icon={<CalendarDays size={13} />} label="Jadwal" value={fmt(spk.scheduleDate)} />
                        <InfoBlock icon={<MapPin size={13} />} label="Lokasi" value={(spk as any).lokasi || "—"} />
                        <InfoBlock icon={<Wrench size={13} />} label="Layanan" value={spk.serviceType === "TERMITE_CONTROL" ? "Anti Rayap" : "Pest Control"} />
                        {spk.actualStart && (
                            <InfoBlock icon={<PlayCircle size={13} />} label="Mulai" value={fmtDatetime(spk.actualStart)} />
                        )}
                        {spk.actualEnd && (
                            <InfoBlock icon={<CheckCircle2 size={13} />} label="Selesai" value={fmtDatetime(spk.actualEnd)} />
                        )}
                    </div>

                    {(spk as any).notes && (
                        <div className="bg-slate-50 rounded-xl px-4 py-3">
                            <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-1">Catatan</p>
                            <p className="text-sm text-slate-700">{(spk as any).notes}</p>
                        </div>
                    )}

                    <div className="text-xs text-slate-400">
                        Dibuat oleh <span className="font-medium text-slate-600">{(spk as any).createdByName}</span> · {fmt(spk.createdAt)}
                    </div>

                    {/* Reassign */}
                    {canEdit && spk.status !== "done" && (
                        <div className="border-t border-slate-100 pt-4">
                            {!reassigning ? (
                                <button
                                    onClick={() => setReassigning(true)}
                                    className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1"
                                >
                                    <ArrowRight size={11} /> Ganti Teknisi / Jadwal
                                </button>
                            ) : (
                                <div className="space-y-3">
                                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Ganti Teknisi / Jadwal</p>
                                    {teknisis.length > 0 && (
                                        <select
                                            value={newTechId}
                                            onChange={e => setNewTechId(e.target.value)}
                                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                                        >
                                            {teknisis.map(t => (
                                                <option key={t.uid} value={t.uid}>{t.name}</option>
                                            ))}
                                        </select>
                                    )}
                                    <input
                                        type="date"
                                        value={newDate}
                                        onChange={e => setNewDate(e.target.value)}
                                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                                    />
                                    <div className="flex gap-2">
                                        <button onClick={() => setReassigning(false)}
                                            className="flex-1 py-2 rounded-lg bg-slate-100 text-slate-600 text-xs font-medium hover:bg-slate-200">
                                            Batal
                                        </button>
                                        <button onClick={handleReassign} disabled={savingReassign}
                                            className="flex-1 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-1">
                                            {savingReassign ? <Loader2 size={11} className="animate-spin" /> : null}
                                            Simpan
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function InfoBlock({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className="bg-slate-50 rounded-xl px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                {icon}
                <span className="text-xs font-bold uppercase tracking-wide">{label}</span>
            </div>
            <p className="text-sm font-medium text-slate-800">{value}</p>
        </div>
    );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export function SPKPage() {
    const { user } = useAuthStore();
    const companyId = user?.companyId ?? "";
    const canCreate = user?.role !== "TEKNISI_LAPANGAN" && user?.role !== "SUPERADMIN";

    const [spkList, setSpkList] = useState<SPK[]>([]);
    const [loading, setLoading] = useState(true);
    const [createOpen, setCreateOpen] = useState(false);
    const [selected, setSelected] = useState<SPK | null>(null);
    const [filterStatus, setFilterStatus] = useState<SPK["status"] | "all">("all");
    const [search, setSearch] = useState("");

    const load = async () => {
        if (!companyId) return;
        setLoading(true);
        try {
            const list = await getSPKList({ companyId });
            setSpkList(list);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, [companyId]); // eslint-disable-line

    const filtered = useMemo(() => {
        let list = spkList;
        if (filterStatus !== "all") list = list.filter(s => s.status === filterStatus);
        if (search) {
            const s = search.toLowerCase();
            list = list.filter(spk =>
                spk.customerName.toLowerCase().includes(s) ||
                (spk as any).perihal?.toLowerCase().includes(s) ||
                spk.technicianName.toLowerCase().includes(s) ||
                (spk as any).quotationNoSurat?.toLowerCase().includes(s)
            );
        }
        return list;
    }, [spkList, filterStatus, search]);

    // Stats
    const stats = useMemo(() => ({
        all: spkList.length,
        assigned: spkList.filter(s => s.status === "assigned").length,
        in_progress: spkList.filter(s => s.status === "in_progress").length,
        done: spkList.filter(s => s.status === "done").length,
    }), [spkList]);

    return (
        <div className="p-4 md:p-6 max-w-screen-xl mx-auto space-y-5">

            {/* ── Header ── */}
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <ClipboardList size={22} className="text-blue-600" /> SPK
                    </h1>
                    <p className="text-sm text-slate-400 mt-0.5">Surat Perintah Kerja — penugasan teknisi</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={load} className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors">
                        <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                    </button>
                    {canCreate && (
                        <button
                            onClick={() => setCreateOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            <Plus size={15} /> Buat SPK
                        </button>
                    )}
                </div>
            </div>

            {/* ── Stat cards ── */}
            <div className="grid grid-cols-4 gap-3">
                {[
                    { key: "all", label: "Total SPK", color: "bg-slate-100 text-slate-700", count: stats.all },
                    { key: "assigned", label: "Assigned", color: "bg-blue-100 text-blue-700", count: stats.assigned },
                    { key: "in_progress", label: "In Progress", color: "bg-amber-100 text-amber-700", count: stats.in_progress },
                    { key: "done", label: "Selesai", color: "bg-emerald-100 text-emerald-700", count: stats.done },
                ].map(s => (
                    <button
                        key={s.key}
                        onClick={() => setFilterStatus(s.key as SPK["status"] | "all")}
                        className={`rounded-xl px-4 py-3 text-left transition-all border-2 ${
                            filterStatus === s.key
                                ? "border-blue-400 bg-blue-50"
                                : "border-transparent bg-white hover:border-slate-200"
                        } shadow-sm`}
                    >
                        <p className="text-2xl font-bold text-slate-900">{s.count}</p>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold mt-1 ${s.color}`}>
                            {s.label}
                        </span>
                    </button>
                ))}
            </div>

            {/* ── Search & filter ── */}
            <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-sm">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                        placeholder="Cari klien, teknisi, nomor surat..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-400">
                    <Filter size={12} />
                    <span>{filtered.length} SPK</span>
                </div>
            </div>

            {/* ── Table ── */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                {loading ? (
                    <div className="flex items-center justify-center py-16 text-slate-400">
                        <Loader2 size={20} className="animate-spin mr-2" /> Memuat...
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-16 text-slate-400">
                        <ClipboardList size={36} className="mx-auto mb-3 opacity-20" />
                        <p className="text-sm font-medium">
                            {spkList.length === 0 ? "Belum ada SPK." : "Tidak ada hasil pencarian."}
                        </p>
                        {spkList.length === 0 && canCreate && (
                            <button
                                onClick={() => setCreateOpen(true)}
                                className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                <Plus size={14} /> Buat SPK Pertama
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                    {/* Desktop table */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr>
                                    {["No. Surat / Perihal", "Klien", "Teknisi", "Jadwal", "Status", ""].map(h => (
                                        <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-400 bg-slate-50 border-b border-slate-100 whitespace-nowrap">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(spk => {
                                    const cfg = STATUS_CONFIG[spk.status];
                                    return (
                                        <tr
                                            key={spk.id}
                                            className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors cursor-pointer"
                                            onClick={() => setSelected(spk)}
                                        >
                                            <td className="px-4 py-3">
                                                <p className="text-xs font-mono text-slate-400">{(spk as any).quotationNoSurat}</p>
                                                <p className="text-sm font-semibold text-slate-900 mt-0.5 max-w-xs truncate">{(spk as any).perihal}</p>
                                            </td>
                                            <td className="px-4 py-3">
                                                <p className="text-sm font-medium text-slate-800 max-w-[160px] truncate">{spk.customerName}</p>
                                                {(spk as any).lokasi && (
                                                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5 max-w-[160px] truncate">
                                                        <MapPin size={10} /> {(spk as any).lokasi}
                                                    </p>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 flex-shrink-0">
                                                        {spk.technicianName[0]?.toUpperCase()}
                                                    </div>
                                                    <span className="text-sm text-slate-700">{spk.technicianName}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                                                {fmt(spk.scheduleDate)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${cfg.color}`}>
                                                    {cfg.icon} {cfg.label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <ChevronRight size={16} className="text-slate-300" />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile cards */}
                    <div className="md:hidden divide-y divide-slate-100">
                        {filtered.map(spk => {
                            const cfg = STATUS_CONFIG[spk.status];
                            return (
                                <div key={spk.id} className="p-4 cursor-pointer active:bg-slate-50"
                                    onClick={() => setSelected(spk)}>
                                    <div className="flex items-start justify-between gap-2 mb-1.5">
                                        <div className="min-w-0">
                                            <p className="text-xs font-mono text-slate-400">{(spk as any).quotationNoSurat}</p>
                                            <p className="text-sm font-semibold text-slate-900 truncate">{(spk as any).perihal}</p>
                                        </div>
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold shrink-0 ${cfg.color}`}>
                                            {cfg.icon} {cfg.label}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-700 truncate">{spk.customerName}</p>
                                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                                        <span>{spk.technicianName}</span>
                                        <span>·</span>
                                        <span>{fmt(spk.scheduleDate)}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    </>
                )}
            </div>

            {/* ── Modals ── */}
            {createOpen && (
                <CreateSPKModal
                    companyId={companyId}
                    user={user!}
                    onClose={() => setCreateOpen(false)}
                    onCreated={() => { setCreateOpen(false); load(); }}
                />
            )}

            {selected && (
                <SPKDetailModal
                    spk={selected}
                    canEdit={canCreate}
                    companyId={companyId}
                    onClose={() => setSelected(null)}
                    onUpdated={() => { setSelected(null); load(); }}
                />
            )}
        </div>
    );
}