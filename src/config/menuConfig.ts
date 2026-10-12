import { UserRole } from './shared/utils/rbacEngine.ts'

export interface SidebarMenuItem {
  id: string
  label: string
  iconText: string
  allowedRoles: UserRole[]
  danger?: boolean
}

export const FULL_SIDEBAR_MENU: SidebarMenuItem[] = [
  {
    id: 'dashboard',
    label: 'Ikhtisar (Dashboard)',
    iconText: '📊',
    allowedRoles: ['SUPERADMIN', 'ADMIN', 'SUPERVISOR', 'MARKETING', 'INVENTORY']
  },
  {
    id: 'spk',
    label: 'Penugasan (SPK)',
    iconText: '📋',
    allowedRoles: ['SUPERADMIN', 'ADMIN', 'SUPERVISOR', 'TEKNISI_LAPANGAN']
  },
  {
    id: 'tracking',
    label: 'Peta Pelacakan GPS',
    iconText: '🗺️',
    allowedRoles: ['SUPERADMIN', 'ADMIN', 'SUPERVISOR']
  },
  {
    id: 'field-execution',
    label: 'Presensi & Lapangan',
    iconText: '📍',
    allowedRoles: ['SUPERADMIN', 'ADMIN', 'SUPERVISOR', 'TEKNISI_LAPANGAN']
  },
  {
    id: 'camera',
    label: 'Kamera Bukti GPS',
    iconText: '📷',
    allowedRoles: ['SUPERADMIN', 'ADMIN', 'SUPERVISOR', 'TEKNISI_LAPANGAN']
  },
  {
    id: 'quotation',
    label: 'Penawaran Harga',
    iconText: '📄',
    allowedRoles: ['SUPERADMIN', 'ADMIN', 'SUPERVISOR', 'MARKETING']
  },
  {
    id: 'inventory',
    label: 'Gudang & Stok Kimia',
    iconText: '📦',
    allowedRoles: ['SUPERADMIN', 'ADMIN', 'SUPERVISOR', 'INVENTORY']
  },
  {
    id: 'reports',
    label: 'Laporan Lapangan (BAP)',
    iconText: '✍️',
    allowedRoles: ['SUPERADMIN', 'ADMIN', 'SUPERVISOR', 'TEKNISI_LAPANGAN']
  },
  {
    id: 'anomalies',
    label: 'Anomali & Audit Risiko',
    iconText: '⚠️',
    danger: true,
    allowedRoles: ['SUPERADMIN', 'ADMIN', 'SUPERVISOR']
  },
  {
    id: 'users',
    label: 'Manajemen Pengguna',
    iconText: '👥',
    allowedRoles: ['SUPERADMIN', 'ADMIN', 'SUPERVISOR']
  }
]
