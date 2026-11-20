import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, Compass, Sparkles, X } from 'lucide-react';

export const TECH_GUIDE_STORAGE_KEY = 'fw_tech_guide_done_v1';

export interface SpotlightStep {
  id: string;
  target: string;
  title: string;
  description: string;
  /** Optional small tip shown quietly below description */
  tip?: string;
}

export const TECH_TOUR_STEPS: SpotlightStep[] = [
  {
    id: 'header-status',
    target: 'header-status',
    title: 'Cek Sinyal & Antrean',
    description:
      'Di sini kelihatan HP lagi Online atau Offline. Kalau sinyal sempat hilang, data kerja tetap aman dan bisa dikirim ulang lewat sini.',
  },
  {
    id: 'kpi-strip',
    target: 'kpi-strip',
    title: 'Ringkasan Kerja Hari Ini',
    description:
      'Sekali lihat langsung tahu berapa tugas hari ini, berapa yang sudah beres, dan mana yang masih menunggu.',
  },
  {
    id: 'primary-task',
    target: 'primary-task',
    title: 'Tugas yang Harus Dikerjakan',
    description:
      'Ini jadwal paling dekat buat Anda. Tinggal pencet tombol hijau di bawahnya untuk langsung Check-in GPS atau lanjut isi laporan.',
  },
  {
    id: 'quick-actions',
    target: 'quick-actions',
    title: 'Tambah Lokasi & Sinkron Cepat',
    description:
      'Ada tugas mendadak di lapangan? Pencet Tugas Baru. Mau perbarui jadwal terbaru dari kantor? Tinggal pencet Sinkron Data.',
  },
  {
    id: 'upcoming-jobs',
    target: 'upcoming-jobs',
    title: 'Daftar Kunjungan Selanjutnya',
    description:
      'Semua lokasi berikutnya sudah urut di sini, jadi gampang atur rute tanpa bolak-balik tanya admin.',
  },
  {
    id: 'nav-jobs-history',
    target: 'nav-jobs-history',
    title: 'Pindah ke Daftar Tugas & Riwayat',
    description:
      'Buka menu Tugas untuk cek jadwal Kemarin, Hari Ini, atau Besok. Menu Riwayat dipakai kalau mau unduh ulang PDF atau kirim WA ke customer.',
  },
  {
    id: 'nav-profile',
    target: 'nav-profile',
    title: 'Atur Tampilan & Putar Ulang Panduan',
    description:
      'Di Profil Anda bisa ganti ke Mode Gelap (enak dipakai di basement), bersihkan cache foto, atau buka ulang panduan ini kapan saja.',
  },
];

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface TechnicianSpotlightGuideProps {
  mode: 'idle' | 'prompt' | 'tour';
  onAcceptTour: () => void;
  onDismiss: () => void;
  onComplete: () => void;
}

