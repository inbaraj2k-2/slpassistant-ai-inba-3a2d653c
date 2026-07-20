import { searchCore } from "../providers/coreProvider";
import { searchOpenverse } from "../providers/openverseProvider";
import { searchUserVocab } from "../providers/userVocabProvider";
import type { AacResult } from "../types";
import { getCachedResults, putCachedResults } from "./cache";
import { rankResults } from "./ranker";

interface SearchOpts {
  online: boolean;
  signal?: AbortSignal;
  onPartial?: (r: AacResult[]) => void;
}

/**
 * Run the full search priority chain. Emits partial results as fast providers
 * return so the UI feels instant, then upgrades once Openverse responds.
 */
export async function runSearch(query: string, opts: SearchOpts): Promise<AacResult[]> {
  const q = query.trim();
  if (!q) return [];

  // 1) Instant: user vocab + core dictionary (both in-memory).
  const local = rankResults(q, [searchUserVocab(q), searchCore(q)]);
  opts.onPartial?.(local);

  // 2) Cached remote results (if present).
  const cached = await getCachedResults(q);
  if (cached && cached.length) {
    const merged = rankResults(q, [searchUserVocab(q), searchCore(q), cached]);
    opts.onPartial?.(merged);
  }

  // 3) Online: hit Openverse. Skip if offline.
  if (!opts.online) return cached ? rankResults(q, [local, cached]) : local;

  const ov = await searchOpenverse(q, opts.signal);
  if (opts.signal?.aborted) return local;

  const finalResults = rankResults(q, [searchUserVocab(q), searchCore(q), ov]);
  if (ov.length) putCachedResults(q, ov);
  return finalResults;
}
