import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_therapy_goals",
  title: "List therapy goals for a disorder",
  description:
    "List evidence-based therapy goals from the app's clinical catalog, optionally filtered by disorder name.",
  inputSchema: {
    disorder: z.string().optional().describe("Disorder name substring, e.g. 'dysarthria'."),
    limit: z.number().int().min(1).max(100).optional().describe("Max goals to return (default 25)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ disorder, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);

    let disorderIds: string[] | null = null;
    if (disorder?.trim()) {
      const { data: matches, error: matchError } = await supabase
        .from("disorders")
        .select("id")
        .ilike("name", `%${disorder.trim()}%`);
      if (matchError) return { content: [{ type: "text", text: matchError.message }], isError: true };
      disorderIds = (matches ?? []).map((d) => d.id);
      if (disorderIds.length === 0) {
        return {
          content: [{ type: "text", text: `No disorder matched "${disorder}".` }],
          structuredContent: { goals: [] },
        };
      }
    }

    let query = supabase
      .from("therapy_goals")
      .select("id, goal, source_reference, disorder_id, disorders(name)")
      .limit(limit ?? 25);
    if (disorderIds) query = query.in("disorder_id", disorderIds);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { goals: data ?? [] },
    };
  },
});
