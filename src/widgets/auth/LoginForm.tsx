import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from '@/shared/lib/supabase';
import { useAuthStore } from '@/app/store/authStore';
import { AlertCircle, Loader2, Bug, Lock, Mail } from "lucide-react";
import type { AppUser } from '@/entities/types';

export function LoginPage() {
    const navigate = useNavigate();
    const { setUser } = useAuthStore();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            // 1. Supabase Auth
            const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({ email, password });
            if (authErr || !authData.user) throw authErr;
            const uid = authData.user.id;

            // 2. Ambil data user dari tabel public.users
            const { data: userData, error: userErr } = await supabase
                .from("users")
                .select("*")
                .eq("id", uid)
                .single();

            if (userErr || !userData) {
                await supabase.auth.signOut();
                setError("Data akun tidak ditemukan di sistem. Hubungi administrator.");
                return;
            }

            if (!userData.is_active) {
                await supabase.auth.signOut();
                setError("Akun Anda dinonaktifkan. Hubungi administrator perusahaan.");
                return;
            }

            // 3. Cek status perusahaan
            if (userData.role !== "SUPERADMIN") {
                const { data: companyData } = await supabase
                    .from("companies")
                    .select("status")
                    .eq("id", userData.company_id)
                    .single();

                if (!companyData || companyData.status !== "ACTIVE") {
                    await supabase.auth.signOut();
                    setError("Langganan perusahaan Anda tidak aktif. Hubungi Super Admin.");
                    return;
                }
            }

            // 4. Inject ke State
            const appUser: AppUser = {
                uid: userData.id,
                name: userData.name,
                email: userData.email,
                role: userData.role,
                companyId: userData.company_id,
                isActive: userData.is_active,
                wa: userData.phone,
            };
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
        <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4 selection:bg-[var(--accent-glow)]">
            <div className="w-full max-w-md">
                {/* Logo & Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--accent)] text-white mb-4 shadow-lg shadow-[var(--accent-glow)]">
                        <Bug size={32} />
                    </div>
                    <h1 className="text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">FieldWork</h1>
                    <p className="text-[var(--text-secondary)] text-sm mt-2">
                        Platform Terpadu Anti Rayap & Pest Control
                    </p>
                </div>

                {/* Form Card */}
                <div className="bg-[var(--bg-card)] rounded-3xl shadow-xl border border-[var(--border-subtle)] p-6 md:p-8">
                    <form onSubmit={handleLogin} className="space-y-5">
                        <div className="space-y-1.5">
                            <label className="block text-sm font-bold text-[var(--text-secondary)] ml-1">Email</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Mail size={18} className="text-[var(--text-muted)]" />
                                </div>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="nama@perusahaan.com"
                                    required
                                    className="w-full pl-11 pr-4 py-3.5 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="block text-sm font-bold text-[var(--text-secondary)] ml-1">Password</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Lock size={18} className="text-[var(--text-muted)]" />
                                </div>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="Masukkan password rahasia"
                                    required
                                    className="w-full pl-11 pr-4 py-3.5 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="flex items-start gap-2.5 text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3.5 text-xs font-semibold animate-in fade-in slide-in-from-top-1">
                                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                                <span>{error}</span>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3.5 px-4 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-bold rounded-xl shadow-lg shadow-[var(--accent-glow)] transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
                        >
                            {loading ? <><Loader2 size={18} className="animate-spin" /> Memeriksa Data...</> : "Masuk ke Sistem"}
                        </button>
                    </form>
                    
                    <div className="mt-8 pt-6 border-t border-[var(--border-subtle)] text-center">
                        <p className="text-xs text-[var(--text-muted)]">Belum punya akun perusahaan?</p>
                        <Link to="/signup" className="text-sm font-bold text-[var(--accent-text)] hover:underline mt-1 inline-block">
                            Daftarkan Perusahaan Baru (Tenant)
                        </Link>
                    </div>
                </div>
                
                <p className="text-center text-xs text-[var(--text-muted)] mt-8 font-medium">
                    &copy; {new Date().getFullYear()} FieldWork App. All rights reserved.
                </p>
            </div>
        </div>
    );
}
