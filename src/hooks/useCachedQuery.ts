import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { useEffect } from "react";

/**
 * useQuery variant that persists results to localStorage keyed by `cacheKey`
 * and returns the cached snapshot when the network read fails (offline).
 *
 * Data must be JSON-serializable.
 */
export function useCachedQuery<T>(
  cacheKey: string,
  queryFn: () => Promise<T>,
  options?: Omit<UseQueryOptions<T>, "queryKey" | "queryFn">,
) {
  const query = useQuery<T>({
    queryKey: [cacheKey],
    queryFn: async () => {
      try {
        const data = await queryFn();
        try {
          localStorage.setItem(cacheKey, JSON.stringify({ data, at: Date.now() }));
        } catch {
          /* quota */
        }
        return data;
      } catch (err) {
        // Offline / RLS blocked: return the last-good local cache when present.
        try {
          const raw = localStorage.getItem(cacheKey);
          if (raw) {
            const parsed = JSON.parse(raw) as { data: T };
            return parsed.data;
          }
        } catch {
          /* fall through */
        }
        throw err;
      }
    },
    ...options,
  });

  // Warm the cache on first render if the query is still pending.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (query.data !== undefined) return;
    try {
      const raw = localStorage.getItem(cacheKey);
      if (!raw) return;
      // no-op: query will hydrate on its own; this effect just guards SSR.
    } catch {
      /* ignore */
    }
  }, [cacheKey, query.data]);

  return query;
}
