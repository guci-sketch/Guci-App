import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { signup, resetPassword } from '../../api/auth';
import { Lock, Mail, Eye, EyeOff, AlertCircle, ArrowRight, FileCheck, ChevronDown, User, Hash, KeyRound } from 'lucide-react';

export const LoginForm: React.FC = () => {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
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
        const msg = await signup(name.trim(), identifier.trim(), nip.trim(), password, role, honeypot);
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
    if (mode === 'signup') return 'Daftarkan diri Anda. Admin akan meninjau pendaftaran ini.';
    if (mode === 'forgot') return 'Masukkan ID Pegawai (NIP) atau email dinas Anda untuk me-reset sandi ke bawaan.';
    return 'Masukkan ID Pegawai (NIP) atau email dinas Anda.';
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col justify-between text-[var(--text-primary)]">
      <header className="bg-[var(--bg-card)] border-b border-[var(--border-subtle)] px-6 py-3.5 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-[var(--accent-glow)] text-[var(--accent)] font-bold text-sm flex items-center justify-center tracking-tight border border-[var(--accent-glow)]">FW</div>
            <div>
              <span className="font-bold text-sm text-[var(--text-primary)] tracking-tight">FIELDWORK</span>
              <span className="text-[var(--text-muted)] text-xs ml-2 hidden sm:inline-block">Sistem Pengawasan Dokumentasi &amp; Presensi Spasial</span>
            </div>
          </div>
          <div className="text-xs text-[var(--text-muted)] font-mono hidden md:block">Protokol Validasi Integritas Geofence Lapangan</div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-10">
        <div className="w-full max-w-md">
          <div className="clean-card p-6 sm:p-8">
            <div className="mb-6">
              <span className="text-xs font-semibold text-[var(--accent)] bg-[var(--accent-glow)] px-2.5 py-1 rounded-md border border-[var(--accent-glow)] inline-block mb-2">
                Portal Autentikasi Pegawai
              </span>
              <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">{getTitle()}</h1>
              <p className="text-sm text-[var(--text-secondary)] mt-1">{getSubtitle()}</p>
            </div>

            
            {successMsg && (
              <div className="mb-5 p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-start gap-2.5">
                <FileCheck size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block">Berhasil</span>
                  <span>{successMsg}</span>
                </div>
              </div>
            )}
            {errorMessage && (
              <div className="mb-5 p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
                <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block">Aksi Gagal</span>
                  <span>{errorMessage}</span>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">

              {mode === 'signup' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">Nama Lengkap</label>
                    <div className="relative">
                      <User size={16} className="absolute left-3 top-3 text-slate-400" />
                      <input type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="Nama Lengkap" className="w-full pl-9 pr-3.5 py-2.5 bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent)]" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">NIP (Opsional)</label>
                    <div className="relative">
                      <Hash size={16} className="absolute left-3 top-3 text-slate-400" />
                      <input type="text" value={nip} onChange={e => setNip(e.target.value)} placeholder="Nomor Induk Pegawai" className="w-full pl-9 pr-3.5 py-2.5 bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent)]" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">Peran (Role)</label>
                    <div className="relative">
                      <User size={16} className="absolute left-3 top-3 text-slate-400" />
                      <select value={role} onChange={e => setRole(e.target.value as 'ADMIN' | 'TEKNISI')} className="w-full pl-9 pr-3.5 py-2.5 bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent)] appearance-none">
                        <option value="TEKNISI">Pelaksana Lapangan (Teknisi)</option>
                        <option value="ADMIN">Administrator</option>
                      </select>
                      <ChevronDown size={16} className="absolute right-3 top-3 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                </>
              )}
              <div>
                <label htmlFor="input-identifier" className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
                  ID Pegawai (NIP) atau Alamat Email
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-3 text-slate-400" />
                  <input
                    id="input-identifier"
                    type="text"
                    required
                    autoComplete="username"
                    placeholder="contoh: admin.fauzi@fieldwork.id"
                    value={identifier}
                    onChange={e => setIdentifier(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:bg-white transition-all font-medium"
                  />
                </div>
              </div>

              {mode !== 'forgot' && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="input-password" className="block text-xs font-semibold text-[var(--text-secondary)]">Kata Sandi Akun</label>
                    {mode === 'login' && (
                      <button type="button" onClick={() => { setMode('forgot'); setErrorMessage(null); setSuccessMsg(null); }} className="text-[11px] text-[var(--accent)] hover:underline font-semibold">
                        Lupa kata sandi?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-3 text-slate-400" />
                    <input
                      id="input-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      placeholder="Masukkan kata sandi..."
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full pl-9 pr-10 py-2.5 bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:bg-white transition-all font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 p-0.5"
                      title={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              )}

              {mode !== 'forgot' && (
                <div className="absolute opacity-0 -z-10 w-0 h-0 overflow-hidden" aria-hidden="true">
                  <label htmlFor="bot-check">Biarkan kosong jika Anda manusia</label>
                  <input id="bot-check" type="text" name="url" tabIndex={-1} autoComplete="off" value={honeypot} onChange={e => setHoneypot(e.target.value)} />
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 h-11 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-60 shadow-md shadow-[var(--accent-glow)]"
              >
                {isLoading ? (
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>{mode === 'signup' ? 'Daftar Akun Baru' : mode === 'forgot' ? 'Reset Kata Sandi' : 'Masuk ke Dashboard'}</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            <div className="mt-4 text-center">
              {mode !== 'login' ? (
                <button type="button" onClick={() => { setMode('login'); setErrorMessage(null); setSuccessMsg(null); }} className="text-xs text-[var(--accent)] hover:underline font-semibold">
                  Kembali ke halaman Masuk
                </button>
              ) : (
                <button type="button" onClick={() => { setMode('signup'); setErrorMessage(null); setSuccessMsg(null); }} className="text-xs text-[var(--accent)] hover:underline font-semibold">
                  Belum punya akun? Daftar sekarang
                </button>
              )}
            </div>



            <div className="mt-6 pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs text-[var(--text-muted)]">
              <span className="flex items-center gap-1.5">
                <FileCheck size={14} className="text-[var(--accent)]" />
                Verifikasi GPS &amp; kamera langsung
              </span>
              <span className="font-mono">Ver 1.0</span>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-[var(--bg-card)] border-t border-[var(--border-subtle)] text-[var(--text-muted)] py-4 px-6 text-center text-xs">
        FIELDWORK Documentation &amp; Anomaly Monitoring System &bull; Waktu Acuan Server: WIB
      </footer>
    </div>
  );
};