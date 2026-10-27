import { useState } from "react";
import { useAuth } from '@/app/providers/AuthContext';
import { MapPin, Ruler, CheckCircle2, AlertTriangle, ShieldCheck, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export function FieldDashboardPage() {
    const { user } = useAuth();
    const [status, setStatus] = useState<"idle" | "working">("idle");

    const checkIn = () => {
        setStatus("working");
    };

    const checkOut = () => {
        setStatus("idle");
    };

    return (
        <div className="max-w-2xl mx-auto space-y-5">
            {/* Greeting Card */}
            <div className="clean-card p-5 sm:p-6 flex items-start justify-between gap-3">
                <div className="space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--accent)] flex items-center gap-1.5">
                        <ShieldCheck size={14} /> Teknisi Lapangan Terverifikasi
                    </span>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">
                        Halo, {user?.name || "Rekan Teknisi"}
                    </h2>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                        Pastikan presensi GPS dilakukan di dalam radius proyek (&le; 300m) dan utamakan keselamatan kerja (K3).
                    </p>
                </div>
            </div>

            {/* Status & Work Order Card */}
            <div className="clean-card p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
                    <h3 className="font-extrabold text-sm sm:text-base text-[var(--text-primary)] flex items-center gap-2">
                        <MapPin size={16} className="text-[var(--accent)]" />
                        Status Pekerjaan Lapangan
                    </h3>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        status === "working"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-slate-100 text-slate-700"
                    }`}>
                        {status === "working" ? "Sedang Bertugas" : "Siap Bertugas"}
                    </span>
                </div>

                {status === "idle" ? (
                    <div className="space-y-3 pt-1">
                        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                            Jika Anda sudah tiba di lokasi klien proyek, tekan tombol di bawah untuk mencatat koordinat satelit kehadiran.
                        </p>
                        <button
                            type="button"
                            onClick={checkIn}
                            className="w-full min-h-[48px] bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-5 py-3.5 rounded-xl font-bold text-sm shadow-2xs flex items-center justify-center gap-2 transition-transform active:scale-[0.98] cursor-pointer"
                        >
                            <MapPin size={16} /> Saya Sudah Sampai di Lokasi (Check-In GPS)
                        </button>
                        <Link
                            to="/field/jobs"
                            className="w-full min-h-[44px] bg-[#faf9f7] hover:bg-[#f5f3ef] border border-[#e8e5e0] text-[var(--text-secondary)] px-4 py-2.5 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                        >
                            Lihat Rincian Tugas Hari Ini <ArrowRight size={14} />
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-3.5 pt-1">
                        <div className="p-3.5 bg-amber-50/80 border border-amber-200/90 rounded-xl text-amber-900 text-xs flex items-start gap-2.5">
                            <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                            <div>
                                <span className="font-bold block">Pekerjaan Sedang Berlangsung</span>
                                <span className="text-[11px] text-amber-800">
                                    Pastikan mengambil minimal 3 foto dokumentasi (Sebelum, Progres, Sesudah) sebelum check-out.
                                </span>
                            </div>
                        </div>

                        <Link
                            to="/field/ar-measure"
                            className="w-full min-h-[44px] flex items-center justify-center gap-2 bg-[#f5f3ef] hover:bg-emerald-50/70 border border-[var(--border)] text-[var(--text-primary)] hover:text-[var(--accent)] p-3 rounded-xl font-bold text-xs transition-colors"
                        >
                            <Ruler size={16} className="text-[var(--accent)]" />
                            Ukur Panjang Kerja (Meteran Kamera SNI 2404)
                        </Link>

                        <button
                            type="button"
                            onClick={checkOut}
                            className="w-full min-h-[48px] bg-rose-600 hover:bg-rose-700 text-white p-3.5 rounded-xl font-bold text-xs shadow-2xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                        >
                            <CheckCircle2 size={16} /> Pekerjaan Selesai &amp; Check-Out GPS
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
