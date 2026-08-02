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
      beforeSend(event: any) {
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

// --- Interaction breadcrumbs: touch / pointer / focus / blur -----------------
// Passive + capture listeners only: they never call preventDefault and never
// alter event flow, so app behaviour is unchanged.
function describe(el: Element | null): string {
  if (!el) return "unknown";
  const tag = el.tagName?.toLowerCase() ?? "?";
  const id = (el as HTMLElement).id ? `#${(el as HTMLElement).id}` : "";
  const aria = el.getAttribute?.("aria-label");
  const testid = el.getAttribute?.("data-testid");
  const label = aria ? `[${aria}]` : testid ? `[${testid}]` : "";
  return `${tag}${id}${label}`;
}

function installInteractionBreadcrumbs() {
  if (typeof window === "undefined") return;
  let lastTouch = 0;
  const add = (category: string, message: string, data?: Record<string, unknown>) =>
    Sentry.addBreadcrumb({ category, level: "info", message, data });

  const onTouch = (e: Event) => {
    const now = Date.now();
    // Throttle touchmove-like storms to 1 breadcrumb / 150ms per type.
    if (e.type === "touchmove" || e.type === "pointermove") {
      if (now - lastTouch < 150) return;
      lastTouch = now;
    }
    add("ui.touch", `${e.type} ${describe(e.target as Element)}`);
  };

  for (const type of ["touchstart", "touchend", "touchcancel", "touchmove"]) {
    window.addEventListener(type, onTouch, { capture: true, passive: true });
  }
  for (const type of ["pointerdown", "pointerup", "pointercancel", "pointermove"]) {
    window.addEventListener(type, onTouch, { capture: true, passive: true });
  }

  window.addEventListener(
    "focusin",
    (e) => add("ui.focus", `focus ${describe(e.target as Element)}`),
    { capture: true, passive: true },
  );
  window.addEventListener(
    "focusout",
    (e) => add("ui.focus", `blur ${describe(e.target as Element)}`),
    { capture: true, passive: true },
  );
  window.addEventListener("blur", () => add("ui.focus", "window blur"), { passive: true });
  window.addEventListener("focus", () => add("ui.focus", "window focus"), { passive: true });
}

// --- Keyboard show/hide breadcrumbs (Capacitor native events) ----------------
function installKeyboardBreadcrumbs() {
  if (typeof window === "undefined") return;
  void (async () => {
    try {
      const { Keyboard } = await import("@capacitor/keyboard");
      const log = (message: string, data?: Record<string, unknown>) =>
        Sentry.addBreadcrumb({ category: "ui.keyboard", level: "info", message, data });
      await Keyboard.addListener("keyboardWillShow", (info) =>
        log("keyboardWillShow", { height: info?.keyboardHeight }),
      );
      await Keyboard.addListener("keyboardDidShow", (info) =>
        log("keyboardDidShow", { height: info?.keyboardHeight }),
      );
      await Keyboard.addListener("keyboardWillHide", () => log("keyboardWillHide"));
      await Keyboard.addListener("keyboardDidHide", () => log("keyboardDidHide"));
    } catch {
      /* not running under Capacitor */
    }
  })();

  // Web fallback: visualViewport resize is the browser-side keyboard signal.
  const vv = (window as any).visualViewport;
  if (vv?.addEventListener) {
    let lastH = vv.height;
    vv.addEventListener("resize", () => {
      const delta = Math.round(lastH - vv.height);
      if (Math.abs(delta) > 120) {
        Sentry.addBreadcrumb({
          category: "ui.keyboard",
          level: "info",
          message: delta > 0 ? "viewport shrank (keyboard shown?)" : "viewport grew (keyboard hidden?)",
          data: { delta, height: Math.round(vv.height) },
        });
      }
      lastH = vv.height;
    });
  }
}

// --- Dialog / sheet open+close breadcrumbs -----------------------------------
// Radix portals mount/unmount [role="dialog"] nodes; a MutationObserver on
// body captures open/close without touching any component.
function installDialogBreadcrumbs() {
  if (typeof document === "undefined" || typeof MutationObserver === "undefined") return;
  const SEL = '[role="dialog"], [role="alertdialog"]';
  const isDialog = (n: Node) =>
    n.nodeType === 1 && ((n as Element).matches?.(SEL) || !!(n as Element).querySelector?.(SEL));
  try {
    const obs = new MutationObserver((records) => {
      for (const r of records) {
        for (const n of Array.from(r.addedNodes)) {
          if (isDialog(n)) {
            Sentry.addBreadcrumb({
              category: "ui.dialog",
              level: "info",
              message: `dialog open ${describe(n as Element)}`,
            });
          }
        }
        for (const n of Array.from(r.removedNodes)) {
          if (isDialog(n)) {
            Sentry.addBreadcrumb({
              category: "ui.dialog",
              level: "info",
              message: `dialog close ${describe(n as Element)}`,
            });
          }
        }
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });
  } catch (err) {
    console.warn("[sentry] dialog observer failed", err);
  }
}

// --- Fetch breadcrumbs -------------------------------------------------------
// Wraps window.fetch transparently: same input/init, same return value.
function installFetchBreadcrumbs() {
  if (typeof window === "undefined" || typeof window.fetch !== "function") return;
  const original = window.fetch.bind(window);
  window.fetch = async (input: any, init?: any) => {
    let url = "unknown";
    try {
      url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input?.url ?? "unknown";
    } catch { /* ignore */ }
    const method = (init?.method ?? input?.method ?? "GET").toUpperCase();
    const started = Date.now();
    try {
      const res = await original(input, init);
      Sentry.addBreadcrumb({
        category: "fetch",
        level: res.ok ? "info" : "warning",
        message: `${method} ${url} → ${res.status}`,
        data: { duration_ms: Date.now() - started, status: res.status },
      });
      return res;
    } catch (err: any) {
      Sentry.addBreadcrumb({
        category: "fetch",
        level: "error",
        message: `${method} ${url} → failed`,
        data: { duration_ms: Date.now() - started, error: String(err?.message ?? err) },
      });
      throw err;
    }
  };
}

export { Sentry };
