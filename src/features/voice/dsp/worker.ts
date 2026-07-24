/// <reference lib="webworker" />
import { analyzeSignal } from "./algorithms";
import type { VoiceAnalysis } from "./types";

type Req = { id: number; pcm: Float32Array; sampleRate: number };
type Res = { id: number; ok: true; result: VoiceAnalysis } | { id: number; ok: false; error: string };

self.onmessage = (e: MessageEvent<Req>) => {
  const { id, pcm, sampleRate } = e.data;
  try {
    const result = analyzeSignal(pcm, sampleRate);
    (self as unknown as Worker).postMessage({ id, ok: true, result } satisfies Res);
  } catch (err) {
    (self as unknown as Worker).postMessage({
      id,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    } satisfies Res);
  }
};
