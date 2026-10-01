import { api } from './client';
import { ApplicationMethod, PhotoTag, TreatmentRecord, WorkReport } from '../types';

export interface EvidencePayload {
  photoBlob: Blob;
  latitude: number;
  longitude: number;
  accuracy: number;
  notes?: string;
  photoTag?: PhotoTag;
  customerName?: string;
  customerPhone?: string;
  customerFeedback?: string;
  customerSignature?: string;
}

function buildEvidenceForm(evidence: EvidencePayload): FormData {
  const form = new FormData();
  form.append('photo', evidence.photoBlob, 'evidence.jpg');
  form.append('latitude', String(evidence.latitude));
  form.append('longitude', String(evidence.longitude));
  form.append('accuracy', String(evidence.accuracy));
  if (evidence.notes) form.append('notes', evidence.notes);
  if (evidence.photoTag) form.append('photoTag', evidence.photoTag);
  if (evidence.customerName) form.append('customerName', evidence.customerName);
  if (evidence.customerPhone) form.append('customerPhone', evidence.customerPhone);
  if (evidence.customerFeedback) form.append('customerFeedback', evidence.customerFeedback);
  if (evidence.customerSignature) form.append('customerSignature', evidence.customerSignature);
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

export interface TreatmentInput {
  applicationMethod: ApplicationMethod;
  chemicalName: string;
  activeIngredient?: string;
  dosage: string;
  treatmentAreaSqm?: number;
  drillingPointsCount?: number;
  fumigantType?: string;
  gasConcentrationPpm?: number;
  sealingStartedAt?: string;
  aerationCompletedAt?: string;
  safetyNotes?: string;
  technicianNotes?: string;
}

/** Records what was actually applied (chemical, dosage, method) — separate from photo evidence. */
export async function submitTreatment(reportId: string, input: TreatmentInput) {
  const res = await api.put<{ workReport: WorkReport }>(`/work-reports/${reportId}/treatment`, input);
  return res.workReport;
}

export type { TreatmentRecord };
