import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, getDocs, Timestamp } from "../../lib/firebase";
import { db } from "../../lib/firebase";
import { useAuthStore } from "../../store/authStore";
import { ROLE_LABELS, formatRupiah } from "../../lib/utils";
import { getTrackingByCompany } from "../../services/trackingService";
import {
    FileText, Clock, CheckCircle2, XCircle, TrendingUp,
    Send, ClipboardList, AlertCircle, ArrowRight,
    Banknote, Wrench, ChevronRight, RefreshCw, Users,
} from "lucide-react";
import type { Quotation, QuotationStatus } from "../../types";
import type { OrderTracking } from "../../services/trackingService";

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const MONTHS_ID = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];

const STATUS_CFG: Record<QuotationStatus, { label: string; color: string; bg: string }> = {
    draft: { label: "Draft", color: "#64748b", bg: "#f1f5f9" },
    pending: { label: "Menunggu", color: "#d97706", bg: "#fef3c7" },
    approved: { label: "Disetujui", color: "#1d4ed8", bg: "#dbeafe" },
    rejected: { label: "Ditolak", color: "#dc2626", bg: "#fee2e2" },
    sent_to_client: { label: "Dikirim Klien", color: "#b45309", bg: "#fef9c3" },
    deal: { label: "Deal", color: "#15803d", bg: "#dcfce7" },
    cancelled: { label: "Batal", color: "#6b7280", bg: "#f3f4f6" },
};

function fmtDate(d: Date) {
    return `${d.getDate()} ${MONTHS_ID[d.getMonth()]}`;
}

// ─── MINI SPARKLINE ───────────────────────────────────────────────────────────

