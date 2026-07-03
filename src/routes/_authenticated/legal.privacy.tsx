import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/legal/privacy")({
  head: () => ({ meta: [{ title: "Privacy Policy — SLP Assist AI" }] }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <AppShell title="Privacy Policy" back>
      <article className="space-y-4 rounded-2xl border border-border bg-card p-5 text-sm leading-relaxed shadow-card">
        <p className="text-muted-foreground">
          Last updated: July 2026
        </p>

        <Section title="Information We Collect">
          <ul className="ml-4 list-disc space-y-1">
            <li>Google account information (name, email, profile picture) used for sign-in.</li>
            <li>Saved cases and AI-generated reports you create in the app.</li>
            <li>Files you upload to your personal library.</li>
          </ul>
        </Section>

        <Section title="How Your Data Is Stored">
          <p>
            All data is securely stored in our managed backend (Supabase). Access is
            restricted to your account through row-level security. Uploaded files are
            kept in a private storage bucket scoped to your user ID.
          </p>
        </Section>

        <Section title="Account Deletion">
          <p>
            You can request permanent account deletion at any time from the
            Account Deletion page in Settings. This removes your profile, saved
            cases, reports, and uploaded files.
          </p>
        </Section>

        <Section title="No Sale of Personal Information">
          <p>
            SLP Assist AI does not sell, rent, or trade your personal information
            to third parties.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            Questions about privacy? Email us at{" "}
            <a className="text-primary underline" href="mailto:slpassistai@gmail.com">
              slpassistai@gmail.com
            </a>
            .
          </p>
        </Section>
      </article>
    </AppShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold text-primary">{title}</h2>
      <div className="text-foreground/85">{children}</div>
    </section>
  );
}
