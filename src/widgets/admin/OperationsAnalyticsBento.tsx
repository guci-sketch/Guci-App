import React, { useMemo } from 'react';
import { KPIStats, WorkReportStatus } from '@/entities/types';
import {
  BentoGrid,
  BentoMetricItem,
  BentoPriorityItem,
  BentoStatusRow,
  BentoTrendPoint,
  BentoSkeleton,
  BentoErrorState,
  OperationalKpiCard,
  PriorityVerificationCard,
  StatusCompositionCard,
  WorkTrendChartCard,
  formatNumberId,
} from '@/shared/ui/analytics-bento';
import {
  CANONICAL_REPORT_STATUSES,
  buildDateWindowKeys,
} from '@/shared/utils/operationalSummary';
import { getWorkReportStatusMeta } from '@/shared/utils/riskMeta';
import { RiskBadge } from '../common/RiskBadge';

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
  onOpenReportDetail: (reportId: string) => void;
}

const shortDateFmt = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
});

const fullDateFmt = new Intl.DateTimeFormat('id-ID', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const dateTimeFmt = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

function formatIsoDateKey(key: string, mode: 'short' | 'full'): string {
  if (!key) return '';
  const [y, m, d] = key.split('-').map(Number);
  if (!y || !m || !d) return key;
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return mode === 'short' ? shortDateFmt.format(dt) : fullDateFmt.format(dt);
}

export const OperationsAnalyticsBento: React.FC<OperationsAnalyticsBentoProps> = ({
  summary,
  quotationSummary,
  isLoading,
  isRefreshing = false,
  error,
  staleRefreshError,
  activeStatusFilter,
  previousStatusFilter,
  onRetry,
  onRefresh,
  onSelectStatusFilter,
  onUndoStatusFilter,
  onOpenAnomaliesTab,
  onOpenReportDetail,
}) => {
  const windowDays = summary?.windowDays ?? 30;
  const periodLabel = `${windowDays} hari terakhir`;

  const periodRangeText = useMemo(() => {
    const start = summary?.periodStart;
    const end = summary?.periodEnd;
    if (start && end) {
      return `${formatIsoDateKey(start, 'short')} – ${formatIsoDateKey(end, 'short')}`;
    }
    const keys = buildDateWindowKeys(new Date(), windowDays);
    if (keys.length >= 2) {
      return `${formatIsoDateKey(keys[0], 'short')} – ${formatIsoDateKey(keys[keys.length - 1], 'short')}`;
    }
    return undefined;
  }, [summary?.periodStart, summary?.periodEnd, windowDays]);

  const updatedTimeLabel = useMemo(() => {
    if (!summary?.generatedAt) return null;
    const d = new Date(summary.generatedAt);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  }, [summary?.generatedAt]);

  const companionMetrics = useMemo<BentoMetricItem[]>(() => {
    if (!summary) return [];
    const completionRate =
      summary.totalJobs > 0 ? Math.round((summary.completedJobs / summary.totalJobs) * 100) : 0;

    return [
      {
        id: 'completed',
        label: 'Selesai Terverifikasi',
        value: summary.completedJobs,
        badgeText: summary.totalJobs > 0 ? `${completionRate}%` : '0%',
        badgeTone: 'success',
        subText: 'Pekerjaan selesai dan telah ditinjau',
        actionLabel: 'Lihat',
        active: activeStatusFilter === 'COMPLETED',
        onAction: () => onSelectStatusFilter('COMPLETED'),
      },
      {
        id: 'working',
        label: 'Sedang Berlangsung',
        value: summary.workingJobs,
        badgeTone: summary.workingJobs > 0 ? 'info' : 'neutral',
        subText: 'Teknisi sedang bekerja di lokasi proyek',
        actionLabel: 'Lihat',
        active: activeStatusFilter === 'WORKING',
        onAction: () => onSelectStatusFilter('WORKING'),
      },
      {
        id: 'flagged',
        label: 'Perlu Pemeriksaan',
        value: summary.flaggedJobs,
        badgeText:
          summary.highRiskCount > 0
            ? `${formatNumberId(summary.highRiskCount)} Risiko Tinggi`
            : undefined,
        badgeTone: summary.flaggedJobs > 0 || summary.highRiskCount > 0 ? 'danger' : 'neutral',
        subText: 'Terdapat catatan lokasi GPS atau durasi kerja',
        actionLabel: 'Periksa',
        onAction: onOpenAnomaliesTab,
      },
    ];
  }, [summary, activeStatusFilter, onSelectStatusFilter, onOpenAnomaliesTab]);

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

  const statusRows = useMemo<BentoStatusRow[]>(() => {
    const total = summary?.totalJobs ?? 0;
    const breakdownMap = new Map<WorkReportStatus, number>();
    for (const item of summary?.statusBreakdown ?? []) {
      breakdownMap.set(item.status, item.count);
    }

    return CANONICAL_REPORT_STATUSES.map(status => {
      const meta = getWorkReportStatusMeta(status);
      const count = breakdownMap.get(status) ?? 0;
      const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
      const isSelected = activeStatusFilter === status;

      return {
        statusKey: status,
        label: meta.label,
        description: meta.description,
        count,
        percentage,
        barColor: meta.barColor,
        badgeClass: meta.badgeClass,
        dotClass: meta.dotClass,
        isVerifiedGroup: meta.isVerifiedComplete,
        isSelected,
        onSelect: () => onSelectStatusFilter(status),
      };
    });
  }, [summary?.totalJobs, summary?.statusBreakdown, activeStatusFilter, onSelectStatusFilter]);

  const priorityItems = useMemo<BentoPriorityItem[]>(() => {
    const raw = summary?.priorityReports ?? [];
    return raw.map(item => {
      const statusMeta = getWorkReportStatusMeta(item.status);
      const durationMin = item.durationSeconds != null ? Math.round(item.durationSeconds / 60) : null;
      const notes: string[] = [];
      if (item.checkInValid === false && item.checkInDistance != null) {
        notes.push(`GPS ${formatNumberId(item.checkInDistance)}m di luar titik`);
      }
      if (durationMin !== null && durationMin > 0) {
        notes.push(`Durasi ${durationMin} menit`);
      }

      return {
        id: item.id,
        projectName: item.projectName,
        clientName: item.clientName,
        executorName: item.executorName,
        dateFormatted: dateTimeFmt.format(new Date(item.createdAt)),
        isFlagged: item.status === 'FLAGGED',
        statusLabel: statusMeta.label,
        statusBadgeClass: statusMeta.badgeClass,
        riskNode: <RiskBadge level={item.riskLevel} score={item.riskScore} size="sm" />,
        contextNote: notes.join(' • ') || undefined,
        onOpenDetail: () => onOpenReportDetail(item.id),
      };
    });
  }, [summary?.priorityReports, onOpenReportDetail]);

  if (isLoading && !summary) {
    return <BentoSkeleton />;
  }

  if (error && !summary) {
    return <BentoErrorState message={error} onRetry={onRetry} isRetrying={isRefreshing} />;
  }

  if (!summary) {
    return null;
  }

  const priorityUniqueCount =
    summary.priorityUniqueCount ??
    Math.max(summary.flaggedJobs, summary.highRiskCount, priorityItems.length);

  return (
    <div className="space-y-6">
      {/* Clean Contextual Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] tracking-tight">
            Ringkasan Pekerjaan &amp; Operasional
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            Data perusahaan untuk <strong>{periodLabel}</strong>
            {periodRangeText ? ` (${periodRangeText})` : ''}
            {updatedTimeLabel ? ` • Diperbarui pukul ${updatedTimeLabel} WIB` : ''}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {previousStatusFilter !== undefined && previousStatusFilter !== null && onUndoStatusFilter && (
            <button
              type="button"
              onClick={onUndoStatusFilter}
              className="min-h-[40px] px-3.5 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] hover:bg-[var(--bg-tertiary)] text-xs sm:text-sm font-semibold text-[var(--text-primary)] transition-colors cursor-pointer btn-tactile"
            >
              Urungkan Filter Status
            </button>
          )}

          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            aria-busy={isRefreshing}
            className="min-h-[40px] px-4 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] hover:bg-[var(--bg-tertiary)] text-xs sm:text-sm font-semibold text-[var(--text-primary)] transition-colors disabled:opacity-60 cursor-pointer btn-tactile"
          >
            {isRefreshing ? 'Memperbarui...' : 'Perbarui Data'}
          </button>
        </div>
      </div>

      {/* Stale Data Warning Banner if Refresh Failed while Previous Data is Shown */}
      {staleRefreshError && (
        <div
          role="status"
          className="p-4 rounded-xl border border-[var(--status-draft-border)] bg-[var(--status-draft-bg)] text-[var(--status-draft-text)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm"
        >
          <span>
            <strong>Data terbaru belum berhasil dimuat:</strong> {staleRefreshError} Menampilkan data terakhir yang tersimpan.
          </span>
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="self-start sm:self-auto px-3.5 py-1.5 rounded-lg bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--border-subtle)] font-semibold hover:bg-[var(--bg-tertiary)] transition-colors shrink-0 cursor-pointer"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {/* Optional Executive Quotation Summary Bar (Minimalist 4-stat bar when quotation data is present) */}
      {quotationSummary && (
        <div className="clean-card bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-[var(--text-primary)]">
              Status Penawaran Harga (Quotation)
            </h3>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
              Ringkasan cepat dokumen penawaran yang sedang berjalan
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1 max-w-2xl">
            <div className="p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)]">
              <span className="text-xs text-[var(--text-secondary)] block">Semua Penawaran</span>
              <strong className="text-lg sm:text-xl font-bold font-mono tabular-nums text-[var(--text-primary)]">
                {formatNumberId(quotationSummary.totalQuotations)}
              </strong>
            </div>
            <div className="p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)]">
              <span className="text-xs text-[var(--status-draft-text)] font-medium block">Menunggu Approval</span>
              <strong className="text-lg sm:text-xl font-bold font-mono tabular-nums text-[var(--status-draft-text)]">
                {formatNumberId(quotationSummary.draftCount)}
              </strong>
            </div>
            <div className="p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)]">
              <span className="text-xs text-[var(--status-working-text)] font-medium block">Sudah Disetujui</span>
              <strong className="text-lg sm:text-xl font-bold font-mono tabular-nums text-[var(--status-working-text)]">
                {formatNumberId(quotationSummary.approvedCount)}
              </strong>
            </div>
            <div className="p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)]">
              <span className="text-xs text-[var(--status-completed-text)] font-medium block">Deal Kontrak</span>
              <strong className="text-lg sm:text-xl font-bold font-mono tabular-nums text-[var(--status-completed-text)]">
                {formatNumberId(quotationSummary.dealCount)}
              </strong>
            </div>
          </div>

          <button
            type="button"
            onClick={quotationSummary.onOpenQuotations}
            className="self-start lg:self-center min-h-[40px] px-4 py-2 rounded-xl bg-[var(--bg-primary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-subtle)] text-xs sm:text-sm font-semibold transition-colors shrink-0 cursor-pointer btn-tactile"
          >
            Buka Penawaran
          </button>
        </div>
      )}

      {/* 12-Column Operational Bento Grid */}
      <BentoGrid>
        <OperationalKpiCard
          periodLabel={periodLabel}
          periodRangeText={periodRangeText}
          totalJobs={summary.totalJobs}
          companionMetrics={companionMetrics}
          avgDurationMinutes={summary.avgDurationMinutes}
          avgRiskScore={summary.avgRiskScore}
        />

        <WorkTrendChartCard
          periodLabel={periodLabel}
          periodRangeText={periodRangeText}
          points={trendPoints}
        />

        <StatusCompositionCard
          totalJobs={summary.totalJobs}
          rows={statusRows}
          activeStatusFilter={activeStatusFilter}
          onClearFilter={() => onSelectStatusFilter('ALL')}
        />

        <PriorityVerificationCard
          priorityUniqueCount={priorityUniqueCount}
          flaggedJobsCount={summary.flaggedJobs}
          highRiskJobsCount={summary.highRiskCount}
          items={priorityItems}
          onOpenAllAnomalies={onOpenAnomaliesTab}
        />
      </BentoGrid>
    </div>
  );
};
