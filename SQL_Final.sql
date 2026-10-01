-- =============================================================================
-- FINAL DATABASE SCHEMA (JSONB HYBRID) + DUMMY DATA SEED
-- App: FieldWork (Anti Rayap & Pest Control)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. ENUMERASI PERAN & STATUS
-- ==========================================
DROP TYPE IF EXISTS public.user_role CASCADE;
CREATE TYPE public.user_role AS ENUM (
  'SUPERADMIN', 'ADMIN', 'MARKETING', 'TEKNISI_LAPANGAN'
);

DROP TYPE IF EXISTS public.company_status CASCADE;
CREATE TYPE public.company_status AS ENUM ('TRIAL', 'ACTIVE', 'SUSPENDED', 'EXPIRED');

-- ==========================================
-- 2. TABEL PERUSAHAAN (TENANT)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name varchar(255) NOT NULL,
  company_slug varchar(100) UNIQUE NOT NULL,
  status public.company_status NOT NULL DEFAULT 'ACTIVE',
  subscription_plan varchar(50) NOT NULL DEFAULT 'FREE_TIER',
  max_technicians int NOT NULL DEFAULT 20,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.company_settings (
  company_id uuid PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb
);

-- ==========================================
-- 3. PENGGUNA
-- ==========================================
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  name varchar(255) NOT NULL,
  email varchar(255) NOT NULL UNIQUE,
  role public.user_role NOT NULL DEFAULT 'TEKNISI_LAPANGAN',
  phone varchar(50),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ==========================================
