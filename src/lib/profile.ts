import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export async function ensureUserProfile(user: User) {
  if (user.is_anonymous) return;

  const metadata = user.user_metadata ?? {};
  const appMetadata = user.app_metadata ?? {};
  const fullName =
    typeof metadata.full_name === "string"
      ? metadata.full_name
      : typeof metadata.name === "string"
        ? metadata.name
        : null;
  const avatarUrl =
    typeof metadata.avatar_url === "string"
      ? metadata.avatar_url
      : typeof metadata.picture === "string"
        ? metadata.picture
        : null;
  const provider =
    typeof appMetadata.provider === "string" ? appMetadata.provider : "google";

  const { data: existingProfile, error: existingProfileError } = await supabase
    .from("profiles")
    .select("clinic_name, clinic_logo_url")
    .eq("id", user.id)
    .maybeSingle();

  if (existingProfileError && existingProfileError.code !== "PGRST116") throw existingProfileError;

  const { error } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      email: user.email ?? null,
      full_name: fullName,
      avatar_url: avatarUrl,
      provider,
      ...(existingProfile ?? {}),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (error) throw error;
}