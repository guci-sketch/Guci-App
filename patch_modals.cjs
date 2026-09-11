const fs = require('fs');

const files = [
  'src/components/executor/CreateProjectModal.tsx',
  'src/components/executor/TreatmentFormModal.tsx',
  'src/components/executor/CustomerReviewFormModal.tsx',
  'src/components/auth/ChangePasswordModal.tsx'
];

for (const file of files) {
  let code = fs.readFileSync(file, 'utf8');
  
  // Replace items-center justify-center with items-start sm:items-center justify-center pt-8 sm:pt-0 pb-safe
  code = code.replace(
    /className="(fixed inset-0 z-?\[?\d*\]? flex) items-center justify-center([^"]*)"/g,
    'className="$1 items-start sm:items-center justify-center pt-10 sm:pt-0 pb-10 sm:pb-0 $2"'
  );
  
  // Also for CustomerReviewFormModal, let's fix any issues with max-h
  code = code.replace(/max-h-\[90vh\]/g, 'max-h-[85vh]');
  
  fs.writeFileSync(file, code);
}
console.log('Done');
