import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from '@/shared/lib/supabase';
import { useAuthStore } from '@/app/store/authStore';
import { AlertCircle, Loader2, Lock, Mail, Eye, EyeOff, ShieldCheck, Sparkles, ArrowRight, UserCheck, KeyRound } from "lucide-react";
import type { AppUser } from '@/entities/types';
import { fetchAppUser } from '@/shared/api/authProfile';
import { readPendingInvite, repairPendingInviteUser } from '@/shared/api/inviteService';

const QUICK_DEMO_ACCOUNTS = [
    {
        label: "Direktur (Superadmin)",
        roleBadge: "DIREKTUR",
        email: "direktur@gucimaspratama.co.id",
        pw: "GuciEmas123!",
    },
    {
        label: "Admin Operasional",
        roleBadge: "ADMIN",
        email: "admin@gucimaspratama.co.id",
        pw: "GuciEmas123!",
    },
    {
        label: "Marketing / Surveyor",
        roleBadge: "MARKETING",
        email: "surveyor@gucimaspratama.co.id",
        pw: "GuciEmas123!",
    },
    {
        label: "Teknisi Lapangan",
        roleBadge: "TEKNISI",
        email: "teknisi@gucimaspratama.co.id",
        pw: "GuciEmas123!",
    },
    {
        label: "Gudang & Estimasi",
        roleBadge: "GUDANG",
        email: "gudang@gucimaspratama.co.id",
        pw: "GuciEmas123!",
    },
];

