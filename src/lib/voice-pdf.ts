import jsPDF from "jspdf";
import type { VoiceAnalysis } from "@/features/voice/dsp/types";
import { buildFindings, overallSeverity, qualityRatings } from "@/features/voice/dsp/interpret";
import { downloadToDevice, isNative } from "./native";

export async function exportVoicePDF(opts: {
  analysis: VoiceAnalysis;
  patientName?: string;
  ageYears?: number | null;
  sex?: "male" | "female" | "unknown";
  clinicianName?: string;
  aiSummary?: string | null;
}) {
  const { analysis: a } = opts;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 48;
  let y = M;

  const ensure = (lines = 1, lh = 14) => {
    if (y + lines * lh > H - M) {
      doc.addPage();
      y = M;
    }
  };
  const header = (title: string) => {
    ensure(2);
    doc.setFillColor(243, 232, 255);
    doc.rect(M - 6, y - 12, W - 2 * (M - 6), 20, "F");
    doc.setFont("helvetica", "bold");
    doc.setTextColor(91, 33, 182);
    doc.setFontSize(11);
    doc.text(title.toUpperCase(), M, y + 2);
    y += 18;
    doc.setTextColor(20);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
  };

  // Cover band
  doc.setFillColor(91, 33, 182);
  doc.rect(0, 0, W, 70, "F");
  doc.setTextColor(255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("SLP Assist AI — Voice Assessment", M, 40);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Clinical acoustic analysis report", M, 58);
  y = 100;

  doc.setTextColor(20);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(`Patient: ${opts.patientName || "—"}`, M, y);
  y += 14;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text(
    `Age: ${opts.ageYears ?? "—"}    Sex: ${opts.sex ?? "—"}    Clinician: ${opts.clinicianName || "—"}    Date: ${new Date().toLocaleString()}`,
    M,
    y,
  );
  y += 18;
  doc.setTextColor(20);

  header("Recording");
  doc.text(`Duration: ${a.durationSec.toFixed(2)} s    Sample rate: ${a.sampleRate} Hz`, M, y);
  y += 14;
  doc.text(
    `Mean intensity: ${a.energy.meanDbfs.toFixed(1)} dBFS    Peak: ${a.energy.peakDbfs.toFixed(1)} dBFS    SNR: ${
      a.quality.snrDb != null ? a.quality.snrDb.toFixed(1) + " dB" : "—"
    }    Clipping: ${a.quality.clippingPct.toFixed(2)}%`,
    M,
    y,
  );
  y += 18;

  header("Acoustic measurements");
  const rows: [string, string][] = [
    ["Mean F0", fmt(a.f0.meanHz, 1, " Hz")],
    ["Median (habitual) F0", fmt(a.f0.medianHz, 1, " Hz")],
    ["F0 range", `${fmt(a.f0.minHz, 1)} – ${fmt(a.f0.maxHz, 1, " Hz")}`],
    ["SD F0", fmt(a.f0.sdHz, 2, " Hz")],
    ["Jitter (local / RAP / PPQ5 / DDP)", `${fmt(a.jitter.localPct, 3)} / ${fmt(a.jitter.rapPct, 3)} / ${fmt(a.jitter.ppq5Pct, 3)} / ${fmt(a.jitter.ddpPct, 3)} %`],
    ["Shimmer (local / APQ3 / APQ5 / APQ11 / DDA)", `${fmt(a.shimmer.localPct, 3)} / ${fmt(a.shimmer.apq3Pct, 3)} / ${fmt(a.shimmer.apq5Pct, 3)} / ${fmt(a.shimmer.apq11Pct, 3)} / ${fmt(a.shimmer.ddaPct, 3)} %`],
    ["HNR", fmt(a.harmonic.hnrDb, 1, " dB")],
    ["NHR", fmt(a.harmonic.nhr, 3)],
    ["CPP", fmt(a.harmonic.cppDb, 2, " dB")],
    ["Voice breaks", `${a.stability.voiceBreakCount} (${a.stability.voiceBreakPct.toFixed(1)}%)`],
    ["Maximum phonation time", `${a.stability.mptSec.toFixed(1)} s`],
  ];
  for (const [k, v] of rows) {
    ensure(1);
    doc.setFont("helvetica", "bold");
    doc.text(k + ":", M, y);
    doc.setFont("helvetica", "normal");
    const wrapped = doc.splitTextToSize(v, W - 2 * M - 220);
    doc.text(wrapped, M + 220, y);
    y += Math.max(14, wrapped.length * 12) + 2;
  }

  header("Waveform");
  drawWaveform(doc, a.waveform, M, y, W - 2 * M, 60);
  y += 68;

  header("Pitch contour (F0)");
  drawPitch(doc, a.pitchContour, M, y, W - 2 * M, 80);
  y += 88;

  header("Clinical interpretation");
  const findings = buildFindings(a, opts.sex ?? "unknown");
  const overall = overallSeverity(findings);
  const qr = qualityRatings(findings);
  doc.setFont("helvetica", "bold");
  doc.text(`Overall severity: ${overall.toUpperCase()}`, M, y);
  y += 14;
  doc.setFont("helvetica", "normal");
  doc.text(
    `Hoarseness: ${qr.hoarseness}    Breathiness: ${qr.breathiness}    Roughness: ${qr.roughness}    Strain: ${qr.strain}    Asthenia: ${qr.asthenia}`,
    M,
    y,
  );
  y += 16;
  for (const f of findings) {
    ensure(3);
    doc.setFont("helvetica", "bold");
    doc.text(`${f.label} — ${f.value} [${f.severity}]`, M, y);
    y += 12;
    doc.setFont("helvetica", "normal");
    const w1 = doc.splitTextToSize(`Interpretation: ${f.interpretation}`, W - 2 * M);
    doc.text(w1, M, y);
    y += w1.length * 12;
    const w2 = doc.splitTextToSize(`Clinical meaning: ${f.clinicalMeaning}`, W - 2 * M);
    doc.text(w2, M, y);
    y += w2.length * 12 + 4;
  }

  if (opts.aiSummary) {
    header("AI clinical summary");
    const w = doc.splitTextToSize(opts.aiSummary, W - 2 * M);
    for (const line of w) {
      ensure(1);
      doc.text(line, M, y);
      y += 12;
    }
    y += 4;
  }

  // Disclaimer + signature
  if (y > H - 140) {
    doc.addPage();
    y = M;
  }
  y = Math.max(y, H - 150);
  doc.setDrawColor(220);
  doc.line(M, y, W - M, y);
  y += 14;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(140, 70, 0);
  doc.text("Disclaimer", M, y);
  y += 12;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80);
  const disc = doc.splitTextToSize(
    "All acoustic measures were computed directly from the recorded PCM signal using standard published algorithms (autocorrelation F0, Boersma HNR, Titze perturbation, Hillenbrand CPP). AI-assisted interpretation is decision support only. Correlate with clinical examination.",
    W - 2 * M,
  );
  doc.text(disc, M, y);
  y = H - 60;
  doc.setDrawColor(120);
  doc.line(M, y, M + 200, y);
  doc.line(W - M - 200, y, W - M, y);
  doc.setTextColor(60);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Clinician signature", M, y + 12);
  doc.text("Date", W - M - 200, y + 12);

  const fileName = `Voice-Report-${(opts.patientName || "sample").replace(/\s+/g, "_")}.pdf`;
  if (isNative()) {
    const dataUri = doc.output("datauristring");
    await downloadToDevice(dataUri, fileName);
    return;
  }
  doc.save(fileName);
}

