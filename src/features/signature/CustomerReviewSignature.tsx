import React, { useState } from 'react'
import { Button } from '@/shared/ui/Button'
import { Input } from '@/shared/ui/Input'
import { Card } from '@/shared/ui/Card'
import { Badge } from '@/shared/ui/Badge'
import { processCustomerReviewBAP, BAPRecord } from '@/shared/utils/signatureEngine'

export interface CustomerReviewSignatureProps {
  spkNumber: string
  clientName: string
  onComplete: (bap: BAPRecord) => void
}

export const CustomerReviewSignature: React.FC<CustomerReviewSignatureProps> = ({
  spkNumber,
  clientName,
  onComplete
}) => {
  const [signerName, setSignerName] = useState(clientName)
  const [rating, setRating] = useState<number>(5)
  const [feedback, setFeedback] = useState('Pekerjaan rapi, teknisi tepat waktu dan ramah.')
  const [signatureSaved, setSignatureSaved] = useState(false)
  const [bapResult, setBapResult] = useState<BAPRecord | null>(null)

  const handleSignAndSubmit = () => {
    // Simulasi penangkapan dataUrl tanda tangan kanvas digital
    const mockSigDataUrl = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="80"><path d="M10 50 Q 50 10, 90 50 T 170 50" fill="none" stroke="black" stroke-width="2"/></svg>'
    
    const record = processCustomerReviewBAP({
      spkNumber,
      clientSignerName: signerName,
      clientRating: rating,
      feedbackNotes: feedback,
      signatureDataUrl: mockSigDataUrl,
      completedAt: new Date().toISOString()
    })

    setSignatureSaved(true)
    setBapResult(record)
    onComplete(record)
  }

  return (
    <Card
      title="Tanda Tangan BAP & Evaluasi Kepuasan"
      subtitle="Pengesahan Berita Acara Pekerjaan (BAP) digital oleh perwakilan klien"
      className="space-y-3"
    >
      <div className="flex items-center justify-between">
        <span className="text-[0.75rem] font-bold text-slate-700">Nomor SPK:</span>
        <Badge variant="neutral">{spkNumber}</Badge>
      </div>

      <Input
        label="Nama Penandatangan (Klien)"
        value={signerName}
        onChange={(e) => setSignerName(e.target.value)}
      />

      <div className="space-y-1">
        <label className="block text-[0.75rem] font-semibold text-slate-700">
          Rating Kepuasan Teknisi ({rating} / 5 Bintang)
        </label>
        <div className="flex gap-1.5">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              className={`w-8 h-8 rounded-lg text-[0.82rem] font-bold transition-all ${
                rating >= star
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
              }`}
            >
              ★
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <label className="block text-[0.75rem] font-semibold text-slate-700">
          Ulasan / Catatan Lapangan
        </label>
        <textarea
          rows={2}
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          className="w-full p-2.5 text-[0.78rem] bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
        />
      </div>

      {/* Signature Canvas Box Simulator */}
      <div className="space-y-1">
        <label className="block text-[0.75rem] font-semibold text-slate-700">
          Area Tanda Tangan Klien Digital
        </label>
        <div className="h-24 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-slate-400 text-[0.75rem]">
          {signatureSaved ? (
            <span className="text-emerald-700 font-semibold">✓ Tanda Tangan Digital Terverifikasi</span>
          ) : (
            <span>Tanda tangan di layar sentuh perangkat</span>
          )}
        </div>
      </div>

      <Button onClick={handleSignAndSubmit} className="w-full">
        Sahkan BAP & Simpan Tanda Tangan
      </Button>

      {bapResult && (
        <div className="p-2.5 rounded-lg border border-emerald-200 bg-emerald-50/60 text-[0.75rem] space-y-1 text-emerald-900">
          <div className="font-bold">✓ BAP Resmi Berhasil Diterbitkan</div>
          <div>Nomor BAP: <span className="font-mono font-semibold">{bapResult.bapNumber}</span></div>
          <div>Verifikasi Hash: <span className="font-mono text-[0.7rem] text-slate-600">{bapResult.verificationHash}</span></div>
          <div>Status Legal: <Badge variant="valid">DEFENSIBLE AUDIT TRAIL</Badge></div>
        </div>
      )}
    </Card>
  )
}
