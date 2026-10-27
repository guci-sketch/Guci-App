import React, { useState, useId } from 'react';
import { cn } from '@/shared/lib/utils';
import { Skeleton } from '@/shared/ui/skeleton';

// ─── TYPES FOR CLEAN, MINIMALIST OPERATIONAL BENTO PRIMITIVES ────────────────

export interface BentoMetricItem {
  id: string;
  label: string;
  value: number | string;
  unit?: string;
  badgeText?: string;
  badgeTone?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  subText?: string;
  actionLabel?: string;
  active?: boolean;
  onAction?: () => void;
}

export interface BentoTrendPoint {
  date: string; // YYYY-MM-DD
  labelShort: string;
  labelFull: string;
  total: number;
  completed: number;
  flagged: number;
}

export interface BentoStatusRow {
  statusKey: string;
  label: string;
  codeLabel?: string;
  description: string;
  count: number;
  percentage: number;
  barColor: string;
  badgeClass: string;
  dotClass: string;
  isVerifiedGroup?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
}

export interface BentoPriorityItem {
  id: string;
  projectName: string;
  clientName: string;
  executorName: string;
  dateFormatted: string;
  isFlagged: boolean;
  statusLabel: string;
  statusBadgeClass: string;
  riskNode: React.ReactNode;
  contextNote?: string;
  onOpenDetail: () => void;
}

// ─── FORMAT HELPERS (id-ID) ──────────────────────────────────────────────────

const numFormatterId = new Intl.NumberFormat('id-ID');

export function formatNumberId(value: number): string {
  if (!Number.isFinite(value)) return '0';
  return numFormatterId.format(Math.round(value));
}

// ─── BENTO SHELL & CARD PRIMITIVES ───────────────────────────────────────────

export const BentoGrid: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <div
    className={cn(
      'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-5 lg:gap-6 items-stretch',
      className
    )}
  >
    {children}
  </div>
);

export const BentoCard: React.FC<{
  children: React.ReactNode;
  className?: string;
  ariaLabel?: string;
}> = ({ children, className, ariaLabel }) => (
  <section
    aria-label={ariaLabel}
    className={cn(
      'clean-card bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-5 sm:p-6 flex flex-col justify-between min-w-0',
      className
    )}
  >
    {children}
  </section>
);

// ─── CARD A: OPERATIONAL SUMMARY KPI CARD (CLEAN, NO ICON SLOP) ──────────────

export interface OperationalKpiCardProps {
  periodLabel: string;
  periodRangeText?: string;
  totalJobs: number;
  companionMetrics: BentoMetricItem[];
  avgDurationMinutes: number;
  avgRiskScore: number;
  className?: string;
}

const TONE_BADGE_CLASSES: Record<NonNullable<BentoMetricItem['badgeTone']>, string> = {
  success: 'bg-[var(--status-completed-bg)] text-[var(--status-completed-text)] border-[var(--status-completed-border)]',
  warning: 'bg-[var(--status-draft-bg)] text-[var(--status-draft-text)] border-[var(--status-draft-border)]',
  danger: 'bg-[var(--status-flagged-bg)] text-[var(--status-flagged-text)] border-[var(--status-flagged-border)]',
  info: 'bg-[var(--status-working-bg)] text-[var(--status-working-text)] border-[var(--status-working-border)]',
  neutral: 'bg-[var(--status-ready-bg)] text-[var(--status-ready-text)] border-[var(--status-ready-border)]',
};

