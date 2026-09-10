import React, { useState, useEffect, useCallback } from 'react';
import { WorkReport, Project, DocumentationPhoto, PhotoType, PhotoTag } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { fetchMyWorkReports, checkIn, addProgressPhoto, checkOut, submitTreatment, TreatmentInput } from '../../api/workReports';
import { createProject, fetchMyProjects, CreateProjectInput } from '../../api/projects';
import { ApiError } from '../../api/client';
import { getQueueLength, enqueue, enqueueTreatment, enqueueGps, syncQueue } from '../../utils/offlineQueue';
import { CameraCaptureModal } from '../camera/CameraCaptureModal';
import { CreateProjectModal } from './CreateProjectModal';
import { TreatmentFormModal } from './TreatmentFormModal';
import { PhotoViewerModal } from '../common/PhotoViewerModal';
import { AuthedImage } from '../common/AuthedImage';
import { RiskBadge } from '../common/RiskBadge';
import { ChangePasswordModal } from '../auth/ChangePasswordModal';
import { getServiceTypeMeta } from '../../utils/serviceMeta';
import { formatDistance } from '../../utils/geo';
import { Header } from '../common/Header';
import {
  Plus, Camera, CheckCircle2, Clock, MapPin, Briefcase, History, User as UserIcon,
  Home, Check, Lock, Eye, LogOut, ChevronRight, Building, WifiOff, RefreshCw, AlertCircle, ImagePlus, ShieldCheck, X,
} from 'lucide-react';

import { CustomerReviewFormModal } from './CustomerReviewFormModal';
import { postLocation } from '../../api/location';

