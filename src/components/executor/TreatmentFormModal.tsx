import React, { useState } from 'react';
import { X, FlaskConical, Ruler, Loader2, AlertTriangle, Info } from 'lucide-react';
import { ApplicationMethod, ServiceType, TreatmentRecord } from '../../types';
import { APPLICATION_METHOD_OPTIONS } from '../../utils/serviceMeta';
import { TreatmentInput } from '../../api/workReports';

interface TreatmentFormModalProps {
  serviceType: ServiceType;
  existing: TreatmentRecord | null;
  onSubmit: (input: TreatmentInput) => Promise<void>;
  onSkip?: () => void;
  onClose: () => void;
}

const DEFAULT_METHOD_BY_SERVICE: Partial<Record<ServiceType, ApplicationMethod>> = {
  GENERAL_PEST_CONTROL: 'SPRAYING',
  TERMITE_CONTROL: 'DRILLING',
  FUMIGATION: 'FOGGING',
};

function toLocalInputValue(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * What was actually applied: chemical, dosage, method, and — for
 * fumigation — the safety-critical sealing/aeration timestamps. This feeds
 * directly into the risk engine at check-out; leaving it blank on a
 * fumigation job is treated as a safety compliance gap, not just missing
 * paperwork (see backend risk engine: FUMIGATION_SAFETY_INCOMPLETE).
 */
export const TreatmentFormModal: React.FC<TreatmentFormModalProps> = ({ serviceType, existing, onSubmit, onSkip, onClose }) => {
  const [applicationMethod, setApplicationMethod] = useState<ApplicationMethod>(existing?.applicationMethod ?? DEFAULT_METHOD_BY_SERVICE[serviceType] ?? 'SPRAYING');
  const [chemicalName, setChemicalName] = useState(existing?.chemicalName ?? '');
  const [activeIngredient, setActiveIngredient] = useState(existing?.activeIngredient ?? '');
  const [dosage, setDosage] = useState(existing?.dosage ?? '');
  const [treatmentAreaSqm, setTreatmentAreaSqm] = useState(existing?.treatmentAreaSqm ? String(existing.treatmentAreaSqm) : '');
  const [drillingPointsCount, setDrillingPointsCount] = useState(existing?.drillingPointsCount ? String(existing.drillingPointsCount) : '');
  const [fumigantType, setFumigantType] = useState(existing?.fumigantType ?? '');
  const [gasConcentrationPpm, setGasConcentrationPpm] = useState(existing?.gasConcentrationPpm ? String(existing.gasConcentrationPpm) : '');
  const [sealingStartedAt, setSealingStartedAt] = useState(toLocalInputValue(existing?.sealingStartedAt));
  const [aerationCompletedAt, setAerationCompletedAt] = useState(toLocalInputValue(existing?.aerationCompletedAt));
  const [safetyNotes, setSafetyNotes] = useState(existing?.safetyNotes ?? '');
  const [technicianNotes, setTechnicianNotes] = useState(existing?.technicianNotes ?? '');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isFumigation = serviceType === 'FUMIGATION';
  const isTermite = serviceType === 'TERMITE_CONTROL';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chemicalName.trim() || !dosage.trim()) {
      setError('Nama bahan/produk dan dosis wajib diisi.');
      return;
    }
    if (isFumigation && !aerationCompletedAt) {
      setError('Fumigasi wajib mencatat waktu selesai aerasi sebelum area dianggap aman.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await onSubmit({
        applicationMethod,
        chemicalName: chemicalName.trim(),
        activeIngredient: activeIngredient.trim() || undefined,
        dosage: dosage.trim(),
        treatmentAreaSqm: treatmentAreaSqm ? Number(treatmentAreaSqm) : undefined,
        drillingPointsCount: drillingPointsCount ? Number(drillingPointsCount) : undefined,
        fumigantType: fumigantType.trim() || undefined,
        gasConcentrationPpm: gasConcentrationPpm ? Number(gasConcentrationPpm) : undefined,
        sealingStartedAt: sealingStartedAt ? new Date(sealingStartedAt).toISOString() : undefined,
        aerationCompletedAt: aerationCompletedAt ? new Date(aerationCompletedAt).toISOString() : undefined,
        safetyNotes: safetyNotes.trim() || undefined,
        technicianNotes: technicianNotes.trim() || undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan data treatment.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--accent)]/60 p-4 sm:p-6 " onClick={onClose}>
      <div className="relative w-full max-w-lg bg-[var(--bg-card)] rounded-2xl shadow-2xl border border-[var(--border-subtle)] flex flex-col max-h-[90vh] sm:max-h-[85vh] overflow-hidden text-[var(--text-primary)] animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-tertiary)]/70">
          <div>
            <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
              <FlaskConical size={18} className="text-emerald-600" /> Formulir Perlakuan (Treatment)
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">Catat bahan, dosis, dan metode yang benar-benar digunakan di lapangan.</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 overflow-y-auto">
          {isFumigation && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-start gap-2 text-xs text-rose-800">
              <AlertTriangle size={16} className="shrink-0 mt-0.5 text-rose-600" />
              <span>Fumigasi menggunakan gas beracun. Waktu selesai aerasi <strong>wajib diisi</strong> — tanpa ini, area tidak dapat dipastikan aman dan laporan akan ditandai risiko keselamatan.</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Metode Aplikasi *</label>
            <select
              value={applicationMethod}
              onChange={e => setApplicationMethod(e.target.value as ApplicationMethod)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-xs bg-white"
            >
              {APPLICATION_METHOD_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Nama Bahan / Produk *</label>
              <input
                type="text"
                placeholder="Termidor SC, Phostoxin, dsb."
                value={chemicalName}
                onChange={e => setChemicalName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Bahan Aktif</label>
              <input
                type="text"
                placeholder="Fipronil 2.5%"
                value={activeIngredient}
                onChange={e => setActiveIngredient(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Dosis / Konsentrasi *</label>
              <input
                type="text"
                placeholder="1:200 diencerkan dengan air"
                value={dosage}
                onChange={e => setDosage(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Luas Area Dirawat (m²)</label>
              <div className="relative">
                <Ruler size={16} className="absolute left-3 top-3 text-[var(--text-muted)]" />
                <input
                  type="number"
                  min={0}
                  placeholder="150"
                  value={treatmentAreaSqm}
                  onChange={e => setTreatmentAreaSqm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-xs"
                />
              </div>
            </div>
          </div>

          {isTermite && (
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Jumlah Titik Bor / Injeksi</label>
              <input
                type="number"
                min={0}
                placeholder="42"
                value={drillingPointsCount}
                onChange={e => setDrillingPointsCount(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-xs"
              />
            </div>
          )}

          {isFumigation && (
            <div className="bg-[var(--bg-tertiary)] p-3.5 rounded-xl border border-[var(--border-subtle)]/80 space-y-3">
              <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-1.5">
                <Info size={14} className="text-rose-600" /> Data Keselamatan Fumigasi
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">Jenis Fumigant</label>
                  <input
                    type="text"
                    placeholder="Phosphine (PH3)"
                    value={fumigantType}
                    onChange={e => setFumigantType(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">Konsentrasi Gas (ppm)</label>
                  <input
                    type="number"
                    min={0}
                    placeholder="1200"
                    value={gasConcentrationPpm}
                    onChange={e => setGasConcentrationPpm(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">Mulai Penyegelan (Sealing)</label>
                  <input
                    type="datetime-local"
                    value={sealingStartedAt}
                    onChange={e => setSealingStartedAt(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-rose-700 mb-1">Selesai Aerasi (Wajib) *</label>
                  <input
                    type="datetime-local"
                    value={aerationCompletedAt}
                    onChange={e => setAerationCompletedAt(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-rose-300 text-xs bg-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">Catatan Keselamatan</label>
                <textarea
                  rows={2}
                  placeholder="Area disegel penuh, akses masuk diblokir dengan tanda peringatan..."
                  value={safetyNotes}
                  onChange={e => setSafetyNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white resize-none"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Catatan Teknisi (Opsional)</label>
            <textarea
              rows={2}
              placeholder="Fokus area, temuan di lapangan, rekomendasi tindak lanjut..."
              value={technicianNotes}
              onChange={e => setTechnicianNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-xs resize-none"
            />
          </div>

          {error && (
            <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 font-medium">{error}</div>
          )}

          <div className="flex items-center justify-between gap-3 pt-3 border-t border-[var(--border-subtle)]">
            {onSkip && !isFumigation ? (
              <button type="button" onClick={onSkip} disabled={isSubmitting} className="text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-secondary)]">
                Isi nanti
              </button>
            ) : <span />}
            <div className="flex items-center gap-2">
              <button type="button" onClick={onClose} disabled={isSubmitting} className="px-4 py-2.5 rounded-xl border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] text-xs font-semibold transition-colors disabled:opacity-50">
                Batal
              </button>
              <button type="submit" disabled={isSubmitting} className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/25 active:scale-98 transition-all disabled:opacity-60 flex items-center gap-2">
                {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                Simpan &amp; Lanjut Check-Out
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
