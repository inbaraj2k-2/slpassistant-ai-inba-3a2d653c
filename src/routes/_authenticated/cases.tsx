import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ChevronRight, FilePlus, FolderClock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/cases")({
  head: () => ({ meta: [{ title: "Previous Cases — SLP Assist AI" }] }),
  component: CasesPage,
});

function CasesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["cases"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cases")
        .select("id, name, age, chief_complaint, analysis, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <AppShell title="Previous Cases" subtitle="Your saved case histories">
      {isLoading ? (
        <SkeletonList />
      ) : !data || data.length === 0 ? (
        <Empty />
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
                    <FolderClock className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {c.name}
                      {c.age ? <span className="text-muted-foreground"> · {c.age}</span> : null}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {top
                        ? `${top.name} · ${top.confidence}%`
                        : c.chief_complaint || "No analysis yet"}
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

function SkeletonList() {
  return (
    <ul className="space-y-3">
      {[0, 1, 2].map((i) => (
        <li key={i} className="h-20 animate-pulse rounded-2xl bg-muted" />
      ))}
    </ul>
  );
}

function Empty() {
  return (
    <div className="mt-10 flex flex-col items-center text-center">
      <div className="grid h-16 w-16 place-items-center rounded-2xl bg-primary-soft text-primary">
        <FolderClock className="h-7 w-7" />
      </div>
      <h3 className="mt-4 text-base font-semibold">No cases yet</h3>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">
        Create your first case history to see AI-generated clinical suggestions.
      </p>
      <Link
        to="/new-case"
        className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-primary px-4 text-sm font-semibold text-primary-foreground shadow-card"
      >
        <FilePlus className="h-4 w-4" />
        New case
      </Link>
    </div>
  );
}
