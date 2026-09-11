const fs = require('fs');
let code = fs.readFileSync('src/api/admin.ts', 'utf8');

const oldFetchProjects = `export async function fetchAdminProjects() {
  const res = await api.get<{ projects: Project[] }>('/admin/projects');
  return res.projects;
}`;

const newFetchProjects = `export interface ProjectFilters {
  search?: string;
  serviceType?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export async function fetchAdminProjects(filters?: ProjectFilters) {
  const params = new URLSearchParams();
  if (filters) {
    if (filters.search) params.append('search', filters.search);
    if (filters.serviceType && filters.serviceType !== 'ALL') params.append('serviceType', filters.serviceType);
    if (filters.status && filters.status !== 'ALL') params.append('status', filters.status);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
  }
  
  const qs = params.toString() ? \`?\${params.toString()}\` : '';
  const res = await api.get<{ projects: Project[], totalCount: number, page: number, totalPages: number }>(\`/admin/projects\${qs}\`);
  return res;
}`;

code = code.replace(oldFetchProjects, newFetchProjects);
fs.writeFileSync('src/api/admin.ts', code);
