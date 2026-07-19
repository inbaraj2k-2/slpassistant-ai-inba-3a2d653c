// Capacitor client shim for analyzeCase — replaces the createServerFn version
// in the mobile bundle. In the mobile app the server function is reached over
// HTTPS at the published origin via the fetch interceptor in main-capacitor.tsx.
// We reuse the RPC by POSTing to /_serverFn/analyzeCase, but to keep this
// resilient and simple we call the same-origin REST route exposed under
// /api/analyze on the published Cloudflare Worker.

import { supabase } from "@/integrations/supabase/client";

export type AnalysisResult = {
  possible_conditions: { name: string; confidence: number; rationale: string }[];
  differential_diagnoses: string[];
  recommended_assessments: string[];
  materials_required: string[];
  therapy_goals: string[];
  questions_to_ask_next: string[];
  clinical_sources: {
    disorder_name: string;
    primary_source: string | null;
    secondary_source: string | null;
    verification_status: string | null;
    kind: string;
  }[];
  unmatched_conditions: string[];
  summary: string;
};

// The URL is rewritten to the remote origin by the fetch interceptor in
// src/main-capacitor.tsx, so /api/analyze becomes https://<remote>/api/analyze.
async function callRemote<T>(path: string, body: unknown): Promise<T> {
  const { data: sess } = await supabase.auth.getSession();
  const token = sess.session?.access_token;
  if (!token) throw new Error("Please sign in to use AI analysis.");
  const res = await fetch(
    `https://slpassistant-ai-inba.lovable.app${path}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

export async function analyzeCase(input: { data: { caseId: string } }): Promise<AnalysisResult> {
  return callRemote<AnalysisResult>("/api/analyze", input.data);
}
