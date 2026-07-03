import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = context.userId;

    // Delete user's storage files
    try {
      const { data: files } = await supabaseAdmin.storage
        .from("uploads")
        .list(userId, { limit: 1000 });
      if (files && files.length) {
        const paths = files.map((f) => `${userId}/${f.name}`);
        await supabaseAdmin.storage.from("uploads").remove(paths);
      }
    } catch (_) {
      // ignore
    }

    // Delete rows in app tables
    await supabaseAdmin.from("user_uploads").delete().eq("user_id", userId);
    await supabaseAdmin.from("cases").delete().eq("user_id", userId);
    await supabaseAdmin.from("profiles").delete().eq("id", userId);

    // Delete the auth user
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw new Error(error.message);

    return { ok: true };
  });
