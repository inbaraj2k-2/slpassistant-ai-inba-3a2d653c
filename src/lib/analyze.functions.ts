import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { runAnalyzeCase } from "./analyze-core.server";
export type { AnalysisResult } from "./analyze-core.server";

const CaseInputSchema = z.object({
  caseId: z.string().uuid(),
});

export const analyzeCase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CaseInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    return runAnalyzeCase({
      supabase: context.supabase,
      userId: context.userId,
      caseId: data.caseId,
    });
  });
