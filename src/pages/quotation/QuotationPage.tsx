import React, { useState, useEffect } from "react";
import { SignatureModal } from '@/widgets/common/SignatureModal';
import { useCompanyTemplate } from '@/shared/hooks/useCompanyTemplate';
import {
    FileText, Plus, Search, RefreshCw,
    CheckCircle2, XCircle, Clock, FileX2,
    Eye, Download, Filter, ChevronLeft, ChevronRight,
    PenLine, MessageSquare, AlertCircle, Trash2, Send, MessageCircle, Pencil,
    SlidersHorizontal, Hash, TrendingUp, Sparkles,
} from "lucide-react";
import { useAuthStore } from '@/app/store/authStore';
import {
    getQuotations, updateQuotationStatus, deleteQuotation,
    attachPdfToQuotation, getQuotationPdf, getQuotationById,
    approveAndIssueAprNumber, blobToBase64,
} from '@/shared/api/quotationService';
import { generateCompanyQuotationPDF } from '@/shared/api/documentConfig';
import { LAYANAN_CONFIG } from '@/shared/lib/quotationConfig';
import { formatWarrantyDurationText } from '@/shared/lib/warrantyPricingEngine';
import { formatDate, formatRupiah } from '@/shared/lib/utils';
import { TabContainer } from '@/shared/ui/TabContainer';
import { PageHeader } from '@/shared/ui/PageHeader';
import { QuotationFormPage } from './QuotationFormPage';
import { QuotationEditPage } from './QuotationEditPage';
import { StatusPHPage } from '../status-ph/StatusPHPage';
import { NomorSuratLogPage } from '../nomor-surat/NomorSuratLogPage';
import type { Quotation, QuotationStatus, KategoriSurat, TipeKontrak } from '@/entities/types';

const STATUS_CFG: Record<QuotationStatus, { label: string; icon: React.ReactNode; bg: string; text: string; dot: string }> = {
    draft:          { label: "Draft (GP-DRF)",        icon: <FileX2 size={12} />,       bg: "#fef3c7", text: "#92400e", dot: "#f59e0b" },
    pending:        { label: "Menunggu Verifikasi",   icon: <Clock size={12} />,        bg: "#fef3c7", text: "#92400e", dot: "#f59e0b" },
    approved:       { label: "Approved (GP-APR)",     icon: <CheckCircle2 size={12} />, bg: "#dcfce7", text: "#166534", dot: "#16a34a" },
    rejected:       { label: "Perlu Revisi",          icon: <XCircle size={12} />,      bg: "#fee2e2", text: "#991b1b", dot: "#ef4444" },
    sent_to_client: { label: "Dikirim ke Klien",      icon: <Send size={12} />,         bg: "#dbeafe", text: "#1e40af", dot: "#3b82f6" },
    deal:           { label: "Deal Kontrak ✓",        icon: <CheckCircle2 size={12} />, bg: "#d1fae5", text: "#065f46", dot: "#059669" },
    cancelled:      { label: "Batal",                 icon: <XCircle size={12} />,      bg: "#f3f4f6", text: "#6b7280", dot: "#9ca3af" },
};

function StatusBadge({ status }: { status: QuotationStatus }) {
    const c = STATUS_CFG[status] ?? STATUS_CFG.pending;
    return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
            style={{ background: c.bg, color: c.text }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.dot }} />
            {c.label}
        </span>
    );
}

