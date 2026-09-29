/**
 * ERP PEST CONTROL — SISTEM NOMOR SURAT + PROFIL MARKETING
 *
 * Features:
 * 1. Profil Marketing: nama, nomor WA, jabatan — bisa diedit, muncul di PDF
 * 2. Nomor Surat otomatis dengan format berbeda:
 *    - Anti Rayap Umum:     GP-AR/U/YYYY/MM/XXXX
 *    - Anti Rayap Kontrak:  GP-AR/K/YYYY/MM/XXXX
 *    - Pest Control Umum:   GP-PCO/U/YYYY/MM/XXXX
 *    - Pest Control Kontrak:GP-PCO/K/YYYY/MM/XXXX
 * 3. Log historis semua nomor surat yang pernah dibuat
 * 4. Role-based: SA & Admin lihat semua, Marketing hanya milik sendiri
 */

import { useState, useCallback } from "react";

// ─── SEED DATA ─────────────────────────────────────────────────────────────────

const INITIAL_USERS = [
  {
    uid: "u1", name: "Budi Hartono",    role: "super_admin",
    email: "super@erp.com", wa: "0811-0000-0001", jabatan: "System Administrator", avatar: "BH",
  },
  {
    uid: "u2", name: "Dewi Kusuma",     role: "administrator",
    email: "dewi@guciemas.co.id", wa: "0811-0000-0002", jabatan: "Administrator", avatar: "DK",
  },
  {
    uid: "u3", name: "Riko Pratama",    role: "admin_ops",
    email: "riko@guciemas.co.id", wa: "0811-0000-0003", jabatan: "Admin Operasional", avatar: "RP",
  },
  {
    uid: "u4", name: "Siti Rahayu",     role: "marketing",
    email: "siti@guciemas.co.id", wa: "0852-1234-5678", jabatan: "Marketing Executive", avatar: "SR",
  },
  {
    uid: "u5", name: "Andi Firmansyah", role: "marketing",
    email: "andi@guciemas.co.id", wa: "0813-8765-4321", jabatan: "Marketing Executive", avatar: "AF",
  },
  {
    uid: "u6", name: "Jono Prasetyo",   role: "marketing",
    email: "jono@guciemas.co.id", wa: "0852-8747-5522", jabatan: "Senior Marketing", avatar: "JP",
  },
];

// Tipe layanan & kode surat
const LAYANAN_CONFIG = {
  // Anti Rayap
  anti_rayap_injeksi:    { label: "Anti Rayap — Injeksi",        kategori: "AR",  perihal: "Penawaran Harga Anti Rayap" },
  anti_rayap_pipanisasi: { label: "Anti Rayap — Pipanisasi",      kategori: "AR",  perihal: "Penawaran Harga Anti Rayap Pra-Konstruksi" },
  anti_rayap_baiting:    { label: "Anti Rayap — Baiting System",  kategori: "AR",  perihal: "Penawaran Harga Anti Rayap" },
  anti_rayap_pra:        { label: "Anti Rayap — Pra-Konstruksi",  kategori: "AR",  perihal: "Penawaran Harga Anti Rayap Pra-Konstruksi" },
  anti_rayap_soil:       { label: "Anti Rayap — Soil Poisoning",  kategori: "AR",  perihal: "Penawaran Harga Anti Rayap" },
  // Pest Control
  pest_spraying:         { label: "Pest Control — Spraying",      kategori: "PCO", perihal: "Penawaran Harga Pest Control" },
  pest_fogging:          { label: "Pest Control — Fogging/ULV",   kategori: "PCO", perihal: "Penawaran Harga Pest Control (Fogging)" },
  pest_rodent:           { label: "Pest Control — Rodent Control",kategori: "PCO", perihal: "Penawaran Harga Rodent Control" },
  pest_baiting:          { label: "Pest Control — Baiting",       kategori: "PCO", perihal: "Penawaran Harga Pest Control" },
  pest_fumigasi:         { label: "Pest Control — Fumigasi",      kategori: "PCO", perihal: "Penawaran Harga Fumigasi" },
  pest_umum:             { label: "Pest Control — General",       kategori: "PCO", perihal: "Penawaran Harga Jasa Pengendalian Hama" },
};

// Generate nomor surat
// Format: GP-{kategori}/{tipe}/YYYY/MM/XXXX
// kategori: AR | PCO
// tipe: U (umum) | K (kontrak)
function genNomor(kategori, tipe, seq) {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const xxxx = String(seq).padStart(4, "0");
  return `GP-${kategori}/${tipe}/${yyyy}/${mm}/${xxxx}`;
}

