export type VocabSource = "user" | "ai" | "openverse" | "core";

export interface VocabRow {
  id: string;
  user_id: string;
  label: string;
  keywords: string[];
  category: string | null;
  emoji: string | null;
  image_path: string | null;
  image_url: string | null;
  source: VocabSource;
  is_favorite: boolean;
  pinned: boolean;
  use_count: number;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Unified search result item that the grid renders. */
export interface AacResult {
  key: string;
  label: string;
  emoji?: string | null;
  imageUrl?: string | null;
  source: VocabSource;
  vocabId?: string;      // present for saved vocab rows
  score: number;         // ranker score
  speak?: string;        // override text-to-speech
  meta?: {
    attribution?: string;
    license?: string;
    fullUrl?: string;
  };
}

export interface SentenceChip {
  id: string;             // client-side unique id
  label: string;
  emoji?: string | null;
  imageUrl?: string | null;
  speak?: string;
  vocabId?: string;
}
