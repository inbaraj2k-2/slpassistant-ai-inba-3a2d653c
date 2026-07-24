import { useEffect, useRef, useState } from "react";
import { Mic, Square, Upload } from "lucide-react";

export type RecorderResult = { pcm: Float32Array; sampleRate: number; source: "mic" | "file"; fileName?: string };

export function Recorder({ onCapture, disabled }: { onCapture: (r: RecorderResult) => void; disabled?: boolean }) {
  const [status, setStatus] = useState<"idle" | "recording" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [levelDb, setLevelDb] = useState(-100);
  const [clip, setClip] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const procRef = useRef<ScriptProcessorNode | null>(null);
  const srcRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const chunksRef = useRef<Float32Array[]>([]);
  const startTsRef = useRef(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => () => cleanup(), []);

  function cleanup() {
    try {
      procRef.current?.disconnect();
      srcRef.current?.disconnect();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      ctxRef.current?.close();
    } catch {
      /* noop */
    }
    procRef.current = null;
    srcRef.current = null;
    streamRef.current = null;
    ctxRef.current = null;
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
  }

  async function start() {
    setError(null);
    setClip(false);
    chunksRef.current = [];
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("Microphone not available on this device.");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      streamRef.current = stream;
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) throw new Error("Audio analysis not available on this device.");
      const ctx = new AC();
      if (ctx.state === "suspended") await ctx.resume();
      ctxRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      srcRef.current = src;
      const proc = ctx.createScriptProcessor(4096, 1, 1);
      procRef.current = proc;
      proc.onaudioprocess = (e) => {
        if (chunksRef.current.length > 2000) return; // ~3+ min cap
        const ch = e.inputBuffer.getChannelData(0);
        // level meter
        let peak = 0;
        let sum = 0;
        for (let i = 0; i < ch.length; i++) {
          const v = Math.abs(ch[i]);
          if (v > peak) peak = v;
          sum += ch[i] * ch[i];
        }
        const rms = Math.sqrt(sum / ch.length);
        setLevelDb(rms > 0 ? 20 * Math.log10(rms) : -100);
        if (peak >= 0.99) setClip(true);
        chunksRef.current.push(new Float32Array(ch));
      };
      src.connect(proc);
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
    const sr = ctxRef.current?.sampleRate ?? 48000;
    try {
      procRef.current?.disconnect();
      srcRef.current?.disconnect();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    } catch {
      /* noop */
    }
    const total = chunksRef.current.reduce((n, c) => n + c.length, 0);
    const buf = new Float32Array(total);
    let off = 0;
    for (const c of chunksRef.current) {
      buf.set(c, off);
      off += c.length;
    }
    await ctxRef.current?.close().catch(() => {});
    ctxRef.current = null;
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
    setStatus("idle");
    setLevelDb(-100);
    onCapture({ pcm: buf, sampleRate: sr, source: "mic" });
  }

  async function importFile(file: File) {
    try {
      const arr = await file.arrayBuffer();
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      const ctx = new AC();
      const decoded = await ctx.decodeAudioData(arr.slice(0));
      // Mixdown to mono
      const n = decoded.length;
      const mono = new Float32Array(n);
      for (let ch = 0; ch < decoded.numberOfChannels; ch++) {
        const data = decoded.getChannelData(ch);
        for (let i = 0; i < n; i++) mono[i] += data[i];
      }
      const scale = 1 / decoded.numberOfChannels;
      for (let i = 0; i < n; i++) mono[i] *= scale;
      const sr = decoded.sampleRate;
      await ctx.close().catch(() => {});
      onCapture({ pcm: mono, sampleRate: sr, source: "file", fileName: file.name });
    } catch (err) {
      setError(err instanceof Error ? `Could not decode file: ${err.message}` : "Could not decode file.");
      setStatus("error");
    }
  }

  const meterPct = Math.max(0, Math.min(1, (levelDb + 60) / 60));

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div
        className={`mx-auto mb-3 grid h-20 w-20 place-items-center rounded-full ${
          status === "recording" ? "animate-pulse bg-destructive/15 text-destructive" : "bg-primary-soft text-primary"
        }`}
      >
        <Mic className="h-8 w-8" />
      </div>
      <p className="text-center text-2xl font-semibold tabular-nums">{elapsed.toFixed(1)}s</p>
      <p className="mt-1 text-center text-xs text-muted-foreground">
        {status === "recording"
          ? "Recording — sustain /a/ for 3–5 seconds, or read a passage."
          : "Tap record, or import an audio file (WAV / MP3 / M4A / AAC / FLAC)."}
      </p>

      {status === "recording" && (
        <div className="mt-3">
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full ${clip ? "bg-destructive" : "bg-gradient-primary"}`}
              style={{ width: `${meterPct * 100}%` }}
            />
          </div>
          <p className="mt-1 flex justify-between text-[10px] text-muted-foreground">
            <span>Input level {levelDb.toFixed(0)} dBFS</span>
            {clip && <span className="font-semibold text-destructive">Clipping — lower gain</span>}
          </p>
        </div>
      )}

      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {status === "recording" ? (
          <button
            onClick={stop}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-destructive px-5 text-sm font-semibold text-destructive-foreground shadow-card"
          >
            <Square className="h-4 w-4" /> Stop & analyze
          </button>
        ) : (
          <button
            onClick={start}
            disabled={disabled}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-primary px-5 text-sm font-semibold text-primary-foreground shadow-card disabled:opacity-60"
          >
            <Mic className="h-4 w-4" /> Record
          </button>
        )}
        <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl bg-secondary px-4 text-sm font-medium text-secondary-foreground">
          <Upload className="h-4 w-4" /> Import audio
          <input
            type="file"
            accept="audio/wav,audio/mpeg,audio/mp3,audio/aac,audio/mp4,audio/x-m4a,audio/flac,audio/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void importFile(f);
              e.target.value = "";
            }}
            disabled={disabled}
          />
        </label>
      </div>

      {error && <p className="mt-3 rounded-lg bg-destructive/10 p-2 text-xs text-destructive">{error}</p>}
    </div>
  );
}
