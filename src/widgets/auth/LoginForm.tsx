import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from '@/shared/lib/supabase';
import { useAuthStore } from '@/app/store/authStore';
import { AlertCircle, Loader2, Lock, Mail, Eye, EyeOff, ShieldCheck, Sparkles, ArrowRight, UserCheck, KeyRound } from "lucide-react";
import type { AppUser } from '@/entities/types';
import { fetchAppUser } from '@/shared/api/authProfile';

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

    // Deteksi dan bersihkan parameter hash error Supabase (contoh: #error=access_denied&error_code=otp_expired)
    useEffect(() => {
        if (typeof window !== "undefined" && window.location.hash) {
            const hashStr = window.location.hash.substring(1);
            const params = new URLSearchParams(hashStr);
            const errCode = params.get("error_code");
            const errDesc = params.get("error_description");
            if (errCode || errDesc) {
                window.history.replaceState(null, "", window.location.pathname);
                if (errCode === "otp_expired" || (errDesc && errDesc.toLowerCase().includes("expired"))) {
                    setError("Tautan email telah kedaluwarsa atau sudah pernah diklik. Silakan langsung login dengan email dan password akun Anda di bawah ini.");
                } else {
                    setError(decodeURIComponent(errDesc?.replace(/\+/g, " ") || "Terjadi kendala pada tautan verifikasi email."));
                }
            }
        }
    }, []);

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

        try {
            let { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
                email: loginEmail.trim(),
                password: loginPassword,
            });

            // Jika gagal karena email belum terkonfirmasi, coba auto-confirm lewat server API dan retry
            if (authErr && (authErr.message.toLowerCase().includes("not confirmed") || authErr.message.toLowerCase().includes("unconfirmed"))) {
                try {
                    const confirmRes = await fetch("/api/auth/auto-confirm-email", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ email: loginEmail.trim() }),
                    });
                    const confirmData = await confirmRes.json();
                    if (confirmData.success) {
                        const retry = await supabase.auth.signInWithPassword({
                            email: loginEmail.trim(),
                            password: loginPassword,
                        });
                        authData = retry.data;
                        authErr = retry.error;
                    }
                } catch { /* abaikan error fallback */ }
            }

            if (authErr) throw authErr;
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
        <div className="min-h-[100dvh] bg-[var(--bg-primary)] flex flex-col items-center justify-center p-4 sm:p-6 selection:bg-[var(--accent-glow)]">
            <div className="w-full max-w-[400px] mx-auto space-y-4">
                {/* FieldWork Brand Wordmark */}
                <div className="text-center space-y-1">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[var(--accent)] text-[11px] font-bold">
                        <ShieldCheck size={13} /> Sistem Operasional &amp; Penawaran Terpadu
                    </div>
                    <h1 className="font-sans text-2xl sm:text-3xl font-black tracking-tight text-[#2d2a26] select-none pt-1">
                        Field<span className="text-[var(--accent)]">Work</span>
                    </h1>
                    <p className="text-xs text-[#5a554f]">
                        Penawaran Harga, Garansi Rayap, Stok Gudang &amp; Laporan Teknisi
                    </p>
                </div>

                {/* Main Login Card */}
                <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgba(45,42,38,0.06)] border border-[#e8e5e0] p-5 sm:p-6 space-y-4">
                    <form onSubmit={handleLogin} className="space-y-3.5">
                        <div className="space-y-1">
                            <label className="block text-xs font-bold text-[#2d2a26]">Email Akun</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail size={15} className="text-[#8a8580]" />
                                </div>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="nama@perusahaan.com"
                                    required
                                    className="w-full pl-9 pr-3.5 py-2 bg-[#faf9f7] border border-[#e8e5e0] text-[#2d2a26] text-xs sm:text-sm rounded-xl focus:outline-none focus:bg-white focus:border-[var(--accent)] transition-all"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="block text-xs font-bold text-[#2d2a26]">Password</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock size={15} className="text-[#8a8580]" />
                                </div>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="Masukkan password"
                                    required
                                    className="w-full pl-9 pr-9 py-2 bg-[#faf9f7] border border-[#e8e5e0] text-[#2d2a26] text-xs sm:text-sm rounded-xl focus:outline-none focus:bg-white focus:border-[var(--accent)] transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#8a8580] hover:text-[#2d2a26] transition-colors"
                                    tabIndex={-1}
                                    title={showPassword ? "Sembunyikan password" : "Lihat password"}
                                >
                                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="flex items-start gap-2 text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-2.5 text-xs font-medium">
                                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                                <span>{error}</span>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-2.5 px-4 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-all active:scale-[0.99] disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={15} className="animate-spin" /> Memeriksa Akun...
                                </>
                            ) : (
                                <>
                                    Masuk ke FieldWork <ArrowRight size={15} />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Tautan Registrasi via Token Undangan */}
                    <div className="pt-2 border-t border-[#e8e5e0] flex items-center justify-between text-xs">
                        <span className="text-[#5a554f]">Punya Token Undangan?</span>
                        <Link
                            to="/signup"
                            className="inline-flex items-center gap-1 font-bold text-[var(--accent)] hover:underline"
                        >
                            <KeyRound size={12} /> Aktivasi via Token
                        </Link>
                    </div>

                    {/* 1-Click Demo Staff Accounts */}
                    <div className="pt-3 border-t border-[#e8e5e0] space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-[#5a554f] flex items-center gap-1">
                                <Sparkles size={12} className="text-amber-600" /> Akun Demo Perusahaan (1-Klik)
                            </span>
                            <span className="text-[10px] text-[#8a8580]">5 Peran Perusahaan</span>
                        </div>

                        <div className="grid grid-cols-2 gap-1.5">
                            {QUICK_DEMO_ACCOUNTS.map(acc => (
                                <button
                                    key={acc.email}
                                    type="button"
                                    disabled={loading}
                                    onClick={() => handleQuickLogin(acc.email, acc.pw)}
                                    className="flex flex-col items-start justify-between p-2 rounded-xl border border-[#e8e5e0] bg-[#faf9f7] hover:bg-[#f5f3ef] text-left transition-all cursor-pointer"
                                >
                                    <div className="flex items-center justify-between w-full gap-1 mb-0.5">
                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-white border border-[#e8e5e0] text-[var(--accent)]">
                                            {acc.roleBadge}
                                        </span>
                                        <UserCheck size={11} className="text-[#8a8580]" />
                                    </div>
                                    <div className="font-bold text-[11px] text-[#2d2a26] truncate w-full">{acc.label}</div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <p className="text-center text-[11px] text-[#8a8580]">
                    &copy; {new Date().getFullYear()} FieldWork App. All rights reserved.
                </p>
            </div>
        </div>
    );
}
