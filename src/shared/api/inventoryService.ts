import { supabase } from '@/shared/lib/supabase';

export interface InventoryItem {
    id: string;
    companyId: string;
    nama: string;
    kategori: string;
    satuan: string;
    stok: number;
    minAlert: number;
}

export interface InventoryLog {
    id: string;
    itemId: string;
    tanggal: string;      // YYYY-MM-DD
    qtyMasuk: number;
    qtyKeluar: number;
    sisaStok: number;
    proyek: string | null;
    keterangan: string | null;
    createdAt: Date;
}

const toItem = (r: any): InventoryItem => ({
    id: r.id, companyId: r.company_id, nama: r.nama, kategori: r.kategori, satuan: r.satuan,
    stok: Number(r.stok), minAlert: Number(r.min_alert),
});
const toLog = (r: any): InventoryLog => ({
    id: r.id, itemId: r.item_id, tanggal: r.tanggal, qtyMasuk: Number(r.qty_masuk), qtyKeluar: Number(r.qty_keluar),
    sisaStok: Number(r.sisa_stok), proyek: r.proyek, keterangan: r.keterangan, createdAt: new Date(r.created_at),
});

export async function getInventoryItems(companyId: string): Promise<InventoryItem[]> {
    const { data, error } = await supabase.from('inventory_items').select('*').eq('company_id', companyId).order('nama');
    if (error) throw new Error(error.message);
    return (data ?? []).map(toItem);
}

export async function getInventoryLogs(companyId: string, opts: { from?: string; to?: string; limit?: number } = {}): Promise<InventoryLog[]> {
    let q = supabase.from('inventory_logs').select('*').eq('company_id', companyId);
    if (opts.from) q = q.gte('tanggal', opts.from);
    if (opts.to) q = q.lte('tanggal', opts.to);
    const { data, error } = await q.order('created_at', { ascending: false }).limit(opts.limit ?? 300);
    if (error) throw new Error(error.message);
    return (data ?? []).map(toLog);
}

/**
 * Mutasi stok ATOMIK di server (RPC process_inventory_mutation): stok dikunci, tidak boleh negatif, log tercatat dalam
 * satu transaksi, dan hanya ADMIN/INVENTORY perusahaan item tersebut yang berwenang. Jangan ubah `stok` langsung dari klien.
 */
export async function processInventoryRPC(p: { itemId: string; quantity: number; type: 'IN' | 'OUT'; notes?: string; proyek?: string }) {
    const { data, error } = await supabase.rpc('process_inventory_mutation', {
        p_item_id: p.itemId, p_quantity: p.quantity, p_type: p.type, p_notes: p.notes ?? null, p_proyek: p.proyek ?? null,
    });
    if (error) throw new Error(error.message);
    return data as { success: boolean; log_id: string; new_stock: number };
}

export interface NewItemInput { nama: string; kategori: string; satuan: string; stokAwal: number; minAlert: number }

/** Membuat item (stok 0) lalu mencatat stok awal sebagai mutasi masuk, sehingga log dan stok selalu konsisten. */
export async function createInventoryItem(companyId: string, input: NewItemInput): Promise<InventoryItem> {
    const { data, error } = await supabase.from('inventory_items')
        .insert({ company_id: companyId, nama: input.nama.trim(), kategori: input.kategori.trim() || 'Lainnya', satuan: input.satuan.trim() || 'Pcs', stok: 0, min_alert: input.minAlert })
        .select().single();
    if (error) throw new Error(error.message);
    if (input.stokAwal > 0) await processInventoryRPC({ itemId: data.id, quantity: input.stokAwal, type: 'IN', notes: 'Stok awal' });
    return toItem({ ...data, stok: input.stokAwal });
}
