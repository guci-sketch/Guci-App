import React from 'react'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string
  subtitle?: string
}

export const Card: React.FC<CardProps> = ({ title, subtitle, children, className = '', ...props }) => {
  return (
    <div
      className={`bg-white border border-slate-200/80 rounded-xl p-4 sm:p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] space-y-3 ${className}`}
      {...props}
    >
      {(title || subtitle) && (
        <div className="border-b border-slate-100 pb-2.5">
          {title && <h3 className="text-[0.95rem] font-bold text-slate-800">{title}</h3>}
          {subtitle && <p className="text-[0.75rem] text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  )
}
