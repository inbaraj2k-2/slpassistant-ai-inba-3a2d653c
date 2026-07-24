// Original implementations of standard, published acoustic measures.
// References: Boersma 1993 (HNR), Titze 1995 (perturbation), Hillenbrand
// & Houde 1996 (CPP). All computations are done directly from PCM.
import type {
  EnergyMetrics,
  F0Stats,
  HarmonicMetrics,
  JitterMetrics,
  QualitySignals,
  ShimmerMetrics,
  StabilityMetrics,
  VoiceAnalysis,
} from "./types";

const F0_MIN = 60;
const F0_MAX = 500;

/* --------------------------- utilities --------------------------- */
function mean(a: number[]) {
  if (!a.length) return 0;
  let s = 0;
  for (const x of a) s += x;
  return s / a.length;
}
function median(a: number[]) {
  if (!a.length) return 0;
  const s = [...a].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
function stddev(a: number[]) {
  if (a.length < 2) return 0;
  const m = mean(a);
  let s = 0;
  for (const x of a) s += (x - m) ** 2;
  return Math.sqrt(s / (a.length - 1));
}
function rms(a: Float32Array | number[]) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += (a[i] as number) * (a[i] as number);
  return Math.sqrt(s / a.length);
}
function dbfs(v: number) {
  return v <= 1e-9 ? -100 : 20 * Math.log10(v);
}

/* --------------------------- FFT (radix-2) --------------------------- */
function nextPow2(n: number) {
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}
// In-place iterative radix-2 Cooley-Tukey.
function fft(re: Float64Array, im: Float64Array) {
  const n = re.length;
  // bit-reverse
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wRe = Math.cos(ang);
    const wIm = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let curRe = 1;
      let curIm = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k;
        const b = i + k + len / 2;
        const tRe = re[b] * curRe - im[b] * curIm;
        const tIm = re[b] * curIm + im[b] * curRe;
        re[b] = re[a] - tRe;
        im[b] = im[a] - tIm;
        re[a] = re[a] + tRe;
        im[a] = im[a] + tIm;
        const nRe = curRe * wRe - curIm * wIm;
        const nIm = curRe * wIm + curIm * wRe;
        curRe = nRe;
        curIm = nIm;
      }
    }
  }
}
function ifft(re: Float64Array, im: Float64Array) {
  for (let i = 0; i < im.length; i++) im[i] = -im[i];
  fft(re, im);
  const n = re.length;
  for (let i = 0; i < n; i++) {
    re[i] /= n;
    im[i] = -im[i] / n;
  }
}

function hann(n: number): Float64Array {
  const w = new Float64Array(n);
  for (let i = 0; i < n; i++) w[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1));
  return w;
}

/* --------------------------- F0: autocorrelation + parabolic --------------------------- */
// Returns Hz or null; parabolic interpolation for sub-sample accuracy.
function estimateF0(frame: Float32Array, sr: number): { hz: number | null; strength: number } {
  const minLag = Math.floor(sr / F0_MAX);
  const maxLag = Math.min(frame.length - 2, Math.floor(sr / F0_MIN));
  if (maxLag <= minLag) return { hz: null, strength: 0 };
  let m = 0;
  for (let i = 0; i < frame.length; i++) m += frame[i];
  m /= frame.length;
  let norm = 0;
  for (let i = 0; i < frame.length; i++) norm += (frame[i] - m) ** 2;
  if (norm <= 0) return { hz: null, strength: 0 };
  norm /= frame.length;

  let bestLag = -1;
  let bestCorr = 0;
  const corrs = new Float64Array(maxLag + 2);
  for (let lag = minLag; lag <= maxLag; lag++) {
    let c = 0;
    const n = frame.length - lag;
    for (let i = 0; i < n; i++) c += (frame[i] - m) * (frame[i + lag] - m);
    c /= n;
    corrs[lag] = c;
    if (c > bestCorr) {
      bestCorr = c;
      bestLag = lag;
    }
  }
  if (bestLag <= 0) return { hz: null, strength: 0 };
  const r = bestCorr / norm;
  if (r < 0.3) return { hz: null, strength: r };
  // parabolic interpolation
  const y0 = corrs[bestLag - 1] ?? bestCorr;
  const y1 = bestCorr;
  const y2 = corrs[bestLag + 1] ?? bestCorr;
  const denom = y0 - 2 * y1 + y2;
  const shift = denom !== 0 ? (0.5 * (y0 - y2)) / denom : 0;
  const lagInterp = bestLag + shift;
  return { hz: sr / lagInterp, strength: r };
}

