-- ============================================================================
-- SKEMA DATABASE OPERASIONAL TERSTRUKTUR (3NF) - FIELWORK PLATFORM
-- Objek Riset & Operasional: PT Guci Emas Pratama (Pest & Termite Control)
-- Standard Mutu: SNI 2404 / 2405 (Anti Rayap Pra & Pasca Konstruksi)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ENUM Tipe Pengguna (2 Role Inti Skripsi + Enterprise Multi-role)
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM (
        'SUPERADMIN',
        'ADMIN',
        'SUPERVISOR',
        'TEKNISI_LAPANGAN'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ENUM Status SPK
DO $$ BEGIN
    CREATE TYPE spk_status AS ENUM (
        'DRAFT',
        'ASSIGNED',
        'IN_PROGRESS',
        'COMPLETED',
        'CANCELLED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ENUM Kategori Treatment Hama
DO $$ BEGIN
    CREATE TYPE treatment_category AS ENUM (
        'TERMITE_PRE_CONSTRUCTION',
        'TERMITE_POST_CONSTRUCTION',
        'GENERAL_PEST_CONTROL',
        'RODENT_CONTROL',
        'FUMIGATION'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 1. TABEL PERUSAHAAN / TENANT
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABEL PENGGUNA (USERS)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'TEKNISI_LAPANGAN',
    phone TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABEL PROYEK KLIEN & TITIK GEOFENCING (PROJECTS)
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    project_code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    client_name TEXT NOT NULL,
    client_contact TEXT,
    address TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL CHECK (latitude BETWEEN -90 AND 90),
    longitude DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180 AND 180),
    geofence_radius_meters INT NOT NULL DEFAULT 100 CHECK (geofence_radius_meters >= 10),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABEL KATALOG BAHAN KIMIA (CHEMICALS - SNI 2404/2405)
CREATE TABLE IF NOT EXISTS chemicals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    brand_name TEXT NOT NULL,
    active_ingredient TEXT NOT NULL,
    formulation TEXT NOT NULL,
    sni_standard TEXT,
    recommended_dose_ml_per_liter DOUBLE PRECISION NOT NULL CHECK (recommended_dose_ml_per_liter > 0),
    target_pest TEXT NOT NULL,
    unit_stock TEXT NOT NULL DEFAULT 'LITER',
    stock_qty DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK (stock_qty >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABEL SURAT PERINTAH KERJA (SPK)
CREATE TABLE IF NOT EXISTS spk (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    spk_number TEXT UNIQUE NOT NULL,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
    technician_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    supervisor_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    treatment_category treatment_category NOT NULL,
    status spk_status NOT NULL DEFAULT 'ASSIGNED',
    scheduled_date DATE NOT NULL,
    scope_of_work TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABEL LAPORAN KERJA & PRESENSI HAVERSINE (WORK_REPORTS)
CREATE TABLE IF NOT EXISTS work_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    spk_id UUID UNIQUE NOT NULL REFERENCES spk(id) ON DELETE CASCADE,
    technician_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    check_in_time TIMESTAMPTZ NOT NULL,
    check_in_lat DOUBLE PRECISION NOT NULL CHECK (check_in_lat BETWEEN -90 AND 90),
    check_in_lng DOUBLE PRECISION NOT NULL CHECK (check_in_lng BETWEEN -180 AND 180),
    check_in_distance_meters DOUBLE PRECISION NOT NULL CHECK (check_in_distance_meters >= 0),
    is_geofence_valid BOOLEAN NOT NULL DEFAULT FALSE,
    treatment_summary TEXT,
    client_feedback TEXT,
    client_signature_url TEXT,
    technician_signature_url TEXT,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. TABEL AUDIT PENGGUNAAN BAHAN KIMIA (CHEMICAL_AUDIT_LOGS)
CREATE TABLE IF NOT EXISTS chemical_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID NOT NULL REFERENCES work_reports(id) ON DELETE CASCADE,
    chemical_id UUID NOT NULL REFERENCES chemicals(id) ON DELETE RESTRICT,
    actual_volume_used_liters DOUBLE PRECISION NOT NULL CHECK (actual_volume_used_liters > 0),
    water_dilution_liters DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK (water_dilution_liters >= 0),
    application_method TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEKS OPTIMASI PENCARIAN & SPASIAL
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_projects_coords ON projects(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_spk_status ON spk(status);
CREATE INDEX IF NOT EXISTS idx_spk_technician ON spk(technician_id);
CREATE INDEX IF NOT EXISTS idx_work_reports_spk ON work_reports(spk_id);
