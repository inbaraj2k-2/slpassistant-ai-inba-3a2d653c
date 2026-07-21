import { ChevronLeft, ChevronRight, Delete, Trash2, X } from "lucide-react";
import { memo, useState } from "react";
import type { SentenceChip } from "../types";

interface Props {
  chips: SentenceChip[];
  onRemove: (idx: number) => void;
  onMove: (from: number, to: number) => void;
  onClear: () => void;
  onBackspace: () => void;
}

export const SentenceStrip = memo(function SentenceStrip({
  chips,
  onRemove,
  onMove,
  onClear,
  onBackspace,
}: Props) {
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <div className="rounded-2xl border border-border bg-card/95 p-2 shadow-card">
      <div
        role="log"
        aria-label="Sentence in progress"
        aria-live="polite"
        className="flex min-h-[64px] flex-wrap items-center gap-1.5 rounded-xl bg-secondary/40 p-2"
      >
        {chips.length === 0 ? (
          <p className="px-1 text-xs text-muted-foreground">Tap results to build a sentence…</p>
        ) : (
          chips.map((c, i) => (
            <button
              key={c.id}
              onClick={() => setSelected(selected === i ? null : i)}
              className={`flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-medium shadow-sm transition ${
                selected === i
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-transparent bg-card"
              }`}
            >
              {c.imageUrl ? (
                <img
                  src={c.imageUrl}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="h-5 w-5 rounded object-cover"
                />
              ) : (
                <span aria-hidden>{c.emoji ?? "🔤"}</span>
              )}
              <span>{c.label}</span>
            </button>
          ))
        )}
      </div>

      {selected !== null && chips[selected] && (
        <div className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-secondary/60 px-2 py-1">
          <span className="truncate text-[11px] text-muted-foreground">
            Editing: <b>{chips[selected].label}</b>
          </span>
          <div className="flex gap-1">
            <IconBtn
              label="Move left"
              onClick={() => {
                if (selected > 0) {
                  onMove(selected, selected - 1);
                  setSelected(selected - 1);
                }
              }}
              disabled={selected === 0}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </IconBtn>
            <IconBtn
              label="Move right"
              onClick={() => {
                if (selected < chips.length - 1) {
                  onMove(selected, selected + 1);
                  setSelected(selected + 1);
                }
              }}
              disabled={selected === chips.length - 1}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </IconBtn>
            <IconBtn
              label="Remove word"
              onClick={() => {
                onRemove(selected);
                setSelected(null);
              }}
            >
              <X className="h-3.5 w-3.5" />
            </IconBtn>
          </div>
        </div>
      )}

      <div className="mt-2 flex items-center justify-between gap-2">
        <button
          onClick={onClear}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-secondary px-3 text-xs font-semibold text-secondary-foreground"
          aria-label="Clear all words"
        >
          <Trash2 className="h-4 w-4" /> Clear All
        </button>
        <button
          onClick={onBackspace}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-secondary px-3 text-xs font-semibold text-secondary-foreground"
          aria-label="Delete last word"
        >
          <Delete className="h-4 w-4" /> Delete Last
        </button>
      </div>
    </div>
  );
});

function IconBtn({
  children,
  onClick,
  label,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      disabled={disabled}
      className="grid h-7 w-7 place-items-center rounded-md bg-card text-foreground shadow-sm disabled:opacity-40"
    >
      {children}
    </button>
  );
}
