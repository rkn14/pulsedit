import type { DecodedPcm } from '../decodedRegistry'
import { clonePcm } from './clonePcm'

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x))
}

/** Allpass du 1er ordre (coefficient g ∈ ]-1,1[). */
class Allpass1 {
  private x1 = 0
  private z1 = 0
  tick(x: number, g: number): number {
    const y = g * (x - this.z1) + this.x1
    this.x1 = x
    this.z1 = y
    return y
  }
}

/** Phaser : 4 allpass en série, coefficient modulé par LFO. */
export function applyPhaser(
  input: DecodedPcm,
  rateHz: number,
  depth: number,
  mix: number
): DecodedPcm {
  const sr = input.sampleRate
  const rate = Math.max(0.05, Math.min(12, rateHz))
  const d = clamp01(depth)
  const m = clamp01(mix)
  const w = (2 * Math.PI * rate) / sr
  const out = clonePcm(input)

  for (const ch of out.channelData) {
    const aps = [
      new Allpass1(),
      new Allpass1(),
      new Allpass1(),
      new Allpass1(),
    ]
    for (let i = 0; i < ch.length; i++) {
      const dry = ch[i]!
      let x = dry
      const g = 0.35 + 0.55 * (0.5 + 0.5 * Math.sin(w * i)) * (0.3 + 0.7 * d)
      const gg = Math.max(-0.98, Math.min(0.98, g))
      for (const ap of aps) {
        x = ap.tick(x, gg)
      }
      ch[i] = (1 - m) * dry + m * x
    }
  }
  return out
}

/** Flanger : retard modulé court (comme chorus) + léger feedback sur le tap retardé. */
export function applyFlanger(
  input: DecodedPcm,
  rateHz: number,
  depthMs: number,
  feedback: number,
  mix: number
): DecodedPcm {
  const sr = input.sampleRate
  const rate = Math.max(0.05, Math.min(8, rateHz))
  const base = Math.max(8, Math.floor(0.00045 * sr))
  const depthSamp = Math.max(
    2,
    Math.min(Math.floor(0.004 * sr), Math.floor((depthMs / 1000) * sr))
  )
  const fb = Math.max(0, Math.min(0.92, feedback))
  const m = clamp01(mix)
  const dry = input.channelData.map((ch) => Float32Array.from(ch))
  const out = clonePcm(input)
  const w = (2 * Math.PI * rate) / sr

  for (let c = 0; c < out.channelData.length; c++) {
    const x = out.channelData[c]!
    const src = dry[c]!
    let prevTap = 0
    for (let i = 0; i < x.length; i++) {
      const lfo = 0.5 + 0.5 * Math.sin(w * i)
      const delay = base + depthSamp * lfo
      const readPos = i - delay
      let tap = 0
      if (readPos >= 0) {
        const i0 = Math.floor(readPos)
        const frac = readPos - i0
        const s0 = src[i0] ?? 0
        const s1 = src[i0 + 1] ?? s0
        tap = s0 * (1 - frac) + s1 * frac
      } else {
        tap = src[i]!
      }
      const wet = tap + fb * prevTap
      prevTap = tap
      x[i] = (1 - m) * src[i]! + m * wet
    }
  }
  return out
}

/** Saturation tanh (drive 0–1). */
export function applyDistortion(input: DecodedPcm, drive: number): DecodedPcm {
  const g = 1 + clamp01(drive) * 48
  const norm = Math.tanh(g)
  const scale = norm > 1e-8 ? 1 / norm : 1
  const out = clonePcm(input)
  for (const ch of out.channelData) {
    for (let i = 0; i < ch.length; i++) {
      ch[i] = Math.tanh(g * ch[i]!) * scale
    }
  }
  return out
}

/** Réduction de bits + décimation légère. */
export function applyBitcrusher(input: DecodedPcm, bits: number, downsample: number): DecodedPcm {
  const b = Math.max(4, Math.min(16, Math.round(bits)))
  const levels = Math.pow(2, b - 1)
  const ds = Math.max(1, Math.min(32, Math.floor(downsample)))
  const out = clonePcm(input)
  let hold = 0
  let cnt = 0

  for (const ch of out.channelData) {
    cnt = 0
    hold = 0
    for (let i = 0; i < ch.length; i++) {
      if (cnt % ds === 0) {
        hold = Math.round(ch[i]! * levels) / levels
      }
      cnt++
      ch[i] = hold
    }
  }
  return out
}

/** Compresseur feedforward simplifié (seuil + ratio). */
export function applyCompressor(
  input: DecodedPcm,
  thresholdDb: number,
  ratio: number,
  attackMs: number,
  releaseMs: number
): DecodedPcm {
  const sr = input.sampleRate
  const T = Math.pow(10, thresholdDb / 20)
  const r = Math.max(1, Math.min(40, ratio))
  const attC = 1 - Math.exp(-1 / Math.max(1, (attackMs / 1000) * sr))
  const relC = 1 - Math.exp(-1 / Math.max(1, (releaseMs / 1000) * sr))
  const out = clonePcm(input)

  for (const ch of out.channelData) {
    let env = 0
    for (let i = 0; i < ch.length; i++) {
      const x = ch[i]!
      const mag = Math.abs(x)
      if (mag > env) {
        env += attC * (mag - env)
      } else {
        env += relC * (mag - env)
      }
      let g = 1
      if (env > T && env > 1e-12) {
        const envOut = T + (env - T) / r
        g = envOut / env
      }
      ch[i] = x * g
    }
  }
  return out
}

type Biquad = {
  b0: number
  b1: number
  b2: number
  a1: number
  a2: number
  z1: number
  z2: number
}

function makePeaking(sr: number, fc: number, gainDb: number, Q: number): Biquad {
  const A = Math.pow(10, gainDb / 40)
  const w0 = (2 * Math.PI * fc) / sr
  const cosw0 = Math.cos(w0)
  const sinw0 = Math.sin(w0)
  const alpha = sinw0 / (2 * Math.max(0.1, Q))
  const b0 = 1 + alpha * A
  const b1 = -2 * cosw0
  const b2 = 1 - alpha * A
  const a0 = 1 + alpha / A
  const a1 = -2 * cosw0
  const a2 = 1 - alpha / A
  return {
    b0: b0 / a0,
    b1: b1 / a0,
    b2: b2 / a0,
    a1: a1 / a0,
    a2: a2 / a0,
    z1: 0,
    z2: 0,
  }
}

/** Direct form II transposée (compatible Web Audio). */
function biquadTick(x: number, f: Biquad): number {
  const y = f.b0 * x + f.z1
  f.z1 = f.b1 * x - f.a1 * y + f.z2
  f.z2 = f.b2 * x - f.a2 * y
  return y
}

/** EQ 3 bandes (pics RBJ en série : grave / médium / aigu). */
export function applyEq3(
  input: DecodedPcm,
  lowDb: number,
  midDb: number,
  highDb: number
): DecodedPcm {
  const sr = input.sampleRate
  const low = makePeaking(sr, 180, lowDb, 0.9)
  const mid = makePeaking(sr, 1400, midDb, 1)
  const high = makePeaking(sr, 6500, highDb, 0.9)
  const out = clonePcm(input)

  for (const ch of out.channelData) {
    const l = { ...low, z1: 0, z2: 0 }
    const m = { ...mid, z1: 0, z2: 0 }
    const h = { ...high, z1: 0, z2: 0 }
    for (let i = 0; i < ch.length; i++) {
      let x = ch[i]!
      x = biquadTick(x, l)
      x = biquadTick(x, m)
      ch[i] = biquadTick(x, h)
    }
  }
  return out
}
