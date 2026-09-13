// Production crash reporting only. Keep Sentry off the interaction, keyboard,
// viewport, navigation, and network hot paths so it cannot contend with the
// Android WebView while the IME is opening or closing.
import * as Sentry from "@sentry/capacitor";
import * as SentryReact from "@sentry/react";

let initialized = false;

export function initSentry() {
  if (initialized) return;

  const env = (import.meta as any).env;
  const dsn =
    (env?.VITE_SENTRY_DSN as string | undefined) ||
    "https://b91aa1be33208d35de72ef8a7995b597@o4511836157313024.ingest.us.sentry.io/4511836178284544";

  if (!dsn) return;

  Sentry.init(
    {
      dsn,
      environment: env?.VITE_SENTRY_ENV ?? "production",
      release: env?.VITE_APP_RELEASE ?? "slp-assist-ai",
      debug: false,
      sampleRate: 1,
      tracesSampleRate: 0,
      profilesSampleRate: 0,
      maxBreadcrumbs: 0,
      attachStacktrace: true,
      sendDefaultPii: false,
      enableAutoSessionTracking: false,
      defaultIntegrations: false,
      enableNative: true,
      enableNativeCrashHandling: true,
      anrEnabled: false,
    } as any,
    SentryReact.init as any,
  );

  initialized = true;
  installUnhandledErrorReporting();
}

function installUnhandledErrorReporting() {
  if (typeof window === "undefined") return;

  window.addEventListener("error", (event) => {
    Sentry.captureException(event.error ?? new Error(event.message));
  });
  window.addEventListener("unhandledrejection", (event) => {
    Sentry.captureException(event.reason ?? new Error("Unhandled promise rejection"));
  });
}

export { Sentry };
