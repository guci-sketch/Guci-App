import {
  DailyJobTrendPoint,
  OperationalDashboardSummary,
  PriorityVerificationReportItem,
  RiskLevel,
  ServiceType,
  WorkReportStatus,
  WorkStatusBreakdownItem,
} from '@/entities/types';

export const OPERATIONAL_TIMEZONE = 'Asia/Jakarta';
export const DEFAULT_SUMMARY_WINDOW_DAYS = 30;

export const CANONICAL_REPORT_STATUSES: WorkReportStatus[] = [
  'COMPLETED',
  'REVIEWED',
  'WORKING',
  'READY',
  'DRAFT',
  'FLAGGED',
];

export interface RawOperationalReportRow {
  id: string;
  status?: string | null;
  risk_score?: number | string | null;
  risk_level?: string | null;
  duration_seconds?: number | string | null;
  check_in_valid?: boolean | null;
  check_in_distance?: number | string | null;
  created_at: string;
  project_id?: string | null;
  projects?: {
    id?: string;
    project_name?: string;
    client_name?: string;
    service_type?: string;
  } | null;
  users?: {
    id?: string;
    name?: string;
  } | null;
}

/**
 * Konversi Date atau ISO timestamp menjadi string YYYY-MM-DD pada zona waktu operasional (Asia/Jakarta).
 */
