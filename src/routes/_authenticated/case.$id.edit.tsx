import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Save } from "lucide-react";

export const Route = createFileRoute("/_authenticated/case/$id/edit")({
  head: () => ({ meta: [{ title: "Edit Case — SLP Assist AI" }] }),
  component: EditCasePage,
});

interface Fields {
  name: string; age: string; gender: string; chief_complaint: string;
  prenatal_history: string; natal_history: string; postnatal_history: string;
  motor_milestones: string; speech_milestones: string; language_history: string;
  hearing_history: string; education_history: string; family_history: string; additional_notes: string;
}

const empty: Fields = {
  name: "", age: "", gender: "", chief_complaint: "", prenatal_history: "", natal_history: "",
  postnatal_history: "", motor_milestones: "", speech_milestones: "", language_history: "",
  hearing_history: "", education_history: "", family_history: "", additional_notes: "",
};

type FieldElement = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
type RegisterField = (key: keyof Fields, element: FieldElement | null) => void;

function EditCasePage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const inputRefs = useRef<Partial<Record<keyof Fields, FieldElement>>>({});
  const [initialFields, setInitialFields] = useState<Fields | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.from("cases").select("*").eq("id", id).single();
      if (cancelled) return;
      if (error || !data) {
        if (error) console.error("[case.edit] load failed", error);
        setError("Case could not be loaded. Please try again.");
      } else {
        const next = { ...empty };
        for (const k of Object.keys(empty) as (keyof Fields)[]) next[k] = (data[k] as string | null) ?? "";
        setInitialFields(next);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [id]);

  function registerField(key: keyof Fields, element: FieldElement | null) {
    if (element) inputRefs.current[key] = element;
    else delete inputRefs.current[key];
  }

  function readFields(): Fields {
    const values = { ...empty };
    for (const key of Object.keys(empty) as (keyof Fields)[]) values[key] = inputRefs.current[key]?.value ?? "";
    return values;
  }

  async function save() {
    setError(null);
    const currentFields = readFields();
    if (!currentFields.name.trim()) { setError("Patient name is required."); return; }
    if (Object.values(currentFields).some((v) => v.length > 4000)) { setError("A field is too long (max 4000 characters)."); return; }
    if (busy) return;
    setBusy(true);
    let watchdog: ReturnType<typeof setTimeout> | null = setTimeout(() => {
      setError("Save is taking longer than expected. Please try again.");
      setBusy(false);
    }, 25_000);
    try {
      const { error } = await supabase.from("cases").update({ ...currentFields, updated_at: new Date().toISOString() }).eq("id", id);
      if (watchdog) { clearTimeout(watchdog); watchdog = null; }
      if (error) { setError(error.message); setBusy(false); return; }
      navigate({ to: "/case/$id", params: { id }, replace: true });
    } catch (e) {
      if (watchdog) { clearTimeout(watchdog); watchdog = null; }
      setError(e instanceof Error ? e.message : "Save failed");
      setBusy(false);
    }
  }

  if (loading) return <AppShell title="Edit Case" back hideNav><div className="flex items-center justify-center py-20">{error ? <p className="text-xs text-destructive">{error}</p> : <Loader2 className="h-6 w-6 animate-spin text-primary" />}</div></AppShell>;
  if (!initialFields) return <AppShell title="Edit Case" back hideNav><p className="py-20 text-center text-xs text-destructive">{error ?? "Case could not be loaded."}</p></AppShell>;

  return (
    <AppShell title="Edit Case" subtitle="Update case history" back hideNav>
      <div className="space-y-5">
        <Section title="Demographics">
          <Field label="Name" name="name" initialValue={initialFields.name} registerField={registerField} required />
          <div className="grid grid-cols-2 gap-3"><Field label="Age" name="age" initialValue={initialFields.age} registerField={registerField} /><Select label="Gender" name="gender" initialValue={initialFields.gender} registerField={registerField} options={["", "Male", "Female", "Other"]} /></div>
          <Area label="Chief Complaint" name="chief_complaint" initialValue={initialFields.chief_complaint} registerField={registerField} />
        </Section>
        <Section title="Birth History">
          <Area label="Prenatal History" name="prenatal_history" initialValue={initialFields.prenatal_history} registerField={registerField} />
          <Area label="Natal History" name="natal_history" initialValue={initialFields.natal_history} registerField={registerField} />
          <Area label="Postnatal History" name="postnatal_history" initialValue={initialFields.postnatal_history} registerField={registerField} />
        </Section>
        <Section title="Developmental">
          <Area label="Motor Milestones" name="motor_milestones" initialValue={initialFields.motor_milestones} registerField={registerField} />
          <Area label="Speech Milestones" name="speech_milestones" initialValue={initialFields.speech_milestones} registerField={registerField} />
          <Area label="Language History" name="language_history" initialValue={initialFields.language_history} registerField={registerField} />
        </Section>
        <Section title="Other History">
          <Area label="Hearing History" name="hearing_history" initialValue={initialFields.hearing_history} registerField={registerField} />
          <Area label="Education History" name="education_history" initialValue={initialFields.education_history} registerField={registerField} />
          <Area label="Family History" name="family_history" initialValue={initialFields.family_history} registerField={registerField} />
          <Area label="Additional Notes" name="additional_notes" initialValue={initialFields.additional_notes} registerField={registerField} />
        </Section>
        {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>}
        <button onClick={save} disabled={busy} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary font-semibold text-primary-foreground shadow-elev disabled:opacity-60">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{busy ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </AppShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) { return <section className="rounded-2xl border border-border bg-card p-4 shadow-card"><h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-primary">{title}</h3><div className="space-y-3">{children}</div></section>; }

function Field({ label, name, initialValue = "", registerField, ...props }: { label: string; name: keyof Fields; initialValue?: string; registerField: RegisterField } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "name" | "type" | "value" | "defaultValue">) {
  const [value, setValue] = useState(initialValue);
  return <label className="block"><span className="mb-1 block text-xs font-medium text-foreground/80">{label}</span><input type="text" inputMode="text" {...props} name={name} value={value} onChange={(e) => { setValue(e.target.value); registerField(name, e.currentTarget); }} ref={(element) => registerField(name, element)} maxLength={props.maxLength ?? 500} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30" /></label>;
}
function Select({ label, name, initialValue = "", registerField, options }: { label: string; name: keyof Fields; initialValue?: string; registerField: RegisterField; options: string[] }) {
  const [value, setValue] = useState(initialValue);
  return <label className="block"><span className="mb-1 block text-xs font-medium text-foreground/80">{label}</span><select name={name} value={value} onChange={(e) => { setValue(e.target.value); registerField(name, e.currentTarget); }} ref={(element) => registerField(name, element)} className="h-10 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/30">{options.map((o) => <option key={o} value={o}>{o || "Select…"}</option>)}</select></label>;
}
function Area({ label, name, initialValue = "", registerField, placeholder }: { label: string; name: keyof Fields; initialValue?: string; registerField: RegisterField; placeholder?: string }) {
  const [value, setValue] = useState(initialValue);
  return <label className="block"><span className="mb-1 block text-xs font-medium text-foreground/80">{label}</span><textarea name={name} value={value} onChange={(e) => { setValue(e.target.value); registerField(name, e.currentTarget); }} ref={(element) => registerField(name, element)} rows={3} maxLength={4000} placeholder={placeholder} className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground/50 focus:border-primary focus:ring-2 focus:ring-ring/30" /></label>;
}
