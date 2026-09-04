import { api } from './client';
import { WorkReport } from '../types';

export interface EvidencePayload {
  photoBlob: Blob;
  latitude: number;
  longitude: number;
  accuracy: number;
  notes?: string;
}

function buildEvidenceForm(evidence: EvidencePayload): FormData {
  const form = new FormData();
  form.append('photo', evidence.photoBlob, 'evidence.jpg');
  form.append('latitude', String(evidence.latitude));
  form.append('longitude', String(evidence.longitude));
  form.append('accuracy', String(evidence.accuracy));
  if (evidence.notes) form.append('notes', evidence.notes);
  return form;
}

export async function fetchMyWorkReports() {
  const res = await api.get<{ workReports: WorkReport[] }>('/work-reports/mine');
  return res.workReports;
}

export async function fetchWorkReport(id: string) {
  const res = await api.get<{ workReport: WorkReport }>(`/work-reports/${id}`);
  return res.workReport;
}

export async function checkIn(reportId: string, evidence: EvidencePayload) {
  const res = await api.postForm<{ workReport: WorkReport }>(`/work-reports/${reportId}/check-in`, buildEvidenceForm(evidence));
  return res.workReport;
}

export async function addProgressPhoto(reportId: string, evidence: EvidencePayload) {
  const res = await api.postForm<{ workReport: WorkReport }>(`/work-reports/${reportId}/photos`, buildEvidenceForm(evidence));
  return res.workReport;
}

export async function checkOut(reportId: string, evidence: EvidencePayload) {
  const res = await api.postForm<{ workReport: WorkReport }>(`/work-reports/${reportId}/check-out`, buildEvidenceForm(evidence));
  return res.workReport;
}