-- 4. NOMOR SURAT LOG
-- ==========================================
CREATE TABLE IF NOT EXISTS public.nomor_surat_logs (
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

-- ==========================================
-- 5. QUOTATIONS & ORDER TRACKING
-- ==========================================
CREATE TABLE IF NOT EXISTS public.quotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  marketing_uid uuid REFERENCES public.users(id),
  status varchar(50) NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  payload jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS public.order_tracking (
  id uuid PRIMARY KEY REFERENCES public.quotations(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  payload jsonb NOT NULL
);

-- ==========================================
-- 6. SPK & WORK REPORTS (FIELDWORK PWA)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.spk (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  technician_id uuid REFERENCES public.users(id),
  status varchar(50) NOT NULL DEFAULT 'assigned',
  schedule_date timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  payload jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS public.work_reports (
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

-- ==========================================
-- 7. INVENTORI GUDANG
-- ==========================================
CREATE TABLE IF NOT EXISTS public.inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  nama varchar(255) NOT NULL,
  kategori varchar(50) NOT NULL, -- 'Chemical', 'Alat', 'Perangkap'
  satuan varchar(20) NOT NULL,
  stok numeric(10,2) NOT NULL DEFAULT 0,
  min_alert numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inventory_logs (
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

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nomor_surat_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spk ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all" ON public.companies USING (true);
CREATE POLICY "Allow all" ON public.company_settings USING (true);
CREATE POLICY "Allow all" ON public.users USING (true);
CREATE POLICY "Allow all" ON public.nomor_surat_logs USING (true);
CREATE POLICY "Allow all" ON public.quotations USING (true);
CREATE POLICY "Allow all" ON public.order_tracking USING (true);
CREATE POLICY "Allow all" ON public.spk USING (true);
CREATE POLICY "Allow all" ON public.work_reports USING (true);
CREATE POLICY "Allow all" ON public.inventory_items USING (true);
CREATE POLICY "Allow all" ON public.inventory_logs USING (true);

-- ==========================================
-- SEED DUMMY DATA (UNTUK DEMO)
-- ==========================================

-- 1. Buat Perusahaan (Tenant)
INSERT INTO public.companies (id, company_name, company_slug, status, subscription_plan)
VALUES ('11111111-1111-1111-1111-111111111111', 'PT Gucimas Pratama', 'gucimas', 'ACTIVE', 'PRO')
ON CONFLICT DO NOTHING;

-- 2. Buat Pengguna
INSERT INTO public.users (id, company_id, name, email, role)
VALUES 
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Admin Pusat', 'admin@gucimas.com', 'ADMIN'),
  ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'Sales Marketing', 'sales@gucimas.com', 'MARKETING'),
  ('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'Jono Teknisi', 'jono@gucimas.com', 'TEKNISI_LAPANGAN')
ON CONFLICT DO NOTHING;

-- 3. Quotation (Penawaran) + Kategori + Estimasi Hari
INSERT INTO public.quotations (id, company_id, marketing_uid, status, created_at, payload)
VALUES 
  ('55555555-5555-5555-5555-555555555551', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'deal', now() - interval '10 days', '{"noSurat": "Q-001/AR/2026", "kategoriProyek": "Residensial", "estimasiHari": 2, "kepadaNama": "Bapak Agung Nugroho", "kepadaAlamatLines": ["Regency Melati Mas 2 Blok C 10"], "jenisLayanan": "anti_rayap_injeksi", "total": 2500000, "items": [{"desc": "Anti Rayap Rumah", "qty": 88, "unit": "m2", "harga": 25000}]}'::jsonb),
  ('55555555-5555-5555-5555-555555555552', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'deal', now() - interval '5 days', '{"noSurat": "Q-002/PCO/2026", "kategoriProyek": "Komersial", "estimasiHari": 1, "kepadaNama": "Ibu Lince Susanty", "kepadaAlamatLines": ["Metland Puri Blok F4"], "jenisLayanan": "pest_umum", "total": 1200000, "items": [{"desc": "Pest Control Ruko", "qty": 1, "unit": "Unit", "harga": 1200000}]}'::jsonb),
  ('55555555-5555-5555-5555-555555555553', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'approved', now() - interval '1 days', '{"noSurat": "Q-003/AR/2026", "kategoriProyek": "Korporat", "estimasiHari": 4, "kepadaNama": "PT Victoria Sejahtera", "kepadaAlamatLines": ["Gedung Victoria Lt 4"], "jenisLayanan": "anti_rayap_pipanisasi", "total": 8500000, "items": [{"desc": "Instalasi Pipa Anti Rayap", "qty": 200, "unit": "m_linear", "harga": 42500}]}'::jsonb)
ON CONFLICT DO NOTHING;

-- 4. SPK (Instruksi Sheet)
INSERT INTO public.spk (id, company_id, technician_id, status, schedule_date, created_at, payload)
VALUES 
  ('66666666-6666-6666-6666-666666666661', '11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 'done', now() - interval '8 days', '{"quotationId": "55555555-5555-5555-5555-555555555551", "quotationNoSurat": "Q-001/AR/2026", "customerName": "Bapak Agung Nugroho", "lokasi": "Regency Melati Mas 2", "serviceType": "anti_rayap", "notes": "Indikasi rayap di kusen", "technicianName": "Jono Teknisi", "alatPekerjaan": ["Mesin Inject", "Tanki", "Bor"]}'::jsonb),
  ('66666666-6666-6666-6666-666666666662', '11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 'in_progress', now(), '{"quotationId": "55555555-5555-5555-5555-555555555552", "quotationNoSurat": "Q-002/PCO/2026", "customerName": "Ibu Lince Susanty", "lokasi": "Metland Puri Blok F4", "serviceType": "pest_control", "notes": "Fokus kecoa", "technicianName": "Jono Teknisi", "alatPekerjaan": ["B & G Sprayer"]}'::jsonb)
ON CONFLICT DO NOTHING;

-- 5. Inventori (Gudang & Stok)
INSERT INTO public.inventory_items (id, company_id, nama, kategori, satuan, stok, min_alert)
VALUES 
  ('77777777-7777-7777-7777-777777777771', '11111111-1111-1111-1111-111111111111', 'Cypergard 100 EC', 'Chemical', 'ml', 70300, 5000),
  ('77777777-7777-7777-7777-777777777772', '11111111-1111-1111-1111-111111111111', 'Safe 1 200 SL', 'Chemical', 'ml', 11540, 2000),
  ('77777777-7777-7777-7777-777777777773', '11111111-1111-1111-1111-111111111111', 'Portal', 'Chemical', 'ml', 3900, 1000),
  ('77777777-7777-7777-7777-777777777774', '11111111-1111-1111-1111-111111111111', 'Origin', 'Chemical', 'ml', 800, 500),
  ('77777777-7777-7777-7777-777777777775', '11111111-1111-1111-1111-111111111111', 'Antimus', 'Perangkap', 'gram', 6518, 1000),
  ('77777777-7777-7777-7777-777777777776', '11111111-1111-1111-1111-111111111111', 'Papan Lem', 'Perangkap', 'lembar', 50, 10),
  ('77777777-7777-7777-7777-777777777777', '11111111-1111-1111-1111-111111111111', 'Mesin Inject Dinamo', 'Alat', 'Unit', 2, 1),
  ('77777777-7777-7777-7777-777777777778', '11111111-1111-1111-1111-111111111111', 'B & G Sprayer', 'Alat', 'Unit', 3, 1)
ON CONFLICT DO NOTHING;

INSERT INTO public.inventory_logs (id, company_id, item_id, tanggal, qty_masuk, qty_keluar, sisa_stok, proyek, keterangan)
VALUES 
  ('88888888-8888-8888-8888-888888888881', '11111111-1111-1111-1111-111111111111', '77777777-7777-7777-7777-777777777771', CURRENT_DATE, 0, 1500, 68800, 'Bapak Agung Nugroho', '-'),
  ('88888888-8888-8888-8888-888888888882', '11111111-1111-1111-1111-111111111111', '77777777-7777-7777-7777-777777777772', CURRENT_DATE, 0, 50, 11490, 'Bapak Agung Nugroho', '-')
ON CONFLICT DO NOTHING;
