import React, { useState } from 'react';
import { X, MapPin, Calendar, Building, FileText, CheckCircle2, Crosshair, Sparkles, Clock, Loader2, Ruler, Bug, ShieldCheck, Repeat, Search, Lock } from 'lucide-react';
import { PRESET_PROJECT_LOCATIONS } from '@/shared/utils/geo';
import { SERVICE_TYPE_META } from '@/shared/utils/serviceMeta';
import { ContractType, ServiceType } from '@/entities/types';
import { MapPicker } from '../common/MapPicker';
import { CreateProjectInput } from '@/shared/api/projects';
import { geocodeAddress, reverseGeocode } from '@/shared/utils/geocoding';
import { useVisualViewportMetrics, scrollInputIntoView } from '@/shared/hooks/useVirtualKeyboard';
interface CreateProjectModalProps {
  onClose: () => void;
  onSubmit: (data: CreateProjectInput) => Promise<void>;
}

const SERVICE_TYPES = Object.keys(SERVICE_TYPE_META) as ServiceType[];

const TARGET_FOCUS_OPTIONS: Partial<Partial<Record<ServiceType, string[]>>> = {
  GENERAL_PEST_CONTROL: ['Tikus (Rattus spp.)', 'Kucing Liar (Felis catus)', 'Serangga Merayap (Crawling Insects)', 'Nyamuk', 'Semut', 'Lalat'],
  TERMITE_CONTROL: ['Rayap Tanah (Coptotermes gestroi)', 'Rayap Kayu Kering (Cryptotermes spp.)', 'Rayap Kayu Basah (Glyptotermes spp.)'],
  FUMIGATION: ['Kutu Beras (Sitophilus oryzae)', 'Kumbang Tepung (Tribolium castaneum)'],
};

