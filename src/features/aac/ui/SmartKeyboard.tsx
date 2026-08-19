import { Play, Search, WifiOff } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { speakText } from "@/lib/native";
import { generateAiSymbol } from "../ai/generateSymbol";
import { useInstantSearch } from "../hooks/useInstantSearch";
import { useVocabSync } from "../hooks/useVocabSync";
import { getAllVocab, indexVocab } from "../providers/userVocabProvider";
import { upsertVocab, recordUse } from "@/lib/aac.functions";
import type { AacResult, SentenceChip, VocabRow } from "../types";
import { CoreRow } from "./CoreRow";
import { MyBoard } from "./MyBoard";
import { ResultsGrid } from "./ResultsGrid";
import { SentenceStrip } from "./SentenceStrip";
import { VocabEditorSheet } from "./VocabEditorSheet";
import { supabase } from "@/integrations/supabase/client";

export function SmartKeyboard() {
  const [query, setQuery] = useState("");
  const [chips, setChips] = useState<SentenceChip[]>([]);
  const [generating, setGenerating] = useState(false);
  const [editing, setEditing] = useState<VocabRow | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [boardKey, setBoardKey] = useState(0);

  useVocabSync();

  const refreshBoard = useCallback(async () => {
    setBoardKey((k) => k + 1);
    try {
      const { data } = await supabase
        .from("aac_vocabulary")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(2000);
      if (data) {
        indexVocab(data as unknown as VocabRow[]);
        setBoardKey((k) => k + 1);
      }
    } catch {
      /* noop */
    }
  }, []);

  const { results, loading, online } = useInstantSearch(query);

  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flash = useCallback((msg: string) => {
    setBanner(msg);
    if (bannerTimer.current) clearTimeout(bannerTimer.current);
    bannerTimer.current = setTimeout(() => setBanner(null), 2200);
  }, []);

  const addChip = useCallback(
    (r: AacResult) => {
      const chip: SentenceChip = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        label: r.label,
        emoji: r.emoji,
        imageUrl: r.imageUrl ?? null,
        speak: r.speak ?? r.label,
        vocabId: r.vocabId,
      };
      setChips((s) => [...s, chip]);
      void speakText(chip.speak ?? chip.label);

      if (r.vocabId) {
        recordUse({ data: { id: r.vocabId } }).catch(() => {});
      } else if (r.source === "openverse" || r.source === "core") {
        upsertVocab({
          data: {
            label: r.label,
            keywords: [],
            image_url: r.imageUrl ?? null,
            emoji: r.emoji ?? null,
            source: r.source === "openverse" ? "openverse" : "user",
          },
        }).catch(() => {});
      }

      // A result tap is an ordinary user interaction. Do not refocus the
      // search input here: the browser/Android WebView owns focus and must be
      // allowed to transfer it naturally between controls.
      setQuery("");
    },
    [],
  );

  const speakSentence = useCallback(() => {
    if (chips.length === 0) return;
    speakText(chips.map((c) => c.speak ?? c.label).join(" "));
  }, [chips]);

  const handleGenerate = useCallback(async () => {
    if (!query.trim() || generating || !online) return;
    setGenerating(true);
    try {
      const row = await generateAiSymbol(query.trim());
      const list = [...getAllVocab(), row as unknown as VocabRow];
      indexVocab(list);
      addChip({
        key: `vocab:${row.id}`,
        label: row.label,
        emoji: row.emoji,
        imageUrl: row.image_url,
        source: "ai",
        vocabId: row.id,
        score: 999,
      });
      flash(`Added "${row.label}" to your library.`);
    } catch (e) {
      flash(e instanceof Error ? e.message : "AI generation failed");
    } finally {
      setGenerating(false);
    }
  }, [query, generating, online, addChip, flash]);

  const openEditor = useCallback((r: AacResult) => {
    const row = getAllVocab().find((v) => v.id === r.vocabId);
    if (row) setEditing(row);
  }, []);

  const emptyQuery = !query.trim();

  return (
    <div className="relative flex flex-col gap-3 pb-6">
      <SentenceStrip
        chips={chips}
        onRemove={(i) => setChips((s) => s.filter((_, idx) => idx !== i))}
        onMove={(from, to) =>
          setChips((s) => {
            const next = s.slice();
            const [item] = next.splice(from, 1);
            next.splice(to, 0, item);
            return next;
          })
        }
        onClear={() => setChips([])}
        onBackspace={() => setChips((s) => s.slice(0, -1))}
      />

      <div className="sticky top-16 z-10 rounded-2xl border border-border bg-card p-2 shadow-card">
        <div className="flex items-center gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-xl bg-secondary/50 px-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              type="text"
              inputMode="search"
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="search"
              placeholder="Type a word…"
              aria-label="Search AAC vocabulary"
              className="h-11 flex-1 border-0 bg-transparent text-base outline-none placeholder:text-muted-foreground"
            />
            {!online && (
              <span
                className="flex items-center gap-1 text-[10px] font-semibold text-amber-600"
                title="Offline"
              >
                <WifiOff className="h-3 w-3" /> Offline
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={speakSentence}
            disabled={chips.length === 0}
            aria-label="Speak sentence"
            className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-gradient-primary px-4 text-sm font-semibold text-primary-foreground shadow-card disabled:opacity-40"
          >
            <Play className="h-4 w-4" />
            Speak
          </button>
        </div>
        {loading && <div className="mt-1 h-0.5 animate-pulse rounded bg-primary/40" />}
      </div>

      {banner && (
        <div className="rounded-lg bg-primary/10 px-3 py-1.5 text-[11px] font-medium text-primary">
          {banner}
        </div>
      )}

      {emptyQuery ? (
        <>
          <MyBoard onPick={addChip} refreshKey={boardKey} onChanged={refreshBoard} />
          <CoreRow onPick={addChip} />
        </>
      ) : (
        <ResultsGrid
          results={results}
          loading={loading}
          online={online}
          query={query}
          onPick={addChip}
          onLongPress={openEditor}
          onGenerate={handleGenerate}
          generating={generating}
        />
      )}

      {editing && (
        <VocabEditorSheet
          row={editing}
          onClose={() => {
            setEditing(null);
            void refreshBoard();
          }}
        />
      )}
    </div>
  );
}
