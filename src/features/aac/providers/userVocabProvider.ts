import Fuse from "fuse.js";
import type { AacResult, VocabRow } from "../types";

let indexed: { fuse: Fuse<VocabRow>; rows: VocabRow[] } | null = null;

export function indexVocab(rows: VocabRow[]) {
  indexed = {
    rows,
    fuse: new Fuse(rows, {
      keys: ["label", "keywords", "category"],
      threshold: 0.4,
      ignoreLocation: true,
      includeScore: true,
    }),
  };
}

function rowToResult(row: VocabRow, score: number): AacResult {
  return {
    key: `vocab:${row.id}`,
    label: row.label,
    emoji: row.emoji,
    imageUrl: row.image_url,
    source: row.source,
    vocabId: row.id,
    score,
  };
}

export function searchUserVocab(query: string, limit = 12): AacResult[] {
  if (!indexed) return [];
  const q = query.trim();
  if (!q) {
    // Return favorites + pinned + recently used
    return indexed.rows
      .slice()
      .sort((a, b) => {
        const pa = (a.pinned ? 1000 : 0) + (a.is_favorite ? 500 : 0) + a.use_count;
        const pb = (b.pinned ? 1000 : 0) + (b.is_favorite ? 500 : 0) + b.use_count;
        return pb - pa;
      })
      .slice(0, limit)
      .map((r) => rowToResult(r, 200 + r.use_count));
  }
  return indexed.fuse
    .search(q, { limit })
    .map(({ item, score }) => rowToResult(item, 300 + (1 - (score ?? 1)) * 100 + item.use_count));
}

export function getAllVocab(): VocabRow[] {
  return indexed?.rows ?? [];
}
