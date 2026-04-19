import type { EffectInstance, EffectType } from '@shared/types'
import type { DecodedPcm } from '../decodedRegistry'
import { clonePcm } from './clonePcm'

const ORDER: EffectType[] = [
  'trim',
  'gain',
  'fadeIn',
  'fadeOut',
  'normalize',
  'stereoToMono',
]

function dbToLinear(db: number): number {
  return Math.pow(10, db / 20)
}

function applyTrim(input: DecodedPcm, startSec: number, endSec: number): DecodedPcm {
  const sr = input.sampleRate
  const start = Math.max(0, Math.floor(startSec * sr))
  const end = Math.min(input.channelData[0]!.length, Math.ceil(endSec * sr))
  const len = Math.max(0, end - start)
  if (len === 0) {
    return {
      sampleRate: sr,
      channels: input.channels,
      channelData: input.channelData.map(() => new Float32Array(0)),
    }
  }
  const channelData = input.channelData.map((ch) => {
    const out = new Float32Array(len)
    out.set(ch.subarray(start, end))
    return out
  })
  const ch: 1 | 2 = channelData.length >= 2 ? 2 : 1
  return { sampleRate: sr, channels: ch, channelData }
}

function applyGain(input: DecodedPcm, gainDb: number): DecodedPcm {
  const g = dbToLinear(gainDb)
  const out = clonePcm(input)
  for (const ch of out.channelData) {
    for (let i = 0; i < ch.length; i++) {
      ch[i] *= g
    }
  }
  return out
}

function applyFadeIn(input: DecodedPcm, durationSec: number): DecodedPcm {
  if (durationSec <= 0) {
    return input
  }
  const out = clonePcm(input)
  const sr = out.sampleRate
  const n = Math.min(out.channelData[0]!.length, Math.floor(durationSec * sr))
  for (let i = 0; i < n; i++) {
    const t = i / Math.max(1, n - 1)
    for (const ch of out.channelData) {
      ch[i] *= t
    }
  }
  return out
}

function applyFadeOut(input: DecodedPcm, durationSec: number): DecodedPcm {
  if (durationSec <= 0) {
    return input
  }
  const out = clonePcm(input)
  const sr = out.sampleRate
  const total = out.channelData[0]!.length
  const n = Math.min(total, Math.floor(durationSec * sr))
  const start = total - n
  for (let j = 0; j < n; j++) {
    const i = start + j
    const t = j / Math.max(1, n - 1)
    const amp = 1 - t
    for (const ch of out.channelData) {
      ch[i] *= amp
    }
  }
  return out
}

function applyNormalize(input: DecodedPcm, targetPeak: number): DecodedPcm {
  let peak = 0
  for (const ch of input.channelData) {
    for (let i = 0; i < ch.length; i++) {
      const v = Math.abs(ch[i])
      if (v > peak) {
        peak = v
      }
    }
  }
  if (peak < 1e-12) {
    return clonePcm(input)
  }
  const g = targetPeak / peak
  const out = clonePcm(input)
  for (const ch of out.channelData) {
    for (let i = 0; i < ch.length; i++) {
      ch[i] *= g
    }
  }
  return out
}

function applyStereoToMono(input: DecodedPcm): DecodedPcm {
  if (input.channels === 1) {
    return clonePcm(input)
  }
  const L = input.channelData[0]!
  const R = input.channelData[1]!
  const len = L.length
  const mono = new Float32Array(len)
  for (let i = 0; i < len; i++) {
    mono[i] = (L[i] + R[i]) / 2
  }
  return {
    sampleRate: input.sampleRate,
    channels: 1,
    channelData: [mono],
  }
}

function applyOne(input: DecodedPcm, fx: EffectInstance): DecodedPcm {
  const p = fx.params
  switch (fx.type) {
    case 'trim':
      return applyTrim(input, p.startSec ?? 0, p.endSec ?? input.channelData[0]!.length / input.sampleRate)
    case 'gain':
      return applyGain(input, p.gainDb ?? 0)
    case 'fadeIn':
      return applyFadeIn(input, p.durationSec ?? 0)
    case 'fadeOut':
      return applyFadeOut(input, p.durationSec ?? 0)
    case 'normalize':
      return applyNormalize(input, p.targetPeak ?? 0.99)
    case 'stereoToMono':
      return applyStereoToMono(input)
    default:
      return clonePcm(input)
  }
}

/**
 * Applique la chaîne d’effets activés, dans l’ordre imposé par la spec (trim → gain → fades → norm → mono).
 */
export function applyEffectChain(source: DecodedPcm, chain: EffectInstance[]): DecodedPcm {
  const enabled = chain.filter((e) => e.enabled)
  let buf = clonePcm(source)
  for (const t of ORDER) {
    const fx = enabled.find((e) => e.type === t)
    if (fx) {
      buf = applyOne(buf, fx)
    }
  }
  return buf
}
