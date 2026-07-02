import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Gamepad2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/games")({
  head: () => ({ meta: [{ title: "Games — SLP Assist AI" }] }),
  component: GamesPage,
});

function GamesPage() {
  return (
    <AppShell title="Games" subtitle="Therapeutic & fun activities" back>
      <div className="grid place-items-center rounded-2xl border border-dashed border-border bg-card p-10 text-center shadow-card">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary-soft text-primary">
          <Gamepad2 className="h-6 w-6" />
        </div>
        <p className="mt-4 text-sm font-semibold">Games are coming soon</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Therapeutic and fun activities will appear here.
        </p>
      </div>
    </AppShell>
  );
}
