import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from '@/shared/lib/supabase';
import { getInviteByToken, acceptInvite, rememberPendingInvite, type Invite } from '@/shared/api/inviteService';
import {
    AlertCircle, Loader2, User, Mail, Lock, Eye, EyeOff,
    ShieldCheck, CheckCircle2, ArrowLeft, KeyRound, ArrowRight
} from "lucide-react";

const ROLE_DISPLAY_NAMES: Record<string, string> = {
    SUPERADMIN: "Superadmin (Direktur Perusahaan)",
    ADMIN: "Admin Operasional Perusahaan",
    MARKETING: "Marketing / Surveyor",
    INVENTORY: "Admin Gudang & Chemical",
    TEKNISI_LAPANGAN: "Teknisi Lapangan",
};

export function SignupPage() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const inviteToken = searchParams.get("invite") || searchParams.get("token") || "";

    const [manualToken, setManualToken] = useState("");
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

    // Deteksi dan bersihkan parameter hash error Supabase (contoh: #error=access_denied&error_code=otp_expired)
    useEffect(() => {
        if (typeof window !== "undefined" && window.location.hash) {
            const hashStr = window.location.hash.substring(1);
            const params = new URLSearchParams(hashStr);
            const errCode = params.get("error_code");
            const errDesc = params.get("error_description");
            if (errCode || errDesc) {
                window.history.replaceState(null, "", window.location.pathname + window.location.search);
                if (errCode === "otp_expired" || (errDesc && errDesc.toLowerCase().includes("expired"))) {
                    setError("Tautan konfirmasi email dari tautan sebelumnya telah kedaluwarsa. Jika Anda mendaftar melalui token undangan, akun Anda akan langsung diaktifkan tanpa menunggu verifikasi email.");
                } else {
                    setError(decodeURIComponent(errDesc?.replace(/\+/g, " ") || "Terjadi kendala pada tautan verifikasi."));
                }
            }
        }
    }, []);

    useEffect(() => {
        if (!inviteToken) {
            setInvite(null);
            setInviteChecking(false);
            return;
        }

        let isMounted = true;
        setInviteChecking(true);
        setInviteError("");
        const checkInvite = async () => {
            try {
                const inv = await getInviteByToken(inviteToken);
                if (!isMounted) return;
                if (!inv) {
                    setInvite(null);
                    setInviteError("Token undangan tidak valid, sudah pernah digunakan, atau sudah kedaluwarsa.");
                } else {
                    setInvite(inv);
                }
            } catch (err: any) {
                if (isMounted) {
                    setInvite(null);
                    setInviteError("Gagal memverifikasi token undangan: " + (err.message || ""));
                }
            } finally {
                if (isMounted) setInviteChecking(false);
            }
        };

        checkInvite();
        return () => { isMounted = false; };
    }, [inviteToken]);

    const handleVerifyManualToken = (e: React.FormEvent) => {
        e.preventDefault();
        const raw = manualToken.trim();
        if (!raw) return;
        // Jika pengguna menempelkan URL penuh, ekstrak parameter invite/token
        let extracted = raw;
        try {
            if (raw.startsWith("http://") || raw.startsWith("https://")) {
                const u = new URL(raw);
                extracted = u.searchParams.get("invite") || u.searchParams.get("token") || raw;
            }
        } catch {
            extracted = raw;
        }
        setSearchParams({ invite: extracted });
    };

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
            // 1. Coba registrasi server-side langsung via backend API (email_confirm: true, anti-otp_expired)
            let registeredViaApi = false;
            try {
                const resp = await fetch("/api/auth/register-invite", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        token: inviteToken.trim(),
                        name: form.userName.trim(),
                        email: form.email.trim(),
                        password: form.password,
                    }),
                });
                const data = await resp.json();
                if (!resp.ok) {
                    throw new Error(data.message || "Gagal mendaftar dengan token undangan.");
                }
                registeredViaApi = true;
            } catch (apiErr: any) {
                console.warn("[signup] API register-invite gagal, beralih ke fallback client-side:", apiErr.message);
                // Jika error karena token sudah dipakai atau email duplikat, lempar error asli
                if (apiErr.message && (apiErr.message.includes("sudah") || apiErr.message.includes("kedaluwarsa") || apiErr.message.includes("tidak ditemukan"))) {
                    throw apiErr;
                }
            }

            // 2. Fallback client-side jika API backend tidak merespons
            if (!registeredViaApi) {
                const { data: authData, error: authErr } = await supabase.auth.signUp({
                    email: form.email.trim(),
                    password: form.password,
                });
                if (authErr) throw authErr;
                if (!authData.user) throw new Error("Gagal mendaftar. Silakan coba lagi.");

                if (authData.session) {
                    await acceptInvite(inviteToken, form.userName);
                } else {
                    rememberPendingInvite(inviteToken, form.userName);
                }
            }

            // 3. Login otomatis jika akun sudah terkonfirmasi
            try {
                await supabase.auth.signInWithPassword({
                    email: form.email.trim(),
                    password: form.password,
                });
            } catch { /* abaikan jika gagal, tetap arahkan */ }

            setSuccess(true);
            setTimeout(() => {
                navigate("/");
            }, 1800);
        } catch (err: any) {
            setError(err.message || "Gagal menyelesaikan pendaftaran.");
            await supabase.auth.signOut();
        } finally {
            setLoading(false);
        }
    };
    return (
        <div className="min-h-[100dvh] bg-[var(--bg-primary)] flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 selection:bg-[var(--accent-glow)]">
            <div className="w-full max-w-sm sm:max-w-[410px] md:max-w-[430px] mx-auto">
                <div className="text-center mb-6">
                    <h1 className="font-sans text-2xl sm:text-3xl font-black tracking-tight leading-tight text-slate-900 select-none">
                        Field<span className="text-[var(--accent)]">Work</span>
                    </h1>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">
                        Aktivasi Akun via Token Undangan Resmi
                    </p>
                </div>

                {inviteChecking ? (
                    <div className="bg-white rounded-2xl shadow-lg border border-[var(--border-subtle)] p-6 text-center space-y-2.5">
                        <Loader2 size={28} className="animate-spin text-[var(--accent)] mx-auto" />
                        <p className="text-xs sm:text-sm font-semibold text-[var(--text-secondary)]">Memeriksa token undangan...</p>
                    </div>
                ) : invite && !success ? (
                    <div className="bg-white rounded-2xl shadow-lg border border-[var(--border-subtle)] p-5 sm:p-7">
                        <div className="mb-4 pb-3 border-b border-[var(--border-subtle)]">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg w-fit mb-1.5">
                                <ShieldCheck size={14} />
                                <span>Token Undangan Valid</span>
                            </div>
                            <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
                                {invite.role === "SUPERADMIN" ? "Registrasi Akun Superadmin Perusahaan" : "Registrasi Akun Anggota Perusahaan"}
                            </h2>
                            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                                Anda diundang bergabung ke <strong className="text-slate-900">{invite.companyName}</strong> sebagai{" "}
                                <strong className="text-[var(--accent)]">{ROLE_DISPLAY_NAMES[invite.role] || invite.role}</strong>.
                            </p>
                        </div>

                        <form onSubmit={handleSignupWithInvite} className="space-y-3.5">
                            <div className="space-y-1">
                                <label className="block text-xs font-semibold text-[var(--text-secondary)]">Nama Lengkap</label>
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
                                        placeholder="Masukkan nama lengkap Anda"
                                        className="w-full pl-10 pr-3.5 py-2.5 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="block text-xs font-semibold text-[var(--text-secondary)]">Email</label>
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
                                        placeholder="nama@perusahaan.com"
                                        className="w-full pl-10 pr-3.5 py-2.5 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="block text-xs font-semibold text-[var(--text-secondary)]">Password</label>
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
                                        className="w-full pl-10 pr-10 py-2.5 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
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

                            <div className="space-y-1">
                                <label className="block text-xs font-semibold text-[var(--text-secondary)]">Konfirmasi Password</label>
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
                                        className="w-full pl-10 pr-3.5 py-2.5 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="flex items-start gap-2 text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs font-semibold">
                                    <AlertCircle size={15} className="shrink-0 mt-0.5" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-2.5 px-4 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-bold rounded-xl shadow-xs transition-all disabled:opacity-70 flex items-center justify-center gap-2 mt-2 cursor-pointer"
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
                    <div className="bg-white rounded-2xl shadow-lg border border-[var(--border-subtle)] p-6 text-center space-y-3">
                        <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mx-auto">
                            <CheckCircle2 size={26} />
                        </div>
                        <h2 className="text-lg font-bold text-slate-900">Pendaftaran Berhasil!</h2>
                        <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
                            Akun Anda telah aktif dan terhubung ke perusahaan. Mengalihkan ke halaman login...
                        </p>
                        <Link
                            to="/login"
                            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[var(--accent)] text-white text-xs sm:text-sm font-bold rounded-xl"
                        >
                            Masuk Sekarang
                        </Link>
                    </div>
                ) : (
                    /* Form Input Kode Token Undangan Manual */
                    <div className="bg-white rounded-2xl shadow-lg border border-[var(--border-subtle)] p-5 sm:p-7 space-y-4">
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-emerald-50 text-[var(--accent)] border border-emerald-200 rounded-xl flex items-center justify-center shrink-0">
                                <KeyRound size={20} />
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-slate-900">Verifikasi Token Undangan</h2>
                                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                                    Masukkan kode token undangan atau tautan undangan yang Anda terima untuk mengaktifkan akun Superadmin atau Staf Perusahaan.
                                </p>
                            </div>
                        </div>

                        {inviteError && (
                            <div className="flex items-start gap-2 text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs font-medium">
                                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                                <span>{inviteError}</span>
                            </div>
                        )}

                        <form onSubmit={handleVerifyManualToken} className="space-y-3">
                            <div>
                                <label className="block text-xs font-bold text-[#2d2a26] mb-1">
                                    Kode Token / Link Undangan
                                </label>
                                <input
                                    type="text"
                                    value={manualToken}
                                    onChange={e => setManualToken(e.target.value)}
                                    placeholder="Tempel kode token undangan di sini..."
                                    required
                                    className="w-full px-3.5 py-2.5 bg-[#faf9f7] border border-[#e8e5e0] rounded-xl text-xs sm:text-sm font-mono focus:outline-none focus:bg-white focus:border-[var(--accent)]"
                                />
                            </div>
                            <button
                                type="submit"
                                className="w-full py-2.5 px-4 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs sm:text-sm font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                                Verifikasi Token Undangan <ArrowRight size={15} />
                            </button>
                        </form>

                        <div className="pt-3 border-t border-[#e8e5e0] text-center">
                            <Link
                                to="/login"
                                className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--accent)]"
                            >
                                <ArrowLeft size={14} /> Kembali ke Halaman Masuk
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
