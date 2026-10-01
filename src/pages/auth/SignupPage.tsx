import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { AlertCircle, Loader2, Bug, Building, User, Mail, Lock } from "lucide-react";

export function SignupPage() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [form, setForm] = useState({
        companyName: "",
        userName: "",
        email: "",
        password: "",
        confirmPassword: "",
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm(prev => ({ ...prev, [e.target.id]: e.target.value }));
    };

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (form.password !== form.confirmPassword) {
            setError("Password konfirmasi tidak cocok.");
            return;
        }

        if (form.password.length < 6) {
            setError("Password minimal 6 karakter.");
            return;
        }

        setLoading(true);
        try {
            // 1. Buat user di Supabase Auth
            const { data: authData, error: authErr } = await supabase.auth.signUp({
                email: form.email,
                password: form.password,
            });

            if (authErr) throw authErr;
            if (!authData.user) throw new Error("Gagal mendaftar. Coba lagi.");

            // 2. Buat Company di public.companies
            const slug = form.companyName.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Date.now().toString().slice(-4);
            const { data: companyData, error: companyErr } = await supabase
                .from("companies")
                .insert({
                    company_name: form.companyName,
                    company_slug: slug,
                    status: "TRIAL",
                    subscription_plan: "FREE_TIER"
                })
                .select("id")
                .single();

            if (companyErr) throw companyErr;

            // 3. Masukkan user sebagai ADMIN di public.users
            const { error: userErr } = await supabase
                .from("users")
                .insert({
                    id: authData.user.id,
                    company_id: companyData.id,
                    name: form.userName,
                    email: form.email,
                    role: "ADMIN"
                });

            if (userErr) throw userErr;

            // Berhasil
            alert("Pendaftaran berhasil! Silakan login dengan akun Anda.");
            navigate("/login");

        } catch (err: any) {
            setError(err.message || "Gagal melakukan pendaftaran.");
            // Supabase auth auto-login on signup sometimes, so sign out just in case
            await supabase.auth.signOut();
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4 selection:bg-[var(--accent-glow)] py-10">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[var(--accent)] text-white mb-3 shadow-lg shadow-[var(--accent-glow)]">
                        <Bug size={28} />
                    </div>
                    <h1 className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">Pendaftaran Tenant</h1>
                    <p className="text-[var(--text-secondary)] text-sm mt-1.5">
                        Mulai operasional FieldWork perusahaan Anda gratis!
                    </p>
                </div>

                <div className="bg-[var(--bg-card)] rounded-3xl shadow-xl border border-[var(--border-subtle)] p-6 md:p-8">
                    <form onSubmit={handleSignup} className="space-y-4">
                        
                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-[var(--text-secondary)] ml-1">Nama Perusahaan (PT/CV)</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                    <Building size={16} className="text-[var(--text-muted)]" />
                                </div>
                                <input id="companyName" type="text" value={form.companyName} onChange={handleChange} required placeholder="Misal: PT Gucimas Pratama"
                                    className="w-full pl-10 pr-4 py-3 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all" />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-[var(--text-secondary)] ml-1">Nama Pemilik</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                        <User size={16} className="text-[var(--text-muted)]" />
                                    </div>
                                    <input id="userName" type="text" value={form.userName} onChange={handleChange} required placeholder="Nama lengkap"
                                        className="w-full pl-10 pr-3 py-3 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition-all" />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-[var(--text-secondary)] ml-1">Email</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                        <Mail size={16} className="text-[var(--text-muted)]" />
                                    </div>
                                    <input id="email" type="email" value={form.email} onChange={handleChange} required placeholder="Email aktif"
                                        className="w-full pl-10 pr-3 py-3 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition-all" />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1.5 pt-2">
                            <label className="block text-xs font-bold text-[var(--text-secondary)] ml-1">Password</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                    <Lock size={16} className="text-[var(--text-muted)]" />
                                </div>
                                <input id="password" type="password" value={form.password} onChange={handleChange} required placeholder="Minimal 6 karakter"
                                    className="w-full pl-10 pr-4 py-3 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition-all" />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-[var(--text-secondary)] ml-1">Konfirmasi Password</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                    <Lock size={16} className="text-[var(--text-muted)]" />
                                </div>
                                <input id="confirmPassword" type="password" value={form.confirmPassword} onChange={handleChange} required placeholder="Ketik ulang password"
                                    className="w-full pl-10 pr-4 py-3 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition-all" />
                            </div>
                        </div>

                        {error && (
                            <div className="flex items-start gap-2.5 text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs font-semibold animate-in fade-in slide-in-from-top-1">
                                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                                <span>{error}</span>
                            </div>
                        )}

                        <button type="submit" disabled={loading} className="w-full py-3.5 px-4 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-bold rounded-xl shadow-lg shadow-[var(--accent-glow)] transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4">
                            {loading ? <><Loader2 size={18} className="animate-spin" /> Mendaftarkan Tenant...</> : "Buat Akun Perusahaan"}
                        </button>
                    </form>
                    
                    <div className="mt-8 pt-5 border-t border-[var(--border-subtle)] text-center">
                        <p className="text-xs text-[var(--text-muted)]">Sudah memiliki akun?</p>
                        <Link to="/login" className="text-sm font-bold text-[var(--accent-text)] hover:underline mt-1 inline-block">
                            Masuk ke Sistem
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
