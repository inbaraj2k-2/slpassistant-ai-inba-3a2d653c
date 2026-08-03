import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "search_disorders",
  title: "Search the clinical disorder catalog",
  description:
    "Search the app's speech-language disorder catalog by name, category or symptom text. Returns disorder name, category, symptoms and red flags.",
  inputSchema: {
    query: z.string().trim().min(1).describe("Search text, e.g. 'apraxia' or 'stuttering'."),
    limit: z.number().int().min(1).max(50).optional().describe("Max results (default 10)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const like = `%${query}%`;
    const { data, error } = await supabase
      .from("disorders")
      .select("id, name, category, symptoms, red_flags, source_reference")
      .or(`name.ilike.${like},category.ilike.${like},symptoms.ilike.${like}`)
      .limit(limit ?? 10);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { disorders: data ?? [] },
    };
  },
});
