import React, { useState, useEffect, useMemo } from "react";
import { Users, ShieldCheck, RefreshCw, Search, MessageCircle, CalendarClock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useAuthStore } from '@/app/store/authStore';
import { getQuotations } from '@/shared/api/quotationService';
import { warrantyToTotalMonths, formatWarrantyDurationText } from '@/shared/lib/warrantyPricingEngine';
import { PageHeader } from '@/shared/ui/PageHeader';
import type { Quotation } from '@/entities/types';

interface KontrolRow {
    id: string;
    noSurat: string;
    nama: string;
    telp: string;
    alamat: string;
    startDate: string;
    expiry: string;
    garansiLabel: string;
    nextControlLabel: string;
    status: "Garansi Aktif" | "Follow Up Garansi" | "Siap Retreatment";
}

const FALLBACK_KONTROL: KontrolRow[] = [
    { id: "1", noSurat: "GP-APR/AR/PH/2025/01/0012", nama: "Ibu Lince Susanty", telp: "0811-9922-781", alamat: "Metland Puri, Blok F4 No. 28B", startDate: "2022-01-15", expiry: "2025-01-15", garansiLabel: "Selama 3 (Tiga) tahun", nextControlLabel: "Jatuh Tempo Retreatment", status: "Siap Retreatment" },
    { id: "2", noSurat: "GP-APR/AR/PH/2025/01/0018", nama: "Bapak Heri Mukti", telp: "0811-116-860", alamat: "Citra Fine Homes L05 No. 12", startDate: "2023-01-20", expiry: "2025-01-20", garansiLabel: "Selama 2 (Dua) tahun", nextControlLabel: "Pengontrolan IV (Per 6 Bln)", status: "Follow Up Garansi" },
    { id: "3", noSurat: "GP-APR/AR/PH/2026/01/0005", nama: "PT Oreka Solusi Kreatif", telp: "0817-0795-959", alamat: "Jl. RC. Veteran Raya No. 9, Bintaro", startDate: "2026-01-05", expiry: "2031-01-05", garansiLabel: "Selama 5 (Lima) tahun", nextControlLabel: "Pengontrolan I (+1 Bulan)", status: "Garansi Aktif" },
    { id: "4", noSurat: "GP-APR/AR/PH/2026/01/0022", nama: "Bank Victoria Cabang Fatmawati", telp: "0811-9988-776", alamat: "Jl. RS. Fatmawati Raya No. 39, Cilandak, Jakarta Selatan", startDate: "2026-01-12", expiry: "2029-01-12", garansiLabel: "Selama 3 (Tiga) tahun", nextControlLabel: "Pengontrolan I (+1 Bulan)", status: "Garansi Aktif" },
];

