/**
 * Generator Penomoran Surat Penawaran (Quotation)
 * Format Baku: QTN/GEP/YYYYMM/000X
 */

let counter = 1

export function generateQuotationNumber(): string {
  const date = new Date()
  const yearMonth = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`
  const num = String(counter++).padStart(4, '0')
  return `QTN/GEP/${yearMonth}/${num}`
}