/* --------------------------- Perturbation (jitter/shimmer) --------------------------- */
// Extract per-cycle periods (in samples) and peak-to-peak amplitudes by
// locating positive peaks in each voiced frame. Simple, robust for sustained
// vowels.
function extractCycles(
  signal: Float32Array,
  sr: number,
  f0Contour: (number | null)[],
  frameStep: number,
  frameSize: number,
) {
  const periods: number[] = []; // samples
  const amps: number[] = []; // peak-to-peak
  let cursor = 0;
  for (let f = 0; f < f0Contour.length; f++) {
    const hz = f0Contour[f];
    if (!hz) {
      cursor += frameStep;
      continue;
    }
    const period = sr / hz;
    const start = f * frameStep;
    const end = Math.min(start + frameSize, signal.length);
    // sliding peak-pick within ~1.5 periods windows
    const searchWin = Math.max(4, Math.floor(period * 1.5));
    let i = Math.max(start, cursor);
    while (i + searchWin < end) {
      // find local max in [i, i+searchWin)
      let pk = i;
      for (let k = i; k < i + searchWin; k++) if (signal[k] > signal[pk]) pk = k;
      // find local min around it for pk-to-pk
      const lo0 = Math.max(0, pk - Math.floor(period));
      const lo1 = Math.min(signal.length - 1, pk + Math.floor(period));
      let mn = lo0;
      for (let k = lo0; k <= lo1; k++) if (signal[k] < signal[mn]) mn = k;
      const amp = signal[pk] - signal[mn];
      // advance by one period from this peak
      const nextExpected = pk + Math.round(period);
      // find peak in narrow window around next expected
      const w = Math.max(2, Math.floor(period * 0.3));
      const nS = Math.max(pk + 3, nextExpected - w);
      const nE = Math.min(end - 1, nextExpected + w);
      if (nE <= nS + 2) break;
      let nPk = nS;
      for (let k = nS; k <= nE; k++) if (signal[k] > signal[nPk]) nPk = k;
      const T = nPk - pk;
      if (T > sr / F0_MAX && T < sr / F0_MIN) {
        periods.push(T);
        amps.push(amp);
      }
      i = nPk;
      cursor = nPk;
    }
  }
  return { periods, amps };
}

function jitterFromPeriods(periods: number[], sr: number): JitterMetrics {
  if (periods.length < 3) return { localPct: null, rapPct: null, ppq5Pct: null, ddpPct: null };
  const T = periods.map((p) => p / sr);
  const meanT = mean(T);
  if (meanT <= 0) return { localPct: null, rapPct: null, ppq5Pct: null, ddpPct: null };
  // local jitter
  let s = 0;
  for (let i = 1; i < T.length; i++) s += Math.abs(T[i] - T[i - 1]);
  const local = s / (T.length - 1) / meanT;
  // RAP (3-point smoothed)
  let sr3 = 0;
  let n3 = 0;
  for (let i = 1; i < T.length - 1; i++) {
    const avg = (T[i - 1] + T[i] + T[i + 1]) / 3;
    sr3 += Math.abs(T[i] - avg);
    n3++;
  }
  const rap = n3 ? sr3 / n3 / meanT : null;
  // PPQ5 (5-point smoothed)
  let sp5 = 0;
  let n5 = 0;
  for (let i = 2; i < T.length - 2; i++) {
    const avg = (T[i - 2] + T[i - 1] + T[i] + T[i + 1] + T[i + 2]) / 5;
    sp5 += Math.abs(T[i] - avg);
    n5++;
  }
  const ppq5 = n5 ? sp5 / n5 / meanT : null;
  return {
    localPct: local * 100,
    rapPct: rap != null ? rap * 100 : null,
    ppq5Pct: ppq5 != null ? ppq5 * 100 : null,
    ddpPct: rap != null ? rap * 3 * 100 : null,
  };
}

