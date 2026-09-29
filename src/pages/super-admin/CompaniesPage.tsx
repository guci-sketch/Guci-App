import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
    Building2, Plus, RefreshCw, CheckCircle2, XCircle,
    AlertCircle, Loader2, ShieldCheck, Users,
} from "lucide-react";
import {
    getCompanies, setCompanyActive, createCompany,
} from "../../services/companyService";
import type { Company } from "../../types";

// ─── BADGE ───────────────────────────────────────────────────────────────────

function ActiveBadge({ isActive }: { isActive: boolean }) {
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold
            ${isActive ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-emerald-500" : "bg-red-500"}`} />
            {isActive ? "Aktif" : "Nonaktif"}
        </span>
    );
}

function PlanBadge({ plan }: { plan: Company["plan"] }) {
    return (
        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-bold
            ${plan === "pro" ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-500"}`}>
            {plan === "pro" ? "⭐ PRO" : "FREE"}
        </span>
    );
}

// ─── ADD COMPANY MODAL ───────────────────────────────────────────────────────

function AddCompanyModal({
    open, onClose, onSaved,
}: { open: boolean; onClose: () => void; onSaved: () => void }) {
    const [name, setName] = useState("");
    const [plan, setPlan] = useState<Company["plan"]>("free");
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState("");

    const handleSave = async () => {
        if (!name.trim()) { setErr("Nama perusahaan wajib diisi."); return; }
        setSaving(true);
        try {
            await createCompany({ name: name.trim(), plan });
            setName(""); setPlan("free"); setErr("");
            onSaved();
        } catch (e) {
            setErr(e instanceof Error ? e.message : "Gagal menyimpan.");
        } finally {
            setSaving(false);
        }
    };

    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl w-full max-w-md shadow-2xl p-6">
                <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Building2 size={18} className="text-indigo-600" /> Tambah Perusahaan
                </h3>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1.5">
                            Nama Perusahaan *
                        </label>
                        <input
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="PT Contoh Indonesia"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1.5">
                            Plan
                        </label>
                        <div className="flex gap-3">
                            {(["free", "pro"] as const).map(p => (
                                <button key={p} type="button" onClick={() => setPlan(p)}
                                    className={`flex-1 py-2 rounded-lg border text-sm font-semibold transition-all
                                        ${plan === p
                                            ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                                            : "border-slate-200 text-slate-500 hover:border-slate-300"}`}>
                                    {p === "pro" ? "⭐ PRO" : "FREE"}
                                </button>
                            ))}
                        </div>
                    </div>

                    {err && (
                        <p className="flex items-center gap-1.5 text-xs text-red-600">
                            <AlertCircle size={12} /> {err}
                        </p>
                    )}
                </div>

                <div className="flex justify-end gap-2 mt-6">
                    <button onClick={onClose}
                        className="px-4 py-2 text-sm rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 font-medium">
                        Batal
                    </button>
                    <button onClick={handleSave} disabled={saving}
                        className="px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
                        {saving && <Loader2 size={13} className="animate-spin" />}
                        Simpan
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── CONFIRM MODAL ───────────────────────────────────────────────────────────

function ConfirmModal({
    company, onClose, onConfirm,
}: { company: Company | null; onClose: () => void; onConfirm: () => void }) {
    if (!company) return null;
    const willActive = !company.isActive;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 mx-auto
                    ${willActive ? "bg-emerald-100" : "bg-red-100"}`}>
                    {willActive
                        ? <CheckCircle2 size={24} className="text-emerald-600" />
                        : <XCircle size={24} className="text-red-600" />}
                </div>
                <h3 className="text-base font-bold text-slate-900 text-center mb-2">
                    {willActive ? "Aktifkan Perusahaan?" : "Nonaktifkan Perusahaan?"}
                </h3>
                <p className="text-sm text-slate-500 text-center mb-6">
                    <strong>{company.name}</strong>
                    {willActive
                        ? " akan bisa mengakses sistem kembali."
                        : " dan semua user-nya tidak akan bisa login."}
                </p>
                <div className="flex gap-3">
                    <button onClick={onClose}
                        className="flex-1 py-2 text-sm rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 font-medium">
                        Batal
                    </button>
                    <button onClick={onConfirm}
                        className={`flex-1 py-2 text-sm rounded-lg text-white font-medium
                            ${willActive ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"}`}>
                        {willActive ? "Aktifkan" : "Nonaktifkan"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── MAIN PAGE ───────────────────────────────────────────────────────────────

export function CompaniesPage() {
    const navigate = useNavigate();
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(true);
    const [addOpen, setAddOpen] = useState(false);
    const [confirmTarget, setConfirmTarget] = useState<Company | null>(null);
    const [toggling, setToggling] = useState<string | null>(null);

    const load = async () => {
        setLoading(true);
        try {
            const data = await getCompanies();
            setCompanies(data);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const handleToggle = async () => {
        if (!confirmTarget) return;
        setToggling(confirmTarget.id);
        setConfirmTarget(null);
        try {
            await setCompanyActive(confirmTarget.id, !confirmTarget.isActive);
            await load();
        } finally {
            setToggling(null);
        }
    };

    const totalActive = companies.filter(c => c.isActive).length;
    const totalPro = companies.filter(c => c.plan === "pro").length;

    return (
        <div className="p-4 md:p-6 max-w-screen-lg mx-auto space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <Building2 size={20} className="text-indigo-600" />
                        Manajemen Perusahaan
                    </h1>
                    <p className="text-sm text-slate-400 mt-0.5">
                        Kelola akses perusahaan yang terdaftar di sistem
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={load}
                        className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors">
                        <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                    </button>
                    <button onClick={() => setAddOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors">
                        <Plus size={16} />
                        Tambah Perusahaan
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
                {[
                    { label: "Total Perusahaan", value: companies.length, color: "#4f46e5" },
                    { label: "Aktif", value: totalActive, color: "#059669" },
                    { label: "Plan PRO", value: totalPro, color: "#7c3aed" },
                ].map(s => (
                    <div key={s.label} className="bg-white border border-slate-200 rounded-xl p-4 text-center">
                        <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
                        <div className="text-xs text-slate-400 mt-1">{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Table */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-16 text-slate-400">
                        <Loader2 size={20} className="animate-spin mr-2" /> Memuat data...
                    </div>
                ) : companies.length === 0 ? (
                    <div className="text-center py-16 text-slate-400">
                        <Building2 size={36} className="mx-auto mb-3 opacity-30" />
                        <p className="font-medium text-slate-500">Belum ada perusahaan</p>
                        <p className="text-sm mt-1">Klik "Tambah Perusahaan" untuk mendaftarkan.</p>
                    </div>
                ) : (
                    <>
                    {/* Desktop table */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr>
                                    {["Perusahaan", "Plan", "Status", "Company ID", "User", "Aksi"].map(h => (
                                        <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-400 border-b border-slate-100 bg-slate-50 whitespace-nowrap">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {companies.map(company => (
                                    <tr key={company.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                                                    <ShieldCheck size={14} className="text-indigo-600" />
                                                </div>
                                                <div>
                                                    <div className="text-sm font-semibold text-slate-900">{company.name}</div>
                                                    {company.expiredAt && (
                                                        <div className="text-xs text-slate-400">
                                                            Exp: {company.expiredAt.toLocaleDateString("id-ID")}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <PlanBadge plan={company.plan} />
                                        </td>
                                        <td className="px-4 py-3">
                                            <ActiveBadge isActive={company.isActive} />
                                        </td>
                                        <td className="px-4 py-3">
                                            <code className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded font-mono">
                                                {company.id}
                                            </code>
                                        </td>
                                        <td className="px-4 py-3">
                                            <button
                                                onClick={() => navigate(`/super-admin/companies/${company.id}/users`)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors">
                                                <Users size={12} /> Kelola User
                                            </button>
                                        </td>
                                        <td className="px-4 py-3">
                                            <button
                                                onClick={() => setConfirmTarget(company)}
                                                disabled={toggling === company.id}
                                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors
                                                    ${company.isActive
                                                        ? "bg-red-50 text-red-600 hover:bg-red-100"
                                                        : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"}
                                                    disabled:opacity-40`}
                                            >
                                                {toggling === company.id
                                                    ? <Loader2 size={12} className="animate-spin" />
                                                    : company.isActive
                                                        ? <XCircle size={12} />
                                                        : <CheckCircle2 size={12} />}
                                                {toggling === company.id
                                                    ? "Memproses..."
                                                    : company.isActive ? "Nonaktifkan" : "Aktifkan"}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile cards */}
                    <div className="md:hidden divide-y divide-slate-100">
                        {companies.map(company => (
                            <div key={company.id} className="p-4 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                                    <ShieldCheck size={16} className="text-indigo-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-slate-900 truncate">{company.name}</p>
                                    {company.expiredAt && (
                                        <p className="text-xs text-slate-400">Exp: {company.expiredAt.toLocaleDateString("id-ID")}</p>
                                    )}
                                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                        <PlanBadge plan={company.plan} />
                                        <ActiveBadge isActive={company.isActive} />
                                    </div>
                                </div>
                                <div className="flex flex-col gap-1 shrink-0">
                                    <button onClick={() => navigate(`/super-admin/companies/${company.id}/users`)}
                                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors">
                                        <Users size={11} /> Users
                                    </button>
                                    <button onClick={() => setConfirmTarget(company)} disabled={toggling === company.id}
                                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-40 ${company.isActive ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"}`}>
                                        {toggling === company.id ? <Loader2 size={11} className="animate-spin" /> : company.isActive ? <XCircle size={11} /> : <CheckCircle2 size={11} />}
                                        {toggling === company.id ? "Proses..." : company.isActive ? "Nonaktifkan" : "Aktifkan"}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                    </>
                )}
            </div>

            {/* Modals */}
            <AddCompanyModal
                open={addOpen}
                onClose={() => setAddOpen(false)}
                onSaved={async () => { setAddOpen(false); await load(); }}
            />
            <ConfirmModal
                company={confirmTarget}
                onClose={() => setConfirmTarget(null)}
                onConfirm={handleToggle}
            />
        </div>
    );
}
