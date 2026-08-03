import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Disclaimer } from "@/components/Disclaimer";
import { BrandMark } from "@/components/BrandMark";
import { ensureUserProfile } from "@/lib/profile";
import {
  CAPACITOR_DEEP_LINK_URL,
  isCapacitorRuntime,
  signInWithGoogleOnCapacitor,
} from "@/lib/capacitor-auth";
import { Loader2, UserRound } from "lucide-react";

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>): { next?: string } =>
    typeof s.next === "string" && s.next.startsWith("/") && !s.next.startsWith("//")
      ? { next: s.next }
      : {},

  head: () => ({
    meta: [
      { title: "SLP Assist AI — Sign in" },
      { name: "description", content: "Sign in to SLP Assist AI clinical decision support." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { next } = Route.useSearch();
  const goAfterAuth = () => {
    if (next) {
      window.location.href = next;
      return;
    }
    navigate({ to: "/home", replace: true });
  };

  const [busy, setBusy] = useState<null | "google" | "guest">(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // When Google/Supabase redirects the Chrome Custom Tab back to
    // https://<published>/auth?mobile_callback=1#access_token=...,
    // immediately deep-link the tokens back into the installed Android app.
    if (typeof window !== "undefined") {
      const search = new URLSearchParams(window.location.search);
      if (search.get("mobile_callback") === "1" && window.location.hash) {
        window.location.href = `${CAPACITOR_DEEP_LINK_URL}${window.location.hash}`;
        return;
      }
    }

    supabase.auth.getSession().then(async ({ data }) => {
      const user = data.session?.user;
      if (user) {
        try {
          await ensureUserProfile(user);
        } catch (e) {
          console.error("[auth] ensureUserProfile failed", e);
          setError("Signed in, but your profile could not be saved. Please try again.");
          return;
        }
        goAfterAuth();
      }
    });
  }, [navigate]);

  async function signInWithGoogle() {
    setError(null);
    setBusy("google");
    try {
      // Inside the installed Android app, popups don't work — use a
      // Chrome Custom Tab + deep-link callback instead.
      if (isCapacitorRuntime()) {
        await signInWithGoogleOnCapacitor();
        // The rest of the flow is handled by the appUrlOpen listener in
        // src/main-capacitor.tsx once Google redirects back to the app.
        return;
      }

      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: next ? window.location.href : window.location.origin,
        extraParams: { prompt: "select_account" },
      });
      if (result.error) {
        setError(getGoogleAuthError(result.error));
        setBusy(null);
        return;
      }
      if (result.redirected) return;
      const { data, error: userError } = await supabase.auth.getUser();
      if (userError || !data.user) throw userError ?? new Error("Google session was not created");
      await ensureUserProfile(data.user);
      goAfterAuth();
    } catch (e) {
      setError(getGoogleAuthError(e));
      setBusy(null);
    }
  }

  async function continueAsGuest() {
    setError(null);
    setBusy("guest");
    try {
      const { error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
      goAfterAuth();
    } catch (e) {
      console.error(e);
      setError("Could not start guest session. Please try again.");
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-gradient-soft px-5 pb-10 pt-14">
      <div className="mb-8 flex flex-col items-center text-center">
        <div className="mb-4 grid h-16 w-16 place-items-center overflow-hidden rounded-2xl bg-gradient-primary text-primary-foreground shadow-elev">
          <BrandMark />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">SLP Assist AI</h1>
        <p className="mt-1 text-sm text-muted-foreground text-balance">
          Clinical decision support for speech, language &amp; hearing professionals
        </p>
      </div>

      <div className="rounded-2xl bg-card p-6 shadow-card">
        <h2 className="mb-1 text-lg font-semibold">Welcome</h2>
        <p className="mb-5 text-sm text-muted-foreground">
          Choose how you'd like to continue.
        </p>

        <button
          type="button"
          onClick={signInWithGoogle}
          disabled={busy !== null}
          className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-input bg-background font-semibold text-foreground shadow-card transition hover:bg-accent disabled:opacity-60"
        >
          {busy === "google" ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <GoogleIcon />
          )}
          <span>Continue with Google</span>
        </button>

        <div className="my-4 flex items-center gap-3 text-[10px] uppercase tracking-wider text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          or
          <span className="h-px flex-1 bg-border" />
        </div>

        <button
          type="button"
          onClick={continueAsGuest}
          disabled={busy !== null}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary font-semibold text-primary-foreground shadow-elev transition hover:opacity-95 disabled:opacity-60"
        >
          {busy === "guest" ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <UserRound className="h-5 w-5" />
          )}
          <span>Continue as Guest</span>
        </button>

        <p className="mt-3 text-center text-[11px] text-muted-foreground">
          Guest cases stay on this device only. Sign in with Google to sync across devices.
        </p>

        {error && (
          <p className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </p>
        )}
      </div>

      <div className="mt-6">
        <Disclaimer />
      </div>
    </div>
  );
}

function getGoogleAuthError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();

  if (lower.includes("popup was blocked")) {
    return "Google sign-in popup was blocked. Allow popups for this site and try again.";
  }
  if (lower.includes("cancelled")) {
    return "Google sign-in was cancelled before the account was selected.";
  }
  if (lower.includes("preview mode") || lower.includes("new tab")) {
    return "Google sign-in cannot complete inside this preview frame. Open the app in a new tab or use the published URL.";
  }
  if (lower.includes("provider") || lower.includes("oauth") || lower.includes("client") || lower.includes("redirect")) {
    return `Google sign-in configuration error: ${message}`;
  }
  if (lower.includes("session") || lower.includes("token")) {
    return `Google signed in, but the session could not be saved: ${message}`;
  }
  return `Google sign-in failed: ${message}`;
}

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.24 1.4-1.66 4.1-5.5 4.1-3.3 0-6-2.74-6-6.1s2.7-6.1 6-6.1c1.88 0 3.14.8 3.86 1.49l2.64-2.55C16.83 3.43 14.66 2.5 12 2.5 6.76 2.5 2.5 6.76 2.5 12S6.76 21.5 12 21.5c6.92 0 9.5-4.86 9.5-9.36 0-.63-.07-1.11-.16-1.94H12z"
      />
      <path
        fill="#4285F4"
        d="M21.34 10.2H12v3.9h5.5c-.26 1.5-1.78 4.1-5.5 4.1v3.3c3.3 0 6.05-1.08 8.06-2.94 2.08-1.92 3.28-4.76 3.28-8.16 0-.63-.07-1.11-.16-1.94z"
      />
      <path
        fill="#FBBC05"
        d="M5.5 13.7l-.78.6-2.72 2.1A9.5 9.5 0 0 0 12 21.5v-3.3c-2.62 0-4.84-1.74-5.62-4.1l-.88-.4z"
      />
      <path
        fill="#34A853"
        d="M12 5.9c1.88 0 3.14.8 3.86 1.49l2.64-2.55C16.83 3.43 14.66 2.5 12 2.5A9.5 9.5 0 0 0 2.5 12c0 1.52.36 2.96 1 4.25l3.5-2.7C6.66 12.74 6.4 11.92 6.4 11c0-2.85 2.36-5.1 5.6-5.1z"
      />
    </svg>
  );
}
