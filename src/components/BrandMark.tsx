import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type BrandMarkProps = {
  className?: string;
};

export function BrandMark({ className = "h-full w-full" }: BrandMarkProps) {
  const [imgSrc, setImgSrc] = useState("/slp-header-logo.png");

  const { data: branding } = useQuery({
    queryKey: ["brand-mark"],
    queryFn: async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user || user.is_anonymous) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("clinic_name, clinic_logo_url")
        .eq("id", user.id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") return null;
      return {
        clinicName: data?.clinic_name?.trim() || null,
        clinicLogoUrl: data?.clinic_logo_url || null,
      };
    },
    staleTime: 60_000,
  });

  useEffect(() => {
    setImgSrc(branding?.clinicLogoUrl || "/slp-header-logo.png");
  }, [branding]);

  return (
    <img
      src={imgSrc}
      alt={branding?.clinicName || "SLP Assist AI"}
      className={className}
      draggable={false}
      onError={() => setImgSrc("/slp-header-logo.png")}
    />
  );
}