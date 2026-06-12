import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Disclaimer } from "@/components/Disclaimer";
import { Loader2, Stethoscope, UserRound } from "lucide-react";

export const Route = createFileRoute("/auth")({
  ssr: false,
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
  const [busy, setBusy] = useState<null | "google" | "guest">(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/home", replace: true });
    });
  }, [navigate]);

  async function signInWithGoogle() {
    setError(null);
    setBusy("google");
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        setError("Could not sign in with Google. Please try again.");
        setBusy(null);
        return;
      }
      if (result.redirected) return;
      navigate({ to: "/home", replace: true });
    } catch {
      setError("Could not sign in with Google. Please try again.");
      setBusy(null);
    }
  }

  async function continueAsGuest() {
    setError(null);
    setBusy("guest");
    try {
      const { error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
      navigate({ to: "/home", replace: true });
    } catch {
      setError("Could not start guest session. Please try again.");
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-gradient-soft px-5 pb-10 pt-14">
      <div className="mb-8 flex flex-col items-center text-center">
        <div className="mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-elev">
          <Stethoscope className="h-8 w-8" />
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
