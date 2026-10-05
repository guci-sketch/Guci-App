import { useState, useEffect, useMemo, useCallback } from "react";
import {
    collection, query, where, getDocs, doc,
    setDoc, Timestamp,
} from '@/shared/lib/firebase';
import { db } from '@/shared/lib/firebase';
import { useAuthStore } from '@/app/store/authStore';
import { formatRupiah } from '@/shared/lib/utils';
import {
    TrendingUp, Award, ChevronDown,
    RefreshCw, Loader2, Edit2, Check, X,
    Users, FileText, Percent,
} from "lucide-react";

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface QuoRaw {
    id: string;
    marketingUid: string;
    marketingNama: string;
    status: string;
    total: number;
    kategori: "AR" | "PCO";
    createdAt: Date;
    approvedAt?: Date;
}

interface MarketingTarget {
    uid: string;
    year: number;
    month: number;
    targetRevenue: number;
    targetCount: number;
}

interface MarketingStats {
    uid: string;
    nama: string;
    total: number;
    approved: number;
    pending: number;
    rejected: number;
    deal: number;
    revenue: number;
    ar: number;
    pco: number;
    winRate: number;   // approved / (approved + rejected) * 100
    target?: MarketingTarget;
    revenueAchievement: number;  // % of target revenue
    countAchievement: number;    // % of target count
}

interface MonthTrend {
    label: string;
    counts: Record<string, number>;   // uid -> count
    revenues: Record<string, number>; // uid -> revenue
}

const MONTHS_ID = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agt","Sep","Okt","Nov","Des"];

function monthKey(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
}

// ─── TARGET EDITOR ────────────────────────────────────────────────────────────

function TargetEditor({
    stat, year, month, onSaved,
}: {
    stat: MarketingStats;
    year: number;
    month: number;
    onSaved: () => void;
}) {
    const [open, setOpen] = useState(false);
    const [revenue, setRevenue] = useState(String(stat.target?.targetRevenue ?? ""));
    const [count, setCount] = useState(String(stat.target?.targetCount ?? ""));
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        try {
            const docId = `${stat.uid}_${year}_${String(month).padStart(2,"0")}`;
            await setDoc(doc(db, "performaTargets", docId), {
                uid: stat.uid,
                nama: stat.nama,
                year,
                month,
                targetRevenue: Number(revenue.replace(/\D/g, "")) || 0,
                targetCount: Number(count) || 0,
                updatedAt: Timestamp.fromDate(new Date()),
            });
            setOpen(false);
            onSaved();
        } finally {
            setSaving(false);
        }
    };

    if (!open) {
        return (
            <button onClick={() => setOpen(true)}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-blue-600 transition-colors">
                <Edit2 size={11} />
                {stat.target ? "Edit Target" : "Set Target"}
            </button>
        );
    }

    return (
        <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1">
                <span className="text-xs text-slate-500">Revenue:</span>
                <input
                    className="w-28 px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-300"
                    placeholder="0"
                    value={revenue}
                    onChange={e => setRevenue(e.target.value)}
                />
            </div>
            <div className="flex items-center gap-1">
                <span className="text-xs text-slate-500">Quotation:</span>
                <input
                    className="w-14 px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-300"
                    placeholder="0"
                    value={count}
                    onChange={e => setCount(e.target.value)}
                />
            </div>
            <div className="flex items-center gap-1">
                <button onClick={handleSave} disabled={saving}
                    className="p-1 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
                    {saving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                </button>
                <button onClick={() => setOpen(false)}
                    className="p-1 rounded bg-slate-100 text-slate-500 hover:bg-slate-200">
                    <X size={11} />
                </button>
            </div>
        </div>
    );
}

// ─── ACHIEVEMENT BAR ──────────────────────────────────────────────────────────

function AchievementBar({ pct, label }: { pct: number; label: string }) {
    const capped = Math.min(pct, 100);
    const color = pct >= 100 ? "bg-emerald-500" : pct >= 70 ? "bg-amber-400" : "bg-red-400";
    return (
        <div>
            <div className="flex items-center justify-between mb-0.5">
                <span className="text-[10px] text-slate-500">{label}</span>
                <span className={`text-[10px] font-bold ${pct >= 100 ? "text-emerald-600" : pct >= 70 ? "text-amber-600" : "text-red-500"}`}>
                    {pct > 0 ? `${Math.round(pct)}%` : "—"}
                </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5">
                <div className={`h-1.5 rounded-full ${color} transition-all duration-700`} style={{ width: `${capped}%` }} />
            </div>
        </div>
    );
}

