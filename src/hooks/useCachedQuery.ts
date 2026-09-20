import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { get, set } from "idb-keyval";

/**
 * useQuery variant that persists results to IndexedDB keyed by `cacheKey`
 * and returns the cached snapshot when the network read fails (offline).
 *
 * Data must be JSON-serializable.
 */
export function useCachedQuery<T>(
  cacheKey: string,
  queryFn: () => Promise<T>,
  options?: Omit<UseQueryOptions<T>, "queryKey" | "queryFn">,
) {
  return useQuery<T>({
    queryKey: [cacheKey],
    queryFn: async () => {
      try {
        const data = await queryFn();
        try {
          await set(cacheKey, { data, at: Date.now() });
        } catch {
          /* storage unavailable / quota */
        }
        return data;
      } catch (err) {
        // Offline / RLS blocked: return the last-good local cache when present.
        try {
          const cached = await get<{ data: T }>(cacheKey);
          if (cached) return cached.data;
        } catch {
          /* fall through */
        }
        throw err;
      }
    },
    ...options,
  });
}
