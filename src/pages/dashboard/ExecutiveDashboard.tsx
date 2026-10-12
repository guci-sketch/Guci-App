import React from 'react'
import { Card } from '@/shared/ui/Card'
import { Badge } from '@/shared/ui/Badge'
import { computeCMSMetrics } from '@/shared/utils/cmsMetrics'
import { REAL_PROJECTS, REAL_USERS } from '@/shared/data/seedData'

export const ExecutiveDashboard: React.FC = () => {
  const metrics = computeCMSMetrics()

  return (
    <div className="space-y-3">
      {/* Top Banner KPI */}
      <Card title="CMS Executive & Analytics Portal" subtitle="Visibilitas performa operasional, inventaris, dan kepatuhan SNI">
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-lg">
            <div className="text-[0.7rem] text-indigo-700 font-semibold uppercase">Zero Fraud Execution</div>
            <div className="text-[1.3rem] font-bold text-indigo-950 font-mono">{metrics.zeroFraudRate}%</div>
            <div className="text-[0.65rem] text-slate-500">Geofence Verified</div>
          </div>
          <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-lg">
            <div className="text-[0.7rem] text-emerald-700 font-semibold uppercase">Kepatuhan Audit SNI</div>
            <div className="text-[1.3rem] font-bold text-emerald-950 font-mono">{metrics.fieldAuditComplianceScore}%</div>
            <div className="text-[0.65rem] text-slate-500">Standar 2404 / 2405</div>
          </div>
        </div>
      </Card>

      {/* Proyek Aktif & Tim Teknisi */}
      <Card title="Status Operasional Proyek B2B" subtitle="Pemantauan titik perlakuan aktif PT Guci Emas Pratama">
        <div className="space-y-2">
          {REAL_PROJECTS.map((prj) => (
            <div key={prj.id} className="p-2.5 rounded-lg border border-slate-200 bg-white flex items-center justify-between text-[0.78rem]">
              <div>
                <div className="font-bold text-slate-800">{prj.name}</div>
                <div className="text-[0.7rem] text-slate-500">{prj.client_name}</div>
              </div>
              <div className="text-right">
                <Badge variant="valid">AKTIF</Badge>
                <div className="text-[0.68rem] text-slate-500 mt-0.5">Radius: {prj.geofence_radius_meters}m</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Stok Chemical & Personel */}
      <Card title="Inventaris Bahan Kimia & Personel Lapangan" subtitle="Stok bahan aktif dan teknisi berjadwal">
        <div className="grid grid-cols-2 gap-2 text-[0.75rem]">
          <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/50">
            <div className="font-bold text-slate-700 mb-1">Total Stok Larutan:</div>
            <div className="text-[1.1rem] font-bold font-mono text-slate-900">{metrics.totalChemicalStockLiters} L / Unit</div>
            <div className="text-[0.68rem] text-slate-500 mt-1">3 Formulasi SNI Terdaftar</div>
          </div>
          <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/50">
            <div className="font-bold text-slate-700 mb-1">Personel Teknisi:</div>
            <div className="text-[1.1rem] font-bold font-mono text-slate-900">{REAL_USERS.filter((u) => u.role === 'TEKNISI_LAPANGAN').length} Teknisi</div>
            <div className="text-[0.68rem] text-slate-500 mt-1">1 Supervisor Lapangan</div>
          </div>
        </div>
      </Card>
    </div>
  )
}
