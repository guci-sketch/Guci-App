const fs = require('fs');
let code = fs.readFileSync('src/components/admin/AdminDashboard.tsx', 'utf8');

code = code.replace(
  "Galeri Bukti Foto (",
  "Tinjauan Bukti Foto (Photo Review) - ("
);

fs.writeFileSync('src/components/admin/AdminDashboard.tsx', code);
