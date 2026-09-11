const fs = require('fs');
let code = fs.readFileSync('backend-src/modules/admin/adminRoutes.ts', 'utf8');

const target = "export { adminRouter };";
const index = code.indexOf(target);

if (index !== -1) {
  code = code.substring(0, index + target.length) + "\n";
  fs.writeFileSync('backend-src/modules/admin/adminRoutes.ts', code);
  console.log("Truncated successfully.");
} else {
  console.log("Could not find target.");
}
