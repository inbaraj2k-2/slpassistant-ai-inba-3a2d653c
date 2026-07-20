import { memo } from "react";
import { CORE_WORDS } from "../data/core-words";
import type { AacResult } from "../types";

export const CoreRow = memo(function CoreRow({ onPick }: { onPick: (r: AacResult) => void }) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Core words
      </p>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
        {CORE_WORDS.map((w) => (
          <button
            key={w.key}
            onClick={() => onPick(w)}
            className="flex aspect-square flex-col items-center justify-center gap-0.5 rounded-xl bg-primary/5 p-1 text-center transition active:scale-[0.96]"
            aria-label={w.label}
          >
            <span className="text-2xl leading-none">{w.emoji}</span>
            <span className="text-[10px] font-semibold leading-tight">{w.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
});
