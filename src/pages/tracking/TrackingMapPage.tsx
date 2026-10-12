import React from 'react'
import { Card } from '@/shared/ui/Card'
import { Badge } from '@/shared/ui/Badge'
import { REAL_PROJECTS } from '@/shared/data/seedData'

export const TrackingMapPage: React.FC = () => {
  return (
    <Card
      title="Peta Pelacakan GPS & Geofencing Proyek"
      subtitle="Visualisasi lokasi proyek B2B PT Guci Emas Pratama dan radius presensi"
      className="space-y-3"
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {REAL_PROJECTS.map((prj) => (
          <div key={prj.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5 text-[0.75rem]">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800">{prj.name}</span>
              <Badge variant="valid">{prj.geofence_radius_meters}m</Badge>
            </div>
            <div className="text-[0.7rem] text-slate-500">{prj.client_name}</div>
            <div className="font-mono text-[0.68rem] text-indigo-700 bg-white p-1 rounded border border-slate-200">
              GPS: {prj.latitude}, {prj.longitude}
            </div>
            <div className="text-[0.68rem] text-slate-500 pt-1 border-t border-slate-200">
              {prj.address}
            </div>
          </div>
        ))}
      </div>

      <div className="h-44 rounded-xl border border-slate-300 bg-slate-900 flex flex-col items-center justify-center text-slate-300 p-4 text-center space-y-1">
        <div className="font-mono text-sm text-indigo-400 font-bold">GIS Live Spatial Engine</div>
        <div className="text-xs text-slate-400">
          3 Titik Proyek Terpetakan &bull; Haversine Great-Circle Geofencing Aktif (Radius 100m - 150m)
        </div>
      </div>
    </Card>
  )
}
