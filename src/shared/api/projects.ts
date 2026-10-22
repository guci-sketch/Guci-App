import { supabase } from '@/shared/lib/supabase';
import { useAuthStore } from '@/app/store/authStore';
import { ContractType, Project, ServiceType } from '@/entities/types';

export interface CreateProjectInput {
  projectName: string;
  clientName?: string;
  address: string;
  latitude: number;
  longitude: number;
  radius?: number;
  workDate: string;
  workType?: string;
  serviceType: ServiceType;
  targetFocus?: string[];
  focusTarget?: string;
  buildingAreaSqm?: number;
  contractType: ContractType;
  warrantyMonths: number;
  nextServiceDate?: string;
  scheduledStartTime?: string;
  notes?: string;
}

function resolveActiveCompanyId(): string | null {
  const st = useAuthStore.getState();
  if (st.user?.role === 'SUPERADMIN') {
    return st.activeCompanyId || st.user.companyId || null;
  }
  return st.user?.companyId || null;
}

export function mapDbProject(row: any): Project {
  return {
    id: row.id,
    projectName: row.project_name || '',
    clientName: row.client_name || '',
    address: row.address || '',
    latitude: Number(row.latitude ?? 0),
    longitude: Number(row.longitude ?? 0),
    radius: Number(row.radius ?? 100),
    workDate: typeof row.work_date === 'string' ? row.work_date.slice(0, 10) : new Date().toISOString().slice(0, 10),
    workType: row.work_type || '',
    serviceType: (row.service_type || 'GENERAL_PEST_CONTROL') as ServiceType,
    focusTarget: row.focus_target ?? null,
    targetFocus: Array.isArray(row.target_focus) ? row.target_focus : [],
    buildingAreaSqm: row.building_area_sqm != null ? Number(row.building_area_sqm) : null,
    contractType: (row.contract_type || 'ONE_TIME') as ContractType,
    warrantyMonths: Number(row.warranty_months ?? 0),
    nextServiceDate: row.next_service_date ?? null,
    scheduledStartTime: typeof row.scheduled_start_time === 'string' ? row.scheduled_start_time.slice(0, 5) : '08:00',
    notes: row.notes ?? null,
    createdBy: row.created_by || '',
    createdByName: row.users?.name ?? undefined,
    createdAt: row.created_at || new Date().toISOString(),
    lockedAt: row.locked_at ?? null,
  };
}

export async function createProject(input: CreateProjectInput): Promise<{ project: Project; workReportId: string }> {
  const st = useAuthStore.getState();
  const companyId = resolveActiveCompanyId();
  if (!companyId || !st.user) {
    throw new Error('Sesi perusahaan tidak ditemukan. Silakan muat ulang halaman.');
  }

  const { data: projRow, error: projErr } = await supabase
    .from('projects')
    .insert({
      company_id: companyId,
      project_name: input.projectName,
      client_name: input.clientName || input.projectName,
      address: input.address,
      latitude: input.latitude,
      longitude: input.longitude,
      radius: input.radius ?? 100,
      work_date: input.workDate,
      work_type: input.workType || input.projectName,
      service_type: input.serviceType,
      focus_target: input.focusTarget ?? (input.targetFocus?.join(', ') || null),
      target_focus: input.targetFocus ?? [],
      building_area_sqm: input.buildingAreaSqm ?? null,
      contract_type: input.contractType,
      warranty_months: input.warrantyMonths ?? 0,
      next_service_date: input.nextServiceDate || null,
      scheduled_start_time: input.scheduledStartTime || '08:00',
      notes: input.notes ?? null,
      created_by: st.user.uid,
    })
    .select('*')
    .single();

  if (projErr || !projRow) {
    throw new Error(projErr?.message || 'Gagal membuat proyek lapangan.');
  }

  const { data: wrRow, error: wrErr } = await supabase
    .from('work_reports')
    .insert({
      company_id: companyId,
      project_id: projRow.id,
      executor_id: st.user.uid,
      status: 'READY',
      customer_name: input.clientName || input.projectName,
      notes: input.notes ?? null,
    })
    .select('id')
    .single();

  if (wrErr) {
    console.warn('[createProject] gagal membuat work_report otomatis:', wrErr.message);
  }

  return {
    project: mapDbProject(projRow),
    workReportId: wrRow?.id || projRow.id,
  };
}

export async function fetchMyProjects(): Promise<Project[]> {
  const companyId = resolveActiveCompanyId();
  let q = supabase.from('projects').select('*').order('created_at', { ascending: false }).limit(50);
  if (companyId) q = q.eq('company_id', companyId);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data || []).map(mapDbProject);
}

export async function fetchProject(id: string): Promise<Project> {
  const { data, error } = await supabase.from('projects').select('*').eq('id', id).single();
  if (error || !data) throw new Error(error?.message || 'Proyek tidak ditemukan.');
  return mapDbProject(data);
}
