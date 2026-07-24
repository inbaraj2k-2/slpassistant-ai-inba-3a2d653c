import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const FindingSchema = z.object({
  key: z.string(),
  label: z.string(),
  value: z.string(),
  severity: z.enum(["normal", "mild", "moderate", "severe", "unavailable"]),
  interpretation: z.string(),
  clinicalMeaning: z.string(),
});

const InputSchema = z.object({
  sex: z.enum(["male", "female", "unknown"]).default("unknown"),
  ageYears: z.number().int().min(0).max(120).nullable().optional(),
  durationSec: z.number(),
  sampleRate: z.number(),
  f0: z.object({
    meanHz: z.number().nullable(),
    medianHz: z.number().nullable(),
    sdHz: z.number().nullable(),
  }),
  jitterLocalPct: z.number().nullable(),
  shimmerLocalPct: z.number().nullable(),
  hnrDb: z.number().nullable(),
  cppDb: z.number().nullable(),
  mptSec: z.number(),
  voiceBreakPct: z.number(),
  findings: z.array(FindingSchema).max(20),
  overallSeverity: z.enum(["normal", "mild", "moderate", "severe"]),
});

export const summarizeVoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => InputSchema.parse(v))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI service unavailable.");
    const gateway = createLovableAiGatewayProvider(key);
    const model = gateway("google/gemini-3.6-flash");

    const prompt = `You are an SLP clinical writer. Given acoustic voice analysis results, write a concise clinical narrative (150-220 words).
Follow this structure with plain-text section labels on their own lines:
1. Clinical summary
2. Differential considerations (2-4 possibilities, decision-support only, no diagnosis)
3. Suggested therapy goals (3-5 concrete SMART-style bullets, prefixed with "- ")
4. Home exercise program (3-5 bullets, prefixed with "- ")
5. Follow-up recommendations

Do not invent numbers. Refer only to what is provided. Do not diagnose.

Patient: sex=${data.sex}, age=${data.ageYears ?? "unknown"}
Recording: ${data.durationSec.toFixed(1)}s @ ${data.sampleRate} Hz
F0: mean ${data.f0.meanHz?.toFixed(1) ?? "—"} Hz, median ${data.f0.medianHz?.toFixed(1) ?? "—"} Hz, SD ${data.f0.sdHz?.toFixed(2) ?? "—"} Hz
Jitter local: ${data.jitterLocalPct?.toFixed(3) ?? "—"} %
Shimmer local: ${data.shimmerLocalPct?.toFixed(3) ?? "—"} %
HNR: ${data.hnrDb?.toFixed(1) ?? "—"} dB
CPP: ${data.cppDb?.toFixed(2) ?? "—"} dB
MPT: ${data.mptSec.toFixed(1)} s
Voice breaks: ${data.voiceBreakPct.toFixed(1)} %
Overall severity: ${data.overallSeverity}
Per-parameter severities: ${data.findings.map((f) => `${f.label}=${f.severity}`).join(", ")}`;

    try {
      const { text } = await generateText({ model, prompt, temperature: 0.3 });
      return { summary: text.trim() };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // Do not leak provider details
      if (/402|credit/i.test(msg)) throw new Error("AI credits exhausted for this workspace.");
      if (/429|rate/i.test(msg)) throw new Error("AI rate-limited. Please retry shortly.");
      throw new Error("AI summary temporarily unavailable.");
    }
  });
