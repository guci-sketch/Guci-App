import React, { useState } from 'react';
import { X, MapPin, Calendar, Building, FileText, CheckCircle2, Crosshair, Sparkles, Clock, Loader2, Ruler, Bug, ShieldCheck, Repeat } from 'lucide-react';
import { PRESET_PROJECT_LOCATIONS } from '../../utils/geo';
import { SERVICE_TYPE_META } from '../../utils/serviceMeta';
import { ContractType, ServiceType } from '../../types';
import { MapPicker } from '../common/MapPicker';
import { CreateProjectInput } from '../../api/projects';
import { geocodeAddress, reverseGeocode } from '../../utils/geocoding';

interface CreateProjectModalProps {
  onClose: () => void;
  onSubmit: (data: CreateProjectInput) => Promise<void>;
}

const SERVICE_TYPES = Object.keys(SERVICE_TYPE_META) as ServiceType[];

const TARGET_PEST_OPTIONS: Record<ServiceType, string[]> = {
  GENERAL_PEST_CONTROL: ['Tikus (Rattus spp.)', 'Kucing Liar (Felis catus)', 'Kecoa (Periplaneta americana)', 'Nyamuk', 'Semut', 'Lalat'],
  TERMITE_CONTROL: ['Rayap Tanah (Coptotermes gestroi)', 'Rayap Kayu Kering (Cryptotermes spp.)', 'Rayap Kayu Basah (Glyptotermes spp.)'],
  FUMIGATION: ['Kutu Beras (Sitophilus oryzae)', 'Kumbang Tepung (Tribolium castaneum)'],
};

