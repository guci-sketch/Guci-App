import React, { useState } from 'react';
import { X, Calendar, Building, CheckCircle2, Crosshair, Clock, Loader2, ShieldCheck, Search, Lock } from 'lucide-react';
import { PRIMARY_SERVICE_TYPES, SERVICE_TYPE_META } from '@/shared/utils/serviceMeta';
import { ServiceType } from '@/entities/types';
import { MapPicker } from '../common/MapPicker';
import { CreateProjectInput } from '@/shared/api/projects';
import { geocodeAddress, reverseGeocode } from '@/shared/utils/geocoding';
import { useVisualViewportMetrics, scrollInputIntoView } from '@/shared/hooks/useVirtualKeyboard';
import { PEST_CATALOG_26, TERMITE_CATALOG_AR } from '@/shared/lib/permenkesRecapEngine';

interface CreateProjectModalProps {
  onClose: () => void;
  onSubmit: (data: CreateProjectInput) => Promise<void>;
}

/**
 * Pilihan Tipe Tugas ala Jarivis di bawah 2 Layanan Utama (Pest Control vs Anti Rayap)
 */
const JARIVIS_TASK_SUBTYPES: Record<'GENERAL_PEST_CONTROL' | 'TERMITE_CONTROL', { id: string; label: string; defaultFocus: string[] }[]> = {
  GENERAL_PEST_CONTROL: [
    { id: 'WORK REPORT PEST CONTROL', label: 'Work Report Pest Control (Treatment Rutin)', defaultFocus: ['Kecoa', 'Lalat', 'Nyamuk', 'Semut', 'Tikus'] },
    { id: 'RODENT CONTROL', label: 'Rodent Control (Monitoring & Umpan Tikus)', defaultFocus: ['Tikus'] },
    { id: 'SURVEY PEST CONTROL', label: 'Survey Pest Control (Inspeksi Lokasi)', defaultFocus: ['Kecoa', 'Lalat', 'Nyamuk', 'Semut', 'Tikus'] },
    { id: 'DEFAULT PEST FUMIGASI', label: 'Pest Fumigasi (Gudang / Ruang Tertutup)', defaultFocus: ['Kumbang / Kupu-Kupu', 'Tikus', 'Kecoa'] },
  ],
  TERMITE_CONTROL: [
    { id: 'WORK REPORT TERMITE', label: 'Work Report Termite (Drilling / Injeksi / Baiting)', defaultFocus: ['Rayap Tanah (Coptotermes sp.)', 'Titik Drilling & Injeksi Pondasi'] },
    { id: 'KONTROL GARANSI ANTI RAYAP', label: 'Kontrol Berkala Garansi Anti Rayap (Quality Control)', defaultFocus: ['Rayap Tanah (Coptotermes sp.)', 'Rayap Kayu Kering (Cryptotermes sp.)', 'Jalur Kembara / Mud Tubes Aktif'] },
    { id: 'SURVEY TERMITE CONTROL', label: 'Survey Termite Control (Inspeksi Struktur Bangunan)', defaultFocus: ['Rayap Tanah (Coptotermes sp.)', 'Rayap Kayu Kering (Cryptotermes sp.)'] },
  ],
};

