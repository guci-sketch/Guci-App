import React from 'react'
import { Card } from '@/shared/ui/Card'
import { Badge } from '@/shared/ui/Badge'

export const WorkReportsPage: React.FC = () => {
  const sampleReports = [
    {
      id: 'rep-01',
      spkNumber: 'SPK-GEP-202610-001',
      projectName: 'Bintaro Jaya Xchange Mall',
      technician: 'Agus Santoso',
      bapNumber: 'BAP/GEP/202610001',
      rating: 5,
      verificationHash: 'BAP-VERIF-7A8B9C',
      status: 'VERIFIED'
    },
    {
      id: 'rep-02',
      spkNumber: 'SPK-GEP-202610-002',
      projectName: 'BSD Green Office Park 9',
      technician: 'Bambang Irawan',
      bapNumber: 'BAP/GEP/202610002',
      rating: 4,
      verificationHash: 'BAP-VERIF-1D2E3F',
      status: 'VERIFIED'
    }
  ]

  return (
    <Card
      title="Laporan Lapangan & Berita Acara Pekerjaan (BAP)"
      subtitle="Arsip digital defensif pembuktian pengerjaan, stempel GPS, dan tanda tangan klien"
      className="space-y-3"
    >
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <span className="text-[0.78rem] font-bold text-slate-800">Daftar BAP Terverifikasi</span>
        <Badge variant="valid">{sampleReports.length} Laporan Sah</Badge>
      </div>

      <div className="space-y-2">
        {sampleReports.map((rep) => (
          <div key={rep.id} className="p-3 bg-white border border-slate-200 rounded-lg space-y-1.5 text-[0.78rem]">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900">{rep.projectName}</span>
              <Badge variant="valid">LEGAL VERIFIED</Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[0.72rem] text-slate-600 bg-slate-50 p-2 rounded">
              <div>SPK: <strong className="font-mono">{rep.spkNumber}</strong></div>
              <div>BAP: <strong className="font-mono">{rep.bapNumber}</strong></div>
              <div>Teknisi: <strong>{rep.technician}</strong></div>
              <div>Rating Klien: <strong className="text-amber-600">★ {rep.rating} / 5</strong></div>
            </div>
            <div className="text-[0.68rem] text-slate-400 font-mono">
              Audit Hash: {rep.verificationHash}
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
