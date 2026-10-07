import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers, X } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

export interface NavItem {
    id: string;
    label: string;
    icon: React.ElementType;
}

export interface DynamicIslandNavProps {
    items: NavItem[];
    activeTab: string;
    onTabChange: (id: string) => void;
}

export function DynamicIslandNav({ items, activeTab, onTabChange }: DynamicIslandNavProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

    // Deteksi keyboard untuk menyembunyikan nav di mobile
    useEffect(() => {
        const handleResize = () => {
            if (window.innerHeight < 500) {
                setIsKeyboardOpen(true);
                setIsExpanded(false);
            } else {
                setIsKeyboardOpen(false);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    if (items.length === 0 || isKeyboardOpen) return null;

    const activeItem = items.find(i => i.id === activeTab) || items[0];
    const CurrentIcon = activeItem?.icon || Layers;

    const handleSelect = (id: string) => {
        onTabChange(id);
        setIsExpanded(false);
    };

    return (
        <div className="md:hidden">
            <AnimatePresence mode="wait">
                {!isExpanded ? (
                    <motion.button
                        key="collapsed"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        whileTap={{ scale: 0.92 }}
                        onClick={() => setIsExpanded(true)}
                        className="fixed bottom-6 right-5 z-[90] w-12 h-12 rounded-full bg-white/90 backdrop-blur-xl border border-slate-200 shadow-xl flex items-center justify-center text-blue-600 hover:shadow-2xl transition-shadow cursor-pointer select-none"
                        style={{ touchAction: 'manipulation' }}
                        aria-label="Buka Menu"
                    >
                        <div className="relative flex items-center justify-center">
                            <CurrentIcon size={20} />
                            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-blue-600 shadow-sm animate-pulse" />
                        </div>
                    </motion.button>
                ) : (
                    <motion.div
                        key="expanded"
                        initial={{ y: 50, opacity: 0, scale: 0.9 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: 30, opacity: 0, scale: 0.9 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[90] bg-white/95 backdrop-blur-xl border border-slate-200 shadow-2xl rounded-full px-2 py-2 flex items-center gap-1 w-[90vw] max-w-sm overflow-x-auto no-scrollbar"
                    >
                        {items.map(item => {
                            const Icon = item.icon;
                            const isActive = activeTab === item.id;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => handleSelect(item.id)}
                                    className={cn(
                                        "relative px-3 py-1.5 flex items-center gap-1.5 rounded-full text-xs font-semibold transition-colors flex-shrink-0",
                                        isActive ? "text-blue-600 bg-blue-50 border border-blue-200" : "text-slate-500 bg-transparent border border-transparent"
                                    )}
                                >
                                    <Icon size={15} />
                                    <span>{item.label}</span>
                                </button>
                            );
                        })}
                        <button
                            onClick={() => setIsExpanded(false)}
                            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-800 transition-colors ml-1 flex-shrink-0"
                        >
                            <X size={16} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}