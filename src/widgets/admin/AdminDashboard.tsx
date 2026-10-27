import { motion, AnimatePresence } from 'framer-motion';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  WorkReport,
  WorkReportListItem,
  Project,
  ExecutorStats,
  AuditLogEntry,
  RiskConfig,
  DocumentationPhoto,
  ReportFilters,
  DEFAULT_FILTERS,
  KPIStats,
  WorkReportStatus,
  Quotation,
} from '@/entities/types';
import {
  fetchAdminReports,
  fetchAdminReportDetail,
  fetchAdminSummary,
  fetchExecutors,
  fetchAdminProjects,
  fetchAuditLogs,
  fetchRiskConfig,
  updateRiskConfig,
  resetRiskConfig,
  reviewReport,
  downloadReportsCsv,
  fetchUsers,
  suspendUser,
  activateUser,
  deleteUser,
  createUser,
  AdminUser,
  fetchPhotoPurgePreview,
  purgeOldPhotos,
  PhotoPurgePreview,
} from '@/shared/api/admin';
import { getQuotations } from '@/shared/api/quotationService';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/shared/ui/alert-dialog';
import { Skeleton } from '@/shared/ui/skeleton';
import { fetchLatestLocations, UserLocation } from '@/shared/api/location';
import { ApiError } from '@/shared/api/client';
import { RiskBadge } from '../common/RiskBadge';
import { LocationMap } from '../maps/LocationMap';
import { AllProjectsMap } from '../maps/AllProjectsMap';
import { PhotoViewerModal } from '../common/PhotoViewerModal';
import { AuthedImage } from '../common/AuthedImage';
import { RISK_LEVEL_OPTIONS, STATUS_OPTIONS, getWorkReportStatusMeta } from '@/shared/utils/riskMeta';
import { exportTableToExcel, exportTableToPDF } from '@/shared/utils/exportUtils';
import { exportReportToPdf } from '@/shared/utils/pdfExport';
import { SERVICE_TYPE_OPTIONS, getServiceTypeMeta, APPLICATION_METHOD_LABELS } from '@/shared/utils/serviceMeta';
import {
  LayoutDashboard,
  RefreshCw,
  ShieldAlert,
  Search,
  Download,
  Clock,
  MapPin,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  Eye,
  SlidersHorizontal,
  X,
  Check,
  Loader2,
  Settings2,
  Users,
  FlaskConical,
  Trash2,
  Briefcase,
  Package,
  FileText,
  ShieldCheck,
  Palette,
  RotateCcw,
  Sun,
  Moon,
  Monitor,
  ArrowLeft,
  Lock,
  Plus,
  Copy,
} from 'lucide-react';

import { useAuth } from '@/app/providers/AuthContext';
import { ChangePasswordModal } from '../auth/ChangePasswordModal';
import { generateInvite } from '@/shared/api/auth';
import { TemplateSettingsPanel } from '@/widgets/admin/TemplateSettingsPanel';
import { CompanyPicker } from '@/widgets/admin/CompanyPicker';
import { OperationsAnalyticsBento, ExecutiveQuotationSummary } from '@/widgets/admin/OperationsAnalyticsBento';
import { isDirectorUser } from '@/shared/lib/roles';
import { useAuthStore } from '@/app/store/authStore';
import { useTheme } from '@/shared/hooks/useTheme';
import { InventoryPage } from '../../pages/inventory/InventoryPage';
import { KontrolRayapPage } from '../../pages/customers/KontrolRayapPage';
import { QuotationPage } from '../../pages/quotation/QuotationPage';
import { CustomersPage } from '../../pages/customers/CustomersPage';
import { TrackingPage } from '../../pages/tracking/TrackingPage';
import { CashflowPage } from '../../pages/cashflow/CashflowPage';
import { PerformaPage } from '../../pages/performance/PerformaPage';
import { SPKPage } from '../../pages/spk/SPKPage';
import { CompaniesPage } from '../../pages/super-admin/CompaniesPage';
import { Header } from '../common/Header';
import { AppLayout } from '../common/AppLayout';

type Tab =
  | 'dashboard'
  | 'reports'
  | 'anomalies'
  | 'projects'
  | 'executors'
  | 'audit'
  | 'risk-config'
  | 'tracking'
  | 'approval'
  | 'profile'
  | 'inventory'
  | 'quotation'
  | 'kontrol-rayap'
  | 'templates'
  | 'customers'
  | 'order-tracking'
  | 'cashflow'
  | 'performa'
  | 'spk-cms'
  | 'saas-companies';

