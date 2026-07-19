// Capacitor client shim: reads clinical KB stats from the bundled offline
// snapshot. Everything under Knowledge Base already goes through
// src/lib/kb-offline.ts.
import { loadKnowledgeBase } from "@/lib/kb-offline";

export async function getKbStats() {
  const kb = await loadKnowledgeBase();
  let assessments = 0;
  let materials = 0;
  let therapy_goals = 0;
  let clinical_sources = 0;
  for (const entry of kb) {
    assessments += entry.assessments.length;
    materials += entry.materials.length;
    therapy_goals += entry.therapy_goals.length;
    clinical_sources += entry.clinical_sources.length;
  }
  return { disorders: kb.length, assessments, materials, therapy_goals, clinical_sources };
}
