import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {  WorkReport, WorkReportListItem, Project, ExecutorStats, AuditLogEntry, RiskConfig, DocumentationPhoto, ReportFilters, DEFAULT_FILTERS } from '../../types';
import { 
  fetchAdminReports, fetchAdminReportDetail, fetchAdminSummary, fetchExecutors, fetchAdminProjects,
  fetchAuditLogs, fetchRiskConfig, updateRiskConfig, reviewReport, downloadReportsCsv, fetchUsers, suspendUser, activateUser, deleteUser, AdminUser,
  fetchPhotoPurgePreview, purgeOldPhotos, PhotoPurgePreview,
} from '../../api/admin';
import {  fetchLatestLocations, UserLocation } from '../../api/location';
import {  ApiError } from '../../api/client';
import {  RiskBadge } from '../common/RiskBadge';
import {  LocationMap } from '../maps/LocationMap';
import { AllProjectsMap } from '../maps/AllProjectsMap';
import {  PhotoViewerModal } from '../common/PhotoViewerModal';
import {  AuthedImage } from '../common/AuthedImage';
import {  RISK_LEVEL_OPTIONS, STATUS_OPTIONS } from '../../utils/riskMeta';
import { exportReportToPdf } from '../../utils/pdfExport';
import {  SERVICE_TYPE_OPTIONS, getServiceTypeMeta, APPLICATION_METHOD_LABELS } from '../../utils/serviceMeta';
import { 
  RefreshCw, ShieldAlert, Search, Download, Clock, MapPin, UserCheck, CheckCircle2, AlertTriangle, Eye,
  SlidersHorizontal, X, Check, ChevronRight, Loader2, Settings2, Users, FlaskConical, Trash2, ImageOff, LogOut
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import { ChangePasswordModal } from '../auth/ChangePasswordModal';
import { generateInvite } from '../../api/auth';

type Tab = 'reports' | 'anomalies' | 'projects' | 'executors' | 'audit' | 'risk-config' | 'tracking' | 'approval' | 'profile';

const DATE_PRESETS = [
  { id: 'all', label: 'Semua' },
  { id: 'today', label: 'Hari Ini' },
  { id: 'last7days', label: '7 Hari' },
  { id: 'last30days', label: '30 Hari' }
] as const;

function presetToRange(preset: string): { startDate?: string; endDate?: string } {
  const today = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  if (preset === 'today') return { startDate: iso(today), endDate: iso(today) };
  if (preset === 'last7days') {
    const start = new Date(today);
    start.setDate(start.getDate() - 6);
    return { startDate: iso(start), endDate: iso(today) };
  }
  if (preset === 'last30days') {
    const start = new Date(today);
    start.setDate(start.getDate() - 29);
    return { startDate: iso(start), endDate: iso(today) };
  }
  return {};
}

import { Header } from '../common/Header';

export const AdminDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('reports');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [showChangePassword, setShowChangePassword] = useState(false);
  const [inviteLink, setInviteLink] = useState<{ url: string; expiresAt: string } | null>(null);
  const [isGeneratingInvite, setIsGeneratingInvite] = useState(false);
  const [reports, setReports] = useState<WorkReportListItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectSearch, setProjectSearch] = useState('');
  const [projectServiceType, setProjectServiceType] = useState('ALL');
  const [projectStatus, setProjectStatus] = useState('ALL');
  const [projectPage, setProjectPage] = useState(1);
  const [projectTotalPages, setProjectTotalPages] = useState(1);
  const [projectTotalCount, setProjectTotalCount] = useState(0);

  const loadProjects = useCallback(async () => {
    try {
      const res = await fetchAdminProjects({
        search: projectSearch,
        serviceType: projectServiceType,
        status: projectStatus,
        page: projectPage,
        limit: 8
      });
      setProjects(res.projects);
      setProjectTotalPages(res.totalPages || 1);
      setProjectTotalCount(res.totalCount || res.projects.length);
    } catch (err) {
      console.error(err);
    }
  }, [projectSearch, projectServiceType, projectStatus, projectPage]);

  useEffect(() => {
    setProjectPage(1);
  }, [projectSearch, projectServiceType, projectStatus]);

  useEffect(() => {
    if (activeTab === 'projects') {
      const t = setTimeout(loadProjects, 250);
      return () => clearTimeout(t);
    }
  }, [loadProjects, activeTab]);

  const [executors, setExecutors] = useState<ExecutorStats[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[] | null>(null);
  const [riskConfig, setRiskConfig] = useState<RiskConfig | null>(null);
  const [userLocations, setUserLocations] = useState<UserLocation[]>([]);
  const [kpi, setKpi] = useState({ totalJobs: 0, completedJobs: 0, workingJobs: 0, flaggedJobs: 0, highRiskCount: 0, avgDurationMinutes: 0, avgRiskScore: 0 });

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [datePreset, setDatePreset] = useState<string>('all');
  const [filters, setFilters] = useState<ReportFilters>(DEFAULT_FILTERS);
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [searchInput, setSearchInput] = useState('');

  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedReport, setSelectedReport] = useState<WorkReport | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [viewingPhoto, setViewingPhoto] = useState<DocumentationPhoto | null>(null);
  const [adminReviewNotes, setAdminReviewNotes] = useState('');
  const [isReviewing, setIsReviewing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    setPage(1);
  }, [filters, datePreset, searchInput]);

  const effectiveFilters = useMemo<ReportFilters>(() => ({ ...filters, ...presetToRange(datePreset), search: searchInput, page, limit: 20 }), [filters, datePreset, searchInput, page]);

  const loadReports = useCallback(async () => {
    try {
      const res = await fetchAdminReports(effectiveFilters);
      setReports(res.reports);
      setTotalPages(res.totalPages || 1);
      setTotalCount(res.totalCount || res.reports.length);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Gagal memuat laporan.');
    }
  }, [effectiveFilters]);

  useEffect(() => {
    const t = setTimeout(loadReports, 250); // debounce search/filter changes
    return () => clearTimeout(t);
  }, [loadReports]);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const [summary, projectRes, executorList] = await Promise.all([fetchAdminSummary(), fetchAdminProjects({ limit: 8, page: 1 }), fetchExecutors()]);
        setKpi(summary);
        setProjects(projectRes.projects);
        setProjectTotalPages(projectRes.totalPages || 1);
        setProjectTotalCount(projectRes.totalCount || projectRes.projects.length);
        setExecutors(executorList);
        await loadReports();
      } catch (err) {
        setLoadError(err instanceof ApiError ? err.message : 'Gagal memuat dashboard.');
      } finally {
        setIsLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeTab === 'audit' && auditLogs === null) {
      fetchAuditLogs().then(setAuditLogs).catch(() => setAuditLogs([]));
    }
    if (activeTab === 'risk-config' && riskConfig === null) {
      fetchRiskConfig().then(setRiskConfig).catch(() => undefined);
    }
    if (activeTab === 'tracking') {
      fetchLatestLocations().then(setUserLocations).catch(() => setUserLocations([]));
    }
    if (activeTab === 'approval') {
      fetchUsers().then(setAdminUsers).catch(() => setAdminUsers([]));
    }
  }, [activeTab, auditLogs, riskConfig]);

  useEffect(() => {
    if (!selectedReportId) {
      setSelectedReport(null);
      return;
    }
    setDetailLoading(true);
    fetchAdminReportDetail(selectedReportId)
      .then(setSelectedReport)
      .catch(() => setSelectedReport(null))
      .finally(() => setDetailLoading(false));
  }, [selectedReportId]);

  const visibleReports = useMemo(() => {
    if (activeTab === 'anomalies') return reports.filter(r => r.status === 'FLAGGED' || r.riskScore >= 40);
    return reports;
  }, [reports, activeTab]);

  
  
  const handleGenerateInvite = async (role: 'ADMIN' | 'TEKNISI') => {
    try {
      setIsGeneratingInvite(true);
      const res = await generateInvite(role);
      const url = `${window.location.origin}?invite=${res.token}`;
      setInviteLink({ url, expiresAt: new Date(res.expiresAt).toLocaleString('id-ID') });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal membuat link undangan');
    } finally {
      setIsGeneratingInvite(false);
    }
  };

  const handleActivate = async (id: string) => {
    await activateUser(id);
    setAdminUsers(prev => prev.map(u => u.id === id ? { ...u, is_active: true } : u));
  };
  const handleSuspend = async (id: string) => {
    if(!confirm('Suspend/nonaktifkan user ini? User tidak akan bisa login.')) return;
    await suspendUser(id);
    setAdminUsers(prev => prev.map(u => u.id === id ? { ...u, is_active: false } : u));
  };
  const handleDeleteUser = async (id: string) => {
    if(!confirm('PERINGATAN: Apakah Anda yakin ingin menghapus user ini secara PERMANEN? Data akan hilang dan laporan pekerjaannya akan menjadi tanpa nama.')) return;
    try {
      await deleteUser(id);
      setAdminUsers(prev => prev.filter(u => u.id !== id));
      alert('User berhasil dihapus.');
    } catch (e: any) {
      alert(e.message || 'Gagal menghapus user');
    }
  };

  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      await downloadReportsCsv(effectiveFilters);
    } catch {
      setLoadError('Gagal mengekspor CSV.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleAdminReview = async () => {
    if (!selectedReportId || !adminReviewNotes.trim()) return;
    const updated = await reviewReport(selectedReportId, adminReviewNotes.trim());
    setSelectedReport(updated);
    setIsReviewing(false);
    setAdminReviewNotes('');
    loadReports();
  };

  const handleSaveRiskConfig = async (partial: Partial<RiskConfig>) => {
    const updated = await updateRiskConfig(partial);
    setRiskConfig(updated);
  };

  const SidebarItem: React.FC<{ tab: Tab; label: React.ReactNode; danger?: boolean; count?: number }> = ({ tab, label, danger, count }) => {
    const active = activeTab === tab;
    return (
      <button
        onClick={() => { setActiveTab(tab); setMobileMenuOpen(false); }}
        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
          active
            ? danger ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
        }`}
      >
        <span className="text-left">{label}</span>
        {count !== undefined && count > 0 && (
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${active ? (danger ? 'bg-rose-200 text-rose-800' : 'bg-emerald-200 text-emerald-800') : 'bg-slate-200 text-slate-700'}`}>
            {count}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-[var(--bg-primary)]">
      <Header currentUser={user!} onLogout={logout} onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)} mobileMenuOpen={mobileMenuOpen} />
      
      <div className="flex flex-1 overflow-hidden relative">
        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setMobileMenuOpen(false)} />
        )}

        {/* Sidebar */}
        <aside className={`absolute md:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-[var(--border-subtle)] flex flex-col transform transition-transform duration-200 ease-in-out ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
          <div className="p-4 border-b border-[var(--border-subtle)] bg-[var(--bg-card)]">
            <h2 className="text-sm font-bold tracking-tight text-[var(--text-primary)] leading-tight mb-1">
              Monitoring Presensi &amp;<br/>Audit Lapangan
            </h2>
            <p className="text-[10px] text-[var(--text-secondary)]">
              {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            <SidebarItem tab="reports" label="Semua Laporan" count={reports.length} />
            <SidebarItem tab="anomalies" label="Anomali" danger count={kpi.flaggedJobs} />
            <SidebarItem tab="projects" label="Proyek" count={projects.length} />
            <SidebarItem tab="executors" label="Pelaksana" />
            <SidebarItem tab="approval" label="Manajemen Akun" count={adminUsers.length} />
            <SidebarItem tab="tracking" label="GPS Tracker" />
            <SidebarItem tab="audit" label="Audit Trail" />
            <SidebarItem tab="risk-config" label="Konfigurasi Risiko" />
          </div>
          <div className="p-3 border-t border-[var(--border-subtle)] space-y-1">
            <SidebarItem tab="profile" label="Setup Profile" />
            <button
              onClick={logout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors text-slate-600 hover:bg-rose-50 hover:text-rose-700"
            >
              <span className="flex-1 text-left">Keluar</span>
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto flex flex-col w-full relative">
        <div className="p-4 sm:p-6 space-y-5 max-w-6xl w-full mx-auto">
          {isLoading && <div className="py-16 text-center text-sm text-[var(--text-muted)]">Memuat dashboard...</div>}

          {loadError && !isLoading && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-center">
              <p className="text-sm text-rose-800 font-medium">{loadError}</p>
            </div>
          )}

          {!isLoading && (
            <>
              {/* KPI Strip */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="clean-card clean-card p-4">
                  <span className="text-xs font-medium text-[var(--text-secondary)] block">Total Penugasan (30 hari)</span>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-2xl font-bold font-mono text-[var(--text-primary)]">{kpi.totalJobs}</span>
                    <span className="text-xs text-[var(--text-muted)]">pekerjaan</span>
                  </div>
                </div>
                <div className="clean-card clean-card p-4">
                  <span className="text-xs font-medium text-emerald-700 block">Selesai Terverifikasi</span>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-2xl font-bold font-mono text-emerald-700">{kpi.completedJobs}</span>
                    <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {kpi.totalJobs > 0 ? Math.round((kpi.completedJobs / kpi.totalJobs) * 100) : 0}%
                    </span>
                  </div>
                </div>
                <div className="clean-card clean-card p-4">
                  <span className="text-xs font-medium text-zinc-700 block">Sedang Berlangsung</span>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-2xl font-bold font-mono text-[var(--text-primary)]">{kpi.workingJobs}</span>
                    <span className="text-xs text-[var(--text-secondary)]">aktif di lapangan</span>
                  </div>
                </div>
                <div className="clean-card bg-[var(--bg-card)] p-4 rounded-lg border border-rose-200 bg-rose-50/20">
                  <span className="text-xs font-semibold text-rose-700 block flex items-center gap-1"><ShieldAlert size={14} /> Anomali Spasial</span>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-2xl font-bold font-mono text-rose-700">{kpi.flaggedJobs}</span>
                    <span className="text-xs font-medium text-rose-700 bg-rose-100 px-2 py-0.5 rounded border border-rose-200">{kpi.highRiskCount} Risiko Tinggi</span>
                  </div>
                </div>
              </div>

              {kpi.flaggedJobs > 0 && activeTab !== 'anomalies' && (
                <div className="bg-rose-50 border border-rose-200 p-4 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-rose-900">
                  <div className="flex items-start sm:items-center gap-3">
                    <div className="w-8 h-8 rounded-md bg-rose-100 text-rose-700 flex items-center justify-center shrink-0"><ShieldAlert size={18} /></div>
                    <div>
                      <h3 className="font-semibold text-sm text-rose-950">Perhatian Audit — {kpi.flaggedJobs} Laporan Memerlukan Tinjauan</h3>
                      <p className="text-xs text-rose-800 mt-0.5">Terdeteksi ketidaksesuaian koordinat geofence atau durasi pengerjaan di luar standar.</p>
                    </div>
                  </div>
                  <button onClick={() => setActiveTab('anomalies')} className="self-start sm:self-auto text-xs font-semibold px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-md transition-colors whitespace-nowrap">
                    Tinjau Laporan Anomali
                  </button>
                </div>
              )}

              {(activeTab === 'reports' || activeTab === 'anomalies') && (
              <div className="space-y-4">
                
                {activeTab === 'anomalies' && (
                  <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 mb-4">
                    <h3 className="text-sm font-bold text-rose-900 mb-2">Informasi & Kriteria Anomali</h3>
                    <p className="text-xs text-rose-800 leading-relaxed">
                      Sistem mendeteksi sebuah penugasan sebagai <strong>Anomali</strong> apabila memenuhi salah satu dari kriteria berikut sesuai konfigurasi:
                    </p>
                    <ul className="list-disc list-inside text-xs text-rose-800 mt-2 space-y-1 ml-1">
                      <li>Radius Check-In & Check-Out melebihi toleransi (maks. {riskConfig?.locationDriftThresholdMeters || 200} meter).</li>
                      <li>Durasi pekerjaan terlalu singkat (kurang dari {riskConfig?.shortDurationCriticalMinutes || 15} menit).</li>
                      <li>Pekerjaan tidak memiliki foto progres pekerjaan.</li>
                    </ul>
                  </div>
                )}

                {/* Filter Bar */}
                <div className="clean-card bg-[var(--bg-card)] p-4 rounded-xl border border-[var(--border-subtle)]/90  space-y-3">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="relative flex-1">
                      <Search size={16} className="absolute left-3.5 top-3 text-[var(--text-muted)]" />
                      <input
                        type="text"
                        placeholder="Cari pelaksana, nama proyek, atau alamat..."
                        value={searchInput}
                        onChange={e => setSearchInput(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-[var(--bg-tertiary)] rounded-xl border border-[var(--border-subtle)] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                      />
                      {searchInput && (
                        <button onClick={() => setSearchInput('')} className="absolute right-3 top-2.5 text-[var(--text-muted)] hover:text-[var(--text-secondary)]"><X size={14} /></button>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mr-1">Tanggal:</span>
                      {DATE_PRESETS.map(preset => (
                        <button
                          key={preset.id}
                          onClick={() => setDatePreset(preset.id)}
                          className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-all ${
                            datePreset === preset.id ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs' : 'clean-card bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:bg-[var(--bg-tertiary)]'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                      <button
                        onClick={() => setShowFilterDrawer(!showFilterDrawer)}
                        className={`inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border font-semibold transition-all ${
                          showFilterDrawer ? 'bg-slate-800 text-white border-slate-800' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border-slate-300 hover:bg-slate-200'
                        }`}
                      >
                        Filter Lengkap
                      </button>
                      <button
                        onClick={handleExportCsv}
                        disabled={isExporting}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-semibold transition-colors disabled:opacity-60"
                        title="Unduh Laporan (CSV)"
                      >
                        {isExporting ? 'Mengunduh...' : 'Unduh CSV'}
                      </button>
                    </div>
                  </div>

                  {showFilterDrawer && (
                    <div className="pt-3 border-t border-[var(--border-subtle)] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-[var(--text-secondary)] uppercase mb-1">Dari Tanggal</label>
                        <input type="date" value={filters.startDate ?? ''} onChange={e => { setFilters(prev => ({ ...prev, startDate: e.target.value })); setDatePreset('custom'); }} className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[var(--border-subtle)] clean-card bg-[var(--bg-card)]" />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-[var(--text-secondary)] uppercase mb-1">Sampai Tanggal</label>
                        <input type="date" value={filters.endDate ?? ''} onChange={e => { setFilters(prev => ({ ...prev, endDate: e.target.value })); setDatePreset('custom'); }} className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[var(--border-subtle)] clean-card bg-[var(--bg-card)]" />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-[var(--text-secondary)] uppercase mb-1">Rentang Jam Check-In</label>
                        <div className="flex items-center gap-1">
                          <input type="time" value={filters.timeStart ?? ''} onChange={e => setFilters(prev => ({ ...prev, timeStart: e.target.value }))} className="w-full px-2 py-1.5 text-xs rounded-lg border border-[var(--border-subtle)] clean-card bg-[var(--bg-card)] font-mono" />
                          <span className="text-[var(--text-muted)] text-xs">-</span>
                          <input type="time" value={filters.timeEnd ?? ''} onChange={e => setFilters(prev => ({ ...prev, timeEnd: e.target.value }))} className="w-full px-2 py-1.5 text-xs rounded-lg border border-[var(--border-subtle)] clean-card bg-[var(--bg-card)] font-mono" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-[var(--text-secondary)] uppercase mb-1">Pelaksana</label>
                        <select value={filters.executorId} onChange={e => setFilters(prev => ({ ...prev, executorId: e.target.value }))} className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[var(--border-subtle)] clean-card bg-[var(--bg-card)]">
                          <option value="ALL">Semua Pelaksana</option>
                          {executors.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-[var(--text-secondary)] uppercase mb-1">Proyek</label>
                        <select value={filters.projectId} onChange={e => setFilters(prev => ({ ...prev, projectId: e.target.value }))} className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[var(--border-subtle)] clean-card bg-[var(--bg-card)]">
                          <option value="ALL">Semua Proyek</option>
                          {projects.map(p => <option key={p.id} value={p.id}>{p.projectName}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-[var(--text-secondary)] uppercase mb-1">Level Risiko</label>
                        <select value={filters.riskLevel} onChange={e => setFilters(prev => ({ ...prev, riskLevel: e.target.value }))} className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[var(--border-subtle)] clean-card bg-[var(--bg-card)]">
                          {RISK_LEVEL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-[var(--text-secondary)] uppercase mb-1">Status</label>
                        <select value={filters.status} onChange={e => setFilters(prev => ({ ...prev, status: e.target.value }))} className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[var(--border-subtle)] clean-card bg-[var(--bg-card)]">
                          {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-[var(--text-secondary)] uppercase mb-1">Jenis Layanan</label>
                        <select value={filters.serviceType} onChange={e => setFilters(prev => ({ ...prev, serviceType: e.target.value }))} className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[var(--border-subtle)] clean-card bg-[var(--bg-card)]">
                          {SERVICE_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {/* Desktop Table */}
                <div className="hidden md:block clean-card bg-[var(--bg-card)] rounded-xl border border-[var(--border-subtle)]/90  overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-[var(--text-secondary)] min-w-[1000px]">
                      <thead className="bg-[var(--bg-tertiary)] border-b border-[var(--border-subtle)] text-[var(--text-muted)] font-bold uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="px-4 py-3">Tanggal</th>
                        <th className="px-4 py-3">Pelaksana</th>
                        <th className="px-4 py-3">Proyek</th>
                        <th className="px-4 py-3">Layanan</th>
                        <th className="px-4 py-3">Check-In</th>
                        <th className="px-4 py-3">Check-Out</th>
                        <th className="px-4 py-3">Durasi</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-center">Risiko</th>
                        <th className="px-4 py-3 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {visibleReports.length === 0 ? (
                        <tr><td colSpan={10} className="text-center py-10 text-[var(--text-muted)]">Tidak ada laporan yang sesuai dengan kriteria filter.</td></tr>
                      ) : (
                        visibleReports.map(report => {
                          const durationMin = report.durationSeconds ? Math.round(report.durationSeconds / 60) : 0;
                          const svcMeta = getServiceTypeMeta(report.project.serviceType);
                          return (
                            <tr key={report.id} className={`hover:bg-[var(--bg-tertiary)]/80 transition-colors ${report.riskScore >= 40 ? 'bg-red-50/20' : ''}`}>
                              <td className="px-4 py-3 font-mono font-medium text-[var(--text-secondary)] whitespace-nowrap">{new Date(report.createdAt).toLocaleDateString('id-ID')}</td>
                              <td className="px-4 py-3"><span className="font-bold text-[var(--text-primary)] block">{report.executor.name}</span></td>
                              <td className="px-4 py-3 max-w-xs">
                                <span className="font-bold text-[var(--text-primary)] truncate block">{report.project.name}</span>
                                <span className="text-[11px] text-[var(--text-muted)] truncate block">{report.project.clientName}</span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded border ${svcMeta.badgeClass}`}>
                                  {svcMeta.shortLabel}
                                </span>
                                {report.treatmentSummary && (
                                  <span className="block text-[10px] text-[var(--text-muted)] mt-0.5">{report.treatmentSummary.chemicalName}</span>
                                )}
                              </td>
                              <td className="px-4 py-3 font-mono whitespace-nowrap">
                                {report.checkInAt ? (
                                  <div>
                                    <span className="font-semibold text-[var(--text-primary)]">{new Date(report.checkInAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB</span>
                                    <span className={`block text-[10px] ${report.checkInValid ? 'text-emerald-600' : 'text-red-600 font-bold'}`}>
                                      {report.checkInValid ? '✓ Valid' : '⚠ Di Luar Radius'} ({report.checkInDistance}m)
                                    </span>
                                  </div>
                                ) : <span className="text-[var(--text-muted)]">-</span>}
                              </td>
                              <td className="px-4 py-3 font-mono whitespace-nowrap">
                                {report.checkOutAt ? (
                                  <span className="font-semibold text-[var(--text-primary)]">{new Date(report.checkOutAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB</span>
                                ) : report.status === 'WORKING' ? <span className="text-blue-600 font-bold">Sedang Kerja</span> : <span className="text-[var(--text-muted)]">-</span>}
                              </td>
                              <td className="px-4 py-3 font-mono whitespace-nowrap">
                                {report.durationSeconds ? <span>{Math.floor(durationMin / 60)}h {durationMin % 60}m</span> : <span className="text-[var(--text-muted)]">-</span>}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                                  report.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                                  report.status === 'WORKING' ? 'bg-blue-100 text-blue-800' :
                                  report.status === 'FLAGGED' ? 'bg-red-100 text-red-800 font-black' :
                                  report.status === 'REVIEWED' ? 'bg-purple-100 text-purple-800' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
                                }`}>{report.status}</span>
                              </td>
                              <td className="px-4 py-3 text-center whitespace-nowrap"><RiskBadge level={report.riskLevel} score={report.riskScore} size="sm" /></td>
                              <td className="px-4 py-3 text-right whitespace-nowrap">
                                <button onClick={() => setSelectedReportId(report.id)} className="px-2.5 py-1 rounded-lg bg-[var(--bg-tertiary)] hover:bg-slate-200 text-[var(--text-secondary)] font-semibold text-xs transition-colors inline-flex items-center gap-1">
                                  <Eye size={13} /> Detail
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                  </div>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-3">
                  {visibleReports.length === 0 ? (
                    <div className="clean-card bg-[var(--bg-card)] p-6 rounded-xl text-center text-xs text-[var(--text-muted)]">Tidak ada laporan yang sesuai.</div>
                  ) : (
                    visibleReports.map(report => {
                      const durationMin = report.durationSeconds ? Math.round(report.durationSeconds / 60) : 0;
                      const svcMeta = getServiceTypeMeta(report.project.serviceType);
                      return (
                        <div key={report.id} className={`clean-card bg-[var(--bg-card)] p-4 rounded-xl border  space-y-2.5 ${report.riskScore >= 40 ? 'border-red-300 bg-red-50/10' : 'border-[var(--border-subtle)]'}`}>
                          <div className="flex items-center justify-between">
                            <RiskBadge level={report.riskLevel} score={report.riskScore} size="md" />
                            <span className="text-xs font-mono text-[var(--text-muted)]">{new Date(report.createdAt).toLocaleDateString('id-ID')}</span>
                          </div>
                          <div>
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded border mb-1 ${svcMeta.badgeClass}`}>
                              {svcMeta.shortLabel}
                            </span>
                            <h4 className="font-bold text-sm text-[var(--text-primary)]">{report.executor.name}</h4>
                            <p className="text-xs text-[var(--text-secondary)] font-semibold mt-0.5">{report.project.name}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs bg-[var(--bg-tertiary)] p-2.5 rounded-lg border border-[var(--border-subtle)] font-mono">
                            <div>
                              <span className="text-[10px] text-[var(--text-muted)] block font-sans">CHECK-IN</span>
                              <span className="font-semibold text-[var(--text-primary)]">{report.checkInAt ? new Date(report.checkInAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'} WIB</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-[var(--text-muted)] block font-sans">CHECK-OUT</span>
                              <span className="font-semibold text-[var(--text-primary)]">{report.checkOutAt ? new Date(report.checkOutAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : report.status === 'WORKING' ? 'Sedang Kerja' : '-'}</span>
                            </div>
                            <div className="col-span-2 pt-1 border-t border-[var(--border-subtle)]/60 flex items-center justify-between text-[11px]">
                              <span className="text-[var(--text-muted)] font-sans">Durasi: {durationMin} min</span>
                              {report.checkInValid === false && <span className="text-red-600 font-bold font-sans">⚠ GPS Di Luar Radius</span>}
                            </div>
                          </div>
                          <button onClick={() => setSelectedReportId(report.id)} className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1">
                            <Eye size={14} /> LIHAT DETAIL LAPORAN
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
                
                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-4 border-t border-[var(--border-subtle)]">
                    <span className="text-xs font-semibold text-[var(--text-muted)]">
                      Menampilkan halaman {page} dari {totalPages} (Total: {totalCount} Laporan)
                    </span>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="px-3 py-1.5 rounded-lg bg-[var(--bg-tertiary)] hover:bg-slate-200 text-[var(--text-secondary)] text-xs font-bold transition-colors disabled:opacity-50"
                      >
                        Sebelumnya
                      </button>
                      <button 
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="px-3 py-1.5 rounded-lg bg-[var(--bg-tertiary)] hover:bg-slate-200 text-[var(--text-secondary)] text-xs font-bold transition-colors disabled:opacity-50"
                      >
                        Selanjutnya
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'projects' && (
              <div className="space-y-4">
                <div className="flex flex-col md:flex-row gap-3 p-4 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                      type="text" 
                      placeholder="Cari proyek, klien, alamat, pelaksana..." 
                      className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                      value={projectSearch}
                      onChange={e => setProjectSearch(e.target.value)}
                    />
                  </div>
                  <select 
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                    value={projectServiceType}
                    onChange={e => setProjectServiceType(e.target.value)}
                  >
                    <option value="ALL">Semua Layanan</option>
                    {SERVICE_TYPE_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <select 
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                    value={projectStatus}
                    onChange={e => setProjectStatus(e.target.value)}
                  >
                    <option value="ALL">Semua Status</option>
                    <option value="OPEN">Terbuka</option>
                    <option value="LOCKED">Terkunci</option>
                  </select>
                </div>
                
                {projects.length === 0 ? (
                  <div className="text-center py-10 bg-slate-50 rounded-xl border border-slate-200 border-dashed text-slate-500 text-sm font-semibold">Tidak ada proyek yang sesuai dengan pencarian Anda.</div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {projects.map(proj => {
                  const svcMeta = getServiceTypeMeta(proj.serviceType);
                  return (
                    <div key={proj.id} className="clean-card bg-[var(--bg-card)] p-5 rounded-xl border border-[var(--border-subtle)]  space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded border mb-1 ${svcMeta.badgeClass}`}>
                            {svcMeta.label}
                          </span>
                          <h3 className="font-bold text-base text-[var(--text-primary)]">{proj.projectName}</h3>
                          <p className="text-xs text-[var(--text-muted)] font-medium">{proj.clientName}</p>
                        </div>
                        {proj.lockedAt ? (
                          <span className="text-[11px] font-bold text-[var(--text-secondary)] bg-[var(--bg-tertiary)] px-2 py-0.5 rounded border border-[var(--border-subtle)]">🔒 Terkunci</span>
                        ) : (
                          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">Terbuka</span>
                        )}
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] flex items-start gap-1.5"><MapPin size={14} className="text-[var(--text-muted)] shrink-0 mt-0.5" /><span>{proj.address}</span></p>
                      {proj.targetPests?.length > 0 && <p className="text-xs text-[var(--text-muted)]">Sasaran: <span className="font-semibold text-[var(--text-secondary)]">{proj.targetPests.join(', ')}</span></p>}
                      {proj.pestTarget && (!proj.targetPests || proj.targetPests.length === 0) && <p className="text-xs text-[var(--text-muted)]">Sasaran: <span className="font-semibold text-[var(--text-secondary)]">{proj.pestTarget}</span></p>}
                      <div className="bg-[var(--bg-tertiary)] p-3 rounded-lg border border-[var(--border-subtle)] text-xs grid grid-cols-2 gap-2">
                        <div><span className="text-[var(--text-muted)] block text-[10px]">TANGGAL</span><span className="font-semibold text-[var(--text-secondary)]">{proj.workDate}</span></div>
                        <div><span className="text-[var(--text-muted)] block text-[10px]">RADIUS</span><span className="font-semibold text-[var(--text-secondary)]">{proj.radius} meter</span></div>
                        <div><span className="text-[var(--text-muted)] block text-[10px]">LUAS AREA</span><span className="font-semibold text-[var(--text-secondary)]">{proj.buildingAreaSqm ? `${proj.buildingAreaSqm} m²` : '-'}</span></div>
                        <div><span className="text-[var(--text-muted)] block text-[10px]">DIBUAT OLEH</span><span className="font-semibold text-[var(--text-secondary)]">{proj.createdByName || '-'}</span></div>
                        <div><span className="text-[var(--text-muted)] block text-[10px]">KONTRAK</span><span className="font-semibold text-[var(--text-secondary)]">{proj.contractType === 'RECURRING' ? 'Berkala' : 'Sekali Layanan'}</span></div>
                        <div><span className="text-[var(--text-muted)] block text-[10px]">GARANSI</span><span className="font-semibold text-[var(--text-secondary)]">{proj.warrantyMonths > 0 ? `${proj.warrantyMonths} bulan` : '-'}</span></div>
                      </div>
                      {proj.contractType === 'RECURRING' && proj.nextServiceDate && (
                        <p className="text-[11px] text-sky-700 bg-sky-50 px-2.5 py-1 rounded border border-sky-200/60">
                          Layanan berikutnya: {new Date(proj.nextServiceDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                      )}
                      <div className="pt-2 border-t border-[var(--border-subtle)] mt-2 flex justify-end">
                        <button
                          onClick={() => setSelectedProject(proj)}
                          className="flex items-center gap-1.5 text-xs font-bold text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors px-3 py-1.5 rounded-lg hover:bg-[var(--accent-muted)]"
                        >
                          <Eye size={14} /> LIHAT DETAIL PROYEK
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {projectTotalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-4 border-t border-[var(--border-subtle)]">
                  <span className="text-xs font-semibold text-[var(--text-muted)]">
                    Menampilkan halaman {projectPage} dari {projectTotalPages} (Total: {projectTotalCount} Proyek)
                  </span>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setProjectPage(p => Math.max(1, p - 1))}
                      disabled={projectPage === 1}
                      className="px-3 py-1.5 rounded-lg bg-[var(--bg-tertiary)] hover:bg-slate-200 text-[var(--text-secondary)] text-xs font-bold transition-colors disabled:opacity-50"
                    >
                      Sebelumnya
                    </button>
                    <button 
                      onClick={() => setProjectPage(p => Math.min(projectTotalPages, p + 1))}
                      disabled={projectPage === projectTotalPages}
                      className="px-3 py-1.5 rounded-lg bg-[var(--bg-tertiary)] hover:bg-slate-200 text-[var(--text-secondary)] text-xs font-bold transition-colors disabled:opacity-50"
                    >
                      Selanjutnya
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

            {activeTab === 'executors' && (
              <div className="clean-card bg-[var(--bg-card)] rounded-xl border border-[var(--border-subtle)]  overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-[var(--text-secondary)] min-w-[700px]">
                    <thead className="bg-[var(--bg-tertiary)] border-b border-[var(--border-subtle)] text-[var(--text-muted)] font-bold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="px-4 py-3">Nama</th>
                      <th className="px-4 py-3">NIP</th>
                      <th className="px-4 py-3 text-center">Total Pekerjaan</th>
                      <th className="px-4 py-3 text-center">Selesai</th>
                      <th className="px-4 py-3 text-center">Risiko Tinggi</th>
                      <th className="px-4 py-3 text-center">Rata-rata Durasi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {executors.map(ex => (
                      <tr key={ex.id} className="hover:bg-[var(--bg-tertiary)]/80">
                        <td className="px-4 py-3"><span className="font-bold text-[var(--text-primary)] block">{ex.name}</span><span className="text-[11px] text-[var(--text-muted)]">{ex.email}</span></td>
                        <td className="px-4 py-3 font-mono">{ex.nip || '-'}</td>
                        <td className="px-4 py-3 text-center font-mono">{ex.totalJobs}</td>
                        <td className="px-4 py-3 text-center font-mono text-emerald-700">{ex.completedJobs}</td>
                        <td className="px-4 py-3 text-center font-mono text-red-700">{ex.highRiskJobs}</td>
                        <td className="px-4 py-3 text-center font-mono">{ex.avgDurationMinutes} min</td>
                      </tr>
                    ))}
                  </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'tracking' && (
              <div className="clean-card bg-[var(--bg-card)] rounded-xl border border-[var(--border-subtle)]  overflow-hidden p-4">
                <div className="mb-6 rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                  <AllProjectsMap projects={projects.filter(p => !p.lockedAt)} userLocations={userLocations} height="400px" />
                </div>

                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-sm text-[var(--text-primary)]">Lokasi Pelaksana Terbaru (Real-time GPS Tracking)</h3>
                  <button onClick={() => fetchLatestLocations().then(setUserLocations)} className="text-xs flex items-center gap-1 text-[var(--text-secondary)] hover:text-emerald-700">
                    <RefreshCw size={14} /> Refresh
                  </button>
                </div>
                {userLocations.length === 0 ? (
                  <div className="py-8 text-center text-xs text-[var(--text-muted)]">Belum ada data lokasi pelaksana.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-[var(--text-secondary)]">
                      <thead className="bg-[var(--bg-tertiary)] border-b border-[var(--border-subtle)] text-[var(--text-muted)] font-bold uppercase tracking-wider text-[11px]">
                        <tr>
                          <th className="px-4 py-3">Nama Pelaksana</th>
                          <th className="px-4 py-3">Update Terakhir</th>
                          <th className="px-4 py-3">Latitude</th>
                          <th className="px-4 py-3">Longitude</th>
                          <th className="px-4 py-3">Akurasi</th>
                          <th className="px-4 py-3 text-center">Tindakan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {userLocations.map(loc => (
                          <tr key={loc.userId} className="hover:bg-[var(--bg-tertiary)]/50">
                            <td className="px-4 py-3 font-semibold text-[var(--text-primary)]">{loc.userName}</td>
                            <td className="px-4 py-3">{new Date(loc.trackedAt).toLocaleString('id-ID')}</td>
                            <td className="px-4 py-3 font-mono">{loc.latitude}</td>
                            <td className="px-4 py-3 font-mono">{loc.longitude}</td>
                            <td className="px-4 py-3 font-mono">±{Math.round(loc.accuracy)}m</td>
                            <td className="px-4 py-3 text-center">
                              <a
                                href={`https://www.google.com/maps/search/?api=1&query=${loc.latitude},${loc.longitude}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 transition-colors inline-block"
                              >
                                Buka di Maps
                              </a>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'audit' && (
              <div className="clean-card bg-[var(--bg-card)] rounded-xl border border-[var(--border-subtle)]  overflow-hidden p-4">
                <div className="mb-6 rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                  <AllProjectsMap projects={projects.filter(p => !p.lockedAt)} userLocations={userLocations} height="400px" />
                </div>

                <h3 className="font-bold text-sm text-[var(--text-primary)] mb-3">Histori &amp; Rekam Jejak Audit Sistem</h3>
                {auditLogs === null ? (
                  <div className="py-8 text-center text-xs text-[var(--text-muted)]">Memuat...</div>
                ) : (
                  <div className="space-y-3">
                    {auditLogs.map(log => (
                      <div key={log.id} className="p-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-tertiary)] flex items-start justify-between gap-3 text-xs">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-[var(--text-primary)]">{log.userName}</span>
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-200 text-[var(--text-secondary)]">{log.userRole}</span>
                            <span className="font-mono text-[10px] text-emerald-700 bg-emerald-100/70 px-1.5 py-0.2 rounded font-semibold">{log.action}</span>
                          </div>
                          <p className="text-[var(--text-secondary)]">{log.details}</p>
                        </div>
                        <span className="text-[11px] text-[var(--text-muted)] font-mono whitespace-nowrap">{new Date(log.createdAt).toLocaleTimeString('id-ID')} WIB</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            
            {activeTab === 'approval' && (
              <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-subtle)] shadow-sm overflow-hidden p-4">
                <h3 className="font-bold text-sm text-[var(--text-primary)] mb-3">Manajemen Akun Pengguna</h3>
                
                <div className="mb-6 p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                  <h4 className="font-bold text-sm text-emerald-800 mb-2">Buat Link Undangan (Berlaku 24 Jam)</h4>
                  <p className="text-xs text-emerald-600 mb-3">
                    Pendaftaran kini dibatasi hanya melalui link undangan. Buat link di bawah ini dan bagikan ke teknisi atau admin baru untuk mendaftar.
                  </p>
                  <div className="flex gap-2 mb-3">
                    <button 
                      onClick={() => handleGenerateInvite('TEKNISI')}
                      disabled={isGeneratingInvite}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
                    >
                      Buat Undangan Teknisi
                    </button>
                    <button 
                      onClick={() => handleGenerateInvite('ADMIN')}
                      disabled={isGeneratingInvite}
                      className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
                    >
                      Buat Undangan Admin
                    </button>
                  </div>
                  
                  {inviteLink && (
                    <div className="mt-4 p-3 bg-white rounded-lg border border-emerald-200 shadow-sm animate-in fade-in slide-in-from-top-2">
                      <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase mb-1">Link Undangan (Kedaluwarsa: {inviteLink.expiresAt})</p>
                      <div className="flex items-center gap-2">
                        <input 
                          type="text" 
                          readOnly 
                          value={inviteLink.url} 
                          className="flex-1 text-xs px-2 py-1.5 bg-slate-50 border border-slate-200 rounded outline-none focus:border-emerald-400"
                        />
                        <button 
                          onClick={() => { navigator.clipboard.writeText(inviteLink.url); alert('Disalin!'); }}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded transition-colors"
                        >
                          Salin
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {adminUsers.length === 0 ? (
                  <div className="py-8 text-center text-xs text-[var(--text-muted)]">Tidak ada data pengguna.</div>
                ) : (
                  <div className="space-y-3">
                    {adminUsers.map(u => (
                      <div key={u.id} className={`p-4 rounded-xl border border-[var(--border-subtle)] ${u.is_active ? 'bg-[var(--bg-tertiary)]' : 'bg-red-50/50 border-red-100'} flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs`}>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-[var(--text-primary)] text-sm">{u.name}</span>
                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${u.is_active ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-red-100 text-red-800 border-red-200'}`}>
                              {u.is_active ? 'AKTIF' : 'DITANGGUHKAN'}
                            </span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-200 text-[var(--text-secondary)] font-bold">{u.role}</span>
                          </div>
                          <p className="text-[var(--text-secondary)] font-mono">{u.email} • NIP: {u.nip || '-'}</p>
                          <p className="text-[10px] text-[var(--text-muted)] mt-1">Mendaftar pada: {new Date(u.created_at).toLocaleString('id-ID')} WIB</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {u.is_active ? (
                            <button onClick={() => handleSuspend(u.id)} className="px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 font-bold transition-colors">Suspend Akun</button>
                          ) : (
                            <button onClick={() => handleActivate(u.id)} className="px-4 py-1.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-bold transition-colors shadow-sm">Aktifkan Akun</button>
                          )}
                          <button onClick={() => handleDeleteUser(u.id)} className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors" title="Hapus Akun Permanen">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'risk-config' && (
              <div className="space-y-4">
                <RiskConfigPanel config={riskConfig} onSave={handleSaveRiskConfig} />
                <PhotoRetentionPanel />
              </div>
            )}

            {activeTab === 'profile' && user && (
              <div className="clean-card bg-[var(--bg-card)] max-w-2xl mx-auto p-6 space-y-6">
                <h2 className="text-lg font-bold border-b border-[var(--border-subtle)] pb-3">Profil Anda</h2>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="block text-[10px] font-semibold text-[var(--text-muted)]">Nama Lengkap</span>
                    <span className="font-semibold text-[var(--text-primary)]">{user.name}</span>
                  </div>
                  <div className="overflow-hidden">
                    <span className="block text-[10px] font-semibold text-[var(--text-muted)]">Email</span>
                    <span className="font-semibold text-[var(--text-primary)] truncate block" title={user.email}>{user.email}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-semibold text-[var(--text-muted)]">NIP</span>
                    <span className="font-semibold text-[var(--text-primary)]">{user.nip || '-'}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-semibold text-[var(--text-muted)]">Peran</span>
                    <span className="font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[10px] border border-blue-200">{user.role}</span>
                  </div>
                </div>
                <div className="pt-4 border-t border-[var(--border-subtle)]">
                  <button
                    onClick={() => setShowChangePassword(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-lg transition-colors"
                  >
                    Ubah Kata Sandi
                  </button>
                </div>
              </div>
            )}
          </>
        )}
        </div>
      </main>

      {/* Detail Modal */}
      {selectedReportId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--text-primary)]/60 p-4 sm:p-6 " onClick={() => setSelectedReportId(null)}>
          <div className="relative w-full max-w-3xl clean-card bg-[var(--bg-card)] rounded-2xl shadow-2xl border border-[var(--border-subtle)] flex flex-col max-h-[90vh] sm:max-h-[85vh] overflow-hidden text-[var(--text-primary)]" onClick={e => e.stopPropagation()}>
            {detailLoading && <div className="p-16 text-center text-sm text-[var(--text-muted)]">Memuat detail laporan...</div>}
            {!detailLoading && selectedReport && (
              <>
                <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-tertiary)] shrink-0">
                  <div className="flex items-center gap-3">
                    <RiskBadge level={selectedReport.riskLevel} score={selectedReport.riskScore} size="lg" />
                    <div>
                      <h2 className="text-base font-bold text-[var(--text-primary)]">{selectedReport.projectName}</h2>
                      <p className="text-xs text-[var(--text-muted)]">
                        Pelaksana: <span className="font-semibold text-[var(--text-secondary)]">{selectedReport.executorName}</span> • {new Date(selectedReport.createdAt).toLocaleDateString('id-ID')}
                      </p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedReportId(null)} className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-slate-200/60 transition-colors"><X size={20} /></button>
                </div>

                <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[var(--bg-tertiary)] p-4 rounded-xl border border-[var(--border-subtle)]/80 text-xs">
                    <div><span className="text-[var(--text-muted)] block text-[10px]">KLIEN</span><span className="font-bold text-[var(--text-primary)]">{selectedReport.clientName}</span></div>
                    <div><span className="text-[var(--text-muted)] block text-[10px]">LAYANAN</span><span className="font-bold text-[var(--text-primary)]">{getServiceTypeMeta(selectedReport.serviceType).label}</span></div>
                    <div><span className="text-[var(--text-muted)] block text-[10px]">STATUS</span><span className="font-bold text-[var(--text-primary)]">{selectedReport.status}</span></div>
                    <div><span className="text-[var(--text-muted)] block text-[10px]">TOTAL DURASI</span><span className="font-bold text-[var(--text-primary)]">{selectedReport.durationSeconds ? `${Math.round(selectedReport.durationSeconds / 60)} menit` : '-'}</span></div>
                    {selectedReport.targetPests?.length > 0 ? (
                      <div className="col-span-2"><span className="text-[var(--text-muted)] block text-[10px]">SASARAN HAMA</span><span className="font-bold text-[var(--text-primary)]">{selectedReport.targetPests.join(', ')}</span></div>
                    ) : selectedReport.pestTarget ? (
                      <div className="col-span-2"><span className="text-[var(--text-muted)] block text-[10px]">SASARAN HAMA</span><span className="font-bold text-[var(--text-primary)]">{selectedReport.pestTarget}</span></div>
                    ) : null}
                    {selectedReport.warrantyMonths > 0 && (
                      <div><span className="text-[var(--text-muted)] block text-[10px]">GARANSI</span><span className="font-bold text-[var(--text-primary)]">{selectedReport.warrantyMonths} bulan</span></div>
                    )}
                    <div><span className="text-[var(--text-muted)] block text-[10px]">JADWAL</span><span className="font-bold text-[var(--text-primary)]">{selectedReport.scheduledStartTime} WIB</span></div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2 flex items-center gap-1.5"><MapPin size={15} className="text-emerald-600" /> Validasi Geografis</h4>
                    <LocationMap
                      projectName={selectedReport.projectName}
                      projectLat={selectedReport.projectLatitude}
                      projectLng={selectedReport.projectLongitude}
                      projectRadius={selectedReport.projectRadius}
                      executorLat={selectedReport.checkInLatitude ?? null}
                      executorLng={selectedReport.checkInLongitude ?? null}
                      executorAccuracy={selectedReport.checkInAccuracy}
                      distanceMeters={selectedReport.checkInDistance}
                      isWithinRadius={selectedReport.checkInValid}
                      checkOutLat={selectedReport.checkOutLatitude}
                      checkOutLng={selectedReport.checkOutLongitude}
                      height="280px"
                    />
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-3 flex items-center gap-1.5"><Clock size={15} className="text-emerald-600" /> Kronologi Waktu</h4>
                    <div className="relative pl-6 border-l-2 border-[var(--border-subtle)] space-y-4 text-xs">
                      <div className="relative">
                        <div className="absolute -left-[31px] top-0.5 w-3.5 h-3.5 rounded-full bg-slate-300 border-2 border-white" />
                        <span className="font-bold text-[var(--text-secondary)] font-mono">{selectedReport.scheduledStartTime} WIB</span>
                        <p className="text-[var(--text-muted)]">Jadwal target dimulainya pekerjaan</p>
                      </div>
                      {selectedReport.checkInAt && (
                        <div className="relative">
                          <div className={`absolute -left-[31px] top-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${selectedReport.checkInValid ? 'bg-emerald-500' : 'bg-red-500'}`} />
                          <span className="font-bold text-[var(--text-primary)] font-mono">{new Date(selectedReport.checkInAt).toLocaleTimeString('id-ID')} WIB — CHECK-IN</span>
                          <p className="text-[var(--text-secondary)] mt-0.5">
                            {selectedReport.checkInValid ? '✓ Valid di dalam radius' : '⚠ Di luar radius proyek'} (Jarak: {selectedReport.checkInDistance}m, Akurasi: ±{selectedReport.checkInAccuracy}m)
                          </p>
                        </div>
                      )}
                      {selectedReport.photos.filter(p => p.photoType === 'PROGRESS').map((photo, idx) => (
                        <div key={photo.id} className="relative">
                          <div className="absolute -left-[31px] top-0.5 w-3.5 h-3.5 rounded-full bg-amber-500 border-2 border-white" />
                          <span className="font-bold text-[var(--text-primary)] font-mono">{new Date(photo.capturedAt).toLocaleTimeString('id-ID')} WIB — DOKUMENTASI PROGRES #{idx + 1}</span>
                        </div>
                      ))}
                      {selectedReport.checkOutAt && (
                        <div className="relative">
                          <div className={`absolute -left-[31px] top-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${selectedReport.checkOutValid ? 'bg-blue-500' : 'bg-red-500'}`} />
                          <span className="font-bold text-[var(--text-primary)] font-mono">{new Date(selectedReport.checkOutAt).toLocaleTimeString('id-ID')} WIB — CHECK-OUT</span>
                          <p className="text-[var(--text-secondary)] mt-0.5">Total durasi: {Math.round((selectedReport.durationSeconds || 0) / 60)} menit.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2.5 flex items-center gap-1.5"><FlaskConical size={15} className="text-emerald-600" /> Data Perlakuan (Treatment)</h4>
                    {!selectedReport.treatmentRecord ? (
                      <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl text-amber-800 text-xs flex items-center gap-2">
                        <AlertTriangle size={16} className="text-amber-600 shrink-0" />
                        <span>Belum ada data bahan, dosis, atau metode aplikasi yang tercatat untuk pekerjaan ini.</span>
                      </div>
                    ) : (
                      <div className="bg-[var(--bg-tertiary)] border border-[var(--border-subtle)]/80 rounded-xl p-4 text-xs space-y-3">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div><span className="text-[var(--text-muted)] block text-[10px]">METODE</span><span className="font-bold text-[var(--text-primary)]">{APPLICATION_METHOD_LABELS[selectedReport.treatmentRecord.applicationMethod]}</span></div>
                          <div><span className="text-[var(--text-muted)] block text-[10px]">BAHAN/PRODUK</span><span className="font-bold text-[var(--text-primary)]">{selectedReport.treatmentRecord.chemicalName}</span></div>
                          <div><span className="text-[var(--text-muted)] block text-[10px]">BAHAN AKTIF</span><span className="font-bold text-[var(--text-primary)]">{selectedReport.treatmentRecord.activeIngredient || '-'}</span></div>
                          <div><span className="text-[var(--text-muted)] block text-[10px]">DOSIS</span><span className="font-bold text-[var(--text-primary)]">{selectedReport.treatmentRecord.dosage}</span></div>
                          {selectedReport.treatmentRecord.treatmentAreaSqm != null && (
                            <div><span className="text-[var(--text-muted)] block text-[10px]">LUAS DIRAWAT</span><span className="font-bold text-[var(--text-primary)]">{selectedReport.treatmentRecord.treatmentAreaSqm} m²</span></div>
                          )}
                          {selectedReport.treatmentRecord.drillingPointsCount != null && (
                            <div><span className="text-[var(--text-muted)] block text-[10px]">TITIK BOR/INJEKSI</span><span className="font-bold text-[var(--text-primary)]">{selectedReport.treatmentRecord.drillingPointsCount} titik</span></div>
                          )}
                        </div>

                        {selectedReport.serviceType === 'FUMIGATION' && (
                          <div className={`rounded-lg p-3 border ${selectedReport.treatmentRecord.aerationCompletedAt ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
                            <div className="flex items-center gap-1.5 mb-2">
                              <ShieldAlert size={14} className={selectedReport.treatmentRecord.aerationCompletedAt ? 'text-emerald-700' : 'text-rose-700'} />
                              <span className={`text-[11px] font-bold uppercase ${selectedReport.treatmentRecord.aerationCompletedAt ? 'text-emerald-800' : 'text-rose-800'}`}>Data Keselamatan Fumigasi</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div><span className="text-[var(--text-muted)] block text-[10px]">FUMIGANT</span><span className="font-semibold text-[var(--text-primary)]">{selectedReport.treatmentRecord.fumigantType || '-'}</span></div>
                              <div><span className="text-[var(--text-muted)] block text-[10px]">KONSENTRASI</span><span className="font-semibold text-[var(--text-primary)]">{selectedReport.treatmentRecord.gasConcentrationPpm != null ? `${selectedReport.treatmentRecord.gasConcentrationPpm} ppm` : '-'}</span></div>
                              <div><span className="text-[var(--text-muted)] block text-[10px]">MULAI SEALING</span><span className="font-semibold text-[var(--text-primary)]">{selectedReport.treatmentRecord.sealingStartedAt ? new Date(selectedReport.treatmentRecord.sealingStartedAt).toLocaleString('id-ID') : '-'}</span></div>
                              <div>
                                <span className="text-[var(--text-muted)] block text-[10px]">SELESAI AERASI</span>
                                {selectedReport.treatmentRecord.aerationCompletedAt ? (
                                  <span className="font-semibold text-emerald-700">{new Date(selectedReport.treatmentRecord.aerationCompletedAt).toLocaleString('id-ID')}</span>
                                ) : (
                                  <span className="font-bold text-rose-700">Belum tercatat ⚠</span>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {selectedReport.treatmentRecord.technicianNotes && (
                          <p className="text-[var(--text-secondary)] italic">&quot;{selectedReport.treatmentRecord.technicianNotes}&quot;</p>
                        )}
                      </div>
                    )}
                  </div>

                  {selectedReport.customerName && (
                    <div className="mt-2 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-xl p-4">
                      <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <UserCheck size={15} className="text-emerald-600" /> Serah Terima & Ulasan Pelanggan
                      </h4>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <div>
                            <span className="text-[var(--text-muted)] block text-[10px] font-bold">NAMA PENGANGGUNG JAWAB/PELANGGAN</span>
                            <span className="font-bold text-[var(--text-primary)] text-sm">{selectedReport.customerName}</span>
                          </div>
                          {selectedReport.customerPhone && (
                            <div>
                              <span className="text-[var(--text-muted)] block text-[10px] font-bold">NOMOR TELEPON</span>
                              <span className="font-semibold text-[var(--text-secondary)] text-sm">{selectedReport.customerPhone}</span>
                            </div>
                          )}
                          <div>
                            <span className="text-[var(--text-muted)] block text-[10px] font-bold">KRITIK & SARAN</span>
                            <p className="font-medium text-[var(--text-primary)] text-sm mt-0.5 whitespace-pre-wrap clean-card bg-[var(--bg-card)] border border-[var(--border-subtle)] p-2.5 rounded-lg italic">
                              {selectedReport.customerFeedback || <span className="text-[var(--text-muted)] not-italic">Tidak ada ulasan.</span>}
                            </p>
                          </div>
                        </div>
                        {selectedReport.customerSignature && (
                          <div>
                            <span className="text-[var(--text-muted)] block text-[10px] font-bold mb-1.5">TANDA TANGAN</span>
                            <div className="border border-[var(--border-subtle)] rounded-xl clean-card bg-[var(--bg-card)] p-2 h-32 flex items-center justify-center relative">
                              <img src={selectedReport.customerSignature} alt="Tanda Tangan Pelanggan" className="max-h-full max-w-full object-contain" />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div>
                    <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2.5 flex items-center gap-1.5"><Eye size={15} className="text-emerald-600" /> Tinjauan Bukti Foto (Photo Review) - ({selectedReport.photos.length})</h4>
                    {selectedReport.photos.length === 0 ? (
                      <p className="text-xs text-[var(--text-muted)]">Belum ada foto.</p>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {selectedReport.photos.map(photo => (
                          <div key={photo.id} onClick={() => setViewingPhoto(photo)} className="group relative rounded-xl overflow-hidden border border-[var(--border-subtle)]  cursor-pointer hover:border-emerald-500 transition-all aspect-video bg-black">
                            <AuthedImage path={photo.url} alt="evidence" purged={!!photo.purgedAt} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 text-white pointer-events-none">
                              <span className="text-[10px] font-bold block uppercase tracking-wide">{photo.photoTag ? (photo.photoTag === 'BEFORE' ? 'Kondisi Awal' : 'Hasil Perlakuan') : photo.photoType.replace('_', ' ')}</span>
                              <span className="text-[9px] text-slate-300 font-mono block">{new Date(photo.capturedAt).toLocaleTimeString('id-ID')} WIB</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2.5 flex items-center gap-1.5"><ShieldAlert size={15} className="text-red-600" /> Analisis Anomali</h4>
                    {selectedReport.riskEvents.length === 0 ? (
                      <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
                        <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                        <span>Tidak ada anomali terdeteksi.</span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {selectedReport.riskEvents.map(evt => (
                          <div key={evt.id} className="p-3.5 rounded-xl border border-red-200 bg-red-50/40 flex items-start justify-between gap-3 text-xs">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-red-900">{evt.title}</span>
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-red-100 text-red-800">{evt.severity}</span>
                              </div>
                              <p className="text-[var(--text-secondary)]">{evt.description}</p>
                              {evt.expectedValue && evt.actualValue && (
                                <div className="text-[11px] text-[var(--text-muted)] font-mono mt-1">
                                  Standar: <span className="text-[var(--text-primary)] font-semibold">{evt.expectedValue}</span> | Aktual: <span className="text-red-700 font-bold">{evt.actualValue}</span>
                                </div>
                              )}
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-base font-black text-red-700 font-mono">+{evt.points}</span>
                              <span className="block text-[10px] text-[var(--text-muted)] font-semibold uppercase">Poin</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {selectedReport.status === 'REVIEWED' && (
                    <div className="bg-purple-50 border border-purple-200 p-4 rounded-xl text-xs space-y-1">
                      <span className="font-bold text-purple-900 block">✓ Laporan Telah Ditinjau</span>
                      <p className="text-purple-800">Catatan: &quot;{selectedReport.reviewNotes}&quot;</p>
                    </div>
                  )}

                  {selectedReport.status !== 'REVIEWED' && (
                    <div className="pt-4 border-t border-[var(--border-subtle)]">
                      {!isReviewing ? (
                        <button onClick={() => setIsReviewing(true)} className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all flex items-center gap-2 ">
                          <UserCheck size={16} /> Verifikasi / Tinjau Laporan Ini
                        </button>
                      ) : (
                        <div className="bg-[var(--bg-tertiary)] p-4 rounded-xl border border-[var(--border-subtle)] space-y-3">
                          <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase">Catatan Verifikasi Admin *</label>
                          <textarea rows={2} placeholder="Contoh: Telah dikonfirmasi via telepon, GPS bergeser karena berada di ruang bawah tanah..." value={adminReviewNotes} onChange={e => setAdminReviewNotes(e.target.value)} className="w-full p-2.5 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-slate-800 resize-none clean-card bg-[var(--bg-card)]" />
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => setIsReviewing(false)} className="px-3 py-1.5 rounded-lg border border-slate-300 text-[var(--text-secondary)] text-xs font-semibold hover:bg-[var(--bg-tertiary)]">Batal</button>
                            <button onClick={handleAdminReview} disabled={!adminReviewNotes.trim()} className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5  disabled:opacity-50">
                              <Check size={14} /> Simpan &amp; Tandai Selesai Ditinjau
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Project Detail Modal */}
      {selectedProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--text-primary)]/60 p-4 sm:p-6" onClick={() => setSelectedProject(null)}>
          <div className="relative w-full max-w-3xl clean-card bg-[var(--bg-card)] rounded-2xl shadow-2xl border border-[var(--border-subtle)] flex flex-col max-h-[90vh] sm:max-h-[85vh] overflow-hidden text-[var(--text-primary)]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-tertiary)] shrink-0">
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded border ${getServiceTypeMeta(selectedProject.serviceType).badgeClass}`}>
                  {getServiceTypeMeta(selectedProject.serviceType).label}
                </span>
                <h2 className="text-lg font-bold text-[var(--text-primary)] truncate">{selectedProject.projectName}</h2>
              </div>
              <button onClick={() => setSelectedProject(null)} className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-slate-200/60 transition-colors"><X size={20} /></button>
            </div>
            <div className="overflow-y-auto p-4 sm:p-6 space-y-6 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-[var(--bg-tertiary)] p-4 rounded-xl border border-[var(--border-subtle)] space-y-3">
                  <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Informasi Proyek</h4>
                  <div><span className="text-[var(--text-muted)] block text-[10px]">KLIEN</span><span className="font-bold text-[var(--text-primary)]">{selectedProject.clientName}</span></div>
                  <div><span className="text-[var(--text-muted)] block text-[10px]">ALAMAT</span><span className="font-bold text-[var(--text-primary)]">{selectedProject.address}</span></div>
                  <div><span className="text-[var(--text-muted)] block text-[10px]">SASARAN HAMA</span><span className="font-bold text-[var(--text-primary)]">{selectedProject.targetPests?.length ? selectedProject.targetPests.join(", ") : selectedProject.pestTarget || "-"}</span></div>
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[var(--border-subtle)]">
                    <div><span className="text-[var(--text-muted)] block text-[10px]">KONTRAK</span><span className="font-bold text-[var(--text-primary)]">{selectedProject.contractType === "RECURRING" ? "Berkala" : "Sekali Layanan"}</span></div>
                    <div><span className="text-[var(--text-muted)] block text-[10px]">TANGGAL / JADWAL</span><span className="font-bold text-[var(--text-primary)]">{selectedProject.workDate}</span></div>
                    <div><span className="text-[var(--text-muted)] block text-[10px]">GARANSI</span><span className="font-bold text-[var(--text-primary)]">{selectedProject.warrantyMonths > 0 ? `${selectedProject.warrantyMonths} bln` : "-"}</span></div>
                    <div><span className="text-[var(--text-muted)] block text-[10px]">LUAS AREA</span><span className="font-bold text-[var(--text-primary)]">{selectedProject.buildingAreaSqm ? `${selectedProject.buildingAreaSqm} m²` : "-"}</span></div>
                  </div>
                </div>
                <div className="rounded-xl overflow-hidden border border-[var(--border-subtle)] h-48 sm:h-auto">
                  <LocationMap 
                    projectName={selectedProject.projectName}
                    projectLat={selectedProject.latitude}
                    projectLng={selectedProject.longitude}
                    projectRadius={selectedProject.radius}
                  />
                </div>
              </div>
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Histori Laporan Pekerjaan</h4>
                <div className="space-y-2">
                  {reports.filter(r => r.project.id === selectedProject.id).length === 0 ? (
                    <div className="text-sm text-[var(--text-muted)] text-center py-6 bg-[var(--bg-tertiary)] rounded-xl border border-[var(--border-subtle)]">
                      Belum ada laporan untuk proyek ini.
                    </div>
                  ) : (
                    reports.filter(r => r.project.id === selectedProject.id).map(r => (
                      <div key={r.id} className="clean-card bg-[var(--bg-card)] p-3 sm:p-4 rounded-xl border border-[var(--border-subtle)] flex flex-col sm:flex-row gap-3 sm:items-center justify-between hover:border-slate-300 transition-colors">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wide ${(r.status === "COMPLETED" || r.status === "REVIEWED" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : r.status === "WORKING" ? "bg-blue-50 text-blue-700 border-blue-200" : r.status === "FLAGGED" ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-slate-50 text-slate-700 border-slate-200")}`}>
                              {STATUS_OPTIONS.find(s => s.value === r.status)?.label || r.status}
                            </span>
                            <span className="text-xs font-bold text-[var(--text-secondary)]">{new Date(r.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</span>
                          </div>
                          <div className="text-sm font-semibold text-[var(--text-primary)]">{r.executor.name}</div>
                          <div className="text-xs text-[var(--text-muted)]">Check-in: {r.checkInAt ? new Date(r.checkInAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "-"}</div>
                        </div>
                        <button 
                          onClick={() => { setSelectedProject(null); setSelectedReportId(r.id); }}
                          className="text-xs font-bold text-[var(--accent)] hover:text-[var(--accent-hover)] whitespace-nowrap bg-[var(--accent-muted)] px-3 py-1.5 rounded-lg shrink-0 text-center"
                        >
                          Lihat Detail
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {viewingPhoto && <PhotoViewerModal photo={viewingPhoto} onClose={() => setViewingPhoto(null)} />}
      {showChangePassword && <ChangePasswordModal onClose={() => setShowChangePassword(false)} />}
      </div>
    </div>
  );
};

const TabButton: React.FC<{ active: boolean; danger?: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, danger, onClick, children }) => (
  <button
    onClick={onClick}
    className={`px-3.5 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all whitespace-nowrap ${
      active
        ? danger ? 'bg-red-700 text-white ' : 'bg-slate-900 text-white '
        : danger ? 'text-red-700 hover:bg-red-50' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-slate-200/70'
    }`}
  >
    {children}
  </button>
);

const RiskConfigPanel: React.FC<{ config: RiskConfig | null; onSave: (partial: Partial<RiskConfig>) => Promise<void> }> = ({ config, onSave }) => {
  const [draft, setDraft] = useState<RiskConfig | null>(config);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => setDraft(config), [config]);

  if (!draft) return <div className="py-16 text-center text-sm text-[var(--text-muted)]">Memuat konfigurasi...</div>;

  const field = (key: keyof RiskConfig, label: string, unit: string) => (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-[var(--border-subtle)] last:border-0">
      <span className="text-xs text-[var(--text-secondary)]">{label}</span>
      <div className="flex items-center gap-1.5 shrink-0">
        <input
          type="number"
          value={draft[key] as number}
          onChange={e => setDraft(d => (d ? { ...d, [key]: Number(e.target.value) } : d))}
          className="w-20 px-2 py-1 text-xs text-right rounded-lg border border-[var(--border-subtle)] font-mono"
        />
        <span className="text-[11px] text-[var(--text-muted)] w-10">{unit}</span>
      </div>
    </div>
  );

  const handleSave = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      await onSave(draft);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="clean-card bg-[var(--bg-card)] p-5 rounded-xl border border-[var(--border-subtle)] ">
        <h3 className="font-bold text-sm text-[var(--text-primary)] mb-1">Ambang Batas Poin Risiko</h3>
        <p className="text-xs text-[var(--text-muted)] mb-3">Sesuai PRD Section 21 — nilai ini bisa disesuaikan tanpa mengubah kode.</p>
        {field('lateCheckinThresholdMinutes', 'Batas keterlambatan check-in', 'menit')}
        {field('lateCheckinPoints', 'Poin check-in terlambat', 'poin')}
        {field('outsideRadiusPoints', 'Poin GPS di luar radius', 'poin')}
        {field('shortDurationCriticalMinutes', 'Durasi sangat singkat (batas)', 'menit')}
        {field('shortDurationCriticalPoints', 'Poin durasi sangat singkat', 'poin')}
        {field('shortDurationWarningMinutes', 'Durasi singkat (batas)', 'menit')}
        {field('shortDurationWarningPoints', 'Poin durasi singkat', 'poin')}
      </div>
      <div className="clean-card bg-[var(--bg-card)] p-5 rounded-xl border border-[var(--border-subtle)] ">
        <h3 className="font-bold text-sm text-[var(--text-primary)] mb-1">Dokumentasi &amp; Level Risiko</h3>
        <p className="text-xs text-[var(--text-muted)] mb-3">Batas skor yang menentukan warna status pada dashboard.</p>
        {field('minTotalPhotos', 'Minimum total foto', 'foto')}
        {field('minTotalPhotosPoints', 'Poin foto kurang', 'poin')}
        {field('noProgressPhotoPoints', 'Poin tanpa foto progres', 'poin')}
        {field('locationDriftThresholdMeters', 'Batas pergeseran lokasi', 'meter')}
        {field('locationDriftPoints', 'Poin pergeseran lokasi', 'poin')}
        {field('missingTreatmentRecordPoints', 'Poin data treatment kosong', 'poin')}
        {field('fumigationMissingAerationPoints', 'Poin fumigasi tanpa data aerasi', 'poin')}
        {field('lowRiskThreshold', 'Ambang Risiko Rendah', 'skor')}
        {field('reviewThreshold', 'Ambang Perlu Ditinjau', 'skor')}
        {field('highRiskThreshold', 'Ambang Risiko Tinggi', 'skor')}
        {field('criticalThreshold', 'Ambang Kritis', 'skor')}
      </div>
      <div className="lg:col-span-2 flex items-center justify-end gap-3">
        {saved && <span className="text-xs font-semibold text-emerald-700">Tersimpan.</span>}
        <button onClick={handleSave} disabled={saving} className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-lg shadow-emerald-600/25 transition-all disabled:opacity-60 flex items-center gap-2">
          {saving && <Loader2 size={16} className="animate-spin" />} Simpan Konfigurasi
        </button>
      </div>
    </div>
  );
};

/**
 * Deletes old photo *files* to save storage — everything else (check-in/out
 * times, risk scores, treatment records, customer reviews, audit log) stays
 * forever. See backend-src/modules/photos/retention.ts for exactly what's
 * kept vs. deleted.
 */
const PhotoRetentionPanel: React.FC = () => {
  const [months, setMonths] = useState(2);
  const [preview, setPreview] = useState<PhotoPurgePreview | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(true);
  const [isPurging, setIsPurging] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadPreview = useCallback(async (m: number) => {
    setIsLoadingPreview(true);
    setError(null);
    try {
      const res = await fetchPhotoPurgePreview(m);
      setPreview(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal memuat perkiraan.');
    } finally {
      setIsLoadingPreview(false);
    }
  }, []);

  useEffect(() => {
    loadPreview(months);
  }, [months, loadPreview]);

  const handlePurge = async () => {
    setIsPurging(true);
    setError(null);
    try {
      const result = await purgeOldPhotos(months);
      setResultMessage(`${result.purgedCount} foto berhasil dihapus${result.failedCount > 0 ? `, ${result.failedCount} gagal` : ''}. Data laporan lainnya tidak berubah.`);
      setConfirmOpen(false);
      await loadPreview(months);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal menghapus foto.');
    } finally {
      setIsPurging(false);
    }
  };

  return (
    <div className="clean-card bg-[var(--bg-card)] p-5 rounded-xl border border-[var(--border-subtle)]">
      <h3 className="font-bold text-sm text-[var(--text-primary)] mb-1 flex items-center gap-2">
        <Trash2 size={16} className="text-rose-600" /> Retensi Penyimpanan Foto
      </h3>
      <p className="text-xs text-[var(--text-muted)] mb-4">
        Menghapus <strong>file foto</strong> yang lebih lama dari batas waktu di bawah untuk menghemat penyimpanan. Data laporan, GPS, timestamp, riwayat treatment, dan audit log <strong>tidak ikut terhapus</strong> — hanya gambarnya.
      </p>

      <div className="flex items-center gap-3 mb-4">
        <span className="text-xs font-semibold text-[var(--text-secondary)]">Hapus foto lebih lama dari:</span>
        <div className="flex gap-1.5">
          {[1, 2, 3, 6, 12].map(m => (
            <button
              key={m}
              onClick={() => setMonths(m)}
              className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-all ${
                months === m ? 'bg-rose-600 text-white border-rose-600' : 'bg-white text-[var(--text-secondary)] border-[var(--border-subtle)] hover:bg-[var(--bg-tertiary)]'
              }`}
            >
              {m} bulan
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 mb-3">{error}</p>}
      {resultMessage && <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 mb-3">{resultMessage}</p>}

      <div className="bg-[var(--bg-tertiary)] rounded-lg p-3.5 border border-[var(--border-subtle)] flex items-center justify-between">
        {isLoadingPreview ? (
          <span className="text-xs text-[var(--text-muted)]">Menghitung...</span>
        ) : preview ? (
          <div className="text-xs text-[var(--text-secondary)]">
            <span className="font-bold text-[var(--text-primary)] text-base">{preview.eligibleCount}</span> foto akan dihapus
            {preview.oldestPhotoDate && (
              <span> (paling lama: {new Date(preview.oldestPhotoDate).toLocaleDateString('id-ID')})</span>
            )}
          </div>
        ) : null}

        {!confirmOpen ? (
          <button
            onClick={() => setConfirmOpen(true)}
            disabled={isLoadingPreview || !preview || preview.eligibleCount === 0}
            className="text-xs font-bold px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Hapus Sekarang
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-rose-700">Yakin?</span>
            <button onClick={() => setConfirmOpen(false)} disabled={isPurging} className="text-xs px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] text-[var(--text-secondary)]">
              Batal
            </button>
            <button onClick={handlePurge} disabled={isPurging} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1.5 disabled:opacity-60">
              {isPurging && <Loader2 size={13} className="animate-spin" />} Ya, Hapus
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
