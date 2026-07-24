import { AlertTriangle, Info } from "lucide-react";
import type { VoiceAnalysis } from "../dsp/types";
import {
  buildFindings,
  overallSeverity,
  qualityRatings,
  severityColor,
  type Severity,
} from "../dsp/interpret";
import { IntensityChart, PitchContourChart, SpectrogramChart, WaveformChart } from "./Charts";

function fmt(n: number | null | undefined, digits = 2, unit = "") {
  return n == null || !isFinite(n) ? "—" : `${n.toFixed(digits)}${unit}`;
}

function Row({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 border-b border-border/60 py-1.5 last:border-none">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium tabular-nums" title={hint}>
        {value}
      </span>
    </div>
  );
}

function SevBadge({ s }: { s: Severity }) {
  const map: Record<Severity, string> = {
    normal: "Normal",
    mild: "Mild",
    moderate: "Moderate",
    severe: "Severe",
    unavailable: "N/A",
  };
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${severityColor[s]}`}>
      {map[s]}
    </span>
  );
}

export function ResultsView({
  analysis,
  sex = "unknown",
  aiSummary,
  aiLoading,
  aiError,
}: {
  analysis: VoiceAnalysis;
  sex?: "male" | "female" | "unknown";
  aiSummary: string | null;
  aiLoading: boolean;
  aiError: string | null;
}) {
  const findings = buildFindings(analysis, sex);
  const overall = overallSeverity(findings);
  const qr = qualityRatings(findings);

  return (
    <div className="space-y-4">
      {(analysis.quality.clipping || (analysis.quality.snrDb != null && analysis.quality.snrDb < 20)) && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-400/40 bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">Recording quality warning</p>
            <p>
              {analysis.quality.clipping && `Clipping detected on ${analysis.quality.clippingPct.toFixed(1)}% of samples. `}
              {analysis.quality.snrDb != null && analysis.quality.snrDb < 20 &&
                `Low SNR (${analysis.quality.snrDb.toFixed(0)} dB) — record in a quieter environment.`}
            </p>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-semibold">Clinical impression</p>
          <SevBadge s={overall} />
        </div>
        <div className="grid grid-cols-5 gap-1.5 text-center text-[10px]">
          {(
            [
              ["Hoarseness", qr.hoarseness],
              ["Breathiness", qr.breathiness],
              ["Roughness", qr.roughness],
              ["Strain", qr.strain],
              ["Asthenia", qr.asthenia],
            ] as [string, Severity][]
          ).map(([label, s]) => (
            <div key={label} className={`rounded-lg p-2 ${severityColor[s]}`}>
              <p className="font-semibold">{label}</p>
              <p className="mt-0.5 capitalize">{s === "unavailable" ? "n/a" : s}</p>
            </div>
          ))}
        </div>
      </div>

      <WaveformChart data={analysis.waveform} />
      <PitchContourChart contour={analysis.pitchContour} />
      <SpectrogramChart spec={analysis.spectrogram} />
      <IntensityChart contour={analysis.intensityContour} />

      <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
        <p className="mb-2 text-sm font-semibold">AI clinical summary</p>
        {aiLoading && <p className="text-xs text-muted-foreground">Generating narrative summary…</p>}
        {aiError && <p className="text-xs text-destructive">{aiError}</p>}
        {aiSummary && <p className="whitespace-pre-wrap text-xs leading-relaxed text-foreground/90">{aiSummary}</p>}
        {!aiLoading && !aiError && !aiSummary && (
          <p className="text-xs text-muted-foreground">No summary yet.</p>
        )}
      </div>

      <div className="space-y-3">
        {findings.map((f) => (
          <div key={f.key} className="rounded-2xl border border-border bg-card p-4 shadow-card">
            <div className="mb-1 flex items-center justify-between">
              <p className="text-sm font-semibold">{f.label}</p>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold tabular-nums">{f.value}</span>
                <SevBadge s={f.severity} />
              </div>
            </div>
            <p className="text-xs text-foreground/80">
              <span className="font-medium">Interpretation:</span> {f.interpretation}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              <span className="font-medium">Clinical meaning:</span> {f.clinicalMeaning}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
          <p className="mb-2 text-sm font-semibold">Fundamental frequency</p>
          <Row label="Mean F0" value={fmt(analysis.f0.meanHz, 1, " Hz")} />
          <Row label="Median (habitual) F0" value={fmt(analysis.f0.medianHz, 1, " Hz")} />
          <Row label="Min F0" value={fmt(analysis.f0.minHz, 1, " Hz")} />
          <Row label="Max F0" value={fmt(analysis.f0.maxHz, 1, " Hz")} />
          <Row label="SD F0" value={fmt(analysis.f0.sdHz, 2, " Hz")} />
          <Row label="Voiced frames" value={`${analysis.f0.voicedFrames}/${analysis.f0.totalFrames}`} />
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
          <p className="mb-2 text-sm font-semibold">Jitter</p>
          <Row label="Local" value={fmt(analysis.jitter.localPct, 3, " %")} />
          <Row label="RAP" value={fmt(analysis.jitter.rapPct, 3, " %")} />
          <Row label="PPQ5" value={fmt(analysis.jitter.ppq5Pct, 3, " %")} />
          <Row label="DDP" value={fmt(analysis.jitter.ddpPct, 3, " %")} />
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
          <p className="mb-2 text-sm font-semibold">Shimmer</p>
          <Row label="Local" value={fmt(analysis.shimmer.localPct, 3, " %")} />
          <Row label="APQ3" value={fmt(analysis.shimmer.apq3Pct, 3, " %")} />
          <Row label="APQ5" value={fmt(analysis.shimmer.apq5Pct, 3, " %")} />
          <Row label="APQ11" value={fmt(analysis.shimmer.apq11Pct, 3, " %")} />
          <Row label="DDA" value={fmt(analysis.shimmer.ddaPct, 3, " %")} />
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
          <p className="mb-2 text-sm font-semibold">Harmonics & stability</p>
          <Row label="HNR" value={fmt(analysis.harmonic.hnrDb, 1, " dB")} />
          <Row label="NHR" value={fmt(analysis.harmonic.nhr, 3)} />
          <Row label="CPP" value={fmt(analysis.harmonic.cppDb, 2, " dB")} />
          <Row label="Voice breaks" value={`${analysis.stability.voiceBreakCount} (${analysis.stability.voiceBreakPct.toFixed(1)}%)`} />
          <Row label="Max phonation time" value={`${analysis.stability.mptSec.toFixed(1)} s`} />
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
          <p className="mb-2 text-sm font-semibold">Energy & recording</p>
          <Row label="Duration" value={`${analysis.durationSec.toFixed(2)} s`} />
          <Row label="Sample rate" value={`${analysis.sampleRate} Hz`} />
          <Row label="Mean intensity" value={`${analysis.energy.meanDbfs.toFixed(1)} dBFS`} />
          <Row label="Peak intensity" value={`${analysis.energy.peakDbfs.toFixed(1)} dBFS`} />
          <Row label="Noise floor" value={`${analysis.quality.noiseFloorDbfs.toFixed(1)} dBFS`} />
          <Row label="SNR" value={analysis.quality.snrDb != null ? `${analysis.quality.snrDb.toFixed(1)} dB` : "—"} />
        </div>
      </div>

      <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
        <Info className="mt-0.5 h-3 w-3 shrink-0" />
        Measurements computed locally from the raw PCM signal using standard published algorithms. AI-assisted interpretation is decision support only and does not constitute a diagnosis.
      </p>
    </div>
  );
}