const DEFAULT_WORK_TYPE_BY_SERVICE: Record<ServiceType, string> = {
  GENERAL_PEST_CONTROL: 'Pest Control Umum Bulanan',
  TERMITE_CONTROL: 'Anti Rayap Pasca Konstruksi',
  FUMIGATION: 'Fumigasi Gudang / Kontainer',
};

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({ onClose, onSubmit }) => {
  const [projectName, setProjectName] = useState('');
  const [clientName, setClientName] = useState('');
  const [address, setAddress] = useState('');
  const [locationLat, setLocationLat] = useState<number>(-6.200000);
  const [locationLng, setLocationLng] = useState<number>(106.816666);
  const [isLocationPicked, setIsLocationPicked] = useState(false);

  // Try to get user's location initially for the map center
  React.useEffect(() => {
    if (navigator.geolocation && !isLocationPicked) {
      navigator.geolocation.getCurrentPosition(pos => {
        setLocationLat(pos.coords.latitude);
        setLocationLng(pos.coords.longitude);
      }, () => {}, { enableHighAccuracy: false, timeout: 5000 });
    }
  }, []);

  const [workDate, setWorkDate] = useState(new Date().toISOString().split('T')[0]);
  const [serviceType, setServiceType] = useState<ServiceType>('GENERAL_PEST_CONTROL');
  const [scheduledStartTime, setScheduledStartTime] = useState('08:00');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMapLocked, setIsMapLocked] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);

  // Debounce for geocoding
  React.useEffect(() => {
    // Only auto-pan if the map is NOT locked, the address has some content, 
    // AND the user hasn't explicitly picked a location from the map yet (or we want address to override)
    if (isMapLocked || !address || address.length < 5) return;
    
    const timer = setTimeout(async () => {
      setIsGeocoding(true);
      const coords = await geocodeAddress(address);
      if (coords) {
        setLocationLat(coords.lat);
        setLocationLng(coords.lng);
        // We don't set location picked here, so the map panning doesn't get blocked
      }
      setIsGeocoding(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, [address]); // removed isMapLocked from deps so it doesn't retrigger when unlocking

  const handleLockLocation = async () => {
    setIsGeocoding(true);
    const resultAddress = await reverseGeocode(locationLat, locationLng);
    if (resultAddress) {
      setAddress(resultAddress);
      if (errors.address) setErrors(prev => ({ ...prev, address: '' }));
    }
    setIsMapLocked(true);
    setIsGeocoding(false);
  };
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const [targetPests, setTargetPests] = useState<string[]>([]);
  const [otherPest, setOtherPest] = useState('');

  const handleSelectServiceType = (type: ServiceType) => {
    setServiceType(type);
    setTargetPests([]);
    setOtherPest('');
    // Auto setup project name when service type is selected
    const serviceName = SERVICE_TYPE_META[type].label;
    if (clientName) {
      setProjectName(`${serviceName} - ${clientName}`);
    } else {
      setProjectName(serviceName);
    }
  };

  // Also auto update project name if client name changes and project name is currently just the service name
  const handleClientNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newClientName = e.target.value;
    setClientName(newClientName);
    
    const serviceName = SERVICE_TYPE_META[serviceType].label;
    if (projectName === serviceName || projectName === `${serviceName} - ${clientName}`) {
      if (newClientName) {
        setProjectName(`${serviceName} - ${newClientName}`);
      } else {
        setProjectName(serviceName);
      }
    }
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
        latitude: locationLat,
        longitude: locationLng,
        radius: 100, // Hardcode default radius
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
      className="fixed inset-0 z-50 flex items-end sm:items-center  justify-center pt-10 sm:pt-0 pb-10 sm:pb-0  bg-[var(--accent)]/60 p-4 sm:p-6 "
      onClick={onClose}
    >
      <div
        id="create-project-modal-card"
        className="relative w-full max-w-xl bg-[var(--bg-card)] rounded-t-2xl sm:rounded-b-2xl sm:rounded-2xl shadow-2xl border border-[var(--border-subtle)] flex flex-col h-[95dvh] sm:h-auto sm:max-h-[85dvh] overflow-hidden text-[var(--text-primary)] animate-in fade-in zoom-in-95 duration-200"
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

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 overflow-y-auto pb-32 sm:pb-5">
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
                  onChange={handleClientNameChange}
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
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                Alamat Lengkap Lokasi *
              </label>
              {isGeocoding && <span className="text-[10px] text-emerald-600 flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Mencari lokasi...</span>}
            </div>
            <textarea
              id="input-address"
              rows={2}
              placeholder="Jl. Pahlawan Seribu Kav. 1, BSD City, Serpong..."
              
              value={address}
              onChange={e => {
                setAddress(e.target.value);
                if (errors.address) setErrors(prev => ({ ...prev, address: '' }));
              }}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-xs resize-none "
            />
            {errors.address && (
              <p className="text-xs text-red-600 mt-0.5 font-medium">{errors.address}</p>
            )}
          </div>
          
          {/* Map Location Picker */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                Titik Kordinat Proyek (Geser Pin)
              </label>
              <button
                type="button"
                onClick={() => {
                  if (isMapLocked) {
                    setIsMapLocked(false);
                  } else {
                    handleLockLocation();
                  }
                }}
                className={`text-[10px] px-2 py-1 rounded border flex items-center gap-1 font-bold ${
                  isMapLocked 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                    : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {isMapLocked ? (
                  <>
                    <CheckCircle2 size={12} />
                    Titik &amp; Alamat Terkunci
                  </>
                ) : (
                  <>
                    <MapPin size={12} />
                    Lock Titik Peta &amp; Auto Alamat
                  </>
                )}
              </button>
            </div>
            <div className={`h-48 w-full rounded-xl overflow-hidden border ${isMapLocked ? 'border-emerald-300 ring-2 ring-emerald-500/20' : 'border-slate-300'}`}>
              
              <MapPicker 
                latitude={locationLat} 
                longitude={locationLng} 
                onChange={(lat, lng) => {
                  if(!isMapLocked) {
                     setLocationLat(lat);
                     setLocationLng(lng);
                     setIsLocationPicked(true);
                  }
                }}
                readOnly={isMapLocked}
              />

            </div>
            <p className="text-[10px] text-[var(--text-muted)] mt-1">
              {isMapLocked 
                ? 'Titik peta telah dikunci. Buka kunci untuk menggeser pin kembali.'
                : 'Geser peta untuk menentukan titik akurat yang akan menjadi pusat radius check-in teknisi.'}
            </p>
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
