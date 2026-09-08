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

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

/** CSV export streams a file download — needs the real URL + token, not the JSON client. */
export async function downloadReportsCsv(filters: Partial<ReportFilters>) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(filtersToQuery(filters))) {
    if (v) params.set(k, v);
  }
  const token = getToken();
  const response = await fetch(`${API_URL}/admin/reports/export.csv?${params.toString()}`, {
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

export interface PendingUser {
  id: string;
  name: string;
  email: string;
  nip: string | null;
  created_at: string;
}

export async function fetchPendingUsers() {
  const res = await api.get<{ pendingUsers: PendingUser[] }>('/admin/users/pending');
  return res.pendingUsers;
}

export async function approveUser(id: string) {
  await api.post(`/admin/users/${id}/approve`);
}

export async function rejectUser(id: string) {
  await api.post(`/admin/users/${id}/reject`);
}
