import React, { useState, useEffect, useCallback } from 'react';
import { WorkReport, Project, DocumentationPhoto, PhotoType, PhotoTag } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { fetchMyWorkReports, checkIn, addProgressPhoto, checkOut, submitTreatment, TreatmentInput } from '../../api/workReports';
import { createProject, fetchMyProjects, CreateProjectInput } from '../../api/projects';
import { ApiError } from '../../api/client';
import { getQueueLength, enqueue, syncQueue } from '../../utils/offlineQueue';
import { CameraCaptureModal } from '../camera/CameraCaptureModal';
import { CreateProjectModal } from './CreateProjectModal';
import { TreatmentFormModal } from './TreatmentFormModal';
import { PhotoViewerModal } from '../common/PhotoViewerModal';
import { AuthedImage } from '../common/AuthedImage';
import { RiskBadge } from '../common/RiskBadge';
import { getServiceTypeMeta } from '../../utils/serviceMeta';
import { formatDistance } from '../../utils/geo';
import {
  Plus, Camera, CheckCircle2, Clock, MapPin, Briefcase, History, User as UserIcon,
  Home, Check, Lock, Eye, LogOut, ChevronRight, Building, WifiOff, RefreshCw, AlertCircle, ImagePlus, ShieldCheck,
} from 'lucide-react';

