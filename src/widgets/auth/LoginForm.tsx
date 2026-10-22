import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from '@/shared/lib/supabase';
import { useAuthStore } from '@/app/store/authStore';
import { AlertCircle, Loader2, Lock, Mail, Eye, EyeOff, ShieldCheck, Sparkles, ArrowRight, UserCheck } from "lucide-react";
import type { AppUser } from '@/entities/types';
import { fetchAppUser } from '@/shared/api/authProfile';

const QUICK_ACCOUNTS = [
    {
        label: "Master All-Role (Rafi)",
        roleBadge: "Bisa Semua Role",
        email: "lieziragroup@gmail.com",
        pw: "Rafi0502!",
        highlight: true,
    },
    {
        label: "Admin Operasional",
        roleBadge: "ADMIN",
        email: "admin@gucimaspratama.co.id",
        pw: "GuciEmas123!",
        highlight: false,
    },
    {
        label: "Surveyor / Marketing",
        roleBadge: "SURVEYOR",
        email: "surveyor@gucimaspratama.co.id",
        pw: "GuciEmas123!",
        highlight: false,
    },
    {
        label: "Teknisi Lapangan",
        roleBadge: "TEKNISI",
        email: "teknisi@gucimaspratama.co.id",
        pw: "GuciEmas123!",
        highlight: false,
    },
    {
        label: "Admin Gudang",
        roleBadge: "INVENTORY",
        email: "gudang@gucimaspratama.co.id",
        pw: "GuciEmas123!",
        highlight: false,
    },
];

export function LoginPage() {
    const navigate = useNavigate();
    const { setUser } = useAuthStore();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const performSignIn = async (loginEmail: string, loginPassword: string) => {
        setError("");
        setLoading(true);

        try {
            const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
                email: loginEmail.trim(),
                password: loginPassword,
            });
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

            if (appUser.role === "SUPERADMIN") {
                navigate("/super-admin/companies");
            } else if (appUser.role === "TEKNISI_LAPANGAN") {
                navigate("/executor");
            } else {
                navigate("/dashboard");
            }
        } catch (err: any) {
            setError(err.message || "Email atau password salah. Pastikan skrip SQL database sudah dijalankan.");
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
            <div className="w-full max-w-[420px] mx-auto space-y-4">
                {/* Brand Identity Header */}
                <div className="text-center space-y-1.5">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[var(--accent)] text-[11px] font-bold">
                        <ShieldCheck size={13} /> PT Guci Emas Pratama • Sejak 1985
                    </div>
                    <h1 className="font-sans text-2xl sm:text-3xl font-extrabold tracking-tight text-[#2d2a26] select-none">
                        Guci<span className="text-[var(--accent)]">Emas</span>{" "}
                        <span className="font-normal text-base text-[#8a8580]">Workspace</span>
                    </h1>
                    <p className="text-xs text-[#5a554f]">
                        Automation Quotation (GP-DRF &amp; GP-APR), CRM Garansi Rayap, Gudang &amp; Fieldwork
                    </p>
                </div>

                {/* Main Login Card */}
                <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgba(45,42,38,0.06)] border border-[#e8e5e0] p-5 sm:p-6 space-y-4">
                    <form onSubmit={handleLogin} className="space-y-3.5">
                        <div className="space-y-1">
                            <label className="block text-xs font-bold text-[#2d2a26]">Alamat Email</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail size={15} className="text-[#8a8580]" />
                                </div>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="nama@gucimaspratama.co.id"
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
                                    placeholder="Masukkan password akun"
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
                                    <Loader2 size={15} className="animate-spin" /> Masuk ke Workspace...
                                </>
                            ) : (
                                <>
                                    Masuk ke Sistem <ArrowRight size={15} />
                                </>
                            )}
                        </button>
                    </form>

                    {/* 1-Click Quick Login Panel for Easy QA & Testing */}
                    <div className="pt-3.5 border-t border-[#e8e5e0] space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-[#5a554f] flex items-center gap-1">
                                <Sparkles size={12} className="text-amber-600" /> Akses Cepat QA &amp; Demo (1-Klik Masuk)
                            </span>
                            <span className="text-[10px] text-[#8a8580]">Otomatis Isi &amp; Login</span>
                        </div>

                        <div className="grid grid-cols-1 gap-1.5">
                            {QUICK_ACCOUNTS.map(acc => (
                                <button
                                    key={acc.email}
                                    type="button"
                                    disabled={loading}
                                    onClick={() => handleQuickLogin(acc.email, acc.pw)}
                                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border text-left transition-all cursor-pointer ${
                                        acc.highlight
                                            ? "bg-emerald-50/70 hover:bg-emerald-100/70 border-emerald-300 text-[#2d2a26]"
                                            : "bg-[#faf9f7] hover:bg-[#f5f3ef] border-[#e8e5e0] text-[#2d2a26]"
                                    }`}
                                >
                                    <div className="min-w-0 pr-2">
                                        <div className="font-bold text-xs flex items-center gap-1.5 truncate">
                                            <UserCheck size={13} className="text-[var(--accent)] shrink-0" />
                                            <span className="truncate">{acc.label}</span>
                                        </div>
                                        <div className="text-[10px] text-[#8a8580] font-mono truncate">{acc.email}</div>
                                    </div>
                                    <span
                                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                                            acc.highlight
                                                ? "bg-[var(--accent)] text-white"
                                                : "bg-white border border-[#e8e5e0] text-[#5a554f]"
                                        }`}
                                    >
                                        {acc.roleBadge}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <p className="text-center text-[11px] text-[#8a8580]">
                    &copy; {new Date().getFullYear()} PT Guci Emas Pratama. Termite Control &bull; Pest Control &bull; Fumigation.
                </p>
            </div>
        </div>
    );
}
