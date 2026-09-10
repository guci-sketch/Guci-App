-- FIELDWORK database schema
-- PostgreSQL 14+. Mirrors PRD Section 30, extended with:
--   * password_hash on users (real auth, not a client-side check)
--   * risk_config for admin-tunable thresholds (PRD Section 21)
--   * project lock enforced by trigger, not just a client rule (PRD Section 9)

create extension if not exists "pgcrypto";

create type user_role as enum ('ADMIN', 'EXECUTOR');

create type work_report_status as enum (
  'DRAFT', 'READY', 'WORKING', 'COMPLETED', 'FLAGGED', 'REVIEWED'
);

create type risk_level as enum (
  'NORMAL', 'LOW_RISK', 'REVIEW', 'HIGH_RISK', 'CRITICAL'
);

create type photo_type as enum ('CHECK_IN', 'PROGRESS', 'CHECK_OUT');

-- Pest control service taxonomy (adapted from the generic "work_type" free
-- text field so the risk engine, filters, and treatment form can reason
-- about what kind of job this actually is).
create type service_type as enum (
  'GENERAL_PEST_CONTROL',  -- Pest Control Umum (kecoa, semut, laba-laba, dst.)
  'TERMITE_CONTROL',       -- Anti Rayap (baiting / soil treatment / drilling)
  'FUMIGATION',            -- Fumigasi (kontainer, gudang, komoditas ekspor)
  'RODENT_CONTROL',        -- Pengendalian Tikus
  'MOSQUITO_CONTROL',      -- Fogging / Pengendalian Nyamuk
  'BIRD_CONTROL',          -- Pengendalian Burung
  'BED_BUG_CONTROL',       -- Kutu Busuk
  'DISINFECTION'           -- Disinfeksi Area
);

create type application_method as enum (
  'SPRAYING',        -- Penyemprotan (residual/contact spray)
  'BAITING',         -- Sistem Umpan (bait station)
  'DRILLING',        -- Pengeboran & Injeksi (anti rayap beton/lantai)
  'TRENCHING',       -- Parit Kimia (soil treatment keliling bangunan)
  'FOGGING',         -- Pengasapan (ULV / thermal fogging)
  'MISTING',         -- Pengabutan
  'DUSTING',         -- Penaburan Bubuk
  'GEL_INJECTION'    -- Gel Umpan Titik Injeksi
);

create type contract_type as enum ('ONE_TIME', 'RECURRING');

create table users (
  id uuid primary key default gen_random_uuid(),
  name varchar(120) not null,
  email varchar(160) not null unique,
  nip varchar(60) unique,
  password_hash text not null,
  role user_role not null,
  phone varchar(30),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table user_locations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  latitude double precision not null,
  longitude double precision not null,
  accuracy double precision not null,
  tracked_at timestamptz not null default now()
);

create table projects (
  id uuid primary key default gen_random_uuid(),
  project_name varchar(160) not null,
  client_name varchar(160) not null default '',
  address text not null,
  latitude double precision not null,
  longitude double precision not null,
  radius integer not null default 100 check (radius > 0),
  work_date date not null,
  work_type varchar(120) not null default '', -- free-text job description, e.g. "Fumigasi Kontainer Ekspor 40ft"
  service_type service_type not null default 'GENERAL_PEST_CONTROL',
  pest_target varchar(160), -- jenis hama sasaran, e.g. "Rayap Tanah (Subterranean Termite)"
  target_pests jsonb not null default '[]'::jsonb, -- Array of pest targets, allowing multiple selections
  building_area_sqm numeric(10, 2), -- luas area/bangunan yang ditangani
  contract_type contract_type not null default 'ONE_TIME',
  warranty_months integer not null default 0, -- 0 = tanpa garansi
  next_service_date date, -- untuk kontrak berkala (recurring)
  scheduled_start_time time not null default '08:00',
  notes text,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  locked_at timestamptz
);

create table work_reports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  executor_id uuid references users(id) on delete set null,

  status work_report_status not null default 'READY',

  check_in_at timestamptz,
  check_in_latitude double precision,
  check_in_longitude double precision,
  check_in_accuracy double precision,
  check_in_distance double precision,
  check_in_valid boolean,

  check_out_at timestamptz,
  check_out_latitude double precision,
  check_out_longitude double precision,
  check_out_accuracy double precision,
  check_out_distance double precision,
  check_out_valid boolean,

  duration_seconds integer,

  risk_score integer not null default 0,
  risk_level risk_level not null default 'NORMAL',

  reviewed_by uuid references users(id),
  reviewed_at timestamptz,
  review_notes text,
  
  customer_name varchar(160),
  customer_phone varchar(30),
  customer_feedback text,
  customer_signature text,

  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Business Rule 2 (PRD 52): a project has exactly one active work report
  unique (project_id)
);

