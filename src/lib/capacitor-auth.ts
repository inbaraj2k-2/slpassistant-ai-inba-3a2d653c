// Capacitor-only Google OAuth flow using Lovable's managed OAuth broker.
//
// Flow:
//   1. Build a broker URL against the published origin:
//        https://<published>/~oauth/initiate?provider=google
//          &redirect_uri=https://<published>/auth?mobile_callback=1&state=...
//   2. Open it in a Chrome Custom Tab via @capacitor/browser.
//   3. Lovable's broker handles Google OAuth (Managed Cloud Auth — no need
//      to configure Supabase's native Google provider) and redirects the
//      Custom Tab back to /auth?mobile_callback=1#access_token=...&refresh_token=...
//   4. That /auth page deep-links the tokens back into the app using
//      app.lovable.slpassistant://auth-callback#<hash>.
//   5. The app's appUrlOpen listener (main-capacitor.tsx) parses the tokens
//      and calls supabase.auth.setSession().

import { supabase } from "@/integrations/supabase/client";

const REMOTE_ORIGIN = "https://slpassistant-ai-inba.lovable.app";
const OAUTH_BROKER_URL = `${REMOTE_ORIGIN}/~oauth/initiate`;

export const CAPACITOR_DEEP_LINK_SCHEME = "app.lovable.slpassistant";
export const CAPACITOR_DEEP_LINK_HOST = "auth-callback";
export const CAPACITOR_DEEP_LINK_URL = `${CAPACITOR_DEEP_LINK_SCHEME}://${CAPACITOR_DEEP_LINK_HOST}`;

export function isCapacitorRuntime(): boolean {
  if (typeof window === "undefined") return false;
  const anyWin = window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } };
  return Boolean(anyWin.Capacitor?.isNativePlatform?.());
}

function generateState(): string {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    return [...crypto.getRandomValues(new Uint8Array(16))]
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export async function signInWithGoogleOnCapacitor(): Promise<void> {
  const redirectUri = `${REMOTE_ORIGIN}/auth?mobile_callback=1`;
  const params = new URLSearchParams({
    provider: "google",
    redirect_uri: redirectUri,
    state: generateState(),
    prompt: "select_account",
  });
  const url = `${OAUTH_BROKER_URL}?${params.toString()}`;

  const { Browser } = await import("@capacitor/browser");
  await Browser.open({ url, presentationStyle: "fullscreen" });
}

// Called from the appUrlOpen listener when the OS hands us back the deep link
// (app.lovable.slpassistant://auth-callback#access_token=...&refresh_token=...).
export async function completeCapacitorOAuthFromUrl(url: string): Promise<boolean> {
  const hashIdx = url.indexOf("#");
  if (hashIdx < 0) return false;
  const hash = url.slice(hashIdx + 1);
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
