import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FileText, ImageIcon, Loader2, Trash2, UploadCloud } from "lucide-react";

const CATEGORIES = ["Assessment", "Therapy Materials", "Research", "Books", "Other"] as const;

export const Route = createFileRoute("/_authenticated/library/uploads")({
  head: () => ({ meta: [{ title: "My Uploads — Library" }] }),
  component: UploadsPage,
});

type UploadRow = {
  id: string;
  user_id: string;
  file_name: string;
  file_url: string;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
  created_at: string;
};

const ALLOWED = ["pdf", "docx", "jpg", "jpeg", "png"];
const MAX_BYTES = 999 * 1024 * 1024;

function extOf(name: string) {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i + 1).toLowerCase() : "";
}

function UploadsPage() {
  const [rows, setRows] = useState<UploadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Share-to-community form state
  const [shareToCommunity, setShareToCommunity] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("Other");

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("user_uploads")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error("Could not load your uploads.");
    setRows((data as UploadRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const onPick = () => {
    if (shareToCommunity && !title.trim()) {
      toast.error("Please add a title before sharing to the community.");
      return;
    }
    inputRef.current?.click();
  };

  const onFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const ext = extOf(file.name);
    if (!ALLOWED.includes(ext)) {
      toast.error(`Unsupported file type. Allowed: ${ALLOWED.join(", ")}`);
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("File too large. Maximum 999MB.");
      return;
    }
    setUploading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("Not signed in");
      const safeName = file.name.replace(/[^\w.\-]+/g, "_");
      const path = shareToCommunity
        ? `community/${uid}/${Date.now()}-${safeName}`
        : `${uid}/${Date.now()}-${safeName}`;
      const { error: upErr } = await supabase.storage
        .from("uploads")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;

      if (shareToCommunity) {
        const { error: cErr } = await (supabase as any).from("community_uploads").insert({
          user_id: uid,
          file_name: file.name,
          file_url: path,
          file_path: path,
          file_type: ext,
          file_size: file.size,
          title: title.trim(),
          description: description.trim() || null,
          category,
          is_public: true,
        });
        if (cErr) throw cErr;
        toast.success("Shared to Community Library.");
        setTitle("");
        setDescription("");
        setCategory("Other");
        setShareToCommunity(false);
      } else {
        const { error: insErr } = await (supabase as any).from("user_uploads").insert({
          user_id: uid,
          file_name: file.name,
          file_url: path,
          file_path: path,
          file_type: ext,
          file_size: file.size,
        });
        if (insErr) throw insErr;
        toast.success("File uploaded.");
      }
      if (inputRef.current) inputRef.current.value = "";
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const openFile = async (row: UploadRow) => {
    const { data, error } = await supabase.storage
      .from("uploads")
      .createSignedUrl(row.file_path, 60 * 10);
    if (error || !data) return toast.error("Could not open file.");
    window.open(data.signedUrl, "_blank", "noopener");
  };

  const removeFile = async (row: UploadRow) => {
    if (!confirm(`Delete "${row.file_name}"?`)) return;
    const { error: sErr } = await supabase.storage.from("uploads").remove([row.file_path]);
    if (sErr) return toast.error("Could not delete file.");
    const { error: dErr } = await (supabase as any)
      .from("user_uploads")
      .delete()
      .eq("id", row.id);
    if (dErr) return toast.error("Could not delete record.");
    toast.success("Deleted.");
    setRows((r) => r.filter((x) => x.id !== row.id));
  };

  return (
    <AppShell title="My Uploads" subtitle="Manage your uploaded content" back>
      <div className="mb-4 space-y-3 rounded-2xl border border-border bg-card p-3 shadow-card">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <Label htmlFor="share-toggle" className="text-sm font-semibold">
              Share to Community Library
            </Label>
            <p className="text-xs text-muted-foreground">
              Make this file visible to all users.
            </p>
          </div>
          <Switch
            id="share-toggle"
            checked={shareToCommunity}
            onCheckedChange={setShareToCommunity}
          />
        </div>

        {shareToCommunity && (
          <div className="space-y-2">
            <Input
              placeholder="Title *"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <Textarea
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.docx,.jpg,.jpeg,.png"
            className="hidden"
            onChange={(e) => onFiles(e.target.files)}
          />
          <Button onClick={onPick} disabled={uploading} className="rounded-xl">
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UploadCloud className="h-4 w-4" />
            )}
            {uploading ? "Uploading…" : shareToCommunity ? "Share file" : "Upload file"}
          </Button>
          <p className="text-xs text-muted-foreground">PDF, DOCX, JPG, PNG · up to 999MB</p>
        </div>
      </div>


      {loading ? (
        <div className="grid place-items-center py-10 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <div className="grid place-items-center rounded-2xl border border-dashed border-border bg-card p-10 text-center shadow-card">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary-soft text-primary">
            <UploadCloud className="h-6 w-6" />
          </div>
          <p className="mt-4 text-sm font-semibold">No uploads yet</p>
          <p className="mt-1 text-xs text-muted-foreground">Your uploaded files will appear here.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li
              key={r.id}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-card"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                {["jpg", "jpeg", "png"].includes(r.file_type ?? "") ? (
                  <ImageIcon className="h-5 w-5" />
                ) : (
                  <FileText className="h-5 w-5" />
                )}
              </span>
              <button
                onClick={() => openFile(r)}
                className="min-w-0 flex-1 text-left"
                title="Open"
              >
                <p className="truncate text-sm font-semibold">{r.file_name}</p>
                <p className="text-xs text-muted-foreground">
                  {(r.file_type ?? "").toUpperCase()} ·{" "}
                  {r.file_size ? `${(r.file_size / (1024 * 1024)).toFixed(2)} MB` : ""}
                </p>
              </button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeFile(r)}
                aria-label="Delete"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