create table treatment_records (
  id uuid primary key default gen_random_uuid(),
  work_report_id uuid not null references work_reports(id) on delete cascade unique,

  application_method application_method not null,
  chemical_name varchar(160) not null,      -- nama dagang produk, e.g. "Termidor SC"
  active_ingredient varchar(160),            -- bahan aktif, e.g. "Fipronil 2.5%"
  dosage varchar(120) not null,              -- e.g. "5 liter larutan / titik", "1:100 konsentrasi"
  treatment_area_sqm numeric(10, 2),         -- luas area yang benar-benar dirawat

  -- Anti rayap (termite control)
  drilling_points_count integer,             -- jumlah titik bor/injeksi

  -- Fumigasi — data ini krusial untuk kepatuhan keselamatan (racun gas)
  fumigant_type varchar(120),                -- e.g. "Phosphine (PH3)", "Methyl Bromide"
  gas_concentration_ppm numeric(10, 2),
  sealing_started_at timestamptz,            -- mulai penyegelan/tenting
  aeration_completed_at timestamptz,         -- selesai aerasi — wajib sebelum area boleh diakses ulang

  safety_notes text,
  technician_notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table documentation_photos (
  id uuid primary key default gen_random_uuid(),
  work_report_id uuid not null references work_reports(id) on delete cascade,

  photo_type photo_type not null,
  photo_tag varchar(20), -- optional: 'BEFORE' or 'AFTER' for PROGRESS photos (bukti kondisi sebelum/sesudah perlakuan)
  storage_path text not null,
  thumbnail_path text,

  latitude double precision not null,
  longitude double precision not null,
  accuracy double precision not null,
  distance_to_project double precision not null,
  is_within_radius boolean not null,

  captured_at timestamptz not null,
  uploaded_at timestamptz not null default now(),

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create table risk_events (
  id uuid primary key default gen_random_uuid(),
  work_report_id uuid not null references work_reports(id) on delete cascade,

  event_type varchar(60) not null,
  points integer not null,
  severity varchar(20) not null,

  title varchar(160) not null,
  description text not null,
  expected_value varchar(120),
  actual_value varchar(120),

  created_at timestamptz not null default now()
);

-- Admin-tunable thresholds (PRD Section 21). Single-row table, seeded with defaults.
create table risk_config (
  id smallint primary key default 1 check (id = 1),
  late_checkin_threshold_minutes integer not null default 15,
  late_checkin_points integer not null default 10,
  outside_radius_points integer not null default 30,
  short_duration_critical_minutes integer not null default 30,
  short_duration_critical_points integer not null default 20,
  short_duration_warning_minutes integer not null default 60,
  short_duration_warning_points integer not null default 10,
  min_total_photos integer not null default 3,
  min_total_photos_points integer not null default 10,
  require_progress_photo boolean not null default true,
  no_progress_photo_points integer not null default 15,
  location_drift_threshold_meters integer not null default 300,
  location_drift_points integer not null default 15,
  missing_treatment_record_points integer not null default 20,
  fumigation_missing_aeration_points integer not null default 40,
  review_threshold integer not null default 40,
  high_risk_threshold integer not null default 60,
  critical_threshold integer not null default 80,
  low_risk_threshold integer not null default 20,
  updated_by uuid references users(id),
  updated_at timestamptz not null default now()
);

insert into risk_config (id) values (1) on conflict (id) do nothing;

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete set null,
  user_name varchar(120) not null,
  user_role user_role not null,
  action varchar(60) not null,
  entity_type varchar(40) not null,
  entity_id text,
  details text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

-- Indexes for the filtering patterns in PRD Section 24/28/29
create index idx_work_reports_status on work_reports(status);
create index idx_work_reports_executor on work_reports(executor_id);
create index idx_work_reports_project on work_reports(project_id);
create index idx_work_reports_checkin_at on work_reports(check_in_at);
create index idx_work_reports_risk_level on work_reports(risk_level);
create index idx_photos_work_report on documentation_photos(work_report_id);
create index idx_risk_events_work_report on risk_events(work_report_id);
create index idx_audit_logs_created_at on audit_logs(created_at desc);
create index idx_projects_service_type on projects(service_type);
create index idx_treatment_records_work_report on treatment_records(work_report_id);
create index idx_user_locations_user_id on user_locations(user_id);
create index idx_user_locations_tracked_at on user_locations(tracked_at desc);

-- Enforce PRD Section 9 (project lock) at the database level, not just in the client.
create or replace function fn_prevent_locked_project_edit()
returns trigger as $$
begin
  if old.locked_at is not null then
    if new.project_name is distinct from old.project_name
      or new.latitude is distinct from old.latitude
      or new.longitude is distinct from old.longitude
      or new.radius is distinct from old.radius
      or new.work_date is distinct from old.work_date
    then
      raise exception 'PROJECT_LOCKED: critical fields cannot change after check-in';
    end if;
  end if;
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_project_lock
before update on projects
for each row execute function fn_prevent_locked_project_edit();

create or replace function fn_touch_work_report()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_work_report_touch
before update on work_reports
for each row execute function fn_touch_work_report();

create trigger trg_treatment_record_touch
before update on treatment_records
for each row execute function fn_touch_work_report();