export const ExecutorHome: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'home' | 'jobs' | 'history' | 'profile'>('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [reports, setReports] = useState<WorkReport[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [pendingCount, setPendingCount] = useState(0);
  const [serverTimeOffset, setServerTimeOffset] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  const [showCreateProject, setShowCreateProject] = useState(false);
  const [activeCameraAction, setActiveCameraAction] = useState<{ type: PhotoType; report: WorkReport; photoTag?: PhotoTag } | null>(null);
  const [treatmentFormReport, setTreatmentFormReport] = useState<WorkReport | null>(null);
  const [checkoutEvidence, setCheckoutEvidence] = useState<{ report: WorkReport; evidence: any } | null>(() => {
    try {
      const cached = sessionStorage.getItem('fw_checkout');
      return cached ? JSON.parse(cached) : null;
    } catch { return null; }
  });
  useEffect(() => {
    if (checkoutEvidence) sessionStorage.setItem('fw_checkout', JSON.stringify(checkoutEvidence));
    else sessionStorage.removeItem('fw_checkout');
  }, [checkoutEvidence]);
  const [viewingPhoto, setViewingPhoto] = useState<DocumentationPhoto | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successFeedback, setSuccessFeedback] = useState<{ title: string; subtitle: string; stats?: string } | null>(null);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showGpsPrompt, setShowGpsPrompt] = useState(false);
  const [gpsPermissionStatus, setGpsPermissionStatus] = useState<string>('unknown');

  useEffect(() => {
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'geolocation' }).then(result => {
        setGpsPermissionStatus(result.state);
        if (result.state === 'prompt') {
          // Check if we've already prompted in this session
          if (!sessionStorage.getItem('gps_prompted')) {
            setShowGpsPrompt(true);
            sessionStorage.setItem('gps_prompted', 'true');
          }
        }
        result.onchange = () => {
          setGpsPermissionStatus(result.state);
          if (result.state === 'granted') {
             setShowGpsPrompt(false);
             // Trigger background track immediately on grant
             trackLocation();
          }
        };
      });
    }
  }, []);

  const trackLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      pos => {
        postLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }).catch(err => {
          if (err.status === 0) enqueueGps(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy);
        });
      },
      err => console.warn('Background GPS error:', err),
      { enableHighAccuracy: false, maximumAge: 60000, timeout: 10000 }
    );
  }, []);

  // Background GPS Tracking
  useEffect(() => {
    // Track on initial load
    trackLocation();
    // Track every 45 minutes
    const interval = setInterval(trackLocation, 45 * 60 * 1000);
    return () => clearInterval(interval);
  }, [trackLocation]);

  const loadData = useCallback(async () => {
    setLoadError(null);
    try {
      const [r, p] = await Promise.all([fetchMyWorkReports(), fetchMyProjects()]);
      setReports(r);
      setProjects(p);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Gagal memuat data. Periksa koneksi Anda.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    getQueueLength().then(setPendingCount);
  }, [loadData]);

  const attemptSync = useCallback(async () => {
    if (await getQueueLength() === 0) return;
    setIsSyncing(true);
    const { synced } = await syncQueue(remaining => setPendingCount(remaining));
    setIsSyncing(false);
    if (synced > 0) await loadData();
  }, [loadData]);

  useEffect(() => {
    window.addEventListener('online', attemptSync);
    return () => window.removeEventListener('online', attemptSync);
  }, [attemptSync]);

  if (!user) return null;

  const filteredReports = reports.filter(r => 
    searchQuery === '' || 
    r.projectName.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (r.clientName && r.clientName.toLowerCase().includes(searchQuery.toLowerCase())) ||
    r.projectAddress.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const ongoingJob = filteredReports.find(r => r.status === 'WORKING');
  const readyJob = filteredReports.find(r => r.status === 'READY' || r.status === 'DRAFT');
  const completedJobs = filteredReports.filter(r => ['COMPLETED', 'FLAGGED', 'REVIEWED'].includes(r.status));

  const filteredProjects = projects.filter(p => 
    searchQuery === '' || 
    p.projectName.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (p.clientName && p.clientName.toLowerCase().includes(searchQuery.toLowerCase())) ||
    p.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateProjectSubmit = async (data: CreateProjectInput) => {
    await createProject(data);
    setShowCreateProject(false);
    await loadData();
  };

  const handleCaptureComplete = async (capturedData: { photoBlob: Blob; latitude: number; longitude: number; accuracy: number }) => {
    if (!activeCameraAction) return;
    const { type, report, photoTag } = activeCameraAction;
    setActionError(null);
    const evidence = { photoBlob: capturedData.photoBlob, latitude: capturedData.latitude, longitude: capturedData.longitude, accuracy: capturedData.accuracy, photoTag };

    try {
      if (type === 'CHECK_IN') {
        const updated = await checkIn(report.id, evidence);
        setSuccessFeedback({
          title: '✓ CHECK-IN BERHASIL',
          subtitle: `Anda tercatat berada di ${updated.projectName}.`,
          stats: `Jarak: ${updated.checkInDistance !== null && updated.checkInDistance !== undefined ? formatDistance(updated.checkInDistance) : '-'} • ${updated.checkInValid ? 'Sesuai radius' : 'Di luar radius'}`,
        });
      } else if (type === 'PROGRESS') {
        await addProgressPhoto(report.id, evidence);
        setActiveCameraAction(null);
        await loadData();
      } else {
        // Defer checkout to CustomerReviewForm
        setCheckoutEvidence({ report, evidence });
        setActiveCameraAction(null);
        return;
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 0) {
        // No connection — queue it instead of losing the evidence (PRD Section 47).
        const queueAction = type === 'CHECK_IN' ? 'CHECK_IN' : type === 'PROGRESS' ? 'PROGRESS' : 'CHECK_OUT';
        await enqueue(queueAction, report.id, evidence);
        getQueueLength().then(setPendingCount);
        setActiveCameraAction(null);
        setSuccessFeedback({
          title: '📶 Disimpan Offline',
          subtitle: 'Tidak ada koneksi internet. Bukti akan otomatis terkirim saat perangkat kembali online.',
        });
      } else {
        setActionError(err instanceof ApiError ? err.message : 'Gagal menyimpan. Coba lagi.');
      }
    }
  };

  const handleTreatmentSubmit = async (input: TreatmentInput) => {
    if (!treatmentFormReport) return;
    try {
      const updated = await submitTreatment(treatmentFormReport.id, input);
      setTreatmentFormReport(null);
      setActiveCameraAction({ type: 'CHECK_OUT', report: updated });
      await loadData();
    } catch (err: any) {
      if (err.status === 0) {
        await enqueueTreatment(treatmentFormReport.id, input);
        getQueueLength().then(setPendingCount);
        setTreatmentFormReport(null);
        setActiveCameraAction({ type: 'CHECK_OUT', report: treatmentFormReport });
        setSuccessFeedback({ title: '📶 Disimpan Offline', subtitle: 'Data treatment masuk antrean. Lanjut check-out.' });
      } else {
        setActionError(err.message || 'Gagal menyimpan treatment.');
      }
    }
  };

  const handleCustomerReviewSubmit = async (reviewData: { customerName: string; customerPhone: string; customerFeedback: string; customerSignature: string }) => {
    if (!checkoutEvidence) return;
    const { report, evidence } = checkoutEvidence;
    setCheckoutEvidence(null);
    setActionError(null);

    const fullEvidence = { ...evidence, ...reviewData };

    try {
      const completed = await checkOut(report.id, fullEvidence);
      const durationMin = completed.durationSeconds ? Math.round(completed.durationSeconds / 60) : 0;
      setSuccessFeedback({
        title: completed.status === 'FLAGGED' ? '⚠ PEKERJAAN SELESAI — DITANDAI UNTUK DITINJAU' : '✓ PEKERJAAN SELESAI',
        subtitle: completed.projectName,
        stats: `Durasi: ${durationMin} menit • ${completed.photos.length} foto tersimpan`,
      });
      await loadData();
    } catch (err) {
      if (err instanceof ApiError && err.status === 0) {
        await enqueue('CHECK_OUT', report.id, fullEvidence);
        getQueueLength().then(setPendingCount);
        setSuccessFeedback({
          title: '📶 Disimpan Offline',
          subtitle: 'Tidak ada koneksi internet. Bukti dan ulasan akan otomatis terkirim saat perangkat kembali online.',
        });
      } else {
        setActionError(err instanceof ApiError ? err.message : 'Gagal menyimpan check-out.');
      }
    }
  };

  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  useEffect(() => {
    if (!ongoingJob?.checkInAt) return;
    const interval = setInterval(() => {
      const start = new Date(ongoingJob.checkInAt!).getTime();
      const diffSec = Math.max(0, Math.floor((Date.now() + serverTimeOffset - start) / 1000));
      const hours = String(Math.floor(diffSec / 3600)).padStart(2, '0');
      const minutes = String(Math.floor((diffSec % 3600) / 60)).padStart(2, '0');
      const seconds = String(diffSec % 60).padStart(2, '0');
      setElapsedTime(`${hours}:${minutes}:${seconds}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [ongoingJob]);

  const initials = user.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

  const NavItem = ({ tab, label, icon: Icon }: { tab: 'home' | 'jobs' | 'history' | 'profile', label: string, icon: any }) => {
    const active = activeTab === tab;
    return (
      <button
        onClick={() => { setActiveTab(tab); setMobileMenuOpen(false); }}
        className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${
          active ? 'text-emerald-600' : 'text-slate-500 hover:text-slate-900'
        }`}
      >
        <Icon size={20} className={active ? 'text-emerald-600' : 'text-slate-500'} strokeWidth={active ? 2.5 : 2} />
        <span className={`text-[10px] font-medium ${active ? 'font-bold' : ''}`}>{label}</span>
      </button>
    );
  };


  return (
    <div className="flex flex-col h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <Header currentUser={user} onLogout={logout} pendingCount={pendingCount} onSync={attemptSync} isSyncing={isSyncing} hideMobileMenu={true} />
      
      <div className="flex flex-1 overflow-hidden relative">
        
        <main className="flex-1 overflow-y-auto flex flex-col w-full relative pb-20">
      {successFeedback && (
        <div className="m-4 p-4 bg-emerald-50 border-2 border-emerald-500 rounded-2xl shadow-sm text-emerald-900 flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
              <Check size={20} />
            </div>
            <div>
              <h4 className="font-bold text-sm text-emerald-950">{successFeedback.title}</h4>
              <p className="text-xs text-emerald-800 mt-0.5 font-medium">{successFeedback.subtitle}</p>
              {successFeedback.stats && <p className="text-[11px] text-emerald-700 mt-1 font-mono">{successFeedback.stats}</p>}
            </div>
          </div>
          <button onClick={() => setSuccessFeedback(null)} className="text-emerald-700 hover:text-emerald-900 p-1 text-xs font-bold">✕</button>
        </div>
      )}

      {actionError && (
        <div className="mx-4 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-2">
          <AlertCircle size={15} className="shrink-0 mt-0.5" />
          <span>{actionError}</span>
        </div>
      )}

      <div className="flex-1 max-w-xl w-full mx-auto p-4 space-y-4">
        {isLoading && (
          <div className="py-16 text-center text-sm text-[var(--text-muted)]">Memuat data pekerjaan...</div>
        )}

        {!isLoading && loadError && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-center">
            <p className="text-sm text-rose-800 font-medium mb-2">{loadError}</p>
            <button onClick={loadData} className="text-xs font-semibold bg-rose-600 text-white px-3 py-1.5 rounded-lg">Coba Lagi</button>
          </div>
        )}

        {!isLoading && !loadError && (
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-4 w-4 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Cari berdasarkan nama proyek, klien, atau alamat..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[var(--border-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-xs bg-white text-[var(--text-primary)] placeholder-[var(--text-muted)] shadow-sm"
            />
          </div>
        )}

        {!isLoading && !loadError && activeTab === 'home' && (
          <>
            <div className="clean-card p-4 flex items-center justify-between">
              <div>
                <span className="text-xs text-[var(--text-muted)] font-medium">Petugas Bertugas:</span>
                <h2 className="text-base font-bold text-[var(--text-primary)]">{user.name}</h2>
                <span className="text-xs text-[var(--text-muted)] font-mono">
                  NIP: {user.nip || '-'} &bull; {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>
              <div className="w-10 h-10 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-sm shrink-0">
                {initials}
              </div>
            </div>

            {ongoingJob && (
              <div className="bg-[var(--text-primary)] text-white p-5 rounded-xl border border-white/5">
                <div className="flex items-center justify-between mb-3">
                  <span className="inline-flex items-center gap-1.5 bg-emerald-950 text-emerald-300 border border-emerald-800 text-xs font-semibold px-2.5 py-1 rounded">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" /> PEKERJAAN AKTIF
                  </span>
                  <div className="flex items-center gap-1 text-xs font-mono text-zinc-300 bg-zinc-800 px-2.5 py-1 rounded border border-zinc-700">
                    <Clock size={13} className="text-emerald-400" /> {elapsedTime}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 mb-1.5">
                  {(() => {
                    const meta = getServiceTypeMeta(ongoingJob.serviceType);
                    return (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-200 border border-zinc-700">
                        {meta.shortLabel}
                      </span>
                    );
                  })()}
                  {ongoingJob.targetPests?.length > 0 && <span className="text-[11px] text-[var(--text-muted)]">• {ongoingJob.targetPests.join(', ')}</span>}
                  {ongoingJob.pestTarget && ongoingJob.targetPests?.length === 0 && <span className="text-[11px] text-[var(--text-muted)]">• {ongoingJob.pestTarget}</span>}
                </div>
                <h3 className="text-base font-bold text-white tracking-tight">{ongoingJob.projectName}</h3>
                <p className="text-xs text-[var(--text-muted)] mt-1 flex items-start gap-1">
                  <MapPin size={13} className="text-[var(--text-muted)] shrink-0 mt-0.5" />
                  <span className="truncate">{ongoingJob.projectAddress}</span>
                </p>

                <div className="mt-4 pt-3 border-t border-zinc-800">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="text-[var(--text-muted)] font-medium">Dokumentasi Lapangan ({ongoingJob.photos.length} foto)</span>
                    <span className="text-[11px] text-emerald-400 font-mono">
                      Check-In: {ongoingJob.checkInAt ? new Date(ongoingJob.checkInAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'} WIB
                    </span>
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {ongoingJob.photos.map(photo => (
                      <button key={photo.id} type="button" onClick={() => setViewingPhoto(photo)} className="relative w-16 h-16 rounded overflow-hidden border border-zinc-700 shrink-0 group hover:border-emerald-400 transition-colors">
                        <AuthedImage path={photo.url} alt="evidence" purged={!!photo.purgedAt} className="w-full h-full object-cover" />
                        <span className="absolute bottom-0 inset-x-0 bg-zinc-950/80 text-[9px] font-medium text-white text-center py-0.5 uppercase">
                          {photo.photoTag ? (photo.photoTag === 'BEFORE' ? 'Awal' : 'Hasil') : photo.photoType === 'CHECK_IN' ? 'Cin' : photo.photoType === 'PROGRESS' ? 'Prog' : 'Cout'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-5">
                  <button onClick={() => setActiveCameraAction({ type: 'PROGRESS', report: ongoingJob, photoTag: 'BEFORE' })} className="h-11 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-[11px] sm:text-xs flex items-center justify-center gap-1.5 border border-zinc-700 transition-colors">
                    <ImagePlus size={15} /> Foto Kondisi Awal
                  </button>
                  <button onClick={() => setActiveCameraAction({ type: 'PROGRESS', report: ongoingJob, photoTag: 'AFTER' })} className="h-11 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-[11px] sm:text-xs flex items-center justify-center gap-1.5 border border-zinc-700 transition-colors">
                    <ImagePlus size={15} /> Foto Hasil Perlakuan
                  </button>
                </div>
                <button onClick={() => setTreatmentFormReport(ongoingJob)} className="w-full mt-2 h-11 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors">
                  <LogOut size={16} /> Isi Treatment &amp; Check-Out
                </button>
              </div>
            )}

            {readyJob && !ongoingJob && (
              <div className="clean-card p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold px-2.5 py-1 rounded flex items-center gap-1">
                    <CheckCircle2 size={13} /> SIAP CHECK-IN
                  </span>
                  <span className="text-xs text-[var(--text-muted)] font-medium">Jadwal: {readyJob.scheduledStartTime} WIB</span>
                </div>

                <div className="flex items-center gap-1.5 mb-1">
                  {(() => {
                    const meta = getServiceTypeMeta(readyJob.serviceType);
                    return (
                      <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded border ${meta.badgeClass}`}>
                        {meta.shortLabel}
                      </span>
                    );
                  })()}
                  {readyJob.targetPests?.length > 0 && <span className="text-[11px] text-[var(--text-muted)]">• {readyJob.targetPests.join(', ')}</span>}
                  {readyJob.pestTarget && readyJob.targetPests?.length === 0 && <span className="text-[11px] text-[var(--text-muted)]">• {readyJob.pestTarget}</span>}
                </div>
                <h3 className="text-base font-bold text-[var(--text-primary)]">{readyJob.projectName}</h3>
                <p className="text-xs text-[var(--text-muted)] mt-1 flex items-start gap-1">
                  <MapPin size={13} className="text-[var(--text-muted)] shrink-0 mt-0.5" />
                  <span className="truncate">{readyJob.projectAddress}</span>
                </p>

                <div className="bg-[var(--bg-tertiary)] rounded-lg p-3 my-4 border border-[var(--border-subtle)] text-xs space-y-1">
                  <div className="flex justify-between text-[var(--text-secondary)]">
                    <span>Radius Geofence:</span>
                    <span className="font-semibold text-[var(--text-primary)]">{readyJob.projectRadius} meter</span>
                  </div>
                  {readyJob.buildingAreaSqm ? (
                    <div className="flex justify-between text-[var(--text-secondary)]">
                      <span>Luas Area:</span>
                      <span className="font-semibold text-[var(--text-primary)]">{readyJob.buildingAreaSqm} m²</span>
                    </div>
                  ) : null}
                  <div className="flex justify-between text-[var(--text-secondary)]">
                    <span>Verifikasi:</span>
                    <span className="font-semibold text-[var(--text-primary)]">Kamera Langsung &amp; GPS Spasial</span>
                  </div>
                </div>

                <button onClick={() => setActiveCameraAction({ type: 'CHECK_IN', report: readyJob })} className="w-full h-11 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors">
                  <Camera size={18} /> Ambil Foto &amp; Check-In
                </button>
              </div>
            )}

            {!ongoingJob && !readyJob && (
              <div className="clean-card p-8 text-center">
                <div className="w-12 h-12 rounded-lg bg-zinc-100 text-[var(--text-muted)] mx-auto flex items-center justify-center mb-3">
                  <Briefcase size={22} />
                </div>
                <h3 className="text-base font-bold text-[var(--text-primary)]">Belum ada pekerjaan hari ini</h3>
                <p className="text-xs text-[var(--text-muted)] mt-1 max-w-xs mx-auto mb-4">
                  Buat penugasan proyek baru untuk memulai check-in.
                </p>
                <button onClick={() => setShowCreateProject(true)} className="inline-flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors">
                  <Plus size={15} /> Tambah Pekerjaan
                </button>
              </div>
            )}

            <div className="pt-2">
              <div className="flex items-center justify-between mb-2 px-1">
                <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Riwayat Pekerjaan Saya ({completedJobs.length})</h3>
                <button onClick={() => setActiveTab('history')} className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-0.5">
                  Lihat Semua <ChevronRight size={14} />
                </button>
              </div>

              <div className="space-y-2">
                {completedJobs.slice(0, 3).map(rep => {
                  const durationMin = rep.durationSeconds ? Math.round(rep.durationSeconds / 60) : 0;
                  return (
                    <div key={rep.id} className="clean-card p-3.5 flex items-center justify-between">
                      <div className="min-w-0 pr-3">
                        <div className="flex items-center gap-2 mb-0.5">
                          <RiskBadge level={rep.riskLevel} score={rep.riskScore} size="sm" />
                          <span className="text-[11px] font-medium text-[var(--text-muted)]">{new Date(rep.createdAt).toLocaleDateString('id-ID')}</span>
                        </div>
                        <h4 className="text-sm font-bold text-[var(--text-primary)] truncate">{rep.projectName}</h4>
                        <div className="flex items-center gap-3 text-xs text-[var(--text-muted)] mt-1">                          <span>
                            {rep.checkInAt ? new Date(rep.checkInAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'} →{' '}
                            {rep.checkOutAt ? new Date(rep.checkOutAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
                          </span>
                          <span>• {durationMin} min</span>
                          <span>• {rep.photos.length} foto</span>
                        </div>
                      </div>
                      {rep.photos.length > 0 && (
                        <button type="button" onClick={() => setViewingPhoto(rep.photos[0])} className="w-12 h-12 rounded-lg overflow-hidden border border-slate-200 shrink-0 relative group">
                          <AuthedImage path={rep.photos[0].url} alt="thumb" purged={!!rep.photos[0].purgedAt} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <Eye size={14} className="text-white" />
                          </div>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {!isLoading && !loadError && activeTab === 'jobs' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-bold text-[var(--text-primary)]">Daftar Proyek Lapangan</h2>
              <button onClick={() => setShowCreateProject(true)} className="bg-emerald-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1">
                <Plus size={14} /> Tambah
              </button>
            </div>

            {filteredProjects.length === 0 && <p className="text-xs text-[var(--text-muted)] text-center py-8">Belum ada proyek. Buat proyek pertama Anda.</p>}

            {filteredProjects.map(proj => {
              const report = reports.find(r => r.projectId === proj.id);
              const isLocked = !!proj.lockedAt;
              const meta = getServiceTypeMeta(proj.serviceType);
              return (
                <div key={proj.id} className="clean-card p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded border mb-1 ${meta.badgeClass}`}>
                        {meta.shortLabel}
                      </span>
                      <h3 className="font-bold text-sm text-[var(--text-primary)]">{proj.projectName}</h3>
                    </div>
                    {proj.lockedAt ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--text-muted)] bg-[var(--bg-tertiary)] px-2 py-0.5 rounded border border-slate-200">
                        <Lock size={11} /> Terkunci
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">Siap Mulai</span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--text-secondary)]">{proj.address}</p>
                  <div className="flex items-center justify-between text-xs text-[var(--text-muted)] pt-2 border-t border-[var(--border-subtle)]">
                    <span>Radius: {proj.radius}m</span>
                    <span>{proj.contractType === 'RECURRING' ? `Berkala${proj.nextServiceDate ? ` • Berikutnya ${new Date(proj.nextServiceDate).toLocaleDateString('id-ID')}` : ''}` : 'Sekali Layanan'}</span>
                  </div>
                  {proj.warrantyMonths > 0 && (
                    <div className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-200/60 flex items-center gap-1">
                      <ShieldCheck size={12} /> Garansi {proj.warrantyMonths} bulan
                    </div>
                  )}
                  {report && report.status === 'READY' && (
                    <button
                      onClick={() => { setActiveTab('home'); setActiveCameraAction({ type: 'CHECK_IN', report }); }}
                      className="w-full mt-2 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Camera size={14} /> Lakukan Check-In
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {!isLoading && !loadError && activeTab === 'history' && (
          <div className="space-y-3">
            <h2 className="text-base font-bold text-[var(--text-primary)]">Seluruh Riwayat Pekerjaan</h2>
            {completedJobs.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)]">Belum ada riwayat pekerjaan selesai.</p>
            ) : (
              completedJobs.map(rep => (
                <div key={rep.id} className="clean-card p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <RiskBadge level={rep.riskLevel} score={rep.riskScore} size="sm" />
                    <span className="text-xs text-[var(--text-muted)] font-mono">{new Date(rep.createdAt).toLocaleDateString('id-ID')}</span>
                  </div>
                  <h3 className="font-bold text-sm text-[var(--text-primary)]">{rep.projectName}</h3>
                  <p className="text-xs text-[var(--text-muted)]">{rep.projectAddress}</p>
                  <div className="grid grid-cols-2 gap-2 text-xs bg-[var(--bg-tertiary)] p-2.5 rounded-lg border border-[var(--border-subtle)]">
                    <div>
                      <span className="text-[var(--text-muted)] block text-[10px]">CHECK-IN</span>
                      <span className="font-semibold text-[var(--text-secondary)]">
                        {rep.checkInAt ? new Date(rep.checkInAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'} WIB
                      </span>
                      <span className="block text-[10px] text-[var(--text-muted)]">{rep.checkInValid ? '✓ Sesuai' : '⚠ Di luar radius'} ({rep.checkInDistance}m)</span>
                    </div>
                    <div>
                      <span className="text-[var(--text-muted)] block text-[10px]">CHECK-OUT</span>
                      <span className="font-semibold text-[var(--text-secondary)]">
                        {rep.checkOutAt ? new Date(rep.checkOutAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'} WIB
                      </span>
                      <span className="block text-[10px] text-[var(--text-muted)]">Durasi: {rep.durationSeconds ? Math.round(rep.durationSeconds / 60) : 0} min</span>
                    </div>
                  </div>
                  <div className="flex gap-2 overflow-x-auto pt-1">
                    {rep.photos.map(p => (
                      <button key={p.id} type="button" onClick={() => setViewingPhoto(p)} className="w-14 h-14 rounded-lg overflow-hidden border border-slate-200 shrink-0">
                        <AuthedImage path={p.url} alt="evidence" purged={!!p.purgedAt} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {!isLoading && !loadError && activeTab === 'profile' && (
          <div className="clean-card p-6 space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xl border-2 border-emerald-500">
                {initials}
              </div>
              <div>
                <h3 className="font-bold text-base text-[var(--text-primary)]">{user.name}</h3>
                <p className="text-xs text-[var(--text-muted)]">{user.email}</p>
                <span className="inline-block mt-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Role: PELAKSANA (Field Worker)
                </span>
              </div>
            </div>
            <div className="pt-4 border-t border-[var(--border-subtle)] text-xs space-y-2">
              <div className="flex justify-between py-1.5 border-b border-[var(--border-subtle)]">
                <span className="text-[var(--text-muted)]">NIP:</span>
                <span className="font-semibold text-[var(--text-primary)]">{user.nip || '-'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[var(--border-subtle)]">
                <span className="text-[var(--text-muted)]">Total Pekerjaan:</span>
                <span className="font-bold text-[var(--text-primary)]">{reports.length} Penugasan</span>
              </div>
            </div>
            
            <div className="pt-2 space-y-3">
              <button onClick={() => setShowChangePassword(true)} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-semibold transition-colors">
                <Lock size={16} /> Ubah Kata Sandi
              </button>
              <button onClick={logout} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[var(--bg-tertiary)] hover:bg-rose-50 hover:text-rose-700 text-[var(--text-secondary)] text-sm font-semibold transition-colors">
                <LogOut size={16} /> Keluar dari Akun
              </button>
            </div>
          </div>
        )}
      </div>

      </main>
        
        {/* Bottom Navigation for Mobile App UI/UX */}
        <nav className="absolute bottom-0 w-full bg-white border-t border-slate-200 pb-safe z-40 h-[65px] flex items-center justify-between px-4 shadow-[0_-4px_10px_rgba(0,0,0,0.03)]">
          <div className="flex-1 flex justify-around">
            <NavItem tab="home" label="Beranda" icon={Home} />
            <NavItem tab="jobs" label="Proyek" icon={Briefcase} />
          </div>
          
          <div className="relative -top-5 flex flex-col items-center px-2">
            {ongoingJob ? (
              <button
                onClick={() => setTreatmentFormReport(ongoingJob)}
                className="w-14 h-14 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-lg shadow-rose-600/30 border-4 border-white active:scale-95 transition-transform"
              >
                <LogOut size={24} />
              </button>
            ) : readyJob ? (
              <button
                onClick={() => setActiveCameraAction({ type: 'CHECK_IN', report: readyJob })}
                className="w-14 h-14 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/30 border-4 border-white active:scale-95 transition-transform"
              >
                <Camera size={24} />
              </button>
            ) : (
              <button
                onClick={() => setActiveTab('jobs')}
                className="w-14 h-14 rounded-full bg-slate-800 text-white flex items-center justify-center shadow-lg shadow-slate-800/30 border-4 border-white active:scale-95 transition-transform"
              >
                <Plus size={24} />
              </button>
            )}
            <span className="text-[10px] font-bold text-slate-700 mt-1 whitespace-nowrap">
              {ongoingJob ? 'Check Out' : 'Check In'}
            </span>
          </div>

          <div className="flex-1 flex justify-around">
            <NavItem tab="history" label="Riwayat" icon={History} />
            <NavItem tab="profile" label="Profil" icon={UserIcon} />
          </div>
        </nav>

      {activeCameraAction && (
        <CameraCaptureModal
          photoType={activeCameraAction.type}
          projectName={activeCameraAction.report.projectName}
          projectLat={activeCameraAction.report.projectLatitude}
          projectLng={activeCameraAction.report.projectLongitude}
          projectRadius={activeCameraAction.report.projectRadius}
          executorName={user.name}
          onCaptureComplete={handleCaptureComplete}
          onClose={() => setActiveCameraAction(null)}
        />
      )}

      {treatmentFormReport && (
        <TreatmentFormModal
          serviceType={treatmentFormReport.serviceType}
          existing={treatmentFormReport.treatmentRecord}
          onSubmit={handleTreatmentSubmit}
          onSkip={() => { setActiveCameraAction({ type: 'CHECK_OUT', report: treatmentFormReport }); setTreatmentFormReport(null); }}
          onClose={() => setTreatmentFormReport(null)}
        />
      )}

      {checkoutEvidence && (
        <CustomerReviewFormModal
          onClose={() => setCheckoutEvidence(null)}
          onSubmit={handleCustomerReviewSubmit}
        />
      )}

      {showCreateProject && <CreateProjectModal onClose={() => setShowCreateProject(false)} onSubmit={handleCreateProjectSubmit} />}
      {viewingPhoto && <PhotoViewerModal photo={viewingPhoto} onClose={() => setViewingPhoto(null)} />}
      {showChangePassword && <ChangePasswordModal onClose={() => setShowChangePassword(false)} />}
      
      {showGpsPrompt && gpsPermissionStatus !== 'granted' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mb-4 mx-auto">
              <MapPin size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 text-center mb-2">Aktivasi GPS Diperlukan</h3>
            <p className="text-sm text-slate-600 text-center mb-6 leading-relaxed">
              Sistem Fieldwork membutuhkan akses lokasi (GPS) untuk mendeteksi radius check-in ke lokasi proyek dan melacak presensi secara real-time.
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  trackLocation();
                  setShowGpsPrompt(false);
                }}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-colors shadow-lg shadow-emerald-600/20"
              >
                Izinkan Akses GPS
              </button>
              <button
                onClick={() => setShowGpsPrompt(false)}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
              >
                Nanti Saja
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};
