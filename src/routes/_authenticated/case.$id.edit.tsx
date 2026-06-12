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
  name: "", age: "", gender: "", chief_complaint: "",
  prenatal_history: "", natal_history: "", postnatal_history: "",
  motor_milestones: "", speech_milestones: "", language_history: "",
  hearing_history: "", education_history: "", family_history: "", additional_notes: "",
};

function EditCasePage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [f, setF] = useState<Fields>(empty);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("cases").select("*").eq("id", id).single();
      if (error || !data) {
        setError(error?.message ?? "Case not found");
      } else {
        const next = { ...empty };
        for (const k of Object.keys(empty) as (keyof Fields)[]) {
          next[k] = (data[k] as string | null) ?? "";
        }
        setF(next);
      }
      setLoading(false);
    })();
  }, [id]);

  function set<K extends keyof Fields>(k: K, v: string) {
    setF((p) => ({ ...p, [k]: v }));
  }

  async function save() {
    setError(null);
    if (!f.name.trim()) { setError("Patient name is required."); return; }
    setBusy(true);
    const { error } = await supabase.from("cases").update({ ...f, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) { setError(error.message); setBusy(false); return; }
    navigate({ to: "/case/$id", params: { id }, replace: true });
  }

  if (loading) {
    return (
      <AppShell title="Edit Case" back hideNav>
        <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Edit Case" subtitle="Update case history" back hideNav>
      <div className="space-y-5">
        <Section title="Demographics">
          <Field label="Name" value={f.name} onChange={(v) => set("name", v)} required />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Age" value={f.age} onChange={(v) => set("age", v)} />
            <Field label="Gender" value={f.gender} onChange={(v) => set("gender", v)} />
          </div>
          <Area label="Chief Complaint" value={f.chief_complaint} onChange={(v) => set("chief_complaint", v)} />
        </Section>

        <Section title="Birth History">
          <Area label="Prenatal History" value={f.prenatal_history} onChange={(v) => set("prenatal_history", v)} />
          <Area label="Natal History" value={f.natal_history} onChange={(v) => set("natal_history", v)} />
          <Area label="Postnatal History" value={f.postnatal_history} onChange={(v) => set("postnatal_history", v)} />
        </Section>

        <Section title="Developmental">
          <Area label="Motor Milestones" value={f.motor_milestones} onChange={(v) => set("motor_milestones", v)} />
          <Area label="Speech Milestones" value={f.speech_milestones} onChange={(v) => set("speech_milestones", v)} />
          <Area label="Language History" value={f.language_history} onChange={(v) => set("language_history", v)} />
        </Section>

        <Section title="Other History">
          <Area label="Hearing History" value={f.hearing_history} onChange={(v) => set("hearing_history", v)} />
          <Area label="Education History" value={f.education_history} onChange={(v) => set("education_history", v)} />
          <Area label="Family History" value={f.family_history} onChange={(v) => set("family_history", v)} />
          <Area label="Additional Notes" value={f.additional_notes} onChange={(v) => set("additional_notes", v)} />
        </Section>

        {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>}

        <button
          onClick={save}
          disabled={busy}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary font-semibold text-primary-foreground shadow-elev disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {busy ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </AppShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-primary">{title}</h3>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Field({ label, value, onChange, ...props }: { label: string; value: string; onChange: (v: string) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-foreground/80">{label}</span>
      <input {...props} value={value} maxLength={props.maxLength ?? 500} onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/30" />
    </label>
  );
}

function Area({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-foreground/80">{label}</span>
      <textarea rows={3} maxLength={4000} value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/30" />
    </label>
  );
}
