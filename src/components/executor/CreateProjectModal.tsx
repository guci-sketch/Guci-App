import React, { useState } from 'react';
import { X, MapPin, Calendar, Building, FileText, CheckCircle2, Crosshair, Sparkles, Clock, Loader2, Ruler, Bug, ShieldCheck, Repeat } from 'lucide-react';
import { PRESET_PROJECT_LOCATIONS } from '../../utils/geo';
import { SERVICE_TYPE_META } from '../../utils/serviceMeta';
import { ContractType, ServiceType } from '../../types';
import { CreateProjectInput } from '../../api/projects';

interface CreateProjectModalProps {
  onClose: () => void;
  onSubmit: (data: CreateProjectInput) => Promise<void>;
}

const SERVICE_TYPES = Object.keys(SERVICE_TYPE_META) as ServiceType[];

const TARGET_PEST_OPTIONS: Record<ServiceType, string[]> = {
  PEST_CONTROL: ['Tikus (Rattus spp.)', 'Kucing Liar (Felis catus)', 'Kecoa (Periplaneta americana)', 'Nyamuk', 'Semut', 'Lalat'],
  TERMITE_CONTROL: ['Rayap Tanah (Coptotermes gestroi)', 'Rayap Kayu Kering (Cryptotermes spp.)', 'Rayap Kayu Basah (Glyptotermes spp.)'],
  FUMIGATION: ['Kutu Beras (Sitophilus oryzae)', 'Kumbang Tepung (Tribolium castaneum)'],
};

