import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { FileDown, Info, RotateCcw } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Recorder, type RecorderResult } from "@/features/voice/ui/Recorder";
import { ResultsView } from "@/features/voice/ui/ResultsView";
import { analyzeInWorker } from "@/features/voice/dsp/runner";
import type { VoiceAnalysis } from "@/features/voice/dsp/types";
import { buildFindings, overallSeverity } from "@/features/voice/dsp/interpret";
import { summarizeVoice } from "@/lib/voice-summary.functions";
import { exportVoicePDF } from "@/lib/voice-pdf";

export const Route = createFileRoute("/_authenticated/clinical-tools/voice-analysis")({
  head: () => ({
    meta: [
      { title: "Voice Assessment — SLP Assist AI" },
      {
        name: "description",
        content:
          "Professional clinical voice assessment: F0, jitter, shimmer, HNR, CPP, MPT, waveform, pitch contour and spectrogram with AI-assisted interpretation.",
      },
    ],
  }),
  component: VoiceAssessmentPage,
});

type Sex = "male" | "female" | "unknown";
type Status = "idle" | "analyzing" | "done" | "error";

function VoiceAssessmentPage() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<VoiceAnalysis | null>(null);
  const [sourceLabel, setSourceLabel] = useState<string | null>(null);
  const [patientName, setPatientName] = useState("");
  const [ageYears, setAgeYears] = useState<string>("");
  const [sex, setSex] = useState<Sex>("unknown");

  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const summarize = useServerFn(summarizeVoice);
  const summaryReqRef = useRef(0);

  const requestSummary = useCallback(
    async (a: VoiceAnalysis, s: Sex, age: number | null) => {
      const findings = buildFindings(a, s);
      const overall = overallSeverity(findings);
      const reqId = ++summaryReqRef.current;
      setAiLoading(true);
      setAiError(null);
      setAiSummary(null);
      try {
        const { summary } = await summarize({
          data: {
            sex: s,
            ageYears: age,
            durationSec: a.durationSec,
            sampleRate: a.sampleRate,
            f0: { meanHz: a.f0.meanHz, medianHz: a.f0.medianHz, sdHz: a.f0.sdHz },
            jitterLocalPct: a.jitter.localPct,
            shimmerLocalPct: a.shimmer.localPct,
            hnrDb: a.harmonic.hnrDb,
            cppDb: a.harmonic.cppDb,
            mptSec: a.stability.mptSec,
            voiceBreakPct: a.stability.voiceBreakPct,
            overallSeverity: overall === "unavailable" ? "normal" : overall,
            findings: findings.map((f) => ({
              key: f.key,
              label: f.label,
              value: f.value,
              severity: f.severity,
              interpretation: f.interpretation,
              clinicalMeaning: f.clinicalMeaning,
            })),
          },
        });
        if (reqId !== summaryReqRef.current) return;
        setAiSummary(summary);
      } catch (err) {
        if (reqId !== summaryReqRef.current) return;
        setAiError(err instanceof Error ? err.message : "AI summary failed.");
      } finally {
        if (reqId === summaryReqRef.current) setAiLoading(false);
      }
    },
    [summarize],
  );

  const handleCapture = useCallback(
    async (r: RecorderResult) => {
      setStatus("analyzing");
      setError(null);
      setAnalysis(null);
      setAiSummary(null);
      setAiError(null);
      setSourceLabel(r.source === "mic" ? "Microphone capture" : r.fileName ?? "Imported audio");
      try {
        if (r.pcm.length < r.sampleRate * 0.3) {
          throw new Error("Recording too short. Please record at least 0.5s of voice.");
        }
        const a = await analyzeInWorker(r.pcm, r.sampleRate);
        setAnalysis(a);
        setStatus("done");
        void requestSummary(a, sex, ageYears ? parseInt(ageYears, 10) : null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Analysis failed.");
        setStatus("error");
      }
    },
    [requestSummary, sex, ageYears],
  );

  function reset() {
    setStatus("idle");
    setAnalysis(null);
    setError(null);
    setAiSummary(null);
    setAiError(null);
    setSourceLabel(null);
  }

  async function onExport() {
    if (!analysis) return;
    try {
      await exportVoicePDF({
        analysis,
        patientName: patientName || undefined,
        ageYears: ageYears ? parseInt(ageYears, 10) : null,
        sex,
        aiSummary,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "PDF export failed.");
    }
  }

  useEffect(() => {
    if (status !== "done" || !analysis) return;
    void requestSummary(analysis, sex, ageYears ? parseInt(ageYears, 10) : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sex]);

  return (
    <AppShell title="Voice Assessment" subtitle="Clinical acoustic analysis" back>
      <div className="mb-3 rounded-2xl border border-border bg-card p-4 shadow-card">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Patient</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <input
            className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
            placeholder="Name (optional)"
            value={patientName}
            maxLength={80}
            onChange={(e) => setPatientName(e.target.value)}
          />
          <input
            className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
            placeholder="Age (years)"
            inputMode="numeric"
            value={ageYears}
            maxLength={3}
            onChange={(e) => setAgeYears(e.target.value.replace(/\D/g, ""))}
          />
          <select
            className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
            value={sex}
            onChange={(e) => setSex(e.target.value as Sex)}
          >
            <option value="unknown">Sex — not specified</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
          </select>
        </div>
      </div>

      <Recorder onCapture={handleCapture} disabled={status === "analyzing"} />

      {sourceLabel && (
        <p className="mt-2 text-center text-[11px] text-muted-foreground">Source: {sourceLabel}</p>
      )}

      {status === "analyzing" && (
        <div className="mt-4 rounded-2xl border border-border bg-card p-4 text-center text-sm shadow-card">
          Computing acoustic measures…
        </div>
      )}
      {status === "error" && error && (
        <div className="mt-4 rounded-2xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {analysis && status === "done" && (
        <>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={onExport}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-primary px-4 text-sm font-semibold text-primary-foreground shadow-card"
            >
              <FileDown className="h-4 w-4" /> Export PDF report
            </button>
            <button
              onClick={reset}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-secondary px-4 text-sm font-medium text-secondary-foreground"
            >
              <RotateCcw className="h-4 w-4" /> New sample
            </button>
          </div>
          <div className="mt-4">
            <ResultsView analysis={analysis} sex={sex} aiSummary={aiSummary} aiLoading={aiLoading} aiError={aiError} />
          </div>
        </>
      )}

      {status === "idle" && !analysis && (
        <p className="mt-4 flex items-start gap-1.5 text-[11px] text-muted-foreground">
          <Info className="mt-0.5 h-3 w-3 shrink-0" />
          For sustained-phonation measures (jitter, shimmer, HNR, CPP), record a steady /a/ for 3–5 seconds in a quiet
          environment. All DSP runs locally on this device.
        </p>
      )}
    </AppShell>
  );
}
