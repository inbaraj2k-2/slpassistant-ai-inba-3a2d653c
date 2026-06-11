import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const CaseInputSchema = z.object({
  caseId: z.string().uuid(),
});

const AnalysisSchema = z.object({
  possible_conditions: z
    .array(
      z.object({
        name: z.string(),
        confidence: z.number().min(0).max(100),
        rationale: z.string(),
      }),
    )
    .min(1)
    .max(6),
  differential_diagnoses: z.array(z.string()).max(8),
  recommended_assessments: z.array(z.string()).max(10),
  materials_required: z.array(z.string()).max(10),
  therapy_goals: z.array(z.string()).max(10),
  questions_to_ask_next: z.array(z.string()).max(8),
  summary: z.string(),
});

export type AnalysisResult = z.infer<typeof AnalysisSchema>;

const SUPPORTED = [
  "Autism Spectrum Disorder",
  "Developmental Language Disorder",
  "Articulation Disorder",
  "Phonological Disorder",
  "Childhood Apraxia of Speech",
  "Dysarthria",
  "Stuttering",
  "Voice Disorders",
  "Hearing Loss Related Speech Disorders",
  "Aphasia",
  "Selective Mutism",
  "Cleft Palate Speech Disorder",
  "Resonance Disorders",
];

const SYSTEM_PROMPT = `You are a clinical decision support assistant for Speech-Language Pathologists, Audiologists, and BASLP students.
You analyze pediatric/adult case histories and produce RANKED, NON-DIAGNOSTIC suggestions only.

Rules:
- Never state a confirmed diagnosis. Use words like "consistent with", "possible", "consider".
- Restrict possible_conditions primarily to this supported list (you may include "Other / Needs further evaluation"): ${SUPPORTED.join(", ")}.
- Provide a confidence score (0-100) per condition reflecting how well the history matches.
- Recommended assessments should be real, named SLP/Audiology tools (e.g., REELS, CELF, GFTA-3, Khan-Lewis, SSI-4, CAPE-V, PPVT, Boston Naming, MASA, Bzoch Error Pattern, Pure-tone audiometry, OAE, ABR, etc.) when appropriate.
- Materials should be concrete (picture cards, oromotor kit, articulation deck, AAC board, mirror, tongue depressor, audiometer, etc.).
- Therapy goals should be measurable and SLP-appropriate (e.g., "Produce /s/ in initial position in 8/10 trials across 3 sessions").
- Keep each list item concise (one line).`;

export const analyzeCase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CaseInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI service is not configured.");

    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("cases")
      .select("*")
      .eq("id", data.caseId)
      .eq("user_id", userId)
      .single();
    if (error || !row) throw new Error("Case not found.");

    const caseText = `
Name: ${cap(row.name, 200)}
Age: ${cap(row.age, 50)}
Gender: ${cap(row.gender, 50)}
Chief Complaint: ${cap(row.chief_complaint)}
Prenatal History: ${cap(row.prenatal_history)}
Natal History: ${cap(row.natal_history)}
Postnatal History: ${cap(row.postnatal_history)}
Motor Milestones: ${cap(row.motor_milestones)}
Speech Milestones: ${cap(row.speech_milestones)}
Language History: ${cap(row.language_history)}
Hearing History: ${cap(row.hearing_history)}
Education History: ${cap(row.education_history)}
Family History: ${cap(row.family_history)}
Additional Notes: ${cap(row.additional_notes)}
`.trim();

    if (caseText.length > 20000) {
      throw new Error("Case history is too long. Please shorten the entries and try again.");
    }

    const gateway = createLovableAiGatewayProvider(apiKey);

    const jsonInstructions = `Return ONLY a single valid JSON object matching this exact TypeScript type — no markdown, no code fences, no commentary:
{
  "possible_conditions": Array<{ "name": string, "confidence": number /* 0-100 */, "rationale": string }>, // 1-6 items
  "differential_diagnoses": string[], // up to 8
  "recommended_assessments": string[], // up to 10
  "materials_required": string[], // up to 10
  "therapy_goals": string[], // up to 10
  "questions_to_ask_next": string[], // up to 8
  "summary": string
}
Use plain numbers (e.g. 85, not "85" or 8,5). Escape any quotes inside strings. If a field has no content, use an empty array or empty string. Output JSON only.`;

    try {
      const { text } = await generateText({
        model: gateway("google/gemini-3-flash-preview"),
        system: SYSTEM_PROMPT + "\n\n" + jsonInstructions,
        prompt: `Analyze the following case history and produce ranked clinical suggestions as JSON.\n\nCASE HISTORY:\n${caseText}\n\nRespond with the JSON object only.`,
      const safe = "AI analysis failed. Please try again later.";
      console.error("[analyzeCase] AI error:", msg);
      throw new Error(safe);
    }
  });

function cap(v: unknown, max = 4000): string {
  const s = v == null ? "" : String(v);
  return s.length > max ? s.slice(0, max) + "…[truncated]" : s;
}

      const parsed = extractJSON(text);
      const output = AnalysisSchema.parse(normalizeAnalysis(parsed));

      const { error: upErr } = await supabase
        .from("cases")
        .update({ analysis: JSON.parse(JSON.stringify(output)) })
        .eq("id", data.caseId)
        .eq("user_id", userId);
      if (upErr) throw upErr;

      return output;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("429")) throw new Error("AI rate limit reached. Please try again shortly.");
      if (msg.includes("402"))
        throw new Error("AI credits exhausted. Please add credits in workspace billing.");
      throw new Error(`AI analysis failed: ${msg}`);
    }
  });

function extractJSON(raw: string): unknown {
  let s = raw.trim();
  s = s.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  if (!s.startsWith("{") && !s.startsWith("[")) {
    const start = s.indexOf("{");
    const end = s.lastIndexOf("}");
    if (start !== -1 && end > start) s = s.slice(start, end + 1);
    else throw new Error("No JSON object found in AI response");
  }
  try {
    return JSON.parse(s);
  } catch {
    const start = s.indexOf("{");
    const end = s.lastIndexOf("}");
    if (start !== -1 && end > start) return JSON.parse(s.slice(start, end + 1));
    throw new Error("Failed to parse AI JSON response");
  }
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => (typeof x === "string" ? x : String(x ?? ""))).filter(Boolean);
}

function normalizeAnalysis(input: unknown): unknown {
  const o = (input ?? {}) as Record<string, unknown>;
  const rawConds = Array.isArray(o.possible_conditions) ? o.possible_conditions : [];
  const possible_conditions = rawConds
    .map((c) => {
      const x = (c ?? {}) as Record<string, unknown>;
      const conf = typeof x.confidence === "number" ? x.confidence : Number(x.confidence ?? 0);
      return {
        name: String(x.name ?? "Unspecified"),
        confidence: Math.max(0, Math.min(100, Number.isFinite(conf) ? conf : 0)),
        rationale: String(x.rationale ?? ""),
      };
    })
    .filter((c) => c.name);
  return {
    possible_conditions: possible_conditions.length
      ? possible_conditions.slice(0, 6)
      : [{ name: "Needs further evaluation", confidence: 0, rationale: "Insufficient information." }],
    differential_diagnoses: asStringArray(o.differential_diagnoses).slice(0, 8),
    recommended_assessments: asStringArray(o.recommended_assessments).slice(0, 10),
    materials_required: asStringArray(o.materials_required).slice(0, 10),
    therapy_goals: asStringArray(o.therapy_goals).slice(0, 10),
    questions_to_ask_next: asStringArray(o.questions_to_ask_next).slice(0, 8),
    summary: String(o.summary ?? ""),
  };
}
