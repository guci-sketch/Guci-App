import React, { useState } from 'react'
import {
  calculateQuotation,
  QuotationItem,
  QuotationCalculationResult
} from '@/shared/utils/quotationEngine'
import { Button } from '@/shared/ui/Button'
import { Input } from '@/shared/ui/Input'
import { Card } from '@/shared/ui/Card'
import { Badge } from '@/shared/ui/Badge'

export const QuotationForm: React.FC = () => {
  const [clientName, setClientName] = useState('PT Jaya Real Property, Tbk')
  const [projectName, setProjectName] = useState('Bintaro Jaya Xchange Mall')
  const [items, setItems] = useState<QuotationItem[]>([
    {
      description: 'Perlakuan Anti Rayap Pasca-Konstruksi (SNI 2405) Injeksi Pondasi',
      quantity: 150,
      unit: 'm1',
      unitPrice: 125000
    },
    {
      description: 'Barrier Chemical Spraying Basement & Sub-slab Area',
      quantity: 300,
      unit: 'm2',
      unitPrice: 45000
    }
  ])
  const [discountPercent, setDiscountPercent] = useState<number>(5)
  const [applyTax, setApplyTax] = useState<boolean>(true)
  const [result, setResult] = useState<QuotationCalculationResult | null>(() =>
    calculateQuotation(items, discountPercent, applyTax)
  )

  const handleRecalculate = () => {
    setResult(calculateQuotation(items, discountPercent, applyTax))
  }

  const handleUpdateItem = (index: number, field: keyof QuotationItem, value: string | number) => {
    const updated = [...items]
    updated[index] = { ...updated[index], [field]: value }
    setItems(updated)
    setResult(calculateQuotation(updated, discountPercent, applyTax))
  }

  return (
    <Card
      title="Auto-Quotation Generator (< 3 Menit)"
      subtitle="Kalkulasi instan penawaran harga anti rayap & pest control standar SNI"
      className="space-y-3"
    >
      <div className="grid grid-cols-2 gap-2">
        <Input
          label="Nama Klien"
          value={clientName}
          onChange={(e) => setClientName(e.target.value)}
        />
        <Input
          label="Nama Proyek"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[0.75rem] font-bold text-slate-700">Rincian Item Jasa</span>
          <Badge variant="neutral">{items.length} Item</Badge>
        </div>

        {items.map((item, idx) => (
          <div key={idx} className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/50 space-y-2">
            <input
              className="w-full text-[0.78rem] font-medium bg-transparent border-b border-slate-200 pb-1 focus:outline-none"
              value={item.description}
              onChange={(e) => handleUpdateItem(idx, 'description', e.target.value)}
            />
            <div className="grid grid-cols-3 gap-2">
              <Input
                label="Volume"
                type="number"
                value={item.quantity}
                onChange={(e) => handleUpdateItem(idx, 'quantity', Number(e.target.value))}
              />
              <Input
                label="Satuan"
                value={item.unit}
                onChange={(e) => handleUpdateItem(idx, 'unit', e.target.value)}
              />
              <Input
                label="Tarif Satuan (Rp)"
                type="number"
                value={item.unitPrice}
                onChange={(e) => handleUpdateItem(idx, 'unitPrice', Number(e.target.value))}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
        <Input
          label="Diskon (%)"
          type="number"
          value={discountPercent}
          onChange={(e) => {
            const disc = Number(e.target.value)
            setDiscountPercent(disc)
            setResult(calculateQuotation(items, disc, applyTax))
          }}
        />
        <div className="flex flex-col justify-end pb-1">
          <label className="flex items-center gap-2 text-[0.78rem] text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={applyTax}
              onChange={(e) => {
                const checked = e.target.checked
                setApplyTax(checked)
                setResult(calculateQuotation(items, discountPercent, checked))
              }}
              className="rounded text-indigo-600"
            />
            <span>PPN 11% Aktif</span>
          </label>
        </div>
      </div>

      {result && (
        <div className="p-3 rounded-lg border border-indigo-200 bg-indigo-50/50 space-y-1.5 text-[0.78rem]">
          <div className="flex justify-between">
            <span className="text-slate-600">Subtotal:</span>
            <span className="font-mono font-medium">Rp {result.subtotal.toLocaleString('id-ID')}</span>
          </div>
          {result.discountAmount > 0 && (
            <div className="flex justify-between text-amber-700">
              <span>Diskon ({result.discountPercent}%):</span>
              <span className="font-mono">- Rp {result.discountAmount.toLocaleString('id-ID')}</span>
            </div>
          )}
          {result.taxAmount > 0 && (
            <div className="flex justify-between text-slate-600">
              <span>PPN 11%:</span>
              <span className="font-mono">Rp {result.taxAmount.toLocaleString('id-ID')}</span>
            </div>
          )}
          <div className="flex justify-between text-[0.88rem] font-bold text-slate-900 pt-1 border-t border-indigo-200">
            <span>Grand Total:</span>
            <span className="font-mono text-indigo-700">Rp {result.grandTotal.toLocaleString('id-ID')}</span>
          </div>
          <div className="text-[0.7rem] text-slate-600 italic pt-1">
            Terbilang: &ldquo;{result.terbilang}&rdquo;
          </div>
        </div>
      )}

      <Button onClick={handleRecalculate} className="w-full">
        Simpan & Ajukan Persetujuan Admin
      </Button>
    </Card>
  )
}
