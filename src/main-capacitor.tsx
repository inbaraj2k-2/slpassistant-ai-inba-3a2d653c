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

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createRouter } from "@tanstack/react-router";

import { routeTree } from "./routeTree.gen";

// Absolute origin of the published web app that hosts the server functions.
// The mobile app talks to it only for AI analysis and other privileged RPC
// calls; all UI + local data comes from the bundled assets.
const REMOTE_ORIGIN = "https://slpassistant-ai-inba.lovable.app";

// Rewrite any request that targets a TanStack Start server-function endpoint
// (`/_serverFn/...`) to the published origin so it actually reaches the
// Cloudflare Worker instead of Capacitor's local file scheme.
if (typeof window !== "undefined") {
  const originalFetch = window.fetch.bind(window);
  window.fetch = (input, init) => {
    try {
      let url: string | undefined;
      if (typeof input === "string") url = input;
      else if (input instanceof URL) url = input.toString();
      else if (input instanceof Request) url = input.url;

      if (url) {
        // Match both same-origin ("http://localhost/_serverFn/...") and
        // relative ("/_serverFn/...") server-fn RPC calls.
        const match = url.match(/(?:^|\/\/[^/]+)(\/_serverFn\/.*)$/);
        if (match) {
          const rewritten = REMOTE_ORIGIN + match[1];
          if (input instanceof Request) {
            return originalFetch(new Request(rewritten, input), init);
          }
          return originalFetch(rewritten, init);
        }
      }
    } catch {
      // fall through to normal fetch
    }
    return originalFetch(input as RequestInfo, init);
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
