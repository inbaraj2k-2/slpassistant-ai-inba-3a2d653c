// AI symbol generation for the AAC keyboard. Called ONLY when the user taps
// "Generate with AI" — never automatic. Produces a flat AAC symbol (white
// background, bold outline, single centered object) and stores it in the
// user's private vocabulary.
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
} as const;
const jsonHeaders = () => ({ "Content-Type": "application/json", ...CORS_HEADERS });

const BodySchema = z.object({
  label: z.string().min(1).max(80),
  keywords: z.array(z.string()).max(10).default([]),
});

async function authenticate(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  if (!auth.toLowerCase().startsWith("bearer ")) return { error: "Missing bearer token" };
  const token = auth.slice(7).trim();
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

function base64ToUint8Array(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export const Route = createFileRoute("/api/aac-generate-image")({
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
          const { label, keywords } = BodySchema.parse(await request.json());

          const apiKey = process.env.LOVABLE_API_KEY;
          if (!apiKey) throw new Error("AI service not configured");

          const prompt =
            `A single "${label}" as a clean, flat AAC communication symbol. ` +
            `Style: bold black outline, simple flat colors, centered object, ` +
            `pure white background, no text, no letters, no watermarks, ` +
            `no logos, no copyrighted characters, safe for children, ` +
            `clinically appropriate for speech therapy. ` +
            (keywords.length ? `Context: ${keywords.slice(0, 5).join(", ")}.` : "");

          // Non-streaming call — we save to storage then return the row.
          const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "openai/gpt-image-1-mini",
              prompt,
              size: "1024x1024",
              quality: "low",
              n: 1,
            }),
          });

          if (!aiRes.ok) {
            const text = await aiRes.text().catch(() => "");
            if (aiRes.status === 429) throw new Error("AI service is busy. Try again shortly.");
            if (aiRes.status === 402) throw new Error("AI credits exhausted.");
            console.error("[aac-generate-image] gateway", aiRes.status, text);
            throw new Error("AI image generation failed.");
          }

          const payload = (await aiRes.json()) as {
            data?: Array<{ b64_json?: string }>;
          };
          const b64 = payload.data?.[0]?.b64_json;
          if (!b64) throw new Error("No image returned by AI.");

          const bytes = base64ToUint8Array(b64);
          const safeName = label.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40) || "symbol";
          const path = `aac/${auth.userId}/${Date.now()}-${safeName}.png`;

          const { error: upErr } = await auth.supabase.storage
            .from("uploads")
            .upload(path, bytes, { contentType: "image/png", upsert: false });
          if (upErr) throw new Error(`Storage upload failed: ${upErr.message}`);

          const { data: signed } = await auth.supabase.storage
            .from("uploads")
            .createSignedUrl(path, 60 * 60 * 24 * 365);

          const { data: row, error: insErr } = await auth.supabase
            .from("aac_vocabulary")
            .insert({
              user_id: auth.userId,
              label,
              keywords,
              image_path: path,
              image_url: signed?.signedUrl ?? null,
              source: "ai",
            })
            .select()
            .single();
          if (insErr) throw new Error(insErr.message);

          return new Response(JSON.stringify(row), { status: 200, headers: jsonHeaders() });
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Unexpected error";
          console.error("[/api/aac-generate-image]", msg);
          return new Response(JSON.stringify({ error: msg }), {
            status: 400,
            headers: jsonHeaders(),
          });
        }
      },
    },
  },
});
