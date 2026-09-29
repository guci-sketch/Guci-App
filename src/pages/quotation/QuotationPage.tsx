import { useState, useEffect, useRef } from "react";
import { SignatureModal } from "../../components/SignatureModal";
import { useNavigate } from "react-router-dom";
import { useCompanyTemplate } from "../../hooks/useCompanyTemplate";
import {
    FileText, Plus, Search, RefreshCw,
    CheckCircle2, XCircle, Clock, FileX2,
    Eye, Download, Filter, ChevronLeft, ChevronRight,
    PenLine, MessageSquare, AlertCircle, Trash2, Send, MessageCircle, Pencil, Loader2,
} from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { getQuotations, updateQuotationStatus, deleteQuotation, attachPdfToQuotation } from "../../services/quotationService";
import { generateQuotationPDF } from "../../lib/pdfGenerator";
import { blobToBase64 } from "../../services/quotationService";
import { LAYANAN_CONFIG } from "../../lib/quotationConfig";
import { formatDate, formatRupiah } from "../../lib/utils";
import type { Quotation, QuotationStatus, KategoriSurat, TipeKontrak } from "../../types";

// ─── STATUS CONFIG ────────────────────────────────────────────────────────────

const STATUS_CFG: Record<QuotationStatus, { label: string; icon: React.ReactNode; bg: string; text: string; dot: string }> = {
    draft: { label: "Draft", icon: <FileX2 size={12} />, bg: "#f1f5f9", text: "#64748b", dot: "#94a3b8" },
    pending: { label: "Menunggu", icon: <Clock size={12} />, bg: "#fef3c7", text: "#92400e", dot: "#f59e0b" },
    approved: { label: "Disetujui Admin", icon: <CheckCircle2 size={12} />, bg: "#dbeafe", text: "#1e40af", dot: "#3b82f6" },
    rejected: { label: "Ditolak", icon: <XCircle size={12} />, bg: "#fee2e2", text: "#991b1b", dot: "#ef4444" },
    sent_to_client: { label: "Dikirim ke Klien", icon: <Send size={12} />, bg: "#fef9c3", text: "#854d0e", dot: "#eab308" },
    deal: { label: "Deal ✓", icon: <CheckCircle2 size={12} />, bg: "#dcfce7", text: "#14532d", dot: "#16a34a" },
    cancelled: { label: "Batal", icon: <XCircle size={12} />, bg: "#f3f4f6", text: "#6b7280", dot: "#9ca3af" },
};

function StatusBadge({ status }: { status: QuotationStatus }) {
    const c = STATUS_CFG[status];
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
            ${isAR ? "bg-purple-100 text-purple-700" : "bg-cyan-100 text-cyan-700"}`}>
            {isAR ? "🛡 AR" : "🦟 PCO"}
        </span>
    );
}

function TipeBadge({ tipe }: { tipe: TipeKontrak }) {
    return (
        <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold
            ${tipe === "K" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-500"}`}>
            {tipe === "K" ? "KONTRAK" : "UMUM"}
        </span>
    );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
    return (
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold" style={{ color }}>{value}</div>
            <div className="text-xs text-slate-400 mt-1">{label}</div>
        </div>
    );
}

// ─── REJECTION MODAL (dengan notes ke marketing) ──────────────────────────────

