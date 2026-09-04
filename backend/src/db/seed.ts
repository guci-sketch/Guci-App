import bcrypt from 'bcryptjs';
import { pool, withTransaction } from './pool.js';
import { evaluateWorkReportRisk, DEFAULT_RISK_CONFIG } from '../modules/risk/riskEngine.js';
import { savePhoto } from '../modules/photos/storage.js';

// A minimal valid 8x8 gray JPEG, used as a placeholder so seeded photo
// records resolve to a real file instead of a broken link.
const PLACEHOLDER_JPEG_BASE64 =
  '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAAIAAgDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=';

async function seedPlaceholderPhoto(): Promise<string> {
  return savePhoto(Buffer.from(PLACEHOLDER_JPEG_BASE64, 'base64'), 'jpg');
}

/**
 * Seeds a believable dataset: two executors mid-career, one flagged scenario,
 * one ready-to-start scenario — enough to exercise every screen without
 * pretending the data is bigger than it is.
 */

async function seed() {
  await withTransaction(async client => {
    const existingUsers = await client.query('select count(*)::int as n from users');
    if (existingUsers.rows[0].n > 0) {
      console.log('[seed] users already exist — skipping (truncate tables first if you want to reseed).');
      return;
    }

    const adminPass = await bcrypt.hash('admin123', 10);
    const fieldPass = await bcrypt.hash('lapangan123', 10);

    const admin = await client.query(
      `insert into users (name, email, nip, password_hash, role, phone)
       values ($1,$2,$3,$4,'ADMIN',$5) returning id`,
      ['Ahmad Fauzi', 'admin.fauzi@fieldwork.id', 'OPS-198804-001', adminPass, '0812-1000-2001']
    );
    const adminId = admin.rows[0].id;

    const budi = await client.query(
      `insert into users (name, email, nip, password_hash, role, phone)
       values ($1,$2,$3,$4,'EXECUTOR',$5) returning id`,
      ['Budi Santoso', 'budi.santoso@fieldwork.id', 'FLD-202108-014', fieldPass, '0813-2000-3014']
    );
    const budiId = budi.rows[0].id;

    const sinta = await client.query(
      `insert into users (name, email, nip, password_hash, role, phone)
       values ($1,$2,$3,$4,'EXECUTOR',$5) returning id`,
      ['Sinta Maharani', 'sinta.maharani@fieldwork.id', 'FLD-202203-029', fieldPass, '0814-3000-4029']
    );
    const sintaId = sinta.rows[0].id;

    const andi = await client.query(
      `insert into users (name, email, nip, password_hash, role, phone)
       values ($1,$2,$3,$4,'EXECUTOR',$5) returning id`,
      ['Andi Pratama', 'andi.pratama@fieldwork.id', 'FLD-202301-042', fieldPass, '0815-4000-5042']
    );
    const andiId = andi.rows[0].id;

    // --- Project 1: Budi, in progress, healthy ---
    const projBudi = await client.query(
      `insert into projects (project_name, client_name, address, latitude, longitude, radius, work_date, work_type, scheduled_start_time, created_by, locked_at)
       values ($1,$2,$3,$4,$5,$6,current_date,$7,'08:00',$8, now())
       returning id`,
      ['RS Hermina BSD', 'RS Hermina BSD', 'Jl. Pahlawan Seribu Kav. 1, BSD City, Serpong, Tangerang Selatan', -6.298144, 106.671342, 100, 'Perawatan Instalasi Listrik', budiId]
    );
    const checkInBudi = new Date();
    checkInBudi.setHours(8, 12, 0, 0);
    const reportBudi = await client.query(
      `insert into work_reports (project_id, executor_id, status, check_in_at, check_in_latitude, check_in_longitude, check_in_accuracy, check_in_distance, check_in_valid)
       values ($1,$2,'WORKING',$3,-6.298151,106.671355,8,12,true) returning id`,
      [projBudi.rows[0].id, budiId, checkInBudi.toISOString()]
    );
    await client.query(
      `insert into documentation_photos (work_report_id, photo_type, storage_path, latitude, longitude, accuracy, distance_to_project, is_within_radius, captured_at, metadata)
       values ($1,'CHECK_IN',$2,-6.298151,106.671355,8,12,true,$3,$4)`,
      [reportBudi.rows[0].id, await seedPlaceholderPhoto(), checkInBudi.toISOString(), JSON.stringify({ seed: true, executorName: 'Budi Santoso', projectName: 'RS Hermina BSD' })]
    );

    // --- Project 2: Sinta, completed, flagged (outside radius, short duration) ---
    const projSinta = await client.query(
      `insert into projects (project_name, client_name, address, latitude, longitude, radius, work_date, work_type, scheduled_start_time, created_by, locked_at)
       values ($1,$2,$3,$4,$5,$6,current_date,$7,'09:00',$8, now())
       returning id`,
      ['Gudang Logistik Cikupa', 'PT Logistik Cikupa', 'Jl. Raya Cikupa No. 22, Cikupa, Tangerang', -6.223, 106.531, 100, 'Inspeksi Gudang', sintaId]
    );
    const sintaCheckIn = new Date();
    sintaCheckIn.setHours(9, 14, 0, 0);
    const sintaCheckOut = new Date();
    sintaCheckOut.setHours(9, 41, 0, 0);
    const reportSintaDraft = {
      scheduledStartTime: '09:00',
      checkInAt: sintaCheckIn.toISOString(),
      checkOutAt: sintaCheckOut.toISOString(),
      checkInLatitude: -6.229, checkInLongitude: 106.538,
      checkOutLatitude: -6.229, checkOutLongitude: 106.538,
      checkInDistance: 740, checkOutDistance: 740,
      projectRadius: 100,
      photos: [{ photoType: 'CHECK_IN' as const }],
    };
    const riskEval = evaluateWorkReportRisk(reportSintaDraft as any, DEFAULT_RISK_CONFIG);
    const reportSinta = await client.query(
      `insert into work_reports (project_id, executor_id, status, check_in_at, check_in_latitude, check_in_longitude, check_in_accuracy, check_in_distance, check_in_valid,
        check_out_at, check_out_latitude, check_out_longitude, check_out_accuracy, check_out_distance, check_out_valid, duration_seconds, risk_score, risk_level)
       values ($1,$2,'FLAGGED',$3,-6.229,106.538,14,740,false,$4,-6.229,106.538,15,740,false,$5,$6,$7) returning id`,
      [projSinta.rows[0].id, sintaId, sintaCheckIn.toISOString(), sintaCheckOut.toISOString(),
        Math.round((sintaCheckOut.getTime() - sintaCheckIn.getTime()) / 1000), riskEval.score, riskEval.level]
    );
    await client.query(
      `insert into documentation_photos (work_report_id, photo_type, storage_path, latitude, longitude, accuracy, distance_to_project, is_within_radius, captured_at, metadata)
       values ($1,'CHECK_IN',$2,-6.229,106.538,14,740,false,$3,$4)`,
      [reportSinta.rows[0].id, await seedPlaceholderPhoto(), sintaCheckIn.toISOString(), JSON.stringify({ seed: true, executorName: 'Sinta Maharani', projectName: 'Gudang Logistik Cikupa' })]
    );
    for (const ev of riskEval.events) {
      await client.query(
        `insert into risk_events (work_report_id, event_type, points, severity, title, description, expected_value, actual_value)
         values ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [reportSinta.rows[0].id, ev.eventType, ev.points, ev.severity, ev.title, ev.description, ev.expectedValue ?? null, ev.actualValue ?? null]
      );
    }

    // --- Project 3: Andi, ready to check in ---
    const projAndi = await client.query(
      `insert into projects (project_name, client_name, address, latitude, longitude, radius, work_date, work_type, scheduled_start_time, created_by)
       values ($1,$2,$3,$4,$5,$6,current_date,$7,'08:00',$8)
       returning id`,
      ['Kantor Cabang Sudirman', 'Bank Central Asia', 'Jl. Jend. Sudirman Kav. 22-23, Jakarta Selatan', -6.224, 106.809, 100, 'Pemeliharaan AC & Jaringan', andiId]
    );
    await client.query(
      `insert into work_reports (project_id, executor_id, status)
       values ($1,$2,'READY')`,
      [projAndi.rows[0].id, andiId]
    );

    await client.query(
      `insert into audit_logs (user_id, user_name, user_role, action, entity_type, entity_id, details)
       values
        ($1,'Ahmad Fauzi','ADMIN','LOGIN','system',null,'Akun admin awal dibuat oleh seed script.'),
        ($2,'Budi Santoso','EXECUTOR','CHECK_IN','work_report',$3,'Check-in valid di dalam radius proyek.'),
        ($4,'Sinta Maharani','EXECUTOR','CHECK_OUT','work_report',$5,'Check-out di luar radius — laporan ditandai untuk peninjauan.')`,
      [adminId, budiId, reportBudi.rows[0].id, sintaId, reportSinta.rows[0].id]
    );

    console.log('[seed] created 4 users, 3 projects, 3 work reports.');
    console.log('[seed] login as admin.fauzi@fieldwork.id / admin123');
    console.log('[seed] login as budi.santoso@fieldwork.id / lapangan123');
  });
}

seed()
  .then(() => pool.end())
  .catch(err => {
    console.error('[seed] failed:', err);
    pool.end();
    process.exit(1);
  });
