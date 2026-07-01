import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const NamesInput = z.object({ names: z.array(z.string()).max(20) });

export type LinkedItem = { name: string; source_reference: string | null };
export type ClinicalSource = {
  disorder_name: string;
  primary_source: string | null;
  secondary_source: string | null;
  verification_status: string | null;
  kind: string;
};

export type ClinicalLinkedContent = {
  matched: { input: string; resolved: string; disorder_id: string }[];
  unmatched: string[];
  assessments: LinkedItem[];
  materials: LinkedItem[];
  therapy_goals: LinkedItem[];
  clinical_sources: ClinicalSource[];
};

function norm(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Public server fn — reads only reference data. Uses admin client (RLS bypass safe; public-read tables).
export const getClinicalContentByDisorders = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => NamesInput.parse(d))
  .handler(async ({ data }): Promise<ClinicalLinkedContent> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: allDisorders, error } = await supabaseAdmin
      .from("disorders")
      .select("id, name");
    if (error) throw error;

    const byNorm = new Map<string, { id: string; name: string }>();
    for (const d of allDisorders ?? []) byNorm.set(norm(d.name), { id: d.id, name: d.name });

    const matched: ClinicalLinkedContent["matched"] = [];
    const unmatched: string[] = [];
    for (const input of data.names) {
      const key = norm(input);
      let hit = byNorm.get(key);
      if (!hit) {
        // contains-match fallback
        for (const [k, v] of byNorm) {
          if (k.includes(key) || key.includes(k)) {
            hit = v;
            break;
          }
        }
      }
      if (hit) matched.push({ input, resolved: hit.name, disorder_id: hit.id });
      else unmatched.push(input);
    }

    const ids = [...new Set(matched.map((m) => m.disorder_id))];
    if (ids.length === 0) {
      return { matched, unmatched, assessments: [], materials: [], therapy_goals: [], clinical_sources: [] };
    }

    // Expand any parent disorders to include their children, so aggregated
    // content surfaces automatically when the umbrella term is selected.
    const { data: childRows } = await supabaseAdmin
      .from("disorders")
      .select("id, parent_id")
      .in("parent_id", ids);
    const expandedIds = [...new Set([...ids, ...(childRows ?? []).map((c) => c.id)])];

    const [aRes, mRes, gRes, sRes] = await Promise.all([
      supabaseAdmin.from("assessments").select("name, source_reference").in("disorder_id", expandedIds),
      supabaseAdmin.from("materials").select("name, source_reference").in("disorder_id", expandedIds),
      supabaseAdmin.from("therapy_goals").select("goal, source_reference").in("disorder_id", expandedIds),
      supabaseAdmin
        .from("clinical_sources")
        .select("disorder_name, primary_source, secondary_source, verification_status, kind")
        .in("disorder_id", expandedIds),
    ]);

    const dedupe = <T extends { name: string }>(rows: T[]): T[] => {
      const seen = new Set<string>();
      const out: T[] = [];
      for (const r of rows) {
        const k = norm(r.name);
        if (!seen.has(k)) {
          seen.add(k);
          out.push(r);
        }
      }
      return out;
    };

    const assessments = dedupe((aRes.data ?? []).map((r) => ({ name: r.name, source_reference: r.source_reference })));
    const materials = dedupe((mRes.data ?? []).map((r) => ({ name: r.name, source_reference: r.source_reference })));
    const therapy_goals = dedupe(
      (gRes.data ?? []).map((r) => ({ name: r.goal, source_reference: r.source_reference })),
    );

    return {
      matched,
      unmatched,
      assessments,
      materials,
      therapy_goals,
      clinical_sources: (sRes.data ?? []) as ClinicalSource[],
    };
  });

export const getKbStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const tables = ["disorders", "assessments", "materials", "therapy_goals", "clinical_sources"] as const;
  const counts: Record<string, number> = {};
  for (const t of tables) {
    const { count, error } = await supabaseAdmin.from(t).select("*", { count: "exact", head: true });
    if (error) throw error;
    counts[t] = count ?? 0;
  }

  // relationship errors: orphan children (shouldn't happen due to FK), and disorders with no children
  const { data: disorders } = await supabaseAdmin.from("disorders").select("id, name");
  const allIds = (disorders ?? []).map((d) => d.id);
  const checkMissing = async (table: "assessments" | "materials" | "therapy_goals") => {
    const { data } = await supabaseAdmin.from(table).select("disorder_id");
    const present = new Set((data ?? []).map((r) => r.disorder_id));
    return (disorders ?? []).filter((d) => !present.has(d.id)).map((d) => d.name);
  };
  const [missingAssessments, missingMaterials, missingGoals] = await Promise.all([
    checkMissing("assessments"),
    checkMissing("materials"),
    checkMissing("therapy_goals"),
  ]);

  const { data: srcRows } = await supabaseAdmin.from("clinical_sources").select("disorder_id, disorder_name");
  const sourcedIds = new Set((srcRows ?? []).map((r) => r.disorder_id).filter(Boolean));
  const missingSources = (disorders ?? []).filter((d) => !sourcedIds.has(d.id)).map((d) => d.name);
  const orphanSources = (srcRows ?? [])
    .filter((r) => r.disorder_id === null)
    .map((r) => r.disorder_name);

  return {
    counts,
    totals: { disorders: allIds.length },
    relationship_errors: {
      disorders_missing_assessments: missingAssessments,
      disorders_missing_materials: missingMaterials,
      disorders_missing_therapy_goals: missingGoals,
      disorders_missing_clinical_sources: missingSources,
      orphan_clinical_sources: orphanSources,
    },
  };
});

export const listKnowledgeBase = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: disorders, error } = await supabaseAdmin
    .from("disorders")
    .select("id, name, category, symptoms, red_flags, source_reference")
    .order("category", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw error;

  const [a, m, g, s] = await Promise.all([
    supabaseAdmin.from("assessments").select("disorder_id, name, source_reference"),
    supabaseAdmin.from("materials").select("disorder_id, name, source_reference"),
    supabaseAdmin.from("therapy_goals").select("disorder_id, goal, source_reference"),
    supabaseAdmin.from("clinical_sources").select("disorder_id, primary_source, secondary_source, verification_status, kind"),
  ]);

  const group = <T extends { disorder_id: string | null }>(rows: T[] | null) => {
    const map = new Map<string, T[]>();
    for (const r of rows ?? []) {
      if (!r.disorder_id) continue;
      const arr = map.get(r.disorder_id) ?? [];
      arr.push(r);
      map.set(r.disorder_id, arr);
    }
    return map;
  };
  const aMap = group(a.data);
  const mMap = group(m.data);
  const gMap = group(g.data);
  const sMap = group(s.data);

  return (disorders ?? []).map((d) => ({
    id: d.id,
    name: d.name,
    category: d.category ?? "Uncategorized",
    symptoms: d.symptoms ?? "",
    red_flags: d.red_flags ?? "",
    source_reference: d.source_reference ?? "",
    assessments: aMap.get(d.id) ?? [],
    materials: mMap.get(d.id) ?? [],
    therapy_goals: gMap.get(d.id) ?? [],
    clinical_sources: sMap.get(d.id) ?? [],
  }));
});
