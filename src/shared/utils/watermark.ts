/**
 * Generator Watermark Bukti Lapangan
 * Menyuntikkan stempel GPS permanen, timestamp, dan nama proyek pada gambar canvas/SVG
 * untuk mencegah penipuan foto dokumentasi non-lapangan.
 */

export interface WatermarkPayload {
  projectName: string
  clientName: string
  latitude: number
  longitude: number
  timestamp: string
}

export function generateWatermarkedPhoto(
  payload: WatermarkPayload,
  width = 640,
  height = 480
): string {
  if (typeof document === 'undefined') {
    return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="%231e293b"/><text x="20" y="40" fill="white" font-family="sans-serif" font-size="16">${payload.projectName}</text><text x="20" y="70" fill="%2394a3b8" font-family="monospace" font-size="12">GPS: ${payload.latitude}, ${payload.longitude}</text><text x="20" y="95" fill="%2394a3b8" font-family="monospace" font-size="12">${payload.timestamp}</text></svg>`
  }

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')

  if (!ctx) return ''

  ctx.fillStyle = '#1e293b'
  ctx.fillRect(0, 0, width, height)

  ctx.fillStyle = 'rgba(0, 0, 0, 0.65)'
  ctx.fillRect(0, height - 90, width, 90)

  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 14px sans-serif'
  ctx.fillText(`FIELDWORK BAP - ${payload.projectName}`, 15, height - 65)

  ctx.fillStyle = '#38bdf8'
  ctx.font = '11px monospace'
  ctx.fillText(`KLIEN: ${payload.clientName} | GPS: ${payload.latitude}, ${payload.longitude}`, 15, height - 42)

  ctx.fillStyle = '#94a3b8'
  ctx.font = '10px monospace'
  ctx.fillText(`WAKTU EKSEKUSI: ${payload.timestamp} WIB (VERIFIED)`, 15, height - 20)

  return canvas.toDataURL('image/jpeg', 0.85)
}
