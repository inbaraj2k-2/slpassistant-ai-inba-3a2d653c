export type F0Stats = {
  meanHz: number | null;
  medianHz: number | null;
  minHz: number | null;
  maxHz: number | null;
  sdHz: number | null;
  habitualHz: number | null;
  voicedFrames: number;
  totalFrames: number;
};

export type JitterMetrics = {
  localPct: number | null;
  rapPct: number | null;
  ppq5Pct: number | null;
  ddpPct: number | null;
};

export type ShimmerMetrics = {
  localPct: number | null;
  apq3Pct: number | null;
  apq5Pct: number | null;
  apq11Pct: number | null;
  ddaPct: number | null;
};

export type HarmonicMetrics = {
  hnrDb: number | null;
  nhr: number | null;
  cppDb: number | null;
};

export type EnergyMetrics = {
  meanRms: number;
  peakRms: number;
  meanDbfs: number;
  peakDbfs: number;
};

export type StabilityMetrics = {
  voiceBreakPct: number;
  voiceBreakCount: number;
  unvoicedFrames: number;
  mptSec: number; // maximum phonation time (longest continuous voiced segment)
};

export type QualitySignals = {
  clipping: boolean;
  clippingPct: number;
  snrDb: number | null;
  noiseFloorDbfs: number;
  saturated: boolean;
};

export type VoiceAnalysis = {
  durationSec: number;
  sampleRate: number;
  f0: F0Stats;
  jitter: JitterMetrics;
  shimmer: ShimmerMetrics;
  harmonic: HarmonicMetrics;
  energy: EnergyMetrics;
  stability: StabilityMetrics;
  quality: QualitySignals;
  waveform: number[]; // downsampled peak envelope (~1000 pts)
  pitchContour: { t: number; hz: number | null }[]; // per frame
  intensityContour: { t: number; dbfs: number }[]; // per frame
  spectrogram: {
    freqBins: number;
    timeBins: number;
    maxFreqHz: number;
    data: number[]; // row-major dB, length freqBins*timeBins, range ~[-100, 0]
  };
};
