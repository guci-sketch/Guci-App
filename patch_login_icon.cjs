const fs = require('fs');
let code = fs.readFileSync('src/components/auth/LoginForm.tsx', 'utf8');

const oldIcon = `<div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-md">
              <Bug size={18} />
            </div>`;

const newIcon = `<div className="w-9 h-9 rounded-xl bg-[var(--accent-glow)] text-[var(--accent)] flex items-center justify-center font-bold text-sm tracking-tight border border-[var(--accent-glow)]">
              FW
            </div>`;

code = code.replace(oldIcon, newIcon);

fs.writeFileSync('src/components/auth/LoginForm.tsx', code);
