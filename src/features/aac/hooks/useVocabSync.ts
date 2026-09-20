import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { saveVocabSnapshot, readVocabSnapshot } from "../engine/cache";
import { indexVocab } from "../providers/userVocabProvider";
import type { VocabRow } from "../types";

/**
 * Hydrates the user vocabulary index from the offline snapshot first, then
 * refreshes it from Supabase. Realtime changes are coalesced so a burst of
 * updates cannot rebuild the 2,000-row Fuse index repeatedly on the WebView
 * main thread.
 */
export function useVocabSync() {
  const previousDataHash = useRef("");

  useEffect(() => {
    let alive = true;
    let loading = false;
    let reloadTimer: ReturnType<typeof setTimeout> | null = null;

    const getDataHash = (rows: VocabRow[]) => {
      // Hash the fields that can affect AAC search/results instead of relying
      // only on length + latest timestamp. That older shortcut could miss an
      // in-place row edit and could incorrectly keep a stale offline snapshot.
      let hash = 2166136261;
      for (const row of rows) {
        const value = [
          row.id,
          row.updated_at,
          row.label,
          row.category,
          row.emoji,
          row.image_url,
          row.source,
          row.is_favorite,
          row.pinned,
          row.use_count,
          ...(row.keywords ?? []),
        ]
          .map((part) => String(part ?? ""))
          .join("\u001f");

        for (let i = 0; i < value.length; i += 1) {
          hash ^= value.charCodeAt(i);
          hash = Math.imul(hash, 16777619);
        }
      }
      return `${rows.length}-${hash >>> 0}`;
    };

    const load = async () => {
      if (loading || !alive) return;
      loading = true;
      try {
        const { data, error } = await supabase
          .from("aac_vocabulary")
          .select("*")
          .order("updated_at", { ascending: false })
          .limit(2000);
        if (!alive) return;
        if (error) throw error;

        const list = (data ?? []) as unknown as VocabRow[];
        const dataHash = getDataHash(list);

        // Fuse construction is synchronous and can block the WebView main
        // thread for a large vocabulary. Do not rebuild the index when the
        // underlying searchable data has not changed.
        if (previousDataHash.current !== dataHash) {
          indexVocab(list);
          previousDataHash.current = dataHash;
          void saveVocabSnapshot(list);
        }
      } catch {
        // Offline or transient auth/network errors should not block the UI.
      } finally {
        loading = false;
      }
    };

    const scheduleReload = () => {
      if (reloadTimer) clearTimeout(reloadTimer);
      reloadTimer = setTimeout(() => {
        reloadTimer = null;
        void load();
      }, 400);
    };

    // Warm from the offline snapshot first. The fresh Supabase result is
    // still allowed to replace it when any searchable row data differs.
    void readVocabSnapshot<VocabRow[]>().then((snap) => {
      if (!snap || !alive) return;
      indexVocab(snap);
      previousDataHash.current = getDataHash(snap);
    });

    void load();

    // Realtime cross-device sync. Coalesce bursts so recordUse or a batch of
    // edits produces one indexed reload rather than one per event.
    let channel: ReturnType<typeof supabase.channel> | null = null;
    void supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      const uid = data.session?.user?.id;
      if (!uid) return;
      channel = supabase
        .channel(`aac_vocab_${uid}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "aac_vocabulary", filter: `user_id=eq.${uid}` },
          scheduleReload,
        )
        .subscribe();
    });

    return () => {
      alive = false;
      if (reloadTimer) {
        clearTimeout(reloadTimer);
        reloadTimer = null;
      }
      if (channel) void supabase.removeChannel(channel).catch(() => {});
    };
  }, []);
}
