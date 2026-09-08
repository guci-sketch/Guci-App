import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { WorkReport, WorkReportListItem, Project, ExecutorStats, AuditLogEntry, RiskConfig, DocumentationPhoto, ReportFilters, DEFAULT_FILTERS } from '../../types';
import {
  fetchAdminReports, fetchAdminReportDetail, fetchAdminSummary, fetchExecutors, fetchAdminProjects,
  fetchAuditLogs, fetchRiskConfig, updateRiskConfig, reviewReport, downloadReportsCsv,
} from '../../api/admin';
import { ApiError } from '../../api/client';
import { RiskBadge } from '../common/RiskBadge';
import { LocationMap } from '../maps/LocationMap';
import { PhotoViewerModal } from '../common/PhotoViewerModal';
import { AuthedImage } from '../common/AuthedImage';
import { RISK_LEVEL_OPTIONS, STATUS_OPTIONS } from '../../utils/riskMeta';
import { SERVICE_TYPE_OPTIONS, getServiceTypeMeta, APPLICATION_METHOD_LABELS } from '../../utils/serviceMeta';
import {
  ShieldAlert, Search, Download, Clock, MapPin, UserCheck, CheckCircle2, AlertTriangle, Eye,
  SlidersHorizontal, X, Check, ChevronRight, Loader2, Settings2, Users, FlaskConical,
} from 'lucide-react';

type Tab = 'reports' | 'anomalies' | 'projects' | 'executors' | 'audit' | 'risk-config';