const DEFAULT_WORK_TYPE_BY_SERVICE: Partial<Partial<Record<ServiceType, string>>> = {
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
  // Pengambilan GPS awal saat modal dibuka memakai akurasi tinggi dan tanpa cache lama
  React.useEffect(() => {
    if (navigator.geolocation && !isLocationPicked) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          setLocationLat(pos.coords.latitude);
          setLocationLng(pos.coords.longitude);
          setIsLocationPicked(true);
        },
        () => {},
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }
  }, []);

  const [workDate, setWorkDate] = useState(new Date().toISOString().split('T')[0]);
  const [serviceType, setServiceType] = useState<ServiceType>('GENERAL_PEST_CONTROL');
  const [scheduledStartTime, setScheduledStartTime] = useState('08:00');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMapLocked, setIsMapLocked] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);

  // Koordinat hanya diupdate saat pengguna klik tombol "Posisi GPS Saya", geser pin di peta,
  // atau klik eksplisit tombol "Cari dari Alamat" — dilarang auto-geocoding di latar belakang
  // agar koordinat riil teknisi di lapangan tidak tergeser oleh centroid kelurahan OpenStreetMap.
  const prevIsMapLocked = React.useRef(isMapLocked);

  const handleSearchAddressCoords = async () => {
    if (!address || address.trim().length < 3) {
      alert('Ketik alamat terlebih dahulu pada kolom Alamat Lengkap Lokasi.');
      return;
    }
    setIsGeocoding(true);
    try {
      const coords = await geocodeAddress(address);
      if (coords) {
        setLocationLat(coords.lat);
        setLocationLng(coords.lng);
        setIsLocationPicked(true);
      } else {
        alert('Titik koordinat tidak ditemukan untuk teks alamat tersebut. Silakan geser pin peta secara manual.');
      }
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleUseCurrentGps = () => {
    if (!navigator.geolocation) {
      alert('Perangkat ini tidak mendukung sensor GPS.');
      return;
    }
    setIsGeocoding(true);
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setLocationLat(lat);
        setLocationLng(lng);
        setIsLocationPicked(true);
        setIsMapLocked(false);
        setIsGeocoding(false);

        if (!address.trim()) {
          const revAddr = await reverseGeocode(lat, lng);
          if (revAddr) {
            setAddress(revAddr);
            if (errors.address) setErrors(prev => ({ ...prev, address: '' }));
          }
        }
      },
      err => {
        setIsGeocoding(false);
        alert(err.code === err.PERMISSION_DENIED ? 'Izin GPS ditolak oleh peramban HP.' : 'Sinyal GPS lemah atau tidak tersedia. Pastikan fitur Lokasi HP menyala.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

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

  const [targetFocus, setTargetFocus] = useState<string[]>([]);
  const [otherFocus, setOtherFocus] = useState('');

  const handleSelectServiceType = (type: ServiceType) => {
    setServiceType(type);
    setTargetFocus([]);
    setOtherFocus('');
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

    const finalFocus = [...targetFocus];
    if (otherFocus.trim()) finalFocus.push(otherFocus.trim());

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
        targetFocus: finalFocus,
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

  const { isKeyboardOpen, viewportHeight } = useVisualViewportMetrics();

  return (
    <div
      id="create-project-modal-backdrop"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-[var(--accent)]/60"
      onClick={onClose}
    >
      <div
        id="create-project-modal-card"
        style={{
          maxHeight: viewportHeight ? `${Math.min(viewportHeight, window.innerHeight)}px` : undefined,
          height: isKeyboardOpen && viewportHeight ? `${viewportHeight}px` : undefined,
        }}
        className={`relative w-full max-w-xl bg-[var(--bg-card)] rounded-t-2xl sm:rounded-2xl shadow-2xl border border-[var(--border-subtle)] flex flex-col ${
          isKeyboardOpen ? 'h-full' : 'h-[95dvh]'
        } sm:h-auto sm:max-h-[85dvh] overflow-hidden text-[var(--text-primary)] animate-in fade-in zoom-in-95 duration-200`}
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

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 overflow-y-auto pb-56 sm:pb-6">
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
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-base sm:text-xs bg-white scroll-mt-24 scroll-mb-48"
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
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-base sm:text-xs bg-white scroll-mt-24 scroll-mb-48"
                />
              </div>
            </div>
          </div>
          {/* Target Pests */}
          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
              Jenis Fokus Target
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(TARGET_FOCUS_OPTIONS[serviceType] || []).map(focus => (
                <label key={focus} className="flex items-center gap-2 p-2 border border-[var(--border-subtle)] rounded-lg hover:bg-[var(--bg-tertiary)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={targetFocus.includes(focus)}
                    onChange={(e) => {
                      if (e.target.checked) setTargetFocus(prev => [...prev, focus]);
                      else setTargetFocus(prev => prev.filter(f => f !== focus));
                    }}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-[var(--accent)]"
                  />
                  <span className="text-xs text-[var(--text-secondary)]">{focus}</span>
                </label>
              ))}
            </div>
            <div className="mt-2">
              <input
                type="text"
                placeholder="Lainnya (ketik target fokus lain...)"
                value={otherFocus}
                onChange={e => setOtherFocus(e.target.value)}
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
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-base sm:text-xs scroll-mt-24 scroll-mb-48"
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
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-base sm:text-xs scroll-mt-24 scroll-mb-48"
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
              onFocus={e => {
                const target = e.currentTarget;
                setTimeout(() => scrollInputIntoView(target), 100);
              }}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-base sm:text-xs resize-none scroll-mt-24 scroll-mb-48"
            />
            {errors.address && (
              <p className="text-xs text-red-600 mt-0.5 font-medium">{errors.address}</p>
            )}
          </div>
          
          {/* Map Location Picker */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                Titik Koordinat Proyek (Pusat Radius Check-In)
              </label>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={handleUseCurrentGps}
                  className="text-[11px] px-2.5 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                  title="Gunakan posisi GPS saya saat ini secara akurat"
                >
                  <Crosshair size={13} className="text-emerald-700" />
                  Posisi GPS Saya (Akurat)
                </button>
                <button
                  type="button"
                  onClick={handleSearchAddressCoords}
                  disabled={isGeocoding || !address.trim()}
                  className="text-[11px] px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 font-bold flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
                  title="Cari titik peta berdasarkan teks alamat"
                >
                  <Search size={13} />
                  Cari dari Alamat
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (isMapLocked) {
                      setIsMapLocked(false);
                    } else {
                      handleLockLocation();
                    }
                  }}
                  className={`text-[11px] px-2.5 py-1.5 rounded-lg border flex items-center gap-1 font-bold cursor-pointer transition-colors ${
                    isMapLocked 
                      ? 'bg-emerald-600 border-emerald-600 text-white' 
                      : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {isMapLocked ? (
                    <>
                      <CheckCircle2 size={12} />
                      Terkunci
                    </>
                  ) : (
                    <>
                      <MapPin size={12} />
                      Kunci Titik
                    </>
                  )}
                </button>
              </div>
            </div>
            <div className={`h-48 w-full rounded-xl overflow-hidden border ${isMapLocked ? 'border-emerald-300 ring-2 ring-emerald-500/20' : 'border-slate-300'}`}>
              <MapPicker 
                latitude={locationLat} 
                longitude={locationLng} 
                onChange={(lat, lng) => {
                  if (!isMapLocked) {
                     setLocationLat(lat);
                     setLocationLng(lng);
                     setIsLocationPicked(true);
                  }
                }}
                readOnly={isMapLocked}
              />
            </div>
            <div className="flex items-center justify-between text-[10.5px] mt-1.5">
              <span className="font-mono text-slate-600">
                Titik: {locationLat.toFixed(6)}, {locationLng.toFixed(6)} {isLocationPicked ? '• (Titik Terpilih)' : ''}
              </span>
              <span className="text-[var(--text-muted)]">
                {isMapLocked ? 'Titik terkunci' : 'Geser pin untuk menentukan titik akurat'}
              </span>
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
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-base sm:text-xs resize-none scroll-mt-24 scroll-mb-48"
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
