import { Sparkles, Trash2, WifiOff } from "lucide-react";
import { memo, useRef } from "react";
import type { AacResult } from "../types";

interface Props {
  results: AacResult[];
  loading: boolean;
  online: boolean;
  query: string;
  onPick: (r: AacResult) => void;
  onLongPress: (r: AacResult) => void;
  onGenerate: () => void;
  generating: boolean;
}

export const ResultsGrid = memo(function ResultsGrid({
  results,
  loading,
  online,
  query,
  onPick,
  onLongPress,
  onGenerate,
  generating,
}: Props) {
  const showGenerate = query.trim().length >= 2 && online && results.length < 8;

  if (!results.length && !loading && !showGenerate) {
    return (
      <div className="grid place-items-center rounded-xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
        {query ? (
          !online ? (
            <span className="flex items-center gap-1.5">
              <WifiOff className="h-3.5 w-3.5" /> Offline — try a core word.
            </span>
          ) : (
            "No matches yet."
          )
        ) : (
          "Start typing to search."
        )}
      </div>
    );
  }

  return (
    <div
      role="listbox"
      aria-label="AAC search results"
      className="grid grid-cols-3 gap-2 sm:grid-cols-4"
    >
      {results.map((r) => (
        <Tile key={r.key} result={r} onPick={onPick} onLongPress={onLongPress} />
      ))}
      {showGenerate && (
        <button
          onClick={onGenerate}
          disabled={generating}
          className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-primary/50 bg-primary/5 p-2 text-center text-primary transition active:scale-[0.97] disabled:opacity-60"
          aria-label={`Generate AI symbol for ${query}`}
        >
          <Sparkles className={`h-6 w-6 ${generating ? "animate-pulse" : ""}`} />
          <span className="text-[10px] font-semibold leading-tight">
            {generating ? "Generating…" : "Generate with AI"}
          </span>
        </button>
      )}
    </div>
  );
});

interface TileProps {
  result: AacResult;
  onPick: (r: AacResult) => void;
  onLongPress: (r: AacResult) => void;
}

function Tile({ result, onPick, onLongPress }: TileProps) {
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressed = useRef(false);

  const startPress = () => {
    if (result.source !== "user" && result.source !== "ai") return;
    longPressed.current = false;
    pressTimer.current = setTimeout(() => {
      longPressed.current = true;
      onLongPress(result);
    }, 550);
  };
  const cancelPress = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  return (
    <button
      role="option"
      onClick={() => {
        if (longPressed.current) {
          longPressed.current = false;
          return;
        }
        onPick(result);
      }}
      onPointerDown={startPress}
      onPointerUp={cancelPress}
      onPointerLeave={cancelPress}
      onPointerCancel={cancelPress}
      className="group relative flex aspect-square flex-col items-center justify-center gap-1 overflow-hidden rounded-xl border border-border bg-card p-1.5 text-center shadow-sm transition active:scale-[0.96]"
      aria-label={result.label}
    >
      <div className="flex flex-1 items-center justify-center">
        {result.imageUrl ? (
          <img
            src={result.imageUrl}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            className="max-h-[68%] max-w-[85%] object-contain"
          />
        ) : (
          <span className="text-3xl leading-none">{result.emoji ?? "🔤"}</span>
        )}
      </div>
      <span className="line-clamp-2 min-h-[24px] text-[11px] font-semibold leading-tight">
        {result.label}
      </span>
      {result.source === "ai" && (
        <span className="absolute right-1 top-1 rounded-full bg-primary/90 px-1.5 text-[9px] font-bold text-primary-foreground">
          AI
        </span>
      )}
      {(result.source === "user" || result.source === "ai") && (
        <span className="pointer-events-none absolute bottom-0.5 right-0.5 opacity-0 transition group-hover:opacity-100">
          <Trash2 className="h-3 w-3 text-muted-foreground" />
        </span>
      )}
    </button>
  );
}
