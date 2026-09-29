-- =============================================================================
-- SEED DATA MASTER: PILOT TENANT & KATALOG CHEMICAL SNI 2404
-- =============================================================================

-- 1. Pilot Tenant: PT Gucimas Pratama
INSERT INTO public.companies (id, company_name, company_slug, official_header_address, official_phone, status, subscription_plan, max_technicians)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'PT Gucimas Pratama',
  'gucimas',
  'Jl. Melati Mas No. 8, Serpong Utara, Tangerang Selatan, Banten',
  '021-53152783',
  'ACTIVE',
  'PROFESSIONAL',
  20
) ON CONFLICT (company_slug) DO NOTHING;

-- 2. Master Chemical Sesuai Standar Operasional PT Gucimas Pratama
INSERT INTO public.inventory_items (company_id, item_code, item_name, category, current_stock, unit, dilution_ratio_ml_per_liter, min_stock_alert)
VALUES 
('11111111-1111-1111-1111-111111111111', 'SAFE1', 'Safe 1 200 SL (Imidacloprid)', 'TERMITISIDA_INJEKSI', 50, 'BOTOL_1L', 2.5, 5),
('11111111-1111-1111-1111-111111111111', 'CYPER100', 'Cypergard 100 EC (Cypermethrin)', 'TERMITISIDA_SPRAY', 75, 'BOTOL_500ML', 10.0, 10),
('11111111-1111-1111-1111-111111111111', 'AGENDA25', 'Agenda 25 EC (Fipronil)', 'TERMITISIDA_PREMIUM', 20, 'BOTOL_1L', 2.5, 3),
('11111111-1111-1111-1111-111111111111', 'TERMI_BAIT', 'Termigard Stationer Bait (Outdoor)', 'BAITING_SYSTEM', 100, 'UNIT', 0, 15),
('11111111-1111-1111-1111-111111111111', 'PHOSTEK', 'Phostek / Aluminium Phosphide Tablet', 'FUMIGASI', 30, 'TUBE', 0, 5)
ON CONFLICT (company_id, item_code) DO NOTHING;
