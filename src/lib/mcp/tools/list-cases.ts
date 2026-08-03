import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_cases",
  title: "List clinical cases",
  description:
    "List the signed-in clinician's saved SLP cases, most recently updated first. Returns id, client name, age, gender, chief complaint and whether an AI analysis exists.",
  inputSchema: {
    limit: z.number().int().min(1).max(100).optional().describe("Max cases to return (default 20)."),
    search: z.string().optional().describe("Optional case-name substring filter."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, search }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("cases")
      .select("id, name, age, gender, chief_complaint, analysis, created_at, updated_at")
      .order("updated_at", { ascending: false })
      .limit(limit ?? 20);
    if (search?.trim()) query = query.ilike("name", `%${search.trim()}%`);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const rows = (data ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      age: c.age,
      gender: c.gender,
      chief_complaint: c.chief_complaint,
      has_analysis: Boolean(c.analysis),
      updated_at: c.updated_at,
    }));
    return {
      content: [{ type: "text", text: JSON.stringify(rows, null, 2) }],
      structuredContent: { cases: rows },
    };
  },
});
