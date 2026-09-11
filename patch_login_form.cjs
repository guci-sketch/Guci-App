const fs = require('fs');
let code = fs.readFileSync('src/components/auth/LoginForm.tsx', 'utf8');

// 1. Remove GPS item
code = code.replace(
  /<div className="flex items-center gap-3">[\s\S]*?Verifikasi GPS &amp; kamera langsung[\s\S]*?<\/div>/,
  ""
);

// 2. Change Footer Text
code = code.replace(
  "FIELDWORK Documentation &amp; Anomaly Monitoring System",
  "Documentation &amp; Digital Reporting System"
);

// 3. Handle token in URL and hide signup link
if (!code.includes('inviteToken')) {
  code = code.replace(
    "const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');",
    `const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [inviteToken, setInviteToken] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('invite');
    if (token) {
      setInviteToken(token);
      setMode('signup');
    }
  }, []);`
  );
  
  // Also import useEffect if not imported
  if (!code.includes('useEffect')) {
    code = code.replace("import React, { useState }", "import React, { useState, useEffect }");
  }
}

// 4. Update the signup call to include inviteToken
code = code.replace(
  "const msg = await signup(name.trim(), identifier.trim(), nip.trim(), password, role, honeypot);",
  "const msg = await signup(name.trim(), identifier.trim(), nip.trim(), password, role, honeypot, inviteToken || undefined);"
);

// 5. Hide the "Daftar sekarang" link
// We replace the entire block that toggles it
const oldToggle = `{mode !== 'login' ? (
                <button type="button" onClick={() => { setMode('login'); setErrorMessage(null); setSuccessMsg(null); }} className="text-xs text-[var(--accent)] hover:underline font-semibold">
                  Kembali ke halaman Masuk
                </button>
              ) : (
                <button type="button" onClick={() => { setMode('signup'); setErrorMessage(null); setSuccessMsg(null); }} className="text-xs text-[var(--accent)] hover:underline font-semibold">
                  Belum punya akun? Daftar sekarang
                </button>
              )}`;

const newToggle = `{mode !== 'login' ? (
                <button type="button" onClick={() => { setMode('login'); setErrorMessage(null); setSuccessMsg(null); }} className="text-xs text-[var(--accent)] hover:underline font-semibold">
                  Kembali ke halaman Masuk
                </button>
              ) : null}`;

code = code.replace(oldToggle, newToggle);

fs.writeFileSync('src/components/auth/LoginForm.tsx', code);
