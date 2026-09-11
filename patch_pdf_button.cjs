const fs = require('fs');
let code = fs.readFileSync('src/components/admin/AdminDashboard.tsx', 'utf8');

// Add import
code = code.replace(
  "import {  RISK_LEVEL_OPTIONS, STATUS_OPTIONS } from '../../utils/riskMeta';",
  "import {  RISK_LEVEL_OPTIONS, STATUS_OPTIONS } from '../../utils/riskMeta';\nimport { exportReportToPdf } from '../../utils/pdfExport';"
);

// Find the report details header where the close button is
const closeButtonRegex = /<button onClick=\{\(\) => setSelectedReportId\(null\)\} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors">[\s\S]*?<\/button>/;

const newButtons = `
                  <div className="flex gap-2">
                    <button 
                      onClick={() => exportReportToPdf(selectedReport, selectedProject)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      <Download size={14} /> Unduh PDF
                    </button>
                    <button onClick={() => setSelectedReportId(null)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors">
                      <X size={20} />
                    </button>
                  </div>
`;

code = code.replace(closeButtonRegex, newButtons);

fs.writeFileSync('src/components/admin/AdminDashboard.tsx', code);