const DEFAULT_WORK_TYPE_BY_SERVICE: Record<ServiceType, string> = {
  PEST_CONTROL: 'Pest Control Umum Bulanan',
  TERMITE_CONTROL: 'Anti Rayap Pasca Konstruksi',
  FUMIGATION: 'Fumigasi Gudang / Kontainer',
};

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({ onClose, onSubmit }) => {
  const [projectName, setProjectName] = useState('');
  const [clientName, setClientName] = useState('');
  const [address, setAddress] = useState('');
  const [workDate, setWorkDate] = useState(new Date().toISOString().split('T')[0]);
  const [serviceType, setServiceType] = useState<ServiceType>('PEST_CONTROL');
  const [scheduledStartTime, setScheduledStartTime] = useState('08:00');
  const [notes, setNotes] = useState('');
  const [radius, setRadius] = useState<number>(100);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // GPS Coordinates
  const [latitude, setLatitude] = useState<number>(-6.298144);
  const [longitude, setLongitude] = useState<number>(106.671342);
  const [isGettingGps, setIsGettingGps] = useState(false);
  const [gpsSuccessMessage, setGpsSuccessMessage] = useState<string | null>(null);

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const [targetPests, setTargetPests] = useState<string[]>([]);
  const [otherPest, setOtherPest] = useState('');

  const handleSelectServiceType = (type: ServiceType) => {
    setServiceType(type);
    setTargetPests([]);
    setOtherPest('');
  };

  const handleFetchCurrentGps = () => {
    setIsGettingGps(true);
    setGpsSuccessMessage(null);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          setLatitude(pos.coords.latitude);
          setLongitude(pos.coords.longitude);
          setIsGettingGps(false);
          setGpsSuccessMessage(`GPS Terdeteksi (Akurasi: ±${Math.round(pos.coords.accuracy || 10)}m)`);
        },
        err => {
          console.warn('GPS error:', err);
          setIsGettingGps(false);
          setGpsSuccessMessage('GPS tidak dapat diakses, menggunakan titik koordinat saat ini');
        },
        { enableHighAccuracy: true, timeout: 7000 }
      );
    } else {
      setIsGettingGps(false);
    }
  };

  const handleApplyPreset = (index: number) => {
    const p = PRESET_PROJECT_LOCATIONS[index];
    setProjectName(p.name);
    setAddress(p.address);
    setLatitude(p.latitude);
    setLongitude(p.longitude);
    setRadius(p.radius);
    setGpsSuccessMessage(`Koordinat ${p.name} diterapkan`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { [key: string]: string } = {};

    if (!projectName.trim()) newErrors.projectName = 'Nama proyek wajib diisi';
    if (!address.trim()) newErrors.address = 'Alamat proyek wajib diisi';
    if (!workDate) newErrors.workDate = 'Tanggal pelaksanaan wajib diisi';

    const finalPests = [...targetPests];
    if (otherPest.trim()) finalPests.push(otherPest.trim());

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);
    try {
      await onSubmit({
        projectName,
        clientName: clientName || 'Klien Layanan Lapangan',
        address,
        latitude,
        longitude,
        radius,
        workDate,
        serviceType,
        targetPests: finalPests,
        contractType: 'ONE_TIME',
        warrantyMonths: 0,
        scheduledStartTime,
        notes,
      });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Gagal membuat proyek. Coba lagi.');
      setIsSubmitting(false);
    }
  };
  const isFumigation = serviceType === 'FUMIGATION';
  const isTermite = serviceType === 'TERMITE_CONTROL';

  return (
    <div
      id="create-project-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--accent)]/60 p-4 sm:p-6 "
      onClick={onClose}
    >
      <div
        id="create-project-modal-card"
        className="relative w-full max-w-xl bg-[var(--bg-card)] rounded-2xl shadow-2xl border border-[var(--border-subtle)] flex flex-col max-h-[90vh] sm:max-h-[85vh] overflow-hidden text-[var(--text-primary)] animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-tertiary)]/70">
          <div>
            <h2 className="text-base font-bold text-[var(--text-primary)]">Buat Penugasan Layanan Baru</h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Input data lokasi klien &amp; jenis layanan sebelum check-in
            </p>
          </div>
          <button
            id="btn-close-create-project"
            onClick={onClose}
            className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 overflow-y-auto">
          {/* Service Type Selector */}
          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
              Jenis Layanan *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {SERVICE_TYPES.map(type => {
                const meta = SERVICE_TYPE_META[type];
                const Icon = meta.icon;
                const active = serviceType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleSelectServiceType(type)}
                    className={`flex flex-col items-center justify-center gap-1 p-2.5 rounded-xl border text-center transition-all ${
                      active ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm' : 'bg-white border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
                    }`}
                  >
                    <Icon size={18} />
                    <span className="text-[10px] font-bold leading-tight">{meta.shortLabel}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-[var(--text-muted)] mt-1.5">{SERVICE_TYPE_META[serviceType].description}</p>
          </div>

          {isFumigation && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-start gap-2 text-xs text-rose-800">
              <ShieldCheck size={16} className="shrink-0 mt-0.5 text-rose-600" />
              <span>Fumigasi melibatkan gas beracun. Data sealing &amp; waktu aerasi wajib diisi lengkap di formulir treatment sebelum check-out, atau laporan otomatis ditandai risiko keselamatan.</span>
            </div>
          )}

          {/* Project & Client Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                Nama Proyek *
              </label>
              <input
                id="input-project-name"
                type="text"
                placeholder="Contoh: RS Hermina BSD"
                value={projectName}
                onChange={e => {
                  setProjectName(e.target.value);
                  if (errors.projectName) setErrors(prev => ({ ...prev, projectName: '' }));
                }}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-xs bg-white"
              />
              {errors.projectName && (
                <p className="text-xs text-red-600 mt-1 font-medium">{errors.projectName}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                Pemilik / Pelanggan
              </label>
              <div className="relative">
                <Building size={16} className="absolute left-3 top-2.5 text-[var(--text-muted)]" />
                <input
                  id="input-client-name"
                  type="text"
                  placeholder="PT Medika Lestari"
                  value={clientName}
                  onChange={e => setClientName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-xs bg-white"
                />
              </div>
            </div>
          </div>
          {/* Target Pests */}
          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
              Jenis Hama Sasaran
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {TARGET_PEST_OPTIONS[serviceType].map(pest => (
                <label key={pest} className="flex items-center gap-2 p-2 border border-[var(--border-subtle)] rounded-lg hover:bg-[var(--bg-tertiary)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={targetPests.includes(pest)}
                    onChange={(e) => {
                      if (e.target.checked) setTargetPests(prev => [...prev, pest]);
                      else setTargetPests(prev => prev.filter(p => p !== pest));
                    }}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-[var(--accent)]"
                  />
                  <span className="text-xs text-[var(--text-secondary)]">{pest}</span>
                </label>
              ))}
            </div>
            <div className="mt-2">
              <input
                type="text"
                placeholder="Lainnya (ketik jenis hama lain...)"
                value={otherPest}
                onChange={e => setOtherPest(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-xs"
              />
            </div>
          </div>
          {/* Work Date & Scheduled Start Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                Tanggal Pelaksanaan *
              </label>
              <div className="relative">
                <Calendar size={16} className="absolute left-3 top-3 text-[var(--text-muted)]" />
                <input
                  id="input-work-date"
                  type="date"
                  value={workDate}
                  onChange={e => setWorkDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-xs"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                Jadwal Mulai
              </label>
              <div className="relative">
                <Clock size={16} className="absolute left-3 top-2 text-[var(--text-muted)]" />
                <input
                  id="input-scheduled-start"
                  type="time"
                  value={scheduledStartTime}
                  onChange={e => setScheduledStartTime(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-xs"
                />
              </div>
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
              Alamat Lengkap Lokasi *
            </label>
            <textarea
              id="input-address"
              rows={2}
              placeholder="Jl. Pahlawan Seribu Kav. 1, BSD City, Serpong..."
              value={address}
              onChange={e => {
                setAddress(e.target.value);
                if (errors.address) setErrors(prev => ({ ...prev, address: '' }));
              }}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-xs resize-none"
            />
            {errors.address && (
              <p className="text-xs text-red-600 mt-0.5 font-medium">{errors.address}</p>
            )}
          </div>

          {/* Quick Presets */}
          <div className="bg-sky-50/70 border border-sky-100 p-3 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-sky-900 flex items-center gap-1">
                <Sparkles size={14} className="text-sky-600" /> Lokasi Klien Tersimpan:
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_PROJECT_LOCATIONS.map((preset, idx) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => handleApplyPreset(idx)}
                  className="text-[11px] px-2.5 py-1 bg-white hover:bg-sky-100/60 text-[var(--text-secondary)] border border-sky-200 rounded-lg transition-colors font-medium text-left"
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          {/* GPS Location & Radius Section */}
          <div className="bg-[var(--bg-tertiary)] p-4 rounded-xl border border-[var(--border-subtle)]/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-1.5">
                <MapPin size={15} className="text-emerald-600" /> Titik Pusat Geofence Lokasi
              </span>
              <button
                id="btn-get-device-gps"
                type="button"
                onClick={handleFetchCurrentGps}
                disabled={isGettingGps}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-100/70 hover:bg-emerald-100 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1"
              >
                <Crosshair size={13} /> {isGettingGps ? 'Mendeteksi...' : 'Ambil GPS Sekarang'}
              </button>
            </div>

            {gpsSuccessMessage && (
              <div className="text-[11px] text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200/60 flex items-center gap-1">
                <CheckCircle2 size={13} /> {gpsSuccessMessage}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="block text-[11px] font-medium text-[var(--text-muted)] mb-0.5">Latitude</span>
                <input
                  id="input-lat"
                  type="number"
                  step="0.000001"
                  value={latitude}
                  onChange={e => setLatitude(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-mono text-xs bg-white"
                />
              </div>
              <div>
                <span className="block text-[11px] font-medium text-[var(--text-muted)] mb-0.5">Longitude</span>
                <input
                  id="input-lng"
                  type="number"
                  step="0.000001"
                  value={longitude}
                  onChange={e => setLongitude(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-mono text-xs bg-white"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-semibold text-[var(--text-secondary)]">Batas Toleransi Radius Validasi:</span>
                <span className="font-bold text-emerald-700 font-mono bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {radius} meter
                </span>
              </div>
              <div className="flex gap-2">
                {[50, 80, 100, 150, 200].map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRadius(r)}
                    className={`flex-1 py-1 text-xs rounded-lg border font-semibold transition-all ${
                      radius === r
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-white text-[var(--text-secondary)] border-[var(--border-subtle)] hover:bg-[var(--bg-tertiary)]'
                    }`}
                  >
                    {r}m
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-[var(--text-muted)] mt-1.5">
                Check-in yang berjarak lebih dari {radius}m akan otomatis tercatat sebagai anomali resiko (+30 poin).
              </p>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
              Catatan / Instruksi Kerja (Opsional)
            </label>
            <div className="relative">
              <FileText size={16} className="absolute left-3 top-2.5 text-[var(--text-muted)]" />
              <textarea
                id="input-notes"
                rows={2}
                placeholder="Instruksi safety, akses masuk, riwayat infestasi sebelumnya..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-xs resize-none"
              />
            </div>
          </div>

          {/* Action Buttons */}
          {submitError && (
            <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 font-medium">
              {submitError}
            </div>
          )}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border-subtle)]">
            <button
              id="btn-cancel-project"
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] text-xs font-semibold transition-colors disabled:opacity-50"
            >
              Batal
            </button>
            <button
              id="btn-submit-project"
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/25 active:scale-98 transition-all disabled:opacity-60 flex items-center gap-2"
            >
              {isSubmitting && <Loader2 size={16} className="animate-spin" />}
              Buat &amp; Jadwalkan Penugasan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
