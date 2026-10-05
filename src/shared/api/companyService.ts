/**
 * Company Service - Supabase PostgreSQL CRUD
 * Digunakan oleh super_admin untuk mengelola perusahaan
 */
import { supabase } from '@/shared/lib/supabase';
import type { Company } from '@/entities/types';

function toCompany(data: any): Company {
    return {
        id: data.id,
        name: data.company_name,
        isActive: data.status === "ACTIVE",
        plan: data.subscription_plan === "FREE_TIER" ? "free" : "pro" // Optional, map if present in schema later
    };
}

export async function getCompanies(): Promise<Company[]> {
    const { data, error } = await supabase
        .from("companies")
        .select("*")
        .order("company_name");

    if (error) throw error;
    return data.map(toCompany);
}

export async function getCompanyById(id: string): Promise<Company | null> {
    const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("id", id)
        .single();

    if (error || !data) return null;
    return toCompany(data);
}

export async function isCompanyActive(companyId: string): Promise<boolean> {
    const company = await getCompanyById(companyId);
    if (!company) return false;
    return company.isActive;
}

export interface CreateCompanyData {
    name: string;
    plan: Company["plan"];
    expiredAt?: Date;
}

export async function createCompany(data: CreateCompanyData): Promise<Company> {
    // Generate a simple slug for the required field
    const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.random().toString(36).substring(2, 7);
    
    const { data: newDoc, error } = await supabase
        .from("companies")
        .insert({
            company_name: data.name,
            company_slug: slug,
            status: "ACTIVE",
            subscription_plan: data.plan === "free" ? "FREE_TIER" : "PROFESSIONAL",
            max_technicians: data.plan === "free" ? 2 : 20
        })
        .select()
        .single();

    if (error) throw error;
    return toCompany(newDoc);
}

export async function setCompanyActive(id: string, isActive: boolean): Promise<void> {
    const status = isActive ? "ACTIVE" : "SUSPENDED";
    const { error } = await supabase
        .from("companies")
        .update({ status })
        .eq("id", id);
        
    if (error) throw error;
}

export async function updateCompanyPlan(
    id: string,
    plan: Company["plan"],
    expiredAt?: Date
): Promise<void> {
    const { error } = await supabase
        .from("companies")
        .update({ 
            subscription_plan: plan === "free" ? "FREE_TIER" : "PROFESSIONAL",
            max_technicians: plan === "free" ? 2 : 20
        })
        .eq("id", id);

    if (error) throw error;
}
