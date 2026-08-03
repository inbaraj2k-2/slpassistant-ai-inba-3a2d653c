import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "create_case",
  title: "Create a clinical case",
  description:
    "Create a new SLP case record for the signed-in clinician. Only the client name is required; every history field is optional.",
  inputSchema: {
    name: z.string().trim().min(1).describe("Client / case name."),
    age: z.string().optional(),
    gender: z.string().optional(),
    chief_complaint: z.string().optional(),
    speech_milestones: z.string().optional(),
    language_history: z.string().optional(),
    hearing_history: z.string().optional(),
    family_history: z.string().optional(),
    education_history: z.string().optional(),
    additional_notes: z.string().optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const userId = ctx.getUserId();
    if (!userId) return { content: [{ type: "text", text: "Missing user identity" }], isError: true };
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("cases")
      .insert({ ...input, user_id: userId })
      .select()
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { case: data },
    };
  },
});
