const fs = require('fs');
let code = fs.readFileSync('src/components/common/Header.tsx', 'utf8');

code = code.replace(/\{\(mobileMenuOpen \?\? menuOpen\) \? <X size=\{20\} \/> : <Menu size=\{20\} \/>\}\n\s*<\/button>/, `{(mobileMenuOpen ?? menuOpen) ? <X size={20} /> : <Menu size={20} />}\n            </button>\n          )}`);

fs.writeFileSync('src/components/common/Header.tsx', code);
