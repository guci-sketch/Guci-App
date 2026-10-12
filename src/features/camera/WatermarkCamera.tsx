import React, { useState } from 'react'
import { Button } from '@/shared/ui/Button'
import { Card } from '@/shared/ui/Card'
import { Badge } from '@/shared/ui/Badge'
import { generateWatermarkedPhoto, WatermarkPayload } from '@/shared/utils/watermark'

export interface WatermarkCameraProps {
  payload: WatermarkPayload
  onCapture: (imageDataUrl: string) => void
}

export const WatermarkCamera: React.FC<WatermarkCameraProps> = ({ payload, onCapture }) => {
  const [capturedImage, setCapturedImage] = useState<string | null>(null)

  const handleTakePhoto = () => {
    const dataUrl = generateWatermarkedPhoto(payload)
    setCapturedImage(dataUrl)
    onCapture(dataUrl)
  }

  return (
    <Card
      title="Kamera Dokumentasi Lapangan"
      subtitle="Pengambilan foto bukti dengan stempel permanen koordinat & timestamp"
      className="space-y-3"
    >
      <div className="flex items-center justify-between">
        <span className="text-[0.75rem] font-semibold text-slate-700">Target Watermark:</span>
        <Badge variant="valid">GPS WATERMARK ACTIVE</Badge>
      </div>

      <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-[0.72rem] font-mono space-y-0.5 text-slate-600">
        <div>Lokasi: <strong>{payload.projectName}</strong></div>
        <div>Koordinat: {payload.latitude}, {payload.longitude}</div>
        <div>Waktu: {payload.timestamp}</div>
      </div>

      {capturedImage ? (
        <div className="space-y-2">
          <div className="relative rounded-lg overflow-hidden border border-slate-300">
            <img src={capturedImage} alt="Foto Bukti Lapangan" className="w-full h-auto object-cover" />
          </div>
          <Button variant="outline" onClick={handleTakePhoto} className="w-full">
            Ambil Ulang Foto
          </Button>
        </div>
      ) : (
        <Button onClick={handleTakePhoto} className="w-full">
          Ambil Foto Bukti Pengerjaan
        </Button>
      )}
    </Card>
  )
}
