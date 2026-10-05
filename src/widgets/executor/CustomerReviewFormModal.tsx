import React, { useRef, useState, useEffect } from 'react';
import { X, Eraser, CheckCircle2 } from 'lucide-react';

interface CustomerReviewFormModalProps {
  onClose: () => void;
  onSubmit: (data: { customerName: string; customerPhone: string; customerFeedback: string; customerSignature: string }) => void;
}

export const CustomerReviewFormModal: React.FC<CustomerReviewFormModalProps> = ({ onClose, onSubmit }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [feedback, setFeedback] = useState('');
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [error, setError] = useState('');

  // Setup canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set proper resolution for high DPI displays
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#0f172a'; // slate-900
  }, []);

  const getCoordinates = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    
    setIsDrawing(true);
    setHasSignature(true);
    
    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    // Needed to draw a single dot if user just taps
    ctx.lineTo(x, y);
    ctx.stroke();
    
    // Prevent scrolling while drawing on touch devices
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setIsDrawing(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Must clear using raw width/height, not scaled width/height
    ctx.clearRect(0, 0, canvas.width / window.devicePixelRatio, canvas.height / window.devicePixelRatio);
    setHasSignature(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Nama pengawas/pelanggan wajib diisi.');
      return;
    }
    if (!hasSignature) {
      setError('Tanda tangan wajib diisi sebagai bukti penyelesaian pekerjaan.');
      return;
    }
    
    const signatureBase64 = canvasRef.current?.toDataURL('image/png') || '';
    
    onSubmit({
      customerName: name.trim(),
      customerPhone: phone.trim(),
      customerFeedback: feedback.trim(),
      customerSignature: signatureBase64
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center  justify-center pt-10 sm:pt-0 pb-10 sm:pb-0  p-4 sm:p-6 bg-[var(--accent)]/80  animate-in fade-in duration-200">
      <div className="bg-[var(--bg-card)] rounded-2xl w-full max-w-lg overflow-hidden flex flex-col rounded-t-2xl sm:rounded-b-2xl sm:rounded-2xl h-[95dvh] sm:h-auto sm:max-h-[85dvh] shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="px-4 py-3 border-b border-[var(--border-subtle)] flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-base font-bold text-[var(--text-primary)]">Serah Terima Pekerjaan</h2>
            <p className="text-[11px] text-[var(--text-muted)] font-medium">Lengkapi form ini bersama pelanggan di lokasi.</p>
          </div>
          <button onClick={onClose} className="p-2 -mr-2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] rounded-full hover:bg-[var(--bg-tertiary)] transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto p-4 space-y-4 pb-32 sm:pb-4">
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3.5 rounded-xl flex items-start gap-3">
            <CheckCircle2 className="shrink-0 mt-0.5 text-emerald-600" size={18} />
            <p className="text-xs font-semibold leading-relaxed">
              Silakan isi form ini. Setelah selesai, langsung klik tombol <span className="font-bold uppercase tracking-wide">Kirim Ulasan</span>. Ulasan Anda bersifat rahasia dan akan langsung dikirim ke sistem evaluasi manajemen.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5">Nama Lengkap Pelanggan/Pengawas</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Cth: Bpk. Ahmad"
                className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-emerald-500 transition-all"
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5">Nomor Handphone (Opsional)</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="Cth: 08123456789"
                className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-emerald-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5">Kritik & Saran</label>
              <textarea
                value={feedback}
                onChange={e => setFeedback(e.target.value)}
                rows={3}
                placeholder="Masukan Anda sangat berarti untuk evaluasi tim kami..."
                className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-emerald-500 transition-all resize-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-[var(--text-secondary)]">Tanda Tangan</label>
                {hasSignature && (
                  <button type="button" onClick={clearSignature} className="text-[11px] font-bold text-rose-600 flex items-center gap-1 hover:text-rose-700">
                    <Eraser size={12} /> Hapus Ulang
                  </button>
                )}
              </div>
              <div className="border border-[var(--border-subtle)] rounded-xl bg-[var(--bg-tertiary)] overflow-hidden touch-none h-32 relative">
                {!hasSignature && (
                  <div className="absolute inset-0 flex items-center justify-center text-slate-300 pointer-events-none text-xs font-medium">
                    Tanda tangan di sini
                  </div>
                )}
                <canvas
                  ref={canvasRef}
                  onPointerDown={startDrawing}
                  onPointerMove={draw}
                  onPointerUp={stopDrawing}
                  onPointerOut={stopDrawing}
                  className="w-full h-full cursor-crosshair relative z-10"
                  style={{ touchAction: "none" }}
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-lg transition-all shadow-sm active:scale-95 text-xs uppercase tracking-wide"
          >
            Kirim Ulasan &amp; Check-Out
          </button>
        </form>
      </div>
    </div>
  );
};
