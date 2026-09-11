const fs = require('fs');
let code = fs.readFileSync('backend-src/modules/admin/adminRoutes.ts', 'utf8');

code = code.replace(
  "where += ` and (p.project_name ilike ${i} or p.client_name ilike ${i} or p.address ilike ${i} or u.name ilike ${i})`;",
  "where += ' and (p.project_name ilike $' + i + ' or p.client_name ilike $' + i + ' or p.address ilike $' + i + ' or u.name ilike $' + i + ')';"
);

code = code.replace(
  "where += ` and p.service_type = ${i++}`;",
  "where += ' and p.service_type = $' + (i++);"
);

fs.writeFileSync('backend-src/modules/admin/adminRoutes.ts', code);
