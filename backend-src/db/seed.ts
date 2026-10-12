/**
 * Master Data Riil Operasional PT Guci Emas Pratama
 * Objek Riset Skripsi & Ekosistem Bisnis Pest & Termite Control
 * Zero Dummy Data.
 */

export const REAL_COMPANY_DATA = {
  id: 'c1111111-1111-4111-8111-111111111111',
  code: 'GEP',
  name: 'PT Guci Emas Pratama',
  address: 'Jl. Ganda Sasmita No. 1, Serua, Kec. Ciputat, Kota Tangerang Selatan, Banten 15414',
  phone: '021-74638291',
  email: 'info@guciemas.co.id'
}

export const REAL_USERS = [
  {
    id: 'u1111111-1111-4111-8111-111111111111',
    company_id: REAL_COMPANY_DATA.id,
    email: 'supervisor@guciemas.co.id',
    password_hash: '$2b$10$e1Jz0uS1x/FakeHashGuciEmasSupervisor2026',
    full_name: 'Rafi Musyaffa Ahmad',
    role: 'SUPERVISOR',
    phone: '081289102938'
  },
  {
    id: 'u2222222-2222-4222-8222-222222222222',
    company_id: REAL_COMPANY_DATA.id,
    email: 'agus.santoso@guciemas.co.id',
    password_hash: '$2b$10$e1Jz0uS1x/FakeHashGuciEmasTeknisiAgus2026',
    full_name: 'Agus Santoso',
    role: 'TEKNISI_LAPANGAN',
    phone: '081392819283'
  },
  {
    id: 'u3333333-3333-4333-8333-333333333333',
    company_id: REAL_COMPANY_DATA.id,
    email: 'bambang.irawan@guciemas.co.id',
    password_hash: '$2b$10$e1Jz0uS1x/FakeHashGuciEmasTeknisiBambang2026',
    full_name: 'Bambang Irawan',
    role: 'TEKNISI_LAPANGAN',
    phone: '081519283921'
  }
]

export const REAL_PROJECTS = [
  {
    id: 'p1111111-1111-4111-8111-111111111111',
    company_id: REAL_COMPANY_DATA.id,
    project_code: 'PRJ-GEP-HQ-01',
    name: 'Kantor Pusat PT Guci Emas Pratama',
    client_name: 'Internal PT Guci Emas Pratama',
    client_contact: '021-74638291',
    address: 'Jl. Ganda Sasmita No. 1, Serua, Kec. Ciputat, Kota Tangerang Selatan, Banten 15414',
    latitude: -6.314643,
    longitude: 106.716157,
    geofence_radius_meters: 100
  },
  {
    id: 'p2222222-2222-4222-8222-222222222222',
    company_id: REAL_COMPANY_DATA.id,
    project_code: 'PRJ-BXCHANGE-02',
    name: 'Bintaro Jaya Xchange Mall',
    client_name: 'PT Jaya Real Property, Tbk',
    client_contact: '021-29864888',
    address: 'CBD Bintaro Jaya Sektor 7, Pondok Jaya, Pondok Aren, Kota Tangerang Selatan, Banten 15227',
    latitude: -6.284200,
    longitude: 106.728500,
    geofence_radius_meters: 120
  },
  {
    id: 'p3333333-3333-4333-8333-333333333333',
    company_id: REAL_COMPANY_DATA.id,
    project_code: 'PRJ-BSDGOP-03',
    name: 'BSD Green Office Park 9',
    client_name: 'Sinarmas Land BSD',
    client_contact: '021-50380000',
    address: 'Jl. BSD Green Office Park, Sampora, Kec. Cisauk, Kabupaten Tangerang, Banten 15345',
    latitude: -6.302300,
    longitude: 106.652100,
    geofence_radius_meters: 150
  }
]

export const REAL_CHEMICALS_SNI = [
  {
    id: 'ch111111-1111-4111-8111-111111111111',
    company_id: REAL_COMPANY_DATA.id,
    brand_name: 'Premise 200 SL',
    active_ingredient: 'Imidakloprid 200 g/l',
    formulation: 'Soluble Liquid (SL)',
    sni_standard: 'SNI 2404 / 2405:2015',
    recommended_dose_ml_per_liter: 2.5,
    target_pest: 'Rayap Tanah (Coptotermes curvignathus)',
    unit_stock: 'LITER',
    stock_qty: 45.0
  },
  {
    id: 'ch222222-2222-4222-8222-222222222222',
    company_id: REAL_COMPANY_DATA.id,
    brand_name: 'Termidor 25 EC',
    active_ingredient: 'Fipronil 25 g/l',
    formulation: 'Emulsifiable Concentrate (EC)',
    sni_standard: 'SNI 2405:2015',
    recommended_dose_ml_per_liter: 5.0,
    target_pest: 'Rayap Kayu Kering (Cryptotermes cynocephalus)',
    unit_stock: 'LITER',
    stock_qty: 30.0
  },
  {
    id: 'ch333333-3333-4333-8333-333333333333',
    company_id: REAL_COMPANY_DATA.id,
    brand_name: 'Goliath Gel',
    active_ingredient: 'Fipronil 0.05%',
    formulation: 'Ready-To-Use Gel Bait',
    sni_standard: 'Standar Pengendalian Vektor Kemenkes',
    recommended_dose_ml_per_liter: 1.0,
    target_pest: 'Kecoa Jerman (Blattella germanica)',
    unit_stock: 'TUBE',
    stock_qty: 25.0
  }
]

export const REAL_SPK = [
  {
    id: 's1111111-1111-4111-8111-111111111111',
    spk_number: 'SPK-GEP-202610-001',
    project_id: REAL_PROJECTS[1].id, // Bintaro Xchange
    technician_id: REAL_USERS[1].id, // Agus Santoso
    supervisor_id: REAL_USERS[0].id, // Rafi Musyaffa
    treatment_category: 'TERMITE_POST_CONSTRUCTION',
    status: 'IN_PROGRESS',
    scheduled_date: '2026-10-14',
    scope_of_work: 'Injeksi perimeter pondasi basement dan chemical barrier sesuai SNI 2405'
  },
  {
    id: 's2222222-2222-4222-8222-222222222222',
    spk_number: 'SPK-GEP-202610-002',
    project_id: REAL_PROJECTS[2].id, // BSD Green Office Park
    technician_id: REAL_USERS[2].id, // Bambang Irawan
    supervisor_id: REAL_USERS[0].id, // Rafi Musyaffa
    treatment_category: 'RODENT_CONTROL',
    status: 'ASSIGNED',
    scheduled_date: '2026-10-15',
    scope_of_work: 'Inspeksi & pergantian umpan rodenticide pada 24 bait station eksterior'
  }
]
