import { SoundTouch } from 'soundtouch-ts'

import type { DecodedPcm } from '../decodedRegistry'
import { clonePcm } from './clonePcm'

function readInterp(ch: Float32Array, pos: number): number {
  const i0 = Math.floor(pos)
  const frac = pos - i0
  const s0 = ch[i0] ?? 0
  const s1 = ch[i0 + 1] ?? s0
  return s0 * (1 - frac) + s1 * frac
}

function resampleMap(
  input: DecodedPcm,
  outLen: number,
  srcPos: (outIndex: number) => number
): DecodedPcm {
  const sr = input.sampleRate
  const chCount = input.channels
  const inLen = input.channelData[0]?.length ?? 0
  if (outLen < 1 || inLen < 1) {
    return {
      sampleRate: sr,
      channels: chCount as 1 | 2,
      channelData: input.channelData.map(() => new Float32Array(0)),
    }
  }
  const outCh = input.channelData.map(() => new Float32Array(outLen))
  for (let c = 0; c < chCount; c++) {
    const src = input.channelData[c]!
    const dst = outCh[c]!
    for (let j = 0; j < outLen; j++) {
      const p = srcPos(j)
      const clamped = Math.max(0, Math.min(inLen - 1, p))
      dst[j] = readInterp(src, clamped)
    }
  }
  return {
    sampleRate: sr,
    channels: chCount as 1 | 2,
    channelData: outCh,
  }
}

/**
 * Décalage de hauteur (durée modifiée). semitones peut inclure des fractions (centièmes).
 * Preview linéaire — qualité « tape speed ».
 */
export function applyPitchSemitones(input: DecodedPcm, semitones: number): DecodedPcm {
  const ratio = Math.pow(2, semitones / 12)
  if (Math.abs(ratio - 1) < 1e-5) {
    return clonePcm(input)
  }
  const inLen = input.channelData[0]!.length
  const outLen = Math.max(1, Math.floor(inLen / ratio))
  return resampleMap(input, outLen, (j) => j * ratio)
}

function pcmToInterleavedStereo(input: DecodedPcm): Float32Array {
  const ch0 = input.channelData[0]!
  const n = ch0.length
  const out = new Float32Array(n * 2)
  if (input.channels === 1) {
    for (let i = 0; i < n; i++) {
      const s = ch0[i]!
      out[i * 2] = s
      out[i * 2 + 1] = s
    }
    return out
  }
  const ch1 = input.channelData[1]!
  for (let i = 0; i < n; i++) {
    out[i * 2] = ch0[i]!
    out[i * 2 + 1] = ch1[i]!
  }
  return out
}

function interleavedToPcm(
  interleaved: Float32Array,
  frames: number,
  sampleRate: number,
  channels: 1 | 2
): DecodedPcm {
  if (channels === 1) {
    const m = new Float32Array(frames)
    for (let i = 0; i < frames; i++) {
      m[i] = interleaved[i * 2]!
    }
    return { sampleRate, channels: 1, channelData: [m] }
  }
  const L = new Float32Array(frames)
  const R = new Float32Array(frames)
  for (let i = 0; i < frames; i++) {
    L[i] = interleaved[i * 2]!
    R[i] = interleaved[i * 2 + 1]!
  }
  return { sampleRate, channels: 2, channelData: [L, R] }
}

/**
 * Étirement temporel : ratio > 1 allonge, < 1 raccourcit (durée × ratio).
 * Algorithme SoundTouch (overlap-add) — la hauteur est préservée (pas de « tape speed »).
 */
export function applyTimeStretchRatio(input: DecodedPcm, ratio: number): DecodedPcm {
  const r = Math.max(0.25, Math.min(10, ratio))
  if (Math.abs(r - 1) < 1e-5) {
    return clonePcm(input)
  }
  const inLen = input.channelData[0]!.length
  const outLen = Math.max(1, Math.floor(inLen * r))
  if (outLen <= 1 || inLen < 1) {
    return resampleMap(input, 1, () => 0)
  }

  const sr = input.sampleRate
  const chCount = input.channels
  const interleaved = pcmToInterleavedStereo(input)
  const st = new SoundTouch(sr)
  st.tempo = 1 / r

  st.inputBuffer.putSamples(interleaved, 0, inLen)
  const padFrames = Math.max(256, Math.ceil(sr * 0.25))
  st.inputBuffer.putSamples(new Float32Array(padFrames * 2), 0, padFrames)

  const chunks: Float32Array[] = []
  let idle = 0
  for (let iter = 0; iter < 500_000; iter++) {
    st.process()
    const ob = st.outputBuffer
    let got = 0
    while (ob.frameCount > 0) {
      const n = ob.frameCount
      const buf = new Float32Array(n * 2)
      ob.receiveSamples(buf, n)
      chunks.push(buf)
      got += n
    }
    if (got === 0) {
      idle++
    } else {
      idle = 0
    }
    if (idle > 24 && st.inputBuffer.frameCount === 0) {
      break
    }
  }

  let totalFrames = 0
  for (const c of chunks) {
    totalFrames += c.length / 2
  }
  const merged = new Float32Array(totalFrames * 2)
  let off = 0
  for (const c of chunks) {
    merged.set(c, off)
    off += c.length
  }

  const take = Math.min(outLen, totalFrames)
  if (take < outLen) {
    const last = inLen - 1
    const oLast = outLen - 1
    return resampleMap(input, outLen, (j) => (j * last) / oLast)
  }
  return interleavedToPcm(merged.subarray(0, take * 2), take, sr, chCount)
}
