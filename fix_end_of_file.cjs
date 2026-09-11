const fs = require('fs');
let code = fs.readFileSync('backend-src/modules/admin/adminRoutes.ts', 'utf8');

const lastGoodContent = `    res.json(result);
  })
);`;

const index = code.lastIndexOf(lastGoodContent);
if (index !== -1) {
  code = code.substring(0, index + lastGoodContent.length) + "\n\nexport { adminRouter };\n";
  fs.writeFileSync('backend-src/modules/admin/adminRoutes.ts', code);
}
