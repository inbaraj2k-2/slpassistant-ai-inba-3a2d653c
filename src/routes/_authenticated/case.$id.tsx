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
  ClipboardList,
  Download,
  HelpCircle,
  Loader2,
  Package,
  Pencil,
  RefreshCw,
  Sparkles,
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
        <button
          onClick={onDelete}
          className="grid h-9 w-9 place-items-center rounded-full bg-secondary text-destructive transition hover:bg-destructive/10"
          aria-label="Delete case"
        >
          <Trash2 className="h-4 w-4" />
        </button>
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

function AnalysisView({ analysis }: { analysis: AnalysisResult }) {
  return (
    <div className="space-y-4">
      <Block icon={<Sparkles className="h-4 w-4" />} title="Possible Conditions">
        <ul className="space-y-2">
          {analysis.possible_conditions.map((c, i) => (
            <li key={i} className="rounded-xl border border-border/70 bg-background p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">{c.name}</p>
                <ConfidenceBadge value={c.confidence} />
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full bg-gradient-primary"
                  style={{ width: `${c.confidence}%` }}
                />
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{c.rationale}</p>
            </li>
          ))}
        </ul>
      </Block>

      {analysis.differential_diagnoses?.length > 0 && (
        <Block icon={<ClipboardList className="h-4 w-4" />} title="Differential Diagnoses">
          <Chips items={analysis.differential_diagnoses} />
        </Block>
      )}

      <Block icon={<Beaker className="h-4 w-4" />} title="Recommended Assessments">
        <BulletList items={analysis.recommended_assessments} />
      </Block>

      <Block icon={<Package className="h-4 w-4" />} title="Materials Required">
        <BulletList items={analysis.materials_required} />
      </Block>

      <Block icon={<Target className="h-4 w-4" />} title="Suggested Therapy Goals">
        <BulletList items={analysis.therapy_goals} />
      </Block>

      <Block icon={<HelpCircle className="h-4 w-4" />} title="Questions To Ask Next">
        <BulletList items={analysis.questions_to_ask_next} />
      </Block>
    </div>
  );
}

function Block({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <div className="mb-3 flex items-center gap-2 text-primary">
        {icon}
        <h3 className="text-xs font-semibold uppercase tracking-wider">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function BulletList({ items }: { items: string[] }) {
  if (!items?.length) return <p className="text-xs text-muted-foreground">None suggested.</p>;
  return (
    <ul className="space-y-1.5 text-sm">
      {items.map((it, i) => (
        <li key={i} className="flex gap-2">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}

function Chips({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((it, i) => (
        <span
          key={i}
          className="rounded-full bg-secondary px-2.5 py-1 text-xs text-secondary-foreground"
        >
          {it}
        </span>
      ))}
    </div>
  );
}

function ConfidenceBadge({ value }: { value: number }) {
  const tone =
    value >= 70
      ? "bg-success/15 text-success"
      : value >= 40
        ? "bg-warning/20 text-warning-foreground"
        : "bg-muted text-muted-foreground";
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${tone}`}>
      {value}% match
    </span>
  );
}
