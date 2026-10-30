import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Save, Eye, RotateCcw, Upload, Trash2, FileText } from 'lucide-react';
import { useAuth } from '@/app/providers/AuthContext';
import { useAuthStore } from '@/app/store/authStore';
import { getCompanySettings, saveCompanySettings } from '@/shared/api/settingsService';
import type { CompanySettings } from '@/shared/api/settingsService';
import { identityFromSettings } from '@/shared/api/documentConfig';
import {
  applyTemplatesToQuotation, buildLetterhead, defaultDocumentTemplates, reportOptionsFromTemplates, sanitizeTemplates,
} from '@/shared/lib/documentTemplates';
import type { DocumentTemplates } from '@/shared/lib/documentTemplates';
import { GUCI_IDENTITY, guciTemplates, isGuciName } from '@/shared/lib/documentPresets';
import { generateQuotationPDF } from '@/shared/lib/pdfGenerator';
import { generateVisitReportPDF } from '@/shared/lib/visitReportPdf';
import { PREVIEW_LABELS, previewQuotation, previewVisitReport } from '@/shared/lib/sampleDocuments';
import type { PreviewKind } from '@/shared/lib/sampleDocuments';
import { fileToImageDataUrl } from '@/shared/utils/imageUpload';

type Section = 'identitas' | 'surat' | 'rayap' | 'pest' | 'laporan';
const SECTIONS: { id: Section; label: string }[] = [
  { id: 'identitas', label: 'Identitas & Kop' },
  { id: 'surat', label: 'Surat Penawaran' },
  { id: 'rayap', label: 'Anti Rayap' },
  { id: 'pest', label: 'Pest & Rodent' },
  { id: 'laporan', label: 'Laporan Kunjungan' },
];

const inputCls = 'w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40';
const lines = (s: string) => s.split('\n');

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-bold text-slate-700 mb-1">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-slate-500 mt-1">{hint}</span>}
    </label>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="w-4 h-4 accent-emerald-600" />
      {label}
    </label>
  );
}

const PEST_HELP = `Sintaks: "# Judul" · "#_ Judul bergaris bawah" · "## Sub-judul" · "### Tebal-miring" · "- butir daftar" · "-2 a | b | c" (daftar 2 kolom) · "@Label | isi" (baris label : isi) · baris kosong = jarak · "---" = halaman baru · tag <b> <i> <u> · placeholder {company} dan {klien}.`;

