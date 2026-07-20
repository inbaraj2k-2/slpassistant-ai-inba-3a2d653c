import { useEffect, useRef, useState } from "react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { runSearch } from "../engine/search";
import type { AacResult } from "../types";

export function useInstantSearch(query: string) {
  const [results, setResults] = useState<AacResult[]>([]);
  const [loading, setLoading] = useState(false);
  const online = useOnlineStatus();
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    abortRef.current?.abort();

    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);

    timerRef.current = setTimeout(async () => {
      try {
        const final = await runSearch(query, {
          online,
          signal: controller.signal,
          onPartial: (r) => {
            if (!controller.signal.aborted) setResults(r);
          },
        });
        if (!controller.signal.aborted) {
          setResults(final);
          setLoading(false);
        }
      } catch {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 120);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      controller.abort();
    };
  }, [query, online]);

  return { results, loading, online };
}
