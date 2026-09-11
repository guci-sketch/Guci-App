const fs = require('fs');
let code = fs.readFileSync('src/components/executor/CreateProjectModal.tsx', 'utf8');

code = code.replace(/disabled=\{isMapLocked\}/g, '');
// Also remove disabled classes
code = code.replace(/disabled:bg-slate-50 disabled:text-slate-500/g, '');

fs.writeFileSync('src/components/executor/CreateProjectModal.tsx', code);
