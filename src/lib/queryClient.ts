/**
 * TanStack Query Configuration with Offline-First Persistence in IndexedDB
 */

import { QueryClient, dehydrate, hydrate, type DehydratedState } from "@tanstack/react-query";
import { idbKeyVal } from "./indexedDB";

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 5, // 5 menit
            gcTime: 1000 * 60 * 60 * 24 * 7, // 7 hari tersimpan
            networkMode: "offlineFirst", // Prioritaskan offline & cache lokal
            retry: 1,
            refetchOnWindowFocus: false,
        },
        mutations: {
            networkMode: "offlineFirst",
            retry: 0,
        },
    },
});

const PERSISTENCE_KEY = "tanstack_query_cache_v1";
let saveTimeout: any = null;

export async function initQueryClientPersistence(client: QueryClient): Promise<void> {
    try {
        // 1. Restore dehydrated cache from IndexedDB
        const savedCache = await idbKeyVal.get<DehydratedState>(PERSISTENCE_KEY);
        if (savedCache) {
            hydrate(client, savedCache);
        }
    } catch {
        // Abaikan error restorasi cache
    }

    // 2. Subscribe to query cache changes and debounce write to IndexedDB
    client.getQueryCache().subscribe((event) => {
        if (!event) return;

        if (saveTimeout) clearTimeout(saveTimeout);
        saveTimeout = setTimeout(async () => {
            try {
                const dehydrated = dehydrate(client, {
                    shouldDehydrateQuery: (query) => {
                        // Jangan simpan query yang sedang error fatal atau belum berhasil
                        return query.state.status === "success";
                    },
                });
                await idbKeyVal.set(PERSISTENCE_KEY, dehydrated);
            } catch {
                // Abaikan jika ada data non-serializable
            }
        }, 1200);
    });
}
