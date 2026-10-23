import React, { useState, useEffect, useMemo } from 'react';
import { AppUser } from '@/entities/types';
import {
  Menu, X, BookOpen, RefreshCw, Bell, KeyRound, LogOut,
  CheckCircle2, FileText, ShieldCheck, Wrench, Search, ChevronRight, Command,
} from 'lucide-react';
import { ChangePasswordModal } from '../auth/ChangePasswordModal';

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
  SUPERADMIN: 'DIREKTUR',
  ADMIN: 'ADMIN',
  TEKNISI_LAPANGAN: 'TEKNISI',
  MARKETING: 'MARKETING',
  INVENTORY: 'GUDANG',
};

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onLogout,
  pageTitle = 'Automation Quotation & Fieldwork',
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

  return (
    <>
      <header className="bg-white/95 backdrop-blur-md border-b border-[#e8e5e0] text-[#2d2a26] sticky top-0 z-40 px-3 sm:px-5 py-1.5 shadow-[0_1px_2px_rgba(45,42,38,0.03)]">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-3">
          {/* Left: Hamburger Button + Breadcrumb + Dynamic Page Title */}
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            {!hideMobileMenu && (
              <button
                type="button"
                onClick={onMenuToggle}
                aria-label="Buka Navigasi Sidebar"
                title="Buka / Tutup Detail Menu Sidebar (Mobile, Tablet, & Desktop)"
                className="h-8 px-2.5 rounded-lg border border-[#e8e5e0] bg-white hover:bg-[#f5f3ef] text-[#2d2a26] flex items-center justify-center gap-1.5 shadow-2xs transition-colors shrink-0 cursor-pointer"
              >
                {mobileMenuOpen ? <X size={15} /> : <Menu size={15} />}
                <span className="text-[11px] font-bold hidden sm:inline xl:hidden">Menu</span>
              </button>
            )}

            <div className="min-w-0">
              {pageGroup && (
                <div className="flex items-center gap-1 text-[9.5px] font-bold uppercase tracking-wider text-[var(--accent)] leading-none mb-0.5 truncate">
                  <span>{pageGroup}</span>
                  <ChevronRight size={10} className="text-[#8a8580]" />
                </div>
              )}
              <h1 className="font-bold text-xs sm:text-sm md:text-base tracking-tight text-[#2d2a26] truncate leading-tight">
                {pageTitle}
              </h1>
              {pageSubtitle && !pageGroup && (
                <p className="text-[10px] text-[#8a8580] truncate hidden sm:block">
                  {pageSubtitle}
                </p>
              )}
            </div>
          </div>

          {/* Right: Quick Jump Search (Ctrl+K) + Role Badge + Guidebook + Refresh + Profile */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {pendingCount > 0 && (
              <button
                type="button"
                onClick={onSync}
                disabled={isSyncing}
                className="flex items-center gap-1 text-[11px] font-bold bg-amber-50 border border-amber-200 text-amber-800 px-2 py-1 rounded-lg hover:bg-amber-100 transition-colors"
                title="Sinkronkan antrean data offline"
              >
                {isSyncing ? 'Sync...' : `${pendingCount} Pending`}
              </button>
            )}

            {/* Quick Jump Command Palette Trigger (disembunyikan untuk Master Super Admin karena hanya punya 1 konsol SaaS) */}
            {!isMasterSuper && modules.length > 1 && onSelectModule && (
              <button
                type="button"
                onClick={() => { setJumpQuery(''); setShowQuickJump(true); }}
                title="Pencarian Cepat Fitur & Modul (Ctrl+K)"
                className="flex items-center gap-1.5 px-2.5 h-8 rounded-lg border border-[#e8e5e0] bg-[#faf9f7] hover:bg-[#f5f3ef] text-[#5a554f] hover:text-[#2d2a26] text-[11px] font-medium transition-colors cursor-pointer"
              >
                <Search size={13} className="text-[#8a8580]" />
                <span className="hidden md:inline">Cari Fitur...</span>
                <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9.5px] font-mono font-semibold text-[#8a8580] bg-white border border-[#e8e5e0] rounded">
                  Ctrl K
                </kbd>
              </button>
            )}

            {/* Badge Peran Statis (Tanpa Mode Uji) */}
            {!isMasterSuper && (
              <span className="hidden sm:inline-flex items-center px-2.5 h-8 rounded-lg bg-[#faf9f7] border border-[#e8e5e0] text-[10.5px] font-bold text-[#5a554f]">
                {ROLE_BADGE_LABELS[currentUser.role] ?? currentUser.role}
              </span>
            )}

            {/* Tombol Panduan QA (Hanya untuk pengguna perusahaan tenant) */}
            {!isMasterSuper && (
              <button
                type="button"
                onClick={() => setShowGuidebook(true)}
                title="Panduan QA & Alur Sistem"
                className="w-8 h-8 rounded-lg border border-emerald-500/70 bg-emerald-50/70 hover:bg-emerald-100/80 text-[var(--accent)] flex items-center justify-center transition-colors cursor-pointer shrink-0"
              >
                <BookOpen size={15} />
              </button>
            )}

            {/* Tombol Refresh Data */}
            <button
              type="button"
              onClick={handleRefreshClick}
              title="Muat Ulang Data Halaman Ini"
              className="w-8 h-8 rounded-lg border border-[#e8e5e0] bg-white hover:bg-[#f5f3ef] text-[#5a554f] hover:text-[#2d2a26] flex items-center justify-center transition-colors cursor-pointer shrink-0"
            >
              <RefreshCw size={14} className={refreshSpin ? 'animate-spin text-[var(--accent)]' : ''} />
            </button>

            {/* Tombol Notifikasi & Menu Profil */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setProfileMenuOpen(v => !v)}
                title="Profil Akun & Pengaturan"
                className="w-8 h-8 rounded-lg border border-[#e8e5e0] bg-white hover:bg-[#f5f3ef] text-[#5a554f] hover:text-[#2d2a26] flex items-center justify-center transition-colors cursor-pointer relative shrink-0"
              >
                <Bell size={15} />
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-rose-500 ring-1 ring-white" />
              </button>

              {profileMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setProfileMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-68 rounded-2xl bg-white border border-[#e8e5e0] shadow-xl z-50 p-3 space-y-2">
                    <div className="p-2.5 rounded-xl bg-[#faf9f7] border border-[#e8e5e0]">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-xs text-[#2d2a26] truncate">{currentUser.name}</span>
                        {!isMasterSuper && (
                          <span className="px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-emerald-100 text-emerald-800">
                            {ROLE_BADGE_LABELS[currentUser.role] ?? currentUser.role}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#8a8580] truncate mt-0.5">{currentUser.email}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        setShowChangePassword(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#2d2a26] hover:bg-[#f5f3ef] transition-colors cursor-pointer"
                    >
                      <KeyRound size={14} className="text-[#8a8580]" /> Ubah Password Akun
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        onLogout();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                    >
                      <LogOut size={14} className="text-rose-600" /> Keluar dari Sesi (Logout)
                    </button>
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
          className="fixed inset-0 z-[95] bg-black/45 backdrop-blur-[2px] flex items-start justify-center pt-14 sm:pt-20 p-4 modal-overlay-in"
          onClick={() => setShowQuickJump(false)}
        >
          <div
            className="bg-white rounded-2xl border border-[#e8e5e0] max-w-lg w-full shadow-2xl overflow-hidden modal-card-in"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-3 border-b border-[#e8e5e0] flex items-center gap-2.5 bg-[#faf9f7]">
              <Search size={16} className="text-[var(--accent)] shrink-0 ml-1" />
              <input
                autoFocus
                value={jumpQuery}
                onChange={e => setJumpQuery(e.target.value)}
                placeholder="Ketik nama menu atau fitur (mis: Penawaran, Gudang, SPK, GPS, Garansi)..."
                className="w-full bg-transparent text-xs sm:text-sm text-[#2d2a26] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowQuickJump(false)}
                className="px-2 py-0.5 rounded text-[10px] font-bold text-[#8a8580] bg-white border border-[#e8e5e0] hover:text-[#2d2a26]"
              >
                ESC
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-2 space-y-1">
              {filteredModules.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#8a8580]">
                  Tidak ada modul yang cocok dengan &ldquo;{jumpQuery}&rdquo;.
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
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-colors cursor-pointer ${
                        isCurrent
                          ? 'bg-[var(--accent-glow)] text-[var(--accent)] font-bold'
                          : 'hover:bg-[#f5f3ef] text-[#2d2a26]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-[var(--accent)] shrink-0">{m.icon}</span>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold truncate">{m.label}</div>
                          {m.group && (
                            <div className="text-[10px] text-[#8a8580] truncate">{m.group}</div>
                          )}
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold text-[#8a8580] flex items-center gap-1 shrink-0">
                        {isCurrent ? 'Sedang Aktif' : 'Buka'} <ChevronRight size={12} />
                      </span>
                    </button>
                  );
                })
              )}
            </div>

            <div className="px-3.5 py-2 border-t border-[#e8e5e0] bg-[#faf9f7] flex items-center justify-between text-[10px] text-[#8a8580]">
              <span className="flex items-center gap-1">
                <Command size={11} /> Tekan <b>Ctrl + K</b> kapan saja untuk berpindah modul secara instan
              </span>
              <span>{filteredModules.length} modul tersedia</span>
            </div>
          </div>
        </div>
      )}

      {/* Modal Panduan QA & Alur Kerja Sistem */}
      {showGuidebook && (
        <div
          className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-[2px] flex items-center justify-center p-4 modal-overlay-in"
          onClick={() => setShowGuidebook(false)}
        >
          <div
            className="bg-white rounded-2xl border border-[#e8e5e0] max-w-2xl w-full max-h-[85vh] overflow-y-auto p-5 sm:p-6 shadow-2xl space-y-4 modal-card-in"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-[#e8e5e0] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-[var(--accent)] flex items-center justify-center shrink-0">
                  <BookOpen size={18} />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-extrabold text-[#2d2a26]">
                    Panduan QA &amp; Alur Sistem — FieldWork
                  </h2>
                  <p className="text-xs text-[#5a554f]">
                    Ringkasan grup modul, alur penawaran 2 tahap (GP-DRF &rarr; GP/AR/PH), dan tips navigasi cepat.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuidebook(false)}
                className="w-8 h-8 rounded-lg border border-[#e8e5e0] flex items-center justify-center text-[#5a554f] hover:bg-[#f5f3ef]"
              >
                <X size={15} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-[#faf9f7] border border-[#e8e5e0] space-y-1.5">
                <div className="font-bold text-[var(--accent)] flex items-center gap-1.5">
                  <FileText size={14} /> 1. Grup Penawaran &amp; CRM
                </div>
                <p className="text-[#5a554f] leading-relaxed">
                  Surveyor menginput ukuran/rumus volume lapangan &rarr; terbit nomor draft <b>GP-DRF</b>. Jika klien negosiasi, Admin menyesuaikan garansi atau diskon di panel <b>Adjust</b>, lalu klik <b>Approve</b> untuk menerbitkan nomor resmi tanpa kode DRF.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#faf9f7] border border-[#e8e5e0] space-y-1.5">
                <div className="font-bold text-[var(--accent)] flex items-center gap-1.5">
                  <ShieldCheck size={14} /> 2. Grup Operasional Lapangan
                </div>
                <p className="text-[#5a554f] leading-relaxed">
                  Pantau KPI pengerjaan, lokasi proyek ber-geofence, laporan foto Check-In / Check-Out teknisi beserta anggota tim, deteksi anomali spasial, serta pelacakan GPS teknisi secara langsung.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#faf9f7] border border-[#e8e5e0] space-y-1.5">
                <div className="font-bold text-[var(--accent)] flex items-center gap-1.5">
                  <Wrench size={14} /> 3. Grup Gudang &amp; Finansial
                </div>
                <p className="text-[#5a554f] leading-relaxed">
                  Kelola stok termitisida, insektisida PCO, dan estimasi chemical per ID Proyek untuk analisis untung rugi internal, pantau termin/cicilan kontrak, serta persentase performa MoM.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#faf9f7] border border-[#e8e5e0] space-y-1.5">
                <div className="font-bold text-[var(--accent)] flex items-center gap-1.5">
                  <CheckCircle2 size={14} /> 4. Tips Navigasi Cepat (UX)
                </div>
                <p className="text-[#5a554f] leading-relaxed">
                  Gunakan kapsul melayang di bawah layar (<b>Dynamic Floating Bottom Pill</b>) untuk berpindah antar sub-fitur dalam grup yang sama, atau tekan <b>Ctrl+K</b> untuk mencari modul secara instan.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-[#e8e5e0]">
              <button
                type="button"
                onClick={() => setShowGuidebook(false)}
                className="px-4 py-2 rounded-xl bg-[var(--accent)] text-white text-xs font-bold hover:bg-[var(--accent-hover)] cursor-pointer"
              >
                Mengerti, Tutup Panduan
              </button>
            </div>
          </div>
        </div>
      )}

      {showChangePassword && (
        <ChangePasswordModal onClose={() => setShowChangePassword(false)} />
      )}
    </>
  );
};
