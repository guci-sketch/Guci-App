import React from 'react'
import { Card } from '@/shared/ui/Card'
import { Badge } from '@/shared/ui/Badge'
import { REAL_USERS } from '@/shared/data/seedData'

export const UserManagementPage: React.FC = () => {
  return (
    <Card
      title="Manajemen Pengguna & Otoritas RBAC"
      subtitle="Pengaturan akun personel PT Guci Emas Pratama dan pembatasan hak akses"
      className="space-y-3"
    >
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <span className="text-[0.78rem] font-bold text-slate-800">Personel Terdaftar</span>
        <Badge variant="valid">{REAL_USERS.length} Pengguna Aktif</Badge>
      </div>

      <div className="space-y-2">
        {REAL_USERS.map((u) => (
          <div key={u.id} className="p-3 bg-white border border-slate-200 rounded-lg flex items-center justify-between text-[0.78rem]">
            <div>
              <div className="font-bold text-slate-800">{u.full_name}</div>
              <div className="text-[0.7rem] text-slate-500 font-mono">{u.email}</div>
              <div className="text-[0.68rem] text-slate-400">Kontak: {u.phone}</div>
            </div>
            <div className="text-right">
              <Badge variant={u.role === 'SUPERVISOR' ? 'neutral' : 'valid'}>{u.role}</Badge>
              <div className="text-[0.68rem] text-emerald-600 mt-1 font-semibold">Aktif</div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