export function toLocalDateKey(input: Date | string, timeZone = OPERATIONAL_TIMEZONE): string {
  const date = typeof input === 'string' ? new Date(input) : input;
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/**
 * Menghasilkan daftar tanggal berurutan (YYYY-MM-DD) sepanjang `windowDays` terakhir hingga `referenceDate`
 * dalam zona waktu operasional.
 */
export function buildDateWindowKeys(
  referenceDate: Date = new Date(),
  windowDays: number = DEFAULT_SUMMARY_WINDOW_DAYS,
  timeZone: string = OPERATIONAL_TIMEZONE
): string[] {
  const days = Math.max(1, Math.min(90, Math.floor(windowDays)));
  const endKey = toLocalDateKey(referenceDate, timeZone);
  const [y, m, d] = endKey.split('-').map(Number);
  const keys: string[] = [];

  for (let offset = days - 1; offset >= 0; offset--) {
    const dt = new Date(Date.UTC(y, (m || 1) - 1, (d || 1) - offset, 12, 0, 0));
    const key = dt.toISOString().slice(0, 10);
    keys.push(key);
  }
  return keys;
}

function getPriorityUrgencyRank(status: WorkReportStatus, riskLevel: RiskLevel): number {
  let rank = 0;
  if (riskLevel === 'CRITICAL') rank += 40;
  else if (riskLevel === 'HIGH_RISK') rank += 30;
  else if (riskLevel === 'REVIEW') rank += 15;
  if (status === 'FLAGGED') rank += 25;
  return rank;
}

/**
 * Apakah sebuah laporan masuk dalam antrean Prioritas Verifikasi:
 * status `FLAGGED` ATAU level risiko `HIGH_RISK` / `CRITICAL`.
 * Satu laporan yang memenuhi keduanya tetap dihitung satu kali (deduplicated).
 */
export function isPriorityReport(status: WorkReportStatus, riskLevel: RiskLevel): boolean {
  return status === 'FLAGGED' || riskLevel === 'HIGH_RISK' || riskLevel === 'CRITICAL';
}

/**
 * Mengagregasi baris laporan 30 hari terakhir menjadi struktur OperationalDashboardSummary yang konsisten.
 */
export function aggregateOperationalSummaryFromRows(
  rows: RawOperationalReportRow[],
  referenceDate: Date = new Date(),
  windowDays: number = DEFAULT_SUMMARY_WINDOW_DAYS,
  timeZone: string = OPERATIONAL_TIMEZONE,
  maxPriorityItems = 5
): OperationalDashboardSummary {
  const dateKeys = buildDateWindowKeys(referenceDate, windowDays, timeZone);
  const periodStart = dateKeys[0] ?? toLocalDateKey(referenceDate, timeZone);
  const periodEnd = dateKeys[dateKeys.length - 1] ?? periodStart;
  const dateSet = new Set(dateKeys);

  // Filter hanya baris yang masuk dalam jendela tanggal operasional (30 hari terakhir)
  const validRows = rows.filter(row => {
    if (!row || !row.created_at) return false;
    const key = toLocalDateKey(row.created_at, timeZone);
    return key >= periodStart && key <= periodEnd;
  });

  const totalJobs = validRows.length;
  let completedJobs = 0;
  let workingJobs = 0;
  let flaggedJobs = 0;
  let highRiskCount = 0;
  let durationSumSeconds = 0;
  let durationCount = 0;
  let riskScoreSum = 0;

  const trendMap = new Map<string, DailyJobTrendPoint>();
  for (const key of dateKeys) {
    trendMap.set(key, { date: key, total: 0, completed: 0, flagged: 0 });
  }

  const statusCounts: Record<WorkReportStatus, number> = {
    DRAFT: 0,
    READY: 0,
    WORKING: 0,
    COMPLETED: 0,
    FLAGGED: 0,
    REVIEWED: 0,
  };

  const uniquePriorityMap = new Map<string, PriorityVerificationReportItem>();

  for (const row of validRows) {
    const rawStatus = (row.status || 'READY') as WorkReportStatus;
    const status: WorkReportStatus = CANONICAL_REPORT_STATUSES.includes(rawStatus) ? rawStatus : 'READY';
    const riskLevel = ((row.risk_level || 'NORMAL') as RiskLevel);
    const riskScore = Number(row.risk_score ?? 0);
    const durationSec = row.duration_seconds != null ? Number(row.duration_seconds) : null;

    statusCounts[status] = (statusCounts[status] ?? 0) + 1;

    if (status === 'COMPLETED' || status === 'REVIEWED') {
      completedJobs++;
    }
    if (status === 'WORKING') {
      workingJobs++;
    }
    if (status === 'FLAGGED') {
      flaggedJobs++;
    }
    if (riskLevel === 'HIGH_RISK' || riskLevel === 'CRITICAL') {
      highRiskCount++;
    }

    if (durationSec != null && durationSec > 0) {
      durationSumSeconds += durationSec;
      durationCount++;
    }
    riskScoreSum += Number.isFinite(riskScore) ? riskScore : 0;

    const dayKey = toLocalDateKey(row.created_at, timeZone);
    if (dateSet.has(dayKey)) {
      const pt = trendMap.get(dayKey)!;
      pt.total += 1;
      if (status === 'COMPLETED' || status === 'REVIEWED') {
        pt.completed += 1;
      }
      if (status === 'FLAGGED') {
        pt.flagged += 1;
      }
    }

    if (row.id && isPriorityReport(status, riskLevel) && !uniquePriorityMap.has(row.id)) {
      const p = row.projects || {};
      const u = row.users || {};
      uniquePriorityMap.set(row.id, {
        id: row.id,
        projectId: p.id || row.project_id || '',
        projectName: p.project_name || 'Proyek Lapangan',
        clientName: p.client_name || '',
        serviceType: (p.service_type || 'GENERAL_PEST_CONTROL') as ServiceType,
        executorName: u.name || 'Teknisi Lapangan',
        status,
        riskScore: Number.isFinite(riskScore) ? riskScore : 0,
        riskLevel,
        checkInValid: row.check_in_valid ?? null,
        checkInDistance: row.check_in_distance != null ? Number(row.check_in_distance) : null,
        durationSeconds: durationSec,
        createdAt: row.created_at,
      });
    }
  }

  const avgDurationMinutes = durationCount > 0 ? Math.round(durationSumSeconds / durationCount / 60) : 0;
  const avgRiskScore = totalJobs > 0 ? Math.round(riskScoreSum / totalJobs) : 0;

  const dailyTrend = dateKeys.map(k => trendMap.get(k)!);
  const statusBreakdown: WorkStatusBreakdownItem[] = CANONICAL_REPORT_STATUSES.map(status => ({
    status,
    count: statusCounts[status] ?? 0,
  }));

  const allPriority = Array.from(uniquePriorityMap.values()).sort((a, b) => {
    const rankDiff = getPriorityUrgencyRank(b.status, b.riskLevel) - getPriorityUrgencyRank(a.status, a.riskLevel);
    if (rankDiff !== 0) return rankDiff;
    if (b.riskScore !== a.riskScore) return b.riskScore - a.riskScore;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return {
    totalJobs,
    completedJobs,
    workingJobs,
    flaggedJobs,
    highRiskCount,
    avgDurationMinutes,
    avgRiskScore,
    windowDays,
    periodStart,
    periodEnd,
    generatedAt: referenceDate.toISOString(),
    priorityUniqueCount: allPriority.length,
    dailyTrend,
    statusBreakdown,
    priorityReports: allPriority.slice(0, maxPriorityItems),
  };
}
