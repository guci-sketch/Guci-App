import React from 'react'

interface MerlinFlowVisualizerProps {
  status: 'IDLE' | 'INSIDE' | 'OUTSIDE'
  distanceMeters?: number
  toleranceMeters?: number
}

export const MerlinFlowVisualizer: React.FC<MerlinFlowVisualizerProps> = ({
  status,
  distanceMeters = 0,
  toleranceMeters = 100
}) => {
  return (
    <div className="border border-indigo-200 bg-indigo-50/50 rounded-xl p-3 text-xs space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-bold text-indigo-900 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
          Merlin AI Flow Visualizer
        </span>
        <span className="text-[10px] text-indigo-600 uppercase tracking-wider font-semibold">
          Auto Decision
        </span>
      </div>

      <div className="grid grid-cols-3 gap-1.5 text-center text-[11px]">
        <div
          className={`p-2 rounded border transition-all ${
            status !== 'IDLE' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500 border-slate-200'
          }`}
        >
          1. GPS Acquired
        </div>
        <div
          className={`p-2 rounded border transition-all ${
            status === 'INSIDE'
              ? 'bg-emerald-600 text-white border-emerald-600 font-bold'
              : status === 'OUTSIDE'
              ? 'bg-rose-600 text-white border-rose-600 font-bold'
              : 'bg-white text-slate-500 border-slate-200'
          }`}
        >
          2. Haversine Check
        </div>
        <div
          className={`p-2 rounded border transition-all ${
            status === 'INSIDE'
              ? 'bg-emerald-700 text-white border-emerald-700'
              : 'bg-white text-slate-400 border-slate-200 opacity-60'
          }`}
        >
          3. SPK Unlocked
        </div>
      </div>

      {status !== 'IDLE' && (
        <div className="p-2 bg-white rounded border border-indigo-100 text-[11px] text-slate-700 space-y-1">
          <div className="font-semibold text-slate-900">
            {status === 'INSIDE'
              ? '✓ Presensi Sah (Valid Geofence)'
              : '⚠ Peringatan Anomali Presensi (Fraud Alert)'}
          </div>
          <div>
            Jarak: <span className="font-mono">{distanceMeters}m</span> / Toleransi: <span className="font-mono">{toleranceMeters}m</span>
          </div>
          <div className="text-[10px] text-slate-500">
            {status === 'INSIDE'
              ? 'Posisi terverifikasi di area proyek klien PT Guci Emas Pratama.'
              : `Terdeteksi di luar radius target (+${Math.round((distanceMeters - toleranceMeters) * 100) / 100}m). Tombol aksi dikunci.`}
          </div>
        </div>
      )}
    </div>
  )
}
