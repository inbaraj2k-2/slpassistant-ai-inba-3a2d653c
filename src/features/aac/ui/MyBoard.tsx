import { ChevronLeft, ChevronRight, Heart, MoreVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { memo, useMemo, useRef, useState } from "react";
import { deleteVocab, upsertVocab } from "@/lib/aac.functions";
import { getAllVocab } from "../providers/userVocabProvider";
import type { AacResult, VocabRow } from "../types";
import { AddCardSheet } from "./AddCardSheet";
import { VocabEditorSheet } from "./VocabEditorSheet";

interface Props {
  onPick: (r: AacResult) => void;
  refreshKey: number;
  onChanged: () => void;
}

function toResult(row: VocabRow): AacResult {
  return {
    key: `vocab:${row.id}`,
    label: row.label,
    emoji: row.emoji,
    imageUrl: row.image_url,
    source: row.source,
    vocabId: row.id,
    score: 0,
  };
}

export const MyBoard = memo(function MyBoard({ onPick, refreshKey, onChanged }: Props) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<VocabRow | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);

  const { board, favorites, nextSort } = useMemo(() => {
    // refreshKey participates so we recompute after mutations.
    void refreshKey;
    const all = getAllVocab().filter((r) => r.source === "user" || r.source === "ai");
    const sorted = all
      .slice()
      .sort((a, b) => {
        const sa = a.sort_order ?? 0;
        const sb = b.sort_order ?? 0;
        if (sa !== sb) return sa - sb;
        return (b.updated_at ?? "").localeCompare(a.updated_at ?? "");
      });
    const favs = sorted.filter((r) => r.is_favorite);
    const maxSort = sorted.reduce((m, r) => Math.max(m, r.sort_order ?? 0), 0);
    return { board: sorted, favorites: favs, nextSort: maxSort + 10 };
  }, [refreshKey]);

  async function toggleFavorite(row: VocabRow) {
    try {
      await upsertVocab({
        data: {
          id: row.id,
          label: row.label,
          keywords: row.keywords ?? [],
          category: row.category,
          emoji: row.emoji,
          image_path: row.image_path,
          image_url: row.image_url,
          source: row.source,
          is_favorite: !row.is_favorite,
          pinned: row.pinned,
          sort_order: row.sort_order,
        },
      });
      onChanged();
    } catch {
      /* ignore */
    }
  }

  async function move(row: VocabRow, dir: -1 | 1) {
    const idx = board.findIndex((r) => r.id === row.id);
    const swap = board[idx + dir];
    if (!swap) return;
    try {
      await Promise.all([
        upsertVocab({
          data: {
            id: row.id,
            label: row.label,
            keywords: row.keywords ?? [],
            category: row.category,
            emoji: row.emoji,
            image_path: row.image_path,
            image_url: row.image_url,
            source: row.source,
            is_favorite: row.is_favorite,
            pinned: row.pinned,
            sort_order: swap.sort_order ?? 0,
          },
        }),
        upsertVocab({
          data: {
            id: swap.id,
            label: swap.label,
            keywords: swap.keywords ?? [],
            category: swap.category,
            emoji: swap.emoji,
            image_path: swap.image_path,
            image_url: swap.image_url,
            source: swap.source,
            is_favorite: swap.is_favorite,
            pinned: swap.pinned,
            sort_order: row.sort_order ?? 0,
          },
        }),
      ]);
      onChanged();
    } catch {
      /* ignore */
    }
  }

  async function remove(row: VocabRow) {
    if (!confirm(`Delete "${row.label}"?`)) return;
    try {
      await deleteVocab({ data: { id: row.id } });
      onChanged();
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="space-y-4" onClick={() => setMenuFor(null)}>
      {favorites.length > 0 && (
        <section>
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <Heart className="h-3 w-3 fill-red-500 text-red-500" /> My favorites
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {favorites.map((row) => (
              <button
                key={row.id}
                onClick={() => onPick(toResult(row))}
                className="flex h-20 w-20 shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl border border-border bg-card p-1 text-center shadow-sm active:scale-[0.96]"
                aria-label={row.label}
              >
                {row.image_url ? (
                  <img
                    src={row.image_url}
                    alt=""
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    className="max-h-[55%] max-w-[80%] object-contain"
                  />
                ) : (
                  <span className="text-2xl leading-none">{row.emoji ?? "🔤"}</span>
                )}
                <span className="line-clamp-2 text-[10px] font-semibold leading-tight">
                  {row.label}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            My board
          </p>
          <button
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary"
          >
            <Plus className="h-3 w-3" /> Add card
          </button>
        </div>

        <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
          {board.map((row, idx) => (
            <BoardTile
              key={row.id}
              row={row}
              isFirst={idx === 0}
              isLast={idx === board.length - 1}
              menuOpen={menuFor === row.id}
              onOpenMenu={(e) => {
                e.stopPropagation();
                setMenuFor((m) => (m === row.id ? null : row.id));
              }}
              onPick={() => onPick(toResult(row))}
              onFav={() => toggleFavorite(row)}
              onEdit={() => setEditing(row)}
              onDelete={() => remove(row)}
              onMoveLeft={() => move(row, -1)}
              onMoveRight={() => move(row, 1)}
            />
          ))}

          <button
            onClick={() => setAdding(true)}
            className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 p-1 text-primary transition active:scale-[0.96]"
            aria-label="Add new card"
          >
            <Plus className="h-6 w-6" />
            <span className="text-[10px] font-semibold leading-tight">Add card</span>
          </button>
        </div>
      </section>

      {adding && (
        <AddCardSheet
          nextSortOrder={nextSort}
          onClose={() => setAdding(false)}
          onSaved={() => {
            setAdding(false);
            onChanged();
          }}
        />
      )}
      {editing && (
        <VocabEditorSheet
          row={editing}
          onClose={() => {
            setEditing(null);
            onChanged();
          }}
        />
      )}
    </div>
  );
});

interface TileProps {
  row: VocabRow;
  isFirst: boolean;
  isLast: boolean;
  menuOpen: boolean;
  onOpenMenu: (e: React.MouseEvent) => void;
  onPick: () => void;
  onFav: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onMoveLeft: () => void;
  onMoveRight: () => void;
}

function BoardTile({
  row,
  isFirst,
  isLast,
  menuOpen,
  onOpenMenu,
  onPick,
  onFav,
  onEdit,
  onDelete,
  onMoveLeft,
  onMoveRight,
}: TileProps) {
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressed = useRef(false);

  const startPress = () => {
    longPressed.current = false;
    pressTimer.current = setTimeout(() => {
      longPressed.current = true;
      onEdit();
    }, 550);
  };
  const cancelPress = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  const stop = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <div className="relative">
      <button
        onClick={() => {
          if (longPressed.current) {
            longPressed.current = false;
            return;
          }
          onPick();
        }}
        onPointerDown={startPress}
        onPointerUp={cancelPress}
        onPointerLeave={cancelPress}
        onPointerCancel={cancelPress}
        className="flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-xl border border-border bg-card p-1.5 text-center shadow-sm transition active:scale-[0.96]"
        aria-label={row.label}
      >
        <div className="flex flex-1 items-center justify-center">
          {row.image_url ? (
            <img
              src={row.image_url}
              alt=""
              loading="lazy"
              referrerPolicy="no-referrer"
              className="max-h-[62%] max-w-[80%] object-contain"
            />
          ) : (
            <span className="text-3xl leading-none">{row.emoji ?? "🔤"}</span>
          )}
        </div>
        <span className="line-clamp-2 min-h-[24px] text-[11px] font-semibold leading-tight">
          {row.label}
        </span>
      </button>

      <button
        onClick={(e) => {
          stop(e);
          onFav();
        }}
        aria-label={row.is_favorite ? "Unfavorite" : "Favorite"}
        className="absolute left-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-background/85 shadow-sm"
      >
        <Heart
          className={`h-3 w-3 ${row.is_favorite ? "fill-red-500 text-red-500" : "text-muted-foreground"}`}
        />
      </button>

      <button
        onClick={onOpenMenu}
        aria-label="More"
        className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-background/85 shadow-sm"
      >
        <MoreVertical className="h-3 w-3 text-muted-foreground" />
      </button>

      {menuOpen && (
        <div
          className="absolute right-1 top-8 z-20 flex flex-col gap-0.5 rounded-lg border border-border bg-card p-1 text-[11px] font-semibold shadow-lg"
          onClick={stop}
        >
          <button
            onClick={() => {
              onEdit();
              onOpenMenu({ stopPropagation: () => {} } as React.MouseEvent);
            }}
            className="flex items-center gap-1.5 rounded px-2 py-1 hover:bg-secondary"
          >
            <Pencil className="h-3 w-3" /> Edit
          </button>
          <button
            onClick={onMoveLeft}
            disabled={isFirst}
            className="flex items-center gap-1.5 rounded px-2 py-1 hover:bg-secondary disabled:opacity-40"
          >
            <ChevronLeft className="h-3 w-3" /> Move left
          </button>
          <button
            onClick={onMoveRight}
            disabled={isLast}
            className="flex items-center gap-1.5 rounded px-2 py-1 hover:bg-secondary disabled:opacity-40"
          >
            <ChevronRight className="h-3 w-3" /> Move right
          </button>
          <button
            onClick={onDelete}
            className="flex items-center gap-1.5 rounded px-2 py-1 text-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-3 w-3" /> Delete
          </button>
        </div>
      )}
    </div>
  );
}
