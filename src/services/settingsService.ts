/**
 * Settings Service - Supabase PostgreSQL
 * Table: company_settings (Assuming this will be created, or storing in a settings table)
 */
import { supabase } from "../lib/supabase";

export interface TemplateConfig {
    primaryColor: string;
    logoBase64: string;
    logoWidthMm: number;
    logoHeightMm: number;
    logoPosition: "left" | "right";
    showTagline: boolean;
    showBranch: boolean;
    showPageNumber: boolean;
    customTaglineText: string;
}

export const TEMPLATE_DEFAULTS: TemplateConfig = {
    primaryColor:    "#1a5c38",
    logoBase64:      "",
    logoWidthMm:     40,
    logoHeightMm:    15,
    logoPosition:    "right",
    showTagline:     true,
    showBranch:      true,
    showPageNumber:  true,
    customTaglineText: "",
};

export interface CompanySettings {
    companyName:    string;
    companyTagline?: string;
    headOffice:     string;
    branchOffice?:  string;
    telp:           string;
    wa:             string;
    email:          string;
    website:        string;
    nomorPrefix:    string;
    ttdNama?:       string;
    ttdJabatan?:    string;
    template?:      TemplateConfig;
    updatedAt?:     Date;
    updatedBy?:     string;
}

const DEFAULTS: CompanySettings = {
    companyName:    "PT GUCI EMAS PRATAMA",
    companyTagline: "",
    headOffice:     "Jln. Ganda Sasmita No.1 Serua, Ciputat - Tangerang Selatan 15414",
    branchOffice:   "Pondok Trosobo Indah Blok I No.3, Sidoarjo - Jawa Timur. Telp : (031) 70235866",
    telp:           "(021) 74637054",
    wa:             "0817 0795 959",
    email:          "info@gucimaspratama.co.id",
    website:        "www.gucimaspratama.co.id",
    nomorPrefix:    "GP",
    ttdNama:        "",
    ttdJabatan:     "",
    template:       { ...TEMPLATE_DEFAULTS },
};

export async function getCompanySettings(companyId: string): Promise<CompanySettings> {
    // For now, if table company_settings doesn't exist, we fallback to defaults.
    // In production, ensure this table exists:
    // CREATE TABLE company_settings (company_id uuid PRIMARY KEY, settings jsonb);
    try {
        const { data, error } = await supabase
            .from("company_settings")
            .select("settings")
            .eq("company_id", companyId)
            .single();

        if (error || !data) return { ...DEFAULTS, template: { ...TEMPLATE_DEFAULTS } };

        const d = data.settings as Record<string, any>;
        return {
            ...DEFAULTS,
            ...d,
            template: {
                ...TEMPLATE_DEFAULTS,
                ...((d.template as Partial<TemplateConfig>) ?? {}),
            },
            updatedAt: d.updatedAt ? new Date(d.updatedAt) : undefined,
        };
    } catch {
        return { ...DEFAULTS, template: { ...TEMPLATE_DEFAULTS } };
    }
}

export async function saveCompanySettings(
    companyId: string,
    settings: Omit<CompanySettings, "updatedAt">,
    updatedBy: string,
): Promise<void> {
    const payload = {
        ...settings,
        updatedAt: new Date().toISOString(),
        updatedBy,
    };

    const { error } = await supabase
        .from("company_settings")
        .upsert({ 
            company_id: companyId, 
            settings: payload 
        }, { onConflict: 'company_id' });

    if (error) {
        console.error("Failed to save settings:", error);
        throw error;
    }
}
