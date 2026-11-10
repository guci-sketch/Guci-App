import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from '@/shared/lib/supabase';
import { useAuthStore } from '@/app/store/authStore';
import {
    AlertCircle,
    Loader2,
    LockKeyhole,
    Eye,
    EyeOff,
    ShieldCheck,
    ArrowRight,
    UserCheck,
    KeyRound,
    Building2,
    Smartphone,
} from "lucide-react";
import type { AppUser } from '@/entities/types';
import { fetchAppUser } from '@/shared/api/authProfile';
import { readPendingInvite, repairPendingInviteUser } from '@/shared/api/inviteService';

const QUICK_DEMO_ACCOUNTS = [
    {
        label: "Direktur (Superadmin)",
        roleBadge: "DIREKTUR",
        group: "admin" as const,
        email: "direktur@gucimaspratama.co.id",
        pw: "GuciEmas123!",
    },
    {
        label: "Admin Operasional",
        roleBadge: "ADMIN",
        group: "admin" as const,
        email: "admin@gucimaspratama.co.id",
        pw: "GuciEmas123!",
    },
    {
        label: "Marketing / Surveyor",
        roleBadge: "MARKETING",
        group: "admin" as const,
        email: "surveyor@gucimaspratama.co.id",
        pw: "GuciEmas123!",
    },
    {
        label: "Teknisi Lapangan",
        roleBadge: "TEKNISI",
        group: "technician" as const,
        email: "teknisi@gucimaspratama.co.id",
        pw: "GuciEmas123!",
    },
    {
        label: "Gudang & Estimasi",
        roleBadge: "GUDANG",
        group: "admin" as const,
        email: "gudang@gucimaspratama.co.id",
        pw: "GuciEmas123!",
    },
];

