/**
 * Offline-first Knowledge Base loader.
 *
 * Priority:
 *   1. Bundled snapshot (public/kb-snapshot.json) — always fastest, works offline
 *   2. Live Supabase fetch (anon publishable key)
 *   3. localStorage cache (populated on any successful live fetch)
 */
import { supabase } from "@/integrations/supabase/client";

export type KbAssessment = { disorder_id: string; name: string; source_reference: string | null };
export type KbMaterial = { disorder_id: string; name: string; source_reference: string | null };
export type KbGoal = { disorder_id: string; goal: string; source_reference: string | null };
export type KbSource = {
  disorder_id: string;
  primary_source: string | null;
  secondary_source: string | null;
  verification_status: string | null;
  kind: string;
};
export type KbDisorder = {
  id: string;
  name: string;
  category: string | null;
  symptoms: string | null;
  red_flags: string | null;
  source_reference: string | null;
  parent_id?: string | null;
};

export type KbEntry = {
  id: string;
  name: string;
  category: string;
  symptoms: string;
  red_flags: string;
  source_reference: string;
  assessments: { name: string; source_reference: string | null }[];
  materials: { name: string; source_reference: string | null }[];
  therapy_goals: { goal: string; source_reference: string | null }[];
  clinical_sources: {
    primary_source: string | null;
    secondary_source: string | null;
    verification_status: string | null;
    kind: string;
  }[];
};

type Snapshot = {
  generated_at: string | null;
  empty?: boolean;
  disorders?: KbDisorder[];
  assessments?: KbAssessment[];
  materials?: KbMaterial[];
  therapy_goals?: KbGoal[];
  clinical_sources?: KbSource[];
};

const CACHE_KEY = "kb:v1";

function assemble(snap: Required<Omit<Snapshot, "generated_at" | "empty">>): KbEntry[] {
  const aMap = new Map<string, KbEntry["assessments"]>();
  const mMap = new Map<string, KbEntry["materials"]>();
  const gMap = new Map<string, KbEntry["therapy_goals"]>();
  const sMap = new Map<string, KbEntry["clinical_sources"]>();
  for (const r of snap.assessments) {
    const arr = aMap.get(r.disorder_id) ?? [];
    arr.push({ name: r.name, source_reference: r.source_reference });
    aMap.set(r.disorder_id, arr);
  }
  for (const r of snap.materials) {
    const arr = mMap.get(r.disorder_id) ?? [];
    arr.push({ name: r.name, source_reference: r.source_reference });
    mMap.set(r.disorder_id, arr);
  }
  for (const r of snap.therapy_goals) {
    const arr = gMap.get(r.disorder_id) ?? [];
    arr.push({ goal: r.goal, source_reference: r.source_reference });
    gMap.set(r.disorder_id, arr);
  }
  for (const r of snap.clinical_sources) {
    if (!r.disorder_id) continue;
    const arr = sMap.get(r.disorder_id) ?? [];
    arr.push({
      primary_source: r.primary_source,
      secondary_source: r.secondary_source,
      verification_status: r.verification_status,
      kind: r.kind,
    });
    sMap.set(r.disorder_id, arr);
  }
  return snap.disorders
    .slice()
    .sort((a, b) =>
      (a.category ?? "").localeCompare(b.category ?? "") || a.name.localeCompare(b.name),
    )
    .map((d) => ({
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
}

async function loadSnapshot(): Promise<KbEntry[] | null> {
  try {
    const res = await fetch("/kb-snapshot.json", { cache: "force-cache" });
    if (!res.ok) return null;
    const snap = (await res.json()) as Snapshot;
    if (snap.empty || !snap.disorders) return null;
    return assemble({
      disorders: snap.disorders,
      assessments: snap.assessments ?? [],
      materials: snap.materials ?? [],
      therapy_goals: snap.therapy_goals ?? [],
      clinical_sources: snap.clinical_sources ?? [],
    });
  } catch {
    return null;
  }
}

async function loadLive(): Promise<KbEntry[]> {
  const [d, a, m, g, s] = await Promise.all([
    supabase
      .from("disorders")
      .select("id,name,category,symptoms,red_flags,source_reference,parent_id"),
    supabase.from("assessments").select("disorder_id,name,source_reference"),
    supabase.from("materials").select("disorder_id,name,source_reference"),
    supabase.from("therapy_goals").select("disorder_id,goal,source_reference"),
    supabase
      .from("clinical_sources")
      .select("disorder_id,primary_source,secondary_source,verification_status,kind"),
  ]);
  if (d.error) throw d.error;
  return assemble({
    disorders: (d.data ?? []) as KbDisorder[],
    assessments: (a.data ?? []) as KbAssessment[],
    materials: (m.data ?? []) as KbMaterial[],
    therapy_goals: (g.data ?? []) as KbGoal[],
    clinical_sources: (s.data ?? []) as KbSource[],
  });
}

function loadLocalCache(): KbEntry[] | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { entries: KbEntry[] };
    return parsed.entries;
  } catch {
    return null;
  }
}

function saveLocalCache(entries: KbEntry[]) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ entries, saved_at: Date.now() }));
  } catch {
    // quota exceeded — ignore
  }
}

/** Snapshot first, then live (background refresh), then local cache as last resort. */
export async function loadKnowledgeBase(): Promise<KbEntry[]> {
  const snap = await loadSnapshot();
  if (snap && snap.length > 0) {
    // Refresh cache silently — best effort.
    loadLive()
      .then(saveLocalCache)
      .catch(() => {});
    saveLocalCache(snap);
    return snap;
  }
  try {
    const live = await loadLive();
    saveLocalCache(live);
    return live;
  } catch (err) {
    const cached = loadLocalCache();
    if (cached) return cached;
    throw err;
  }
}
