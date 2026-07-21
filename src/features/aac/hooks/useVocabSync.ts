import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { saveVocabSnapshot, readVocabSnapshot } from "../engine/cache";
import { indexVocab } from "../providers/userVocabProvider";
import type { VocabRow } from "../types";

export function useVocabSync() {
  const [rows, setRows] = useState<VocabRow[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;

    // 1) Warm from offline snapshot
    (async () => {
      const snap = await readVocabSnapshot<VocabRow[]>();
      if (snap && alive) {
        setRows(snap);
        indexVocab(snap);
      }
    })();

    // 2) Fetch fresh
    const load = async () => {
      const { data } = await supabase
        .from("aac_vocabulary")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(2000);
      if (!alive) return;
      const list = (data ?? []) as unknown as VocabRow[];
      setRows(list);
      indexVocab(list);
      saveVocabSnapshot(list);
      setLoaded(true);
    };
    load();

    // 3) Realtime cross-device sync — track channel in a ref-like local so
    //    the outer cleanup below always removes it. (Returning cleanup from
    //    a Promise callback does nothing and leaks a channel per mount,
    //    which piled up over time and froze the WebView on Android.)
    let channel: ReturnType<typeof supabase.channel> | null = null;
    supabase.auth.getUser().then(({ data }) => {
      if (!alive) return;
      const uid = data.user?.id;
      if (!uid) return;
      channel = supabase
        .channel(`aac_vocab_${uid}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "aac_vocabulary", filter: `user_id=eq.${uid}` },
          () => load(),
        )
        .subscribe();
    });

    return () => {
      alive = false;
      if (channel) supabase.removeChannel(channel).catch(() => {});
    };
  }, []);

  return { rows, loaded };
}

