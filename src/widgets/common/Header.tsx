import React, { useState } from 'react';
import { AppUser, UserRole } from '@/entities/types';
import { Menu, X, BookOpen, RefreshCw, Bell, Repeat, KeyRound, LogOut, CheckCircle2, FileText, ShieldCheck, Wrench } from 'lucide-react';
import { ChangePasswordModal } from '../auth/ChangePasswordModal';
import { supabase } from '@/shared/lib/supabase';

interface HeaderProps {
  hideMobileMenu?: boolean;
  currentUser: AppUser;
  onLogout: () => void;
  pageTitle?: string;
  pageSubtitle?: string;
  pendingCount?: number;
  onSync?: () => void;
  onRefresh?: () => void;
  isSyncing?: boolean;
  onMenuToggle?: () => void;
  mobileMenuOpen?: boolean;
}

const ROLE_OPTIONS: { value: UserRole; label: string; short: string }[] = [
  { value: 'ADMIN',            label: 'ADMIN — Full CMS, Negosiasi & Approve GP-APR', short: 'ADMIN' },
  { value: 'MARKETING',        label: 'MARKETING / SURVEYOR — Buat Draft GP-DRF',      short: 'SURVEYOR' },
  { value: 'TEKNISI_LAPANGAN', label: 'TEKNISI LAPANGAN — Eksekusi SPK & Check-In',    short: 'TEKNISI' },
  { value: 'INVENTORY',        label: 'INVENTORY — Gudang Chemical & Pipa',            short: 'GUDANG' },
  { value: 'SUPERADMIN',       label: 'SUPERADMIN — Multi-Cabang / Tenant',            short: 'SUPERADMIN' },
];

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onLogout,
  pageTitle = 'Automation Quotation & Fieldwork',
  pageSubtitle,
  pendingCount = 0,
  onSync,
  onRefresh,
  isSyncing,
  onMenuToggle,
  mobileMenuOpen,
  hideMobileMenu,
}) => {
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [showGuidebook, setShowGuidebook] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [switchingRole, setSwitchingRole] = useState(false);
  const [refreshSpin, setRefreshSpin] = useState(false);

  const handleRoleSwitch = async (newRole: UserRole) => {
    if (newRole === currentUser.role || switchingRole) return;
    setSwitchingRole(true);
    try {
      const { error } = await supabase.rpc('switch_my_role', { p_new_role: newRole });
      if (error) {
        alert(`Gagal mengganti role: ${error.message}`);
        setSwitchingRole(false);
        return;
      }
      window.location.href = '/';
    } catch (err) {
      console.error('Failed to switch role:', err);
      setSwitchingRole(false);
    }
  };

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
      <header className="bg-white border-b border-[#e8e5e0] text-[#2d2a26] sticky top-0 z-40 px-3 sm:px-6 py-2.5 shadow-[0_1px_2px_rgba(45,42,38,0.04)]">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
          {/* Left: Square Rounded Hamburger Button + Dynamic Page Title (Persis Barventis UI) */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
            {!hideMobileMenu && (
              <button
                type="button"
                onClick={onMenuToggle}
                aria-label="Buka Navigasi Sidebar"
                className="w-10 h-10 rounded-xl border border-[#e8e5e0] bg-white hover:bg-[#f5f3ef] text-[#2d2a26] flex items-center justify-center shadow-2xs transition-colors shrink-0 cursor-pointer"
              >
                {mobileMenuOpen ? <X size={19} /> : <Menu size={19} />}
              </button>
            )}

            <div className="min-w-0">
              <h1 className="font-extrabold text-base sm:text-lg md:text-xl tracking-tight text-[#2d2a26] truncate leading-tight">
                {pageTitle}
              </h1>
              {pageSubtitle && (
                <p className="text-[11px] text-[#8a8580] truncate hidden sm:block">
                  {pageSubtitle}
                </p>
              )}
            </div>
          </div>

          {/* Right: Barventis Action Icons (Role Switcher + Green Guidebook + Refresh + Bell/Profile) */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {pendingCount > 0 && (
              <button
                type="button"
                onClick={onSync}
                disabled={isSyncing}
                className="flex items-center gap-1 text-xs font-bold bg-amber-50 border border-amber-200 text-amber-800 px-2.5 py-2 rounded-xl hover:bg-amber-100 transition-colors"
                title="Sinkronkan antrean data offline"
              >
                {isSyncing ? 'Sync...' : `${pendingCount} Pending`}
              </button>
            )}

            {/* Quick QA Role Switcher Pill */}
            <div className="flex items-center gap-1 bg-emerald-50/80 border border-emerald-300 rounded-xl px-2 sm:px-2.5 h-10 text-xs">
              <Repeat size={13} className="text-[var(--accent)] shrink-0" />
              <span className="text-[10px] font-bold text-emerald-900 hidden lg:inline">QA Role:</span>
              <select
                value={currentUser.role}
                disabled={switchingRole}
                onChange={e => handleRoleSwitch(e.target.value as UserRole)}
                className="bg-transparent font-extrabold text-[11px] text-[var(--accent)] focus:outline-none cursor-pointer pr-0.5 max-w-[92px] sm:max-w-[140px] truncate"
                title="Ganti Role instan untuk QA (1 Akun Semua Role)"
              >
                {ROLE_OPTIONS.map(r => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Tombol Panduan QA (Ikon Buku Hijau ala Barventis) */}
            <button
              type="button"
              onClick={() => setShowGuidebook(true)}
              title="Panduan QA & Alur Sistem PT Guci Emas Pratama"
              className="w-10 h-10 rounded-xl border border-emerald-500/70 bg-emerald-50/70 hover:bg-emerald-100/80 text-[var(--accent)] flex items-center justify-center transition-colors cursor-pointer shrink-0"
            >
              <BookOpen size={18} />
            </button>

            {/* Tombol Refresh Data (Kotak Putih ala Barventis) */}
            <button
              type="button"
              onClick={handleRefreshClick}
              title="Muat Ulang Data"
              className="w-10 h-10 rounded-xl border border-[#e8e5e0] bg-white hover:bg-[#f5f3ef] text-[#5a554f] hover:text-[#2d2a26] flex items-center justify-center transition-colors cursor-pointer shrink-0"
            >
              <RefreshCw size={17} className={refreshSpin ? 'animate-spin text-[var(--accent)]' : ''} />
            </button>

            {/* Tombol Notifikasi & Menu Profil (Lonceng dengan Titik Merah ala Barventis) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setProfileMenuOpen(v => !v)}
                title="Profil Akun & Pengaturan"
                className="w-10 h-10 rounded-xl border border-[#e8e5e0] bg-white hover:bg-[#f5f3ef] text-[#5a554f] hover:text-[#2d2a26] flex items-center justify-center transition-colors cursor-pointer relative shrink-0"
              >
                <Bell size={18} />
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
              </button>

              {profileMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setProfileMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white border border-[#e8e5e0] shadow-xl z-50 p-3 space-y-2.5">
                    <div className="p-2.5 rounded-xl bg-[#faf9f7] border border-[#e8e5e0]">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-xs text-[#2d2a26] truncate">{currentUser.name}</span>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-[var(--accent-glow)] text-[var(--accent)]">
                          {currentUser.role}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#8a8580] font-mono truncate mt-0.5">{currentUser.email}</p>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-[#8a8580] px-1">
                        Pindah Role QA (1 Akun Semua Role)
                      </label>
                      <div className="grid grid-cols-1 gap-1">
                        {ROLE_OPTIONS.map(r => (
                          <button
                            key={r.value}
                            type="button"
                            disabled={switchingRole}
                            onClick={() => handleRoleSwitch(r.value)}
                            className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors ${
                              currentUser.role === r.value
                                ? 'bg-[var(--accent)] text-white'
                                : 'hover:bg-[#f5f3ef] text-[#5a554f]'
                            }`}
                          >
                            <span>{r.short}</span>
                            <span className="text-[10px] opacity-80 truncate max-w-[160px]">{r.label.split('—')[1]}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[#e8e5e0] flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setProfileMenuOpen(false);
                          setShowChangePassword(true);
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-[#e8e5e0] hover:bg-[#f5f3ef] text-xs font-semibold text-[#5a554f]"
                      >
                        <KeyRound size={14} /> Ubah Sandi
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setProfileMenuOpen(false);
                          onLogout();
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-xs font-semibold text-rose-700"
                      >
                        <LogOut size={14} /> Keluar
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Modal Panduan QA & Alur Sistem (Terbuka saat klik tombol Buku Hijau di Header) */}
      {showGuidebook && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#e8e5e0] shadow-2xl max-w-2xl w-full max-h-[88vh] flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-[#e8e5e0] flex items-center justify-between bg-[#faf9f7]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-[var(--accent)] flex items-center justify-center">
                  <BookOpen size={18} />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-[#2d2a26]">Panduan QA & Alur Sistem — PT Guci Emas Pratama</h3>
                  <p className="text-xs text-[#8a8580]">Urutan pengujian fitur berdasarkan 4 Grup Menu di Sidebar</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuidebook(false)}
                className="w-8 h-8 rounded-lg border border-[#e8e5e0] bg-white flex items-center justify-center text-[#5a554f] hover:bg-[#f5f3ef]"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs sm:text-sm text-[#5a554f]">
              <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-1.5">
                <div className="font-bold text-emerald-950 flex items-center gap-1.5">
                  <FileText size={16} className="text-[var(--accent)]" />
                  Grup 1: Quotation &amp; CRM (Fokus Utama Automation Quotation)
                </div>
                <ul className="list-disc pl-5 space-y-1 text-xs text-emerald-900">
                  <li><strong>Tab Input Survey (Buat GP-DRF)</strong>: Pilih layanan <code>AR</code> (Anti Rayap) atau <code>PCO</code> (Pest Control), pilih item pekerjaan (satuan otomatis terisi), ketik rumus volume seperti <code>37+37+5,5+9+6+5</code>, pilih Garansi (Preset atau Custom Bulan/Tahun), lalu simpan sebagai <strong>Draft <code>GP-DRF</code></strong>.</li>
                  <li><strong>Panel Adjust Negosiasi &amp; Approve (GP-APR)</strong>: Pada tab <em>Daftar &amp; Verifikasi</em>, klik tombol <strong>Adjust / Edit</strong> pada draft <code>GP-DRF/AR/PH/2026/10/0001</code> (Bank Victoria). Coba ubah garansi dari 3 Tahun ke 1 Tahun atau 6 Bulan, klik <em>Simpan Revisi Draft (Update GP-DRF)</em>, lalu klik <strong>Approve &amp; Terbitkan GP-APR</strong> untuk mengunduh Vector PDF resmi.</li>
                </ul>
              </div>

              <div className="p-3.5 rounded-xl bg-[#faf9f7] border border-[#e8e5e0] space-y-1.5">
                <div className="font-bold text-[#2d2a26] flex items-center gap-1.5">
                  <ShieldCheck size={16} className="text-[var(--accent)]" />
                  Grup 2: Operasional Lapangan (SPK &amp; Fieldwork Teknisi)
                </div>
                <ul className="list-disc pl-5 space-y-1 text-xs">
                  <li>Dari penawaran yang sudah <em>Approved / Deal</em>, buka menu <strong>Manajemen SPK</strong> untuk menugaskan Teknisi Lapangan.</li>
                  <li>Gunakan dropdown <strong>QA Role</strong> di pojok kanan atas Header dan pilih <strong><code>TEKNISI_LAPANGAN</code></strong> untuk melihat layar aplikasi mobile Teknisi (Check-In GPS, Upload Foto Before/After, dan Input Pemakaian Chemical).</li>
                </ul>
              </div>

              <div className="p-3.5 rounded-xl bg-[#faf9f7] border border-[#e8e5e0] space-y-1.5">
                <div className="font-bold text-[#2d2a26] flex items-center gap-1.5">
                  <Wrench size={16} className="text-[var(--accent)]" />
                  Grup 3 &amp; 4: Gudang Chemical, Keuangan &amp; Kop Surat PDF
                </div>
                <ul className="list-disc pl-5 space-y-1 text-xs">
                  <li><strong>Gudang &amp; Stok Obat</strong>: Pantau dan catat mutasi masuk/keluar stok <em>Cypergard 100 EC</em>, <em>Safe 1 200 SL</em>, <em>Demand CS</em>, <em>Klerat</em>, dan pipa PVC.</li>
                  <li><strong>Kop Surat &amp; Template PDF</strong>: Atur identitas kantor pusat Ciputat, cabang Sidoarjo, nama penandatangan Direktur Utama, serta kustomisasi teks pembuka/penutup PDF.</li>
                </ul>
              </div>
            </div>

            <div className="px-5 py-3 border-t border-[#e8e5e0] bg-[#faf9f7] flex justify-end">
              <button
                type="button"
                onClick={() => setShowGuidebook(false)}
                className="px-4 py-2 rounded-xl bg-[var(--accent)] text-white text-xs font-bold hover:opacity-95 flex items-center gap-1.5"
              >
                <CheckCircle2 size={15} /> Mengerti, Mulai QA
              </button>
            </div>
          </div>
        </div>
      )}

      {showChangePassword && <ChangePasswordModal onClose={() => setShowChangePassword(false)} />}
    </>
  );
};
