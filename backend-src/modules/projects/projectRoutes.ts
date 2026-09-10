import { Router } from 'express';
import { z } from 'zod';
import { query } from '../../db/pool.js';
import { asyncHandler, HttpError } from '../../utils/asyncHandler.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { logAction } from '../../utils/audit.js';
import { isValidCoordinate } from '../../utils/geo.js';

export const projectRouter = Router();
projectRouter.use(requireAuth);

const SERVICE_TYPES = [
  'GENERAL_PEST_CONTROL',
  'TERMITE_CONTROL',
  'FUMIGATION',
] as const;

const createProjectSchema = z.object({
  projectName: z.string().min(3, 'Nama proyek minimal 3 karakter.'),
  clientName: z.string().optional().default(''),
  address: z.string().min(5, 'Alamat wajib diisi.'),
  radius: z.number().int().min(20).max(2000).default(100),
  workDate: z.string().min(1, 'Tanggal kerja wajib diisi.'),
  workType: z.string().optional().default(''),
  serviceType: z.enum(SERVICE_TYPES).default('GENERAL_PEST_CONTROL'),
  pestTarget: z.string().optional(),
  targetPests: z.array(z.string()).default([]),
  buildingAreaSqm: z.number().min(0).optional(),
  contractType: z.enum(['ONE_TIME', 'RECURRING']).default('ONE_TIME'),
  warrantyMonths: z.number().int().min(0).max(120).default(0),
  nextServiceDate: z.string().optional(),
  scheduledStartTime: z.string().regex(/^\d{2}:\d{2}$/).default('08:00'),
  notes: z.string().optional(),
});

function mapProject(row: any) {
  return {
    id: row.id,
    projectName: row.project_name,
    clientName: row.client_name,
    address: row.address,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    radius: row.radius,
    workDate: row.work_date,
    workType: row.work_type,
    serviceType: row.service_type,
    pestTarget: row.pest_target,
    targetPests: typeof row.target_pests === 'string' ? JSON.parse(row.target_pests) : (row.target_pests || []),
    buildingAreaSqm: row.building_area_sqm !== null ? Number(row.building_area_sqm) : null,
    contractType: row.contract_type,
    warrantyMonths: row.warranty_months,
    nextServiceDate: row.next_service_date,
    scheduledStartTime: row.scheduled_start_time,
    notes: row.notes,
    createdBy: row.created_by,
    createdByName: row.created_by_name,
    createdAt: row.created_at,
    lockedAt: row.locked_at,
  };
}

// PRD 8: Pelaksana creates their own project. Admin can view all (see admin routes).
projectRouter.post(
  '/',
  requireRole('EXECUTOR'),
  asyncHandler(async (req, res) => {
    const parsed = createProjectSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, parsed.error.errors[0]?.message ?? 'Data proyek tidak valid.');
    }
    const d = parsed.data;

    if (d.contractType === 'RECURRING' && !d.nextServiceDate) {
      throw new HttpError(400, 'Kontrak berkala memerlukan tanggal layanan berikutnya.');
    }

    const initialLatitude = 0;
    const initialLongitude = 0;

    const rows = await query(
      `insert into projects (
        project_name, client_name, address, latitude, longitude, radius, work_date, work_type,
        service_type, pest_target, target_pests, building_area_sqm, contract_type, warranty_months, next_service_date,
        scheduled_start_time, notes, created_by
      ) 
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) returning *`,
      [
        d.projectName.trim(), d.clientName?.trim() || '', d.address.trim(), initialLatitude, initialLongitude, d.radius, d.workDate, d.workType?.trim() || '',
        d.serviceType, d.pestTarget?.trim() || null, JSON.stringify(d.targetPests), d.buildingAreaSqm ?? null, d.contractType, d.warrantyMonths, d.nextServiceDate || null,
        d.scheduledStartTime, d.notes?.trim() || null, req.user!.id,
      ]
    );
    const project = rows[0];

    // Auto-create the READY work report for this project (PRD Section 8).
    const report = await query(
      `insert into work_reports (project_id, executor_id, status) values ($1,$2,'READY') returning id`,
      [project.id, req.user!.id]
    );

    await logAction(req.user!, 'CREATE_PROJECT', 'project', project.id, `Membuat proyek "${project.project_name}" (${project.service_type}, radius ${project.radius}m).`);

    res.status(201).json({ project: mapProject({ ...project, created_by_name: req.user!.name }), workReportId: report[0].id });
  })
);

projectRouter.get(
  '/mine',
  requireRole('EXECUTOR'),
  asyncHandler(async (req, res) => {
    const rows = await query(
      `select p.*, u.name as created_by_name from projects p
       join users u on u.id = p.created_by
       where p.created_by = $1
       order by p.created_at desc`,
      [req.user!.id]
    );
    res.json({ projects: rows.map(mapProject) });
  })
);

projectRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const rows = await query(
      `select p.*, u.name as created_by_name from projects p
       join users u on u.id = p.created_by
       where p.id = $1`,
      [req.params.id]
    );
    const project = rows[0];
    if (!project) throw new HttpError(404, 'Proyek tidak ditemukan.');
    if (req.user!.role === 'EXECUTOR' && project.created_by !== req.user!.id) {
      throw new HttpError(403, 'Anda hanya dapat melihat proyek milik sendiri.');
    }
    res.json({ project: mapProject(project) });
  })
);
