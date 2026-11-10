import React, { useMemo, useState } from 'react';
import {
  ExecutorStats,
  KPIStats,
  Project,
  Quotation,
  UserLocation,
  WorkReportListItem,
} from '@/entities/types';
import {
  BentoErrorState,
  BentoSkeleton,
  BentoTrendPoint,
  JARIVIS_SUB_TABS,
  JarivisBusinessKpiGrid,
  JarivisBusinessKpiItem,
  JarivisCrimsonAttentionCard,
  JarivisEfficiencyCard,
  JarivisExecutionTrendCard,
  JarivisGreetingBanner,
  JarivisIdleAlertBanner,
  JarivisLeadsFunnelCard,
  JarivisPeriodPills,
  JarivisRadialMetricCard,
  JarivisServiceCategoryCard,
  JarivisSubTabBar,
  formatDecimalId,
  formatNumberId,
} from '@/shared/ui/analytics-bento';
import {
  JarivisDashboardTabId,
  JarivisPeriodKey,
  buildDateWindowKeys,
  computeJarivisDashboardMetrics,
  getIndonesianTimeGreeting,
  shiftDateKey,
  toLocalDateKey,
} from '@/shared/utils/operationalSummary';
import { getWorkReportStatusMeta } from '@/shared/utils/riskMeta';
import { RiskBadge } from '../common/RiskBadge';
import { AllProjectsMap } from '../maps/AllProjectsMap';

export interface ExecutiveQuotationSummary {
  totalQuotations: number;
  draftCount: number;
  approvedCount: number;
  dealCount: number;
  onOpenQuotations: () => void;
}

export interface OperationsAnalyticsBentoProps {
  summary: KPIStats | null;
  quotationSummary?: ExecutiveQuotationSummary | null;
  reports?: WorkReportListItem[];
  projects?: Project[];
  executors?: ExecutorStats[];
  quotations?: Quotation[];
  userLocations?: UserLocation[];
  companyDisplayName?: string;
  isLoading: boolean;
  isRefreshing?: boolean;
  error: string | null;
  staleRefreshError?: string | null;
  activeStatusFilter: string;
  previousStatusFilter?: string | null;
  onRetry: () => void;
  onRefresh: () => void;
  onSelectStatusFilter: (status: string) => void;
  onUndoStatusFilter?: () => void;
  onOpenAnomaliesTab: () => void;
  onOpenReportsTab?: () => void;
  onOpenExecutorsTab?: () => void;
  onOpenProjectsTab?: () => void;
  onOpenQuotationsTab?: () => void;
  onOpenCustomersTab?: () => void;
  onOpenReportDetail: (reportId: string) => void;
}

const shortDateFmt = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
});

