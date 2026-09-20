import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { AppShell } from "@/components/AppShell";
import { Disclaimer } from "@/components/Disclaimer";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { analyzeCase, type AnalysisResult } from "@/lib/analyze.functions";
import { Beaker, BookOpen, CheckSquare, ChevronDown, ChevronRight, ClipboardList, Download, FileText, HelpCircle, Loader2, Package, Pencil, RefreshCw, ShieldCheck, Sparkles, Square, Stethoscope, Target, Trash2 } from "lucide-react";
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

  // Auto-run analysis if navigated with ?run=1 and no analysis exists.
  // Clear the transient URL state before starting the network mutation so the
  // route is not replaced while the mutation is already in flight.
  const mutateRef = useRef(mutate.mutate);
  mutateRef.current = mutate.mutate;

  useEffect(() => {
    if (!row || triggeredRef.current) return;
    if (run === 1 && !row.analysis) {
      triggeredRef.current = true;
      navigate({ to: "/case/$id", params: { id }, search: {}, replace: true });
      mutateRef.current();
    }
  }, [row?.id, row?.analysis, run, id, navigate]);

  async function onDelete() {
    const { confirmAsync } = await import("@/lib/confirm");
    if (!(await confirmAsync("Delete this case? This cannot be undone.", "Delete case"))) return;
    await supabase.from("cases").delete().eq("id", id);
    navigate({ to: "/cases", replace: true });
  }

  const [exporting, setExporting] = useState(false);
  async function onExportPDF() {
    if (!row || exporting) return;
    setExporting(true);
    try {
      const { exportCasePDF } = await import("@/lib/pdf");
      await exportCasePDF(row);
      if (typeof window !== "undefined" && (window as any).Capacitor?.isNativePlatform?.()) {
        const { toast } = await import("sonner");
        toast.success("PDF saved to Documents");
      }
    } catch (e) {
      const { toast } = await import("sonner");
      toast.error(e instanceof Error ? e.message : "Could not export PDF");
    } finally {
      setExporting(false);
    }
  }

  return (
    <AppShell title={row?.name ?? "Case"} subtitle={row?.age ? `Age ${row.age}` : "Case analysis"} back hideNav right={<div className="flex items-center gap-2"><Link to="/case/$id/edit" params={{ id }} className="grid h-9 w-9 place-items-center rounded-full bg-secondary text-primary transition hover:bg-primary/10" aria-label="Edit case"><Pencil className="h-4 w-4" /></Link><button onClick={onDelete} className="grid h-9 w-9 place-items-center rounded-full bg-secondary text-destructive transition hover:bg-destructive/10" aria-label="Delete case"><Trash2 className="h-4 w-4" /></button></div>}>
      {isLoading || !row ? <div className="space-y-3"><div className="h-24 animate-pulse rounded-2xl bg-muted" /><div className="h-40 animate-pulse rounded-2xl bg-muted" /></div> : <div className="space-y-4"><SummaryCard row={row} />{mutate.isPending || (run === 1 && !row.analysis) ? <AnalyzingCard /> : row.analysis ? <AnalysisView analysis={row.analysis} /> : <button onClick={() => mutate.mutate()} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary font-semibold text-primary-foreground shadow-elev"><Sparkles className="h-4 w-4" />Run AI Analysis</button>}{mutate.isError && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{(mutate.error as Error).message}</p>}{row.analysis && <div className="grid grid-cols-2 gap-3"><button onClick={() => mutate.mutate()} disabled={mutate.isPending} className="flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card text-sm font-semibold shadow-card"><RefreshCw className="h-4 w-4" />Re-analyze</button><button onClick={onExportPDF} disabled={exporting} className="flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-primary text-sm font-semibold text-primary-foreground shadow-card disabled:opacity-60"><Download className="h-4 w-4" />{exporting ? "Exporting…" : "Export PDF"}</button></div>}<Disclaimer /></div>}
    </AppShell>
  );
}

function SummaryCard({ row }: { row: CaseRow }) {
  const items: [string, string | null | undefined][] = [["Gender", row.gender], ["Chief Complaint", row.chief_complaint], ["Speech Milestones", row.speech_milestones], ["Hearing History", row.hearing_history]];
  return <div className="rounded-2xl border border-border bg-card p-4 shadow-card"><h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-primary">Case summary</h3><dl className="space-y-2 text-sm">{items.filter(([, v]) => v).map(([k, v]) => <div key={k} className="grid grid-cols-3 gap-2"><dt className="text-xs text-muted-foreground">{k}</dt><dd className="col-span-2 text-foreground">{v}</dd></div>)}</dl></div>;
}

function AnalyzingCard() { return <div className="flex flex-col items-center gap-3 rounded-2xl border border-primary/20 bg-primary-soft p-6 text-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /><div><p className="font-semibold text-primary">Analyzing case…</p><p className="text-xs text-muted-foreground">Matching clinical symptoms against the supported disorder set.</p></div></div>; }

type Ranked = { name: string; confidence: number; rationale: string; index: number };

function AnalysisView({ analysis }: { analysis: AnalysisResult }) {
  const ranked: Ranked[] = (analysis.possible_conditions ?? []).map((c, index) => ({ ...c, index })).sort((a, b) => b.confidence - a.confidence);
  const primary = ranked[0] ?? null;
  const otherRanked = ranked.slice(1);
  const seen = new Set<string>();
  const differentials: { name: string; confidence: number | null; rationale: string | null }[] = [];
  for (const r of otherRanked) { const k = r.name.toLowerCase(); if (seen.has(k)) continue; seen.add(k); differentials.push({ name: r.name, confidence: r.confidence, rationale: r.rationale || null }); }
  for (const d of analysis.differential_diagnoses ?? []) { const k = d.toLowerCase(); if (seen.has(k)) continue; seen.add(k); differentials.push({ name: d, confidence: null, rationale: null }); }
  const [openDiff, setOpenDiff] = useState<string | null>(null);
  const [showFull, setShowFull] = useState(true);
  return (
    <div className="space-y-4">
      {primary && <section className="overflow-hidden rounded-2xl border border-primary/30 bg-card shadow-elev"><div className="bg-gradient-primary px-4 py-3 text-primary-foreground"><div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] opacity-90"><Stethoscope className="h-3.5 w-3.5" />Primary Condition</div><div className="mt-1.5 flex items-start justify-between gap-3"><h2 className="text-lg font-bold leading-tight">{primary.name}</h2><ConfidenceBadge value={primary.confidence} tone="onPrimary" /></div><div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/25"><div className="h-full rounded-full bg-white" style={{ width: `${primary.confidence}%` }} /></div></div><div className="space-y-3 p-4">{primary.rationale && <div><p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Clinical Reasoning</p><p className="text-sm leading-relaxed text-foreground">{primary.rationale}</p></div>}<button type="button" onClick={() => setShowFull((v) => !v)} className="flex w-full items-center justify-between gap-2 rounded-xl border border-primary/20 bg-primary-soft px-3 py-2.5 text-left transition hover:bg-primary/10"><span className="flex items-center gap-2 text-sm font-semibold text-primary"><ClipboardList className="h-4 w-4" />View Full Recommendation</span><ChevronDown className={`h-4 w-4 text-primary transition-transform ${showFull ? "rotate-180" : ""}`} /></button>{showFull && <div className="space-y-4 pt-1"><RecommendationGroup icon={<Beaker className="h-4 w-4" />} title="Recommended Assessments" items={analysis.recommended_assessments} render={(item, i) => <RecommendationCard key={i} title={item} priority={priorityForRank(i)} lines={[{ label: "Clinical Purpose", value: "Screen and characterize deficit areas linked to the primary condition." }, { label: "Evidence Source", value: "Clinical catalog (ASHA / DSM-5-TR aligned)" }]} />} /><RecommendationGroup icon={<Target className="h-4 w-4" />} title="Therapy Goals" items={analysis.therapy_goals} render={(item, i) => <RecommendationCard key={i} title={item} priority={priorityForRank(i)} lines={[{ label: "Suggested Timeline", value: timelineForRank(i) }, { label: "Clinical Rationale", value: "Targets functional communication gains for the primary condition." }, { label: "Evidence Source", value: "ASHA Practice Portal / BASLP standard texts" }]} />} /><RecommendationGroup icon={<Package className="h-4 w-4" />} title="Materials Required" items={analysis.materials_required} render={(item, i) => <RecommendationCard key={i} title={item} priority={priorityForRank(i)} lines={[{ label: "Recommended Use", value: "Structured sessions supporting the therapy goals above." }]} />} /><div><SubHeading icon={<HelpCircle className="h-4 w-4" />} title="Questions To Ask Next" /><QuestionChecklist items={analysis.questions_to_ask_next} /></div>{analysis.clinical_sources && analysis.clinical_sources.length > 0 && <div><SubHeading icon={<BookOpen className="h-4 w-4" />} title="Clinical Sources" /><EvidenceCard sources={analysis.clinical_sources} /></div>}</div>}</div></section>}
      {differentials.length > 0 && <section className="rounded-2xl border border-border bg-card p-4 shadow-card"><div className="mb-3 flex items-center gap-2 text-primary"><ClipboardList className="h-4 w-4" /><h3 className="text-xs font-semibold uppercase tracking-wider">Differential Diagnoses</h3></div><ul className="space-y-2">{differentials.map((d) => { const isOpen = openDiff === d.name; return <li key={d.name} className="overflow-hidden rounded-xl border border-border/70 bg-background"><button type="button" onClick={() => setOpenDiff(isOpen ? null : d.name)} className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left transition hover:bg-secondary/50" aria-expanded={isOpen}><span className="flex min-w-0 items-center gap-2"><ChevronRight className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-90" : ""}`} /><span className="truncate text-sm font-medium">{d.name}</span></span>{d.confidence !== null ? <ConfidenceBadge value={d.confidence} /> : <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">Consider</span>}</button>{isOpen && <div className="border-t border-border/70 px-3 py-3">{d.confidence !== null && <div className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary"><div className="h-full bg-gradient-primary" style={{ width: `${d.confidence}%` }} /></div>}<p className="text-xs leading-relaxed text-muted-foreground">{d.rationale || "Alternative to consider. Detailed assessments, materials, and goals are shown only for the Primary Condition to avoid mixing recommendations across disorders."}</p></div>}</li>; })}</ul></section>}
      {analysis.unmatched_conditions && analysis.unmatched_conditions.length > 0 && <div className="rounded-2xl border border-warning/40 bg-warning/10 p-4 text-xs"><p className="mb-1 font-semibold">Unmapped conditions</p><p className="text-muted-foreground">The AI suggested conditions not in the supported set: {analysis.unmatched_conditions.join(", ")}</p></div>}
    </div>
  );
}

function ConfidenceBadge({ value, tone }: { value: number; tone?: "onPrimary" }) { return <span className={tone === "onPrimary" ? "rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold" : "rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary"}>{Math.round(value)}%</span>; }
function priorityForRank(i: number) { return i === 0 ? "High" : i === 1 ? "Medium" : "Low"; }
function timelineForRank(i: number) { return i === 0 ? "4–6 weeks" : i === 1 ? "6–8 weeks" : "8–12 weeks"; }
function RecommendationGroup({ icon, title, items, render }: { icon: React.ReactNode; title: string; items?: string[]; render: (item: string, i: number) => React.ReactNode }) { if (!items?.length) return null; return <div><SubHeading icon={icon} title={title} /><div className="space-y-2">{items.map(render)}</div></div>; }
function RecommendationCard({ title, priority, lines }: { title: string; priority: string; lines: { label: string; value: string }[] }) { return <div className="rounded-xl border border-border bg-background p-3"><div className="flex items-start justify-between gap-2"><p className="text-sm font-semibold">{title}</p><span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">{priority}</span></div><div className="mt-2 space-y-1">{lines.map((l) => <p key={l.label} className="text-xs text-muted-foreground"><span className="font-semibold text-foreground/80">{l.label}:</span> {l.value}</p>)}</div></div>; }
function SubHeading({ icon, title }: { icon: React.ReactNode; title: string }) { return <div className="mb-2 flex items-center gap-2 text-primary"><span>{icon}</span><h4 className="text-xs font-semibold uppercase tracking-wider">{title}</h4></div>; }
function QuestionChecklist({ items }: { items?: string[] }) { const [checked, setChecked] = useState<Set<number>>(() => new Set()); if (!items?.length) return null; return <div className="space-y-2">{items.map((item, i) => <button key={i} type="button" onClick={() => setChecked((s) => { const n = new Set(s); if (n.has(i)) n.delete(i); else n.add(i); return n; })} className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm ${checked.has(i) ? "border-primary/30 bg-primary-soft text-primary" : "border-border bg-background"}`}><span>{checked.has(i) ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}</span>{item}</button>)}</div>; }
function EvidenceCard({ sources }: { sources: AnalysisResult["clinical_sources"] }) { return <div className="space-y-2">{sources?.map((s, i) => <div key={i} className="rounded-xl border border-border bg-background p-3 text-xs"><p className="font-semibold">{s.primary_source || s.secondary_source || "Clinical reference"}</p><p className="mt-1 text-muted-foreground">{s.verification_status || "Not specified"}</p></div>)}</div>; }
