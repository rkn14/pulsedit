/** Valeurs par défaut pour réinitialisation (phase 7.5). */
export const SECOND_WAVE_DEFAULTS = {
  phaser: { rateHz: 0.6, depth: 0.65, mix: 0.45 },
  flanger: {
    rateHz: 0.45,
    depthMs: 1.8,
    feedback: 0.4,
    mix: 0.42,
  },
  distortion: { drive: 0.25 },
  bitcrusher: { bits: 10, downsample: 2 },
  compressor: {
    thresholdDb: -20,
    ratio: 4,
    attackMs: 5,
    releaseMs: 120,
  },
  eq: { lowDb: 0, midDb: 0, highDb: 0 },
} as const
