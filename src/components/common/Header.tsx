import React, { useState } from 'react';
import { AuthUser } from '../../types';
import { Menu, X } from 'lucide-react';
import { ChangePasswordModal } from '../auth/ChangePasswordModal';

interface HeaderProps {
  currentUser: AuthUser;
  onLogout: () => void;
  pendingCount?: number;
  onSync?: () => void;
  isSyncing?: boolean;
  onMenuToggle?: () => void;
  mobileMenuOpen?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ currentUser, onLogout, pendingCount = 0, onSync, isSyncing, onMenuToggle, mobileMenuOpen }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);

  return (
    <header className="bg-white border-b border-[var(--border-subtle)] text-[var(--text-primary)] sticky top-0 z-40 px-4 sm:px-6 py-3 shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Mobile Toggle */}
          <button
            className="md:hidden p-2 -ml-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
            onClick={() => {
              if (onMenuToggle) {
                onMenuToggle();
              } else {
                setMenuOpen(!menuOpen);
              }
            }}
          >
            {(mobileMenuOpen ?? menuOpen) ? <X size={20} /> : <Menu size={20} />}
          </button>
          
          <div className="w-9 h-9 rounded-xl bg-[var(--accent-glow)] text-[var(--accent)] flex items-center justify-center font-bold text-sm tracking-tight border border-[var(--accent-glow)] hidden sm:flex">
            FW
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-tight text-[var(--text-primary)]">FIELDWORK</span>
              <span className="text-[10px] font-mono font-medium bg-[var(--bg-tertiary)] text-[var(--text-secondary)] px-1.5 py-0.5 rounded border border-[var(--border-subtle)]">
                v1.0
              </span>
            </div>
            <p className="text-[11px] text-[var(--text-muted)] hidden sm:block">Sistem Dokumentasi, Presensi & Anomali Spasial</p>
          </div>
        </div>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-3">
          {pendingCount > 0 && (
            <button
              onClick={onSync}
              disabled={isSyncing}
              className="flex items-center gap-1 text-xs font-semibold bg-amber-50 border border-amber-200 text-amber-700 px-3 py-1.5 rounded-xl hover:bg-amber-100 transition-colors"
              title="Data belum tersinkron"
            >
              {isSyncing ? "Menyinkronkan..." : `${pendingCount} Tertunda`}
            </button>
          )}
          <div className="flex items-center gap-2 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-xl px-3 py-1.5 text-xs">
            <div className="flex flex-col text-left">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-[var(--text-primary)] leading-tight">{currentUser.name}</span>
                <span
                  className={`text-[9px] font-mono px-1.5 py-0.5 rounded-md font-bold ${
                    currentUser.role === 'ADMIN' ? 'bg-[var(--accent-glow)] text-[var(--accent)]' : 'bg-blue-50 text-blue-700'
                  }`}
                >
                  {currentUser.role}
                </span>
              </div>
              <span className="text-[10px] text-[var(--text-muted)] font-mono">{currentUser.nip || currentUser.email}</span>
            </div>
          </div>
          
          <button
            onClick={() => setShowChangePassword(true)}
            title="Ubah Kata Sandi"
            className="flex items-center justify-center px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-600 text-xs font-semibold border border-[var(--border-subtle)] hover:border-slate-300 transition-colors"
          >
            Ubah Sandi
          </button>
          <button
            onClick={onLogout}
            title="Keluar dari Akun"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-rose-50 hover:text-rose-700 text-[var(--text-secondary)] text-xs font-semibold border border-[var(--border-subtle)] hover:border-rose-200 transition-colors"
          >
            Keluar
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {!onMenuToggle && menuOpen && (
        <div className="md:hidden pt-4 pb-2 mt-2 border-t border-[var(--border-subtle)] space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-3 p-3 bg-[var(--bg-tertiary)] rounded-xl border border-[var(--border-subtle)]"> 
            <div>
              <span className="font-semibold text-[var(--text-primary)] block text-sm">{currentUser.name}</span>
              <span className="text-xs text-[var(--text-muted)] font-mono">{currentUser.nip || currentUser.email}</span>
            </div>
          </div>
          {pendingCount > 0 && (
            <button
              onClick={onSync}
              disabled={isSyncing}
              className="w-full flex justify-center items-center gap-2 text-sm font-semibold bg-amber-50 border border-amber-200 text-amber-700 px-4 py-2.5 rounded-xl hover:bg-amber-100"
            >
              {isSyncing ? "Menyinkronkan..." : `Sinkronisasi ${pendingCount} Data`}
            </button>
          )}
          
          <button
            onClick={() => { setMenuOpen(false); setShowChangePassword(true); }}
            className="w-full flex justify-center items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold border border-[var(--border-subtle)]"
          >
            Ubah Kata Sandi
          </button>
          <button
            onClick={onLogout}
            className="w-full flex justify-center items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-rose-50 hover:text-rose-700 text-[var(--text-secondary)] text-sm font-semibold border border-[var(--border-subtle)]"
          >
            Keluar
          </button>
        </div>
      )}
      
      {showChangePassword && <ChangePasswordModal onClose={() => setShowChangePassword(false)} />}
    </header>
  );
};
