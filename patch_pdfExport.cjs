const fs = require('fs');
let code = fs.readFileSync('src/utils/pdfExport.ts', 'utf8');

code = code.replace(/project\.name/g, 'project.projectName');
code = code.replace(/report\.treatment/g, 'report.treatmentRecord');

fs.writeFileSync('src/utils/pdfExport.ts', code);
