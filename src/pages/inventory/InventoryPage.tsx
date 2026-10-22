import { useCallback, useEffect, useMemo, useState } from "react";
import { Package, FileText, Search, Plus, Download, UploadCloud, ArrowDownCircle, ArrowUpCircle, X, Loader2, AlertTriangle, ClipboardList, Trash2 } from "lucide-react";
import * as XLSX from "xlsx";
import { useAuthStore } from '@/app/store/authStore';
import {
    getInventoryItems, getInventoryLogs, processInventoryRPC, createInventoryItem,
} from '@/shared/api/inventoryService';
import type { InventoryItem, InventoryLog } from '@/shared/api/inventoryService';
import { TabContainer } from '@/shared/ui/TabContainer';

const MAX_IMPORT_BYTES = 2 * 1024 * 1024;
const MAX_IMPORT_ROWS = 500;
const fmt = (n: number) => n.toLocaleString("id-ID", { maximumFractionDigits: 3 });
const monthStr = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

type Mutation = { item: InventoryItem; type: "IN" | "OUT" } | null;
type InvTab = "stok" | "rekap" | "log" | "alert";

export function InventoryPage() {
    const user = useAuthStore(s => s.user);
    const activeCompanyId = useAuthStore(s => s.activeCompanyId);
    const companyId = user?.role === "SUPERADMIN" ? activeCompanyId : user?.companyId ?? null;
    const canWrite = user?.role === "ADMIN" || user?.role === "INVENTORY" || user?.role === "SUPERADMIN";

    const [tab, setTab] = useState<InvTab>("stok");
    const [searchQ, setSearchQ] = useState("");
    const [kategoriFilter, setKategoriFilter] = useState("ALL");
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [logs, setLogs] = useState<InventoryLog[]>([]);
    const [recapLogs, setRecapLogs] = useState<InventoryLog[]>([]);
    const [month, setMonth] = useState(monthStr());
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [mutation, setMutation] = useState<Mutation>(null);
    const [mQty, setMQty] = useState("");
    const [mNote, setMNote] = useState("");
    const [mProyek, setMProyek] = useState("");
    const [busy, setBusy] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [newItem, setNewItem] = useState({ nama: "", kategori: "Chemical", satuan: "ml", stokAwal: "0", minAlert: "0" });
    const [isImporting, setIsImporting] = useState(false);

    const itemName = useMemo(() => new Map(items.map(i => [i.id, i])), [items]);

    const reload = useCallback(async () => {
        if (!companyId) { setItems([]); setLogs([]); return; }
        setLoading(true); setError(null);
        try {
            const [it, lg] = await Promise.all([getInventoryItems(companyId), getInventoryLogs(companyId)]);
            setItems(it); setLogs(lg);
        } catch (e) { setError(e instanceof Error ? e.message : "Gagal memuat data gudang."); }
        finally { setLoading(false); }
    }, [companyId]);
    useEffect(() => { void reload(); }, [reload]);

    useEffect(() => {
        if (tab !== "rekap" || !companyId) return;
        const [y, m] = month.split("-").map(Number);
        const from = `${month}-01`;
        const to = `${month}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`;
        getInventoryLogs(companyId, { from, to, limit: 5000 }).then(setRecapLogs).catch(e => setError(e instanceof Error ? e.message : "Gagal memuat rekap."));
    }, [tab, month, companyId]);

    const recap = useMemo(() => {
        const by = new Map<string, { masuk: number; keluar: number; akhir: number | null; t: number }>();
        for (const l of recapLogs) {
            const r = by.get(l.itemId) ?? { masuk: 0, keluar: 0, akhir: null, t: 0 };
            r.masuk += l.qtyMasuk; r.keluar += l.qtyKeluar;
            if (l.createdAt.getTime() >= r.t) { r.t = l.createdAt.getTime(); r.akhir = l.sisaStok; }
            by.set(l.itemId, r);
        }
        return items.map(i => ({ item: i, ...(by.get(i.id) ?? { masuk: 0, keluar: 0, akhir: null }) })).filter(r => r.masuk || r.keluar);
    }, [recapLogs, items]);

    const submitMutation = async () => {
        if (!mutation) return;
        const qty = Number(mQty.replace(",", "."));
        if (!Number.isFinite(qty) || qty <= 0) { alert("Jumlah harus lebih dari 0."); return; }
        setBusy(true);
        try {
            await processInventoryRPC({ itemId: mutation.item.id, quantity: qty, type: mutation.type, notes: mNote || undefined, proyek: mProyek || undefined });
            setMutation(null); setMQty(""); setMNote(""); setMProyek("");
            await reload();
        } catch (e) { alert(e instanceof Error ? e.message : "Gagal mencatat mutasi."); }
        finally { setBusy(false); }
    };

    const submitNewItem = async () => {
        if (!companyId) return;
        if (!newItem.nama.trim()) { alert("Nama item wajib diisi."); return; }
        const stokAwal = Number(newItem.stokAwal.replace(",", ".")), minAlert = Number(newItem.minAlert.replace(",", "."));
        if (![stokAwal, minAlert].every(n => Number.isFinite(n) && n >= 0)) { alert("Stok awal dan min alert harus angka ≥ 0."); return; }
        setBusy(true);
        try {
            await createInventoryItem(companyId, { nama: newItem.nama, kategori: newItem.kategori, satuan: newItem.satuan, stokAwal, minAlert });
            setShowNew(false); setNewItem({ nama: "", kategori: "Chemical", satuan: "ml", stokAwal: "0", minAlert: "0" });
            await reload();
        } catch (e) { alert(e instanceof Error ? e.message : "Gagal menambah item."); }
        finally { setBusy(false); }
    };

    const downloadTemplate = () => {
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet([["Nama Item", "Kategori (Chemical/Alat/Perangkap)", "Satuan", "Stok Awal", "Min Alert"]]);
        XLSX.utils.book_append_sheet(wb, ws, "Master_Stok");
        XLSX.writeFile(wb, "Template_Stok_Gudang.xlsx");
    };

    const handleImportBulk = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file || !companyId) return;
        if (file.size > MAX_IMPORT_BYTES) { alert("File terlalu besar (maksimal 2 MB)."); return; }
        setIsImporting(true);
        const reader = new FileReader();
        reader.onload = async evt => {
            try {
                const wb = XLSX.read(evt.target?.result, { type: "binary" });
                const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[wb.SheetNames[0]]);
                if (rows.length === 0) throw new Error("File kosong.");
                if (rows.length > MAX_IMPORT_ROWS) throw new Error(`Maksimal ${MAX_IMPORT_ROWS} baris per import (file berisi ${rows.length}).`);
                let ok = 0; const bad: string[] = [];
                for (const [i, r] of rows.entries()) {
                    const nama = String(r["Nama Item"] ?? "").trim();
                    const stokAwal = Number(r["Stok Awal"] ?? 0), minAlert = Number(r["Min Alert"] ?? 0);
                    if (!nama || ![stokAwal, minAlert].every(n => Number.isFinite(n) && n >= 0)) { bad.push(`baris ${i + 2}`); continue; }
                    await createInventoryItem(companyId, {
                        nama, kategori: String(r["Kategori (Chemical/Alat/Perangkap)"] ?? "Lainnya"), satuan: String(r["Satuan"] ?? "Pcs"), stokAwal, minAlert,
                    });
                    ok++;
                }
                await reload();
                alert(`Berhasil mengimpor ${ok} item.${bad.length ? `\nDilewati (nama kosong / angka tidak valid): ${bad.slice(0, 15).join(", ")}${bad.length > 15 ? " …" : ""}` : ""}`);
            } catch (err) {
                alert(`Gagal import: ${err instanceof Error ? err.message : String(err)}`);
            } finally { setIsImporting(false); }
        };
        reader.readAsBinaryString(file);
    };

    if (!companyId) {
        return <div className="p-6 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl m-4">Pilih perusahaan pada menu di sidebar untuk melihat gudang.</div>;
    }

    const categories = useMemo(() => {
        const set = new Set<string>();
        items.forEach(i => { if (i.kategori) set.add(i.kategori); });
        return Array.from(set);
    }, [items]);

    const lowStockItems = useMemo(() => items.filter(s => s.stok <= s.minAlert), [items]);

    const filtered = useMemo(() => {
        let base = tab === "alert" ? lowStockItems : items;
        if (kategoriFilter !== "ALL") base = base.filter(s => s.kategori === kategoriFilter);
        if (searchQ.trim()) base = base.filter(s => s.nama.toLowerCase().includes(searchQ.toLowerCase()));
        return base;
    }, [items, lowStockItems, tab, kategoriFilter, searchQ]);

    const invTabs = [
        { id: "stok",  label: "Daftar Stok Obat & Alat", shortLabel: "Semua Stok", icon: <ClipboardList size={15} />, badge: items.length },
        { id: "rekap", label: "Rekap Bulanan",           shortLabel: "Rekap",      icon: <FileText size={15} /> },
        { id: "log",   label: "Riwayat Masuk / Keluar",  shortLabel: "Riwayat",    icon: <Trash2 size={15} />, badge: logs.length },
        { id: "alert", label: "Stok Hampir Habis",       shortLabel: "Stok Minim", icon: <AlertTriangle size={15} />, badge: lowStockItems.length, badgeTone: "danger" as const },
    ];

    return (
        <div className="space-y-4">
            {/* Barventis Top Capsule Sub-Tab Bar + Synchronized Bottom Floating Pill */}
            <TabContainer
                tabs={invTabs}
                activeTab={tab}
                onChange={(id) => setTab(id as InvTab)}
                showFloatingBottom={true}
            />

            {/* Barventis Section Header & Action Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <div>
                    <h2 className="text-lg sm:text-xl font-extrabold text-[var(--text-primary)] tracking-tight">
                        Stok Obat &amp; Alat Gudang
                    </h2>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                        Catat obat masuk, pemakaian teknisi di lapangan, dan pantau barang yang hampir habis.
                    </p>
                </div>
                {canWrite && (
                    <div className="flex flex-wrap items-center gap-2 bg-[#f5f3ef] border border-[#e8e5e0] rounded-2xl p-1.5">
                        <button
                            onClick={() => setTab("rekap")}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-white rounded-xl transition-colors"
                        >
                            <FileText size={14} /> Rekap Bulanan
                        </button>
                        <button
                            onClick={() => setShowNew(true)}
                            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-[var(--accent)] text-white rounded-xl hover:bg-[var(--accent-hover)] transition-colors shadow-xs"
                        >
                            <Plus size={14} /> Tambah Barang Baru
                        </button>
                    </div>
                )}
            </div>

            {error && <div className="p-3 rounded-xl text-sm border border-red-200 bg-red-50 text-red-700">{error}</div>}

            {loading && <div className="py-10 text-center text-sm text-slate-400"><Loader2 className="inline animate-spin mr-2" size={14} />Memuat data gudang...</div>}

            {!loading && (tab === "stok" || tab === "alert") && (
                <div className="bg-white border border-[#e8e5e0] rounded-2xl p-4 sm:p-5 space-y-4 shadow-xs">
                    {/* Barventis Filter & Action Row */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-700">Tanggal:</span>
                                <span className="px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-700">
                                    {new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" })}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-700">Kategori:</span>
                                <select
                                    value={kategoriFilter}
                                    onChange={e => setKategoriFilter(e.target.value)}
                                    className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-xl text-slate-700"
                                >
                                    <option value="ALL">Semua Lokasi / Kategori</option>
                                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                        </div>

                        {canWrite && (
                            <div className="flex flex-wrap items-center gap-2">
                                <button onClick={downloadTemplate} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                                    <Download size={13} /> Export Template
                                </button>
                                <label className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors">
                                    {isImporting ? <Loader2 size={13} className="animate-spin" /> : <UploadCloud size={13} />} Import Excel
                                    <input type="file" accept=".xlsx,.xls" className="hidden" disabled={isImporting} onChange={handleImportBulk} />
                                </label>
                            </div>
                        )}
                    </div>

                    {/* Search Bar Box */}
                    <div className="bg-[#faf9f7] border border-[#e8e5e0] rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="relative flex-1">
                            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                value={searchQ}
                                onChange={e => setSearchQ(e.target.value)}
                                placeholder="Cari nama chemical, kode barang, atau material..."
                                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-[var(--accent)]"
                            />
                        </div>
                        <span className="text-xs font-medium text-slate-500 whitespace-nowrap">
                            Menampilkan <b>{filtered.length}</b> dari <b>{items.length}</b> material
                        </span>
                    </div>

                    {/* Barventis Pill Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-sm">
                            <thead>
                                <tr className="bg-[#f5f3ef] text-slate-600 text-[11px] font-bold uppercase tracking-wider">
                                    <th className="p-3 rounded-l-xl">Barang / Material</th>
                                    <th className="p-3 text-center">Stok Saat Ini (Full)</th>
                                    <th className="p-3 text-center">Batas Minimum</th>
                                    <th className="p-3 text-center">Status Stok</th>
                                    {canWrite && <th className="p-3 text-center rounded-r-xl bg-emerald-50/60">Catat Masuk / Pakai</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-slate-400">
                                            {items.length === 0 ? "Belum ada item. Tambahkan lewat \"Tambah Barang Baru\" atau Import." : "Tidak ada hasil yang cocok."}
                                        </td>
                                    </tr>
                                )}
                                {filtered.map(s => {
                                    const low = s.stok <= s.minAlert;
                                    return (
                                        <tr key={s.id} className="border-t border-slate-100 hover:bg-slate-50/70 transition-colors">
                                            <td className="p-3">
                                                <div className="font-bold text-slate-900">{s.nama}</div>
                                                <div className="text-xs text-slate-500 mt-0.5">{s.kategori} • Satuan: {s.satuan}</div>
                                            </td>
                                            <td className="p-3 text-center">
                                                <span className={`inline-flex items-center justify-center min-w-[88px] px-3 py-1.5 rounded-full border text-xs font-bold ${
                                                    low ? "border-rose-300 bg-rose-50 text-rose-700" : "border-slate-200 bg-white text-slate-800"
                                                }`}>
                                                    {fmt(s.stok)}
                                                </span>
                                            </td>
                                            <td className="p-3 text-center">
                                                <span className="inline-flex items-center justify-center min-w-[76px] px-3 py-1.5 rounded-full border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                                                    {fmt(s.minAlert)}
                                                </span>
                                            </td>
                                            <td className="p-3 text-center">
                                                {low ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-100 text-rose-700 text-xs font-bold">
                                                        <AlertTriangle size={12} /> Perlu Restock
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
                                                        Aman
                                                    </span>
                                                )}
                                            </td>
                                            {canWrite && (
                                                <td className="p-3 text-center whitespace-nowrap bg-emerald-50/20">
                                                    <div className="inline-flex items-center gap-1.5">
                                                        <button
                                                            onClick={() => setMutation({ item: s, type: "IN" })}
                                                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-full transition-colors"
                                                            title="Catat Barang Masuk (IN)"
                                                        >
                                                            <ArrowDownCircle size={13} /> + Masuk
                                                        </button>
                                                        <button
                                                            onClick={() => setMutation({ item: s, type: "OUT" })}
                                                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-full transition-colors"
                                                            title="Catat Pemakaian Keluar (OUT)"
                                                        >
                                                            <ArrowUpCircle size={13} /> - Pakai
                                                        </button>
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {!loading && tab === "log" && (
                <div className="bg-white border border-[#e8e5e0] rounded-2xl overflow-x-auto p-4 shadow-xs">
                    <table className="w-full text-left border-collapse text-sm">
                        <thead><tr className="bg-[#f5f3ef] text-slate-600 text-xs uppercase font-bold">
                            <th className="p-3 rounded-l-xl">Tanggal</th><th className="p-3">Item</th><th className="p-3 text-right">Masuk (IN)</th><th className="p-3 text-right">Keluar (OUT)</th><th className="p-3 text-right">Sisa Stok</th><th className="p-3">Proyek</th><th className="p-3 rounded-r-xl">Keterangan</th>
                        </tr></thead>
                        <tbody>
                            {logs.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-slate-400">Belum ada mutasi stok.</td></tr>}
                            {logs.map(l => (
                                <tr key={l.id} className="border-t border-slate-100">
                                    <td className="p-3 text-slate-500 whitespace-nowrap">{l.tanggal}</td>
                                    <td className="p-3 font-semibold text-slate-800">{itemName.get(l.itemId)?.nama ?? "—"}</td>
                                    <td className="p-3 text-right text-emerald-600 font-bold">{l.qtyMasuk ? `+${fmt(l.qtyMasuk)}` : "—"}</td>
                                    <td className="p-3 text-right text-orange-600 font-bold">{l.qtyKeluar ? `-${fmt(l.qtyKeluar)}` : "—"}</td>
                                    <td className="p-3 text-right font-semibold">{fmt(l.sisaStok)}</td>
                                    <td className="p-3 text-slate-500">{l.proyek ?? "—"}</td>
                                    <td className="p-3 text-slate-500">{l.keterangan ?? "—"}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {!loading && tab === "rekap" && (
                <div className="bg-white border border-[#e8e5e0] rounded-2xl p-4 space-y-3 shadow-xs">
                    <div className="pb-3 border-b border-slate-100 flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-700">Periode Bulan:</span>
                        <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200" />
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-sm">
                            <thead><tr className="bg-[#f5f3ef] text-slate-600 text-xs uppercase font-bold"><th className="p-3 rounded-l-xl">Item</th><th className="p-3 text-right">Total Masuk</th><th className="p-3 text-right">Total Keluar</th><th className="p-3 text-right">Stok Akhir Bulan</th><th className="p-3 rounded-r-xl">Satuan</th></tr></thead>
                            <tbody>
                                {recap.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-slate-400">Tidak ada mutasi pada bulan ini.</td></tr>}
                                {recap.map(r => (
                                    <tr key={r.item.id} className="border-t border-slate-100">
                                        <td className="p-3 font-semibold text-slate-800">{r.item.nama}</td>
                                        <td className="p-3 text-right text-emerald-600 font-bold">{fmt(r.masuk)}</td>
                                        <td className="p-3 text-right text-orange-600 font-bold">{fmt(r.keluar)}</td>
                                        <td className="p-3 text-right font-semibold">{r.akhir == null ? "—" : fmt(r.akhir)}</td>
                                        <td className="p-3 text-slate-500">{r.item.satuan}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {mutation && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => !busy && setMutation(null)}>
                    <div className="bg-white rounded-2xl p-5 w-full max-w-sm space-y-3" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between">
                            <h3 className="font-bold text-slate-800">{mutation.type === "IN" ? "Barang Masuk" : "Barang Keluar"} — {mutation.item.nama}</h3>
                            <button onClick={() => setMutation(null)} disabled={busy}><X size={16} /></button>
                        </div>
                        <p className="text-xs text-slate-500">Stok saat ini: <b>{fmt(mutation.item.stok)} {mutation.item.satuan}</b></p>
                        <input autoFocus inputMode="decimal" placeholder={`Jumlah (${mutation.item.satuan})`} value={mQty} onChange={e => setMQty(e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300" />
                        {mutation.type === "OUT" && <input placeholder="Proyek / pelanggan (opsional)" value={mProyek} onChange={e => setMProyek(e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300" />}
                        <input placeholder="Keterangan (opsional)" value={mNote} onChange={e => setMNote(e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300" />
                        <button onClick={submitMutation} disabled={busy} className="w-full py-2 text-sm font-bold rounded-lg bg-[var(--accent)] text-white disabled:opacity-50">{busy ? "Menyimpan..." : "Simpan Mutasi"}</button>
                    </div>
                </div>
            )}

            {showNew && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => !busy && setShowNew(false)}>
                    <div className="bg-white rounded-2xl p-5 w-full max-w-sm space-y-3" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between"><h3 className="font-bold text-slate-800">Item Baru</h3><button onClick={() => setShowNew(false)} disabled={busy}><X size={16} /></button></div>
                        <input autoFocus placeholder="Nama item" value={newItem.nama} onChange={e => setNewItem({ ...newItem, nama: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300" />
                        <div className="grid grid-cols-2 gap-2">
                            <select value={newItem.kategori} onChange={e => setNewItem({ ...newItem, kategori: e.target.value })} className="px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white"><option>Chemical</option><option>Alat</option><option>Perangkap</option><option>Lainnya</option></select>
                            <input placeholder="Satuan (ml, gram, unit)" value={newItem.satuan} onChange={e => setNewItem({ ...newItem, satuan: e.target.value })} className="px-3 py-2 text-sm rounded-lg border border-slate-300" />
                            <input inputMode="decimal" placeholder="Stok awal" value={newItem.stokAwal} onChange={e => setNewItem({ ...newItem, stokAwal: e.target.value })} className="px-3 py-2 text-sm rounded-lg border border-slate-300" />
                            <input inputMode="decimal" placeholder="Min alert" value={newItem.minAlert} onChange={e => setNewItem({ ...newItem, minAlert: e.target.value })} className="px-3 py-2 text-sm rounded-lg border border-slate-300" />
                        </div>
                        <button onClick={submitNewItem} disabled={busy} className="w-full py-2 text-sm font-bold rounded-lg bg-[var(--accent)] text-white disabled:opacity-50">{busy ? "Menyimpan..." : "Tambah Item"}</button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default InventoryPage;
