import React, { useState } from 'react';
import { X, MapPin, Calendar, Building, FileText, CheckCircle2, Crosshair, Sparkles, Clock, Loader2 } from 'lucide-react';
import { PRESET_PROJECT_LOCATIONS } from '../../utils/geo';

interface CreateProjectModalProps {
  onClose: () => void;
  onSubmit: (data: {
    projectName: string;
    clientName: string;
    address: string;
    latitude: number;
    longitude: number;
    radius: number;
    workDate: string;
    workType: string;
    scheduledStartTime: string;
    notes?: string;
  }) => Promise<void>;
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({ onClose, onSubmit }) => {
  const [projectName, setProjectName] = useState('');
  const [clientName, setClientName] = useState('');
  const [address, setAddress] = useState('');
  const [workDate, setWorkDate] = useState(new Date().toISOString().split('T')[0]);
  const [workType, setWorkType] = useState('Inspeksi & Pemeliharaan Rutin');
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

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);
    try {
      await onSubmit({
        projectName,
        clientName: clientName || 'Klien Proyek Lapangan',
        address,
        latitude,
        longitude,
        radius,
        workDate,
        workType,
        scheduledStartTime,
        notes,
      });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Gagal membuat proyek. Coba lagi.');
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="create-project-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 sm:p-4 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="create-project-modal-card"
        className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6 text-slate-800"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Buat Pekerjaan Proyek Baru</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Input data penugasan lapangan sebelum melakukan check-in
            </p>
          </div>
          <button
            id="btn-close-create-project"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Quick Presets */}
          <div className="bg-sky-50/70 border border-sky-100 p-3 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-sky-900 flex items-center gap-1">
                <Sparkles size={14} className="text-sky-600" /> Pilih Contoh Lokasi Cepat:
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_PROJECT_LOCATIONS.map((preset, idx) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => handleApplyPreset(idx)}
                  className="text-[11px] px-2.5 py-1 bg-white hover:bg-sky-100/60 text-slate-700 border border-sky-200 rounded-lg transition-colors font-medium text-left"
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          {/* Project Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Nama Proyek *
            </label>
            <input
              id="input-project-name"
              type="text"
              placeholder="Contoh: RS Hermina BSD - Gedung Barat"
              value={projectName}
              onChange={e => {
                setProjectName(e.target.value);
                if (errors.projectName) setErrors(prev => ({ ...prev, projectName: '' }));
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm bg-white"
            />
            {errors.projectName && (
              <p className="text-xs text-red-600 mt-1 font-medium">{errors.projectName}</p>
            )}
          </div>

          {/* Client & Work Type Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Nama Klien / Instansi
              </label>
              <div className="relative">
                <Building size={16} className="absolute left-3 top-3 text-slate-400" />
                <input
                  id="input-client-name"
                  type="text"
                  placeholder="PT Medika Lestari BSD"
                  value={clientName}
                  onChange={e => setClientName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Jenis Pekerjaan
              </label>
              <input
                id="input-work-type"
                type="text"
                placeholder="Maintenance / Inspeksi / Instalasi"
                value={workType}
                onChange={e => setWorkType(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              />
            </div>
          </div>

          {/* Work Date & Scheduled Start Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Tanggal Pelaksanaan *
              </label>
              <div className="relative">
                <Calendar size={16} className="absolute left-3 top-3 text-slate-400" />
                <input
                  id="input-work-date"
                  type="date"
                  value={workDate}
                  onChange={e => setWorkDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Jadwal Mulai
              </label>
              <div className="relative">
                <Clock size={16} className="absolute left-3 top-3 text-slate-400" />
                <input
                  id="input-scheduled-start"
                  type="time"
                  value={scheduledStartTime}
                  onChange={e => setScheduledStartTime(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
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
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm resize-none"
            />
            {errors.address && (
              <p className="text-xs text-red-600 mt-0.5 font-medium">{errors.address}</p>
            )}
          </div>

          {/* GPS Location & Radius Section */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin size={15} className="text-emerald-600" /> Titik Pusat Geofence Proyek
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
                <span className="block text-[11px] font-medium text-slate-500 mb-0.5">Latitude</span>
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
                <span className="block text-[11px] font-medium text-slate-500 mb-0.5">Longitude</span>
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
                <span className="font-semibold text-slate-700">Batas Toleransi Radius Validasi:</span>
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
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {r}m
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5">
                Check-in yang berjarak lebih dari {radius}m akan otomatis tercatat sebagai anomali resiko (+30 poin).
              </p>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Catatan / Instruksi Kerja (Opsional)
            </label>
            <div className="relative">
              <FileText size={16} className="absolute left-3 top-3 text-slate-400" />
              <textarea
                id="input-notes"
                rows={2}
                placeholder="Instruksi safety, area khusus, atau izin masuk..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm resize-none"
              />
            </div>
          </div>

          {/* Action Buttons */}
          {submitError && (
            <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 font-medium">
              {submitError}
            </div>
          )}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              id="btn-cancel-project"
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-sm font-semibold transition-colors disabled:opacity-50"
            >
              Batal
            </button>
            <button
              id="btn-submit-project"
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-lg shadow-emerald-600/25 active:scale-98 transition-all disabled:opacity-60 flex items-center gap-2"
            >
              {isSubmitting && <Loader2 size={16} className="animate-spin" />}
              Buat &amp; Jadwalkan Proyek
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
