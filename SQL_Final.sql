-- =============================================================================
-- FINAL DATABASE SCHEMA & MULTI-TENANT (FIELDWORK V2)
-- Role Boundaries: SUPERADMIN, ADMIN, MARKETING, INVENTORY, EXECUTOR
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ==========================================
-- 0. BERSIHKAN TABEL LAMA
-- ==========================================
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.risk_config CASCADE;
DROP TABLE IF EXISTS public.risk_events CASCADE;
DROP TABLE IF EXISTS public.documentation_photos CASCADE;
DROP TABLE IF EXISTS public.treatment_records CASCADE;
DROP TABLE IF EXISTS public.work_reports CASCADE;
DROP TABLE IF EXISTS public.projects CASCADE;
DROP TABLE IF EXISTS public.user_locations CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.company_settings CASCADE;
DROP TABLE IF EXISTS public.companies CASCADE;
DROP TABLE IF EXISTS public.inventory_logs CASCADE;
DROP TABLE IF EXISTS public.inventory_items CASCADE;
DROP TABLE IF EXISTS public.quotations CASCADE;
DROP TABLE IF EXISTS public.spk CASCADE;

-- Hapus ENUM lama
DROP TYPE IF EXISTS public.user_role CASCADE;
DROP TYPE IF EXISTS public.company_status CASCADE;
DROP TYPE IF EXISTS public.work_report_status CASCADE;
DROP TYPE IF EXISTS public.risk_level CASCADE;
DROP TYPE IF EXISTS public.photo_type CASCADE;
DROP TYPE IF EXISTS public.service_type CASCADE;
DROP TYPE IF EXISTS public.application_method CASCADE;
DROP TYPE IF EXISTS public.contract_type CASCADE;

-- ==========================================
-- 1. ENUMERASI BARU
-- ==========================================
CREATE TYPE public.user_role AS ENUM (
  'SUPERADMIN', 'ADMIN', 'MARKETING', 'INVENTORY', 'EXECUTOR'
);

CREATE TYPE public.company_status AS ENUM ('TRIAL', 'ACTIVE', 'SUSPENDED', 'EXPIRED');

CREATE TYPE public.work_report_status AS ENUM (
  'DRAFT', 'READY', 'WORKING', 'COMPLETED', 'FLAGGED', 'REVIEWED'
);

CREATE TYPE public.risk_level AS ENUM (
  'NORMAL', 'LOW_RISK', 'REVIEW', 'HIGH_RISK', 'CRITICAL'
);

CREATE TYPE public.photo_type AS ENUM ('CHECK_IN', 'PROGRESS', 'CHECK_OUT');

CREATE TYPE public.service_type AS ENUM (
  'GENERAL_PEST_CONTROL', 'TERMITE_CONTROL', 'FUMIGATION', 'RODENT_CONTROL', 
  'MOSQUITO_CONTROL', 'BIRD_CONTROL', 'BED_BUG_CONTROL', 'DISINFECTION'
);

CREATE TYPE public.application_method AS ENUM (
  'SPRAYING', 'BAITING', 'DRILLING', 'TRENCHING', 'FOGGING', 'MISTING', 'DUSTING', 'GEL_INJECTION'
);

CREATE TYPE public.contract_type AS ENUM ('ONE_TIME', 'RECURRING');

-- ==========================================
-- 2. TABEL PERUSAHAAN (TENANT)
-- ==========================================
CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name varchar(255) NOT NULL,
  company_slug varchar(100) UNIQUE NOT NULL,
  status public.company_status NOT NULL DEFAULT 'ACTIVE',
  subscription_plan varchar(50) NOT NULL DEFAULT 'FREE_TIER',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ==========================================
-- 3. PENGGUNA DENGAN RELASI TENANT
-- ==========================================
CREATE TABLE public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE, -- NULL untuk SUPERADMIN
  name varchar(120) NOT NULL,
  email varchar(160) NOT NULL UNIQUE,
  nip varchar(60) UNIQUE,
  password_hash text NOT NULL,
  role public.user_role NOT NULL DEFAULT 'EXECUTOR',
  phone varchar(30),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.user_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  accuracy double precision NOT NULL,
  tracked_at timestamptz NOT NULL DEFAULT now()
);

-- ==========================================
-- 4. PROYEK, SPK, QUOTATIONS & INVENTORI
-- ==========================================
CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  project_name varchar(160) NOT NULL,
  client_name varchar(160) NOT NULL DEFAULT '',
  address text NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  radius integer NOT NULL DEFAULT 100 CHECK (radius > 0),
  work_date date NOT NULL,
  work_type varchar(120) NOT NULL DEFAULT '',
  service_type public.service_type NOT NULL DEFAULT 'GENERAL_PEST_CONTROL',
  pest_target varchar(160),
  target_pests jsonb NOT NULL DEFAULT '[]'::jsonb,
  building_area_sqm numeric(10, 2),
  contract_type public.contract_type NOT NULL DEFAULT 'ONE_TIME',
  warranty_months integer NOT NULL DEFAULT 0,
  next_service_date date,
  scheduled_start_time time NOT NULL DEFAULT '08:00',
  notes text,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz
);