function RejectionModal({
    open, onClose, onConfirm, quotation,
}: {
    open: boolean;
    onClose: () => void;
    onConfirm: (reason: string, notes: string) => void;
    quotation: Quotation | null;
}) {
    const [reason, setReason] = useState("");
    const [notes, setNotes] = useState("");

    useEffect(() => {
        if (!open) { setReason(""); setNotes(""); }
    }, [open]);

    if (!open || !quotation) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl w-full max-w-md shadow-2xl p-6">
                <div className="flex items-center gap-2 mb-1">
                    <XCircle size={18} className="text-red-500" />
                    <h3 className="text-base font-bold text-slate-900">Tolak Quotation</h3>
                </div>
                <p className="text-xs text-slate-400 mb-4">
                    Quotation <code className="font-mono bg-slate-100 px-1 rounded">{quotation.noSurat}</code> akan ditolak dan dikembalikan ke marketing.
                </p>

                <div className="space-y-3">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1">
                            Alasan Penolakan <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            className="w-full border border-slate-200 rounded-lg p-3 text-sm text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-red-300"
                            rows={2}
                            placeholder="Alasan singkat penolakan..."
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1">
                            <span className="flex items-center gap-1"><MessageSquare size={11} /> Catatan / Instruksi ke Marketing</span>
                        </label>
                        <textarea
                            className="w-full border border-slate-200 rounded-lg p-3 text-sm text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-amber-300"
                            rows={3}
                            placeholder="Tulis instruksi atau catatan untuk marketing... (opsional)"
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                        />
                        <p className="text-xs text-slate-400 mt-1">
                            Catatan ini akan terlihat oleh marketing untuk perbaikan quotation.
                        </p>
                    </div>
                </div>

                <div className="flex justify-end gap-2 mt-5">
                    <button onClick={onClose}
                        className="px-4 py-2 text-sm rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 font-medium">
                        Batal
                    </button>
                    <button
                        onClick={() => { if (reason.trim()) { onConfirm(reason, notes); } }}
                        disabled={!reason.trim()}
                        className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-40">
                        Tolak & Kirim Catatan
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── APPROVE MODAL ────────────────────────────────────────────────────────────

function ApproveModal({
    open, onClose, onConfirm, quotation,
}: {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    quotation: Quotation | null;
}) {
    if (!open || !quotation) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 text-center">
                <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 size={28} className="text-green-600" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-1">Setujui Quotation?</h3>
                <p className="text-sm text-slate-500 mb-1">
                    <code className="font-mono bg-slate-100 px-1 rounded text-xs">{quotation.noSurat}</code>
                </p>
                <p className="text-sm text-slate-500 mb-5">
                    Kepada <strong>{quotation.kepadaNama}</strong> — {formatRupiah(quotation.total)}
                </p>
                <p className="text-xs text-green-700 bg-green-50 rounded-lg px-3 py-2 mb-4">
                    Setelah disetujui, marketing bisa men-download PDF quotation ini.
                </p>
                <div className="flex gap-2">
                    <button onClick={onClose}
                        className="flex-1 px-4 py-2 text-sm rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 font-medium">
                        Batal
                    </button>
                    <button onClick={onConfirm}
                        className="flex-1 px-4 py-2 text-sm rounded-lg bg-green-600 text-white font-medium hover:bg-green-700">
                        Ya, Setujui
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── DETAIL MODAL (lihat notes dari admin) ───────────────────────────────────

function NotesModal({
    open, onClose, quotation,
}: {
    open: boolean;
    onClose: () => void;
    quotation: Quotation | null;
}) {
    if (!open || !quotation) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6">
                <div className="flex items-center gap-2 mb-3">
                    <MessageSquare size={16} className="text-amber-500" />
                    <h3 className="text-sm font-bold text-slate-900">Catatan dari Admin</h3>
                </div>
                <code className="text-xs font-mono text-slate-400 block mb-3">{quotation.noSurat}</code>

                {quotation.rejectionReason && (
                    <div className="bg-red-50 border border-red-100 rounded-lg p-3 mb-3">
                        <p className="text-xs font-bold text-red-600 mb-1">Alasan Penolakan</p>
                        <p className="text-sm text-red-700">{quotation.rejectionReason}</p>
                    </div>
                )}
                {quotation.notesMarketing && (
                    <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
                        <p className="text-xs font-bold text-amber-600 mb-1">Instruksi / Catatan</p>
                        <p className="text-sm text-amber-700">{quotation.notesMarketing}</p>
                    </div>
                )}
                {!quotation.rejectionReason && !quotation.notesMarketing && (
                    <p className="text-sm text-slate-400 text-center py-2">Tidak ada catatan.</p>
                )}

                <button onClick={onClose}
                    className="w-full mt-4 px-4 py-2 text-sm rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 font-medium">
                    Tutup
                </button>
            </div>
        </div>
    );
}

// ─── DELETE MODAL ─────────────────────────────────────────────────────────────

function DeleteModal({
    open, onClose, onConfirm, quotation, loading,
}: {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    quotation: Quotation | null;
    loading: boolean;
}) {
    if (!open || !quotation) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6">
                <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Trash2 size={22} className="text-red-600" />
                </div>
                <h3 className="text-base font-bold text-slate-900 text-center mb-1">Hapus Quotation?</h3>
                <p className="text-sm text-slate-500 text-center mb-1">
                    <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-xs">{quotation.noSurat}</code>
                </p>
                <p className="text-sm text-slate-500 text-center mb-4">
                    Kepada <strong>{quotation.kepadaNama}</strong>
                </p>
                <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-5 text-xs text-red-600 text-center">
                    ⚠ Tindakan ini permanen dan tidak dapat dibatalkan.
                </div>
                <div className="flex gap-2">
                    <button onClick={onClose} disabled={loading}
                        className="flex-1 px-4 py-2 text-sm rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 font-medium">
                        Batal
                    </button>
                    <button onClick={onConfirm} disabled={loading}
                        className="flex-1 px-4 py-2 text-sm rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2">
                        {loading ? <RefreshCw size={13} className="animate-spin" /> : <Trash2 size={13} />}
                        Hapus
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

const PER_PAGE = 10;

// ─── ACTION BUTTONS (shared between table row & mobile card) ─────────────────

interface ActionButtonsProps {
    q: Quotation;
    isApproved: boolean;
    isPending: boolean;
    hasNotes: boolean;
    isActing: boolean;
    canApprove: boolean;
    canDelete: boolean;
    onEdit?: () => void;
    onSign: () => void;
    onNotes: () => void;
    onApprove: () => void;
    onReject: () => void;
    onDelete: () => void;
}

function ActionButtons({ q, isApproved, isPending, hasNotes, isActing, canApprove, canDelete, onEdit, onSign, onNotes, onApprove, onReject, onDelete }: ActionButtonsProps) {
    const openPdf = (base64: string) => {
        const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
        const blob = new Blob([bytes], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank");
        setTimeout(() => URL.revokeObjectURL(url), 5000);
    };

    const downloadPdf = (base64: string, filename: string) => {
        const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
        const blob = new Blob([bytes], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = filename;
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 3000);
    };

    const safeName = q.noSurat.replace(/\//g, "-");

    return (
        <div className="flex items-center gap-1 flex-wrap">
            {/* View PDF */}
            {(q.pdfBase64 || q.pdfUrl) && (
                <button onClick={() => q.pdfBase64 ? openPdf(q.pdfBase64) : window.open(q.pdfUrl, "_blank")}
                    className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-blue-600 transition-colors" title="Lihat PDF">
                    <Eye size={14} />
                </button>
            )}

            {/* WA Button — kirim penawaran via WhatsApp */}
            {q.kepadaWa && (
                <a
                    href={`https://wa.me/${q.kepadaWa.replace(/^0/, "62").replace(/\D/g, "")}?text=${encodeURIComponent(`Halo, berikut penawaran kami untuk ${q.kepadaNama}:\nNo. Surat: ${q.noSurat}\nTotal: Rp ${q.total.toLocaleString("id-ID")}\n\nSilakan konfirmasi ketersediaan Anda.`)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="p-1.5 rounded-lg text-slate-400 hover:bg-green-50 hover:text-green-600 transition-colors inline-flex items-center"
                    title={`Kirim WA ke ${q.kepadaWa}`}>
                    <MessageCircle size={14} />
                </a>
            )}

            {/* Download PDF (approved only) */}
            {(q.pdfBase64 || q.pdfUrl) && isApproved && (
                <button onClick={() => q.pdfBase64
                    ? downloadPdf(q.pdfBase64, `${safeName}.pdf`)
                    : (() => { const a = document.createElement("a"); a.href = q.pdfUrl!; a.download = `${safeName}.pdf`; a.click(); })()
                }
                    className="p-1.5 rounded-lg text-slate-400 hover:bg-green-50 hover:text-green-600 transition-colors" title="Download PDF">
                    <Download size={14} />
                </button>
            )}

            {/* Tanda tangan (approved, belum ditandatangani) */}
            {isApproved && !q.signedPdfBase64 && (
                <button onClick={onSign}
                    className="p-1.5 rounded-lg text-slate-400 hover:bg-purple-50 hover:text-purple-600 transition-colors" title="Tanda Tangan Digital">
                    <PenLine size={14} />
                </button>
            )}

            {/* Download signed PDF */}
            {isApproved && q.signedPdfBase64 && (
                <button onClick={() => downloadPdf(q.signedPdfBase64!, `${safeName}-SIGNED.pdf`)}
                    className="p-1.5 rounded-lg text-green-500 hover:bg-green-50 transition-colors relative"
                    title={`Sudah ditandatangani${q.signedBy ? " oleh " + q.signedBy : ""} — klik untuk download`}>
                    <PenLine size={14} />
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full" />
                </button>
            )}

            {/* Notes admin */}
            {hasNotes && (
                <button onClick={onNotes}
                    className="p-1.5 rounded-lg text-amber-400 hover:bg-amber-50 hover:text-amber-600 transition-colors relative" title="Lihat Catatan Admin">
                    <MessageSquare size={14} />
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full" />
                </button>
            )}

            {/* Approve / Reject */}
            {canApprove && isPending && (
                <>
                    <button onClick={onApprove} disabled={isActing}
                        className="p-1.5 rounded-lg text-slate-400 hover:bg-green-50 hover:text-green-600 transition-colors disabled:opacity-50" title="Setujui">
                        {isActing ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                    </button>
                    <button onClick={onReject} disabled={isActing}
                        className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50" title="Tolak">
                        <XCircle size={14} />
                    </button>
                </>
            )}

            {!canApprove && isPending && (
                <span className="text-xs text-slate-400 italic px-1">Menunggu...</span>
            )}

            {/* Edit (pending/draft only) */}
            {(q.status === "pending" || q.status === "draft") && onEdit && (
                <button onClick={onEdit}
                    className="p-1.5 rounded-lg text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors" title="Edit Quotation">
                    <Pencil size={14} />
                </button>
            )}

            {/* Delete — hanya administrator */}
            {canDelete && (
                <button onClick={onDelete}
                    className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors" title="Hapus Quotation">
                    <Trash2 size={14} />
                </button>
            )}
        </div>
    );
}


export function QuotationPage() {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const templateConfig = useCompanyTemplate();

    const [quotations, setQuotations] = useState<Quotation[]>([]);
    const [signatureTarget, setSignatureTarget] = useState<Quotation | null>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filterKat, setFilterKat] = useState<"all" | KategoriSurat>("all");
    const [filterTipe, setFilterTipe] = useState<"all" | TipeKontrak>("all");
    const [filterStatus, setFilterStatus] = useState<"all" | QuotationStatus>("all");
    const [page, setPage] = useState(1);

    const [rejectTarget, setRejectTarget] = useState<Quotation | null>(null);
    const [approveTarget, setApproveTarget] = useState<Quotation | null>(null);
    const [notesTarget, setNotesTarget] = useState<Quotation | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Quotation | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const canSeeAll = user?.role !== "marketing";
    const canApprove = user?.role === "super_admin" || user?.role === "administrator";
    const canCreate = user?.role === "super_admin" || user?.role === "administrator" || user?.role === "marketing";
    const canDelete = user?.role === "administrator";

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

    // Filters
    let displayed = [...quotations];
    if (search) {
        const s = search.toLowerCase();
        displayed = displayed.filter(q =>
            q.noSurat.toLowerCase().includes(s) ||
            q.kepadaNama.toLowerCase().includes(s) ||
            q.marketingNama.toLowerCase().includes(s)
        );
    }
    if (filterKat !== "all") displayed = displayed.filter(q => q.kategori === filterKat);
    if (filterTipe !== "all") displayed = displayed.filter(q => q.tipeKontrak === filterTipe);
    if (filterStatus !== "all") displayed = displayed.filter(q => q.status === filterStatus);

    const totalPages = Math.ceil(displayed.length / PER_PAGE);
    const paged = displayed.slice((page - 1) * PER_PAGE, page * PER_PAGE);

    const statsTotal = quotations.length;
    const statsPending = quotations.filter(q => q.status === "pending").length;
    const statsApproved = quotations.filter(q => q.status === "approved").length;
    const statsRejected = quotations.filter(q => q.status === "rejected").length;

    const handleApprove = async () => {
        if (!approveTarget) return;
        setActionLoading(approveTarget.id);
        try {
            const q = approveTarget;

            // Step 1: Update status to approved
            await updateQuotationStatus(q.id, "approved", user?.name);

            // Step 2: Generate PDF now that it's approved
            try {
                const pdfBlob = generateQuotationPDF({
                    noSurat:           q.noSurat,
                    tanggal:           q.tanggal,
                    kepadaNama:        q.kepadaNama,
                    kepadaAlamatLines: q.kepadaAlamatLines,
                    kepadaUp:          q.kepadaUp,
                    kepadaWa:          q.kepadaWa,
                    jenisLayanan:      q.jenisLayanan,
                    perihal:           q.perihal,
                    items:             q.items,
                    biayaTambahan:     q.biayaTambahan,
                    diskonPct:         q.diskonPct,
                    ppn:               q.ppn,
                    ppnDppFaktor:      q.ppnDppFaktor,
                    garansiTahun:      q.garansiTahun,
                    jenisGaransi:      q.jenisGaransi,
                    marketingNama:     q.marketingNama,
                    marketingWa:       q.marketingWa,
                    surveyPhotos:      q.surveyPhotos,
                    chemicals:         q.chemicals,
                    metode:            q.metode,
                    hamaDikendalikan:  q.hamaDikendalikan,
                    teknikPelaksanaan: q.teknikPelaksanaan,
                    templateConfig,
                });
                const pdfBase64 = await blobToBase64(pdfBlob);
                await attachPdfToQuotation(q.id, pdfBase64);
            } catch (pdfErr) {
                console.error("[handleApprove] PDF generation failed:", pdfErr);
                // Approval already done — PDF can be regenerated later
            }

            setApproveTarget(null);
            await load();
        } finally {
            setActionLoading(null);
        }
    };

    const handleReject = async (reason: string, notes: string) => {
        if (!rejectTarget) return;
        setActionLoading(rejectTarget.id);
        try {
            // Pass notes as 5th argument via extended function call
            await updateQuotationStatus(rejectTarget.id, "rejected", user?.name, reason, notes);
            setRejectTarget(null);
            await load();
        } finally {
            setActionLoading(null);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setDeleteLoading(true);
        try {
            await deleteQuotation(deleteTarget.id);
            setQuotations(prev => prev.filter(q => q.id !== deleteTarget.id));
            setDeleteTarget(null);
        } catch {
            alert("Gagal menghapus quotation. Coba lagi.");
        } finally {
            setDeleteLoading(false);
        }
    };

    return (
        <div className="p-4 md:p-6 max-w-screen-xl mx-auto space-y-5">
            {/* Signature Modal */}
            {signatureTarget && (
                <SignatureModal
                    quotation={signatureTarget}
                    signerName={user?.name ?? "Marketing"}
                    templateConfig={templateConfig}
                    onClose={() => setSignatureTarget(null)}
                    onSigned={(signedPdfBase64) => {
                        // Update local state so button reflects signed status immediately
                        setQuotations(prev => prev.map(q =>
                            q.id === signatureTarget.id
                                ? { ...q, signedPdfBase64, signedAt: new Date(), signedBy: user?.name }
                                : q
                        ));
                        setSignatureTarget(null);
                    }}
                />
            )}

            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <FileText size={20} className="text-blue-600" />
                        Quotation
                    </h1>
                    <p className="text-sm text-slate-400 mt-0.5">
                        {canSeeAll ? "Semua surat penawaran" : "Surat penawaran yang kamu buat"}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={load}
                        className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors">
                        <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                    </button>
                    {canCreate && (
                        <button onClick={() => navigate("/quotations/new")}
                            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors active:scale-[0.97] shadow-sm shadow-blue-200">
                            <Plus size={16} />
                            <span className="hidden xs:inline sm:inline">Buat Quotation</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard label="Total Surat" value={statsTotal} color="#1d4ed8" />
                <StatCard label="Menunggu" value={statsPending} color="#d97706" />
                <StatCard label="Disetujui" value={statsApproved} color="#15803d" />
                <StatCard label="Ditolak" value={statsRejected} color="#dc2626" />
            </div>

            {/* Banner pending untuk admin */}
            {canApprove && statsPending > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3">
                    <AlertCircle size={16} className="text-amber-600 shrink-0" />
                    <p className="text-sm text-amber-800">
                        Ada <strong>{statsPending} quotation</strong> yang menunggu persetujuan kamu.
                        Klik tombol ✓ untuk menyetujui atau ✗ untuk menolak.
                    </p>
                    <button
                        onClick={() => { setFilterStatus("pending"); setPage(1); }}
                        className="ml-auto text-xs font-bold text-amber-700 bg-amber-100 px-3 py-1 rounded-lg hover:bg-amber-200 shrink-0">
                        Lihat semua
                    </button>
                </div>
            )}

            {/* Banner ditolak untuk marketing */}
            {!canApprove && quotations.filter(q => q.status === "rejected").length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-3">
                    <XCircle size={16} className="text-red-500 shrink-0" />
                    <p className="text-sm text-red-800">
                        Ada <strong>{quotations.filter(q => q.status === "rejected").length} quotation</strong> yang ditolak.
                        Klik ikon 💬 untuk melihat catatan dari admin.
                    </p>
                </div>
            )}

            {/* Filters */}
            <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4">
                <div className="flex flex-col gap-2">
                    {/* Row 1: search */}
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            value={search}
                            onChange={e => { setSearch(e.target.value); setPage(1); }}
                            placeholder="Cari nomor, klien, marketing..."
                            className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                        />
                    </div>
                    {/* Row 2: filter chips */}
                    <div className="flex flex-wrap gap-2 items-center">
                        <Filter size={13} className="text-slate-400 shrink-0" />
                        {(["all", "AR", "PCO"] as const).map(v => (
                            <button key={v} onClick={() => { setFilterKat(v); setPage(1); }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors active:scale-[0.97]
                                    ${filterKat === v ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
                                {v === "all" ? "Semua" : v === "AR" ? "Anti Rayap" : "Pest Control"}
                            </button>
                        ))}
                        {(["all", "U", "K", "PH"] as const).map(v => (
                            <button key={v} onClick={() => { setFilterTipe(v); setPage(1); }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors active:scale-[0.97]
                                    ${filterTipe === v ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
                                {v === "all" ? "Semua Tipe" : v === "U" ? "Umum" : v === "K" ? "Kontrak" : "PH"}
                            </button>
                        ))}
                        <select
                            value={filterStatus}
                            onChange={e => { setFilterStatus(e.target.value as typeof filterStatus); setPage(1); }}
                            className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-600 focus:outline-none">
                            <option value="all">Semua Status</option>
                            <option value="draft">Draft</option>
                            <option value="pending">Menunggu</option>
                            <option value="approved">Disetujui</option>
                            <option value="rejected">Ditolak</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-16 text-slate-400">
                        <RefreshCw size={20} className="animate-spin mr-2" /> Memuat data...
                    </div>
                ) : paged.length === 0 ? (
                    <div className="text-center py-16 text-slate-400">
                        <FileText size={36} className="mx-auto mb-3 opacity-30" />
                        <p className="font-medium text-slate-500">Tidak ada data</p>
                        <p className="text-sm mt-1">
                            {canCreate ? "Klik \"Buat Quotation\" untuk membuat surat penawaran baru." : "Belum ada quotation yang tercatat."}
                        </p>
                    </div>
                ) : (
                    <>
                        {/* ── DESKTOP TABLE (hidden on mobile) ────────────────── */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr>
                                        {["Nomor Surat", "Layanan", "Kepada / Klien",
                                            ...(canSeeAll ? ["Marketing"] : []),
                                            "Total", "Status", "Tgl", "Aksi"]
                                            .map(h => (
                                                <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-400 border-b border-slate-100 bg-slate-50 whitespace-nowrap">
                                                    {h}
                                                </th>
                                            ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {paged.map(q => {
                                        const isAR = q.kategori === "AR";
                                        const isApproved = q.status === "approved";
                                        const isPending = q.status === "pending";
                                        const isRejected = q.status === "rejected";
                                        const hasNotes = isRejected && (q.rejectionReason || q.notesMarketing);
                                        const isActing = actionLoading === q.id;

                                        return (
                                            <tr key={q.id} className={`hover:bg-slate-50 transition-colors ${isPending ? "bg-amber-50/30" : ""}`}>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <code className={`text-xs font-bold px-2 py-1 rounded font-mono ${isAR ? "bg-purple-50 text-purple-700" : "bg-cyan-50 text-cyan-700"}`}>
                                                        {q.noSurat}
                                                    </code>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-1.5">
                                                        <KategoriBadge kategori={q.kategori} />
                                                        <TipeBadge tipe={q.tipeKontrak} />
                                                    </div>
                                                    <span className="text-xs text-slate-400 mt-0.5 block">
                                                        {LAYANAN_CONFIG[q.jenisLayanan]?.label.split("—")[1]?.trim() ?? q.jenisLayanan}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 max-w-[160px]">
                                                    <div className="text-sm font-semibold text-slate-900 truncate">{q.kepadaNama}</div>
                                                    {q.kepadaAlamatLines[0] && (
                                                        <div className="text-xs text-slate-400 truncate">{q.kepadaAlamatLines[0]}</div>
                                                    )}
                                                    {q.kepadaWa && (
                                                        <div className="flex items-center gap-1 mt-0.5">
                                                            <MessageCircle size={10} className="text-green-500 shrink-0" />
                                                            <span className="text-[10px] text-green-600 font-mono">{q.kepadaWa}</span>
                                                        </div>
                                                    )}
                                                </td>
                                                {canSeeAll && (
                                                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{q.marketingNama}</td>
                                                )}
                                                <td className="px-4 py-3 text-sm font-mono text-slate-700 whitespace-nowrap">
                                                    {formatRupiah(q.total)}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <StatusBadge status={q.status} />
                                                </td>
                                                <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                                                    {formatDate(q.tanggal)}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <ActionButtons q={q} isApproved={isApproved} isPending={isPending}
                                                        hasNotes={!!hasNotes} isActing={isActing} canApprove={canApprove}
                                                        canDelete={canDelete}
                                                        onEdit={() => navigate(`/quotations/${q.id}/edit`)}
                                                        onSign={() => setSignatureTarget(q)}
                                                        onNotes={() => setNotesTarget(q)}
                                                        onApprove={() => setApproveTarget(q)}
                                                        onReject={() => setRejectTarget(q)}
                                                        onDelete={() => setDeleteTarget(q)} />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* ── MOBILE CARDS (shown only on mobile) ──────────────── */}
                        <div className="md:hidden divide-y divide-slate-100">
                            {paged.map(q => {
                                const isAR = q.kategori === "AR";
                                const isApproved = q.status === "approved";
                                const isPending = q.status === "pending";
                                const isRejected = q.status === "rejected";
                                const hasNotes = isRejected && (q.rejectionReason || q.notesMarketing);
                                const isActing = actionLoading === q.id;

                                return (
                                    <div key={q.id} className={`p-4 ${isPending ? "bg-amber-50/40" : "bg-white"}`}>
                                        {/* Top row: nomor + status */}
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                            <code className={`text-xs font-bold px-2 py-1 rounded font-mono leading-tight ${isAR ? "bg-purple-50 text-purple-700" : "bg-cyan-50 text-cyan-700"}`}>
                                                {q.noSurat}
                                            </code>
                                            <StatusBadge status={q.status} />
                                        </div>

                                        {/* Client name */}
                                        <p className="text-sm font-semibold text-slate-900 mb-0.5">{q.kepadaNama}</p>
                                        {q.kepadaAlamatLines[0] && (
                                            <p className="text-xs text-slate-400 truncate">{q.kepadaAlamatLines[0]}</p>
                                        )}
                                        {q.kepadaWa && (
                                            <div className="flex items-center gap-1 mb-2 mt-0.5">
                                                <MessageCircle size={10} className="text-green-500 shrink-0" />
                                                <span className="text-[10px] text-green-600 font-mono">{q.kepadaWa}</span>
                                            </div>
                                        )}

                                        {/* Meta row */}
                                        <div className="flex flex-wrap items-center gap-1.5 mb-3">
                                            <KategoriBadge kategori={q.kategori} />
                                            <TipeBadge tipe={q.tipeKontrak} />
                                            <span className="text-xs text-slate-400">
                                                {LAYANAN_CONFIG[q.jenisLayanan]?.label.split("—")[1]?.trim() ?? q.jenisLayanan}
                                            </span>
                                        </div>

                                        {/* Bottom row: total + date + actions */}
                                        <div className="flex items-center justify-between gap-2">
                                            <div>
                                                <p className="text-sm font-bold text-slate-800 font-mono">{formatRupiah(q.total)}</p>
                                                <p className="text-xs text-slate-400">{formatDate(q.tanggal)}{canSeeAll ? ` · ${q.marketingNama}` : ""}</p>
                                            </div>
                                            <ActionButtons q={q} isApproved={isApproved} isPending={isPending}
                                                hasNotes={!!hasNotes} isActing={isActing} canApprove={canApprove}
                                                canDelete={canDelete}
                                                onEdit={() => navigate(`/quotations/${q.id}/edit`)}
                                                onSign={() => setSignatureTarget(q)}
                                                onNotes={() => setNotesTarget(q)}
                                                onApprove={() => setApproveTarget(q)}
                                                onReject={() => setRejectTarget(q)}
                                                onDelete={() => setDeleteTarget(q)} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}

                {/* Pagination */}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
                        <span className="text-xs text-slate-400">
                            {displayed.length} surat · hal {page} dari {totalPages}
                        </span>
                        <div className="flex gap-1">
                            <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 disabled:opacity-30 hover:bg-slate-50">
                                <ChevronLeft size={14} />
                            </button>
                            <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
                                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 disabled:opacity-30 hover:bg-slate-50">
                                <ChevronRight size={14} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modals */}
            <ApproveModal
                open={!!approveTarget}
                onClose={() => setApproveTarget(null)}
                onConfirm={handleApprove}
                quotation={approveTarget}
            />
            <RejectionModal
                open={!!rejectTarget}
                onClose={() => setRejectTarget(null)}
                onConfirm={handleReject}
                quotation={rejectTarget}
            />
            <NotesModal
                open={!!notesTarget}
                onClose={() => setNotesTarget(null)}
                quotation={notesTarget}
            />
            <DeleteModal
                open={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleDelete}
                quotation={deleteTarget}
                loading={deleteLoading}
            />

                </div>
    );
}