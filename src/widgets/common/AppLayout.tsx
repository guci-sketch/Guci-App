import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/shared/lib/utils';
import { Menu } from 'lucide-react';
import { DynamicIslandNav, NavItem } from './DynamicIslandNav';

export interface SidebarItem {
    id: string;
    label: string;
    icon: React.ReactNode;
    danger?: boolean;
}

export interface AppLayoutProps {
    sidebarItems: SidebarItem[];
    activeTab: string;
    onTabChange: (id: string) => void;
    header: React.ReactNode;
    sidebarHeader: React.ReactNode;
    children: React.ReactNode;
    dynamicIslandItems?: NavItem[]; // Optional array if we want the island to match or subset sidebar
}

export function AppLayout({
    sidebarItems,
    activeTab,
    onTabChange,
    header,
    sidebarHeader,
    children,
    dynamicIslandItems
}: AppLayoutProps) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    // Edge Swipe & Gesture Engine for Mobile
    useEffect(() => {
        let touchStartX = 0;
        let touchStartY = 0;
        let touchStartTime = 0;
        let isTracking = false;
        let isLockedOut = false;

        const isConflictElement = (target: EventTarget | null) => {
            if (!target || !(target instanceof Element)) return false;
            return Boolean(
                target.closest(
                    '.table-container, table, tbody, thead, th, td, [role="grid"], [role="table"], ' +
                    '.overflow-x-auto, .overflow-auto, ' +
                    'input, textarea, select, button, input[type="range"]'
                )
            );
        };

        const handleTouchStart = (e: TouchEvent) => {
            if (window.innerWidth >= 1024 || isSidebarOpen) return;
            const touch = e.touches[0];
            if (!touch) return;

            if (isConflictElement(e.target)) {
                isLockedOut = true;
                return;
            }

            if (touch.clientX < 30) {
                isTracking = true;
                isLockedOut = false;
                touchStartX = touch.clientX;
                touchStartY = touch.clientY;
                touchStartTime = Date.now();
            }
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (!isTracking || isLockedOut) return;
            const touch = e.touches[0];
            if (!touch) return;

            const deltaX = touch.clientX - touchStartX;
            const deltaY = Math.abs(touch.clientY - touchStartY);

            // Cancel swipe if user scrolls vertically
            if (deltaY > 20 && deltaX < 30) {
                isTracking = false;
                return;
            }

            if (deltaX > 15) {
                e.preventDefault(); 
            }
        };

        const handleTouchEnd = (e: TouchEvent) => {
            if (!isTracking || isLockedOut) return;
            const touch = e.changedTouches[0];
            if (!touch) return;

            const deltaX = touch.clientX - touchStartX;
            const deltaTime = Date.now() - touchStartTime;
            const velocity = deltaX / deltaTime;

            // Trigger open if swiped far enough or fast enough
            if (deltaX > 60 || velocity > 0.4) {
                setIsSidebarOpen(true);
            }

            isTracking = false;
        };

        document.addEventListener('touchstart', handleTouchStart, { passive: true });
        document.addEventListener('touchmove', handleTouchMove, { passive: false });
        document.addEventListener('touchend', handleTouchEnd);

        return () => {
            document.removeEventListener('touchstart', handleTouchStart);
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleTouchEnd);
        };
    }, [isSidebarOpen]);

    const handleTabClick = (id: string) => {
        onTabChange(id);
        setIsSidebarOpen(false);
    };

    return (
        <div className="flex flex-col h-screen bg-[var(--bg-primary)] font-sans overflow-hidden">
            {header}

            <div className="flex flex-1 overflow-hidden relative">
                {/* Mobile Menu Overlay */}
                <AnimatePresence>
                    {isSidebarOpen && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
                            onClick={() => setIsSidebarOpen(false)}
                        />
                    )}
                </AnimatePresence>

                {/* Sidebar (Tablet Mini Hover & Mobile Swipe) */}
                <motion.aside
                    className={cn(
                        "absolute lg:fixed inset-y-0 left-0 z-50 bg-[var(--bg-secondary)] border-r border-[var(--border-subtle)] flex flex-col transition-all duration-300 ease-out shadow-2xl lg:shadow-none",
                        "lg:translate-x-0 w-64 lg:w-[72px] lg:hover:w-64 group"
                    )}
                    initial={false}
                    animate={{ x: isSidebarOpen || window.innerWidth >= 1024 ? 0 : '-100%' }}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                >
                    <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between min-h-[70px]">
                        <div className={cn("transition-opacity duration-300", "lg:opacity-0 lg:group-hover:opacity-100 opacity-100")}>
                            {sidebarHeader}
                        </div>
                        {/* Always show a menu icon on desktop when collapsed */}
                        <div className="hidden lg:flex items-center justify-center w-full absolute left-0 opacity-100 group-hover:opacity-0 transition-opacity pointer-events-none">
                            <Menu size={24} className="text-[var(--text-muted)]" />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 space-y-2 no-scrollbar">
                        {sidebarItems.map(item => {
                            const active = activeTab === item.id;
                            const danger = item.danger;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => handleTabClick(item.id)}
                                    className={cn(
                                        "w-full flex items-center px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 relative group/btn",
                                        active
                                            ? danger ? 'bg-rose-50 text-rose-700' : 'bg-[var(--accent-glow)] text-[var(--accent)]'
                                            : 'text-[var(--text-secondary)] hover:bg-[var(--accent-glow)] hover:text-[var(--accent)]'
                                    )}
                                    title={item.label}
                                >
                                    {active && (
                                        <motion.div
                                            layoutId="sidebar-active-indicator"
                                            className={cn("absolute left-0 top-0 bottom-0 w-1 rounded-r-full", danger ? 'bg-rose-500' : 'bg-[var(--accent)]')}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                        />
                                    )}
                                    <div className="flex items-center gap-3">
                                        <div className={cn("flex items-center justify-center min-w-[24px]", active ? (danger ? 'text-rose-600' : 'text-[var(--accent)]') : 'text-[var(--text-muted)] group-hover/btn:text-[var(--accent)]')}>
                                            {item.icon}
                                        </div>
                                        <span className={cn(
                                            "whitespace-nowrap transition-all duration-300",
                                            "lg:opacity-0 lg:-translate-x-2 lg:group-hover:opacity-100 lg:group-hover:translate-x-0 opacity-100 translate-x-0"
                                        )}>
                                            {item.label}
                                        </span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </motion.aside>

                {/* Main Content Area */}
                <motion.main layout className="flex-1 overflow-y-auto relative bg-[var(--bg-primary)] page-fade-in w-full pb-20 lg:pb-0 transition-all duration-300 lg:ml-[72px]">
                    {/* Header trigger for mobile sidebar */}
                    <div className="lg:hidden absolute top-4 left-4 z-30">
                        <button onClick={() => setIsSidebarOpen(true)} className="p-2 bg-[var(--bg-secondary)] rounded-lg shadow-sm border border-[var(--border-subtle)] text-[var(--text-secondary)]">
                            <Menu size={20} />
                        </button>
                    </div>
                    {children}
                </motion.main>
            </div>

            {/* Dynamic Island Sub-Nav (Mobile) */}
            {dynamicIslandItems && dynamicIslandItems.length > 0 && (
                <DynamicIslandNav 
                    items={dynamicIslandItems} 
                    activeTab={activeTab} 
                    onTabChange={onTabChange} 
                />
            )}
        </div>
    );
}