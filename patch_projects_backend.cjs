const fs = require('fs');
let code = fs.readFileSync('backend-src/modules/admin/adminRoutes.ts', 'utf8');

const targetStr = `adminRouter.get(
  '/projects',
  asyncHandler(async (req, res) => {
    const rows = await query(\`
      select p.*, u.name as created_by_name from projects p
      join users u on u.id = p.created_by
      order by p.created_at desc limit 200
    \`);
    res.json({
      projects: rows.map(r => ({`;

const replacement = `const projectFilterSchema = z.object({
  search: z.string().optional(),
  serviceType: z.string().optional(),
  status: z.string().optional(),
  page: z.coerce.number().min(1).optional(),
  limit: z.coerce.number().min(1).max(500).optional(),
});

adminRouter.get(
  '/projects',
  asyncHandler(async (req, res) => {
    const parsed = projectFilterSchema.safeParse(req.query);
    if (!parsed.success) throw new HttpError(400, 'Filter tidak valid.');
    const q = parsed.data;
    
    let where = 'where 1=1';
    const params = [];
    let i = 1;
    
    if (q.search) {
      where += \` and (p.project_name ilike $\${i} or p.client_name ilike $\${i} or p.address ilike $\${i} or u.name ilike $\${i})\`;
      params.push(\`%\${q.search}%\`);
      i++;
    }
    if (q.serviceType && q.serviceType !== 'ALL') {
      where += \` and p.service_type = $\${i++}\`;
      params.push(q.serviceType);
    }
    if (q.status === 'LOCKED') {
      where += \` and p.locked_at is not null\`;
    } else if (q.status === 'OPEN') {
      where += \` and p.locked_at is null\`;
    }
    
    const countResult = await query(\`select count(*) as total from projects p join users u on u.id = p.created_by \${where}\`, params);
    const totalCount = parseInt(countResult[0].total, 10);
    
    const page = q.page || 1;
    const limit = q.limit || 8;
    const offset = (page - 1) * limit;
    
    const queryParams = [...params, limit, offset];
    const limitIdx = params.length + 1;
    const offsetIdx = params.length + 2;

    const rows = await query(\`
      select p.*, u.name as created_by_name from projects p
      join users u on u.id = p.created_by
      \${where}
      order by p.created_at desc limit $\${limitIdx} offset $\${offsetIdx}
    \`, queryParams);
    
    res.json({
      totalCount,
      page,
      totalPages: Math.ceil(totalCount / limit),
      projects: rows.map(r => ({`;

code = code.replace(targetStr, replacement);
fs.writeFileSync('backend-src/modules/admin/adminRoutes.ts', code);
