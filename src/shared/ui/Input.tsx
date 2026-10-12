import React from 'react'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input: React.FC<InputProps> = ({ label, error, className = '', id, ...props }) => {
  return (
    <div className="w-full space-y-1">
      {label && (
        <label htmlFor={id} className="block text-[0.75rem] font-semibold text-slate-700">
          {label}
        </label>
      )}
      <input
        id={id}
        className={`w-full h-9 px-3 text-[0.82rem] bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors ${
          error ? 'border-rose-500 focus:border-rose-500' : ''
        } ${className}`}
        {...props}
      />
      {error && <p className="text-[0.72rem] text-rose-600">{error}</p>}
    </div>
  )
}