export const OperationalKpiCard: React.FC<OperationalKpiCardProps> = ({
  periodLabel,
  periodRangeText,
  totalJobs,
  companionMetrics,
  avgDurationMinutes,
  avgRiskScore,
  className,
}) => {
  return (
    <BentoCard ariaLabel="Ringkasan Operasional" className={cn('xl:col-span-5', className)}>
      <div className="space-y-5">
        {/* Card Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)] leading-snug">
              Ringkasan Operasional
            </h3>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-0.5">
              {periodRangeText ? `Periode ${periodRangeText}` : periodLabel}
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border border-[var(--border-subtle)] shrink-0">
            {periodLabel}
          </span>
        </div>

        {/* Hero KPI */}
        <div className="p-4 sm:p-5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] flex items-baseline justify-between gap-3">
          <div>
            <span className="text-xs sm:text-sm font-medium text-[var(--text-secondary)] block">
              Total Penugasan Lapangan
            </span>
            <div className="flex items-baseline gap-2.5 mt-1">
              <span className="text-3xl sm:text-4xl font-bold font-mono tabular-nums text-[var(--text-primary)] tracking-tight">
                {formatNumberId(totalJobs)}
              </span>
              <span className="text-sm font-medium text-[var(--text-muted)]">
                laporan
              </span>
            </div>
          </div>
        </div>

        {/* Companion Metrics List */}
        <div className="divide-y divide-[var(--border-subtle)] border-t border-b border-[var(--border-subtle)]">
          {companionMetrics.map(item => {
            const toneClass = TONE_BADGE_CLASSES[item.badgeTone ?? 'neutral'];
            return (
              <div
                key={item.id}
                className="py-3.5 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm sm:text-[15px] font-semibold text-[var(--text-primary)]">
                      {item.label}
                    </span>
                    {item.badgeText && (
                      <span
                        className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border tabular-nums',
                          toneClass
                        )}
                      >
                        {item.badgeText}
                      </span>
                    )}
                  </div>
                  {item.subText && (
                    <p className="text-xs sm:text-[13px] text-[var(--text-secondary)] mt-0.5">
                      {item.subText}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-[var(--text-primary)]">
                    {typeof item.value === 'number' ? formatNumberId(item.value) : item.value}
                  </span>
                  {item.onAction && item.actionLabel && (
                    <button
                      type="button"
                      onClick={item.onAction}
                      aria-pressed={item.active}
                      className={cn(
                        'min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer btn-tactile',
                        item.active
                          ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                          : 'bg-[var(--bg-primary)] text-[var(--text-primary)] border-[var(--border-subtle)] hover:bg-[var(--bg-tertiary)]'
                      )}
                    >
                      {item.actionLabel}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Simple, readable footer without decorative icons */}
      <div className="pt-4 mt-2 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm text-[var(--text-secondary)]">
        <span>
          Rata-rata durasi kerja:{' '}
          <strong className="font-mono tabular-nums text-[var(--text-primary)]">
            {avgDurationMinutes > 0 ? `${formatNumberId(avgDurationMinutes)} menit` : '—'}
          </strong>
        </span>
        <span>
          Rata-rata skor risiko:{' '}
          <strong className="font-mono tabular-nums text-[var(--text-primary)]">
            {formatNumberId(avgRiskScore)} poin
          </strong>
        </span>
      </div>
    </BentoCard>
  );
};

// ─── CARD B: DAILY WORK TREND CHART CARD ─────────────────────────────────────

export interface WorkTrendChartCardProps {
  periodLabel: string;
  periodRangeText?: string;
  points: BentoTrendPoint[];
  className?: string;
}

export const WorkTrendChartCard: React.FC<WorkTrendChartCardProps> = ({
  periodLabel,
  periodRangeText,
  points,
  className,
}) => {
  const chartId = useId();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const totalSum = points.reduce((acc, p) => acc + p.total, 0);
  const completedSum = points.reduce((acc, p) => acc + p.completed, 0);
  const flaggedSum = points.reduce((acc, p) => acc + p.flagged, 0);

  const recent7Points = points.slice(-7);
  const recent7Total = recent7Points.reduce((acc, p) => acc + p.total, 0);

  const peakPoint = points.reduce<BentoTrendPoint | null>(
    (best, cur) => (!best || cur.total > best.total ? cur : best),
    null
  );

  const maxY = Math.max(4, ...points.map(p => Math.max(p.total, p.completed, p.flagged)));
  const svgWidth = 640;
  const svgHeight = 210;
  const padLeft = 36;
  const padRight = 16;
  const padTop = 16;
  const padBottom = 30;
  const plotW = svgWidth - padLeft - padRight;
  const plotH = svgHeight - padTop - padBottom;

  const getX = (idx: number) => {
    if (points.length <= 1) return padLeft + plotW / 2;
    return padLeft + (idx / (points.length - 1)) * plotW;
  };

  const getY = (val: number) => {
    const clamped = Math.max(0, val);
    return padTop + plotH - (clamped / maxY) * plotH;
  };

  const buildPath = (getter: (p: BentoTrendPoint) => number) => {
    if (points.length === 0) return '';
    return points
      .map((p, idx) => `${idx === 0 ? 'M' : 'L'}${getX(idx).toFixed(1)},${getY(getter(p)).toFixed(1)}`)
      .join(' ');
  };

  const buildAreaPath = (getter: (p: BentoTrendPoint) => number) => {
    if (points.length === 0) return '';
    const line = buildPath(getter);
    const firstX = getX(0).toFixed(1);
    const lastX = getX(points.length - 1).toFixed(1);
    const baseY = (padTop + plotH).toFixed(1);
    return `${line} L${lastX},${baseY} L${firstX},${baseY} Z`;
  };

  const yTicks = [0, Math.round(maxY / 2), maxY];
  const xTickIndices =
    points.length >= 6
      ? [0, Math.floor((points.length - 1) * 0.25), Math.floor((points.length - 1) * 0.5), Math.floor((points.length - 1) * 0.75), points.length - 1]
      : points.map((_, i) => i);

  const inspectedPoint =
    activeIndex !== null && points[activeIndex] ? points[activeIndex] : points[points.length - 1] ?? null;

  return (
    <BentoCard ariaLabel="Tren Pekerjaan Harian" className={cn('xl:col-span-7', className)}>
      <div className="space-y-4">
        {/* Clean Header & Direct Legend */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)] leading-snug">
              Tren Pekerjaan Harian
            </h3>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-0.5">
              Jumlah laporan kerja per hari ({periodRangeText || periodLabel})
            </p>
          </div>

          {/* Simple Legend with Totals (No complicated filter buttons) */}
          <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm">
            <span className="inline-flex items-center gap-1.5 text-[var(--text-primary)] font-medium">
              <span className="w-3 h-1 rounded-full bg-[var(--chart-total)] inline-block" aria-hidden="true" />
              <span>Total ({formatNumberId(totalSum)})</span>
            </span>
            <span className="inline-flex items-center gap-1.5 text-[var(--text-secondary)] font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--chart-completed)] inline-block" aria-hidden="true" />
              <span>Selesai ({formatNumberId(completedSum)})</span>
            </span>
            <span className="inline-flex items-center gap-1.5 text-[var(--text-secondary)] font-medium">
              <span className="w-3 h-0.5 border-b-2 border-dashed border-[var(--chart-flagged)] inline-block" aria-hidden="true" />
              <span>Perlu Cek ({formatNumberId(flaggedSum)})</span>
            </span>
          </div>
        </div>

        {/* Chart Area or Calm Empty State */}
        {points.length === 0 || totalSum === 0 ? (
          <div className="h-[220px] rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] p-6 flex flex-col items-center justify-center text-center">
            <p className="text-sm sm:text-base font-semibold text-[var(--text-primary)]">
              Belum ada aktivitas pekerjaan pada {periodLabel.toLowerCase()}
            </p>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1 max-w-md">
              Grafik ini otomatis menampilkan pergerakan jumlah pekerjaan harian segera setelah laporan teknisi masuk.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Direct Readout Bar */}
            {inspectedPoint && (
              <div
                aria-live="polite"
                className="px-3.5 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm"
              >
                <span className="font-semibold text-[var(--text-primary)]">
                  {activeIndex !== null ? inspectedPoint.labelFull : `Hari terakhir (${inspectedPoint.labelFull})`}
                </span>
                <div className="flex flex-wrap items-center gap-4 font-mono tabular-nums">
                  <span className="text-[var(--text-secondary)]">
                    Total: <strong className="text-[var(--text-primary)]">{formatNumberId(inspectedPoint.total)}</strong>
                  </span>
                  <span className="text-[var(--status-completed-text)]">
                    Selesai: <strong>{formatNumberId(inspectedPoint.completed)}</strong>
                  </span>
                  <span className="text-[var(--status-flagged-text)]">
                    Perlu Cek: <strong>{formatNumberId(inspectedPoint.flagged)}</strong>
                  </span>
                </div>
              </div>
            )}

            {/* Responsive SVG Chart */}
            <div className="relative w-full overflow-hidden rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] p-2.5">
              <svg
                id={chartId}
                role="img"
                aria-label={`Grafik tren pekerjaan 30 hari terakhir. Total ${totalSum} pekerjaan, ${completedSum} selesai terverifikasi, dan ${flaggedSum} perlu pemeriksaan.`}
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="w-full h-[195px] sm:h-[210px] block select-none"
                onMouseLeave={() => setActiveIndex(null)}
              >
                {yTicks.map(tick => {
                  const y = getY(tick);
                  return (
                    <g key={tick}>
                      <line
                        x1={padLeft}
                        y1={y}
                        x2={svgWidth - padRight}
                        y2={y}
                        stroke="var(--chart-grid)"
                        strokeDasharray={tick === 0 ? undefined : '3 3'}
                        strokeWidth="1"
                      />
                      <text
                        x={padLeft - 8}
                        y={y + 4}
                        textAnchor="end"
                        fontSize="12"
                        fill="var(--text-muted)"
                        fontFamily="var(--font-mono)"
                      >
                        {tick}
                      </text>
                    </g>
                  );
                })}

                {Array.from(new Set(xTickIndices)).map(idx => {
                  const pt = points[idx];
                  if (!pt) return null;
                  const x = getX(idx);
                  return (
                    <text
                      key={pt.date}
                      x={x}
                      y={svgHeight - 6}
                      textAnchor={idx === 0 ? 'start' : idx === points.length - 1 ? 'end' : 'middle'}
                      fontSize="12"
                      fill="var(--text-muted)"
                      fontFamily="var(--font-mono)"
                    >
                      {pt.labelShort}
                    </text>
                  );
                })}

                <path d={buildAreaPath(p => p.total)} fill="var(--chart-total-fill)" />
                <path
                  d={buildPath(p => p.total)}
                  fill="none"
                  stroke="var(--chart-total)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d={buildPath(p => p.completed)}
                  fill="none"
                  stroke="var(--chart-completed)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d={buildPath(p => p.flagged)}
                  fill="none"
                  stroke="var(--chart-flagged)"
                  strokeWidth="1.75"
                  strokeDasharray="4 3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {activeIndex !== null && points[activeIndex] && (
                  <g>
                    <line
                      x1={getX(activeIndex)}
                      y1={padTop}
                      x2={getX(activeIndex)}
                      y2={padTop + plotH}
                      stroke="var(--border-focus)"
                      strokeWidth="1.5"
                    />
                    <circle
                      cx={getX(activeIndex)}
                      cy={getY(points[activeIndex].total)}
                      r="4.5"
                      fill="var(--chart-total)"
                      stroke="var(--bg-card)"
                      strokeWidth="1.5"
                    />
                    <circle
                      cx={getX(activeIndex)}
                      cy={getY(points[activeIndex].completed)}
                      r="4"
                      fill="var(--chart-completed)"
                      stroke="var(--bg-card)"
                      strokeWidth="1.5"
                    />
                    <circle
                      cx={getX(activeIndex)}
                      cy={getY(points[activeIndex].flagged)}
                      r="4"
                      fill="var(--chart-flagged)"
                      stroke="var(--bg-card)"
                      strokeWidth="1.5"
                    />
                  </g>
                )}

                {points.map((pt, idx) => {
                  const colW = plotW / Math.max(1, points.length);
                  const x = getX(idx) - colW / 2;
                  return (
                    <rect
                      key={pt.date}
                      x={Math.max(padLeft, x)}
                      y={padTop}
                      width={colW}
                      height={plotH}
                      fill="transparent"
                      tabIndex={0}
                      role="button"
                      aria-label={`${pt.labelFull}: Total ${pt.total}, Selesai ${pt.completed}, Perlu Cek ${pt.flagged}`}
                      onMouseEnter={() => setActiveIndex(idx)}
                      onFocus={() => setActiveIndex(idx)}
                      onBlur={() => setActiveIndex(null)}
                      className="cursor-pointer focus:outline-none"
                    />
                  );
                })}
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* Textual Summary Footer */}
      <div className="pt-4 mt-2 border-t border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm text-[var(--text-secondary)]">
        <span>
          7 hari terakhir:{' '}
          <strong className="font-mono tabular-nums text-[var(--text-primary)]">
            {formatNumberId(recent7Total)} laporan
          </strong>
        </span>
        {peakPoint && peakPoint.total > 0 ? (
          <span>
            Tertinggi harian:{' '}
            <strong className="font-mono tabular-nums text-[var(--text-primary)]">
              {formatNumberId(peakPoint.total)} laporan
            </strong>{' '}
            ({peakPoint.labelShort})
          </span>
        ) : (
          <span>Menampilkan data aktual 30 hari terakhir</span>
        )}
      </div>
    </BentoCard>
  );
};

// ─── CARD C: WORK REPORT STATUS COMPOSITION CARD (CLEAN, NO ENGLISH CODES) ───

export interface StatusCompositionCardProps {
  totalJobs: number;
  rows: BentoStatusRow[];
  activeStatusFilter?: string;
  onClearFilter?: () => void;
  className?: string;
}

export const StatusCompositionCard: React.FC<StatusCompositionCardProps> = ({
  totalJobs,
  rows,
  activeStatusFilter,
  onClearFilter,
  className,
}) => {
  const hasActiveFilter = Boolean(activeStatusFilter && activeStatusFilter !== 'ALL');

  return (
    <BentoCard ariaLabel="Komposisi Status Laporan" className={cn('xl:col-span-7', className)}>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)] leading-snug">
              Status Laporan Kerja
            </h3>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-0.5">
              Klik salah satu status untuk melihat daftar laporan pada tahapan tersebut.
            </p>
          </div>
          {hasActiveFilter && onClearFilter && (
            <button
              type="button"
              onClick={onClearFilter}
              className="self-start px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--accent-glow)] text-[var(--accent-text)] border border-[var(--border-focus)] hover:opacity-90 transition-opacity cursor-pointer shrink-0"
            >
              Reset Filter
            </button>
          )}
        </div>

        {/* Stacked Proportion Bar */}
        {totalJobs > 0 && (
          <div
            className="h-3.5 w-full rounded-full bg-[var(--bg-tertiary)] overflow-hidden flex gap-0.5 p-0.5 border border-[var(--border-subtle)]"
            role="img"
            aria-label="Proporsi visual status laporan"
          >
            {rows
              .filter(r => r.count > 0)
              .map(r => (
                <div
                  key={r.statusKey}
                  style={{
                    width: `${Math.max(4, r.percentage)}%`,
                    backgroundColor: r.barColor,
                  }}
                  title={`${r.label}: ${r.count} (${r.percentage}%)`}
                  className="h-full first:rounded-l-full last:rounded-r-full transition-all duration-200"
                />
              ))}
          </div>
        )}

        {/* Clean Horizontal Comparison Rows */}
        <div className="space-y-2.5" role="list" aria-label="Daftar status laporan kerja">
          {rows.map(row => {
            const widthPct = totalJobs > 0 ? Math.max(row.count > 0 ? 4 : 0, row.percentage) : 0;
            return (
              <button
                key={row.statusKey}
                type="button"
                onClick={row.onSelect}
                aria-pressed={row.isSelected}
                className={cn(
                  'w-full min-h-[46px] p-3 rounded-xl border text-left transition-colors flex flex-col gap-2 cursor-pointer btn-tactile',
                  row.isSelected
                    ? 'bg-[var(--accent-glow)] border-[var(--accent)]'
                    : 'bg-[var(--bg-primary)] border-[var(--border-subtle)] hover:bg-[var(--bg-tertiary)]'
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={cn('w-3 h-3 rounded-full shrink-0', row.dotClass)} aria-hidden="true" />
                    <span className="text-sm sm:text-[15px] font-semibold text-[var(--text-primary)] truncate">
                      {row.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 font-mono tabular-nums">
                    <span className="text-sm sm:text-base font-bold text-[var(--text-primary)]">
                      {formatNumberId(row.count)}
                    </span>
                    <span className="text-xs sm:text-sm text-[var(--text-muted)] w-11 text-right">
                      {row.percentage}%
                    </span>
                  </div>
                </div>

                <div className="w-full h-1.5 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-200"
                    style={{
                      width: `${widthPct}%`,
                      backgroundColor: row.barColor,
                    }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="pt-4 mt-2 border-t border-[var(--border-subtle)] text-xs sm:text-sm text-[var(--text-muted)]">
        Selesai Terverifikasi menggabungkan laporan berstatus <strong>Selesai</strong> dan <strong>Sudah Ditinjau</strong>.
      </div>
    </BentoCard>
  );
};

// ─── CARD D: PRIORITY VERIFICATION & RISK QUEUE CARD ─────────────────────────

export interface PriorityVerificationCardProps {
  priorityUniqueCount: number;
  flaggedJobsCount: number;
  highRiskJobsCount: number;
  items: BentoPriorityItem[];
  onOpenAllAnomalies: () => void;
  className?: string;
}

export const PriorityVerificationCard: React.FC<PriorityVerificationCardProps> = ({
  priorityUniqueCount,
  flaggedJobsCount,
  highRiskJobsCount,
  items,
  onOpenAllAnomalies,
  className,
}) => {
  return (
    <BentoCard ariaLabel="Prioritas Verifikasi dan Risiko" className={cn('xl:col-span-5', className)}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)] leading-snug">
              Perlu Perhatian Segera
            </h3>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-0.5">
              Laporan kerja dengan catatan lokasi GPS atau durasi di luar standar
            </p>
          </div>
          <span
            className={cn(
              'px-2.5 py-1 rounded-lg text-xs font-bold border shrink-0 tabular-nums',
              priorityUniqueCount > 0
                ? 'bg-[var(--status-flagged-bg)] text-[var(--status-flagged-text)] border-[var(--status-flagged-border)]'
                : 'bg-[var(--status-completed-bg)] text-[var(--status-completed-text)] border-[var(--status-completed-border)]'
            )}
          >
            {formatNumberId(priorityUniqueCount)} laporan
          </span>
        </div>

        {/* Summary Counters */}
        <div className="grid grid-cols-2 gap-3 text-xs sm:text-sm">
          <div className="p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] flex items-center justify-between">
            <span className="text-[var(--text-secondary)] font-medium">Perlu Pemeriksaan</span>
            <strong className="font-mono tabular-nums text-base text-[var(--text-primary)]">
              {formatNumberId(flaggedJobsCount)}
            </strong>
          </div>
          <div className="p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] flex items-center justify-between">
            <span className="text-[var(--text-secondary)] font-medium">Risiko Tinggi</span>
            <strong className="font-mono tabular-nums text-base text-[var(--text-primary)]">
              {formatNumberId(highRiskJobsCount)}
            </strong>
          </div>
        </div>

        {/* Priority Items or Calm Positive Empty State */}
        {items.length === 0 ? (
          <div className="py-10 px-5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-center space-y-2">
            <p className="text-sm sm:text-base font-semibold text-[var(--text-primary)]">
              Semua laporan kerja berjalan normal
            </p>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] max-w-xs mx-auto leading-relaxed">
              Tidak ada laporan yang memerlukan pemeriksaan khusus pada 30 hari terakhir.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-subtle)] border-t border-b border-[var(--border-subtle)]">
            {items.map(item => (
              <div
                key={item.id}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded text-xs font-semibold border',
                        item.statusBadgeClass
                      )}
                    >
                      {item.statusLabel}
                    </span>
                    {item.riskNode}
                  </div>
                  <p className="text-sm sm:text-[15px] font-bold text-[var(--text-primary)] truncate">
                    {item.projectName}
                  </p>
                  <p className="text-xs sm:text-sm text-[var(--text-secondary)] truncate">
                    {item.executorName}
                    {item.clientName ? ` • ${item.clientName}` : ''}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] font-mono">
                    {item.dateFormatted}
                    {item.contextNote ? ` • ${item.contextNote}` : ''}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={item.onOpenDetail}
                  className="self-start sm:self-center min-h-[42px] sm:min-h-[38px] px-3.5 py-1.5 rounded-xl bg-[var(--bg-primary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-subtle)] text-xs sm:text-sm font-semibold transition-colors shrink-0 cursor-pointer btn-tactile"
                >
                  Periksa
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer CTA */}
      <div className="pt-4 mt-2 flex items-center justify-between gap-3">
        <span className="text-xs sm:text-sm text-[var(--text-muted)]">
          Maksimal 5 laporan teratas
        </span>
        <button
          type="button"
          onClick={onOpenAllAnomalies}
          className="min-h-[40px] px-4 py-2 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs sm:text-sm font-semibold transition-colors cursor-pointer btn-tactile"
        >
          Lihat Semua Laporan Perlu Dicek
        </button>
      </div>
    </BentoCard>
  );
};

// ─── LOADING SKELETON & HUMAN-FRIENDLY ERROR STATE ───────────────────────────

export const BentoSkeleton: React.FC = () => (
  <div className="space-y-5" aria-busy="true" aria-label="Memuat ringkasan operasional">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="space-y-2">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-48" />
      </div>
      <Skeleton className="h-10 w-36 rounded-xl" />
    </div>
    <BentoGrid>
      <div className="xl:col-span-5 clean-card p-6 space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <div className="space-y-3">
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
      </div>
      <div className="xl:col-span-7 clean-card p-6 space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-[220px] w-full rounded-xl" />
      </div>
      <div className="xl:col-span-7 clean-card p-6 space-y-3">
        <Skeleton className="h-6 w-52" />
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
      <div className="xl:col-span-5 clean-card p-6 space-y-3">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
      </div>
    </BentoGrid>
  </div>
);

export const BentoErrorState: React.FC<{
  message: string;
  onRetry: () => void;
  isRetrying?: boolean;
}> = ({ message, onRetry, isRetrying }) => (
  <div
    role="alert"
    className="clean-card bg-[var(--bg-card)] border border-[var(--status-flagged-border)] rounded-2xl p-6 sm:p-8 text-center max-w-xl mx-auto my-6 space-y-4"
  >
    <div className="space-y-1.5">
      <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
        Data Dashboard Belum Dapat Dimuat
      </h3>
      <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
        {message}
      </p>
    </div>
    <div>
      <button
        type="button"
        onClick={onRetry}
        disabled={isRetrying}
        className="min-h-[42px] px-5 py-2.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-semibold transition-colors disabled:opacity-60 cursor-pointer btn-tactile"
      >
        {isRetrying ? 'Memuat ulang...' : 'Coba Lagi'}
      </button>
    </div>
  </div>
);
