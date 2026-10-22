import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/shared/lib/utils';

export interface NavItem {
    id: string;
    label: string;
    shortLabel?: string;
    icon: React.ElementType | React.ReactNode;
}

export interface DynamicIslandNavProps {
    items: NavItem[];
    activeTab: string;
    onTabChange: (id: string) => void;
}

function renderNavIcon(icon: React.ElementType | React.ReactNode, size = 16) {
    if (!icon) return null;
    if (React.isValidElement(icon)) return icon;
    if (typeof icon === 'function' || (typeof icon === 'object' && icon !== null)) {
        const IconComp = icon as React.ElementType;
        return <IconComp size={size} />;
    }
    return null;
}

/**
 * Dynamic Floating Bottom Pill bergaya Barventis (sesuai referensi UI/UX):
 * - Selalu tampil melayang di tengah bawah layar (`fixed bottom-5 left-1/2 -translate-x-1/2`).
 * - Item yang sedang aktif tampil sebagai kapsul hijau solid (`bg-[var(--accent)] text-white`)
 *   lengkap dengan Ikon + Label Singkat (contoh: `[📋 Semua]`).
 * - Item lainnya tampil sebagai tombol ikon bundar yang bersih di sebelahnya.
 */
export function DynamicIslandNav({ items, activeTab, onTabChange }: DynamicIslandNavProps) {
    const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

    useEffect(() => {
        const handleResize = () => {
            setIsKeyboardOpen(window.innerHeight < 440);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    if (!items || items.length === 0 || isKeyboardOpen) return null;

    return (
        <div
            className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[70] pointer-events-auto max-w-[94vw]"
            role="navigation"
            aria-label="Navigasi Cepat Bawah"
        >
            <motion.div
                layout
                transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                className="bg-white/95 backdrop-blur-md border border-[#e8e5e0] shadow-[0_12px_32px_rgba(45,42,38,0.14)] rounded-full p-1.5 flex items-center gap-1 overflow-x-auto no-scrollbar"
            >
                {items.map(item => {
                    const isActive = activeTab === item.id;
                    const shortText = item.shortLabel || item.label.split(' ')[0];
                    return (
                        <motion.button
                            key={item.id}
                            layout
                            type="button"
                            onClick={() => onTabChange(item.id)}
                            title={item.label}
                            className={cn(
                                'relative flex items-center justify-center rounded-full transition-colors cursor-pointer select-none shrink-0',
                                isActive
                                    ? 'bg-[var(--accent)] text-white px-4 py-2 gap-2 font-bold text-xs shadow-sm'
                                    : 'w-9 h-9 text-[#5a554f] hover:bg-[#f5f3ef] hover:text-[var(--accent)]'
                            )}
                            style={{ touchAction: 'manipulation' }}
                        >
                            <span className="flex items-center justify-center shrink-0">
                                {renderNavIcon(item.icon, 16)}
                            </span>
                            {isActive && (
                                <motion.span
                                    initial={{ opacity: 0, width: 0 }}
                                    animate={{ opacity: 1, width: 'auto' }}
                                    exit={{ opacity: 0, width: 0 }}
                                    className="whitespace-nowrap tracking-tight"
                                >
                                    {shortText}
                                </motion.span>
                            )}
                        </motion.button>
                    );
                })}
            </motion.div>
        </div>
    );
}