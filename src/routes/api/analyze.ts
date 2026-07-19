// Public HTTPS endpoint that mirrors the analyzeCase server function so the
// Capacitor Android app (origin https://localhost) can call AI analysis over
// CORS. Web/SSR path continues to use src/lib/analyze.functions.ts directly.
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { runAnalyzeCase } from "@/lib/analyze-core.server";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
} as const;

const jsonHeaders = () => ({ "Content-Type": "application/json", ...CORS_HEADERS });

const BodySchema = z.object({ caseId: z.string().uuid() });

async function authenticate(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) return { error: "Missing bearer token" };
  const token = authHeader.slice(7).trim();
  if (!token) return { error: "Missing bearer token" };

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return { error: "Server not configured" };

  const supabase = createClient<Database>(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims?.sub) return { error: "Invalid token" };
  return { supabase, userId: data.claims.sub };
}

export const Route = createFileRoute("/api/analyze")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS_HEADERS }),
      POST: async ({ request }) => {
        try {
          const auth = await authenticate(request);
          if ("error" in auth) {
            return new Response(JSON.stringify({ error: auth.error }), {
              status: 401,
              headers: jsonHeaders(),
            });
          }
          const body = BodySchema.parse(await request.json());
          const result = await runAnalyzeCase({
            supabase: auth.supabase,
            userId: auth.userId,
            caseId: body.caseId,
          });
          return new Response(JSON.stringify(result), { status: 200, headers: jsonHeaders() });
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Unexpected error";
          console.error("[/api/analyze] error:", msg);
          return new Response(JSON.stringify({ error: msg }), {
            status: 400,
            headers: jsonHeaders(),
          });
        }
      },
    },
  },
});