export const ExecutorHome: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'home' | 'jobs' | 'history' | 'profile'>('home');
  const [reports, setReports] = useState<WorkReport[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  const [showCreateProject, setShowCreateProject] = useState(false);
  const [activeCameraAction, setActiveCameraAction] = useState<{ type: PhotoType; report: WorkReport; photoTag?: PhotoTag } | null>(null);
  const [treatmentFormReport, setTreatmentFormReport] = useState<WorkReport | null>(null);
  const [viewingPhoto, setViewingPhoto] = useState<DocumentationPhoto | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successFeedback, setSuccessFeedback] = useState<{ title: string; subtitle: string; stats?: string } | null>(null);

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
    setPendingCount(getQueueLength());
  }, [loadData]);

  const attemptSync = useCallback(async () => {
    if (getQueueLength() === 0) return;
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

  const ongoingJob = reports.find(r => r.status === 'WORKING');
  const readyJob = reports.find(r => r.status === 'READY' || r.status === 'DRAFT');
  const completedJobs = reports.filter(r => ['COMPLETED', 'FLAGGED', 'REVIEWED'].includes(r.status));

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
      } else {
        const completed = await checkOut(report.id, evidence);
        const durationMin = completed.durationSeconds ? Math.round(completed.durationSeconds / 60) : 0;
        setSuccessFeedback({
          title: completed.status === 'FLAGGED' ? '⚠ PEKERJAAN SELESAI — DITANDAI UNTUK DITINJAU' : '✓ PEKERJAAN SELESAI',
          subtitle: completed.projectName,
          stats: `Durasi: ${durationMin} menit • ${completed.photos.length} foto tersimpan`,
        });
      }
      setActiveCameraAction(null);
      await loadData();
    } catch (err) {
      if (err instanceof ApiError && err.status === 0) {
        // No connection — queue it instead of losing the evidence (PRD Section 47).
        const queueAction = type === 'CHECK_IN' ? 'CHECK_IN' : type === 'PROGRESS' ? 'PROGRESS' : 'CHECK_OUT';
        await enqueue(queueAction, report.id, evidence);
        setPendingCount(getQueueLength());
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
    const updated = await submitTreatment(treatmentFormReport.id, input);
    setTreatmentFormReport(null);
    setActiveCameraAction({ type: 'CHECK_OUT', report: updated });
    await loadData();
  };

  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  useEffect(() => {
    if (!ongoingJob?.checkInAt) return;
    const interval = setInterval(() => {
      const start = new Date(ongoingJob.checkInAt!).getTime();
      const diffSec = Math.max(0, Math.floor((Date.now() - start) / 1000));
      const hours = String(Math.floor(diffSec / 3600)).padStart(2, '0');
      const minutes = String(Math.floor((diffSec % 3600) / 60)).padStart(2, '0');
      const seconds = String(diffSec % 60).padStart(2, '0');
      setElapsedTime(`${hours}:${minutes}:${seconds}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [ongoingJob]);

  const initials = user.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-800 pb-20">
      <div className="bg-slate-900 text-white px-4 py-3.5 shadow-md sticky top-0 z-30 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center font-bold text-slate-950 text-sm">FW</div>
          <div>
            <h1 className="text-sm font-bold tracking-tight">FIELDWORK</h1>
            <p className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Pelaksana Lapangan
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <button
              onClick={attemptSync}
              disabled={isSyncing}
              className="flex items-center gap-1 bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold px-2.5 py-1.5 rounded-lg"
              title="Data belum terkirim — tap untuk coba kirim sekarang"
            >
              {isSyncing ? <RefreshCw size={13} className="animate-spin" /> : <WifiOff size={13} />}
              {pendingCount}
            </button>
          )}
          <button
            onClick={() => setShowCreateProject(true)}
            className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm transition-all active:scale-95"
          >
            <Plus size={15} /> Proyek Baru
          </button>
        </div>
      </div>

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
          <div className="py-16 text-center text-sm text-slate-400">Memuat data pekerjaan...</div>
        )}

        {!isLoading && loadError && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-center">
            <p className="text-sm text-rose-800 font-medium mb-2">{loadError}</p>
            <button onClick={loadData} className="text-xs font-semibold bg-rose-600 text-white px-3 py-1.5 rounded-lg">Coba Lagi</button>
          </div>
        )}

        {!isLoading && !loadError && activeTab === 'home' && (
          <>
            <div className="bg-white p-4 rounded-xl border border-zinc-200 flex items-center justify-between">
              <div>
                <span className="text-xs text-zinc-500 font-medium">Petugas Bertugas:</span>
                <h2 className="text-base font-bold text-zinc-900">{user.name}</h2>
                <span className="text-xs text-zinc-400 font-mono">
                  NIP: {user.nip || '-'} &bull; {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>
              <div className="w-10 h-10 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-sm shrink-0">
                {initials}
              </div>
            </div>

            {ongoingJob && (
              <div className="bg-zinc-900 text-white p-5 rounded-xl border border-zinc-800">
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
                    const Icon = meta.icon;
                    return (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-200 border border-zinc-700">
                        <Icon size={12} /> {meta.shortLabel}
                      </span>
                    );
                  })()}
                  {ongoingJob.pestTarget && <span className="text-[11px] text-zinc-400">• {ongoingJob.pestTarget}</span>}
                </div>
                <h3 className="text-base font-bold text-white tracking-tight">{ongoingJob.projectName}</h3>
                <p className="text-xs text-zinc-400 mt-0.5 flex items-center gap-1">
                  <Building size={13} className="text-zinc-500" /> {ongoingJob.clientName}
                </p>
                <p className="text-xs text-zinc-400 mt-1 flex items-start gap-1">
                  <MapPin size={13} className="text-zinc-500 shrink-0 mt-0.5" />
                  <span className="truncate">{ongoingJob.projectAddress}</span>
                </p>

                <div className="mt-4 pt-3 border-t border-zinc-800">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="text-zinc-400 font-medium">Dokumentasi Lapangan ({ongoingJob.photos.length} foto)</span>
                    <span className="text-[11px] text-emerald-400 font-mono">
                      Check-In: {ongoingJob.checkInAt ? new Date(ongoingJob.checkInAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'} WIB
                    </span>
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {ongoingJob.photos.map(photo => (
                      <button key={photo.id} type="button" onClick={() => setViewingPhoto(photo)} className="relative w-16 h-16 rounded overflow-hidden border border-zinc-700 shrink-0 group hover:border-emerald-400 transition-colors">
                        <AuthedImage path={photo.url} alt="evidence" className="w-full h-full object-cover" />
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
              <div className="bg-white p-5 rounded-xl border border-zinc-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold px-2.5 py-1 rounded flex items-center gap-1">
                    <CheckCircle2 size={13} /> SIAP CHECK-IN
                  </span>
                  <span className="text-xs text-zinc-500 font-medium">Jadwal: {readyJob.scheduledStartTime} WIB</span>
                </div>

                <div className="flex items-center gap-1.5 mb-1">
                  {(() => {
                    const meta = getServiceTypeMeta(readyJob.serviceType);
                    const Icon = meta.icon;
                    return (
                      <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded border ${meta.badgeClass}`}>
                        <Icon size={12} /> {meta.shortLabel}
                      </span>
                    );
                  })()}
                  {readyJob.pestTarget && <span className="text-[11px] text-zinc-500">• {readyJob.pestTarget}</span>}
                </div>
                <h3 className="text-base font-bold text-zinc-900">{readyJob.projectName}</h3>
                <p className="text-xs text-zinc-600 mt-0.5">{readyJob.clientName}</p>
                <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1">
                  <MapPin size={13} className="text-zinc-400 shrink-0" /> {readyJob.projectAddress}
                </p>

                <div className="bg-zinc-50 rounded-lg p-3 my-4 border border-zinc-200 text-xs space-y-1">
                  <div className="flex justify-between text-zinc-600">
                    <span>Radius Geofence:</span>
                    <span className="font-semibold text-zinc-800">{readyJob.projectRadius} meter</span>
                  </div>
                  {readyJob.buildingAreaSqm ? (
                    <div className="flex justify-between text-zinc-600">
                      <span>Luas Area:</span>
                      <span className="font-semibold text-zinc-800">{readyJob.buildingAreaSqm} m²</span>
                    </div>
                  ) : null}
                  <div className="flex justify-between text-zinc-600">
                    <span>Verifikasi:</span>
                    <span className="font-semibold text-zinc-800">Kamera Langsung &amp; GPS Spasial</span>
                  </div>
                </div>

                <button onClick={() => setActiveCameraAction({ type: 'CHECK_IN', report: readyJob })} className="w-full h-11 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors">
                  <Camera size={18} /> Ambil Foto &amp; Check-In
                </button>
              </div>
            )}

            {!ongoingJob && !readyJob && (
              <div className="bg-white p-8 rounded-xl border border-zinc-200 text-center">
                <div className="w-12 h-12 rounded-lg bg-zinc-100 text-zinc-500 mx-auto flex items-center justify-center mb-3">
                  <Briefcase size={22} />
                </div>
                <h3 className="text-base font-bold text-zinc-900">Belum ada pekerjaan hari ini</h3>
                <p className="text-xs text-zinc-500 mt-1 max-w-xs mx-auto mb-4">
                  Buat penugasan proyek baru untuk memulai check-in.
                </p>
                <button onClick={() => setShowCreateProject(true)} className="inline-flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors">
                  <Plus size={15} /> Tambah Pekerjaan
                </button>
              </div>
            )}

            <div className="pt-2">
              <div className="flex items-center justify-between mb-2 px-1">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Riwayat Pekerjaan Saya ({completedJobs.length})</h3>
                <button onClick={() => setActiveTab('history')} className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-0.5">
                  Lihat Semua <ChevronRight size={14} />
                </button>
              </div>

              <div className="space-y-2">
                {completedJobs.slice(0, 3).map(rep => {
                  const durationMin = rep.durationSeconds ? Math.round(rep.durationSeconds / 60) : 0;
                  return (
                    <div key={rep.id} className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between">
                      <div className="min-w-0 pr-3">
                        <div className="flex items-center gap-2 mb-0.5">
                          <RiskBadge level={rep.riskLevel} score={rep.riskScore} size="sm" />
                          <span className="text-[11px] font-medium text-slate-400">{new Date(rep.createdAt).toLocaleDateString('id-ID')}</span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 truncate">{rep.projectName}</h4>
                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">                          <span>
                            {rep.checkInAt ? new Date(rep.checkInAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'} →{' '}
                            {rep.checkOutAt ? new Date(rep.checkOutAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
                          </span>
                          <span>• {durationMin} min</span>
                          <span>• {rep.photos.length} foto</span>
                        </div>
                      </div>
                      {rep.photos.length > 0 && (
                        <button type="button" onClick={() => setViewingPhoto(rep.photos[0])} className="w-12 h-12 rounded-lg overflow-hidden border border-slate-200 shrink-0 relative group">
                          <AuthedImage path={rep.photos[0].url} alt="thumb" className="w-full h-full object-cover" />
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
              <h2 className="text-base font-bold text-slate-900">Daftar Proyek Lapangan</h2>
              <button onClick={() => setShowCreateProject(true)} className="bg-emerald-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1">
                <Plus size={14} /> Tambah
              </button>
            </div>

            {projects.length === 0 && <p className="text-xs text-slate-500 text-center py-8">Belum ada proyek. Buat proyek pertama Anda.</p>}

            {projects.map(proj => {
              const report = reports.find(r => r.projectId === proj.id);
              const isLocked = !!proj.lockedAt;
              const meta = getServiceTypeMeta(proj.serviceType);
              const Icon = meta.icon;
              return (
                <div key={proj.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded border mb-1 ${meta.badgeClass}`}>
                        <Icon size={11} /> {meta.shortLabel}
                      </span>
                      <h3 className="font-bold text-sm text-slate-900">{proj.projectName}</h3>
                      <p className="text-xs text-slate-500">{proj.clientName}</p>
                    </div>
                    {isLocked ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        <Lock size={11} /> Terkunci
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">Siap Mulai</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600">{proj.address}</p>
                  <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
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
            <h2 className="text-base font-bold text-slate-900">Seluruh Riwayat Pekerjaan</h2>
            {completedJobs.length === 0 ? (
              <p className="text-xs text-slate-500">Belum ada riwayat pekerjaan selesai.</p>
            ) : (
              completedJobs.map(rep => (
                <div key={rep.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <RiskBadge level={rep.riskLevel} score={rep.riskScore} size="sm" />
                    <span className="text-xs text-slate-400 font-mono">{new Date(rep.createdAt).toLocaleDateString('id-ID')}</span>
                  </div>
                  <h3 className="font-bold text-sm text-slate-900">{rep.projectName}</h3>
                  <p className="text-xs text-slate-500">{rep.projectAddress}</p>
                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <div>
                      <span className="text-slate-400 block text-[10px]">CHECK-IN</span>
                      <span className="font-semibold text-slate-700">
                        {rep.checkInAt ? new Date(rep.checkInAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'} WIB
                      </span>
                      <span className="block text-[10px] text-slate-500">{rep.checkInValid ? '✓ Sesuai' : '⚠ Di luar radius'} ({rep.checkInDistance}m)</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">CHECK-OUT</span>
                      <span className="font-semibold text-slate-700">
                        {rep.checkOutAt ? new Date(rep.checkOutAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'} WIB
                      </span>
                      <span className="block text-[10px] text-slate-500">Durasi: {rep.durationSeconds ? Math.round(rep.durationSeconds / 60) : 0} min</span>
                    </div>
                  </div>
                  <div className="flex gap-2 overflow-x-auto pt-1">
                    {rep.photos.map(p => (
                      <button key={p.id} type="button" onClick={() => setViewingPhoto(p)} className="w-14 h-14 rounded-lg overflow-hidden border border-slate-200 shrink-0">
                        <AuthedImage path={p.url} alt="evidence" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {!isLoading && !loadError && activeTab === 'profile' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xl border-2 border-emerald-500">
                {initials}
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">{user.name}</h3>
                <p className="text-xs text-slate-500">{user.email}</p>
                <span className="inline-block mt-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Role: PELAKSANA (Field Worker)
                </span>
              </div>
            </div>
            <div className="pt-4 border-t border-slate-100 text-xs space-y-2">
              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-500">NIP:</span>
                <span className="font-semibold text-slate-800">{user.nip || '-'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-500">Total Pekerjaan:</span>
                <span className="font-bold text-slate-800">{reports.length} Penugasan</span>
              </div>
            </div>
            <button onClick={logout} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 text-sm font-semibold transition-colors">
              <LogOut size={16} /> Keluar dari Akun
            </button>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 z-40 max-w-xl mx-auto flex items-center justify-around h-16 px-2 shadow-lg">
        <button onClick={() => setActiveTab('home')} className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${activeTab === 'home' ? 'text-emerald-600 font-bold' : 'text-slate-500 hover:text-slate-800'}`}>
          <Home size={20} /><span className="text-[10px] mt-0.5">Home</span>
        </button>
        <button onClick={() => setActiveTab('jobs')} className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${activeTab === 'jobs' ? 'text-emerald-600 font-bold' : 'text-slate-500 hover:text-slate-800'}`}>
          <Briefcase size={20} /><span className="text-[10px] mt-0.5">Proyek</span>
        </button>
        <button onClick={() => setShowCreateProject(true)} className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/35 active:scale-95 transition-all -mt-5 border-2 border-white" title="Tambah Proyek Baru">
          <Plus size={24} />
        </button>
        <button onClick={() => setActiveTab('history')} className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${activeTab === 'history' ? 'text-emerald-600 font-bold' : 'text-slate-500 hover:text-slate-800'}`}>
          <History size={20} /><span className="text-[10px] mt-0.5">Riwayat</span>
        </button>
        <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${activeTab === 'profile' ? 'text-emerald-600 font-bold' : 'text-slate-500 hover:text-slate-800'}`}>
          <UserIcon size={20} /><span className="text-[10px] mt-0.5">Profil</span>
        </button>
      </div>

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

      {showCreateProject && <CreateProjectModal onClose={() => setShowCreateProject(false)} onSubmit={handleCreateProjectSubmit} />}
      {viewingPhoto && <PhotoViewerModal photo={viewingPhoto} onClose={() => setViewingPhoto(null)} />}
    </div>
  );
};
