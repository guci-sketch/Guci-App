import React from 'react'
import { Card } from '@/shared/ui/Card'
import { Badge } from '@/shared/ui/Badge'

export const AnomalyAuditPage: React.FC = () => {
  const anomalies = [
    {
      id: 'anom-1',
      spkNumber: 'SPK-GEP-202610-001',
      type: 'GEOFENCE_BREACH_SUSPECT',
      description: 'Presensi terdeteksi 45 meter di dalam batas toleransi radius (Verified Normal).',
      severity: 'LOW',
      resolved: true
    },
    {
      id: 'anom-2',
      spkNumber: 'SPK-SIMULASI-099',
      type: 'CHEMICAL_DEVIATION_ALERT',
      description: 'Deviasi larutan termitisida 150L vs standar 350L (Under-dosing dicegah oleh sistem).',
      severity: 'CRITICAL',
      resolved: true
    }
  ]

  return (
    <Card
      title="Anomali & Pelanggaran Lapangan (Risk Engine)"
      subtitle="Audit insiden fraud lokasi GPS, deviasi dosis chemical, dan anomali waktu kerja"
      className="space-y-3"
    >
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <span className="text-[0.78rem] font-bold text-slate-800">Catatan Pelanggaran Terdeteksi</span>
        <Badge variant="valid">0 Anomali Kritis Aktif</Badge>
      </div>

      <div className="space-y-2">
        {anomalies.map((anom) => (
          <div key={anom.id} className="p-3 bg-white border border-slate-200 rounded-lg space-y-1.5 text-[0.78rem]">
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-slate-800">{anom.spkNumber}</span>
              <Badge variant={anom.severity === 'CRITICAL' ? 'invalid' : 'valid'}>
                {anom.severity}
              </Badge>
            </div>
            <div className="text-[0.72rem] text-slate-700 font-medium">
              {anom.description}
            </div>
            <div className="text-[0.68rem] text-emerald-700 font-semibold">
              Status: Terselesaikan melalui verifikasi supervisor & database constraints
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
