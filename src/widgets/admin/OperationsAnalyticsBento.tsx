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

  // Live Map drawer states
  const [mapDrawerOpen, setMapDrawerOpen] = useState<boolean>(true);
  const [mapBucketFilter, setMapBucketFilter] = useState<'pending' | 'delayed' | 'completed'>('pending');
  const [mapSearchQuery, setMapSearchQuery] = useState<string>('');

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
    const q = mapSearchQuery.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter(
      p =>
        p.projectName.toLowerCase().includes(q) ||
        p.clientName.toLowerCase().includes(q) ||
        p.address.toLowerCase().includes(q)
    );
  }, [projects, mapSearchQuery]);

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
          {/* 12-Column Operation Center Grid */}
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-2xl p-4 sm:p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4 items-stretch">
              {/* Col 1 (3 cols): Tugas Ditugaskan Hari Ini + Tenaga Kerja Hari Ini */}
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

              {/* Col 2 (3 cols): Kunjungan Pelanggan Hari Ini + Tingkat Pembatalan / Anomali */}
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

              {/* Col 3 (3 cols): Efisiensi Operasional */}
              <div className="xl:col-span-3">
                <JarivisEfficiencyCard
                  avgStartTime={computed.operationCenter.efficiency.avgStartTime}
                  avgEndTime={computed.operationCenter.efficiency.avgEndTime}
                  avgDuration={computed.operationCenter.efficiency.avgDuration}
                />
              </div>

              {/* Col 4 (3 cols): Deep Crimson "PERLU PERHATIAN!" Card */}
              <div className="xl:col-span-3">
                <JarivisCrimsonAttentionCard
                  rows={computed.operationCenter.attentionRows}
                  onSelectRow={handleAttentionAction}
                  onOpenDetail={onOpenAnomaliesTab}
                />
              </div>
            </div>
          </div>

          {/* Idle Workforce / Pending Quotation Alert Banner */}
          <JarivisIdleAlertBanner
            idleStaffCount={computed.operationCenter.idleStaffCount}
            draftQuotationsCount={quotationSummary?.draftCount ?? 0}
            onReviewStaff={() => onOpenExecutorsTab?.()}
            onReviewQuotations={() =>
              (onOpenQuotationsTab || quotationSummary?.onOpenQuotations)?.()
            }
          />

          {/* Bottom Section: BEBAN KERJA SAAT INI */}
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

            {/* Active Workload List or Calm Empty State */}
            {(summary.priorityReports ?? []).length === 0 && reports.length === 0 ? (
              <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl py-12 px-4 text-center space-y-2">
                <div className="w-16 h-16 rounded-2xl bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] mx-auto flex items-center justify-center text-xl font-bold text-[#3b82f6]">
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
                onClick: onOpenExecutorsTab,
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

          {/* Full-Width Map Canvas with Jarivis Floating Overlays */}
          <div className="relative rounded-2xl overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-card)]">
            <AllProjectsMap
              projects={filteredProjectsForMap}
              userLocations={userLocations}
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

                {/* 3 Bucket Pills */}
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

                {/* Search Input inside Floating Drawer */}
                <input
                  type="search"
                  value={mapSearchQuery}
                  onChange={e => setMapSearchQuery(e.target.value)}
                  placeholder="Cari pelanggan atau lokasi..."
                  className="w-full h-9 px-3 rounded-xl bg-[#1c2026] border border-[#282d37] text-xs text-white placeholder:text-[#9ca3af] focus:outline-none focus:border-[#3b82f6]"
                />

                {/* Filtered Customer List or Empty State */}
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

            {/* Floating Center Empty Toast when 0 locations exist on map */}
            {filteredProjectsForMap.length === 0 && userLocations.length === 0 && (
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

            {/* Floating Bottom-Right Legenda Card (Jarivis Style) */}
            <div className="absolute bottom-3 right-3 z-[450] bg-[#14171c]/95 text-white border border-[#282d37] rounded-xl p-3 text-[11px] shadow-xl space-y-1.5 min-w-[140px]">
              <span className="font-bold block text-xs mb-1">Legenda</span>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full border-2 border-[#3b82f6] inline-block" />
                <span className="text-[#d1d5db]">Idle</span>
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
              {/* Col 1 (3 cols): Tingkat Kehadiran & Tingkat Penundaan */}
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

              {/* Col 2 (3 cols): Tingkat Penyelesaian & Tingkat Pembatalan Tugas */}
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

              {/* Col 3 (3 cols): Rata-Rata Tugas Ditugaskan & Selesai per Anggota */}
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

              {/* Col 4 (3 cols): Efisiensi Operasional */}
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

          {/* Section 3: Daftar Tugas yang Selesai per Kategori Layanan (from app.jarivis.com Beranda) */}
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
        </div>
      )}
    </div>
  );
};