function KategoriBadge({ kategori }: { kategori: KategoriSurat }) {
    const isAR = kategori === "AR";
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold
            ${isAR ? "bg-purple-100 text-purple-800" : "bg-emerald-100 text-emerald-800"}`}>
            {isAR ? "🛡 AR" : "🦟 PCO"}
        </span>
    );
}

type HubSubTab = "list" | "new" | "edit" | "pipeline" | "nomor-log";

const PER_PAGE = 10;

export function QuotationPage() {
    const { user } = useAuthStore();
    const templateConfig = useCompanyTemplate();

    const [subTab, setSubTab] = useState<HubSubTab>("list");
    const [editingQuotationId, setEditingQuotationId] = useState<string | null>(null);

    const [quotations, setQuotations] = useState<Quotation[]>([]);
    const [signatureTarget, setSignatureTarget] = useState<Quotation | null>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filterKat, setFilterKat] = useState<"all" | KategoriSurat>("all");
    const [filterTipe, setFilterTipe] = useState<"all" | TipeKontrak>("all");
    const [filterStatus, setFilterStatus] = useState<"all" | QuotationStatus>("all");
    const [page, setPage] = useState(1);

    const [approveTarget, setApproveTarget] = useState<Quotation | null>(null);
    const [rejectTarget, setRejectTarget] = useState<Quotation | null>(null);
    const [rejectReason, setRejectReason] = useState("");
    const [rejectNotes, setRejectNotes] = useState("");
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const canSeeAll = user?.role !== "MARKETING";
    const canApprove = user?.role === "SUPERADMIN" || user?.role === "ADMIN";
    const canCreate = user?.role === "SUPERADMIN" || user?.role === "ADMIN" || user?.role === "MARKETING";
    const canDelete = user?.role === "ADMIN" || user?.role === "SUPERADMIN";

    const load = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const data = await getQuotations({
                companyId: user.companyId,
                byUid: canSeeAll ? undefined : user.uid,
            });
            setQuotations(data);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, [user]);

    // Preview / Download PDF (mendukung on-the-fly render bila masih berstatus GP-DRF)
    const handleOpenOrRenderPdf = async (q: Quotation, download = false) => {
        setActionLoading(q.id);
        try {
            let b64 = q.pdfBase64 ?? (q.hasPdf ? await getQuotationPdf(q.id, "pdfBase64") : null);
            if (!b64) {
                const full = (await getQuotationById(q.id)) ?? q;
                const blob = await generateCompanyQuotationPDF({
                    noSurat: full.noSurat,
                    tanggal: full.tanggal,
                    kepadaNama: full.kepadaNama,
                    kepadaAlamatLines: full.kepadaAlamatLines,
                    kepadaUp: full.kepadaUp,
                    kepadaWa: full.kepadaWa,
                    objekPekerjaan: full.objekPekerjaan,
                    lokasiPekerjaan: full.lokasiPekerjaan,
                    jenisLayanan: full.jenisLayanan,
                    pdfVariant: full.pdfVariant,
                    isRevisi: full.isRevisi,
                    perihal: full.perihal,
                    items: full.items,
                    biayaTambahan: full.biayaTambahan,
                    upahPeralatanPct: full.upahPeralatanPct,
                    diskonUpahPct: full.diskonUpahPct,
                    diskonPct: full.diskonPct,
                    ppn: full.ppn,
                    ppnDppFaktor: full.ppnDppFaktor,
                    garansiTahun: full.garansiTahun,
                    garansiNilai: full.garansiNilai,
                    garansiUnit: full.garansiUnit,
                    jenisGaransi: full.jenisGaransi,
                    tampilkanPengontrolan: full.tampilkanPengontrolan,
                    surveyor: full.surveyor,
                    tanggalSurvey: full.tanggalSurvey ? new Date(`${full.tanggalSurvey}T00:00:00+07:00`) : full.tanggal,
                    hasilSurvey: full.hasilSurvey,
                    kunjunganPerBulan: full.kunjunganPerBulan,
                    jadwalFoggingTahun: full.jadwalFoggingTahun,
                    jadwalFoggingRows: full.jadwalFoggingRows,
                    surveyPhotos: full.surveyPhotos,
                    lampiranPages: full.lampiranPages,
                    chemicals: full.chemicals,
                    metode: full.metode,
                    focusTarget: full.focusTarget,
                    teknikPelaksanaan: full.teknikPelaksanaan,
                    marketingNama: full.marketingNama,
                    marketingWa: full.marketingWa,
                    templateConfig,
                }, user?.companyId);
                b64 = await blobToBase64(blob);
            }
            const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
            const blob = new Blob([bytes], { type: "application/pdf" });
            const url = URL.createObjectURL(blob);
            if (download) {
                const a = document.createElement("a");
                a.href = url;
                a.download = `${q.noSurat.replace(/\//g, "-")}.pdf`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            } else {
                window.open(url, "_blank");
            }
            setTimeout(() => URL.revokeObjectURL(url), 8000);
        } catch (err) {
            alert(err instanceof Error ? err.message : "Gagal membuka PDF penawaran.");
        } finally {
            setActionLoading(null);
        }
    };

    // Approve: Konversi GP-DRF -> GP-APR + Auto-Generate PDF Resmi
    const handleApprove = async () => {
        if (!approveTarget || !user) return;
        setActionLoading(approveTarget.id);
        try {
            const full = (await getQuotationById(approveTarget.id)) ?? approveTarget;
            const { approvedNoSurat } = await approveAndIssueAprNumber({
                quotation: full,
                approvedByUid: user.uid,
                approvedByName: user.name,
            });

            const pdfBlob = await generateCompanyQuotationPDF({
                noSurat: approvedNoSurat,
                tanggal: full.tanggal,
                kepadaNama: full.kepadaNama,
                kepadaAlamatLines: full.kepadaAlamatLines,
                kepadaUp: full.kepadaUp,
                kepadaWa: full.kepadaWa,
                objekPekerjaan: full.objekPekerjaan,
                lokasiPekerjaan: full.lokasiPekerjaan,
                jenisLayanan: full.jenisLayanan,
                pdfVariant: full.pdfVariant,
                isRevisi: full.isRevisi,
                perihal: full.perihal,
                items: full.items,
                biayaTambahan: full.biayaTambahan,
                upahPeralatanPct: full.upahPeralatanPct,
                diskonUpahPct: full.diskonUpahPct,
                diskonPct: full.diskonPct,
                ppn: full.ppn,
                ppnDppFaktor: full.ppnDppFaktor,
                garansiTahun: full.garansiTahun,
                garansiNilai: full.garansiNilai,
                garansiUnit: full.garansiUnit,
                jenisGaransi: full.jenisGaransi,
                tampilkanPengontrolan: full.tampilkanPengontrolan,
                surveyor: full.surveyor,
                tanggalSurvey: full.tanggalSurvey ? new Date(`${full.tanggalSurvey}T00:00:00+07:00`) : full.tanggal,
                hasilSurvey: full.hasilSurvey,
                kunjunganPerBulan: full.kunjunganPerBulan,
                jadwalFoggingTahun: full.jadwalFoggingTahun,
                jadwalFoggingRows: full.jadwalFoggingRows,
                surveyPhotos: full.surveyPhotos,
                lampiranPages: full.lampiranPages,
                chemicals: full.chemicals,
                metode: full.metode,
                focusTarget: full.focusTarget,
                teknikPelaksanaan: full.teknikPelaksanaan,
                marketingNama: full.marketingNama,
                marketingWa: full.marketingWa,
                templateConfig,
            }, user.companyId);

            const pdfBase64 = await blobToBase64(pdfBlob);
            await attachPdfToQuotation(full.id, pdfBase64);

            setApproveTarget(null);
            await load();
        } catch (err) {
            alert(err instanceof Error ? err.message : "Gagal menyetujui penawaran.");
        } finally {
            setActionLoading(null);
        }
    };

    const handleReject = async () => {
        if (!rejectTarget || !rejectReason.trim()) return;
        setActionLoading(rejectTarget.id);
        try {
            await updateQuotationStatus(rejectTarget.id, "rejected", user?.name, rejectReason.trim(), rejectNotes.trim());
            setRejectTarget(null);
            setRejectReason("");
            setRejectNotes("");
            await load();
        } finally {
            setActionLoading(null);
        }
    };

    const statsTotal = quotations.length;
    const statsDraftPending = quotations.filter(q => q.status === "pending" || q.status === "draft").length;
    const statsApproved = quotations.filter(q => q.status === "approved" || q.status === "sent_to_client").length;
    const statsDeal = quotations.filter(q => q.status === "deal").length;

    const hubTabs = [
        { id: "list",      label: "Daftar & Verifikasi Quotation", shortLabel: "Semua", icon: <FileText size={15} />, badge: statsDraftPending, badgeTone: "warning" as const },
        ...(canCreate ? [{ id: "new", label: "+ Input Survey / Buat Draft (GP-DRF)", shortLabel: "Input Survey", icon: <Plus size={15} /> }] : []),
        { id: "pipeline",  label: "Pipeline Status PH & Deal", shortLabel: "Pipeline", icon: <TrendingUp size={15} />, badge: statsApproved, badgeTone: "success" as const },
        { id: "nomor-log", label: "Register Nomor (DRF & APR)", shortLabel: "Register", icon: <Hash size={15} /> },
    ];

    if (subTab === "new") {
        return (
            <div className="space-y-4">
                <TabContainer tabs={hubTabs} activeTab={subTab} onChange={id => setSubTab(id as HubSubTab)} />
                <QuotationFormPage
                    onSavedSuccess={() => { setSubTab("list"); load(); }}
                    onCancel={() => setSubTab("list")}
                />
            </div>
        );
    }

    if (subTab === "edit" && editingQuotationId) {
        return (
            <div className="space-y-4">
                <TabContainer tabs={hubTabs} activeTab="list" onChange={id => setSubTab(id as HubSubTab)} />
                <QuotationEditPage
                    quotationIdProp={editingQuotationId}
                    onSavedSuccess={() => { setEditingQuotationId(null); setSubTab("list"); load(); }}
                    onCancel={() => { setEditingQuotationId(null); setSubTab("list"); }}
                />
            </div>
        );
    }

    if (subTab === "pipeline") {
        return (
            <div className="space-y-4">
                <TabContainer tabs={hubTabs} activeTab={subTab} onChange={id => setSubTab(id as HubSubTab)} />
                <StatusPHPage />
            </div>
        );
    }

    if (subTab === "nomor-log") {
        return (
            <div className="space-y-4">
                <TabContainer tabs={hubTabs} activeTab={subTab} onChange={id => setSubTab(id as HubSubTab)} />
                <NomorSuratLogPage />
            </div>
        );
    }

    // Filter daftar quotation
    let displayed = [...quotations];
    if (search) {
        const s = search.toLowerCase();
        displayed = displayed.filter(q =>
            q.noSurat.toLowerCase().includes(s) ||
            (q.draftNoSurat ?? "").toLowerCase().includes(s) ||
            q.kepadaNama.toLowerCase().includes(s) ||
            (q.objekPekerjaan ?? "").toLowerCase().includes(s) ||
            q.marketingNama.toLowerCase().includes(s)
        );
    }
    if (filterKat !== "all") displayed = displayed.filter(q => q.kategori === filterKat);
    if (filterTipe !== "all") displayed = displayed.filter(q => q.tipeKontrak === filterTipe);
    if (filterStatus !== "all") displayed = displayed.filter(q => q.status === filterStatus);

    const totalPages = Math.ceil(displayed.length / PER_PAGE);
    const paged = displayed.slice((page - 1) * PER_PAGE, page * PER_PAGE);

    return (
        <div className="space-y-5">
            {signatureTarget && (
                <SignatureModal
                    quotation={signatureTarget}
                    signerName={user?.name ?? "Marketing"}
                    templateConfig={templateConfig}
                    onClose={() => setSignatureTarget(null)}
                    onSigned={() => {
                        setQuotations(prev => prev.map(q =>
                            q.id === signatureTarget.id ? { ...q, hasSignedPdf: true, signedAt: new Date(), signedBy: user?.name } : q
                        ));
                        setSignatureTarget(null);
                    }}
                />
            )}

            <TabContainer tabs={hubTabs} activeTab={subTab} onChange={id => setSubTab(id as HubSubTab)} />

            <PageHeader
                title="Automation Quotation Hub — PT Guci Emas Pratama"
                subtitle="Alur Terpadu: Input Hasil Survey & Volume (GP-DRF) → Negosiasi Garansi & Harga via Admin → Approval Resmi (GP-APR)"
                icon={<FileText size={20} />}
                actions={
                    <>
                        <button
                            onClick={load}
                            className="p-2 rounded-xl border border-[var(--border-subtle)] bg-white text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
                            title="Segarkan Data"
                        >
                            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                        </button>
                        {canCreate && (
                            <button
                                onClick={() => setSubTab("new")}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs sm:text-sm font-bold shadow-xs btn-tactile"
                            >
                                <Plus size={16} /> Input Survey / Buat Draft (GP-DRF)
                            </button>
                        )}
                    </>
                }
            />

            {/* Interactive 4-Step Workflow & KPI Cards (Klik untuk Filter Langsung) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                <button
                    type="button"
                    onClick={() => { setFilterStatus("all"); setPage(1); }}
                    className={`clean-card p-3.5 text-left transition-all cursor-pointer ${filterStatus === "all" ? "ring-2 ring-[var(--accent)]" : "hover:border-slate-300"}`}
                >
                    <span className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">Semua Penawaran</span>
                    <div className="text-xl font-bold font-mono text-[var(--text-primary)] mt-0.5 tabular-nums">{statsTotal}</div>
                    <span className="text-[10.5px] text-[var(--text-secondary)]">Klik tampilkan semua &rarr;</span>
                </button>
                <button
                    type="button"
                    onClick={() => { setFilterStatus("pending"); setPage(1); }}
                    className={`clean-card p-3.5 text-left border-amber-200 bg-amber-50/35 transition-all cursor-pointer ${filterStatus === "pending" ? "ring-2 ring-amber-600" : "hover:border-amber-300"}`}
                >
                    <span className="text-[10.5px] font-bold uppercase tracking-wider text-amber-800 block">1. Tahap Draft (GP-DRF)</span>
                    <div className="text-xl font-bold font-mono text-amber-800 mt-0.5 tabular-nums">{statsDraftPending}</div>
                    <span className="text-[10.5px] text-amber-700">Klik untuk Nego / Approve &rarr;</span>
                </button>
                <button
                    type="button"
                    onClick={() => { setFilterStatus("approved"); setPage(1); }}
                    className={`clean-card p-3.5 text-left border-emerald-200 bg-emerald-50/35 transition-all cursor-pointer ${filterStatus === "approved" ? "ring-2 ring-emerald-600" : "hover:border-emerald-300"}`}
                >
                    <span className="text-[10.5px] font-bold uppercase tracking-wider text-emerald-800 block">2. Approved (GP-APR)</span>
                    <div className="text-xl font-bold font-mono text-emerald-800 mt-0.5 tabular-nums">{statsApproved}</div>
                    <span className="text-[10.5px] text-emerald-700">Klik untuk PDF &amp; Kirim WA &rarr;</span>
                </button>
                <button
                    type="button"
                    onClick={() => setSubTab("pipeline")}
                    className="clean-card p-3.5 text-left hover:border-emerald-300 transition-all cursor-pointer"
                >
                    <span className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--accent)] block">3. Deal &amp; Pipeline SPK</span>
                    <div className="text-xl font-bold font-mono text-[var(--accent)] mt-0.5 tabular-nums">{statsDeal}</div>
                    <span className="text-[10.5px] text-[var(--text-secondary)]">Buka Pipeline Deal &rarr;</span>
                </button>
            </div>

            {/* Filter & Search Bar */}
            <div className="clean-card p-3.5 space-y-3">
                <div className="flex flex-col md:flex-row gap-2.5 items-stretch md:items-center justify-between">
                    <div className="relative flex-1">
                        <Search size={15} className="absolute left-3 top-2.5 text-[var(--text-muted)]" />
                        <input
                            value={search}
                            onChange={e => { setSearch(e.target.value); setPage(1); }}
                            placeholder="Cari nomor GP-DRF / GP-APR, nama klien, objek survey, atau surveyor..."
                            className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm border border-[var(--border-subtle)] rounded-xl bg-[var(--bg-tertiary)] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                        />
                    </div>
                    <div className="flex flex-wrap gap-1.5 items-center">
                        <Filter size={13} className="text-[var(--text-muted)] mr-1" />
                        {(["all", "AR", "PCO"] as const).map(v => (
                            <button
                                key={v}
                                onClick={() => { setFilterKat(v); setPage(1); }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                                    filterKat === v
                                        ? "bg-[var(--accent)] text-white"
                                        : "bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-slate-200"
                                }`}
                            >
                                {v === "all" ? "Semua Kategori" : v === "AR" ? "🛡 Anti Rayap (AR)" : "🦟 Pest Control (PCO)"}
                            </button>
                        ))}
                        <select
                            value={filterStatus}
                            onChange={e => { setFilterStatus(e.target.value as typeof filterStatus); setPage(1); }}
                            className="px-3 py-1.5 text-xs font-semibold border border-[var(--border-subtle)] rounded-lg bg-white text-[var(--text-primary)]"
                        >
                            <option value="all">Semua Status</option>
                            <option value="pending">Draft / Menunggu (GP-DRF)</option>
                            <option value="approved">Disetujui (GP-APR)</option>
                            <option value="sent_to_client">Dikirim ke Klien</option>
                            <option value="deal">Deal ✓</option>
                            <option value="rejected">Perlu Revisi</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Tabel Utama Daftar Quotation */}
            <div className="clean-card overflow-hidden">
                {loading ? (
                    <div className="py-16 text-center text-sm text-[var(--text-muted)] flex items-center justify-center gap-2">
                        <RefreshCw size={18} className="animate-spin text-[var(--accent)]" /> Memuat daftar penawaran...
                    </div>
                ) : paged.length === 0 ? (
                    <div className="py-16 text-center text-[var(--text-muted)] space-y-2">
                        <FileText size={36} className="mx-auto opacity-30" />
                        <p className="font-semibold text-[var(--text-secondary)]">Belum ada dokumen penawaran yang sesuai filter</p>
                        {canCreate && (
                            <button
                                onClick={() => setSubTab("new")}
                                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--accent)] text-white text-xs font-bold"
                            >
                                <Plus size={14} /> Buat Draft Survey Pertama (GP-DRF)
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[920px]">
                            <thead className="bg-[var(--bg-tertiary)] border-b border-[var(--border-subtle)] text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                                <tr>
                                    <th className="px-4 py-3">Nomor Surat (DRF / APR)</th>
                                    <th className="px-4 py-3">Kategori & Layanan</th>
                                    <th className="px-4 py-3">Klien & Objek Survey</th>
                                    <th className="px-4 py-3">Garansi</th>
                                    <th className="px-4 py-3 text-right">Total Harga</th>
                                    <th className="px-4 py-3">Surveyor / Mkt</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3 text-right">Tindakan</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border-subtle)] text-xs">
                                {paged.map(q => {
                                    const isPending = q.status === "pending" || q.status === "draft";
                                    const isApproved = q.status === "approved" || q.status === "sent_to_client" || q.status === "deal";
                                    const isAprStage = q.stage === "APR" || q.noSurat.includes("-APR/");
                                    const gText = formatWarrantyDurationText(
                                        q.garansiNilai ?? q.garansiTahun ?? 0,
                                        q.garansiUnit ?? "tahun"
                                    );
                                    const isActing = actionLoading === q.id;

                                    return (
                                        <tr key={q.id} className={`row-fade-in hover:bg-[var(--bg-tertiary)]/60 transition-colors ${isPending ? "bg-amber-50/20" : ""}`}>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <code className={`px-2 py-1 rounded-md font-mono font-bold text-xs block w-max ${
                                                    isAprStage
                                                        ? "bg-[var(--status-approved-bg)] text-[var(--status-approved-text)]"
                                                        : "bg-[var(--status-draft-bg)] text-[var(--status-draft-text)]"
                                                }`}>
                                                    {q.noSurat}
                                                </code>
                                                {q.draftNoSurat && q.draftNoSurat !== q.noSurat && (
                                                    <span className="text-[10px] font-mono text-[var(--text-muted)] block mt-0.5">
                                                        Ex-Draft: {q.draftNoSurat}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-1.5">
                                                    <KategoriBadge kategori={q.kategori} />
                                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
                                                        {q.tipeKontrak}
                                                    </span>
                                                </div>
                                                <span className="text-[11px] text-[var(--text-secondary)] block mt-1">
                                                    {LAYANAN_CONFIG[q.jenisLayanan]?.label.split("—")[1]?.trim() ?? q.jenisLayanan}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 max-w-[220px]">
                                                <div className="font-bold text-[var(--text-primary)] truncate">{q.kepadaNama}</div>
                                                {q.objekPekerjaan && (
                                                    <div className="text-[11px] text-[var(--accent)] font-medium truncate">
                                                        Objek: {q.objekPekerjaan}
                                                    </div>
                                                )}
                                                {q.kepadaAlamatLines?.[0] && (
                                                    <div className="text-[11px] text-[var(--text-muted)] truncate">{q.kepadaAlamatLines[0]}</div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-900 border border-amber-200">
                                                    {gText}
                                                </span>
                                                {(q.adjustmentHistory?.length ?? 0) > 0 && (
                                                    <span className="block text-[10px] text-amber-700 font-semibold mt-0.5">
                                                        ↺ {q.adjustmentHistory!.length}x Adjust Nego
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono font-bold text-sm text-[var(--text-primary)] whitespace-nowrap tabular-nums">
                                                {formatRupiah(q.total)}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <span className="font-semibold text-[var(--text-primary)] block">{q.surveyor || q.marketingNama}</span>
                                                <span className="text-[10px] text-[var(--text-muted)]">{formatDate(q.tanggal)}</span>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <StatusBadge status={q.status} />
                                            </td>
                                            <td className="px-4 py-3 text-right whitespace-nowrap">
                                                <div className="inline-flex items-center gap-1 justify-end">
                                                    {/* Lihat / Pratinjau PDF (bisa untuk GP-DRF maupun GP-APR) */}
                                                    <button
                                                        onClick={() => handleOpenOrRenderPdf(q, false)}
                                                        disabled={isActing}
                                                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-[var(--border-subtle)] bg-white text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--accent)] text-[11px] font-semibold cursor-pointer"
                                                        title="Lihat / Pratinjau PDF Surat Penawaran"
                                                    >
                                                        <Eye size={13} /> PDF
                                                    </button>

                                                    {/* Adjust Garansi / Harga / Edit Draft */}
                                                    <button
                                                        onClick={() => { setEditingQuotationId(q.id); setSubTab("edit"); }}
                                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-[11px] font-bold"
                                                        title="Adjust Garansi (Bulan/Tahun), Volume, atau Harga"
                                                    >
                                                        <SlidersHorizontal size={12} /> Adjust
                                                    </button>

                                                    {/* Tombol Approve Admin (Konversi GP-DRF -> GP-APR) */}
                                                    {canApprove && isPending && (
                                                        <>
                                                            <button
                                                                onClick={() => setApproveTarget(q)}
                                                                disabled={isActing}
                                                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold"
                                                                title="Approve & Terbitkan Nomor GP-APR"
                                                            >
                                                                <CheckCircle2 size={12} /> Approve
                                                            </button>
                                                            <button
                                                                onClick={() => setRejectTarget(q)}
                                                                disabled={isActing}
                                                                className="p-1.5 rounded-lg text-red-500 hover:bg-red-50"
                                                                title="Minta Revisi ke Surveyor"
                                                            >
                                                                <XCircle size={15} />
                                                            </button>
                                                        </>
                                                    )}

                                                    {/* Unduh PDF Resmi (setelah Approved GP-APR) */}
                                                    {isApproved && (
                                                        <button
                                                            onClick={() => handleOpenOrRenderPdf(q, true)}
                                                            className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-50"
                                                            title="Download PDF Resmi (GP-APR)"
                                                        >
                                                            <Download size={15} />
                                                        </button>
                                                    )}

                                                    {/* Tanda Tangan Digital */}
                                                    {isApproved && (
                                                        <button
                                                            onClick={() => setSignatureTarget(q)}
                                                            className="p-1.5 rounded-lg text-purple-600 hover:bg-purple-50"
                                                            title="Bubuhkan Tanda Tangan Digital"
                                                        >
                                                            <PenLine size={15} />
                                                        </button>
                                                    )}

                                                    {/* Kirim WA ke Klien */}
                                                    {q.kepadaWa && isApproved && (
                                                        <a
                                                            href={`https://wa.me/${q.kepadaWa.replace(/^0/, "62").replace(/\D/g, "")}?text=${encodeURIComponent(`Halo Bapak/Ibu ${q.kepadaUp || q.kepadaNama},\n\nBerikut kami sampaikan Surat Penawaran Resmi PT Guci Emas Pratama:\nNo. Surat: ${q.noSurat}\nLayanan: ${LAYANAN_CONFIG[q.jenisLayanan]?.label}\nGaransi: ${gText}\nTotal Biaya: Rp ${q.total.toLocaleString("id-ID")}\n\nTerima kasih atas kepercayaan Anda.`)}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50"
                                                            title={`Kirim via WhatsApp ke ${q.kepadaWa}`}
                                                        >
                                                            <MessageCircle size={15} />
                                                        </a>
                                                    )}

                                                    {/* Hapus (Admin) */}
                                                    {canDelete && (
                                                        <button
                                                            onClick={async () => {
                                                                if (!confirm(`Hapus penawaran ${q.noSurat}?`)) return;
                                                                await deleteQuotation(q.id);
                                                                await load();
                                                            }}
                                                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                                                            title="Hapus Penawaran"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border-subtle)] bg-[var(--bg-tertiary)]/50 text-xs">
                        <span className="text-[var(--text-secondary)]">
                            Menampilkan halaman {page} dari {totalPages} ({displayed.length} penawaran)
                        </span>
                        <div className="flex gap-1.5">
                            <button
                                disabled={page === 1}
                                onClick={() => setPage(p => p - 1)}
                                className="p-1.5 rounded-lg border border-[var(--border-subtle)] bg-white disabled:opacity-40"
                            >
                                <ChevronLeft size={14} />
                            </button>
                            <button
                                disabled={page === totalPages}
                                onClick={() => setPage(p => p + 1)}
                                className="p-1.5 rounded-lg border border-[var(--border-subtle)] bg-white disabled:opacity-40"
                            >
                                <ChevronRight size={14} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal Konfirmasi Approve (Konversi GP-DRF -> GP-APR) */}
            {approveTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
                    <div className="clean-card max-w-md w-full p-6 space-y-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                            <CheckCircle2 size={26} />
                        </div>
                        <div className="text-center space-y-1">
                            <h3 className="text-base font-bold text-[var(--text-primary)]">
                                Setujui & Terbitkan Nomor Resmi GP-APR?
                            </h3>
                            <p className="text-xs text-[var(--text-secondary)]">
                                Draft <code className="font-mono font-bold text-amber-800">{approveTarget.noSurat}</code> untuk <strong>{approveTarget.kepadaNama}</strong> senilai <strong>{formatRupiah(approveTarget.total)}</strong> akan disetujui.
                            </p>
                        </div>
                        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-1">
                            <p className="font-bold">Apa yang dilakukan sistem secara otomatis:</p>
                            <p>1. Mengunci nomor surat resmi baru berkode <strong>GP-APR/{approveTarget.kategori}/{approveTarget.tipeKontrak}/...</strong></p>
                            <p>2. Merender PDF resmi PT Guci Emas Pratama dengan garansi <strong>{formatWarrantyDurationText(approveTarget.garansiNilai ?? approveTarget.garansiTahun ?? 0, approveTarget.garansiUnit ?? "tahun")}</strong>.</p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setApproveTarget(null)}
                                className="flex-1 py-2.5 rounded-xl bg-[var(--bg-tertiary)] text-xs font-semibold text-[var(--text-secondary)]"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleApprove}
                                disabled={actionLoading === approveTarget.id}
                                className="flex-1 py-2.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-bold flex items-center justify-center gap-1.5"
                            >
                                {actionLoading === approveTarget.id && <RefreshCw size={13} className="animate-spin" />}
                                Ya, Terbitkan GP-APR
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Tolak / Minta Revisi */}
            {rejectTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
                    <div className="clean-card max-w-md w-full p-6 space-y-4">
                        <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                            <XCircle size={18} className="text-red-600" /> Kembalikan Draft untuk Revisi
                        </h3>
                        <div className="space-y-3 text-xs">
                            <div>
                                <label className="font-bold block mb-1">Alasan Revisi / Penolakan *</label>
                                <textarea
                                    rows={2}
                                    value={rejectReason}
                                    onChange={e => setRejectReason(e.target.value)}
                                    className="w-full p-2.5 border border-[var(--border-subtle)] rounded-xl"
                                    placeholder="Contoh: Foto dokumentasi area belakang belum diunggah..."
                                />
                            </div>
                            <div>
                                <label className="font-bold block mb-1">Instruksi ke Surveyor / Marketing</label>
                                <textarea
                                    rows={2}
                                    value={rejectNotes}
                                    onChange={e => setRejectNotes(e.target.value)}
                                    className="w-full p-2.5 border border-[var(--border-subtle)] rounded-xl"
                                    placeholder="Catatan tambahan..."
                                />
                            </div>
                        </div>
                        <div className="flex gap-2 justify-end">
                            <button onClick={() => setRejectTarget(null)} className="px-4 py-2 rounded-xl bg-[var(--bg-tertiary)] text-xs font-semibold">
                                Batal
                            </button>
                            <button
                                onClick={handleReject}
                                disabled={!rejectReason.trim()}
                                className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold disabled:opacity-40"
                            >
                                Kirim Instruksi Revisi
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}