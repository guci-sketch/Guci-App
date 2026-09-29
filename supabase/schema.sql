-- =============================================================================
-- FINAL MERGED DATABASE SCHEMA (JSONB HYBRID)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ENUMERASI PERAN & STATUS
CREATE TYPE public.user_role AS ENUM (
  'SUPERADMIN', 'ADMIN_PERUSAHAAN', 'MARKETING', 'TEKNISI', 'GUDANG', 'SPV'
);
CREATE TYPE public.company_status AS ENUM ('TRIAL', 'ACTIVE', 'SUSPENDED', 'EXPIRED');

-- 2. TABEL PERUSAHAAN
CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name varchar(255) NOT NULL,
  company_slug varchar(100) UNIQUE NOT NULL,
  status public.company_status NOT NULL DEFAULT 'ACTIVE',
  subscription_plan varchar(50) NOT NULL DEFAULT 'FREE_TIER',
  max_technicians int NOT NULL DEFAULT 20,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2b. SETTINGS PERUSAHAAN
CREATE TABLE public.company_settings (
  company_id uuid PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb
);

-- 3. PENGGUNA
CREATE TABLE public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  name varchar(255) NOT NULL,
  email varchar(255) NOT NULL UNIQUE,
  role public.user_role NOT NULL DEFAULT 'TEKNISI',
  phone varchar(50),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. NOMOR SURAT LOG
CREATE TABLE public.nomor_surat_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  companyId uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  noSurat varchar(100) UNIQUE NOT NULL,
  kategori varchar(10),
  tipe varchar(10),
  tipeLabel varchar(100),
  jenisLayanan varchar(50),
  kepada varchar(255),
  byUid uuid,
  byName varchar(255),
  dibuat timestamptz NOT NULL,
  status varchar(50),
  quoId uuid,
  isManual boolean DEFAULT false,
  keteranganManual text
);

-- 5. QUOTATIONS (JSONB Hybrid)
CREATE TABLE public.quotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  marketing_uid uuid REFERENCES public.users(id),
  status varchar(50) NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  payload jsonb NOT NULL
);

-- 6. ORDER TRACKING (JSONB Hybrid)
CREATE TABLE public.order_tracking (
  id uuid PRIMARY KEY REFERENCES public.quotations(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  payload jsonb NOT NULL
);

-- 7. SPK (JSONB Hybrid)
CREATE TABLE public.spk (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  technician_id uuid REFERENCES public.users(id),
  status varchar(50) NOT NULL DEFAULT 'assigned',
  schedule_date timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  payload jsonb NOT NULL
);

-- 8. WORK REPORTS (For Guci App PWA)
CREATE TABLE public.work_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  spk_id uuid NOT NULL REFERENCES public.spk(id) ON DELETE CASCADE,
  executor_id uuid NOT NULL REFERENCES public.users(id),
  status varchar(50) NOT NULL DEFAULT 'READY',
  check_in_at timestamptz,
  check_in_latitude double precision,
  check_in_longitude double precision,
  check_out_at timestamptz,
  risk_score int NOT NULL DEFAULT 0,
  customer_signature text,
  rating_stars smallint,
  is_rating_hidden_from_executor boolean DEFAULT true,
  pdf_storage_path text,
  created_at timestamptz NOT NULL DEFAULT now(),
  payload jsonb
);

-- RLS Dummy Setup
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nomor_surat_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spk ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all" ON public.companies USING (true);
CREATE POLICY "Allow all" ON public.company_settings USING (true);
CREATE POLICY "Allow all" ON public.users USING (true);
CREATE POLICY "Allow all" ON public.nomor_surat_logs USING (true);
CREATE POLICY "Allow all" ON public.quotations USING (true);
CREATE POLICY "Allow all" ON public.order_tracking USING (true);
CREATE POLICY "Allow all" ON public.spk USING (true);
CREATE POLICY "Allow all" ON public.work_reports USING (true);
