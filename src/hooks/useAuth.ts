import { useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/authStore";
import type { AppUser, UserRole } from "../types";

export function useAuth() {
    const { user, loading, setUser, setLoading } = useAuthStore();

    useEffect(() => {
        let mounted = true;

        async function fetchUserProfile(userId: string) {
            try {
                const { data: userData, error } = await supabase
                    .from("users")
                    .select("*, companies(status, subscription_plan)")
                    .eq("id", userId)
                    .single();

                if (error || !userData) {
                    console.error("User profile not found:", error);
                    return null;
                }

                // Map Postgres roles to the AppUser roles expected by the frontend
                let role: UserRole = "teknisi"; // Default
                switch (userData.role) {
                    case "SUPERADMIN": role = "super_admin"; break;
                    case "ADMIN_PERUSAHAAN": role = "administrator"; break;
                    case "MARKETING": role = "marketing"; break;
                    case "TEKNISI": role = "teknisi"; break;
                    case "SPV": role = "admin_ops"; break; // mapping SPV to admin_ops for now
                    case "GUDANG": role = "admin_ops"; break; // mapping GUDANG
                }

                const appUser: AppUser = {
                    uid: userData.id,
                    email: userData.email,
                    name: userData.name,
                    role: role,
                    companyId: userData.company_id,
                    isActive: userData.is_active,
                    wa: userData.phone,
                    jabatan: userData.role,
                };

                return appUser;
            } catch (err) {
                console.error("Error fetching user profile:", err);
                return null;
            }
        }

        async function initAuth() {
            const { data: { session } } = await supabase.auth.getSession();
            
            if (session?.user) {
                const profile = await fetchUserProfile(session.user.id);
                if (mounted) setUser(profile);
            } else {
                if (mounted) setUser(null);
            }
            if (mounted) setLoading(false);
        }

        initAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session?.user) {
                const profile = await fetchUserProfile(session.user.id);
                if (mounted) setUser(profile);
            } else if (event === 'SIGNED_OUT') {
                if (mounted) setUser(null);
            }
            if (mounted) setLoading(false);
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, [setUser, setLoading]);

    return { user, loading };
}
