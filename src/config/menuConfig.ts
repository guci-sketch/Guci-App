import { UserRole } from './shared/utils/rbacEngine.ts'

export interface SidebarMenuItem {
  id: string
  label: string
  allowedRoles: UserRole[]
  danger?: boolean
}

export const FULL_SIDEBAR_MENU: SidebarMenuItem[] = [
  {
    id: 'dashboard',
    label: 'Ikhtisar (Dashboard)',
    allowedRoles: ['SUPERADMIN', 'ADMIN', 'SUPERVISOR', 'MARKETING', 'INVENTORY']
  },
  {
    id: 'spk',
    label: 'Penugasan (SPK)',
    allowedRoles: ['SUPERADMIN', 'ADMIN', 'SUPERVISOR', 'TEKNISI_LAPANGAN']
  },
  {
    id: 'tracking',
    label: 'Peta Pelacakan GPS',
    allowedRoles: ['SUPERADMIN', 'ADMIN', 'SUPERVISOR']
  },
  {
    id: 'field-execution',
    label: 'Presensi & Lapangan',
    allowedRoles: ['SUPERADMIN', 'ADMIN', 'SUPERVISOR', 'TEKNISI_LAPANGAN']
  },
  {
    id: 'camera',
    label: 'Kamera Bukti GPS',
    allowedRoles: ['SUPERADMIN', 'ADMIN', 'SUPERVISOR', 'TEKNISI_LAPANGAN']
  },
  {
    id: 'quotation',
    label: 'Penawaran Harga',
    allowedRoles: ['SUPERADMIN', 'ADMIN', 'SUPERVISOR', 'MARKETING']
  },
  {
    id: 'inventory',
    label: 'Gudang & Stok Kimia',
    allowedRoles: ['SUPERADMIN', 'ADMIN', 'SUPERVISOR', 'INVENTORY']
  },
  {
    id: 'reports',
    label: 'Laporan Lapangan (BAP)',
    allowedRoles: ['SUPERADMIN', 'ADMIN', 'SUPERVISOR', 'TEKNISI_LAPANGAN']
  },
  {
    id: 'anomalies',
    label: 'Anomali & Audit Risiko',
    danger: true,
    allowedRoles: ['SUPERADMIN', 'ADMIN', 'SUPERVISOR']
  },
  {
    id: 'users',
    label: 'Manajemen Pengguna & Tenant',
    allowedRoles: ['SUPERADMIN', 'ADMIN', 'SUPERVISOR']
  }
]
