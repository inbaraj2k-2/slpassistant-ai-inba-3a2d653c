import { createFileRoute } from "@tanstack/react-router";
import { BookOpenText } from "lucide-react";
import { LibraryPlaceholder } from "@/components/LibraryPlaceholder";

export const Route = createFileRoute("/_authenticated/library/books")({
  head: () => ({ meta: [{ title: "Clinical Books — Library" }] }),
  component: () => (
    <LibraryPlaceholder
      title="Clinical Books"
      subtitle="Medical and educational books"
      icon={<BookOpenText className="h-6 w-6" />}
    />
  ),
});
