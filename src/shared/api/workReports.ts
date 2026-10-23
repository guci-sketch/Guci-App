import { supabase } from '@/shared/lib/supabase';
import { useAuthStore } from '@/app/store/authStore';
import { calculateDistanceMeters, isWithinRadius } from '@/shared/utils/geo';
import {
  ApplicationMethod,
  ContractType,
  DocumentationPhoto,
  PhotoTag,
  PhotoType,
  RiskEvent,
  RiskLevel,
  ServiceType,
  TreatmentRecord,
  WorkReport,
  WorkReportStatus,
} from '@/entities/types';

export interface EvidencePayload {
  photoBlob: Blob;
  capturedAt?: string;
  offlineReplay?: boolean;
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

export interface TeamMemberEntry {
  id?: string;
  name: string;
  role?: string;
  isManual?: boolean;
}

export interface TreatmentInput {
  applicationMethod: ApplicationMethod;
  chemicalName: string;
  teamMembers?: TeamMemberEntry[];
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

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export function mapDbWorkReportFull(row: any): WorkReport {
  const proj = row.projects || {};
  const exec = row.users || {};
  const trRaw = Array.isArray(row.treatment_records) ? row.treatment_records[0] : row.treatment_records;
  const photosRaw: any[] = Array.isArray(row.documentation_photos) ? row.documentation_photos : [];
  const eventsRaw: any[] = Array.isArray(row.risk_events) ? row.risk_events : [];

  const treatmentRecord: TreatmentRecord | null = trRaw
    ? {
        applicationMethod: trRaw.application_method as ApplicationMethod,
        chemicalName: trRaw.chemical_name,
        activeIngredient: trRaw.active_ingredient ?? null,
        dosage: trRaw.dosage,
        treatmentAreaSqm: trRaw.treatment_area_sqm != null ? Number(trRaw.treatment_area_sqm) : null,
        drillingPointsCount: trRaw.drilling_points_count != null ? Number(trRaw.drilling_points_count) : null,
        fumigantType: trRaw.fumigant_type ?? null,
        gasConcentrationPpm: trRaw.gas_concentration_ppm != null ? Number(trRaw.gas_concentration_ppm) : null,
        sealingStartedAt: trRaw.sealing_started_at ?? null,
        aerationCompletedAt: trRaw.aeration_completed_at ?? null,
        safetyNotes: trRaw.safety_notes ?? null,
        technicianNotes: trRaw.technician_notes ?? null,
      }
    : null;

  const photos: DocumentationPhoto[] = photosRaw
    .filter(p => !p.purged_at)
    .map(p => ({
      id: p.id,
      photoType: p.photo_type as PhotoType,
      photoTag: (p.photo_tag as PhotoTag) ?? null,
      latitude: Number(p.latitude ?? 0),
      longitude: Number(p.longitude ?? 0),
      accuracy: Number(p.accuracy ?? 0),
      distanceToProject: Number(p.distance_to_project ?? 0),
      isWithinRadius: Boolean(p.is_within_radius),
      capturedAt: p.captured_at || p.created_at,
      metadata: p.metadata || {},
      purgedAt: p.purged_at ?? null,
      url: typeof p.storage_path === 'string' && p.storage_path.startsWith('data:')
        ? p.storage_path
        : `/api/photos/${p.id}/file`,
    }));

  const riskEvents: RiskEvent[] = eventsRaw.map(ev => ({
    id: ev.id,
    eventType: ev.event_type,
    points: Number(ev.points ?? 0),
    severity: (ev.severity || 'LOW') as RiskEvent['severity'],
    title: ev.title || '',
    description: ev.description || '',
    expectedValue: ev.expected_value ?? null,
    actualValue: ev.actual_value ?? null,
    createdAt: ev.created_at,
  }));

  return {
    id: row.id,
    projectId: row.project_id,
    projectName: proj.project_name || 'Proyek Lapangan',
    clientName: proj.client_name || row.customer_name || '',
    projectAddress: proj.address || '',
    projectLatitude: Number(proj.latitude ?? 0),
    projectLongitude: Number(proj.longitude ?? 0),
    projectRadius: Number(proj.radius ?? 100),
    scheduledStartTime: typeof proj.scheduled_start_time === 'string' ? proj.scheduled_start_time.slice(0, 5) : '08:00',
    serviceType: (proj.service_type || 'GENERAL_PEST_CONTROL') as ServiceType,
    focusTarget: proj.focus_target ?? null,
    targetFocus: Array.isArray(proj.target_focus) ? proj.target_focus : [],
    buildingAreaSqm: proj.building_area_sqm != null ? Number(proj.building_area_sqm) : null,
    contractType: (proj.contract_type || 'ONE_TIME') as ContractType,
    warrantyMonths: Number(proj.warranty_months ?? 0),
    nextServiceDate: proj.next_service_date ?? null,
    executorId: row.executor_id || '',
    executorName: exec.name || 'Teknisi Lapangan',
    executorEmail: exec.email || '',
    status: (row.status || 'READY') as WorkReportStatus,
    checkInAt: row.check_in_at ?? null,
    checkInLatitude: row.check_in_latitude != null ? Number(row.check_in_latitude) : null,
    checkInLongitude: row.check_in_longitude != null ? Number(row.check_in_longitude) : null,
    checkInAccuracy: row.check_in_accuracy != null ? Number(row.check_in_accuracy) : null,
    checkInDistance: row.check_in_distance != null ? Number(row.check_in_distance) : null,
    checkInValid: row.check_in_valid ?? null,
    checkOutAt: row.check_out_at ?? null,
    checkOutLatitude: row.check_out_latitude != null ? Number(row.check_out_latitude) : null,
    checkOutLongitude: row.check_out_longitude != null ? Number(row.check_out_longitude) : null,
    checkOutAccuracy: row.check_out_accuracy != null ? Number(row.check_out_accuracy) : null,
    checkOutDistance: row.check_out_distance != null ? Number(row.check_out_distance) : null,
    checkOutValid: row.check_out_valid ?? null,
    durationSeconds: row.duration_seconds != null ? Number(row.duration_seconds) : null,
    riskScore: Number(row.risk_score ?? 0),
    riskLevel: (row.risk_level || 'NORMAL') as RiskLevel,
    riskEvents,
    treatmentRecord,
    reviewedBy: row.reviewed_by ?? null,
    reviewedAt: row.reviewed_at ?? null,
    reviewNotes: row.review_notes ?? null,
    customerName: row.customer_name ?? null,
    customerPhone: row.customer_phone ?? null,
    customerFeedback: row.customer_feedback ?? null,
    customerSignature: row.customer_signature ?? null,
    notes: row.notes ?? null,
    teamMembers: Array.isArray(row.team_members) ? row.team_members : [],
    photos,
    createdAt: row.created_at,
    updatedAt: row.updated_at || row.created_at,
  };
}

const REPORT_SELECT_FULL = `
  *,
  projects(*),
  users!work_reports_executor_id_fkey(id, name, email),
  treatment_records(*),
  documentation_photos(*),
  risk_events(*)
`;

export async function fetchMyWorkReports(): Promise<WorkReport[]> {
  const st = useAuthStore.getState();
  const uid = st.user?.uid;
  const companyId = st.user?.companyId;
  if (!uid) return [];

  let q = supabase
    .from('work_reports')
    .select(REPORT_SELECT_FULL)
    .order('created_at', { ascending: false });

  if (companyId) {
    q = q.eq('company_id', companyId);
  }
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  const all = (data || []).map(mapDbWorkReportFull);
  const mine = all.filter(r => r.executorId === uid);
  return mine.length > 0 ? mine : all;
}

export async function fetchWorkReport(id: string): Promise<WorkReport> {
  const { data, error } = await supabase
    .from('work_reports')
    .select(REPORT_SELECT_FULL)
    .eq('id', id)
    .single();

  if (error || !data) throw new Error(error?.message || 'Laporan kerja tidak ditemukan.');
  return mapDbWorkReportFull(data);
}

export async function checkIn(reportId: string, evidence: EvidencePayload): Promise<WorkReport> {
  const current = await fetchWorkReport(reportId);
  const dist = Math.round(
    calculateDistanceMeters(evidence.latitude, evidence.longitude, current.projectLatitude, current.projectLongitude)
  );
  const valid = isWithinRadius(
    evidence.latitude,
    evidence.longitude,
    current.projectLatitude,
    current.projectLongitude,
    current.projectRadius
  );
  const nowIso = evidence.capturedAt || new Date().toISOString();
  const dataUrl = await blobToDataUrl(evidence.photoBlob);

  const { error: upErr } = await supabase
    .from('work_reports')
    .update({
      status: 'WORKING',
      check_in_at: nowIso,
      check_in_latitude: evidence.latitude,
      check_in_longitude: evidence.longitude,
      check_in_accuracy: evidence.accuracy,
      check_in_distance: dist,
      check_in_valid: valid,
      notes: evidence.notes || current.notes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', reportId);

  if (upErr) throw new Error(upErr.message);

  await supabase.from('documentation_photos').insert({
    work_report_id: reportId,
    photo_type: 'CHECK_IN',
    photo_tag: evidence.photoTag ?? null,
    storage_path: dataUrl,
    latitude: evidence.latitude,
    longitude: evidence.longitude,
    accuracy: evidence.accuracy,
    distance_to_project: dist,
    is_within_radius: valid,
    captured_at: nowIso,
    metadata: { projectName: current.projectName, executorName: current.executorName },
  });

  return fetchWorkReport(reportId);
}

export async function addProgressPhoto(reportId: string, evidence: EvidencePayload): Promise<WorkReport> {
  const current = await fetchWorkReport(reportId);
  const dist = Math.round(
    calculateDistanceMeters(evidence.latitude, evidence.longitude, current.projectLatitude, current.projectLongitude)
  );
  const valid = isWithinRadius(
    evidence.latitude,
    evidence.longitude,
    current.projectLatitude,
    current.projectLongitude,
    current.projectRadius
  );
  const nowIso = evidence.capturedAt || new Date().toISOString();
  const dataUrl = await blobToDataUrl(evidence.photoBlob);

  const { error } = await supabase.from('documentation_photos').insert({
    work_report_id: reportId,
    photo_type: 'PROGRESS',
    photo_tag: evidence.photoTag ?? 'BEFORE',
    storage_path: dataUrl,
    latitude: evidence.latitude,
    longitude: evidence.longitude,
    accuracy: evidence.accuracy,
    distance_to_project: dist,
    is_within_radius: valid,
    captured_at: nowIso,
    metadata: { projectName: current.projectName, executorName: current.executorName, caption: evidence.notes ?? null },
  });

  if (error) throw new Error(error.message);
  return fetchWorkReport(reportId);
}

export async function checkOut(reportId: string, evidence: EvidencePayload): Promise<WorkReport> {
  const current = await fetchWorkReport(reportId);
  const dist = Math.round(
    calculateDistanceMeters(evidence.latitude, evidence.longitude, current.projectLatitude, current.projectLongitude)
  );
  const valid = isWithinRadius(
    evidence.latitude,
    evidence.longitude,
    current.projectLatitude,
    current.projectLongitude,
    current.projectRadius
  );
  const nowIso = evidence.capturedAt || new Date().toISOString();
  const checkInMs = current.checkInAt ? new Date(current.checkInAt).getTime() : Date.now() - 3600_000;
  const durationSeconds = Math.max(60, Math.round((new Date(nowIso).getTime() - checkInMs) / 1000));
  const dataUrl = await blobToDataUrl(evidence.photoBlob);

  let riskScore = 0;
  if (!current.checkInValid) riskScore += 30;
  if (!valid) riskScore += 30;
  if (!current.treatmentRecord) riskScore += 20;
  const riskLevel: RiskLevel =
    riskScore >= 60 ? 'HIGH_RISK' : riskScore >= 40 ? 'REVIEW' : riskScore >= 20 ? 'LOW_RISK' : 'NORMAL';
  const nextStatus: WorkReportStatus = riskScore >= 40 ? 'FLAGGED' : 'COMPLETED';

  await supabase.from('documentation_photos').insert({
    work_report_id: reportId,
    photo_type: 'CHECK_OUT',
    photo_tag: evidence.photoTag ?? 'AFTER',
    storage_path: dataUrl,
    latitude: evidence.latitude,
    longitude: evidence.longitude,
    accuracy: evidence.accuracy,
    distance_to_project: dist,
    is_within_radius: valid,
    captured_at: nowIso,
    metadata: { projectName: current.projectName, executorName: current.executorName },
  });

  const { error: upErr } = await supabase
    .from('work_reports')
    .update({
      status: nextStatus,
      check_out_at: nowIso,
      check_out_latitude: evidence.latitude,
      check_out_longitude: evidence.longitude,
      check_out_accuracy: evidence.accuracy,
      check_out_distance: dist,
      check_out_valid: valid,
      duration_seconds: durationSeconds,
      risk_score: riskScore,
      risk_level: riskLevel,
      customer_name: evidence.customerName ?? current.customerName,
      customer_phone: evidence.customerPhone ?? current.customerPhone,
      customer_feedback: evidence.customerFeedback ?? current.customerFeedback,
      customer_signature: evidence.customerSignature ?? current.customerSignature,
      notes: evidence.notes ?? current.notes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', reportId);

  if (upErr) throw new Error(upErr.message);
  return fetchWorkReport(reportId);
}

export async function submitTreatment(reportId: string, input: TreatmentInput): Promise<WorkReport> {
  const payload = {
    work_report_id: reportId,
    application_method: input.applicationMethod,
    chemical_name: input.chemicalName,
    active_ingredient: input.activeIngredient ?? null,
    dosage: input.dosage,
    treatment_area_sqm: input.treatmentAreaSqm ?? null,
    drilling_points_count: input.drillingPointsCount ?? null,
    fumigant_type: input.fumigantType ?? null,
    gas_concentration_ppm: input.gasConcentrationPpm ?? null,
    sealing_started_at: input.sealingStartedAt ?? null,
    aeration_completed_at: input.aerationCompletedAt ?? null,
    safety_notes: input.safetyNotes ?? null,
    technician_notes: input.technicianNotes ?? null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('treatment_records')
    .upsert(payload, { onConflict: 'work_report_id' });

  if (error) throw new Error(error.message);

  if (input.teamMembers) {
    await supabase
      .from('work_reports')
      .update({ team_members: input.teamMembers, updated_at: new Date().toISOString() })
      .eq('id', reportId);
  }

  return fetchWorkReport(reportId);
}

export async function updateWorkReportTeam(reportId: string, teamMembers: TeamMemberEntry[]): Promise<WorkReport> {
  const { error } = await supabase
    .from('work_reports')
    .update({ team_members: teamMembers, updated_at: new Date().toISOString() })
    .eq('id', reportId);
  if (error) throw new Error(error.message);
  return fetchWorkReport(reportId);
}

export type { TreatmentRecord };
