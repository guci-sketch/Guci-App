import { Router } from 'express';
import { z } from 'zod';
import { query } from '../../db/pool.js';
import { asyncHandler, HttpError } from '../../utils/asyncHandler.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { getRiskConfig, updateRiskConfig } from '../risk/riskConfigRepository.js';
import { logAction } from '../../utils/audit.js';
import { getReportOrThrow, mapReportFull } from '../workReports/reportMapper.js';

export const adminRouter = Router();
adminRouter.use(requireAuth, requireRole('ADMIN'));

const filterSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  timeStart: z.string().optional(), // "HH:MM", applied to check_in_at's local time
  timeEnd: z.string().optional(),
  executorId: z.string().optional(),
  projectId: z.string().optional(),
  riskLevel: z.string().optional(),
  status: z.string().optional(),
  serviceType: z.string().optional(),
  search: z.string().optional(),
});

/**
 * PRD Section 28: filtering must happen in the database, not on data already
 * downloaded to the browser. Every clause below is optional and additive
 * (PRD Section 29 — filters combine with AND).
 */
function buildReportFilter(q: z.infer<typeof filterSchema>) {
  const clauses: string[] = [];
  const params: unknown[] = [];
  let i = 1;

  if (q.startDate) {
    clauses.push(`wr.created_at >= $${i++}`);
    params.push(q.startDate);
  }
  if (q.endDate) {
    clauses.push(`wr.created_at < ($${i++}::date + interval '1 day')`);
    params.push(q.endDate);
  }
  if (q.timeStart) {
    clauses.push(`(wr.check_in_at is null or wr.check_in_at::time >= $${i++}::time)`);
    params.push(q.timeStart);
  }
  if (q.timeEnd) {
    clauses.push(`(wr.check_in_at is null or wr.check_in_at::time <= $${i++}::time)`);
    params.push(q.timeEnd);
  }
  if (q.executorId && q.executorId !== 'ALL') {
    clauses.push(`wr.executor_id = $${i++}`);
    params.push(q.executorId);
  }
  if (q.projectId && q.projectId !== 'ALL') {
    clauses.push(`wr.project_id = $${i++}`);
    params.push(q.projectId);
  }
  if (q.riskLevel && q.riskLevel !== 'ALL') {
    clauses.push(`wr.risk_level = $${i++}`);
    params.push(q.riskLevel);
  }
  if (q.status && q.status !== 'ALL') {
    clauses.push(`wr.status = $${i++}`);
    params.push(q.status);
  }
  if (q.serviceType && q.serviceType !== 'ALL') {
    clauses.push(`p.service_type = $${i++}`);
    params.push(q.serviceType);
  }
  if (q.search && q.search.trim()) {
    clauses.push(`(p.project_name ilike $${i} or u.name ilike $${i})`);
    params.push(`%${q.search.trim()}%`);
    i++;
  }

  return { where: clauses.length ? `where ${clauses.join(' and ')}` : '', params };
}

const REPORT_LIST_SQL = `
  select wr.id, wr.status, wr.check_in_at, wr.check_out_at, wr.duration_seconds,
         wr.risk_score, wr.risk_level, wr.check_in_distance, wr.check_out_distance,
         wr.check_in_valid, wr.check_out_valid, wr.created_at,
         p.id as project_id, p.project_name, p.client_name, p.address, p.service_type, p.pest_target,
         u.id as executor_id, u.name as executor_name,
         tr.application_method, tr.chemical_name, tr.dosage
  from work_reports wr
  join projects p on p.id = wr.project_id
  join users u on u.id = wr.executor_id
  left join treatment_records tr on tr.work_report_id = wr.id
`;

function mapListRow(r: any) {
  return {
    id: r.id,
    status: r.status,
    checkInAt: r.check_in_at,
    checkOutAt: r.check_out_at,
    durationSeconds: r.duration_seconds,
    riskScore: r.risk_score,
    riskLevel: r.risk_level,
    checkInValid: r.check_in_valid,
    checkOutValid: r.check_out_valid,
    checkInDistance: r.check_in_distance,
    checkOutDistance: r.check_out_distance,
    createdAt: r.created_at,
    project: { id: r.project_id, name: r.project_name, clientName: r.client_name, address: r.address, serviceType: r.service_type, pestTarget: r.pest_target },
    executor: { id: r.executor_id, name: r.executor_name },
    treatmentSummary: r.chemical_name ? { applicationMethod: r.application_method, chemicalName: r.chemical_name, dosage: r.dosage } : null,
  };
}

