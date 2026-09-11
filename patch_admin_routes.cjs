const fs = require('fs');
let code = fs.readFileSync('backend-src/modules/admin/adminRoutes.ts', 'utf8');

// Update filterSchema
code = code.replace(
  "search: z.string().optional(),\n});",
  "search: z.string().optional(),\n  page: z.coerce.number().min(1).optional(),\n  limit: z.coerce.number().min(1).max(5000).optional(),\n});"
);

// Update /reports endpoint
const oldRoute = `    const { where, params } = buildReportFilter(parsed.data);
    const rows = await query(\`\${REPORT_LIST_SQL} \${where} order by wr.created_at desc limit 500\`, params);
    res.json({ reports: rows.map(mapListRow), count: rows.length });`;

const newRoute = `    const { where, params } = buildReportFilter(parsed.data);
    
    // Total count for pagination
    const countResult = await query(\`select count(*) as total from work_reports wr join projects p on p.id = wr.project_id join users u on u.id = wr.executor_id \${where}\`, params);
    const totalCount = parseInt(countResult[0].total, 10);
    
    // Pagination parameters
    const page = parsed.data.page || 1;
    const limit = parsed.data.limit || 20;
    const offset = (page - 1) * limit;
    
    // Add offset and limit params
    const queryParams = [...params, limit, offset];
    const limitParamIdx = params.length + 1;
    const offsetParamIdx = params.length + 2;

    const rows = await query(\`\${REPORT_LIST_SQL} \${where} order by wr.created_at desc limit $\${limitParamIdx} offset $\${offsetParamIdx}\`, queryParams);
    res.json({ reports: rows.map(mapListRow), count: rows.length, totalCount, page, totalPages: Math.ceil(totalCount / limit) });`;

code = code.replace(oldRoute, newRoute);

fs.writeFileSync('backend-src/modules/admin/adminRoutes.ts', code);
