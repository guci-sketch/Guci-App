import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Outlet, Navigate } from "react-router-dom";
import { signOut } from "../../lib/firebase";
import { auth } from "../../lib/firebase";
import { useAuthStore } from "../../store/authStore";
import { Building2, LogOut, ShieldCheck, Menu, X } from "lucide-react";

export function SuperAdminLayout() {
    const { user, setUser, loading } = useAuthStore();
    const navigate = useNavigate();
    const [mobileOpen, setMobileOpen] = useState(false);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-900">
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
        );
    }

    if (!user) return <Navigate to="/login" replace />;
    if (user.role !== "SUPERADMIN") return <Navigate to="/dashboard" replace />;

    const handleLogout = async () => {
        await signOut(auth);
        setUser(null);
        navigate("/login");
    };

    const SidebarContent = ({ onNavClick }: { onNavClick?: () => void }) => (
        <>
            {/* Brand */}
            <div className="px-5 py-5 border-b border-slate-800">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                        <ShieldCheck size={16} className="text-white" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-white leading-tight">Super Admin</p>
                        <p className="text-xs text-slate-400">ERP Pest Control</p>
                    </div>
                </div>
            </div>
            {/* Nav */}
            <nav className="flex-1 px-3 py-4 space-y-0.5">
                <NavLink
                    to="/super-admin/companies"
                    onClick={onNavClick}
                    className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive
                            ? "bg-indigo-600 text-white"
                            : "text-slate-400 hover:bg-slate-800 hover:text-white"
                        }`
                    }
                >
                    <Building2 size={17} />
                    Perusahaan
                </NavLink>
            </nav>
            {/* User info + logout */}
            <div className="px-3 py-4 border-t border-slate-800">
                <div className="px-3 py-2 mb-1">
                    <p className="text-sm font-semibold text-white truncate">{user.name}</p>
                    <p className="text-xs text-slate-400">Super Admin</p>
                </div>
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-medium text-red-400 hover:bg-red-900/30 transition-colors"
                >
                    <LogOut size={17} />
                    Keluar
                </button>
            </div>
        </>
    );

    return (
        <div className="flex min-h-screen bg-slate-950">
            {/* Desktop Sidebar */}
            <aside className="hidden md:flex w-56 min-h-screen bg-slate-900 border-r border-slate-800 flex-col sticky top-0">
                <SidebarContent />
            </aside>

            {/* Mobile Topbar */}
            <div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center gap-3">
                <button onClick={() => setMobileOpen(true)} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 transition-colors">
                    <Menu size={20} />
                </button>
                <p className="flex-1 text-sm font-bold text-white">Super Admin</p>
                <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {user?.name?.charAt(0).toUpperCase() ?? "S"}
                </div>
            </div>

            {/* Mobile backdrop */}
            {mobileOpen && (
                <div className="md:hidden fixed inset-0 z-40 bg-slate-900/70 backdrop-blur-sm"
                    onClick={() => setMobileOpen(false)} />
            )}

            {/* Mobile drawer */}
            <div className={`md:hidden fixed top-0 left-0 bottom-0 z-50 w-64 bg-slate-900 shadow-2xl flex flex-col transform transition-transform duration-300 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
                    <p className="text-sm font-bold text-white">Super Admin</p>
                    <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 transition-colors">
                        <X size={18} />
                    </button>
                </div>
                <div className="flex-1 flex flex-col overflow-y-auto">
                    <SidebarContent onNavClick={() => setMobileOpen(false)} />
                </div>
            </div>

            {/* Main */}
            <main className="flex-1 overflow-auto bg-slate-50 pt-14 md:pt-0">
                <Outlet />
            </main>
        </div>
    );
}