adminRouter.get(
  '/reports',
  asyncHandler(async (req, res) => {
    const parsed = filterSchema.safeParse(req.query);
    if (!parsed.success) throw new HttpError(400, 'Filter tidak valid.');
    const { where, params } = buildReportFilter(parsed.data);
    const rows = await query(`${REPORT_LIST_SQL} ${where} order by wr.created_at desc limit 500`, params);
    res.json({ reports: rows.map(mapListRow), count: rows.length });
  })
);

adminRouter.get(
  '/reports/:id',
  asyncHandler(async (req, res) => {
    const report = await getReportOrThrow(req.params.id);
    res.json({ workReport: await mapReportFull(report) });
  })
);

adminRouter.get(
  '/summary',
  asyncHandler(async (req, res) => {
    const rows = await query<{
      total: string; completed: string; working: string; flagged: string; high_risk: string;
      avg_duration: string | null; avg_risk: string | null;
    }>(`
      select
        count(*) as total,
        count(*) filter (where status in ('COMPLETED','REVIEWED')) as completed,
        count(*) filter (where status = 'WORKING') as working,
        count(*) filter (where status = 'FLAGGED') as flagged,
        count(*) filter (where risk_level in ('HIGH_RISK','CRITICAL')) as high_risk,
        avg(duration_seconds) filter (where duration_seconds is not null) as avg_duration,
        avg(risk_score) as avg_risk
      from work_reports
      where created_at >= now() - interval '30 days'
    `);
    const s = rows[0];
    res.json({
      totalJobs: Number(s.total),
      completedJobs: Number(s.completed),
      workingJobs: Number(s.working),
      flaggedJobs: Number(s.flagged),
      highRiskCount: Number(s.high_risk),
      avgDurationMinutes: s.avg_duration ? Math.round(Number(s.avg_duration) / 60) : 0,
      avgRiskScore: s.avg_risk ? Math.round(Number(s.avg_risk)) : 0,
    });
  })
);

adminRouter.get(
  '/executors',
  asyncHandler(async (req, res) => {
    const rows = await query(`
      select u.id, u.name, u.email, u.nip, u.phone, u.is_active,
        count(wr.id) as total_jobs,
        count(wr.id) filter (where wr.status in ('COMPLETED','REVIEWED')) as completed_jobs,
        count(wr.id) filter (where wr.risk_level in ('HIGH_RISK','CRITICAL')) as high_risk_jobs,
        avg(wr.duration_seconds) filter (where wr.duration_seconds is not null) as avg_duration
      from users u
      left join work_reports wr on wr.executor_id = u.id
      where u.role = 'EXECUTOR'
      group by u.id
      order by u.name asc
    `);
    res.json({
      executors: rows.map(r => ({
        id: r.id, name: r.name, email: r.email, nip: r.nip, phone: r.phone, isActive: r.is_active,
        totalJobs: Number(r.total_jobs), completedJobs: Number(r.completed_jobs),
        highRiskJobs: Number(r.high_risk_jobs),
        avgDurationMinutes: r.avg_duration ? Math.round(Number(r.avg_duration) / 60) : 0,
      })),
    });
  })
);

adminRouter.get(
  '/projects',
  asyncHandler(async (req, res) => {
    const rows = await query(`
      select p.*, u.name as created_by_name from projects p
      join users u on u.id = p.created_by
      order by p.created_at desc limit 200
    `);
    res.json({
      projects: rows.map(r => ({
        id: r.id, projectName: r.project_name, clientName: r.client_name, address: r.address,
        latitude: Number(r.latitude), longitude: Number(r.longitude), radius: r.radius,
        workDate: r.work_date, workType: r.work_type, serviceType: r.service_type, pestTarget: r.pest_target,
        buildingAreaSqm: r.building_area_sqm !== null ? Number(r.building_area_sqm) : null,
        contractType: r.contract_type, warrantyMonths: r.warranty_months, nextServiceDate: r.next_service_date,
        createdByName: r.created_by_name, createdAt: r.created_at, lockedAt: r.locked_at,
      })),
    });
  })
);

