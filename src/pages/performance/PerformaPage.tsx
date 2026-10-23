import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useAuthStore } from '@/app/store/authStore';
import { getQuotations } from '@/shared/api/quotationService';
import { supabase } from '@/shared/lib/supabase';
import { formatRupiah } from '@/shared/lib/utils';
import {
    TrendingUp, Award, ChevronDown,
    RefreshCw, Loader2, Edit2, Check, X,
    Users, FileText, Percent, ArrowUpRight, ArrowDownRight, Minus, BarChart3,
} from "lucide-react";
import type { Quotation } from '@/entities/types';

interface MarketingTarget {
    uid: string;
    year: number;
    month: number;
    targetRevenue: number;
    targetCount: number;
}

interface MonthPerfBucket {
    key: string;
    label: string;
    year: number;
    month: number;
    totalSurvey: number;
    approvedCount: number;
    dealCount: number;
    approvalRatePct: number;
    dealRatePct: number;
    momGrowthPct: number | null;
    revenue: number;
}

const MONTHS_ID = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];

export function PerformaPage() {
    const { user, activeCompanyId } = useAuthStore();
    const isMarketing = user?.role === "MARKETING";
    const isAdminOrSuper = user?.role === "MASTER_SUPER_ADMIN" || user?.role === "SUPERADMIN" || user?.role === "ADMIN";
    const companyId = (user?.role === "MASTER_SUPER_ADMIN" || user?.role === "SUPERADMIN")
        ? (activeCompanyId || user?.companyId || "")
        : (user?.companyId ?? "");

    const [quotations, setQuotations] = useState<Quotation[]>([]);
    const [targets, setTargets] = useState<MarketingTarget[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingUid, setEditingUid] = useState<string | null>(null);
    const [editRev, setEditRev] = useState("");
    const [editCnt, setEditCnt] = useState("");
    const [savingTarget, setSavingTarget] = useState(false);

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const [filterYear, setFilterYear] = useState(currentYear);
    const [filterMonth, setFilterMonth] = useState(currentMonth);

    const yearOptions = useMemo(() => {
        const y: number[] = [];
        for (let i = currentYear; i >= currentYear - 2; i--) y.push(i);
        return y;
    }, [currentYear]);

    const load = useCallback(async () => {
        if (!companyId) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const quos = await getQuotations({
                companyId,
                byUid: isMarketing ? user?.uid : undefined,
            });
            setQuotations(quos);

            if (isAdminOrSuper) {
                const { data: tRows } = await supabase
                    .from("performa_targets")
                    .select("*")
                    .eq("company_id", companyId);
                setTargets(
                    (tRows || []).map((r: any) => ({
                        uid: r.payload?.uid ?? "",
                        year: Number(r.payload?.year ?? currentYear),
                        month: Number(r.payload?.month ?? currentMonth),
                        targetRevenue: Number(r.payload?.targetRevenue ?? 0),
                        targetCount: Number(r.payload?.targetCount ?? 0),
                    }))
                );
            }
        } catch {
            // fallback
        } finally {
            setLoading(false);
        }
    }, [companyId, isMarketing, isAdminOrSuper, user?.uid, currentYear, currentMonth]);

    useEffect(() => {
        load();
    }, [load]);

    // Hitung 6 bulan terakhir hingga periode terpilih untuk perbandingan Month-over-Month (MoM)
    const monthlyBuckets = useMemo<MonthPerfBucket[]>(() => {
        const raw: Omit<MonthPerfBucket, "momGrowthPct">[] = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(filterYear, filterMonth - 1 - i, 1);
            const y = d.getFullYear();
            const m = d.getMonth() + 1;
            const monthQuos = quotations.filter(q => {
                const dt = q.tanggal instanceof Date ? q.tanggal : new Date(q.createdAt);
                return dt.getFullYear() === y && dt.getMonth() + 1 === m;
            });
            const totalSurvey = monthQuos.length;
            const approvedList = monthQuos.filter(q => q.status === "approved" || q.status === "sent_to_client" || q.status === "deal");
            const dealList = monthQuos.filter(q => q.status === "deal" || q.status === "approved");
            const approvedCount = approvedList.length;
            const dealCount = dealList.length;
            const approvalRatePct = totalSurvey > 0 ? Math.round((approvedCount / totalSurvey) * 100) : 0;
            const dealRatePct = totalSurvey > 0 ? Math.round((dealCount / totalSurvey) * 100) : 0;
            const revenue = approvedList.reduce((acc, q) => acc + (q.total || 0), 0);

            raw.push({
                key: `${y}-${String(m).padStart(2, "0")}`,
                label: `${MONTHS_ID[m - 1]} ${y}`,
                year: y,
                month: m,
                totalSurvey,
                approvedCount,
                dealCount,
                approvalRatePct,
                dealRatePct,
                revenue,
            });
        }

        return raw.map((b, idx) => {
            if (idx === 0) return { ...b, momGrowthPct: null };
            const prev = raw[idx - 1];
            const momGrowthPct = prev.approvalRatePct > 0
                ? b.approvalRatePct - prev.approvalRatePct
                : b.totalSurvey > 0
                ? b.approvalRatePct
                : 0;
            return { ...b, momGrowthPct };
        });
    }, [quotations, filterYear, filterMonth]);

    const currentBucket = monthlyBuckets[monthlyBuckets.length - 1] ?? {
        key: "", label: `${MONTHS_ID[filterMonth - 1]} ${filterYear}`, year: filterYear, month: filterMonth,
        totalSurvey: 0, approvedCount: 0, dealCount: 0, approvalRatePct: 0, dealRatePct: 0, momGrowthPct: 0, revenue: 0,
    };
    const prevBucket = monthlyBuckets[monthlyBuckets.length - 2] ?? {
        key: "", label: "Bulan Lalu", year: filterYear, month: filterMonth - 1,
        totalSurvey: 0, approvedCount: 0, dealCount: 0, approvalRatePct: 0, dealRatePct: 0, momGrowthPct: 0, revenue: 0,
    };

    const avg3MonthsApprovalPct = useMemo(() => {
        const prev3 = monthlyBuckets.slice(-4, -1);
        if (prev3.length === 0) return 0;
        return Math.round(prev3.reduce((s, x) => s + x.approvalRatePct, 0) / prev3.length);
    }, [monthlyBuckets]);

    const diffApprovalVsPrevMonth = currentBucket.approvalRatePct - prevBucket.approvalRatePct;
    const diffVolumePctVsPrevMonth = prevBucket.totalSurvey > 0
        ? Math.round(((currentBucket.totalSurvey - prevBucket.totalSurvey) / prevBucket.totalSurvey) * 100)
        : currentBucket.totalSurvey > 0 ? 100 : 0;
    const diffVs3MoAvg = currentBucket.approvalRatePct - avg3MonthsApprovalPct;

    // Statistik per Marketing (untuk perbandingan persentase & khusus Admin/Direktur ada opsi Target)
    const perMarketing = useMemo(() => {
        const map = new Map<string, {
            uid: string;
            nama: string;
            currTotal: number;
            currApproved: number;
            prevTotal: number;
            prevApproved: number;
            currPct: number;
            prevPct: number;
            momDeltaPct: number;
            revenue: number;
        }>();

        quotations.forEach(q => {
            const uid = q.marketingUid || "mkt";
            const nama = q.surveyor || q.marketingNama || "Marketing";
            if (!map.has(uid)) {
                map.set(uid, {
                    uid, nama, currTotal: 0, currApproved: 0, prevTotal: 0, prevApproved: 0,
                    currPct: 0, prevPct: 0, momDeltaPct: 0, revenue: 0,
                });
            }
            const entry = map.get(uid)!;
            const dt = q.tanggal instanceof Date ? q.tanggal : new Date(q.createdAt);
            const y = dt.getFullYear();
            const m = dt.getMonth() + 1;
            const isApp = q.status === "approved" || q.status === "sent_to_client" || q.status === "deal";

            if (y === currentBucket.year && m === currentBucket.month) {
                entry.currTotal++;
                if (isApp) {
                    entry.currApproved++;
                    entry.revenue += q.total || 0;
                }
            } else if (y === prevBucket.year && m === prevBucket.month) {
                entry.prevTotal++;
                if (isApp) entry.prevApproved++;
            }
        });

        return Array.from(map.values()).map(item => {
            const currPct = item.currTotal > 0 ? Math.round((item.currApproved / item.currTotal) * 100) : 0;
            const prevPct = item.prevTotal > 0 ? Math.round((item.prevApproved / item.prevTotal) * 100) : 0;
            return {
                ...item,
                currPct,
                prevPct,
                momDeltaPct: currPct - prevPct,
            };
        });
    }, [quotations, currentBucket, prevBucket]);

    const handleSaveTarget = async (uid: string, nama: string) => {
        if (!isAdminOrSuper || !companyId) return;
        setSavingTarget(true);
        try {
            const id = `${uid}_${filterYear}_${String(filterMonth).padStart(2, "0")}`;
            const targetRevenue = Number(editRev.replace(/\D/g, "")) || 0;
            const targetCount = Number(editCnt) || 0;
            await supabase.from("performa_targets").upsert({
                id,
                company_id: companyId,
                payload: { uid, nama, year: filterYear, month: filterMonth, targetRevenue, targetCount },
            });
            setEditingUid(null);
            await load();
        } finally {
            setSavingTarget(false);
        }
    };

    const renderDeltaBadge = (delta: number, suffix = "%") => {
        if (delta > 0) {
            return (
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                    <ArrowUpRight size={12} /> +{delta}{suffix} vs bulan lalu
                </span>
            );
        }
        if (delta < 0) {
            return (
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-700">
                    <ArrowDownRight size={12} /> {delta}{suffix} vs bulan lalu
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600">
                <Minus size={12} /> Stabil (0{suffix}) vs bulan lalu
            </span>
        );
    };

    return (
        <div className="space-y-5">
            {/* Header & Filter Periode */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 clean-card p-4">
                <div>
                    <h1 className="text-base sm:text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                        <BarChart3 size={20} className="text-[var(--accent)]" />
                        {isMarketing
                            ? "Persentase Performance & Perbandingan Bulan Kemarin (MoM)"
                            : "Analitik Persentase Performa (MoM) & Capaian Tim"}
                    </h1>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                        {isMarketing
                            ? "Pantau rasio keberhasilan penawaran (%) dan perbandingan performa Anda dibanding bulan-bulan sebelumnya."
                            : "Evaluasi persentase konversi bulanan (Month-over-Month) seluruh tim Surveyor / Marketing."}
                    </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <div className="relative">
                        <select
                            value={filterMonth}
                            onChange={e => setFilterMonth(Number(e.target.value))}
                            className="appearance-none pl-3 pr-7 py-1.5 text-xs font-bold border border-[var(--border-subtle)] rounded-xl bg-white cursor-pointer"
                        >
                            {MONTHS_ID.map((m, i) => (
                                <option key={i} value={i + 1}>{m}</option>
                            ))}
                        </select>
                        <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                    <div className="relative">
                        <select
                            value={filterYear}
                            onChange={e => setFilterYear(Number(e.target.value))}
                            className="appearance-none pl-3 pr-7 py-1.5 text-xs font-bold border border-[var(--border-subtle)] rounded-xl bg-white cursor-pointer"
                        >
                            {yearOptions.map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                        <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                    <button
                        onClick={load}
                        className="p-2 rounded-xl border border-[var(--border-subtle)] bg-white text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
                        title="Segarkan Data"
                    >
                        <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="py-16 text-center text-sm text-[var(--text-muted)] flex items-center justify-center gap-2">
                    <Loader2 size={18} className="animate-spin text-[var(--accent)]" /> Menghitung rasio performa bulanan...
                </div>
            ) : (
                <>
                    {/* 4 Kartu Utama Persentase Performa & Perbandingan Bulan Kemarin */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
                        <div className="clean-card p-4 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                                    1. Persentase Approval ({currentBucket.label})
                                </span>
                                <Percent size={16} className="text-[var(--accent)]" />
                            </div>
                            <div className="text-2xl font-bold font-mono text-[var(--text-primary)] tabular-nums">
                                {currentBucket.approvalRatePct}%
                            </div>
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                                {renderDeltaBadge(diffApprovalVsPrevMonth, "%")}
                                <span className="text-[11px] text-[var(--text-muted)]">
                                    Bulan lalu: <strong>{prevBucket.approvalRatePct}%</strong>
                                </span>
                            </div>
                        </div>

                        <div className="clean-card p-4 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                                    2. Pertumbuhan Aktivitas Survey
                                </span>
                                <TrendingUp size={16} className="text-blue-600" />
                            </div>
                            <div className="text-2xl font-bold font-mono text-[var(--text-primary)] tabular-nums">
                                {diffVolumePctVsPrevMonth >= 0 ? `+${diffVolumePctVsPrevMonth}%` : `${diffVolumePctVsPrevMonth}%`}
                            </div>
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                                <span className="text-[11px] text-[var(--text-secondary)]">
                                    Bulan ini: <strong>{currentBucket.totalSurvey} survey</strong> vs Bulan lalu: <strong>{prevBucket.totalSurvey} survey</strong>
                                </span>
                            </div>
                        </div>

                        <div className="clean-card p-4 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                                    3. Komparasi vs Rata-Rata 3 Bulan
                                </span>
                                <Award size={16} className="text-amber-600" />
                            </div>
                            <div className="text-2xl font-bold font-mono text-[var(--text-primary)] tabular-nums">
                                {diffVs3MoAvg >= 0 ? `+${diffVs3MoAvg}%` : `${diffVs3MoAvg}%`}
                            </div>
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                                <span className="text-[11px] text-[var(--text-secondary)]">
                                    Rata-rata 3 bln terakhir: <strong>{avg3MonthsApprovalPct}%</strong>
                                </span>
                            </div>
                        </div>

                        <div className="clean-card p-4 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                                    4. Rasio Konversi Deal Kontrak
                                </span>
                                <FileText size={16} className="text-purple-600" />
                            </div>
                            <div className="text-2xl font-bold font-mono text-[var(--text-primary)] tabular-nums">
                                {currentBucket.dealRatePct}%
                            </div>
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                                {renderDeltaBadge(currentBucket.dealRatePct - prevBucket.dealRatePct, "%")}
                                <span className="text-[11px] text-[var(--text-muted)]">
                                    {currentBucket.approvedCount} disetujui dari {currentBucket.totalSurvey}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Visualisasi & Tabel Perbandingan Persentase Performa 6 Bulan Terakhir (MoM) */}
                    <div className="clean-card overflow-hidden">
                        <div className="p-4 border-b border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                                <h2 className="text-sm font-bold text-[var(--text-primary)]">
                                    Perbandingan Persentase Performa 6 Bulan Terakhir (Month-over-Month)
                                </h2>
                                <p className="text-xs text-[var(--text-secondary)]">
                                    Perbandingan langsung persentase keberhasilan bulan berjalan terhadap bulan-bulan kemarin
                                </p>
                            </div>
                        </div>

                        <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 bg-[var(--bg-tertiary)]/40 border-b border-[var(--border-subtle)]">
                            {monthlyBuckets.map((b, i) => {
                                const isCurrent = i === monthlyBuckets.length - 1;
                                return (
                                    <div
                                        key={b.key}
                                        className={`p-3 rounded-xl border ${
                                            isCurrent
                                                ? "border-[var(--accent)] bg-white shadow-xs ring-1 ring-[var(--accent)]/30"
                                                : "border-[var(--border-subtle)] bg-white/80"
                                        }`}
                                    >
                                        <div className="flex items-center justify-between text-[11px] font-bold text-[var(--text-secondary)]">
                                            <span>{b.label}</span>
                                            {isCurrent && (
                                                <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[9px]">Bulan Ini</span>
                                            )}
                                        </div>
                                        <div className="mt-2 flex items-baseline justify-between">
                                            <span className="text-lg font-bold font-mono text-[var(--text-primary)]">{b.approvalRatePct}%</span>
                                            <span className="text-[10.5px] text-[var(--text-muted)]">{b.approvedCount}/{b.totalSurvey} survey</span>
                                        </div>
                                        <div className="w-full h-2 rounded-full bg-slate-100 mt-2 overflow-hidden">
                                            <div
                                                className="h-full rounded-full bg-[var(--accent)] transition-all duration-500"
                                                style={{ width: `${Math.min(100, Math.max(6, b.approvalRatePct))}%` }}
                                            />
                                        </div>
                                        <div className="mt-2 text-[10px]">
                                            {b.momGrowthPct === null ? (
                                                <span className="text-slate-400">Bulan dasar</span>
                                            ) : b.momGrowthPct > 0 ? (
                                                <span className="font-bold text-emerald-700">+{b.momGrowthPct}% dibanding bln sebelumnya</span>
                                            ) : b.momGrowthPct < 0 ? (
                                                <span className="font-bold text-red-600">{b.momGrowthPct}% dibanding bln sebelumnya</span>
                                            ) : (
                                                <span className="text-slate-500">0% (stabil)</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Rincian Perbandingan per Marketing / Surveyor */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead className="bg-[var(--bg-tertiary)] border-b border-[var(--border-subtle)] text-[10.5px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                                    <tr>
                                        <th className="py-3 px-4">Surveyor / Marketing</th>
                                        <th className="py-3 px-4 text-center">Survey Bulan Lalu ({prevBucket.label})</th>
                                        <th className="py-3 px-4 text-center">Survey Bulan Ini ({currentBucket.label})</th>
                                        <th className="py-3 px-4 text-center">% Performa Bulan Lalu</th>
                                        <th className="py-3 px-4 text-center">% Performa Bulan Ini</th>
                                        <th className="py-3 px-4 text-center">Selisih MoM (%)</th>
                                        {isAdminOrSuper && <th className="py-3 px-4 text-right">Target Admin (Khusus Manajemen)</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--border-subtle)]">
                                    {perMarketing.length === 0 ? (
                                        <tr>
                                            <td colSpan={isAdminOrSuper ? 7 : 6} className="py-8 text-center text-[var(--text-muted)]">
                                                Belum ada data aktivitas penawaran pada periode ini.
                                            </td>
                                        </tr>
                                    ) : (
                                        perMarketing.map(m => {
                                            const t = targets.find(x => x.uid === m.uid && x.year === filterYear && x.month === filterMonth);
                                            return (
                                                <tr key={m.uid} className="hover:bg-[var(--bg-tertiary)]/50">
                                                    <td className="py-3 px-4 font-bold text-[var(--text-primary)]">{m.nama}</td>
                                                    <td className="py-3 px-4 text-center font-mono">
                                                        {m.prevApproved}/{m.prevTotal} disetujui
                                                    </td>
                                                    <td className="py-3 px-4 text-center font-mono font-bold">
                                                        {m.currApproved}/{m.currTotal} disetujui
                                                    </td>
                                                    <td className="py-3 px-4 text-center font-mono text-[var(--text-secondary)]">
                                                        {m.prevPct}%
                                                    </td>
                                                    <td className="py-3 px-4 text-center font-mono font-bold text-[var(--accent)]">
                                                        {m.currPct}%
                                                    </td>
                                                    <td className="py-3 px-4 text-center">
                                                        {renderDeltaBadge(m.momDeltaPct, "%")}
                                                    </td>
                                                    {isAdminOrSuper && (
                                                        <td className="py-3 px-4 text-right">
                                                            {editingUid === m.uid ? (
                                                                <div className="inline-flex items-center gap-1.5">
                                                                    <input
                                                                        type="number"
                                                                        value={editCnt}
                                                                        onChange={e => setEditCnt(e.target.value)}
                                                                        placeholder="Target Quo"
                                                                        className="w-20 px-2 py-1 text-xs border border-slate-300 rounded-lg"
                                                                    />
                                                                    <button
                                                                        onClick={() => handleSaveTarget(m.uid, m.nama)}
                                                                        disabled={savingTarget}
                                                                        className="p-1.5 rounded-lg bg-emerald-600 text-white"
                                                                    >
                                                                        <Check size={12} />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => setEditingUid(null)}
                                                                        className="p-1.5 rounded-lg bg-slate-100 text-slate-600"
                                                                    >
                                                                        <X size={12} />
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <div className="inline-flex items-center gap-2">
                                                                    <span className="text-[11px] text-[var(--text-secondary)]">
                                                                        {t?.targetCount ? `Target: ${m.currApproved}/${t.targetCount} (${Math.round((m.currApproved / t.targetCount) * 100)}%)` : "Belum diatur"}
                                                                    </span>
                                                                    <button
                                                                        onClick={() => {
                                                                            setEditingUid(m.uid);
                                                                            setEditCnt(String(t?.targetCount ?? 10));
                                                                            setEditRev(String(t?.targetRevenue ?? 0));
                                                                        }}
                                                                        className="text-xs font-semibold text-blue-600 hover:underline inline-flex items-center gap-1"
                                                                    >
                                                                        <Edit2 size={11} /> Atur
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </td>
                                                    )}
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
