import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    Package, FileText, Search, Plus, Download, UploadCloud,
    ArrowDownCircle, ArrowUpCircle, X, Loader2, AlertTriangle,
    ClipboardList, Trash2, Briefcase, Calculator, TrendingUp, CheckCircle2,
} from "lucide-react";
import * as XLSX from "xlsx";
import { useAuthStore } from '@/app/store/authStore';
import {
    getInventoryItems, getInventoryLogs, processInventoryRPC, createInventoryItem,
} from '@/shared/api/inventoryService';
import type { InventoryItem, InventoryLog } from '@/shared/api/inventoryService';
import { supabase } from '@/shared/lib/supabase';
import { getQuotations } from '@/shared/api/quotationService';
import { formatRupiah } from '@/shared/lib/utils';
import { TabContainer } from '@/shared/ui/TabContainer';

const MAX_IMPORT_BYTES = 2 * 1024 * 1024;
const MAX_IMPORT_ROWS = 500;
const fmt = (n: number) => n.toLocaleString("id-ID", { maximumFractionDigits: 3 });
const monthStr = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

type Mutation = { item: InventoryItem; type: "IN" | "OUT"; presetProjectId?: string; presetTipe?: "ESTIMASI" | "REALISASI" } | null;
type InvTab = "stok" | "proyek" | "rekap" | "log" | "alert";

interface ProjectCostRow {
    id: string;
    code: string;
    projectName: string;
    clientName: string;
    serviceLabel: string;
    workDate: string;
    contractValue: number;
}

