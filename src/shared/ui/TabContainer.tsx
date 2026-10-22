import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

export interface CapsuleTabItem {
    id: string;
    label: string;
    shortLabel?: string;
    icon?: React.ReactNode;
    badge?: number | string;
    badgeTone?: 'default' | 'warning' | 'success' | 'danger';
}

export interface TabContainerProps {
    tabs: CapsuleTabItem[];
    activeTab: string;
    onChange: (tabId: string) => void;
    className?: string;
    /** Tampilkan juga kapsul melayang di bawah layar seperti desain Barventis (default: true). */
    showFloatingBottom?: boolean;
}

const BADGE_TONES: Record<NonNullable<CapsuleTabItem['badgeTone']>, string> = {
    default: 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]',
    warning: 'bg-amber-100 text-amber-800',
    success: 'bg-emerald-100 text-emerald-800',
    danger:  'bg-rose-100 text-rose-800',
};

/**
 * Komponen TabContainer bergaya Barventis (sesuai screenshot referensi):
 * 1. Top Capsule Tab Bar: latar `#f5f3ef`, tab aktif putih bersih dengan teks & ikon hijau emerald.
 * 2. Dynamic Floating Bottom Pill: melayang di bawah tengah layar (`fixed bottom-5 left-1/2 -translate-x-1/2`),
 *    tab aktif berupa kapsul hijau solid (`bg-[var(--accent)] text-white`) berisi ikon + label singkat,
 *    dan tab lainnya berupa tombol ikon bundar.
 */
export const TabContainer: React.FC<TabContainerProps> = ({
    tabs,
    activeTab,
    onChange,
    className = '',
    showFloatingBottom = true,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

    useEffect(() => {
        const el = tabRefs.current[activeTab];
        const container = containerRef.current;
        if (el && container) {
            const left = el.offsetLeft - container.clientWidth / 2 + el.clientWidth / 2;
            container.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
        }
    }, [activeTab]);

    return (
        <>
            <div
                ref={containerRef}
                role="tablist"
                className={`inline-flex items-center gap-1 p-1.5 rounded-2xl bg-[#f5f3ef] border border-[#e8e5e0] max-w-full overflow-x-auto no-scrollbar ${className}`}
            >
                {tabs.map(tab => {
                    const isActive = tab.id === activeTab;
                    const tone = tab.badgeTone ?? 'default';
                    return (
                        <button
                            key={tab.id}
                            ref={el => { tabRefs.current[tab.id] = el; }}
                            type="button"
                            role="tab"
                            aria-selected={isActive}
                            onClick={() => onChange(tab.id)}
                            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm whitespace-nowrap transition-all duration-200 cursor-pointer ${
                                isActive
                                    ? 'bg-white text-[var(--accent)] font-bold shadow-xs border border-[#e8e5e0]'
                                    : 'text-[#5a554f] font-medium hover:text-[#2d2a26] hover:bg-white/60 border border-transparent'
                            }`}
                        >
                            {tab.icon && (
                                <span className={isActive ? 'text-[var(--accent)]' : 'text-[#8a8580]'}>
                                    {tab.icon}
                                </span>
                            )}
                            <span>{tab.label}</span>
                            {tab.badge !== undefined && tab.badge !== 0 && tab.badge !== '0' && (
                                <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold tabular-nums ${
                                        isActive && tone === 'default'
                                            ? 'bg-[var(--accent-glow)] text-[var(--accent)]'
                                            : BADGE_TONES[tone]
                                    }`}
                                >
                                    {tab.badge}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {showFloatingBottom && tabs.length > 1 && (
                <div
                    className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[75] pointer-events-auto max-w-[94vw]"
                    role="navigation"
                    aria-label="Sub-Tab Cepat"
                >
                    <motion.div
                        layout
                        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                        className="bg-white/95 backdrop-blur-md border border-[#e8e5e0] shadow-[0_12px_32px_rgba(45,42,38,0.14)] rounded-full p-1.5 flex items-center gap-1 overflow-x-auto no-scrollbar"
                    >
                        {tabs.map(tab => {
                            const isActive = tab.id === activeTab;
                            const shortText = tab.shortLabel || tab.label.split(' ')[0];
                            return (
                                <motion.button
                                    key={tab.id}
                                    layout
                                    type="button"
                                    onClick={() => onChange(tab.id)}
                                    title={tab.label}
                                    className={`relative flex items-center justify-center rounded-full transition-colors cursor-pointer select-none shrink-0 ${
                                        isActive
                                            ? 'bg-[var(--accent)] text-white px-4 py-2 gap-2 font-bold text-xs shadow-sm'
                                            : 'w-9 h-9 text-[#5a554f] hover:bg-[#f5f3ef] hover:text-[var(--accent)]'
                                    }`}
                                    style={{ touchAction: 'manipulation' }}
                                >
                                    {tab.icon && (
                                        <span className="flex items-center justify-center shrink-0">
                                            {tab.icon}
                                        </span>
                                    )}
                                    {isActive && (
                                        <span className="whitespace-nowrap tracking-tight">
                                            {shortText}
                                        </span>
                                    )}
                                </motion.button>
                            );
                        })}
                    </motion.div>
                </div>
            )}
        </>
    );
};