// ─── MINI TREND SPARKLINE ─────────────────────────────────────────────────────

function Sparkline({ values, color = "#3b82f6" }: { values: number[]; color?: string }) {
    if (values.length < 2) return null;
    const max = Math.max(...values, 1);
    const w = 80, h = 28, pad = 3;
    const pts = values.map((v, i) => {
        const x = pad + (i / (values.length - 1)) * (w - pad * 2);
        const y = h - pad - ((v / max) * (h - pad * 2));
        return `${x},${y}`;
    }).join(" ");

    return (
        <svg width={w} height={h} className="overflow-visible">
            <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            {/* Last point dot */}
            {(() => {
                const last = pts.split(" ").pop()!.split(",");
                return <circle cx={last[0]} cy={last[1]} r="2.5" fill={color} />;
            })()}
        </svg>
    );
}

// ─── SECTION TITLE ────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
    return <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">{children}</h2>;
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export function PerformaPage() {
    const { user } = useAuthStore();
    const companyId = user?.companyId ?? "";

    const [quotations, setQuotations] = useState<QuoRaw[]>([]);
    const [targets, setTargets] = useState<MarketingTarget[]>([]);
    const [loading, setLoading] = useState(true);

    const currentYear  = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const [filterYear, setFilterYear] = useState(currentYear);
    const [filterMonth, setFilterMonth] = useState(currentMonth);

    const yearOptions = useMemo(() => {
        const y: number[] = []; for (let i = currentYear; i >= currentYear - 3; i--) y.push(i); return y;
    }, [currentYear]);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [quoSnap, targetSnap] = await Promise.all([
                getDocs(query(collection(db, "quotations"), where("companyId", "==", companyId))),
                getDocs(query(collection(db, "performaTargets"), where("uid", "!=", ""))),
            ]);

            setQuotations(quoSnap.docs.map(d => {
                const x = d.data();
                return {
                    id: d.id,
                    marketingUid: x.marketingUid as string,
                    marketingNama: x.marketingNama as string,
                    status: x.status as string,
                    total: (x.total as number) ?? 0,
                    kategori: x.kategori as "AR" | "PCO",
                    createdAt: (x.createdAt as Timestamp).toDate(),
                    approvedAt: x.approvedAt ? (x.approvedAt as Timestamp).toDate() : undefined,
                };
            }));

            setTargets(targetSnap.docs.map(d => {
                const x = d.data();
                return {
                    uid: x.uid as string,
                    year: x.year as number,
                    month: x.month as number,
                    targetRevenue: (x.targetRevenue as number) ?? 0,
                    targetCount: (x.targetCount as number) ?? 0,
                };
            }));
        } finally {
            setLoading(false);
        }
    }, [companyId]);

    useEffect(() => { load(); }, [load]);

    // ── Filter quotations to selected month ───────────────────────────────────
    const periodQuotations = useMemo(() => quotations.filter(q => {
        const y = q.createdAt.getFullYear();
        const m = q.createdAt.getMonth() + 1;
        return y === filterYear && m === filterMonth;
    }), [quotations, filterYear, filterMonth]);

    // ── Build marketing stats ──────────────────────────────────────────────────
    const marketingStats = useMemo<MarketingStats[]>(() => {
        const map: Record<string, MarketingStats> = {};

        // Collect all marketers from all quotations (not just this period)
        quotations.forEach(q => {
            if (!map[q.marketingUid]) {
                map[q.marketingUid] = {
                    uid: q.marketingUid, nama: q.marketingNama,
                    total: 0, approved: 0, pending: 0, rejected: 0, deal: 0,
                    revenue: 0, ar: 0, pco: 0,
                    winRate: 0, revenueAchievement: 0, countAchievement: 0,
                };
            }
        });

        // Fill stats from period
        periodQuotations.forEach(q => {
            const s = map[q.marketingUid];
            if (!s) return;
            s.total++;
            if (q.status === "approved" || q.status === "sent_to_client") { s.approved++; s.revenue += q.total; }
            if (q.status === "deal") { s.approved++; s.deal++; s.revenue += q.total; }
            if (q.status === "pending")  s.pending++;
            if (q.status === "rejected" || q.status === "cancelled") s.rejected++;
            if (q.status === "approved" || q.status === "deal" || q.status === "sent_to_client") {
                if (q.kategori === "AR") s.ar += q.total;
                else s.pco += q.total;
            }
        });

        // Win rate & target achievement
        const periodTargets = targets.filter(t => t.year === filterYear && t.month === filterMonth);

        Object.values(map).forEach(s => {
            const decided = s.approved + s.rejected;
            s.winRate = decided > 0 ? Math.round((s.approved / decided) * 100) : 0;
            // deal rate = deal / approved
            (s as any).dealRate = s.approved > 0 ? Math.round((s.deal / s.approved) * 100) : 0;

            const t = periodTargets.find(t => t.uid === s.uid);
            s.target = t;
            s.revenueAchievement = t?.targetRevenue ? (s.revenue / t.targetRevenue) * 100 : 0;
            s.countAchievement   = t?.targetCount   ? (s.approved / t.targetCount) * 100 : 0;
        });

        return Object.values(map).sort((a, b) => b.revenue - a.revenue);
    }, [quotations, periodQuotations, targets, filterYear, filterMonth]);

    // ── 6-month trend per marketing ───────────────────────────────────────────
    const trendData = useMemo<MonthTrend[]>(() => {
        const buckets: MonthTrend[] = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(filterYear, filterMonth - 1 - i, 1);
            buckets.push({ label: MONTHS_ID[d.getMonth()], counts: {}, revenues: {} });
        }
        quotations.forEach(q => {
            const qm = q.createdAt.getMonth() + 1;
            const qy = q.createdAt.getFullYear();
            for (let i = 5; i >= 0; i--) {
                const d = new Date(filterYear, filterMonth - 1 - i, 1);
                if (d.getFullYear() === qy && d.getMonth() + 1 === qm) {
                    const idx = 5 - i;
                    buckets[idx].counts[q.marketingUid]   = (buckets[idx].counts[q.marketingUid]   ?? 0) + 1;
                    if (q.status === "approved")
                        buckets[idx].revenues[q.marketingUid] = (buckets[idx].revenues[q.marketingUid] ?? 0) + q.total;
                }
            }
        });
        return buckets;
    }, [quotations, filterYear, filterMonth]);

    // ── Summary stats ─────────────────────────────────────────────────────────
    const totalRevenue  = marketingStats.reduce((s, m) => s + m.revenue, 0);
    const totalApproved = marketingStats.reduce((s, m) => s + m.approved, 0);
    const totalDeal = marketingStats.reduce((s, m) => s + m.deal, 0);
    const totalQuos     = marketingStats.reduce((s, m) => s + m.total, 0);
    const avgWinRate    = marketingStats.length > 0
        ? Math.round(marketingStats.reduce((s, m) => s + m.winRate, 0) / marketingStats.length) : 0;

    const periodLabel = `${MONTHS_ID[filterMonth - 1]} ${filterYear}`;

    // Color palette for marketings
    const COLORS = ["#3b82f6","#10b981","#f59e0b","#8b5cf6","#ef4444","#06b6d4"];

    return (
        <div className="p-4 md:p-6 max-w-screen-xl mx-auto space-y-6">

            {/* ── Header ── */}
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <TrendingUp size={22} className="text-indigo-600" /> Performa
                    </h1>
                    <p className="text-sm text-slate-400 mt-0.5">Analisis performa tim marketing</p>
                </div>
                <button onClick={load} className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors">
                    <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                </button>
            </div>

            {/* ── Filters ── */}
            <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-400 mr-1">Periode:</span>
                <div className="relative">
                    <select value={filterYear} onChange={e => setFilterYear(Number(e.target.value))}
                        className="appearance-none pl-3 pr-7 py-1.5 text-sm font-medium border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 cursor-pointer">
                        {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
                <div className="relative">
                    <select value={filterMonth} onChange={e => setFilterMonth(Number(e.target.value))}
                        className="appearance-none pl-3 pr-7 py-1.5 text-sm font-medium border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 cursor-pointer">
                        {MONTHS_ID.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
                    </select>
                    <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
                <span className="text-xs text-slate-400 ml-1">— {periodLabel}</span>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20 text-slate-400">
                    <Loader2 size={22} className="animate-spin mr-2" /> Memuat data...
                </div>
            ) : (
                <>
                    {/* ── Summary cards ── */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { icon: <FileText size={18} />, label: "Total Quotation", value: String(totalQuos), sub: "dibuat periode ini", color: "bg-blue-100 text-blue-600" },
                            { icon: <Award size={18} />, label: "Approved", value: String(totalApproved), sub: `dari ${totalQuos} quotation`, color: "bg-emerald-100 text-emerald-600" },
                            { icon: <Percent size={18} />, label: "Avg Win Rate", value: `${avgWinRate}%`, sub: "rata-rata tim", color: "bg-violet-100 text-violet-600" },
                            { icon: <TrendingUp size={18} />, label: "Total Revenue", value: formatRupiah(totalRevenue), sub: `${totalDeal} deal dari ${totalApproved} approved`, color: "bg-amber-100 text-amber-600" },
                        ].map(c => (
                            <div key={c.label} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-start gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${c.color}`}>{c.icon}</div>
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{c.label}</p>
                                    <p className="text-xl font-bold text-slate-900 mt-0.5 leading-tight">{c.value}</p>
                                    <p className="text-xs text-slate-500 mt-0.5">{c.sub}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* ── Marketing cards ── */}
                    <div>
                        <SectionTitle>Performa per Marketing — {periodLabel}</SectionTitle>
                        {marketingStats.length === 0 ? (
                            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-400 shadow-sm">
                                <Users size={32} className="mx-auto mb-3 opacity-20" />
                                <p className="text-sm">Belum ada data marketing.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {marketingStats.map((m, idx) => {
                                    const trendValues = trendData.map(t => t.counts[m.uid] ?? 0);
                                    const color = COLORS[idx % COLORS.length];
                                    return (
                                        <div key={m.uid} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                                            {/* Header */}
                                            <div className="flex items-start justify-between gap-3 mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-base font-bold text-white flex-shrink-0"
                                                        style={{ backgroundColor: color }}>
                                                        {m.nama[0]?.toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-900">{m.nama}</p>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className="text-xs text-slate-500">{m.total} quotation</span>
                                                            <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                                                                m.winRate >= 70 ? "bg-emerald-100 text-emerald-700" :
                                                                m.winRate >= 40 ? "bg-amber-100 text-amber-700" :
                                                                "bg-red-100 text-red-600"
                                                            }`}>
                                                                WR {m.winRate}% · Deal {(m as any).dealRate ?? 0}%
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right flex-shrink-0">
                                                    <p className="text-base font-bold text-slate-900">{formatRupiah(m.revenue)}</p>
                                                    <Sparkline values={trendValues} color={color} />
                                                </div>
                                            </div>

                                            {/* Stats row */}
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                                                {[
                                                    { label: "Total", val: m.total, color: "text-slate-700" },
                                                    { label: "Approved", val: m.approved, color: "text-emerald-600" },
                                                    { label: "Pending", val: m.pending, color: "text-amber-600" },
                                                    { label: "Rejected", val: m.rejected, color: "text-red-500" },
                                                ].map(s => (
                                                    <div key={s.label} className="bg-slate-50 rounded-lg px-2 py-1.5 text-center">
                                                        <p className={`text-base font-bold ${s.color}`}>{s.val}</p>
                                                        <p className="text-[10px] text-slate-400">{s.label}</p>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* AR vs PCO */}
                                            <div className="flex items-center gap-3 mb-4 text-xs text-slate-600">
                                                <span className="flex items-center gap-1">
                                                    <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                                                    AR: {formatRupiah(m.ar)}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
                                                    PCO: {formatRupiah(m.pco)}
                                                </span>
                                            </div>

                                            {/* Target achievement */}
                                            {m.target ? (
                                                <div className="space-y-2 mb-3">
                                                    <AchievementBar
                                                        pct={m.revenueAchievement}
                                                        label={`Revenue vs Target (${formatRupiah(m.target.targetRevenue)})`}
                                                    />
                                                    <AchievementBar
                                                        pct={m.countAchievement}
                                                        label={`Approved vs Target (${m.target.targetCount} quotation)`}
                                                    />
                                                </div>
                                            ) : (
                                                <p className="text-xs text-slate-400 italic mb-3">Belum ada target untuk periode ini.</p>
                                            )}

                                            {/* Set target (admin only) */}
                                            <TargetEditor stat={m} year={filterYear} month={filterMonth} onSaved={load} />
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* ── AR vs PCO comparison ── */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                        <SectionTitle>Perbandingan AR vs PCO — {periodLabel}</SectionTitle>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                            {[
                                { label: "Anti Rayap", revenue: marketingStats.reduce((s,m)=>s+m.ar,0), count: periodQuotations.filter(q=>q.kategori==="AR").length, color: "emerald" },
                                { label: "Pest Control", revenue: marketingStats.reduce((s,m)=>s+m.pco,0), count: periodQuotations.filter(q=>q.kategori==="PCO").length, color: "blue" },
                            ].map(s => (
                                <div key={s.label} className={`rounded-xl p-4 bg-${s.color}-50 border border-${s.color}-100`}>
                                    <p className={`text-sm font-bold text-${s.color}-800 mb-1`}>{s.label}</p>
                                    <p className={`text-2xl font-bold text-${s.color}-900`}>{formatRupiah(s.revenue)}</p>
                                    <p className={`text-xs text-${s.color}-600 mt-1`}>{s.count} quotation approved</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ── 6-month trend table ── */}
                    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                        <div className="px-5 py-3 border-b border-slate-100">
                            <SectionTitle>Tren Quotation per Marketing (6 Bulan)</SectionTitle>
                        </div>
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-400 bg-slate-50 border-b border-slate-100">Marketing</th>
                                        {trendData.map((t, i) => (
                                            <th key={i} className="px-3 py-3 text-center text-xs font-bold uppercase tracking-wide text-slate-400 bg-slate-50 border-b border-slate-100 whitespace-nowrap">
                                                {t.label}
                                            </th>
                                        ))}
                                        <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-400 bg-slate-50 border-b border-slate-100">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {marketingStats.map((m, idx) => {
                                        const color = COLORS[idx % COLORS.length];
                                        const rowTotal = trendData.reduce((s, t) => s + (t.counts[m.uid] ?? 0), 0);
                                        return (
                                            <tr key={m.uid} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                                                            style={{ backgroundColor: color }}>
                                                            {m.nama[0]?.toUpperCase()}
                                                        </div>
                                                        <span className="text-sm font-medium text-slate-800">{m.nama}</span>
                                                    </div>
                                                </td>
                                                {trendData.map((t, i) => {
                                                    const val = t.counts[m.uid] ?? 0;
                                                    return (
                                                        <td key={i} className="px-3 py-3 text-center">
                                                            <span className={`text-sm font-bold ${val > 0 ? "text-slate-800" : "text-slate-300"}`}>
                                                                {val > 0 ? val : "—"}
                                                            </span>
                                                        </td>
                                                    );
                                                })}
                                                <td className="px-4 py-3 text-right">
                                                    <span className="text-sm font-bold text-slate-900">{rowTotal}</span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile cards */}
                        <div className="md:hidden divide-y divide-slate-100 px-1">
                            {marketingStats.map((m, idx) => {
                                const color = COLORS[idx % COLORS.length];
                                const rowTotal = trendData.reduce((s, t) => s + (t.counts[m.uid] ?? 0), 0);
                                return (
                                    <div key={m.uid} className="p-4 flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                                            style={{ backgroundColor: color }}>
                                            {m.nama[0]?.toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-slate-800">{m.nama}</p>
                                            <div className="flex gap-3 mt-1 flex-wrap">
                                                {trendData.slice(-3).map((t, i) => (
                                                    <span key={i} className="text-xs text-slate-400">
                                                        {t.label}: <span className="font-bold text-slate-700">{t.counts[m.uid] ?? 0}</span>
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-lg font-bold text-slate-900">{rowTotal}</p>
                                            <p className="text-xs text-slate-400">total</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}