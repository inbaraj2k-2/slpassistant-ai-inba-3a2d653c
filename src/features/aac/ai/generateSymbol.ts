import { supabase } from "@/integrations/supabase/client";
import type { VocabRow } from "../types";

/**
 * Ask the server to synthesize an AAC symbol for `label`. Server route saves
 * it to the user's vocabulary and returns the new row.
 */
export async function generateAiSymbol(label: string, keywords: string[] = []): Promise<VocabRow> {
  const { data: session } = await supabase.auth.getSession();
  const token = session.session?.access_token;
  if (!token) throw new Error("You must be signed in.");

  const res = await fetch("/api/aac-generate-image", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ label, keywords }),
  });
  const json = (await res.json().catch(() => ({}))) as { error?: string } & VocabRow;
  if (!res.ok) throw new Error(json.error || "Failed to generate image.");
  return json;
}
