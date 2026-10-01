/**
 * Sidebar — ERP-style
 *
 * Behaviour:
 * - Desktop: sticky h-screen, overflow-y auto (sidebar scrolls independently)
 * - Dropdown groups: CLOSED by default, only the group that contains the
 *   active route auto-opens on first render (mirrors SAP / Odoo / Oracle pattern)
 * - Click grup → toggle open/close
 * - Active item highlighted; active group header shows accent even when collapsed
 */

import { useState, useMemo, useEffect } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../store/authStore";
import type { UserRole } from "../../types";
import { ROLE_LABELS, cn } from "../../lib/utils";
import {
    Send, ClipboardList, LayoutDashboard, FileText, Users,
    DollarSign, Settings, LogOut, ShieldCheck,
    TrendingUp, User, Hash, Menu, X, ChevronRight,
    ShoppingBag, BarChart3, Cog, UserCircle, Package,
} from "lucide-react";

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface NavItem {
    to: string;
    icon: React.ReactNode;
    label: string;
    roles: UserRole[];
}

interface NavGroupDef {
    type: "group";
    label: string;
    icon: React.ReactNode;
    items: NavItem[];
}

interface NavStandalone extends NavItem {
    type?: undefined;
}

type NavSection = NavGroupDef | NavStandalone;

// ─── NAV STRUCTURE ────────────────────────────────────────────────────────────

const NAV_SECTIONS: NavSection[] = [
    {
        to: "/dashboard",
        icon: <LayoutDashboard size={17} />,
        label: "Dashboard",
        roles: ["ADMIN", "MARKETING", "TEKNISI_LAPANGAN"],
    },
    {
        to: "/executor",
        icon: <ShieldCheck size={17} />,
        label: "Mode Lapangan",
        roles: ["TEKNISI_LAPANGAN", "ADMIN"],
    },

    {
        type: "group",
        label: "Penjualan",
        icon: <ShoppingBag size={16} />,
        items: [
            { to: "/quotations", icon: <FileText size={15} />,     label: "Quotation",        roles: ["ADMIN", "MARKETING", "ADMIN"] },
            { to: "/status-ph",  icon: <Send size={15} />,          label: "Status Penawaran", roles: ["ADMIN"] },
            { to: "/tracking",   icon: <ClipboardList size={15} />, label: "Tracking Order",   roles: ["ADMIN"] },
        ],
    },
    {
        type: "group",
        label: "Klien",
        icon: <Users size={16} />,
        items: [
            { to: "/customers", icon: <Users size={15} />, label: "Pelanggan", roles: ["ADMIN", "MARKETING"] },
            { to: "/kontrol-rayap", icon: <ShieldCheck size={15} />, label: "Kontrol Rayap", roles: ["ADMIN", "MARKETING"] },
        ],
    },
    {
        type: "group",
        label: "Laporan",
        icon: <BarChart3 size={16} />,
        items: [
            { to: "/cashflow",        icon: <DollarSign size={15} />, label: "Cashflow",        roles: ["ADMIN"] },
            { to: "/performance",     icon: <TrendingUp size={15} />, label: "Performa",        roles: ["ADMIN"] },
            { to: "/nomor-surat-log", icon: <Hash size={15} />,       label: "Log Nomor Surat", roles: ["ADMIN"] },
        ],
    },
    {
        type: "group",
        label: "Manajemen",
        icon: <Cog size={16} />,
        items: [
            { to: "/inventory", icon: <Package size={15} />, label: "Gudang & Stok", roles: ["ADMIN"] },
            { to: "/team",     icon: <Users size={15} />,    label: "Tim",        roles: ["ADMIN"] },
            { to: "/settings", icon: <Settings size={15} />, label: "Pengaturan", roles: ["ADMIN"] },
        ],
    },
    {
        type: "group",
        label: "Akun",
        icon: <UserCircle size={16} />,
        items: [
            { to: "/profile", icon: <User size={15} />, label: "Profil Saya", roles: ["ADMIN", "MARKETING", "TEKNISI_LAPANGAN"] },
        ],
    },
];

// ─── UTIL ─────────────────────────────────────────────────────────────────────

function getActiveGroup(pathname: string): string | null {
    for (const section of NAV_SECTIONS) {
        if (section.type === "group") {
            if ((section as NavGroupDef).items.some(i => pathname.startsWith(i.to))) {
                return section.label;
            }
        }
    }
    return null;
}

// ─── SIDEBAR CONTENT ──────────────────────────────────────────────────────────

