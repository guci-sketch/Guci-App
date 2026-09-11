const fs = require('fs');
let code = fs.readFileSync('src/components/admin/AdminDashboard.tsx', 'utf8');

// 1. Add project state variables
const stateTarget = `const [projects, setProjects] = useState<Project[]>([]);`;
const stateReplacement = `const [projects, setProjects] = useState<Project[]>([]);
  const [projectSearch, setProjectSearch] = useState('');
  const [projectServiceType, setProjectServiceType] = useState('ALL');
  const [projectStatus, setProjectStatus] = useState('ALL');
  const [projectPage, setProjectPage] = useState(1);
  const [projectTotalPages, setProjectTotalPages] = useState(1);
  const [projectTotalCount, setProjectTotalCount] = useState(0);

  const loadProjects = useCallback(async () => {
    try {
      const res = await fetchAdminProjects({
        search: projectSearch,
        serviceType: projectServiceType,
        status: projectStatus,
        page: projectPage,
        limit: 8
      });
      setProjects(res.projects);
      setProjectTotalPages(res.totalPages || 1);
      setProjectTotalCount(res.totalCount || res.projects.length);
    } catch (err) {
      console.error(err);
    }
  }, [projectSearch, projectServiceType, projectStatus, projectPage]);

  useEffect(() => {
    setProjectPage(1);
  }, [projectSearch, projectServiceType, projectStatus]);

  useEffect(() => {
    if (activeTab === 'projects') {
      const t = setTimeout(loadProjects, 250);
      return () => clearTimeout(t);
    }
  }, [loadProjects, activeTab]);
`;
code = code.replace(stateTarget, stateReplacement);

// 2. Fix the initial Promise.all call
const oldInitTarget = `const [summary, projectList, executorList] = await Promise.all([fetchAdminSummary(), fetchAdminProjects(), fetchExecutors()]);
        setKpi(summary);
        setProjects(projectList);`;
const newInitTarget = `const [summary, projectRes, executorList] = await Promise.all([fetchAdminSummary(), fetchAdminProjects({ limit: 8, page: 1 }), fetchExecutors()]);
        setKpi(summary);
        setProjects(projectRes.projects);
        setProjectTotalPages(projectRes.totalPages || 1);
        setProjectTotalCount(projectRes.totalCount || projectRes.projects.length);`;
code = code.replace(oldInitTarget, newInitTarget);

fs.writeFileSync('src/components/admin/AdminDashboard.tsx', code);