export function LoginPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { setUser } = useAuthStore();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    // Deteksi dan bersihkan parameter hash atau query error Supabase (contoh: #error=access_denied&error_code=otp_expired)
    useEffect(() => {
        if (typeof window === "undefined") return;
        const hashStr = window.location.hash.startsWith("#") ? window.location.hash.substring(1) : "";
        const hashParams = new URLSearchParams(hashStr);
        const errCode = hashParams.get("error_code") || searchParams.get("error_code");
        const errDesc = hashParams.get("error_description") || searchParams.get("error_description") || searchParams.get("error");
        if (errCode || errDesc) {
            window.history.replaceState(null, "", window.location.pathname);
            if (errCode === "otp_expired" || (errDesc && errDesc.toLowerCase().includes("expired"))) {
                setError("Tautan email telah kedaluwarsa atau sudah pernah diklik. Silakan langsung login dengan email dan password akun Anda di bawah ini.");
            } else {
                setError(decodeURIComponent(errDesc?.replace(/\+/g, " ") || "Terjadi kendala pada tautan verifikasi email."));
            }
        }
    }, [searchParams]);

    // Jika URL memiliki ?invite=..., arahkan otomatis ke halaman aktivasi token /signup
    useEffect(() => {
        const inv = searchParams.get("invite") || searchParams.get("token");
        if (inv) {
            navigate(`/signup?invite=${encodeURIComponent(inv)}`, { replace: true });
        }
    }, [searchParams, navigate]);

    const performSignIn = async (loginEmail: string, loginPassword: string) => {
        setError("");
        setLoading(true);
        const cleanEmail = loginEmail.trim().toLowerCase();

        try {
            let { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
                email: cleanEmail,
                password: loginPassword,
            });

            // Jika login ditolak (HTTP 400: Email not confirmed / akun undangan sempat tertahan),
            // jalankan auto-repair via RPC Supabase terlebih dahulu lalu coba login kembali
            if (authErr) {
                const pending = readPendingInvite();
                const repairedViaRpc = await repairPendingInviteUser(
                    cleanEmail,
                    pending?.token,
                    pending?.name
                );

                let repairedViaApi = false;
                if (!repairedViaRpc) {
                    try {
                        const confirmRes = await fetch("/api/auth/auto-confirm-email", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                email: cleanEmail,
                                token: pending?.token,
                                name: pending?.name,
                            }),
                        });
                        const rawText = await confirmRes.text();
                        const confirmData = rawText ? JSON.parse(rawText) : null;
                        repairedViaApi = Boolean(confirmData?.success);
                    } catch {
                        /* abaikan jika API backend tidak aktif */
                    }
                }

                if (repairedViaRpc || repairedViaApi) {
                    const retry = await supabase.auth.signInWithPassword({
                        email: cleanEmail,
                        password: loginPassword,
                    });
                    authData = retry.data;
                    authErr = retry.error;
                }
            }

            if (authErr) {
                const errLower = authErr.message.toLowerCase();
                if (errLower.includes("not confirmed") || errLower.includes("unconfirmed")) {
                    throw new Error(
                        "Email akun Anda belum terkonfirmasi di Supabase. Jalankan file SQL `06_fix_invite_auth_and_autoconfirm.sql` di Supabase SQL Editor untuk mengaktifkan seluruh akun undangan secara otomatis."
                    );
                }
                if (errLower.includes("invalid login credentials")) {
                    throw new Error(
                        "Email atau password salah (atau akun undangan Anda belum diaktifkan di Supabase). Jika baru mendaftar via link undangan, pastikan password sesuai atau jalankan SQL patch `06_fix_invite_auth_and_autoconfirm.sql` di Supabase SQL Editor."
                    );
                }
                throw authErr;
            }
            if (!authData.user) throw new Error("Login gagal. Silakan coba lagi.");

            const res = await fetchAppUser(authData.user.id);
            if (!res.user) {
                await supabase.auth.signOut();
                setError(res.message ?? "Akun tidak dapat digunakan.");
                return;
            }
            const appUser: AppUser = res.user;
            setUser(appUser);
            navigate("/");
        } catch (err: any) {
            setError(err.message || "Email atau password salah. Silakan periksa kembali.");
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        await performSignIn(email, password);
    };

    const handleQuickLogin = async (accEmail: string, accPw: string) => {
        setEmail(accEmail);
        setPassword(accPw);
        await performSignIn(accEmail, accPw);
    };

    return (
        <div className="min-h-[100dvh] grid grid-cols-1 lg:grid-cols-[0.95fr_1.05fr] bg-[#fbfcfb] selection:bg-[var(--accent-glow)]">
            {/* Left Column: Editorial Brand Hero (Desktop) */}
            <aside className="hidden lg:flex flex-col justify-between p-10 xl:p-14 bg-[#245c45] text-white relative overflow-hidden select-none">
                {/* Subtle Geometric Background Rings */}
                <div className="absolute -right-36 -bottom-36 w-[440px] h-[440px] rounded-full border border-white/10 pointer-events-none" />
                <div className="absolute -right-20 -bottom-20 w-[300px] h-[300px] rounded-full border border-white/10 pointer-events-none" />
                <div className="absolute right-0 bottom-0 w-[180px] h-[180px] rounded-full border border-white/10 pointer-events-none" />

                {/* Brand Lockup */}
                <div className="flex items-center gap-3 relative z-10">
                    <div className="w-9 h-9 rounded-xl bg-white flex items-end justify-center gap-0.5 p-2 shadow-xs shrink-0">
                        <span className="w-1 h-2.5 bg-[#245c45] rounded-t-xs" />
                        <span className="w-1 h-4 bg-[#245c45] rounded-t-xs" />
                        <span className="w-1 h-3 bg-[#245c45] rounded-t-xs" />
                    </div>
                    <div>
                        <strong className="block text-base font-bold leading-tight">Fieldwork</strong>
                        <small className="block text-[11px] text-[#cfe0d5] font-medium">PT Guci Emas Pratama</small>
                    </div>
                </div>

                {/* Hero Editorial Copy */}
                <div className="max-w-md relative z-10 space-y-4 my-auto py-12">
                    <span className="text-xs font-bold tracking-[0.14em] uppercase text-[#cfe0d5] block">
                        OPERASIONAL LAPANGAN &amp; PENAWARAN
                    </span>
                    <h1 className="text-3xl xl:text-4xl font-extrabold leading-[1.2] tracking-[-0.03em] text-white">
                        Pekerjaan lapangan yang lebih jelas, dari penugasan hingga laporan.
                    </h1>
                    <p className="text-sm xl:text-base leading-relaxed text-[#dbe8df]">
                        Satu ruang kerja terpadu yang menghubungkan pembuatan penawaran harga, validasi kehadiran GPS Haversine, hingga rekapitulasi standar Permenkes No. 2 Tahun 2023.
                    </p>
                </div>

                {/* Trust Note */}
                <div className="flex items-center gap-3 text-xs text-[#dbe8df] relative z-10 pt-6 border-t border-white/15">
                    <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                        <ShieldCheck size={20} className="text-[#a9c9b4]" />
                    </div>
                    <div>
                        <strong className="block text-white font-bold">Integritas Terverifikasi</strong>
                        <span>Geofencing satelit, watermark foto otomatis, dan audit trail operasional.</span>
                    </div>
                </div>
            </aside>

            {/* Right Column: Clean Login Form & 1-Click Demo Accounts */}
            <main className="flex items-center justify-center p-5 sm:p-10 overflow-y-auto">
                <div className="w-full max-w-[420px] mx-auto space-y-4 content-in">
                    {/* Mobile Brand Lockup (Hidden on Desktop) */}
                    <div className="lg:hidden text-center space-y-1 mb-2">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[#245c45] text-[11px] font-bold">
                            <ShieldCheck size={13} /> Sistem Operasional &amp; Penawaran Terpadu
                        </div>
                        <h1 className="font-sans text-2xl font-black tracking-tight text-[#17231c] select-none pt-1">
                            Field<span className="text-[#245c45]">work</span>
                        </h1>
                        <p className="text-xs text-[#66736b]">
                            PT Guci Emas Pratama · Pest &amp; Termite Control
                        </p>
                    </div>

                    {/* Main Login Card */}
                    <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(23,35,28,0.06)] border border-[#e1e8e2] p-6 sm:p-7 space-y-4">
                        <div>
                            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#17231c]">
                                Selamat datang
                            </h2>
                            <p className="text-xs text-[#66736b] mt-1">
                                Masuk untuk melanjutkan ke ruang kerja Anda.
                            </p>
                        </div>

                        <form onSubmit={handleLogin} className="space-y-3.5 pt-1">
                            <div className="space-y-1">
                                <label className="block text-xs font-bold text-[#17231c]">Email Akun</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Mail size={15} className="text-[#87928b]" />
                                    </div>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        placeholder="nama@perusahaan.com"
                                        required
                                        className="w-full pl-9 pr-3.5 py-2.5 bg-[#f6f8f6] border border-[#e1e8e2] text-[#17231c] text-xs sm:text-sm rounded-xl focus:outline-none focus:bg-white focus:border-[#245c45] transition-all"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="block text-xs font-bold text-[#17231c]">Password</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock size={15} className="text-[#87928b]" />
                                    </div>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        placeholder="Masukkan password"
                                        required
                                        className="w-full pl-9 pr-9 py-2.5 bg-[#f6f8f6] border border-[#e1e8e2] text-[#17231c] text-xs sm:text-sm rounded-xl focus:outline-none focus:bg-white focus:border-[#245c45] transition-all"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#87928b] hover:text-[#17231c] transition-colors cursor-pointer"
                                        tabIndex={-1}
                                        title={showPassword ? "Sembunyikan password" : "Lihat password"}
                                    >
                                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                                    </button>
                                </div>
                            </div>

                            {error && (
                                <div className="flex items-start gap-2 text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-2.5 text-xs font-medium leading-relaxed">
                                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-2.5 px-4 bg-[#245c45] hover:bg-[#1d4b38] text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-all btn-tactile disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 size={15} className="animate-spin" /> Memeriksa Akun...
                                    </>
                                ) : (
                                    <>
                                        Masuk ke Fieldwork <ArrowRight size={15} />
                                    </>
                                )}
                            </button>
                        </form>

                        {/* Tautan Registrasi via Token Undangan */}
                        <div className="pt-2 border-t border-[#e1e8e2] flex items-center justify-between text-xs">
                            <span className="text-[#66736b]">Punya Token Undangan?</span>
                            <Link
                                to="/signup"
                                className="inline-flex items-center gap-1 font-bold text-[#245c45] hover:underline"
                            >
                                <KeyRound size={12} /> Aktivasi via Token
                            </Link>
                        </div>

                        {/* 1-Click Demo Staff Accounts */}
                        <div className="pt-3 border-t border-[#e1e8e2] space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold text-[#66736b] flex items-center gap-1">
                                    <Sparkles size={12} className="text-amber-600" /> Akun Demo Perusahaan (1-Klik)
                                </span>
                                <span className="text-[10px] text-[#87928b]">5 Peran Perusahaan</span>
                            </div>

                            <div className="grid grid-cols-2 gap-1.5">
                                {QUICK_DEMO_ACCOUNTS.map(acc => (
                                    <button
                                        key={acc.email}
                                        type="button"
                                        disabled={loading}
                                        onClick={() => handleQuickLogin(acc.email, acc.pw)}
                                        className="flex flex-col items-start justify-between p-2 rounded-xl border border-[#e1e8e2] bg-[#f6f8f6] hover:bg-[#eef3ef] text-left transition-all btn-tactile cursor-pointer"
                                    >
                                        <div className="flex items-center justify-between w-full gap-1 mb-0.5">
                                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-white border border-[#e1e8e2] text-[#245c45]">
                                                {acc.roleBadge}
                                            </span>
                                            <UserCheck size={11} className="text-[#87928b]" />
                                        </div>
                                        <div className="font-bold text-[11px] text-[#17231c] truncate w-full">{acc.label}</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <p className="text-center text-[11px] text-[#87928b]">
                        &copy; {new Date().getFullYear()} Fieldwork — PT Guci Emas Pratama. All rights reserved.
                    </p>
                </div>
            </main>
        </div>
    );
}