CREATE TABLE public.work_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  executor_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  status public.work_report_status NOT NULL DEFAULT 'READY',
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
  risk_score integer NOT NULL DEFAULT 0,
  risk_level public.risk_level NOT NULL DEFAULT 'NORMAL',
  reviewed_by uuid REFERENCES public.users(id),
  reviewed_at timestamptz,
  review_notes text,
  customer_name varchar(160),
  customer_phone varchar(30),
  customer_feedback text,
  customer_signature text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id)
);

CREATE TABLE public.treatment_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_report_id uuid NOT NULL REFERENCES public.work_reports(id) ON DELETE CASCADE UNIQUE,
  application_method public.application_method NOT NULL,
  chemical_name varchar(160) NOT NULL,
  active_ingredient varchar(160),
  dosage varchar(120) NOT NULL,
  treatment_area_sqm numeric(10, 2),
  drilling_points_count integer,
  fumigant_type varchar(120),
  gas_concentration_ppm numeric(10, 2),
  sealing_started_at timestamptz,
  aeration_completed_at timestamptz,
  safety_notes text,
  technician_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.documentation_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_report_id uuid NOT NULL REFERENCES public.work_reports(id) ON DELETE CASCADE,
  photo_type public.photo_type NOT NULL,
  photo_tag varchar(20),
  storage_path text NOT NULL,
  thumbnail_path text,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  accuracy double precision NOT NULL,
  distance_to_project double precision NOT NULL,
  is_within_radius boolean NOT NULL,
  captured_at timestamptz NOT NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.risk_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_report_id uuid NOT NULL REFERENCES public.work_reports(id) ON DELETE CASCADE,
  event_type varchar(60) NOT NULL,
  points integer NOT NULL,
  severity varchar(20) NOT NULL,
  title varchar(160) NOT NULL,
  description text NOT NULL,
  expected_value varchar(120),
  actual_value varchar(120),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.risk_config (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  late_checkin_threshold_minutes integer NOT NULL DEFAULT 15,
  late_checkin_points integer NOT NULL DEFAULT 10,
  outside_radius_points integer NOT NULL DEFAULT 30,
  short_duration_critical_minutes integer NOT NULL DEFAULT 30,
  short_duration_critical_points integer NOT NULL DEFAULT 20,
  short_duration_warning_minutes integer NOT NULL DEFAULT 60,
  short_duration_warning_points integer NOT NULL DEFAULT 10,
  min_total_photos integer NOT NULL DEFAULT 3,
  min_total_photos_points integer NOT NULL DEFAULT 10,
  require_progress_photo boolean NOT NULL DEFAULT true,
  no_progress_photo_points integer NOT NULL DEFAULT 15,
  location_drift_threshold_meters integer NOT NULL DEFAULT 300,
  location_drift_points integer NOT NULL DEFAULT 15,
  missing_treatment_record_points integer NOT NULL DEFAULT 20,
  fumigation_missing_aeration_points integer NOT NULL DEFAULT 40,
  review_threshold integer NOT NULL DEFAULT 40,
  high_risk_threshold integer NOT NULL DEFAULT 60,
  critical_threshold integer NOT NULL DEFAULT 80,
  low_risk_threshold integer NOT NULL DEFAULT 20,
  updated_by uuid REFERENCES public.users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.risk_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  user_name varchar(120) NOT NULL,
  user_role public.user_role NOT NULL,
  action varchar(60) NOT NULL,
  entity_type varchar(40) NOT NULL,
  entity_id text,
  details text NOT NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  nama varchar(255) NOT NULL,
  kategori varchar(50) NOT NULL,
  satuan varchar(20) NOT NULL,
  stok numeric(10,2) NOT NULL DEFAULT 0,
  min_alert numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.inventory_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  tanggal date NOT NULL DEFAULT CURRENT_DATE,
  qty_masuk numeric(10,2) NOT NULL DEFAULT 0,
  qty_keluar numeric(10,2) NOT NULL DEFAULT 0,
  sisa_stok numeric(10,2) NOT NULL,
  proyek varchar(255),
  keterangan text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.quotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  marketing_uid uuid REFERENCES public.users(id),
  status varchar(50) NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  payload jsonb NOT NULL
);

CREATE TABLE public.spk (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  technician_id uuid REFERENCES public.users(id),
  status varchar(50) NOT NULL DEFAULT 'assigned',
  schedule_date timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  payload jsonb NOT NULL
);

-- ==========================================
-- 5. INDEXES & TRIGGERS
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_wr_executor_created ON public.work_reports(executor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wr_status_created ON public.work_reports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wr_risk_created ON public.work_reports(risk_level, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_name_trgm ON public.projects USING gin (project_name gin_trgm_ops);

-- =============================================================================
-- SEED SUPERADMIN DARI 0
-- Email: lieziragroup@gmail.com
-- Password: Rafi0502 (Menggunakan pgcrypto bcrypt)
-- =============================================================================
INSERT INTO public.users (id, company_id, name, email, password_hash, role)
VALUES (
  gen_random_uuid(),
  NULL, -- Superadmin tidak terikat perusahaan tertentu
  'Super Administrator',
  'lieziragroup@gmail.com',
  crypt('Rafi0502', gen_salt('bf', 10)),
  'SUPERADMIN'
) ON CONFLICT (email) DO UPDATE SET 
  password_hash = crypt('Rafi0502', gen_salt('bf', 10)), 
  role = 'SUPERADMIN';
