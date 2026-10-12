import { Router, Request, Response } from 'express'
import { calculateQuotation, QuotationItem, QuotationCalculationResult } from '../../../../src/shared/utils/quotationEngine.ts'

export const quotationRouter = Router()

export interface QuotationRecord {
  id: string
  quotationNumber: string
  clientName: string
  projectName: string
  status: 'DRAFT' | 'APPROVED' | 'REJECTED'
  items: QuotationItem[]
  calculation: QuotationCalculationResult
  spkId?: string
}

// In-memory atomic store untuk evaluasi operasional (terhubung DB saat sinkronisasi)
const quotations: QuotationRecord[] = []
let counter = 1

/**
 * Generate nomor surat penawaran terpusat: QTN/GEP/YYYYMM/000X
 */
export function generateQuotationNumber(): string {
  const date = new Date()
  const yearMonth = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`
  const num = String(counter++).padStart(4, '0')
  return `QTN/GEP/${yearMonth}/${num}`
}

// POST: Buat Quotation Otomatis (< 3 menit)
quotationRouter.post('/calculate', (req: Request, res: Response) => {
  const { items, discountPercent, applyTax } = req.body
  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: 'Daftar item pekerjaan wajib disertakan' })
    return
  }

  const calc = calculateQuotation(items, Number(discountPercent || 0), applyTax !== false)
  res.json({ success: true, data: calc })
})

// POST: Simpan dan ajukan draft Quotation
quotationRouter.post('/create', (req: Request, res: Response) => {
  const { clientName, projectName, items, discountPercent, applyTax } = req.body
  if (!clientName || !projectName || !Array.isArray(items)) {
    res.status(400).json({ error: 'Parameter clientName, projectName, dan items wajib diisi' })
    return
  }

  const calc = calculateQuotation(items, Number(discountPercent || 0), applyTax !== false)
  const newQuotation: QuotationRecord = {
    id: `q-${Date.now()}`,
    quotationNumber: generateQuotationNumber(),
    clientName,
    projectName,
    status: 'DRAFT',
    items,
    calculation: calc
  }

  quotations.push(newQuotation)
  res.status(201).json({ success: true, data: newQuotation })
})

// POST: Persetujuan Admin & Auto Konversi ke SPK
quotationRouter.post('/:id/approve-and-convert-spk', (req: Request, res: Response) => {
  const { id } = req.params
  const target = quotations.find((q) => q.id === id)

  if (!target) {
    res.status(404).json({ error: 'Quotation tidak ditemukan' })
    return
  }

  target.status = 'APPROVED'
  const generatedSpkNumber = `SPK/GEP/${new Date().getFullYear()}/${String(Date.now()).slice(-4)}`
  target.spkId = `spk-${Date.now()}`

  res.json({
    success: true,
    message: 'Quotation berhasil disetujui dan dikonversi otomatis ke SPK',
    data: {
      quotation: target,
      spk: {
        id: target.spkId,
        spkNumber: generatedSpkNumber,
        clientName: target.clientName,
        projectName: target.projectName,
        status: 'ASSIGNED',
        totalVolume: target.items.reduce((acc, curr) => acc + curr.quantity, 0)
      }
    }
  })
})