function fmt(n: number | null | undefined, digits = 2, unit = "") {
  return n == null || !isFinite(n) ? "—" : `${n.toFixed(digits)}${unit}`;
}

function drawWaveform(doc: jsPDF, data: number[], x: number, y: number, w: number, h: number) {
  doc.setDrawColor(220);
  doc.rect(x, y, w, h);
  doc.setDrawColor(91, 33, 182);
  const mid = y + h / 2;
  const step = data.length ? w / data.length : 1;
  let px = x;
  let py = mid;
  for (let i = 0; i < data.length; i++) {
    const nx = x + i * step;
    const ny = mid - data[i] * (h / 2) * 0.9;
    doc.line(px, py, nx, ny);
    px = nx;
    py = ny;
  }
}

function drawPitch(doc: jsPDF, contour: VoiceAnalysis["pitchContour"], x: number, y: number, w: number, h: number) {
  doc.setDrawColor(220);
  doc.rect(x, y, w, h);
  const voiced = contour.filter((p) => p.hz != null) as { t: number; hz: number }[];
  if (!voiced.length) return;
  const tMax = contour[contour.length - 1]?.t ?? 1;
  const hzs = voiced.map((v) => v.hz);
  const hMin = Math.max(50, Math.min(...hzs) - 20);
  const hMax = Math.min(600, Math.max(...hzs) + 20);
  doc.setDrawColor(91, 33, 182);
  let pen = false;
  let px = x;
  let py = y + h / 2;
  for (const p of contour) {
    if (p.hz == null) {
      pen = false;
      continue;
    }
    const nx = x + (p.t / tMax) * w;
    const ny = y + h - ((p.hz - hMin) / (hMax - hMin)) * (h - 10) - 5;
    if (pen) doc.line(px, py, nx, ny);
    px = nx;
    py = ny;
    pen = true;
  }
}
