const fs = require('fs');

const files = [
  'src/components/executor/CreateProjectModal.tsx',
  'src/components/executor/TreatmentFormModal.tsx',
  'src/components/executor/CustomerReviewFormModal.tsx',
];

for (const file of files) {
  let code = fs.readFileSync(file, 'utf8');
  
  // Make the backdrop align items to end on mobile (bottom sheet style)
  code = code.replace(
    /className="(fixed inset-0 z-?\[?\d*\]? flex) items-start sm:items-center([^"]*)"/g,
    'className="$1 items-end sm:items-center $2"'
  );
  
  // Make the card take 90dvh on mobile and rounded-t only, and rounded-2xl on desktop
  code = code.replace(
    /className="(relative w-full[^"]*?)rounded-2xl([^"]*?)max-h-\[\d+dvh\] sm:max-h-\[\d+dvh\]([^"]*?)"/g,
    'className="$1rounded-t-2xl sm:rounded-b-2xl sm:rounded-2xl$2h-[95dvh] sm:h-auto sm:max-h-[85dvh]$3"'
  );
  // for TreatmentFormModal / CustomerReview which might have slightly different classes:
  code = code.replace(
    /className="(bg-\[var\(--bg-card\)\] rounded-2xl w-full[^"]*?)max-h-\[\d+dvh\] sm:max-h-\[\d+dvh\]([^"]*?)"/g,
    'className="$1rounded-t-2xl sm:rounded-b-2xl sm:rounded-2xl h-[95dvh] sm:h-auto sm:max-h-[85dvh]$2"'
  );
  
  // Fix specific CreateProjectModal container class
  code = code.replace(
    /w-full max-w-xl bg-\[var\(--bg-card\)\] rounded-2xl shadow-2xl border border-\[var\(--border-subtle\)\] flex flex-col max-h-\[85dvh\] sm:max-h-\[85dvh\]/g,
    'w-full max-w-xl bg-[var(--bg-card)] rounded-t-2xl sm:rounded-2xl shadow-2xl border border-[var(--border-subtle)] flex flex-col h-[95dvh] sm:h-auto sm:max-h-[85dvh]'
  );

  fs.writeFileSync(file, code);
}
console.log('Done mobile patch');