const TARGET_FOCUS_QUICK_CHIPS: Record<'GENERAL_PEST_CONTROL' | 'TERMITE_CONTROL', string[]> = {
  GENERAL_PEST_CONTROL: ['Kecoa', 'Lalat', 'Nyamuk', 'Semut', 'Tikus', 'Kucing'],
  TERMITE_CONTROL: [
    'Rayap Tanah (Coptotermes sp.)',
    'Rayap Kayu Kering (Cryptotermes sp.)',
    'Rayap Subterranean (Macrotermes sp.)',
    'Jalur Kembara / Mud Tubes Aktif',
    'Bait Station In-Ground (IG) Positif',
    'Titik Drilling & Injeksi Pondasi',
  ],
};

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({ onClose, onSubmit }) => {
  const [serviceType, setServiceType] = useState<'GENERAL_PEST_CONTROL' | 'TERMITE_CONTROL'>('GENERAL_PEST_CONTROL');
  const [taskSubtype, setTaskSubtype] = useState<string>(JARIVIS_TASK_SUBTYPES.GENERAL_PEST_CONTROL[0].id);
  const [projectName, setProjectName] = useState('Pest Control');
  const [clientName, setClientName] = useState('');
  const [address, setAddress] = useState('');
  const [locationLat, setLocationLat] = useState<number>(-6.200000);
  const [locationLng, setLocationLng] = useState<number>(106.816666);
  const [isLocationPicked, setIsLocationPicked] = useState(false);

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
  const [scheduledStartTime, setScheduledStartTime] = useState('08:00');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMapLocked, setIsMapLocked] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);

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

  const [targetFocus, setTargetFocus] = useState<string[]>(['Kecoa', 'Lalat', 'Nyamuk', 'Semut', 'Tikus']);
  const [dropdownFocusPick, setDropdownFocusPick] = useState<string>('');
  const [otherFocus, setOtherFocus] = useState('');

  const handleSelectServiceType = (type: 'GENERAL_PEST_CONTROL' | 'TERMITE_CONTROL') => {
    setServiceType(type);
    const firstSubtype = JARIVIS_TASK_SUBTYPES[type][0];
    setTaskSubtype(firstSubtype.id);
    setTargetFocus(firstSubtype.defaultFocus);
    setOtherFocus('');
    setDropdownFocusPick('');

    const serviceName = SERVICE_TYPE_META[type]?.label || (type === 'TERMITE_CONTROL' ? 'Anti Rayap' : 'Pest Control');
    if (clientName.trim()) {
      setProjectName(`${serviceName} - ${clientName.trim()}`);
    } else {
      setProjectName(serviceName);
    }
  };

  const handleClientNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newClientName = e.target.value;
    setClientName(newClientName);

    const serviceName = SERVICE_TYPE_META[serviceType]?.label || (serviceType === 'TERMITE_CONTROL' ? 'Anti Rayap' : 'Pest Control');
    if (!projectName.trim() || projectName === 'Pest Control' || projectName === 'Anti Rayap' || projectName.startsWith(`${serviceName} -`) || projectName.startsWith('Pest Control -') || projectName.startsWith('Anti Rayap -')) {
      if (newClientName.trim()) {
        setProjectName(`${serviceName} - ${newClientName.trim()}`);
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
    if (otherFocus.trim() && !finalFocus.includes(otherFocus.trim())) {
      finalFocus.push(otherFocus.trim());
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const effectiveServiceType: ServiceType =
        serviceType === 'GENERAL_PEST_CONTROL' && taskSubtype === 'DEFAULT PEST FUMIGASI'
          ? 'FUMIGATION'
          : serviceType;

      await onSubmit({
        projectName,
        clientName: clientName || 'Klien Layanan Lapangan',
        address,
        latitude: locationLat,
        longitude: locationLng,
        radius: 100,
        workDate,
        workType: taskSubtype,
        serviceType: effectiveServiceType,
        targetFocus: finalFocus,
        contractType: serviceType === 'TERMITE_CONTROL' ? 'ONE_TIME' : 'RECURRING',
        warrantyMonths: serviceType === 'TERMITE_CONTROL' ? 36 : 0,
        scheduledStartTime,
        notes,
      });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Gagal membuat proyek. Coba lagi.');
      setIsSubmitting(false);
    }
  };

  const isTermite = serviceType === 'TERMITE_CONTROL';
  const catalogForDropdown = isTermite ? TERMITE_CATALOG_AR : PEST_CATALOG_26;
  const { isKeyboardOpen, viewportHeight } = useVisualViewportMetrics();

  return (
    <div
      id="create-project-modal-backdrop"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-black/55"
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
        } sm:h-auto sm:max-h-[88dvh] overflow-hidden text-[var(--text-primary)] animate-in fade-in zoom-in-95 duration-200`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-tertiary)]/70">
          <div>
            <h2 className="text-base font-bold text-[var(--text-primary)]">Buat Penugasan Layanan Baru</h2>
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
          {/* 1. Dua Pilihan Layanan Utama (Pest Control vs Anti Rayap — Seperti di Jarivis) */}
          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
              Jenis Layanan *
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {PRIMARY_SERVICE_TYPES.map(type => {
                const meta = SERVICE_TYPE_META[type]!;
                const Icon = meta.icon;
                const active = serviceType === type;
                const isArCard = type === 'TERMITE_CONTROL';
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleSelectServiceType(type as 'GENERAL_PEST_CONTROL' | 'TERMITE_CONTROL')}
                    className={`flex items-center justify-center gap-2.5 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      active
                        ? isArCard
                          ? 'bg-purple-700 border-purple-700 text-white shadow-sm'
                          : 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                        : 'bg-white border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
                    }`}
                  >
                    <Icon size={20} className="shrink-0" />
                    <div>
                      <span className="text-xs font-extrabold block leading-tight">{meta.label}</span>
                      <span className={`text-[10px] block mt-0.5 ${active ? 'text-white/85' : 'text-[var(--text-muted)]'}`}>
                        {isArCard ? 'Termite Control & Garansi' : 'Serangga, Tikus & Vektor'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-[var(--text-muted)] mt-1.5">{SERVICE_TYPE_META[serviceType]?.description}</p>
          </div>

          {/* Sub-Tipe Tugas Standar Jarivis */}
          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
              Tipe Tugas (Standar SOP)
            </label>
            <select
              value={taskSubtype}
              onChange={e => {
                const val = e.target.value;
                setTaskSubtype(val);
                const found = JARIVIS_TASK_SUBTYPES[serviceType].find(s => s.id === val);
                if (found) setTargetFocus(found.defaultFocus);
              }}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            >
              {JARIVIS_TASK_SUBTYPES[serviceType].map(sub => (
                <option key={sub.id} value={sub.id}>
                  {sub.label}
                </option>
              ))}
            </select>
          </div>

          {taskSubtype === 'DEFAULT PEST FUMIGASI' && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-start gap-2 text-xs text-rose-800">
              <ShieldCheck size={16} className="shrink-0 mt-0.5 text-rose-600" />
              <span>Fumigasi melibatkan gas beracun. Data sealing &amp; waktu aerasi wajib diisi lengkap di formulir treatment sebelum check-out.</span>
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
                placeholder={isTermite ? 'Contoh: Anti Rayap - RS Hermina' : 'Contoh: Pest Control - RS PON'}
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

          {/* Target Focus (Menyesuaikan Pest Control vs Anti Rayap + Dropdown Katalog) */}
          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
              {isTermite ? 'Jenis Fokus Target Anti Rayap' : 'Jenis Fokus Target Hama (Pest Control)'}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {TARGET_FOCUS_QUICK_CHIPS[serviceType].map(focus => (
                <label key={focus} className="flex items-center gap-2 p-2 border border-[var(--border-subtle)] rounded-lg hover:bg-[var(--bg-tertiary)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={targetFocus.includes(focus)}
                    onChange={e => {
                      if (e.target.checked) setTargetFocus(prev => [...prev, focus]);
                      else setTargetFocus(prev => prev.filter(f => f !== focus));
                    }}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-[var(--accent)]"
                  />
                  <span className="text-xs text-[var(--text-secondary)]">{focus}</span>
                </label>
              ))}
            </div>

            {/* Tambah Target dari Dropdown Katalog Lengkap atau Ketik Manual */}
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <select
                value={dropdownFocusPick}
                onChange={e => {
                  const v = e.target.value;
                  setDropdownFocusPick('');
                  if (v && !targetFocus.includes(v)) {
                    setTargetFocus(prev => [...prev, v]);
                  }
                }}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs"
              >
                <option value="">
                  {isTermite ? '+ Pilih target rayap lainnya dari daftar...' : '+ Pilih hama lainnya (26 hama)...'}
                </option>
                {catalogForDropdown.map(item => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Atau ketik target fokus lain..."
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
                      <Lock size={12} /> Titik Terkunci
                    </>
                  ) : (
                    <>
                      <Crosshair size={12} /> Kunci Titik
                    </>
                  )}
                </button>
              </div>
            </div>
            <div className={`rounded-xl overflow-hidden border transition-all ${isMapLocked ? 'border-emerald-500 ring-2 ring-emerald-500/20 pointer-events-none opacity-90' : 'border-slate-300'}`}>
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
                className="h-44 sm:h-48 w-full"
              />
            </div>
            <div className="flex justify-between items-center mt-1 px-1">
              <span className="text-[10px] font-mono text-[var(--text-muted)]">
                Titik: {locationLat.toFixed(6)}, {locationLng.toFixed(6)}
              </span>
              <span className="text-[10px] text-[var(--text-muted)]">
                {isMapLocked ? 'Lokasi telah dikunci' : 'Geser pin untuk menentukan titik akurat'}
              </span>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
              Catatan / Instruksi Kerja (Opsional)
            </label>
            <textarea
              id="input-notes"
              rows={2}
              placeholder="Instruksi safety, akses masuk, riwayat infestasi sebelumnya..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              onFocus={e => {
                const target = e.currentTarget;
                setTimeout(() => scrollInputIntoView(target), 100);
              }}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-base sm:text-xs resize-none scroll-mt-24 scroll-mb-48"
            />
          </div>

          {submitError && (
            <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 font-medium">
              {submitError}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border-subtle)]">
            <button
              id="btn-cancel-create-project"
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-[var(--border-subtle)] hover:bg-[var(--bg-tertiary)] text-xs font-semibold transition-colors text-[var(--text-secondary)] disabled:opacity-50"
            >
              Batal
            </button>
            <button
              id="btn-submit-create-project"
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/25 active:scale-98 transition-all flex items-center gap-2 disabled:opacity-60"
            >
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              {isSubmitting ? 'Menyimpan...' : 'Simpan & Tugaskan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