function Sparkline({ data, color }: { data: number[]; color: string }) {
    if (data.length < 2) return null;
    const max = Math.max(...data, 1);
    const w = 80, h = 28;
    const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * h}`).join(" ");
    return (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="opacity-60">
            <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
    );
}


// ─── REVENUE CHART ────────────────────────────────────────────────────────────

interface MonthlyRevenue {
    label: string;
    deal: number;
    approved: number;
}

function RevenueChart({ data }: { data: MonthlyRevenue[] }) {
    const maxVal = Math.max(...data.map(d => d.deal + d.approved), 1);
    const fmtShort = (v: number) => {
        if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}M`;
        if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(0)}jt`;
        if (v >= 1_000) return `${(v / 1_000).toFixed(0)}rb`;
        return `${v}`;
    };

    return (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <p className="text-sm font-bold text-slate-800">Revenue per Bulan</p>
                    <p className="text-xs text-slate-400 mt-0.5">6 bulan terakhir</p>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-slate-500">
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm inline-block bg-emerald-500" /> Deal</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm inline-block bg-blue-300" /> Approved</span>
                </div>
            </div>
            <div className="flex items-end gap-2 h-36">
                {data.map((d, i) => {
                    const dealPct = (d.deal / maxVal) * 100;
                    const approvedPct = (d.approved / maxVal) * 100;
                    const totalPct = dealPct + approvedPct;
                    return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                            {/* Tooltip */}
                            <div className="hidden group-hover:block absolute z-10 bg-slate-800 text-white text-[10px] rounded-lg px-2 py-1.5 -mt-16 whitespace-nowrap pointer-events-none shadow-lg">
                                <p className="font-bold">{d.label}</p>
                                {d.deal > 0 && <p>Deal: {fmtShort(d.deal)}</p>}
                                {d.approved > 0 && <p>Approved: {fmtShort(d.approved)}</p>}
                            </div>
                            {/* Bar */}
                            <div className="relative w-full flex flex-col justify-end" style={{ height: "120px" }}>
                                <div className="w-full rounded-t-lg overflow-hidden flex flex-col justify-end"
                                    style={{ height: `${Math.max(totalPct, totalPct > 0 ? 4 : 0)}%` }}>
                                    <div className="w-full bg-blue-300 transition-all duration-700"
                                        style={{ height: approvedPct > 0 ? `${(approvedPct / (dealPct + approvedPct)) * 100}%` : "0%" }} />
                                    <div className="w-full bg-emerald-500 transition-all duration-700"
                                        style={{ height: dealPct > 0 ? `${(dealPct / (dealPct + approvedPct)) * 100}%` : "0%" }} />
                                </div>
                                {totalPct > 0 && (
                                    <p className="absolute -top-5 w-full text-center text-[9px] font-bold text-slate-600">
                                        {fmtShort(d.deal + d.approved)}
                                    </p>
                                )}
                            </div>
                            <p className="text-[9px] text-slate-400 font-medium">{d.label}</p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ─── STAT CARD ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon, accent, spark, onClick }: {
    label: string; value: string | number; sub?: string;
    icon: React.ReactNode; accent: string; spark?: number[]; onClick?: () => void;
}) {
    return (
        <button onClick={onClick} disabled={!onClick}
            className={`bg-white border border-slate-200 rounded-2xl p-4 flex flex-col gap-2.5 shadow-sm text-left w-full transition-all
                ${onClick ? "hover:border-slate-300 hover:shadow-md active:scale-[0.98]" : "cursor-default"}`}>
            <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: accent + "20" }}>
                    <span style={{ color: accent }}>{icon}</span>
                </div>
                {spark && <Sparkline data={spark} color={accent} />}
            </div>
            <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold text-slate-900 leading-none truncate">{value}</p>
                <p className="text-xs font-semibold text-slate-500 mt-1 leading-snug">{label}</p>
                {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
            </div>
        </button>
    );
}

// ─── PIPELINE BAR ─────────────────────────────────────────────────────────────

function PipelineBar({ counts }: { counts: Record<string, number> }) {
    const stages = [
        { key: "pending", label: "Menunggu", color: "#f59e0b" },
        { key: "approved", label: "Disetujui", color: "#3b82f6" },
        { key: "sent_to_client", label: "Dikirim", color: "#eab308" },
        { key: "deal", label: "Deal", color: "#22c55e" },
        { key: "rejected", label: "Ditolak", color: "#ef4444" },
        { key: "cancelled", label: "Batal", color: "#9ca3af" },
    ];
    const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
    return (
        <div>
            <div className="flex rounded-xl overflow-hidden h-5 gap-px bg-slate-100">
                {stages.map(s => {
                    const pct = (counts[s.key] ?? 0) / total * 100;
                    if (pct < 1) return null;
                    return (
                        <div key={s.key} title={`${s.label}: ${counts[s.key] ?? 0}`}
                            className="transition-all duration-700 flex items-center justify-center"
                            style={{ width: `${pct}%`, background: s.color }}>
                            {pct > 8 && <span className="text-white text-[9px] font-bold">{counts[s.key]}</span>}
                        </div>
                    );
                })}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                {stages.filter(s => (counts[s.key] ?? 0) > 0).map(s => (
                    <span key={s.key} className="flex items-center gap-1 text-[10px] text-slate-500">
                        <span className="w-2 h-2 rounded-full inline-block" style={{ background: s.color }} />
                        {s.label} {counts[s.key]}
                    </span>
                ))}
            </div>
        </div>
    );
}

// ─── QUOTATION ROW ────────────────────────────────────────────────────────────

function QuoRow({ q, onClick }: { q: Quotation; onClick?: () => void }) {
    const cfg = STATUS_CFG[q.status] ?? STATUS_CFG.draft;
    return (
        <button onClick={onClick}
            className="w-full flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0 hover:bg-slate-50/70 -mx-1 px-1 rounded-lg transition-colors text-left gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
                <div className={`w-1.5 h-6 rounded-full shrink-0 ${q.kategori === "AR" ? "bg-purple-400" : "bg-cyan-400"}`} />
                <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate leading-tight">{q.kepadaNama}</p>
                    <code className="text-[10px] text-slate-400 font-mono">{q.noSurat}</code>
                </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-mono text-slate-600 hidden sm:block">{formatRupiah(q.total)}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
                    style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                <ChevronRight size={12} className="text-slate-300" />
            </div>
        </button>
    );
}

// ─── TRACKING ALERT ───────────────────────────────────────────────────────────

function TrackingAlert({ trackings }: { trackings: OrderTracking[] }) {
    const nunggak = trackings.filter(t => t.statusPembayaran === "nunggak");
    const belumBayar = trackings.filter(t => t.statusPembayaran === "belum_bayar");
    const alerts = [...nunggak, ...belumBayar].slice(0, 3);
    if (alerts.length === 0) return null;
    return (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
                <AlertCircle size={15} className="text-red-500 shrink-0" />
                <p className="text-sm font-bold text-red-700">Perhatian Pembayaran</p>
                <span className="ml-auto text-xs font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                    {nunggak.length + belumBayar.length} order
                </span>
            </div>
            <div className="space-y-2">
                {alerts.map(t => (
                    <div key={t.id} className="flex items-center justify-between text-xs">
                        <div className="min-w-0">
                            <p className="font-semibold text-red-800 truncate">{t.kepadaNama}</p>
                            <code className="text-red-400 font-mono">{t.noSurat}</code>
                        </div>
                        <span className={`shrink-0 ml-2 px-2 py-0.5 rounded-full font-bold
                            ${t.statusPembayaran === "nunggak" ? "bg-purple-100 text-purple-700" : "bg-red-100 text-red-700"}`}>
                            {t.statusPembayaran === "nunggak" ? "Nunggak" : "Belum Bayar"}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── ACTIVITY FEED ────────────────────────────────────────────────────────────

function ActivityFeed({ quotations }: { quotations: Quotation[] }) {
    const recent = [...quotations]
        .sort((a, b) => b.tanggal.getTime() - a.tanggal.getTime())
        .slice(0, 6);

    return (
        <div className="space-y-0">
            {recent.map(q => {
                const cfg = STATUS_CFG[q.status] ?? STATUS_CFG.draft;
                return (
                    <div key={q.id} className="flex items-start gap-3 py-2.5 border-b border-slate-100 last:border-0">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                            style={{ background: cfg.bg }}>
                            <span style={{ color: cfg.color, fontSize: 10 }}>
                                {q.status === "deal" ? "✓" : q.status === "pending" ? "…" : q.status === "approved" ? "✓" : q.status === "rejected" ? "✗" : "→"}
                            </span>
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-slate-800 truncate">{q.kepadaNama}</p>
                            <p className="text-[10px] text-slate-400">
                                <code className="font-mono">{q.noSurat}</code> · {q.marketingNama} · {fmtDate(q.tanggal)}
                            </p>
                        </div>
                        <span className="text-[10px] font-bold shrink-0 px-1.5 py-0.5 rounded"
                            style={{ color: cfg.color, background: cfg.bg }}>{cfg.label}</span>
                    </div>
                );
            })}
        </div>
    );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export function DashboardPage() {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const [quotations, setQuotations] = useState<Quotation[]>([]);
    const [trackings, setTrackings] = useState<OrderTracking[]>([]);
    const [loading, setLoading] = useState(true);

    const isAdmin = user?.role === "administrator";
    const isAdminOps = user?.role === "admin_ops";
    const canSeeAll = isAdmin || isAdminOps;

    const load = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const q = canSeeAll
                ? query(collection(db, "quotations"), where("companyId", "==", user.companyId))
                : query(collection(db, "quotations"), where("companyId", "==", user.companyId), where("marketingUid", "==", user.uid));
            const snap = await getDocs(q);
            const rows = snap.docs.map(d => {
                const x = d.data();
                return {
                    id: d.id, ...x,
                    tanggal: x.tanggal ? (x.tanggal as Timestamp).toDate() : new Date(),
                    approvedAt: x.approvedAt ? (x.approvedAt as Timestamp).toDate() : undefined,
                } as Quotation;
            });
            setQuotations(rows);
            if (canSeeAll) {
                const tr = await getTrackingByCompany(user.companyId);
                setTrackings(tr);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, [user?.uid]);

    // ── Stats ──────────────────────────────────────────────────────────────────
    const stats = useMemo(() => {
        const now = new Date();
        const thisMonth = quotations.filter(q =>
            q.tanggal.getFullYear() === now.getFullYear() &&
            q.tanggal.getMonth() === now.getMonth()
        );
        const pipeline: Record<string, number> = {};
        quotations.forEach(q => { pipeline[q.status] = (pipeline[q.status] ?? 0) + 1; });

        const dealRevenue = quotations.filter(q => q.status === "deal").reduce((s, q) => s + q.total, 0);
        const approvedRevenue = quotations.filter(q => q.status === "approved" || q.status === "sent_to_client").reduce((s, q) => s + q.total, 0);
        const totalRevenue = dealRevenue + approvedRevenue;

        const pendingList = quotations.filter(q => q.status === "pending");
        const approvedList = quotations.filter(q => q.status === "approved");
        const dealList = quotations.filter(q => q.status === "deal");
        const decided = dealList.length + quotations.filter(q => q.status === "rejected" || q.status === "cancelled").length;
        const convRate = decided > 0 ? Math.round(dealList.length / decided * 100) : 0;

        // Monthly spark (last 6 months deal count)
        const spark: number[] = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            spark.push(quotations.filter(q =>
                q.status === "deal" &&
                q.tanggal.getFullYear() === d.getFullYear() &&
                q.tanggal.getMonth() === d.getMonth()
            ).length);
        }

        // Monthly revenue last 6 months
        const monthlyRevenue: { label: string; deal: number; approved: number }[] = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const label = MONTHS_ID[d.getMonth()];
            const deal = quotations
                .filter(q => q.status === "deal" && q.tanggal.getFullYear() === d.getFullYear() && q.tanggal.getMonth() === d.getMonth())
                .reduce((s, q) => s + q.total, 0);
            const approved = quotations
                .filter(q => (q.status === "approved" || q.status === "sent_to_client") && q.tanggal.getFullYear() === d.getFullYear() && q.tanggal.getMonth() === d.getMonth())
                .reduce((s, q) => s + q.total, 0);
            monthlyRevenue.push({ label, deal, approved });
        }

        return {
            pipeline, pendingList, approvedList, dealList,
            dealRevenue, totalRevenue, convRate,
            thisMonthCount: thisMonth.length,
            spark, monthlyRevenue,
        };
    }, [quotations]);

    // Tracking alerts
    const alertTrackings = useMemo(() =>
        trackings.filter(t => t.statusPembayaran === "nunggak" || t.statusPembayaran === "belum_bayar"),
        [trackings]
    );
    const inProgressTracking = useMemo(() =>
        trackings.filter(t => t.statusPengerjaan === "berlanjut").length,
        [trackings]
    );

    const recentQuotations = useMemo(() =>
        [...quotations].sort((a, b) => b.tanggal.getTime() - a.tanggal.getTime()).slice(0, 5),
        [quotations]
    );

    const now = new Date();
    const greeting = now.getHours() < 12 ? "Selamat pagi" : now.getHours() < 17 ? "Selamat siang" : "Selamat sore";

    return (
        <div className="p-4 md:p-6 max-w-screen-xl mx-auto space-y-5 pb-10">

            {/* ── Header ── */}
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-xs text-slate-400 font-medium">{greeting},</p>
                    <h1 className="text-xl font-bold text-slate-900 leading-tight">
                        {user?.name?.split(" ")[0]} 👋
                    </h1>
                    <p className="text-xs text-slate-400 mt-0.5">
                        <span className="font-semibold text-blue-600">{user ? ROLE_LABELS[user.role] : ""}</span>
                        {canSeeAll ? " · semua data perusahaan" : " · data kamu saja"}
                    </p>
                </div>
                <button onClick={load}
                    className="p-2 border border-slate-200 bg-white rounded-xl text-slate-400 hover:bg-slate-50 mt-1">
                    <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                </button>
            </div>

            {loading ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="bg-white border border-slate-200 rounded-2xl p-4 h-28 animate-pulse">
                            <div className="bg-slate-100 h-9 w-9 rounded-xl mb-3" />
                            <div className="bg-slate-100 h-5 w-12 rounded mb-1" />
                            <div className="bg-slate-100 h-3 w-20 rounded" />
                        </div>
                    ))}
                </div>
            ) : (
                <>
                    {/* ── Alert pembayaran bermasalah ── */}
                    {isAdmin && alertTrackings.length > 0 && (
                        <TrackingAlert trackings={alertTrackings} />
                    )}

                    {/* ── Stat cards ── */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <StatCard label="Menunggu Approval" value={stats.pendingList.length}
                            sub="Perlu ditinjau segera"
                            icon={<Clock size={18} />} accent="#f59e0b"
                            onClick={stats.pendingList.length > 0 ? () => navigate("/quotations") : undefined} />

                        <StatCard label="Sudah Disetujui" value={stats.approvedList.length}
                            sub="Perlu dikirim ke klien"
                            icon={<Send size={18} />} accent="#3b82f6"
                            onClick={stats.approvedList.length > 0 ? () => navigate("/status-ph") : undefined} />

                        <StatCard label="Deal Bulan Ini" value={stats.dealList.length}
                            sub={`Konversi ${stats.convRate}%`}
                            icon={<CheckCircle2 size={18} />} accent="#22c55e"
                            spark={stats.spark}
                            onClick={() => navigate("/tracking")} />

                        <StatCard label="Total Revenue" value={formatRupiah(stats.dealRevenue)}
                            sub="dari deal confirmed"
                            icon={<TrendingUp size={18} />} accent="#8b5cf6"
                            onClick={isAdmin ? () => navigate("/cashflow") : undefined} />
                    </div>

                    {/* ── Pipeline visual ── */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-sm font-bold text-slate-800">Pipeline Keseluruhan</p>
                            <span className="text-xs text-slate-400">{quotations.length} total quotation</span>
                        </div>
                        <PipelineBar counts={stats.pipeline} />
                    </div>

                    {/* ── Revenue Chart (admin only) ── */}
                    {canSeeAll && (
                        <RevenueChart data={stats.monthlyRevenue} />
                    )}

                    {/* ── Main grid ── */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                        {/* Pending approval — untuk admin/admin_ops */}
                        {canSeeAll && (
                            <div className="md:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                                <div className="flex items-center gap-2 mb-3">
                                    <Clock size={14} className="text-amber-500" />
                                    <p className="text-sm font-bold text-slate-800">Menunggu Persetujuan</p>
                                    {stats.pendingList.length > 0 && (
                                        <span className="ml-auto text-xs font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                                            {stats.pendingList.length}
                                        </span>
                                    )}
                                </div>
                                {stats.pendingList.length === 0 ? (
                                    <div className="flex items-center gap-3 py-5 justify-center text-slate-400">
                                        <CheckCircle2 size={20} className="opacity-40" />
                                        <p className="text-sm">Semua sudah ditinjau</p>
                                    </div>
                                ) : (
                                    <>
                                        {stats.pendingList.slice(0, 4).map(q => (
                                            <QuoRow key={q.id} q={q} onClick={() => navigate("/quotations")} />
                                        ))}
                                        {stats.pendingList.length > 4 && (
                                            <button onClick={() => navigate("/quotations")}
                                                className="mt-2 w-full text-xs text-blue-600 font-semibold hover:underline flex items-center justify-center gap-1">
                                                +{stats.pendingList.length - 4} lainnya <ArrowRight size={11} />
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        )}

                        {/* Tracking status — untuk admin */}
                        {isAdmin && (
                            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                                <div className="flex items-center gap-2 mb-4">
                                    <ClipboardList size={14} className="text-blue-500" />
                                    <p className="text-sm font-bold text-slate-800">Status Order</p>
                                </div>
                                <div className="space-y-3">
                                    {[
                                        { label: "Sedang Dikerjakan", val: inProgressTracking, color: "#3b82f6", bg: "#dbeafe", icon: <Wrench size={12} /> },
                                        { label: "Belum/Nunggak Bayar", val: alertTrackings.length, color: "#dc2626", bg: "#fee2e2", icon: <Banknote size={12} /> },
                                        { label: "Total Deal Active", val: trackings.length, color: "#15803d", bg: "#dcfce7", icon: <CheckCircle2 size={12} /> },
                                    ].map(s => (
                                        <div key={s.label} className="flex items-center justify-between p-3 rounded-xl"
                                            style={{ background: s.bg }}>
                                            <div className="flex items-center gap-2">
                                                <span style={{ color: s.color }}>{s.icon}</span>
                                                <p className="text-xs font-semibold" style={{ color: s.color }}>{s.label}</p>
                                            </div>
                                            <span className="text-base font-bold" style={{ color: s.color }}>{s.val}</span>
                                        </div>
                                    ))}
                                </div>
                                <button onClick={() => navigate("/tracking")}
                                    className="mt-3 w-full text-xs text-blue-600 font-semibold hover:underline flex items-center justify-center gap-1 py-1">
                                    Lihat semua <ArrowRight size={11} />
                                </button>
                            </div>
                        )}

                        {/* Recent quotations — marketing view */}
                        {!canSeeAll && (
                            <div className="md:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                                <div className="flex items-center gap-2 mb-3">
                                    <FileText size={14} className="text-blue-500" />
                                    <p className="text-sm font-bold text-slate-800">Quotation Saya</p>
                                    <span className="ml-auto text-xs text-slate-400">{quotations.length} total</span>
                                </div>
                                {recentQuotations.length === 0 ? (
                                    <div className="flex items-center gap-3 py-5 justify-center text-slate-400">
                                        <FileText size={20} className="opacity-40" />
                                        <p className="text-sm">Belum ada quotation</p>
                                    </div>
                                ) : (
                                    recentQuotations.map(q => (
                                        <QuoRow key={q.id} q={q} onClick={() => navigate("/quotations")} />
                                    ))
                                )}
                            </div>
                        )}

                        {/* Marketing personal stats */}
                        {!canSeeAll && (
                            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                                <p className="text-sm font-bold text-slate-800 mb-4">Statistik Saya</p>
                                <div className="space-y-3">
                                    {[
                                        { label: "Pending", val: stats.pendingList.length, color: "#f59e0b", bg: "#fef3c7" },
                                        { label: "Approved", val: stats.approvedList.length, color: "#3b82f6", bg: "#dbeafe" },
                                        { label: "Deal", val: stats.dealList.length, color: "#22c55e", bg: "#dcfce7" },
                                    ].map(s => (
                                        <div key={s.label} className="flex items-center justify-between p-3 rounded-xl"
                                            style={{ background: s.bg }}>
                                            <p className="text-xs font-semibold" style={{ color: s.color }}>{s.label}</p>
                                            <span className="text-lg font-bold" style={{ color: s.color }}>{s.val}</span>
                                        </div>
                                    ))}
                                    <div className="text-center pt-1">
                                        <p className="text-xs text-slate-400">Win Rate</p>
                                        <p className="text-2xl font-bold text-slate-800">{stats.convRate}%</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ── Activity feed ── */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                        <div className="flex items-center gap-2 mb-3">
                            <p className="text-sm font-bold text-slate-800">Aktivitas Terbaru</p>
                            <button onClick={() => navigate("/quotations")}
                                className="ml-auto text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1">
                                Lihat semua <ArrowRight size={11} />
                            </button>
                        </div>
                        {quotations.length === 0 ? (
                            <p className="text-sm text-slate-400 text-center py-4">Belum ada aktivitas</p>
                        ) : (
                            <ActivityFeed quotations={quotations} />
                        )}
                    </div>

                    {/* ── Quick actions ── */}
                    <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Akses Cepat</p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {[
                                {
                                    label: "Buat Quotation", to: "/quotations/new", icon: <FileText size={15} />, primary: true,
                                    show: ["administrator", "marketing", "admin_ops"].includes(user?.role ?? "")
                                },
                                {
                                    label: "Pelanggan", to: "/customers", icon: <Users size={15} />, primary: false,
                                    show: user?.role === "marketing"
                                },
                                {
                                    label: "Status Penawaran", to: "/status-ph", icon: <Send size={15} />, primary: false,
                                    show: ["administrator", "admin_ops"].includes(user?.role ?? "")
                                },
                                {
                                    label: "Tracking Order", to: "/tracking", icon: <ClipboardList size={15} />, primary: false,
                                    show: ["administrator", "admin_ops"].includes(user?.role ?? "")
                                },
                                {
                                    label: "Cashflow", to: "/cashflow", icon: <TrendingUp size={15} />, primary: false,
                                    show: user?.role === "administrator"
                                },
                            ].filter(l => l.show).map(link => (
                                <button key={link.to} onClick={() => navigate(link.to)}
                                    className={`flex items-center justify-center gap-2 px-3 py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all active:scale-[0.97]
                                        ${link.primary
                                            ? "bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-200"
                                            : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300"}`}>
                                    {link.icon}
                                    <span className="truncate">{link.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}