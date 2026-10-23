import { create } from "zustand";
import type { AppUser } from '@/entities/types';

const ACTIVE_COMPANY_KEY = 'fw_active_company_v1';
const DEFAULT_GUCI_COMPANY_ID = '00000000-0000-4000-a000-000000000001';

function readActiveCompany(): string | null {
    try {
        return localStorage.getItem(ACTIVE_COMPANY_KEY) || DEFAULT_GUCI_COMPANY_ID;
    } catch {
        return DEFAULT_GUCI_COMPANY_ID;
    }
}

interface AuthState {
    user: AppUser | null;
    loading: boolean;
    /**
     * Khusus SUPERADMIN: perusahaan yang sedang dioperasikan.
     * Otomatis terisi ke perusahaan milik akun atau PT Guci Emas Pratama sebagai default
     * agar SUPERADMIN langsung dapat melihat dan mengelola seluruh data tanpa layar kosong.
     */
    activeCompanyId: string | null;
    setUser: (user: AppUser | null) => void;
    setLoading: (loading: boolean) => void;
    setActiveCompanyId: (id: string | null) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    user: null,
    loading: true,
    activeCompanyId: readActiveCompany(),
    setUser: (user) => {
        const currentActive = get().activeCompanyId;
        const resolvedCompanyId =
            user?.companyId || currentActive || DEFAULT_GUCI_COMPANY_ID;
        try {
            if (resolvedCompanyId) {
                localStorage.setItem(ACTIVE_COMPANY_KEY, resolvedCompanyId);
            }
        } catch {
            /* abaikan */
        }
        set({ user, activeCompanyId: resolvedCompanyId });
    },
    setLoading: (loading) => set({ loading }),
    setActiveCompanyId: (id) => {
        try {
            id
                ? localStorage.setItem(ACTIVE_COMPANY_KEY, id)
                : localStorage.removeItem(ACTIVE_COMPANY_KEY);
        } catch {
            /* abaikan */
        }
        set({ activeCompanyId: id });
    },
}));
