import { createStore, get, set, del, keys } from "idb-keyval";
import type { AacResult } from "../types";

// Dedicated IndexedDB store for AAC search cache + thumb cache.
const store = createStore("slp-aac", "cache-v1");

interface CacheEntry {
  results: AacResult[];
  ts: number;
}

const MAX_QUERIES = 300;

function normalize(q: string) {
  return q.trim().toLowerCase();
}

export async function getCachedResults(query: string): Promise<AacResult[] | null> {
  try {
    const entry = await get<CacheEntry>(`q:${normalize(query)}`, store);
    if (!entry) return null;
    // 7 day TTL
    if (Date.now() - entry.ts > 7 * 24 * 60 * 60 * 1000) return null;
    return entry.results;
  } catch {
    return null;
  }
}

export async function putCachedResults(query: string, results: AacResult[]) {
  try {
    await set(`q:${normalize(query)}`, { results, ts: Date.now() }, store);
    // LRU trim
    const all = await keys(store);
    const queryKeys = all.filter((k) => typeof k === "string" && (k as string).startsWith("q:"));
    if (queryKeys.length > MAX_QUERIES) {
      // Simple LRU: read timestamps and remove oldest 10%.
      const withTs = await Promise.all(
        queryKeys.map(async (k) => ({ k, ts: (await get<CacheEntry>(k as string, store))?.ts ?? 0 })),
      );
      withTs.sort((a, b) => a.ts - b.ts);
      const toRemove = withTs.slice(0, Math.ceil(queryKeys.length * 0.1));
      await Promise.all(toRemove.map((e) => del(e.k as string, store)));
    }
  } catch {
    /* ignore quota errors */
  }
}

// Persist a snapshot of the user's vocabulary so it's available offline.
export async function saveVocabSnapshot(rows: unknown) {
  try {
    await set("vocab-snapshot", { rows, ts: Date.now() }, store);
  } catch {
    /* ignore */
  }
}

export async function readVocabSnapshot<T = unknown>(): Promise<T | null> {
  try {
    const v = await get<{ rows: T; ts: number }>("vocab-snapshot", store);
    return v?.rows ?? null;
  } catch {
    return null;
  }
}
