import { useEffect, useRef } from "react";
import type { VoiceAnalysis } from "../dsp/types";

export function WaveformChart({ data, height = 90 }: { data: number[]; height?: number }) {
  const w = 600;
  const mid = height / 2;
  const step = data.length ? w / data.length : 1;
  let d = "";
  for (let i = 0; i < data.length; i++) {
    const x = i * step;
    const y = mid - data[i] * mid * 0.9;
    d += `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)} `;
  }
  return (
    <div className="rounded-xl border border-border bg-card p-3 shadow-card">
      <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Waveform</p>
      <svg viewBox={`0 0 ${w} ${height}`} className="h-24 w-full">
        <line x1="0" y1={mid} x2={w} y2={mid} stroke="currentColor" className="text-border" strokeWidth="1" />
        <path d={d} fill="none" stroke="currentColor" className="text-primary" strokeWidth="1" />
      </svg>
    </div>
  );
}

export function PitchContourChart({
  contour,
  height = 120,
}: {
  contour: VoiceAnalysis["pitchContour"];
  height?: number;
}) {
  const w = 600;
  const voiced = contour.filter((p) => p.hz != null) as { t: number; hz: number }[];
  if (!voiced.length) {
    return (
      <div className="rounded-xl border border-border bg-card p-3 text-xs text-muted-foreground shadow-card">
        Pitch contour — no voiced frames detected.
      </div>
    );
  }
  const tMax = contour[contour.length - 1]?.t ?? 1;
  const hzs = voiced.map((v) => v.hz);
  const hMin = Math.max(50, Math.min(...hzs) - 20);
  const hMax = Math.min(600, Math.max(...hzs) + 20);
  const yFor = (hz: number) => height - ((hz - hMin) / (hMax - hMin)) * (height - 20) - 10;
  const xFor = (t: number) => (t / tMax) * w;
  let d = "";
  let pen = false;
  for (const p of contour) {
    if (p.hz == null) {
      pen = false;
      continue;
    }
    const x = xFor(p.t);
    const y = yFor(p.hz);
    d += `${pen ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)} `;
    pen = true;
  }
  return (
    <div className="rounded-xl border border-border bg-card p-3 shadow-card">
      <p className="mb-1 flex items-center justify-between text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        <span>Pitch contour (F0)</span>
        <span className="text-[10px] normal-case tracking-normal">
          {hMin.toFixed(0)}–{hMax.toFixed(0)} Hz
        </span>
      </p>
      <svg viewBox={`0 0 ${w} ${height}`} className="h-28 w-full">
        <line
          x1="0"
          y1={height - 10}
          x2={w}
          y2={height - 10}
          stroke="currentColor"
          className="text-border"
          strokeWidth="0.5"
        />
        <path d={d} fill="none" stroke="currentColor" className="text-primary" strokeWidth="1.4" />
      </svg>
    </div>
  );
}

export function SpectrogramChart({ spec }: { spec: VoiceAnalysis["spectrogram"] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const { freqBins, timeBins, data } = spec;
    c.width = timeBins;
    c.height = freqBins;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const img = ctx.createImageData(timeBins, freqBins);
    // color ramp: dark purple -> pink -> yellow
    for (let f = 0; f < freqBins; f++) {
      for (let t = 0; t < timeBins; t++) {
        const db = data[f * timeBins + t];
        const norm = Math.max(0, Math.min(1, (db + 80) / 80));
        const r = Math.floor(255 * Math.pow(norm, 0.6));
        const g = Math.floor(200 * Math.pow(norm, 1.6));
        const b = Math.floor(160 * (1 - norm) + 40 * norm);
        // flip Y so low freq is at bottom
        const py = freqBins - 1 - f;
        const idx = (py * timeBins + t) * 4;
        img.data[idx] = r;
        img.data[idx + 1] = g;
        img.data[idx + 2] = b;
        img.data[idx + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }, [spec]);
  return (
    <div className="rounded-xl border border-border bg-card p-3 shadow-card">
      <p className="mb-1 flex items-center justify-between text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        <span>Spectrogram</span>
        <span className="text-[10px] normal-case tracking-normal">0–{Math.round(spec.maxFreqHz)} Hz</span>
      </p>
      <canvas ref={ref} className="h-40 w-full rounded-md" style={{ imageRendering: "pixelated" }} />
    </div>
  );
}

export function IntensityChart({
  contour,
  height = 90,
}: {
  contour: VoiceAnalysis["intensityContour"];
  height?: number;
}) {
  const w = 600;
  if (!contour.length) return null;
  const tMax = contour[contour.length - 1].t;
  const dbMin = -80;
  const dbMax = 0;
  let d = "";
  for (let i = 0; i < contour.length; i++) {
    const p = contour[i];
    const x = (p.t / tMax) * w;
    const y = height - ((Math.max(dbMin, p.dbfs) - dbMin) / (dbMax - dbMin)) * (height - 10) - 5;
    d += `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)} `;
  }
  return (
    <div className="rounded-xl border border-border bg-card p-3 shadow-card">
      <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Intensity (dBFS)</p>
      <svg viewBox={`0 0 ${w} ${height}`} className="h-24 w-full">
        <path d={d} fill="none" stroke="currentColor" className="text-primary" strokeWidth="1.2" />
      </svg>
    </div>
  );
}
