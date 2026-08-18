// Client entrypoint for the Capacitor Android app.
// Mounts the TanStack Router in browser mode using the shared routeTree, so
// the entire frontend runs from bundled assets inside the APK/AAB.

import "./styles.css";
import { initSentry } from "./lib/sentry";

initSentry();

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createRouter } from "@tanstack/react-router";

import { routeTree } from "./routeTree.gen";
import { completeCapacitorOAuthFromUrl } from "./lib/capacitor-auth";

const REMOTE_ORIGIN = "https://slpassistant-ai-inba.lovable.app";

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
    queries: { retry: 1, staleTime: 30_000 },
  },
});

const router = createRouter({
  routeTree,
  context: { queryClient },
  scrollRestoration: true,
  defaultPreloadStaleTime: 0,
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

const ROOT_ROUTES = new Set(["/", "/home", "/auth"]);

(async () => {
  try {
    const { App: CapApp } = await import("@capacitor/app");

    CapApp.addListener("appUrlOpen", async (event: { url: string }) => {
      try {
        const consumed = await completeCapacitorOAuthFromUrl(event.url);
        if (consumed) router.navigate({ to: "/home", replace: true });
      } catch (err) {
        console.error("[capacitor] OAuth deep-link failed", err);
      }
    });

    CapApp.addListener("backButton", async () => {
      try {
        const active = document.activeElement as HTMLElement | null;
        const isEditable =
          active instanceof HTMLInputElement ||
          active instanceof HTMLTextAreaElement ||
          active?.isContentEditable === true;

        // Let Android/WebView own the IME lifecycle. Never blur(), focus(),
        // Keyboard.hide(), or otherwise mutate the focused editor here.
        // If the IME is active, the native back gesture/button should dismiss
        // it before application navigation is considered.
        if (isEditable) return;
      } catch { /* ignore */ }

      const overlay = document.querySelector<HTMLElement>(
        '[role="dialog"], [data-state="open"][role="alertdialog"], [data-radix-portal] [role="dialog"]',
      );
      if (overlay) {
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
        return;
      }

      const path = window.location.pathname || "/";
      if (ROOT_ROUTES.has(path) || window.history.length <= 1) {
        try { await CapApp.exitApp(); } catch { /* ignore */ }
        return;
      }

      router.history.back();
    });
  } catch {
    // Not running under Capacitor — ignore.
  }
})();

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
