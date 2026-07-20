import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { SmartKeyboard } from "@/features/aac/ui/SmartKeyboard";

export const Route = createFileRoute("/_authenticated/clinical-tools/aac")({
  head: () => ({
    meta: [
      { title: "Smart AAC Keyboard — SLP Assist AI" },
      {
        name: "description",
        content:
          "AI-powered AAC keyboard with instant semantic search, licensed image library, AI symbol generation, sentence builder, and offline support.",
      },
    ],
  }),
  component: AacPage,
});

function AacPage() {
  return (
    <AppShell title="AAC Keyboard" subtitle="Type, tap, speak" back>
      <SmartKeyboard />
    </AppShell>
  );
}
