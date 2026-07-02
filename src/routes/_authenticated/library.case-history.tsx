import { createFileRoute } from "@tanstack/react-router";
import { ClipboardList } from "lucide-react";
import { LibraryPlaceholder } from "@/components/LibraryPlaceholder";

export const Route = createFileRoute("/_authenticated/library/case-history")({
  head: () => ({ meta: [{ title: "Case History Forms — Library" }] }),
  component: () => (
    <LibraryPlaceholder
      title="Case History Forms"
      subtitle="Clinical templates and intake forms"
      icon={<ClipboardList className="h-6 w-6" />}
    />
  ),
});
