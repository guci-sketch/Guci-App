import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ApiError } from '../../api/client';
import { Lock, Mail, Eye, EyeOff, AlertCircle, ArrowRight, FileCheck, ChevronDown } from 'lucide-react';

const DEMO_ACCOUNTS = [
  { name: 'Ahmad Fauzi (Admin)', identifier: 'admin.fauzi@fieldwork.id', password: 'admin123' },
  { name: 'Budi Santoso (Pelaksana — pekerjaan aktif)', identifier: 'budi.santoso@fieldwork.id', password: 'lapangan123' },
  { name: 'Sinta Maharani (Pelaksana — skenario anomali)', identifier: 'sinta.maharani@fieldwork.id', password: 'lapangan123' },
  { name: 'Andi Pratama (Pelaksana — siap check-in)', identifier: 'andi.pratama@fieldwork.id', password: 'lapangan123' },
];

export const LoginForm: React.FC = () => {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showDemoHints, setShowDemoHints] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);
    try {
      await login(identifier.trim(), password);
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : 'Gagal masuk. Periksa koneksi Anda.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-100 flex flex-col justify-between text-zinc-800">
      <header className="bg-zinc-900 border-b border-zinc-800 text-zinc-300 px-6 py-3.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-emerald-600 text-zinc-950 font-bold text-sm flex items-center justify-center tracking-tight">FW</div>
            <div>
              <span className="font-bold text-sm text-white tracking-tight">FIELDWORK</span>
              <span className="text-zinc-500 text-xs ml-2 hidden sm:inline-block">Sistem Pengawasan Dokumentasi &amp; Presensi Spasial</span>
            </div>
          </div>
          <div className="text-xs text-zinc-400 font-mono hidden md:block">Protokol Validasi Integritas Geofence Lapangan</div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-10">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-xl border border-zinc-200 p-6 sm:p-8 shadow-xs">
            <div className="mb-6">
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200 inline-block mb-2">
                Portal Autentikasi Pegawai
              </span>
              <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Masuk ke Akun Kerja</h1>
              <p className="text-sm text-zinc-500 mt-1">Masukkan ID Pegawai (NIP) atau email dinas Anda untuk membuka sesi operasional.</p>
            </div>

            {errorMessage && (
              <div className="mb-5 p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-2.5">
                <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block">Autentikasi Gagal</span>
                  <span>{errorMessage}</span>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="input-identifier" className="block text-xs font-semibold text-zinc-700 mb-1.5">
                  ID Pegawai (NIP) atau Alamat Email
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-3 text-zinc-400" />
                  <input
                    id="input-identifier"
                    type="text"
                    required
                    autoComplete="username"
                    placeholder="contoh: admin.fauzi@fieldwork.id"
                    value={identifier}
                    onChange={e => setIdentifier(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-zinc-50 rounded-lg border border-zinc-200 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white transition-all font-medium"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="input-password" className="block text-xs font-semibold text-zinc-700 mb-1.5">Kata Sandi Akun</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-3 text-zinc-400" />
                  <input
                    id="input-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    placeholder="Masukkan kata sandi..."
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2.5 bg-zinc-50 rounded-lg border border-zinc-200 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white transition-all font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-700 p-0.5"
                    title={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 h-11 bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-950 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isLoading ? (
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Masuk ke Dashboard Operasional</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            {import.meta.env.DEV && (
              <div className="mt-4 border-t border-zinc-100 pt-3">
                <button
                  type="button"
                  onClick={() => setShowDemoHints(v => !v)}
                  className="flex items-center gap-1 text-xs font-semibold text-zinc-500 hover:text-zinc-700"
                >
                  <ChevronDown size={14} className={`transition-transform ${showDemoHints ? 'rotate-180' : ''}`} />
                  Kredensial demo (development only)
                </button>
                {showDemoHints && (
                  <ul className="mt-2 space-y-1.5">
                    {DEMO_ACCOUNTS.map(acc => (
                      <li key={acc.identifier} className="text-[11px] text-zinc-500 font-mono bg-zinc-50 border border-zinc-100 rounded px-2 py-1.5">
                        <span className="text-zinc-700 font-semibold">{acc.name}</span><br />
                        {acc.identifier} / {acc.password}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500">
              <span className="flex items-center gap-1.5">
                <FileCheck size={14} className="text-emerald-700" />
                Verifikasi GPS &amp; kamera langsung
              </span>
              <span className="font-mono text-zinc-400">Ver 1.0</span>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-zinc-100 border-t border-zinc-200 text-zinc-500 py-3 px-6 text-center text-xs">
        FIELDWORK Documentation &amp; Anomaly Monitoring System &bull; Waktu Acuan Server: WIB
      </footer>
    </div>
  );
};
