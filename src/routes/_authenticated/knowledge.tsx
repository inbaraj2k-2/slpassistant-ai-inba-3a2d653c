import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listKnowledgeBase } from "@/lib/clinical.functions";
import { BookOpen, ChevronDown, Loader2, Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated/knowledge")({
  head: () => ({ meta: [{ title: "Knowledge Base — SLP Assist AI" }] }),
  component: KnowledgePage,
});

function KnowledgePage() {
  const fetchKb = useServerFn(listKnowledgeBase);
  const { data, isLoading, error } = useQuery({
    queryKey: ["knowledge-base"],
    queryFn: () => fetchKb(),
  });

  const [q, setQ] = useState("");
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const categories = useMemo(() => {
    if (!data) return [] as string[];
    return [...new Set(data.map((d) => d.category))].sort();
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    const needle = q.trim().toLowerCase();
    return data.filter((d) => {
      if (activeCat && d.category !== activeCat) return false;
      if (!needle) return true;
      return (
        d.name.toLowerCase().includes(needle) ||
        d.symptoms.toLowerCase().includes(needle) ||
        d.red_flags.toLowerCase().includes(needle) ||
        d.assessments.some((a) => a.name.toLowerCase().includes(needle)) ||
        d.materials.some((m) => m.name.toLowerCase().includes(needle))
      );
    });
  }, [data, q, activeCat]);

  return (
    <AppShell title="Knowledge Base" subtitle="Clinical reference — sourced from the database">
      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search disorders, symptoms, assessments…"
          className="h-11 w-full rounded-xl border border-input bg-card pl-9 pr-3 text-sm shadow-card outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
        />
      </div>

      <div className="-mx-4 mb-4 overflow-x-auto px-4">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveCat(null)}
            className={`shrink-0 rounded-full px-3 py-2 text-xs font-medium transition ${
              activeCat === null
                ? "bg-gradient-primary text-primary-foreground shadow-card"
                : "bg-secondary text-secondary-foreground"
            }`}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setActiveCat(c)}
              className={`shrink-0 rounded-full px-3 py-2 text-xs font-medium transition ${
                activeCat === c
                  ? "bg-gradient-primary text-primary-foreground shadow-card"
                  : "bg-secondary text-secondary-foreground"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      )}
      {error && (
        <p className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          Failed to load knowledge base.
        </p>
      )}

      <ul className="space-y-3">
        {filtered.map((d) => {
          const open = openId === d.id;
          return (
            <li key={d.id} className="rounded-2xl border border-border bg-card shadow-card">
              <button
                onClick={() => setOpenId(open ? null : d.id)}
                className="flex w-full items-center justify-between gap-3 p-4 text-left"
              >
                <div className="flex items-center gap-2 text-primary">
                  <BookOpen className="h-4 w-4" />
                  <div>
                    <h3 className="text-sm font-semibold">{d.name}</h3>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      {d.category}
                    </p>
                  </div>
                </div>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-muted-foreground transition ${open ? "rotate-180" : ""}`}
                />
              </button>
              {open && (
                <div className="space-y-3 border-t border-border px-4 py-3 text-sm">
                  {d.symptoms && (
                    <Section label="Symptoms">
                      <pre className="whitespace-pre-wrap font-sans text-xs text-muted-foreground">
                        {d.symptoms}
                      </pre>
                    </Section>
                  )}
                  {d.red_flags && (
                    <Section label="Red Flags">
                      <p className="text-xs text-muted-foreground">{d.red_flags}</p>
                    </Section>
                  )}
                  {d.assessments.length > 0 && (
                    <Section label={`Assessments (${d.assessments.length})`}>
                      <ItemList items={d.assessments.map((a) => a.name)} />
                    </Section>
                  )}
                  {d.materials.length > 0 && (
                    <Section label={`Materials (${d.materials.length})`}>
                      <ItemList items={d.materials.map((m) => m.name)} />
                    </Section>
                  )}
                  {d.therapy_goals.length > 0 && (
                    <Section label={`Therapy Goals (${d.therapy_goals.length})`}>
                      <ItemList items={d.therapy_goals.map((g) => g.goal)} />
                    </Section>
                  )}
                  {d.clinical_sources.length > 0 && (
                    <Section label="Sources">
                      <ul className="space-y-1 text-xs text-muted-foreground">
                        {d.clinical_sources.map((s, i) => (
                          <li key={i}>
                            {[s.primary_source, s.secondary_source].filter(Boolean).join(" • ")}
                            {s.verification_status ? ` — ${s.verification_status}` : ""}
                          </li>
                        ))}
                      </ul>
                    </Section>
                  )}
                  {d.source_reference && (
                    <p className="text-[11px] italic text-muted-foreground">
                      Reference: {d.source_reference}
                    </p>
                  )}
                </div>
              )}
            </li>
          );
        })}
        {!isLoading && filtered.length === 0 && (
          <li className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No disorders match "{q}".
          </li>
        )}
      </ul>
    </AppShell>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
        {label}
      </p>
      {children}
    </div>
  );
}

function ItemList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1 text-xs">
      {items.map((it, i) => (
        <li key={i} className="flex gap-2">
          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}