const fullDateFmt = new Intl.DateTimeFormat('id-ID', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const stepperDateFmt = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const shortYearDateFmt = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

function formatIsoDateKey(key: string, mode: 'short' | 'full' | 'stepper' | 'shortYear'): string {
  if (!key) return '';
  const [y, m, d] = key.split('-').map(Number);
  if (!y || !m || !d) return key;
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  if (mode === 'short') return shortDateFmt.format(dt);
  if (mode === 'stepper') return stepperDateFmt.format(dt);
  if (mode === 'shortYear') return shortYearDateFmt.format(dt);
  return fullDateFmt.format(dt);
}

type AttentionModalTab = 'notStarted' | 'flagged' | 'delayed' | 'noClockIn' | 'lateClockIn';
type RenewalBucketKey = '90d' | '60d' | '30d' | 'expired';

export const OperationsAnalyticsBento: React.FC<OperationsAnalyticsBentoProps> = ({
  summary,
  quotationSummary,
  reports = [],
  projects = [],
  executors = [],
  quotations = [],
  userLocations = [],
  companyDisplayName = 'Gucimas Pratama',
  isLoading,
  isRefreshing = false,
  error,
  staleRefreshError,
  previousStatusFilter,
  onRetry,
  onRefresh,
  onUndoStatusFilter,
  onOpenAnomaliesTab,
  onOpenReportsTab,
  onOpenExecutorsTab,
  onOpenProjectsTab,
  onOpenQuotationsTab,
  onOpenCustomersTab,
  onOpenReportDetail,
}) => {
  const todayKey = useMemo(() => toLocalDateKey(new Date()), []);
  const [activeSubTab, setActiveSubTab] = useState<JarivisDashboardTabId>('operationCenter');
  const [selectedDateKey, setSelectedDateKey] = useState<string>(todayKey);
  const [selectedPeriod, setSelectedPeriod] = useState<JarivisPeriodKey>('month');
  const [workloadSort, setWorkloadSort] = useState<'mostRemaining' | 'highestRisk'>('mostRemaining');

  // Modal states for Operation Center (NeedAttentionModal 5 Tabs & IdleMembersModal)
  const [attentionModalOpen, setAttentionModalOpen] = useState<boolean>(false);
  const [attentionModalTab, setAttentionModalTab] = useState<AttentionModalTab>('notStarted');
  const [idleModalOpen, setIdleModalOpen] = useState<boolean>(false);

  // Live Map drawer & layer states
  const [mapDrawerOpen, setMapDrawerOpen] = useState<boolean>(true);
  const [mapBucketFilter, setMapBucketFilter] = useState<'pending' | 'delayed' | 'completed'>('pending');
  const [mapSearchQuery, setMapSearchQuery] = useState<string>('');
  const [showMapCustomers, setShowMapCustomers] = useState<boolean>(true);
  const [showMapMembers, setShowMapMembers] = useState<boolean>(true);
  const [showMapJourney, setShowMapJourney] = useState<boolean>(false);

  // Business Renewal Contract filter
  const [renewalBucket, setRenewalBucket] = useState<RenewalBucketKey>('30d');

  const greetingText = useMemo(() => getIndonesianTimeGreeting(new Date()), []);

  const updatedTimeLabel = useMemo(() => {
    const src = summary?.generatedAt ? new Date(summary.generatedAt) : new Date();
    if (Number.isNaN(src.getTime())) return null;
    return src.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  }, [summary?.generatedAt]);

  const periodRangeDisplay = useMemo(() => {
    const start = summary?.periodStart;
    const end = summary?.periodEnd;
    if (start && end) {
      return `${formatIsoDateKey(start, 'short')} – ${formatIsoDateKey(end, 'stepper')}`;
    }
    const keys = buildDateWindowKeys(new Date(), 30);
    if (keys.length >= 2) {
      return `${formatIsoDateKey(keys[0], 'short')} – ${formatIsoDateKey(keys[keys.length - 1], 'stepper')}`;
    }
    return formatIsoDateKey(todayKey, 'full');
  }, [summary?.periodStart, summary?.periodEnd, todayKey]);

  const computed = useMemo(
    () =>
      computeJarivisDashboardMetrics({
        summary,
        reports,
        projects,
        executors,
        quotations,
        selectedDateKey,
        selectedPeriod,
      }),
    [summary, reports, projects, executors, quotations, selectedDateKey, selectedPeriod]
  );

  const trendPoints = useMemo<BentoTrendPoint[]>(() => {
    const raw = summary?.dailyTrend ?? [];
    return raw.map(pt => ({
      date: pt.date,
      labelShort: formatIsoDateKey(pt.date, 'short'),
      labelFull: formatIsoDateKey(pt.date, 'full'),
      total: pt.total,
      completed: pt.completed,
      flagged: pt.flagged,
    }));
  }, [summary?.dailyTrend]);

  const filteredMapCustomers = useMemo(() => {
    const q = mapSearchQuery.trim().toLowerCase();
    return computed.liveMap.customerLocations.filter(item => {
      if (item.bucket !== mapBucketFilter) return false;
      if (!q) return true;
      return (
        item.projectName.toLowerCase().includes(q) ||
        item.clientName.toLowerCase().includes(q) ||
        item.address.toLowerCase().includes(q)
      );
    });
  }, [computed.liveMap.customerLocations, mapBucketFilter, mapSearchQuery]);

  const filteredProjectsForMap = useMemo(() => {
    if (!showMapCustomers) return [];
    const q = mapSearchQuery.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter(
      p =>
        p.projectName.toLowerCase().includes(q) ||
        p.clientName.toLowerCase().includes(q) ||
        p.address.toLowerCase().includes(q)
    );
  }, [projects, mapSearchQuery, showMapCustomers]);

  const filteredLocationsForMap = useMemo(
    () => (showMapMembers ? userLocations : []),
    [userLocations, showMapMembers]
  );

  // Member workload & leaderboard computation for Operation Center & Performance Team
  const memberWorkloadRows = useMemo(() => {
    return executors
      .map(ex => {
        const assigned = Math.max(ex.totalJobs, ex.completedJobs);
        const remaining = Math.max(0, assigned - ex.completedJobs);
        const pct = assigned > 0 ? Math.min(100, Math.round((ex.completedJobs / assigned) * 100)) : 0;
        const compliancePct = assigned > 0 ? Math.max(0, Math.round(((assigned - ex.highRiskJobs) / assigned) * 100)) : 100;
        return {
          ...ex,
          assigned,
          remaining,
          pct,
          compliancePct,
        };
      })
      .sort((a, b) => (b.completedJobs !== a.completedJobs ? b.completedJobs - a.completedJobs : b.pct - a.pct));
  }, [executors]);

  // Idle staff list for IdleMembersModal
  const idleExecutorsList = useMemo(() => {
    const activeExecIdsToday = new Set(
      reports
        .filter(r => toLocalDateKey(r.createdAt) === selectedDateKey)
        .map(r => r.executor.id)
    );
    return executors.filter(e => e.isActive !== false && !activeExecIdsToday.has(e.id));
  }, [executors, reports, selectedDateKey]);

  // Completion by Day of Week (Senin - Minggu) & Hour of Day for Performance Team
  const completionByDayAndHour = useMemo(() => {
    const dayLabels = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const dayCounts = [0, 0, 0, 0, 0, 0, 0];
    const hourBuckets = [
      { label: '06:00–09:00', count: 0 },
      { label: '09:00–12:00', count: 0 },
      { label: '12:00–15:00', count: 0 },
      { label: '15:00–18:00', count: 0 },
      { label: '18:00–22:00', count: 0 },
    ];

    for (const r of reports) {
      if (r.status === 'COMPLETED' || r.status === 'REVIEWED') {
        const d = new Date(r.checkOutAt || r.createdAt);
        if (!Number.isNaN(d.getTime())) {
          dayCounts[d.getDay()] += 1;
          const h = d.getHours();
          if (h < 9) hourBuckets[0].count += 1;
          else if (h < 12) hourBuckets[1].count += 1;
          else if (h < 15) hourBuckets[2].count += 1;
          else if (h < 18) hourBuckets[3].count += 1;
          else hourBuckets[4].count += 1;
        }
      }
    }

    const orderedDays = [1, 2, 3, 4, 5, 6, 0].map(idx => ({
      day: dayLabels[idx],
      count: dayCounts[idx],
    }));

    return { orderedDays, hourBuckets };
  }, [reports]);

  // Renewal Contracts & Inactive Customers for Business Tab
  const businessRenewalAndInactive = useMemo(() => {
    const now = new Date();
    const contracts = projects.map(p => {
      const baseDate = p.nextServiceDate ? new Date(p.nextServiceDate) : new Date(p.workDate);
      const expiryDate = new Date(baseDate);
      if (!p.nextServiceDate && p.warrantyMonths > 0) {
        expiryDate.setMonth(expiryDate.getMonth() + p.warrantyMonths);
      }
      const daysLeft = Math.ceil((expiryDate.getTime() - now.getTime()) / 86400_000);
      let bucket: RenewalBucketKey = '90d';
      if (daysLeft < 0) bucket = 'expired';
      else if (daysLeft <= 30) bucket = '30d';
      else if (daysLeft <= 60) bucket = '60d';
      return {
        id: p.id,
        projectName: p.projectName,
        clientName: p.clientName,
        expiryDateStr: expiryDate.toISOString().slice(0, 10),
        daysLeft,
        bucket,
        contractType: p.contractType,
      };
    });

    const reportedProjectIds = new Set(reports.map(r => r.project.id));
    const inactiveCustomers = projects.filter(p => !reportedProjectIds.has(p.id));

    return {
      contracts,
      counts: {
        '90d': contracts.filter(c => c.bucket === '90d' && c.daysLeft <= 90).length,
        '60d': contracts.filter(c => c.bucket === '60d').length,
        '30d': contracts.filter(c => c.bucket === '30d').length,
        expired: contracts.filter(c => c.bucket === 'expired').length,
      },
      inactiveCustomers,
    };
  }, [projects, reports]);

  const businessKpiItems = useMemo<JarivisBusinessKpiItem[]>(() => {
    const suffix = computed.performanceTeam.comparisonSuffix;
    return [
      {
        id: 'active_customers',
        title: 'PELANGGAN AKTIF',
        value: computed.business.activeCustomersCount,
        comparisonText: `0% ${suffix}`,
        onClick: onOpenCustomersTab,
      },
      {
        id: 'expiring_contracts',
        title: 'KONTRAK KEDALUWARSA',
        value: computed.business.expiringContractsCount,
        comparisonText: `0% ${suffix}`,
        onClick: onOpenProjectsTab,
      },
      {
        id: 'total_tasks_assigned',
        title: 'TOTAL TUGAS PELANGGAN DITUGASKAN',
        value: computed.business.totalCustomerTasksAssigned,
        comparisonText: `0% ${suffix}`,
        onClick: onOpenReportsTab,
      },
      {
        id: 'total_tasks_completed',
        title: 'TOTAL TUGAS PELANGGAN SELESAI',
        value: computed.business.totalCustomerTasksCompleted,
        comparisonText: `0% ${suffix}`,
        onClick: onOpenReportsTab,
      },
      {
        id: 'new_customers',
        title: 'PELANGGAN BARU',
        value: computed.business.newCustomersOrQuotationsCount,
        comparisonText: `0% ${suffix}`,
        onClick: onOpenQuotationsTab || quotationSummary?.onOpenQuotations,
      },
      {
        id: 'inactive_customers',
        title: 'PELANGGAN TANPA AKTIVITAS',
        value: computed.business.inactiveCustomersCount,
        comparisonText: `0% ${suffix}`,
        onClick: onOpenCustomersTab,
      },
      {
        id: 'avg_assigned',
        title: 'RATA-RATA TUGAS DITUGASKAN PER PELANGGAN',
        value: computed.business.avgTasksAssignedPerCustomer,
        comparisonText: `0% ${suffix}`,
      },
      {
        id: 'avg_completed',
        title: 'RATA-RATA TUGAS SELESAI PER PELANGGAN',
        value: computed.business.avgTasksCompletedPerCustomer,
        comparisonText: `0% ${suffix}`,
      },
    ];
  }, [
    computed.business,
    computed.performanceTeam.comparisonSuffix,
    onOpenCustomersTab,
    onOpenProjectsTab,
    onOpenReportsTab,
    onOpenQuotationsTab,
    quotationSummary?.onOpenQuotations,
  ]);

  if (isLoading && !summary) {
    return <BentoSkeleton />;
  }

  if (error && !summary) {
    return <BentoErrorState message={error} onRetry={onRetry} isRetrying={isRefreshing} />;
  }

  if (!summary) {
    return null;
  }

  const currentTabMeta =
    JARIVIS_SUB_TABS.find(t => t.id === activeSubTab) ?? JARIVIS_SUB_TABS[0];

  const handleAttentionAction = (
    target: 'anomalies' | 'reports' | 'quotation' | 'executors'
  ) => {
    if (target === 'anomalies') onOpenAnomaliesTab();
    else if (target === 'reports') onOpenReportsTab?.();
    else if (target === 'quotation')
      (onOpenQuotationsTab || quotationSummary?.onOpenQuotations)?.();
    else if (target === 'executors') onOpenExecutorsTab?.();
  };

  return (
    <div className="space-y-5">
      {/* Top Sub-Tab Bar: Dasbor Personal (Operation Center | Live Map | Performance Team | Bisnis) */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div className="flex-1 min-w-0">
          <JarivisSubTabBar activeTab={activeSubTab} onSelectTab={setActiveSubTab} />
        </div>

        {previousStatusFilter !== undefined &&
          previousStatusFilter !== null &&
          onUndoStatusFilter && (
            <button
              type="button"
              onClick={onUndoStatusFilter}
              className="self-start sm:self-center min-h-[36px] px-3.5 py-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] hover:bg-[var(--bg-tertiary)] text-xs font-semibold text-[var(--text-primary)] transition-colors cursor-pointer shrink-0"
            >
              Urungkan Filter Status
            </button>
          )}
      </div>

      {/* Stale Data Warning Banner if Refresh Failed while Previous Data is Shown */}
      {staleRefreshError && (
        <div
          role="status"
          className="p-3.5 rounded-xl border border-[var(--status-draft-border)] bg-[var(--status-draft-bg)] text-[var(--status-draft-text)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm"
        >
          <span>
            <strong>Data terbaru belum berhasil dimuat:</strong> {staleRefreshError} Menampilkan data terakhir yang tersimpan.
          </span>
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="self-start sm:self-auto px-3 py-1.5 rounded-lg bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--border-subtle)] font-semibold hover:bg-[var(--bg-tertiary)] transition-colors shrink-0 cursor-pointer"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {/* Hero Greeting Banner (`GUCI EMAS OPERATION CENTER` / `LIVE MAP` / `PERFORMANCE TEAM` / `BUSINESS`) */}
      <JarivisGreetingBanner
        eyebrow={currentTabMeta.eyebrow}
        greetingText={greetingText}
        entityName={companyDisplayName}
        dateDisplayText={
          activeSubTab === 'operationCenter' || activeSubTab === 'liveMap'
            ? formatIsoDateKey(selectedDateKey, 'full')
            : periodRangeDisplay
        }
        updatedTimeText={updatedTimeLabel}
        showDateStepper={activeSubTab === 'operationCenter' || activeSubTab === 'liveMap'}
        dateStepperLabel={formatIsoDateKey(selectedDateKey, 'stepper')}
        isToday={computed.isToday}
        onPrevDate={() => setSelectedDateKey(prev => shiftDateKey(prev, -1))}
        onNextDate={() =>
          setSelectedDateKey(prev => {
            const next = shiftDateKey(prev, 1);
            return next > todayKey ? todayKey : next;
          })
        }
        onResetToday={() => setSelectedDateKey(todayKey)}
        onRefresh={onRefresh}
        isRefreshing={isRefreshing}
        rightSlot={
          activeSubTab === 'liveMap' ? (
            <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-2xl p-4 h-full flex flex-col justify-between">
              <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-1.5 mb-2">
                <span className="text-xs font-bold text-[#3b82f6] border-b-2 border-[#3b82f6] pb-1">
                  Overview
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-[11px]">
                <div className="space-y-1 border-r border-[var(--border-subtle)] pr-2">
                  <span className="font-bold text-[var(--text-primary)] block mb-1">
                    Jumlah Tugas
                  </span>
                  <div className="flex items-center justify-between text-[#f87171]">
                    <span>Belum Dikerjakan</span>
                    <strong className="font-mono">{formatNumberId(computed.liveMap.overviewTasks.pending)}</strong>
                  </div>
                  <div className="flex items-center justify-between text-[#fbbf24]">
                    <span>Ditunda / Flag</span>
                    <strong className="font-mono">{formatNumberId(computed.liveMap.overviewTasks.delayed)}</strong>
                  </div>
                  <div className="flex items-center justify-between text-[#10b981]">
                    <span>Selesai</span>
                    <strong className="font-mono">{formatNumberId(computed.liveMap.overviewTasks.completed)}</strong>
                  </div>
                </div>
                <div className="space-y-1 pl-1">
                  <span className="font-bold text-[var(--text-primary)] block mb-1">
                    Jumlah Lokasi Pelanggan
                  </span>
                  <div className="flex items-center justify-between text-[#f87171]">
                    <span>Belum Dikerjakan</span>
                    <strong className="font-mono">{formatNumberId(computed.liveMap.overviewLocations.pending)}</strong>
                  </div>
                  <div className="flex items-center justify-between text-[#fbbf24]">
                    <span>Ditunda / Cek</span>
                    <strong className="font-mono">{formatNumberId(computed.liveMap.overviewLocations.delayed)}</strong>
                  </div>
                  <div className="flex items-center justify-between text-[#10b981]">
                    <span>Selesai</span>
                    <strong className="font-mono">{formatNumberId(computed.liveMap.overviewLocations.completed)}</strong>
                  </div>
                </div>
              </div>
            </div>
          ) : undefined
        }
      />

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB 1: OPERATION CENTER (`?tab=operationCenter`)
         ═══════════════════════════════════════════════════════════════════════ */}
      {activeSubTab === 'operationCenter' && (
        <div className="space-y-4">
          {/* Ringkasan Eksekutif 5 Kartu KPI & Panel Prioritas Bergaya RedesignFieldworkGuciMasLite */}
          <div className="kpi-grid">
            {[
              { label: 'Draft', code: 'DRAFT', count: reports.filter(r => r.status === 'DRAFT').length + (quotationSummary?.draftCount || 0), sub: 'Draft SPK & Penawaran', action: () => onOpenProjectsTab?.() },
              { label: 'Siap Dikerjakan', code: 'READY', count: reports.filter(r => r.status === 'READY').length, sub: 'Menunggu check-in teknisi', action: () => onOpenProjectsTab?.() },
              { label: 'Sedang Berlangsung', code: 'WORKING', count: summary.workingJobs || reports.filter(r => r.status === 'WORKING').length, sub: 'Aktif di lapangan', action: () => onOpenReportsTab?.() },
              { label: 'Selesai', code: 'COMPLETED', count: summary.completedJobs || reports.filter(r => r.status === 'COMPLETED' || r.status === 'REVIEWED').length, sub: 'Laporan selesai tercatat', action: () => onOpenReportsTab?.() },
              { label: 'Perlu Pemeriksaan', code: 'FLAGGED', count: summary.flaggedJobs || reports.filter(r => r.status === 'FLAGGED').length, sub: 'Perlu ditinjau Admin', action: () => onOpenAnomaliesTab() },
            ].map(item => (
              <button
                key={item.code}
                type="button"
                onClick={item.action}
                className={`kpi-card ${item.code.toLowerCase()}`}
              >
                <div>
                  <span>{item.label}</span>
                </div>
                <strong>{formatNumberId(item.count)}</strong>
                <small>{item.sub}</small>
              </button>
            ))}
          </div>

          <div className="dashboard-grid">
            <section className="panel priority-panel">
              <div className="section-head">
                <div>
                  <h2>Perlu tindakan</h2>
                  <p>Item prioritas yang membutuhkan perhatian Admin.</p>
                </div>
                <button type="button" onClick={() => onOpenReportsTab?.()}>
                  Lihat semua
                </button>
              </div>
              <div className="action-list">
                {reports
                  .filter(r => r.status === 'FLAGGED' || r.status === 'WORKING')
                  .slice(0, 3)
                  .map(rep => (
                    <button key={rep.id} type="button" onClick={() => onOpenReportDetail(rep.id)}>
                      <div className={`alert-icon ${rep.status === 'FLAGGED' ? 'danger' : 'info'}`}>
                        <span className="font-bold text-xs">{rep.status === 'FLAGGED' ? '!' : '●'}</span>
                      </div>
                      <div>
                        <div>
                          <strong>{rep.status === 'FLAGGED' ? 'Laporan perlu diperiksa' : 'Aktivitas lapangan berlangsung'}</strong>
                          <span className={`badge ${rep.status === 'FLAGGED' ? 'danger' : 'info'}`}>
                            <span className="badge-dot" />
                            {rep.status === 'FLAGGED' ? 'Perlu Ditinjau' : 'Sedang Berlangsung'}
                          </span>
                        </div>
                        <p>{rep.project.projectName} · {rep.executor.name}</p>
                        <small>{rep.project.address}</small>
                      </div>
                      <span className="text-[var(--secondary)] font-bold">›</span>
                    </button>
                  ))}
                {reports.filter(r => r.status === 'FLAGGED' || r.status === 'WORKING').length === 0 && (
                  <div className="py-4 text-xs text-[var(--secondary)]">
                    Seluruh penugasan berjalan normal tanpa kendala yang memerlukan eskalasi.
                  </div>
                )}
              </div>
            </section>

            <section className="panel">
              <div className="section-head">
                <div>
                  <h2>Aktivitas terbaru</h2>
                  <p>Jejak operasional lapangan terkini.</p>
                </div>
              </div>
              <div className="timeline compact">
                {reports.slice(0, 4).map(rep => {
                  const tone = rep.status === 'COMPLETED' || rep.status === 'REVIEWED' ? 'success' : rep.status === 'FLAGGED' ? 'warning' : 'info';
                  const timeStr = rep.checkInAt ? new Date(rep.checkInAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace(':', '.') : 'Hari ini';
                  return (
                    <div key={rep.id}>
                      <i className={tone} />
                      <span>
                        <strong>
                          {rep.status === 'COMPLETED' ? 'Pekerjaan selesai dicatat' : rep.status === 'WORKING' ? 'Check-in berhasil dicatat' : rep.status === 'FLAGGED' ? 'Laporan ditandai sistem' : 'Penugasan siap dikerjakan'}
                        </strong>
                        <small>{rep.executor.name} · {rep.project.projectName}</small>
                      </span>
                      <time>{timeStr}</time>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
          {/* 12-Column Operation Center Grid */}
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-2xl p-4 sm:p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4 items-stretch">
              <div className="xl:col-span-3 flex flex-col gap-4">
                <JarivisRadialMetricCard
                  title="TUGAS DITUGASKAN HARI INI"
                  percentage={computed.operationCenter.assignedTasks.pct}
                  primaryText={`${formatNumberId(computed.operationCenter.assignedTasks.completed)} tugas selesai`}
                  primaryTone="blue"
                  subText={`dari ${formatNumberId(computed.operationCenter.assignedTasks.total)} total tugas`}
                  trendText={`${Math.abs(computed.operationCenter.assignedTasks.deltaPct)}% dari kemarin`}
                  trendPositive={computed.operationCenter.assignedTasks.deltaPct >= 0}
                  onClick={onOpenReportsTab}
                />
                <JarivisRadialMetricCard
                  title="TENAGA KERJA HARI INI"
                  percentage={computed.operationCenter.workforceToday.pct}
                  primaryText={`${formatNumberId(computed.operationCenter.workforceToday.clockedIn)} clock in`}
                  primaryTone="blue"
                  subText={`dari ${formatNumberId(computed.operationCenter.workforceToday.totalStaff)} Karyawan`}
                  trendText={`${Math.abs(computed.operationCenter.workforceToday.deltaPct)}% dari kemarin`}
                  trendPositive={computed.operationCenter.workforceToday.deltaPct >= 0}
                  onClick={onOpenExecutorsTab}
                />
              </div>

              <div className="xl:col-span-3 flex flex-col gap-4">
                <JarivisRadialMetricCard
                  title="KUNJUNGAN PELANGGAN HARI INI"
                  percentage={computed.operationCenter.customerVisits.pct}
                  primaryText={`${formatNumberId(computed.operationCenter.customerVisits.visited)} kunjungan`}
                  primaryTone="blue"
                  subText={`dari ${formatNumberId(computed.operationCenter.customerVisits.totalPlanned)} total kunjungan`}
                  trendText="0% dari kemarin"
                  trendPositive={true}
                  onClick={onOpenProjectsTab}
                />
                <JarivisRadialMetricCard
                  title="TINGKAT PEMBATALAN / ANOMALI"
                  percentage={computed.operationCenter.flaggedRate.pct}
                  primaryText={`${formatNumberId(computed.operationCenter.flaggedRate.flagged)} perlu cek`}
                  primaryTone="blue"
                  subText={`dari ${formatNumberId(computed.operationCenter.flaggedRate.total)} tugas`}
                  trendText={`${Math.abs(computed.operationCenter.flaggedRate.deltaPct)}% dari kemarin`}
                  trendPositive={computed.operationCenter.flaggedRate.deltaPct <= 0}
                  onClick={onOpenAnomaliesTab}
                />
              </div>

              <div className="xl:col-span-3">
                <JarivisEfficiencyCard
                  avgStartTime={computed.operationCenter.efficiency.avgStartTime}
                  avgEndTime={computed.operationCenter.efficiency.avgEndTime}
                  avgDuration={computed.operationCenter.efficiency.avgDuration}
                />
              </div>

              <div className="xl:col-span-3">
                <JarivisCrimsonAttentionCard
                  rows={computed.operationCenter.attentionRows}
                  onSelectRow={handleAttentionAction}
                  onOpenDetail={() => setAttentionModalOpen(true)}
                />
              </div>
            </div>
          </div>

          {/* Idle Workforce / Pending Quotation Alert Banner */}
          <JarivisIdleAlertBanner
            idleStaffCount={computed.operationCenter.idleStaffCount}
            draftQuotationsCount={quotationSummary?.draftCount ?? 0}
            onReviewStaff={() => setIdleModalOpen(true)}
            onReviewQuotations={() =>
              (onOpenQuotationsTab || quotationSummary?.onOpenQuotations)?.()
            }
          />

          {/* Bottom Section 1: BEBAN KERJA SAAT INI & ANTREAN VERIFIKASI */}
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-full bg-[#3b82f6]/20 border border-[#3b82f6]/40 text-[#60a5fa] text-xs font-bold flex items-center justify-center shrink-0">
                  #
                </span>
                <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[var(--text-primary)]">
                  BEBAN KERJA SAAT INI
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-[var(--text-secondary)]">
                  {formatIsoDateKey(selectedDateKey, 'stepper')}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setWorkloadSort(prev =>
                      prev === 'mostRemaining' ? 'highestRisk' : 'mostRemaining'
                    )
                  }
                  className="px-3 py-1.5 rounded-lg bg-[#1e3a8a]/50 hover:bg-[#1e3a8a]/70 border border-[#3b82f6]/40 text-[#93c5fd] text-xs font-semibold transition-colors cursor-pointer"
                >
                  {workloadSort === 'mostRemaining' ? '≡ Sisa Terbanyak' : '≡ Risiko Tertinggi'}
                </button>
              </div>
            </div>

            {(summary.priorityReports ?? []).length === 0 && reports.length === 0 ? (
              <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl py-10 px-4 text-center space-y-2">
                <div className="w-14 h-14 rounded-2xl bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] mx-auto flex items-center justify-center text-lg font-bold text-[#3b82f6]">
                  ✓
                </div>
                <p className="text-sm font-bold text-[var(--text-primary)] pt-1">
                  Belum ada antrean beban kerja tertunda pada tanggal ini
                </p>
                <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto">
                  Daftar tugas aktif dan laporan teknisi yang membutuhkan pemeriksaan akan otomatis muncul di sini.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {[...(summary.priorityReports ?? [])]
                  .sort((a, b) =>
                    workloadSort === 'highestRisk'
                      ? b.riskScore - a.riskScore
                      : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                  )
                  .slice(0, 6)
                  .map(item => {
                    const stMeta = getWorkReportStatusMeta(item.status);
                    return (
                      <div
                        key={item.id}
                        className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-4 flex flex-col justify-between gap-3"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${stMeta.badgeClass}`}
                            >
                              {stMeta.label}
                            </span>
                            <RiskBadge level={item.riskLevel} score={item.riskScore} size="sm" />
                          </div>
                          <p className="text-sm font-bold text-[var(--text-primary)] truncate">
                            {item.projectName}
                          </p>
                          <p className="text-xs text-[var(--text-secondary)] truncate">
                            Pelaksana: {item.executorName}
                            {item.clientName ? ` • ${item.clientName}` : ''}
                          </p>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--border-subtle)] text-xs">
                          <span className="text-[var(--text-muted)] font-mono">
                            {formatIsoDateKey(toLocalDateKey(item.createdAt), 'shortYear')}
                          </span>
                          <button
                            type="button"
                            onClick={() => onOpenReportDetail(item.id)}
                            className="px-3 py-1 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-subtle)] font-semibold cursor-pointer"
                          >
                            Periksa &rsaquo;
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Bottom Section 2: PROGRES ANGGOTA & PERINGKAT LEADERBOARD TIM */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-7 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-2xl p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[var(--text-primary)]">
                  PROGRES TUGAS PER ANGGOTA
                </h3>
                <button
                  type="button"
                  onClick={onOpenExecutorsTab}
                  className="text-xs font-bold text-[#3b82f6] hover:underline cursor-pointer"
                >
                  Semua Anggota &rsaquo;
                </button>
              </div>

              {memberWorkloadRows.length === 0 ? (
                <div className="py-8 text-center text-xs text-[var(--text-muted)]">
                  Belum ada data anggota pelaksana terdaftar.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {memberWorkloadRows.slice(0, 6).map(m => (
                    <div
                      key={m.id}
                      className="p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-bold text-[var(--text-primary)] truncate">{m.name}</span>
                        <span className="font-mono text-[var(--text-secondary)] shrink-0">
                          <strong>{m.completedJobs}</strong>/{m.assigned} Selesai ({m.pct}%)
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                        <div
                          style={{ width: `${m.pct}%` }}
                          className="h-full rounded-full bg-gradient-to-r from-[#3b82f6] to-[#10b981] transition-all duration-300"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="lg:col-span-5 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-2xl p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[var(--text-primary)]">
                  LEADERBOARD ANGGOTA TERBAIK
                </h3>
                <span className="text-[11px] font-semibold text-amber-500">Top Performers</span>
              </div>

              {memberWorkloadRows.length === 0 ? (
                <div className="py-8 text-center text-xs text-[var(--text-muted)]">
                  Belum ada peringkat anggota.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {memberWorkloadRows.slice(0, 5).map((m, idx) => (
                    <div
                      key={m.id}
                      className="p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`w-7 h-7 rounded-full text-xs font-black flex items-center justify-center shrink-0 ${
                            idx === 0
                              ? 'bg-amber-500 text-slate-950'
                              : idx === 1
                              ? 'bg-slate-300 text-slate-900'
                              : idx === 2
                              ? 'bg-amber-700 text-white'
                              : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
                          }`}
                        >
                          #{idx + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[var(--text-primary)] truncate">{m.name}</p>
                          <p className="text-[11px] text-[var(--text-muted)]">
                            Kepatuhan SOP: <strong>{m.compliancePct}%</strong> • Durasi rata-rata: {m.avgDurationMinutes}m
                          </p>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-500 text-xs font-bold font-mono shrink-0">
                        {m.completedJobs} Tugas
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB 2: LIVE MAP (`?tab=liveMap`)
         ═══════════════════════════════════════════════════════════════════════ */}
      {activeSubTab === 'liveMap' && (
        <div className="space-y-4">
          {/* 5 Horizontal Status Counter Cards Above the Map */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              {
                id: 'active',
                title: 'Anggota Aktif',
                count: computed.liveMap.activeMembersCount,
                sub: 'Anggota clock in',
                badgeBg: 'bg-[#3b82f6]/15 text-[#60a5fa] border-[#3b82f6]/30',
                symbol: '⊞',
                onClick: onOpenExecutorsTab,
              },
              {
                id: 'idle',
                title: 'Anggota Idle',
                count: computed.liveMap.idleMembersCount,
                sub: 'Clock in, tanpa tugas',
                badgeBg: 'bg-[#64748b]/15 text-[#94a3b8] border-[#64748b]/30',
                symbol: '⊡',
                onClick: () => setIdleModalOpen(true),
              },
              {
                id: 'visit',
                title: 'Kunjungan Aktif',
                count: computed.liveMap.activeVisitsCount,
                sub: 'On-site, belum selesai',
                badgeBg: 'bg-[#10b981]/15 text-[#34d399] border-[#10b981]/30',
                symbol: '✓',
                onClick: onOpenReportsTab,
              },
              {
                id: 'unfinished',
                title: 'Anggota Belum Selesai',
                count: computed.liveMap.unfinishedMembersCount,
                sub: 'Tugas Belum Selesai',
                badgeBg: 'bg-[#ef4444]/15 text-[#f87171] border-[#ef4444]/30',
                symbol: '!',
                onClick: onOpenReportsTab,
              },
              {
                id: 'completed',
                title: 'Anggota Selesai',
                count: computed.liveMap.completedMembersCount,
                sub: 'Semua tugas selesai',
                badgeBg: 'bg-[#10b981]/15 text-[#34d399] border-[#10b981]/30',
                symbol: '✓',
                onClick: onOpenReportsTab,
              },
            ].map(card => (
              <div
                key={card.id}
                className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-4 flex flex-col justify-between gap-3"
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`w-8 h-8 rounded-lg border text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 ${card.badgeBg}`}
                    aria-hidden="true"
                  >
                    {card.symbol}
                  </span>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-[var(--text-primary)] block truncate">
                      {card.title}
                    </span>
                    <strong className="text-xl font-bold font-mono tabular-nums text-[var(--text-primary)] block mt-0.5">
                      {formatNumberId(card.count)}
                    </strong>
                    <span className="text-[11px] text-[var(--text-secondary)] block truncate">
                      {card.sub}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <button
                    type="button"
                    onClick={card.onClick}
                    className="text-xs font-bold text-[#3b82f6] hover:underline cursor-pointer"
                  >
                    Lihat Detail &rsaquo;
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Map Layer Control Bar (Tampilkan Pelanggan | Teknisi | Show Journey) */}
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-[var(--text-secondary)]">Kontrol Lapisan Peta:</span>
              <button
                type="button"
                onClick={() => setShowMapCustomers(v => !v)}
                className={`px-3 py-1.5 rounded-lg font-semibold border transition-colors cursor-pointer ${
                  showMapCustomers
                    ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/40'
                    : 'bg-[var(--bg-card)] text-[var(--text-muted)] border-[var(--border-subtle)]'
                }`}
              >
                {showMapCustomers ? '✓ ' : ''}Pin Pelanggan ({projects.length})
              </button>
              <button
                type="button"
                onClick={() => setShowMapMembers(v => !v)}
                className={`px-3 py-1.5 rounded-lg font-semibold border transition-colors cursor-pointer ${
                  showMapMembers
                    ? 'bg-[#3b82f6]/20 text-[#60a5fa] border-[#3b82f6]/40'
                    : 'bg-[var(--bg-card)] text-[var(--text-muted)] border-[var(--border-subtle)]'
                }`}
              >
                {showMapMembers ? '✓ ' : ''}Posisi Teknisi ({userLocations.length})
              </button>
              <button
                type="button"
                onClick={() => setShowMapJourney(v => !v)}
                className={`px-3 py-1.5 rounded-lg font-semibold border transition-colors cursor-pointer ${
                  showMapJourney
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                    : 'bg-[var(--bg-card)] text-[var(--text-muted)] border-[var(--border-subtle)]'
                }`}
              >
                {showMapJourney ? '✓ ' : ''}Tampilkan Jalur Perjalanan (Journey)
              </button>
            </div>
            <span className="text-[11px] text-[var(--text-muted)]">
              Tanggal Peta: <strong>{formatIsoDateKey(selectedDateKey, 'stepper')}</strong>
            </span>
          </div>

          {/* Full-Width Map Canvas with Jarivis Floating Overlays */}
          <div className="relative rounded-2xl overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-card)]">
            <AllProjectsMap
              projects={filteredProjectsForMap}
              userLocations={filteredLocationsForMap}
              height="520px"
            />

            {/* Floating Left Drawer: Pelanggan (Belum Dikerjakan | Ditunda | Selesai) */}
            {mapDrawerOpen ? (
              <div className="absolute top-3 left-3 z-[450] w-[260px] sm:w-[290px] max-h-[460px] bg-[#14171c]/95 text-[#f3f4f6] border border-[#282d37] rounded-2xl p-3.5 shadow-xl flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs sm:text-sm font-bold">Pelanggan</span>
                  <button
                    type="button"
                    onClick={() => setMapDrawerOpen(false)}
                    aria-label="Sembunyikan panel pelanggan"
                    className="w-6 h-6 rounded-lg hover:bg-white/10 text-xs flex items-center justify-center cursor-pointer"
                  >
                    &times;
                  </button>
                </div>

                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar text-[11px]">
                  {[
                    {
                      id: 'pending' as const,
                      label: `Belum Dikerjakan (${computed.liveMap.overviewLocations.pending})`,
                    },
                    {
                      id: 'delayed' as const,
                      label: `Ditunda (${computed.liveMap.overviewLocations.delayed})`,
                    },
                    {
                      id: 'completed' as const,
                      label: `Selesai (${computed.liveMap.overviewLocations.completed})`,
                    },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setMapBucketFilter(tab.id)}
                      className={`px-2.5 py-1 rounded-full font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                        mapBucketFilter === tab.id
                          ? 'bg-[#60a5fa] text-[#0f1115]'
                          : 'bg-[#1c2026] text-[#9ca3af] hover:text-white'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <input
                  type="search"
                  value={mapSearchQuery}
                  onChange={e => setMapSearchQuery(e.target.value)}
                  placeholder="Cari pelanggan atau lokasi..."
                  className="w-full h-9 px-3 rounded-xl bg-[#1c2026] border border-[#282d37] text-xs text-white placeholder:text-[#9ca3af] focus:outline-none focus:border-[#3b82f6]"
                />

                <div className="flex-1 overflow-y-auto space-y-2 pr-0.5 max-h-[280px]">
                  {filteredMapCustomers.length === 0 ? (
                    <div className="py-8 px-3 text-center space-y-1.5">
                      <p className="text-xs font-semibold text-[#e5e7eb]">
                        Daftar pelanggan tidak ditemukan
                      </p>
                      <p className="text-[11px] text-[#9ca3af]">
                        Belum ada titik lokasi pelanggan pada kategori ini.
                      </p>
                    </div>
                  ) : (
                    filteredMapCustomers.map(item => (
                      <div
                        key={item.id}
                        className="p-2.5 rounded-xl bg-[#1c2026] border border-[#282d37] space-y-0.5"
                      >
                        <p className="text-xs font-bold text-white truncate">
                          {item.projectName}
                        </p>
                        <p className="text-[11px] text-[#9ca3af] truncate">
                          {item.clientName}
                        </p>
                        <p className="text-[10px] text-[#6b7280] truncate">
                          {item.address}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setMapDrawerOpen(true)}
                className="absolute top-3 left-3 z-[450] px-3.5 py-2 rounded-xl bg-[#14171c]/95 text-white border border-[#282d37] text-xs font-semibold shadow-lg cursor-pointer"
              >
                Buka Panel Pelanggan ({projects.length})
              </button>
            )}

            {filteredProjectsForMap.length === 0 && filteredLocationsForMap.length === 0 && (
              <div className="pointer-events-none absolute inset-0 z-[420] flex items-center justify-center p-4">
                <div className="bg-[#14171c]/95 text-white border border-[#282d37] rounded-xl px-5 py-3.5 text-center shadow-xl max-w-sm">
                  <p className="text-xs font-bold">
                    Tidak ada yang bisa ditampilkan di peta
                  </p>
                  <p className="text-[11px] text-[#9ca3af] mt-0.5">
                    Tidak ada anggota atau pelanggan dengan lokasi pada tanggal ini.
                  </p>
                </div>
              </div>
            )}

            {/* Floating Bottom-Right Legenda Card */}
            <div className="absolute bottom-3 right-3 z-[450] bg-[#14171c]/95 text-white border border-[#282d37] rounded-xl p-3 text-[11px] shadow-xl space-y-1.5 min-w-[140px]">
              <span className="font-bold block text-xs mb-1">Legenda</span>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full border-2 border-[#3b82f6] inline-block" />
                <span className="text-[#d1d5db]">Idle / Standby</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full border-2 border-[#10b981] inline-block" />
                <span className="text-[#d1d5db]">Tugas Selesai</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full border-2 border-[#f59e0b] inline-block" />
                <span className="text-[#d1d5db]">Ditunda</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full border-2 border-[#ef4444] inline-block" />
                <span className="text-[#d1d5db]">Belum Dikerjakan</span>
              </div>
            </div>
          </div>

          {/* 3-Column Bottom Panels below Live Map: Live Activity Feed | Jadwal Hari Ini | Jadwal Mendatang */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                  UMPAN AKTIVITAS LANGSUNG (LIVE FEED)
                </h3>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              {reports.length === 0 ? (
                <p className="py-6 text-center text-xs text-[var(--text-muted)]">
                  Belum ada aktivitas check-in/out hari ini.
                </p>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {reports.slice(0, 6).map(r => (
                    <div
                      key={r.id}
                      onClick={() => onOpenReportDetail(r.id)}
                      className="p-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-[#3b82f6] cursor-pointer text-xs space-y-1 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <strong className="text-[var(--text-primary)]">{r.executor.name}</strong>
                        <span className="font-mono text-[10px] text-[var(--text-muted)]">
                          {new Date(r.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--text-secondary)] truncate">
                        {r.project.name} ({r.status})
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                  SEMUA JADWAL HARI INI ({selectedDateKey})
                </h3>
                <span className="text-xs font-mono font-bold text-[#3b82f6]">
                  {projects.filter(p => p.workDate === selectedDateKey).length}
                </span>
              </div>
              {projects.filter(p => p.workDate === selectedDateKey).length === 0 ? (
                <p className="py-6 text-center text-xs text-[var(--text-muted)]">
                  Tidak ada jadwal proyek pada tanggal {selectedDateKey}.
                </p>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {projects
                    .filter(p => p.workDate === selectedDateKey)
                    .map(p => (
                      <div key={p.id} className="p-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs">
                        <p className="font-bold text-[var(--text-primary)] truncate">{p.projectName}</p>
                        <p className="text-[11px] text-[var(--text-secondary)] truncate">
                          {p.clientName} • Mulainya: {p.scheduledStartTime || '09:00'} WIB
                        </p>
                      </div>
                    ))}
                </div>
              )}
            </div>

            <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                  JADWAL MENDATANG (UPCOMING)
                </h3>
                <button
                  type="button"
                  onClick={onOpenProjectsTab}
                  className="text-[11px] font-bold text-[#3b82f6] hover:underline cursor-pointer"
                >
                  Lihat Semua
                </button>
              </div>
              {projects.filter(p => p.workDate > selectedDateKey || Boolean(p.nextServiceDate)).length === 0 ? (
                <p className="py-6 text-center text-xs text-[var(--text-muted)]">
                  Belum ada jadwal proyek mendatang yang terdaftar.
                </p>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {projects
                    .filter(p => p.workDate > selectedDateKey || Boolean(p.nextServiceDate))
                    .slice(0, 6)
                    .map(p => (
                      <div key={p.id} className="p-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs">
                        <p className="font-bold text-[var(--text-primary)] truncate">{p.projectName}</p>
                        <p className="text-[11px] text-[var(--text-secondary)]">
                          Jadwal: <strong className="font-mono">{p.nextServiceDate || p.workDate}</strong>
                        </p>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB 3: PERFORMANCE TEAM (`?tab=performanceTeam`)
         ═══════════════════════════════════════════════════════════════════════ */}
      {activeSubTab === 'performanceTeam' && (
        <div className="space-y-4">
          {/* Section 1: Ringkasan Performa (6 Radial Cards + Efisiensi Operasional) */}
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-sm sm:text-base font-bold text-[var(--text-primary)]">
                Ringkasan Performa
              </h3>
              <JarivisPeriodPills
                selectedPeriod={selectedPeriod}
                onSelectPeriod={setSelectedPeriod}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4 items-stretch">
              <div className="xl:col-span-3 flex flex-col gap-4">
                <JarivisRadialMetricCard
                  title="TINGKAT KEHADIRAN"
                  percentage={computed.performanceTeam.attendanceRatePct}
                  showPercentageInsideRing={false}
                  primaryText={`${computed.performanceTeam.attendanceRatePct}%`}
                  primaryTone="blue"
                  subText="Kehadiran karyawan"
                  trendText={`0% ${computed.performanceTeam.comparisonSuffix}`}
                  trendPositive={true}
                />
                <JarivisRadialMetricCard
                  title="TINGKAT PENUNDAAN"
                  percentage={computed.performanceTeam.pendingRatePct}
                  showPercentageInsideRing={false}
                  primaryText={`${computed.performanceTeam.pendingRatePct}%`}
                  primaryTone="amber"
                  subText="Tugas Ditunda"
                  trendText={`0% ${computed.performanceTeam.comparisonSuffix}`}
                  trendPositive={false}
                />
              </div>

              <div className="xl:col-span-3 flex flex-col gap-4">
                <JarivisRadialMetricCard
                  title="TINGKAT PENYELESAIAN"
                  percentage={computed.performanceTeam.completionRatePct}
                  showPercentageInsideRing={false}
                  primaryText={`${computed.performanceTeam.completionRatePct}%`}
                  primaryTone="emerald"
                  subText="Tugas Selesai"
                  trendText={`0% ${computed.performanceTeam.comparisonSuffix}`}
                  trendPositive={true}
                />
                <JarivisRadialMetricCard
                  title="TINGKAT PEMBATALAN / ANOMALI TUGAS"
                  percentage={computed.performanceTeam.flaggedRatePct}
                  showPercentageInsideRing={false}
                  primaryText={`${computed.performanceTeam.flaggedRatePct}%`}
                  primaryTone="rose"
                  subText="Tugas Perlu Pemeriksaan"
                  trendText={`0% ${computed.performanceTeam.comparisonSuffix}`}
                  trendPositive={false}
                />
              </div>

              <div className="xl:col-span-3 flex flex-col gap-4">
                <JarivisRadialMetricCard
                  title="RATA-RATA TUGAS DITUGASKAN PER ANGGOTA"
                  percentage={Math.min(100, computed.performanceTeam.avgAssignedPerMember * 10)}
                  showPercentageInsideRing={false}
                  primaryText={formatDecimalId(computed.performanceTeam.avgAssignedPerMember)}
                  primaryTone="rose"
                  subText="Tugas per anggota"
                />
                <JarivisRadialMetricCard
                  title="RATA-RATA TUGAS SELESAI PER ANGGOTA"
                  percentage={Math.min(100, computed.performanceTeam.avgCompletedPerMember * 10)}
                  showPercentageInsideRing={false}
                  primaryText={formatDecimalId(computed.performanceTeam.avgCompletedPerMember)}
                  primaryTone="teal"
                  subText="Tugas per anggota"
                />
              </div>

              <div className="xl:col-span-3">
                <JarivisEfficiencyCard
                  avgStartTime={computed.operationCenter.efficiency.avgStartTime}
                  avgEndTime={computed.operationCenter.efficiency.avgEndTime}
                  avgDuration={computed.operationCenter.efficiency.avgDuration}
                />
              </div>
            </div>
          </div>

          {/* Section 2: Tren Eksekusi (Gap Tertinggi & Penyelesaian Tertinggi + Line Chart) */}
          <JarivisExecutionTrendCard
            points={trendPoints}
            highestGap={{
              count: computed.performanceTeam.highestGap.count,
              dateLabel: formatIsoDateKey(computed.performanceTeam.highestGap.dateKey, 'shortYear'),
            }}
            highestCompletion={{
              count: computed.performanceTeam.highestCompletion.count,
              dateLabel: formatIsoDateKey(
                computed.performanceTeam.highestCompletion.dateKey,
                'shortYear'
              ),
            }}
            selectedPeriod={selectedPeriod}
            onSelectPeriod={setSelectedPeriod}
          />

          {/* Section 3: Penyelesaian Berdasarkan Hari & Rentang Jam Kerja */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-2xl p-4 sm:p-5 space-y-3">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                Penyelesaian Tugas Berdasarkan Hari (Senin – Minggu)
              </h3>
              <div className="space-y-2">
                {completionByDayAndHour.orderedDays.map(d => {
                  const maxD = Math.max(1, ...completionByDayAndHour.orderedDays.map(x => x.count));
                  const pct = Math.round((d.count / maxD) * 100);
                  return (
                    <div key={d.day} className="flex items-center gap-3 text-xs">
                      <span className="w-16 font-semibold text-[var(--text-secondary)]">{d.day}</span>
                      <div className="flex-1 h-2.5 rounded-full bg-[var(--bg-card)] overflow-hidden border border-[var(--border-subtle)]">
                        <div
                          style={{ width: `${pct}%` }}
                          className="h-full rounded-full bg-[#3b82f6]"
                        />
                      </div>
                      <span className="w-10 text-right font-mono font-bold text-[var(--text-primary)]">
                        {d.count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-2xl p-4 sm:p-5 space-y-3">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                Distribusi Penyelesaian Berdasarkan Jam Kerja
              </h3>
              <div className="space-y-2.5">
                {completionByDayAndHour.hourBuckets.map(hb => {
                  const maxH = Math.max(1, ...completionByDayAndHour.hourBuckets.map(x => x.count));
                  const pct = Math.round((hb.count / maxH) * 100);
                  return (
                    <div key={hb.label} className="flex items-center gap-3 text-xs">
                      <span className="w-24 font-mono text-[var(--text-secondary)]">{hb.label}</span>
                      <div className="flex-1 h-2.5 rounded-full bg-[var(--bg-card)] overflow-hidden border border-[var(--border-subtle)]">
                        <div
                          style={{ width: `${pct}%` }}
                          className="h-full rounded-full bg-emerald-500"
                        />
                      </div>
                      <span className="w-10 text-right font-mono font-bold text-[var(--text-primary)]">
                        {hb.count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Section 4: Daftar Tugas yang Selesai per Kategori Layanan */}
          <JarivisServiceCategoryCard
            totalCompleted={computed.performanceTeam.totalCompletedInPeriod}
            slices={computed.performanceTeam.serviceSlices}
            periodLabel={computed.performanceTeam.periodLabel}
          />
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB 4: BISNIS (`?tab=business`)
         ═══════════════════════════════════════════════════════════════════════ */}
      {activeSubTab === 'business' && (
        <div className="space-y-4">
          {/* Section 1: 8-Card Business Performance Grid (`Ringkasan Performa`) */}
          <JarivisBusinessKpiGrid
            items={businessKpiItems}
            selectedPeriod={selectedPeriod}
            onSelectPeriod={setSelectedPeriod}
          />

          {/* Section 2: Leads & Quotation Funnel (`Ringkasan Leads`) */}
          <JarivisLeadsFunnelCard
            newLeadsCount={computed.business.funnel.newLeadsCount}
            contactedOrApprovedCount={computed.business.funnel.contactedOrApprovedCount}
            visitsOrDealCount={computed.business.funnel.visitsOrDealCount}
            totalEstimatedRevenueIdr={computed.business.funnel.totalEstimatedRevenueIdr}
            totalLeadsCount={computed.business.funnel.totalLeadsCount}
            selectedPeriod={selectedPeriod}
            onSelectPeriod={setSelectedPeriod}
            onOpenQuotations={() =>
              (onOpenQuotationsTab || quotationSummary?.onOpenQuotations)?.()
            }
          />

          {/* Section 3: Pembaruan Kontrak (90/60/30 Hari & Kedaluwarsa) + Pelanggan Tanpa Aktivitas */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-7 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-2xl p-4 sm:p-5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">
                    Pemantauan Pembaruan Kontrak &amp; Garansi (Renewal Contract)
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Daftar kontrak layanan yang mendekati masa pembaruan atau telah berakhir
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {([
                    { id: '90d', label: `< 90 Hari (${businessRenewalAndInactive.counts['90d']})` },
                    { id: '60d', label: `< 60 Hari (${businessRenewalAndInactive.counts['60d']})` },
                    { id: '30d', label: `< 30 Hari (${businessRenewalAndInactive.counts['30d']})` },
                    { id: 'expired', label: `Kedaluwarsa (${businessRenewalAndInactive.counts.expired})` },
                  ] as const).map(b => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setRenewalBucket(b.id)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                        renewalBucket === b.id
                          ? 'bg-[#3b82f6] text-white border-[#3b82f6]'
                          : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border-subtle)]'
                      }`}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {businessRenewalAndInactive.contracts.filter(c => c.bucket === renewalBucket).length === 0 ? (
                  <div className="py-8 text-center text-xs text-[var(--text-muted)] border border-dashed border-[var(--border-subtle)] rounded-xl">
                    Tidak ada kontrak pelanggan pada kategori periode ini.
                  </div>
                ) : (
                  businessRenewalAndInactive.contracts
                    .filter(c => c.bucket === renewalBucket)
                    .map(c => (
                      <div
                        key={c.id}
                        className="p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0">
                          <p className="font-bold text-[var(--text-primary)] truncate">{c.clientName}</p>
                          <p className="text-[11px] text-[var(--text-secondary)] truncate">{c.projectName}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <span
                            className={`px-2 py-0.5 rounded font-mono font-bold text-[11px] ${
                              c.daysLeft < 0
                                ? 'bg-rose-500/15 text-rose-500'
                                : 'bg-amber-500/15 text-amber-500'
                            }`}
                          >
                            {c.daysLeft < 0 ? `Lewat ${Math.abs(c.daysLeft)} hari` : `${c.daysLeft} hari lagi`}
                          </span>
                          <span className="block text-[10px] text-[var(--text-muted)] font-mono mt-0.5">
                            Exp: {c.expiryDateStr}
                          </span>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>

            <div className="lg:col-span-5 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-2xl p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">
                    Pelanggan Tanpa Aktivitas Kunjungan
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Lokasi pelanggan yang belum memiliki laporan pengerjaan aktif
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-rose-500/15 text-rose-400 text-xs font-mono font-bold">
                  {businessRenewalAndInactive.inactiveCustomers.length}
                </span>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {businessRenewalAndInactive.inactiveCustomers.length === 0 ? (
                  <div className="py-8 text-center text-xs text-[var(--text-muted)] border border-dashed border-[var(--border-subtle)] rounded-xl">
                    Seluruh pelanggan aktif telah memiliki jadwal/kunjungan tercatat.
                  </div>
                ) : (
                  businessRenewalAndInactive.inactiveCustomers.slice(0, 8).map(ic => (
                    <div
                      key={ic.id}
                      className="p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0">
                        <p className="font-bold text-[var(--text-primary)] truncate">{ic.clientName}</p>
                        <p className="text-[11px] text-[var(--text-muted)] truncate">{ic.projectName}</p>
                      </div>
                      <button
                        type="button"
                        onClick={onOpenCustomersTab}
                        className="px-2.5 py-1 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--accent-glow)] text-[var(--text-primary)] font-semibold shrink-0 cursor-pointer"
                      >
                        Tindak Lanjuti
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL 1: NEED ATTENTION 5-TAB MODAL (`PERLU PERHATIAN!`)
         ═══════════════════════════════════════════════════════════════════════ */}
      {attentionModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setAttentionModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Detail Perlu Perhatian"
        >
          <div
            className="w-full max-w-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-5 py-4 bg-gradient-to-r from-[#7f1d1d] to-[#450a0a] text-white flex items-center justify-between">
              <div>
                <h3 className="text-sm sm:text-base font-extrabold uppercase tracking-wider">
                  PERLU PERHATIAN! — Rincian Operasional Harian
                </h3>
                <p className="text-xs text-rose-200 mt-0.5">
                  Tanggal Evaluasi: {formatIsoDateKey(selectedDateKey, 'full')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAttentionModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="px-5 pt-3 border-b border-[var(--border-subtle)] flex gap-1.5 overflow-x-auto no-scrollbar">
              {([
                { id: 'notStarted', label: 'Tugas Belum Dikerjakan' },
                { id: 'flagged', label: 'Anomali / Dibatalkan' },
                { id: 'delayed', label: 'Tugas Ditunda' },
                { id: 'noClockIn', label: 'Tidak Absen Masuk' },
                { id: 'lateClockIn', label: 'Terlambat Absen' },
              ] as const).map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setAttentionModalTab(t.id)}
                  className={`px-3 py-2 text-xs font-bold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                    attentionModalTab === t.id
                      ? 'border-rose-500 text-rose-500'
                      : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-2.5 text-xs">
              {attentionModalTab === 'noClockIn' ? (
                idleExecutorsList.length === 0 ? (
                  <p className="py-8 text-center text-[var(--text-muted)]">
                    Seluruh anggota aktif sudah melakukan presensi hari ini.
                  </p>
                ) : (
                  idleExecutorsList.map(ex => (
                    <div
                      key={ex.id}
                      className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] flex items-center justify-between"
                    >
                      <div>
                        <p className="font-bold text-[var(--text-primary)]">{ex.name}</p>
                        <p className="text-[11px] text-[var(--text-muted)]">{ex.email}</p>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-rose-500/15 text-rose-400 font-bold">
                        Belum Clock-In
                      </span>
                    </div>
                  ))
                )
              ) : (
                (summary.priorityReports ?? []).map(item => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] flex items-center justify-between gap-3"
                  >
                    <div>
                      <p className="font-bold text-[var(--text-primary)]">{item.projectName}</p>
                      <p className="text-[11px] text-[var(--text-secondary)]">
                        Pelaksana: {item.executorName} • Status: {item.status} • Skor Risiko: {item.riskScore}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setAttentionModalOpen(false);
                        onOpenReportDetail(item.id);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold cursor-pointer shrink-0"
                    >
                      Periksa Laporan
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="px-5 py-3 border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)] flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setAttentionModalOpen(false);
                  onOpenAnomaliesTab();
                }}
                className="text-xs font-bold text-[#3b82f6] hover:underline cursor-pointer"
              >
                Buka Halaman Hasil &amp; Verifikasi Kerja Lengkap &rsaquo;
              </button>
              <button
                type="button"
                onClick={() => setAttentionModalOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-primary)] cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL 2: IDLE MEMBERS MODAL (`ANGGOTA TANPA TUGAS HARI INI`)
         ═══════════════════════════════════════════════════════════════════════ */}
      {idleModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIdleModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Daftar Anggota Tanpa Tugas"
        >
          <div
            className="w-full max-w-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-[var(--text-primary)]">
                  Daftar Karyawan Standby / Tanpa Penugasan Hari Ini ({idleExecutorsList.length})
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  Anggota aktif yang dapat langsung diberikan penugasan SPK baru
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIdleModalOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--text-secondary)] cursor-pointer"
              >
                &times;
              </button>
            </div>
            <div className="p-5 max-h-80 overflow-y-auto space-y-2.5 text-xs">
              {idleExecutorsList.length === 0 ? (
                <p className="py-6 text-center text-[var(--text-muted)]">
                  Seluruh anggota aktif sudah memiliki penugasan pada tanggal ini.
                </p>
              ) : (
                idleExecutorsList.map(ex => (
                  <div
                    key={ex.id}
                    className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] flex items-center justify-between gap-2"
                  >
                    <div>
                      <p className="font-bold text-[var(--text-primary)]">{ex.name}</p>
                      <p className="text-[11px] text-[var(--text-muted)]">
                        {ex.email} • Total selesai historis: {ex.completedJobs} tugas
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIdleModalOpen(false);
                        onOpenProjectsTab?.();
                      }}
                      className="px-3 py-1.5 rounded-lg bg-[var(--accent)] text-white font-bold cursor-pointer shrink-0"
                    >
                      Beri Tugas SPK
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
