import React from 'react';

export interface PageHeaderProps {
    title: string;
    subtitle?: string;
    icon?: React.ReactNode;
    badge?: React.ReactNode;
    actions?: React.ReactNode;
}

/**
 * Komponen PageHeader kontekstual bergaya Barventis:
 * Menampilkan judul modul, deskripsi operasional singkat, badge identitas/status, dan tombol aksi utama.
 */
export const PageHeader: React.FC<PageHeaderProps> = ({
    title,
    subtitle,
    icon,
    badge,
    actions,
}) => {
    return (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--border-subtle)]">
            <div className="flex items-start gap-3">
                {icon && (
                    <div className="w-10 h-10 rounded-xl bg-[var(--accent-glow)] text-[var(--accent)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0 mt-0.5">
                        {icon}
                    </div>
                )}
                <div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <h1 className="text-lg sm:text-xl font-bold text-[var(--text-primary)] tracking-tight">
                            {title}
                        </h1>
                        {badge}
                    </div>
                    {subtitle && (
                        <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-0.5">
                            {subtitle}
                        </p>
                    )}
                </div>
            </div>
            {actions && (
                <div className="flex items-center gap-2 flex-wrap shrink-0">
                    {actions}
                </div>
            )}
        </div>
    );
};
