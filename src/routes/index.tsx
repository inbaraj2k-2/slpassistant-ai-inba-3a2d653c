import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    const { ensureUserProfile } = await import("@/lib/profile");
    const { data } = await supabase.auth.getUser();
    if (data.user) await ensureUserProfile(data.user);
    throw redirect({ to: data.user ? "/home" : "/auth" });
  },
  component: () => null,
});
