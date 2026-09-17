import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Disclaimer } from "@/components/Disclaimer";
import { useState } from "react";
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
  name: "",
  age: "",
  gender: "",
  chief_complaint: "",
  prenatal_history: "",
  natal_history: "",
  postnatal_history: "",
  motor_milestones: "",
  speech_milestones: "",
  language_history: "",
  hearing_history: "",
  education_history: "",
  family_history: "",
  additional_notes: "",
};

function NewCasePage() {
  const navigate = useNavigate();
  const online = useOnlineStatus();
  const [fields, setFields] = useState<Fields>(empty);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateField(key: keyof Fields, value: string) {
    setFields((current) => ({ ...current, [key]: value }));
  }

  async function analyze() {
    setError(null);
    if (!fields.name.trim()) {
      setError("Patient name is required.");
      return;
    }
    const tooLong = Object.entries(fields).find(([, value]) => value.length > 4000);
    if (tooLong) {
      setError(`Field "${tooLong[0]}" is too long (max 4000 characters).`);
      return;
    }
    setBusy(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("cases")
        .insert({ ...fields, user_id: u.user.id })
        .select("id")
        .single();
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
          <Row><Field label="Name" name="name" value={fields.name} onChange={updateField} required /></Row>
          <Row two>
            <Field label="Age" name="age" value={fields.age} onChange={updateField} placeholder="e.g. 4y 6m" />
            <Select label="Gender" name="gender" value={fields.gender} onChange={updateField} options={["", "Male", "Female", "Other"]} />
          </Row>
          <Area label="Chief Complaint" name="chief_complaint" value={fields.chief_complaint} onChange={updateField} placeholder="Parent / patient's primary concern" />
        </Section>
        <Section title="Birth History">
          <Area label="Prenatal History" name="prenatal_history" value={fields.prenatal_history} onChange={updateField} />
          <Area label="Natal History" name="natal_history" value={fields.natal_history} onChange={updateField} />
          <Area label="Postnatal History" name="postnatal_history" value={fields.postnatal_history} onChange={updateField} />
        </Section>
        <Section title="Developmental">
          <Area label="Motor Milestones" name="motor_milestones" value={fields.motor_milestones} onChange={updateField} />
          <Area label="Speech Milestones" name="speech_milestones" value={fields.speech_milestones} onChange={updateField} />
          <Area label="Language History" name="language_history" value={fields.language_history} onChange={updateField} />
        </Section>
        <Section title="Other History">
          <Area label="Hearing History" name="hearing_history" value={fields.hearing_history} onChange={updateField} />
          <Area label="Education History" name="education_history" value={fields.education_history} onChange={updateField} />
          <Area label="Family History" name="family_history" value={fields.family_history} onChange={updateField} />
          <Area label="Additional Notes" name="additional_notes" value={fields.additional_notes} onChange={updateField} />
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

type UpdateField = (key: keyof Fields, value: string) => void;

function Field({ label, name, value, onChange, ...props }: { label: string; name: keyof Fields; value: string; onChange: UpdateField } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "name" | "type" | "value" | "onChange">) {
  return <label className="block"><span className="mb-1 block text-xs font-medium text-foreground/80">{label}</span><input type="text" inputMode="text" {...props} name={name} value={value} onChange={(e) => onChange(name, e.target.value)} maxLength={props.maxLength ?? 500} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30" /></label>;
}
function Select({ label, name, value, onChange, options }: { label: string; name: keyof Fields; value: string; onChange: UpdateField; options: string[] }) {
  return <label className="block"><span className="mb-1 block text-xs font-medium text-foreground/80">{label}</span><select name={name} value={value} onChange={(e) => onChange(name, e.target.value)} className="h-10 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/30">{options.map((o) => <option key={o} value={o}>{o || "Select…"}</option>)}</select></label>;
}
function Area({ label, name, value, onChange, placeholder }: { label: string; name: keyof Fields; value: string; onChange: UpdateField; placeholder?: string }) {
  return <label className="block"><span className="mb-1 block text-xs font-medium text-foreground/80">{label}</span><textarea name={name} value={value} onChange={(e) => onChange(name, e.target.value)} rows={3} maxLength={4000} placeholder={placeholder} className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground/50 focus:border-primary focus:ring-2 focus:ring-ring/30" /></label>;
}
