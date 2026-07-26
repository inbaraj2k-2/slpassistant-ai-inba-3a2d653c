// Capacitor shim for summarizeVoice — proxies to the published AI endpoint
// via the same /_serverFn rewrite used by other shims. If the endpoint is
// not reachable, returns a minimal offline fallback so the Voice Analysis
// screen never crashes on the Android build.
import { supabase } from "@/integrations/supabase/client";

export async function summarizeVoice(input: { data: any }): Promise<{ summary: string; recommendations: string[] }> {
  try {
    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token;
    const res = await fetch(
      "https://slpassistant-ai-inba.lovable.app/_serverFn/summarizeVoice",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(input.data),
      },
    );
    if (res.ok) return (await res.json()) as any;
  } catch {
    /* fall through to offline fallback */
  }
  return {
    summary:
      "AI clinical narrative unavailable offline. Objective measurements above remain valid; please review numerically.",
    recommendations: [],
  };
}
