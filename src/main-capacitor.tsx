// Client entrypoint for the Capacitor Android app.
// Mounts the TanStack Router in browser mode using the shared routeTree, so
// the entire frontend runs from bundled assets inside the APK/AAB.
//
// Server-function RPC calls (AI analysis, account deletion) are transparently
// proxied over HTTPS to the published Lovable app origin, since Cloudflare
// Workers infrastructure hosts them. All other screens (Games, Knowledge Base,
// Saved Reports, Legal, Clinical Tools) work fully offline via bundled data
// and localStorage caches.

import "./styles.css";
import { initSentry } from "./lib/sentry";

// Initialize Sentry BEFORE any other module runs, so we catch import-time
// errors, long-task events during hydration, and unhandled rejections
// from the very first tick.
initSentry();

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createRouter } from "@tanstack/react-router";

import { routeTree } from "./routeTree.gen";
import { completeCapacitorOAuthFromUrl } from "./lib/capacitor-auth";

// Absolute origin of the published web app that hosts the server functions.
// The mobile app talks to it only for AI analysis and other privileged RPC
// calls; all UI + local data comes from the bundled assets.
const REMOTE_ORIGIN = "https://slpassistant-ai-inba.lovable.app";

// Rewrite any request that targets a TanStack Start server-function endpoint
// (`/_serverFn/...`) to the published origin so it actually reaches the
// Cloudflare Worker instead of Capacitor's local file scheme.
//
// Every fetch is also wrapped in a 25s AbortController timeout — flaky
// mobile networks would otherwise let promises hang forever, which is a
// major source of the "screen becomes unresponsive" symptom on Android
// (the UI stays in a loading state that never resolves).
if (typeof window !== "undefined") {
  const originalFetch = window.fetch.bind(window);
  const FETCH_TIMEOUT_MS = 25_000;
  window.fetch = (input, init) => {
    let url: string | undefined;
    try {
      if (typeof input === "string") url = input;
      else if (input instanceof URL) url = input.toString();
      else if (input instanceof Request) url = input.url;
    } catch { /* ignore */ }

    let finalInput: RequestInfo | URL = input as RequestInfo;
    if (url) {
      const match = url.match(/(?:^|\/\/[^/]+)(\/_serverFn\/.*)$/);
      if (match) {
        const rewritten = REMOTE_ORIGIN + match[1];
        finalInput = input instanceof Request ? new Request(rewritten, input) : rewritten;
      }
    }

    // Attach a timeout unless the caller already provided a signal.
    const existingSignal = (init as RequestInit | undefined)?.signal
      ?? (input instanceof Request ? input.signal : undefined);
    if (existingSignal) return originalFetch(finalInput, init);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const nextInit: RequestInit = { ...(init ?? {}), signal: controller.signal };
    return originalFetch(finalInput, nextInit).finally(() => clearTimeout(timer));
  };
}


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

const router = createRouter({
  routeTree,
  context: { queryClient },
  scrollRestoration: true,
  defaultPreloadStaleTime: 0,
  // On Android WebView, hover-intent preloading fires on every touchstart
  // and piles up route loaders (Supabase calls) that block the main thread
  // and freeze touches. Disable preloading in the Capacitor build.
  defaultPreload: false,
});


declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

function App() {
  return (
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>
  );
}

const container = document.getElementById("root");
if (!container) throw new Error("Missing #root element");
createRoot(container).render(<App />);

// Deep-link handler for the Google OAuth callback returning from Chrome
// Custom Tab as app.lovable.slpassistant://auth-callback#access_token=...
// AND a global hardware Back-button handler so navigation never gets stuck
// on any screen. Without this, some Android IMEs and route loaders swallow
// the Back press and users are forced to close the app.
const ROOT_ROUTES = new Set(["/", "/home", "/auth"]);

(async () => {
  try {
    const { App: CapApp } = await import("@capacitor/app");

    CapApp.addListener("appUrlOpen", async (event: { url: string }) => {
      try {
        const consumed = await completeCapacitorOAuthFromUrl(event.url);
        if (consumed) {
          router.navigate({ to: "/home", replace: true });
        }
      } catch (err) {
        console.error("[capacitor] OAuth deep-link failed", err);
      }
    });

    CapApp.addListener("backButton", async () => {
      // 1) If the soft keyboard is up, drop focus + hide it and stop here.
      try {
        const active = document.activeElement as HTMLElement | null;
        if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA")) {
          active.blur();
          const { Keyboard } = await import("@capacitor/keyboard");
          await Keyboard.hide().catch(() => {});
          return;
        }
      } catch { /* ignore */ }

      // 2) If any dialog / sheet / modal is open, close it via Escape.
      const overlay = document.querySelector<HTMLElement>(
        '[role="dialog"], [data-state="open"][role="alertdialog"], [data-radix-portal] [role="dialog"]',
      );
      if (overlay) {
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
        return;
      }

      // 3) At a root screen → exit the app cleanly.
      const path = window.location.pathname || "/";
      if (ROOT_ROUTES.has(path) || window.history.length <= 1) {
        try { await CapApp.exitApp(); } catch { /* ignore */ }
        return;
      }

      // 4) Otherwise, navigate back.
      router.history.back();
    });
  } catch {
    // Not running under Capacitor — ignore.
  }
})();


// Configure the Android system status bar so it stays visible above the
// WebView (matches Google Drive / Chrome behaviour). Any failure here is
// non-fatal — on web this simply no-ops.
(async () => {
  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    await StatusBar.setOverlaysWebView({ overlay: false });
    await StatusBar.setStyle({ style: Style.Light });
    await StatusBar.setBackgroundColor({ color: "#5b21b6" });
    await StatusBar.show();
  } catch {
    /* not running under Capacitor */
  }
})();
