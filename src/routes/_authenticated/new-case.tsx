import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Disclaimer } from "@/components/Disclaimer";
import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Sparkles, WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export const Route = createFileRoute("/_authenticated/new-case")({
  head: () => ({ meta: [{ title: "New Case — SLP Assist AI" }] }),
  component: NewCasePage,
});

interface Fields {
  name: string;
  age: string;
  gender: string;
  chief_complaint: string;
  prenatal_history: string;
  natal_history: string;
  postnatal_history: string;
  motor_milestones: string;
  speech_milestones: string;
  language_history: string;
  hearing_history: string;
  education_history: string;
  family_history: string;
  additional_notes: string;
}

const empty: Fields = {
  name: "", age: "", gender: "", chief_complaint: "", prenatal_history: "",
  natal_history: "", postnatal_history: "", motor_milestones: "", speech_milestones: "",
  language_history: "", hearing_history: "", education_history: "", family_history: "",
  additional_notes: "",
};

type FieldRefs = { [K in keyof Fields]: React.RefObject<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null> };

function makeRefs(): FieldRefs {
  return {
    name: { current: null }, age: { current: null }, gender: { current: null },
    chief_complaint: { current: null }, prenatal_history: { current: null }, natal_history: { current: null },
    postnatal_history: { current: null }, motor_milestones: { current: null }, speech_milestones: { current: null },
    language_history: { current: null }, hearing_history: { current: null }, education_history: { current: null },
    family_history: { current: null }, additional_notes: { current: null },
  };
}

function NewCasePage() {
  const navigate = useNavigate();
  const online = useOnlineStatus();
  const refs = useRef<FieldRefs>(makeRefs()).current;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function readFields(): Fields {
    const result = { ...empty };
    for (const key of Object.keys(empty) as (keyof Fields)[]) {
      result[key] = refs[key].current?.value ?? "";
    }
    return result;
  }

  async function analyze() {
    setError(null);
    const f = readFields();
    if (!f.name.trim()) { setError("Patient name is required."); return; }
    const tooLong = Object.entries(f).find(([, v]) => v.length > 4000);
    if (tooLong) { setError(`Field "${tooLong[0]}" is too long (max 4000 characters).`); return; }
    setBusy(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const { data, error } = await supabase.from("cases").insert({ ...f, user_id: u.user.id }).select("id").single();
      if (error || !data) throw error ?? new Error("Failed to save case");
      navigate({ to: "/case/$id", params: { id: data.id }, search: { run: 1 } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save case");
      setBusy(false);
    }
  }

  return (
    <AppShell title="New Case" subtitle="Collect case history" back backTo="/home" hideNav>
      <Disclaimer compact />
      <div className="mt-4 space-y-5">
        <Section title="Demographics">
          <Row><Field label="Name" inputRef={refs.name} required /></Row>
          <Row two>
            <Field label="Age" inputRef={refs.age} placeholder="e.g. 4y 6m" />
            <Select label="Gender" inputRef={refs.gender} options={["", "Male", "Female", "Other"]} />
          </Row>
          <Area label="Chief Complaint" inputRef={refs.chief_complaint} placeholder="Parent / patient's primary concern" />
        </Section>
        <Section title="Birth History">
          <Area label="Prenatal History" inputRef={refs.prenatal_history} />
          <Area label="Natal History" inputRef={refs.natal_history} />
          <Area label="Postnatal History" inputRef={refs.postnatal_history} />
        </Section>
        <Section title="Developmental">
          <Area label="Motor Milestones" inputRef={refs.motor_milestones} />
          <Area label="Speech Milestones" inputRef={refs.speech_milestones} />
          <Area label="Language History" inputRef={refs.language_history} />
        </Section>
        <Section title="Other History">
          <Area label="Hearing History" inputRef={refs.hearing_history} />
          <Area label="Education History" inputRef={refs.education_history} />
          <Area label="Family History" inputRef={refs.family_history} />
          <Area label="Additional Notes" inputRef={refs.additional_notes} />
        </Section>
        {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>}
        {!online && <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200"><WifiOff className="mt-0.5 h-4 w-4 shrink-0" /><span>Internet required for AI analysis. You can still save the case history and use offline tools.</span></div>}
        <button onClick={analyze} disabled={busy || !online} title={!online ? "Internet required for AI analysis" : undefined} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary font-semibold text-primary-foreground shadow-elev transition hover:opacity-95 disabled:opacity-60">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {busy ? "Saving…" : !online ? "AI Unavailable (Offline)" : "Analyze Case"}
        </button>
      </div>
    </AppShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-border bg-card p-4 shadow-card"><h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-primary">{title}</h3><div className="space-y-3">{children}</div></section>;
}
function Row({ children, two }: { children: React.ReactNode; two?: boolean }) { return <div className={two ? "grid grid-cols-2 gap-3" : ""}>{children}</div>; }

function Field({ label, inputRef, ...props }: { label: string; inputRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null> } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  return <label className="block"><span className="mb-1 block text-xs font-medium text-foreground/80">{label}</span><input type="text" inputMode="text" {...props} ref={inputRef as React.RefObject<HTMLInputElement>} defaultValue="" maxLength={props.maxLength ?? 500} autoComplete="off" className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30" /></label>;
}
function Select({ label, inputRef, options }: { label: string; inputRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null>; options: string[] }) {
  return <label className="block"><span className="mb-1 block text-xs font-medium text-foreground/80">{label}</span><select ref={inputRef as React.RefObject<HTMLSelectElement>} defaultValue="" className="h-10 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/30">{options.map((o) => <option key={o} value={o}>{o || "Select…"}</option>)}</select></label>;
}
function Area({ label, inputRef, placeholder }: { label: string; inputRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null>; placeholder?: string }) {
  return <label className="block"><span className="mb-1 block text-xs font-medium text-foreground/80">{label}</span><textarea ref={inputRef as React.RefObject<HTMLTextAreaElement>} rows={3} maxLength={4000} placeholder={placeholder} className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground/50 focus:border-primary focus:ring-2 focus:ring-ring/30" /></label>;
}
