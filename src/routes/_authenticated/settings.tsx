import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Disclaimer } from "@/components/Disclaimer";
import { UserAvatar } from "@/components/UserAvatar";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getAppVersion } from "@/lib/native";
import { useProfile } from "@/hooks/useProfile";
import {
  ChevronRight,
  Info,
  LogOut,
  Mail,
  ScrollText,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  Trash2,
  UserCircle2,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — SLP Assist AI" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: profile } = useProfile();
  const { data: version } = useQuery({
    queryKey: ["app-version"],
    queryFn: () => getAppVersion(),
    staleTime: Infinity,
  });

  const versionLabel = version
    ? version.versionCode
      ? `${version.versionName} (${version.versionCode})`
      : version.versionName
    : "…";

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <AppShell title="Settings">
      <Link
        to="/profile"
        className="mb-4 flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-card transition active:scale-[0.99]"
      >
        <UserAvatar
          src={profile?.avatarUrl}
          name={profile?.displayName}
          email={profile?.email}
          className="h-12 w-12"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{profile?.displayName ?? "Clinician"}</p>
          <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
            <Mail className="h-3 w-3" />
            {profile?.email ?? "Signed in"}
          </p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </Link>

      <Section title="Account">
        <LinkRow to="/profile" icon={<UserCircle2 className="h-4 w-4" />} label="Edit profile" />
      </Section>

      <Section title="About">
        <Row icon={<Info className="h-4 w-4" />} label="App version" value={versionLabel} />
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

      <Section title="Legal & Information">
        <LinkRow
          to="/legal/privacy"
          icon={<ShieldCheck className="h-4 w-4" />}
          label="Privacy Policy"
        />
        <LinkRow
          to="/legal/terms"
          icon={<ScrollText className="h-4 w-4" />}
          label="Terms & Conditions"
        />
        <LinkRow
          to="/legal/disclaimer"
          icon={<Stethoscope className="h-4 w-4" />}
          label="Professional Disclaimer"
        />
        <LinkRow
          to="/legal/account-deletion"
          icon={<Trash2 className="h-4 w-4 text-destructive" />}
          label="Account Deletion"
          destructive
        />
      </Section>

      <Section title="About SLP Assist AI">
        <p className="text-sm leading-relaxed text-foreground/85">
          AI-powered clinical decision support for Speech-Language Pathologists,
          Audiologists, BASLP students, and interns. Includes AI case analysis,
          differential diagnosis, therapy goals, assessment recommendations,
          clinical references, PDF reports, saved cases, knowledge base, and
          offline therapeutic games.
        </p>
        <p className="mt-2 flex items-start gap-2 text-xs text-muted-foreground">
          <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          This application does not replace professional clinical judgement or diagnosis.
        </p>
        <a
          href="mailto:slpassistai@gmail.com"
          className="mt-3 flex items-center gap-2 text-xs font-medium text-primary"
        >
          <Mail className="h-3.5 w-3.5" />
          slpassistai@gmail.com
        </a>
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

function LinkRow({
  to,
  icon,
  label,
  destructive,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  destructive?: boolean;
}) {
  return (
    <Link
      to={to}
      className="flex items-center justify-between border-b border-border/60 py-2.5 text-sm last:border-0"
    >
      <span className={`flex items-center gap-2 ${destructive ? "text-destructive" : "text-foreground"}`}>
        {icon}
        {label}
      </span>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </Link>
  );
}
