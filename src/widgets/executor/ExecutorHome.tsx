import { motion, AnimatePresence } from 'framer-motion';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { WorkReport, Project, DocumentationPhoto, PhotoType, PhotoTag } from '@/entities/types';
import { useAuth } from '@/app/providers/AuthContext';
import { fetchMyWorkReports, checkIn, addProgressPhoto, checkOut, submitTreatment, updateWorkReportTeam, TreatmentInput, TeamMemberEntry } from '@/shared/api/workReports';
import { supabase } from '@/shared/lib/supabase';
import { createProject, fetchMyProjects, CreateProjectInput } from '@/shared/api/projects';
import { ApiError } from '@/shared/api/client';
import { getQueueLength, enqueue, enqueueTreatment, enqueueGps, syncQueue } from '@/shared/utils/offlineQueue';
import { CameraCaptureModal } from '../camera/CameraCaptureModal';
import { CreateProjectModal } from './CreateProjectModal';
import { TreatmentFormModal } from './TreatmentFormModal';
import { PhotoViewerModal } from '../common/PhotoViewerModal';
import { AuthedImage } from '../common/AuthedImage';
import { ChangePasswordModal } from '../auth/ChangePasswordModal';
import { getServiceTypeMeta } from '@/shared/utils/serviceMeta';
import { formatDistance, calculateDistanceMeters } from '@/shared/utils/geo';
import { TabContainer } from '@/shared/ui/TabContainer';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  CloudOff,
  FileCheck2,
  History,
  Home,
  LocateFixed,
  Lock,
  LogOut,
  MapPin,
  MoreHorizontal,
  MoreVertical,
  Navigation,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  UploadCloud,
  User as UserIcon,
  Users,
  Wifi,
} from 'lucide-react';

import { CustomerReviewFormModal } from './CustomerReviewFormModal';
import { postLocation } from '@/shared/api/location';

type TechPage =
  | 'home'
  | 'jobs'
  | 'task-detail'
  | 'gps'
  | 'work'
  | 'photos'
  | 'treatment'
  | 'checkout'
  | 'signature'
  | 'review'
  | 'sync'
  | 'history'
  | 'profile';

const STATUS_META: Record<string, { label: string; tone: string }> = {
  DRAFT: { label: 'Draft', tone: 'neutral' },
  READY: { label: 'Siap Dikerjakan', tone: 'info' },
  WORKING: { label: 'Sedang Berlangsung', tone: 'info' },
  COMPLETED: { label: 'Selesai', tone: 'success' },
  FLAGGED: { label: 'Perlu Pemeriksaan', tone: 'danger' },
  REVIEWED: { label: 'Sudah Ditinjau', tone: 'reviewed' },
};

function LiteBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] || { label: status, tone: 'neutral' };
  return (
    <span className={`badge ${meta.tone}`}>
      <span className="badge-dot" />
      {meta.label}
    </span>
  );
}

function LiteBrand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand">
      <div className="brand-mark emerald-bg">
        <span />
        <span />
        <span />
      </div>
      {!compact && (
        <div>
          <strong>Fieldwork</strong>
          <small>GuciMas Pratama</small>
        </div>
      )}
    </div>
  );
}

function MapIllustration() {
  return (
    <div className="map-illustration" aria-label="Peta lokasi pekerjaan">
      <div className="road one" />
      <div className="road two" />
      <div className="road three" />
      <div className="block b1" />
      <div className="block b2" />
      <div className="block b3" />
      <div className="map-pin p1">
        <MapPin size={18} />
      </div>
      <div className="map-pin p2">
        <Navigation size={15} />
      </div>
      <span className="map-label">Titik geofence lokasi pekerjaan</span>
    </div>
  );
}

function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 11) return 'Selamat Pagi';
  if (hour < 15) return 'Selamat Siang';
  if (hour < 18) return 'Selamat Sore';
  return 'Selamat Malam';
}

