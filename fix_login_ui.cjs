const fs = require('fs');
let code = fs.readFileSync('src/components/auth/LoginForm.tsx', 'utf8');

// I will just rewrite the toggle section.
const regex = /\{mode !== 'login' \? \([\s\S]*?\}<\/div>/;

const newToggle = `{mode !== 'login' ? (
                <button type="button" onClick={() => { setMode('login'); setErrorMessage(null); setSuccessMsg(null); }} className="text-xs text-[var(--accent)] hover:underline font-semibold">
                  Kembali ke halaman Masuk
                </button>
              ) : inviteToken ? (
                <button type="button" onClick={() => { setMode('signup'); setErrorMessage(null); setSuccessMsg(null); }} className="text-xs text-[var(--accent)] hover:underline font-semibold">
                  Gunakan Link Undangan untuk Mendaftar
                </button>
              ) : null}
            </div>`;

code = code.replace(regex, newToggle);

fs.writeFileSync('src/components/auth/LoginForm.tsx', code);
