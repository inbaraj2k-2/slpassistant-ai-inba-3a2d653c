// Shared implementation of the AI case-analysis workflow. Used by both the
// TanStack server function (src/lib/analyze.functions.ts, called from the
// web/SSR app) and the raw HTTP route (src/routes/api/analyze.ts, called
// from the Capacitor Android app over HTTPS with CORS).
import type { SupabaseClient } from "@supabase/supabase-js";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import type { Database } from "@/integrations/supabase/types";

export const AnalysisSchema = z.object({
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
  recommended_assessments: z.array(z.string()).max(20),
  materials_required: z.array(z.string()).max(20),
  therapy_goals: z.array(z.string()).max(20),
  questions_to_ask_next: z.array(z.string()).max(8),
  clinical_sources: z
    .array(
      z.object({
        disorder_name: z.string(),
        primary_source: z.string().nullable(),
        secondary_source: z.string().nullable(),
        verification_status: z.string().nullable(),
        kind: z.string(),
      }),
    )
    .default([]),
  unmatched_conditions: z.array(z.string()).default([]),
  summary: z.string(),
});

export type AnalysisResult = z.infer<typeof AnalysisSchema>;

function norm(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

function cap(v: unknown, max = 4000): string {
  const s = v == null ? "" : String(v);
  return s.length > max ? s.slice(0, max) + "…[truncated]" : s;
}

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

export async function runAnalyzeCase(params: {
  supabase: SupabaseClient<Database>;
  userId: string;
  caseId: string;
}): Promise<AnalysisResult> {
  const { supabase, userId, caseId } = params;
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("AI service is not configured.");

  const { data: row, error } = await supabase
    .from("cases")
    .select("*")
    .eq("id", caseId)
    .eq("user_id", userId)
    .single();
  if (error || !row) throw new Error("Case not found.");

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: disorderRows, error: dErr } = await supabaseAdmin
    .from("disorders")
    .select("id, name, parent_id");
  if (dErr) throw dErr;
  const disorderList = (disorderRows ?? []).map((d) => d.name);
  const byNorm = new Map<string, { id: string; name: string; parent_id: string | null }>();
  const byId = new Map<string, { id: string; name: string; parent_id: string | null }>();
  for (const d of disorderRows ?? []) {
    const rec = { id: d.id, name: d.name, parent_id: d.parent_id ?? null };
    byNorm.set(norm(d.name), rec);
    byId.set(d.id, rec);
  }

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

  const systemPrompt = `You are a clinical decision support assistant for Speech-Language Pathologists, Audiologists, and BASLP students.
You analyze pediatric/adult case histories and produce RANKED, NON-DIAGNOSTIC suggestions only.

Rules:
- Never state a confirmed diagnosis. Use words like "consistent with", "possible", "consider".
- Rank possible_conditions by strongest clinical evidence first. Prefer one primary condition unless the history strongly supports multiple distinct conditions.
- Avoid broad, overlapping, or non-specific disorders unless the case history clearly justifies them.
- For possible_conditions, ONLY use names from this authoritative clinical catalog (copy exactly):
${disorderList.map((n) => `  - ${n}`).join("\n")}
- Provide a confidence score (0-100) per condition reflecting how well the history matches. Do not inflate certainty; use lower confidence when the evidence is limited, mixed, or broad.
- Provide a concise rationale per condition (one or two sentences) that explains why the condition fits the case and why it ranks above alternatives.
- Provide differential_diagnoses that are clinically meaningful alternatives to the top-ranked condition, not generic or overly broad possibilities.
- Provide questions_to_ask_next that help distinguish the leading condition from alternatives and clarify the most important next-step information.
- Do NOT generate assessments, materials, therapy goals, or clinical sources — those are retrieved automatically from the clinical database based on the conditions you select.
- Keep each list item concise (one line).`;

  const gateway = createLovableAiGatewayProvider(apiKey);

  const jsonInstructions = `Return ONLY a single valid JSON object with this shape — no markdown, no code fences:
{
  "possible_conditions": Array<{ "name": string, "confidence": number, "rationale": string }>,
  "differential_diagnoses": string[],
  "questions_to_ask_next": string[],
  "summary": string
}
Use plain numbers (e.g. 85). Output JSON only.`;

  let aiOut: {
    possible_conditions: { name: string; confidence: number; rationale: string }[];
    differential_diagnoses: string[];
    questions_to_ask_next: string[];
    summary: string;
  };
  try {
    const { text } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      system: systemPrompt + "\n\n" + jsonInstructions,
      prompt: `Analyze the following case history and produce ranked clinical suggestions as JSON.\n\nCASE HISTORY:\n${caseText}\n\nRespond with the JSON object only.`,
    });
    const parsed = extractJSON(text) as Record<string, unknown>;
    aiOut = {
      possible_conditions: Array.isArray(parsed.possible_conditions)
        ? parsed.possible_conditions.map((c) => {
            const x = (c ?? {}) as Record<string, unknown>;
            const conf = typeof x.confidence === "number" ? x.confidence : Number(x.confidence ?? 0);
            return {
              name: String(x.name ?? "Unspecified"),
              confidence: Math.max(0, Math.min(100, Number.isFinite(conf) ? conf : 0)),
              rationale: String(x.rationale ?? ""),
            };
          })
        : [],
      differential_diagnoses: asStringArray(parsed.differential_diagnoses).slice(0, 8),
      questions_to_ask_next: asStringArray(parsed.questions_to_ask_next).slice(0, 8),
      summary: String(parsed.summary ?? ""),
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("429")) throw new Error("AI rate limit reached. Please try again shortly.");
    if (msg.includes("402"))
      throw new Error("AI credits exhausted. Please add credits in workspace billing.");
    console.error("[analyzeCase] AI error:", msg);
    throw new Error("AI analysis failed. Please try again later.");
  }

  const matched: { id: string; name: string; confidence: number }[] = [];
  const unmatched: string[] = [];
  const seenIds = new Set<string>();
  for (const c of aiOut.possible_conditions) {
    const key = norm(c.name);
    let hit = byNorm.get(key);
    if (!hit) {
      for (const [k, v] of byNorm) {
        if (k.includes(key) || key.includes(k)) {
          hit = v;
          break;
        }
      }
    }
    if (hit) {
      if (!seenIds.has(hit.id)) {
        seenIds.add(hit.id);
        matched.push({ id: hit.id, name: hit.name, confidence: c.confidence });
      }
    } else {
      unmatched.push(c.name);
    }
  }

  const parentIdsToAdd = new Set<string>();
  for (const m of matched) {
    const rec = byId.get(m.id);
    if (rec?.parent_id && !seenIds.has(rec.parent_id)) parentIdsToAdd.add(rec.parent_id);
  }
  for (const pid of parentIdsToAdd) {
    const parent = byId.get(pid);
    if (!parent) continue;
    const childConfs = matched
      .filter((m) => byId.get(m.id)?.parent_id === pid)
      .map((m) => m.confidence);
    const conf = childConfs.length ? Math.max(...childConfs) : 0;
    seenIds.add(pid);
    matched.push({ id: pid, name: parent.name, confidence: conf });
  }

  let assessments: string[] = [];
  let materials: string[] = [];
  let therapyGoals: string[] = [];
  let clinicalSources: AnalysisResult["clinical_sources"] = [];

  if (matched.length > 0) {
    const baseIds = matched.map((m) => m.id);
    const { data: childRows } = await supabaseAdmin
      .from("disorders")
      .select("id, parent_id")
      .in("parent_id", baseIds);
    const childIds = (childRows ?? []).map((c) => c.id);
    const ids = [...new Set([...baseIds, ...childIds])];
    const weight = new Map<string, number>();
    for (const m of matched) weight.set(m.id, m.confidence || 1);
    for (const c of childRows ?? []) {
      if (!weight.has(c.id)) weight.set(c.id, weight.get(c.parent_id!) ?? 1);
    }

    const [aRes, mRes, gRes, sRes] = await Promise.all([
      supabaseAdmin.from("assessments").select("disorder_id, name").in("disorder_id", ids),
      supabaseAdmin.from("materials").select("disorder_id, name").in("disorder_id", ids),
      supabaseAdmin.from("therapy_goals").select("disorder_id, goal").in("disorder_id", ids),
      supabaseAdmin
        .from("clinical_sources")
        .select("disorder_id, disorder_name, primary_source, secondary_source, verification_status, kind")
        .in("disorder_id", ids),
    ]);

    const mergeRank = (rows: { disorder_id: string; label: string }[]) => {
      const scores = new Map<string, { label: string; score: number }>();
      for (const r of rows) {
        const k = norm(r.label);
        const w = weight.get(r.disorder_id) ?? 1;
        const cur = scores.get(k);
        if (cur) cur.score += w;
        else scores.set(k, { label: r.label, score: w });
      }
      return [...scores.values()].sort((a, b) => b.score - a.score).map((x) => x.label);
    };

    assessments = mergeRank(
      (aRes.data ?? []).map((r) => ({ disorder_id: r.disorder_id, label: r.name })),
    ).slice(0, 20);
    materials = mergeRank(
      (mRes.data ?? []).map((r) => ({ disorder_id: r.disorder_id, label: r.name })),
    ).slice(0, 20);
    therapyGoals = mergeRank(
      (gRes.data ?? []).map((r) => ({ disorder_id: r.disorder_id, label: r.goal })),
    ).slice(0, 20);
    clinicalSources = (sRes.data ?? []).map((r) => ({
      disorder_name: r.disorder_name,
      primary_source: r.primary_source,
      secondary_source: r.secondary_source,
      verification_status: r.verification_status,
      kind: r.kind,
    }));
  }

  const output = AnalysisSchema.parse({
    possible_conditions: matched.length
      ? matched.map((m) => ({
          name: m.name,
          confidence: m.confidence,
          rationale:
            aiOut.possible_conditions.find((c) => norm(c.name) === norm(m.name))?.rationale ||
            aiOut.possible_conditions.find(
              (c) => norm(m.name).includes(norm(c.name)) || norm(c.name).includes(norm(m.name)),
            )?.rationale ||
            "",
        }))
      : [
          {
            name: "Needs further evaluation",
            confidence: 0,
            rationale: "No matching condition in the clinical catalog.",
          },
        ],
    differential_diagnoses: aiOut.differential_diagnoses,
    recommended_assessments: assessments,
    materials_required: materials,
    therapy_goals: therapyGoals,
    questions_to_ask_next: aiOut.questions_to_ask_next,
    clinical_sources: clinicalSources,
    unmatched_conditions: unmatched,
    summary: aiOut.summary,
  });

  const { error: upErr } = await supabase
    .from("cases")
    .update({ analysis: JSON.parse(JSON.stringify(output)) })
    .eq("id", caseId)
    .eq("user_id", userId);
  if (upErr) throw upErr;

  return output;
}

export async function runDeleteMyAccount(userId: string): Promise<{ ok: boolean }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
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
  await supabaseAdmin.from("user_uploads").delete().eq("user_id", userId);
  await supabaseAdmin.from("cases").delete().eq("user_id", userId);
  await supabaseAdmin.from("profiles").delete().eq("id", userId);
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (error) throw new Error(error.message);
  return { ok: true };
}
