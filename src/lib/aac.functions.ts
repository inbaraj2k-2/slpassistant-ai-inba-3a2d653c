// Server functions for AAC vocabulary mutations. Uses the authenticated
// Supabase client so RLS enforces ownership.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const UpsertSchema = z.object({
  id: z.string().uuid().optional(),
  label: z.string().min(1).max(80),
  keywords: z.array(z.string().max(40)).max(20).default([]),
  category: z.string().max(60).nullable().optional(),
  emoji: z.string().max(8).nullable().optional(),
  image_path: z.string().max(500).nullable().optional(),
  image_url: z.string().url().max(2000).nullable().optional(),
  source: z.enum(["user", "ai", "openverse", "core"]).default("user"),
  is_favorite: z.boolean().optional(),
  pinned: z.boolean().optional(),
});

export const upsertVocab = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => UpsertSchema.parse(v))
  .handler(async ({ data, context }) => {
    const row = { ...data, user_id: context.userId };
    const { data: result, error } = await context.supabase
      .from("aac_vocabulary")
      .upsert(row, { onConflict: "id" })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return result;
  });

export const deleteVocab = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ id: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("aac_vocabulary")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const recordUse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ id: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }) => {
    // Read then increment (small volume, RLS-scoped, no race concern for prediction).
    const { data: row } = await context.supabase
      .from("aac_vocabulary")
      .select("use_count")
      .eq("id", data.id)
      .maybeSingle();
    const nextCount = ((row?.use_count as number | undefined) ?? 0) + 1;
    await context.supabase
      .from("aac_vocabulary")
      .update({ use_count: nextCount, last_used_at: new Date().toISOString() })
      .eq("id", data.id);
    return { ok: true };
  });
