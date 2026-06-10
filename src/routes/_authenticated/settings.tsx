import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Disclaimer } from "@/components/Disclaimer";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Info, LogOut, Mail, ShieldCheck, Stethoscope } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — SLP Assist AI" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: user } = useQuery({
    queryKey: ["me"],
    queryFn: async () => (await supabase.auth.getUser()).data.user,
  });

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <AppShell title="Settings">
      <section className="mb-4 rounded-2xl border border-border bg-card p-4 shadow-card">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-primary text-primary-foreground">
            <Stethoscope className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">
              {(user?.user_metadata?.full_name as string) || "Clinician"}
            </p>
            <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
              <Mail className="h-3 w-3" />
              {user?.email}
            </p>
          </div>
        </div>
      </section>

      <Section title="About">
        <Row icon={<Info className="h-4 w-4" />} label="App version" value="1.0.0" />
        <Row icon={<ShieldCheck className="h-4 w-4" />} label="Data" value="Stored privately per account" />
      </Section>

      <Section title="Supported disorders">
        <ul className="space-y-1 text-sm text-muted-foreground">
          {[
            "Autism Spectrum Disorder",
            "Developmental Language Disorder",
            "Articulation Disorder",
            "Phonological Disorder",
            "Childhood Apraxia of Speech",
            "Dysarthria",
            "Stuttering",
            "Voice Disorders",
            "Hearing Loss Related Speech Disorders",
            "Aphasia",
            "Selective Mutism",
            "Cleft Palate Speech Disorder",
            "Resonance Disorders",
          ].map((d) => (
            <li key={d} className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              {d}
            </li>
          ))}
        </ul>
      </Section>

      <Disclaimer />

      <button
        onClick={signOut}
        className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 text-sm font-semibold text-destructive"
      >
        <LogOut className="h-4 w-4" />
        Sign out
      </button>
    </AppShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-4 rounded-2xl border border-border bg-card p-4 shadow-card">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-primary">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border/60 py-2 text-sm last:border-0">
      <span className="flex items-center gap-2 text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}
