import React, { useRef, useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface CustomerReviewFormModalProps {
  technicianName?: string;
  onClose: () => void;
  onSubmit: (data: {
    customerName: string;
    customerPhone: string;
    customerFeedback: string;
    customerSignature: string;
    technicianSignature: string;
  }) => void;
}

function initCanvas(canvas: HTMLCanvasElement | null) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * window.devicePixelRatio;
  canvas.height = rect.height * window.devicePixelRatio;
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = '#0f172a';
}

function getCoords(e: React.PointerEvent<HTMLCanvasElement>, canvas: HTMLCanvasElement | null) {
  if (!canvas) return { x: 0, y: 0 };
  const rect = canvas.getBoundingClientRect();
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  };
}

export const CustomerReviewFormModal: React.FC<CustomerReviewFormModalProps> = ({
  technicianName = 'Teknisi Lapangan',
  onClose,
  onSubmit,
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [feedback, setFeedback] = useState('');

  // 1. Canvas Tanda Tangan Teknisi
  const techCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isTechDrawing, setIsTechDrawing] = useState(false);
  const [hasTechSignature, setHasTechSignature] = useState(false);

  // 2. Canvas Tanda Tangan Pelanggan
  const custCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isCustDrawing, setIsCustDrawing] = useState(false);
  const [hasCustSignature, setHasCustSignature] = useState(false);

  const [error, setError] = useState('');

  useEffect(() => {
    initCanvas(techCanvasRef.current);
    initCanvas(custCanvasRef.current);
  }, []);

  const clearCanvas = (
    ref: React.RefObject<HTMLCanvasElement | null>,
    setHasSig: (val: boolean) => void
  ) => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width / window.devicePixelRatio, canvas.height / window.devicePixelRatio);
    setHasSig(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Nama perwakilan pelanggan wajib diisi.');
      return;
    }
    if (!hasCustSignature) {
      setError('Tanda tangan perwakilan pelanggan wajib diisi.');
      return;
    }
    if (!hasTechSignature) {
      setError('Tanda tangan teknisi bertugas wajib diisi.');
      return;
    }

    const custSig = custCanvasRef.current?.toDataURL('image/png') || '';
    const techSig = techCanvasRef.current?.toDataURL('image/png') || '';

    onSubmit({
      customerName: name.trim(),
      customerPhone: phone.trim(),
      customerFeedback: feedback.trim(),
      customerSignature: custSig,
      technicianSignature: techSig,
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-[var(--bg-card)] rounded-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh] shadow-2xl border border-[var(--border-subtle)]">
        {/* Header Bersih */}
        <div className="px-5 py-3.5 border-b border-[var(--border-subtle)] flex items-center justify-between shrink-0 bg-[var(--bg-primary)]">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-[var(--text-primary)]">
              Berita Acara &amp; Pengesahan Pekerjaan
            </h2>
            <p className="text-[11px] text-[var(--text-muted)] font-medium">
              Konfirmasi penyelesaian tugas bersama perwakilan pelanggan di lokasi.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
            aria-label="Tutup"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 font-medium">
              {error}
            </div>
          )}

          {/* Kolom Identitas Pelanggan */}
          <div className="space-y-3">
            <div>
              <label className="block font-semibold text-[var(--text-secondary)] mb-1">
                Nama Lengkap Pelanggan / Penanggung Jawab Gedung *
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Contoh: Bpk. Hendra / Ibu Tannia"
                className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-lg text-xs focus:outline-none focus:border-emerald-600 transition-colors"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-[var(--text-secondary)] mb-1">
                  Nomor Telepon / WhatsApp Klien
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="08123456789"
                  className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-lg text-xs focus:outline-none focus:border-emerald-600 transition-colors"
                />
              </div>
              <div>
                <label className="block font-semibold text-[var(--text-secondary)] mb-1">
                  Petugas Teknisi Bertugas
                </label>
                <div className="px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] font-bold truncate">
                  {technicianName}
                </div>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-[var(--text-secondary)] mb-1">
                Kritik, Saran &amp; Evaluasi Klien (Opsional)
              </label>
              <textarea
                value={feedback}
                onChange={e => setFeedback(e.target.value)}
                rows={2}
                placeholder="Catatan hasil perlakuan atau masukan pelanggan..."
                className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-lg text-xs focus:outline-none focus:border-emerald-600 transition-colors resize-none"
              />
            </div>
          </div>

          {/* ── BAGIAN TANDA TANGAN GANDA ── */}
          <div className="space-y-3.5 pt-2 border-t border-[var(--border-subtle)]">
            {/* 1. Tanda Tangan Teknisi */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-[var(--text-primary)]">
                  1. Tanda Tangan Petugas Teknisi ({technicianName}) *
                </span>
                {hasTechSignature && (
                  <button
                    type="button"
                    onClick={() => clearCanvas(techCanvasRef, setHasTechSignature)}
                    className="text-[11px] font-semibold text-rose-600 hover:underline cursor-pointer"
                  >
                    Hapus Ulang
                  </button>
                )}
              </div>
              <div className="border border-[var(--border-subtle)] rounded-xl bg-white overflow-hidden touch-none h-28 relative">
                {!hasTechSignature && (
                  <div className="absolute inset-0 flex items-center justify-center text-slate-300 pointer-events-none text-xs">
                    Paraf teknisi bertugas di sini
                  </div>
                )}
                <canvas
                  ref={techCanvasRef}
                  onPointerDown={e => {
                    const ctx = techCanvasRef.current?.getContext('2d');
                    if (!ctx) return;
                    setIsTechDrawing(true);
                    setHasTechSignature(true);
                    const { x, y } = getCoords(e, techCanvasRef.current);
                    ctx.beginPath();
                    ctx.moveTo(x, y);
                    ctx.lineTo(x, y);
                    ctx.stroke();
                    (e.target as HTMLElement).setPointerCapture(e.pointerId);
                  }}
                  onPointerMove={e => {
                    if (!isTechDrawing) return;
                    const ctx = techCanvasRef.current?.getContext('2d');
                    if (!ctx) return;
                    const { x, y } = getCoords(e, techCanvasRef.current);
                    ctx.lineTo(x, y);
                    ctx.stroke();
                  }}
                  onPointerUp={e => {
                    setIsTechDrawing(false);
                    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
                  }}
                  onPointerOut={e => {
                    setIsTechDrawing(false);
                  }}
                  className="w-full h-full cursor-crosshair relative z-10"
                  style={{ touchAction: 'none' }}
                />
              </div>
            </div>

            {/* 2. Tanda Tangan Pelanggan */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-[var(--text-primary)]">
                  2. Tanda Tangan Perwakilan Pelanggan *
                </span>
                {hasCustSignature && (
                  <button
                    type="button"
                    onClick={() => clearCanvas(custCanvasRef, setHasCustSignature)}
                    className="text-[11px] font-semibold text-rose-600 hover:underline cursor-pointer"
                  >
                    Hapus Ulang
                  </button>
                )}
              </div>
              <div className="border border-[var(--border-subtle)] rounded-xl bg-white overflow-hidden touch-none h-28 relative">
                {!hasCustSignature && (
                  <div className="absolute inset-0 flex items-center justify-center text-slate-300 pointer-events-none text-xs">
                    Tanda tangan pelanggan di sini
                  </div>
                )}
                <canvas
                  ref={custCanvasRef}
                  onPointerDown={e => {
                    const ctx = custCanvasRef.current?.getContext('2d');
                    if (!ctx) return;
                    setIsCustDrawing(true);
                    setHasCustSignature(true);
                    const { x, y } = getCoords(e, custCanvasRef.current);
                    ctx.beginPath();
                    ctx.moveTo(x, y);
                    ctx.lineTo(x, y);
                    ctx.stroke();
                    (e.target as HTMLElement).setPointerCapture(e.pointerId);
                  }}
                  onPointerMove={e => {
                    if (!isCustDrawing) return;
                    const ctx = custCanvasRef.current?.getContext('2d');
                    if (!ctx) return;
                    const { x, y } = getCoords(e, custCanvasRef.current);
                    ctx.lineTo(x, y);
                    ctx.stroke();
                  }}
                  onPointerUp={e => {
                    setIsCustDrawing(false);
                    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
                  }}
                  onPointerOut={e => {
                    setIsCustDrawing(false);
                  }}
                  className="w-full h-full cursor-crosshair relative z-10"
                  style={{ touchAction: 'none' }}
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2.5 rounded-xl transition-colors text-xs uppercase tracking-wider cursor-pointer shadow-xs"
          >
            Sahkan Berita Acara &amp; Check-Out
          </button>
        </form>
      </div>
    </div>
  );
};
