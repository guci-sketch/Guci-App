import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, RefreshCw, X, Check, MapPin, ShieldCheck, AlertTriangle, Crosshair } from 'lucide-react';
import { applyWatermarkToCanvas, canvasToJpegBlob } from '../../utils/watermark';
import { calculateDistanceMeters, formatDistance } from '../../utils/geo';
import { PhotoType } from '../../types';

interface CameraCaptureModalProps {
  photoType: PhotoType;
  projectName: string;
  projectLat: number;
  projectLng: number;
  projectRadius: number;
  executorName: string;
  onCaptureComplete: (data: { photoBlob: Blob; latitude: number; longitude: number; accuracy: number }) => void;
  onClose: () => void;
}

type GpsState =
  | { status: 'idle' }
  | { status: 'locating' }
  | { status: 'ready'; latitude: number; longitude: number; accuracy: number }
  | { status: 'denied'; message: string };

type CameraState = { status: 'starting' } | { status: 'ready' } | { status: 'blocked'; message: string };

/**
 * Every field is authoritative from the device: GPS comes only from
 * navigator.geolocation, and the photo comes only from a live getUserMedia
 * feed. If either isn't available, the flow stops and asks the person to
 * fix it — it never invents a location or a picture to let them through
 * (that would defeat the entire purpose of the evidence system).
 */