// Seed log — historis nomor surat
const SEED_LOG = [
  { id: "l01", noSurat: "GP-AR/U/2026/01/0001",  layanan: "anti_rayap_injeksi", tipe: "U", seq: 1,  byId: "u6", byName: "Jono Prasetyo",   kepada: "PT Intertek SAI Global Indonesia", total: 18000000, status: "approved", tanggal: "2026-01-02", quoId: "q01" },
  { id: "l02", noSurat: "GP-PCO/U/2026/01/0002", layanan: "pest_spraying",      tipe: "U", seq: 2,  byId: "u4", byName: "Siti Rahayu",     kepada: "Bapak Yulianto",                  total: 5910000,  status: "approved", tanggal: "2026-01-03", quoId: "q02" },
  { id: "l03", noSurat: "GP-AR/U/2026/01/0003",  layanan: "anti_rayap_injeksi", tipe: "U", seq: 3,  byId: "u6", byName: "Jono Prasetyo",   kepada: "PT PLN UP3 Bulungan",             total: 21312000, status: "approved", tanggal: "2026-01-05", quoId: "q03" },
  { id: "l04", noSurat: "GP-AR/U/2026/01/0004",  layanan: "anti_rayap_pra",     tipe: "U", seq: 4,  byId: "u5", byName: "Andi Firmansyah", kepada: "PT Oreka Solusi Kreatif",         total: 14737500, status: "approved", tanggal: "2026-01-05", quoId: "q04" },
  { id: "l05", noSurat: "GP-PCO/K/2026/01/0005", layanan: "pest_umum",          tipe: "K", seq: 5,  byId: "u4", byName: "Siti Rahayu",     kepada: "RSUD Pondok Aren",                total: 9995440,  status: "approved", tanggal: "2026-01-07", quoId: "q05" },
  { id: "l06", noSurat: "GP-AR/U/2026/01/0006",  layanan: "anti_rayap_baiting", tipe: "U", seq: 6,  byId: "u6", byName: "Jono Prasetyo",   kepada: "Bpk. Paulus Arifin",              total: 8500000,  status: "rejected",  tanggal: "2026-01-04", quoId: "q06" },
  { id: "l07", noSurat: "GP-PCO/K/2026/01/0007", layanan: "pest_spraying",      tipe: "K", seq: 7,  byId: "u4", byName: "Siti Rahayu",     kepada: "PT PLN UP3 Kramat Jati",          total: 18000000, status: "approved", tanggal: "2026-01-05", quoId: "q07" },
  { id: "l08", noSurat: "GP-PCO/U/2026/01/0008", layanan: "pest_rodent",        tipe: "U", seq: 8,  byId: "u5", byName: "Andi Firmansyah", kepada: "Ibu Maureen Regina",               total: 3500000,  status: "approved", tanggal: "2026-01-06", quoId: "q08" },
  { id: "l09", noSurat: "GP-PCO/U/2026/01/0009", layanan: "pest_rodent",        tipe: "U", seq: 9,  byId: "u6", byName: "Jono Prasetyo",   kepada: "UPTD Puskesmas Pisangan",         total: 2250000,  status: "pending",   tanggal: "2026-01-06", quoId: "q09" },
  { id: "l10", noSurat: "GP-AR/K/2026/01/0010",  layanan: "anti_rayap_injeksi", tipe: "K", seq: 10, byId: "u4", byName: "Siti Rahayu",     kepada: "PT Topindo Atlas Asia",           total: 76381250, status: "approved", tanggal: "2026-01-12", quoId: "q10" },
  { id: "l11", noSurat: "GP-PCO/K/2026/02/0001", layanan: "pest_fogging",       tipe: "K", seq: 1,  byId: "u5", byName: "Andi Firmansyah", kepada: "Bank Victoria KCU Cideng",        total: 14400000, status: "approved", tanggal: "2026-02-12", quoId: "q11" },
  { id: "l12", noSurat: "GP-PCO/U/2026/02/0002", layanan: "pest_fogging",       tipe: "U", seq: 2,  byId: "u6", byName: "Jono Prasetyo",   kepada: "Ibu Dita - Dharmawangsa",         total: 550000,   status: "approved", tanggal: "2026-02-07", quoId: "q12" },
  { id: "l13", noSurat: "GP-AR/U/2026/03/0001",  layanan: "anti_rayap_injeksi", tipe: "U", seq: 1,  byId: "u6", byName: "Jono Prasetyo",   kepada: "PT Rayovac Battery Indonesia",    total: 36000000, status: "pending",   tanggal: "2026-03-01", quoId: "q13" },
  { id: "l14", noSurat: "GP-PCO/U/2026/03/0002", layanan: "pest_umum",          tipe: "U", seq: 2,  byId: "u4", byName: "Siti Rahayu",     kepada: "Hotel Nusantara",                 total: 12000000, status: "draft",     tanggal: "2026-03-03", quoId: "q14" },
];

const ROLE_LABELS = { super_admin: "Super Admin", administrator: "Administrator", admin_ops: "Admin Ops", marketing: "Marketing" };
const ROLE_STYLE  = {
  super_admin:   { bg: "#fee2e2", text: "#dc2626" },
  administrator: { bg: "#dbeafe", text: "#1d4ed8" },
  admin_ops:     { bg: "#dcfce7", text: "#15803d" },
  marketing:     { bg: "#ede9fe", text: "#6d28d9" },
};

const IDR = n => n ? "Rp " + Math.round(n).toLocaleString("id-ID") : "—";
const DATE_ID = d => d ? new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "—";

// ─── STATUS ────────────────────────────────────────────────────────────────────

const STATUS_CFG = {
  draft:    { bg: "#f1f5f9", text: "#64748b", dot: "#94a3b8", label: "Draft" },
  pending:  { bg: "#fef3c7", text: "#92400e", dot: "#f59e0b", label: "Menunggu" },
  approved: { bg: "#dcfce7", text: "#14532d", dot: "#16a34a", label: "Disetujui" },
  rejected: { bg: "#fee2e2", text: "#991b1b", dot: "#ef4444", label: "Ditolak" },
};

// ─── COLORS ────────────────────────────────────────────────────────────────────

const C = {
  bg: "#f8fafc", white: "#fff", border: "#e2e8f0",
  text: "#0f172a", muted: "#64748b", subtle: "#94a3b8",
  primary: "#1d4ed8", primaryLight: "#eff6ff", primaryBorder: "#bfdbfe",
  success: "#15803d", successLight: "#f0fdf4", successBorder: "#86efac",
  warning: "#b45309", warningLight: "#fefce8", warningBorder: "#fde068",
  danger:  "#dc2626", dangerLight: "#fef2f2",  dangerBorder: "#fca5a5",
  ar:   "#7c3aed",  arLight: "#ede9fe",   // Anti Rayap — purple
  pco:  "#0891b2",  pcoLight: "#ecfeff",  // Pest Control — cyan
  green: "#15803d", greenLight: "#f0fdf4",
};

// ─── UI ────────────────────────────────────────────────────────────────────────

