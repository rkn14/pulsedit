import type { DecodedPcm } from '../decodedRegistry'
import { appendSilenceTail } from './extendDuration'
import { clonePcm } from './clonePcm'

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x))
}

/** Delay à recirculation ; mix = part du signal retardé (0–1). */
export function applyDelay(
  input: DecodedPcm,
  delaySec: number,
  feedback: number,
  mix: number
): DecodedPcm {
  const sr = input.sampleRate
  const D = Math.max(1, Math.floor(delaySec * sr))
  const fb = Math.max(0, Math.min(0.98, feedback))
  const m = clamp01(mix)
  const out = clonePcm(input)

  for (let c = 0; c < out.channelData.length; c++) {
    const x = out.channelData[c]!
    const len = x.length
    const line = new Float32Array(D)
    let pos = 0
    for (let i = 0; i < len; i++) {
      const delayed = line[pos]!
      line[pos] = x[i]! + fb * delayed
      pos = (pos + 1) % D
      x[i] = (1 - m) * x[i]! + m * delayed
    }
  }
  return out
}

type CombState = { buf: Float32Array; pos: number }

function combStep(inp: number, st: CombState, g: number): number {
  const D = st.buf.length
  const p = st.pos
  const d = st.buf[p]!
  st.buf[p] = inp + g * d
  st.pos = (p + 1) % D
  return d
}

/**
 * Réverb à peigne (4 lignes en parallèle, type freeverb simplifié).
 * @param tailSec silence ajouté **avant** le traitement pour laisser la queue se finir (0 = inchangé).
 */
export function applyReverb(
  input: DecodedPcm,
  room: number,
  mix: number,
  tailSec = 0
): DecodedPcm {
  const sr = input.sampleRate
  const scale = sr / 44100
  const delays = [1116, 1188, 1277, 1356].map((d) =>
    Math.max(2, Math.floor(d * scale))
  )
  const fb = 0.75 + clamp01(room) * 0.22
  const m = clamp01(mix)
  const padded = tailSec > 0 ? appendSilenceTail(input, tailSec) : input
  const out = clonePcm(padded)

  for (let c = 0; c < out.channelData.length; c++) {
    const x = out.channelData[c]!
    const len = x.length
    const combs: CombState[] = delays.map((d) => ({
      buf: new Float32Array(d),
      pos: 0,
    }))
    for (let i = 0; i < len; i++) {
      const dry = x[i]!
      let wet = 0
      for (let k = 0; k < combs.length; k++) {
        wet += combStep(dry, combs[k]!, fb)
      }
      wet /= combs.length
      x[i] = (1 - m) * dry + m * wet
    }
  }
  return out
}

/** Chorus : retard modulé par LFO ; lecture interpolée linéaire. */
export function applyChorus(
  input: DecodedPcm,
  rateHz: number,
  depthMs: number,
  mix: number
): DecodedPcm {
  const sr = input.sampleRate
  const rate = Math.max(0.1, Math.min(12, rateHz))
  const m = clamp01(mix)
  const baseDelay = Math.max(8, Math.floor(0.012 * sr))
  const depthSamp = Math.max(
    2,
    Math.min(Math.floor(0.04 * sr), Math.floor((depthMs / 1000) * sr))
  )
  const dry = input.channelData.map((ch) => Float32Array.from(ch))
  const out = clonePcm(input)

  const w = (2 * Math.PI * rate) / sr

  for (let c = 0; c < out.channelData.length; c++) {
    const x = out.channelData[c]!
    const src = dry[c]!
    const len = x.length
    for (let i = 0; i < len; i++) {
      const lfo = 0.5 + 0.5 * Math.sin(w * i)
      const delay = baseDelay + depthSamp * lfo
      const readPos = i - delay
      let wet: number
      if (readPos < 0) {
        wet = src[i]!
      } else {
        const i0 = Math.floor(readPos)
        const frac = readPos - i0
        const s0 = src[i0] ?? 0
        const s1 = src[i0 + 1] ?? s0
        wet = s0 * (1 - frac) + s1 * frac
      }
      x[i] = (1 - m) * src[i]! + m * wet
    }
  }
  return out
}

/** Tremolo : modulation d’amplitude (profondeur 0–1). */
export function applyTremolo(input: DecodedPcm, rateHz: number, depth: number): DecodedPcm {
  const sr = input.sampleRate
  const rate = Math.max(0.1, Math.min(25, rateHz))
  const d = clamp01(depth)
  const out = clonePcm(input)
  const k = (2 * Math.PI * rate) / sr

  for (const ch of out.channelData) {
    for (let i = 0; i < ch.length; i++) {
      const w = 0.5 + 0.5 * Math.sin(k * i)
      const gain = 1 - d + d * w
      ch[i] *= gain
    }
  }
  return out
}
