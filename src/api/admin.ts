import { api, getToken } from './client';
import { AuditLogEntry, ExecutorStats, KPIStats, Project, ReportFilters, RiskConfig, WorkReport, WorkReportListItem } from '../types';

function filtersToQuery(f: Partial<ReportFilters>) {
  return {
    startDate: f.startDate,
    endDate: f.endDate,
    timeStart: f.timeStart,
    timeEnd: f.timeEnd,
    executorId: f.executorId,
    projectId: f.projectId,
    riskLevel: f.riskLevel,
    status: f.status,
    serviceType: f.serviceType,
    search: f.search,
  };
}

export async function fetchAdminReports(filters: Partial<ReportFilters>) {
  const res = await api.get<{ reports: WorkReportListItem[]; count: number }>('/admin/reports', filtersToQuery(filters));
  return res;
}

export async function fetchAdminReportDetail(id: string) {
  const res = await api.get<{ workReport: WorkReport }>(`/admin/reports/${id}`);
  return res.workReport;
}

export async function fetchAdminSummary() {
  return api.get<KPIStats>('/admin/summary');
}

export async function fetchExecutors() {
  const res = await api.get<{ executors: ExecutorStats[] }>('/admin/executors');
  return res.executors;
}

export async function fetchAdminProjects() {
  const res = await api.get<{ projects: Project[] }>('/admin/projects');
  return res.projects;
}

export async function fetchAuditLogs() {
  const res = await api.get<{ auditLogs: AuditLogEntry[] }>('/admin/audit-logs');
  return res.auditLogs;
}

export async function fetchRiskConfig() {
  const res = await api.get<{ riskConfig: RiskConfig }>('/admin/risk-config');
  return res.riskConfig;
}

export async function updateRiskConfig(partial: Partial<RiskConfig>) {
  const res = await api.put<{ riskConfig: RiskConfig }>('/admin/risk-config', partial);
  return res.riskConfig;
}

export async function reviewReport(id: string, notes: string) {
  const res = await api.post<{ workReport: WorkReport }>(`/work-reports/${id}/review`, { notes });
  return res.workReport;
}

/** CSV export streams a file download — needs the real URL + token, not the JSON client. */
export async function downloadReportsCsv(filters: Partial<ReportFilters>) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(filtersToQuery(filters))) {
    if (v) params.set(k, v);
  }
  const token = getToken();
  const response = await fetch(`/api/admin/reports/export.csv?${params.toString()}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!response.ok) throw new Error('Gagal mengekspor data.');
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `fieldwork-reports-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  nip: string | null;
  role: 'ADMIN' | 'EXECUTOR';
  is_active: boolean;
  created_at: string;
}

export async function fetchUsers() {
  const res = await api.get<{ users: AdminUser[] }>('/admin/users');
  return res.users;
}

export async function suspendUser(id: string) {
  await api.post(`/admin/users/${id}/suspend`);
}

export async function activateUser(id: string) {
  await api.post(`/admin/users/${id}/activate`);
}

export interface PhotoPurgePreview {
  cutoffDate: string;
  eligibleCount: number;
  oldestPhotoDate: string | null;
}

export interface PhotoPurgeResult {
  cutoffDate: string;
  purgedCount: number;
  failedCount: number;
}

/** How many photo files are older than the retention window — nothing is deleted by calling this. */
export async function fetchPhotoPurgePreview(olderThanMonths = 2) {
  return api.get<PhotoPurgePreview>('/admin/photos/purge-preview', { olderThanMonths: String(olderThanMonths) });
}

/** Deletes the underlying file for photos older than the window. Every other record (reports, risk events, treatment, audit log) is untouched. */
export async function purgeOldPhotos(olderThanMonths = 2) {
  return api.post<PhotoPurgeResult>('/admin/photos/purge', { olderThanMonths });
}