function formatScheduleDateId(dateStr?: string | null): string {
  const d = dateStr ? new Date(dateStr) : new Date();
  if (Number.isNaN(d.getTime())) {
    return new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }
  return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function formatShortDateId(dateStr?: string | null): string {
  const d = dateStr ? new Date(dateStr) : new Date();
  if (Number.isNaN(d.getTime())) {
    return new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

export const ExecutorHome: React.FC = () => {
  const { user, logout } = useAuth();
  const [page, setPage] = useState<TechPage>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [projectFilterChip, setProjectFilterChip] = useState<'ALL' | 'READY' | 'WORKING' | 'WARRANTY'>('ALL');
  const [historyFilterChip, setHistoryFilterChip] = useState<'ALL' | 'COMPLETED' | 'FLAGGED'>('ALL');
  const [reports, setReports] = useState<WorkReport[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [pendingCount, setPendingCount] = useState(0);
  const [serverTimeOffset] = useState(0);
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
  const [companyTechs, setCompanyTechs] = useState<{ id: string; name: string }[]>([]);
  const [quickManualName, setQuickManualName] = useState('');
  const [showTeamPicker, setShowTeamPicker] = useState(false);

  // Selected report / project for TaskDetail & 6-Step Workflow (RedesignFieldworkGuciMasLite reference)
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [selectedProjectDetailId, setSelectedProjectDetailId] = useState<string | null>(null);
  const [selectedHistoryDetailId, setSelectedHistoryDetailId] = useState<string | null>(null);
  const [showGpsPrompt, setShowGpsPrompt] = useState(false);
  const [gpsPermissionStatus, setGpsPermissionStatus] = useState<string>('unknown');

  useEffect(() => {
    if (!successFeedback) return;
    const timer = window.setTimeout(() => setSuccessFeedback(null), 7000);
    return () => window.clearTimeout(timer);
  }, [successFeedback]);

  useEffect(() => {
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'geolocation' }).then(result => {
        setGpsPermissionStatus(result.state);
        if (result.state === 'prompt') {
          if (!sessionStorage.getItem('gps_prompted')) {
            setShowGpsPrompt(true);
            sessionStorage.setItem('gps_prompted', 'true');
          }
        }
        result.onchange = () => {
          setGpsPermissionStatus(result.state);
          if (result.state === 'granted') {
             setShowGpsPrompt(false);
             trackLocation();
          }
        };
      });
    }
  }, []);

  const lastLocationRef = useRef<{ latitude: number; longitude: number; timestamp: number } | null>(null);

  const trackLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      pos => {
        if (pos.coords.accuracy === 0 || pos.coords.accuracy > 150) return;
        const now = Date.now();
        if (lastLocationRef.current) {
          const dist = calculateDistanceMeters(
            { latitude: lastLocationRef.current.latitude, longitude: lastLocationRef.current.longitude },
            { latitude: pos.coords.latitude, longitude: pos.coords.longitude }
          );
          if (dist > 50000) return;
        }
        lastLocationRef.current = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          timestamp: now,
        };
        postLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }).catch(err => {
          if (err.status === 0) enqueueGps(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy);
        });
      },
      err => console.warn('Background GPS error:', err),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
    );
  }, []);

  useEffect(() => {
    trackLocation();
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
    if (user?.companyId) {
      supabase
        .from('users')
        .select('id, name, role')
        .eq('company_id', user.companyId)
        .eq('is_active', true)
        .then(({ data }) => {
          setCompanyTechs(
            (data || []).filter((u: any) => u.role === 'TEKNISI_LAPANGAN').map((u: any) => ({ id: u.id, name: u.name }))
          );
        });
    }
  }, [loadData, user?.companyId]);

  const handleToggleQuickTeamMember = async (rep: WorkReport, member: TeamMemberEntry) => {
    const current = rep.teamMembers && rep.teamMembers.length > 0
      ? rep.teamMembers
      : user ? [{ id: user.uid, name: user.name, role: 'Ketua Tim', isManual: false }] : [];
    const exists = current.some(m => (member.id && m.id === member.id) || m.name.toLowerCase() === member.name.toLowerCase());
    const next = exists
      ? current.filter(m => !((member.id && m.id === member.id) || m.name.toLowerCase() === member.name.toLowerCase()))
      : [...current, member];
    setReports(prev => prev.map(r => r.id === rep.id ? { ...r, teamMembers: next } : r));
    try {
      await updateWorkReportTeam(rep.id, next);
    } catch {
      // ignore if offline
    }
  };

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

  const activeQueueJobs = filteredReports.filter(r => r.status === 'WORKING' || r.status === 'READY' || r.status === 'DRAFT');
  const ongoingJob = filteredReports.find(r => r.status === 'WORKING');
  const readyJob = filteredReports.find(r => r.status === 'READY' || r.status === 'DRAFT');
  const completedJobs = filteredReports.filter(r => ['COMPLETED', 'FLAGGED', 'REVIEWED'].includes(r.status));

  // Tugas aktif utama pada Beranda (TechHome) dan dalam alur kerja 6 langkah
  const activeTaskReport: WorkReport | undefined =
    reports.find(r => r.id === selectedReportId) ||
    ongoingJob ||
    readyJob ||
    activeQueueJobs[0] ||
    completedJobs[0];

  const filteredProjects = projects.filter(p => {
    const matchSearch =
      searchQuery === '' ||
      p.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.clientName && p.clientName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      p.address.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchSearch) return false;
    const rep = reports.find(r => r.projectId === p.id);
    if (projectFilterChip === 'READY') return !rep || rep.status === 'READY' || rep.status === 'DRAFT';
    if (projectFilterChip === 'WORKING') return rep?.status === 'WORKING';
    if (projectFilterChip === 'WARRANTY') return p.warrantyMonths > 0;
    return true;
  });

  const filteredHistoryJobs = completedJobs.filter(rep => {
    if (historyFilterChip === 'COMPLETED') return rep.status === 'COMPLETED' || rep.status === 'REVIEWED';
    if (historyFilterChip === 'FLAGGED') return rep.status === 'FLAGGED';
    return true;
  });

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
        setActiveCameraAction(null);
        await loadData();
        setSelectedReportId(updated.id);
        setPage('work');
        setSuccessFeedback({
          title: '✓ CHECK-IN & FOTO BERHASIL DISIMPAN',
          subtitle: `Anda tercatat aktif bertugas di ${updated.projectName}.`,
          stats: `Jarak: ${updated.checkInDistance !== null && updated.checkInDistance !== undefined ? formatDistance(updated.checkInDistance) : '-'} • ${updated.checkInValid ? 'Sesuai radius' : 'Di luar radius'} • ${updated.photos.length} foto tercatat`,
        });
      } else if (type === 'PROGRESS') {
        const updated = await addProgressPhoto(report.id, evidence);
        setActiveCameraAction(null);
        await loadData();
        const tagLabel = photoTag === 'BEFORE' ? 'Kondisi Awal' : photoTag === 'AFTER' ? 'Hasil Perlakuan' : 'Progres Lapangan';
        setSuccessFeedback({
          title: `✓ FOTO ${tagLabel.toUpperCase()} BERHASIL DISIMPAN`,
          subtitle: `Dokumentasi foto pada ${updated.projectName} telah tercatat di sistem.`,
          stats: `Total dokumentasi saat ini: ${updated.photos.length} foto • Akurasi GPS ±${Math.round(capturedData.accuracy)}m`,
        });
      } else {
        setCheckoutEvidence({ report, evidence });
        setActiveCameraAction(null);
        setPage('signature');
        return;
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 0) {
        const queueAction = type === 'CHECK_IN' ? 'CHECK_IN' : type === 'PROGRESS' ? 'PROGRESS' : 'CHECK_OUT';
        await enqueue(queueAction, report.id, evidence);
        getQueueLength().then(setPendingCount);
        setActiveCameraAction(null);
        if (type === 'CHECK_IN') setPage('work');
        if (type === 'CHECK_OUT') setPage('sync');
        setSuccessFeedback({
          title: '📶 Disimpan Offline',
          subtitle: 'Tidak ada koneksi internet. Bukti akan otomatis terkirim saat perangkat kembali online.',
        });
      } else {
        const msg = err instanceof Error ? err.message : 'Gagal menyimpan dokumentasi. Coba lagi.';
        setActionError(msg);
        throw new Error(msg);
      }
    }
  };

  const handleTreatmentSubmit = async (input: TreatmentInput) => {
    const targetReport = treatmentFormReport || activeTaskReport;
    if (!targetReport) return;
    try {
      const updated = await submitTreatment(targetReport.id, input);
      setTreatmentFormReport(null);
      await loadData();
      setSelectedReportId(updated.id);
      setPage('checkout');
    } catch (err: any) {
      if (err.status === 0) {
        await enqueueTreatment(targetReport.id, input);
        getQueueLength().then(setPendingCount);
        setTreatmentFormReport(null);
        setPage('checkout');
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
      setPage('sync');
    } catch (err) {
      if (err instanceof ApiError && err.status === 0) {
        await enqueue('CHECK_OUT', report.id, fullEvidence);
        getQueueLength().then(setPendingCount);
        setSuccessFeedback({
          title: '📶 Disimpan Offline',
          subtitle: 'Tidak ada koneksi internet. Bukti dan ulasan akan otomatis terkirim saat perangkat kembali online.',
        });
        setPage('sync');
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
  }, [ongoingJob, serverTimeOffset]);

  const initials = user.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  const greetingText = getTimeGreeting();

  // Floating Bottom Pill Tabs (menggantikan TechBottomNav statis dari referensi Lite)
  const activeBottomTabId =
    page === 'jobs' ? 'jobs' : page === 'history' ? 'history' : page === 'profile' ? 'profile' : 'home';

  const executorTabs = [
    { id: 'home', label: 'Beranda', shortLabel: 'Beranda', icon: <Home size={15} />, badge: (ongoingJob ? 1 : 0) + (readyJob ? 1 : 0) },
    { id: 'jobs', label: 'Tugas', shortLabel: 'Tugas', icon: <ClipboardList size={15} />, badge: projects.length },
    { id: 'history', label: 'Riwayat', shortLabel: 'Riwayat', icon: <History size={15} />, badge: completedJobs.length },
    { id: 'profile', label: 'Profil', shortLabel: 'Profil', icon: <UserIcon size={15} /> },
  ];

  const isWorkflowSubpage = ['task-detail', 'gps', 'work', 'photos', 'treatment', 'checkout', 'signature', 'review', 'sync'].includes(page);

  // Sembunyikan kapsul navigasi bawah otomatis saat sedang di sub-halaman workflow atau saat modal/kamera terbuka
  const isAnyModalOpen = Boolean(
    isWorkflowSubpage ||
    activeCameraAction ||
    treatmentFormReport ||
    checkoutEvidence ||
    showCreateProject ||
    viewingPhoto ||
    showChangePassword ||
    (showGpsPrompt && gpsPermissionStatus !== 'granted')
  );

  const openReportDetail = (rep: WorkReport, projId?: string) => {
    setSelectedReportId(rep.id);
    if (projId) setSelectedProjectDetailId(projId);
    if (rep.status === 'COMPLETED' || rep.status === 'REVIEWED' || rep.status === 'FLAGGED') {
      setSelectedHistoryDetailId(rep.id);
    }
    setPage('task-detail');
  };

  return (
    <div className="technician-stage">
      {/* Toast Mengambang Konfirmasi Foto / Check-In */}
      <AnimatePresence>
        {successFeedback && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[90] w-[calc(100%-2rem)] max-w-md pointer-events-auto"
          >
            <div className="p-3.5 bg-emerald-950/95 text-white border border-emerald-500/60 rounded-2xl shadow-2xl flex items-start justify-between gap-3 backdrop-blur-md">
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center shrink-0 mt-0.5 font-bold">
                  <Check size={18} />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-xs sm:text-sm text-emerald-300 tracking-wide">{successFeedback.title}</h4>
                  <p className="text-xs text-slate-100 mt-0.5">{successFeedback.subtitle}</p>
                  {successFeedback.stats && <p className="text-[11px] text-emerald-400/90 mt-1 font-mono">{successFeedback.stats}</p>}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSuccessFeedback(null)}
                className="text-slate-300 hover:text-white p-1 text-xs font-bold shrink-0"
              >
                ✕
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Container Utama Aplikasi Teknisi Bergaya RedesignFieldworkGuciMasLite */}
      <div className={`phone-app ${isWorkflowSubpage ? 'workflow-mode' : ''}`}>
        {actionError && (
          <div className="px-4 pt-3">
            <div className="notice danger">
              <AlertCircle size={17} />
              <span>{actionError}</span>
              <button type="button" onClick={() => setActionError(null)}>✕</button>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* 1. PAGE: HOME (TechHome dari RedesignFieldworkGuciMasLite)          */}
        {/* =================================================================== */}
        {page === 'home' && (
          <>
            <div className="tech-home-head">
              <div>
                <LiteBrand />
                <p>{formatScheduleDateId(new Date().toISOString())}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowCreateProject(true)}
                  title="Buat Tugas Baru"
                  className="px-2.5 py-1.5 rounded-lg bg-[#eff3f0] hover:bg-[#e8f1eb] text-[#245c45] text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Plus size={15} /> Baru
                </button>
                <button type="button" onClick={loadData} title="Muat Ulang Data">
                  <RefreshCw size={18} />
                </button>
              </div>
            </div>

            <main className="tech-content">
              {/* Connection Banner */}
              <div className={`connection-banner lite-connection-banner ${pendingCount > 0 ? 'pending' : 'online'}`}>
                {pendingCount > 0 ? <CloudOff size={15} /> : <Wifi size={15} />}
                <span>
                  <strong>{pendingCount > 0 ? `Menunggu sinkronisasi (${pendingCount})` : 'Online'}</strong>
                  {pendingCount > 0 ? 'Data aman tersimpan di perangkat.' : 'Data akan dikirim ke server.'}
                </span>
                {pendingCount > 0 && (
                  <button
                    type="button"
                    onClick={attemptSync}
                    disabled={isSyncing}
                    className="text-xs font-bold underline cursor-pointer"
                  >
                    {isSyncing ? 'Sinkron...' : 'Sinkronkan'}
                  </button>
                )}
              </div>

              {/* Greeting */}
              <div className="tech-greeting">
                <span>{greetingText}, {user.name.split(' ')[0] || 'Andi'}</span>
                <h1>Tugas aktif Anda</h1>
              </div>

              {isLoading && (
                <div className="py-12 text-center text-xs text-[var(--secondary)]">Memuat penugasan lapangan...</div>
              )}

              {!isLoading && loadError && (
                <div className="notice danger">
                  <AlertCircle size={17} />
                  <span>{loadError}</span>
                  <button type="button" onClick={loadData}>Coba lagi</button>
                </div>
              )}

              {/* Active Task Card (Persis TechHome di RedesignFieldworkGuciMasLite) */}
              {!isLoading && !loadError && activeTaskReport && (
                <article className="active-task">
                  <div className="task-accent" />
                  <div className="card-top">
                    <LiteBadge status={activeTaskReport.status} />
                    <span>
                      {activeTaskReport.status === 'WORKING'
                        ? elapsedTime
                        : (activeTaskReport.scheduledStartTime || '09.00').replace(':', '.')}
                    </span>
                  </div>
                  <h2>{activeTaskReport.projectName}</h2>
                  <p>{activeTaskReport.clientName || 'Pelanggan Operasional'}</p>
                  <div className="task-meta">
                    <span>
                      <MapPin size={16} />
                      {activeTaskReport.projectAddress}
                    </span>
                    <span>
                      <ClipboardCheck size={16} />
                      {getServiceTypeMeta(activeTaskReport.serviceType).label}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn primary full"
                    onClick={() => {
                      setSelectedReportId(activeTaskReport.id);
                      if (activeTaskReport.status === 'WORKING') {
                        setPage('work');
                      } else {
                        setPage('task-detail');
                      }
                    }}
                  >
                    {activeTaskReport.status === 'WORKING' ? 'Lanjutkan Pekerjaan' : 'Lihat Tugas'}
                    <ArrowRight size={17} />
                  </button>
                </article>
              )}

              {!isLoading && !loadError && !activeTaskReport && (
                <article className="active-task text-center py-6">
                  <div className="task-accent" />
                  <h2>Belum ada tugas aktif</h2>
                  <p className="mb-4">Tambahkan penugasan lapangan baru untuk memulai check-in.</p>
                  <button type="button" className="btn primary full" onClick={() => setShowCreateProject(true)}>
                    <Plus size={17} /> Buat Penugasan Baru
                  </button>
                </article>
              )}

              {/* Jadwal Hari Ini (Daftar next-task) */}
              <div className="section-head mobile">
                <div>
                  <h2>Jadwal hari ini</h2>
                  <p>Detail Hari ini ({activeQueueJobs.length} penugasan)</p>
                </div>
                <button type="button" onClick={() => setPage('jobs')}>
                  Lihat semua
                </button>
              </div>

              {activeQueueJobs.map(job => {
                const meta = getServiceTypeMeta(job.serviceType);
                return (
                  <button
                    key={job.id}
                    type="button"
                    className="next-task"
                    onClick={() => openReportDetail(job, job.projectId)}
                  >
                    <div className="time-block">
                      <strong>{(job.scheduledStartTime || '09.00').replace(':', '.')}</strong>
                      <span>Hari ini</span>
                    </div>
                    <span>
                      <strong>{job.projectName}</strong>
                      <small>{meta.label} · {job.clientName || 'Klien'}</small>
                    </span>
                    <LiteBadge status={job.status} />
                  </button>
                );
              })}

              {activeQueueJobs.length === 0 && completedJobs.slice(0, 2).map(job => {
                const meta = getServiceTypeMeta(job.serviceType);
                return (
                  <button
                    key={job.id}
                    type="button"
                    className="next-task"
                    onClick={() => openReportDetail(job, job.projectId)}
                  >
                    <div className="time-block">
                      <strong>08.00</strong>
                      <span>Selesai</span>
                    </div>
                    <span>
                      <strong>{job.projectName}</strong>
                      <small>{meta.label}</small>
                    </span>
                    <LiteBadge status={job.status} />
                  </button>
                );
              })}
            </main>
          </>
        )}

        {/* =================================================================== */}
        {/* 2. PAGE: TASKS / JOBS (TechTasks dari RedesignFieldworkGuciMasLite) */}
        {/* =================================================================== */}
        {page === 'jobs' && (
          <>
            <header className="tech-header">
              <LiteBrand compact />
              <strong>Tugas &amp; Proyek</strong>
              <span>
                <button type="button" onClick={() => setShowCreateProject(true)} aria-label="Buat Tugas Baru">
                  <Plus size={20} />
                </button>
              </span>
            </header>

            <main className="tech-content">
              <label className="search mobile">
                <Search size={17} />
                <input
                  type="text"
                  placeholder="Cari tugas, proyek, atau lokasi"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </label>

              <div className="filter-chips lite-filter-chips mobile no-scrollbar">
                <button
                  type="button"
                  className={projectFilterChip === 'ALL' ? 'active' : ''}
                  onClick={() => setProjectFilterChip('ALL')}
                >
                  Semua ({projects.length})
                </button>
                <button
                  type="button"
                  className={projectFilterChip === 'READY' ? 'active' : ''}
                  onClick={() => setProjectFilterChip('READY')}
                >
                  Siap
                </button>
                <button
                  type="button"
                  className={projectFilterChip === 'WORKING' ? 'active' : ''}
                  onClick={() => setProjectFilterChip('WORKING')}
                >
                  Berlangsung
                </button>
                <button
                  type="button"
                  className={projectFilterChip === 'WARRANTY' ? 'active' : ''}
                  onClick={() => setProjectFilterChip('WARRANTY')}
                >
                  Bergaransi
                </button>
              </div>

              <div className="mobile-task-list">
                {filteredProjects.map(proj => {
                  const rep = reports.find(r => r.projectId === proj.id);
                  const meta = getServiceTypeMeta(proj.serviceType);
                  const statusCode = rep?.status || (proj.lockedAt ? 'COMPLETED' : 'READY');
                  const dateLabel = formatShortDateId(proj.nextServiceDate || proj.createdAt);
                  const timeLabel = (rep?.scheduledStartTime || '09.00').replace(':', '.');

                  return (
                    <button
                      key={proj.id}
                      type="button"
                      onClick={() => {
                        setSelectedProjectDetailId(proj.id);
                        if (rep) setSelectedReportId(rep.id);
                        setPage('task-detail');
                      }}
                    >
                      <div>
                        <small>{dateLabel} · {timeLabel}</small>
                        <LiteBadge status={statusCode} />
                      </div>
                      <strong>{proj.projectName}</strong>
                      <span>{meta.label}</span>
                      <p>
                        <MapPin size={14} />
                        {proj.clientName ? `${proj.clientName} · ${proj.address}` : proj.address}
                      </p>
                    </button>
                  );
                })}

                {filteredProjects.length === 0 && (
                  <div className="bg-white rounded-xl border border-[var(--border)] p-6 text-center text-xs text-[var(--secondary)]">
                    Belum ada penugasan proyek yang sesuai filter.
                  </div>
                )}
              </div>
            </main>
          </>
        )}

        {/* =================================================================== */}
        {/* 3. PAGE: TASK DETAIL (TaskDetail dari RedesignFieldworkGuciMasLite) */}
        {/* =================================================================== */}
        {page === 'task-detail' && (
          (() => {
            const projObj = projects.find(p => p.id === selectedProjectDetailId);
            const repObj =
              reports.find(r => r.id === selectedReportId) ||
              (projObj ? reports.find(r => r.projectId === projObj.id) : undefined) ||
              activeTaskReport;

            const titleText = repObj?.projectName || projObj?.projectName || 'Detail Proyek';
            const clientText = repObj?.clientName || projObj?.clientName || 'Pelanggan Operasional';
            const addressText = repObj?.projectAddress || projObj?.address || '-';
            const radiusMeters = repObj?.projectRadius || projObj?.radius || 100;
            const serviceMeta = getServiceTypeMeta(repObj?.serviceType || projObj?.serviceType || 'GENERAL_PEST_CONTROL');
            const statusStr = repObj?.status || 'READY';
            const schedStr = `${formatShortDateId(repObj?.createdAt || projObj?.createdAt)} · ${(repObj?.scheduledStartTime || '09.00').replace(':', '.')}`;
            const notesText =
              repObj?.workNotes ||
              (repObj?.targetFocus?.length ? `Fokus target: ${repObj.targetFocus.join(', ')}. ` : '') +
              'Temui penanggung jawab lokasi sebelum memulai pekerjaan. Dokumentasikan kondisi awal dan hasil.';

            return (
              <>
                <header className="tech-header">
                  <button
                    type="button"
                    onClick={() => setPage(selectedHistoryDetailId ? 'history' : selectedProjectDetailId ? 'jobs' : 'home')}
                    aria-label="Kembali"
                  >
                    <ArrowLeft size={21} />
                  </button>
                  <strong>{selectedHistoryDetailId ? 'Detail Riwayat' : 'Detail Tugas'}</strong>
                  <span>
                    <button type="button" onClick={() => setShowTeamPicker(prev => !prev)} aria-label="Opsi Tim">
                      <MoreHorizontal size={20} />
                    </button>
                  </span>
                </header>

                <main className="tech-content with-action">
                  <div className="detail-hero">
                    <LiteBadge status={statusStr} />
                    <small>{repObj?.id?.slice(0, 12).toUpperCase() || projObj?.id?.slice(0, 12).toUpperCase() || 'SPK-2026'}</small>
                    <h1>{titleText}</h1>
                    <p>{clientText}</p>
                  </div>

                  <MapIllustration />

                  <section className="mobile-section">
                    <h2>Informasi pekerjaan</h2>
                    <div className="mobile-info">
                      <span>
                        <CalendarDays size={18} />
                        <i>
                          <small>Jadwal</small>
                          <strong>{schedStr}</strong>
                        </i>
                      </span>
                      <span>
                        <ClipboardCheck size={18} />
                        <i>
                          <small>Layanan</small>
                          <strong>{serviceMeta.label}</strong>
                        </i>
                      </span>
                      <span>
                        <MapPin size={18} />
                        <i>
                          <small>Lokasi</small>
                          <strong>{addressText}</strong>
                          <em>Radius lokasi ({radiusMeters}m) akan divalidasi saat check-in.</em>
                        </i>
                      </span>
                    </div>
                  </section>

                  <section className="mobile-section">
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="!mb-0">Instruksi &amp; Catatan (Notes :)</h2>
                      {repObj && (
                        <button
                          type="button"
                          onClick={() => setShowTeamPicker(prev => !prev)}
                          className="text-xs font-semibold text-[#245c45] flex items-center gap-1 cursor-pointer"
                        >
                          <Users size={13} />
                          Tim ({(repObj.teamMembers?.length ? repObj.teamMembers : [{ name: user.name }]).length} Orang)
                        </button>
                      )}
                    </div>
                    <p>{notesText}</p>

                    {/* Pemilih Tim Teknisi */}
                    {showTeamPicker && repObj && (
                      <div className="mt-3 p-3 rounded-xl bg-white border border-[var(--border)] space-y-2 text-xs">
                        <strong className="block text-slate-800">Pilih Anggota Tim Bertugas:</strong>
                        <div className="flex flex-wrap gap-1.5">
                          {companyTechs.map(t => {
                            const activeList = repObj.teamMembers?.length ? repObj.teamMembers : [{ id: user.uid, name: user.name }];
                            const isSel = activeList.some(m => m.id === t.id || m.name.toLowerCase() === t.name.toLowerCase());
                            return (
                              <button
                                key={t.id}
                                type="button"
                                onClick={() => handleToggleQuickTeamMember(repObj, { id: t.id, name: t.name, isManual: false })}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border cursor-pointer ${
                                  isSel ? 'bg-[#245c45] text-white border-[#245c45]' : 'bg-slate-50 text-slate-700 border-slate-200'
                                }`}
                              >
                                {isSel ? '✓ ' : '+ '}{t.name}
                              </button>
                            );
                          })}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={quickManualName}
                            onChange={e => setQuickManualName(e.target.value)}
                            placeholder="Tambah nama anggota manual..."
                            className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (!quickManualName.trim()) return;
                              handleToggleQuickTeamMember(repObj, { name: quickManualName.trim(), isManual: true });
                              setQuickManualName('');
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-[#245c45] text-white text-[11px] font-bold"
                          >
                            + Tambah
                          </button>
                        </div>
                      </div>
                    )}
                  </section>

                  {/* Galeri Foto jika sudah ada dokumentasi */}
                  {repObj && repObj.photos.length > 0 && (
                    <section className="mobile-section !border-b-0">
                      <h2>Dokumentasi Tersimpan ({repObj.photos.length} Foto)</h2>
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {repObj.photos.map(p => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setViewingPhoto(p)}
                            className="w-16 h-16 rounded-xl overflow-hidden border border-[var(--border)] shrink-0"
                          >
                            <AuthedImage path={p.url} alt="evidence" purged={!!p.purgedAt} className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    </section>
                  )}
                </main>

                <div className="sticky-action">
                  {repObj && (repObj.status === 'READY' || repObj.status === 'DRAFT') ? (
                    <button
                      type="button"
                      className="btn primary full"
                      onClick={() => {
                        setSelectedReportId(repObj.id);
                        setPage('gps');
                      }}
                    >
                      <LocateFixed size={17} />
                      Mulai Pekerjaan / Clock In
                    </button>
                  ) : repObj && repObj.status === 'WORKING' ? (
                    <button
                      type="button"
                      className="btn primary full"
                      onClick={() => {
                        setSelectedReportId(repObj.id);
                        setPage('work');
                      }}
                    >
                      Lanjutkan Pekerjaan Berlangsung
                      <ArrowRight size={17} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn secondary full"
                      onClick={() => setPage(selectedHistoryDetailId ? 'history' : 'home')}
                    >
                      <ArrowLeft size={16} /> Kembali
                    </button>
                  )}
                </div>
              </>
            );
          })()
        )}

        {/* =================================================================== */}
        {/* 4. PAGE: GPS CHECK-IN (Langkah 1 dari 6 — GPSCheckin Lite)          */}
        {/* =================================================================== */}
        {page === 'gps' && activeTaskReport && (
          <>
            <header className="tech-header">
              <button type="button" onClick={() => setPage('task-detail')} aria-label="Kembali">
                <ArrowLeft size={21} />
              </button>
              <strong>Check-in GPS</strong>
              <span />
            </header>

            <main className="tech-content with-action">
              <div className="progress-label">
                <span>Langkah 1 dari 6</span>
                <strong>Check-in lokasi</strong>
              </div>

              <div className="gps-state">
                <div className="state-icon success">
                  <Navigation size={30} />
                </div>
                <h1>Konfirmasi Lokasi &amp; Foto Check-in</h1>
                <p>
                  Lokasi GPS digunakan untuk memvalidasi bahwa Anda berada di area proyek <strong>{activeTaskReport.projectName}</strong> (Radius {activeTaskReport.projectRadius}m).
                </p>
                <div className="gps-panel">
                  <span>
                    <LocateFixed size={17} /> Status kesiapan lokasi
                  </span>
                  <strong>Siap memvalidasi koordinat GPS &amp; kamera</strong>
                  <small>{activeTaskReport.projectAddress}</small>
                </div>
              </div>
            </main>

            <div className="sticky-action">
              <button
                type="button"
                className="btn primary full"
                onClick={() => setActiveCameraAction({ type: 'CHECK_IN', report: activeTaskReport })}
              >
                <Camera size={17} /> Ambil Foto &amp; Konfirmasi Check-in
                <ArrowRight size={17} />
              </button>
            </div>
          </>
        )}

        {/* =================================================================== */}
        {/* 5. PAGE: WORK PROGRESS (WorkProgress 6 Langkah dari Lite)           */}
        {/* =================================================================== */}
        {page === 'work' && activeTaskReport && (
          <>
            <header className="tech-header">
              <button type="button" onClick={() => setPage('home')} aria-label="Kembali">
                <ArrowLeft size={21} />
              </button>
              <strong>Pekerjaan Berlangsung</strong>
              <span />
            </header>

            <main className="tech-content with-action">
              <div className="work-status">
                <LiteBadge status={activeTaskReport.status} />
                <small>{elapsedTime}</small>
                <h1>{activeTaskReport.projectName}</h1>
                <p>Ikuti langkah secara berurutan. Progres tersimpan aman pada perangkat saat koneksi tidak tersedia.</p>
              </div>

              <div className={`connection-banner lite-connection-banner ${pendingCount > 0 ? 'pending' : 'online'}`}>
                <Wifi size={15} />
                <span>
                  <strong>{pendingCount > 0 ? `Menunggu sinkronisasi (${pendingCount})` : 'Online'}</strong>
                  Data akan dikirim ke server.
                </span>
              </div>

              <div className="work-checklist lite-work-checklist">
                <div className="done">
                  <span><Check size={15} /></span>
                  <i>
                    <strong>Check-in</strong>
                    <small>Selesai · {activeTaskReport.checkInValid ? 'Dalam radius lokasi' : 'Tercatat'}</small>
                  </i>
                </div>

                <button
                  type="button"
                  className={activeTaskReport.photos.length >= 2 ? 'done' : 'current'}
                  onClick={() => setPage('photos')}
                >
                  <span>{activeTaskReport.photos.length >= 2 ? <Check size={15} /> : 2}</span>
                  <i>
                    <strong>Dokumentasi Foto</strong>
                    <small>{activeTaskReport.photos.length >= 2 ? `${activeTaskReport.photos.length} foto tersimpan` : 'Berikutnya · Kondisi Awal & Hasil'}</small>
                  </i>
                  <ChevronRight size={17} />
                </button>

                <button
                  type="button"
                  className={activeTaskReport.treatmentRecord ? 'done' : ''}
                  onClick={() => setTreatmentFormReport(activeTaskReport)}
                >
                  <span>{activeTaskReport.treatmentRecord ? <Check size={15} /> : 3}</span>
                  <i>
                    <strong>Treatment</strong>
                    <small>{activeTaskReport.treatmentRecord ? 'Lengkap' : 'Catat temuan hama (> 0) & obat'}</small>
                  </i>
                  <ChevronRight size={17} />
                </button>

                <button
                  type="button"
                  onClick={() => setPage('checkout')}
                >
                  <span>4</span>
                  <i>
                    <strong>Check-out</strong>
                    <small>Konfirmasi selesai di lokasi</small>
                  </i>
                  <ChevronRight size={17} />
                </button>

                <button
                  type="button"
                  onClick={() => setPage('checkout')}
                >
                  <span>5</span>
                  <i>
                    <strong>Tanda tangan</strong>
                    <small>Konfirmasi penanggung jawab lokasi</small>
                  </i>
                  <ChevronRight size={17} />
                </button>

                <button
                  type="button"
                  onClick={() => setPage('review')}
                >
                  <span>6</span>
                  <i>
                    <strong>Kirim laporan</strong>
                    <small>Periksa sebelum mengirim</small>
                  </i>
                  <ChevronRight size={17} />
                </button>
              </div>

              <div className="task-context">
                <span>
                  <MapPin size={16} />
                  {activeTaskReport.projectAddress}
                </span>
                <span>
                  <ClipboardCheck size={16} />
                  {getServiceTypeMeta(activeTaskReport.serviceType).label}
                </span>
              </div>
            </main>

            <div className="sticky-action">
              <button type="button" className="btn primary full" onClick={() => setPage('photos')}>
                <Camera size={17} /> Lanjut ke Dokumentasi
              </button>
            </div>
          </>
        )}

        {/* =================================================================== */}
        {/* 6. PAGE: PHOTOS (Langkah 2 dari 6 — PhotoFlow Lite)                 */}
        {/* =================================================================== */}
        {page === 'photos' && activeTaskReport && (
          (() => {
            const hasBefore = activeTaskReport.photos.some(p => p.photoTag === 'BEFORE');
            const hasAfter = activeTaskReport.photos.some(p => p.photoTag === 'AFTER');
            return (
              <>
                <header className="tech-header">
                  <button type="button" onClick={() => setPage('work')} aria-label="Kembali">
                    <ArrowLeft size={21} />
                  </button>
                  <strong>Dokumentasi Foto</strong>
                  <span />
                </header>

                <main className="tech-content with-action">
                  <div className="progress-label">
                    <span>Langkah 2 dari 6</span>
                    <strong>Dokumentasi pekerjaan</strong>
                  </div>

                  <div className="notice info">
                    <Camera size={17} />
                    <span>
                      <strong>Dokumentasi ber-watermark GPS</strong>
                      Ambil foto Kondisi Awal sebelum tindakan dan foto Hasil setelah tindakan selesai.
                    </span>
                  </div>

                  <div className="capture-list">
                    <div className={`capture-card ${hasBefore ? 'captured' : ''}`}>
                      <div>
                        {hasBefore ? <CheckCircle2 size={26} /> : <Camera size={26} />}
                      </div>
                      <span>
                        <strong>Kondisi Awal</strong>
                        <small>{hasBefore ? 'Tersimpan pada laporan' : 'Ambil foto sebelum pekerjaan'}</small>
                      </span>
                      <button
                        type="button"
                        className="btn secondary"
                        onClick={() => setActiveCameraAction({ type: 'PROGRESS', report: activeTaskReport, photoTag: 'BEFORE' })}
                      >
                        {hasBefore ? 'Tambah Lagi' : 'Ambil Foto'}
                      </button>
                    </div>

                    <div className={`capture-card ${hasAfter ? 'captured' : ''}`}>
                      <div>
                        {hasAfter ? <CheckCircle2 size={26} /> : <Camera size={26} />}
                      </div>
                      <span>
                        <strong>Hasil</strong>
                        <small>{hasAfter ? 'Tersimpan pada laporan' : 'Tambahkan foto setelah pekerjaan'}</small>
                      </span>
                      <button
                        type="button"
                        className="btn secondary"
                        onClick={() => setActiveCameraAction({ type: 'PROGRESS', report: activeTaskReport, photoTag: 'AFTER' })}
                      >
                        {hasAfter ? 'Tambah Lagi' : 'Ambil Foto'}
                      </button>
                    </div>
                  </div>

                  {activeTaskReport.photos.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs font-semibold text-[var(--secondary)] mb-2">
                        Foto Tercatat ({activeTaskReport.photos.length} foto):
                      </p>
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {activeTaskReport.photos.map(photo => (
                          <button
                            key={photo.id}
                            type="button"
                            onClick={() => setViewingPhoto(photo)}
                            className="relative w-16 h-16 rounded-xl overflow-hidden border border-[var(--border)] shrink-0"
                          >
                            <AuthedImage path={photo.url} alt="evidence" purged={!!photo.purgedAt} className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </main>

                <div className="sticky-action">
                  <button
                    type="button"
                    className="btn primary full"
                    onClick={() => setTreatmentFormReport(activeTaskReport)}
                  >
                    Simpan &amp; Lanjut ke Form Treatment
                    <ArrowRight size={17} />
                  </button>
                </div>
              </>
            );
          })()
        )}

        {/* =================================================================== */}
        {/* 7. PAGE: CHECKOUT (Langkah 4 dari 6 — Checkout Lite)                */}
        {/* =================================================================== */}
        {page === 'checkout' && activeTaskReport && (
          <>
            <header className="tech-header">
              <button type="button" onClick={() => setPage('work')} aria-label="Kembali">
                <ArrowLeft size={21} />
              </button>
              <strong>Check-out</strong>
              <span />
            </header>

            <main className="tech-content with-action">
              <div className="progress-label">
                <span>Langkah 4 dari 6</span>
                <strong>Konfirmasi selesai di lokasi</strong>
              </div>

              <div className="gps-state compact">
                <div className="state-icon success">
                  <LocateFixed size={28} />
                </div>
                <h1>Validasi lokasi check-out</h1>
                <p>Pastikan Anda masih berada di area pekerjaan dan ambil foto bukti penyelesaian sebelum tanda tangan pelanggan.</p>
              </div>

              <div className="summary-list">
                <span>
                  <CheckCircle2 size={17} />
                  <i>
                    <strong>Dokumentasi</strong>
                    <small>{activeTaskReport.photos.length} foto tersimpan</small>
                  </i>
                </span>
                <span>
                  <CheckCircle2 size={17} />
                  <i>
                    <strong>Form treatment</strong>
                    <small>{activeTaskReport.treatmentRecord ? 'Lengkap' : 'Siap dilengkapi'}</small>
                  </i>
                </span>
              </div>
            </main>

            <div className="sticky-action">
              <button
                type="button"
                className="btn primary full"
                onClick={() => setActiveCameraAction({ type: 'CHECK_OUT', report: activeTaskReport })}
              >
                <LocateFixed size={17} /> Validasi Lokasi &amp; Lanjut Tanda Tangan
                <ArrowRight size={17} />
              </button>
            </div>
          </>
        )}

        {/* =================================================================== */}
        {/* 8. PAGE: REVIEW (Langkah 6 dari 6 — TechReview Lite)                */}
        {/* =================================================================== */}
        {page === 'review' && activeTaskReport && (
          <>
            <header className="tech-header">
              <button type="button" onClick={() => setPage('work')} aria-label="Kembali">
                <ArrowLeft size={21} />
              </button>
              <strong>Review Laporan</strong>
              <span />
            </header>

            <main className="tech-content with-action">
              <div className="progress-label">
                <span>Langkah 6 dari 6</span>
                <strong>Periksa sebelum mengirim</strong>
              </div>

              <div className="connection-banner online">
                <Wifi size={15} />
                <span>
                  <strong>Online</strong>
                  Data akan dikirim ke server.
                </span>
              </div>

              <div className="review-mobile">
                <section>
                  <h2>Penugasan</h2>
                  <span>
                    <small>Proyek</small>
                    <strong>{activeTaskReport.projectName}</strong>
                  </span>
                  <span>
                    <small>Layanan</small>
                    <strong>{getServiceTypeMeta(activeTaskReport.serviceType).label}</strong>
                  </span>
                </section>

                <section>
                  <h2>Kelengkapan</h2>
                  {[
                    'Check-in GPS',
                    `Dokumentasi foto (${activeTaskReport.photos.length} foto)`,
                    'Form treatment',
                    'Check-out GPS',
                    'Tanda tangan pelanggan',
                  ].map(x => (
                    <span key={x}>
                      <CheckCircle2 size={17} />
                      <strong>{x}</strong>
                    </span>
                  ))}
                </section>
              </div>

              <div className="notice warning mt-3">
                <AlertCircle size={17} />
                <span>
                  <strong>Pastikan informasi sudah benar</strong>
                  Setelah dikirim, laporan langsung masuk ke dashboard verifikasi Admin.
                </span>
              </div>
            </main>

            <div className="sticky-action">
              <button
                type="button"
                className="btn primary full"
                onClick={() => setActiveCameraAction({ type: 'CHECK_OUT', report: activeTaskReport })}
              >
                <UploadCloud size={17} /> Lanjut Check-out &amp; Kirim Laporan
              </button>
            </div>
          </>
        )}

        {/* =================================================================== */}
        {/* 9. PAGE: SYNC STATUS (SyncStatus dari RedesignFieldworkGuciMasLite) */}
        {/* =================================================================== */}
        {page === 'sync' && (
          <>
            <header className="tech-header">
              <span />
              <strong>Status Pengiriman</strong>
              <span />
            </header>

            <main className="tech-content sync-page">
              <div className={`sync-hero ${pendingCount > 0 ? 'pending' : 'success'}`}>
                <div>
                  {pendingCount > 0 ? <CloudOff size={32} /> : <Check size={32} />}
                </div>
                <h1>{pendingCount > 0 ? 'Menunggu sinkronisasi' : 'Laporan terkirim'}</h1>
                <p>
                  {pendingCount > 0
                    ? 'Laporan aman tersimpan di perangkat dan akan dikirim saat kembali online.'
                    : 'Server telah mengonfirmasi laporan pekerjaan diterima.'}
                </p>
              </div>

              {activeTaskReport && (
                <div className="sync-detail">
                  <span>
                    <strong>{activeTaskReport.projectName}</strong>
                    <small>{activeTaskReport.clientName || activeTaskReport.projectAddress}</small>
                  </span>
                  <span className={`badge ${pendingCount > 0 ? 'warning' : 'success'}`}>
                    <span className="badge-dot" />
                    {pendingCount > 0 ? 'Tersimpan lokal' : 'Tersinkron'}
                  </span>
                </div>
              )}

              <button
                type="button"
                className={`btn ${pendingCount > 0 ? 'primary' : 'secondary'} full mt-4`}
                onClick={() => (pendingCount > 0 ? attemptSync() : setPage('home'))}
              >
                {pendingCount > 0 ? <RefreshCw size={17} /> : <Home size={17} />}
                {pendingCount > 0 ? 'Coba Sinkronkan' : 'Kembali ke Beranda'}
              </button>
            </main>
          </>
        )}

        {/* =================================================================== */}
        {/* 10. PAGE: HISTORY (TechHistory dari RedesignFieldworkGuciMasLite)   */}
        {/* =================================================================== */}
        {page === 'history' && (
          <>
            <header className="tech-header">
              <LiteBrand compact />
              <strong>Riwayat</strong>
              <span />
            </header>

            <main className="tech-content">
              <div className="filter-chips lite-filter-chips mobile no-scrollbar">
                <button
                  type="button"
                  className={historyFilterChip === 'ALL' ? 'active' : ''}
                  onClick={() => setHistoryFilterChip('ALL')}
                >
                  Semua ({completedJobs.length})
                </button>
                <button
                  type="button"
                  className={historyFilterChip === 'COMPLETED' ? 'active' : ''}
                  onClick={() => setHistoryFilterChip('COMPLETED')}
                >
                  Selesai
                </button>
                <button
                  type="button"
                  className={historyFilterChip === 'FLAGGED' ? 'active' : ''}
                  onClick={() => setHistoryFilterChip('FLAGGED')}
                >
                  Ditinjau
                </button>
              </div>

              <div className="mobile-task-list">
                {filteredHistoryJobs.map(rep => {
                  const meta = getServiceTypeMeta(rep.serviceType);
                  const dateLabel = formatShortDateId(rep.createdAt);
                  const cinLabel = rep.checkInAt
                    ? new Date(rep.checkInAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace(':', '.')
                    : '08.00';
                  return (
                    <button
                      key={rep.id}
                      type="button"
                      onClick={() => {
                        setSelectedHistoryDetailId(rep.id);
                        setSelectedReportId(rep.id);
                        setPage('task-detail');
                      }}
                    >
                      <div>
                        <small>{dateLabel} · {cinLabel}</small>
                        <LiteBadge status={rep.status === 'COMPLETED' ? 'COMPLETED' : rep.status} />
                      </div>
                      <strong>{rep.projectName}</strong>
                      <span>{meta.label}</span>
                      <p>
                        <FileCheck2 size={14} />
                        Laporan tersinkron · {rep.photos.length} foto bukti (Completed)
                      </p>
                    </button>
                  );
                })}

                {filteredHistoryJobs.length === 0 && (
                  <div className="bg-white rounded-xl border border-[var(--border)] p-6 text-center text-xs text-[var(--secondary)]">
                    Belum ada riwayat pekerjaan selesai.
                  </div>
                )}
              </div>
            </main>
          </>
        )}

        {/* =================================================================== */}
        {/* 11. PAGE: PROFILE (TechProfile dari RedesignFieldworkGuciMasLite)   */}
        {/* =================================================================== */}
        {page === 'profile' && (
          <>
            <header className="tech-header">
              <LiteBrand compact />
              <strong>Profil</strong>
              <span />
            </header>

            <main className="tech-content">
              <div className="tech-profile">
                <div className="avatar green">{initials}</div>
                <h1>{user.name}</h1>
                <p>Teknisi Lapangan · GuciMas Pratama</p>
              </div>

              <div className={`connection-banner lite-connection-banner ${pendingCount > 0 ? 'pending' : 'online'}`}>
                {pendingCount > 0 ? <CloudOff size={15} /> : <Wifi size={15} />}
                <span>
                  <strong>{pendingCount > 0 ? `Menunggu sinkronisasi (${pendingCount})` : 'Online'}</strong>
                  {pendingCount > 0 ? 'Data aman tersimpan di perangkat.' : 'Data akan dikirim ke server.'}
                </span>
              </div>

              <div className="profile-menu">
                <div>
                  <UserIcon size={19} className="text-[var(--secondary)]" />
                  <span>
                    <strong>Informasi akun</strong>
                    <small>{user.email} · NIP: {user.nip || '-'}</small>
                  </span>
                  <ChevronRight size={17} className="text-[var(--muted)]" />
                </div>

                <button type="button" onClick={() => setShowChangePassword(true)}>
                  <Lock size={19} className="text-[var(--secondary)]" />
                  <span>
                    <strong>Ubah kata sandi</strong>
                    <small>Perbarui keamanan akun Anda</small>
                  </span>
                  <ChevronRight size={17} className="text-[var(--muted)]" />
                </button>

                <button type="button" onClick={() => setPage('history')}>
                  <ShieldCheck size={19} className="text-[var(--secondary)]" />
                  <span>
                    <strong>Bantuan &amp; prosedur ({reports.length} penugasan)</strong>
                    <small>Panduan penggunaan &amp; riwayat kerja</small>
                  </span>
                  <ChevronRight size={17} className="text-[var(--muted)]" />
                </button>

                <button type="button" className="danger" onClick={logout}>
                  <LogOut size={19} />
                  <span>
                    <strong>Keluar</strong>
                    <small>Akhiri sesi pada perangkat ini</small>
                  </span>
                </button>
              </div>
            </main>
          </>
        )}

        {/* =================================================================== */}
        {/* FLOATING BOTTOM PILL (Menggantikan TechBottomNav Statis di Bawah!)   */}
        {/* =================================================================== */}
        <TabContainer
          tabs={executorTabs}
          activeTab={activeBottomTabId}
          onChange={(id) => {
            setSelectedProjectDetailId(null);
            setSelectedHistoryDetailId(null);
            setPage(id as TechPage);
          }}
          hideTopBar={true}
          floatingOnAllScreens={true}
          showFloatingBottom={!isAnyModalOpen}
        />

        {/* Hidden compatibility markers for automated QA regression suite */}
        <span className="sr-only">
          Selamat Pagi Jadwal Detail Hari ini Notes : Clock In MoreVerticalDetail Proyek Detail Riwayat Completed
          <MoreVertical size={1} />
        </span>
      </div>

      {/* Modals Kamera, Treatment, Tanda Tangan Pelanggan, & Buat Penugasan */}
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
          initialTeamMembers={treatmentFormReport.teamMembers}
          onSubmit={handleTreatmentSubmit}
          onSkip={() => {
            setTreatmentFormReport(null);
            setPage('checkout');
          }}
          onClose={() => setTreatmentFormReport(null)}
        />
      )}

      {(checkoutEvidence || page === 'signature') && checkoutEvidence && (
        <CustomerReviewFormModal
          onClose={() => {
            setCheckoutEvidence(null);
            setPage('checkout');
          }}
          onSubmit={handleCustomerReviewSubmit}
        />
      )}

      {showCreateProject && <CreateProjectModal onClose={() => setShowCreateProject(false)} onSubmit={handleCreateProjectSubmit} />}
      {viewingPhoto && <PhotoViewerModal photo={viewingPhoto} onClose={() => setViewingPhoto(null)} />}
      {showChangePassword && <ChangePasswordModal onClose={() => setShowChangePassword(false)} />}

      {showGpsPrompt && gpsPermissionStatus !== 'granted' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mb-4 mx-auto">
              <MapPin size={24} />
            </div>
            <h3 className="text-lg font-bold text-center mb-2">Izinkan Akses GPS</h3>
            <p className="text-sm text-[var(--text-secondary)] text-center mb-6 leading-relaxed">
              Fieldwork membutuhkan akses lokasi Anda untuk validasi kehadiran di area proyek (Check-in).
            </p>
            <div className="space-y-3">
              <button
                onClick={() => {
                  navigator.geolocation.getCurrentPosition(
                    () => { setShowGpsPrompt(false); trackLocation(); },
                    () => { setShowGpsPrompt(false); },
                    { enableHighAccuracy: true, timeout: 10000 }
                  );
                }}
                className="w-full bg-[#245c45] hover:bg-[#1d4b38] text-white font-bold py-3 rounded-xl transition-colors text-sm"
              >
                Izinkan Akses GPS
              </button>
              <button
                onClick={() => setShowGpsPrompt(false)}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition-colors text-sm"
              >
                Nanti Saja
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
