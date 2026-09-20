import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Download, Eye, FileText, ImageIcon, Loader2, Search, Trash2, Users } from "lucide-react";
import { downloadToDevice, isNative, openInAppBrowser } from "@/lib/native";
import { confirmAsync } from "@/lib/confirm";

export const Route = createFileRoute("/_authenticated/library/community")({
  head: () => ({ meta: [{ title: "Community Library" }] }),
  component: CommunityLibraryPage,
});

const CATEGORIES = ["All", "Assessment", "Therapy Materials", "Research", "Books", "Other"] as const;
const PAGE_SIZE = 12;

type Row = {
  id: string;
  user_id: string;
  file_name: string;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
  title: string;
  description: string | null;
  category: string;
  created_at: string;
};

function CommunityLibraryPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("All");
  const [me, setMe] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null));
  }, []);

  const fetchPage = useCallback(
    async (nextPage: number, replace: boolean, currentSearch: string, currentCategory: string) => {
      const from = nextPage * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      let q = (supabase as any)
        .from("community_uploads")
        .select("*")
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .range(from, to);
      if (currentCategory !== "All") q = q.eq("category", currentCategory);
      if (currentSearch.trim()) {
        const term = `%${currentSearch.trim()}%`;
        q = q.or(
          `title.ilike.${term},file_name.ilike.${term},description.ilike.${term},category.ilike.${term}`,
        );
      }
      const { data, error } = await q;
      if (error) {
        toast.error("Could not load community library.");
        return;
      }
      const list = (data as Row[]) ?? [];
      setHasMore(list.length === PAGE_SIZE);
      setRows((prev) => (replace ? list : [...prev, ...list]));
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setLoading(true);
      setPage(0);
      void fetchPage(0, true, search, category).finally(() => {
        if (!cancelled) setLoading(false);
      });
    }, search.trim() ? 300 : 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [search, category, fetchPage]);

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const next = page + 1;
    await fetchPage(next, false, search, category);
    setPage(next);
    setLoadingMore(false);
  };

  const [busyId, setBusyId] = useState<string | null>(null);
  const download = async (r: Row) => {
    if (busyId) return;
    setBusyId(r.id);
    try {
      const { data, error } = await supabase.storage
        .from("uploads")
        .createSignedUrl(r.file_path, 60 * 10, { download: r.file_name });
      if (error || !data) {
        toast.error("Could not download file.");
        return;
      }
      const dest = await downloadToDevice(data.signedUrl, r.file_name);
      toast.success(isNative() ? `Saved to ${dest}` : "Download started");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save file.");
    } finally {
      setBusyId(null);
    }
  };

  const viewFile = async (r: Row) => {
    const { data, error } = await supabase.storage
      .from("uploads")
      .createSignedUrl(r.file_path, 60 * 10);
    if (error || !data) return toast.error("Could not open file.");
    await openInAppBrowser(data.signedUrl);
  };

  const removeOwn = async (r: Row) => {
    if (!(await confirmAsync(`Delete \"${r.title}\" from community?`, "Delete upload"))) return;
    const { error: sErr } = await supabase.storage.from("uploads").remove([r.file_path]);
    if (sErr) return toast.error("Could not delete file.");
    const { error: dErr } = await (supabase as any)
      .from("community_uploads")
      .delete()
      .eq("id", r.id);
    if (dErr) return toast.error("Could not delete record.");
    toast.success("Removed.");
    setRows((list) => list.filter((x) => x.id !== r.id));
  };

  const isImage = (t: string | null) => ["jpg", "jpeg", "png"].includes(t ?? "");

  const emptyState = useMemo(
    () => (
      <div className="grid place-items-center rounded-2xl border border-dashed border-border bg-card p-10 text-center shadow-card">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary-soft text-primary">
          <Users className="h-6 w-6" />
        </div>
        <p className="mt-4 text-sm font-semibold">No shared resources yet</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Share a file from My Uploads to see it here.
        </p>
      </div>
    ),
    [],
  );

  return (
    <AppShell title="Community Library" subtitle="Shared resources from users" back>
      <div className="mb-3 space-y-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, file, category…"
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                category === c
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:bg-accent"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid place-items-center py-10 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        emptyState
      ) : (
        <>
          <ul className="space-y-2">
            {rows.map((r) => (
              <li key={r.id} className="rounded-2xl border border-border bg-card p-3 shadow-card">
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                    {isImage(r.file_type) ? <ImageIcon className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{r.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{r.file_name}</p>
                    {r.description && (
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{r.description}</p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="text-[10px]">
                        {r.category}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(r.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Button size="sm" variant="secondary" className="rounded-xl" onClick={() => viewFile(r)}>
                    <Eye className="h-4 w-4" />
                    View
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => download(r)}
                    disabled={busyId === r.id}
                  >
                    {busyId === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    {busyId === r.id ? "Saving…" : "Download"}
                  </Button>
                  {me === r.user_id && (
                    <Button size="sm" variant="ghost" onClick={() => removeOwn(r)} aria-label="Delete">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
          {hasMore && (
            <div className="mt-4 grid place-items-center">
              <Button variant="outline" onClick={loadMore} disabled={loadingMore} className="rounded-xl">
                {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Load more
              </Button>
            </div>
          )}
        </>
      )}
    </AppShell>
  );
}
