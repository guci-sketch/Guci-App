const fs = require('fs');

const code = `import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { signup, resetPassword } from '../../api/auth';
import { Lock, Mail, Eye, EyeOff, AlertCircle, ArrowRight, FileCheck, ChevronDown, User, Hash, KeyRound, Bug } from 'lucide-react';

export const LoginForm: React.FC = () => {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [inviteToken, setInviteToken] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('invite');
    if (token) {
      setInviteToken(token);
      setMode('signup');
    }
  }, []);

  const [name, setName] = useState('');
  const [nip, setNip] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'TEKNISI'>('TEKNISI');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [honeypot, setHoneypot] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMsg(null);
    setIsLoading(true);
    try {
      if (mode === 'signup') {
        const msg = await signup(name.trim(), identifier.trim(), nip.trim(), password, role, honeypot, inviteToken || undefined);
        setSuccessMsg(msg);
        setMode('login');
        setPassword('');
        setHoneypot('');
      } else if (mode === 'forgot') {
        const msg = await resetPassword(identifier.trim());
        setSuccessMsg(msg);
        setMode('login');
        setPassword('');
      } else {
        await login(identifier.trim(), password, honeypot);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan.');
    } finally {
      setIsLoading(false);
    }
  };

  const getTitle = () => {
    if (mode === 'signup') return 'Pendaftaran Akun Baru';
    if (mode === 'forgot') return 'Reset Kata Sandi';
    return 'Masuk ke Akun Kerja';
  };

  const getSubtitle = () => {
    if (mode === 'signup') return 'Daftarkan diri Anda melalui link undangan.';
    if (mode === 'forgot') return 'Masukkan ID Pegawai (NIP) atau email dinas Anda untuk me-reset sandi ke bawaan.';
    return 'Masukkan ID Pegawai (NIP) atau email dinas Anda.';
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col justify-between text-[var(--text-primary)]">
      <header className="bg-[var(--bg-card)] border-b border-[var(--border-subtle)] px-6 py-3.5 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-md">
              <Bug size={18} />
            </div>
            <span className="font-extrabold text-[var(--text-primary)] tracking-tight">FIELDWORK</span>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-[var(--bg-card)] p-8 rounded-2xl shadow-xl border border-[var(--border-subtle)]">
            <h1 className="text-xl font-bold text-center text-[var(--text-primary)] mb-2">{getTitle()}</h1>
            <p className="text-sm text-[var(--text-muted)] text-center mb-6">{getSubtitle()}</p>

            {errorMessage && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" /> {errorMessage}
              </div>
            )}
            {successMsg && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-lg flex items-center gap-2">
                <FileCheck size={14} className="shrink-0" /> {successMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <input type="text" name="honeypot" value={honeypot} onChange={e => setHoneypot(e.target.value)} className="hidden" tabIndex={-1} autoComplete="off" />
              
              {mode === 'signup' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">Nama Lengkap</label>
                    <div className="relative">
                      <User size={16} className="absolute left-3 top-2.5 text-[var(--text-muted)]" />
                      <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full pl-9 pr-3 py-2 bg-[var(--bg-primary)] border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" placeholder="Budi Santoso" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">NIP (Opsional)</label>
                    <div className="relative">
                      <Hash size={16} className="absolute left-3 top-2.5 text-[var(--text-muted)]" />
                      <input type="text" value={nip} onChange={e => setNip(e.target.value)} className="w-full pl-9 pr-3 py-2 bg-[var(--bg-primary)] border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" placeholder="PST-0012" />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">Email / ID Pegawai</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-2.5 text-[var(--text-muted)]" />
                  <input required type="text" value={identifier} onChange={e => setIdentifier(e.target.value)} className="w-full pl-9 pr-3 py-2 bg-[var(--bg-primary)] border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" placeholder="budi@example.com" />
                </div>
              </div>

              {mode !== 'forgot' && (
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="block text-xs font-semibold text-[var(--text-secondary)]">Kata Sandi</label>
                    {mode === 'login' && (
                      <button type="button" onClick={() => { setMode('forgot'); setErrorMessage(null); setSuccessMsg(null); }} className="text-[11px] text-[var(--accent)] hover:underline font-semibold">
                        Lupa kata sandi?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <KeyRound size={16} className="absolute left-3 top-2.5 text-[var(--text-muted)]" />
                    <input required type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full pl-9 pr-3 py-2 bg-[var(--bg-primary)] border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" placeholder="••••••••" />
                  </div>
                </div>
              )}

              <button type="submit" disabled={isLoading} className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 mt-2 disabled:opacity-50">
                {isLoading ? 'Memproses...' : getTitle()} <ArrowRight size={16} />
              </button>
            </form>

            <div className="mt-4 text-center">
              {mode !== 'login' ? (
                <button type="button" onClick={() => { setMode('login'); setErrorMessage(null); setSuccessMsg(null); }} className="text-xs text-[var(--accent)] hover:underline font-semibold">
                  Kembali ke halaman Masuk
                </button>
              ) : inviteToken ? (
                <button type="button" onClick={() => { setMode('signup'); setErrorMessage(null); setSuccessMsg(null); }} className="text-xs text-[var(--accent)] hover:underline font-semibold">
                  Gunakan Link Undangan untuk Mendaftar
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-[var(--bg-card)] border-t border-[var(--border-subtle)] text-[var(--text-muted)] py-4 px-6 text-center text-xs">
        Documentation &amp; Digital Reporting System &bull; Waktu Acuan Server: WIB
      </footer>
    </div>
  );
};
`;

fs.writeFileSync('src/components/auth/LoginForm.tsx', code);
