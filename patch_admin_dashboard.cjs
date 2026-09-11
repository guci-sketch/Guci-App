const fs = require('fs');
let code = fs.readFileSync('src/components/admin/AdminDashboard.tsx', 'utf8');

code = code.replace(/reports\.filter\(r => r\.projectId === selectedProject\.id\)/g, 'reports.filter(r => r.project.id === selectedProject.id)');
code = code.replace(/STATUS_OPTIONS\.find\(s => s\.value === r\.status\)\?\.colorClass \|\| "bg-slate-50 text-slate-700 border-slate-200"/g, '(r.status === "COMPLETED" || r.status === "REVIEWED" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : r.status === "WORKING" ? "bg-blue-50 text-blue-700 border-blue-200" : r.status === "FLAGGED" ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-slate-50 text-slate-700 border-slate-200")');
code = code.replace(/r\.executorName/g, 'r.executor.name');

fs.writeFileSync('src/components/admin/AdminDashboard.tsx', code);
