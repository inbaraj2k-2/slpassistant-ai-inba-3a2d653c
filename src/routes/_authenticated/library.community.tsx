import { createFileRoute } from "@tanstack/react-router";
import { Users } from "lucide-react";
import { LibraryPlaceholder } from "@/components/LibraryPlaceholder";

export const Route = createFileRoute("/_authenticated/library/community")({
  head: () => ({ meta: [{ title: "Community Library" }] }),
  component: () => (
    <LibraryPlaceholder
      title="Community Library"
      subtitle="Shared resources from users"
      icon={<Users className="h-6 w-6" />}
    />
  ),
});
