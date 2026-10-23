import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/shared/lib/utils';
import { X, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { DynamicIslandNav, NavItem } from './DynamicIslandNav';

export interface SidebarItem {
    id: string;
    label: string;
    shortLabel?: string;
    group?: string;
    icon: React.ReactNode;
    danger?: boolean;
    badge?: number | string;
}

export interface AppLayoutProps {
    sidebarItems: SidebarItem[];
    activeTab: string;
    onTabChange: (id: string) => void;
    header: React.ReactNode;
    sidebarHeader: React.ReactNode;
    children: React.ReactNode;
    dynamicIslandItems?: NavItem[];
    isSidebarOpen?: boolean;
    onSidebarOpenChange?: (open: boolean) => void;
}

/**
 * AppLayout FieldWork — Responsive Multi-Device (Desktop, Tablet, & Mobile):
 * - Desktop (Mouse Hover): Rail kiri 56px melebar halus ke 252px saat hover (`cubic-bezier(0.16, 1, 0.3, 1)`, 200ms)
 *   atau dapat dikunci tetap terbuka (Stay Open).
 * - Tablet View (Touch Screen 768px - 1180px): Karena perangkat Tablet tidak memiliki hover kursor, tersedia tombol
 *   Hamburger ("Menu") di Header dan tombol Toggle di atas rail yang membuka Sidebar secara penuh (252px) dan
 *   tetap terbuka (Stay / Absolute Overlay) sampai pengguna memilih menu atau menutupnya.
 * - Mobile View (< 768px): Slide-over drawer 260px + Floating Bottom Navigation Pill.
 */
export function AppLayout({
    sidebarItems,
    activeTab,
    onTabChange,
    header,
    sidebarHeader,
    children,
    dynamicIslandItems,
    isSidebarOpen: controlledOpen,
    onSidebarOpenChange,
}: AppLayoutProps) {
    const [internalOpen, setInternalOpen] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [isTouchDevice, setIsTouchDevice] = useState(false);
    const [isPinnedDesktop, setIsPinnedDesktop] = useState<boolean>(() => {
        try {
            const saved = localStorage.getItem('gep_sidebar_pinned');
            if (saved !== null) return saved === 'true';
            // Pada perangkat Tablet layar sentuh (>= 768px & <= 1180px), default stay open jika dibuka
            return false;
        } catch {
            return false;
        }
    });
    const hoverTimeoutRef = useRef<number | null>(null);

    useEffect(() => {
        if (typeof window !== 'undefined' && window.matchMedia) {
            const touchMatch = window.matchMedia('(hover: none), (pointer: coarse)').matches;
            setIsTouchDevice(touchMatch);
        }
    }, []);

    const isSidebarOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
    // Sidebar tampil penuh (252px) jika dibuka via Hamburger (Mobile/Tablet), sedang di-hover (Desktop), atau di-Pin (Stay Open)
    const isExpanded = isSidebarOpen || isHovered || isPinnedDesktop;

    const setSidebarOpen = (val: boolean) => {
        setInternalOpen(val);
        onSidebarOpenChange?.(val);
    };

    const togglePinDesktop = () => {
        const next = !isPinnedDesktop;
        setIsPinnedDesktop(next);
        try {
            localStorage.setItem('gep_sidebar_pinned', String(next));
        } catch {
            // ignore storage errors
        }
    };

    const handleMouseEnter = () => {
        if (typeof window !== 'undefined' && (window.innerWidth < 1024 || isTouchDevice)) return;
        if (hoverTimeoutRef.current) window.clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = window.setTimeout(() => {
            setIsHovered(true);
        }, 35);
    };

    const handleMouseLeave = () => {
        if (hoverTimeoutRef.current) {
            window.clearTimeout(hoverTimeoutRef.current);
            hoverTimeoutRef.current = null;
        }
        setIsHovered(false);
    };

    useEffect(() => {
        return () => {
            if (hoverTimeoutRef.current) window.clearTimeout(hoverTimeoutRef.current);
        };
    }, []);

    // Edge Swipe Gesture for Mobile & Tablet (< 1024px)
    useEffect(() => {
        let touchStartX = 0;
        let touchStartY = 0;
        let touchStartTime = 0;
        let isTracking = false;

        const handleTouchStart = (e: TouchEvent) => {
            if (window.innerWidth >= 1024 || isSidebarOpen) return;
            const touch = e.touches[0];
            if (!touch) return;
            if (touch.clientX < 28) {
                isTracking = true;
                touchStartX = touch.clientX;
                touchStartY = touch.clientY;
                touchStartTime = Date.now();
            }
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (!isTracking) return;
            const touch = e.touches[0];
            if (!touch) return;
            const deltaX = touch.clientX - touchStartX;
            const deltaY = Math.abs(touch.clientY - touchStartY);
            if (deltaY > 25 && deltaX < 30) {
                isTracking = false;
            }
        };

        const handleTouchEnd = (e: TouchEvent) => {
            if (!isTracking) return;
            const touch = e.changedTouches[0];
            if (!touch) return;
            const deltaX = touch.clientX - touchStartX;
            const deltaTime = Math.max(1, Date.now() - touchStartTime);
            const velocity = deltaX / deltaTime;
            if (deltaX > 65 || velocity > 0.45) {
                setSidebarOpen(true);
            }
            isTracking = false;
        };

        document.addEventListener('touchstart', handleTouchStart, { passive: true });
        document.addEventListener('touchmove', handleTouchMove, { passive: true });
        document.addEventListener('touchend', handleTouchEnd);

        return () => {
            document.removeEventListener('touchstart', handleTouchStart);
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleTouchEnd);
        };
    }, [isSidebarOpen]);

    const handleTabClick = (id: string) => {
        // Pada Tablet landscape (layar sentuh >= 1024px), jika sidebar masih tertutup (56px), tap pertama membuka sidebar
        if (isTouchDevice && !isExpanded && typeof window !== 'undefined' && window.innerWidth >= 1024) {
            setSidebarOpen(true);
            return;
        }
        onTabChange(id);
        setSidebarOpen(false);
    };

    const groupedItems = React.useMemo(() => {
        const groups: { name: string; items: SidebarItem[] }[] = [];
        for (const item of sidebarItems) {
            const gName = item.group || 'MENU UTAMA';
            let existing = groups.find(g => g.name === gName);
            if (!existing) {
                existing = { name: gName, items: [] };
                groups.push(existing);
            }
            existing.items.push(item);
        }
        return groups;
    }, [sidebarItems]);

    return (
        <div className="flex flex-col h-screen bg-[var(--bg-primary)] font-sans overflow-hidden">
            {/* Header offset pada layar >= 1024px agar tombol Hamburger tidak pernah tertutup oleh rail sidebar */}
            <div
                className={cn(
                    ' transition-[padding] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] shrink-0',
                    isPinnedDesktop ? 'lg:pl-[252px]' : 'lg:pl-14'
                )}
            >
                {header}
            </div>

            <div className="flex flex-1 overflow-hidden relative">
                {/* Backdrop saat Sidebar dibuka secara Absolute/Overlay di Mobile maupun Tablet */}
                <AnimatePresence>
                    {isSidebarOpen && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.18, ease: 'easeOut' }}
                            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1.5px]"
                            onClick={() => setSidebarOpen(false)}
                        />
                    )}
                </AnimatePresence>

                {/* Supabase-Style Expandable Sidebar Rail + Tablet Stay/Absolute Support */}
                <motion.aside
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                    initial={false}
                    animate={{
                        width: isExpanded ? 252 : 56,
                    }}
                    transition={{
                        type: 'tween',
                        duration: 0.2,
                        ease: [0.16, 1, 0.3, 1],
                    }}
                    className={cn(
                        'fixed inset-y-0 left-0 z-50 bg-white border-r border-[#e8e5e0] flex flex-col select-none overflow-hidden',
                        'transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]',
                        isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
                        isExpanded && !isPinnedDesktop
                            ? 'shadow-[8px_0_30px_rgba(45,42,38,0.12)]'
                            : 'shadow-none'
                    )}
                >
                    {/* Top Brand Rail Header — Klik pada logo FW di Tablet/Desktop dapat membuka/mengunci Sidebar */}
                    <div className="h-12 px-2.5 border-b border-[#e8e5e0] flex items-center justify-between shrink-0">
                        <div className="flex items-center min-w-0">
                            <button
                                type="button"
                                onClick={() => {
                                    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                                        setSidebarOpen(!isSidebarOpen);
                                    } else {
                                        setSidebarOpen(!isSidebarOpen);
                                    }
                                }}
                                title="Buka / Tutup Detail Menu Sidebar"
                                className="w-9 h-9 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white flex items-center justify-center font-black text-xs shrink-0 shadow-2xs tracking-tighter cursor-pointer"
                            >
                                FW
                            </button>
                            <div
                                className={cn(
                                    'ml-2.5 overflow-hidden whitespace-nowrap transition-all duration-150 ease-out',
                                    isExpanded
                                        ? 'opacity-100 translate-x-0 w-[166px]'
                                        : 'opacity-0 -translate-x-1.5 w-0 pointer-events-none'
                                )}
                            >
                                {sidebarHeader}
                            </div>
                        </div>

                        {isExpanded && (
                            <button
                                type="button"
                                onClick={() => {
                                    setSidebarOpen(false);
                                    setIsHovered(false);
                                }}
                                className="lg:hidden w-7 h-7 rounded-lg border border-[#e8e5e0] flex items-center justify-center text-[#5a554f] hover:bg-[#f5f3ef] shrink-0"
                                aria-label="Tutup Menu"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    {/* Daftar Menu dengan Posisi Ikon Terkunci (Tidak Bergeser Saat Hover / Buka) */}
                    <div className="flex-1 overflow-y-auto overflow-x-hidden py-2 px-2 space-y-2 no-scrollbar">
                        {groupedItems.map((group, groupIdx) => (
                            <div key={group.name} className="space-y-0.5">
                                <div className="h-5 flex items-center px-1.5 overflow-hidden">
                                    {isExpanded ? (
                                        <span className="text-[9.5px] font-bold uppercase tracking-wider text-[#8a8580] whitespace-nowrap">
                                            {group.name}
                                        </span>
                                    ) : groupIdx > 0 ? (
                                        <div className="w-full h-px bg-[#e8e5e0]" />
                                    ) : (
                                        <div className="w-2 h-1 rounded-full bg-[#e8e5e0] mx-auto" />
                                    )}
                                </div>

                                {group.items.map(item => {
                                    const active = activeTab === item.id;
                                    const danger = item.danger;
                                    return (
                                        <button
                                            key={item.id}
                                            type="button"
                                            onClick={() => handleTabClick(item.id)}
                                            title={!isExpanded ? item.label : undefined}
                                            className={cn(
                                                'w-full h-9 flex items-center rounded-lg text-xs transition-colors duration-150 relative group/item cursor-pointer overflow-hidden',
                                                active
                                                    ? danger
                                                        ? 'bg-rose-50 text-rose-700 font-semibold'
                                                        : 'bg-[var(--accent-glow)] text-[var(--accent)] font-semibold'
                                                    : 'text-[#5a554f] hover:bg-[#f5f3ef] hover:text-[#2d2a26] font-medium'
                                            )}
                                        >
                                            {active && (
                                                <motion.div
                                                    layoutId="supabase-sidebar-active-pill"
                                                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                                                    className={cn(
                                                        'absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full',
                                                        danger ? 'bg-rose-500' : 'bg-[var(--accent)]'
                                                    )}
                                                />
                                            )}

                                            <div
                                                className={cn(
                                                    'w-9 h-9 flex items-center justify-center shrink-0 [&_svg]:w-[16px] [&_svg]:h-[16px] transition-transform duration-150 group-hover/item:scale-105',
                                                    active
                                                        ? danger
                                                            ? 'text-rose-600'
                                                            : 'text-[var(--accent)]'
                                                        : 'text-[#8a8580] group-hover/item:text-[#2d2a26]'
                                                )}
                                            >
                                                {item.icon}
                                            </div>

                                            <div
                                                className={cn(
                                                    'flex-1 flex items-center justify-between pr-2.5 min-w-0 overflow-hidden whitespace-nowrap transition-all duration-150 ease-out',
                                                    isExpanded
                                                        ? 'opacity-100 translate-x-0'
                                                        : 'opacity-0 -translate-x-1.5 pointer-events-none'
                                                )}
                                            >
                                                <span className="truncate">{item.label}</span>

                                                {item.badge !== undefined && item.badge !== 0 && item.badge !== '0' && (
                                                    <span
                                                        className={cn(
                                                            'ml-1.5 px-1.5 py-0.5 rounded-full text-[9.5px] font-bold shrink-0 leading-none',
                                                            active
                                                                ? danger
                                                                    ? 'bg-rose-200 text-rose-800'
                                                                    : 'bg-emerald-200 text-emerald-900'
                                                                : 'bg-slate-200 text-slate-700'
                                                        )}
                                                    >
                                                        {item.badge}
                                                    </span>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        ))}
                    </div>

                    {/* Footer Pengatur Sidebar (Bisa dikunci Stay Open di Tablet maupun Desktop) */}
                    <div className="flex h-10 px-2 border-t border-[#e8e5e0] items-center bg-[#faf9f7] shrink-0">
                        <button
                            type="button"
                            onClick={() => {
                                if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                                    setSidebarOpen(!isSidebarOpen);
                                } else {
                                    togglePinDesktop();
                                }
                            }}
                            title={isPinnedDesktop ? 'Ubah ke Mode Ringkas / Hover' : 'Kunci Sidebar Agar Tetap Terbuka (Stay Open)'}
                            className="w-full h-7 flex items-center rounded-md text-[11px] text-[#5a554f] hover:text-[#2d2a26] hover:bg-[#f5f3ef] transition-colors cursor-pointer overflow-hidden"
                        >
                            <div className="w-9 h-7 flex items-center justify-center shrink-0 text-[#8a8580]">
                                {isPinnedDesktop || isSidebarOpen ? <PanelLeftClose size={14} /> : <PanelLeftOpen size={14} />}
                            </div>
                            <span
                                className={cn(
                                    'whitespace-nowrap truncate transition-all duration-150 ease-out font-medium',
                                    isExpanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-1.5 pointer-events-none'
                                )}
                            >
                                {isPinnedDesktop ? 'Sidebar: Terkunci (Stay)' : 'Kunci Sidebar (Stay Open)'}
                            </span>
                        </button>
                    </div>
                </motion.aside>

                {/* Main Content Area: Responsive & Anti-Overlap */}
                <main
                    className={cn(
                        'flex-1 min-w-0 overflow-y-auto overflow-x-hidden relative bg-[var(--bg-primary)] page-fade-in w-full pb-24 transition-[margin] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]',
                        isPinnedDesktop ? 'lg:ml-[252px]' : 'lg:ml-14'
                    )}
                >
                    {children}
                </main>
            </div>

            {dynamicIslandItems && dynamicIslandItems.length > 0 && (
                <DynamicIslandNav
                    items={dynamicIslandItems}
                    activeTab={activeTab}
                    onTabChange={handleTabClick}
                />
            )}
        </div>
    );
}