export function LoginPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { setUser } = useAuthStore();
    const [roleMode, setRoleMode] = useState<"admin" | "technician">("admin");
    const [email, setEmail] = useState("admin@gucimaspratama.co.id");
    const [password, setPassword] = useState("GuciEmas123!");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    // Deteksi dan bersihkan parameter hash atau query error Supabase
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

    const handleSwitchRoleMode = (nextMode: "admin" | "technician") => {
        setRoleMode(nextMode);
        if (nextMode === "technician") {
            setEmail("teknisi@gucimaspratama.co.id");
            setPassword("GuciEmas123!");
        } else {
            setEmail("admin@gucimaspratama.co.id");
            setPassword("GuciEmas123!");
        }
    };

    const performSignIn = async (loginEmail: string, loginPassword: string) => {
        setError("");
        setLoading(true);
        const cleanEmail = loginEmail.trim().toLowerCase();

        try {
            let { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
                email: cleanEmail,
                password: loginPassword,
            });

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

    const handleQuickLogin = async (accEmail: string, accPw: string, accGroup: "admin" | "technician") => {
        setRoleMode(accGroup);
        setEmail(accEmail);
        setPassword(accPw);
        await performSignIn(accEmail, accPw);
    };

    return (
        <main className="min-h-screen grid grid-cols-1 lg:grid-cols-[minmax(420px,0.95fr)_minmax(480px,1.05fr)] bg-white">
            {/* Left Aside — RedesignFieldworkGuciMasLite Split Hero */}
            <section className="hidden lg:flex flex-col justify-between bg-[#245c45] text-white p-12 xl:p-14 relative overflow-hidden">
                <div className="flex items-center gap-3 relative z-10">
                    <div className="brand-mark">
                        <span />
                        <span />
                        <span />
                    </div>
                    <div>
                        <strong className="block text-base leading-tight font-bold">Fieldwork</strong>
                        <small className="block text-[11px] text-white/75 mt-0.5">PT Guci Emas Pratama</small>
                    </div>
                </div>

                <div className="max-w-xl relative z-10 my-auto">
                    <span className="text-xs font-bold tracking-[0.12em] text-[#cfe0d5] uppercase block">
                        OPERASIONAL LAPANGAN &amp; PENAWARAN
                    </span>
                    <h1 className="text-4xl xl:text-[42px] font-bold leading-[1.15] tracking-[-0.035em] my-4 text-white">
                        Pekerjaan lapangan yang lebih jelas, dari penugasan hingga laporan.
                    </h1>
                    <p className="text-base leading-[1.7] text-[#dbe8df] max-w-[530px]">
                        Satu ruang kerja yang membantu tim fokus pada tindakan berikutnya, menjaga bukti pekerjaan tetap dapat ditelusuri, dan menyusun laporan Pest Control maupun Anti Rayap secara presisi.
                    </p>
                </div>

                <div className="flex items-center gap-3 text-xs text-[#dbe8df] relative z-10">
                    <ShieldCheck size={20} className="shrink-0 text-[#cfe0d5]" />
                    <div>
                        <strong className="block text-white mb-0.5">Sistem Operasional Terintegrasi</strong>
                        <span>Presensi GPS Haversine, Dokumentasi Foto Ber-watermark, &amp; Rekapitulasi Permenkes No. 2 Tahun 2023.</span>
                    </div>
                </div>

                {/* Decorative Concentric Circles from RedesignFieldworkGuciMasLite */}
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute w-[420px] h-[420px] rounded-full border border-white/12 -right-[180px] -bottom-[150px] shadow-[0_0_0_70px_rgba(255,255,255,0.03),0_0_0_140px_rgba(255,255,255,0.025)]"
                />
            </section>

            {/* Right Login Panel */}
            <section className="flex items-center justify-center p-6 sm:p-12 bg-[#fbfcfb]">
                <div className="w-full max-w-[420px]">
                    {/* Mobile Brand Header */}
                    <div className="flex lg:hidden items-center gap-3 mb-7">
                        <div className="brand-mark emerald-bg">
                            <span />
                            <span />
                            <span />
                        </div>
                        <div>
                            <strong className="block text-base leading-tight font-bold text-[#17231c]">Fieldwork</strong>
                            <small className="block text-[11px] text-[#66736b] mt-0.5">PT Guci Emas Pratama</small>
                        </div>
                    </div>

                    <span className="inline-flex items-center h-6 px-2.5 rounded-md bg-[#f1f4f2] text-[#66736b] text-[11px] font-semibold">
                        Ruang Kerja Operasional
                    </span>

                    <h2 className="text-2xl sm:text-[30px] font-bold tracking-[-0.025em] text-[#17231c] mt-4 mb-1.5">
                        Selamat datang
                    </h2>
                    <p className="text-sm text-[#66736b] mb-6">
                        Masuk untuk melanjutkan ke ruang kerja Anda.
                    </p>

                    {/* Role Switcher (Admin vs Teknisi) */}
                    <div className="grid grid-cols-2 p-1 bg-[#eff3f0] rounded-xl mb-5" role="group" aria-label="Pilih peran">
                        <button
                            type="button"
                            onClick={() => handleSwitchRoleMode("admin")}
                            className={`min-h-[42px] rounded-lg flex items-center justify-center gap-2 text-[13px] font-semibold transition-all cursor-pointer ${
                                roleMode === "admin"
                                    ? "bg-white text-[#245c45] shadow-[0_1px_3px_rgba(23,35,28,0.09)]"
                                    : "text-[#66736b] hover:text-[#17231c]"
                            }`}
                        >
                            <Building2 size={17} />
                            Admin &amp; Kantor
                        </button>
                        <button
                            type="button"
                            onClick={() => handleSwitchRoleMode("technician")}
                            className={`min-h-[42px] rounded-lg flex items-center justify-center gap-2 text-[13px] font-semibold transition-all cursor-pointer ${
                                roleMode === "technician"
                                    ? "bg-white text-[#245c45] shadow-[0_1px_3px_rgba(23,35,28,0.09)]"
                                    : "text-[#66736b] hover:text-[#17231c]"
                            }`}
                        >
                            <Smartphone size={17} />
                            Teknisi
                        </button>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-4">
                        <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-[#435047]">
                            <span>Email</span>
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="nama@gucimaspratama.co.id"
                                required
                                className="w-full min-h-[44px] px-3 py-2.5 rounded-[10px] border border-[#d8e0da] bg-white text-[#17231c] text-sm font-normal focus:border-[#245c45] focus:outline-none focus:ring-3 focus:ring-[#245c45]/10 transition-all"
                            />
                        </label>

                        <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-[#435047]">
                            <span>Kata sandi</span>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="Masukkan kata sandi"
                                    required
                                    className="w-full min-h-[44px] pl-3 pr-11 py-2.5 rounded-[10px] border border-[#d8e0da] bg-white text-[#17231c] text-sm font-normal focus:border-[#245c45] focus:outline-none focus:ring-3 focus:ring-[#245c45]/10 transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    aria-label="Tampilkan kata sandi"
                                    className="absolute right-1 top-1 w-9 h-9 rounded-lg flex items-center justify-center text-[#66736b] hover:text-[#17231c] cursor-pointer"
                                    tabIndex={-1}
                                >
                                    {showPassword ? <EyeOff size={17} /> : <LockKeyhole size={17} />}
                                </button>
                            </div>
                        </label>

                        {error && (
                            <div className="flex items-start gap-2 text-[#943838] bg-[#fcecec] border border-[#f5c2c2] rounded-[10px] p-3 text-xs font-medium leading-relaxed">
                                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                                <span>{error}</span>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full min-h-[48px] px-4 rounded-[10px] bg-[#245c45] hover:bg-[#1d4b38] text-white text-[13px] font-semibold flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-60"
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" /> Memeriksa Akun...
                                </>
                            ) : (
                                <>
                                    Masuk sebagai {roleMode === "admin" ? "Admin / Staf" : "Teknisi"}
                                    <ArrowRight size={17} />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Tautan Registrasi via Token Undangan */}
                    <div className="mt-4 pt-3 border-t border-[#e1e8e2] flex items-center justify-between text-xs">
                        <span className="text-[#66736b]">Punya Token Undangan?</span>
                        <Link
                            to="/signup"
                            className="inline-flex items-center gap-1 font-semibold text-[#245c45] hover:underline"
                        >
                            <KeyRound size={13} /> Aktivasi via Token
                        </Link>
                    </div>

                    {/* 1-Click Demo Staff Accounts */}
                    <div className="mt-4 pt-3.5 border-t border-[#e1e8e2] space-y-2.5">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-[#66736b]">
                                Akses Cepat Akun Demo (1-Klik)
                            </span>
                            <span className="text-[10px] text-[#87928b]">5 Peran Sistem</span>
                        </div>

                        <div className="grid grid-cols-2 gap-1.5">
                            {QUICK_DEMO_ACCOUNTS.map(acc => (
                                <button
                                    key={acc.email}
                                    type="button"
                                    disabled={loading}
                                    onClick={() => handleQuickLogin(acc.email, acc.pw, acc.group)}
                                    className={`flex flex-col items-start justify-between p-2 rounded-[10px] border text-left transition-all cursor-pointer ${
                                        email === acc.email
                                            ? "border-[#245c45] bg-[#e8f1eb]/60"
                                            : "border-[#e1e8e2] bg-white hover:bg-[#f6f8f6]"
                                    }`}
                                >
                                    <div className="flex items-center justify-between w-full gap-1 mb-0.5">
                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#eff3f0] text-[#245c45]">
                                            {acc.roleBadge}
                                        </span>
                                        <UserCheck size={11} className="text-[#87928b]" />
                                    </div>
                                    <div className="font-semibold text-[11px] text-[#17231c] truncate w-full">{acc.label}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <p className="text-center text-xs text-[#66736b] mt-5">
                        Akses bermasalah? Hubungi Admin Operasional.
                    </p>
                </div>
            </section>
        </main>
    );
}