export const TechnicianSpotlightGuide: React.FC<TechnicianSpotlightGuideProps> = ({
  mode,
  onAcceptTour,
  onDismiss,
  onComplete,
}) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const [viewport, setViewport] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 390,
    height: typeof window !== 'undefined' ? window.innerHeight : 844,
  }));

  // Build active steps matching currently mounted DOM targets (gracefully skips missing sections)
  const activeSteps = useMemo(() => {
    if (mode !== 'tour' || typeof document === 'undefined') return TECH_TOUR_STEPS;
    const available = TECH_TOUR_STEPS.filter(step =>
      Boolean(document.querySelector(`[data-tour="${step.target}"]`))
    );
    return available.length > 0 ? available : TECH_TOUR_STEPS;
  }, [mode]);

  useEffect(() => {
    if (mode === 'tour') {
      setStepIndex(0);
    }
  }, [mode]);

  const currentStep = activeSteps[Math.min(stepIndex, activeSteps.length - 1)];

  const measureCurrentTarget = useCallback(() => {
    if (mode !== 'tour' || !currentStep) {
      setTargetRect(null);
      return;
    }
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    setViewport({ width: vw, height: vh });

    const el = document.querySelector(`[data-tour="${currentStep.target}"]`) as HTMLElement | null;
    if (!el) {
      setTargetRect(null);
      return;
    }

    const r = el.getBoundingClientRect();
    const pad = 6;
    const top = Math.max(4, r.top - pad);
    const left = Math.max(4, r.left - pad);
    const right = Math.min(vw - 4, r.right + pad);
    const bottom = Math.min(vh - 4, r.bottom + pad);

    setTargetRect({
      top,
      left,
      width: Math.max(24, right - left),
      height: Math.max(24, bottom - top),
    });
  }, [mode, currentStep]);

  // Scroll target smoothly into comfortable view & keep cutout locked on resize/scroll
  useLayoutEffect(() => {
    if (mode !== 'tour' || !currentStep) return;

    const el = document.querySelector(`[data-tour="${currentStep.target}"]`) as HTMLElement | null;
    if (el) {
      const rect = el.getBoundingClientRect();
      const isStickyBottom = currentStep.target.startsWith('nav-');
      const isTopHeader = currentStep.target === 'header-status';
      if (!isStickyBottom && !isTopHeader) {
        const outOfView = rect.top < 76 || rect.bottom > window.innerHeight - 170;
        if (outOfView) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      } else if (isTopHeader && window.scrollY > 20) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }

    measureCurrentTarget();
    const t1 = window.setTimeout(measureCurrentTarget, 180);
    const t2 = window.setTimeout(measureCurrentTarget, 380);

    const handleReposition = () => measureCurrentTarget();
    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [mode, currentStep, measureCurrentTarget]);

  // Escape key closes prompt or tour safely
  useEffect(() => {
    if (mode === 'idle') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onDismiss();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mode, onDismiss]);

  if (mode === 'idle') return null;

  // =========================================================================
  // PHASE 1: OPT-IN PROMPT MODAL (FRIENDLY EVERYDAY INDONESIAN)
  // =========================================================================
  if (mode === 'prompt') {
    return (
      <AnimatePresence>
        <div
          className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#070c12]/72 backdrop-blur-xs"
          onClick={onDismiss}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="guide-prompt-title"
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            onClick={e => e.stopPropagation()}
            className="tech-lite-shell bg-[var(--tl-card)] text-[var(--tl-text)] rounded-t-3xl sm:rounded-2xl w-full max-w-[390px] shadow-2xl overflow-hidden"
          >
            <div className="px-5 pt-5 pb-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[var(--tl-secondary-container)] text-[var(--tl-on-secondary-container)] flex items-center justify-center shrink-0">
                  <Compass size={20} />
                </div>
                <button
                  type="button"
                  onClick={onDismiss}
                  aria-label="Tutup ajakan panduan"
                  className="w-8 h-8 rounded-full bg-[var(--tl-low)] hover:bg-[var(--tl-container)] text-[var(--tl-text-variant)] flex items-center justify-center cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="space-y-1.5">
                <h2
                  id="guide-prompt-title"
                  className="text-[15.5px] font-bold text-[var(--tl-text)] leading-snug"
                >
                  Kenalan Singkat dengan Aplikasi?
                </h2>
                <p className="text-[12px] text-[var(--tl-text-variant)] leading-relaxed">
                  Kami tunjukkan fungsi tombol-tombol penting satu per satu, cuma butuh 30 detik biar makin lancar kerja di lapangan.
                </p>
              </div>

              <div className="rounded-xl bg-[var(--tl-low)] px-3.5 py-2.5 flex items-center gap-2.5 text-[11.5px] text-[var(--tl-text-variant)]">
                <Sparkles size={14} className="text-[var(--tl-secondary)] shrink-0" />
                <span>Bagian yang dijelaskan akan disorot terang agar langsung kelihatan.</span>
              </div>
            </div>

            <div className="px-5 pt-1 pb-6 sm:pb-5 flex items-center gap-2.5">
              <button
                type="button"
                onClick={onDismiss}
                className="flex-1 min-h-[44px] px-3 rounded-xl bg-[var(--tl-low)] hover:bg-[var(--tl-container)] text-[var(--tl-text)] text-[12px] font-semibold cursor-pointer"
              >
                Lewati dulu
              </button>
              <button
                type="button"
                onClick={onAcceptTour}
                className="flex-[1.35] min-h-[44px] px-4 rounded-xl bg-[var(--tl-primary)] hover:bg-[var(--tl-primary-container)] text-[var(--tl-on-primary)] text-[12px] font-bold inline-flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98] cursor-pointer"
              >
                <span>Ya, Mulai Panduan</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>
    );
  }

  // =========================================================================
  // PHASE 2: INTERACTIVE SPOTLIGHT OVERLAY (DIMMED BLACK + CRISP WHITE FOCUS)
  // =========================================================================
  const totalSteps = activeSteps.length;
  const isFirst = stepIndex === 0;
  const isLast = stepIndex >= totalSteps - 1;
  const progressPct = Math.round(((stepIndex + 1) / totalSteps) * 100);

  // Smart tooltip vertical placement (never hides the highlighted target or overflows screen)
  const tooltipStyle: { left: number; width: number; top?: number; bottom?: number } = (() => {
    const horizontalMargin = 12;
    const cardWidth = Math.min(366, viewport.width - horizontalMargin * 2);
    const left = Math.max(horizontalMargin, Math.round((viewport.width - cardWidth) / 2));

    if (!targetRect) {
      return { left, width: cardWidth, bottom: 24 };
    }

    const spaceBelow = viewport.height - (targetRect.top + targetRect.height);
    const spaceAbove = targetRect.top;

    if (spaceBelow >= 215 || (spaceBelow >= spaceAbove && spaceBelow >= 175)) {
      return {
        left,
        width: cardWidth,
        top: Math.min(viewport.height - 200, targetRect.top + targetRect.height + 14),
      };
    }

    if (spaceAbove >= 195) {
      return {
        left,
        width: cardWidth,
        bottom: Math.max(16, viewport.height - targetRect.top + 14),
      };
    }

    // Fallback for very tall highlighted cards: dock comfortably at bottom
    return {
      left,
      width: cardWidth,
      bottom: 16,
    };
  })();

  return (
    <div
      className="fixed inset-0 z-[150] pointer-events-auto"
      role="dialog"
      aria-modal="true"
      aria-label={`Panduan Aplikasi: ${currentStep.title}`}
    >
      {/* Dimmed Black Backdrop with Crisp Cutout Window over the Focused Feature */}
      <svg
        className="fixed inset-0 w-full h-full pointer-events-auto"
        width={viewport.width}
        height={viewport.height}
        aria-hidden="true"
      >
        <defs>
          <mask id="tech-spotlight-cutout-mask">
            <rect x="0" y="0" width={viewport.width} height={viewport.height} fill="white" />
            {targetRect && (
              <rect
                x={targetRect.left}
                y={targetRect.top}
                width={targetRect.width}
                height={targetRect.height}
                rx="16"
                ry="16"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width={viewport.width}
          height={viewport.height}
          fill="rgba(5, 9, 15, 0.84)"
          mask="url(#tech-spotlight-cutout-mask)"
        />
      </svg>

      {/* Bright White Spotlight Ring Framing the Focused Element */}
      {targetRect && (
        <div
          aria-hidden="true"
          className="fixed pointer-events-none rounded-2xl transition-all duration-200 ease-out"
          style={{
            top: targetRect.top,
            left: targetRect.left,
            width: targetRect.width,
            height: targetRect.height,
            border: '2.5px solid #ffffff',
            boxShadow: '0 0 0 4px rgba(255, 255, 255, 0.22), 0 12px 32px rgba(0, 0, 0, 0.5)',
          }}
        />
      )}

      {/* Floating Crisp Explanation Card */}
      <motion.div
        key={currentStep.id}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.16, ease: 'easeOut' }}
        style={tooltipStyle}
        className="fixed z-[151] tech-lite-shell bg-white dark:bg-[#1e2722] text-[#0d1c2e] dark:text-[#f0f4f1] rounded-2xl shadow-2xl border border-black/8 dark:border-white/15 overflow-hidden"
      >
        {/* Thin Progress Bar */}
        <div className="h-1 w-full bg-slate-100 dark:bg-white/10">
          <div
            className="h-full bg-[#006c48] dark:bg-[#5cc48b] transition-all duration-200"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <div className="p-4 space-y-3">
          {/* Step Counter & Close */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-[#006c48] dark:text-[#5cc48b]">
              Langkah {stepIndex + 1} dari {totalSteps}
            </span>
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Tutup panduan"
              className="w-7 h-7 rounded-full bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-600 dark:text-slate-300 flex items-center justify-center cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>

          {/* Everyday Indonesian Title & Copy */}
          <div className="space-y-1">
            <h3 className="text-[14.5px] font-bold leading-snug text-[#0d1c2e] dark:text-[#f0f4f1]">
              {currentStep.title}
            </h3>
            <p className="text-[12px] leading-relaxed text-[#414844] dark:text-[#b7c4bc]">
              {currentStep.description}
            </p>
          </div>

          {/* Incremental Controls */}
          <div className="pt-1 flex items-center justify-between gap-2">
            {isFirst ? (
              <button
                type="button"
                onClick={onDismiss}
                className="min-h-[40px] px-3 rounded-xl text-[12px] font-semibold text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer"
              >
                Lewati
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setStepIndex(i => Math.max(0, i - 1))}
                className="min-h-[40px] px-3 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-[12px] font-semibold text-[#0d1c2e] dark:text-[#f0f4f1] inline-flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft size={13} />
                <span>Kembali</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                if (isLast) {
                  onComplete();
                } else {
                  setStepIndex(i => Math.min(totalSteps - 1, i + 1));
                }
              }}
              className="min-h-[40px] px-4 rounded-xl bg-[#012d1d] dark:bg-[#4b9b70] hover:opacity-95 text-white text-[12px] font-bold inline-flex items-center gap-1.5 shadow-sm active:scale-[0.98] cursor-pointer"
            >
              {isLast ? (
                <>
                  <Check size={14} />
                  <span>Selesai, Mengerti</span>
                </>
              ) : (
                <>
                  <span>Lanjut</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
