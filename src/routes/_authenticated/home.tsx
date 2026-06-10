import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Disclaimer } from "@/components/Disclaimer";
import { BookOpen, FolderClock, PlusCircle, Settings, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({
    meta: [{ title: "SLP Assist AI — Home" }],
  }),
  component: HomePage,
});

function HomePage() {
  const { data: stats } = useQuery({
    queryKey: ["case-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("cases")
        .select("id", { count: "exact", head: true });
      return { count: count ?? 0 };
    },
  });

  return (
    <AppShell title="SLP Assist AI" subtitle="Clinical decision support">
      <section className="mb-5 overflow-hidden rounded-2xl bg-gradient-primary p-5 text-primary-foreground shadow-elev">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-0.5 h-5 w-5" />
          <div>
            <h2 className="text-lg font-semibold leading-tight">
              Analyze a case in seconds
            </h2>
            <p className="mt-1 text-sm text-primary-foreground/85">
              Enter a structured case history and get ranked clinical suggestions,
              assessments, and therapy goals.
            </p>
          </div>
        </div>
        <Link
          to="/new-case"
          className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-card px-4 text-sm font-semibold text-primary shadow-card"
        >
          <PlusCircle className="h-4 w-4" />
          New case
        </Link>
      </section>

      <div className="mb-5 grid grid-cols-2 gap-3">
        <TileLink
          to="/new-case"
          icon={<PlusCircle className="h-5 w-5" />}
          label="New Case"
          desc="Start a history"
          highlight
        />
        <TileLink
          to="/cases"
          icon={<FolderClock className="h-5 w-5" />}
          label="Previous Cases"
          desc={`${stats?.count ?? 0} saved`}
        />
        <TileLink
          to="/knowledge"
          icon={<BookOpen className="h-5 w-5" />}
          label="Knowledge Base"
          desc="Disorders &amp; tools"
        />
        <TileLink
          to="/settings"
          icon={<Settings className="h-5 w-5" />}
          label="Settings"
          desc="Account &amp; info"
        />
      </div>

      <Disclaimer />
    </AppShell>
  );
}

function TileLink({
  to,
  icon,
  label,
  desc,
  highlight,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  desc: string;
  highlight?: boolean;
}) {
  return (
    <Link
      to={to}
      className={`group flex flex-col gap-3 rounded-2xl border p-4 shadow-card transition active:scale-[0.98] ${
        highlight
          ? "border-primary/30 bg-primary-soft"
          : "border-border bg-card"
      }`}
    >
      <span
        className={`grid h-10 w-10 place-items-center rounded-xl ${
          highlight ? "bg-gradient-primary text-primary-foreground" : "bg-secondary text-primary"
        }`}
      >
        {icon}
      </span>
      <div>
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
    </Link>
  );
}
