// Public HTTPS endpoint for account deletion used by the Capacitor Android app
// (origin https://localhost, which cannot invoke TanStack server functions).
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { runDeleteMyAccount } from "@/lib/analyze-core.server";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
} as const;
const jsonHeaders = () => ({ "Content-Type": "application/json", ...CORS_HEADERS });

export const Route = createFileRoute("/api/account/delete")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS_HEADERS }),
      POST: async ({ request }) => {
        try {
          const authHeader = request.headers.get("authorization") ?? "";
          if (!authHeader.toLowerCase().startsWith("bearer ")) {
            return new Response(JSON.stringify({ error: "Missing bearer token" }), {
              status: 401,
              headers: jsonHeaders(),
            });
          }
          const token = authHeader.slice(7).trim();
          const url = process.env.SUPABASE_URL;
          const key = process.env.SUPABASE_PUBLISHABLE_KEY;
          if (!url || !key) {
            return new Response(JSON.stringify({ error: "Server not configured" }), {
              status: 500,
              headers: jsonHeaders(),
            });
          }
          const supabase = createClient<Database>(url, key, {
            global: { headers: { Authorization: `Bearer ${token}` } },
            auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
          });
          const { data, error } = await supabase.auth.getClaims(token);
          if (error || !data?.claims?.sub) {
            return new Response(JSON.stringify({ error: "Invalid token" }), {
              status: 401,
              headers: jsonHeaders(),
            });
          }
          const result = await runDeleteMyAccount(data.claims.sub);
          return new Response(JSON.stringify(result), { status: 200, headers: jsonHeaders() });
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Unexpected error";
          console.error("[/api/account/delete] error:", msg);
          return new Response(JSON.stringify({ error: msg }), {
            status: 400,
            headers: jsonHeaders(),
          });
        }
      },
    },
  },
});
