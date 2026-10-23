import { useEffect, useState } from 'react';
import { supabase } from '@/shared/lib/supabase';
import { useAuthStore } from '@/app/store/authStore';

/**
 * Khusus SUPERADMIN: memilih perusahaan (tenant) yang sedang dikelola di FieldWork.
 * Otomatis memilih perusahaan pertama (PT Guci Emas Pratama) bila belum ada yang dipilih.
 */
export function CompanyPicker() {
  const activeCompanyId = useAuthStore(s => s.activeCompanyId);
  const setActiveCompanyId = useAuthStore(s => s.setActiveCompanyId);
  const [companies, setCompanies] = useState<{ id: string; company_name: string }[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.from('companies').select('id, company_name').order('company_name').then(({ data, error: err }) => {
      if (err) { setError(err.message); return; }
      const list = data ?? [];
      setCompanies(list);
      if (list.length > 0 && (!activeCompanyId || !list.some(c => c.id === activeCompanyId))) {
        setActiveCompanyId(list[0].id);
      }
    });
  }, [activeCompanyId, setActiveCompanyId]);

  if (companies.length <= 1) return null;

  return (
    <div className="mt-2">
      <label className="block text-[9.5px] font-bold uppercase tracking-wider text-[#8a8580] mb-1">
        Tenant Perusahaan
      </label>
      <select
        value={activeCompanyId ?? ''}
        onChange={e => setActiveCompanyId(e.target.value || null)}
        className="w-full px-2 py-1 text-[11px] font-semibold rounded-lg border border-[#e8e5e0] bg-[#faf9f7] text-[#2d2a26] focus:outline-none focus:border-[var(--accent)]"
      >
        {companies.map(c => (
          <option key={c.id} value={c.id}>{c.company_name}</option>
        ))}
      </select>
      {error && <p className="text-[10px] text-red-600 mt-1">{error}</p>}
    </div>
  );
}
