import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { pool, query, withTransaction } from '../../db/pool.js';
import { asyncHandler, HttpError } from '../../utils/asyncHandler.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { logAction } from '../../utils/audit.js';
import { isWithinRadius, isValidCoordinate } from '../../utils/geo.js';
import { savePhoto } from '../photos/storage.js';
import { evaluateWorkReportRisk } from '../risk/riskEngine.js';
import { getRiskConfig } from '../risk/riskConfigRepository.js';
import { getReportOrThrow, assertOwnerOrAdmin, mapReportFull } from './reportMapper.js';

export const workReportRouter = Router();
workReportRouter.use(requireAuth);

const maxSizeMb = Number(process.env.MAX_PHOTO_SIZE_MB || 8);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxSizeMb * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      cb(new HttpError(400, 'File yang diunggah harus berupa gambar.') as any);
      return;
    }
    cb(null, true);
  },
});

const evidenceSchema = z.object({
  latitude: z.coerce.number(),
  longitude: z.coerce.number(),
  accuracy: z.coerce.number().min(0),
  notes: z.string().optional(),
});
workReportRouter.get(
  '/mine',
  requireRole('EXECUTOR'),
  asyncHandler(async (req, res) => {
    const rows = await query(
      `select wr.*, p.project_name, p.client_name, p.address as project_address, p.latitude as project_latitude, p.longitude as project_longitude, p.radius as project_radius, p.scheduled_start_time, u.name as executor_name, u.email as executor_email
       from work_reports wr
       join projects p on p.id = wr.project_id
       join users u on u.id = wr.executor_id
       where wr.executor_id = $1
       order by wr.created_at desc`,
      [req.user!.id]
    );
    res.json({ workReports: await Promise.all(rows.map(mapReportFull)) });
  })
);

workReportRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const report = await getReportOrThrow(req.params.id);
    assertOwnerOrAdmin(req.user!, report);
    res.json({ workReport: await mapReportFull(report) });
  })
);

// PRD Section 10–15: Check-in — GPS + server timestamp + mandatory camera photo.
workReportRouter.post(
  '/:id/check-in',
  requireRole('EXECUTOR'),
  upload.single('photo'),
  asyncHandler(async (req, res) => {
    const parsed = evidenceSchema.safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, parsed.error.errors[0]?.message ?? 'Data lokasi tidak valid.');
    if (!req.file) throw new HttpError(400, 'Foto check-in wajib diambil melalui kamera.');
    if (!isValidCoordinate(parsed.data.latitude, parsed.data.longitude)) {
      throw new HttpError(400, 'Koordinat GPS tidak valid.');
    }

    const report = await getReportOrThrow(req.params.id);
    assertOwnerOrAdmin(req.user!, report);
    if (report.status !== 'READY' && report.status !== 'DRAFT') {
      throw new HttpError(409, `Laporan berstatus ${report.status} — check-in hanya dapat dilakukan sekali.`);
    }

    const serverNow = new Date(); // Rule 6: server timestamp is the official timestamp.
    const geo = isWithinRadius(
      { latitude: parsed.data.latitude, longitude: parsed.data.longitude },
      { latitude: Number(report.project_latitude), longitude: Number(report.project_longitude) },
      report.project_radius
    );

    const storagePath = await savePhoto(req.file.buffer, 'jpg');

    const result = await withTransaction(async client => {
      await client.query(
        `update work_reports set status = 'WORKING', check_in_at = $1, check_in_latitude = $2, check_in_longitude = $3,
          check_in_accuracy = $4, check_in_distance = $5, check_in_valid = $6, notes = coalesce($7, notes)
         where id = $8`,
        [serverNow.toISOString(), parsed.data.latitude, parsed.data.longitude, parsed.data.accuracy, geo.distance, geo.isWithin, parsed.data.notes ?? null, report.id]
      );
      // Project lock (PRD Section 9)
      await client.query(`update projects set locked_at = coalesce(locked_at, now()) where id = $1`, [report.project_id]);

      const photo = await client.query(
        `insert into documentation_photos (work_report_id, photo_type, storage_path, latitude, longitude, accuracy, distance_to_project, is_within_radius, captured_at, metadata)
         values ($1,'CHECK_IN',$2,$3,$4,$5,$6,$7,$8,$9) returning id`,
        [report.id, storagePath, parsed.data.latitude, parsed.data.longitude, parsed.data.accuracy, geo.distance, geo.isWithin, serverNow.toISOString(),
          JSON.stringify({ projectName: report.project_name, executorName: req.user!.name })]
      );
      return photo.rows[0].id;
    });

    await logAction(
      req.user!,
      'CHECK_IN',
      'work_report',
      report.id,
      `Check-in ${geo.isWithin ? 'valid' : 'DI LUAR RADIUS'} — jarak ${geo.distance}m, akurasi ±${Math.round(parsed.data.accuracy)}m.`
    );

    const updated = await getReportOrThrow(report.id);
    res.status(201).json({ workReport: await mapReportFull(updated), photoId: result });
  })
);

