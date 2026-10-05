/**
 * Quotation Service - Supabase PostgreSQL CRUD
 */
import { supabase } from '@/shared/lib/supabase';
import type { Quotation, QuotationStatus, KategoriSurat, TipeKontrak } from '@/entities/types';

export async function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload  = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

export function base64ToBlob(base64: string, type = "application/pdf"): Blob {
    const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    return new Blob([bytes], { type });
}

function toQuotation(data: any): Quotation {
    return {
        id: data.id,
        ...data.payload,
        companyId: data.company_id,
        marketingUid: data.marketing_uid,
        status: data.status,
        createdAt: new Date(data.created_at),
        tanggal: data.payload.tanggal ? new Date(data.payload.tanggal) : new Date(),
        approvedAt: data.payload.approvedAt ? new Date(data.payload.approvedAt) : undefined,
        dealAt: data.payload.dealAt ? new Date(data.payload.dealAt) : undefined,
        sentToClientAt: data.payload.sentToClientAt ? new Date(data.payload.sentToClientAt) : undefined,
        signedAt: data.payload.signedAt ? new Date(data.payload.signedAt) : undefined,
    };
}

export async function saveQuotationBatch(
    data: Omit<Quotation, "id" | "createdAt">,
    nomorSuratLogId: string,
    pdfBlob: Blob,
): Promise<Quotation> {
    const pdfBase64 = await blobToBase64(pdfBlob);
    const now = new Date();

    const payload = {
        ...data,
        pdfBase64,
        pdfUrl: null,
        tanggal: data.tanggal.toISOString(),
        approvedAt: data.approvedAt ? data.approvedAt.toISOString() : null,
    };

    // We simulate batch using sequential awaits, but in Supabase you'd use a transaction via RPC.
    // Since we're keeping it simple:
    const { data: quoDoc, error: quoErr } = await supabase
        .from("quotations")
        .insert({
            company_id: data.companyId,
            marketing_uid: data.marketingUid,
            status: data.status,
            payload
        })
        .select()
        .single();

    if (quoErr) throw quoErr;

    const { error: logErr } = await supabase
        .from("nomor_surat_logs")
        .update({ status: "pending", quoId: quoDoc.id })
        .eq("id", nomorSuratLogId);

    if (logErr) throw logErr;

    return toQuotation(quoDoc);
}

export interface GetQuotationsFilters {
    companyId: string;
    byUid?: string;
    kategori?: KategoriSurat;
    tipeKontrak?: TipeKontrak;
    status?: QuotationStatus;
}

export async function getQuotations(filters: GetQuotationsFilters): Promise<Quotation[]> {
    let query = supabase
        .from("quotations")
        .select("*")
        .eq("company_id", filters.companyId);

    if (filters.byUid) query = query.eq("marketing_uid", filters.byUid);
    if (filters.status) query = query.eq("status", filters.status);
    
    // JSONB filtering for kategori and tipeKontrak
    if (filters.kategori) query = query.eq("payload->>kategori", filters.kategori);
    if (filters.tipeKontrak) query = query.eq("payload->>tipeKontrak", filters.tipeKontrak);

    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) throw error;

    return data.map(toQuotation);
}

export async function getQuotationById(id: string): Promise<Quotation | null> {
    const { data, error } = await supabase.from("quotations").select("*").eq("id", id).single();
    if (error || !data) return null;
    return toQuotation(data);
}

export async function updateQuotationStatus(
    id: string,
    status: QuotationStatus,
    approvedBy?: string,
    rejectionReason?: string,
    notesMarketing?: string,
): Promise<void> {
    const now = new Date().toISOString();
    
    // Fetch current to update payload
    const { data: current } = await supabase.from("quotations").select("payload").eq("id", id).single();
    if (!current) return;
    
    const payload = current.payload;
    payload.status = status;

    if (status === "approved") {
        if (approvedBy) payload.approvedBy = approvedBy;
        payload.approvedAt = now;
        payload.rejectionReason = null;
        payload.notesMarketing = null;
    }

    if (status === "rejected") {
        if (rejectionReason) payload.rejectionReason = rejectionReason;
        if (notesMarketing) payload.notesMarketing = notesMarketing;
        payload.approvedAt = now;
    }

    if (status === "sent_to_client") payload.sentToClientAt = now;
    if (status === "deal") payload.dealAt = now;

    const { error: quoErr } = await supabase
        .from("quotations")
        .update({ status, payload })
        .eq("id", id);
    if (quoErr) throw quoErr;

    // Sync status to nomorSuratLog
    await supabase.from("nomor_surat_logs").update({ status }).eq("quoId", id);
}

export { saveQuotationBatch as addQuotationDoc };

export async function saveQuotationDraft(
    data: Omit<Quotation, "id" | "createdAt" | "pdfBase64" | "pdfUrl">,
    nomorSuratLogId: string,
): Promise<Quotation> {
    const now = new Date();
    const payload = {
        ...data,
        pdfBase64: null,
        pdfUrl: null,
        tanggal: data.tanggal.toISOString(),
        approvedAt: data.approvedAt ? data.approvedAt.toISOString() : null,
    };

    const { data: quoDoc, error: quoErr } = await supabase
        .from("quotations")
        .insert({
            company_id: data.companyId,
            marketing_uid: data.marketingUid,
            status: data.status,
            payload
        })
        .select()
        .single();
    if (quoErr) throw quoErr;

    const { error: logErr } = await supabase
        .from("nomor_surat_logs")
        .update({ status: "pending", quoId: quoDoc.id })
        .eq("id", nomorSuratLogId);
    if (logErr) throw logErr;

    return toQuotation(quoDoc);
}

export async function updateQuotationData(
    id: string,
    data: Partial<Quotation>
): Promise<void> {
    const { data: current } = await supabase.from("quotations").select("payload").eq("id", id).single();
    if (!current) return;

    const payload = { ...current.payload, ...data };
    
    const { error } = await supabase
        .from("quotations")
        .update({ payload })
        .eq("id", id);
    if (error) throw error;
}

export async function attachPdfToQuotation(id: string, pdfBase64: string): Promise<void> {
    await updateQuotationData(id, { pdfBase64 });
}

export async function deleteQuotation(id: string): Promise<void> {
    const { error } = await supabase.from("quotations").delete().eq("id", id);
    if (error) throw error;
}
