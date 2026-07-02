import { createFileRoute } from "@tanstack/react-router";
import { Download } from "lucide-react";
import { LibraryPlaceholder } from "@/components/LibraryPlaceholder";

export const Route = createFileRoute("/_authenticated/library/downloads")({
  head: () => ({ meta: [{ title: "Downloads — Library" }] }),
  component: () => (
    <LibraryPlaceholder
      title="Downloads"
      subtitle="Your saved offline files"
      icon={<Download className="h-6 w-6" />}
    />
  ),
});
