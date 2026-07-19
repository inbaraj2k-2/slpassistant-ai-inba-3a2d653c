// Capacitor-only Google OAuth flow.
//
// Rationale: the default Lovable web-message popup flow does not complete
// inside an Android WebView (popups return to https://localhost, which does
// not exist -> "404 Page not found"). Instead, on Capacitor we:
//   1. Ask Supabase for a Google OAuth URL using the *implicit* flow
//      (tokens returned in the URL hash — no code_verifier to share across
//      processes).
//   2. Open that URL in a Chrome Custom Tab via @capacitor/browser.
//   3. Supabase redirects back to the published web /auth page with the
//      tokens in the hash and ?mobile_callback=1.
//   4. That page immediately deep-links back to the app using our custom
//      scheme (app.lovable.slpassistant://auth-callback#<hash>).
//   5. The app's appUrlOpen listener (main-capacitor.tsx) parses the tokens
//      and calls supabase.auth.setSession().
//
// The published /auth page is on the app's Site URL, so it is already an
// allowed Supabase redirect target — no Supabase dashboard changes needed.

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env
  .VITE_SUPABASE_PUBLISHABLE_KEY as string;

const REMOTE_ORIGIN = "https://slpassistant-ai-inba.lovable.app";
export const CAPACITOR_DEEP_LINK_SCHEME = "app.lovable.slpassistant";
export const CAPACITOR_DEEP_LINK_HOST = "auth-callback";
export const CAPACITOR_DEEP_LINK_URL = `${CAPACITOR_DEEP_LINK_SCHEME}://${CAPACITOR_DEEP_LINK_HOST}`;

// Dedicated supabase client that uses the implicit OAuth flow (hash tokens),
// so the app process can consume tokens produced by the Chrome Custom Tab.
const oauthClient = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
    flowType: "implicit",
  },
});

export function isCapacitorRuntime(): boolean {
  if (typeof window === "undefined") return false;
  const anyWin = window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } };
  return Boolean(anyWin.Capacitor?.isNativePlatform?.());
}

export async function signInWithGoogleOnCapacitor(): Promise<void> {
  const redirectTo = `${REMOTE_ORIGIN}/auth?mobile_callback=1`;

  const { data, error } = await oauthClient.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      queryParams: { prompt: "select_account" },
    },
  });
  if (error) throw error;
  if (!data?.url) throw new Error("Google sign-in URL was not returned");

  const { Browser } = await import("@capacitor/browser");
  await Browser.open({ url: data.url, presentationStyle: "fullscreen" });
}

// Called from the appUrlOpen listener when the OS hands us back the deep link
// (app.lovable.slpassistant://auth-callback#access_token=...&refresh_token=...).
export async function completeCapacitorOAuthFromUrl(url: string): Promise<boolean> {
  let hash = "";
  const hashIdx = url.indexOf("#");
  if (hashIdx >= 0) hash = url.slice(hashIdx + 1);

  if (!hash) return false;

  const params = new URLSearchParams(hash);
  const access_token = params.get("access_token");
  const refresh_token = params.get("refresh_token");
  if (!access_token || !refresh_token) return false;

  const { error } = await supabase.auth.setSession({ access_token, refresh_token });
  if (error) throw error;

  try {
    const { Browser } = await import("@capacitor/browser");
    await Browser.close();
  } catch {
    // Custom Tab may already be closed — ignore.
  }
  return true;
}
