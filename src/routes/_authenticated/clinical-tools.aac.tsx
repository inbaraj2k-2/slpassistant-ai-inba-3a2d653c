import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { BOARDS, CORE_TILES, speak, type AacTile } from "@/lib/aac-data";
import { ArrowLeft, Delete, Play, Trash2, Volume2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/clinical-tools/aac")({
  head: () => ({
    meta: [
      { title: "AAC Communicator — SLP Assist AI" },
      { name: "description", content: "Multi-page AAC board with core words, categories, and a sentence strip using offline speech." },
    ],
  }),
  component: AacPage,
});

function AacPage() {
  const [boardId, setBoardId] = useState<string | null>(null);
  const [strip, setStrip] = useState<AacTile[]>([]);

  const currentBoard = BOARDS.find((b) => b.id === boardId) ?? null;

  const addTile = (t: AacTile) => {
    setStrip((s) => [...s, t]);
    speak(t.speak ?? t.label);
  };

  const speakStrip = () => {
    if (strip.length === 0) return;
    speak(strip.map((t) => t.speak ?? t.label).join(" "));
  };

  return (
    <AppShell title="AAC Communicator" subtitle={currentBoard ? currentBoard.name : "Core board"} back>
      {/* Sentence strip */}
      <div className="sticky top-16 z-10 mb-3 rounded-2xl border border-border bg-card/95 p-2 shadow-card backdrop-blur">
        <div className="flex min-h-[56px] flex-wrap items-center gap-1 rounded-xl bg-secondary/40 p-2">
          {strip.length === 0 ? (
            <p className="px-1 text-xs text-muted-foreground">Tap tiles to build a sentence…</p>
          ) : (
            strip.map((t, i) => (
              <span key={i} className="flex items-center gap-1 rounded-lg bg-card px-2 py-1 text-xs font-medium shadow-sm">
                <span>{t.emoji}</span>
                <span>{t.label}</span>
              </span>
            ))
          )}
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex gap-1">
            <button
              onClick={() => setStrip((s) => s.slice(0, -1))}
              className="grid h-9 w-9 place-items-center rounded-lg bg-secondary text-secondary-foreground"
              aria-label="Backspace"
            >
              <Delete className="h-4 w-4" />
            </button>
            <button
              onClick={() => setStrip([])}
              className="grid h-9 w-9 place-items-center rounded-lg bg-secondary text-secondary-foreground"
              aria-label="Clear"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <button
            onClick={speakStrip}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-gradient-primary px-3 text-xs font-semibold text-primary-foreground shadow-card"
          >
            <Play className="h-4 w-4" />
            Speak
          </button>
        </div>
      </div>

      {currentBoard ? (
        <>
          <button
            onClick={() => setBoardId(null)}
            className="mb-3 inline-flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Core board
          </button>
          <TileGrid tiles={currentBoard.tiles} onTap={addTile} />
        </>
      ) : (
        <>
          {/* Category selector */}
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Categories</p>
          <div className="mb-4 grid grid-cols-3 gap-2">
            {BOARDS.map((b) => (
              <button
                key={b.id}
                onClick={() => setBoardId(b.id)}
                className="flex flex-col items-center gap-1 rounded-xl border border-border bg-card p-2 text-center shadow-card active:scale-[0.98]"
              >
                <span className="text-2xl">{b.emoji}</span>
                <span className="text-[11px] font-medium leading-tight">{b.name}</span>
              </button>
            ))}
          </div>

          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Core words</p>
          <TileGrid tiles={CORE_TILES} onTap={addTile} />
        </>
      )}

      <p className="mt-6 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Volume2 className="h-3 w-3" /> Speech uses your device's built-in voice.
      </p>
    </AppShell>
  );
}

function TileGrid({ tiles, onTap }: { tiles: AacTile[]; onTap: (t: AacTile) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {tiles.map((t) => (
        <button
          key={t.label}
          onClick={() => onTap(t)}
          className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border border-border bg-card p-2 text-center shadow-card transition active:scale-[0.96]"
        >
          <span className="text-3xl leading-none">{t.emoji}</span>
          <span className="text-[11px] font-semibold leading-tight">{t.label}</span>
        </button>
      ))}
    </div>
  );
}
