import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { AppShell } from "@/components/AppShell";
import { Disclaimer } from "@/components/Disclaimer";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { analyzeCase, type AnalysisResult } from "@/lib/analyze.functions";
import {
  Beaker,
  BookOpen,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Download,
  FileText,
  HelpCircle,
  Loader2,
  Package,
  Pencil,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Square,
  Stethoscope,
  Target,
  Trash2,
} from "lucide-react";
import { Link } from "@tanstack/react-router";

const searchSchema = z.object({ run: z.number().optional() });

export const Route = createFileRoute("/_authenticated/case/$id")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Case Analysis — SLP Assist AI" }] }),
  component: CaseDetail,
});

interface CaseRow {
  id: string;
  name: string;
  age: string | null;
  gender: string | null;
  chief_complaint: string | null;
  prenatal_history: string | null;
  natal_history: string | null;
  postnatal_history: string | null;
  motor_milestones: string | null;
  speech_milestones: string | null;
  language_history: string | null;
  hearing_history: string | null;
  education_history: string | null;
  family_history: string | null;
  additional_notes: string | null;
  analysis: AnalysisResult | null;
  created_at: string;
}

function CaseDetail() {
  const { id } = Route.useParams();
  const { run } = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const triggeredRef = useRef(false);

  const { data: row, isLoading } = useQuery({
    queryKey: ["case", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("cases").select("*").eq("id", id).single();
      if (error) throw error;
      return data as CaseRow;
    },
  });

  const analyzeFn = useServerFn(analyzeCase);
  const mutate = useMutation({
    mutationFn: async () => analyzeFn({ data: { caseId: id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["case", id] }),
  });

  // Auto-run analysis if navigated with ?run=1 and no analysis exists
  useEffect(() => {
    if (!row || triggeredRef.current) return;
    if (run === 1 && !row.analysis) {
      triggeredRef.current = true;
      mutate.mutate();
      navigate({ to: "/case/$id", params: { id }, search: {}, replace: true });
    }
  }, [row, run, mutate, id, navigate]);

  async function onDelete() {
    if (!confirm("Delete this case? This cannot be undone.")) return;
    await supabase.from("cases").delete().eq("id", id);
    navigate({ to: "/cases", replace: true });
  }

  async function onExportPDF() {
    if (!row) return;
    const { exportCasePDF } = await import("@/lib/pdf");
    exportCasePDF(row);
  }

  return (
    <AppShell
      title={row?.name ?? "Case"}
      subtitle={row?.age ? `Age ${row.age}` : "Case analysis"}
      back
      hideNav
      right={
        <div className="flex items-center gap-2">
          <Link
            to="/case/$id/edit"
            params={{ id }}
            className="grid h-9 w-9 place-items-center rounded-full bg-secondary text-primary transition hover:bg-primary/10"
            aria-label="Edit case"
          >
            <Pencil className="h-4 w-4" />
          </Link>
          <button
            onClick={onDelete}
            className="grid h-9 w-9 place-items-center rounded-full bg-secondary text-destructive transition hover:bg-destructive/10"
            aria-label="Delete case"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      }
    >
      {isLoading || !row ? (
        <div className="space-y-3">
          <div className="h-24 animate-pulse rounded-2xl bg-muted" />
          <div className="h-40 animate-pulse rounded-2xl bg-muted" />
        </div>
      ) : (
        <div className="space-y-4">
          <SummaryCard row={row} />

          {mutate.isPending || (run === 1 && !row.analysis) ? (
            <AnalyzingCard />
          ) : row.analysis ? (
            <AnalysisView analysis={row.analysis} />
          ) : (
            <button
              onClick={() => mutate.mutate()}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary font-semibold text-primary-foreground shadow-elev"
            >
              <Sparkles className="h-4 w-4" />
              Run AI Analysis
            </button>
          )}

          {mutate.isError && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {(mutate.error as Error).message}
            </p>
          )}

          {row.analysis && (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => mutate.mutate()}
                disabled={mutate.isPending}
                className="flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card text-sm font-semibold shadow-card"
              >
                <RefreshCw className="h-4 w-4" />
                Re-analyze
              </button>
              <button
                onClick={onExportPDF}
                className="flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-primary text-sm font-semibold text-primary-foreground shadow-card"
              >
                <Download className="h-4 w-4" />
                Export PDF
              </button>
            </div>
          )}

          <Disclaimer />
        </div>
      )}
    </AppShell>
  );
}

