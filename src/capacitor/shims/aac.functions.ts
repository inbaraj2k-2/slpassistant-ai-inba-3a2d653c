// Capacitor shim: proxies AAC vocab mutations to the remote HTTPS origin.
// We hit the Supabase Data API directly from the SPA using RLS-scoped auth,
// so these helpers just call supabase like the server functions do.
import { supabase } from "@/integrations/supabase/client";

interface UpsertInput {
  data: {
    id?: string;
    label: string;
    keywords?: string[];
    category?: string | null;
    emoji?: string | null;
    image_path?: string | null;
    image_url?: string | null;
    source?: "user" | "ai" | "openverse" | "core";
    is_favorite?: boolean;
    pinned?: boolean;
    sort_order?: number;
  };
}

export const upsertVocab = async (input: UpsertInput) => {
  const { data: sess } = await supabase.auth.getUser();
  const uid = sess.user?.id;
  if (!uid) throw new Error("Please sign in first.");
  const row = { user_id: uid, source: "user", ...input.data };
  const { data, error } = await supabase
    .from("aac_vocabulary")
    .upsert(row, { onConflict: "id" })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
};

export const deleteVocab = async (input: { data: { id: string } }) => {
  const { error } = await supabase.from("aac_vocabulary").delete().eq("id", input.data.id);
  if (error) throw new Error(error.message);
  return { ok: true };
};

export const recordUse = async (input: { data: { id: string } }) => {
  const { data: row } = await supabase
    .from("aac_vocabulary")
    .select("use_count")
    .eq("id", input.data.id)
    .maybeSingle();
  const next = ((row?.use_count as number | undefined) ?? 0) + 1;
  await supabase
    .from("aac_vocabulary")
    .update({ use_count: next, last_used_at: new Date().toISOString() })
    .eq("id", input.data.id);
  return { ok: true };
};
