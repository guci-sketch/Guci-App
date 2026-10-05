/**
 * Nomor Surat Service - Supabase PostgreSQL
 */
import { supabase } from '@/shared/lib/supabase';
import { buildNomorSurat, TIPE_LABELS } from '@/shared/lib/quotationConfig';
import type { NomorSuratLog, KategoriSurat, TipeKontrak, JenisLayanan, QuotationStatus } from '@/entities/types';

function toLog(data: any): NomorSuratLog {
    return {
        id: data.id,
        noSurat: data.noSurat,
        kategori: data.kategori,
        tipe: data.tipe,
        tipeLabel: data.tipeLabel,
        jenisLayanan: data.jenisLayanan,
        kepada: data.kepada,
        byUid: data.byUid,
        byName: data.byName,
        dibuat: new Date(data.dibuat),
        status: data.status,
        quoId: data.quoId,
        companyId: data.companyId,
        isManual: data.isManual,
        keteranganManual: data.keteranganManual,
    };
}

export interface GenerateNomorParams {
    kategori: KategoriSurat;
    tipe: TipeKontrak;
    jenisLayanan: JenisLayanan;
    kepada: string;
    byUid: string;
    byName: string;
    companyId: string;
    dryRun?: boolean;
}

export async function previewNomorSurat(
    kategori: KategoriSurat,
    tipe: TipeKontrak,
    companyId: string,
    jenisLayanan?: string
): Promise<string> {
    const now = new Date();
    const yyyy = String(now.getFullYear());
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const prefix = `GP-${kategori}/${tipe}/${yyyy}/${mm}/`;

    const { data, error } = await supabase
        .from("nomor_surat_logs")
        .select("noSurat")
        .eq("companyId", companyId)
        .eq("kategori", kategori)
        .eq("tipe", tipe)
        .like("noSurat", `${prefix}%`);

    if (error) throw error;

    const seqs = data.map((d: any) => parseInt(d.noSurat.split("/").pop() ?? "0") || 0);
    const nextSeq = seqs.length > 0 ? Math.max(...seqs) + 1 : 1;

    return buildNomorSurat(kategori, tipe, yyyy, mm, nextSeq);
}

export async function generateNomorSurat(params: GenerateNomorParams): Promise<NomorSuratLog> {
    const { kategori, tipe, kepada, byUid, byName, companyId, dryRun = false } = params;
    const noSurat = await previewNomorSurat(kategori, tipe, companyId);
    const now = new Date();

    const entry = {
        noSurat,
        kategori,
        tipe,
        tipeLabel: TIPE_LABELS[tipe] ?? tipe,
        kepada,
        byUid,
        byName,
        dibuat: now.toISOString(),
        status: "draft",
        quoId: null,
        companyId,
        isManual: false,
        keteranganManual: "",
    };

    if (!dryRun) {
        const { data, error } = await supabase.from("nomor_surat_logs").insert(entry).select().single();
        if (error) throw error;
        return toLog(data);
    }
    return toLog({ ...entry, id: "preview" });
}

export async function commitNomorSurat(params: GenerateNomorParams & { noSurat: string }): Promise<NomorSuratLog> {
    const { kategori, tipe, kepada, byUid, byName, companyId, noSurat } = params;
    const now = new Date();

    const entry = {
        noSurat,
        kategori,
        tipe,
        tipeLabel: TIPE_LABELS[tipe] ?? tipe,
        kepada,
        byUid,
        byName,
        dibuat: now.toISOString(),
        status: "draft",
        quoId: null,
        companyId,
        isManual: false,
        keteranganManual: "",
    };

    const { data, error } = await supabase.from("nomor_surat_logs").insert(entry).select().single();
    if (error) throw error;
    return toLog(data);
}

export interface GetLogFilters {
    byUid?: string;
    kategori?: KategoriSurat;
    tipe?: TipeKontrak;
    status?: QuotationStatus;
    companyId: string;
}

export async function getNomorSuratLog(filters: GetLogFilters): Promise<NomorSuratLog[]> {
    let query = supabase.from("nomor_surat_logs").select("*").eq("companyId", filters.companyId);

    if (filters.byUid) query = query.eq("byUid", filters.byUid);
    if (filters.kategori) query = query.eq("kategori", filters.kategori);
    if (filters.tipe) query = query.eq("tipe", filters.tipe);
    if (filters.status) query = query.eq("status", filters.status);

    const { data, error } = await query;
    if (error) throw error;
    
    return data.map(toLog).sort((a, b) => b.dibuat.getTime() - a.dibuat.getTime());
}

export async function updateNomorSuratStatus(logId: string, status: QuotationStatus, quoId?: string): Promise<void> {
    const payload: any = { status };
    if (quoId) payload.quoId = quoId;

    const { error } = await supabase.from("nomor_surat_logs").update(payload).eq("id", logId);
    if (error) throw error;
}

export async function deleteNomorSurat(logId: string): Promise<void> {
    const { error } = await supabase.from("nomor_surat_logs").delete().eq("id", logId);
    if (error) throw error;
}

export interface AddManualNomorParams {
    noSurat: string;
    kategori: KategoriSurat;
    tipe: TipeKontrak;
    jenisLayanan: JenisLayanan;
    kepada: string;
    byUid: string;
    byName: string;
    companyId: string;
    keteranganManual?: string;
    dibuat?: Date;
}

export async function addManualNomorSurat(params: AddManualNomorParams): Promise<NomorSuratLog> {
    const now = params.dibuat ?? new Date();
    const entry = {
        noSurat: params.noSurat,
        kategori: params.kategori,
        tipe: params.tipe,
        tipeLabel: TIPE_LABELS[params.tipe] ?? params.tipe,
        jenisLayanan: params.jenisLayanan || "",
        kepada: params.kepada,
        byUid: params.byUid,
        byName: params.byName,
        dibuat: now.toISOString(),
        status: "draft",
        quoId: null,
        companyId: params.companyId,
        isManual: true,
        keteranganManual: params.keteranganManual ?? "",
    };

    const { data, error } = await supabase.from("nomor_surat_logs").insert(entry).select().single();
    if (error) throw error;
    return toLog(data);
}