adminRouter.get(
  '/audit-logs',
  asyncHandler(async (req, res) => {
    const rows = await query('select * from audit_logs order by created_at desc limit 200');
    res.json({
      auditLogs: rows.map(r => ({
        id: r.id, userName: r.user_name, userRole: r.user_role, action: r.action,
        entityType: r.entity_type, entityId: r.entity_id, details: r.details, createdAt: r.created_at,
      })),
    });
  })
);

adminRouter.get(
  '/risk-config',
  asyncHandler(async (_req, res) => {
    res.json({ riskConfig: await getRiskConfig() });
  })
);

const riskConfigUpdateSchema = z.object({
  lateCheckinThresholdMinutes: z.number().int().min(0).optional(),
  lateCheckinPoints: z.number().int().min(0).optional(),
  outsideRadiusPoints: z.number().int().min(0).optional(),
  shortDurationCriticalMinutes: z.number().int().min(0).optional(),
  shortDurationCriticalPoints: z.number().int().min(0).optional(),
  shortDurationWarningMinutes: z.number().int().min(0).optional(),
  shortDurationWarningPoints: z.number().int().min(0).optional(),
  minTotalPhotos: z.number().int().min(0).optional(),
  minTotalPhotosPoints: z.number().int().min(0).optional(),
  requireProgressPhoto: z.boolean().optional(),
  noProgressPhotoPoints: z.number().int().min(0).optional(),
  locationDriftThresholdMeters: z.number().int().min(0).optional(),
  locationDriftPoints: z.number().int().min(0).optional(),
  missingTreatmentRecordPoints: z.number().int().min(0).optional(),
  fumigationMissingAerationPoints: z.number().int().min(0).optional(),
  reviewThreshold: z.number().int().min(0).max(200).optional(),
  highRiskThreshold: z.number().int().min(0).max(200).optional(),
  criticalThreshold: z.number().int().min(0).max(200).optional(),
  lowRiskThreshold: z.number().int().min(0).max(200).optional(),
});

adminRouter.put(
  '/risk-config',
  asyncHandler(async (req, res) => {
    const parsed = riskConfigUpdateSchema.safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, parsed.error.errors[0]?.message ?? 'Konfigurasi tidak valid.');
    const config = await updateRiskConfig(parsed.data, req.user!.id);
    await logAction(req.user!, 'UPDATE_CONFIG', 'system', null, 'Admin memperbarui konfigurasi risk engine.');
    res.json({ riskConfig: config });
  })
);

adminRouter.get(
  '/reports/export.csv',
  asyncHandler(async (req, res) => {
    const parsed = filterSchema.safeParse(req.query);
    if (!parsed.success) throw new HttpError(400, 'Filter tidak valid.');
    const { where, params } = buildReportFilter(parsed.data);
    const rows = await query(`${REPORT_LIST_SQL} ${where} order by wr.created_at desc limit 5000`, params);

    const header = ['Tanggal', 'Pelaksana', 'Proyek', 'Jenis Layanan', 'Status', 'Check-in', 'Check-out', 'Durasi (menit)', 'Risk Score', 'Risk Level', 'Jarak Check-in (m)', 'Jarak Check-out (m)', 'Metode Aplikasi', 'Bahan/Produk', 'Dosis'];
    const lines = [header.join(',')];
    for (const r of rows) {
      const row = [
        r.created_at ? new Date(r.created_at).toISOString().slice(0, 10) : '',
        r.executor_name,
        r.project_name,
        r.service_type,
        r.status,
        r.check_in_at ? new Date(r.check_in_at).toISOString() : '',
        r.check_out_at ? new Date(r.check_out_at).toISOString() : '',
        r.duration_seconds ? Math.round(r.duration_seconds / 60) : '',
        r.risk_score,
        r.risk_level,
        r.check_in_distance ?? '',
        r.check_out_distance ?? '',
        r.application_method ?? '',
        r.chemical_name ?? '',
        r.dosage ?? '',
      ].map(v => `"${String(v).replace(/"/g, '""')}"`);
      lines.push(row.join(','));
    }

    await logAction(req.user!, 'REVIEW_REPORT', 'system', null, `Mengekspor ${rows.length} laporan ke CSV.`);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="fieldwork-reports-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(lines.join('\n'));
  })
);
