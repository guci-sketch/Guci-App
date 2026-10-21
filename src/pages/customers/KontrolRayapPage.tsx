import React, { useState, useEffect, useMemo } from "react";
import { Users, Calendar, AlertCircle, ShieldCheck, RefreshCw, Clock } from "lucide-react";
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
    status: string;
}

const FALLBACK_KONTROL: KontrolRow[] = [
    { id: "1", noSurat: "GP-APR/AR/PH/2025/01/0012", nama: "Ibu Lince Susanty", telp: "0811-9922-781", alamat: "Metland Puri, Blok F4 No. 28B", startDate: "2022-01-15", expiry: "2025-01-15", garansiLabel: "3 (Tiga) tahun", nextControlLabel: "Jatuh Tempo Retreatment", status: "Siap Retreatment" },
    { id: "2", noSurat: "GP-APR/AR/PH/2025/01/0018", nama: "Bapak Heri Mukti", telp: "0811-116-860", alamat: "Citra Fine Homes L05 No. 12", startDate: "2023-01-20", expiry: "2025-01-20", garansiLabel: "2 (Dua) tahun", nextControlLabel: "Pengontrolan IV (Per 6 Bln)", status: "Follow Up Garansi" },
    { id: "3", noSurat: "GP-APR/AR/PH/2026/01/0005", nama: "PT Oreka Solusi Kreatif", telp: "0817-0795-959", alamat: "Jl. RC. Veteran Raya No. 9, Bintaro", startDate: "2026-01-05", expiry: "2031-01-05", garansiLabel: "5 (Lima) tahun", nextControlLabel: "Pengontrolan I (+1 Bulan)", status: "Garansi Aktif" },
    { id: "4", noSurat: "GP-APR/AR/PH/2026/01/0022", nama: "Bank Victoria Cabang Fatmawati", telp: "(021) 74637054", alamat: "Jl. RS. Fatmawati Raya No.85A, Jakarta Selatan", startDate: "2026-01-12", expiry: "2029-01-12", garansiLabel: "3 (Tiga) tahun", nextControlLabel: "Pengontrolan I (+1 Bulan)", status: "Garansi Aktif" },
];

export function KontrolRayapPage() {
    const { user } = useAuthStore();
    const [rows, setRows] = useState<KontrolRow[]>(FALLBACK_KONTROL);
    const [loading, setLoading] = useState(false);
    const [month, setMonth] = useState("all");

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
                    return {
                        id: q.id,
                        noSurat: q.noSurat,
                        nama: q.kepadaNama,
                        telp: q.kepadaWa ?? "-",
                        alamat: q.lokasiPekerjaan ?? (q.kepadaAlamatLines ?? []).join(", "),
                        startDate: start.toISOString().slice(0, 10),
                        expiry: exp.toISOString().slice(0, 10),
                        garansiLabel: formatWarrantyDurationText(gNilai, gUnit),
                        nextControlLabel: "Pengontrolan Berkala (1, 3, 6, per 6 bln)",
                        status: exp.getTime() < Date.now() ? "Habis Garansi (Retreatment)" : "Garansi Aktif",
                    };
                });
                setRows(mapped);
            }
        } catch {
            // Gunakan fallback apabila offline
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, [user?.companyId]);

    const filtered = useMemo(() => {
        if (month === "all") return rows;
        return rows.filter(d => d.expiry.startsWith(month));
    }, [month, rows]);

    return (
        <div className="space-y-5">
            <PageHeader
                title="Monitoring Garansi Anti Rayap & Jadwal Pengontrolan"
                subtitle="Pantau masa berlaku garansi (dalam Bulan maupun Tahun) beserta jadwal Pengontrolan I (1 bln), II (3 bln), III (6 bln), dan IV dst (tiap 6 bln)."
                icon={<ShieldCheck size={20} />}
                actions={
                    <button
                        onClick={load}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[var(--border-subtle)] bg-white text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
                    >
                        <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Segarkan
                    </button>
                }
            />

            <div className="clean-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs min-w-[780px]">
                        <thead className="bg-[var(--bg-tertiary)] border-b border-[var(--border-subtle)] text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                            <tr>
                                <th className="py-3 px-4">Nomor Surat</th>
                                <th className="py-3 px-4">Pelanggan & Kontak</th>
                                <th className="py-3 px-4">Lokasi Objek</th>
                                <th className="py-3 px-4">Durasi Garansi</th>
                                <th className="py-3 px-4">Jatuh Tempo Garansi</th>
                                <th className="py-3 px-4">Jadwal Pengontrolan</th>
                                <th className="py-3 px-4">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-subtle)]">
                            {filtered.map(row => (
                                <tr key={row.id} className="row-fade-in hover:bg-[var(--bg-tertiary)]/50 transition-colors">
                                    <td className="py-3 px-4 font-mono font-bold text-[var(--accent)] whitespace-nowrap">
                                        {row.noSurat}
                                    </td>
                                    <td className="py-3 px-4">
                                        <p className="font-bold text-[var(--text-primary)]">{row.nama}</p>
                                        <p className="text-[11px] text-[var(--text-muted)] flex items-center gap-1 mt-0.5"><Users size={11} /> {row.telp}</p>
                                    </td>
                                    <td className="py-3 px-4 text-[var(--text-secondary)] max-w-[220px] truncate" title={row.alamat}>
                                        {row.alamat}
                                    </td>
                                    <td className="py-3 px-4 whitespace-nowrap">
                                        <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-900 border border-amber-200 font-semibold">
                                            {row.garansiLabel}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 whitespace-nowrap">
                                        <span className="px-2.5 py-1 bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded-md font-mono font-semibold inline-flex items-center gap-1.5">
                                            <Calendar size={12} className="text-[var(--accent)]" /> {row.expiry}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 text-[var(--text-secondary)]">
                                        <span className="inline-flex items-center gap-1 text-[11px]">
                                            <Clock size={12} className="text-amber-600" /> {row.nextControlLabel}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 whitespace-nowrap">
                                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                                            row.status.includes("Aktif")
                                                ? "bg-emerald-100 text-emerald-800"
                                                : "bg-amber-100 text-amber-800"
                                        }`}>
                                            {row.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}