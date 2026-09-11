const fs = require('fs');

const files = [
  'src/components/executor/CreateProjectModal.tsx',
  'src/components/executor/TreatmentFormModal.tsx',
  'src/components/executor/CustomerReviewFormModal.tsx',
  'src/components/auth/ChangePasswordModal.tsx'
];

for (const file of files) {
  let code = fs.readFileSync(file, 'utf8');
  
  // Replace vh with dvh to handle mobile keyboards better
  code = code.replace(/max-h-\[([^v]+)vh\]/g, 'max-h-[$1dvh]');
  
  // Make sure to add extra pb-32 to the scrollable form on mobile so user can scroll the input up
  code = code.replace(/className="(p-4 sm:p-5 space-y-4 overflow-y-auto)"/g, 'className="p-4 sm:p-5 space-y-4 overflow-y-auto pb-32 sm:pb-5"');
  code = code.replace(/className="(overflow-y-auto p-4 space-y-4)"/g, 'className="overflow-y-auto p-4 space-y-4 pb-32 sm:pb-4"');
  
  fs.writeFileSync(file, code);
}
console.log('Done dvh patch');
