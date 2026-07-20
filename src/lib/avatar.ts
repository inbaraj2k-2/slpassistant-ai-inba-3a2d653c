import { supabase } from "@/integrations/supabase/client";

// Local cache of resolved signed URLs so we don't re-sign on every render.
const urlCache = new Map<string, { url: string; expiresAt: number }>();

const SIGN_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export async function getAvatarSignedUrl(path: string): Promise<string | null> {
  if (!path) return null;
  const hit = urlCache.get(path);
  const now = Date.now();
  if (hit && hit.expiresAt > now + 60_000) return hit.url;

  const { data, error } = await supabase.storage
    .from("uploads")
    .createSignedUrl(path, SIGN_TTL_SECONDS);
  if (error || !data?.signedUrl) return null;
  urlCache.set(path, {
    url: data.signedUrl,
    expiresAt: now + SIGN_TTL_SECONDS * 1000,
  });
  return data.signedUrl;
}

export function invalidateAvatarCache(path?: string) {
  if (path) urlCache.delete(path);
  else urlCache.clear();
}

export function getInitials(name?: string | null, email?: string | null): string {
  const source = (name || email || "").trim();
  if (!source) return "?";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    const s = parts[0];
    // For emails, use first two letters of local part.
    const local = s.includes("@") ? s.split("@")[0] : s;
    return local.slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
