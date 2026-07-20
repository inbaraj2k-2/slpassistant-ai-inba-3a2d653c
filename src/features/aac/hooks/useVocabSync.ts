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

    // 3) Realtime cross-device sync
    supabase.auth.getUser().then(({ data }) => {
      const uid = data.user?.id;
      if (!uid) return;
      const channel = supabase
        .channel(`aac_vocab_${uid}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "aac_vocabulary", filter: `user_id=eq.${uid}` },
          () => load(),
        )
        .subscribe();
      return () => {
        supabase.removeChannel(channel);
      };
    });

    return () => {
      alive = false;
    };
  }, []);

  return { rows, loaded };
}
