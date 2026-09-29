-- =============================================================================
-- KEBIJAKAN ROW LEVEL SECURITY (RLS) MULTI-TENANT & PRIVASI DATA
-- =============================================================================

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nomor_surat_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instruction_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouse_material_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentation_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper Function: Dapatkan company_id dari pengguna yang sedang login
CREATE OR REPLACE FUNCTION current_user_company_id() RETURNS uuid AS $$
  SELECT company_id FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql STABLE;

-- Helper Function: Periksa apakah user adalah Superadmin platform
CREATE OR REPLACE FUNCTION is_superadmin() RETURNS boolean AS $$
  SELECT (role = 'SUPERADMIN') FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql STABLE;

-- Policy untuk Projects
CREATE POLICY tenant_isolation_projects ON public.projects
  USING (company_id = current_user_company_id() OR is_superadmin());

-- Policy untuk Work Reports
CREATE POLICY tenant_isolation_work_reports ON public.work_reports
  USING (company_id = current_user_company_id() OR is_superadmin());

-- Policy untuk Customers
CREATE POLICY tenant_isolation_customers ON public.customers
  USING (company_id = current_user_company_id() OR is_superadmin());

-- Policy untuk Quotations & SPK
CREATE POLICY tenant_isolation_quotations ON public.quotations
  USING (company_id = current_user_company_id() OR is_superadmin());

-- Policy untuk Instruction Sheets
CREATE POLICY tenant_isolation_instruction_sheets ON public.instruction_sheets
  USING (company_id = current_user_company_id() OR is_superadmin());

-- Policy untuk Inventory & Gudang
CREATE POLICY tenant_isolation_inventory ON public.inventory_items
  USING (company_id = current_user_company_id() OR is_superadmin());

CREATE POLICY tenant_isolation_warehouse_requests ON public.warehouse_material_requests
  USING (company_id = current_user_company_id() OR is_superadmin());
