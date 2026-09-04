import { Router } from 'express';
import { z } from 'zod';
import { query } from '../../db/pool.js';
import { asyncHandler, HttpError } from '../../utils/asyncHandler.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { logAction } from '../../utils/audit.js';
import { isValidCoordinate } from '../../utils/geo.js';

export const projectRouter = Router();
projectRouter.use(requireAuth);

const createProjectSchema = z.object({
  projectName: z.string().min(3, 'Nama proyek minimal 3 karakter.'),
  clientName: z.string().optional().default(''),
  address: z.string().min(5, 'Alamat wajib diisi.'),
  latitude: z.number(),
  longitude: z.number(),
  radius: z.number().int().min(20).max(2000).default(100),
  workDate: z.string().min(1, 'Tanggal kerja wajib diisi.'),
  workType: z.string().optional().default(''),
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
    if (!isValidCoordinate(d.latitude, d.longitude)) {
      throw new HttpError(400, 'Koordinat lokasi tidak valid.');
    }

    const rows = await query(
      `insert into projects (project_name, client_name, address, latitude, longitude, radius, work_date, work_type, scheduled_start_time, notes, created_by)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) returning *`,
      [d.projectName.trim(), d.clientName?.trim() || '', d.address.trim(), d.latitude, d.longitude, d.radius, d.workDate, d.workType?.trim() || '', d.scheduledStartTime, d.notes?.trim() || null, req.user!.id]
    );
    const project = rows[0];

    // Auto-create the READY work report for this project (PRD Section 8).
    const report = await query(
      `insert into work_reports (project_id, executor_id, status) values ($1,$2,'READY') returning id`,
      [project.id, req.user!.id]
    );

    await logAction(req.user!, 'CREATE_PROJECT', 'project', project.id, `Membuat proyek "${project.project_name}" (radius ${project.radius}m).`);

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
