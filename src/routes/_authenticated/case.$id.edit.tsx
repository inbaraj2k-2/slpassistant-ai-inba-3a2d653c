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

type FieldRefs = { [K in keyof Fields]: React.RefObject<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null> };
function makeRefs(): FieldRefs {
  return {
    name: { current: null }, age: { current: null }, gender: { current: null }, chief_complaint: { current: null },
    prenatal_history: { current: null }, natal_history: { current: null }, postnatal_history: { current: null },
    motor_milestones: { current: null }, speech_milestones: { current: null }, language_history: { current: null },
    hearing_history: { current: null }, education_history: { current: null }, family_history: { current: null }, additional_notes: { current: null },
  };
}

function EditCasePage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const refs = useRef<FieldRefs>(makeRefs()).current;
  const [initial, setInitial] = useState<Fields | null>(null);
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
        setInitial(next);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [id]);

  function readFields(): Fields {
    const result = { ...empty };
    for (const key of Object.keys(empty) as (keyof Fields)[]) result[key] = refs[key].current?.value ?? "";
    return result;
  }

  async function save() {
    setError(null);
    const f = readFields();
    if (!f.name.trim()) { setError("Patient name is required."); return; }
    if (Object.values(f).some((v) => v.length > 4000)) { setError("A field is too long (max 4000 characters)."); return; }
    if (busy) return;
    setBusy(true);
    let watchdog: ReturnType<typeof setTimeout> | null = setTimeout(() => {
      setError("Save is taking longer than expected. Please try again.");
      setBusy(false);
    }, 25_000);
    try {
      const { error } = await supabase.from("cases").update({ ...f, updated_at: new Date().toISOString() }).eq("id", id);
      if (watchdog) { clearTimeout(watchdog); watchdog = null; }
      if (error) { setError(error.message); setBusy(false); return; }
      navigate({ to: "/case/$id", params: { id }, replace: true });
    } catch (e) {
      if (watchdog) { clearTimeout(watchdog); watchdog = null; }
      setError(e instanceof Error ? e.message : "Save failed");
      setBusy(false);
    }
  }

  if (loading || !initial) {
    return <AppShell title="Edit Case" back hideNav><div className="flex items-center justify-center py-20">{error ? <p className="text-xs text-destructive">{error}</p> : <Loader2 className="h-6 w-6 animate-spin text-primary" />}</div></AppShell>;
  }

  return (
    <AppShell title="Edit Case" subtitle="Update case history" back hideNav>
      <div className="space-y-5">
        <Section title="Demographics">
          <Field label="Name" inputRef={refs.name} defaultValue={initial.name} required />
          <div className="grid grid-cols-2 gap-3"><Field label="Age" inputRef={refs.age} defaultValue={initial.age} /><Field label="Gender" inputRef={refs.gender} defaultValue={initial.gender} /></div>
          <Area label="Chief Complaint" inputRef={refs.chief_complaint} defaultValue={initial.chief_complaint} />
        </Section>
        <Section title="Birth History">
          <Area label="Prenatal History" inputRef={refs.prenatal_history} defaultValue={initial.prenatal_history} />
          <Area label="Natal History" inputRef={refs.natal_history} defaultValue={initial.natal_history} />
          <Area label="Postnatal History" inputRef={refs.postnatal_history} defaultValue={initial.postnatal_history} />
        </Section>
        <Section title="Developmental">
          <Area label="Motor Milestones" inputRef={refs.motor_milestones} defaultValue={initial.motor_milestones} />
          <Area label="Speech Milestones" inputRef={refs.speech_milestones} defaultValue={initial.speech_milestones} />
          <Area label="Language History" inputRef={refs.language_history} defaultValue={initial.language_history} />
        </Section>
        <Section title="Other History">
          <Area label="Hearing History" inputRef={refs.hearing_history} defaultValue={initial.hearing_history} />
          <Area label="Education History" inputRef={refs.education_history} defaultValue={initial.education_history} />
          <Area label="Family History" inputRef={refs.family_history} defaultValue={initial.family_history} />
          <Area label="Additional Notes" inputRef={refs.additional_notes} defaultValue={initial.additional_notes} />
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
function Field({ label, inputRef, ...props }: { label: string; inputRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null> } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) { return <label className="block"><span className="mb-1 block text-xs font-medium text-foreground/80">{label}</span><input type="text" inputMode="text" {...props} ref={inputRef as React.RefObject<HTMLInputElement>} maxLength={props.maxLength ?? 500} autoComplete="off" className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30" /></label>; }
function Area({ label, inputRef, defaultValue }: { label: string; inputRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null>; defaultValue?: string }) { return <label className="block"><span className="mb-1 block text-xs font-medium text-foreground/80">{label}</span><textarea ref={inputRef as React.RefObject<HTMLTextAreaElement>} rows={3} maxLength={4000} defaultValue={defaultValue} className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/30" /></label>; }
