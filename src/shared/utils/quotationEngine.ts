/**
 * Auto-Quotation Calculation & Terbilang Engine
 * Memotong durasi pembuatan penawaran dari hitungan hari ke < 3 menit.
 * Akurasi matematis: Subtotal, Diskon, PPN 11%, dan Konversi Terbilang Rupiah.
 */

export interface QuotationItem {
  description: string
  quantity: number
  unit: string // 'm2', 'm1', 'titik', 'unit'
  unitPrice: number
}

export interface QuotationCalculationResult {
  items: Array<QuotationItem & { totalPrice: number }>
  subtotal: number
  discountPercent: number
  discountAmount: number
  taxPercent: number
  taxAmount: number
  grandTotal: number
  terbilang: string
}

const SATUAN_ANGKA = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas']

/**
 * Konversi angka ke kalimat terbilang Bahasa Indonesia.
 */
export function terbilangRupiah(nilai: number): string {
  const nominal = Math.floor(Math.abs(nilai))
  if (nominal === 0) return 'Nol Rupiah'

  function konversi(n: number): string {
    if (n < 12) return SATUAN_ANGKA[n]
    if (n < 20) return konversi(n - 10) + ' Belas'
    if (n < 100) return konversi(Math.floor(n / 10)) + ' Puluh ' + konversi(n % 10)
    if (n < 200) return 'Seratus ' + konversi(n - 100)
    if (n < 1000) return konversi(Math.floor(n / 100)) + ' Ratus ' + konversi(n % 100)
    if (n < 2000) return 'Seribu ' + konversi(n - 1000)
    if (n < 1000000) return konversi(Math.floor(n / 1000)) + ' Ribu ' + konversi(n % 1000)
    if (n < 1000000000) return konversi(Math.floor(n / 1000000)) + ' Juta ' + konversi(n % 1000000)
    if (n < 1000000000000) return konversi(Math.floor(n / 1000000000)) + ' Miliar ' + konversi(n % 1000000000)
    return konversi(Math.floor(n / 1000000000000)) + ' Triliun ' + konversi(n % 1000000000000)
  }

  const hasil = konversi(nominal).replace(/\s+/g, ' ').trim()
  return `${hasil} Rupiah`
}

/**
 * Menghitung rekapitulasi finansial penawaran harga secara presisi.
 */
export function calculateQuotation(
  items: QuotationItem[],
  discountPercent = 0,
  applyTax = true
): QuotationCalculationResult {
  const calculatedItems = items.map((item) => ({
    ...item,
    totalPrice: Math.round(item.quantity * item.unitPrice)
  }))

  const subtotal = calculatedItems.reduce((acc, curr) => acc + curr.totalPrice, 0)
  const discountAmount = Math.round(subtotal * (discountPercent / 100))
  const taxableAmount = Math.max(0, subtotal - discountAmount)
  const taxPercent = applyTax ? 11 : 0
  const taxAmount = Math.round(taxableAmount * (taxPercent / 100))
  const grandTotal = taxableAmount + taxAmount

  return {
    items: calculatedItems,
    subtotal,
    discountPercent,
    discountAmount,
    taxPercent,
    taxAmount,
    grandTotal,
    terbilang: terbilangRupiah(grandTotal)
  }
}
