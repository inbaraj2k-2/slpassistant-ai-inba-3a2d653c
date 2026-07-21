import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Mic, Square, RotateCcw, Info } from "lucide-react";

export const Route = createFileRoute("/_authenticated/clinical-tools/voice-analysis")({
  head: () => ({
    meta: [
      { title: "Voice Analysis — SLP Assist AI" },
      { name: "description", content: "Record a voice sample and measure fundamental frequency (F0), intensity, and duration in the browser." },
    ],
  }),
  component: VoiceAnalysisPage,
});

type Result = {
  durationSec: number;
  meanF0Hz: number | null;
  minF0Hz: number | null;
  maxF0Hz: number | null;
  meanDb: number;
  maxDb: number;
  sampleRate: number;
  waveform: number[];
};

function VoiceAnalysisPage() {
  const [status, setStatus] = useState<"idle" | "recording" | "processing" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const chunksRef = useRef<Float32Array[]>([]);
  const startTsRef = useRef<number>(0);
  const timerRef = useRef<number | null>(null);
  const analysisTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function cleanup() {
    try {
      processorRef.current?.disconnect();
      sourceRef.current?.disconnect();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      ctxRef.current?.close();
    } catch {
      /* noop */
    }
    processorRef.current = null;
    sourceRef.current = null;
    streamRef.current = null;
    ctxRef.current = null;
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (analysisTimerRef.current) {
      window.clearTimeout(analysisTimerRef.current);
      analysisTimerRef.current = null;
    }
  }

  async function start() {
    setError(null);
    setResult(null);
    chunksRef.current = [];
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Microphone recording is not available on this device.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      streamRef.current = stream;
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) throw new Error("Audio analysis is not available on this device.");
      const ctx = new AudioCtx();
      if (ctx.state === "suspended") await ctx.resume();
      ctxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      sourceRef.current = source;
      // ScriptProcessor is deprecated but universally supported and simplest for a one-shot sample.
      const proc = ctx.createScriptProcessor(4096, 1, 1);
      processorRef.current = proc;
      proc.onaudioprocess = (e) => {
        if (chunksRef.current.length > 900) return;
        const ch = e.inputBuffer.getChannelData(0);
        chunksRef.current.push(new Float32Array(ch));
      };
      source.connect(proc);
      proc.connect(ctx.destination);
      startTsRef.current = performance.now();
      setElapsed(0);
      timerRef.current = window.setInterval(() => {
        setElapsed((performance.now() - startTsRef.current) / 1000);
      }, 100);
      setStatus("recording");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Microphone access denied.");
      setStatus("error");
      cleanup();
    }
  }

  async function stop() {
    if (status !== "recording") return;
    setStatus("processing");
    const ctx = ctxRef.current;
    const sampleRate = ctx?.sampleRate ?? 48000;
    // detach graph
    try {
      processorRef.current?.disconnect();
      sourceRef.current?.disconnect();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    } catch {
      /* noop */
    }
    // flatten
    const total = chunksRef.current.reduce((n, c) => n + c.length, 0);
    const buf = new Float32Array(total);
    let off = 0;
    for (const c of chunksRef.current) {
      buf.set(c, off);
      off += c.length;
    }
    await ctx?.close().catch(() => {});
    ctxRef.current = null;
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    // analyze off the main render tick
    analysisTimerRef.current = window.setTimeout(() => {
      const analysis = analyze(buf, sampleRate);
      setResult(analysis);
      setStatus("done");
      analysisTimerRef.current = null;
    }, 0);
  }

  function reset() {
    cleanup();
    setResult(null);
    setError(null);
    setElapsed(0);
    setStatus("idle");
  }

  return (
    <AppShell title="Voice Analysis" subtitle="Pitch · Intensity · Duration" back>
      <div className="mb-4 rounded-2xl border border-border bg-card p-5 text-center shadow-card">
        <div
          className={`mx-auto mb-3 grid h-24 w-24 place-items-center rounded-full ${
            status === "recording" ? "animate-pulse bg-destructive/15 text-destructive" : "bg-primary-soft text-primary"
          }`}
        >
          <Mic className="h-10 w-10" />
        </div>
        <p className="text-2xl font-semibold tabular-nums">
          {(status === "recording" ? elapsed : result?.durationSec ?? 0).toFixed(1)}s
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {status === "idle" && "Tap record and sustain a vowel (e.g. /a/) for 3–5 seconds."}
          {status === "recording" && "Recording…"}
          {status === "processing" && "Analyzing…"}
          {status === "done" && "Analysis complete."}
          {status === "error" && (error ?? "Recording failed.")}
        </p>

        <div className="mt-4 flex justify-center gap-2">
          {status === "recording" ? (
            <button
              onClick={stop}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-destructive px-5 text-sm font-semibold text-destructive-foreground shadow-card"
            >
              <Square className="h-4 w-4" /> Stop
            </button>
          ) : (
            <button
              onClick={start}
              disabled={status === "processing"}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-primary px-5 text-sm font-semibold text-primary-foreground shadow-card disabled:opacity-60"
            >
              <Mic className="h-4 w-4" />
              {status === "done" ? "Record again" : "Record"}
            </button>
          )}
          {result && (
            <button
              onClick={reset}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-secondary px-4 text-sm font-medium text-secondary-foreground"
            >
              <RotateCcw className="h-4 w-4" /> Reset
            </button>
          )}
        </div>
      </div>

      {result && (
        <>
          <Waveform data={result.waveform} />
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Metric
              label="Mean F0"
              value={result.meanF0Hz != null ? `${result.meanF0Hz.toFixed(1)} Hz` : "—"}
              hint="Fundamental frequency"
            />
            <Metric
              label="F0 range"
              value={
                result.minF0Hz != null && result.maxF0Hz != null
                  ? `${result.minF0Hz.toFixed(0)}–${result.maxF0Hz.toFixed(0)} Hz`
                  : "—"
              }
              hint="Min–Max"
            />
            <Metric label="Mean intensity" value={`${result.meanDb.toFixed(1)} dB`} hint="RMS, relative" />
            <Metric label="Peak intensity" value={`${result.maxDb.toFixed(1)} dB`} hint="RMS, relative" />
            <Metric label="Duration" value={`${result.durationSec.toFixed(2)} s`} hint="Total sample" />
            <Metric label="Sample rate" value={`${result.sampleRate} Hz`} hint="Device default" />
          </div>
          <p className="mt-4 flex items-start gap-1.5 text-[11px] text-muted-foreground">
            <Info className="mt-0.5 h-3 w-3 shrink-0" />
            Intensity is expressed in dB relative to full scale (dBFS). For calibrated SPL use a dedicated meter.
          </p>
        </>
      )}
    </AppShell>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 shadow-card">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums">{value}</p>
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Waveform({ data }: { data: number[] }) {
  const w = 320;
  const h = 80;
  const mid = h / 2;
  const step = w / data.length;
  const path = data
    .map((v, i) => {
      const x = i * step;
      const y = mid - v * (h / 2) * 0.9;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <div className="rounded-xl border border-border bg-card p-3 shadow-card">
      <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Waveform</p>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-20 w-full">
        <line x1="0" y1={mid} x2={w} y2={mid} stroke="currentColor" className="text-border" strokeWidth="1" />
        <path d={path} fill="none" stroke="currentColor" className="text-primary" strokeWidth="1.2" />
      </svg>
    </div>
  );
}

/* ---------- Analysis ---------- */

function analyze(buf: Float32Array, sampleRate: number): Result {
  const durationSec = buf.length / sampleRate;

  // Frame-based analysis
  const frameSize = Math.round(sampleRate * 0.04); // 40 ms
  const hop = Math.round(sampleRate * 0.02); // 20 ms
  const f0s: number[] = [];
  const rmsList: number[] = [];

  for (let start = 0; start + frameSize < buf.length; start += hop) {
    const frame = buf.subarray(start, start + frameSize);
    const rms = frameRms(frame);
    rmsList.push(rms);
    // voiced-frame gate: skip near-silence
    if (rms < 0.01) continue;
    const f0 = autocorrelationPitch(frame, sampleRate);
    if (f0 && f0 >= 60 && f0 <= 500) f0s.push(f0);
  }

  const meanF0 = f0s.length ? f0s.reduce((a, b) => a + b, 0) / f0s.length : null;
  const minF0 = f0s.length ? Math.min(...f0s) : null;
  const maxF0 = f0s.length ? Math.max(...f0s) : null;

  const meanRms = rmsList.length ? rmsList.reduce((a, b) => a + b, 0) / rmsList.length : 0;
  const peakRms = rmsList.length ? Math.max(...rmsList) : 0;
  const meanDb = rmsToDb(meanRms);
  const maxDb = rmsToDb(peakRms);

  // Downsample for waveform display
  const target = 240;
  const bucket = Math.max(1, Math.floor(buf.length / target));
  const waveform: number[] = [];
  for (let i = 0; i < buf.length; i += bucket) {
    let peak = 0;
    const end = Math.min(i + bucket, buf.length);
    for (let j = i; j < end; j++) {
      const v = buf[j];
      if (Math.abs(v) > Math.abs(peak)) peak = v;
    }
    waveform.push(peak);
  }

  return {
    durationSec,
    meanF0Hz: meanF0,
    minF0Hz: minF0,
    maxF0Hz: maxF0,
    meanDb,
    maxDb,
    sampleRate,
    waveform,
  };
}

function frameRms(frame: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < frame.length; i++) sum += frame[i] * frame[i];
  return Math.sqrt(sum / frame.length);
}

function rmsToDb(rms: number): number {
  if (rms <= 0) return -100;
  return 20 * Math.log10(rms);
}

// Simple autocorrelation-based pitch detection (returns Hz or null)
function autocorrelationPitch(frame: Float32Array, sampleRate: number): number | null {
  const minLag = Math.floor(sampleRate / 500); // 500 Hz max
  const maxLag = Math.floor(sampleRate / 60); // 60 Hz min
  let bestLag = -1;
  let bestCorr = 0;
  // Remove DC
  let mean = 0;
  for (let i = 0; i < frame.length; i++) mean += frame[i];
  mean /= frame.length;

  for (let lag = minLag; lag <= maxLag; lag++) {
    let corr = 0;
    const n = frame.length - lag;
    for (let i = 0; i < n; i++) {
      corr += (frame[i] - mean) * (frame[i + lag] - mean);
    }
    corr /= n;
    if (corr > bestCorr) {
      bestCorr = corr;
      bestLag = lag;
    }
  }
  if (bestLag <= 0) return null;
  // Quality gate — reject if correlation weak
  let norm = 0;
  for (let i = 0; i < frame.length; i++) norm += (frame[i] - mean) ** 2;
  norm /= frame.length;
  if (norm <= 0 || bestCorr / norm < 0.3) return null;
  return sampleRate / bestLag;
}
