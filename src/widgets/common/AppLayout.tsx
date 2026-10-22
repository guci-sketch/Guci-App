import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/shared/lib/utils';
import { X } from 'lucide-react';
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
    const isSidebarOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;

    const setSidebarOpen = (val: boolean) => {
        setInternalOpen(val);
        onSidebarOpenChange?.(val);
    };

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
        onTabChange(id);
        setSidebarOpen(false);
    };

    // Kelompokkan item sidebar berdasarkan properti `group` agar mudah dipindai saat QA
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
            {header}

            <div className="flex flex-1 overflow-hidden relative">
                {/* Mobile & Tablet Drawer Backdrop */}
                <AnimatePresence>
                    {isSidebarOpen && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-40 bg-black/45 backdrop-blur-[2px] lg:hidden"
                            onClick={() => setSidebarOpen(false)}
                        />
                    )}
                </AnimatePresence>

                {/* Sidebar: Expandable Rail on Desktop (lg:) + Slide-Over Drawer on Mobile & Tablet */}
                <aside
                    className={cn(
                        'fixed inset-y-0 left-0 z-50 bg-white border-r border-[#e8e5e0] flex flex-col transition-all duration-300 ease-out shadow-2xl lg:shadow-none',
                        'w-72 lg:w-[76px] lg:hover:w-72 group',
                        isSidebarOpen ? 'translate-x-0 lg:w-72' : '-translate-x-full lg:translate-x-0'
                    )}
                >
                    {/* Sidebar Header */}
                    <div className="px-4 py-3.5 border-b border-[#e8e5e0] flex items-center justify-between min-h-[64px]">
                        <div className="flex items-center gap-3 overflow-hidden">
                            <div className="w-9 h-9 rounded-xl bg-[var(--accent)] text-white flex items-center justify-center font-extrabold text-xs shrink-0 shadow-xs">
                                GP
                            </div>
                            <div
                                className={cn(
                                    'transition-opacity duration-200 overflow-hidden',
                                    isSidebarOpen ? 'opacity-100' : 'opacity-100 lg:opacity-0 lg:group-hover:opacity-100'
                                )}
                            >
                                {sidebarHeader}
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => setSidebarOpen(false)}
                            className="lg:hidden w-8 h-8 rounded-lg border border-[#e8e5e0] flex items-center justify-center text-[#5a554f] hover:bg-[#f5f3ef]"
                            aria-label="Tutup Sidebar"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    {/* Grouped Navigation List */}
                    <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-4 no-scrollbar">
                        {groupedItems.map(group => (
                            <div key={group.name} className="space-y-1">
                                <div
                                    className={cn(
                                        'px-2.5 text-[10px] font-extrabold uppercase tracking-wider text-[#8a8580] truncate transition-opacity duration-200',
                                        isSidebarOpen
                                            ? 'opacity-100'
                                            : 'opacity-100 lg:opacity-0 lg:group-hover:opacity-100'
                                    )}
                                >
                                    {group.name}
                                </div>

                                {group.items.map(item => {
                                    const active = activeTab === item.id;
                                    const danger = item.danger;
                                    return (
                                        <button
                                            key={item.id}
                                            type="button"
                                            onClick={() => handleTabClick(item.id)}
                                            title={item.label}
                                            className={cn(
                                                'w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 relative group/btn cursor-pointer',
                                                active
                                                    ? danger
                                                        ? 'bg-rose-50 text-rose-700 font-bold'
                                                        : 'bg-[var(--accent-glow)] text-[var(--accent)] font-bold'
                                                    : 'text-[#5a554f] hover:bg-[#f5f3ef] hover:text-[#2d2a26]'
                                            )}
                                        >
                                            {active && (
                                                <motion.div
                                                    layoutId="sidebar-active-indicator"
                                                    className={cn(
                                                        'absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full',
                                                        danger ? 'bg-rose-500' : 'bg-[var(--accent)]'
                                                    )}
                                                />
                                            )}
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div
                                                    className={cn(
                                                        'flex items-center justify-center min-w-[24px] shrink-0',
                                                        active
                                                            ? danger
                                                                ? 'text-rose-600'
                                                                : 'text-[var(--accent)]'
                                                            : 'text-[#8a8580] group-hover/btn:text-[var(--accent)]'
                                                    )}
                                                >
                                                    {item.icon}
                                                </div>
                                                <span
                                                    className={cn(
                                                        'whitespace-nowrap truncate transition-all duration-200',
                                                        isSidebarOpen
                                                            ? 'opacity-100 translate-x-0'
                                                            : 'opacity-100 lg:opacity-0 lg:-translate-x-2 lg:group-hover:opacity-100 lg:group-hover:translate-x-0'
                                                    )}
                                                >
                                                    {item.label}
                                                </span>
                                            </div>

                                            {item.badge !== undefined && item.badge !== 0 && item.badge !== '0' && (
                                                <span
                                                    className={cn(
                                                        'px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 transition-opacity duration-200',
                                                        active
                                                            ? danger
                                                                ? 'bg-rose-200 text-rose-800'
                                                                : 'bg-emerald-200 text-emerald-900'
                                                            : 'bg-slate-200 text-slate-700',
                                                        isSidebarOpen ? 'opacity-100' : 'opacity-100 lg:opacity-0 lg:group-hover:opacity-100'
                                                    )}
                                                >
                                                    {item.badge}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </aside>

                {/* Main Content Area (Leaves bottom padding pb-24 for Dynamic Floating Bottom Pill) */}
                <main
                    className={cn(
                        'flex-1 overflow-y-auto relative bg-[var(--bg-primary)] page-fade-in w-full pb-24 transition-all duration-300',
                        isSidebarOpen ? 'lg:ml-72' : 'lg:ml-[76px]'
                    )}
                >
                    {children}
                </main>
            </div>

            {/* Dynamic Floating Bottom Pill (Barventis Style) */}
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