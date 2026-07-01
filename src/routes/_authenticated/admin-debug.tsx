import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getKbStats } from "@/lib/clinical.functions";
import { AlertTriangle, CheckCircle2, Database, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin-debug")({
  head: () => ({ meta: [{ title: "Admin Debug — SLP Assist AI" }] }),
  component: AdminDebugPage,
});

function AdminDebugPage() {
  const fn = useServerFn(getKbStats);
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["kb-stats"],
    queryFn: () => fn(),
  });

  return (
    <AppShell title="Admin Debug" subtitle="Clinical database integration status">
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="rounded-lg border border-input bg-card px-3 py-1.5 text-xs font-medium shadow-card"
        >
          {isFetching ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {isLoading && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      )}
      {error && (
        <p className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          Failed to load stats. Please try refreshing.
        </p>
      )}

      {data && (
        <div className="space-y-4">
          <section className="rounded-2xl border border-border bg-card p-4 shadow-card">
            <div className="mb-3 flex items-center gap-2 text-primary">
              <Database className="h-4 w-4" />
              <h3 className="text-xs font-semibold uppercase tracking-wider">Record counts</h3>
            </div>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {Object.entries(data.counts).map(([table, count]) => (
                <li key={table} className="rounded-xl border border-border/70 bg-background p-3">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    {table.replace(/_/g, " ")}
                  </p>
                  <p className="text-xl font-bold text-primary">{count}</p>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-border bg-card p-4 shadow-card">
            <div className="mb-3 flex items-center gap-2 text-primary">
              <AlertTriangle className="h-4 w-4" />
              <h3 className="text-xs font-semibold uppercase tracking-wider">
                Relationship validation
              </h3>
            </div>
            <div className="space-y-3 text-sm">
              <ErrorGroup
                label="Disorders missing Assessments"
                items={data.relationship_errors.disorders_missing_assessments}
              />
              <ErrorGroup
                label="Disorders missing Materials"
                items={data.relationship_errors.disorders_missing_materials}
              />
              <ErrorGroup
                label="Disorders missing Therapy Goals"
                items={data.relationship_errors.disorders_missing_therapy_goals}
              />
              <ErrorGroup
                label="Disorders missing Clinical Sources"
                items={data.relationship_errors.disorders_missing_clinical_sources}
              />
              <ErrorGroup
                label="Orphan Clinical Sources (no matching disorder)"
                items={data.relationship_errors.orphan_clinical_sources}
              />
            </div>
          </section>
        </div>
      )}
    </AppShell>
  );
}

function ErrorGroup({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) {
    return (
      <div className="flex items-center gap-2 text-xs text-success">
        <CheckCircle2 className="h-3.5 w-3.5" />
        <span>{label}: 0</span>
      </div>
    );
  }
  return (
    <details className="rounded-xl border border-warning/40 bg-warning/10 p-3">
      <summary className="cursor-pointer text-xs font-semibold">
        {label}: {items.length}
      </summary>
      <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
        {items.map((it, i) => (
          <li key={i}>• {it}</li>
        ))}
      </ul>
    </details>
  );
}
