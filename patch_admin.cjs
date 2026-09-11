const fs = require('fs');
let code = fs.readFileSync('src/components/admin/AdminDashboard.tsx', 'utf8');

// Add import
code = code.replace(
  "import { ChangePasswordModal } from '../auth/ChangePasswordModal';",
  "import { ChangePasswordModal } from '../auth/ChangePasswordModal';\nimport { generateInvite } from '../../api/auth';"
);

// Add state for invite link
if (!code.includes('inviteLink')) {
  code = code.replace(
    "const [showChangePassword, setShowChangePassword] = useState(false);",
    "const [showChangePassword, setShowChangePassword] = useState(false);\n  const [inviteLink, setInviteLink] = useState<{ url: string; expiresAt: string } | null>(null);\n  const [isGeneratingInvite, setIsGeneratingInvite] = useState(false);"
  );
}

// Add handle function
const handleGenerateInvite = `
  const handleGenerateInvite = async (role: 'ADMIN' | 'TEKNISI') => {
    try {
      setIsGeneratingInvite(true);
      const res = await generateInvite(role);
      const url = \`\${window.location.origin}?invite=\${res.token}\`;
      setInviteLink({ url, expiresAt: new Date(res.expiresAt).toLocaleString('id-ID') });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal membuat link undangan');
    } finally {
      setIsGeneratingInvite(false);
    }
  };
`;

code = code.replace(
  "const handleActivate = async (id: string) => {",
  handleGenerateInvite + "\n  const handleActivate = async (id: string) => {"
);

// Add UI for invite link generation
const inviteUI = `
                <div className="mb-6 p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                  <h4 className="font-bold text-sm text-emerald-800 mb-2">Buat Link Undangan (Berlaku 24 Jam)</h4>
                  <p className="text-xs text-emerald-600 mb-3">
                    Pendaftaran kini dibatasi hanya melalui link undangan. Buat link di bawah ini dan bagikan ke teknisi atau admin baru untuk mendaftar.
                  </p>
                  <div className="flex gap-2 mb-3">
                    <button 
                      onClick={() => handleGenerateInvite('TEKNISI')}
                      disabled={isGeneratingInvite}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
                    >
                      Buat Undangan Teknisi
                    </button>
                    <button 
                      onClick={() => handleGenerateInvite('ADMIN')}
                      disabled={isGeneratingInvite}
                      className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
                    >
                      Buat Undangan Admin
                    </button>
                  </div>
                  
                  {inviteLink && (
                    <div className="mt-4 p-3 bg-white rounded-lg border border-emerald-200 shadow-sm animate-in fade-in slide-in-from-top-2">
                      <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase mb-1">Link Undangan (Kedaluwarsa: {inviteLink.expiresAt})</p>
                      <div className="flex items-center gap-2">
                        <input 
                          type="text" 
                          readOnly 
                          value={inviteLink.url} 
                          className="flex-1 text-xs px-2 py-1.5 bg-slate-50 border border-slate-200 rounded outline-none focus:border-emerald-400"
                        />
                        <button 
                          onClick={() => { navigator.clipboard.writeText(inviteLink.url); alert('Disalin!'); }}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded transition-colors"
                        >
                          Salin
                        </button>
                      </div>
                    </div>
                  )}
                </div>
`;

code = code.replace(
  "{adminUsers.length === 0 ? (",
  inviteUI + "\n                {adminUsers.length === 0 ? ("
);

fs.writeFileSync('src/components/admin/AdminDashboard.tsx', code);
