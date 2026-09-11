const fs = require('fs');
let types = fs.readFileSync('src/types.ts', 'utf8');
types = types.replace(
  "search: string;\n}",
  "search: string;\n  page?: number;\n  limit?: number;\n}"
);
fs.writeFileSync('src/types.ts', types);

let api = fs.readFileSync('src/api/admin.ts', 'utf8');
api = api.replace(
  "<{ reports: WorkReportListItem[]; count: number }>",
  "<{ reports: WorkReportListItem[]; count: number; totalCount: number; page: number; totalPages: number }>"
);
fs.writeFileSync('src/api/admin.ts', api);
