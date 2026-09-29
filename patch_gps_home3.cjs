const fs = require('fs');
let code = fs.readFileSync('src/components/executor/ExecutorHome.tsx', 'utf8');

code = code.replace(/<AlertTriangle size=\{14\} \/>/g, '');

fs.writeFileSync('src/components/executor/ExecutorHome.tsx', code);
