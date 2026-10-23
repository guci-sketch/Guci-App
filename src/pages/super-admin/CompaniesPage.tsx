import React, { useState, useEffect } from "react";
import {
    Building2, Plus, RefreshCw, CheckCircle2, XCircle,
    AlertCircle, Loader2, ShieldCheck, Users, Crown, Lock, Unlock,
} from "lucide-react";
import {
    getCompanies, setCompanyStatus, createCompany,
} from '@/shared/api/companyService';
import { getUsersByCompany, setUserActive } from '@/shared/api/userService';
import { useAuthStore } from '@/app/store/authStore';
import type { Company, AppUser } from '@/entities/types';

export function CompaniesPage() {
    const { user, activeCompanyId, setActiveCompanyId } = useAuthStore();
    const [companies, setCompanies] = useState<Company[]>([]);
    const [selectedCompanyUsers, setSelectedCompanyUsers] = useState<Record<string, AppUser[]>>({});
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [showAdd, setShowAdd] = useState(false);
    const [newName, setNewName] = useState("");
    const [newPlan, setNewPlan] = useState<"free" | "pro">("pro");
    const [error, setError] = useState("");

    const load = async () => {
        setLoading(true);
        setError("");
        try {
            const list = await getCompanies();
            setCompanies(list);
            const usersMap: Record<string, AppUser[]> = {};
            for (const c of list) {
                try {
                    usersMap[c.id] = await getUsersByCompany(c.id);
                } catch {
                    usersMap[c.id] = [];
                }
            }
            setSelectedCompanyUsers(usersMap);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Gagal memuat daftar perusahaan SaaS.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void load();
    }, []);

    const handleChangeCompanyStatus = async (companyId: string, status: "ACTIVE" | "TRIAL" | "SUSPENDED" | "EXPIRED") => {
        setBusyId(companyId);
        try {
            await setCompanyStatus(companyId, status);
            await load();
        } catch (e) {
            alert(e instanceof Error ? e.message : "Gagal mengubah status perusahaan.");
        } finally {
            setBusyId(null);
        }
    };

    const handleToggleSuperadminUser = async (u: AppUser) => {
        if (u.email.toLowerCase() === "lieziragroup@gmail.com") return;
        setBusyId(u.uid);
        try {
            await setUserActive(u.uid, !u.isActive);
            await load();
        } catch (e) {
            alert(e instanceof Error ? e.message : "Gagal mengubah status akun.");
        } finally {
            setBusyId(null);
        }
    };

    const handleCreateTenant = async () => {
        if (!newName.trim()) return;
        setBusyId("create");
        try {
            await createCompany({ name: newName.trim(), plan: newPlan, status: "ACTIVE" });
            setNewName("");
            setShowAdd(false);
            await load();
        } catch (e) {
            alert(e instanceof Error ? e.message : "Gagal membuat tenant perusahaan.");
        } finally {
            setBusyId(null);
        }
    };

    return (
        <div className="space-y-5">
            <div className="clean-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-emerald-200 bg-gradient-to-r from-emerald-50/70 via-white to-amber-50/40">
                <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-[var(--accent)] text-white flex items-center justify-center shrink-0 shadow-xs">
                        <Crown size={22} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-base sm:text-lg font-extrabold text-[var(--text-primary)]">
                                Master Super Admin — Kontrol Multi-Tenant SaaS FieldWork
                            </h1>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-800 text-white">
                                EKSKLUSIF: {user?.email}
                            </span>
                        </div>
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                            Kelola status langganan seluruh Perusahaan Tenant (Active, Trial, atau Suspend) serta kendalikan akun Superadmin (Direktur) masing-masing perusahaan.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <button
                        onClick={load}
                        className="p-2 rounded-xl border border-[var(--border-subtle)] bg-white text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
                        title="Segarkan Tenant"
                    >
                        <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
                    </button>
                    <button
                        onClick={() => setShowAdd(true)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-bold shadow-xs"
                    >
                        <Plus size={14} /> Tambah Perusahaan SaaS
                    </button>
                </div>
            </div>

            {error && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                    <AlertCircle size={15} /> {error}
                </div>
            )}

            {loading ? (
                <div className="py-16 text-center text-sm text-[var(--text-muted)] flex items-center justify-center gap-2">
                    <Loader2 size={18} className="animate-spin text-[var(--accent)]" /> Memuat daftar perusahaan tenant SaaS...
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {companies.map(c => {
                        const cUsers = selectedCompanyUsers[c.id] || [];
                        const directors = cUsers.filter(u => u.role === "SUPERADMIN" || u.role === "ADMIN");
                        const isCurrentTenant = activeCompanyId === c.id;
                        const st = c.status || (c.isActive ? "ACTIVE" : "SUSPENDED");

                        return (
                            <div
                                key={c.id}
                                className={`clean-card p-4 sm:p-5 space-y-4 border-l-4 ${
                                    st === "SUSPENDED"
                                        ? "border-l-red-600 bg-red-50/20"
                                        : st === "TRIAL"
                                        ? "border-l-amber-500"
                                        : "border-l-emerald-600"
                                }`}
                            >
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                                    <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <Building2 size={18} className="text-[var(--accent)]" />
                                            <h2 className="text-base font-bold text-[var(--text-primary)]">{c.name}</h2>
                                            <span className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-bold ${
                                                st === "ACTIVE"
                                                    ? "bg-emerald-100 text-emerald-800"
                                                    : st === "TRIAL"
                                                    ? "bg-amber-100 text-amber-800"
                                                    : "bg-red-600 text-white"
                                            }`}>
                                                {st === "ACTIVE" ? "ACTIVE (Aktif)" : st === "TRIAL" ? "TRIAL (Masa Uji)" : "SUSPENDED (Ditangguhkan)"}
                                            </span>
                                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                                PLAN: {c.plan.toUpperCase()}
                                            </span>
                                            {isCurrentTenant && (
                                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-700 text-white">
                                                    Sedang Dipantau
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-[var(--text-muted)] font-mono mt-1">
                                            Tenant ID: {c.id} • Total Akun Terdaftar: {cUsers.length} user
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-2 flex-wrap">
                                        <button
                                            type="button"
                                            onClick={() => setActiveCompanyId(c.id)}
                                            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                                                isCurrentTenant
                                                    ? "bg-slate-900 text-white border-slate-900"
                                                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                                            }`}
                                        >
                                            {isCurrentTenant ? "✓ Tenant Aktif" : "Masuk / Pantau Tenant Ini"}
                                        </button>

                                        {st !== "ACTIVE" && (
                                            <button
                                                type="button"
                                                disabled={busyId === c.id}
                                                onClick={() => handleChangeCompanyStatus(c.id, "ACTIVE")}
                                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                                            >
                                                <Unlock size={13} /> Aktifkan Perusahaan
                                            </button>
                                        )}

                                        {st !== "SUSPENDED" && (
                                            <button
                                                type="button"
                                                disabled={busyId === c.id}
                                                onClick={() => handleChangeCompanyStatus(c.id, "SUSPENDED")}
                                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold"
                                            >
                                                <Lock size={13} /> Suspend Perusahaan
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Daftar Akun Superadmin (Direktur) & Admin Perusahaan */}
                                <div className="pt-3 border-t border-[var(--border-subtle)] space-y-2">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
                                        <Users size={13} /> Akun Superadmin (Direktur) &amp; Staf Perusahaan ({cUsers.length})
                                    </span>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                        {cUsers.map(u => {
                                            const isOwner = u.email.toLowerCase() === "lieziragroup@gmail.com";
                                            return (
                                                <div
                                                    key={u.uid}
                                                    className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                                                        u.isActive ? "bg-white border-slate-200" : "bg-red-50/50 border-red-200"
                                                    }`}
                                                >
                                                    <div className="min-w-0">
                                                        <div className="font-bold text-[var(--text-primary)] truncate">{u.name}</div>
                                                        <div className="text-[10.5px] font-mono text-[var(--text-muted)] truncate">{u.email}</div>
                                                        <div className="flex items-center gap-1.5 mt-1">
                                                            <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-mono text-[9.5px] font-bold">
                                                                {u.role}
                                                            </span>
                                                            <span className={`px-1.5 py-0.2 rounded text-[9.5px] font-bold ${
                                                                u.isActive ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-700"
                                                            }`}>
                                                                {u.isActive ? "Aktif" : "Suspended"}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    {!isOwner && (
                                                        <button
                                                            type="button"
                                                            disabled={busyId === u.uid}
                                                            onClick={() => handleToggleSuperadminUser(u)}
                                                            className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold shrink-0 ${
                                                                u.isActive
                                                                    ? "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
                                                                    : "bg-emerald-600 text-white hover:bg-emerald-700"
                                                            }`}
                                                        >
                                                            {u.isActive ? "Suspend" : "Aktifkan"}
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {showAdd && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
                    <div className="clean-card max-w-md w-full p-6 space-y-4">
                        <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                            <Building2 size={18} className="text-[var(--accent)]" /> Tambah Perusahaan Tenant SaaS Baru
                        </h3>
                        <div className="space-y-3 text-xs">
                            <div>
                                <label className="block font-bold text-[var(--text-secondary)] mb-1">Nama Perusahaan Tenant *</label>
                                <input
                                    value={newName}
                                    onChange={e => setNewName(e.target.value)}
                                    placeholder="Contoh: PT Mitra Pestindo Nusantara"
                                    className="w-full px-3 py-2 border border-[var(--border-subtle)] rounded-xl text-sm"
                                />
                            </div>
                            <div>
                                <label className="block font-bold text-[var(--text-secondary)] mb-1">Paket Langganan SaaS</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {(["pro", "free"] as const).map(p => (
                                        <button
                                            key={p}
                                            type="button"
                                            onClick={() => setNewPlan(p)}
                                            className={`py-2 rounded-xl border font-bold uppercase ${
                                                newPlan === p
                                                    ? "border-[var(--accent)] bg-[var(--accent-light)] text-[var(--accent)]"
                                                    : "border-slate-200 bg-white text-slate-600"
                                            }`}
                                        >
                                            {p === "pro" ? "PRO Enterprise" : "Basic / Trial"}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setShowAdd(false)}
                                className="flex-1 py-2.5 rounded-xl bg-[var(--bg-tertiary)] text-xs font-semibold text-[var(--text-secondary)]"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={handleCreateTenant}
                                disabled={busyId === "create"}
                                className="flex-1 py-2.5 rounded-xl bg-[var(--accent)] text-white text-xs font-bold"
                            >
                                {busyId === "create" ? "Menyimpan..." : "Buat Tenant SaaS"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
