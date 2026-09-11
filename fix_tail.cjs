const fs = require('fs');
let code = fs.readFileSync('backend-src/modules/admin/adminRoutes.ts', 'utf8');

const lastGood = `    res.json(result);`;

const index = code.lastIndexOf(lastGood);
if (index !== -1) {
  code = code.substring(0, index + lastGood.length) + "\n  })\n);\n\nexport { adminRouter };\n";
  fs.writeFileSync('backend-src/modules/admin/adminRoutes.ts', code);
}
