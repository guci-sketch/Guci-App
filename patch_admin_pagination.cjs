const fs = require('fs');
let code = fs.readFileSync('src/components/admin/AdminDashboard.tsx', 'utf8');

// 1. Add states
const stateInjectionPoint = `const [isExporting, setIsExporting] = useState(false);`;
const stateInjection = `const [isExporting, setIsExporting] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    setPage(1);
  }, [filters, datePreset, searchInput]);`;
code = code.replace(stateInjectionPoint, stateInjection);

// 2. Update effectiveFilters
const oldFilters = `const effectiveFilters = useMemo<ReportFilters>(() => ({ ...filters, ...presetToRange(datePreset), search: searchInput }), [filters, datePreset, searchInput]);`;
const newFilters = `const effectiveFilters = useMemo<ReportFilters>(() => ({ ...filters, ...presetToRange(datePreset), search: searchInput, page, limit: 20 }), [filters, datePreset, searchInput, page]);`;
code = code.replace(oldFilters, newFilters);

// 3. Update loadReports
const oldLoadReports = `const res = await fetchAdminReports(effectiveFilters);
      setReports(res.reports);`;
const newLoadReports = `const res = await fetchAdminReports(effectiveFilters);
      setReports(res.reports);
      setTotalPages(res.totalPages || 1);
      setTotalCount(res.totalCount || res.reports.length);`;
code = code.replace(oldLoadReports, newLoadReports);

fs.writeFileSync('src/components/admin/AdminDashboard.tsx', code);
