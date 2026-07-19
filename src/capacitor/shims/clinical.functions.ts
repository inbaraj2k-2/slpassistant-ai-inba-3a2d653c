// Capacitor client shim: reads clinical KB stats from the bundled offline
// snapshot. Everything under Knowledge Base already goes through
// src/lib/kb-offline.ts, so this shim just returns a small tally.
import { loadKnowledgeBase } from "@/lib/kb-offline";

export async function getKbStats() {
  const kb = await loadKnowledgeBase();
  return {
    disorders: kb.disorders.length,
    assessments: kb.assessments.length,
    materials: kb.materials.length,
    therapy_goals: kb.therapy_goals.length,
    clinical_sources: kb.clinical_sources.length,
  };
}
