import React from 'react'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'valid' | 'invalid' | 'warning' | 'neutral'
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'neutral', className = '', ...props }) => {
  const variantStyles = {
    valid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    invalid: 'bg-rose-50 text-rose-700 border-rose-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    neutral: 'bg-slate-100 text-slate-700 border-slate-200'
  }[variant]

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${variantStyles} ${className}`}
      {...props}
    >
      {children}
    </span>
  )
}
