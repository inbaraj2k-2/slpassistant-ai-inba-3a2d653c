import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getAvatarSignedUrl, getInitials } from "@/lib/avatar";

export interface UserProfile {
  id: string;
  email: string | null;
  displayName: string;
  fullName: string | null;
  avatarUrl: string | null; // resolved to a fetchable URL (signed or provider URL)
  avatarPath: string | null; // storage path in `uploads` bucket if user-uploaded
  initials: string;
  clinicName: string | null;
  clinicLogoUrl: string | null;
  provider: string | null;
}

async function loadProfile(): Promise<UserProfile | null> {
  // Read local session — getUser() forces a network hit that stalls avatar
  // rendering across the app on flaky mobile networks.
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return null;

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const metaName =
    (typeof meta.full_name === "string" && meta.full_name) ||
    (typeof meta.name === "string" && meta.name) ||
    null;
  const metaAvatar =
    (typeof meta.avatar_url === "string" && meta.avatar_url) ||
    (typeof meta.picture === "string" && meta.picture) ||
    null;

  let row: {
    display_name?: string | null;
    full_name?: string | null;
    avatar_url?: string | null;
    avatar_path?: string | null;
    clinic_name?: string | null;
    clinic_logo_url?: string | null;
    provider?: string | null;
  } | null = null;

  if (!user.is_anonymous) {
    const { data } = await supabase
      .from("profiles")
      .select("display_name, full_name, avatar_url, avatar_path, clinic_name, clinic_logo_url, provider")
      .eq("id", user.id)
      .maybeSingle();
    row = data ?? null;
  }

  const displayName =
    (row?.display_name?.trim()) || (row?.full_name?.trim()) || metaName || (user.email ?? "Clinician");
  const fullName = row?.full_name ?? metaName ?? null;
  const avatarPath = row?.avatar_path ?? null;
  let avatarUrl: string | null = null;
  if (avatarPath) {
    avatarUrl = await getAvatarSignedUrl(avatarPath);
  } else if (row?.avatar_url) {
    avatarUrl = row.avatar_url;
  } else if (metaAvatar) {
    avatarUrl = metaAvatar;
  }

  return {
    id: user.id,
    email: user.email ?? null,
    displayName,
    fullName,
    avatarUrl,
    avatarPath,
    initials: getInitials(displayName, user.email),
    clinicName: row?.clinic_name ?? null,
    clinicLogoUrl: row?.clinic_logo_url ?? null,
    provider: row?.provider ?? null,
  };
}

export function useProfile() {
  return useQuery({
    queryKey: ["user-profile"],
    queryFn: loadProfile,
    staleTime: 60_000,
  });
}

export function useInvalidateProfile() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["user-profile"] });
    qc.invalidateQueries({ queryKey: ["brand-mark"] });
  };
}
