import { fetchAuthedBlobUrl } from '@/shared/api/client';

const MAX_DIM = 1280;      // sisi terpanjang foto di PDF (cukup tajam untuk cetak A4, ukuran file wajar)
const JPEG_QUALITY = 0.82;

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(blob);
  });
}

/** Kecilkan & kompres ke JPEG. Tanpa ini, foto kamera 12 MP × 10 foto membuat PDF puluhan MB. */
async function downscaleToJpeg(blob: Blob): Promise<string> {
  const bmp = await createImageBitmap(blob);
  const r = Math.min(1, MAX_DIM / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * r);
  canvas.height = Math.round(bmp.height * r);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas tidak tersedia');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close?.();
  return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
}

/**
 * Mengambil foto bukti dari endpoint terautentikasi dan mengembalikannya sebagai data URL (untuk disematkan
 * ke PDF). Mengembalikan undefined bila gagal/dihapus — satu foto bermasalah tidak boleh menggagalkan seluruh PDF.
 */
export async function fetchPhotoDataUrl(path: string): Promise<string | undefined> {
  let objectUrl: string | undefined;
  try {
    objectUrl = await fetchAuthedBlobUrl(path);
    const blob = await (await fetch(objectUrl)).blob();
    try {
      return await downscaleToJpeg(blob);
    } catch {
      return await blobToDataUrl(blob); // fallback: apa adanya
    }
  } catch {
    return undefined;
  } finally {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
}