export function TemplateSettingsPanel() {
  const { user } = useAuth();
  const activeCompanyId = useAuthStore(s => s.activeCompanyId);
  const companyId = (user?.role === 'MASTER_SUPER_ADMIN' || user?.role === 'SUPERADMIN') ? activeCompanyId : user?.companyId ?? null;

  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [section, setSection] = useState<Section>('identitas');
  const [previewKind, setPreviewKind] = useState<PreviewKind>('anti-rayap');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const previewRef = useRef<string | null>(null);

  const load = useCallback(async () => {
    if (!companyId) { setSettings(null); return; }
    setLoading(true); setMsg(null);
    try {
      setSettings(await getCompanySettings(companyId));
      setDirty(false);
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'Gagal memuat pengaturan.' });
    } finally {
      setLoading(false);
    }
  }, [companyId]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => () => { if (previewRef.current) URL.revokeObjectURL(previewRef.current); }, []);

  const docs = settings?.documents ?? defaultDocumentTemplates();
  const identity = useMemo(() => (settings ? identityFromSettings(settings) : null), [settings]);

  const setIdentity = <K extends keyof CompanySettings>(k: K, v: CompanySettings[K]) => {
    setSettings(prev => (prev ? { ...prev, [k]: v } : prev)); setDirty(true);
  };
  const patchDocs = (fn: (d: DocumentTemplates) => void) => {
    setSettings(prev => {
      if (!prev) return prev;
      const next = structuredClone(prev.documents ?? defaultDocumentTemplates());
      fn(next);
      return { ...prev, documents: next };
    });
    setDirty(true);
  };

  const upload = async (file: File | undefined, opts: { maxWidth: number; maxHeight: number }, apply: (url: string) => void) => {
    if (!file) return;
    try { apply(await fileToImageDataUrl(file, opts)); setMsg(null); }
    catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : 'Gagal memproses gambar.' }); }
  };

  const handleSave = async () => {
    if (!settings || !companyId || !user) return;
    if (!settings.companyName.trim()) { setMsg({ ok: false, text: 'Nama perusahaan wajib diisi.' }); return; }
    setSaving(true); setMsg(null);
    try {
      await saveCompanySettings(companyId, { ...settings, documents: sanitizeTemplates(settings.documents) }, user.uid);
      await load();
      setMsg({ ok: true, text: 'Pengaturan & template tersimpan. Dokumen berikutnya otomatis memakai template ini.' });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'Gagal menyimpan.' });
    } finally { setSaving(false); }
  };

  const handlePreview = async (kind: PreviewKind = previewKind) => {
    if (!settings || !identity) return;
    setPreviewBusy(true); setMsg(null);
    try {
      const tpl = sanitizeTemplates(settings.documents);
      let blob: Blob;
      if (kind === 'laporan') {
        const ro = reportOptionsFromTemplates(tpl);
        blob = generateVisitReportPDF(previewVisitReport(buildLetterhead(tpl, identity), { judul: ro.judul, jenisPekerjaan: ro.jenisPekerjaan, saran: ro.saran, tampilkanFooter: ro.tampilkanFooter }));
      } else {
        blob = generateQuotationPDF(applyTemplatesToQuotation(previewQuotation(kind, tpl, identity), tpl, identity));
      }
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
      const url = URL.createObjectURL(blob);
      previewRef.current = url; setPreviewUrl(url);
    } catch (e) {
      setMsg({ ok: false, text: `Pratinjau gagal: ${e instanceof Error ? e.message : 'kesalahan tidak diketahui'}` });
    } finally { setPreviewBusy(false); }
  };

  const loadGuciPreset = () => {
    if (!confirm('Muat contoh identitas & template PT Guci Emas Pratama? Isian yang belum disimpan akan diganti.')) return;
    setSettings(prev => prev ? ({
      ...prev, companyName: GUCI_IDENTITY.companyName, headOffice: GUCI_IDENTITY.headOffice, branchOffice: GUCI_IDENTITY.branchOffice,
      telp: GUCI_IDENTITY.telp, wa: GUCI_IDENTITY.wa, email: GUCI_IDENTITY.email, website: GUCI_IDENTITY.website, kota: GUCI_IDENTITY.kota,
      documents: guciTemplates(),
    }) : prev);
    setDirty(true);
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  if (!companyId) {
    return <div className="p-6 rounded-xl border border-amber-200 bg-amber-50 text-sm text-amber-800">Pilih perusahaan pada menu di sidebar untuk mengatur template.</div>;
  }
  if (loading && !settings) return <div className="py-16 text-center text-sm text-slate-500"><Loader2 className="inline animate-spin mr-2" size={16} />Memuat pengaturan...</div>;
  if (!settings) return <div className="p-6 rounded-xl border border-red-200 bg-red-50 text-sm text-red-700">{msg?.text ?? 'Pengaturan tidak tersedia.'}</div>;

  const lh = docs.letterhead;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Template & Pengaturan Perusahaan</h3>
          <p className="text-xs text-slate-500 max-w-2xl">
            Atur kop, footer, isi surat, dan program pekerjaan untuk dokumen perusahaan Anda. Perubahan hanya berlaku untuk
            perusahaan ini dan dipakai otomatis oleh Penawaran dan Laporan Kunjungan. Hanya admin perusahaan yang dapat menyimpan.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(isGuciName(settings.companyName) || (user?.role === 'MASTER_SUPER_ADMIN' || user?.role === 'SUPERADMIN')) && (
            <button onClick={loadGuciPreset} className="px-3 py-2 text-xs font-bold rounded-lg border border-slate-300 hover:bg-slate-50">Muat contoh Guci</button>
          )}
          <button onClick={handleSave} disabled={saving || !dirty}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Simpan
          </button>
        </div>
      </div>

      {msg && <div className={`p-3 rounded-lg text-sm border ${msg.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-700'}`}>{msg.text}</div>}
      {!settings.hasSaved && <div className="p-3 rounded-lg text-xs border border-blue-200 bg-blue-50 text-blue-800">Perusahaan ini belum pernah menyimpan pengaturan. Nilai di bawah adalah bawaan netral — lengkapi lalu klik Simpan.</div>}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* ── Editor ── */}
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="flex flex-wrap gap-1 p-2 border-b border-slate-200 bg-slate-50 rounded-t-xl">
            {SECTIONS.map(s => (
              <button key={s.id} onClick={() => setSection(s.id)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${section === s.id ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-200'}`}>{s.label}</button>
            ))}
          </div>

          <div className="p-4 space-y-4">
            {section === 'identitas' && (<>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Nama perusahaan *"><input className={inputCls} value={settings.companyName} onChange={e => setIdentity('companyName', e.target.value)} /></Field>
                <Field label="Kota penerbit surat" hint='Tampil: "Kota, 12 Januari 2026"'><input className={inputCls} value={settings.kota ?? ''} onChange={e => setIdentity('kota', e.target.value)} /></Field>
                <Field label="Kantor pusat"><input className={inputCls} value={settings.headOffice} onChange={e => setIdentity('headOffice', e.target.value)} /></Field>
                <Field label="Kantor cabang (opsional)"><input className={inputCls} value={settings.branchOffice ?? ''} onChange={e => setIdentity('branchOffice', e.target.value)} /></Field>
                <Field label="Telepon"><input className={inputCls} value={settings.telp} onChange={e => setIdentity('telp', e.target.value)} /></Field>
                <Field label="WhatsApp"><input className={inputCls} value={settings.wa} onChange={e => setIdentity('wa', e.target.value)} /></Field>
                <Field label="Email"><input className={inputCls} value={settings.email} onChange={e => setIdentity('email', e.target.value)} /></Field>
                <Field label="Website"><input className={inputCls} value={settings.website} onChange={e => setIdentity('website', e.target.value)} /></Field>
                <Field label="Prefix nomor surat" hint="Kosong = inisial nama perusahaan. Contoh: GP → GP-PCO/PH/2026/10/0001"><input className={inputCls} value={settings.nomorPrefix} onChange={e => setIdentity('nomorPrefix', e.target.value.toUpperCase())} /></Field>
                <Field label="Nama penandatangan"><input className={inputCls} value={settings.ttdNama ?? ''} onChange={e => setIdentity('ttdNama', e.target.value)} /></Field>
              </div>

              <h4 className="text-sm font-bold text-slate-800 pt-2 border-t border-slate-200">Kop surat</h4>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm"><input type="radio" checked={lh.mode === 'text'} onChange={() => patchDocs(d => { d.letterhead.mode = 'text'; })} /> Teks (nama + tagline)</label>
                <label className="flex items-center gap-2 text-sm"><input type="radio" checked={lh.mode === 'image'} onChange={() => patchDocs(d => { d.letterhead.mode = 'image'; })} /> Gambar kop</label>
              </div>
              {lh.mode === 'text' ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Field label="Nama merek di kop" hint="Kosong = nama perusahaan"><input className={inputCls} value={lh.brandName} onChange={e => patchDocs(d => { d.letterhead.brandName = e.target.value; })} /></Field>
                  <Field label="Tagline"><input className={inputCls} value={lh.tagline} onChange={e => patchDocs(d => { d.letterhead.tagline = e.target.value; })} /></Field>
                  <Field label="Warna"><input type="color" className="h-10 w-full rounded-lg border border-slate-300" value={lh.brandColor} onChange={e => patchDocs(d => { d.letterhead.brandColor = e.target.value; })} /></Field>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg border border-slate-300 hover:bg-slate-50 cursor-pointer">
                      <Upload size={14} /> Unggah gambar kop
                      <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
                        onChange={e => { void upload(e.target.files?.[0], { maxWidth: 1000, maxHeight: 220 }, url => patchDocs(d => { d.letterhead.headerLogo = url; })); e.target.value = ''; }} />
                    </label>
                    {lh.headerLogo && <button onClick={() => patchDocs(d => { d.letterhead.headerLogo = ''; })} className="text-xs text-red-600 flex items-center gap-1"><Trash2 size={12} /> Hapus</button>}
                    <Field label="Lebar di kertas (mm)"><input type="number" min={20} max={140} className={`${inputCls} w-24`} value={lh.headerLogoWidthMm} onChange={e => patchDocs(d => { d.letterhead.headerLogoWidthMm = Number(e.target.value); })} /></Field>
                  </div>
                  {lh.headerLogo ? <img src={lh.headerLogo} alt="Kop" className="max-h-16 border border-slate-200 rounded p-1 bg-white" /> : <p className="text-xs text-amber-700">Belum ada gambar — kop akan memakai teks.</p>}
                </div>
              )}

              <h4 className="text-sm font-bold text-slate-800 pt-2 border-t border-slate-200">Footer</h4>
              <Field label="Baris footer kustom" hint="Satu baris per teks (maks. 6). Kosongkan untuk disusun otomatis dari alamat, telepon, email, dan cabang di atas.">
                <textarea rows={4} className={inputCls} value={lh.footerLines.join('\n')} onChange={e => patchDocs(d => { d.letterhead.footerLines = lines(e.target.value).slice(0, 6); })} />
              </Field>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Logo footer (asosiasi/sertifikasi, maks. 3)</span>
                  {lh.footerLogos.length < 3 && (
                    <label className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-300 hover:bg-slate-50 cursor-pointer">
                      <Upload size={12} /> Tambah
                      <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
                        onChange={e => { void upload(e.target.files?.[0], { maxWidth: 400, maxHeight: 300 }, url => patchDocs(d => { d.letterhead.footerLogos.push({ src: url, widthMm: 20 }); })); e.target.value = ''; }} />
                    </label>
                  )}
                </div>
                {lh.footerLogos.map((lg, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 border border-slate-200 rounded-lg">
                    <img src={lg.src} alt={`Logo ${i + 1}`} className="h-10 object-contain" />
                    <Field label="Lebar (mm)"><input type="number" min={8} max={50} className={`${inputCls} w-20`} value={lg.widthMm} onChange={e => patchDocs(d => { d.letterhead.footerLogos[i].widthMm = Number(e.target.value); })} /></Field>
                    <button onClick={() => patchDocs(d => { d.letterhead.footerLogos.splice(i, 1); })} className="ml-auto text-red-600"><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            </>)}

            {section === 'surat' && (<>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Masa berlaku penawaran (hari)"><input type="number" min={1} max={365} className={inputCls} value={docs.surat.masaBerlakuHari} onChange={e => patchDocs(d => { d.surat.masaBerlakuHari = Number(e.target.value); })} /></Field>
                <span />
                <Field label="Salam penutup — Anti Rayap"><input className={inputCls} value={docs.surat.salamAntiRayap} onChange={e => patchDocs(d => { d.surat.salamAntiRayap = e.target.value; })} /></Field>
                <Field label="Salam penutup — Pest/Rodent"><input className={inputCls} value={docs.surat.salamPest} onChange={e => patchDocs(d => { d.surat.salamPest = e.target.value; })} /></Field>
                <Field label="Kontak kantor di bagian Penutup" hint="Kosong = telepon perusahaan"><input className={inputCls} value={docs.surat.kontakKantor} onChange={e => patchDocs(d => { d.surat.kontakKantor = e.target.value; })} /></Field>
                <Field label="WhatsApp di bagian Penutup" hint="Kosong = WhatsApp perusahaan"><input className={inputCls} value={docs.surat.kontakWa} onChange={e => patchDocs(d => { d.surat.kontakWa = e.target.value; })} /></Field>
              </div>
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <span className="text-xs font-bold text-slate-700">Tanda tangan & stempel bawaan (opsional)</span>
                <p className="text-[11px] text-slate-500">Dipakai di surat yang belum ditandatangani lewat fitur tanda tangan. Gunakan PNG transparan. Simpan hanya bila Anda berwenang atas tanda tangan tersebut.</p>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg border border-slate-300 hover:bg-slate-50 cursor-pointer">
                    <Upload size={14} /> Unggah
                    <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
                      onChange={e => { void upload(e.target.files?.[0], { maxWidth: 700, maxHeight: 280 }, url => patchDocs(d => { d.surat.signatureImage = url; })); e.target.value = ''; }} />
                  </label>
                  {docs.surat.signatureImage && (<>
                    <img src={docs.surat.signatureImage} alt="Tanda tangan" className="h-14 border border-slate-200 rounded bg-white p-1" />
                    <button onClick={() => patchDocs(d => { d.surat.signatureImage = ''; })} className="text-xs text-red-600 flex items-center gap-1"><Trash2 size={12} /> Hapus</button>
                  </>)}
                </div>
              </div>
            </>)}

            {section === 'rayap' && (<>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Garansi bebas rayap (tahun)"><input type="number" min={0} max={30} className={inputCls} value={docs.antiRayap.garansiTahun} onChange={e => patchDocs(d => { d.antiRayap.garansiTahun = Number(e.target.value); })} /></Field>
                <div className="flex items-end pb-2"><Toggle checked={docs.antiRayap.tampilkanPengontrolan} onChange={v => patchDocs(d => { d.antiRayap.tampilkanPengontrolan = v; })} label="Tampilkan bagian Pengontrolan" /></div>
              </div>
              <Field label="Skema pembayaran" hint="Satu butir per baris."><textarea rows={3} className={inputCls} value={docs.antiRayap.skemaPembayaran.join('\n')} onChange={e => patchDocs(d => { d.antiRayap.skemaPembayaran = lines(e.target.value); })} /></Field>
              <Field label="Daftar pengontrolan" hint="Satu butir per baris. Tag <b>…</b> untuk tebal."><textarea rows={5} className={inputCls} value={docs.antiRayap.pengontrolan.join('\n')} onChange={e => patchDocs(d => { d.antiRayap.pengontrolan = lines(e.target.value); })} /></Field>
              <Field label="Catatan di bawah Garansi" hint='Contoh: "Garansi tidak termasuk penggantian barang/material yang dirusak oleh serangan rayap." Kosong = tidak ditampilkan.'><textarea rows={2} className={inputCls} value={docs.antiRayap.garansiCatatan} onChange={e => patchDocs(d => { d.antiRayap.garansiCatatan = e.target.value; })} /></Field>
              <Field label="Catatan pajak di bawah tabel biaya" hint="Kosong = kalimat bawaan (biaya belum termasuk PPN)."><input className={inputCls} value={docs.antiRayap.catatanPajak} onChange={e => patchDocs(d => { d.antiRayap.catatanPajak = e.target.value; })} /></Field>
            </>)}

            {section === 'pest' && (<>
              <p className="text-[11px] text-slate-500 leading-relaxed">{PEST_HELP}</p>
              {([
                ['programPest', 'Program Pest Control'],
                ['programRodentKontrak', 'Program Rodent Control (paket kontrak)'],
                ['programRodentStandalone', 'Program Rodent Control (berdiri sendiri)'],
              ] as const).map(([key, label]) => (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-700">{label}</span>
                    <button onClick={() => patchDocs(d => { d.pest[key] = defaultDocumentTemplates().pest[key]; })} className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1"><RotateCcw size={11} /> Bawaan</button>
                  </div>
                  <textarea rows={10} spellCheck={false} className={`${inputCls} font-mono text-xs`} value={docs.pest[key]} onChange={e => patchDocs(d => { d.pest[key] = e.target.value; })} />
                </div>
              ))}
              <Field label="Sistem pembayaran (Rodent berdiri sendiri)" hint="Kosong = kalimat bawaan."><textarea rows={2} className={inputCls} value={docs.pest.sistemPembayaran} onChange={e => patchDocs(d => { d.pest.sistemPembayaran = e.target.value; })} /></Field>
            </>)}

            {section === 'laporan' && (<>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Judul dokumen"><input className={inputCls} value={docs.laporan.judul} onChange={e => patchDocs(d => { d.laporan.judul = e.target.value; })} /></Field>
                <Field label="Jenis pekerjaan bawaan"><input className={inputCls} value={docs.laporan.jenisPekerjaan} onChange={e => patchDocs(d => { d.laporan.jenisPekerjaan = e.target.value; })} /></Field>
              </div>
              <Field label="Saran & rekomendasi bawaan" hint="Teks awal pada kolom Saran dan Rekomendasi."><textarea rows={4} className={inputCls} value={docs.laporan.saranDefault} onChange={e => patchDocs(d => { d.laporan.saranDefault = e.target.value; })} /></Field>
              <Toggle checked={docs.laporan.tampilkanFooter} onChange={v => patchDocs(d => { d.laporan.tampilkanFooter = v; })} label='Tampilkan baris "created by … datetime …" di setiap halaman' />
            </>)}

            <div className="pt-3 border-t border-slate-200">
              <button onClick={() => { if (confirm('Kembalikan SEMUA template dokumen ke bawaan? (Identitas perusahaan tidak berubah.)')) patchDocs(d => Object.assign(d, defaultDocumentTemplates())); }}
                className="text-xs text-slate-500 hover:text-red-600 flex items-center gap-1"><RotateCcw size={12} /> Kembalikan semua template ke bawaan</button>
            </div>
          </div>
        </div>

        {/* ── Pratinjau ── */}
        <div className="rounded-xl border border-slate-200 bg-white flex flex-col">
          <div className="flex flex-wrap items-center gap-2 p-3 border-b border-slate-200 bg-slate-50 rounded-t-xl">
            <FileText size={14} className="text-slate-500" />
            <select value={previewKind} onChange={e => setPreviewKind(e.target.value as PreviewKind)} className="px-2 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white">
              {(Object.keys(PREVIEW_LABELS) as PreviewKind[]).map(k => <option key={k} value={k}>{PREVIEW_LABELS[k]}</option>)}
            </select>
            <button onClick={() => void handlePreview()} disabled={previewBusy}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-800 text-white hover:bg-slate-700 disabled:opacity-50">
              {previewBusy ? <Loader2 size={12} className="animate-spin" /> : <Eye size={12} />} Pratinjau PDF
            </button>
            <span className="text-[11px] text-slate-500">Memakai isian saat ini (belum perlu disimpan).</span>
          </div>
          {previewUrl
            ? <iframe title="Pratinjau dokumen" src={previewUrl} className="w-full flex-1 min-h-[70vh] rounded-b-xl" />
            : <div className="flex-1 min-h-[40vh] flex items-center justify-center text-sm text-slate-400 p-6 text-center">Klik "Pratinjau PDF" untuk melihat hasil dokumen dengan kop dan template Anda.</div>}
        </div>
      </div>
    </div>
  );
}