const DATE_PRESETS = [
  { id: 'all', label: 'Semua' },
  { id: 'today', label: 'Hari Ini' },
  { id: 'last7days', label: '7 Hari' },
  { id: 'last30days', label: '30 Hari' },
  { id: 'custom', label: 'Kustom' },
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

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('reports');
  const [reports, setReports] = useState<WorkReportListItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [executors, setExecutors] = useState<ExecutorStats[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[] | null>(null);
  const [riskConfig, setRiskConfig] = useState<RiskConfig | null>(null);
  const [kpi, setKpi] = useState({ totalJobs: 0, completedJobs: 0, workingJobs: 0, flaggedJobs: 0, highRiskCount: 0, avgDurationMinutes: 0, avgRiskScore: 0 });

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [datePreset, setDatePreset] = useState<string>('all');
  const [filters, setFilters] = useState<ReportFilters>(DEFAULT_FILTERS);
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [searchInput, setSearchInput] = useState('');

  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<WorkReport | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [viewingPhoto, setViewingPhoto] = useState<DocumentationPhoto | null>(null);
  const [adminReviewNotes, setAdminReviewNotes] = useState('');
  const [isReviewing, setIsReviewing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const effectiveFilters = useMemo<ReportFilters>(() => ({ ...filters, ...presetToRange(datePreset), search: searchInput }), [filters, datePreset, searchInput]);

  const loadReports = useCallback(async () => {
    try {
      const res = await fetchAdminReports(effectiveFilters);
      setReports(res.reports);
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
        const [summary, projectList, executorList] = await Promise.all([fetchAdminSummary(), fetchAdminProjects(), fetchExecutors()]);
        setKpi(summary);
        setProjects(projectList);
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

  return (
    <div className="flex flex-col min-h-screen bg-zinc-100 text-zinc-800">
      <div className="bg-white border-b border-zinc-200 px-4 sm:px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-zinc-900 text-white font-bold text-xs px-2 py-0.5 rounded">COMMAND</span>
              <span className="text-xs text-zinc-500 font-mono">PANEL PENGAWAS OPERASIONAL</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-900 mt-1">Monitoring Presensi &amp; Audit Lapangan</h1>
            <p className="text-xs text-zinc-500 mt-0.5">
              {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} &bull; Zona Waktu: WIB
            </p>
          </div>
          <button
            onClick={handleExportCsv}
            disabled={isExporting}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold transition-colors disabled:opacity-60"
          >
            {isExporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Unduh CSV
          </button>
        </div>
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-5">
        {isLoading && <div className="py-16 text-center text-sm text-zinc-400">Memuat dashboard...</div>}

        {loadError && !isLoading && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-center">
            <p className="text-sm text-rose-800 font-medium">{loadError}</p>
          </div>
        )}

        {!isLoading && (
          <>
            {/* KPI Strip (PRD Section 23) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-white p-4 rounded-lg border border-zinc-200">
                <span className="text-xs font-medium text-zinc-500 block">Total Penugasan (30 hari)</span>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-2xl font-bold font-mono text-zinc-900">{kpi.totalJobs}</span>
                  <span className="text-xs text-zinc-400">pekerjaan</span>
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg border border-zinc-200">
                <span className="text-xs font-medium text-emerald-700 block">Selesai Terverifikasi</span>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-2xl font-bold font-mono text-emerald-700">{kpi.completedJobs}</span>
                  <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {kpi.totalJobs > 0 ? Math.round((kpi.completedJobs / kpi.totalJobs) * 100) : 0}%
                  </span>
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg border border-zinc-200">
                <span className="text-xs font-medium text-zinc-700 block">Sedang Berlangsung</span>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-2xl font-bold font-mono text-zinc-900">{kpi.workingJobs}</span>
                  <span className="text-xs text-zinc-500">aktif di lapangan</span>
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg border border-rose-200 bg-rose-50/20">
                <span className="text-xs font-semibold text-rose-700 block flex items-center gap-1"><ShieldAlert size={14} /> Anomali Spasial</span>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-2xl font-bold font-mono text-rose-700">{kpi.flaggedJobs}</span>
                  <span className="text-xs font-medium text-rose-700 bg-rose-100 px-2 py-0.5 rounded border border-rose-200">{kpi.highRiskCount} Risiko Tinggi</span>
                </div>
              </div>
            </div>

            {kpi.flaggedJobs > 0 && (
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

            {/* Tabs */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-1 overflow-x-auto">
              <div className="flex gap-1 sm:gap-2 shrink-0">
                <TabButton active={activeTab === 'reports'} onClick={() => setActiveTab('reports')}>Semua Laporan ({reports.length})</TabButton>
                <TabButton active={activeTab === 'anomalies'} danger onClick={() => setActiveTab('anomalies')}>
                  <AlertTriangle size={14} className="inline mr-1" /> Anomali ({kpi.flaggedJobs})
                </TabButton>
                <TabButton active={activeTab === 'projects'} onClick={() => setActiveTab('projects')}>Proyek ({projects.length})</TabButton>
                <TabButton active={activeTab === 'executors'} onClick={() => setActiveTab('executors')}>
                  <Users size={14} className="inline mr-1" /> Pelaksana
                </TabButton>
                <TabButton active={activeTab === 'audit'} onClick={() => setActiveTab('audit')}>Audit Trail</TabButton>
                <TabButton active={activeTab === 'risk-config'} onClick={() => setActiveTab('risk-config')}>
                  <Settings2 size={14} className="inline mr-1" /> Konfigurasi Risiko
                </TabButton>
              </div>
            </div>

            {(activeTab === 'reports' || activeTab === 'anomalies') && (
              <div className="space-y-4">
                {/* Filter Bar */}
                <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm space-y-3">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="relative flex-1">
                      <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Cari pelaksana, nama proyek, atau alamat..."
                        value={searchInput}
                        onChange={e => setSearchInput(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      {searchInput && (
                        <button onClick={() => setSearchInput('')} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"><X size={14} /></button>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1">Tanggal:</span>
                      {DATE_PRESETS.map(preset => (
                        <button
                          key={preset.id}
                          onClick={() => setDatePreset(preset.id)}
                          className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-all ${
                            datePreset === preset.id ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                      <button
                        onClick={() => setShowFilterDrawer(!showFilterDrawer)}
                        className={`inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border font-semibold transition-all ${
                          showFilterDrawer ? 'bg-slate-800 text-white border-slate-800' : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                        }`}
                      >
                        <SlidersHorizontal size={14} /> Filter Lengkap
                      </button>
                    </div>
                  </div>

                  {showFilterDrawer && (
                    <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                      {datePreset === 'custom' && (
                        <>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Dari Tanggal</label>
                            <input type="date" value={filters.startDate ?? ''} onChange={e => setFilters(prev => ({ ...prev, startDate: e.target.value }))} className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white" />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Sampai Tanggal</label>
                            <input type="date" value={filters.endDate ?? ''} onChange={e => setFilters(prev => ({ ...prev, endDate: e.target.value }))} className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white" />
                          </div>
                        </>
                      )}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Rentang Jam Check-In</label>
                        <div className="flex items-center gap-1">
                          <input type="time" value={filters.timeStart ?? ''} onChange={e => setFilters(prev => ({ ...prev, timeStart: e.target.value }))} className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 bg-white font-mono" />
                          <span className="text-slate-400 text-xs">-</span>
                          <input type="time" value={filters.timeEnd ?? ''} onChange={e => setFilters(prev => ({ ...prev, timeEnd: e.target.value }))} className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 bg-white font-mono" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Pelaksana</label>
                        <select value={filters.executorId} onChange={e => setFilters(prev => ({ ...prev, executorId: e.target.value }))} className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white">
                          <option value="ALL">Semua Pelaksana</option>
                          {executors.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Proyek</label>
                        <select value={filters.projectId} onChange={e => setFilters(prev => ({ ...prev, projectId: e.target.value }))} className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white">
                          <option value="ALL">Semua Proyek</option>
                          {projects.map(p => <option key={p.id} value={p.id}>{p.projectName}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Level Risiko</label>
                        <select value={filters.riskLevel} onChange={e => setFilters(prev => ({ ...prev, riskLevel: e.target.value }))} className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white">
                          {RISK_LEVEL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Status</label>
                        <select value={filters.status} onChange={e => setFilters(prev => ({ ...prev, status: e.target.value }))} className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white">
                          {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Jenis Layanan</label>
                        <select value={filters.serviceType} onChange={e => setFilters(prev => ({ ...prev, serviceType: e.target.value }))} className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white">
                          {SERVICE_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {/* Desktop Table */}
                <div className="hidden md:block bg-white rounded-xl border border-slate-200/90 shadow-sm overflow-hidden">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
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
                        <tr><td colSpan={10} className="text-center py-10 text-slate-400">Tidak ada laporan yang sesuai dengan kriteria filter.</td></tr>
                      ) : (
                        visibleReports.map(report => {
                          const durationMin = report.durationSeconds ? Math.round(report.durationSeconds / 60) : 0;
                          const svcMeta = getServiceTypeMeta(report.project.serviceType);
                          const SvcIcon = svcMeta.icon;
                          return (
                            <tr key={report.id} className={`hover:bg-slate-50/80 transition-colors ${report.riskScore >= 40 ? 'bg-red-50/20' : ''}`}>
                              <td className="px-4 py-3 font-mono font-medium text-slate-600 whitespace-nowrap">{new Date(report.createdAt).toLocaleDateString('id-ID')}</td>
                              <td className="px-4 py-3"><span className="font-bold text-slate-900 block">{report.executor.name}</span></td>
                              <td className="px-4 py-3 max-w-xs">
                                <span className="font-bold text-slate-900 truncate block">{report.project.name}</span>
                                <span className="text-[11px] text-slate-500 truncate block">{report.project.clientName}</span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded border ${svcMeta.badgeClass}`}>
                                  <SvcIcon size={11} /> {svcMeta.shortLabel}
                                </span>
                                {report.treatmentSummary && (
                                  <span className="block text-[10px] text-slate-500 mt-0.5">{report.treatmentSummary.chemicalName}</span>
                                )}
                              </td>
                              <td className="px-4 py-3 font-mono whitespace-nowrap">
                                {report.checkInAt ? (
                                  <div>
                                    <span className="font-semibold text-slate-800">{new Date(report.checkInAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB</span>
                                    <span className={`block text-[10px] ${report.checkInValid ? 'text-emerald-600' : 'text-red-600 font-bold'}`}>
                                      {report.checkInValid ? '✓ Valid' : '⚠ Di Luar Radius'} ({report.checkInDistance}m)
                                    </span>
                                  </div>
                                ) : <span className="text-slate-400">-</span>}
                              </td>
                              <td className="px-4 py-3 font-mono whitespace-nowrap">
                                {report.checkOutAt ? (
                                  <span className="font-semibold text-slate-800">{new Date(report.checkOutAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB</span>
                                ) : report.status === 'WORKING' ? <span className="text-blue-600 font-bold">Sedang Kerja</span> : <span className="text-slate-400">-</span>}
                              </td>
                              <td className="px-4 py-3 font-mono whitespace-nowrap">
                                {report.durationSeconds ? <span>{Math.floor(durationMin / 60)}h {durationMin % 60}m</span> : <span className="text-slate-400">-</span>}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                                  report.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                                  report.status === 'WORKING' ? 'bg-blue-100 text-blue-800' :
                                  report.status === 'FLAGGED' ? 'bg-red-100 text-red-800 font-black' :
                                  report.status === 'REVIEWED' ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-700'
                                }`}>{report.status}</span>
                              </td>
                              <td className="px-4 py-3 text-center whitespace-nowrap"><RiskBadge level={report.riskLevel} score={report.riskScore} size="sm" /></td>
                              <td className="px-4 py-3 text-right whitespace-nowrap">
                                <button onClick={() => setSelectedReportId(report.id)} className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors inline-flex items-center gap-1">
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

                {/* Mobile Cards */}
                <div className="md:hidden space-y-3">
                  {visibleReports.length === 0 ? (
                    <div className="bg-white p-6 rounded-xl text-center text-xs text-slate-400">Tidak ada laporan yang sesuai.</div>
                  ) : (
                    visibleReports.map(report => {
                      const durationMin = report.durationSeconds ? Math.round(report.durationSeconds / 60) : 0;
                      const svcMeta = getServiceTypeMeta(report.project.serviceType);
                      const SvcIcon = svcMeta.icon;
                      return (
                        <div key={report.id} className={`bg-white p-4 rounded-xl border shadow-sm space-y-2.5 ${report.riskScore >= 40 ? 'border-red-300 bg-red-50/10' : 'border-slate-200'}`}>
                          <div className="flex items-center justify-between">
                            <RiskBadge level={report.riskLevel} score={report.riskScore} size="md" />
                            <span className="text-xs font-mono text-slate-400">{new Date(report.createdAt).toLocaleDateString('id-ID')}</span>
                          </div>
                          <div>
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded border mb-1 ${svcMeta.badgeClass}`}>
                              <SvcIcon size={11} /> {svcMeta.shortLabel}
                            </span>
                            <h4 className="font-bold text-sm text-slate-900">{report.executor.name}</h4>
                            <p className="text-xs text-slate-600 font-semibold mt-0.5">{report.project.name}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100 font-mono">
                            <div>
                              <span className="text-[10px] text-slate-400 block font-sans">CHECK-IN</span>
                              <span className="font-semibold text-slate-800">{report.checkInAt ? new Date(report.checkInAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'} WIB</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 block font-sans">CHECK-OUT</span>
                              <span className="font-semibold text-slate-800">{report.checkOutAt ? new Date(report.checkOutAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : report.status === 'WORKING' ? 'Sedang Kerja' : '-'}</span>
                            </div>
                            <div className="col-span-2 pt-1 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                              <span className="text-slate-500 font-sans">Durasi: {durationMin} min</span>
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
              </div>
            )}

            {activeTab === 'projects' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {projects.map(proj => {
                  const svcMeta = getServiceTypeMeta(proj.serviceType);
                  const SvcIcon = svcMeta.icon;
                  return (
                    <div key={proj.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded border mb-1 ${svcMeta.badgeClass}`}>
                            <SvcIcon size={11} /> {svcMeta.label}
                          </span>
                          <h3 className="font-bold text-base text-slate-900">{proj.projectName}</h3>
                          <p className="text-xs text-slate-500 font-medium">{proj.clientName}</p>
                        </div>
                        {proj.lockedAt ? (
                          <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">🔒 Terkunci</span>
                        ) : (
                          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">Terbuka</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 flex items-start gap-1.5"><MapPin size={14} className="text-slate-400 shrink-0 mt-0.5" /><span>{proj.address}</span></p>
                      {proj.pestTarget && <p className="text-xs text-slate-500">Sasaran: <span className="font-semibold text-slate-700">{proj.pestTarget}</span></p>}
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs grid grid-cols-2 gap-2">
                        <div><span className="text-slate-400 block text-[10px]">TANGGAL</span><span className="font-semibold text-slate-700">{proj.workDate}</span></div>
                        <div><span className="text-slate-400 block text-[10px]">RADIUS</span><span className="font-semibold text-slate-700">{proj.radius} meter</span></div>
                        <div><span className="text-slate-400 block text-[10px]">LUAS AREA</span><span className="font-semibold text-slate-700">{proj.buildingAreaSqm ? `${proj.buildingAreaSqm} m²` : '-'}</span></div>
                        <div><span className="text-slate-400 block text-[10px]">DIBUAT OLEH</span><span className="font-semibold text-slate-700">{proj.createdByName || '-'}</span></div>
                        <div><span className="text-slate-400 block text-[10px]">KONTRAK</span><span className="font-semibold text-slate-700">{proj.contractType === 'RECURRING' ? 'Berkala' : 'Sekali Layanan'}</span></div>
                        <div><span className="text-slate-400 block text-[10px]">GARANSI</span><span className="font-semibold text-slate-700">{proj.warrantyMonths > 0 ? `${proj.warrantyMonths} bulan` : '-'}</span></div>
                      </div>
                      {proj.contractType === 'RECURRING' && proj.nextServiceDate && (
                        <p className="text-[11px] text-sky-700 bg-sky-50 px-2.5 py-1 rounded border border-sky-200/60">
                          Layanan berikutnya: {new Date(proj.nextServiceDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === 'executors' && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
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
                      <tr key={ex.id} className="hover:bg-slate-50/80">
                        <td className="px-4 py-3"><span className="font-bold text-slate-900 block">{ex.name}</span><span className="text-[11px] text-slate-400">{ex.email}</span></td>
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
            )}

            {activeTab === 'audit' && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-4">
                <h3 className="font-bold text-sm text-slate-900 mb-3">Histori &amp; Rekam Jejak Audit Sistem</h3>
                {auditLogs === null ? (
                  <div className="py-8 text-center text-xs text-slate-400">Memuat...</div>
                ) : (
                  <div className="space-y-3">
                    {auditLogs.map(log => (
                      <div key={log.id} className="p-3 rounded-lg border border-slate-100 bg-slate-50 flex items-start justify-between gap-3 text-xs">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-slate-900">{log.userName}</span>
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-200 text-slate-700">{log.userRole}</span>
                            <span className="font-mono text-[10px] text-emerald-700 bg-emerald-100/70 px-1.5 py-0.2 rounded font-semibold">{log.action}</span>
                          </div>
                          <p className="text-slate-600">{log.details}</p>
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono whitespace-nowrap">{new Date(log.createdAt).toLocaleTimeString('id-ID')} WIB</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'risk-config' && (
              <RiskConfigPanel config={riskConfig} onSave={handleSaveRiskConfig} />
            )}
          </>
        )}
      </main>

      {/* Detail Modal */}
      {selectedReportId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 sm:p-6 backdrop-blur-xs overflow-y-auto" onClick={() => setSelectedReportId(null)}>
          <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6 text-slate-800" onClick={e => e.stopPropagation()}>
            {detailLoading && <div className="p-16 text-center text-sm text-slate-400">Memuat detail laporan...</div>}
            {!detailLoading && selectedReport && (
              <>
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
                  <div className="flex items-center gap-3">
                    <RiskBadge level={selectedReport.riskLevel} score={selectedReport.riskScore} size="lg" />
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">{selectedReport.projectName}</h2>
                      <p className="text-xs text-slate-500">
                        Pelaksana: <span className="font-semibold text-slate-700">{selectedReport.executorName}</span> • {new Date(selectedReport.createdAt).toLocaleDateString('id-ID')}
                      </p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedReportId(null)} className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"><X size={20} /></button>
                </div>

                <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200/80 text-xs">
                    <div><span className="text-slate-400 block text-[10px]">KLIEN</span><span className="font-bold text-slate-800">{selectedReport.clientName}</span></div>
                    <div><span className="text-slate-400 block text-[10px]">LAYANAN</span><span className="font-bold text-slate-800">{getServiceTypeMeta(selectedReport.serviceType).label}</span></div>
                    <div><span className="text-slate-400 block text-[10px]">STATUS</span><span className="font-bold text-slate-800">{selectedReport.status}</span></div>
                    <div><span className="text-slate-400 block text-[10px]">TOTAL DURASI</span><span className="font-bold text-slate-800">{selectedReport.durationSeconds ? `${Math.round(selectedReport.durationSeconds / 60)} menit` : '-'}</span></div>
                    {selectedReport.pestTarget && (
                      <div className="col-span-2"><span className="text-slate-400 block text-[10px]">SASARAN HAMA</span><span className="font-bold text-slate-800">{selectedReport.pestTarget}</span></div>
                    )}
                    {selectedReport.warrantyMonths > 0 && (
                      <div><span className="text-slate-400 block text-[10px]">GARANSI</span><span className="font-bold text-slate-800">{selectedReport.warrantyMonths} bulan</span></div>
                    )}
                    <div><span className="text-slate-400 block text-[10px]">JADWAL</span><span className="font-bold text-slate-800">{selectedReport.scheduledStartTime} WIB</span></div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5"><MapPin size={15} className="text-emerald-600" /> Validasi Geografis</h4>
                    <LocationMap
                      projectName={selectedReport.projectName}
                      projectLat={selectedReport.projectLatitude}
                      projectLng={selectedReport.projectLongitude}
                      projectRadius={selectedReport.projectRadius}
                      executorLat={selectedReport.checkInLatitude}
                      executorLng={selectedReport.checkInLongitude}
                      executorAccuracy={selectedReport.checkInAccuracy}
                      distanceMeters={selectedReport.checkInDistance}
                      isWithinRadius={selectedReport.checkInValid}
                      checkOutLat={selectedReport.checkOutLatitude}
                      checkOutLng={selectedReport.checkOutLongitude}
                      height="280px"
                    />
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5"><Clock size={15} className="text-emerald-600" /> Kronologi Waktu</h4>
                    <div className="relative pl-6 border-l-2 border-slate-200 space-y-4 text-xs">
                      <div className="relative">
                        <div className="absolute -left-[31px] top-0.5 w-3.5 h-3.5 rounded-full bg-slate-300 border-2 border-white" />
                        <span className="font-bold text-slate-700 font-mono">{selectedReport.scheduledStartTime} WIB</span>
                        <p className="text-slate-500">Jadwal target dimulainya pekerjaan</p>
                      </div>
                      {selectedReport.checkInAt && (
                        <div className="relative">
                          <div className={`absolute -left-[31px] top-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${selectedReport.checkInValid ? 'bg-emerald-500' : 'bg-red-500'}`} />
                          <span className="font-bold text-slate-900 font-mono">{new Date(selectedReport.checkInAt).toLocaleTimeString('id-ID')} WIB — CHECK-IN</span>
                          <p className="text-slate-600 mt-0.5">
                            {selectedReport.checkInValid ? '✓ Valid di dalam radius' : '⚠ Di luar radius proyek'} (Jarak: {selectedReport.checkInDistance}m, Akurasi: ±{selectedReport.checkInAccuracy}m)
                          </p>
                        </div>
                      )}
                      {selectedReport.photos.filter(p => p.photoType === 'PROGRESS').map((photo, idx) => (
                        <div key={photo.id} className="relative">
                          <div className="absolute -left-[31px] top-0.5 w-3.5 h-3.5 rounded-full bg-amber-500 border-2 border-white" />
                          <span className="font-bold text-slate-900 font-mono">{new Date(photo.capturedAt).toLocaleTimeString('id-ID')} WIB — DOKUMENTASI PROGRES #{idx + 1}</span>
                        </div>
                      ))}
                      {selectedReport.checkOutAt && (
                        <div className="relative">
                          <div className={`absolute -left-[31px] top-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${selectedReport.checkOutValid ? 'bg-blue-500' : 'bg-red-500'}`} />
                          <span className="font-bold text-slate-900 font-mono">{new Date(selectedReport.checkOutAt).toLocaleTimeString('id-ID')} WIB — CHECK-OUT</span>
                          <p className="text-slate-600 mt-0.5">Total durasi: {Math.round((selectedReport.durationSeconds || 0) / 60)} menit.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5 flex items-center gap-1.5"><FlaskConical size={15} className="text-emerald-600" /> Data Perlakuan (Treatment)</h4>
                    {!selectedReport.treatmentRecord ? (
                      <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl text-amber-800 text-xs flex items-center gap-2">
                        <AlertTriangle size={16} className="text-amber-600 shrink-0" />
                        <span>Belum ada data bahan, dosis, atau metode aplikasi yang tercatat untuk pekerjaan ini.</span>
                      </div>
                    ) : (
                      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 text-xs space-y-3">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div><span className="text-slate-400 block text-[10px]">METODE</span><span className="font-bold text-slate-800">{APPLICATION_METHOD_LABELS[selectedReport.treatmentRecord.applicationMethod]}</span></div>
                          <div><span className="text-slate-400 block text-[10px]">BAHAN/PRODUK</span><span className="font-bold text-slate-800">{selectedReport.treatmentRecord.chemicalName}</span></div>
                          <div><span className="text-slate-400 block text-[10px]">BAHAN AKTIF</span><span className="font-bold text-slate-800">{selectedReport.treatmentRecord.activeIngredient || '-'}</span></div>
                          <div><span className="text-slate-400 block text-[10px]">DOSIS</span><span className="font-bold text-slate-800">{selectedReport.treatmentRecord.dosage}</span></div>
                          {selectedReport.treatmentRecord.treatmentAreaSqm != null && (
                            <div><span className="text-slate-400 block text-[10px]">LUAS DIRAWAT</span><span className="font-bold text-slate-800">{selectedReport.treatmentRecord.treatmentAreaSqm} m²</span></div>
                          )}
                          {selectedReport.treatmentRecord.drillingPointsCount != null && (
                            <div><span className="text-slate-400 block text-[10px]">TITIK BOR/INJEKSI</span><span className="font-bold text-slate-800">{selectedReport.treatmentRecord.drillingPointsCount} titik</span></div>
                          )}
                        </div>

                        {selectedReport.serviceType === 'FUMIGATION' && (
                          <div className={`rounded-lg p-3 border ${selectedReport.treatmentRecord.aerationCompletedAt ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
                            <div className="flex items-center gap-1.5 mb-2">
                              <ShieldAlert size={14} className={selectedReport.treatmentRecord.aerationCompletedAt ? 'text-emerald-700' : 'text-rose-700'} />
                              <span className={`text-[11px] font-bold uppercase ${selectedReport.treatmentRecord.aerationCompletedAt ? 'text-emerald-800' : 'text-rose-800'}`}>Data Keselamatan Fumigasi</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div><span className="text-slate-400 block text-[10px]">FUMIGANT</span><span className="font-semibold text-slate-800">{selectedReport.treatmentRecord.fumigantType || '-'}</span></div>
                              <div><span className="text-slate-400 block text-[10px]">KONSENTRASI</span><span className="font-semibold text-slate-800">{selectedReport.treatmentRecord.gasConcentrationPpm != null ? `${selectedReport.treatmentRecord.gasConcentrationPpm} ppm` : '-'}</span></div>
                              <div><span className="text-slate-400 block text-[10px]">MULAI SEALING</span><span className="font-semibold text-slate-800">{selectedReport.treatmentRecord.sealingStartedAt ? new Date(selectedReport.treatmentRecord.sealingStartedAt).toLocaleString('id-ID') : '-'}</span></div>
                              <div>
                                <span className="text-slate-400 block text-[10px]">SELESAI AERASI</span>
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
                          <p className="text-slate-600 italic">&quot;{selectedReport.treatmentRecord.technicianNotes}&quot;</p>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5 flex items-center gap-1.5"><Eye size={15} className="text-emerald-600" /> Galeri Bukti Foto ({selectedReport.photos.length})</h4>
                    {selectedReport.photos.length === 0 ? (
                      <p className="text-xs text-slate-400">Belum ada foto.</p>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {selectedReport.photos.map(photo => (
                          <div key={photo.id} onClick={() => setViewingPhoto(photo)} className="group relative rounded-xl overflow-hidden border border-slate-200 shadow-sm cursor-pointer hover:border-emerald-500 transition-all aspect-video bg-black">
                            <AuthedImage path={photo.url} alt="evidence" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
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
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5 flex items-center gap-1.5"><ShieldAlert size={15} className="text-red-600" /> Analisis Anomali</h4>
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
                              <p className="text-slate-700">{evt.description}</p>
                              {evt.expectedValue && evt.actualValue && (
                                <div className="text-[11px] text-slate-500 font-mono mt-1">
                                  Standar: <span className="text-slate-800 font-semibold">{evt.expectedValue}</span> | Aktual: <span className="text-red-700 font-bold">{evt.actualValue}</span>
                                </div>
                              )}
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-base font-black text-red-700 font-mono">+{evt.points}</span>
                              <span className="block text-[10px] text-slate-400 font-semibold uppercase">Poin</span>
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
                    <div className="pt-4 border-t border-slate-200">
                      {!isReviewing ? (
                        <button onClick={() => setIsReviewing(true)} className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-sm">
                          <UserCheck size={16} /> Verifikasi / Tinjau Laporan Ini
                        </button>
                      ) : (
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                          <label className="block text-xs font-bold text-slate-700 uppercase">Catatan Verifikasi Admin *</label>
                          <textarea rows={2} placeholder="Contoh: Telah dikonfirmasi via telepon, GPS bergeser karena berada di ruang bawah tanah..." value={adminReviewNotes} onChange={e => setAdminReviewNotes(e.target.value)} className="w-full p-2.5 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-slate-800 resize-none bg-white" />
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => setIsReviewing(false)} className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 text-xs font-semibold hover:bg-slate-100">Batal</button>
                            <button onClick={handleAdminReview} disabled={!adminReviewNotes.trim()} className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm disabled:opacity-50">
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

      {viewingPhoto && <PhotoViewerModal photo={viewingPhoto} onClose={() => setViewingPhoto(null)} />}
    </div>
  );
};

const TabButton: React.FC<{ active: boolean; danger?: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, danger, onClick, children }) => (
  <button
    onClick={onClick}
    className={`px-3.5 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all whitespace-nowrap ${
      active
        ? danger ? 'bg-red-700 text-white shadow-sm' : 'bg-slate-900 text-white shadow-sm'
        : danger ? 'text-red-700 hover:bg-red-50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
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

  if (!draft) return <div className="py-16 text-center text-sm text-slate-400">Memuat konfigurasi...</div>;

  const field = (key: keyof RiskConfig, label: string, unit: string) => (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-slate-100 last:border-0">
      <span className="text-xs text-slate-600">{label}</span>
      <div className="flex items-center gap-1.5 shrink-0">
        <input
          type="number"
          value={draft[key] as number}
          onChange={e => setDraft(d => (d ? { ...d, [key]: Number(e.target.value) } : d))}
          className="w-20 px-2 py-1 text-xs text-right rounded-lg border border-slate-200 font-mono"
        />
        <span className="text-[11px] text-slate-400 w-10">{unit}</span>
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
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="font-bold text-sm text-slate-900 mb-1">Ambang Batas Poin Risiko</h3>
        <p className="text-xs text-slate-500 mb-3">Sesuai PRD Section 21 — nilai ini bisa disesuaikan tanpa mengubah kode.</p>
        {field('lateCheckinThresholdMinutes', 'Batas keterlambatan check-in', 'menit')}
        {field('lateCheckinPoints', 'Poin check-in terlambat', 'poin')}
        {field('outsideRadiusPoints', 'Poin GPS di luar radius', 'poin')}
        {field('shortDurationCriticalMinutes', 'Durasi sangat singkat (batas)', 'menit')}
        {field('shortDurationCriticalPoints', 'Poin durasi sangat singkat', 'poin')}
        {field('shortDurationWarningMinutes', 'Durasi singkat (batas)', 'menit')}
        {field('shortDurationWarningPoints', 'Poin durasi singkat', 'poin')}
      </div>
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="font-bold text-sm text-slate-900 mb-1">Dokumentasi &amp; Level Risiko</h3>
        <p className="text-xs text-slate-500 mb-3">Batas skor yang menentukan warna status pada dashboard.</p>
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