function shimmerFromAmps(amps: number[]): ShimmerMetrics {
  if (amps.length < 3) {
    return { localPct: null, apq3Pct: null, apq5Pct: null, apq11Pct: null, ddaPct: null };
  }
  const meanA = mean(amps);
  if (meanA <= 0) return { localPct: null, apq3Pct: null, apq5Pct: null, apq11Pct: null, ddaPct: null };
  // local (dB-based Praat definition would need log; here linear percent — common alternate)
  let s = 0;
  for (let i = 1; i < amps.length; i++) s += Math.abs(amps[i] - amps[i - 1]);
  const local = s / (amps.length - 1) / meanA;
  const apqN = (N: number): number | null => {
    const half = Math.floor(N / 2);
    if (amps.length < N) return null;
    let sm = 0;
    let n = 0;
    for (let i = half; i < amps.length - half; i++) {
      let avg = 0;
      for (let k = -half; k <= half; k++) avg += amps[i + k];
      avg /= N;
      sm += Math.abs(amps[i] - avg);
      n++;
    }
    return n ? sm / n / meanA : null;
  };
  const apq3 = apqN(3);
  const apq5 = apqN(5);
  const apq11 = apqN(11);
  return {
    localPct: local * 100,
    apq3Pct: apq3 != null ? apq3 * 100 : null,
    apq5Pct: apq5 != null ? apq5 * 100 : null,
    apq11Pct: apq11 != null ? apq11 * 100 : null,
    ddaPct: apq3 != null ? apq3 * 3 * 100 : null,
  };
}

/* --------------------------- HNR (Boersma-style) --------------------------- */
// Per voiced frame: r(0) = signal power, r(T0) = harmonic power.
// HNR = 10*log10(r(T0)/(r(0)-r(T0)))
function hnrFromFrame(frame: Float32Array, sr: number, f0Hz: number): number | null {
  const period = sr / f0Hz;
  if (period < 2 || period >= frame.length - 2) return null;
  let m = 0;
  for (let i = 0; i < frame.length; i++) m += frame[i];
  m /= frame.length;
  let r0 = 0;
  for (let i = 0; i < frame.length; i++) r0 += (frame[i] - m) ** 2;
  r0 /= frame.length;
  if (r0 <= 0) return null;
  // interpolated autocorrelation at lag=period
  const lag = Math.round(period);
  let rT = 0;
  const n = frame.length - lag;
  for (let i = 0; i < n; i++) rT += (frame[i] - m) * (frame[i + lag] - m);
  rT /= n;
  if (rT <= 0 || rT >= r0) return null;
  return 10 * Math.log10(rT / (r0 - rT));
}

/* --------------------------- CPP (Hillenbrand) --------------------------- */
// Cepstrum peak prominence in dB relative to a linear regression baseline
// over the quefrency range corresponding to F0_MIN..F0_MAX.
function cppFromFrame(frame: Float32Array, sr: number, win: Float64Array): number | null {
  const N = nextPow2(frame.length);
  const re = new Float64Array(N);
  const im = new Float64Array(N);
  for (let i = 0; i < frame.length; i++) re[i] = frame[i] * win[i];
  fft(re, im);
  // log magnitude spectrum
  for (let i = 0; i < N; i++) {
    const mag = Math.sqrt(re[i] * re[i] + im[i] * im[i]);
    re[i] = Math.log(mag + 1e-12);
    im[i] = 0;
  }
  ifft(re, im);
  // real cepstrum
  const ceps = new Float64Array(N);
  for (let i = 0; i < N; i++) ceps[i] = re[i];
  const qMin = Math.floor(sr / F0_MAX);
  const qMax = Math.min(N / 2 - 1, Math.floor(sr / F0_MIN));
  if (qMax <= qMin + 5) return null;
  // find peak
  let peakIdx = qMin;
  let peakVal = ceps[qMin];
  for (let i = qMin; i <= qMax; i++) if (ceps[i] > peakVal) {
    peakVal = ceps[i];
    peakIdx = i;
  }
  // linear regression baseline over [qMin..qMax]
  let sx = 0, sy = 0, sxx = 0, sxy = 0, nn = 0;
  for (let i = qMin; i <= qMax; i++) {
    sx += i; sy += ceps[i]; sxx += i * i; sxy += i * ceps[i]; nn++;
  }
  const denom = nn * sxx - sx * sx;
  if (denom === 0) return null;
  const slope = (nn * sxy - sx * sy) / denom;
  const intercept = (sy - slope * sx) / nn;
  const baseAtPeak = slope * peakIdx + intercept;
  // Convert nats -> dB (log10 * 20 / (log10(e)*ln→already ln, so *20/ln10 = 8.685)
  const cppNats = peakVal - baseAtPeak;
  return cppNats * (20 / Math.LN10);
}

