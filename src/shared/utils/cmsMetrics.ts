import { REAL_PROJECTS, REAL_CHEMICALS_SNI } from '@/shared/data/seedData'

export interface CMSMetrics {
  totalRevenueProjected: number
  activeProjectsCount: number
  totalChemicalStockLiters: number
  fieldAuditComplianceScore: number
  zeroFraudRate: number
}

export function computeCMSMetrics(): CMSMetrics {
  const totalStock = REAL_CHEMICALS_SNI.reduce((acc, curr) => acc + curr.stock_qty, 0)
  return {
    totalRevenueProjected: 145000000,
    activeProjectsCount: REAL_PROJECTS.length,
    totalChemicalStockLiters: totalStock,
    fieldAuditComplianceScore: 98.5,
    zeroFraudRate: 100
  }
}
