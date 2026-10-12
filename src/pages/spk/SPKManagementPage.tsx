import React from 'react'
import { Card } from '@/shared/ui/Card'
import { Badge } from '@/shared/ui/Badge'
import { REAL_SPK, REAL_PROJECTS, REAL_USERS } from '../../../backend-src/db/seed'

export const SPKManagementPage: React.FC = () => {
  return (
    <Card
      title="Manajemen Surat Perintah Kerja (SPK)"
      subtitle="Penugasan teknisi lapangan dan jadwal treatment perlakuan hama"
      className="space-y-3"
    >
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <span className="text-[0.78rem] font-bold text-slate-800">Daftar Penugasan Aktif</span>
        <Badge variant="valid">{REAL_SPK.length} SPK Berjadwal</Badge>
      </div>

      <div className="space-y-2">
        {REAL_SPK.map((spk) => {
          const project = REAL_PROJECTS.find((p) => p.id === spk.project_id)
          const tech = REAL_USERS.find((u) => u.id === spk.technician_id)

          return (
            <div
              key={spk.id}
              className="p-3 bg-white border border-slate-200 rounded-lg space-y-2 text-[0.78rem]"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-indigo-900">{spk.spk_number}</span>
                <Badge variant={spk.status === 'IN_PROGRESS' ? 'warning' : 'valid'}>
                  {spk.status}
                </Badge>
              </div>

              <div>
                <div className="font-semibold text-slate-800">{project?.name}</div>
                <div className="text-[0.72rem] text-slate-500">Klien: {project?.client_name}</div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[0.72rem] bg-slate-50 p-2 rounded border border-slate-100">
                <div>Teknisi: <strong>{tech?.full_name}</strong></div>
                <div>Jadwal: <strong>{spk.scheduled_date}</strong></div>
              </div>

              <div className="text-[0.72rem] text-slate-600">
                Lingkup: {spk.scope_of_work}
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
