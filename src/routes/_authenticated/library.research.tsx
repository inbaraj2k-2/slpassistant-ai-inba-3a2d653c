import { createFileRoute } from "@tanstack/react-router";
import { FileText } from "lucide-react";
import { LibraryPlaceholder } from "@/components/LibraryPlaceholder";

export const Route = createFileRoute("/_authenticated/library/research")({
  head: () => ({ meta: [{ title: "Research & PDFs — Library" }] }),
  component: () => (
    <LibraryPlaceholder
      title="Research & PDFs"
      subtitle="Articles, guidelines and manuals"
      icon={<FileText className="h-6 w-6" />}
    />
  ),
});
