/**
 * Role-Based Access Control (RBAC) Engine
 * Menegakkan matriks hak akses 5 peran baku:
 * SUPERADMIN, ADMIN (SUPERVISOR), MARKETING, INVENTORY, TEKNISI_LAPANGAN.
 */

export type UserRole =
  | 'SUPERADMIN'
  | 'ADMIN'
  | 'SUPERVISOR'
  | 'MARKETING'
  | 'INVENTORY'
  | 'TEKNISI_LAPANGAN'

export type AppPermission =
  | 'PRESENCE_GEOFENCE'
  | 'WATERMARK_CAMERA'
  | 'CHEMICAL_AUDIT'
  | 'BAP_SIGNATURE'
  | 'QUOTATION_DRAFT'
  | 'QUOTATION_APPROVE'
  | 'CHEMICAL_STOCK_MANAGE'
  | 'CMS_ANALYTICS_VIEW'

const ROLE_PERMISSIONS: Record<UserRole, AppPermission[]> = {
  SUPERADMIN: [
    'PRESENCE_GEOFENCE',
    'WATERMARK_CAMERA',
    'CHEMICAL_AUDIT',
    'BAP_SIGNATURE',
    'QUOTATION_DRAFT',
    'QUOTATION_APPROVE',
    'CHEMICAL_STOCK_MANAGE',
    'CMS_ANALYTICS_VIEW'
  ],
  ADMIN: [
    'PRESENCE_GEOFENCE',
    'WATERMARK_CAMERA',
    'CHEMICAL_AUDIT',
    'BAP_SIGNATURE',
    'QUOTATION_DRAFT',
    'QUOTATION_APPROVE',
    'CHEMICAL_STOCK_MANAGE',
    'CMS_ANALYTICS_VIEW'
  ],
  SUPERVISOR: [
    'PRESENCE_GEOFENCE',
    'WATERMARK_CAMERA',
    'CHEMICAL_AUDIT',
    'BAP_SIGNATURE',
    'QUOTATION_DRAFT',
    'QUOTATION_APPROVE',
    'CHEMICAL_STOCK_MANAGE',
    'CMS_ANALYTICS_VIEW'
  ],
  MARKETING: [
    'QUOTATION_DRAFT',
    'CMS_ANALYTICS_VIEW'
  ],
  INVENTORY: [
    'CHEMICAL_AUDIT',
    'CHEMICAL_STOCK_MANAGE',
    'CMS_ANALYTICS_VIEW'
  ],
  TEKNISI_LAPANGAN: [
    'PRESENCE_GEOFENCE',
    'WATERMARK_CAMERA',
    'CHEMICAL_AUDIT',
    'BAP_SIGNATURE'
  ]
}

/**
 * Memeriksa apakah suatu peran memiliki izin akses tertentu.
 */
export function hasPermission(role: UserRole, permission: AppPermission): boolean {
  const allowed = ROLE_PERMISSIONS[role]
  if (!allowed) return false
  return allowed.includes(permission)
}

/**
 * Mengambil daftar izin aktif untuk peran tertentu.
 */
export function getPermissionsForRole(role: UserRole): AppPermission[] {
  return ROLE_PERMISSIONS[role] || []
}
