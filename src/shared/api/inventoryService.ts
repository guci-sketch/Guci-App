import { supabase } from '@/shared/lib/supabase';

export interface InventoryMutationParams {
    itemId: string;
    quantity: number;
    type: 'IN' | 'OUT';
    notes: string;
    pencatatId: string;
}

export async function processInventoryRPC(params: InventoryMutationParams) {
    const { data, error } = await supabase.rpc('process_inventory_mutation', {
        p_item_id: params.itemId,
        p_quantity: params.quantity,
        p_type: params.type,
        p_notes: params.notes,
        p_pencatat_id: params.pencatatId
    });

    if (error) {
        throw error;
    }
    
    return data;
}

export async function processStatusApprovalRPC(reportId: string, status: string, notes: string) {
    // For "persetujuan status laporan"
    const { data, error } = await supabase.rpc('process_status_approval', {
        p_report_id: reportId,
        p_status: status,
        p_notes: notes
    });

    if (error) {
        throw error;
    }

    return data;
}
