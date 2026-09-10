const fs = require('fs');
let code = fs.readFileSync('src/components/common/Header.tsx', 'utf8');

// I will just remove every `\n          )}` that comes immediately after `</button>`
code = code.replace(/<\/button>\s*\)\}/g, '</button>');

fs.writeFileSync('src/components/common/Header.tsx', code);
