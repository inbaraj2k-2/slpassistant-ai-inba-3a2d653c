import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { MessageSquare, Mic } from "lucide-react";

export const Route = createFileRoute("/_authenticated/clinical-tools/")({
  head: () => ({
    meta: [
      { title: "Clinical Tools — SLP Assist AI" },
      { name: "description", content: "AAC communicator and voice analysis tools for speech-language clinicians." },
    ],
  }),
  component: ClinicalToolsPage,
});

function ClinicalToolsPage() {
  return (
    <AppShell title="Clinical Tools" subtitle="AAC & voice analysis" back>
      <div className="grid grid-cols-1 gap-3">
        <ToolCard
          to="/clinical-tools/aac"
          icon={<MessageSquare className="h-5 w-5" />}
          title="AAC Communicator"
          desc="Multi-page symbol board with core words, categories, and sentence strip. Offline speech."
        />
        <ToolCard
          to="/clinical-tools/voice-analysis"
          icon={<Mic className="h-5 w-5" />}
          title="Voice Assessment"
          desc="Clinical acoustic analysis: F0, jitter, shimmer, HNR, CPP, MPT, spectrogram + AI report."
        />
      </div>
    </AppShell>
  );
}

function ToolCard({
  to,
  icon,
  title,
  desc,
}: {
  to: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-card transition active:scale-[0.99]"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-primary text-primary-foreground">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
      </div>
    </Link>
  );
}
