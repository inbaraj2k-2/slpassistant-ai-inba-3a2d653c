import type { AacResult } from "../types";

/**
 * Combine + sort results from multiple providers. Deduplicates by lowercase label,
 * keeping the entry with the higher score. Prefix matches always win.
 */
export function rankResults(query: string, groups: AacResult[][]): AacResult[] {
  const q = query.trim().toLowerCase();
  const merged = new Map<string, AacResult>();

  for (const list of groups) {
    for (const item of list) {
      const key = item.label.trim().toLowerCase();
      let score = item.score;
      if (q) {
        if (key === q) score += 500;
        else if (key.startsWith(q)) score += 300;
        else if (key.includes(q)) score += 100;
      }
      const existing = merged.get(key);
      if (!existing || score > existing.score) {
        merged.set(key, { ...item, score });
      }
    }
  }

  return Array.from(merged.values()).sort((a, b) => b.score - a.score);
}