/* --------------------------- Spectrogram --------------------------- */
function computeSpectrogram(signal: Float32Array, sr: number) {
  const fftSize = 1024;
  const hop = 512;
  const win = hann(fftSize);
  const nFrames = Math.max(1, Math.floor((signal.length - fftSize) / hop) + 1);
  const timeBins = Math.min(nFrames, 400);
  const skip = Math.max(1, Math.floor(nFrames / timeBins));
  const freqBins = Math.floor(fftSize / 2); // up to Nyquist
  const displayBins = Math.min(freqBins, 256);
  const binStep = freqBins / displayBins;
  const data = new Array<number>(displayBins * timeBins);
  const re = new Float64Array(fftSize);
  const im = new Float64Array(fftSize);
  let outT = 0;
  for (let f = 0; f < nFrames && outT < timeBins; f += skip, outT++) {
    const start = f * hop;
    for (let i = 0; i < fftSize; i++) {
      re[i] = (signal[start + i] ?? 0) * win[i];
      im[i] = 0;
    }
    fft(re, im);
    for (let b = 0; b < displayBins; b++) {
      const i0 = Math.floor(b * binStep);
      const i1 = Math.min(freqBins - 1, Math.floor((b + 1) * binStep));
      let mx = 0;
      for (let i = i0; i <= i1; i++) {
        const mag = Math.sqrt(re[i] * re[i] + im[i] * im[i]);
        if (mag > mx) mx = mag;
      }
      const db = mx > 0 ? 20 * Math.log10(mx / (fftSize / 2)) : -100;
      data[b * timeBins + outT] = Math.max(-100, Math.min(0, db));
    }
  }
  return {
    freqBins: displayBins,
    timeBins,
    maxFreqHz: sr / 2,
    data,
  };
}

