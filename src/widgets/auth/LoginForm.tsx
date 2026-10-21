import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from '@/shared/lib/supabase';
import { useAuthStore } from '@/app/store/authStore';
import { AlertCircle, Loader2, Lock, Mail, Eye, EyeOff, ShieldCheck } from "lucide-react";
import type { AppUser } from '@/entities/types';
import { fetchAppUser } from '@/shared/api/authProfile';

export function LoginPage() {
    const navigate = useNavigate();
    const { setUser } = useAuthStore();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            // 1. Supabase Auth
            const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({ email, password });
            if (authErr) throw authErr;
            if (!authData.user) throw new Error("Login gagal. Silakan coba lagi.");

            // 2. Profil + validasi akun aktif & langganan perusahaan (logika yang sama dengan pemulihan sesi)
            const res = await fetchAppUser(authData.user.id);
            if (!res.user) {
                await supabase.auth.signOut();
                setError((res.message ?? 'Akun tidak dapat digunakan.'));
                return;
            }
            const appUser: AppUser = res.user;

            // 3. Inject ke state
            setUser(appUser);

            if (appUser.role === "SUPERADMIN") {
                navigate("/super-admin/companies");
            } else if (appUser.role === "TEKNISI_LAPANGAN") {
                navigate("/executor");
            } else {
                navigate("/dashboard");
            }
        } catch (err: any) {
            setError(err.message || "Email atau password salah. Silakan coba lagi.");
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

                {/* Form Card */}
                <div className="bg-[var(--bg-card)] rounded-2xl sm:rounded-3xl shadow-lg sm:shadow-xl border border-[var(--border-subtle)] p-5 sm:p-7">
                    <form onSubmit={handleLogin} className="space-y-4 sm:space-y-4.5">
                        <div className="space-y-1 sm:space-y-1.5">
                            <label className="block text-xs sm:text-sm font-semibold text-[var(--text-secondary)] ml-0.5">Email</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                    <Mail size={16} className="text-[var(--text-muted)]" />
                                </div>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="nama@perusahaan.com"
                                    required
                                    className="w-full pl-10 pr-4 py-2.5 sm:py-3 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all"
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
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="Masukkan password akun"
                                    required
                                    className="w-full pl-10 pr-10 py-2.5 sm:py-3 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                                    tabIndex={-1}
                                    title={showPassword ? "Sembunyikan password" : "Lihat password"}
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
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
                            className="w-full py-2.5 sm:py-3 px-4 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-bold rounded-xl shadow-md shadow-[var(--accent-glow)] transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-1 sm:mt-2"
                        >
                            {loading ? <><Loader2 size={16} className="animate-spin" /> Memeriksa Data...</> : "Masuk ke Sistem"}
                        </button>
                    </form>
                    
                    {/* Info Superadmin */}
                    <div className="mt-5 pt-4 border-t border-[var(--border-subtle)] text-center">
                        <div className="inline-flex items-center justify-center gap-1.5 text-xs text-[var(--text-muted)]">
                            <ShieldCheck size={14} className="text-emerald-600 shrink-0" />
                            <span>Pendaftaran perusahaan & akun dikelola oleh Super Admin</span>
                        </div>
                    </div>
                </div>
                
                <p className="text-center text-xs text-[var(--text-muted)] mt-6 font-medium">
                    &copy; {new Date().getFullYear()} FieldWork App. All rights reserved.
                </p>
            </div>
        </div>
    );
}
