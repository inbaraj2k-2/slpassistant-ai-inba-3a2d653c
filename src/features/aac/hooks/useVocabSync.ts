import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { saveVocabSnapshot, readVocabSnapshot } from "../engine/cache";
import { indexVocab } from "../providers/userVocabProvider";
import type { VocabRow } from "../types";

/**
 * Hydrates the in-memory user vocab index from the offline snapshot first,
 * then refreshes it from Supabase. Kept side-effect only (no React state) so
 * every load doesn't rerender the SmartKeyboard subtree — a hot path on
 * Android where extra renders were compounding jank.
 */
export function useVocabSync() {
  useEffect(() => {
    let alive = true;
    let loading = false;

    // 1) Warm from offline snapshot.
    (async () => {
      const snap = await readVocabSnapshot<VocabRow[]>();
      if (snap && alive) indexVocab(snap);
    })();

    // 2) Fetch fresh.
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
    void load();

    // 3) Realtime cross-device sync — track channel locally so cleanup
    //    always removes it even if the auth lookup hasn't resolved yet.
    let channel: ReturnType<typeof supabase.channel> | null = null;
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      const uid = data.session?.user?.id;
      if (!uid) return;
      channel = supabase
        .channel(`aac_vocab_${uid}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "aac_vocabulary", filter: `user_id=eq.${uid}` },
          () => void load(),
        )
        .subscribe();
    });

    return () => {
      alive = false;
      if (channel) supabase.removeChannel(channel).catch(() => {});
    };
  }, []);
}