export function InventoryPage() {
    const user = useAuthStore(s => s.user);
    const activeCompanyId = useAuthStore(s => s.activeCompanyId);
    const companyId = (user?.role === "MASTER_SUPER_ADMIN" || user?.role === "SUPERADMIN")
        ? (activeCompanyId || user?.companyId || null)
        : (user?.companyId ?? null);
    const canWrite = user?.role === "MASTER_SUPER_ADMIN" || user?.role === "SUPERADMIN" || user?.role === "ADMIN" || user?.role === "INVENTORY";

    const [tab, setTab] = useState<InvTab>("stok");
    const [searchQ, setSearchQ] = useState("");
    const [kategoriFilter, setKategoriFilter] = useState("ALL");
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [logs, setLogs] = useState<InventoryLog[]>([]);
    const [projects, setProjects] = useState<ProjectCostRow[]>([]);
    const [recapLogs, setRecapLogs] = useState<InventoryLog[]>([]);
    const [month, setMonth] = useState(monthStr());
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [mutation, setMutation] = useState<Mutation>(null);
    const [mQty, setMQty] = useState("");
    const [mNote, setMNote] = useState("");
    const [mProjectId, setMProjectId] = useState("");
    const [mProyek, setMProyek] = useState("");
    const [mTipeCatatan, setMTipeCatatan] = useState<"ESTIMASI" | "REALISASI">("ESTIMASI");
    const [selectedItemIdForProj, setSelectedItemIdForProj] = useState("");

    const [busy, setBusy] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [newItem, setNewItem] = useState({ nama: "", kategori: "Chemical", satuan: "Botol 500ml", stokAwal: "0", minAlert: "5", hargaSatuan: "185000" });
    const [isImporting, setIsImporting] = useState(false);

    const itemName = useMemo(() => new Map(items.map(i => [i.id, i])), [items]);

    const reload = useCallback(async () => {
        if (!companyId) { setItems([]); setLogs([]); setProjects([]); return; }
        setLoading(true); setError(null);
        try {
            const [it, lg, projRes, quos] = await Promise.all([
                getInventoryItems(companyId),
                getInventoryLogs(companyId),
                supabase.from("projects").select("*").eq("company_id", companyId).order("created_at", { ascending: false }),
                getQuotations({ companyId }).catch(() => []),
            ]);
            setItems(it);
            setLogs(lg);
            if (it.length > 0 && !selectedItemIdForProj) {
                setSelectedItemIdForProj(it[0].id);
            }

            const quoMap = new Map(quos.map(q => [q.id, q]));
            const byClientMap = new Map(quos.map(q => [q.kepadaNama.toLowerCase(), q]));

            const mappedProjs: ProjectCostRow[] = (projRes.data || []).map((p: any) => {
                const matchedQuo = (p.quotation_id && quoMap.get(p.quotation_id))
                    || quoMap.get(p.id)
                    || byClientMap.get(String(p.client_name || "").toLowerCase());
                const contractVal = Number(p.contract_value || 0) || matchedQuo?.total || 15000000;
                const code = matchedQuo?.noSurat?.replace(/-DRF\//g, "/").replace(/-APR\//g, "/")
                    || `PRJ-${String(p.id).slice(-6).toUpperCase()}`;
                return {
                    id: p.id,
                    code,
                    projectName: p.project_name,
                    clientName: p.client_name || matchedQuo?.kepadaNama || "-",
                    serviceLabel: p.work_type || p.service_type || "Pest / Termite Control",
                    workDate: p.work_date || new Date().toISOString().slice(0, 10),
                    contractValue: contractVal,
                };
            });

            // Tambahkan quotation approved yang belum masuk ke tabel projects agar Gudang langsung melihat Proyek Baru
            for (const q of quos) {
                if ((q.status === "approved" || q.status === "deal" || q.status === "sent_to_client") && !mappedProjs.some(mp => mp.id === q.id || mp.clientName.toLowerCase() === q.kepadaNama.toLowerCase())) {
                    mappedProjs.push({
                        id: q.id,
                        code: q.noSurat.replace(/-DRF\//g, "/").replace(/-APR\//g, "/"),
                        projectName: `${q.kepadaNama} - ${q.perihal}`,
                        clientName: q.kepadaNama,
                        serviceLabel: q.perihal,
                        workDate: (q.tanggal instanceof Date ? q.tanggal : new Date()).toISOString().slice(0, 10),
                        contractValue: q.total || 0,
                    });
                }
            }

            setProjects(mappedProjs);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Gagal memuat data gudang.");
        } finally {
            setLoading(false);
        }
    }, [companyId, selectedItemIdForProj]);

    useEffect(() => { void reload(); }, [reload]);

    useEffect(() => {
        if (tab !== "rekap" || !companyId) return;
        const [y, m] = month.split("-").map(Number);
        const from = `${month}-01`;
        const to = `${month}-${String(new Date(y, m, 0).getDate()).getDate ? String(new Date(y, m, 0).getDate()).padStart(2, "0") : "28"}`;
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

    const openMutationModal = (item: InventoryItem, type: "IN" | "OUT", presetProjectId = "", presetTipe: "ESTIMASI" | "REALISASI" = "REALISASI") => {
        const projObj = projects.find(p => p.id === presetProjectId);
        setMutation({ item, type, presetProjectId, presetTipe });
        setMProjectId(presetProjectId);
        setMProyek(projObj ? `${projObj.code} - ${projObj.projectName}` : "");
        setMTipeCatatan(presetTipe);
        setMQty("");
        setMNote(presetTipe === "ESTIMASI" ? "Estimasi kebutuhan chemical proyek oleh Gudang" : "");
    };

    const submitMutation = async () => {
        if (!mutation) return;
        const qty = Number(mQty.replace(",", "."));
        if (!Number.isFinite(qty) || qty <= 0) { alert("Jumlah harus lebih dari 0."); return; }
        setBusy(true);
        try {
            const selectedProj = projects.find(p => p.id === mProjectId);
            const labelProyek = selectedProj ? `[ID:${selectedProj.code}] ${selectedProj.projectName}` : (mProyek || undefined);
            await processInventoryRPC({
                itemId: mutation.item.id,
                quantity: qty,
                type: mutation.type,
                notes: mNote ? `[${mTipeCatatan}] ${mNote}` : `[${mTipeCatatan}] Dicatat oleh ${user?.name || "Gudang"}`,
                proyek: labelProyek,
                projectId: selectedProj ? selectedProj.id : null,
                tipeCatatan: mTipeCatatan,
            });
            setMutation(null); setMQty(""); setMNote(""); setMProyek(""); setMProjectId("");
            await reload();
        } catch (e) { alert(e instanceof Error ? e.message : "Gagal mencatat mutasi."); }
        finally { setBusy(false); }
    };

    const submitNewItem = async () => {
        if (!companyId) return;
        if (!newItem.nama.trim()) { alert("Nama item wajib diisi."); return; }
        const stokAwal = Number(newItem.stokAwal.replace(",", "."));
        const minAlert = Number(newItem.minAlert.replace(",", "."));
        const hargaSatuan = Number(newItem.hargaSatuan.replace(/\D/g, "")) || 0;
        if (![stokAwal, minAlert].every(n => Number.isFinite(n) && n >= 0)) { alert("Stok awal dan min alert harus angka ≥ 0."); return; }
        setBusy(true);
        try {
            await createInventoryItem(companyId, {
                nama: newItem.nama,
                kategori: newItem.kategori,
                satuan: newItem.satuan,
                stokAwal,
                minAlert,
                hargaSatuan,
            });
            setShowNew(false);
            setNewItem({ nama: "", kategori: "Chemical", satuan: "Botol 500ml", stokAwal: "0", minAlert: "5", hargaSatuan: "185000" });
            await reload();
        } catch (e) { alert(e instanceof Error ? e.message : "Gagal menambah item."); }
        finally { setBusy(false); }
    };

    const downloadTemplate = () => {
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet([["Nama Item", "Kategori (Chemical/Alat/Perangkap)", "Satuan", "Stok Awal", "Min Alert", "Harga Satuan HPP"]]);
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
                if (rows.length > MAX_IMPORT_ROWS) throw new Error(`Maksimal ${MAX_IMPORT_ROWS} baris per import.`);
                let ok = 0; const bad: string[] = [];
                for (const [i, r] of rows.entries()) {
                    const nama = String(r["Nama Item"] ?? "").trim();
                    const stokAwal = Number(r["Stok Awal"] ?? 0), minAlert = Number(r["Min Alert"] ?? 0);
                    const hargaSatuan = Number(r["Harga Satuan HPP"] ?? 150000);
                    if (!nama || ![stokAwal, minAlert].every(n => Number.isFinite(n) && n >= 0)) { bad.push(`baris ${i + 2}`); continue; }
                    await createInventoryItem(companyId, {
                        nama, kategori: String(r["Kategori (Chemical/Alat/Perangkap)"] ?? "Lainnya"), satuan: String(r["Satuan"] ?? "Pcs"), stokAwal, minAlert, hargaSatuan,
                    });
                    ok++;
                }
                await reload();
                alert(`Berhasil mengimpor ${ok} item.${bad.length ? `\nDilewati: ${bad.slice(0, 15).join(", ")}` : ""}`);
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

    // Hitung Estimasi Chemical & Analisis Untung Rugi per ID Proyek (Untuk Gudang, Admin, Marketing, & Superadmin)
    const projectProfitability = useMemo(() => {
        return projects.map(proj => {
            const matchedLogs = logs.filter(l =>
                l.projectId === proj.id ||
                (l.proyek && (l.proyek.includes(proj.code) || l.proyek.toLowerCase().includes(proj.clientName.toLowerCase()) || l.proyek.toLowerCase().includes(proj.projectName.toLowerCase())))
            );

            const chemicalEntries = matchedLogs.map(l => {
                const it = itemName.get(l.itemId);
                const qty = l.qtyKeluar || l.qtyMasuk || 0;
                const unitCost = it?.hargaSatuan ?? 150000;
                const totalCost = l.biayaTotal > 0 ? l.biayaTotal : qty * unitCost;
                return {
                    logId: l.id,
                    itemName: it?.nama ?? "Chemical",
                    satuan: it?.satuan ?? "Unit",
                    qty,
                    unitCost,
                    totalCost,
                    tipe: l.tipeCatatan,
                    tanggal: l.tanggal,
                    notes: l.keterangan,
                };
            });

            // Jika belum ada log manual, berikan estimasi baseline dari standar chemical proyek agar tabel Untung Rugi tetap informatif
            const hasManualLogs = chemicalEntries.length > 0;
            const totalChemicalCost = hasManualLogs
                ? chemicalEntries.reduce((acc, c) => acc + c.totalCost, 0)
                : Math.round(proj.contractValue * 0.14); // Baseline estimasi 14% HPP chemical jika belum diinput Gudang

            const operationalCost = Math.round(proj.contractValue * 0.12); // Estimasi transport & operasional teknisi 12%
            const grossProfit = proj.contractValue - totalChemicalCost - operationalCost;
            const marginPct = proj.contractValue > 0 ? Math.round((grossProfit / proj.contractValue) * 100) : 0;

            return {
                ...proj,
                hasManualLogs,
                chemicalEntries,
                totalChemicalCost,
                operationalCost,
                grossProfit,
                marginPct,
            };
        });
    }, [projects, logs, itemName]);

    const invTabs = [
        { id: "stok",   label: "Daftar Stok Obat & Alat",           shortLabel: "Semua Stok",  icon: <ClipboardList size={15} />, badge: items.length },
        { id: "proyek", label: "Proyek Baru & Estimasi Untung Rugi",shortLabel: "Proyek & P/L",icon: <Calculator size={15} />,    badge: projects.length },
        { id: "rekap",  label: "Rekap Bulanan",                     shortLabel: "Rekap",       icon: <FileText size={15} /> },
        { id: "log",    label: "Riwayat Masuk / Keluar",            shortLabel: "Riwayat",     icon: <Trash2 size={15} />,        badge: logs.length },
        { id: "alert",  label: "Stok Hampir Habis",                 shortLabel: "Stok Minim",  icon: <AlertTriangle size={15} />, badge: lowStockItems.length, badgeTone: "danger" as const },
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

            {/* Header & Action Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <div>
                    <h2 className="text-lg sm:text-xl font-extrabold text-[var(--text-primary)] tracking-tight">
                        {tab === "proyek" ? "Estimasi Chemical per ID Proyek & Analisis Untung Rugi" : "Stok Obat & Alat Gudang"}
                    </h2>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                        {tab === "proyek"
                            ? "Gudang dapat menginput estimasi maupun pemakaian chemical langsung ke ID masing-masing proyek untuk analisis untung rugi internal (Gudang, Admin, Marketing, & Superadmin)."
                            : "Catat obat masuk, estimasi/pemakaian per ID proyek, dan pantau barang yang hampir habis."}
                    </p>
                </div>
                {canWrite && (
                    <div className="flex flex-wrap items-center gap-2 bg-[#f5f3ef] border border-[#e8e5e0] rounded-2xl p-1.5">
                        <button
                            onClick={() => setTab("proyek")}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors"
                        >
                            <Calculator size={14} /> Estimasi Chemical Proyek
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

            {loading && <div className="py-10 text-center text-sm text-slate-400"><Loader2 className="inline animate-spin mr-2" size={14} />Memuat data gudang & proyek...</div>}

            {/* SUB-TAB BARU: PROYEK BARU, ESTIMASI CHEMICAL PER ID PROYEK, & ANALISIS UNTUNG RUGI */}
            {!loading && tab === "proyek" && (
                <div className="space-y-4">
                    {/* Quick Input Bar untuk Gudang / Admin: Pilih Proyek + Pilih Chemical + Input Estimasi ke ID Proyek */}
                    {canWrite && items.length > 0 && projects.length > 0 && (
                        <div className="clean-card p-4 border-emerald-200 bg-emerald-50/35 space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div>
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-950 flex items-center gap-1.5">
                                        <Briefcase size={14} className="text-emerald-700" />
                                        Input Cepat Estimasi / Realisasi Chemical ke ID Proyek
                                    </h3>
                                    <p className="text-[11px] text-emerald-800">
                                        Pilih proyek baru dan bahan chemical untuk dicatat ke ID proyek tersebut sebagai bahan analisis untung rugi internal.
                                    </p>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                                <div className="sm:col-span-5">
                                    <label className="block text-[10px] font-bold uppercase text-emerald-900 mb-1">Pilih Proyek Baru (ID Proyek)</label>
                                    <select
                                        value={mProjectId || projects[0]?.id || ""}
                                        onChange={e => setMProjectId(e.target.value)}
                                        className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-emerald-300 bg-white"
                                    >
                                        {projects.map(p => (
                                            <option key={p.id} value={p.id}>
                                                [{p.code}] {p.projectName} ({formatRupiah(p.contractValue)})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="sm:col-span-4">
                                    <label className="block text-[10px] font-bold uppercase text-emerald-900 mb-1">Pilih Chemical / Material Gudang</label>
                                    <select
                                        value={selectedItemIdForProj || items[0]?.id || ""}
                                        onChange={e => setSelectedItemIdForProj(e.target.value)}
                                        className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-emerald-300 bg-white"
                                    >
                                        {items.map(it => (
                                            <option key={it.id} value={it.id}>
                                                {it.nama} ({it.satuan} • HPP {formatRupiah(it.hargaSatuan)})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="sm:col-span-3">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const chosenItem = items.find(i => i.id === selectedItemIdForProj) || items[0];
                                            const chosenProjId = mProjectId || projects[0]?.id || "";
                                            if (chosenItem) {
                                                openMutationModal(chosenItem, "OUT", chosenProjId, "ESTIMASI");
                                            }
                                        }}
                                        className="w-full py-2 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center justify-center gap-1.5"
                                    >
                                        <Plus size={14} /> Masukan ke ID Proyek
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tabel & Kartu Analisis Untung Rugi per Proyek */}
                    <div className="clean-card overflow-hidden">
                        <div className="p-4 border-b border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                                <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                                    <TrendingUp size={16} className="text-[var(--accent)]" />
                                    Daftar Proyek Baru, Estimasi Chemical Gudang &amp; Analisis Untung Rugi (Internal)
                                </h3>
                                <p className="text-xs text-[var(--text-secondary)]">
                                    Terintegrasi lintas role untuk Gudang, Admin, Marketing, dan Superadmin (Direktur)
                                </p>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs min-w-[920px]">
                                <thead className="bg-[var(--bg-tertiary)] border-b border-[var(--border-subtle)] text-[10.5px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                                    <tr>
                                        <th className="py-3 px-4">ID Proyek &amp; Klien</th>
                                        <th className="py-3 px-4">Layanan &amp; Tanggal</th>
                                        <th className="py-3 px-4">Catatan Estimasi / Pemakaian Chemical Gudang</th>
                                        <th className="py-3 px-4 text-right">Nilai Kontrak</th>
                                        <th className="py-3 px-4 text-right">HPP Chemical &amp; Ops</th>
                                        <th className="py-3 px-4 text-right">Estimasi Untung / Rugi</th>
                                        {canWrite && <th className="py-3 px-4 text-right">Aksi Gudang</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--border-subtle)]">
                                    {projectProfitability.map(p => {
                                        const isHealthy = p.marginPct >= 45;
                                        const isWarning = p.marginPct >= 20 && p.marginPct < 45;
                                        return (
                                            <tr key={p.id} className="hover:bg-[var(--bg-tertiary)]/50 align-top">
                                                <td className="py-3.5 px-4">
                                                    <span className="inline-block px-2 py-0.5 rounded bg-slate-100 border border-slate-200 font-mono font-bold text-[10.5px] text-[var(--accent)] mb-1">
                                                        ID: {p.code}
                                                    </span>
                                                    <div className="font-bold text-[var(--text-primary)]">{p.clientName}</div>
                                                    <div className="text-[11px] text-[var(--text-muted)]">{p.projectName}</div>
                                                </td>
                                                <td className="py-3.5 px-4">
                                                    <div className="font-semibold text-[var(--text-primary)]">{p.serviceLabel}</div>
                                                    <div className="text-[11px] font-mono text-[var(--text-muted)] mt-0.5">Jadwal: {p.workDate}</div>
                                                </td>
                                                <td className="py-3.5 px-4">
                                                    {p.chemicalEntries.length > 0 ? (
                                                        <div className="space-y-1">
                                                            {p.chemicalEntries.map(ce => (
                                                                <div key={ce.logId} className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px]">
                                                                    <div>
                                                                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold mr-1.5 ${
                                                                            ce.tipe === "ESTIMASI" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                                                                        }`}>
                                                                            {ce.tipe}
                                                                        </span>
                                                                        <strong>{ce.itemName}</strong> ({fmt(ce.qty)} {ce.satuan})
                                                                    </div>
                                                                    <span className="font-mono font-semibold text-slate-700">{formatRupiah(ce.totalCost)}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="text-[11px] text-amber-800 bg-amber-50/70 border border-amber-200 rounded-lg px-2.5 py-1.5">
                                                            Belum ada input spesifik Gudang (menggunakan baseline estimasi 14% = {formatRupiah(p.totalChemicalCost)})
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="py-3.5 px-4 text-right font-mono font-bold text-[var(--text-primary)] whitespace-nowrap">
                                                    {formatRupiah(p.contractValue)}
                                                </td>
                                                <td className="py-3.5 px-4 text-right font-mono whitespace-nowrap">
                                                    <div className="text-red-600 font-semibold">Chem: - {formatRupiah(p.totalChemicalCost)}</div>
                                                    <div className="text-[10.5px] text-[var(--text-muted)]">Ops: - {formatRupiah(p.operationalCost)}</div>
                                                </td>
                                                <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                                    <div className={`font-mono font-bold text-sm ${p.grossProfit >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                                                        {formatRupiah(p.grossProfit)}
                                                    </div>
                                                    <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                        isHealthy
                                                            ? "bg-emerald-100 text-emerald-800"
                                                            : isWarning
                                                            ? "bg-amber-100 text-amber-800"
                                                            : "bg-red-100 text-red-700"
                                                    }`}>
                                                        Margin {p.marginPct}% ({p.grossProfit >= 0 ? "UNTUNG" : "RUGI"})
                                                    </span>
                                                </td>
                                                {canWrite && (
                                                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const chosen = items[0];
                                                                if (chosen) openMutationModal(chosen, "OUT", p.id, "ESTIMASI");
                                                            }}
                                                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold"
                                                        >
                                                            <Plus size={12} /> Estimasi Chemical
                                                        </button>
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

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
                                    <th className="p-3 rounded-l-xl">Barang / Material &amp; HPP</th>
                                    <th className="p-3 text-center">Stok Saat Ini (Full)</th>
                                    <th className="p-3 text-center">Batas Minimum</th>
                                    <th className="p-3 text-center">Status Stok</th>
                                    {canWrite && <th className="p-3 text-center rounded-r-xl bg-emerald-50/60">Catat Masuk / Estimasi Proyek</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-slate-400">
                                            {items.length === 0 ? "Belum ada item. Tambahkan lewat 'Tambah Barang Baru' atau Import." : "Tidak ada hasil yang cocok."}
                                        </td>
                                    </tr>
                                )}
                                {filtered.map(s => {
                                    const low = s.stok <= s.minAlert;
                                    return (
                                        <tr key={s.id} className="border-t border-slate-100 hover:bg-slate-50/70 transition-colors">
                                            <td className="p-3">
                                                <div className="font-bold text-slate-900">{s.nama}</div>
                                                <div className="text-xs text-slate-500 mt-0.5">
                                                    {s.kategori} • Satuan: {s.satuan} • HPP: <span className="font-mono font-semibold text-slate-700">{formatRupiah(s.hargaSatuan)}</span>
                                                </div>
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
                                                            onClick={() => openMutationModal(s, "IN", "", "REALISASI")}
                                                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-full transition-colors"
                                                            title="Catat Barang Masuk (IN)"
                                                        >
                                                            <ArrowDownCircle size={13} /> + Masuk
                                                        </button>
                                                        <button
                                                            onClick={() => openMutationModal(s, "OUT", projects[0]?.id ?? "", "ESTIMASI")}
                                                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-full transition-colors"
                                                            title="Catat Estimasi / Pemakaian ke ID Proyek"
                                                        >
                                                            <ArrowUpCircle size={13} /> Pakai / Estimasi Proyek
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
                            <th className="p-3 rounded-l-xl">Tanggal</th><th className="p-3">Tipe</th><th className="p-3">Item</th><th className="p-3 text-right">Masuk (IN)</th><th className="p-3 text-right">Keluar / Estimasi</th><th className="p-3 text-right">Sisa Stok</th><th className="p-3">ID Proyek</th><th className="p-3 rounded-r-xl">Keterangan</th>
                        </tr></thead>
                        <tbody>
                            {logs.length === 0 && <tr><td colSpan={8} className="p-8 text-center text-slate-400">Belum ada mutasi stok.</td></tr>}
                            {logs.map(l => (
                                <tr key={l.id} className="border-t border-slate-100">
                                    <td className="p-3 text-slate-500 whitespace-nowrap">{l.tanggal}</td>
                                    <td className="p-3">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${l.tipeCatatan === "ESTIMASI" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
                                            {l.tipeCatatan}
                                        </span>
                                    </td>
                                    <td className="p-3 font-semibold text-slate-800">{itemName.get(l.itemId)?.nama ?? "—"}</td>
                                    <td className="p-3 text-right text-emerald-600 font-bold">{l.qtyMasuk ? `+${fmt(l.qtyMasuk)}` : "—"}</td>
                                    <td className="p-3 text-right text-orange-600 font-bold">{l.qtyKeluar ? `-${fmt(l.qtyKeluar)}` : "—"}</td>
                                    <td className="p-3 text-right font-semibold">{fmt(l.sisaStok)}</td>
                                    <td className="p-3 text-slate-700 font-mono text-xs">{l.proyek ?? "—"}</td>
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

            {/* Modal Mutasi & Input Estimasi Chemical per ID Proyek */}
            {mutation && (
                <div className="fixed inset-0 bg-black/45 flex items-center justify-center z-50 p-4" onClick={() => !busy && setMutation(null)}>
                    <div className="bg-white rounded-2xl p-5 w-full max-w-md space-y-3.5 shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between">
                            <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                                {mutation.type === "IN" ? "Catat Barang Masuk (IN)" : "Input Estimasi / Pemakaian Chemical Proyek"}
                            </h3>
                            <button onClick={() => setMutation(null)} disabled={busy}><X size={16} /></button>
                        </div>

                        <div className="space-y-2 text-xs">
                            <label className="block font-bold text-slate-700">Bahan Chemical / Alat</label>
                            <select
                                value={mutation.item.id}
                                onChange={e => {
                                    const found = items.find(i => i.id === e.target.value);
                                    if (found) setMutation({ ...mutation, item: found });
                                }}
                                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-semibold"
                            >
                                {items.map(it => (
                                    <option key={it.id} value={it.id}>
                                        {it.nama} (Stok: {fmt(it.stok)} {it.satuan} • HPP: {formatRupiah(it.hargaSatuan)})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {mutation.type === "OUT" && (
                            <>
                                <div className="space-y-1.5 text-xs">
                                    <label className="block font-bold text-slate-700">Jenis Pencatatan Gudang</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setMTipeCatatan("ESTIMASI")}
                                            className={`p-2 rounded-xl border text-xs font-bold transition-all ${
                                                mTipeCatatan === "ESTIMASI"
                                                    ? "border-amber-600 bg-amber-50 text-amber-900"
                                                    : "border-slate-200 bg-white text-slate-600"
                                            }`}
                                        >
                                            Catatan Estimasi Proyek
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setMTipeCatatan("REALISASI")}
                                            className={`p-2 rounded-xl border text-xs font-bold transition-all ${
                                                mTipeCatatan === "REALISASI"
                                                    ? "border-emerald-600 bg-emerald-50 text-emerald-900"
                                                    : "border-slate-200 bg-white text-slate-600"
                                            }`}
                                        >
                                            Pemakaian Aktual (Potong Stok)
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-1.5 text-xs">
                                    <label className="block font-bold text-slate-700">Pilih ID Proyek (Untuk Analisis Untung Rugi)</label>
                                    <select
                                        value={mProjectId}
                                        onChange={e => {
                                            setMProjectId(e.target.value);
                                            const p = projects.find(x => x.id === e.target.value);
                                            if (p) setMProyek(`[ID:${p.code}] ${p.projectName}`);
                                        }}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-semibold"
                                    >
                                        <option value="">-- Pilih Proyek Terdaftar --</option>
                                        {projects.map(p => (
                                            <option key={p.id} value={p.id}>
                                                [{p.code}] {p.projectName} ({formatRupiah(p.contractValue)})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </>
                        )}

                        <div className="space-y-1.5 text-xs">
                            <label className="block font-bold text-slate-700">Jumlah ({mutation.item.satuan}) *</label>
                            <input
                                autoFocus
                                inputMode="decimal"
                                placeholder={`Contoh: 4 (${mutation.item.satuan})`}
                                value={mQty}
                                onChange={e => setMQty(e.target.value)}
                                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 font-mono font-bold"
                            />
                            {Number(mQty.replace(",", ".")) > 0 && (
                                <p className="text-[11px] text-emerald-800 font-semibold">
                                    Estimasi Nilai HPP Chemical: {formatRupiah(Number(mQty.replace(",", ".")) * mutation.item.hargaSatuan)}
                                </p>
                            )}
                        </div>

                        <div className="space-y-1.5 text-xs">
                            <label className="block font-bold text-slate-700">Catatan Gudang (Internal)</label>
                            <input
                                placeholder="Catatan dosis / area pemakaian untuk tim..."
                                value={mNote}
                                onChange={e => setMNote(e.target.value)}
                                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                            />
                        </div>

                        <button
                            onClick={submitMutation}
                            disabled={busy}
                            className="w-full py-2.5 text-xs sm:text-sm font-bold rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white disabled:opacity-50"
                        >
                            {busy ? "Menyimpan..." : "Simpan ke ID Proyek & Gudang"}
                        </button>
                    </div>
                </div>
            )}

            {showNew && (
                <div className="fixed inset-0 bg-black/45 flex items-center justify-center z-50 p-4" onClick={() => !busy && setShowNew(false)}>
                    <div className="bg-white rounded-2xl p-5 w-full max-w-sm space-y-3" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between">
                            <h3 className="font-bold text-slate-800">Tambah Chemical / Alat Baru</h3>
                            <button onClick={() => setShowNew(false)} disabled={busy}><X size={16} /></button>
                        </div>
                        <input autoFocus placeholder="Nama item" value={newItem.nama} onChange={e => setNewItem({ ...newItem, nama: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300" />
                        <div className="grid grid-cols-2 gap-2">
                            <select value={newItem.kategori} onChange={e => setNewItem({ ...newItem, kategori: e.target.value })} className="px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white"><option>Chemical</option><option>Alat</option><option>Perangkap</option><option>Lainnya</option></select>
                            <input placeholder="Satuan (ml, Liter, Kg)" value={newItem.satuan} onChange={e => setNewItem({ ...newItem, satuan: e.target.value })} className="px-3 py-2 text-sm rounded-lg border border-slate-300" />
                            <input inputMode="decimal" placeholder="Stok awal" value={newItem.stokAwal} onChange={e => setNewItem({ ...newItem, stokAwal: e.target.value })} className="px-3 py-2 text-sm rounded-lg border border-slate-300" />
                            <input inputMode="decimal" placeholder="Min alert" value={newItem.minAlert} onChange={e => setNewItem({ ...newItem, minAlert: e.target.value })} className="px-3 py-2 text-sm rounded-lg border border-slate-300" />
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">Harga Pokok Satuan / HPP (Rp)</label>
                            <input inputMode="numeric" placeholder="185000" value={newItem.hargaSatuan} onChange={e => setNewItem({ ...newItem, hargaSatuan: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 font-mono" />
                        </div>
                        <button onClick={submitNewItem} disabled={busy} className="w-full py-2 text-sm font-bold rounded-lg bg-[var(--accent)] text-white disabled:opacity-50">{busy ? "Menyimpan..." : "Tambah Item"}</button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default InventoryPage;
