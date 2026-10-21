import { create } from "zustand";
import type { AppUser } from '@/entities/types';

const ACTIVE_COMPANY_KEY = 'fw_active_company_v1';

function readActiveCompany(): string | null {
    try { return localStorage.getItem(ACTIVE_COMPANY_KEY); } catch { return null; }
}

interface AuthState {
    user: AppUser | null;
    loading: boolean;
    /**
     * Khusus SUPERADMIN: perusahaan yang sedang dioperasikan (dikirim sebagai header X-Company-Id).
     * Untuk role lain nilai ini diabaikan — backend memakai perusahaan milik akun itu sendiri.
     */
    activeCompanyId: string | null;
    setUser: (user: AppUser | null) => void;
    setLoading: (loading: boolean) => void;
    setActiveCompanyId: (id: string | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    loading: true,
    activeCompanyId: readActiveCompany(),
    setUser: (user) => set({ user }),
    setLoading: (loading) => set({ loading }),
    setActiveCompanyId: (id) => {
        try { id ? localStorage.setItem(ACTIVE_COMPANY_KEY, id) : localStorage.removeItem(ACTIVE_COMPANY_KEY); } catch { /* abaikan */ }
        set({ activeCompanyId: id });
    },
}));
