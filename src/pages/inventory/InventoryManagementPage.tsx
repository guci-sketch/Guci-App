import React, { useState } from 'react'
import { Card } from '@/shared/ui/Card'
import { Badge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import { Input } from '@/shared/ui/Input'
import { REAL_CHEMICALS_SNI } from '@/shared/data/seedData'
import { calculatePostConstructionSNI, calculatePreConstructionSNI } from '@/shared/utils/chemicalCalculator'

export const InventoryManagementPage: React.FC = () => {
  const [perimeterM1, setPerimeterM1] = useState(100)
  const sniCalc = calculatePostConstructionSNI(perimeterM1)
  const preCalc = calculatePreConstructionSNI(perimeterM1)

  return (
    <Card
      title="Gudang & Inventaris Bahan Kimia (SNI 2404 / 2405)"
      subtitle="Master stok termitisida, dosis SNI per meter persegi/parit, dan mutasi gudang"
      className="space-y-4"
    >
      <div className="space-y-2">
        <span className="text-[0.78rem] font-bold text-slate-800">Katalog Bahan Kimia Terstandar</span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {REAL_CHEMICALS_SNI.map((chem) => (
            <div key={chem.id} className="p-3 bg-white border border-slate-200 rounded-lg space-y-1 text-[0.75rem]">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">{chem.brand_name}</span>
                <Badge variant="valid">{chem.stock_qty} {chem.unit_stock}</Badge>
              </div>
              <div className="text-[0.7rem] text-slate-500">{chem.active_ingredient}</div>
              <div className="text-[0.68rem] text-indigo-700 font-mono">Dosis: {chem.recommended_dose_ml_per_liter} ml / L air</div>
              <div className="text-[0.68rem] text-slate-400">Target: {chem.target_pest}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2 text-[0.75rem]">
        <div className="font-bold text-slate-800">Kalkulator Kebutuhan Dosis SNI Instan</div>
        <div className="grid grid-cols-2 gap-2">
          <Input
            label="Panjang / Luas Area (m1 / m2)"
            type="number"
            value={perimeterM1}
            onChange={(e) => setPerimeterM1(Number(e.target.value))}
          />
          <div className="flex flex-col justify-end">
            <Button variant="outline" className="w-full">
              Kalkulasi Kebutuhan
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[0.72rem] pt-2 border-t border-slate-200">
          <div>
            <div className="font-semibold text-indigo-900">SNI 2404 (Pra-Konstruksi):</div>
            <div>Larutan: <strong>{preCalc.standardSolutionLiters} L</strong> (5 L/m2)</div>
            <div>Konsentrat: <strong>{preCalc.concentrateLitersNeeded} L</strong></div>
          </div>
          <div>
            <div className="font-semibold text-emerald-900">SNI 2405 (Pasca-Konstruksi):</div>
            <div>Lubang Bor: <strong>{sniCalc.totalDrillHoles} titik</strong></div>
            <div>Larutan: <strong>{sniCalc.standardSolutionLiters} L</strong></div>
            <div>Konsentrat: <strong>{sniCalc.concentrateLitersNeeded} L</strong></div>
          </div>
        </div>
      </div>
    </Card>
  )
}
