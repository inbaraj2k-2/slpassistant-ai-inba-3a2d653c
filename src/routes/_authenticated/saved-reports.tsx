import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useCachedQuery } from "@/hooks/useCachedQuery";
import { ChevronRight, FileText, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/saved-reports")({
  head: () => ({ meta: [{ title: "Saved Reports — SLP Assist AI" }] }),
  component: SavedReportsPage,
});

function SavedReportsPage() {
  const { data, isLoading } = useCachedQuery("saved-reports:v1", async () => {
    const { data, error } = await supabase
      .from("cases")
      .select("id, name, age, analysis, created_at")
      .not("analysis", "is", null)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

  return (
    <AppShell title="Saved Reports" subtitle="Your AI analysis reports" back>
      {isLoading ? (
        <ul className="space-y-3">
          {[0, 1, 2].map((i) => (
            <li key={i} className="h-20 animate-pulse rounded-2xl bg-muted" />
          ))}
        </ul>
      ) : !data || data.length === 0 ? (
        <div className="mt-10 flex flex-col items-center text-center">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-primary-soft text-primary">
            <FileText className="h-7 w-7" />
          </div>
          <h3 className="mt-4 text-base font-semibold">No saved reports yet</h3>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">
            Run AI analysis on a case to save its report here.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {data.map((c) => {
            const top = (c.analysis as { possible_conditions?: { name: string; confidence: number }[] } | null)
              ?.possible_conditions?.[0];
            return (
              <li key={c.id}>
                <Link
                  to="/case/$id"
                  params={{ id: c.id }}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-card transition active:scale-[0.99]"
                >
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary-soft text-primary">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {c.name}
                      {c.age ? <span className="text-muted-foreground"> · {c.age}</span> : null}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {top ? `${top.name} · ${top.confidence}%` : "Report available"}
                    </p>
                    <p className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground/70">
                      {new Date(c.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </AppShell>
  );
}
