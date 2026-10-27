import React, { useState, useEffect, useMemo } from 'react';
import { AppUser } from '@/entities/types';
import {
  Menu,
  X,
  BookOpen,
  RefreshCw,
  KeyRound,
  LogOut,
  Search,
  ChevronRight,
  ChevronDown,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react';
import { ChangePasswordModal } from '../auth/ChangePasswordModal';
import { RoleGuidebookModal } from './RoleGuidebookModal';
import { useTheme } from '@/shared/hooks/useTheme';

export interface QuickJumpModuleItem {
  id: string;
  label: string;
  shortLabel?: string;
  group?: string;
  icon?: React.ReactNode;
}

interface HeaderProps {
  hideMobileMenu?: boolean;
  currentUser: AppUser;
  onLogout: () => void;
  pageTitle?: string;
  pageGroup?: string;
  pageSubtitle?: string;
  pendingCount?: number;
  onSync?: () => void;
  onRefresh?: () => void;
  isSyncing?: boolean;
  onMenuToggle?: () => void;
  mobileMenuOpen?: boolean;
  modules?: QuickJumpModuleItem[];
  activeModuleId?: string;
  onSelectModule?: (id: string) => void;
}

const ROLE_BADGE_LABELS: Record<string, string> = {
  SUPERADMIN: 'Direktur',
  ADMIN: 'Admin',
  TEKNISI_LAPANGAN: 'Teknisi',
  MARKETING: 'Marketing',
  INVENTORY: 'Gudang',
};

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onLogout,
  pageTitle = 'Dashboard Operasional',
  pageGroup,
  pageSubtitle,
  pendingCount = 0,
  onSync,
  onRefresh,
  isSyncing,
  onMenuToggle,
  mobileMenuOpen,
  hideMobileMenu,
  modules = [],
  activeModuleId,
  onSelectModule,
}) => {
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [showGuidebook, setShowGuidebook] = useState(false);
  const [showQuickJump, setShowQuickJump] = useState(false);
  const [jumpQuery, setJumpQuery] = useState('');
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [refreshSpin, setRefreshSpin] = useState(false);

  const { theme, resolvedTheme, setTheme, cycleTheme, options: themeOptions } = useTheme();
  const isMasterSuper = currentUser.role === 'MASTER_SUPER_ADMIN';

  // Global keyboard shortcut Ctrl+K / Cmd+K for Quick Jump
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowQuickJump(prev => !prev);
      }
      if (e.key === 'Escape') {
        setShowQuickJump(false);
        setProfileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const filteredModules = useMemo(() => {
    const q = jumpQuery.trim().toLowerCase();
    if (!q) return modules;
    return modules.filter(
      m =>
        m.label.toLowerCase().includes(q) ||
        (m.shortLabel ?? '').toLowerCase().includes(q) ||
        (m.group ?? '').toLowerCase().includes(q)
    );
  }, [modules, jumpQuery]);

  const handleRefreshClick = () => {
    setRefreshSpin(true);
    setTimeout(() => setRefreshSpin(false), 600);
    if (onRefresh) {
      onRefresh();
    } else if (onSync) {
      onSync();
    } else {
      window.location.reload();
    }
  };

  const userInitial = (currentUser.name || 'U').trim().charAt(0).toUpperCase();

  return (
    <>
      <header className="bg-[var(--bg-card)]/95 backdrop-blur-md border-b border-[var(--border-subtle)] text-[var(--text-primary)] sticky top-0 z-40 px-3 sm:px-6 py-2 shadow-[var(--shadow-sm)]">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          {/* Left: Hamburger Button + Page Title */}
          <div className="flex items-center gap-2.5 min-w-0">
            {!hideMobileMenu && (
              <button
                type="button"
                onClick={onMenuToggle}
                aria-label={mobileMenuOpen ? 'Tutup menu navigasi' : 'Buka menu navigasi'}
                aria-expanded={Boolean(mobileMenuOpen)}
                className="xl:hidden h-10 px-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)] flex items-center justify-center gap-1.5 transition-colors shrink-0 cursor-pointer btn-tactile"
              >
                {mobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
                <span className="text-xs font-semibold hidden sm:inline xl:hidden">Menu</span>
              </button>
            )}

            <div className="min-w-0">
              {pageGroup && (
                <div className="text-xs font-medium text-[var(--text-muted)] leading-none mb-1 truncate">
                  {pageGroup.replace(/^\d+\.\s*/, '')}
                </div>
              )}
              <h1 className="font-bold text-base sm:text-lg tracking-tight text-[var(--text-primary)] truncate leading-tight">
                {pageTitle}
              </h1>
              {pageSubtitle && !pageGroup && (
                <p className="text-xs text-[var(--text-muted)] truncate hidden sm:block">
                  {pageSubtitle}
                </p>
              )}
            </div>
          </div>

          {/* Right: Clean, minimal controls (Search, Theme Toggle, Refresh, Profile Menu with the ONLY Logout button) */}
          <div className="flex items-center gap-2 shrink-0">
            {pendingCount > 0 && (
              <button
                type="button"
                onClick={onSync}
                disabled={isSyncing}
                className="flex items-center gap-1.5 text-xs font-semibold bg-[var(--status-draft-bg)] border border-[var(--status-draft-border)] text-[var(--status-draft-text)] px-3 py-1.5 rounded-xl hover:opacity-90 transition-opacity cursor-pointer"
                title="Sinkronkan data offline"
              >
                {isSyncing ? 'Menyinkronkan...' : `${pendingCount} Belum Sinkron`}
              </button>
            )}

            {/* Quick Search (Ctrl+K) */}
            {!isMasterSuper && modules.length > 1 && onSelectModule && (
              <button
                type="button"
                onClick={() => {
                  setJumpQuery('');
                  setShowQuickJump(true);
                }}
                aria-label="Cari halaman atau menu (Ctrl+K)"
                className="hidden sm:flex items-center gap-2 px-3 h-10 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs sm:text-sm font-medium transition-colors cursor-pointer"
              >
                <Search size={15} className="text-[var(--text-muted)]" aria-hidden="true" />
                <span>Cari menu...</span>
                <kbd className="hidden lg:inline-flex items-center px-1.5 py-0.5 text-[11px] font-mono text-[var(--text-muted)] bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded">
                  Ctrl K
                </kbd>
              </button>
            )}

            {/* Theme Quick Toggle (Light / Dark) */}
            <button
              type="button"
              onClick={cycleTheme}
              aria-label={`Ubah tampilan tema (saat ini ${resolvedTheme === 'dark' ? 'Gelap' : 'Terang'})`}
              title={`Tema: ${resolvedTheme === 'dark' ? 'Gelap' : 'Terang'} (Klik untuk mengganti)`}
              className="h-10 px-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center gap-1.5 text-xs sm:text-sm font-medium transition-colors cursor-pointer btn-tactile"
            >
              {resolvedTheme === 'dark' ? (
                <Moon size={16} aria-hidden="true" />
              ) : (
                <Sun size={16} aria-hidden="true" />
              )}
              <span className="hidden md:inline">
                {resolvedTheme === 'dark' ? 'Gelap' : 'Terang'}
              </span>
            </button>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={handleRefreshClick}
              aria-label="Muat ulang data"
              title="Muat ulang data halaman ini"
              className="w-10 h-10 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center transition-colors cursor-pointer btn-tactile"
            >
              <RefreshCw
                size={16}
                className={refreshSpin ? 'animate-spin text-[var(--accent-text)]' : ''}
                aria-hidden="true"
              />
            </button>

            {/* Profile Dropdown Menu (Contains the SINGLE Logout button) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setProfileMenuOpen(v => !v)}
                aria-expanded={profileMenuOpen}
                aria-haspopup="menu"
                aria-label="Menu Akun dan Pengaturan"
                className="flex items-center gap-2 px-2.5 sm:px-3 h-10 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-xs sm:text-sm font-semibold transition-colors cursor-pointer btn-tactile"
              >
                <div className="w-6 h-6 rounded-full bg-[var(--accent-glow)] text-[var(--accent-text)] flex items-center justify-center text-xs font-bold shrink-0">
                  {userInitial}
                </div>
                <span className="max-w-[90px] sm:max-w-[140px] truncate hidden sm:inline-block">
                  {currentUser.name}
                </span>
                <ChevronDown size={14} className="text-[var(--text-muted)]" aria-hidden="true" />
              </button>

              {profileMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setProfileMenuOpen(false)}
                    aria-hidden="true"
                  />
                  <div
                    role="menu"
                    aria-label="Menu Akun"
                    className="absolute right-0 mt-2 w-72 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-xl z-50 p-3 space-y-2 text-[var(--text-primary)]"
                  >
                    {/* User Identity */}
                    <div className="p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)]">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-sm text-[var(--text-primary)] truncate">
                          {currentUser.name}
                        </span>
                        {!isMasterSuper && (
                          <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-[var(--status-completed-bg)] text-[var(--status-completed-text)] border border-[var(--status-completed-border)] shrink-0">
                            {ROLE_BADGE_LABELS[currentUser.role] ?? currentUser.role}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">
                        {currentUser.email}
                      </p>
                    </div>

                    {/* Theme Selector (Terang / Gelap / Sistem) */}
                    <div className="p-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] space-y-2">
                      <span className="block text-xs font-semibold text-[var(--text-secondary)]">
                        Mode Tampilan
                      </span>
                      <div className="grid grid-cols-3 gap-1.5" role="group" aria-label="Pilih mode tampilan">
                        {themeOptions.map(opt => {
                          const isSelected = theme === opt.value;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              role="menuitemradio"
                              aria-checked={isSelected}
                              onClick={() => setTheme(opt.value)}
                              className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                                isSelected
                                  ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                                  : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
                              }`}
                            >
                              {opt.value === 'light' && <Sun size={13} aria-hidden="true" />}
                              {opt.value === 'dark' && <Moon size={13} aria-hidden="true" />}
                              {opt.value === 'system' && <Monitor size={13} aria-hidden="true" />}
                              <span>{opt.shortLabel}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {!isMasterSuper && (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setProfileMenuOpen(false);
                          setShowGuidebook(true);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
                      >
                        <BookOpen size={16} className="text-[var(--text-muted)]" aria-hidden="true" />
                        <span>Panduan Penggunaan</span>
                      </button>
                    )}

                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        setShowChangePassword(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
                    >
                      <KeyRound size={16} className="text-[var(--text-muted)]" aria-hidden="true" />
                      <span>Ubah Kata Sandi</span>
                    </button>

                    <div className="pt-1 border-t border-[var(--border-subtle)]">
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setProfileMenuOpen(false);
                          onLogout();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-[var(--status-flagged-text)] hover:bg-[var(--status-flagged-bg)] transition-colors cursor-pointer"
                      >
                        <LogOut size={16} aria-hidden="true" />
                        <span>Keluar</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Modal Quick Jump / Command Palette (Ctrl+K) */}
      {showQuickJump && onSelectModule && (
        <div
          className="fixed inset-0 z-[95] bg-black/50 backdrop-blur-[2px] flex items-start justify-center pt-14 sm:pt-20 p-4 modal-overlay-in"
          onClick={() => setShowQuickJump(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Pencarian cepat menu"
        >
          <div
            className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-subtle)] max-w-lg w-full shadow-2xl overflow-hidden modal-card-in text-[var(--text-primary)]"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-3.5 border-b border-[var(--border-subtle)] flex items-center gap-2.5 bg-[var(--bg-primary)]">
              <Search size={16} className="text-[var(--text-muted)] shrink-0 ml-1" aria-hidden="true" />
              <input
                autoFocus
                value={jumpQuery}
                onChange={e => setJumpQuery(e.target.value)}
                aria-label="Ketik nama menu"
                placeholder="Cari menu (contoh: Dashboard, Penawaran, Gudang, SPK)..."
                className="w-full bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowQuickJump(false)}
                className="px-2 py-1 rounded text-xs font-semibold text-[var(--text-muted)] bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                Tutup
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-2 space-y-1">
              {filteredModules.length === 0 ? (
                <div className="py-8 text-center text-sm text-[var(--text-muted)]">
                  Menu &ldquo;{jumpQuery}&rdquo; tidak ditemukan.
                </div>
              ) : (
                filteredModules.map(m => {
                  const isCurrent = m.id === activeModuleId;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        onSelectModule(m.id);
                        setShowQuickJump(false);
                      }}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-left transition-colors cursor-pointer ${
                        isCurrent
                          ? 'bg-[var(--accent-glow)] text-[var(--accent-text)] font-bold'
                          : 'hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)]'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-semibold truncate">{m.label}</div>
                        {m.group && (
                          <div className="text-xs text-[var(--text-muted)] truncate">
                            {m.group.replace(/^\d+\.\s*/, '')}
                          </div>
                        )}
                      </div>
                      <span className="text-xs font-semibold text-[var(--text-muted)] flex items-center gap-1 shrink-0">
                        {isCurrent ? 'Aktif' : 'Buka'}
                        <ChevronRight size={14} aria-hidden="true" />
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Panduan Alur Kerja */}
      <RoleGuidebookModal isOpen={showGuidebook} onClose={() => setShowGuidebook(false)} />

      {showChangePassword && (
        <ChangePasswordModal onClose={() => setShowChangePassword(false)} />
      )}
    </>
  );
};