function SummaryCard({ row }: { row: CaseRow }) {
  const items: [string, string | null | undefined][] = [
    ["Gender", row.gender],
    ["Chief Complaint", row.chief_complaint],
    ["Speech Milestones", row.speech_milestones],
    ["Hearing History", row.hearing_history],
  ];
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-primary">
        Case summary
      </h3>
      <dl className="space-y-2 text-sm">
        {items
          .filter(([, v]) => v)
          .map(([k, v]) => (
            <div key={k} className="grid grid-cols-3 gap-2">
              <dt className="text-xs text-muted-foreground">{k}</dt>
              <dd className="col-span-2 text-foreground">{v}</dd>
            </div>
          ))}
      </dl>
    </div>
  );
}

function AnalyzingCard() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-primary/20 bg-primary-soft p-6 text-center">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
      <div>
        <p className="font-semibold text-primary">Analyzing case…</p>
        <p className="text-xs text-muted-foreground">
          Matching clinical symptoms against the supported disorder set.
        </p>
      </div>
    </div>
  );
}

type Ranked = { name: string; confidence: number; rationale: string; index: number };

function AnalysisView({ analysis }: { analysis: AnalysisResult }) {
  const ranked: Ranked[] = (analysis.possible_conditions ?? [])
    .map((c, index) => ({ ...c, index }))
    .sort((a, b) => b.confidence - a.confidence);

  const primary = ranked[0] ?? null;
  const otherRanked = ranked.slice(1);

  // Differentials = other ranked conditions + AI's textual differentials (dedup by name)
  const seen = new Set<string>();
  const differentials: { name: string; confidence: number | null; rationale: string | null }[] = [];
  for (const r of otherRanked) {
    const k = r.name.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    differentials.push({ name: r.name, confidence: r.confidence, rationale: r.rationale || null });
  }
  for (const d of analysis.differential_diagnoses ?? []) {
    const k = d.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    differentials.push({ name: d, confidence: null, rationale: null });
  }

  const [openDiff, setOpenDiff] = useState<string | null>(null);
  const [showFull, setShowFull] = useState(true);

  return (
    <div className="space-y-4">
      {/* PRIMARY CONDITION */}
      {primary && (
        <section className="overflow-hidden rounded-2xl border border-primary/30 bg-card shadow-elev">
          <div className="bg-gradient-primary px-4 py-3 text-primary-foreground">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] opacity-90">
              <Stethoscope className="h-3.5 w-3.5" />
              Primary Condition
            </div>
            <div className="mt-1.5 flex items-start justify-between gap-3">
              <h2 className="text-lg font-bold leading-tight">{primary.name}</h2>
              <ConfidenceBadge value={primary.confidence} tone="onPrimary" />
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/25">
              <div
                className="h-full rounded-full bg-white"
                style={{ width: `${primary.confidence}%` }}
              />
            </div>
          </div>

          <div className="space-y-3 p-4">
            {primary.rationale && (
              <div>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Clinical Reasoning
                </p>
                <p className="text-sm leading-relaxed text-foreground">{primary.rationale}</p>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowFull((v) => !v)}
              className="flex w-full items-center justify-between gap-2 rounded-xl border border-primary/20 bg-primary-soft px-3 py-2.5 text-left transition hover:bg-primary/10"
            >
              <span className="flex items-center gap-2 text-sm font-semibold text-primary">
                <ClipboardList className="h-4 w-4" />
                View Full Recommendation
              </span>
              <ChevronDown
                className={`h-4 w-4 text-primary transition-transform ${showFull ? "rotate-180" : ""}`}
              />
            </button>

            {showFull && (
              <div className="space-y-4 pt-1">
                <RecommendationGroup
                  icon={<Beaker className="h-4 w-4" />}
                  title="Recommended Assessments"
                  items={analysis.recommended_assessments}
                  render={(item, i) => (
                    <RecommendationCard
                      key={i}
                      title={item}
                      priority={priorityForRank(i)}
                      lines={[
                        { label: "Clinical Purpose", value: "Screen and characterize deficit areas linked to the primary condition." },
                        { label: "Evidence Source", value: "Clinical catalog (ASHA / DSM-5-TR aligned)" },
                      ]}
                    />
                  )}
                />

                <RecommendationGroup
                  icon={<Target className="h-4 w-4" />}
                  title="Therapy Goals"
                  items={analysis.therapy_goals}
                  render={(item, i) => (
                    <RecommendationCard
                      key={i}
                      title={item}
                      priority={priorityForRank(i)}
                      lines={[
                        { label: "Suggested Timeline", value: timelineForRank(i) },
                        { label: "Clinical Rationale", value: "Targets functional communication gains for the primary condition." },
                        { label: "Evidence Source", value: "ASHA Practice Portal / BASLP standard texts" },
                      ]}
                    />
                  )}
                />

                <RecommendationGroup
                  icon={<Package className="h-4 w-4" />}
                  title="Materials Required"
                  items={analysis.materials_required}
                  render={(item, i) => (
                    <RecommendationCard
                      key={i}
                      title={item}
                      priority={priorityForRank(i)}
                      lines={[
                        { label: "Recommended Use", value: "Structured sessions supporting the therapy goals above." },
                      ]}
                    />
                  )}
                />

                <div>
                  <SubHeading icon={<HelpCircle className="h-4 w-4" />} title="Questions To Ask Next" />
                  <QuestionChecklist items={analysis.questions_to_ask_next} />
                </div>

                {analysis.clinical_sources && analysis.clinical_sources.length > 0 && (
                  <div>
                    <SubHeading icon={<BookOpen className="h-4 w-4" />} title="Clinical Sources" />
                    <EvidenceCard sources={analysis.clinical_sources} />
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* DIFFERENTIAL DIAGNOSES */}
      {differentials.length > 0 && (
        <section className="rounded-2xl border border-border bg-card p-4 shadow-card">
          <div className="mb-3 flex items-center gap-2 text-primary">
            <ClipboardList className="h-4 w-4" />
            <h3 className="text-xs font-semibold uppercase tracking-wider">Differential Diagnoses</h3>
          </div>
          <ul className="space-y-2">
            {differentials.map((d) => {
              const isOpen = openDiff === d.name;
              return (
                <li
                  key={d.name}
                  className="overflow-hidden rounded-xl border border-border/70 bg-background"
                >
                  <button
                    type="button"
                    onClick={() => setOpenDiff(isOpen ? null : d.name)}
                    className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left transition hover:bg-secondary/50"
                    aria-expanded={isOpen}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <ChevronRight
                        className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-90" : ""}`}
                      />
                      <span className="truncate text-sm font-medium">{d.name}</span>
                    </span>
                    {d.confidence !== null ? (
                      <ConfidenceBadge value={d.confidence} />
                    ) : (
                      <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                        Consider
                      </span>
                    )}
                  </button>
                  {isOpen && (
                    <div className="border-t border-border/70 px-3 py-3">
                      {d.confidence !== null && (
                        <div className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                          <div
                            className="h-full bg-gradient-primary"
                            style={{ width: `${d.confidence}%` }}
                          />
                        </div>
                      )}
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        {d.rationale ||
                          "Alternative to consider. Detailed assessments, materials, and goals are shown only for the Primary Condition to avoid mixing recommendations across disorders."}
                      </p>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {analysis.unmatched_conditions && analysis.unmatched_conditions.length > 0 && (
        <div className="rounded-2xl border border-warning/40 bg-warning/10 p-4 text-xs">
          <p className="mb-1 font-semibold">Unmapped conditions</p>
          <p className="text-muted-foreground">
            The AI suggested conditions not in the clinical catalog. No linked assessments,
            materials, or goals are available for: {analysis.unmatched_conditions.join(", ")}.
          </p>
        </div>
      )}
    </div>
  );
}

type Priority = "High" | "Medium" | "Low";
function priorityForRank(i: number): Priority {
  if (i < 3) return "High";
  if (i < 7) return "Medium";
  return "Low";
}
function timelineForRank(i: number): string {
  if (i < 3) return "Short-term (4–6 weeks)";
  if (i < 7) return "Mid-term (2–3 months)";
  return "Long-term (3+ months)";
}

function PriorityPill({ priority }: { priority: Priority }) {
  const tone =
    priority === "High"
      ? "bg-destructive/10 text-destructive"
      : priority === "Medium"
        ? "bg-warning/20 text-warning-foreground"
        : "bg-muted text-muted-foreground";
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${tone}`}>
      {priority} Priority
    </span>
  );
}

function SubHeading({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="mb-2 flex items-center gap-2 text-primary">
      {icon}
      <h4 className="text-[11px] font-semibold uppercase tracking-wider">{title}</h4>
    </div>
  );
}

function RecommendationGroup<T>({
  icon,
  title,
  items,
  render,
}: {
  icon: React.ReactNode;
  title: string;
  items: T[];
  render: (item: T, index: number) => React.ReactNode;
}) {
  return (
    <div>
      <SubHeading icon={icon} title={title} />
      {items?.length ? (
        <div className="space-y-2">{items.map((it, i) => render(it, i))}</div>
      ) : (
        <p className="text-xs text-muted-foreground">None suggested.</p>
      )}
    </div>
  );
}

function RecommendationCard({
  title,
  priority,
  lines,
}: {
  title: string;
  priority: Priority;
  lines: { label: string; value: string }[];
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-background p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold leading-snug">{title}</p>
        <PriorityPill priority={priority} />
      </div>
      {lines.length > 0 && (
        <dl className="mt-2 space-y-1.5">
          {lines.map((l) => (
            <div key={l.label} className="grid grid-cols-[110px_1fr] gap-2 text-xs">
              <dt className="text-muted-foreground">{l.label}</dt>
              <dd className="text-foreground">{l.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

function QuestionChecklist({ items }: { items: string[] }) {
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  if (!items?.length) return <p className="text-xs text-muted-foreground">None suggested.</p>;
  return (
    <ul className="space-y-1.5">
      {items.map((q, i) => {
        const on = !!checked[i];
        return (
          <li key={i}>
            <button
              type="button"
              onClick={() => setChecked((s) => ({ ...s, [i]: !s[i] }))}
              className="flex w-full items-start gap-2 rounded-lg border border-border/70 bg-background px-3 py-2 text-left transition hover:bg-secondary/50"
              aria-pressed={on}
            >
              {on ? (
                <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              ) : (
                <Square className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <span
                className={`text-sm leading-snug ${on ? "text-muted-foreground line-through" : "text-foreground"}`}
              >
                {q}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function EvidenceCard({
  sources,
}: {
  sources: NonNullable<AnalysisResult["clinical_sources"]>;
}) {
  const STANDARDS = ["DSM-5-TR", "DSM-5", "ICD-11", "ICD-10", "ASHA", "BASLP"] as const;
  const found = new Set<string>();
  let anyVerified = false;
  let anyReview = false;

  for (const s of sources) {
    const blob = `${s.primary_source ?? ""} ${s.secondary_source ?? ""} ${s.kind ?? ""}`.toUpperCase();
    for (const std of STANDARDS) {
      if (blob.includes(std)) found.add(std === "DSM-5" ? "DSM-5-TR" : std === "ICD-10" ? "ICD-11" : std);
    }
    const v = (s.verification_status ?? "").toLowerCase();
    if (v.includes("verif")) anyVerified = true;
    else if (v) anyReview = true;
  }

  // Canonical display order
  const display = ["DSM-5-TR", "ICD-11", "ASHA", "BASLP"];
  const shown = display.filter((d) => found.has(d));

  return (
    <div className="rounded-xl border border-border/70 bg-background p-3">
      <div className="mb-2 flex items-center gap-2">
        <FileText className="h-4 w-4 text-primary" />
        <p className="text-sm font-semibold">Evidence Base</p>
      </div>
      {shown.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {shown.map((label) => (
            <span
              key={label}
              className="rounded-full border border-primary/20 bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary"
            >
              {label === "ASHA" ? "ASHA Practice Portal" : label === "BASLP" ? "BASLP Textbooks" : label}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Sources available in the clinical catalog.
        </p>
      )}
      <div className="mt-3 flex items-center gap-2 text-xs">
        {anyVerified ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 font-semibold text-success">
            <ShieldCheck className="h-3.5 w-3.5" /> Verified
          </span>
        ) : anyReview ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-warning/20 px-2 py-0.5 font-semibold text-warning-foreground">
            Review Required
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 font-semibold text-muted-foreground">
            Status: Not Specified
          </span>
        )}
      </div>
    </div>
  );
}

function ConfidenceBadge({
  value,
  tone = "default",
}: {
  value: number;
  tone?: "default" | "onPrimary";
}) {
  if (tone === "onPrimary") {
    return (
      <span className="shrink-0 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur">
        {value}% match
      </span>
    );
  }
  const cls =
    value >= 70
      ? "bg-success/15 text-success"
      : value >= 40
        ? "bg-warning/20 text-warning-foreground"
        : "bg-muted text-muted-foreground";
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${cls}`}>
      {value}% match
    </span>
  );
}
