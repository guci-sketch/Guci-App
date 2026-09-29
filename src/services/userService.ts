/**
 * User Service - Supabase PostgreSQL user management per company
 */
import { supabase } from "../lib/supabase";
import type { AppUser, UserRole } from "../types";

const MAX_USERS_PER_COMPANY = 7; // Example limit

function mapRoleToAppUser(role: string): UserRole {
    switch (role) {
        case "SUPERADMIN": return "super_admin";
        case "ADMIN_PERUSAHAAN": return "administrator";
        case "MARKETING": return "marketing";
        case "TEKNISI": return "teknisi";
        case "SPV": return "admin_ops";
        case "GUDANG": return "admin_ops";
        default: return "teknisi";
    }
}

export async function getUsersByCompany(companyId: string): Promise<AppUser[]> {
    const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("company_id", companyId);

    if (error) throw error;
    
    return data.map((d: any) => ({
        uid: d.id,
        email: d.email,
        name: d.name,
        role: mapRoleToAppUser(d.role),
        companyId: d.company_id,
        isActive: d.is_active,
        wa: d.phone,
        jabatan: d.role,
    }));
}

export async function countActiveUsers(companyId: string): Promise<number> {
    const { count, error } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("is_active", true);
        
    if (error) throw error;
    return count || 0;
}

export async function hasUserSlot(companyId: string): Promise<boolean> {
    const count = await countActiveUsers(companyId);
    return count < MAX_USERS_PER_COMPANY;
}

export { MAX_USERS_PER_COMPANY };

export async function setUserActive(uid: string, isActive: boolean): Promise<void> {
    const { error } = await supabase
        .from("users")
        .update({ is_active: isActive })
        .eq("id", uid);
        
    if (error) throw error;
}

export async function activateUserAfterVerification(uid: string): Promise<void> {
    await setUserActive(uid, true);
}
