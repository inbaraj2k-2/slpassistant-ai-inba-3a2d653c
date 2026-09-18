import { useEffect } from "react";
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
  useEffect(() => {
    let alive = true;
    let loading = false;
    let reloadTimer: ReturnType<typeof setTimeout> | null = null;

    const load = async () => {
      if (loading || !alive) return;
      loading = true;
      try {
        const { data } = await supabase
          .from("aac_vocabulary")
          .select("*")
          .order("updated_at", { ascending: false })
          .limit(2000);
        if (!alive) return;
        const list = (data ?? []) as unknown as VocabRow[];
        indexVocab(list);
        void saveVocabSnapshot(list);
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

    // 1) Warm from offline snapshot.
    void readVocabSnapshot<VocabRow[]>().then((snap) => {
      if (snap && alive) indexVocab(snap);
    });

    // 2) Fetch fresh.
    void load();

    // 3) Realtime cross-device sync. Coalesce bursts so recordUse or a batch
    //    of edits produces one indexed reload rather than one per event.
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
