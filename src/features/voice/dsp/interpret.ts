// Rule-based clinical interpretation from published adult reference ranges.
// Values are reproducible; the LLM only writes the narrative summary.
// Sources: Teixeira et al. 2013; Boersma 1993; Hillenbrand & Houde 1996.
import type { VoiceAnalysis } from "./types";

export type Severity = "normal" | "mild" | "moderate" | "severe" | "unavailable";

export type Finding = {
  key: string;
  label: string;
  value: string;
  severity: Severity;
  interpretation: string;
  clinicalMeaning: string;
};

const sev = (s: Severity) => s;

function jitterSeverity(pct: number | null): Severity {
  if (pct == null) return "unavailable";
  if (pct < 1.04) return "normal";
  if (pct < 2.0) return "mild";
  if (pct < 4.0) return "moderate";
  return "severe";
}
function shimmerSeverity(pct: number | null): Severity {
  if (pct == null) return "unavailable";
  if (pct < 3.81) return "normal";
  if (pct < 6.0) return "mild";
  if (pct < 10.0) return "moderate";
  return "severe";
}
function hnrSeverity(db: number | null): Severity {
  if (db == null) return "unavailable";
  if (db >= 20) return "normal";
  if (db >= 15) return "mild";
  if (db >= 10) return "moderate";
  return "severe";
}
function cppSeverity(db: number | null): Severity {
  if (db == null) return "unavailable";
  if (db >= 14) return "normal";
  if (db >= 10) return "mild";
  if (db >= 7) return "moderate";
  return "severe";
}
function mptSeverity(sec: number, sex: "male" | "female" | "unknown"): Severity {
  const cut = sex === "female" ? [15, 12, 8] : [20, 15, 10];
  if (sec >= cut[0]) return "normal";
  if (sec >= cut[1]) return "mild";
  if (sec >= cut[2]) return "moderate";
  return "severe";
}

export function buildFindings(a: VoiceAnalysis, sex: "male" | "female" | "unknown" = "unknown"): Finding[] {
  const findings: Finding[] = [];
  const j = a.jitter.localPct;
  findings.push({
    key: "jitter",
    label: "Jitter (local)",
    value: j != null ? `${j.toFixed(2)} %` : "unavailable",
    severity: jitterSeverity(j),
    interpretation:
      j == null
        ? "Insufficient voiced cycles to compute frequency perturbation."
        : j < 1.04
        ? "Cycle-to-cycle frequency variation within normal limits."
        : "Elevated cycle-to-cycle frequency variation suggesting reduced vocal fold stability.",
    clinicalMeaning:
      j == null
        ? "Ask the patient to sustain a vowel for 3–5 seconds and re-record."
        : j < 1.04
        ? "No evidence of frequency instability from this sample."
        : "May indicate dysphonia, laryngeal tension, or reduced phonatory control.",
  });

  const s = a.shimmer.localPct;
  findings.push({
    key: "shimmer",
    label: "Shimmer (local)",
    value: s != null ? `${s.toFixed(2)} %` : "unavailable",
    severity: shimmerSeverity(s),
    interpretation:
      s == null
        ? "Insufficient voiced cycles to compute amplitude perturbation."
        : s < 3.81
        ? "Amplitude perturbation within normal limits."
        : "Elevated amplitude perturbation suggesting reduced glottal efficiency.",
    clinicalMeaning:
      s == null
        ? "Record a longer sustained /a/ sample."
        : s < 3.81
        ? "Glottal amplitude control appears intact."
        : "May indicate incomplete vocal fold closure, oedema, or mass lesion.",
  });

  const h = a.harmonic.hnrDb;
  findings.push({
    key: "hnr",
    label: "HNR",
    value: h != null ? `${h.toFixed(1)} dB` : "unavailable",
    severity: hnrSeverity(h),
    interpretation:
      h == null
        ? "Could not compute harmonic-to-noise ratio."
        : h >= 20
        ? "Strong harmonic structure with low turbulent noise."
        : "Reduced harmonic quality with increased noise component.",
    clinicalMeaning:
      h == null
        ? "Sample too short or unvoiced."
        : h >= 20
        ? "Consistent with a periodic, well-supported voice."
        : "Suggests degraded voice quality; consider breathiness or hoarseness.",
  });

  const c = a.harmonic.cppDb;
  findings.push({
    key: "cpp",
    label: "CPP",
    value: c != null ? `${c.toFixed(1)} dB` : "unavailable",
    severity: cppSeverity(c),
    interpretation:
      c == null
        ? "Cepstral peak could not be resolved."
        : c >= 14
        ? "Prominent cepstral peak consistent with periodic voicing."
        : "Reduced cepstral peak prominence.",
    clinicalMeaning:
      c == null
        ? "Recording may be too noisy or non-voiced."
        : c >= 14
        ? "Overall voice quality within expected range."
        : "One of the strongest single correlates of overall dysphonia severity.",
  });

  findings.push({
    key: "mpt",
    label: "Maximum Phonation Time",
    value: `${a.stability.mptSec.toFixed(1)} s`,
    severity: mptSeverity(a.stability.mptSec, sex),
    interpretation:
      a.stability.mptSec >= (sex === "female" ? 15 : 20)
        ? "Adequate breath support and glottal valving."
        : "Reduced maximum phonation time.",
    clinicalMeaning:
      a.stability.mptSec >= (sex === "female" ? 15 : 20)
        ? "Respiratory-laryngeal coordination within functional range."
        : "May reflect reduced respiratory support or glottic incompetence.",
  });

  return findings;
}

export function qualityRatings(findings: Finding[]) {
  const by = Object.fromEntries(findings.map((f) => [f.key, f.severity])) as Record<string, Severity>;
  const w: Record<Severity, number> = { normal: 0, mild: 1, moderate: 2, severe: 3, unavailable: 0 };
  const worst = (keys: string[]): Severity => {
    let sv: Severity = "normal";
    for (const k of keys) if (w[by[k] ?? "unavailable"] > w[sv]) sv = by[k];
    return sv;
  };
  return {
    hoarseness: worst(["jitter", "shimmer", "hnr", "cpp"]),
    breathiness: worst(["hnr", "cpp"]),
    roughness: worst(["jitter", "shimmer"]),
    strain: worst(["cpp"]),
    asthenia: worst(["mpt"]),
  };
}

export function overallSeverity(findings: Finding[]): Severity {
  const order: Severity[] = ["normal", "mild", "moderate", "severe"];
  let idx = 0;
  for (const f of findings) {
    const i = order.indexOf(f.severity);
    if (i > idx) idx = i;
  }
  return order[idx];
}

export const severityColor: Record<Severity, string> = {
  normal: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  mild: "bg-amber-400/20 text-amber-800 dark:text-amber-200",
  moderate: "bg-orange-500/20 text-orange-800 dark:text-orange-200",
  severe: "bg-red-500/20 text-red-800 dark:text-red-200",
  unavailable: "bg-muted text-muted-foreground",
};
