import { createFileRoute } from "@tanstack/react-router";
import { UploadCloud } from "lucide-react";
import { LibraryPlaceholder } from "@/components/LibraryPlaceholder";

export const Route = createFileRoute("/_authenticated/library/uploads")({
  head: () => ({ meta: [{ title: "My Uploads — Library" }] }),
  component: () => (
    <LibraryPlaceholder
      title="My Uploads"
      subtitle="Manage your uploaded content"
      icon={<UploadCloud className="h-6 w-6" />}
    />
  ),
});
