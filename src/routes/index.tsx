import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    // getSession() reads from local storage instantly; getUser() does a
    // network round-trip that stalls app cold-start on flaky mobile networks
    // and can leave the launch splash stuck.
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user ?? null;
    if (user) {
      const { ensureUserProfile } = await import("@/lib/profile");
      // Do not await — profile insert is best-effort and must not block nav.
      void ensureUserProfile(user).catch(() => {});
    }
    throw redirect({ to: user ? "/home" : "/auth" });
  },
  component: () => null,
});
