import { useEffect, useState } from 'react';
import { supabase } from '@/shared/lib/supabase';
import { useAuthStore } from '@/app/store/authStore';

/**
 * Khusus SUPERADMIN: memilih perusahaan yang sedang dikelola. Pilihan dikirim backend sebagai header X-Company-Id
 * dan dipakai halaman Template & Pengaturan. Role lain tidak melihat komponen ini (perusahaannya tetap).
 */
export function CompanyPicker() {
  const activeCompanyId = useAuthStore(s => s.activeCompanyId);
  const setActiveCompanyId = useAuthStore(s => s.setActiveCompanyId);
  const [companies, setCompanies] = useState<{ id: string; company_name: string }[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.from('companies').select('id, company_name').order('company_name').then(({ data, error: err }) => {
      if (err) { setError(err.message); return; }
      setCompanies(data ?? []);
      // Pilihan lama yang sudah tidak ada (perusahaan dihapus) dibersihkan.
      if (activeCompanyId && !(data ?? []).some(c => c.id === activeCompanyId)) setActiveCompanyId(null);
    });
  }, [activeCompanyId, setActiveCompanyId]);

  return (
    <div className="mt-3">
      <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">Perusahaan yang dikelola</label>
      <select
        value={activeCompanyId ?? ''}
        onChange={e => setActiveCompanyId(e.target.value || null)}
        className="w-full px-2 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white"
      >
        <option value="">— Pilih perusahaan —</option>
        {companies.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
      </select>
      {error && <p className="text-[10px] text-red-600 mt-1">{error}</p>}
    </div>
  );
}
