// Sentry init for the Capacitor Android build (and web when DSN is present).
// Captures JS exceptions, unhandled rejections, main-thread long tasks
// (>200ms — the actual signal for WebView "freezes"), and app-lifecycle
// breadcrumbs. No UI. No feature changes.
//
// The DSN is a publishable identifier — safe to ship in the bundle. It is
// read from import.meta.env.VITE_SENTRY_DSN so CI/build can inject it.

import * as Sentry from "@sentry/capacitor";
import * as SentryReact from "@sentry/react";

let initialized = false;

export function initSentry() {
  if (initialized) return;
  const dsn =
    ((import.meta as any).env?.VITE_SENTRY_DSN as string | undefined) ||
    "https://b91aa1be33208d35de72ef8a7995b597@o4511836157313024.ingest.us.sentry.io/4511836178284544";
  if (!dsn) {
    console.warn("[sentry] VITE_SENTRY_DSN not set — Sentry disabled");
    return;
  }
  const release = (import.meta as any).env?.VITE_APP_RELEASE ?? "slp-assist-ai@debug";
  const environment = (import.meta as any).env?.VITE_SENTRY_ENV ?? "debug";

  Sentry.init(
    {
      dsn,
      release,
      environment,
      debug: environment !== "production",
      // High sample rate for the debug hunt; drop later.
      tracesSampleRate: 1.0,
      sampleRate: 1.0,
      attachStacktrace: true,
      enableAutoSessionTracking: true,
      // Native Android: crash reporting + ANR (Application Not Responding)
      // detection. These are forwarded to the sentry-android SDK.
      enableNative: true,
      enableNativeCrashHandling: true,
      enableNativeNagger: false,
      anrEnabled: true,
      anrTimeoutIntervalMillis: 5000,
      attachThreads: true,
      // Keep breadcrumbs generous so we can see everything before a freeze.
      maxBreadcrumbs: 300,
      // Rely on default integrations from @sentry/capacitor (includes
      // browser tracing, breadcrumbs, global handlers). Avoid mixing
      // integration instances from @sentry/react — versions can diverge
      // and TS rejects the cross-package Client type.
      beforeSend(event) {
        try {
          event.tags = {
            ...(event.tags ?? {}),
            route: typeof window !== "undefined" ? window.location.pathname : "unknown",
            native: String(!!(globalThis as any).Capacitor?.isNativePlatform?.()),
          };
        } catch { /* noop */ }
        return event;
      },
    } as any,
    SentryReact.init as any,
  );

  installLongTaskObserver();
  installGlobalTraps();
  installRouteBreadcrumbs();
  installInteractionBreadcrumbs();
  installKeyboardBreadcrumbs();
  installDialogBreadcrumbs();
  installFetchBreadcrumbs();
  initialized = true;
  Sentry.addBreadcrumb({ category: "app", level: "info", message: "sentry initialized" });
}

// A "freeze" in a Capacitor WebView is almost always a JS long task blocking
// the main thread. PerformanceObserver('longtask') surfaces every task >50ms;
// we forward anything >250ms to Sentry as a warning event with breadcrumbs.
function installLongTaskObserver() {
  if (typeof PerformanceObserver === "undefined") return;
  try {
    const obs = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const dur = Math.round(entry.duration);
        Sentry.addBreadcrumb({
          category: "longtask",
          level: dur > 500 ? "warning" : "info",
          message: `longtask ${dur}ms`,
          data: { name: entry.name, startTime: Math.round(entry.startTime), duration: dur },
        });
        if (dur >= 1000) {
          Sentry.captureMessage(`longtask ${dur}ms @ ${window.location.pathname}`, "warning");
        }
      }
    });
    obs.observe({ type: "longtask", buffered: true } as PerformanceObserverInit);
  } catch (err) {
    console.warn("[sentry] longtask observer unsupported", err);
  }
}

function installGlobalTraps() {
  if (typeof window === "undefined") return;
  window.addEventListener("error", (e) => {
    Sentry.captureException(e.error ?? new Error(e.message));
  });
  window.addEventListener("unhandledrejection", (e) => {
    Sentry.captureException(e.reason ?? new Error("unhandledrejection"));
  });
  // Visibility changes often correlate with freezes on Android.
  document.addEventListener("visibilitychange", () => {
    Sentry.addBreadcrumb({
      category: "app.visibility",
      level: "info",
      message: document.visibilityState,
    });
  });
}

function installRouteBreadcrumbs() {
  if (typeof window === "undefined") return;
  let last = window.location.pathname;
  const record = (reason: string) => {
    const now = window.location.pathname;
    if (now !== last) {
      Sentry.addBreadcrumb({
        category: "navigation",
        level: "info",
        message: `${reason}: ${last} -> ${now}`,
      });
      last = now;
    }
  };
  const wrap = (fn: (...a: any[]) => any, name: string) =>
    function (this: any, ...args: any[]) {
      const r = fn.apply(this, args);
      queueMicrotask(() => record(name));
      return r;
    };
  history.pushState = wrap(history.pushState.bind(history), "pushState");
  history.replaceState = wrap(history.replaceState.bind(history), "replaceState");
  window.addEventListener("popstate", () => record("popstate"));
}

export { Sentry };
