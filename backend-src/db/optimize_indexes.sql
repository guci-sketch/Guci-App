-- Optimasi Query: Menambahkan Index Komposit untuk mempercepat Filter & Sorting di Dashboard Admin
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wr_executor_created ON work_reports(executor_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wr_status_created ON work_reports(status, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wr_risk_created ON work_reports(risk_level, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_name_trgm ON projects USING gin (project_name gin_trgm_ops);