export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  photoType,
  projectName,
  projectLat,
  projectLng,
  projectRadius,
  executorName,
  onCaptureComplete,
  onClose,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [camera, setCamera] = useState<CameraState>({ status: 'starting' });
  const [gps, setGps] = useState<GpsState>({ status: 'idle' });
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [capturedPreviewUrl, setCapturedPreviewUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isShutterActive, setIsShutterActive] = useState(false);

  const requestGps = useCallback(() => {
    setGps({ status: 'locating' });
    if (!navigator.geolocation) {
      setGps({ status: 'denied', message: 'Perangkat ini tidak mendukung layanan lokasi.' });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => setGps({ status: 'ready', latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy || 15 }),
      err => setGps({ status: 'denied', message: err.code === err.PERMISSION_DENIED ? 'Izin lokasi ditolak. Aktifkan GPS dan izinkan akses lokasi untuk melanjutkan.' : 'Lokasi belum tersedia. Pastikan GPS aktif dan coba lagi.' }),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  useEffect(() => {
    let cancelled = false;

    const start = async () => {
      setCamera({ status: 'starting' });
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('Kamera tidak didukung oleh peramban ini.');
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facingMode }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
        setCamera({ status: 'ready' });
      } catch (err) {
        const message = err instanceof Error && err.name === 'NotAllowedError'
          ? 'Izin kamera ditolak. Aktifkan akses kamera pada pengaturan peramban untuk melanjutkan.'
          : 'Kamera tidak dapat diakses. Pastikan tidak digunakan aplikasi lain dan coba lagi.';
        setCamera({ status: 'blocked', message });
      }
    };

    start();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [facingMode]);

  const toggleFacingMode = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    setFacingMode(prev => (prev === 'environment' ? 'user' : 'environment'));
  };

  const distance = gps.status === 'ready'
    ? calculateDistanceMeters({ latitude: gps.latitude, longitude: gps.longitude }, { latitude: projectLat, longitude: projectLng })
    : null;
  const isWithinRadius = distance !== null && distance <= projectRadius;

  const canCapture = camera.status === 'ready' && gps.status === 'ready';

  const handleShutter = async () => {
    if (!canCapture || isProcessing || gps.status !== 'ready' || !videoRef.current) return;
    setIsProcessing(true);
    setIsShutterActive(true);
    window.setTimeout(async () => {
      setIsShutterActive(false);
      try {
        const canvas = applyWatermarkToCanvas(videoRef.current!, {
          projectName,
          executorName,
          photoType,
          latitude: gps.latitude,
          longitude: gps.longitude,
          accuracy: gps.accuracy,
          timestamp: new Date(),
          isWithinRadius,
          distanceMeters: distance ?? 0,
        });
        const blob = await canvasToJpegBlob(canvas);
        setCapturedBlob(blob);
        setCapturedPreviewUrl(URL.createObjectURL(blob));
      } catch (e) {
        console.error('Gagal memproses foto:', e);
      } finally {
        setIsProcessing(false);
      }
    }, 120);
  };

  const handleRetake = () => {
    if (capturedPreviewUrl) URL.revokeObjectURL(capturedPreviewUrl);
    setCapturedBlob(null);
    setCapturedPreviewUrl(null);
  };

  const handleConfirm = () => {
    if (!capturedBlob || gps.status !== 'ready') return;
    streamRef.current?.getTracks().forEach(t => t.stop());
    onCaptureComplete({ photoBlob: capturedBlob, latitude: gps.latitude, longitude: gps.longitude, accuracy: gps.accuracy });
  };

  const typeLabel =
    photoType === 'CHECK_IN' ? 'DOKUMENTASI CHECK-IN' : photoType === 'CHECK_OUT' ? 'DOKUMENTASI CHECK-OUT' : 'DOKUMENTASI PROGRES PEKERJAAN';

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black text-white select-none overflow-hidden">
      {isShutterActive && <div className="absolute inset-0 bg-white z-50 transition-opacity duration-150 pointer-events-none" />}

      <div className="relative z-30 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`text-[11px] font-bold px-2.5 py-0.5 rounded tracking-wide shrink-0 ${
              photoType === 'CHECK_IN' ? 'bg-emerald-500 text-slate-950' : photoType === 'CHECK_OUT' ? 'bg-blue-500 text-slate-950' : 'bg-amber-500 text-slate-950'
            }`}
          >
            {typeLabel}
          </span>
          <span className="text-xs text-slate-300 font-medium truncate">{projectName}</span>
        </div>
        <button onClick={onClose} className="p-2 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-white shrink-0">
          <X size={20} />
        </button>
      </div>

      <div className="relative flex-1 bg-slate-950 flex items-center justify-center overflow-hidden">
        {!capturedPreviewUrl ? (
          <>
            <video
              ref={videoRef}
              playsInline
              autoPlay
              muted
              className={`w-full h-full object-cover ${camera.status === 'ready' ? '' : 'hidden'}`}
            />

            {camera.status === 'starting' && (
              <div className="flex flex-col items-center text-center px-6">
                <span className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin mb-3" />
                <p className="text-sm text-slate-300">Mengaktifkan kamera...</p>
              </div>
            )}

            {camera.status === 'blocked' && (
              <div className="flex flex-col items-center text-center p-6 max-w-sm">
                <div className="w-16 h-16 rounded-full bg-slate-800/80 flex items-center justify-center text-rose-400 mb-3 border border-slate-700">
                  <Camera size={30} />
                </div>
                <p className="text-sm font-semibold text-slate-100 mb-1">Kamera Tidak Tersedia</p>
                <p className="text-xs text-[var(--text-muted)] mb-4 leading-relaxed">{camera.message}</p>
                <button
                  onClick={() => setFacingMode(f => f)}
                  className="text-xs font-semibold bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white px-4 py-2 rounded-lg"
                >
                  Coba Lagi
                </button>
              </div>
            )}

            {camera.status === 'ready' && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-30">
                <Crosshair size={64} className="text-white" />
              </div>
            )}

            {/* GPS HUD (PRD Section 44) */}
            <div className="absolute top-4 inset-x-4 z-20 pointer-events-none">
              <div className="bg-[var(--accent)]/85  border border-slate-700/80 rounded-xl p-3 shadow-lg flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs gap-2">
                  <span className="flex items-center gap-1.5 font-bold text-slate-200 min-w-0 truncate">
                    <MapPin size={14} className="text-sky-400 shrink-0" />
                    {gps.status === 'idle' && 'Lokasi belum aktif'}
                    {gps.status === 'locating' && 'Menentukan lokasi Anda...'}
                    {gps.status === 'ready' && `${gps.latitude.toFixed(6)}, ${gps.longitude.toFixed(6)}`}
                    {gps.status === 'denied' && 'Lokasi tidak tersedia'}
                  </span>
                  {gps.status === 'locating' && <span className="text-[11px] text-amber-400 animate-pulse shrink-0">Mencari sinyal...</span>}
                  {gps.status === 'ready' &&
                    (isWithinRadius ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/40 shrink-0">
                        <ShieldCheck size={12} /> Valid ({formatDistance(distance!)})
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-400 bg-red-950/80 px-2 py-0.5 rounded border border-red-500/40 shrink-0">
                        <AlertTriangle size={12} /> Di Luar Radius ({formatDistance(distance!)})
                      </span>
                    ))}
                </div>
                {gps.status === 'ready' && (
                  <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] border-t border-slate-800/80 pt-1">
                    <span>Radius Proyek: {projectRadius}m</span>
                    <span>Akurasi GPS: ±{Math.round(gps.accuracy)}m</span>
                  </div>
                )}
              </div>
            </div>

            {gps.status === 'idle' && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 px-6 backdrop-blur-sm">
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-sm text-center shadow-2xl pointer-events-auto">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto mb-4 border border-emerald-500/30">
                    <MapPin size={32} />
                  </div>
                  <h3 className="text-base font-bold text-white mb-2">Akses Lokasi Dibutuhkan</h3>
                  <p className="text-xs text-slate-300 mb-6 leading-relaxed">
                    Sistem membutuhkan izin akses GPS pada perangkat Anda untuk mencatat titik koordinat check-in secara otomatis.
                  </p>
                  <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-300 font-semibold text-sm transition-colors hover:bg-slate-700">
                      Batal
                    </button>
                    <button onClick={requestGps} className="flex-1 py-3 rounded-xl bg-emerald-600 text-white font-bold text-sm transition-colors hover:bg-emerald-500 shadow-lg shadow-emerald-900/50">
                      Izinkan GPS
                    </button>
                  </div>
                </div>
              </div>
            )}

            {gps.status === 'denied' && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 px-6 backdrop-blur-sm">
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-sm text-center shadow-2xl pointer-events-auto">
                  <div className="w-16 h-16 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-400 mx-auto mb-4 border border-rose-500/30">
                    <AlertTriangle size={32} />
                  </div>
                  <h3 className="text-base font-bold text-white mb-2">Akses Lokasi Ditolak</h3>
                  <p className="text-xs text-slate-300 mb-6 leading-relaxed">
                    {gps.message}
                  </p>
                  <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-300 font-semibold text-sm transition-colors hover:bg-slate-700">
                      Tutup
                    </button>
                    <button onClick={requestGps} className="flex-1 py-3 rounded-xl bg-rose-600 text-white font-bold text-sm transition-colors hover:bg-rose-500 shadow-lg shadow-rose-900/50">
                      Coba Lagi
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="relative w-full h-full flex items-center justify-center p-2 bg-black">
            <img src={capturedPreviewUrl} alt="Hasil Foto Watermark" className="max-h-full max-w-full object-contain rounded-lg shadow-2xl" />
            <div className="absolute top-4 left-4 bg-emerald-600/90  text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg">
              <ShieldCheck size={14} /> Watermark Otomatis Tersemat
            </div>
          </div>
        )}
      </div>

      <div className="relative z-30 px-6 py-5 bg-gradient-to-t from-black via-black/90 to-transparent flex items-center justify-between min-h-[96px]">
        {!capturedPreviewUrl ? (
          <>
            <button
              type="button"
              onClick={toggleFacingMode}
              disabled={camera.status !== 'ready'}
              className="p-3.5 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-200 active:scale-90 transition-all border border-slate-700 disabled:opacity-40"
              title="Balik Kamera"
            >
              <RefreshCw size={22} />
            </button>

            <div className="flex flex-col items-center">
              <button
                type="button"
                onClick={handleShutter}
                disabled={!canCapture || isProcessing}
                className="w-18 h-18 rounded-full border-4 border-white p-1 flex items-center justify-center bg-transparent active:scale-95 transition-all focus:outline-none shadow-xl disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <div className="w-full h-full rounded-full bg-white hover:bg-slate-200 transition-colors" />
              </button>
              <span className="text-[11px] text-[var(--text-muted)] mt-1 font-medium">
                {canCapture ? 'AMBIL FOTO' : 'MENUNGGU KAMERA & GPS'}
              </span>
            </div>

            <div className="w-12" />
          </>
        ) : (
          <div className="w-full flex items-center justify-between gap-4 max-w-md mx-auto">
            <button
              type="button"
              onClick={handleRetake}
              className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm transition-all border border-slate-700 flex items-center justify-center gap-2"
            >
              <RefreshCw size={16} /> Foto Ulang
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 active:scale-95"
            >
              <Check size={18} /> Gunakan Foto
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