/* --------------------------- Master analyzer --------------------------- */
export function analyzeSignal(signal: Float32Array, sr: number): VoiceAnalysis {
  const durationSec = signal.length / sr;
  const frameSize = Math.round(sr * 0.04); // 40 ms
  const hop = Math.round(sr * 0.02); // 20 ms
  const win = hann(frameSize);

  const f0Series: (number | null)[] = [];
  const pitchContour: { t: number; hz: number | null }[] = [];
  const intensityContour: { t: number; dbfs: number }[] = [];
  const hnrList: number[] = [];
  const cppList: number[] = [];
  const rmsList: number[] = [];

  // Quality: clipping
  let clipCount = 0;
  for (let i = 0; i < signal.length; i++) if (Math.abs(signal[i]) >= 0.99) clipCount++;
  const clippingPct = (clipCount / Math.max(1, signal.length)) * 100;

  // Frame loop
  for (let s = 0; s + frameSize <= signal.length; s += hop) {
    const frame = signal.subarray(s, s + frameSize);
    const r = rms(frame);
    rmsList.push(r);
    const t = (s + frameSize / 2) / sr;
    intensityContour.push({ t, dbfs: dbfs(r) });
    if (r < 0.008) {
      f0Series.push(null);
      pitchContour.push({ t, hz: null });
      continue;
    }
    const { hz } = estimateF0(frame, sr);
    f0Series.push(hz && hz >= F0_MIN && hz <= F0_MAX ? hz : null);
    pitchContour.push({ t, hz: hz && hz >= F0_MIN && hz <= F0_MAX ? hz : null });
    if (hz && hz >= F0_MIN && hz <= F0_MAX) {
      const h = hnrFromFrame(frame, sr, hz);
      if (h != null && isFinite(h)) hnrList.push(h);
      const c = cppFromFrame(frame, sr, win);
      if (c != null && isFinite(c)) cppList.push(c);
    }
  }

  const voiced = f0Series.filter((x): x is number => x != null);
  const f0Stats: F0Stats = {
    meanHz: voiced.length ? mean(voiced) : null,
    medianHz: voiced.length ? median(voiced) : null,
    minHz: voiced.length ? Math.min(...voiced) : null,
    maxHz: voiced.length ? Math.max(...voiced) : null,
    sdHz: voiced.length > 1 ? stddev(voiced) : null,
    habitualHz: voiced.length ? median(voiced) : null,
    voicedFrames: voiced.length,
    totalFrames: f0Series.length,
  };

  // MPT (longest continuous voiced segment in seconds)
  let longest = 0;
  let cur = 0;
  let breaks = 0;
  let inVoiced = false;
  for (const v of f0Series) {
    if (v != null) {
      cur += hop / sr;
      inVoiced = true;
    } else {
      if (inVoiced) breaks++;
      inVoiced = false;
      if (cur > longest) longest = cur;
      cur = 0;
    }
  }
  if (cur > longest) longest = cur;

  const stability: StabilityMetrics = {
    voiceBreakPct: f0Series.length ? ((f0Series.length - voiced.length) / f0Series.length) * 100 : 0,
    voiceBreakCount: breaks,
    unvoicedFrames: f0Series.length - voiced.length,
    mptSec: longest,
  };

  const { periods, amps } = extractCycles(signal, sr, f0Series, hop, frameSize);
  const jitter = jitterFromPeriods(periods, sr);
  const shimmer = shimmerFromAmps(amps);

  const harmonic: HarmonicMetrics = {
    hnrDb: hnrList.length ? mean(hnrList) : null,
    nhr: hnrList.length ? Math.pow(10, -mean(hnrList) / 10) : null,
    cppDb: cppList.length ? mean(cppList) : null,
  };

  const meanR = rmsList.length ? mean(rmsList) : 0;
  const peakR = rmsList.length ? Math.max(...rmsList) : 0;
  const energy: EnergyMetrics = {
    meanRms: meanR,
    peakRms: peakR,
    meanDbfs: dbfs(meanR),
    peakDbfs: dbfs(peakR),
  };

  // Noise floor: median RMS of quietest 20% of frames
  const sortedR = [...rmsList].sort((a, b) => a - b);
  const q = Math.max(1, Math.floor(sortedR.length * 0.2));
  const noiseFloor = dbfs(mean(sortedR.slice(0, q)));
  const signalDb = dbfs(peakR);
  const snrDb = isFinite(signalDb - noiseFloor) ? signalDb - noiseFloor : null;
  const quality: QualitySignals = {
    clipping: clippingPct > 0.05,
    clippingPct,
    snrDb,
    noiseFloorDbfs: noiseFloor,
    saturated: clippingPct > 1,
  };

  // Waveform envelope (~1000 points)
  const targetPts = 1000;
  const bucket = Math.max(1, Math.floor(signal.length / targetPts));
  const waveform: number[] = [];
  for (let i = 0; i < signal.length; i += bucket) {
    let peak = 0;
    const end = Math.min(i + bucket, signal.length);
    for (let j = i; j < end; j++) {
      const v = signal[j];
      if (Math.abs(v) > Math.abs(peak)) peak = v;
    }
    waveform.push(peak);
  }

  const spectrogram = computeSpectrogram(signal, sr);

  return {
    durationSec,
    sampleRate: sr,
    f0: f0Stats,
    jitter,
    shimmer,
    harmonic,
    energy,
    stability,
    quality,
    waveform,
    pitchContour,
    intensityContour,
    spectrogram,
  };
}
