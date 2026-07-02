import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Download, FileText, ImageIcon, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/library/downloads")({
  head: () => ({ meta: [{ title: "Downloads — Library" }] }),
  component: DownloadsPage,
});

type Row = {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
  created_at: string;
};

function DownloadsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await (supabase as any)
        .from("user_uploads")
        .select("id,file_name,file_path,file_type,file_size,created_at")
        .order("created_at", { ascending: false });
      if (error) toast.error("Could not load your files.");
      setRows((data as Row[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const download = async (r: Row) => {
    const { data, error } = await supabase.storage
      .from("uploads")
      .createSignedUrl(r.file_path, 60 * 10, { download: r.file_name });
    if (error || !data) return toast.error("Could not prepare download.");
    const a = document.createElement("a");
    a.href = data.signedUrl;
    a.download = r.file_name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <AppShell title="Downloads" subtitle="Your saved offline files" back>
      {loading ? (
        <div className="grid place-items-center py-10 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <div className="grid place-items-center rounded-2xl border border-dashed border-border bg-card p-10 text-center shadow-card">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary-soft text-primary">
            <Download className="h-6 w-6" />
          </div>
          <p className="mt-4 text-sm font-semibold">Nothing to download yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Files you upload in My Uploads will be available here to download.
          </p>
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
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{r.file_name}</p>
                <p className="text-xs text-muted-foreground">
                  {(r.file_type ?? "").toUpperCase()} ·{" "}
                  {r.file_size ? `${(r.file_size / (1024 * 1024)).toFixed(2)} MB` : ""}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => download(r)}>
                <Download className="h-4 w-4" />
                Download
              </Button>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
