import React from 'react';
import { AuthUser } from '../../types';
import { Shield, HardHat, LogOut, WifiOff, RefreshCw } from 'lucide-react';

interface HeaderProps {
  currentUser: AuthUser;
  onLogout: () => void;
  pendingCount?: number;
  onSync?: () => void;
  isSyncing?: boolean;
}

/**
 * A single logged-in user's session — no account switcher, no data reset,
 * no device-frame toggle. Responsive layout is handled by real CSS
 * breakpoints in each screen (PRD Section 48), not a simulated phone frame.
 */
export const Header: React.FC<HeaderProps> = ({ currentUser, onLogout, pendingCount = 0, onSync, isSyncing }) => {
  return (
    <header className="bg-zinc-900 border-b border-zinc-800 text-zinc-100 sticky top-0 z-40 px-3 sm:px-6 py-2.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-emerald-600 text-zinc-950 flex items-center justify-center font-bold text-xs tracking-tight">
            FW
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-tight text-white">FIELDWORK</span>
              <span className="text-[10px] font-mono font-medium bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded border border-zinc-700">
                v1.0
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 hidden sm:block">Sistem Dokumentasi, Presensi &amp; Anomali Spasial</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {pendingCount > 0 && (
            <button
              onClick={onSync}
              disabled={isSyncing}
              className="flex items-center gap-1.5 text-xs font-semibold bg-amber-500/10 border border-amber-500/30 text-amber-300 px-2.5 py-1.5 rounded-lg"
              title="Data belum tersinkron"
            >
              {isSyncing ? <RefreshCw size={13} className="animate-spin" /> : <WifiOff size={13} />}
              {pendingCount} tertunda
            </button>
          )}

          <div className="flex items-center gap-2 bg-zinc-800/90 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs">
            {currentUser.role === 'ADMIN' ? (
              <Shield size={15} className="text-amber-400 shrink-0" />
            ) : (
              <HardHat size={15} className="text-emerald-400 shrink-0" />
            )}
            <div className="flex flex-col text-left">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-white leading-tight">{currentUser.name}</span>
                <span
                  className={`text-[9px] font-mono px-1 rounded font-bold ${
                    currentUser.role === 'ADMIN' ? 'bg-amber-950 text-amber-300' : 'bg-emerald-950 text-emerald-300'
                  }`}
                >
                  {currentUser.role}
                </span>
              </div>
              <span className="text-[10px] text-zinc-400 font-mono">{currentUser.nip || currentUser.email}</span>
            </div>
          </div>

          <button
            onClick={onLogout}
            title="Keluar dari Akun"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-rose-900/60 hover:text-rose-200 text-zinc-300 text-xs font-semibold border border-zinc-700 transition-colors"
          >
            <LogOut size={14} />
            <span className="hidden sm:inline">Keluar</span>
          </button>
        </div>
      </div>
    </header>
  );
};