function SidebarContent({ onNavClick }: { onNavClick?: () => void }) {
    const { user, setUser } = useAuthStore();
    const navigate           = useNavigate();
    const location           = useLocation();

    // Only the group that owns the current route starts open. Rest closed.
    const initialActive = useMemo(() => getActiveGroup(location.pathname), []);
    const [openGroups, setOpenGroups] = useState<Set<string>>(
        () => new Set(initialActive ? [initialActive] : [])
    );

    // When route changes, auto-open the matching group (without closing others)
    useEffect(() => {
        const ag = getActiveGroup(location.pathname);
        if (ag) {
            setOpenGroups(prev => {
                if (prev.has(ag)) return prev;
                return new Set([...prev, ag]);
            });
        }
    }, [location.pathname]);

    const toggleGroup = (label: string) => {
        setOpenGroups(prev => {
            const next = new Set(prev);
            if (next.has(label)) next.delete(label);
            else next.add(label);
            return next;
        });
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        setUser(null);
        navigate("/login");
    };

    return (
        <div className="flex flex-col h-full">

            {/* ── Brand ──────────────────────────────────────────────────────── */}
            <div className="flex items-center gap-3 px-4 h-16 border-b border-[var(--border-subtle)] shrink-0">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center shrink-0 shadow-md shadow-blue-200">
                    <ShieldCheck size={16} className="text-white" />
                </div>
                <div className="min-w-0">
                    <p className="text-[13px] font-extrabold text-[var(--text-primary)] leading-tight tracking-tight">ERP Pest Control</p>
                    <p className="text-[10px] text-[var(--text-muted)] leading-tight mt-0.5">Sistem Manajemen</p>
                </div>
            </div>

            {/* ── Scrollable nav ─────────────────────────────────────────────── */}
            <nav
                className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5"
                style={{ scrollbarWidth: "none" }}>

                {NAV_SECTIONS.map((section, idx) => {

                    // ── Standalone (Dashboard) ─────────────────────────────────
                    if (section.type !== "group") {
                        const item = section as NavStandalone;
                        if (!user || !item.roles.includes(user.role)) return null;
                        return (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                onClick={onNavClick}
                                className={({ isActive }) => cn(
                                    "flex items-center gap-3 h-9 px-3 rounded-lg text-[13px] font-medium transition-all duration-150 group",
                                    isActive
                                        ? "bg-blue-600 text-white shadow-sm"
                                        : "text-slate-600 hover:bg-slate-100 hover:text-[var(--text-primary)]"
                                )}>
                                {({ isActive }) => (
                                    <>
                                        <span className={cn(
                                            "shrink-0 transition-colors",
                                            isActive ? "text-white" : "text-[var(--text-muted)] group-hover:text-slate-600"
                                        )}>
                                            {item.icon}
                                        </span>
                                        <span className="truncate">{item.label}</span>
                                    </>
                                )}
                            </NavLink>
                        );
                    }

                    // ── Group ──────────────────────────────────────────────────
                    const group        = section as NavGroupDef;
                    const visibleItems = group.items.filter(i => user && i.roles.includes(user.role));
                    if (visibleItems.length === 0) return null;

                    const isOpen    = openGroups.has(group.label);
                    const hasActive = visibleItems.some(i => location.pathname.startsWith(i.to));

                    return (
                        <div key={`group-${idx}`} className="mt-1 first:mt-0">

                            {/* Group toggle button */}
                            <button
                                onClick={() => toggleGroup(group.label)}
                                className={cn(
                                    "w-full flex items-center gap-2.5 h-9 px-3 rounded-lg text-left transition-all duration-150 group select-none",
                                    isOpen
                                        ? "bg-slate-100 text-slate-700"
                                        : hasActive
                                            ? "text-[var(--accent-text)] hover:bg-[var(--accent-glow)]"
                                            : "text-[var(--text-secondary)] hover:bg-slate-100 hover:text-slate-700"
                                )}>

                                {/* Icon */}
                                <span className={cn(
                                    "shrink-0 transition-colors",
                                    isOpen   ? "text-[var(--text-secondary)]"
                                    : hasActive ? "text-blue-500"
                                    : "text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]"
                                )}>
                                    {group.icon}
                                </span>

                                {/* Label */}
                                <span className={cn(
                                    "flex-1 text-[11px] font-bold uppercase tracking-widest truncate",
                                    isOpen ? "text-slate-600" : hasActive ? "text-[var(--accent-text)]" : ""
                                )}>
                                    {group.label}
                                </span>

                                {/* Blue dot — visible only when collapsed + has active child */}
                                {hasActive && !isOpen && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-glow)]0 shrink-0" />
                                )}

                                {/* Chevron rotates 90° when open */}
                                <ChevronRight
                                    size={13}
                                    className={cn(
                                        "shrink-0 text-[var(--text-muted)] transition-transform duration-200",
                                        isOpen ? "rotate-90" : ""
                                    )}
                                />
                            </button>

                            {/* Sub-items — height-based CSS animation */}
                            <div
                                className="overflow-hidden transition-all duration-200 ease-in-out"
                                style={{ maxHeight: isOpen ? `${visibleItems.length * 40}px` : "0px" }}>
                                <div className="mt-0.5 ml-4 pl-3 border-l-2 border-[var(--border-subtle)] space-y-0.5 pb-1">
                                    {visibleItems.map(item => (
                                        <NavLink
                                            key={item.to}
                                            to={item.to}
                                            onClick={onNavClick}
                                            className={({ isActive }) => cn(
                                                "flex items-center gap-2.5 h-9 px-3 rounded-lg text-[13px] font-medium transition-all duration-150 group",
                                                isActive
                                                    ? "bg-blue-600 text-white shadow-sm"
                                                    : "text-slate-600 hover:bg-slate-100 hover:text-[var(--text-primary)]"
                                            )}>
                                            {({ isActive }) => (
                                                <>
                                                    <span className={cn(
                                                        "shrink-0 transition-colors",
                                                        isActive ? "text-white" : "text-[var(--text-muted)] group-hover:text-slate-600"
                                                    )}>
                                                        {item.icon}
                                                    </span>
                                                    <span className="truncate">{item.label}</span>
                                                </>
                                            )}
                                        </NavLink>
                                    ))}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </nav>

            {/* ── User + Logout ───────────────────────────────────────────────── */}
            <div className="shrink-0 px-2 py-3 border-t border-[var(--border-subtle)] space-y-1">
                <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-[var(--bg-tertiary)]">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm">
                        {user?.name?.charAt(0).toUpperCase() ?? "U"}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold text-[var(--text-primary)] truncate leading-tight">{user?.name}</p>
                        <p className="text-[11px] text-[var(--text-muted)] truncate">{user ? ROLE_LABELS[user.role] : ""}</p>
                    </div>
                </div>
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-2.5 h-9 px-3 w-full rounded-lg text-[13px] font-medium text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors">
                    <LogOut size={15} className="shrink-0" />
                    Keluar
                </button>
            </div>
        </div>
    );
}

// ─── MOBILE TOPBAR ────────────────────────────────────────────────────────────

function MobileTopbar({ onOpen }: { onOpen: () => void }) {
    const location = useLocation();
    const { user } = useAuthStore();

    const pageTitle = useMemo(() => {
        for (const section of NAV_SECTIONS) {
            if (section.type !== "group") {
                const s = section as NavStandalone;
                if (location.pathname.startsWith(s.to)) return s.label;
            } else {
                const found = (section as NavGroupDef).items.find(i => location.pathname.startsWith(i.to));
                if (found) return found.label;
            }
        }
        return "ERP Pest Control";
    }, [location.pathname]);

    return (
        <div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-[var(--bg-card)]/95 backdrop-blur-md border-b border-slate-200 shadow-sm px-4 flex items-center gap-3 h-14">
            <button
                onClick={onOpen}
                className="p-2 -ml-1 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors active:scale-95"
                style={{ minWidth: 38, minHeight: 38 }}>
                <Menu size={20} />
            </button>
            <p className="flex-1 text-sm font-bold text-[var(--text-primary)] truncate">{pageTitle}</p>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                {user?.name?.charAt(0).toUpperCase() ?? "U"}
            </div>
        </div>
    );
}

// ─── MAIN EXPORT ──────────────────────────────────────────────────────────────

export function Sidebar() {
    const [mobileOpen, setMobileOpen] = useState(false);

    return (
        <>
            {/* ── Desktop sidebar — sticky h-screen, own scroll ────────────── */}
            <aside className="hidden md:flex flex-col w-60 h-screen sticky top-0 bg-[var(--bg-card)] border-r border-slate-200 shadow-sm z-20">
                <SidebarContent />
            </aside>

            {/* ── Mobile topbar ─────────────────────────────────────────────── */}
            <MobileTopbar onOpen={() => setMobileOpen(true)} />

            {/* ── Mobile backdrop ───────────────────────────────────────────── */}
            <div
                onClick={() => setMobileOpen(false)}
                className={cn(
                    "md:hidden fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm transition-opacity duration-300",
                    mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                )}
            />

            {/* ── Mobile drawer ─────────────────────────────────────────────── */}
            <div className={cn(
                "md:hidden fixed top-0 left-0 bottom-0 z-50 w-72 bg-[var(--bg-card)] shadow-2xl flex flex-col",
                "transform transition-transform duration-300 ease-in-out",
                mobileOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                {/* Drawer header */}
                <div className="flex items-center justify-between px-4 border-b border-[var(--border-subtle)] h-14 shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center shadow-md shadow-blue-200">
                            <ShieldCheck size={14} className="text-white" />
                        </div>
                        <p className="text-[13px] font-extrabold text-[var(--text-primary)] tracking-tight">ERP Pest Control</p>
                    </div>
                    <button
                        onClick={() => setMobileOpen(false)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-[var(--text-secondary)] transition-colors active:scale-95">
                        <X size={18} />
                    </button>
                </div>

                {/* Scrollable content */}
                <div className="flex-1 overflow-y-auto" style={{ paddingBottom: "env(safe-area-inset-bottom, 16px)" }}>
                    <SidebarContent onNavClick={() => setMobileOpen(false)} />
                </div>
            </div>
        </>
    );
}