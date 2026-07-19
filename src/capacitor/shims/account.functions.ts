import { supabase } from "@/integrations/supabase/client";

async function callRemote(path: string, body: unknown) {
  const { data: sess } = await supabase.auth.getSession();
  const token = sess.session?.access_token;
  if (!token) throw new Error("Please sign in first.");
  const res = await fetch(`https://slpassistant-ai-inba.lovable.app${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body ?? {}),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed (${res.status})`);
  }
  return res.json();
}

export async function deleteMyAccount(): Promise<{ ok: boolean }> {
  return callRemote("/api/account/delete", {});
}
