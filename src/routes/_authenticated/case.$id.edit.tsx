import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Save } from "lucide-react";

export const Route = createFileRoute("/_authenticated/case/$id/edit")({
  head: () => ({ meta: [{ title: "Edit Case — SLP Assist AI" }] }),
  component: EditCasePage,
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

function EditCasePage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [fields, setFields] = useState<Fields>(empty);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setFields(empty);
    (async () => {
      const { data, error } = await supabase.from("cases").select("*").eq("id", id).single();
      if (cancelled) return;
      if (error || !data) {
        if (error) console.error("[case.edit] load failed", error);
        setError("Case could not be loaded. Please try again.");
        setLoading(false);
        return;
      }
      const next = { ...empty };
      for (const key of Object.keys(empty) as (keyof Fields)[]) {
        next[key] = (data[key] as string | null) ?? "";
      }
      setFields(next);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  function updateField(key: keyof Fields, value: string) {
    setFields((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    setError(null);
    if (!fields.name.trim()) {
      setError("Patient name is required.");
      return;
    }
    if (Object.values(fields).some((value) => value.length > 4000)) {
      setError("A field is too long (max 4000 characters).");
      return;
    }
    if (busy) return;
    setBusy(true);
    let watchdog: ReturnType<typeof setTimeout> | null = setTimeout(() => {
      setError("Save is taking longer than expected. Please try again.");
      setBusy(false);
    }, 25_000);
    try {
      const { error } = await supabase
        .from("cases")
        .update({ ...fields, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (watchdog) {
        clearTimeout(watchdog);
        watchdog = null;
      }
      if (error) {
        setError(error.message);
        setBusy(false);
        return;
      }
      navigate({ to: "/case/$id", params: { id }, replace: true });
    } catch (e) {
      if (watchdog) {
        clearTimeout(watchdog);
        watchdog = null;
      }
      setError(e instanceof Error ? e.message : "Save failed");
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <AppShell title="Edit Case" back hideNav>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell title="Edit Case" back hideNav>
        <div className="flex items-center justify-center py-20">
          <p className="text-xs text-destructive">{error}</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Edit Case" subtitle="Update case history" back hideNav>
      <div className="space-y-5">
        <Section title="Demographics">
          <Field label="Name" name="name" value={fields.name} onChange={updateField} required />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Age" name="age" value={fields.age} onChange={updateField} />
            <Select label="Gender" name="gender" value={fields.gender} onChange={updateField} options={["", "Male", "Female", "Other"]} />
          </div>
          <Area label="Chief Complaint" name="chief_complaint" value={fields.chief_complaint} onChange={updateField} />
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
        <button onClick={save} disabled={busy} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary font-semibold text-primary-foreground shadow-elev disabled:opacity-60">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {busy ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </AppShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-border bg-card p-4 shadow-card"><h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-primary">{title}</h3><div className="space-y-3">{children}</div></section>;
}

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
