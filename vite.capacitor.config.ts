// Standalone SPA build for the Capacitor Android app.
// Bundles the entire frontend into dist/capacitor/ so the APK/AAB launches
// directly from local assets without loading the hosted lovable.app site.
// AI analysis and other server-function calls are proxied over HTTPS to the
// published origin at runtime (see src/main-capacitor.tsx).
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [
    tsconfigPaths(),
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
      routesDirectory: resolve(__dirname, "src/routes"),
      generatedRouteTree: resolve(__dirname, "src/routeTree.gen.ts"),
    }),
    react(),
    tailwindcss(),
  ],
  define: {
    // TSS server-function client stubs reference process.env.NODE_ENV
    "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV ?? "production"),
  },
  build: {
    outDir: "dist/capacitor",
    emptyOutDir: true,
    target: "es2020",
    rollupOptions: {
      input: resolve(__dirname, "index.capacitor.html"),
    },
  },
  resolve: {
    // Replace server-only modules with browser-safe shims so the SPA bundle
    // never pulls TanStack Start server internals into the browser.
    alias: [
      { find: "@tanstack/react-start", replacement: resolve(__dirname, "src/capacitor/stub-react-start.ts") },
      { find: "@/lib/analyze.functions", replacement: resolve(__dirname, "src/capacitor/shims/analyze.functions.ts") },
      { find: "@/lib/account.functions", replacement: resolve(__dirname, "src/capacitor/shims/account.functions.ts") },
      { find: "@/lib/clinical.functions", replacement: resolve(__dirname, "src/capacitor/shims/clinical.functions.ts") },
      { find: "@/lib/api/example.functions", replacement: resolve(__dirname, "src/capacitor/stub-empty.ts") },
      { find: "@/integrations/supabase/client.server", replacement: resolve(__dirname, "src/capacitor/stub-empty.ts") },
      { find: "@/integrations/supabase/auth-middleware", replacement: resolve(__dirname, "src/capacitor/stub-empty.ts") },
      { find: "@/lib/ai-gateway.server", replacement: resolve(__dirname, "src/capacitor/stub-empty.ts") },
      { find: "@/lib/config.server", replacement: resolve(__dirname, "src/capacitor/stub-empty.ts") },
      { find: "@/lib/error-capture", replacement: resolve(__dirname, "src/capacitor/stub-empty.ts") },
    ],
  },
});
