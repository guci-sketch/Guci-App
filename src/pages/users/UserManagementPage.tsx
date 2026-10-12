import React, { useState } from 'react'
import { Card } from '@/shared/ui/Card'
import { Badge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import { Input } from '@/shared/ui/Input'
import { REAL_USERS, REAL_COMPANY_DATA } from '@/shared/data/seedData'
import { UserRole } from '@/shared/utils/rbacEngine'

export const UserManagementPage: React.FC = () => {
  const [users, setUsers] = useState(REAL_USERS)
  const [newEmail, setNewEmail] = useState('')
  const [newFullName, setNewFullName] = useState('')
  const [newRole, setNewRole] = useState<UserRole>('ADMIN')
  const [newTenantCode, setNewTenantCode] = useState('GEP')
  const [showAddForm, setShowAddForm] = useState(false)

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newEmail || !newFullName) return

    const newUser = {
      id: `u-${Date.now()}`,
      company_id: REAL_COMPANY_DATA.id,
      email: newEmail,
      password_hash: 'PROTECTED_HASH',
      full_name: newFullName,
      role: newRole,
      phone: '0812XXXXXXXX'
    }

    setUsers([...users, newUser])
    setNewEmail('')
    setNewFullName('')
    setShowAddForm(false)
  }

  return (
    <div className="space-y-3">
      {/* Superadmin Tenant Overview Banner */}
      <Card
        title="Superadmin Tenant & Access Hub"
        subtitle="Kelola tenant perusahaan, otorisasi peran, dan setup admin baru"
      >
        <div className="p-3 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-lg flex items-center justify-between text-[0.78rem]">
          <div>
            <div className="font-bold text-indigo-950">Superadmin Aktif: lieziragroup@gmail.com</div>
            <div className="text-[0.7rem] text-slate-600">Tenant Utama: {REAL_COMPANY_DATA.name} ({REAL_COMPANY_DATA.code})</div>
          </div>
          <Badge variant="valid">PLATFORM SUPERADMIN</Badge>
        </div>
      </Card>

      {/* User & Admin Tenant Management */}
      <Card
        title="Daftar Pengguna & Admin Tenant"
        subtitle="Pengaturan akun personel PT Guci Emas Pratama dan pembatasan hak akses"
        className="space-y-3"
      >
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <span className="text-[0.78rem] font-bold text-slate-800">Personel Terdaftar ({users.length})</span>
          <Button size="sm" onClick={() => setShowAddForm(!showAddForm)}>
            {showAddForm ? 'Tutup Form' : '+ Setup Admin / Pengguna Baru'}
          </Button>
        </div>

        {showAddForm && (
          <form onSubmit={handleCreateUser} className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2.5 text-[0.78rem]">
            <div className="font-bold text-slate-800">Setup Admin / Pengguna Tenant Baru</div>
            <div className="grid grid-cols-2 gap-2">
              <Input
                label="Nama Lengkap"
                value={newFullName}
                onChange={(e) => setNewFullName(e.target.value)}
                placeholder="cth. Budi Pratama"
                required
              />
              <Input
                label="Alamat Email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="admin@guciemas.co.id"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[0.72rem] font-semibold text-slate-700 mb-1">Peran Akses (RBAC)</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full h-9 px-2 text-[0.78rem] bg-white border border-slate-300 rounded-lg focus:outline-none"
                >
                  <option value="ADMIN">ADMIN (Tenant Manager)</option>
                  <option value="SUPERVISOR">SUPERVISOR</option>
                  <option value="MARKETING">MARKETING</option>
                  <option value="INVENTORY">INVENTORY</option>
                  <option value="TEKNISI_LAPANGAN">TEKNISI_LAPANGAN</option>
                </select>
              </div>
              <Input
                label="Kode Tenant"
                value={newTenantCode}
                onChange={(e) => setNewTenantCode(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full">
              Simpan & Otorisasi Pengguna
            </Button>
          </form>
        )}

        <div className="space-y-2">
          {users.map((u) => (
            <div key={u.id} className="p-3 bg-white border border-slate-200 rounded-lg flex items-center justify-between text-[0.78rem]">
              <div>
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  {u.full_name}
                  {u.email === 'lieziragroup@gmail.com' && (
                    <span className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-1.5 py-0.2 rounded">SUPERADMIN</span>
                  )}
                </div>
                <div className="text-[0.7rem] text-slate-500 font-mono">{u.email}</div>
                <div className="text-[0.68rem] text-slate-400">Kontak: {u.phone}</div>
              </div>
              <div className="text-right">
                <Badge variant={u.role === 'SUPERADMIN' ? 'valid' : u.role === 'SUPERVISOR' ? 'neutral' : 'valid'}>
                  {u.role}
                </Badge>
                <div className="text-[0.68rem] text-emerald-600 mt-1 font-semibold">Aktif</div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
