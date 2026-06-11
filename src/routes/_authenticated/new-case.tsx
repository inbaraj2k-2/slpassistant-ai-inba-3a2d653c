import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Disclaimer } from "@/components/Disclaimer";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Sparkles } from "lucide-react";

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
  const [f, setF] = useState<Fields>(empty);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof Fields>(k: K, v: string) {
    setF((p) => ({ ...p, [k]: v }));
  }

  async function analyze() {
    setError(null);
    if (!f.name.trim()) {
      setError("Patient name is required.");
      return;
    }
    const tooLong = Object.entries(f).find(([, v]) => (v ?? "").length > 4000);
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
        .insert({ ...f, user_id: u.user.id })
        .select("id")
        .single();
      if (error || !data) throw error ?? new Error("Failed to save case");
      navigate({
        to: "/case/$id",
        params: { id: data.id },
        search: { run: 1 },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save case");
      setBusy(false);
    }
  }

  return (
    <AppShell title="New Case" subtitle="Collect case history" back hideNav>
      <Disclaimer compact />

      <div className="mt-4 space-y-5">
        <Section title="Demographics">
          <Row>
            <Field label="Name" value={f.name} onChange={(v) => set("name", v)} required />
          </Row>
          <Row two>
            <Field label="Age" value={f.age} onChange={(v) => set("age", v)} placeholder="e.g. 4y 6m" />
            <Select
              label="Gender"
              value={f.gender}
              onChange={(v) => set("gender", v)}
              options={["", "Male", "Female", "Other"]}
            />
          </Row>
          <Area
            label="Chief Complaint"
            value={f.chief_complaint}
            onChange={(v) => set("chief_complaint", v)}
            placeholder="Parent / patient's primary concern"
          />
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

        {error && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>
        )}

        <button
          onClick={analyze}
          disabled={busy}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary font-semibold text-primary-foreground shadow-elev transition hover:opacity-95 disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {busy ? "Saving…" : "Analyze Case"}
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

function Row({ children, two }: { children: React.ReactNode; two?: boolean }) {
  return <div className={two ? "grid grid-cols-2 gap-3" : ""}>{children}</div>;
}

function Field({
  label,
  value,
  onChange,
  ...props
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-foreground/80">{label}</span>
      <input
        {...props}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
      />
    </label>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-foreground/80">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o || "Select…"}
          </option>
        ))}
      </select>
    </label>
  );
}

function Area({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-foreground/80">{label}</span>
      <textarea
        rows={3}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground/50 focus:border-primary focus:ring-2 focus:ring-ring/30"
      />
    </label>
  );
}
