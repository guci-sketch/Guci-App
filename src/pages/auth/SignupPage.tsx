import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from '@/shared/lib/supabase';
import { getInviteByToken, acceptInvite, rememberPendingInvite, type Invite } from '@/shared/api/inviteService';
import {
    AlertCircle, Loader2, User, Mail, Lock, Eye, EyeOff,
    ShieldCheck, Building2, CheckCircle2, ArrowRight, ArrowLeft
} from "lucide-react";

export function SignupPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const inviteToken = searchParams.get("invite");

    const [invite, setInvite] = useState<Invite | null>(null);
    const [inviteChecking, setInviteChecking] = useState(Boolean(inviteToken));
    const [inviteError, setInviteError] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    const [form, setForm] = useState({
        userName: "",
        email: "",
        password: "",
        confirmPassword: "",
    });
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        if (!inviteToken) {
            setInviteChecking(false);
            return;
        }

        let isMounted = true;
        const checkInvite = async () => {
            try {
                const inv = await getInviteByToken(inviteToken);
                if (!isMounted) return;
                if (!inv) {
                    setInviteError("Tautan undangan tidak valid atau sudah kedaluwarsa.");
                } else {
                    setInvite(inv);
                }
            } catch (err: any) {
                if (isMounted) setInviteError("Gagal memverifikasi undangan: " + (err.message || ""));
            } finally {
                if (isMounted) setInviteChecking(false);
            }
        };

        checkInvite();
        return () => { isMounted = false; };
    }, [inviteToken]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm(prev => ({ ...prev, [e.target.id]: e.target.value }));
    };

    const handleSignupWithInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!invite || !inviteToken) return;

        setError("");
        if (form.password !== form.confirmPassword) {
            setError("Konfirmasi password tidak cocok.");
            return;
        }
        if (form.password.length < 6) {
            setError("Password minimal 6 karakter.");
            return;
        }

        setLoading(true);
        try {
            // 1. Buat auth di Supabase
            const { data: authData, error: authErr } = await supabase.auth.signUp({
                email: form.email,
                password: form.password,
            });
            if (authErr) throw authErr;
            if (!authData.user) throw new Error("Gagal mendaftar. Silakan coba lagi.");

            // 2. Hubungkan ke perusahaan lewat RPC server: company_id & role diambil dari UNDANGAN, bukan dari klien,
            //    dan undangan ditandai terpakai secara atomik (tak bisa dipakai dua kali).
            if (authData.session) {
                await acceptInvite(inviteToken, form.userName);
            } else {
                // Konfirmasi email aktif: belum ada sesi. Selesaikan otomatis saat login pertama setelah konfirmasi.
                rememberPendingInvite(inviteToken, form.userName);
            }

            setSuccess(true);
            setTimeout(() => {
                navigate("/login");
            }, 2500);
        } catch (err: any) {
            setError(err.message || "Gagal menyelesaikan pendaftaran.");
            await supabase.auth.signOut();
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[100dvh] bg-[var(--bg-primary)] flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 selection:bg-[var(--accent-glow)]">
            <div className="w-full max-w-sm sm:max-w-[400px] md:max-w-[420px] mx-auto">
                {/* Logo & Header — FieldWork Brand Wordmark */}
                <div className="text-center mb-6 sm:mb-7">
                    <h1 className="font-sans text-2xl sm:text-3xl md:text-[32px] font-black tracking-tight leading-tight text-slate-900 select-none">
                        Field<span className="text-emerald-600">Work</span>
                    </h1>
                </div>

                {inviteChecking ? (
                    <div className="bg-[var(--bg-card)] rounded-2xl sm:rounded-3xl shadow-lg sm:shadow-xl border border-[var(--border-subtle)] p-6 text-center space-y-2.5">
                        <Loader2 size={28} className="animate-spin text-emerald-600 mx-auto" />
                        <p className="text-xs sm:text-sm font-semibold text-[var(--text-secondary)]">Memeriksa tautan undangan...</p>
                    </div>
                ) : invite && !success ? (
                    /* Form aktivasi akun dari undangan Super Admin / Admin */
                    <div className="bg-[var(--bg-card)] rounded-2xl sm:rounded-3xl shadow-lg sm:shadow-xl border border-[var(--border-subtle)] p-5 sm:p-7">
                        <div className="mb-4 pb-3 border-b border-[var(--border-subtle)]">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg w-fit mb-1.5">
                                <ShieldCheck size={14} />
                                <span>Undangan Resmi Aktif</span>
                            </div>
                            <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">Registrasi Akun Anggota</h2>
                            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                                Anda diundang bergabung ke <strong className="text-slate-900">{invite.companyName}</strong> sebagai <strong className="text-emerald-700">{invite.role}</strong>.
                            </p>
                        </div>

                        <form onSubmit={handleSignupWithInvite} className="space-y-3.5 sm:space-y-4">
                            <div className="space-y-1 sm:space-y-1.5">
                                <label className="block text-xs sm:text-sm font-semibold text-[var(--text-secondary)] ml-0.5">Nama Lengkap</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                        <User size={16} className="text-[var(--text-muted)]" />
                                    </div>
                                    <input
                                        id="userName"
                                        type="text"
                                        value={form.userName}
                                        onChange={handleChange}
                                        required
                                        placeholder="Nama lengkap petugas"
                                        className="w-full pl-10 pr-3.5 py-2.5 sm:py-3 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition-all"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1 sm:space-y-1.5">
                                <label className="block text-xs sm:text-sm font-semibold text-[var(--text-secondary)] ml-0.5">Email</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                        <Mail size={16} className="text-[var(--text-muted)]" />
                                    </div>
                                    <input
                                        id="email"
                                        type="email"
                                        value={form.email}
                                        onChange={handleChange}
                                        required
                                        placeholder="nama@email.com"
                                        className="w-full pl-10 pr-3.5 py-2.5 sm:py-3 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition-all"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1 sm:space-y-1.5">
                                <label className="block text-xs sm:text-sm font-semibold text-[var(--text-secondary)] ml-0.5">Password</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                        <Lock size={16} className="text-[var(--text-muted)]" />
                                    </div>
                                    <input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        value={form.password}
                                        onChange={handleChange}
                                        required
                                        placeholder="Minimal 6 karakter"
                                        className="w-full pl-10 pr-10 py-2.5 sm:py-3 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition-all"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                                    >
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-1 sm:space-y-1.5">
                                <label className="block text-xs sm:text-sm font-semibold text-[var(--text-secondary)] ml-0.5">Konfirmasi Password</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                        <Lock size={16} className="text-[var(--text-muted)]" />
                                    </div>
                                    <input
                                        id="confirmPassword"
                                        type={showPassword ? "text" : "password"}
                                        value={form.confirmPassword}
                                        onChange={handleChange}
                                        required
                                        placeholder="Ulangi password"
                                        className="w-full pl-10 pr-3.5 py-2.5 sm:py-3 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition-all"
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="flex items-start gap-2 text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs font-semibold animate-in fade-in slide-in-from-top-1">
                                    <AlertCircle size={15} className="shrink-0 mt-0.5" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-2.5 sm:py-3 px-4 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-bold rounded-xl shadow-md shadow-[var(--accent-glow)] transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
                            >
                                {loading ? <><Loader2 size={16} className="animate-spin" /> Mendaftarkan Akun...</> : "Selesaikan Pendaftaran"}
                            </button>
                        </form>

                        <div className="mt-4 pt-3.5 border-t border-[var(--border-subtle)] text-center">
                            <Link to="/login" className="text-xs font-semibold text-[var(--text-muted)] hover:text-emerald-700 inline-flex items-center gap-1.5">
                                <ArrowLeft size={14} /> Kembali ke Halaman Masuk
                            </Link>
                        </div>
                    </div>
                ) : success ? (
                    /* Notifikasi Pendaftaran Berhasil */
                    <div className="bg-[var(--bg-card)] rounded-2xl sm:rounded-3xl shadow-lg sm:shadow-xl border border-[var(--border-subtle)] p-6 sm:p-8 text-center space-y-3">
                        <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mx-auto">
                            <CheckCircle2 size={26} />
                        </div>
                        <h2 className="text-lg font-bold text-slate-900">Pendaftaran Berhasil!</h2>
                        <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
                            Akun Anda telah terdaftar. Anda akan dialihkan ke halaman login secara otomatis.
                        </p>
                        <Link
                            to="/login"
                            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-sm"
                        >
                            Masuk Sekarang <ArrowRight size={15} />
                        </Link>
                    </div>
                ) : (
                    /* Keadaan Normal Tanpa Undangan */
                    <div className="bg-[var(--bg-card)] rounded-2xl sm:rounded-3xl shadow-lg sm:shadow-xl border border-[var(--border-subtle)] p-5 sm:p-7 text-center space-y-4">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center mx-auto shadow-xs">
                            <Building2 size={24} />
                        </div>

                        <div>
                            <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                                Pendaftaran Dikelola Super Admin
                            </h2>
                            <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1.5 leading-relaxed max-w-sm mx-auto">
                                Registrasi perusahaan baru (tenant) dan aktivasi akses operasional dikelola secara terpusat oleh <span className="font-semibold text-slate-800">Super Administrator</span>.
                            </p>
                        </div>

                        {inviteError && (
                            <div className="flex items-center justify-center gap-2 text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs font-semibold text-left">
                                <AlertCircle size={14} className="shrink-0" />
                                <span>{inviteError}</span>
                            </div>
                        )}

                        <div className="p-3.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] text-xs text-[var(--text-muted)] text-left space-y-1.5">
                            <div className="flex items-start gap-1.5">
                                <ShieldCheck size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                                <span>Hubungi Super Admin untuk penambahan tenant baru, izin lisensi, atau tautan undangan petugas.</span>
                            </div>
                        </div>

                        <div className="pt-1">
                            <Link
                                to="/login"
                                className="w-full py-2.5 sm:py-3 px-4 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-bold rounded-xl shadow-md shadow-[var(--accent-glow)] transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                            >
                                <ArrowLeft size={16} /> Masuk ke Sistem
                            </Link>
                        </div>
                    </div>
                )}

                <p className="text-center text-xs text-[var(--text-muted)] mt-6 font-medium">
                    &copy; {new Date().getFullYear()} FieldWork App. All rights reserved.
                </p>
            </div>
        </div>
    );
}