export function KontrolRayapPage() {
    const { user } = useAuthStore();
    const [rows, setRows] = useState<KontrolRow[]>(FALLBACK_KONTROL);
    const [loading, setLoading] = useState(false);
    const [searchQ, setSearchQ] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | "active" | "followup">("all");

    const load = async () => {
        if (!user?.companyId) return;
        setLoading(true);
        try {
            const quos = await getQuotations({ companyId: user.companyId, kategori: "AR" });
            const activeAr = quos.filter(q => q.status === "approved" || q.status === "deal" || q.status === "sent_to_client");
            if (activeAr.length > 0) {
                const mapped: KontrolRow[] = activeAr.map((q: Quotation) => {
                    const gUnit = q.garansiUnit ?? "tahun";
                    const gNilai = q.garansiNilai ?? q.garansiTahun ?? 3;
                    const totalMonths = warrantyToTotalMonths(gNilai, gUnit);
                    const start = new Date(q.dealAt ?? q.approvedAt ?? q.tanggal);
                    const exp = new Date(start);
                    exp.setMonth(exp.getMonth() + (totalMonths || 36));
                    const isExpired = exp.getTime() < Date.now();
                    return {
                        id: q.id,
                        noSurat: q.noSurat,
                        nama: q.kepadaNama,
                        telp: q.kepadaWa ?? "0817-0795-959",
                        alamat: q.lokasiPekerjaan ?? (q.kepadaAlamatLines ?? []).join(", "),
                        startDate: start.toISOString().slice(0, 10),
                        expiry: exp.toISOString().slice(0, 10),
                        garansiLabel: formatWarrantyDurationText(gNilai, gUnit),
                        nextControlLabel: isExpired ? "Jatuh Tempo Retreatment" : "Pengontrolan Berkala (1, 3, 6, per 6 bln)",
                        status: isExpired ? "Siap Retreatment" : "Garansi Aktif",
                    };
                });
                setRows([...mapped, ...FALLBACK_KONTROL.filter(f => !mapped.some(m => m.nama === f.nama))]);
            }
        } catch {
            // Gunakan fallback apabila offline
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, [user?.companyId]);

    const statsActive = rows.filter(r => r.status === "Garansi Aktif").length;
    const statsFollowUp = rows.filter(r => r.status !== "Garansi Aktif").length;

    const filtered = useMemo(() => {
        return rows.filter(r => {
            if (statusFilter === "active" && r.status !== "Garansi Aktif") return false;
            if (statusFilter === "followup" && r.status === "Garansi Aktif") return false;
            if (searchQ.trim()) {
                const q = searchQ.toLowerCase();
                return (
                    r.nama.toLowerCase().includes(q) ||
                    r.noSurat.toLowerCase().includes(q) ||
                    r.alamat.toLowerCase().includes(q)
                );
            }
            return true;
        });
    }, [rows, statusFilter, searchQ]);

    return (
        <div className="space-y-4">
            <PageHeader
                title="Monitoring Garansi Anti Rayap & Jadwal Pengontrolan"
                subtitle="Pantau masa berlaku garansi (Bulan/Tahun), jadwal Pengontrolan I (1 bln), II (3 bln), III (6 bln), IV dst (tiap 6 bln), serta kirim pengingat WhatsApp 1-klik."
                icon={<ShieldCheck size={18} />}
                actions={
                    <button
                        onClick={load}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border-subtle)] bg-white text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] cursor-pointer"
                    >
                        <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Segarkan
                    </button>
                }
            />

            {/* Interactive Summary Cards */}
            <div className="grid grid-cols-3 gap-3">
                <button
                    type="button"
                    onClick={() => setStatusFilter("all")}
                    className={`clean-card p-3.5 text-left transition-all cursor-pointer ${statusFilter === "all" ? "ring-2 ring-[var(--accent)]" : "hover:border-slate-300"}`}
                >
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">Total Kontrak Garansi</span>
                    <div className="text-xl font-bold font-mono text-[var(--text-primary)] mt-0.5">{rows.length}</div>
                    <span className="text-[10px] text-[var(--text-secondary)]">Klik untuk tampilkan semua</span>
                </button>
                <button
                    type="button"
                    onClick={() => setStatusFilter("active")}
                    className={`clean-card p-3.5 text-left border-emerald-200 bg-emerald-50/30 transition-all cursor-pointer ${statusFilter === "active" ? "ring-2 ring-emerald-600" : "hover:border-emerald-300"}`}
                >
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1">
                        <CheckCircle2 size={11} /> Garansi Aktif
                    </span>
                    <div className="text-xl font-bold font-mono text-emerald-800 mt-0.5">{statsActive}</div>
                    <span className="text-[10px] text-emerald-700">Dalam masa perlindungan SNI</span>
                </button>
                <button
                    type="button"
                    onClick={() => setStatusFilter("followup")}
                    className={`clean-card p-3.5 text-left border-amber-200 bg-amber-50/30 transition-all cursor-pointer ${statusFilter === "followup" ? "ring-2 ring-amber-600" : "hover:border-amber-300"}`}
                >
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1">
                        <AlertTriangle size={11} /> Perlu Follow-Up / Retreatment
                    </span>
                    <div className="text-xl font-bold font-mono text-amber-800 mt-0.5">{statsFollowUp}</div>
                    <span className="text-[10px] text-amber-700">Siap dihubungi untuk perpanjangan</span>
                </button>
            </div>

            {/* Search & Filter Bar */}
            <div className="clean-card p-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                <div className="relative flex-1">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                    <input
                        value={searchQ}
                        onChange={e => setSearchQ(e.target.value)}
                        placeholder="Cari nama pelanggan, nomor surat GP-APR, atau alamat lokasi..."
                        className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-tertiary)] focus:bg-white focus:outline-none focus:border-[var(--accent)]"
                    />
                </div>
                <div className="flex items-center gap-1.5">
                    {(["all", "active", "followup"] as const).map(f => (
                        <button
                            key={f}
                            type="button"
                            onClick={() => setStatusFilter(f)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                                statusFilter === f
                                    ? "bg-[var(--accent)] text-white"
                                    : "bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-slate-200"
                            }`}
                        >
                            {f === "all" ? "Semua" : f === "active" ? "Aktif" : "Perlu Follow-Up"}
                        </button>
                    ))}
                </div>
            </div>

            <div className="clean-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs min-w-[820px]">
                        <thead className="bg-[var(--bg-tertiary)] border-b border-[var(--border-subtle)] text-[10.5px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                            <tr>
                                <th className="py-2.5 px-3.5">Nomor Surat</th>
                                <th className="py-2.5 px-3.5">Pelanggan &amp; Kontak</th>
                                <th className="py-2.5 px-3.5">Lokasi Objek</th>
                                <th className="py-2.5 px-3.5">Durasi Garansi</th>
                                <th className="py-2.5 px-3.5">Masa Berlaku</th>
                                <th className="py-2.5 px-3.5">Jadwal Pengontrolan</th>
                                <th className="py-2.5 px-3.5">Status</th>
                                <th className="py-2.5 px-3.5 text-right">Aksi Cepat</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-subtle)]">
                            {filtered.map(row => {
                                const waNumber = row.telp.replace(/^0/, "62").replace(/\D/g, "");
                                const waText = encodeURIComponent(
                                    `Halo Bapak/Ibu ${row.nama},\n\nKami dari PT Guci Emas Pratama ingin menginformasikan jadwal ${row.nextControlLabel} untuk perlindungan Anti Rayap (${row.noSurat}) di lokasi ${row.alamat}.\n\nMohon konfirmasi waktu kunjungan yang nyaman bagi Bapak/Ibu. Terima kasih.`
                                );
                                return (
                                    <tr key={row.id} className="row-fade-in hover:bg-[var(--bg-tertiary)]/50 transition-colors">
                                        <td className="py-2.5 px-3.5 font-mono font-bold text-[var(--accent)] whitespace-nowrap">
                                            {row.noSurat}
                                        </td>
                                        <td className="py-2.5 px-3.5">
                                            <p className="font-bold text-[var(--text-primary)]">{row.nama}</p>
                                            <p className="text-[10.5px] text-[var(--text-muted)] flex items-center gap-1 mt-0.5">
                                                <Users size={11} /> {row.telp}
                                            </p>
                                        </td>
                                        <td className="py-2.5 px-3.5 text-[var(--text-secondary)] max-w-[210px] truncate" title={row.alamat}>
                                            {row.alamat}
                                        </td>
                                        <td className="py-2.5 px-3.5 whitespace-nowrap">
                                            <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-50 text-amber-900 border border-amber-200">
                                                {row.garansiLabel}
                                            </span>
                                        </td>
                                        <td className="py-2.5 px-3.5 whitespace-nowrap font-mono text-[11px] text-[var(--text-secondary)]">
                                            {row.startDate} &rarr; <b>{row.expiry}</b>
                                        </td>
                                        <td className="py-2.5 px-3.5 text-[var(--text-secondary)]">
                                            <span className="inline-flex items-center gap-1 text-[11px]">
                                                <CalendarClock size={12} className="text-[var(--accent)] shrink-0" />
                                                {row.nextControlLabel}
                                            </span>
                                        </td>
                                        <td className="py-2.5 px-3.5 whitespace-nowrap">
                                            <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold ${
                                                row.status === "Garansi Aktif"
                                                    ? "bg-emerald-100 text-emerald-800"
                                                    : "bg-amber-100 text-amber-800"
                                            }`}>
                                                {row.status}
                                            </span>
                                        </td>
                                        <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                                            {waNumber && (
                                                <a
                                                    href={`https://wa.me/${waNumber}?text=${waText}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-bold transition-colors"
                                                    title="Kirim Pengingat Jadwal Kontrol / Retreatment via WhatsApp"
                                                >
                                                    <MessageCircle size={12} /> Hubungi WA
                                                </a>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}