const inputBase = { width: "100%", padding: "9px 12px", fontSize: 14, border: `1.5px solid ${C.border}`, borderRadius: 8, background: C.white, color: C.text, fontFamily: "inherit", outline: "none", boxSizing: "border-box" };
const labelBase = { display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: C.muted, marginBottom: 5 };

function Btn({ children, onClick, variant = "primary", sm, disabled, block, style }) {
  const v = { primary: { bg: C.primary, text: "#fff", border: C.primary }, secondary: { bg: "#f1f5f9", text: C.muted, border: C.border }, success: { bg: C.success, text: "#fff", border: C.success }, danger: { bg: C.danger, text: "#fff", border: C.danger }, ghost: { bg: "transparent", text: C.muted, border: "transparent" }, outline: { bg: C.white, text: C.primary, border: C.primaryBorder }, ar: { bg: C.ar, text: "#fff", border: C.ar }, pco: { bg: C.pco, text: "#fff", border: C.pco } }[variant] || {};
  return <button onClick={onClick} disabled={disabled} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: sm ? "6px 13px" : "9px 18px", fontSize: sm ? 12 : 14, fontWeight: 600, borderRadius: 8, border: `1.5px solid ${v.border}`, background: v.bg, color: v.text, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.45 : 1, fontFamily: "inherit", transition: "opacity .15s", width: block ? "100%" : "auto", justifyContent: "center", whiteSpace: "nowrap", ...style }}>{children}</button>;
}

function Badge({ status }) {
  const c = STATUS_CFG[status] || STATUS_CFG.draft;
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 100, fontSize: 11, fontWeight: 700, background: c.bg, color: c.text }}><span style={{ width: 5, height: 5, borderRadius: "50%", background: c.dot }} />{c.label}</span>;
}

function KategoriBadge({ kategori }) {
  const isAR = kategori === "AR";
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 9px", borderRadius: 6, fontSize: 11, fontWeight: 800, background: isAR ? C.arLight : C.pcoLight, color: isAR ? C.ar : C.pco, letterSpacing: "0.04em" }}>{isAR ? "🛡 AR" : "🦟 PCO"}</span>;
}

function TipeBadge({ tipe }) {
  return <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 800, background: tipe === "K" ? "#fef3c7" : "#f1f5f9", color: tipe === "K" ? "#92400e" : C.muted, letterSpacing: "0.05em" }}>{tipe === "K" ? "KONTRAK" : "UMUM"}</span>;
}

