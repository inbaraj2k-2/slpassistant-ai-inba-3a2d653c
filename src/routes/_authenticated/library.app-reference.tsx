import { createFileRoute, Link } from "@tanstack/react-router";
import { Brain, ArrowRight } from "lucide-react";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/library/app-reference")({
  head: () => ({ meta: [{ title: "App Reference — Library" }] }),
  component: AppReferencePage,
});

function AppReferencePage() {
  return (
    <AppShell title="App Reference" subtitle="Disorders, symptoms and assessments" back>
      <Link
        to="/knowledge"
        className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 shadow-card transition active:scale-[0.98]"
      >
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary">
            <Brain className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-semibold">Knowledge Base</p>
            <p className="text-xs text-muted-foreground">
              Browse disorders and clinical tools
            </p>
          </div>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
      </Link>
    </AppShell>
  );
}
