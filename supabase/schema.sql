-- ============================================================================
-- SKEMA SUPABASE LENGKAP & REKAYASA DATABASE PRODUKSI (3NF)
-- Sistem: FieldWork Platform (PT Guci Emas Pratama)
-- Fitur: Multi-tenant, RLS Policies, Database Triggers, Atomic RPC, Seed Data Riil
-- Standar Mutu: SNI 2404:2015 & SNI 2405:2015
-- ============================================================================

-- 1. EKSTENSI POSTGRESQL WAJIB
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUM SISTEM
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM (
        'SUPERADMIN',
        'ADMIN',
        'SUPERVISOR',
        'MARKETING',
        'INVENTORY',
        'TEKNISI_LAPANGAN'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE spk_status AS ENUM (
        'DRAFT',
        'ASSIGNED',
        'IN_PROGRESS',
        'COMPLETED',
        'CANCELLED'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE treatment_category AS ENUM (
        'TERMITE_PRE_CONSTRUCTION',
        'TERMITE_POST_CONSTRUCTION',
        'GENERAL_PEST_CONTROL',
        'RODENT_CONTROL',
        'FUMIGATION'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE quotation_status AS ENUM (
        'DRAFT',
        'PENDING_ADMIN',
        'APPROVED',
        'REJECTED',
        'SENT_TO_CLIENT',
        'DEAL',
        'CANCELLED'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 3. TABEL TENANT (COMPANIES)
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABEL PROFIL PENGGUNA (USERS)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'TEKNISI_LAPANGAN',
    phone TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABEL PROYEK KLIEN (PROJECTS - GEOFENCING)
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
    project_code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    client_name TEXT NOT NULL,
    client_contact TEXT,
    address TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL CHECK (latitude BETWEEN -90 AND 90),
    longitude DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180 AND 180),
    geofence_radius_meters INT NOT NULL DEFAULT 100 CHECK (geofence_radius_meters >= 10),
    is_locked BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABEL MASTER KATALOG BAHAN KIMIA (CHEMICALS - SNI)
CREATE TABLE IF NOT EXISTS public.chemicals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
    brand_name TEXT NOT NULL,
    active_ingredient TEXT NOT NULL,
    formulation TEXT NOT NULL,
    sni_standard TEXT NOT NULL DEFAULT 'SNI 2404 / 2405:2015',
    recommended_dose_ml_per_liter DOUBLE PRECISION NOT NULL CHECK (recommended_dose_ml_per_liter > 0),
    target_pest TEXT NOT NULL,
    unit_stock TEXT NOT NULL DEFAULT 'LITER',
    stock_qty DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK (stock_qty >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. TABEL SURAT PENAWARAN HARGA (QUOTATIONS)
CREATE TABLE IF NOT EXISTS public.quotations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
    quotation_number TEXT UNIQUE NOT NULL,
    client_name TEXT NOT NULL,
    project_name TEXT NOT NULL,
    status quotation_status NOT NULL DEFAULT 'DRAFT',
    subtotal DOUBLE PRECISION NOT NULL DEFAULT 0,
    discount_percent DOUBLE PRECISION NOT NULL DEFAULT 0,
    discount_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
    tax_percent DOUBLE PRECISION NOT NULL DEFAULT 11,
    tax_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
    grand_total DOUBLE PRECISION NOT NULL DEFAULT 0,
    terbilang TEXT NOT NULL,
    created_by UUID REFERENCES public.users(id),
    approved_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. TABEL RINCIAN ITEM PENAWARAN (QUOTATION_ITEMS)
CREATE TABLE IF NOT EXISTS public.quotation_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quotation_id UUID NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity DOUBLE PRECISION NOT NULL CHECK (quantity > 0),
    unit TEXT NOT NULL,
    unit_price DOUBLE PRECISION NOT NULL CHECK (unit_price >= 0),
    total_price DOUBLE PRECISION NOT NULL CHECK (total_price >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. TABEL SURAT PERINTAH KERJA (SPK)
CREATE TABLE IF NOT EXISTS public.spk (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
    spk_number TEXT UNIQUE NOT NULL,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE RESTRICT,
    technician_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    supervisor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    quotation_id UUID REFERENCES public.quotations(id),
    treatment_category treatment_category NOT NULL,
    status spk_status NOT NULL DEFAULT 'ASSIGNED',
    scheduled_date DATE NOT NULL,
    scope_of_work TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. TABEL LAPORAN KERJA & PRESENSI HAVERSINE (WORK_REPORTS)
CREATE TABLE IF NOT EXISTS public.work_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    spk_id UUID UNIQUE NOT NULL REFERENCES public.spk(id) ON DELETE RESTRICT,
    technician_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    check_in_time TIMESTAMPTZ NOT NULL,
    check_in_lat DOUBLE PRECISION NOT NULL,
    check_in_lng DOUBLE PRECISION NOT NULL,
    check_in_distance_meters DOUBLE PRECISION NOT NULL,
    is_geofence_valid BOOLEAN NOT NULL DEFAULT FALSE,
    treatment_summary TEXT,
    photo_watermark_url TEXT,
    bap_number TEXT UNIQUE,
    client_signer_name TEXT,
    client_rating INT CHECK (client_rating BETWEEN 1 AND 5),
    client_feedback TEXT,
    verification_hash TEXT,
    client_signature_url TEXT,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. TABEL AUDIT PEMAKAIAN BAHAN KIMIA (CHEMICAL_AUDIT_LOGS)
CREATE TABLE IF NOT EXISTS public.chemical_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID NOT NULL REFERENCES public.work_reports(id) ON DELETE CASCADE,
    chemical_id UUID NOT NULL REFERENCES public.chemicals(id) ON DELETE RESTRICT,
    actual_volume_used_liters DOUBLE PRECISION NOT NULL CHECK (actual_volume_used_liters > 0),
    standard_sni_liters DOUBLE PRECISION NOT NULL,
    deviation_percent DOUBLE PRECISION NOT NULL DEFAULT 0,
    is_anomaly BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. TABEL LOG AUDIT RISIKO ANOMALI (RISK_AUDIT_LOGS)
CREATE TABLE IF NOT EXISTS public.risk_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID NOT NULL REFERENCES public.work_reports(id) ON DELETE CASCADE,
    risk_score INT NOT NULL CHECK (risk_score BETWEEN 0 AND 100),
    risk_level TEXT NOT NULL,
    anomalies JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_flagged_for_review BOOLEAN NOT NULL DEFAULT FALSE,
    reviewed_by UUID REFERENCES public.users(id),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEKS OPTIMASI PENCARIAN & QUERY RELASIONAL
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_users_company_role ON public.users(company_id, role);
CREATE INDEX IF NOT EXISTS idx_projects_coords ON public.projects(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_spk_status_tech ON public.spk(status, technician_id);
CREATE INDEX IF NOT EXISTS idx_reports_bap ON public.work_reports(bap_number);
CREATE INDEX IF NOT EXISTS idx_chem_audit_report ON public.chemical_audit_logs(report_id);

-- ============================================================================
-- DATABASE TRIGGERS: PENGUNCIAN KOORDINAT PROYEK SAAT PEKERJAAN DIMULAI
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fn_lock_project_on_checkin()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.projects
    SET is_locked = TRUE
    WHERE id = (SELECT project_id FROM public.spk WHERE id = NEW.spk_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_lock_project_on_checkin ON public.work_reports;
CREATE TRIGGER trg_lock_project_on_checkin
AFTER INSERT ON public.work_reports
FOR EACH ROW
EXECUTE FUNCTION public.fn_lock_project_on_checkin();

CREATE OR REPLACE FUNCTION public.fn_prevent_locked_project_edit()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.is_locked = TRUE AND (OLD.latitude != NEW.latitude OR OLD.longitude != NEW.longitude) THEN
        RAISE EXCEPTION 'Koordinat proyek telah dikunci karena pengerjaan teknisi sudah berlangsung.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_locked_project_edit ON public.projects;
CREATE TRIGGER trg_prevent_locked_project_edit
BEFORE UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.fn_prevent_locked_project_edit();

-- ============================================================================
-- ATOMIC STORED PROCEDURE (RPC): MUTASI PENGURANGAN STOK TERLINDUNGI ACID
-- ============================================================================
CREATE OR REPLACE FUNCTION public.rpc_deduct_chemical_stock(
    p_chemical_id UUID,
    p_volume_liters DOUBLE PRECISION
)
RETURNS JSONB AS $$
DECLARE
    v_current_stock DOUBLE PRECISION;
    v_new_stock DOUBLE PRECISION;
BEGIN
    SELECT stock_qty INTO v_current_stock
    FROM public.chemicals
    WHERE id = p_chemical_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Bahan kimia tidak ditemukan');
    END IF;

    IF v_current_stock < p_volume_liters THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', format('Stok tidak mencukupi (Tersedia: %s L, Dibutuhkan: %s L)', v_current_stock, p_volume_liters)
        );
    END IF;

    v_new_stock := v_current_stock - p_volume_liters;

    UPDATE public.chemicals
    SET stock_qty = v_new_stock,
        updated_at = NOW()
    WHERE id = p_chemical_id;

    RETURN jsonb_build_object(
        'success', true,
        'previous_stock', v_current_stock,
        'deducted', p_volume_liters,
        'remaining_stock', v_new_stock
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chemicals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spk ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_reports ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.current_user_company_id()
RETURNS UUID AS $$
    SELECT company_id FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

DROP POLICY IF EXISTS tenant_isolation_projects ON public.projects;
CREATE POLICY tenant_isolation_projects ON public.projects
    FOR ALL
    USING (company_id = public.current_user_company_id());

DROP POLICY IF EXISTS tenant_isolation_spk ON public.spk;
CREATE POLICY tenant_isolation_spk ON public.spk
    FOR ALL
    USING (company_id = public.current_user_company_id());

DROP POLICY IF EXISTS tenant_isolation_chemicals ON public.chemicals;
CREATE POLICY tenant_isolation_chemicals ON public.chemicals
    FOR ALL
    USING (company_id = public.current_user_company_id());

-- ============================================================================
-- SEED DATA RIIL OPERASIONAL PT GUCI EMAS PRATAMA (ZERO DUMMY)
-- ============================================================================
INSERT INTO public.companies (id, code, name, address, phone, email)
VALUES (
    'c1111111-1111-4111-8111-111111111111',
    'GEP',
    'PT Guci Emas Pratama',
    'Jl. Ganda Sasmita No. 1, Serua, Kec. Ciputat, Kota Tangerang Selatan, Banten 15414',
    '021-74638291',
    'info@guciemas.co.id'
) ON CONFLICT (code) DO NOTHING;

-- Akun Superadmin Platform & Personel Tenant
INSERT INTO public.users (id, company_id, email, full_name, role, phone)
VALUES 
(
    'u0000000-0000-4000-8000-000000000000',
    'c1111111-1111-4111-8111-111111111111',
    'lieziragroup@gmail.com',
    'Superadmin Liezira',
    'SUPERADMIN',
    '081299998888'
),
(
    'u1111111-1111-4111-8111-111111111111',
    'c1111111-1111-4111-8111-111111111111',
    'supervisor@guciemas.co.id',
    'Rafi Musyaffa Ahmad',
    'SUPERVISOR',
    '081289102938'
),
(
    'u2222222-2222-4222-8222-222222222222',
    'c1111111-1111-4111-8111-111111111111',
    'agus.santoso@guciemas.co.id',
    'Agus Santoso',
    'TEKNISI_LAPANGAN',
    '081392819283'
),
(
    'u3333333-3333-4333-8333-333333333333',
    'c1111111-1111-4111-8111-111111111111',
    'bambang.irawan@guciemas.co.id',
    'Bambang Irawan',
    'TEKNISI_LAPANGAN',
    '081519283921'
) ON CONFLICT (email) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role;

INSERT INTO public.projects (id, company_id, project_code, name, client_name, address, latitude, longitude, geofence_radius_meters)
VALUES
(
    'p1111111-1111-4111-8111-111111111111',
    'c1111111-1111-4111-8111-111111111111',
    'PRJ-GEP-HQ-01',
    'Kantor Pusat PT Guci Emas Pratama',
    'Internal PT Guci Emas Pratama',
    'Jl. Ganda Sasmita No. 1, Serua, Ciputat, Tangerang Selatan',
    -6.314643,
    106.716157,
    100
),
(
    'p2222222-2222-4222-8222-222222222222',
    'c1111111-1111-4111-8111-111111111111',
    'PRJ-BXCHANGE-02',
    'Bintaro Jaya Xchange Mall',
    'PT Jaya Real Property, Tbk',
    'CBD Bintaro Sektor 7, Pondok Jaya, Pondok Aren, Tangsel',
    -6.284200,
    106.728500,
    120
),
(
    'p3333333-3333-4333-8333-333333333333',
    'c1111111-1111-4111-8111-111111111111',
    'PRJ-BSDGOP-03',
    'BSD Green Office Park 9',
    'Sinarmas Land BSD',
    'Jl. BSD Green Office Park, Sampora, Cisauk, Tangerang',
    -6.302300,
    106.652100,
    150
) ON CONFLICT (project_code) DO NOTHING;

INSERT INTO public.chemicals (id, company_id, brand_name, active_ingredient, formulation, sni_standard, recommended_dose_ml_per_liter, target_pest, stock_qty)
VALUES
(
    'ch111111-1111-4111-8111-111111111111',
    'c1111111-1111-4111-8111-111111111111',
    'Premise 200 SL',
    'Imidakloprid 200 g/l',
    'Soluble Liquid (SL)',
    'SNI 2404 / 2405:2015',
    2.5,
    'Rayap Tanah (Coptotermes curvignathus)',
    45.0
),
(
    'ch222222-2222-4222-8222-222222222222',
    'c1111111-1111-4111-8111-111111111111',
    'Termidor 25 EC',
    'Fipronil 25 g/l',
    'Emulsifiable Concentrate (EC)',
    'SNI 2405:2015',
    5.0,
    'Rayap Kayu Kering (Cryptotermes cynocephalus)',
    30.0
),
(
    'ch333333-3333-4333-8333-333333333333',
    'c1111111-1111-4111-8111-111111111111',
    'Goliath Gel',
    'Fipronil 0.05%',
    'Ready-To-Use Gel Bait',
    'Standar Vektor Kemenkes',
    1.0,
    'Kecoa Jerman (Blattella germanica)',
    25.0
) ON CONFLICT DO NOTHING;
