import type { VoiceAnalysis } from "./types";

let worker: Worker | null = null;
let seq = 0;

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
  }
  return worker;
}

export function analyzeInWorker(pcm: Float32Array, sampleRate: number): Promise<VoiceAnalysis> {
  const w = getWorker();
  const id = ++seq;
  return new Promise((resolve, reject) => {
    const handler = (e: MessageEvent) => {
      const d = e.data;
      if (!d || d.id !== id) return;
      w.removeEventListener("message", handler);
      if (d.ok) resolve(d.result);
      else reject(new Error(d.error || "Analysis failed"));
    };
    w.addEventListener("message", handler);
    // Copy so we can transfer without freezing the caller's buffer
    const copy = new Float32Array(pcm);
    w.postMessage({ id, pcm: copy, sampleRate }, [copy.buffer]);
  });
}
