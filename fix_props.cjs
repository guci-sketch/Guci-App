const fs = require('fs');
let code = fs.readFileSync('src/components/executor/CreateProjectModal.tsx', 'utf8');

code = code.replace(/onLocationChange/g, 'onChange');

fs.writeFileSync('src/components/executor/CreateProjectModal.tsx', code);
