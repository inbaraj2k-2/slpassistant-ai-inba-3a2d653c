import { Camera, Image as ImageIcon, Play, X } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { upsertVocab } from "@/lib/aac.functions";
import { pickProfileImage } from "@/lib/imagePicker";
import { speakText } from "@/lib/native";

interface Props {
  onClose: () => void;
  onSaved: () => void;
  nextSortOrder: number;
}

export function AddCardSheet({ onClose, onSaved, nextSortOrder }: Props) {
  const [label, setLabel] = useState("");
  const [emoji, setEmoji] = useState("");
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  async function chooseImage(source: "gallery" | "camera") {
    setErr(null);
    const picked = await pickProfileImage(source);
    if (!picked) return;
    setBusy(true);
    try {
      const { data: sess } = await supabase.auth.getUser();
      const uid = sess.user?.id;
      if (!uid) throw new Error("Please sign in first.");
      const path = `aac/${uid}/${Date.now()}.${picked.extension}`;
      const { error: upErr } = await supabase.storage
        .from("uploads")
        .upload(path, picked.blob, { contentType: picked.mimeType });
      if (upErr) throw new Error(upErr.message);
      const { data: signed } = await supabase.storage
        .from("uploads")
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      setImagePath(path);
      setImageUrl(signed?.signedUrl ?? null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Image upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!label.trim()) {
      setErr("Please enter a word or name.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await upsertVocab({
        data: {
          label: label.trim(),
          keywords: [],
          emoji: emoji.trim() || null,
          image_path: imagePath,
          image_url: imageUrl,
          source: "user",
          sort_order: nextSortOrder,
        },
      });
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3"
      onClick={() => !busy && onClose()}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-card p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">New card</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 place-items-center rounded-full bg-secondary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 flex items-center gap-3">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt=""
              className="h-16 w-16 rounded-xl border border-border object-cover"
            />
          ) : (
            <span className="grid h-16 w-16 place-items-center rounded-xl bg-secondary text-3xl">
              {emoji || "🔤"}
            </span>
          )}
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => chooseImage("gallery")}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
            >
              <ImageIcon className="h-3.5 w-3.5" /> Gallery
            </button>
            <button
              type="button"
              onClick={() => chooseImage("camera")}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
            >
              <Camera className="h-3.5 w-3.5" /> Camera
            </button>
          </div>
        </div>

        <div className="mt-3 space-y-2">
          <label className="block text-[11px] font-semibold uppercase text-muted-foreground">
            Word or name
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm normal-case"
              maxLength={80}
              placeholder="e.g. Mom, Water, Play"
            />
          </label>
          <label className="block text-[11px] font-semibold uppercase text-muted-foreground">
            Emoji (optional)
            <input
              value={emoji}
              onChange={(e) => setEmoji(e.target.value.slice(0, 4))}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-lg normal-case"
              placeholder="🍎"
            />
          </label>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => label.trim() && speakText(label.trim())}
            disabled={!label.trim() || busy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-2 text-xs font-semibold disabled:opacity-40"
          >
            <Play className="h-3.5 w-3.5" /> Preview
          </button>
          <button
            type="button"
            onClick={save}
            disabled={busy || !label.trim()}
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-gradient-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-card disabled:opacity-60"
          >
            {busy ? "Saving…" : "Save card"}
          </button>
        </div>

        {err && <p className="mt-2 text-[11px] text-red-600">{err}</p>}
      </div>
    </div>
  );
}