function Modal({ open, onClose, title, children, width = 560 }) {
  if (!open) return null;
  return <div style={{ position: "fixed", inset: 0, zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
    <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,.55)", backdropFilter: "blur(5px)" }} />
    <div style={{ position: "relative", background: C.white, borderRadius: 18, width: "100%", maxWidth: width, maxHeight: "93vh", overflowY: "auto", boxShadow: "0 32px 80px rgba(0,0,0,.22)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px", borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, background: C.white, borderRadius: "18px 18px 0 0", zIndex: 10 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: C.text }}>{title}</h2>
        <button onClick={onClose} style={{ background: "#f1f5f9", border: "none", borderRadius: 7, width: 30, height: 30, cursor: "pointer", fontSize: 14, color: C.muted, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
      </div>
      <div style={{ padding: "22px 24px" }}>{children}</div>
    </div>
  </div>;
}

function Callout({ type = "info", children }) {
  const m = { info: { bg: C.primaryLight, border: C.primaryBorder, text: "#1e40af" }, success: { bg: C.successLight, border: C.successBorder, text: "#14532d" }, warning: { bg: C.warningLight, border: C.warningBorder, text: "#854d0e" }, danger: { bg: C.dangerLight, border: C.dangerBorder, text: "#991b1b" } }[type];
  return <div style={{ background: m.bg, border: `1px solid ${m.border}`, borderRadius: 10, padding: "11px 15px", marginBottom: 14, fontSize: 13, color: m.text, lineHeight: 1.5 }}>{children}</div>;
}

// ─── AVATAR ────────────────────────────────────────────────────────────────────

function Avatar({ user, size = 40 }) {
  const colors = { super_admin: ["#fecaca","#991b1b"], administrator: ["#bfdbfe","#1d4ed8"], admin_ops: ["#bbf7d0","#15803d"], marketing: ["#ddd6fe","#6d28d9"] };
  const [bg, fg] = colors[user.role] || ["#e2e8f0","#64748b"];
  return <div style={{ width: size, height: size, borderRadius: "50%", background: bg, color: fg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.38, fontWeight: 800, flexShrink: 0, border: `2px solid ${C.white}`, boxShadow: "0 0 0 1.5px #e2e8f0" }}>{user.avatar}</div>;
}

// ─── HALAMAN PROFIL ────────────────────────────────────────────────────────────

function ProfilPage({ user, onUpdate, onClose }) {
  const [form, setForm] = useState({ name: user.name, wa: user.wa, jabatan: user.jabatan, email: user.email });
  const [saved, setSaved] = useState(false);
  const [errors, setErrors] = useState({});

  const set = (k, v) => { setForm(p => ({ ...p, [k]: v })); setErrors(p => ({ ...p, [k]: "" })); setSaved(false); };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Nama tidak boleh kosong.";
    if (!form.wa.trim()) e.wa = "Nomor WA tidak boleh kosong.";
    if (form.wa && !/^[\d\-\+\s]+$/.test(form.wa)) e.wa = "Format nomor tidak valid.";
    setErrors(e);
    return !Object.keys(e).length;
  };

  const save = () => {
    if (!validate()) return;
    onUpdate(form);
    setSaved(true);
  };

  const isMarketing = user.role === "marketing";
  const rs = ROLE_STYLE[user.role] || {};

  return (
    <div>
      {/* Avatar + role */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24, padding: "18px 20px", background: C.bg, borderRadius: 12 }}>
        <Avatar user={user} size={56} />
        <div>
          <div style={{ fontSize: 17, fontWeight: 800, color: C.text, marginBottom: 4 }}>{form.name}</div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <span style={{ padding: "2px 9px", borderRadius: 100, fontSize: 10, fontWeight: 800, textTransform: "uppercase", background: rs.bg, color: rs.text }}>{ROLE_LABELS[user.role]}</span>
            <span style={{ fontSize: 12, color: C.muted }}>{form.jabatan}</span>
          </div>
        </div>
      </div>

      {isMarketing && (
        <Callout type="info">
          <strong>Info:</strong> Nama dan nomor WhatsApp kamu akan otomatis muncul di bagian bawah PDF quotation yang kamu buat.
        </Callout>
      )}

      {saved && <Callout type="success">✓ Profil berhasil disimpan!</Callout>}

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label style={labelBase}>Nama Lengkap *</label>
          <input style={{ ...inputBase, borderColor: errors.name ? C.danger : C.border }} value={form.name} onChange={e => set("name", e.target.value)} placeholder="Nama lengkap sesuai identitas" />
          {errors.name && <div style={{ fontSize: 11, color: C.danger, marginTop: 3 }}>⚠ {errors.name}</div>}
        </div>

        <div>
          <label style={labelBase}>Nomor WhatsApp / HP *</label>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 16 }}>📱</span>
            <input style={{ ...inputBase, paddingLeft: 36, borderColor: errors.wa ? C.danger : C.border }} value={form.wa} onChange={e => set("wa", e.target.value)} placeholder="0852-XXXX-XXXX" />
          </div>
          {errors.wa && <div style={{ fontSize: 11, color: C.danger, marginTop: 3 }}>⚠ {errors.wa}</div>}
          {isMarketing && <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>Nomor ini muncul di PDF quotation sebagai kontak yang bisa dihubungi klien.</div>}
        </div>

        <div>
          <label style={labelBase}>Jabatan / Title</label>
          <input style={inputBase} value={form.jabatan} onChange={e => set("jabatan", e.target.value)} placeholder="Marketing Executive, Senior Marketing, dll." />
        </div>

        <div>
          <label style={labelBase}>Email</label>
          <input style={{ ...inputBase, background: "#f8fafc", color: C.muted }} value={form.email} readOnly />
          <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>Email tidak bisa diubah. Hubungi Administrator jika perlu perubahan.</div>
        </div>
      </div>

      {/* Preview PDF footer jika marketing */}
      {isMarketing && (
        <div style={{ marginTop: 20, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
          <div style={{ padding: "8px 14px", background: C.bg, borderBottom: `1px solid ${C.border}`, fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.05em" }}>Preview di PDF Quotation</div>
          <div style={{ padding: "14px 18px", background: "#fffdf0" }}>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>Bagian penutup PDF akan terlihat seperti ini:</div>
            <div style={{ fontFamily: "serif", fontSize: 13, lineHeight: 1.8, color: C.text }}>
              <div>Hormat kami,</div>
              <div style={{ fontWeight: 700 }}>PT Guci Emas Pratama</div>
              <div style={{ margin: "16px 0 4px", borderTop: "1px solid #999", width: 160, paddingTop: 6, fontWeight: 700 }}>{form.name || "(nama kamu)"}</div>
              <div style={{ fontSize: 11, color: C.muted }}>• Kantor: (021) 74637054</div>
              {form.wa && <div style={{ fontSize: 11, color: C.muted }}>• {form.name || "(nama kamu)"}: {form.wa}</div>}
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
        <Btn variant="secondary" onClick={onClose}>Tutup</Btn>
        <Btn variant="primary" onClick={save}>💾 Simpan Profil</Btn>
      </div>
    </div>
  );
}

// ─── GENERATOR NOMOR SURAT ─────────────────────────────────────────────────────

function GenNomorPage({ user, log, onGenerate }) {
  const [layanan, setLayanan] = useState("anti_rayap_injeksi");
  const [tipe, setTipe] = useState("U");
  const [kepada, setKepada] = useState("");
  const [preview, setPreview] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [err, setErr] = useState("");

  const cfg = LAYANAN_CONFIG[layanan];
  const kategori = cfg?.kategori || "PCO";

  // Cari seq terakhir bulan ini untuk kategori + tipe
  const getNextSeq = useCallback(() => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const prefix = `GP-${kategori}/${tipe}/${yyyy}/${mm}/`;
    const relevant = log.filter(l => l.noSurat.startsWith(prefix));
    if (!relevant.length) return 1;
    const seqs = relevant.map(l => parseInt(l.noSurat.split("/").pop()) || 0);
    return Math.max(...seqs) + 1;
  }, [log, kategori, tipe]);

  const handlePreview = () => {
    if (!kepada.trim()) { setErr("Nama klien/kepada wajib diisi."); return; }
    setErr("");
    const seq = getNextSeq();
    const noSurat = genNomor(kategori, tipe, seq);
    setPreview({ noSurat, seq, kategori, tipe, layanan, kepada, perihal: cfg?.perihal });
    setConfirmed(false);
  };

  const handleConfirm = () => {
    if (!preview) return;
    onGenerate(preview);
    setPreview(null);
    setKepada("");
    setConfirmed(true);
    setTimeout(() => setConfirmed(false), 3000);
  };

  const isAR = kategori === "AR";

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: C.text, marginBottom: 4 }}>Generate Nomor Surat</h2>
        <p style={{ fontSize: 13, color: C.muted }}>Sistem akan otomatis assign nomor urut berdasarkan kategori, tipe, dan bulan berjalan.</p>
      </div>

      {confirmed && <Callout type="success">✓ Nomor surat berhasil dibuat dan tercatat di log!</Callout>}

      {/* Form */}
      <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 14, padding: "22px 24px", marginBottom: 20 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Tipe layanan */}
          <div>
            <label style={labelBase}>Jenis Layanan *</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
              {Object.entries(LAYANAN_CONFIG).map(([val, cfg]) => (
                <button key={val} onClick={() => setLayanan(val)} style={{ padding: "8px 12px", border: `1.5px solid ${layanan === val ? (cfg.kategori === "AR" ? C.ar : C.pco) : C.border}`, borderRadius: 8, background: layanan === val ? (cfg.kategori === "AR" ? C.arLight : C.pcoLight) : C.white, color: layanan === val ? (cfg.kategori === "AR" ? C.ar : C.pco) : C.muted, fontSize: 12, fontWeight: layanan === val ? 700 : 400, cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 14 }}>{cfg.kategori === "AR" ? "🛡️" : "🦟"}</span>{cfg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tipe surat */}
          <div>
            <label style={labelBase}>Tipe Surat *</label>
            <div style={{ display: "flex", gap: 8 }}>
              {[["U", "Umum", "Penawaran biasa / satu kali"], ["K", "Kontrak", "Kerjasama berkala / tahunan"]].map(([val, label, desc]) => (
                <button key={val} onClick={() => setTipe(val)} style={{ flex: 1, padding: "12px 14px", border: `1.5px solid ${tipe === val ? C.primary : C.border}`, borderRadius: 10, background: tipe === val ? C.primaryLight : C.white, cursor: "pointer", textAlign: "left" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: tipe === val ? C.primary : C.text, marginBottom: 3 }}>{label}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>{desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Kepada */}
          <div>
            <label style={labelBase}>Ditujukan Kepada *</label>
            <input style={{ ...inputBase, borderColor: err ? C.danger : C.border }} value={kepada} onChange={e => { setKepada(e.target.value); setErr(""); }} placeholder="Nama klien / perusahaan tujuan" />
            {err && <div style={{ fontSize: 11, color: C.danger, marginTop: 3 }}>⚠ {err}</div>}
          </div>

          {/* Preview nomor */}
          <div style={{ background: C.bg, borderRadius: 10, padding: "14px 18px" }}>
            <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Preview Nomor yang Akan Digenerate</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <code style={{ fontSize: 16, fontWeight: 800, color: isAR ? C.ar : C.pco, fontFamily: "DM Mono, monospace", background: isAR ? C.arLight : C.pcoLight, padding: "6px 14px", borderRadius: 8 }}>
                {genNomor(kategori, tipe, getNextSeq())}
              </code>
              <KategoriBadge kategori={kategori} />
              <TipeBadge tipe={tipe} />
            </div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 8 }}>Perihal: <em>{cfg?.perihal}</em></div>
          </div>

          <Btn variant="primary" onClick={handlePreview} block>Konfirmasi & Generate Nomor →</Btn>
        </div>
      </div>

      {/* Konfirmasi */}
      {preview && (
        <div style={{ background: C.primaryLight, border: `1.5px solid ${C.primaryBorder}`, borderRadius: 14, padding: "20px 24px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#1e40af", marginBottom: 14 }}>⚠️ Konfirmasi — Nomor ini tidak bisa diubah setelah dibuat</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
            {[["Nomor Surat", preview.noSurat], ["Kepada", preview.kepada], ["Layanan", LAYANAN_CONFIG[preview.layanan]?.label], ["Tipe", preview.tipe === "K" ? "Kontrak" : "Umum"]].map(([l, v]) => (
              <div key={l} style={{ background: "white", borderRadius: 8, padding: "9px 12px" }}>
                <div style={{ fontSize: 10, color: C.subtle, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>{l}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: l === "Nomor Surat" ? C.primary : C.text, fontFamily: l === "Nomor Surat" ? "DM Mono, monospace" : "inherit" }}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn variant="secondary" onClick={() => setPreview(null)}>Batal</Btn>
            <Btn variant="success" onClick={handleConfirm}>✓ Ya, Generate Nomor Ini</Btn>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── LOG NOMOR SURAT ───────────────────────────────────────────────────────────

function LogPage({ user, log }) {
  const [search, setSearch] = useState("");
  const [filterKat, setFilterKat] = useState("all");
  const [filterTipe, setFilterTipe] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterUser, setFilterUser] = useState("all");
  const [page, setPage] = useState(1);

  const isMarketing = user.role === "marketing";
  const canSeeAll = ["super_admin", "administrator", "admin_ops"].includes(user.role);
  const PER_PAGE = 8;

  let displayed = canSeeAll ? log : log.filter(l => l.byId === user.uid);

  if (search) displayed = displayed.filter(l =>
    l.noSurat.toLowerCase().includes(search.toLowerCase()) ||
    l.kepada.toLowerCase().includes(search.toLowerCase()) ||
    l.byName.toLowerCase().includes(search.toLowerCase())
  );
  if (filterKat !== "all") displayed = displayed.filter(l => {
    const cfg = LAYANAN_CONFIG[l.layanan];
    return cfg?.kategori === filterKat;
  });
  if (filterTipe !== "all") displayed = displayed.filter(l => l.tipe === filterTipe);
  if (filterStatus !== "all") displayed = displayed.filter(l => l.status === filterStatus);
  if (filterUser !== "all") displayed = displayed.filter(l => l.byId === filterUser);

  // Sort terbaru di atas
  displayed = [...displayed].sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));

  const totalPages = Math.ceil(displayed.length / PER_PAGE);
  const paged = displayed.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  // Stats
  const allLog = canSeeAll ? log : log.filter(l => l.byId === user.uid);
  const statsAR  = allLog.filter(l => LAYANAN_CONFIG[l.layanan]?.kategori === "AR").length;
  const statsPCO = allLog.filter(l => LAYANAN_CONFIG[l.layanan]?.kategori === "PCO").length;
  const statsK   = allLog.filter(l => l.tipe === "K").length;

  // Unique marketing users for filter
  const mktUsers = [...new Map(log.map(l => [l.byId, { id: l.byId, name: l.byName }])).values()];

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: C.text, marginBottom: 4 }}>Log Nomor Surat</h2>
        <p style={{ fontSize: 13, color: C.muted }}>
          {canSeeAll ? "Historis semua nomor surat yang pernah digenerate." : "Historis nomor surat yang kamu buat."}
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 20 }}>
        {[["Total Surat", allLog.length, C.primary], ["Anti Rayap", statsAR, C.ar], ["Pest Control", statsPCO, C.pco], ["Kontrak", statsK, C.warning]].map(([l, v, c]) => (
          <div key={l} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 18px", textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: c }}>{v}</div>
            <div style={{ fontSize: 11, color: C.subtle, marginTop: 2 }}>{l}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Cari nomor, klien, marketing..." style={{ ...inputBase, width: 240, padding: "7px 12px", fontSize: 13 }} />
        {[["Semua Kategori", "all"], ["Anti Rayap", "AR"], ["Pest Control", "PCO"]].map(([l, v]) => (
          <button key={v} onClick={() => { setFilterKat(v); setPage(1); }} style={{ padding: "7px 13px", borderRadius: 7, border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", background: filterKat === v ? C.primary : "#f1f5f9", color: filterKat === v ? "#fff" : C.muted, fontFamily: "inherit" }}>{l}</button>
        ))}
        {[["Semua Tipe", "all"], ["Umum", "U"], ["Kontrak", "K"]].map(([l, v]) => (
          <button key={v} onClick={() => { setFilterTipe(v); setPage(1); }} style={{ padding: "7px 13px", borderRadius: 7, border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", background: filterTipe === v ? C.primary : "#f1f5f9", color: filterTipe === v ? "#fff" : C.muted, fontFamily: "inherit" }}>{l}</button>
        ))}
        {canSeeAll && <select style={{ ...inputBase, width: "auto", padding: "7px 12px", fontSize: 12 }} value={filterUser} onChange={e => { setFilterUser(e.target.value); setPage(1); }}>
          <option value="all">Semua Marketing</option>
          {mktUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>}
        {[["Semua Status", "all"], ["Disetujui", "approved"], ["Menunggu", "pending"], ["Ditolak", "rejected"]].map(([l, v]) => (
          <button key={v} onClick={() => { setFilterStatus(v); setPage(1); }} style={{ padding: "7px 13px", borderRadius: 7, border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", background: filterStatus === v ? C.primary : "#f1f5f9", color: filterStatus === v ? "#fff" : C.muted, fontFamily: "inherit" }}>{l}</button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden" }}>
        {paged.length === 0 ? (
          <div style={{ textAlign: "center", padding: "50px 20px", color: C.subtle }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🔍</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.muted }}>Tidak ada data</div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Nomor Surat", "Layanan", "Tipe", "Kepada / Klien", canSeeAll ? "Marketing" : "", "Total", "Status", "Tanggal"].filter(Boolean).map(h => (
                    <th key={h} style={{ padding: "9px 14px", textAlign: "left", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: C.subtle, borderBottom: `1px solid ${C.border}`, background: C.bg, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paged.map((l, i) => {
                  const cfg = LAYANAN_CONFIG[l.layanan];
                  const isAR = cfg?.kategori === "AR";
                  return (
                    <tr key={l.id} onMouseEnter={e => e.currentTarget.style.background = "#fafafa"} onMouseLeave={e => e.currentTarget.style.background = ""}>
                      <td style={{ padding: "12px 14px", whiteSpace: "nowrap" }}>
                        <code style={{ fontSize: 12, fontFamily: "DM Mono, monospace", fontWeight: 700, color: isAR ? C.ar : C.pco, background: isAR ? C.arLight : C.pcoLight, padding: "3px 8px", borderRadius: 6 }}>{l.noSurat}</code>
                      </td>
                      <td style={{ padding: "12px 14px", fontSize: 12 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <KategoriBadge kategori={cfg?.kategori} />
                          <span style={{ color: C.muted }}>{cfg?.label?.split("—")[1]?.trim() || cfg?.label}</span>
                        </div>
                      </td>
                      <td style={{ padding: "12px 14px" }}><TipeBadge tipe={l.tipe} /></td>
                      <td style={{ padding: "12px 14px", fontSize: 13, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 600 }}>{l.kepada}</td>
                      {canSeeAll && <td style={{ padding: "12px 14px", fontSize: 12, color: C.muted, whiteSpace: "nowrap" }}>{l.byName}</td>}
                      <td style={{ padding: "12px 14px", fontSize: 12, fontFamily: "DM Mono, monospace", whiteSpace: "nowrap" }}>{IDR(l.total)}</td>
                      <td style={{ padding: "12px 14px" }}><Badge status={l.status} /></td>
                      <td style={{ padding: "12px 14px", fontSize: 12, color: C.muted, whiteSpace: "nowrap" }}>{DATE_ID(l.tanggal)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", borderTop: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 12, color: C.muted }}>{displayed.length} surat · hal {page} dari {totalPages}</span>
            <div style={{ display: "flex", gap: 6 }}>
              <Btn sm variant="secondary" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</Btn>
              <Btn sm variant="secondary" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next →</Btn>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── REFERENSI FORMAT NOMOR ────────────────────────────────────────────────────

function FormatReferensiPage() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");

  const formats = [
    { kode: "GP-AR/U", desc: "Anti Rayap — Umum", contoh: `GP-AR/U/${yyyy}/${mm}/0001`, isAR: true, tipe: "U", color: C.ar },
    { kode: "GP-AR/K", desc: "Anti Rayap — Kontrak", contoh: `GP-AR/K/${yyyy}/${mm}/0001`, isAR: true, tipe: "K", color: C.ar },
    { kode: "GP-PCO/U", desc: "Pest Control — Umum", contoh: `GP-PCO/U/${yyyy}/${mm}/0001`, isAR: false, tipe: "U", color: C.pco },
    { kode: "GP-PCO/K", desc: "Pest Control — Kontrak", contoh: `GP-PCO/K/${yyyy}/${mm}/0001`, isAR: false, tipe: "K", color: C.pco },
  ];

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: C.text, marginBottom: 4 }}>Format Nomor Surat</h2>
        <p style={{ fontSize: 13, color: C.muted }}>Referensi format dan aturan penomoran surat penawaran PT Guci Emas Pratama.</p>
      </div>

      {/* Anatomy */}
      <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 14, padding: "22px 24px", marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 14 }}>Anatomi Nomor Surat</div>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 0, marginBottom: 14, overflowX: "auto" }}>
          {[
            { seg: "GP", label: "Inisial Perusahaan", color: C.primary },
            { seg: "-", label: "", color: C.muted },
            { seg: "AR", label: "Kategori\n(AR = Anti Rayap\nPCO = Pest Control)", color: C.ar },
            { seg: "/", label: "", color: C.muted },
            { seg: "U", label: "Tipe\n(U = Umum\nK = Kontrak)", color: "#0891b2" },
            { seg: "/", label: "", color: C.muted },
            { seg: "2026", label: "Tahun", color: C.success },
            { seg: "/", label: "", color: C.muted },
            { seg: "03", label: "Bulan", color: C.warning },
            { seg: "/", label: "", color: C.muted },
            { seg: "0001", label: "Urutan\n(reset tiap bulan\nper kategori+tipe)", color: C.danger },
          ].map((s, i) => s.seg === "/" || s.seg === "-" ? (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", paddingTop: 6 }}>
              <span style={{ fontSize: 20, fontWeight: 800, color: C.subtle, fontFamily: "DM Mono, monospace", padding: "0 2px" }}>{s.seg}</span>
            </div>
          ) : (
            <div key={i} style={{ textAlign: "center", flexShrink: 0 }}>
              <div style={{ fontSize: 18, fontWeight: 800, fontFamily: "DM Mono, monospace", color: s.color, background: s.color + "15", padding: "6px 10px", borderRadius: 8, marginBottom: 6 }}>{s.seg}</div>
              <div style={{ fontSize: 9.5, color: C.muted, lineHeight: 1.4, maxWidth: 80, whiteSpace: "pre-line" }}>{s.label}</div>
            </div>
          ))}
        </div>
        <Callout type="info">
          Urutan nomor bersifat <strong>sequential per bulan</strong> untuk setiap kombinasi kategori + tipe. Contoh: GP-AR/U dan GP-PCO/K masing-masing punya urutan sendiri yang reset setiap awal bulan.
        </Callout>
      </div>

      {/* Format table */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
        {formats.map(f => (
          <div key={f.kode} style={{ background: C.white, border: `1.5px solid ${f.color}20`, borderRadius: 12, padding: "16px 18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <KategoriBadge kategori={f.isAR ? "AR" : "PCO"} />
              <TipeBadge tipe={f.tipe} />
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 4 }}>{f.desc}</div>
            <code style={{ fontSize: 11, fontFamily: "DM Mono, monospace", color: f.color, background: f.color + "15", padding: "4px 10px", borderRadius: 6, display: "block" }}>{f.contoh}</code>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 8 }}>
              {f.tipe === "K" ? "Untuk kerjasama berulang / kontrak tahunan. Biasanya lebih dari 3 kunjungan/tahun." : "Untuk penawaran satu kali / ad-hoc."}
            </div>
          </div>
        ))}
      </div>

      {/* Aturan */}
      <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 14, padding: "20px 24px" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 12 }}>Aturan Penggunaan</div>
        {[
          ["Nomor tidak bisa diubah", "Setelah nomor digenerate dan dikonfirmasi, nomor tidak bisa diubah atau dihapus dari log."],
          ["Urutan per bulan", "Nomor urut reset ke 0001 setiap awal bulan baru, untuk masing-masing kombinasi kategori + tipe."],
          ["Siapa yang generate", "Marketing generate nomor saat membuat quotation baru. Nomor langsung masuk ke log."],
          ["Revisi surat", "Jika ada revisi, buat nomor baru dengan keterangan 'Rev.' di perihal. Nomor lama tetap di log."],
          ["Kontrak vs Umum", "Gunakan tipe Kontrak untuk klien yang akan melakukan kerjasama berulang/tahunan. Umum untuk penawaran biasa."],
        ].map(([judul, isi]) => (
          <div key={judul} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: `1px solid ${C.bg}` }}>
            <span style={{ color: C.success, fontSize: 15, flexShrink: 0, marginTop: 1 }}>✓</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 2 }}>{judul}</div>
              <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>{isi}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────

export default function App() {
  const [users, setUsers] = useState(INITIAL_USERS);
  const [currentUser, setCurrentUser] = useState(INITIAL_USERS[5]); // Default: Jono
  const [log, setLog] = useState(SEED_LOG);
  const [activePage, setActivePage] = useState("log");
  const [showProfil, setShowProfil] = useState(false);
  const [showSwitcher, setShowSwitcher] = useState(false);
  const [toast, setToast] = useState(null);

  const addToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleUpdateProfil = useCallback((formData) => {
    setUsers(prev => prev.map(u => u.uid === currentUser.uid ? { ...u, ...formData } : u));
    setCurrentUser(prev => ({ ...prev, ...formData }));
    addToast("Profil berhasil disimpan!", "success");
  }, [currentUser.uid]);

  const handleGenerate = useCallback((data) => {
    const entry = {
      id: "l" + Date.now(),
      noSurat: data.noSurat,
      layanan: data.layanan,
      tipe: data.tipe,
      seq: data.seq,
      byId: currentUser.uid,
      byName: currentUser.name,
      kepada: data.kepada,
      total: 0,
      status: "draft",
      tanggal: new Date().toISOString().split("T")[0],
      quoId: null,
    };
    setLog(prev => [entry, ...prev]);
    addToast(`Nomor ${data.noSurat} berhasil dibuat dan dicatat.`, "success");
  }, [currentUser]);

  const isMarketing = currentUser.role === "marketing";
  const canGenerate = ["marketing", "administrator", "super_admin"].includes(currentUser.role);
  const rs = ROLE_STYLE[currentUser.role] || {};

  const navItems = [
    { key: "log", icon: "📋", label: "Log Surat" },
    ...(canGenerate ? [{ key: "generate", icon: "✏️", label: "Generate Nomor" }] : []),
    { key: "format", icon: "📖", label: "Referensi Format" },
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "'DM Sans', sans-serif", background: C.bg }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />

      {/* SIDEBAR */}
      <aside style={{ width: 220, minHeight: "100vh", background: C.white, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", position: "sticky", top: 0, flexShrink: 0 }}>
        <div style={{ padding: "18px 15px 14px", borderBottom: `1px solid ${C.bg}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: "linear-gradient(135deg,#1d4ed8,#1e40af)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17 }}>🛡️</div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, color: C.text }}>ERP Pest Control</div>
              <div style={{ fontSize: 10, color: C.subtle }}>Nomor Surat</div>
            </div>
          </div>
        </div>

        <nav style={{ padding: "10px 7px", flex: 1 }}>
          {navItems.map(item => (
            <div key={item.key} onClick={() => setActivePage(item.key)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 10px", borderRadius: 8, marginBottom: 2, background: activePage === item.key ? C.primaryLight : "transparent", color: activePage === item.key ? C.primary : C.muted, fontSize: 13, fontWeight: activePage === item.key ? 700 : 400, cursor: "pointer" }}>
              <span style={{ fontSize: 15 }}>{item.icon}</span>{item.label}
            </div>
          ))}
        </nav>

        {/* User section */}
        <div style={{ borderTop: `1px solid ${C.bg}`, padding: "10px 9px" }}>
          {/* Profil button */}
          <div onClick={() => setShowProfil(true)} style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 9px", borderRadius: 8, cursor: "pointer", marginBottom: 4, background: C.bg }}>
            <Avatar user={currentUser} size={32} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{currentUser.name}</div>
              <div style={{ fontSize: 10, color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{currentUser.wa}</div>
            </div>
            <span style={{ fontSize: 11, color: C.subtle }}>✏️</span>
          </div>
          <span style={{ padding: "2px 8px", borderRadius: 100, fontSize: 9, fontWeight: 800, textTransform: "uppercase", background: rs.bg, color: rs.text, marginLeft: 9 }}>{ROLE_LABELS[currentUser.role]}</span>

          {/* Role switcher */}
          <button onClick={() => setShowSwitcher(p => !p)} style={{ display: "flex", alignItems: "center", gap: 7, width: "100%", padding: "7px 9px", borderRadius: 8, background: "transparent", border: "none", cursor: "pointer", color: C.muted, fontSize: 12, fontFamily: "inherit", marginTop: 6 }}>🔄 Ganti Role (Demo)</button>
          {showSwitcher && (
            <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
              {users.map(u => {
                const s = ROLE_STYLE[u.role] || {};
                return (
                  <div key={u.uid} onClick={() => { setCurrentUser(u); setShowSwitcher(false); setActivePage("log"); }} style={{ padding: "9px 12px", cursor: "pointer", borderBottom: `1px solid ${C.border}`, background: currentUser.uid === u.uid ? C.primaryLight : "transparent", display: "flex", alignItems: "center", gap: 8 }}>
                    <Avatar user={u} size={26} />
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: C.text }}>{u.name}</div>
                      <span style={{ padding: "1px 6px", borderRadius: 100, fontSize: 8, fontWeight: 800, textTransform: "uppercase", background: s.bg, color: s.text }}>{ROLE_LABELS[u.role]}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </aside>

      {/* MAIN */}
      <main style={{ flex: 1, overflow: "auto", padding: "30px 32px" }}>
        {activePage === "log" && <LogPage user={currentUser} log={log} />}
        {activePage === "generate" && canGenerate && <GenNomorPage user={currentUser} log={log} onGenerate={handleGenerate} />}
        {activePage === "format" && <FormatReferensiPage />}
      </main>

      {/* PROFIL MODAL */}
      <Modal open={showProfil} onClose={() => setShowProfil(false)} title="Profil Saya" width={500}>
        <ProfilPage user={currentUser} onUpdate={handleUpdateProfil} onClose={() => setShowProfil(false)} />
      </Modal>

      {/* TOAST */}
      {toast && (
        <div style={{ position: "fixed", top: 20, right: 20, zIndex: 2000, background: { success: C.successLight, error: C.dangerLight, info: C.primaryLight }[toast.type] || C.successLight, border: `1px solid ${{ success: C.successBorder, error: C.dangerBorder, info: C.primaryBorder }[toast.type] || C.successBorder}`, borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", gap: 9, boxShadow: "0 4px 20px rgba(0,0,0,.1)", maxWidth: 360, animation: "si .2s ease" }}>
          <span style={{ fontSize: 15 }}>{{ success: "✓", error: "✕", info: "ℹ" }[toast.type]}</span>
          <span style={{ fontSize: 13, flex: 1, color: C.text }}>{toast.msg}</span>
          <button onClick={() => setToast(null)} style={{ background: "none", border: "none", cursor: "pointer", color: C.subtle }}>✕</button>
        </div>
      )}
      <style>{`@keyframes si{from{opacity:0;transform:translateX(14px)}to{opacity:1;transform:translateX(0)}}`}</style>
    </div>
  );
}
