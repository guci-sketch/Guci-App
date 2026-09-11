const fs = require('fs');
let code = fs.readFileSync('backend-src/modules/admin/adminRoutes.ts', 'utf8');

code = code.replace(
  "limit ${limitParamIdx} offset ${offsetParamIdx}`, queryParams);",
  "limit $${limitParamIdx} offset $${offsetParamIdx}`, queryParams);"
);

fs.writeFileSync('backend-src/modules/admin/adminRoutes.ts', code);
