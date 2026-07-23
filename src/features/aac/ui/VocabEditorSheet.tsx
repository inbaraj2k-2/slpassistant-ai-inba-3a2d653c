import { Heart, Pin, Star, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { deleteVocab, upsertVocab } from "@/lib/aac.functions";
import { confirmAsync } from "@/lib/confirm";
import type { VocabRow } from "../types";

interface Props {
  row: VocabRow;
  onClose: () => void;
}

export function VocabEditorSheet({ row, onClose }: Props) {
  const [label, setLabel] = useState(row.label);
  const [keywords, setKeywords] = useState((row.keywords ?? []).join(", "));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  async function save(patch: Partial<VocabRow>) {
    setBusy(true);
    setErr(null);
    try {
      await upsertVocab({
        data: {
          id: row.id,
          label: patch.label ?? label,
          keywords: (patch.keywords ?? keywords.split(","))
            .map((k) => k.trim())
            .filter(Boolean)
            .slice(0, 20),
          category: row.category,
          emoji: row.emoji,
          image_path: row.image_path,
          image_url: row.image_url,
          source: row.source,
          is_favorite: patch.is_favorite ?? row.is_favorite,
          pinned: patch.pinned ?? row.pinned,
        },
      });
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function uploadImage(file: File) {
    setBusy(true);
    setErr(null);
    try {
      const { data: sess } = await supabase.auth.getUser();
      const uid = sess.user?.id;
      if (!uid) throw new Error("Sign in required");
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `aac/${uid}/${Date.now()}-${row.id}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("uploads")
        .upload(path, file, { contentType: file.type });
      if (upErr) throw new Error(upErr.message);
      const { data: signed } = await supabase.storage
        .from("uploads")
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      await upsertVocab({
        data: {
          id: row.id,
          label,
          keywords: keywords.split(",").map((k) => k.trim()).filter(Boolean),
          image_path: path,
          image_url: signed?.signedUrl ?? null,
          source: row.source,
        },
      });
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!(await confirmAsync(`Delete "${row.label}"?`, "Delete card"))) return;
    setBusy(true);
    try {
      await deleteVocab({ data: { id: row.id } });
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Delete failed");
      setBusy(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3"
      onClick={() => {
        if (!busy) onClose();
      }}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-card p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Edit vocabulary</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 place-items-center rounded-full bg-secondary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 flex items-center gap-3">
          {row.image_url ? (
            <img
              src={row.image_url}
              alt=""
              className="h-16 w-16 rounded-xl border border-border object-cover"
            />
          ) : (
            <span className="grid h-16 w-16 place-items-center rounded-xl bg-secondary text-3xl">
              {row.emoji ?? "🔤"}
            </span>
          )}
          <label className="cursor-pointer rounded-lg bg-secondary px-3 py-2 text-xs font-semibold">
            Replace image
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadImage(f);
              }}
            />
          </label>
        </div>

        <div className="mt-3 space-y-2">
          <label className="block text-[11px] font-semibold uppercase text-muted-foreground">
            Label
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm normal-case"
              maxLength={80}
            />
          </label>
          <label className="block text-[11px] font-semibold uppercase text-muted-foreground">
            Keywords (comma separated)
            <input
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm normal-case"
              placeholder="e.g. fruit, red, snack"
            />
          </label>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={() => save({ is_favorite: !row.is_favorite })}
            disabled={busy}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold ${
              row.is_favorite ? "bg-red-500/10 text-red-600" : "bg-secondary"
            }`}
          >
            <Heart className={`h-3.5 w-3.5 ${row.is_favorite ? "fill-current" : ""}`} />
            {row.is_favorite ? "Unfavorite" : "Favorite"}
          </button>
          <button
            onClick={() => save({ pinned: !row.pinned })}
            disabled={busy}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold ${
              row.pinned ? "bg-primary/15 text-primary" : "bg-secondary"
            }`}
          >
            <Pin className={`h-3.5 w-3.5 ${row.pinned ? "fill-current" : ""}`} />
            {row.pinned ? "Unpin" : "Pin"}
          </button>
          <button
            onClick={() => save({})}
            disabled={busy}
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-gradient-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-card"
          >
            <Star className="h-3.5 w-3.5" />
            Save
          </button>
        </div>

        <button
          onClick={remove}
          disabled={busy}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-semibold text-red-600"
        >
          <Trash2 className="h-3.5 w-3.5" /> Delete this word
        </button>

        {err && <p className="mt-2 text-[11px] text-red-600">{err}</p>}
      </div>
    </div>
  );
}