// PRD Section 16: progress documentation while WORKING.
workReportRouter.post(
  '/:id/photos',
  requireRole('EXECUTOR'),
  upload.single('photo'),
  asyncHandler(async (req, res) => {
    const parsed = evidenceSchema.safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, parsed.error.errors[0]?.message ?? 'Data lokasi tidak valid.');
    if (!req.file) throw new HttpError(400, 'Foto wajib diambil melalui kamera.');

    const report = await getReportOrThrow(req.params.id);
    assertOwnerOrAdmin(req.user!, report);
    if (report.status !== 'WORKING') {
      throw new HttpError(409, 'Dokumentasi progres hanya dapat ditambahkan saat status pekerjaan berlangsung.');
    }

    const serverNow = new Date();
    const geo = isWithinRadius(
      { latitude: parsed.data.latitude, longitude: parsed.data.longitude },
      { latitude: Number(report.project_latitude), longitude: Number(report.project_longitude) },
      report.project_radius
    );
    const storagePath = await savePhoto(req.file.buffer, 'jpg');

    await query(
      `insert into documentation_photos (work_report_id, photo_type, storage_path, latitude, longitude, accuracy, distance_to_project, is_within_radius, captured_at, metadata)
       values ($1,'PROGRESS',$2,$3,$4,$5,$6,$7,$8,$9)`,
      [report.id, storagePath, parsed.data.latitude, parsed.data.longitude, parsed.data.accuracy, geo.distance, geo.isWithin, serverNow.toISOString(),
        JSON.stringify({ projectName: report.project_name, executorName: req.user!.name, caption: parsed.data.notes ?? null })]
    );
    await query(`update work_reports set updated_at = now() where id = $1`, [report.id]);

    await logAction(req.user!, 'CAPTURE_PROGRESS_PHOTO', 'work_report', report.id, `Dokumentasi progres ditambahkan pada ${report.project_name}.`);

    const updated = await getReportOrThrow(report.id);
    res.status(201).json({ workReport: await mapReportFull(updated) });
  })
);

