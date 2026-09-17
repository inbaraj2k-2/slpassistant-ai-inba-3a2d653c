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

type RegisterField = (key: keyof Fields, element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null) => void;

function EditCasePage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const inputRefs = useRef<Partial<Record<keyof Fields, HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>>>({});
  const [fields, setFields] = useState<Fields>(empty);
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
        setFields(next);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [id]);

  function registerField(key: keyof Fields, element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null) {
    if (element) inputRefs.current[key] = element;
    else delete inputRefs.current[key];
  }

  function readFields(): Fields {
    const values = { ...empty };
    for (const key of Object.keys(empty) as (keyof Fields)[]) {
      values[key] = inputRefs.current[key]?.value ?? "";
    }
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

  if (loading) {
    return <AppShell title="Edit Case" back hideNav><div className="flex items-center justify-center py-20">{error ? <p className="text-xs text-destructive">{error}</p> : <Loader2 className="h-6 w-6 animate-spin text-primary" />}</div></AppShell>;
  }

  return (
    <AppShell title="Edit Case" subtitle="Update case history" back hideNav>
      <div className="space-y-5">
        <Section title="Demographics">
          <Field label="Name" name="name" value={fields.name} registerField={registerField} required />
          <div className="grid grid-cols-2 gap-3"><Field label="Age" name="age" value={fields.age} registerField={registerField} /><Field label="Gender" name="gender" value={fields.gender} registerField={registerField} /></div>
          <Area label="Chief Complaint" name="chief_complaint" value={fields.chief_complaint} registerField={registerField} />
        </Section>
        <Section title="Birth History">
          <Area label="Prenatal History" name="prenatal_history" value={fields.prenatal_history} registerField={registerField} />
          <Area label="Natal History" name="natal_history" value={fields.natal_history} registerField={registerField} />
          <Area label="Postnatal History" name="postnatal_history" value={fields.postnatal_history} registerField={registerField} />
        </Section>
        <Section title="Developmental">
          <Area label="Motor Milestones" name="motor_milestones" value={fields.motor_milestones} registerField={registerField} />
          <Area label="Speech Milestones" name="speech_milestones" value={fields.speech_milestones} registerField={registerField} />
          <Area label="Language History" name="language_history" value={fields.language_history} registerField={registerField} />
        </Section>
        <Section title="Other History">
          <Area label="Hearing History" name="hearing_history" value={fields.hearing_history} registerField={registerField} />
          <Area label="Education History" name="education_history" value={fields.education_history} registerField={registerField} />
          <Area label="Family History" name="family_history" value={fields.family_history} registerField={registerField} />
          <Area label="Additional Notes" name="additional_notes" value={fields.additional_notes} registerField={registerField} />
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
function Field({ label, name, value, registerField, ...props }: { label: string; name: keyof Fields; value?: string; registerField: RegisterField } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "name" | "type" | "value">) { return <label className="block"><span className="mb-1 block text-xs font-medium text-foreground/80">{label}</span><input type="text" inputMode="text" {...props} name={name} defaultValue={value} ref={(element) => registerField(name, element)} maxLength={props.maxLength ?? 500} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30" /></label>; }
function Select({ label, name, registerField, options }: { label: string; name: keyof Fields; registerField: RegisterField; options: string[] }) { return <label className="block"><span className="mb-1 block text-xs font-medium text-foreground/80">{label}</span><select name={name} ref={(element) => registerField(name, element)} className="h-10 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/30">{options.map((o) => <option key={o} value={o}>{o || "Select…"}</option>)}</select></label>; }
function Area({ label, name, value, registerField, placeholder }: { label: string; name: keyof Fields; value?: string; registerField: RegisterField; placeholder?: string }) { return <label className="block"><span className="mb-1 block text-xs font-medium text-foreground/80">{label}</span><textarea name={name} defaultValue={value} ref={(element) => registerField(name, element)} rows={3} maxLength={4000} placeholder={placeholder} className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground/50 focus:border-primary focus:ring-2 focus:ring-ring/30" /></label>; }