const DATE_PRESETS = [
  { id: 'all', label: 'Semua' },
  { id: 'today', label: 'Hari Ini' },
  { id: 'last7days', label: '7 Hari' },
  { id: 'last30days', label: '30 Hari' },
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

const MotionDiv = motion.div as any;

const EMPTY_KPI: KPIStats = {
  totalJobs: 0,
  completedJobs: 0,
  workingJobs: 0,
  flaggedJobs: 0,
  highRiskCount: 0,
  avgDurationMinutes: 0,
  avgRiskScore: 0,
};

export const AdminDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, resolvedTheme, setTheme, options: themeOptions } = useTheme();
  const isAdmin = user?.role === 'SUPERADMIN' || user?.role === 'ADMIN';
  const isSuper = user?.role === 'SUPERADMIN';
  const isMasterSuper = user?.role === 'MASTER_SUPER_ADMIN';
  const isDirector = isDirectorUser(user);
  const activeCompanyId = useAuthStore(st => st.activeCompanyId) || user?.companyId || null;

  // Tab awal: SUPERADMIN & ADMIN langsung membuka Dashboard Utama ('dashboard') agar ringkasan langsung terlihat
  const [activeTab, setActiveTab] = useState<Tab>(
    user?.role === 'MASTER_SUPER_ADMIN'
      ? 'saas-companies'
      : user?.role === 'INVENTORY'
      ? 'inventory'
      : user?.role === 'SUPERADMIN' || user?.role === 'ADMIN'
      ? 'dashboard'
      : 'quotation'
  );

  useEffect(() => {
    if (user?.role === 'MASTER_SUPER_ADMIN' && activeTab !== 'saas-companies' && activeTab !== 'profile') {
      setActiveTab('saas-companies');
    }
  }, [user?.role, activeTab]);

  const [inviteRole, setInviteRole] = useState<AdminUser['role']>('TEKNISI_LAPANGAN');
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'TEKNISI_LAPANGAN' as AdminUser['role'],
    phone: '',
  });
  const [creatingUser, setCreatingUser] = useState(false);
  const [userSearchQ, setUserSearchQ] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [inviteLink, setInviteLink] = useState<{ url: string; expiresAt: string } | null>(null);
  const [isGeneratingInvite, setIsGeneratingInvite] = useState(false);
  const [reports, setReports] = useState<WorkReportListItem[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsError, setReportsError] = useState<string | null>(null);

  const [quotationsList, setQuotationsList] = useState<Quotation[]>([]);

  const [projects, setProjects] = useState<Project[]>([]);
  const [projectSearch, setProjectSearch] = useState('');
  const [projectServiceType, setProjectServiceType] = useState('ALL');
  const [projectStatus, setProjectStatus] = useState('ALL');
  const [projectPage, setProjectPage] = useState(1);
  const [projectTotalPages, setProjectTotalPages] = useState(1);
  const [projectTotalCount, setProjectTotalCount] = useState(0);

  const [executors, setExecutors] = useState<ExecutorStats[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[] | null>(null);
  const [riskConfig, setRiskConfig] = useState<RiskConfig | null>(null);
  const [userLocations, setUserLocations] = useState<UserLocation[]>([]);

  const [summaryData, setSummaryData] = useState<KPIStats | null>(null);
  const kpi = summaryData ?? EMPTY_KPI;

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshingSummary, setIsRefreshingSummary] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [staleRefreshError, setStaleRefreshError] = useState<string | null>(null);

  const [datePreset, setDatePreset] = useState<string>('all');
  const [filters, setFilters] = useState<ReportFilters>(DEFAULT_FILTERS);
  const [previousStatusFilter, setPreviousStatusFilter] = useState<string | null>(null);
  const [cameFromDashboard, setCameFromDashboard] = useState(false);
  const [previousFiltersSnapshot, setPreviousFiltersSnapshot] = useState<{
    filters: ReportFilters;
    datePreset: string;
    searchInput: string;
  } | null>(null);
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [searchInput, setSearchInput] = useState('');

  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedReport, setSelectedReport] = useState<WorkReport | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [viewingPhoto, setViewingPhoto] = useState<DocumentationPhoto | null>(null);
  const [adminReviewNotes, setAdminReviewNotes] = useState('');
  const [isReviewing, setIsReviewing] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Feedback banner & reversible undo state
  const [actionBanner, setActionBanner] = useState<{
    tone: 'success' | 'error' | 'info';
    message: string;
    undoLabel?: string;
    onUndo?: () => Promise<void> | void;
  } | null>(null);

  const loadProjects = useCallback(async () => {
    try {
      const res = await fetchAdminProjects({
        search: projectSearch,
        serviceType: projectServiceType,
        status: projectStatus,
        page: projectPage,
        limit: 8,
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
      const t = setTimeout(loadProjects, 300);
      return () => clearTimeout(t);
    }
  }, [loadProjects, activeTab]);

  /** Unduh Laporan Kunjungan (PDF) untuk laporan yang sedang dibuka. */
  const handleDownloadVisitReport = async () => {
    if (!selectedReport || pdfBusy) return;
    setPdfBusy(true);
    try {
      const companyId =
        user?.role === 'MASTER_SUPER_ADMIN' || user?.role === 'SUPERADMIN' ? activeCompanyId : user?.companyId;
      await exportReportToPdf(selectedReport, undefined, {
        companyId,
        createdBy: user?.name ?? selectedReport.executorName,
      });
    } catch (err) {
      console.error('[pdf] gagal membuat laporan kunjungan', err);
      setActionBanner({
        tone: 'error',
        message: 'Gagal membuat PDF laporan kunjungan. Periksa data laporan lalu coba lagi.',
      });
    } finally {
      setPdfBusy(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [filters, datePreset, searchInput]);

  const effectiveFilters = useMemo<ReportFilters>(
    () => ({ ...filters, ...presetToRange(datePreset), search: searchInput, page, limit: 20 }),
    [filters, datePreset, searchInput, page]
  );

  const loadReports = useCallback(async () => {
    if (!isAdmin || (isSuper && !activeCompanyId)) return;
    setReportsLoading(true);
    setReportsError(null);
    try {
      const res = await fetchAdminReports(effectiveFilters);
      setReports(res.reports);
      setTotalPages(res.totalPages || 1);
      setTotalCount(res.totalCount || res.reports.length);
    } catch (err) {
      setReportsError(
        err instanceof ApiError
          ? err.message
          : 'Daftar laporan belum dapat dimuat. Periksa koneksi internet Anda lalu coba lagi.'
      );
    } finally {
      setReportsLoading(false);
    }
  }, [effectiveFilters, isAdmin, isSuper, activeCompanyId]);

  useEffect(() => {
    if (!isAdmin || (isSuper && !activeCompanyId)) return;
    const t = setTimeout(loadReports, 300);
    return () => clearTimeout(t);
  }, [loadReports, isAdmin, isSuper, activeCompanyId]);

  const loadInitialDashboard = useCallback(async () => {
    if (!isAdmin || (isSuper && !activeCompanyId)) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setLoadError(null);
    setStaleRefreshError(null);
    try {
      const targetCompany = (isSuper ? activeCompanyId : user?.companyId) ?? '';
      const [summary, projectRes, executorList, quos, latestLocs] = await Promise.all([
        fetchAdminSummary(),
        fetchAdminProjects({ limit: 24, page: 1 }),
        fetchExecutors(),
        targetCompany ? getQuotations({ companyId: targetCompany }).catch(() => []) : Promise.resolve([]),
        fetchLatestLocations().catch(() => []),
      ]);
      setSummaryData(summary);
      setProjects(projectRes.projects);
      setProjectTotalPages(projectRes.totalPages || 1);
      setProjectTotalCount(projectRes.totalCount || projectRes.projects.length);
      setExecutors(executorList);
      setQuotationsList(quos);
      setUserLocations(latestLocs);
      await loadReports();
    } catch (err) {
      setLoadError(
        err instanceof ApiError
          ? err.message
          : 'Ringkasan operasional belum dapat dimuat. Periksa koneksi internet Anda lalu coba lagi.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin, isSuper, activeCompanyId, user?.companyId, loadReports]);

  // Reset state saat SUPERADMIN berpindah perusahaan agar data perusahaan lama tidak pernah ditampilkan sebagai data baru
  useEffect(() => {
    setSummaryData(null);
    setQuotationsList([]);
    setReports([]);
    setProjects([]);
    setExecutors([]);
    setAuditLogs(null);
    setRiskConfig(null);
    setAdminUsers([]);
    setSelectedReportId(null);
    setSelectedProject(null);
    setLoadError(null);
    setStaleRefreshError(null);
    void loadInitialDashboard();
  }, [isAdmin, isSuper, activeCompanyId, loadInitialDashboard]);

  const refreshSummaryAndReports = useCallback(async () => {
    if (!isAdmin || (isSuper && !activeCompanyId)) return;
    setIsRefreshingSummary(true);
    setStaleRefreshError(null);
    try {
      const targetCompany = (isSuper ? activeCompanyId : user?.companyId) ?? '';
      const [summary, quos] = await Promise.all([
        fetchAdminSummary(),
        targetCompany ? getQuotations({ companyId: targetCompany }).catch(() => quotationsList) : Promise.resolve([]),
        loadReports(),
      ]);
      setSummaryData(summary);
      setQuotationsList(quos);
      setLoadError(null);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : 'Pembaruan ringkasan gagal dimuat. Periksa koneksi internet Anda lalu coba lagi.';
      if (summaryData) {
        setStaleRefreshError(msg);
      } else {
        setLoadError(msg);
      }
    } finally {
      setIsRefreshingSummary(false);
    }
  }, [isAdmin, isSuper, activeCompanyId, user?.companyId, loadReports, summaryData, quotationsList]);

  const quotationSummary = useMemo<ExecutiveQuotationSummary | null>(() => {
    if (!isAdmin) return null;
    const totalQuotations = quotationsList.length;
    const draftCount = quotationsList.filter(q => q.status === 'draft' || q.status === 'pending').length;
    const approvedCount = quotationsList.filter(q => q.status === 'approved' || q.status === 'sent_to_client').length;
    const dealCount = quotationsList.filter(q => q.status === 'deal').length;
    return {
      totalQuotations,
      draftCount,
      approvedCount,
      dealCount,
      onOpenQuotations: () => setActiveTab('quotation'),
    };
  }, [isAdmin, quotationsList]);

  useEffect(() => {
    if (!isAdmin || (isSuper && !activeCompanyId)) return;
    if (activeTab === 'audit' && auditLogs === null) {
      fetchAuditLogs()
        .then(setAuditLogs)
        .catch(() => setAuditLogs([]));
    }
    if (activeTab === 'risk-config' && riskConfig === null) {
      fetchRiskConfig()
        .then(setRiskConfig)
        .catch(() => undefined);
    }
    if (activeTab === 'tracking') {
      fetchLatestLocations()
        .then(setUserLocations)
        .catch(() => setUserLocations([]));
    }
    if (activeTab === 'approval') {
      fetchUsers()
        .then(setAdminUsers)
        .catch(() => setAdminUsers([]));
    }
  }, [activeTab, auditLogs, riskConfig, isAdmin, isSuper, activeCompanyId]);

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

  const handleSelectStatusFromBento = useCallback(
    (nextStatus: string) => {
      setPreviousStatusFilter(filters.status);
      setFilters(prev => ({ ...prev, status: nextStatus }));
      if (nextStatus !== 'ALL') {
        setCameFromDashboard(true);
        setActiveTab(nextStatus === 'FLAGGED' ? 'anomalies' : 'reports');
      }
    },
    [filters.status]
  );

  const handleUndoStatusFilter = useCallback(() => {
    if (previousStatusFilter === null) return;
    setFilters(prev => ({ ...prev, status: previousStatusFilter }));
    setPreviousStatusFilter(null);
    if (cameFromDashboard) {
      setCameFromDashboard(false);
      setActiveTab('dashboard');
    }
  }, [previousStatusFilter, cameFromDashboard]);

  const handleResetAllFilters = useCallback(() => {
    setPreviousFiltersSnapshot({
      filters: { ...filters },
      datePreset,
      searchInput,
    });
    setFilters(DEFAULT_FILTERS);
    setDatePreset('all');
    setSearchInput('');
  }, [filters, datePreset, searchInput]);

  const handleUndoResetAllFilters = useCallback(() => {
    if (!previousFiltersSnapshot) return;
    setFilters(previousFiltersSnapshot.filters);
    setDatePreset(previousFiltersSnapshot.datePreset);
    setSearchInput(previousFiltersSnapshot.searchInput);
    setPreviousFiltersSnapshot(null);
  }, [previousFiltersSnapshot]);

  const hasActiveReportFilters =
    filters.status !== 'ALL' ||
    filters.riskLevel !== 'ALL' ||
    filters.executorId !== 'ALL' ||
    filters.projectId !== 'ALL' ||
    filters.serviceType !== 'ALL' ||
    Boolean(filters.startDate) ||
    Boolean(filters.endDate) ||
    Boolean(filters.timeStart) ||
    Boolean(filters.timeEnd) ||
    datePreset !== 'all' ||
    Boolean(searchInput.trim());

  const handleGenerateInvite = async (role: AdminUser['role']) => {
    const companyId = (isSuper ? activeCompanyId : user?.companyId) ?? null;
    if (!user || !companyId) {
      setActionBanner({ tone: 'error', message: 'Pilih perusahaan terlebih dahulu sebelum membuat link undangan.' });
      return;
    }
    try {
      setIsGeneratingInvite(true);
      const res = await generateInvite(role, { companyId, createdBy: user.uid });
      const url = `${window.location.origin}/signup?invite=${res.token}`;
      setInviteLink({ url, expiresAt: res.expiresAt.toLocaleString('id-ID') });
    } catch (err) {
      setActionBanner({
        tone: 'error',
        message: err instanceof Error ? err.message : 'Gagal membuat link undangan. Coba lagi.',
      });
    } finally {
      setIsGeneratingInvite(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (creatingUser) return;
    setCreatingUser(true);
    try {
      const created = await createUser({ ...newUser, phone: newUser.phone || undefined });
      setAdminUsers(prev => [created, ...prev]);
      setNewUser({ name: '', email: '', password: '', role: 'TEKNISI_LAPANGAN', phone: '' });
      setActionBanner({
        tone: 'success',
        message: `Akun ${created.email} berhasil dibuat. Bagikan email dan kata sandi awal kepada pengguna.`,
      });
    } catch (err) {
      setActionBanner({
        tone: 'error',
        message: err instanceof Error ? err.message : 'Gagal membuat akun pengguna. Periksa kembali data input.',
      });
    } finally {
      setCreatingUser(false);
    }
  };

  const handleActivate = async (targetUser: AdminUser) => {
    if (!isDirector && targetUser.role === 'ADMIN') {
      setActionBanner({
        tone: 'error',
        message: 'Admin tidak memiliki wewenang untuk mengubah status akun Admin lain. Hanya Direktur yang berwenang.',
      });
      return;
    }
    try {
      await activateUser(targetUser.id);
      setAdminUsers(prev => prev.map(u => (u.id === targetUser.id ? { ...u, is_active: true } : u)));
      setActionBanner({
        tone: 'success',
        message: `Akun ${targetUser.name} telah diaktifkan kembali.`,
        undoLabel: 'Urungkan',
        onUndo: async () => {
          await suspendUser(targetUser.id);
          setAdminUsers(prev => prev.map(u => (u.id === targetUser.id ? { ...u, is_active: false } : u)));
          setActionBanner(null);
        },
      });
    } catch (err) {
      setActionBanner({
        tone: 'error',
        message: err instanceof Error ? err.message : 'Gagal mengaktifkan akun pengguna.',
      });
    }
  };

  const handleSuspend = async (targetUser: AdminUser) => {
    if (!isDirector && targetUser.role === 'ADMIN') {
      setActionBanner({
        tone: 'error',
        message: 'Admin tidak memiliki wewenang untuk menonaktifkan akun Admin lainnya. Hanya Direktur yang berwenang.',
      });
      return;
    }
    try {
      await suspendUser(targetUser.id);
      setAdminUsers(prev => prev.map(u => (u.id === targetUser.id ? { ...u, is_active: false } : u)));
      setActionBanner({
        tone: 'info',
        message: `Akun ${targetUser.name} dinonaktifkan sementara.`,
        undoLabel: 'Urungkan (Aktifkan Kembali)',
        onUndo: async () => {
          await activateUser(targetUser.id);
          setAdminUsers(prev => prev.map(u => (u.id === targetUser.id ? { ...u, is_active: true } : u)));
          setActionBanner(null);
        },
      });
    } catch (err) {
      setActionBanner({
        tone: 'error',
        message: err instanceof Error ? err.message : 'Gagal menonaktifkan akun pengguna.',
      });
    }
  };

  const handleDeleteUser = async (id: string) => {
    const targetUser = adminUsers.find(u => u.id === id);
    if (!isDirector && targetUser?.role === 'ADMIN') {
      setActionBanner({
        tone: 'error',
        message: 'Admin tidak memiliki wewenang untuk menghapus akun Admin lainnya. Hanya Direktur yang berwenang.',
      });
      return;
    }
    try {
      await deleteUser(id);
      setAdminUsers(prev => prev.filter(u => u.id !== id));
      setActionBanner({ tone: 'success', message: 'Akun pengguna berhasil dihapus secara permanen.' });
    } catch (e: any) {
      setActionBanner({
        tone: 'error',
        message: e?.message || 'Gagal menghapus akun pengguna. Pastikan pengguna bukan satu-satunya Admin aktif.',
      });
    }
  };

  const handleExportExcel = () => {
    exportTableToExcel(reports, 'Laporan_FieldWork');
  };

  const handleExportPDF = () => {
    const cols = ['projectName', 'clientName', 'executorName', 'status', 'riskScore'];
    exportTableToPDF(reports, cols, 'Laporan Lapangan', 'Laporan_FieldWork');
  };

  const handleExportCsv = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      await downloadReportsCsv(effectiveFilters);
    } catch {
      setActionBanner({
        tone: 'error',
        message: 'Gagal mengekspor CSV. Periksa koneksi internet Anda lalu coba lagi.',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleAdminReview = async () => {
    if (!selectedReportId || !adminReviewNotes.trim() || isSubmittingReview) return;
    setIsSubmittingReview(true);
    try {
      const updated = await reviewReport(selectedReportId, adminReviewNotes.trim());
      setSelectedReport(updated);
      setIsReviewing(false);
      setAdminReviewNotes('');
      await refreshSummaryAndReports();
    } catch (err) {
      setActionBanner({
        tone: 'error',
        message: err instanceof Error ? err.message : 'Gagal menyimpan verifikasi laporan. Coba lagi.',
      });
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleSaveRiskConfig = async (partial: Partial<RiskConfig>) => {
    const updated = await updateRiskConfig(partial);
    setRiskConfig(updated);
  };

  const handleResetRiskConfigWithUndo = async () => {
    const previous = riskConfig ? { ...riskConfig } : null;
    const reset = await resetRiskConfig();
    setRiskConfig(reset);
    if (previous) {
      setActionBanner({
        tone: 'info',
        message: 'Konfigurasi poin risiko dikembalikan ke standar bawaan.',
        undoLabel: 'Urungkan',
        onUndo: async () => {
          const restored = await updateRiskConfig(previous);
          setRiskConfig(restored);
          setActionBanner(null);
        },
      });
    }
  };

  // Menu menggunakan Bahasa Indonesia yang jelas dan mudah dipahami; Dashboard ditempatkan paling atas untuk Direktur & Admin
  const isMarketingUser = user?.role === 'MARKETING';
  const ALL_ITEMS: {
    id: Tab;
    label: string;
    shortLabel: string;
    group: string;
    icon: React.ReactNode;
    danger?: boolean;
    badge?: number;
    roles: string[];
  }[] = [
    // KHUSUS MASTER SUPER ADMIN
    {
      id: 'saas-companies',
      label: 'Kelola Perusahaan & Token Superadmin',
      shortLabel: 'Perusahaan SaaS',
      group: 'KONSOL PLATFORM SAAS',
      icon: <ShieldCheck size={16} />,
      roles: ['MASTER_SUPER_ADMIN'],
    },

    // UTAMA: DASHBOARD BERADA DI URUTAN PALING ATAS UNTUK DIREKTUR & ADMIN
    {
      id: 'dashboard',
      label: isDirector ? 'Dashboard Utama & KPI' : 'Dashboard Ringkasan',
      shortLabel: 'Dashboard',
      group: isDirector ? '1. RINGKASAN & APPROVAL' : '1. PENAWARAN & PELANGGAN',
      icon: <LayoutDashboard size={16} />,
      roles: ['SUPERADMIN', 'ADMIN'],
    },

    // GRUP 1: PENAWARAN & PELANGGAN
    {
      id: 'quotation',
      label: isDirector ? 'Approval & Pantau Penawaran' : 'Buat & Cek Penawaran',
      shortLabel: isDirector ? 'Approval PH' : 'Penawaran',
      group: isDirector ? '1. RINGKASAN & APPROVAL' : '1. PENAWARAN & PELANGGAN',
      icon: <FileText size={16} />,
      roles: ['SUPERADMIN', 'ADMIN', 'MARKETING'],
    },
    {
      id: 'customers',
      label: 'Data Pelanggan & Kontrol',
      shortLabel: 'Pelanggan',
      group: '1. PENAWARAN & PELANGGAN',
      icon: <Users size={16} />,
      roles: ['ADMIN', 'MARKETING'],
    },
    {
      id: 'kontrol-rayap',
      label: 'Jadwal Garansi Rayap',
      shortLabel: 'Garansi',
      group: '1. PENAWARAN & PELANGGAN',
      icon: <AlertTriangle size={16} />,
      roles: ['ADMIN', 'MARKETING'],
    },
    {
      id: 'spk-cms',
      label: 'Perintah Kerja (SPK)',
      shortLabel: 'SPK',
      group: '1. PENAWARAN & PELANGGAN',
      icon: <Briefcase size={16} />,
      roles: ['ADMIN', 'MARKETING'],
    },

    // GRUP 2: PEMANTAUAN & VERIFIKASI LAPORAN LAPANGAN
    {
      id: 'projects',
      label: 'Lokasi & Daftar Proyek',
      shortLabel: 'Proyek',
      group: '2. PEKERJAAN LAPANGAN',
      icon: <Briefcase size={16} />,
      roles: ['ADMIN', 'MARKETING', 'INVENTORY'],
    },
    {
      id: 'reports',
      label: 'Hasil Kerja Teknisi',
      shortLabel: 'Hasil Kerja',
      group: isDirector ? '2. PANTAU LAPORAN & P/L' : '2. PEKERJAAN LAPANGAN',
      icon: <CheckCircle2 size={16} />,
      roles: ['SUPERADMIN', 'ADMIN'],
    },
    {
      id: 'anomalies',
      label: isDirector ? 'Verifikasi Laporan Anomali' : 'Laporan Perlu Dicek',
      shortLabel: 'Perlu Cek',
      group: isDirector ? '1. RINGKASAN & APPROVAL' : '2. PEKERJAAN LAPANGAN',
      icon: <ShieldAlert size={16} />,
      danger: true,
      badge: kpi.flaggedJobs > 0 ? kpi.flaggedJobs : undefined,
      roles: ['SUPERADMIN', 'ADMIN'],
    },
    {
      id: 'executors',
      label: 'Kinerja Teknisi',
      shortLabel: 'Teknisi',
      group: isDirector ? '2. PANTAU LAPORAN & P/L' : '2. PEKERJAAN LAPANGAN',
      icon: <Users size={16} />,
      roles: ['SUPERADMIN', 'ADMIN'],
    },
    {
      id: 'tracking',
      label: 'Lacak Posisi Teknisi',
      shortLabel: 'Peta Teknisi',
      group: '2. PEKERJAAN LAPANGAN',
      icon: <MapPin size={16} />,
      roles: ['ADMIN'],
    },

    // GRUP 3: ANALISIS UNTUNG RUGI & PERFORMA
    {
      id: 'inventory',
      label: isDirector ? 'Analisis Untung Rugi Proyek' : 'Stok Obat & Alokasi Proyek',
      shortLabel: isDirector ? 'Untung Rugi' : 'Stok & Proyek',
      group: isDirector ? '2. PANTAU LAPORAN & P/L' : '3. STOK OBAT & KEUANGAN',
      icon: <Package size={16} />,
      roles: ['SUPERADMIN', 'ADMIN', 'INVENTORY'],
    },
    {
      id: 'order-tracking',
      label: 'Tagihan & Cicilan Klien',
      shortLabel: 'Tagihan',
      group: '3. STOK OBAT & KEUANGAN',
      icon: <Clock size={16} />,
      roles: ['ADMIN', 'MARKETING'],
    },
    {
      id: 'cashflow',
      label: 'Laporan Pemasukan & Cashflow',
      shortLabel: 'Pemasukan',
      group: isDirector ? '2. PANTAU LAPORAN & P/L' : '3. STOK OBAT & KEUANGAN',
      icon: <SlidersHorizontal size={16} />,
      roles: ['SUPERADMIN', 'ADMIN'],
    },
    {
      id: 'performa',
      label: isMarketingUser ? 'Persentase Performa (MoM)' : 'Performa MoM & Capaian',
      shortLabel: 'Performa %',
      group: isDirector ? '2. PANTAU LAPORAN & P/L' : '3. STOK OBAT & KEUANGAN',
      icon: <CheckCircle2 size={16} />,
      roles: ['SUPERADMIN', 'ADMIN', 'MARKETING'],
    },

    // GRUP 4: PENGATURAN SENSITIF PERUSAHAAN
    {
      id: 'templates',
      label: 'Kop Surat & TTD Direktur',
      shortLabel: 'Kop & TTD',
      group: isDirector ? '3. SETUP PERUSAHAAN' : '4. PENGATURAN',
      icon: <Palette size={16} />,
      roles: ['SUPERADMIN', 'ADMIN'],
    },
    {
      id: 'approval',
      label: 'Kelola Akun Staf',
      shortLabel: 'Akun Staf',
      group: isDirector ? '3. SETUP PERUSAHAAN' : '4. PENGATURAN',
      icon: <UserCheck size={16} />,
      roles: ['SUPERADMIN', 'ADMIN'],
    },
    {
      id: 'risk-config',
      label: 'Aturan Poin Kehadiran',
      shortLabel: 'Aturan Poin',
      group: '4. PENGATURAN',
      icon: <Settings2 size={16} />,
      roles: ['ADMIN'],
    },
    {
      id: 'audit',
      label: 'Riwayat Audit Sistem',
      shortLabel: 'Audit',
      group: isDirector ? '3. SETUP PERUSAHAAN' : '4. PENGATURAN',
      icon: <Clock size={16} />,
      roles: ['SUPERADMIN', 'ADMIN'],
    },
    {
      id: 'profile',
      label: 'Profil Saya',
      shortLabel: 'Profil',
      group: isMasterSuper ? 'KONSOL PLATFORM SAAS' : isDirector ? '3. SETUP PERUSAHAAN' : '4. PENGATURAN',
      icon: <UserCheck size={16} />,
      roles: ['MASTER_SUPER_ADMIN', 'SUPERADMIN', 'ADMIN', 'MARKETING', 'INVENTORY'],
    },
  ];

  const sidebarItems = ALL_ITEMS.filter(i => user && i.roles.includes(user.role));
  const currentTabMeta = sidebarItems.find(i => i.id === activeTab) ?? sidebarItems[0];

  const handleHeaderRefresh = useCallback(() => {
    if (activeTab === 'projects') {
      void loadProjects();
      return;
    }
    if (activeTab === 'dashboard') {
      void refreshSummaryAndReports();
      return;
    }
    if (activeTab === 'reports' || activeTab === 'anomalies') {
      void loadReports();
      return;
    }
    if (activeTab === 'tracking') {
      void fetchLatestLocations().then(setUserLocations);
      return;
    }
    if (activeTab === 'audit') {
      void fetchAuditLogs().then(setAuditLogs);
      return;
    }
    if (activeTab === 'approval') {
      void fetchUsers().then(setAdminUsers);
      return;
    }
    void refreshSummaryAndReports();
  }, [activeTab, loadProjects, loadReports, refreshSummaryAndReports]);

  // Konfigurasi kompatibilitas indikator mobile bottom navigation (dipertahankan untuk invariant showFloatingBottom = true)
  const showFloatingBottom = true;

  return (
    <AppLayout
      sidebarItems={sidebarItems}
      activeTab={activeTab}
      onTabChange={id => {
        setCameFromDashboard(false);
        setActiveTab(id as Tab);
      }}
      isSidebarOpen={mobileMenuOpen}
      onSidebarOpenChange={setMobileMenuOpen}
      header={
        <Header
          currentUser={user!}
          onLogout={logout}
          onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
          mobileMenuOpen={mobileMenuOpen}
          pageTitle={currentTabMeta?.label ?? 'PT Guci Emas Pratama'}
          pageGroup={currentTabMeta?.group}
          onRefresh={handleHeaderRefresh}
          modules={sidebarItems}
          activeModuleId={activeTab}
          onSelectModule={id => {
            setCameFromDashboard(false);
            setActiveTab(id as Tab);
          }}
        />
      }
      dynamicIslandItems={showFloatingBottom ? [] : []}
      sidebarHeader={
        <div>
          <h2 className="text-xs font-black tracking-tight text-[var(--text-primary)] leading-tight mb-0.5">
            Field<span className="text-[var(--accent-text)]">Work</span>
          </h2>
          <p className="text-[11px] text-[var(--text-muted)]">
            {new Date().toLocaleDateString('id-ID', {
              weekday: 'long',
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </p>
          {isSuper && <CompanyPicker />}
        </div>
      }
    >
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
        {isSuper && !activeCompanyId && (
          <div
            role="status"
            className="p-4 rounded-xl border border-[var(--status-draft-border)] bg-[var(--status-draft-bg)] text-sm text-[var(--status-draft-text)]"
          >
            Pilih perusahaan yang akan dikelola pada menu di sidebar untuk mulai melihat ringkasan operasional dan mengatur template.
          </div>
        )}

        {/* Global Action / Undo Feedback Banner */}
        {actionBanner && (
          <div
            role="status"
            aria-live="polite"
            className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs sm:text-sm ${
              actionBanner.tone === 'error'
                ? 'bg-[var(--status-flagged-bg)] border-[var(--status-flagged-border)] text-[var(--status-flagged-text)]'
                : actionBanner.tone === 'success'
                ? 'bg-[var(--status-completed-bg)] border-[var(--status-completed-border)] text-[var(--status-completed-text)]'
                : 'bg-[var(--bg-card)] border-[var(--border-subtle)] text-[var(--text-primary)]'
            }`}
          >
            <span className="font-medium">{actionBanner.message}</span>
            <div className="flex items-center gap-2 shrink-0">
              {actionBanner.onUndo && actionBanner.undoLabel && (
                <button
                  type="button"
                  onClick={() => void actionBanner.onUndo?.()}
                  className="px-3 py-1 rounded-lg bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--border-subtle)] font-semibold hover:bg-[var(--bg-tertiary)] transition-colors inline-flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw size={12} aria-hidden="true" />
                  <span>{actionBanner.undoLabel}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setActionBanner(null)}
                aria-label="Tutup pesan status"
                className="p-1 rounded-lg hover:bg-black/5 transition-colors cursor-pointer"
              >
                <X size={14} aria-hidden="true" />
              </button>
            </div>
          </div>
        )}

        {/* Tab Dashboard: Fokus HANYA pada Data & Visual Penting (Tanpa Tabel Panjang yang Menumpuk di Bawah) */}
        {activeTab === 'dashboard' && (
          <OperationsAnalyticsBento
            summary={summaryData}
            quotationSummary={quotationSummary}
            reports={reports}
            projects={projects}
            executors={executors}
            quotations={quotationsList}
            userLocations={userLocations}
            companyDisplayName={user?.name || 'Gucimas Pratama'}
            isLoading={isLoading}
            isRefreshing={isRefreshingSummary}
            error={loadError}
            staleRefreshError={staleRefreshError}
            activeStatusFilter={filters.status}
            previousStatusFilter={previousStatusFilter}
            onRetry={loadInitialDashboard}
            onRefresh={refreshSummaryAndReports}
            onSelectStatusFilter={handleSelectStatusFromBento}
            onUndoStatusFilter={handleUndoStatusFilter}
            onOpenAnomaliesTab={() => {
              setCameFromDashboard(true);
              setActiveTab('anomalies');
            }}
            onOpenReportsTab={() => {
              setCameFromDashboard(true);
              setActiveTab('reports');
            }}
            onOpenExecutorsTab={() => {
              setCameFromDashboard(true);
              setActiveTab('executors');
            }}
            onOpenProjectsTab={() => {
              setCameFromDashboard(true);
              setActiveTab('projects');
            }}
            onOpenQuotationsTab={() => {
              setCameFromDashboard(true);
              setActiveTab('quotation');
            }}
            onOpenCustomersTab={() => {
              setCameFromDashboard(true);
              setActiveTab('customers');
            }}
            onOpenReportDetail={id => setSelectedReportId(id)}
          />
        )}

        {/* Non-dashboard loading & error states */}
        {activeTab !== 'dashboard' && isLoading && (
          <div className="clean-card p-6 space-y-3" aria-busy="true">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        )}

        {activeTab !== 'dashboard' && loadError && !isLoading && (
          <div
            role="alert"
            className="bg-[var(--status-flagged-bg)] border border-[var(--status-flagged-border)] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <p className="text-xs sm:text-sm text-[var(--status-flagged-text)] font-medium">{loadError}</p>
            <button
              type="button"
              onClick={loadInitialDashboard}
              className="self-start sm:self-auto px-3.5 py-1.5 rounded-lg bg-[var(--accent)] text-white text-xs font-semibold hover:bg-[var(--accent-hover)] transition-colors cursor-pointer"
            >
              Coba Lagi
            </button>
          </div>
        )}

        {!isLoading && (
          <AnimatePresence mode="wait">
            <MotionDiv
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {(activeTab === 'reports' || activeTab === 'anomalies') && (
                <div className="space-y-4">
                  {/* Navigasi Kembali & Undo jika pengguna masuk dari klik status di Dashboard */}
                  {cameFromDashboard && (
                    <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)]">
                      <button
                        type="button"
                        onClick={() => {
                          setCameFromDashboard(false);
                          setActiveTab('dashboard');
                        }}
                        className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[var(--text-primary)] hover:text-[var(--accent-text)] transition-colors cursor-pointer"
                      >
                        <ArrowLeft size={15} aria-hidden="true" />
                        <span>Kembali ke Dashboard</span>
                      </button>
                      {previousStatusFilter !== null && (
                        <button
                          type="button"
                          onClick={handleUndoStatusFilter}
                          className="px-3 py-1 rounded-lg bg-[var(--bg-tertiary)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                        >
                          Urungkan Filter Status
                        </button>
                      )}
                    </div>
                  )}

                  {activeTab === 'anomalies' && (
                    <div className="bg-[var(--status-flagged-bg)] border border-[var(--status-flagged-border)] rounded-xl p-4 mb-4">
                      <h3 className="text-sm font-bold text-[var(--status-flagged-text)] mb-1.5">
                        Informasi &amp; Kriteria Anomali
                      </h3>
                      <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                        Sistem mendeteksi sebuah penugasan sebagai <strong>Anomali</strong> apabila memenuhi salah satu dari kriteria berikut sesuai konfigurasi perusahaan:
                      </p>
                      <ul className="list-disc list-inside text-xs sm:text-sm text-[var(--text-secondary)] mt-2 space-y-1 ml-1">
                        <li>
                          Radius Check-In &amp; Check-Out melebihi toleransi (maks.{' '}
                          {riskConfig?.locationDriftThresholdMeters || 200} meter).
                        </li>
                        <li>
                          Durasi pekerjaan terlalu singkat (kurang dari{' '}
                          {riskConfig?.shortDurationCriticalMinutes || 15} menit).
                        </li>
                        <li>Pekerjaan tidak memiliki foto progres pekerjaan atau data treatment.</li>
                      </ul>
                    </div>
                  )}

                  {/* Filter Bar */}
                  <div className="clean-card p-4 sm:p-5 space-y-3.5">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="relative flex-1">
                        <Search
                          size={16}
                          className="absolute left-3.5 top-3 text-[var(--text-muted)]"
                          aria-hidden="true"
                        />
                        <input
                          type="text"
                          aria-label="Cari pelaksana, nama proyek, atau alamat"
                          placeholder="Cari pelaksana, nama proyek, atau alamat..."
                          value={searchInput}
                          onChange={e => setSearchInput(e.target.value)}
                          className="w-full pl-9 pr-8 py-2 bg-[var(--bg-tertiary)] rounded-xl border border-[var(--border-subtle)] text-xs sm:text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                        />
                        {searchInput && (
                          <button
                            type="button"
                            aria-label="Bersihkan pencarian"
                            onClick={() => setSearchInput('')}
                            className="absolute right-3 top-2.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                          >
                            <X size={14} aria-hidden="true" />
                          </button>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-semibold text-[var(--text-muted)] mr-1">
                          Periode:
                        </span>
                        {DATE_PRESETS.map(preset => (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => setDatePreset(preset.id)}
                            aria-pressed={datePreset === preset.id}
                            className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-all cursor-pointer ${
                              datePreset === preset.id
                                ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-xs'
                                : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:bg-[var(--bg-tertiary)]'
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => setShowFilterDrawer(!showFilterDrawer)}
                          aria-expanded={showFilterDrawer}
                          className={`inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border font-semibold transition-all cursor-pointer ${
                            showFilterDrawer
                              ? 'bg-[var(--text-primary)] text-[var(--bg-primary)] border-[var(--text-primary)]'
                              : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:text-[var(--text-primary)]'
                          }`}
                        >
                          <span>Filter Lengkap</span>
                        </button>

                        {hasActiveReportFilters && (
                          <button
                            type="button"
                            onClick={handleResetAllFilters}
                            className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] font-semibold transition-colors cursor-pointer"
                          >
                            <span>Reset</span>
                          </button>
                        )}

                        {previousFiltersSnapshot && !hasActiveReportFilters && (
                          <button
                            type="button"
                            onClick={handleUndoResetAllFilters}
                            className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-[var(--border-focus)] bg-[var(--accent-glow)] text-[var(--accent-text)] font-semibold transition-colors cursor-pointer"
                          >
                            <span>Urungkan Reset</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={handleExportPDF}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-xs font-semibold transition-colors btn-tactile cursor-pointer"
                          title="Unduh Laporan (PDF)"
                        >
                          Unduh PDF
                        </button>
                        <button
                          type="button"
                          onClick={handleExportExcel}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-xs font-semibold transition-colors btn-tactile cursor-pointer"
                          title="Unduh Laporan (Excel)"
                        >
                          Unduh Excel
                        </button>
                        <button
                          type="button"
                          onClick={handleExportCsv}
                          disabled={isExporting}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-semibold transition-colors disabled:opacity-60 cursor-pointer"
                          title="Unduh Laporan (CSV)"
                        >
                          {isExporting ? 'Mengunduh...' : 'Unduh CSV'}
                        </button>
                      </div>
                    </div>

                    {showFilterDrawer && (
                      <div className="pt-3 border-t border-[var(--border-subtle)] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                            Dari Tanggal
                          </label>
                          <input
                            type="date"
                            value={filters.startDate ?? ''}
                            onChange={e => {
                              setFilters(prev => ({ ...prev, startDate: e.target.value }));
                              setDatePreset('custom');
                            }}
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-primary)]"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                            Sampai Tanggal
                          </label>
                          <input
                            type="date"
                            value={filters.endDate ?? ''}
                            onChange={e => {
                              setFilters(prev => ({ ...prev, endDate: e.target.value }));
                              setDatePreset('custom');
                            }}
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-primary)]"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                            Rentang Jam Check-In
                          </label>
                          <div className="flex items-center gap-1">
                            <input
                              type="time"
                              aria-label="Jam check-in mulai"
                              value={filters.timeStart ?? ''}
                              onChange={e => setFilters(prev => ({ ...prev, timeStart: e.target.value }))}
                              className="w-full px-2 py-1.5 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-primary)] font-mono"
                            />
                            <span className="text-[var(--text-muted)] text-xs">-</span>
                            <input
                              type="time"
                              aria-label="Jam check-in selesai"
                              value={filters.timeEnd ?? ''}
                              onChange={e => setFilters(prev => ({ ...prev, timeEnd: e.target.value }))}
                              className="w-full px-2 py-1.5 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-primary)] font-mono"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                            Pelaksana
                          </label>
                          <select
                            value={filters.executorId}
                            onChange={e => setFilters(prev => ({ ...prev, executorId: e.target.value }))}
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-primary)]"
                          >
                            <option value="ALL">Semua Pelaksana</option>
                            {executors.map(u => (
                              <option key={u.id} value={u.id}>
                                {u.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                            Proyek
                          </label>
                          <select
                            value={filters.projectId}
                            onChange={e => setFilters(prev => ({ ...prev, projectId: e.target.value }))}
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-primary)]"
                          >
                            <option value="ALL">Semua Proyek</option>
                            {projects.map(p => (
                              <option key={p.id} value={p.id}>
                                {p.projectName}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                            Level Risiko
                          </label>
                          <select
                            value={filters.riskLevel}
                            onChange={e => setFilters(prev => ({ ...prev, riskLevel: e.target.value }))}
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-primary)]"
                          >
                            {RISK_LEVEL_OPTIONS.map(o => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                            Status Laporan
                          </label>
                          <select
                            value={filters.status}
                            onChange={e => setFilters(prev => ({ ...prev, status: e.target.value }))}
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-primary)]"
                          >
                            {STATUS_OPTIONS.map(o => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                            Jenis Layanan
                          </label>
                          <select
                            value={filters.serviceType}
                            onChange={e => setFilters(prev => ({ ...prev, serviceType: e.target.value }))}
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-primary)]"
                          >
                            {SERVICE_TYPE_OPTIONS.map(o => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Reports Error State */}
                  {reportsError && (
                    <div
                      role="alert"
                      className="p-4 rounded-xl bg-[var(--status-flagged-bg)] border border-[var(--status-flagged-border)] text-[var(--status-flagged-text)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm"
                    >
                      <span>{reportsError}</span>
                      <button
                        type="button"
                        onClick={() => void loadReports()}
                        className="self-start sm:self-auto px-3 py-1.5 rounded-lg bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--border-subtle)] font-semibold hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
                      >
                        Coba Lagi
                      </button>
                    </div>
                  )}

                  {/* Desktop Table */}
                  <div className="hidden md:block clean-card bg-[var(--bg-card)] rounded-xl border border-[var(--border-subtle)] overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs text-[var(--text-secondary)] min-w-[960px]">
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
                        <tbody className="divide-y divide-[var(--border-subtle)]">
                          {reportsLoading && visibleReports.length === 0 ? (
                            Array.from({ length: 4 }).map((_, idx) => (
                              <tr key={idx}>
                                <td colSpan={10} className="px-4 py-3">
                                  <Skeleton className="h-8 w-full rounded-lg" />
                                </td>
                              </tr>
                            ))
                          ) : visibleReports.length === 0 ? (
                            <tr>
                              <td colSpan={10} className="text-center py-10 text-[var(--text-muted)]">
                                <div className="space-y-2">
                                  <p className="text-sm font-medium text-[var(--text-secondary)]">
                                    Tidak ada laporan yang sesuai dengan filter saat ini.
                                  </p>
                                  {hasActiveReportFilters && (
                                    <button
                                      type="button"
                                      onClick={handleResetAllFilters}
                                      className="px-3 py-1.5 rounded-lg bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-subtle)] text-xs font-semibold hover:opacity-90 cursor-pointer"
                                    >
                                      Reset semua filter
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ) : (
                            visibleReports.map(report => {
                              const durationMin = report.durationSeconds ? Math.round(report.durationSeconds / 60) : 0;
                              const svcMeta = getServiceTypeMeta(report.project.serviceType);
                              const statusMeta = getWorkReportStatusMeta(report.status as WorkReportStatus);
                              return (
                                <tr
                                  key={report.id}
                                  className={`row-fade-in hover:bg-[var(--bg-tertiary)]/80 transition-colors ${
                                    report.riskScore >= 40 ? 'bg-[var(--status-flagged-bg)]/30' : ''
                                  }`}
                                >
                                  <td className="px-4 py-3 font-mono tabular-nums font-medium text-[var(--text-secondary)] whitespace-nowrap">
                                    {new Date(report.createdAt).toLocaleDateString('id-ID')}
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className="font-bold text-[var(--text-primary)] block">
                                      {report.executor.name}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 max-w-xs">
                                    <span className="font-bold text-[var(--text-primary)] truncate block">
                                      {report.project.name}
                                    </span>
                                    <span className="text-xs text-[var(--text-muted)] truncate block">
                                      {report.project.clientName}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap">
                                    <span
                                      className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded border ${svcMeta.badgeClass}`}
                                    >
                                      {svcMeta.shortLabel}
                                    </span>
                                    {report.treatmentSummary && (
                                      <span className="block text-xs text-[var(--text-muted)] mt-0.5">
                                        {report.treatmentSummary.chemicalName}
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 font-mono tabular-nums whitespace-nowrap">
                                    {report.checkInAt ? (
                                      <div>
                                        <span className="font-semibold text-[var(--text-primary)]">
                                          {new Date(report.checkInAt).toLocaleTimeString('id-ID', {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                          })}{' '}
                                          WIB
                                        </span>
                                        <span
                                          className={`block text-xs ${
                                            report.checkInValid
                                              ? 'text-[var(--status-completed-text)]'
                                              : 'text-[var(--status-flagged-text)] font-bold'
                                          }`}
                                        >
                                          {report.checkInValid ? 'Valid' : 'Di Luar Radius'} (
                                          {report.checkInDistance}m)
                                        </span>
                                      </div>
                                    ) : (
                                      <span className="text-[var(--text-muted)]">-</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 font-mono tabular-nums whitespace-nowrap">
                                    {report.checkOutAt ? (
                                      <span className="font-semibold text-[var(--text-primary)]">
                                        {new Date(report.checkOutAt).toLocaleTimeString('id-ID', {
                                          hour: '2-digit',
                                          minute: '2-digit',
                                        })}{' '}
                                        WIB
                                      </span>
                                    ) : report.status === 'WORKING' ? (
                                      <span className="text-[var(--status-working-text)] font-bold">Sedang Kerja</span>
                                    ) : (
                                      <span className="text-[var(--text-muted)]">-</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 font-mono tabular-nums whitespace-nowrap">
                                    {report.durationSeconds ? (
                                      <span>
                                        {Math.floor(durationMin / 60)}j {durationMin % 60}m
                                      </span>
                                    ) : (
                                      <span className="text-[var(--text-muted)]">-</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap">
                                    <span
                                      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full border ${statusMeta.badgeClass}`}
                                    >
                                      <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dotClass}`} aria-hidden="true" />
                                      <span>{statusMeta.label}</span>
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-center whitespace-nowrap">
                                    <RiskBadge level={report.riskLevel} score={report.riskScore} size="sm" />
                                  </td>
                                  <td className="px-4 py-3 text-right whitespace-nowrap">
                                    <button
                                      type="button"
                                      onClick={() => setSelectedReportId(report.id)}
                                      className="px-3 py-1.5 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--accent-glow)] text-[var(--text-primary)] font-semibold text-xs transition-colors cursor-pointer"
                                    >
                                      Buka Detail
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
                      <div className="clean-card bg-[var(--bg-card)] p-6 rounded-xl text-center text-xs text-[var(--text-muted)] space-y-2">
                        <p>Tidak ada laporan yang sesuai dengan filter.</p>
                        {hasActiveReportFilters && (
                          <button
                            type="button"
                            onClick={handleResetAllFilters}
                            className="px-3 py-1.5 rounded-lg bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-subtle)] text-xs font-semibold"
                          >
                            Reset semua filter
                          </button>
                        )}
                      </div>
                    ) : (
                      visibleReports.map(report => {
                        const durationMin = report.durationSeconds ? Math.round(report.durationSeconds / 60) : 0;
                        const svcMeta = getServiceTypeMeta(report.project.serviceType);
                        const statusMeta = getWorkReportStatusMeta(report.status as WorkReportStatus);
                        return (
                          <div
                            key={report.id}
                            className={`clean-card bg-[var(--bg-card)] p-4 rounded-xl border space-y-2.5 ${
                              report.riskScore >= 40
                                ? 'border-[var(--status-flagged-border)]'
                                : 'border-[var(--border-subtle)]'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span
                                  className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${statusMeta.badgeClass}`}
                                >
                                  {statusMeta.label}
                                </span>
                                <RiskBadge level={report.riskLevel} score={report.riskScore} size="sm" />
                              </div>
                              <span className="text-xs font-mono tabular-nums text-[var(--text-muted)]">
                                {new Date(report.createdAt).toLocaleDateString('id-ID')}
                              </span>
                            </div>
                            <div>
                              <span
                                className={`inline-flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 rounded border mb-1 ${svcMeta.badgeClass}`}
                              >
                                {svcMeta.shortLabel}
                              </span>
                              <h4 className="font-bold text-sm text-[var(--text-primary)]">{report.executor.name}</h4>
                              <p className="text-xs text-[var(--text-secondary)] font-semibold mt-0.5">
                                {report.project.name}
                              </p>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs bg-[var(--bg-tertiary)] p-2.5 rounded-lg border border-[var(--border-subtle)] font-mono tabular-nums">
                              <div>
                                <span className="text-xs text-[var(--text-muted)] block font-sans">CHECK-IN</span>
                                <span className="font-semibold text-[var(--text-primary)]">
                                  {report.checkInAt
                                    ? new Date(report.checkInAt).toLocaleTimeString('id-ID', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })
                                    : '-'}{' '}
                                  WIB
                                </span>
                              </div>
                              <div>
                                <span className="text-xs text-[var(--text-muted)] block font-sans">CHECK-OUT</span>
                                <span className="font-semibold text-[var(--text-primary)]">
                                  {report.checkOutAt
                                    ? new Date(report.checkOutAt).toLocaleTimeString('id-ID', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })
                                    : report.status === 'WORKING'
                                    ? 'Sedang Kerja'
                                    : '-'}
                                </span>
                              </div>
                              <div className="col-span-2 pt-1 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs">
                                <span className="text-[var(--text-muted)] font-sans">Durasi: {durationMin} menit</span>
                                {report.checkInValid === false && (
                                  <span className="text-[var(--status-flagged-text)] font-bold font-sans">
                                    GPS Di Luar Radius
                                  </span>
                                )}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setSelectedReportId(report.id)}
                              className="w-full min-h-[44px] py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              Lihat Detail Laporan
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
                          type="button"
                          onClick={() => setPage(p => Math.max(1, p - 1))}
                          disabled={page === 1}
                          className="min-h-[38px] px-3 py-1.5 rounded-lg bg-[var(--bg-tertiary)] hover:opacity-90 text-[var(--text-primary)] text-xs font-bold transition-opacity disabled:opacity-50 cursor-pointer"
                        >
                          Sebelumnya
                        </button>
                        <button
                          type="button"
                          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                          disabled={page === totalPages}
                          className="min-h-[38px] px-3 py-1.5 rounded-lg bg-[var(--bg-tertiary)] hover:opacity-90 text-[var(--text-primary)] text-xs font-bold transition-opacity disabled:opacity-50 cursor-pointer"
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
                      <Search
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                        size={16}
                        aria-hidden="true"
                      />
                      <input
                        type="text"
                        aria-label="Cari proyek, klien, alamat, pelaksana"
                        placeholder="Cari proyek, klien, alamat, pelaksana..."
                        className="w-full pl-9 pr-4 py-2 bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                        value={projectSearch}
                        onChange={e => setProjectSearch(e.target.value)}
                      />
                    </div>
                    <select
                      aria-label="Filter layanan proyek"
                      className="px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg text-sm font-semibold text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                      value={projectServiceType}
                      onChange={e => setProjectServiceType(e.target.value)}
                    >
                      <option value="ALL">Semua Layanan</option>
                      {SERVICE_TYPE_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <select
                      aria-label="Filter status proyek"
                      className="px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg text-sm font-semibold text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                      value={projectStatus}
                      onChange={e => setProjectStatus(e.target.value)}
                    >
                      <option value="ALL">Semua Status</option>
                      <option value="OPEN">Terbuka</option>
                      <option value="LOCKED">Terkunci</option>
                    </select>
                  </div>

                  {projects.length === 0 ? (
                    <div className="text-center py-10 bg-[var(--bg-card)] rounded-xl border border-[var(--border-subtle)] border-dashed text-[var(--text-muted)] text-sm font-semibold">
                      Tidak ada proyek yang sesuai dengan pencarian Anda.
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {projects.map(proj => {
                          const svcMeta = getServiceTypeMeta(proj.serviceType);
                          return (
                            <div
                              key={proj.id}
                              className="clean-card bg-[var(--bg-card)] p-5 rounded-xl border border-[var(--border-subtle)] space-y-3"
                            >
                              <div className="flex items-start justify-between">
                                <div>
                                  <span
                                    className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded border mb-1 ${svcMeta.badgeClass}`}
                                  >
                                    {svcMeta.label}
                                  </span>
                                  <h3 className="font-bold text-base text-[var(--text-primary)]">
                                    {proj.projectName}
                                  </h3>
                                  <p className="text-xs text-[var(--text-muted)] font-medium">{proj.clientName}</p>
                                </div>
                                {proj.lockedAt ? (
                                  <span className="text-xs font-bold text-[var(--text-secondary)] bg-[var(--bg-tertiary)] px-2 py-0.5 rounded border border-[var(--border-subtle)]">
                                    Terkunci
                                  </span>
                                ) : (
                                  <span className="text-xs font-bold text-[var(--status-completed-text)] bg-[var(--status-completed-bg)] px-2 py-0.5 rounded border border-[var(--status-completed-border)]">
                                    Terbuka
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-[var(--text-secondary)] flex items-start gap-1.5">
                                <MapPin size={14} className="text-[var(--text-muted)] shrink-0 mt-0.5" aria-hidden="true" />
                                <span>{proj.address}</span>
                              </p>
                              {proj.targetFocus?.length > 0 && (
                                <p className="text-xs text-[var(--text-muted)]">
                                  Sasaran:{' '}
                                  <span className="font-semibold text-[var(--text-secondary)]">
                                    {proj.targetFocus.join(', ')}
                                  </span>
                                </p>
                              )}
                              {proj.focusTarget && (!proj.targetFocus || proj.targetFocus.length === 0) && (
                                <p className="text-xs text-[var(--text-muted)]">
                                  Sasaran:{' '}
                                  <span className="font-semibold text-[var(--text-secondary)]">{proj.focusTarget}</span>
                                </p>
                              )}
                              <div className="bg-[var(--bg-tertiary)] p-3 rounded-lg border border-[var(--border-subtle)] text-xs grid grid-cols-2 gap-2">
                                <div>
                                  <span className="text-[var(--text-muted)] block text-[11px]">TANGGAL</span>
                                  <span className="font-semibold text-[var(--text-secondary)]">{proj.workDate}</span>
                                </div>
                                <div>
                                  <span className="text-[var(--text-muted)] block text-[11px]">RADIUS</span>
                                  <span className="font-semibold text-[var(--text-secondary)]">
                                    {proj.radius} meter
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[var(--text-muted)] block text-[11px]">LUAS AREA</span>
                                  <span className="font-semibold text-[var(--text-secondary)]">
                                    {proj.buildingAreaSqm ? `${proj.buildingAreaSqm} m²` : '-'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[var(--text-muted)] block text-[11px]">DIBUAT OLEH</span>
                                  <span className="font-semibold text-[var(--text-secondary)]">
                                    {proj.createdByName || '-'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[var(--text-muted)] block text-[11px]">KONTRAK</span>
                                  <span className="font-semibold text-[var(--text-secondary)]">
                                    {proj.contractType === 'RECURRING' ? 'Berkala' : 'Sekali Layanan'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[var(--text-muted)] block text-[11px]">GARANSI</span>
                                  <span className="font-semibold text-[var(--text-secondary)]">
                                    {proj.warrantyMonths > 0 ? `${proj.warrantyMonths} bulan` : '-'}
                                  </span>
                                </div>
                              </div>
                              {proj.contractType === 'RECURRING' && proj.nextServiceDate && (
                                <p className="text-xs text-[var(--status-working-text)] bg-[var(--status-working-bg)] px-2.5 py-1 rounded border border-[var(--status-working-border)]">
                                  Layanan berikutnya:{' '}
                                  {new Date(proj.nextServiceDate).toLocaleDateString('id-ID', {
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric',
                                  })}
                                </p>
                              )}
                              <div className="pt-2 border-t border-[var(--border-subtle)] mt-2 flex justify-end">
                                <button
                                  type="button"
                                  onClick={() => setSelectedProject(proj)}
                                  className="flex items-center gap-1.5 text-xs font-bold text-[var(--accent-text)] hover:opacity-90 transition-opacity px-3 py-1.5 rounded-lg hover:bg-[var(--accent-muted)] cursor-pointer"
                                >
                                  Lihat Detail Proyek
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {projectTotalPages > 1 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-4 border-t border-[var(--border-subtle)]">
                          <span className="text-xs font-semibold text-[var(--text-muted)]">
                            Menampilkan halaman {projectPage} dari {projectTotalPages} (Total: {projectTotalCount}{' '}
                            Proyek)
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setProjectPage(p => Math.max(1, p - 1))}
                              disabled={projectPage === 1}
                              className="px-3 py-1.5 rounded-lg bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer"
                            >
                              Sebelumnya
                            </button>
                            <button
                              type="button"
                              onClick={() => setProjectPage(p => Math.min(projectTotalPages, p + 1))}
                              disabled={projectPage === projectTotalPages}
                              className="px-3 py-1.5 rounded-lg bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer"
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
                <div className="clean-card bg-[var(--bg-card)] rounded-xl border border-[var(--border-subtle)] overflow-hidden">
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
                      <tbody className="divide-y divide-[var(--border-subtle)]">
                        {executors.map(ex => (
                          <tr key={ex.id} className="row-fade-in hover:bg-[var(--bg-tertiary)]/80">
                            <td className="px-4 py-3">
                              <span className="font-bold text-[var(--text-primary)] block">{ex.name}</span>
                              <span className="text-xs text-[var(--text-muted)]">{ex.email}</span>
                            </td>
                            <td className="px-4 py-3 font-mono">{ex.nip || '-'}</td>
                            <td className="px-4 py-3 text-center font-mono tabular-nums">{ex.totalJobs}</td>
                            <td className="px-4 py-3 text-center font-mono tabular-nums text-[var(--status-completed-text)]">
                              {ex.completedJobs}
                            </td>
                            <td className="px-4 py-3 text-center font-mono tabular-nums text-[var(--status-flagged-text)]">
                              {ex.highRiskJobs}
                            </td>
                            <td className="px-4 py-3 text-center font-mono tabular-nums">
                              {ex.avgDurationMinutes} menit
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'tracking' && (
                <div className="clean-card bg-[var(--bg-card)] rounded-xl border border-[var(--border-subtle)] overflow-hidden p-4">
                  <div className="mb-6 rounded-xl overflow-hidden border border-[var(--border-subtle)] shadow-sm">
                    <AllProjectsMap
                      projects={projects.filter(p => !p.lockedAt)}
                      userLocations={userLocations}
                      height="400px"
                    />
                  </div>

                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-sm text-[var(--text-primary)]">
                      Lokasi Pelaksana Terbaru (Pelacakan GPS)
                    </h3>
                    <button
                      type="button"
                      onClick={() => fetchLatestLocations().then(setUserLocations)}
                      className="text-xs flex items-center gap-1 text-[var(--text-secondary)] hover:text-[var(--accent-text)] cursor-pointer"
                    >
                      <RefreshCw size={14} aria-hidden="true" /> Muat ulang lokasi
                    </button>
                  </div>
                  {userLocations.length === 0 ? (
                    <div className="py-8 text-center text-xs text-[var(--text-muted)]">
                      Belum ada data lokasi pelaksana yang tercatat.
                    </div>
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
                        <tbody className="divide-y divide-[var(--border-subtle)]">
                          {userLocations.map(loc => (
                            <tr key={loc.userId} className="row-fade-in hover:bg-[var(--bg-tertiary)]/50">
                              <td className="px-4 py-3 font-semibold text-[var(--text-primary)]">{loc.userName}</td>
                              <td className="px-4 py-3">{new Date(loc.trackedAt).toLocaleString('id-ID')}</td>
                              <td className="px-4 py-3 font-mono">{loc.latitude}</td>
                              <td className="px-4 py-3 font-mono">{loc.longitude}</td>
                              <td className="px-4 py-3 font-mono">
                                {loc.accuracy != null ? `±${Math.round(loc.accuracy)}m` : '-'}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <a
                                  href={`https://www.google.com/maps/search/?api=1&query=${loc.latitude},${loc.longitude}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs font-semibold text-[var(--status-completed-text)] bg-[var(--status-completed-bg)] px-3 py-1.5 rounded-lg border border-[var(--status-completed-border)] transition-opacity hover:opacity-90 inline-block"
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
                <div className="clean-card bg-[var(--bg-card)] rounded-xl border border-[var(--border-subtle)] overflow-hidden p-4">
                  <div className="mb-6 rounded-xl overflow-hidden border border-[var(--border-subtle)] shadow-sm">
                    <AllProjectsMap
                      projects={projects.filter(p => !p.lockedAt)}
                      userLocations={userLocations}
                      height="400px"
                    />
                  </div>

                  <h3 className="font-bold text-sm text-[var(--text-primary)] mb-3">
                    Histori &amp; Rekam Jejak Audit Sistem
                  </h3>
                  {auditLogs === null ? (
                    <div className="py-8 text-center text-xs text-[var(--text-muted)]">Memuat...</div>
                  ) : (
                    <div className="space-y-3">
                      {auditLogs.map(log => (
                        <div
                          key={log.id}
                          className="p-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-tertiary)] flex items-start justify-between gap-3 text-xs"
                        >
                          <div>
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="font-bold text-[var(--text-primary)]">{log.userName}</span>
                              <span className="text-[11px] font-bold px-1.5 py-0.2 rounded bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-secondary)]">
                                {log.userRole}
                              </span>
                              <span className="font-mono text-[11px] text-[var(--status-completed-text)] bg-[var(--status-completed-bg)] px-1.5 py-0.2 rounded font-semibold">
                                {log.action}
                              </span>
                            </div>
                            <p className="text-[var(--text-secondary)]">{log.details}</p>
                          </div>
                          <span className="text-xs text-[var(--text-muted)] font-mono whitespace-nowrap">
                            {new Date(log.createdAt).toLocaleTimeString('id-ID')} WIB
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'approval' && (
                <div className="clean-card p-5 sm:p-6 lg:p-7 space-y-6">
                  {/* Header Halaman */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--border-subtle)]">
                    <div>
                      <h3 className="text-base sm:text-lg font-extrabold text-[var(--text-primary)] flex items-center gap-2">
                        <UserCheck size={20} className="text-[var(--accent)]" />
                        Manajemen Akun Staf Perusahaan
                      </h3>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                        Direktur dan Admin dapat menambahkan staf baru atau membuat link undangan resmi.
                      </p>
                    </div>
                    <div className="self-start sm:self-center">
                      {isDirector ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 font-bold text-xs">
                          👑 Otoritas Penuh Direktur
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 font-bold text-xs">
                          🛡️ Mode Admin (Akun Admin Lain Dilindungi)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 1. Form Tambah Pengguna Langsung */}
                  <form
                    onSubmit={handleCreateUser}
                    className="clean-card p-5 sm:p-6 bg-[#faf9f7] border border-[#e8e5e0] space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-extrabold text-sm text-[var(--text-primary)] flex items-center gap-2">
                          <Plus size={16} className="text-[var(--accent)]" /> Tambah Pengguna Langsung
                        </h4>
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                          Akun langsung aktif dan dapat langsung digunakan untuk login.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-[var(--text-secondary)]">Nama Lengkap *</label>
                        <input
                          required
                          placeholder="Contoh: Budi Santoso"
                          value={newUser.name}
                          onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                          className="w-full px-3.5 py-2.5 min-h-[44px] text-xs sm:text-sm rounded-xl border border-[var(--border)] bg-white text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-[var(--text-secondary)]">Email Perusahaan *</label>
                        <input
                          required
                          type="email"
                          placeholder="nama@perusahaan.com"
                          value={newUser.email}
                          onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                          className="w-full px-3.5 py-2.5 min-h-[44px] text-xs sm:text-sm rounded-xl border border-[var(--border)] bg-white text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-[var(--text-secondary)]">Password Awal *</label>
                        <input
                          required
                          type="password"
                          minLength={8}
                          placeholder="Min. 8 karakter"
                          value={newUser.password}
                          onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                          className="w-full px-3.5 py-2.5 min-h-[44px] text-xs sm:text-sm rounded-xl border border-[var(--border)] bg-white text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-[var(--text-secondary)]">No. WhatsApp / HP</label>
                        <input
                          placeholder="Contoh: 0812-3456-7890"
                          value={newUser.phone}
                          onChange={e => setNewUser({ ...newUser, phone: e.target.value })}
                          className="w-full px-3.5 py-2.5 min-h-[44px] text-xs sm:text-sm rounded-xl border border-[var(--border)] bg-white text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-[var(--text-secondary)]">Pilih Peran / Role *</label>
                        <select
                          value={newUser.role}
                          onChange={e => setNewUser({ ...newUser, role: e.target.value as AdminUser['role'] })}
                          className="w-full px-3.5 py-2.5 min-h-[44px] text-xs sm:text-sm rounded-xl border border-[var(--border)] bg-white text-[var(--text-primary)] font-semibold focus:outline-none focus:border-[var(--accent)]"
                        >
                          <option value="TEKNISI_LAPANGAN">Teknisi Lapangan (PWA Mobile)</option>
                          <option value="MARKETING">Marketing / Surveyor</option>
                          <option value="INVENTORY">Inventory / Staf Gudang</option>
                          <option value="ADMIN">Admin Operasional</option>
                        </select>
                      </div>

                      <div className="flex items-end">
                        <button
                          type="submit"
                          disabled={creatingUser}
                          className="w-full min-h-[44px] px-5 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs sm:text-sm font-bold rounded-xl disabled:opacity-50 transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Plus size={15} />
                          {creatingUser ? 'Membuat...' : 'Buat Akun Sekarang'}
                        </button>
                      </div>
                    </div>
                  </form>

                  {/* 2. Form Buat Link Undangan */}
                  <div className="clean-card p-5 sm:p-6 bg-emerald-50/30 border border-emerald-200/80 space-y-3.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h4 className="font-extrabold text-sm text-emerald-950 flex items-center gap-2">
                          <CheckCircle2 size={16} className="text-[var(--accent)]" />
                          Buat Link Undangan Mandiri (Berlaku 7 Hari)
                        </h4>
                        <p className="text-xs text-emerald-800 mt-0.5">
                          Calon staf dapat mengisi data diri dan password secara mandiri melalui tautan ini.
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2.5 items-center">
                      <select
                        value={inviteRole}
                        onChange={e => setInviteRole(e.target.value as AdminUser['role'])}
                        className="px-3.5 py-2 min-h-[44px] text-xs sm:text-sm font-semibold rounded-xl border border-emerald-300 bg-white text-[var(--text-primary)]"
                      >
                        <option value="TEKNISI_LAPANGAN">Undangan: Teknisi Lapangan</option>
                        <option value="MARKETING">Undangan: Marketing</option>
                        <option value="INVENTORY">Undangan: Inventory / Gudang</option>
                        <option value="ADMIN">Undangan: Admin Perusahaan</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => handleGenerateInvite(inviteRole)}
                        disabled={isGeneratingInvite}
                        className="min-h-[44px] px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-50 cursor-pointer shadow-xs flex items-center gap-1.5"
                      >
                        <Plus size={14} />
                        {isGeneratingInvite ? 'Membuat...' : 'Buat Tautan Undangan'}
                      </button>
                    </div>

                    {inviteLink && (
                      <div className="p-3.5 bg-white rounded-xl border border-emerald-200 shadow-2xs space-y-2">
                        <p className="text-xs font-bold text-slate-700 flex items-center justify-between">
                          <span>Tautan Pendaftaran Resmi</span>
                          <span className="font-normal text-slate-500 font-mono text-[11px]">Kedaluwarsa: {inviteLink.expiresAt}</span>
                        </p>
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                          <input
                            type="text"
                            readOnly
                            value={inviteLink.url}
                            className="flex-1 text-xs px-3 py-2.5 min-h-[42px] bg-[#faf9f7] border border-slate-200 rounded-xl font-mono text-[var(--text-primary)] select-all"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(inviteLink.url);
                              setActionBanner({
                                tone: 'success',
                                message: 'Link undangan berhasil disalin ke clipboard.',
                              });
                            }}
                            className="min-h-[42px] px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-xs shrink-0"
                          >
                            <Copy size={13} /> Salin Link
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 3. Daftar Akun Pengguna Terdaftar */}
                  <div className="space-y-4 pt-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-extrabold text-[var(--text-primary)]">
                          Daftar Akun Karyawan Terdaftar
                        </h4>
                        <p className="text-xs text-[var(--text-secondary)]">
                          Total {adminUsers.filter(u => u.email.toLowerCase() !== 'lieziragroup@gmail.com' && (u.role as string) !== 'MASTER_SUPER_ADMIN').length} akun terdata di perusahaan ini.
                        </p>
                      </div>

                      {/* Search Bar Pengguna */}
                      <div className="relative w-full sm:w-64">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={userSearchQ}
                          onChange={e => setUserSearchQ(e.target.value)}
                          placeholder="Cari nama, email, NIP..."
                          className="w-full pl-8 pr-3 py-2 min-h-[40px] text-xs rounded-xl border border-[var(--border)] bg-white text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                        />
                      </div>
                    </div>

                    {adminUsers.length === 0 ? (
                      <div className="py-12 text-center text-xs text-[var(--text-muted)] clean-card p-6">
                        Tidak ada data pengguna terdaftar.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {adminUsers
                          .filter(
                            u =>
                              (u.role as string) !== 'MASTER_SUPER_ADMIN' &&
                              (u.role as string) !== 'SUPERADMIN' &&
                              u.email.toLowerCase() !== 'lieziragroup@gmail.com'
                          )
                          .filter(u => {
                            if (!userSearchQ.trim()) return true;
                            const q = userSearchQ.toLowerCase();
                            return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || (u.nip || '').toLowerCase().includes(q);
                          })
                          .map(u => {
                            const isSelf = u.id === user?.id;
                            const isTargetAdmin = u.role === 'ADMIN';
                            const cannotManage = !isDirector && isTargetAdmin;

                            return (
                              <div
                                key={u.id}
                                className={`clean-card p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
                                  u.is_active ? 'hover:border-emerald-300' : 'bg-rose-50/20 border-rose-200'
                                }`}
                              >
                                <div className="space-y-1.5 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-extrabold text-[var(--text-primary)] text-sm sm:text-base">{u.name}</span>
                                    <span
                                      className={`text-[10.5px] font-bold px-2.5 py-0.5 rounded-full border ${
                                        u.is_active
                                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                          : 'bg-rose-50 text-rose-800 border-rose-200'
                                      }`}
                                    >
                                      {u.is_active ? 'AKTIF' : 'DITANGGUHKAN'}
                                    </span>
                                    <span
                                      className={`text-[10.5px] font-bold px-2.5 py-0.5 rounded-full border ${
                                        u.role === 'ADMIN'
                                          ? 'bg-purple-50 text-purple-800 border-purple-200'
                                          : u.role === 'MARKETING'
                                          ? 'bg-blue-50 text-blue-800 border-blue-200'
                                          : u.role === 'INVENTORY'
                                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                                          : 'bg-teal-50 text-teal-800 border-teal-200'
                                      }`}
                                    >
                                      {u.role === 'ADMIN'
                                        ? 'ADMIN'
                                        : u.role === 'MARKETING'
                                        ? 'MARKETING'
                                        : u.role === 'INVENTORY'
                                        ? 'GUDANG'
                                        : 'TEKNISI'}
                                    </span>
                                    {isSelf && (
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                        Akun Anda
                                      </span>
                                    )}
                                  </div>

                                  <div className="text-xs text-[var(--text-secondary)] font-mono flex items-center gap-2 flex-wrap">
                                    <span>{u.email}</span>
                                    {u.nip && <span>• NIP: {u.nip}</span>}
                                    {u.phone && <span>• WA: {u.phone}</span>}
                                  </div>

                                  <div className="text-[11px] text-[var(--text-muted)]">
                                    Terdaftar: {new Date(u.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                  </div>
                                </div>

                                {/* Aksi Manajemen Akun */}
                                <div className="flex items-center gap-2 shrink-0 self-start md:self-center flex-wrap">
                                  {isSelf ? (
                                    <span className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-500 font-semibold text-xs border border-slate-200">
                                      Sesi Aktif
                                    </span>
                                  ) : cannotManage ? (
                                    <div
                                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 text-xs font-semibold"
                                      title="Admin tidak memiliki wewenang menonaktifkan akun Admin lainnya. Tindakan ini hanya dapat dilakukan oleh Direktur."
                                    >
                                      <Lock size={13} className="text-amber-600" />
                                      <span>Khusus Wewenang Direktur</span>
                                    </div>
                                  ) : (
                                    <>
                                      {u.is_active ? (
                                        <AlertDialog>
                                          <AlertDialogTrigger asChild>
                                            <button
                                              type="button"
                                              className="min-h-[42px] px-3.5 py-2 rounded-xl border border-rose-200 bg-rose-50/70 text-rose-700 hover:bg-rose-100 text-xs font-bold transition-colors cursor-pointer"
                                            >
                                              Nonaktifkan Akun
                                            </button>
                                          </AlertDialogTrigger>
                                          <AlertDialogContent>
                                            <AlertDialogHeader>
                                              <AlertDialogTitle>Nonaktifkan Akun {u.name}?</AlertDialogTitle>
                                              <AlertDialogDescription>
                                                Pengguna tidak akan dapat masuk ke sistem selama akun dinonaktifkan. Anda dapat mengaktifkan kembali akun ini kapan saja.
                                              </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                              <AlertDialogCancel className="font-medium">Batalkan</AlertDialogCancel>
                                              <AlertDialogAction
                                                onClick={() => void handleSuspend(u)}
                                                className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
                                              >
                                                Ya, Nonaktifkan
                                              </AlertDialogAction>
                                            </AlertDialogFooter>
                                          </AlertDialogContent>
                                        </AlertDialog>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => void handleActivate(u)}
                                          className="min-h-[42px] px-4 py-2 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-bold transition-colors shadow-xs cursor-pointer"
                                        >
                                          Aktifkan Akun
                                        </button>
                                      )}

                                      <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                          <button
                                            type="button"
                                            aria-label={`Hapus akun ${u.name} secara permanen`}
                                            className="min-h-[42px] min-w-[42px] flex items-center justify-center p-2 rounded-xl border border-[var(--border)] text-[var(--text-muted)] hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition-colors cursor-pointer"
                                            title="Hapus Akun Permanen"
                                          >
                                            <Trash2 size={16} aria-hidden="true" />
                                          </button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                          <AlertDialogHeader>
                                            <AlertDialogTitle>Hapus Akun Pengguna Secara Permanen?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                              Tindakan ini tidak dapat dibatalkan. Menghapus akun <strong>{u.name}</strong> akan mencabut kredensial loginnya secara permanen, sementara riwayat laporan kerja tetap tersimpan untuk audit.
                                            </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                            <AlertDialogCancel className="font-medium">Batalkan</AlertDialogCancel>
                                            <AlertDialogAction
                                              onClick={() => void handleDeleteUser(u.id)}
                                              className="bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-xs"
                                            >
                                              Ya, Hapus Permanen
                                            </AlertDialogAction>
                                          </AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>
                                    </>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'quotation' && <QuotationPage />}
              {activeTab === 'customers' && <CustomersPage />}
              {activeTab === 'spk-cms' && <SPKPage />}
              {activeTab === 'order-tracking' && <TrackingPage />}
              {activeTab === 'cashflow' && <CashflowPage />}
              {activeTab === 'performa' && <PerformaPage />}
              {activeTab === 'inventory' && <InventoryPage />}
              {activeTab === 'kontrol-rayap' && <KontrolRayapPage />}
              {activeTab === 'saas-companies' && isMasterSuper && <CompaniesPage />}

              {activeTab === 'templates' && isAdmin && <TemplateSettingsPanel />}

              {activeTab === 'risk-config' && (
                <div className="space-y-4">
                  <RiskConfigPanel
                    config={riskConfig}
                    onSave={handleSaveRiskConfig}
                    onReset={handleResetRiskConfigWithUndo}
                  />
                  <PhotoRetentionPanel />
                </div>
              )}

              {activeTab === 'profile' && user && (
                <div className="clean-card bg-[var(--bg-card)] max-w-2xl mx-auto p-6 space-y-6">
                  <h2 className="text-lg font-bold border-b border-[var(--border-subtle)] pb-3 text-[var(--text-primary)]">
                    Profil &amp; Preferensi Anda
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="block text-xs font-semibold text-[var(--text-muted)]">Nama Lengkap</span>
                      <span className="font-semibold text-sm text-[var(--text-primary)]">{user.name}</span>
                    </div>
                    <div className="overflow-hidden">
                      <span className="block text-xs font-semibold text-[var(--text-muted)]">Email</span>
                      <span className="font-semibold text-sm text-[var(--text-primary)] truncate block" title={user.email}>
                        {user.email}
                      </span>
                    </div>
                    <div>
                      <span className="block text-xs font-semibold text-[var(--text-muted)]">NIP</span>
                      <span className="font-semibold text-sm text-[var(--text-primary)]">{user.nip || '-'}</span>
                    </div>
                    <div>
                      <span className="block text-xs font-semibold text-[var(--text-muted)]">Peran</span>
                      <span className="inline-block font-semibold bg-[var(--status-working-bg)] text-[var(--status-working-text)] px-2.5 py-0.5 rounded text-xs border border-[var(--status-working-border)] mt-0.5">
                        {user.role}
                      </span>
                    </div>
                  </div>

                  {/* Pengaturan Tema Tampilan (Light / Dark / System) */}
                  <div className="pt-4 border-t border-[var(--border-subtle)] space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Tema Tampilan</h3>
                        <p className="text-xs text-[var(--text-secondary)]">
                          Pilih tampilan terang, gelap, atau ikuti pengaturan sistem perangkat Anda (saat ini aktif:{' '}
                          <strong>{resolvedTheme === 'dark' ? 'Gelap' : 'Terang'}</strong>).
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5" role="radiogroup" aria-label="Tema tampilan">
                      {themeOptions.map(opt => {
                        const selected = theme === opt.value;
                        const icon =
                          opt.value === 'light' ? (
                            <Sun size={15} aria-hidden="true" />
                          ) : opt.value === 'dark' ? (
                            <Moon size={15} aria-hidden="true" />
                          ) : (
                            <Monitor size={15} aria-hidden="true" />
                          );
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            onClick={() => setTheme(opt.value)}
                            className={`p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                              selected
                                ? 'bg-[var(--accent-glow)] border-[var(--accent)] text-[var(--text-primary)]'
                                : 'bg-[var(--bg-primary)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
                            }`}
                          >
                            <div className="flex items-center gap-2 font-semibold text-xs text-[var(--text-primary)]">
                              {icon}
                              <span>{opt.label}</span>
                            </div>
                            <p className="text-xs text-[var(--text-muted)] mt-1 leading-snug">{opt.description}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-[var(--border-subtle)]">
                    <button
                      type="button"
                      onClick={() => setShowChangePassword(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-bold rounded-lg transition-colors cursor-pointer"
                    >
                      Ubah Kata Sandi
                    </button>
                  </div>
                </div>
              )}
            </MotionDiv>
          </AnimatePresence>
        )}
      </div>

      {/* Report Detail Modal */}
      {selectedReportId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 sm:p-6"
          onClick={() => setSelectedReportId(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Detail Laporan Pekerjaan"
        >
          <div
            className="relative w-full max-w-3xl clean-card bg-[var(--bg-card)] rounded-2xl shadow-2xl border border-[var(--border-subtle)] flex flex-col max-h-[90vh] sm:max-h-[85vh] overflow-hidden text-[var(--text-primary)]"
            onClick={e => e.stopPropagation()}
          >
            {detailLoading && (
              <div className="p-8 space-y-4" aria-busy="true">
                <Skeleton className="h-6 w-56" />
                <Skeleton className="h-24 w-full rounded-xl" />
                <Skeleton className="h-48 w-full rounded-xl" />
              </div>
            )}
            {!detailLoading && selectedReport && (
              <>
                <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-tertiary)] shrink-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <RiskBadge level={selectedReport.riskLevel} score={selectedReport.riskScore} size="lg" />
                    <div className="min-w-0">
                      <h2 className="text-base font-bold text-[var(--text-primary)] truncate">
                        {selectedReport.projectName}
                      </h2>
                      <p className="text-xs text-[var(--text-muted)] truncate">
                        Pelaksana:{' '}
                        <span className="font-semibold text-[var(--text-secondary)]">
                          {selectedReport.executorName}
                        </span>{' '}
                        • {new Date(selectedReport.createdAt).toLocaleDateString('id-ID')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={handleDownloadVisitReport}
                      disabled={pdfBusy}
                      title="Unduh Laporan Kunjungan (PDF)"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--bg-card)] disabled:opacity-50 transition-colors cursor-pointer"
                    >
                      <Download size={14} aria-hidden="true" /> {pdfBusy ? 'Membuat PDF...' : 'PDF'}
                    </button>
                    <button
                      type="button"
                      aria-label="Tutup detail laporan"
                      onClick={() => setSelectedReportId(null)}
                      className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition-colors cursor-pointer"
                    >
                      <X size={20} aria-hidden="true" />
                    </button>
                  </div>
                </div>

                <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[var(--bg-tertiary)] p-4 rounded-xl border border-[var(--border-subtle)] text-xs">
                    <div>
                      <span className="text-[var(--text-muted)] block text-[11px]">KLIEN</span>
                      <span className="font-bold text-[var(--text-primary)]">{selectedReport.clientName}</span>
                    </div>
                    <div>
                      <span className="text-[var(--text-muted)] block text-[11px]">LAYANAN</span>
                      <span className="font-bold text-[var(--text-primary)]">
                        {getServiceTypeMeta(selectedReport.serviceType).label}
                      </span>
                    </div>
                    <div>
                      <span className="text-[var(--text-muted)] block text-[11px]">STATUS</span>
                      <span className="font-bold text-[var(--text-primary)]">
                        {getWorkReportStatusMeta(selectedReport.status).label}
                      </span>
                    </div>
                    <div>
                      <span className="text-[var(--text-muted)] block text-[11px]">TOTAL DURASI</span>
                      <span className="font-bold text-[var(--text-primary)]">
                        {selectedReport.durationSeconds
                          ? `${Math.round(selectedReport.durationSeconds / 60)} menit`
                          : '-'}
                      </span>
                    </div>
                    {selectedReport.targetFocus?.length > 0 ? (
                      <div className="col-span-2">
                        <span className="text-[var(--text-muted)] block text-[11px]">FOKUS TARGET</span>
                        <span className="font-bold text-[var(--text-primary)]">
                          {selectedReport.targetFocus.join(', ')}
                        </span>
                      </div>
                    ) : selectedReport.focusTarget ? (
                      <div className="col-span-2">
                        <span className="text-[var(--text-muted)] block text-[11px]">FOKUS TARGET</span>
                        <span className="font-bold text-[var(--text-primary)]">{selectedReport.focusTarget}</span>
                      </div>
                    ) : null}
                    {selectedReport.warrantyMonths > 0 && (
                      <div>
                        <span className="text-[var(--text-muted)] block text-[11px]">GARANSI</span>
                        <span className="font-bold text-[var(--text-primary)]">
                          {selectedReport.warrantyMonths} bulan
                        </span>
                      </div>
                    )}
                    <div>
                      <span className="text-[var(--text-muted)] block text-[11px]">JADWAL</span>
                      <span className="font-bold text-[var(--text-primary)]">
                        {selectedReport.scheduledStartTime} WIB
                      </span>
                    </div>
                    {selectedReport.teamMembers && selectedReport.teamMembers.length > 0 && (
                      <div className="col-span-2 sm:col-span-4 pt-2 border-t border-[var(--border-subtle)]">
                        <span className="text-[var(--text-muted)] block text-[11px] mb-1">
                          TIM TEKNISI YANG BERTUGAS (1 TIM)
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedReport.teamMembers.map((tm, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[var(--status-completed-bg)] text-[var(--status-completed-text)] border border-[var(--status-completed-border)] text-xs font-bold"
                            >
                              {tm.name} {tm.isManual ? '(Input Manual)' : ''}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                      Validasi Geografis
                    </h4>
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
                    <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-3">
                      Kronologi Waktu
                    </h4>
                    <div className="relative pl-6 border-l-2 border-[var(--border-subtle)] space-y-4 text-xs">
                      <div className="relative">
                        <div className="absolute -left-[31px] top-0.5 w-3.5 h-3.5 rounded-full bg-slate-400 border-2 border-[var(--bg-card)]" />
                        <span className="font-bold text-[var(--text-secondary)] font-mono">
                          {selectedReport.scheduledStartTime} WIB
                        </span>
                        <p className="text-[var(--text-muted)]">Jadwal target dimulainya pekerjaan</p>
                      </div>
                      {selectedReport.checkInAt && (
                        <div className="relative">
                          <div
                            className={`absolute -left-[31px] top-0.5 w-3.5 h-3.5 rounded-full border-2 border-[var(--bg-card)] ${
                              selectedReport.checkInValid ? 'bg-emerald-500' : 'bg-red-500'
                            }`}
                          />
                          <span className="font-bold text-[var(--text-primary)] font-mono">
                            {new Date(selectedReport.checkInAt).toLocaleTimeString('id-ID')} WIB — CHECK-IN
                          </span>
                          <p className="text-[var(--text-secondary)] mt-0.5">
                            {selectedReport.checkInValid ? 'Valid di dalam radius' : 'Di luar radius proyek'} (Jarak:{' '}
                            {selectedReport.checkInDistance}m, Akurasi: ±{selectedReport.checkInAccuracy}m)
                          </p>
                        </div>
                      )}
                      {selectedReport.photos
                        .filter(p => p.photoType === 'PROGRESS')
                        .map((photo, idx) => (
                          <div key={photo.id} className="relative">
                            <div className="absolute -left-[31px] top-0.5 w-3.5 h-3.5 rounded-full bg-amber-500 border-2 border-[var(--bg-card)]" />
                            <span className="font-bold text-[var(--text-primary)] font-mono">
                              {new Date(photo.capturedAt).toLocaleTimeString('id-ID')} WIB — DOKUMENTASI PROGRES #
                              {idx + 1}
                            </span>
                          </div>
                        ))}
                      {selectedReport.checkOutAt && (
                        <div className="relative">
                          <div
                            className={`absolute -left-[31px] top-0.5 w-3.5 h-3.5 rounded-full border-2 border-[var(--bg-card)] ${
                              selectedReport.checkOutValid ? 'bg-blue-500' : 'bg-red-500'
                            }`}
                          />
                          <span className="font-bold text-[var(--text-primary)] font-mono">
                            {new Date(selectedReport.checkOutAt).toLocaleTimeString('id-ID')} WIB — CHECK-OUT
                          </span>
                          <p className="text-[var(--text-secondary)] mt-0.5">
                            Total durasi: {Math.round((selectedReport.durationSeconds || 0) / 60)} menit.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2.5">
                      Data Perlakuan (Treatment)
                    </h4>
                    {!selectedReport.treatmentRecord ? (
                      <div className="bg-[var(--status-draft-bg)] border border-[var(--status-draft-border)] p-3.5 rounded-xl text-[var(--status-draft-text)] text-xs">
                        Belum ada data bahan, dosis, atau metode aplikasi yang tercatat untuk pekerjaan ini.
                      </div>
                    ) : (
                      <div className="bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-xl p-4 text-xs space-y-3">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div>
                            <span className="text-[var(--text-muted)] block text-[11px]">METODE</span>
                            <span className="font-bold text-[var(--text-primary)]">
                              {APPLICATION_METHOD_LABELS[selectedReport.treatmentRecord.applicationMethod]}
                            </span>
                          </div>
                          <div>
                            <span className="text-[var(--text-muted)] block text-[11px]">BAHAN/PRODUK</span>
                            <span className="font-bold text-[var(--text-primary)]">
                              {selectedReport.treatmentRecord.chemicalName}
                            </span>
                          </div>
                          <div>
                            <span className="text-[var(--text-muted)] block text-[11px]">BAHAN AKTIF</span>
                            <span className="font-bold text-[var(--text-primary)]">
                              {selectedReport.treatmentRecord.activeIngredient || '-'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[var(--text-muted)] block text-[11px]">DOSIS</span>
                            <span className="font-bold text-[var(--text-primary)]">
                              {selectedReport.treatmentRecord.dosage}
                            </span>
                          </div>
                          {selectedReport.treatmentRecord.treatmentAreaSqm != null && (
                            <div>
                              <span className="text-[var(--text-muted)] block text-[11px]">LUAS DIRAWAT</span>
                              <span className="font-bold text-[var(--text-primary)]">
                                {selectedReport.treatmentRecord.treatmentAreaSqm} m²
                              </span>
                            </div>
                          )}
                          {selectedReport.treatmentRecord.drillingPointsCount != null && (
                            <div>
                              <span className="text-[var(--text-muted)] block text-[11px]">TITIK BOR/INJEKSI</span>
                              <span className="font-bold text-[var(--text-primary)]">
                                {selectedReport.treatmentRecord.drillingPointsCount} titik
                              </span>
                            </div>
                          )}
                        </div>

                        {selectedReport.serviceType === 'FUMIGATION' && (
                          <div
                            className={`rounded-lg p-3 border ${
                              selectedReport.treatmentRecord.aerationCompletedAt
                                ? 'bg-[var(--status-completed-bg)] border-[var(--status-completed-border)]'
                                : 'bg-[var(--status-flagged-bg)] border-[var(--status-flagged-border)]'
                            }`}
                          >
                            <span
                              className={`text-xs font-bold uppercase block mb-2 ${
                                selectedReport.treatmentRecord.aerationCompletedAt
                                  ? 'text-[var(--status-completed-text)]'
                                  : 'text-[var(--status-flagged-text)]'
                              }`}
                            >
                              Data Keselamatan Fumigasi
                            </span>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <span className="text-[var(--text-muted)] block text-[11px]">FUMIGANT</span>
                                <span className="font-semibold text-[var(--text-primary)]">
                                  {selectedReport.treatmentRecord.fumigantType || '-'}
                                </span>
                              </div>
                              <div>
                                <span className="text-[var(--text-muted)] block text-[11px]">KONSENTRASI</span>
                                <span className="font-semibold text-[var(--text-primary)]">
                                  {selectedReport.treatmentRecord.gasConcentrationPpm != null
                                    ? `${selectedReport.treatmentRecord.gasConcentrationPpm} ppm`
                                    : '-'}
                                </span>
                              </div>
                              <div>
                                <span className="text-[var(--text-muted)] block text-[11px]">MULAI SEALING</span>
                                <span className="font-semibold text-[var(--text-primary)]">
                                  {selectedReport.treatmentRecord.sealingStartedAt
                                    ? new Date(selectedReport.treatmentRecord.sealingStartedAt).toLocaleString('id-ID')
                                    : '-'}
                                </span>
                              </div>
                              <div>
                                <span className="text-[var(--text-muted)] block text-[11px]">SELESAI AERASI</span>
                                {selectedReport.treatmentRecord.aerationCompletedAt ? (
                                  <span className="font-semibold text-[var(--status-completed-text)]">
                                    {new Date(selectedReport.treatmentRecord.aerationCompletedAt).toLocaleString(
                                      'id-ID'
                                    )}
                                  </span>
                                ) : (
                                  <span className="font-bold text-[var(--status-flagged-text)]">Belum tercatat</span>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {selectedReport.treatmentRecord.technicianNotes && (
                          <p className="text-[var(--text-secondary)] italic">
                            &quot;{selectedReport.treatmentRecord.technicianNotes}&quot;
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {selectedReport.customerName && (
                    <div className="mt-2 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-xl p-4">
                      <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-3">
                        Serah Terima &amp; Ulasan Pelanggan
                      </h4>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <div>
                            <span className="text-[var(--text-muted)] block text-[11px] font-bold">
                              NAMA PENANGGUNG JAWAB/PELANGGAN
                            </span>
                            <span className="font-bold text-[var(--text-primary)] text-sm">
                              {selectedReport.customerName}
                            </span>
                          </div>
                          {selectedReport.customerPhone && (
                            <div>
                              <span className="text-[var(--text-muted)] block text-[11px] font-bold">
                                NOMOR TELEPON
                              </span>
                              <span className="font-semibold text-[var(--text-secondary)] text-sm">
                                {selectedReport.customerPhone}
                              </span>
                            </div>
                          )}
                          <div>
                            <span className="text-[var(--text-muted)] block text-[11px] font-bold">
                              KRITIK &amp; SARAN
                            </span>
                            <p className="font-medium text-[var(--text-primary)] text-sm mt-0.5 whitespace-pre-wrap clean-card bg-[var(--bg-card)] border border-[var(--border-subtle)] p-2.5 rounded-lg italic">
                              {selectedReport.customerFeedback || (
                                <span className="text-[var(--text-muted)] not-italic">Tidak ada ulasan.</span>
                              )}
                            </p>
                          </div>
                        </div>
                        {selectedReport.customerSignature && (
                          <div>
                            <span className="text-[var(--text-muted)] block text-[11px] font-bold mb-1.5">
                              TANDA TANGAN
                            </span>
                            <div className="border border-[var(--border-subtle)] rounded-xl clean-card bg-white p-2 h-32 flex items-center justify-center relative">
                              <img
                                src={selectedReport.customerSignature}
                                alt="Tanda Tangan Pelanggan"
                                className="max-h-full max-w-full object-contain"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div>
                    <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2.5">
                      Bukti Foto Pekerjaan ({selectedReport.photos.length})
                    </h4>
                    {selectedReport.photos.length === 0 ? (
                      <p className="text-xs text-[var(--text-muted)]">Belum ada foto dokumentasi.</p>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {selectedReport.photos.map(photo => (
                          <button
                            key={photo.id}
                            type="button"
                            onClick={() => setViewingPhoto(photo)}
                            className="group relative rounded-xl overflow-hidden border border-[var(--border-subtle)] cursor-pointer hover:border-[var(--accent)] transition-all aspect-video bg-black text-left"
                          >
                            <AuthedImage
                              path={photo.url}
                              alt="Bukti foto pekerjaan"
                              purged={!!photo.purgedAt}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            />
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 text-white pointer-events-none">
                              <span className="text-xs font-bold block uppercase tracking-wide">
                                {photo.photoTag
                                  ? photo.photoTag === 'BEFORE'
                                    ? 'Kondisi Awal'
                                    : 'Hasil Perlakuan'
                                  : photo.photoType.replace('_', ' ')}
                              </span>
                              <span className="text-[11px] text-slate-300 font-mono block">
                                {new Date(photo.capturedAt).toLocaleTimeString('id-ID')} WIB
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2.5">
                      Catatan Evaluasi &amp; Anomali
                    </h4>
                    {selectedReport.riskEvents.length === 0 ? (
                      <div className="bg-[var(--status-completed-bg)] border border-[var(--status-completed-border)] p-3.5 rounded-xl text-[var(--status-completed-text)] text-xs">
                        Tidak ada anomali terdeteksi pada laporan ini.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {selectedReport.riskEvents.map(evt => (
                          <div
                            key={evt.id}
                            className="p-3.5 rounded-xl border border-[var(--status-flagged-border)] bg-[var(--status-flagged-bg)] flex items-start justify-between gap-3 text-xs"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-[var(--status-flagged-text)]">{evt.title}</span>
                                <span className="text-[11px] font-bold px-1.5 py-0.2 rounded bg-black/10 text-[var(--status-flagged-text)]">
                                  {evt.severity}
                                </span>
                              </div>
                              <p className="text-[var(--text-secondary)]">{evt.description}</p>
                              {evt.expectedValue && evt.actualValue && (
                                <div className="text-xs text-[var(--text-muted)] font-mono mt-1">
                                  Standar:{' '}
                                  <span className="text-[var(--text-primary)] font-semibold">{evt.expectedValue}</span>{' '}
                                  | Aktual:{' '}
                                  <span className="text-[var(--status-flagged-text)] font-bold">{evt.actualValue}</span>
                                </div>
                              )}
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-base font-black text-[var(--status-flagged-text)] font-mono tabular-nums">
                                +{evt.points}
                              </span>
                              <span className="block text-[11px] text-[var(--text-muted)] font-semibold uppercase">
                                Poin
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {selectedReport.status === 'REVIEWED' && (
                    <div className="bg-[var(--status-reviewed-bg)] border border-[var(--status-reviewed-border)] p-4 rounded-xl text-xs space-y-1">
                      <span className="font-bold text-[var(--status-reviewed-text)] block">
                        Laporan Telah Ditinjau
                      </span>
                      <p className="text-[var(--text-secondary)]">Catatan: &quot;{selectedReport.reviewNotes}&quot;</p>
                    </div>
                  )}

                  {selectedReport.status !== 'REVIEWED' && (
                    <div className="pt-4 border-t border-[var(--border-subtle)]">
                      {!isReviewing ? (
                        <button
                          type="button"
                          onClick={() => setIsReviewing(true)}
                          className="px-4 py-2.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-bold transition-all cursor-pointer"
                        >
                          Verifikasi / Tinjau Laporan Ini
                        </button>
                      ) : (
                        <div className="bg-[var(--bg-tertiary)] p-4 rounded-xl border border-[var(--border-subtle)] space-y-3">
                          <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase">
                            Catatan Verifikasi Admin *
                          </label>
                          <textarea
                            rows={2}
                            placeholder="Contoh: Telah dikonfirmasi via telepon, GPS bergeser karena berada di ruang bawah tanah..."
                            value={adminReviewNotes}
                            onChange={e => setAdminReviewNotes(e.target.value)}
                            className="w-full p-2.5 rounded-lg border border-[var(--border-subtle)] text-xs focus:outline-none focus:ring-2 focus:ring-[var(--accent)] resize-none bg-[var(--bg-card)] text-[var(--text-primary)]"
                          />
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setIsReviewing(false)}
                              disabled={isSubmittingReview}
                              className="px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] text-[var(--text-secondary)] text-xs font-semibold hover:bg-[var(--bg-card)] cursor-pointer"
                            >
                              Batal
                            </button>
                            <button
                              type="button"
                              onClick={handleAdminReview}
                              disabled={!adminReviewNotes.trim() || isSubmittingReview}
                              className="px-4 py-1.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                            >
                              {isSubmittingReview ? (
                                <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                              ) : (
                                <Check size={14} aria-hidden="true" />
                              )}
                              <span>{isSubmittingReview ? 'Menyimpan...' : 'Simpan & Tandai Selesai Ditinjau'}</span>
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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 sm:p-6"
          onClick={() => setSelectedProject(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Detail Proyek"
        >
          <div
            className="relative w-full max-w-3xl clean-card bg-[var(--bg-card)] rounded-2xl shadow-2xl border border-[var(--border-subtle)] flex flex-col max-h-[90vh] sm:max-h-[85vh] overflow-hidden text-[var(--text-primary)]"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-tertiary)] shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded border shrink-0 ${
                    getServiceTypeMeta(selectedProject.serviceType).badgeClass
                  }`}
                >
                  {getServiceTypeMeta(selectedProject.serviceType).label}
                </span>
                <h2 className="text-lg font-bold text-[var(--text-primary)] truncate">{selectedProject.projectName}</h2>
              </div>
              <button
                type="button"
                aria-label="Tutup detail proyek"
                onClick={() => setSelectedProject(null)}
                className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition-colors cursor-pointer"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            <div className="overflow-y-auto p-4 sm:p-6 space-y-6 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-[var(--bg-tertiary)] p-4 rounded-xl border border-[var(--border-subtle)] space-y-3 text-xs">
                  <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                    Informasi Proyek
                  </h4>
                  <div>
                    <span className="text-[var(--text-muted)] block text-[11px]">KLIEN</span>
                    <span className="font-bold text-[var(--text-primary)]">{selectedProject.clientName}</span>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)] block text-[11px]">ALAMAT</span>
                    <span className="font-bold text-[var(--text-primary)]">{selectedProject.address}</span>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)] block text-[11px]">FOKUS TARGET</span>
                    <span className="font-bold text-[var(--text-primary)]">
                      {selectedProject.targetFocus?.length
                        ? selectedProject.targetFocus.join(', ')
                        : selectedProject.focusTarget || '-'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[var(--border-subtle)]">
                    <div>
                      <span className="text-[var(--text-muted)] block text-[11px]">KONTRAK</span>
                      <span className="font-bold text-[var(--text-primary)]">
                        {selectedProject.contractType === 'RECURRING' ? 'Berkala' : 'Sekali Layanan'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[var(--text-muted)] block text-[11px]">TANGGAL / JADWAL</span>
                      <span className="font-bold text-[var(--text-primary)]">{selectedProject.workDate}</span>
                    </div>
                    <div>
                      <span className="text-[var(--text-muted)] block text-[11px]">GARANSI</span>
                      <span className="font-bold text-[var(--text-primary)]">
                        {selectedProject.warrantyMonths > 0 ? `${selectedProject.warrantyMonths} bln` : '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[var(--text-muted)] block text-[11px]">LUAS AREA</span>
                      <span className="font-bold text-[var(--text-primary)]">
                        {selectedProject.buildingAreaSqm ? `${selectedProject.buildingAreaSqm} m²` : '-'}
                      </span>
                    </div>
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
                <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                  Histori Laporan Pekerjaan
                </h4>
                <div className="space-y-2">
                  {reports.filter(r => r.project.id === selectedProject.id).length === 0 ? (
                    <div className="text-sm text-[var(--text-muted)] text-center py-6 bg-[var(--bg-tertiary)] rounded-xl border border-[var(--border-subtle)]">
                      Belum ada laporan untuk proyek ini.
                    </div>
                  ) : (
                    reports
                      .filter(r => r.project.id === selectedProject.id)
                      .map(r => {
                        const statusMeta = getWorkReportStatusMeta(r.status as WorkReportStatus);
                        return (
                          <div
                            key={r.id}
                            className="clean-card bg-[var(--bg-card)] p-3 sm:p-4 rounded-xl border border-[var(--border-subtle)] flex flex-col sm:flex-row gap-3 sm:items-center justify-between transition-colors"
                          >
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span
                                  className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded border ${statusMeta.badgeClass}`}
                                >
                                  {statusMeta.label}
                                </span>
                                <span className="text-xs font-bold text-[var(--text-secondary)]">
                                  {new Date(r.createdAt).toLocaleDateString('id-ID', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                  })}
                                </span>
                              </div>
                              <div className="text-sm font-semibold text-[var(--text-primary)]">{r.executor.name}</div>
                              <div className="text-xs text-[var(--text-muted)]">
                                Check-in:{' '}
                                {r.checkInAt
                                  ? new Date(r.checkInAt).toLocaleTimeString('id-ID', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })
                                  : '-'}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedProject(null);
                                setSelectedReportId(r.id);
                              }}
                              className="text-xs font-bold text-[var(--accent-text)] whitespace-nowrap bg-[var(--accent-muted)] px-3 py-1.5 rounded-lg shrink-0 text-center cursor-pointer"
                            >
                              Buka Detail
                            </button>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {viewingPhoto && <PhotoViewerModal photo={viewingPhoto} onClose={() => setViewingPhoto(null)} />}
      {showChangePassword && <ChangePasswordModal onClose={() => setShowChangePassword(false)} />}
    </AppLayout>
  );
};

const RiskConfigPanel: React.FC<{
  config: RiskConfig | null;
  onSave: (partial: Partial<RiskConfig>) => Promise<void>;
  onReset?: () => Promise<void>;
}> = ({ config, onSave, onReset }) => {
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
          className="w-20 px-2 py-1 text-xs text-right rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-[var(--text-primary)] font-mono tabular-nums"
        />
        <span className="text-xs text-[var(--text-muted)] w-10">{unit}</span>
      </div>
    </div>
  );

  const handleSave = async () => {
    if (!draft || saving) return;
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
      <div className="clean-card bg-[var(--bg-card)] p-5 rounded-xl border border-[var(--border-subtle)]">
        <h3 className="font-bold text-sm text-[var(--text-primary)] mb-1">Ambang Batas Poin Risiko</h3>
        <p className="text-xs text-[var(--text-muted)] mb-3">
          Nilai ini menentukan bobot poin evaluasi presensi dan durasi kerja lapangan.
        </p>
        {field('lateCheckinThresholdMinutes', 'Batas keterlambatan check-in', 'menit')}
        {field('lateCheckinPoints', 'Poin check-in terlambat', 'poin')}
        {field('outsideRadiusPoints', 'Poin GPS di luar radius', 'poin')}
        {field('shortDurationCriticalMinutes', 'Durasi sangat singkat (batas)', 'menit')}
        {field('shortDurationCriticalPoints', 'Poin durasi sangat singkat', 'poin')}
        {field('shortDurationWarningMinutes', 'Durasi singkat (batas)', 'menit')}
        {field('shortDurationWarningPoints', 'Poin durasi singkat', 'poin')}
      </div>
      <div className="clean-card bg-[var(--bg-card)] p-5 rounded-xl border border-[var(--border-subtle)]">
        <h3 className="font-bold text-sm text-[var(--text-primary)] mb-1">Dokumentasi &amp; Level Risiko</h3>
        <p className="text-xs text-[var(--text-muted)] mb-3">
          Batas skor yang menentukan kategori status risiko pada dashboard.
        </p>
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
      <div className="lg:col-span-2 flex flex-wrap items-center justify-end gap-3">
        {saved && <span className="text-xs font-semibold text-[var(--status-completed-text)]">Konfigurasi tersimpan.</span>}
        {onReset && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                type="button"
                className="px-4 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] hover:bg-[var(--bg-tertiary)] text-xs font-semibold text-[var(--text-secondary)] transition-colors cursor-pointer"
              >
                Kembalikan ke Standar Bawaan
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Kembalikan Konfigurasi Poin ke Nilai Bawaan?</AlertDialogTitle>
                <AlertDialogDescription>
                  Seluruh batas poin kehadiran dan risiko akan dikembalikan ke nilai standar sistem. Anda masih dapat mengurungkan tindakan ini sesaat setelah direset.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="font-medium">Batalkan</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => void onReset()}
                  className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-bold"
                >
                  Ya, Reset ke Bawaan
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-bold shadow-sm transition-all disabled:opacity-60 flex items-center gap-2 cursor-pointer"
        >
          {saving && <Loader2 size={16} className="animate-spin" aria-hidden="true" />} Simpan Konfigurasi
        </button>
      </div>
    </div>
  );
};

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
      setError(err instanceof ApiError ? err.message : 'Gagal memuat perkiraan retensi foto.');
    } finally {
      setIsLoadingPreview(false);
    }
  }, []);

  useEffect(() => {
    void loadPreview(months);
  }, [months, loadPreview]);

  const handlePurge = async () => {
    if (isPurging) return;
    setIsPurging(true);
    setError(null);
    try {
      const result = await purgeOldPhotos(months);
      setResultMessage(
        `${result.purgedCount} foto berhasil dihapus${
          result.failedCount > 0 ? `, ${result.failedCount} gagal` : ''
        }. Data laporan lainnya tidak berubah.`
      );
      setConfirmOpen(false);
      await loadPreview(months);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal menghapus foto lama.');
    } finally {
      setIsPurging(false);
    }
  };

  return (
    <div className="clean-card bg-[var(--bg-card)] p-5 rounded-xl border border-[var(--border-subtle)]">
      <h3 className="font-bold text-sm text-[var(--text-primary)] mb-1">
        Retensi Penyimpanan Foto
      </h3>
      <p className="text-xs text-[var(--text-muted)] mb-4">
        Menghapus <strong>file foto</strong> yang lebih lama dari batas waktu di bawah untuk menghemat penyimpanan. Data laporan, GPS, timestamp, riwayat treatment, dan audit log <strong>tidak ikut terhapus</strong> — hanya gambarnya.
      </p>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <span className="text-xs font-semibold text-[var(--text-secondary)]">Hapus foto lebih lama dari:</span>
        <div className="flex flex-wrap gap-1.5">
          {[1, 2, 3, 6, 12].map(m => (
            <button
              key={m}
              type="button"
              onClick={() => setMonths(m)}
              className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-all cursor-pointer ${
                months === m
                  ? 'bg-rose-600 text-white border-rose-600'
                  : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:bg-[var(--bg-tertiary)]'
              }`}
            >
              {m} bulan
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className="text-xs text-[var(--status-flagged-text)] bg-[var(--status-flagged-bg)] border border-[var(--status-flagged-border)] rounded-lg px-3 py-2 mb-3">
          {error}
        </p>
      )}
      {resultMessage && (
        <p className="text-xs text-[var(--status-completed-text)] bg-[var(--status-completed-bg)] border border-[var(--status-completed-border)] rounded-lg px-3 py-2 mb-3">
          {resultMessage}
        </p>
      )}

      <div className="bg-[var(--bg-tertiary)] rounded-lg p-3.5 border border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {isLoadingPreview ? (
          <span className="text-xs text-[var(--text-muted)]">Menghitung foto yang memenuhi syarat...</span>
        ) : preview ? (
          <div className="text-xs text-[var(--text-secondary)]">
            <span className="font-bold text-[var(--text-primary)] text-base font-mono tabular-nums">
              {preview.eligibleCount}
            </span>{' '}
            foto akan dihapus
            {preview.oldestPhotoDate && (
              <span> (paling lama: {new Date(preview.oldestPhotoDate).toLocaleDateString('id-ID')})</span>
            )}
          </div>
        ) : null}

        {!confirmOpen ? (
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            disabled={isLoadingPreview || !preview || preview.eligibleCount === 0}
            className="text-xs font-bold px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            Hapus Sekarang
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[var(--status-flagged-text)]">Yakin hapus permanen?</span>
            <button
              type="button"
              onClick={() => setConfirmOpen(false)}
              disabled={isPurging}
              className="text-xs px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] text-[var(--text-secondary)] cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
                              onClick={handlePurge}
              disabled={isPurging}
              className="text-xs font-bold px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1.5 disabled:opacity-60 cursor-pointer"
            >
              {isPurging && <Loader2 size={13} className="animate-spin" aria-hidden="true" />} Ya, Hapus
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
