import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Stethoscope } from "lucide-react";

export const Route = createFileRoute("/_authenticated/legal/disclaimer")({
  head: () => ({ meta: [{ title: "Professional Disclaimer — SLP Assist AI" }] }),
  component: DisclaimerPage,
});

function DisclaimerPage() {
  return (
    <AppShell title="Professional Disclaimer" back>
      <article className="space-y-4 rounded-2xl border border-border bg-card p-5 text-sm leading-relaxed shadow-card">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary">
            <Stethoscope className="h-5 w-5" />
          </span>
          <h2 className="text-base font-semibold">For Educational & Clinical Support Only</h2>
        </div>

        <p>
          This application is intended for educational and clinical decision
          support purposes only.
        </p>

        <p>
          SLP Assist AI does not replace assessment, diagnosis, or treatment by
          a qualified Speech-Language Pathologist or Audiologist.
        </p>

        <p>
          For clinical services in India, users should consult an{" "}
          <span className="font-semibold text-foreground">RCI-registered professional</span>.
        </p>
      </article>
    </AppShell>
  );
}
