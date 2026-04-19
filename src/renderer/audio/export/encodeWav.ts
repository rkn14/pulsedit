import { WaveFile } from 'wavefile'

import type { DecodedPcm } from '../decodedRegistry'

/** WAV 44,1 kHz (ou le SR du buffer) PCM 16 bits, fidèle au float d’entrée. */
export function encodeDecodedPcmToWavBytes(pcm: DecodedPcm): Uint8Array {
  const w = new WaveFile()
  if (pcm.channels === 1) {
    const ch0 = pcm.channelData[0]
    if (!ch0?.length) {
      w.fromScratch(1, pcm.sampleRate, '32f', new Float32Array(0))
    } else {
      w.fromScratch(1, pcm.sampleRate, '32f', ch0)
    }
  } else {
    const L = pcm.channelData[0]
    const R = pcm.channelData[1]
    const n = L?.length ?? 0
    if (n < 1 || !R) {
      w.fromScratch(2, pcm.sampleRate, '32f', new Float32Array(0))
    } else {
      const interleaved = new Float32Array(n * 2)
      for (let i = 0; i < n; i++) {
        interleaved[i * 2] = L[i]!
        interleaved[i * 2 + 1] = R[i]!
      }
      w.fromScratch(2, pcm.sampleRate, '32f', interleaved)
    }
  }
  w.toBitDepth('16')
  return new Uint8Array(w.toBuffer())
}
