import React, { useRef, useEffect } from 'react';

export interface CapsuleTabItem {
    id: string;
    label: string;
    icon?: React.ReactNode;
    badge?: number | string;
    badgeTone?: 'default' | 'warning' | 'success' | 'danger';
}

export interface TabContainerProps {
    tabs: CapsuleTabItem[];
    activeTab: string;
    onChange: (tabId: string) => void;
    className?: string;
}

const BADGE_TONES: Record<NonNullable<CapsuleTabItem['badgeTone']>, string> = {
    default: 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]',
    warning: 'bg-amber-100 text-amber-800',
    success: 'bg-emerald-100 text-emerald-800',
    danger:  'bg-rose-100 text-rose-800',
};

/**
 * Komponen TabContainer bergaya Barventis:
 * Capsule container horizontal yang dapat di-scroll di mobile, otomatis memusatkan tab aktif,
 * dengan surface putih elevated pada tab yang sedang dipilih.
 */
export const TabContainer: React.FC<TabContainerProps> = ({
    tabs,
    activeTab,
    onChange,
    className = '',
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
        <div
            ref={containerRef}
            role="tablist"
            className={`flex items-center gap-1.5 p-1.5 rounded-2xl bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] overflow-x-auto no-scrollbar ${className}`}
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
                        className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all duration-200 btn-tactile ${
                            isActive
                                ? 'bg-[var(--bg-secondary)] text-[var(--accent)] shadow-sm border border-[var(--border-subtle)]'
                                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/60 border border-transparent'
                        }`}
                    >
                        {tab.icon && (
                            <span className={isActive ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}>
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
    );
};
