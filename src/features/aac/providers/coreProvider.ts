import Fuse from "fuse.js";
import { CORE_DICTIONARY } from "../data/core-words";
import type { AacResult } from "../types";

const fuse = new Fuse(CORE_DICTIONARY, {
  keys: ["label", "keywords"],
  threshold: 0.35,
  ignoreLocation: true,
  includeScore: true,
});

export function searchCore(query: string, limit = 8): AacResult[] {
  const q = query.trim();
  if (!q) return [];
  return fuse
    .search(q, { limit })
    .map(({ item, score }) => ({
      key: `core-dict:${item.label}`,
      label: item.label,
      emoji: item.emoji,
      source: "core" as const,
      score: 60 + (1 - (score ?? 1)) * 40, // 60-100
    }));
}