// PRD Section 17–18, 22: check-out — runs the risk engine and may flag the report.
workReportRouter.post(
  '/:id/check-out',
  requireRole('EXECUTOR'),
  upload.single('photo'),
  asyncHandler(async (req, res) => {
    const parsed = evidenceSchema.safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, parsed.error.errors[0]?.message ?? 'Data lokasi tidak valid.');
    if (!req.file) throw new HttpError(400, 'Foto check-out wajib diambil melalui kamera.');

    const report = await getReportOrThrow(req.params.id);
    assertOwnerOrAdmin(req.user!, report);
    if (report.status !== 'WORKING') {
      throw new HttpError(409, 'Check-out hanya dapat dilakukan setelah check-in dan saat pekerjaan berlangsung.');
    }

    const serverNow = new Date();
    const geo = isWithinRadius(
      { latitude: parsed.data.latitude, longitude: parsed.data.longitude },
      { latitude: Number(report.project_latitude), longitude: Number(report.project_longitude) },
      report.project_radius
    );
    const storagePath = await savePhoto(req.file.buffer, 'jpg');
    const durationSeconds = Math.max(0, Math.round((serverNow.getTime() - new Date(report.check_in_at).getTime()) / 1000));

    await withTransaction(async client => {
      await client.query(
        `update work_reports set check_out_at = $1, check_out_latitude = $2, check_out_longitude = $3, check_out_accuracy = $4,
          check_out_distance = $5, check_out_valid = $6, duration_seconds = $7, notes = coalesce($8, notes)
         where id = $9`,
        [serverNow.toISOString(), parsed.data.latitude, parsed.data.longitude, parsed.data.accuracy, geo.distance, geo.isWithin, durationSeconds, parsed.data.notes ?? null, report.id]
      );
      await client.query(
        `insert into documentation_photos (work_report_id, photo_type, storage_path, latitude, longitude, accuracy, distance_to_project, is_within_radius, captured_at, metadata)
         values ($1,'CHECK_OUT',$2,$3,$4,$5,$6,$7,$8,$9)`,
        [report.id, storagePath, parsed.data.latitude, parsed.data.longitude, parsed.data.accuracy, geo.distance, geo.isWithin, serverNow.toISOString(),
          JSON.stringify({ projectName: report.project_name, executorName: req.user!.name })]
      );
    });

    // Run the risk engine server-side against the now-complete report (PRD 22, 51).
    const photos = await query<{ photo_type: string }>('select photo_type from documentation_photos where work_report_id = $1', [report.id]);
    const config = await getRiskConfig();
    const fresh = await getReportOrThrow(report.id);
    const evaluation = evaluateWorkReportRisk(
      {
        scheduledStartTime: fresh.scheduled_start_time,
        checkInAt: fresh.check_in_at,
        checkOutAt: serverNow.toISOString(),
        checkInLatitude: fresh.check_in_latitude,
        checkInLongitude: fresh.check_in_longitude,
        checkOutLatitude: parsed.data.latitude,
        checkOutLongitude: parsed.data.longitude,
        checkInDistance: fresh.check_in_distance,
        checkOutDistance: geo.distance,
        projectRadius: report.project_radius,
        photos: photos.map(p => ({ photoType: p.photo_type as any })),
      },
      config
    );
    const finalStatus = evaluation.isFlagged ? 'FLAGGED' : 'COMPLETED';

    await withTransaction(async client => {
      await client.query(
        `update work_reports set status = $1, risk_score = $2, risk_level = $3 where id = $4`,
        [finalStatus, evaluation.score, evaluation.level, report.id]
      );
      for (const ev of evaluation.events) {
        await client.query(
          `insert into risk_events (work_report_id, event_type, points, severity, title, description, expected_value, actual_value)
           values ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [report.id, ev.eventType, ev.points, ev.severity, ev.title, ev.description, ev.expectedValue ?? null, ev.actualValue ?? null]
        );
      }
    });

    await logAction(
      req.user!,
      'CHECK_OUT',
      'work_report',
      report.id,
      `Check-out selesai. Durasi ${Math.round(durationSeconds / 60)} menit. Status: ${finalStatus} (risk ${evaluation.score}).`
    );
    if (evaluation.isFlagged) {
      await logAction(req.user!, 'FLAG_REPORT', 'work_report', report.id, `Anomali terdeteksi: ${evaluation.events.map(e => e.title).join(', ')}.`);
    }

    const updated = await getReportOrThrow(report.id);
    res.json({ workReport: await mapReportFull(updated) });
  })
);

// Admin review of a flagged report (PRD Section 27).
workReportRouter.post(
  '/:id/review',
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const notes = z.string().min(1, 'Catatan tinjauan wajib diisi.').safeParse(req.body?.notes);
    if (!notes.success) throw new HttpError(400, notes.error.errors[0]?.message ?? 'Catatan tidak valid.');

    const report = await getReportOrThrow(req.params.id);
    await query(
      `update work_reports set status = 'REVIEWED', reviewed_by = $1, reviewed_at = now(), review_notes = $2 where id = $3`,
      [req.user!.id, notes.data, report.id]
    );
    await logAction(req.user!, 'REVIEW_REPORT', 'work_report', report.id, `Admin meninjau laporan: "${notes.data}"`);

    const updated = await getReportOrThrow(report.id);
    res.json({ workReport: await mapReportFull(updated) });
  })
);
