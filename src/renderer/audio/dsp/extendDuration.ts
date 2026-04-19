import type { DecodedPcm } from '../decodedRegistry'
import { clonePcm } from './clonePcm'

/**
 * Prolonge le buffer avec du silence en fin de fichier.
 * Après `applyEffectChain`, `rebuildPreview()` déduit la durée totale de
 * `channelData[0].length` : tout effet qui renvoie un buffer plus long met
 * automatiquement à jour durée, waveform et sélection (bornée).
 */
export function appendSilenceTail(input: DecodedPcm, tailSec: number): DecodedPcm {
  const sr = input.sampleRate
  const n = Math.max(0, Math.floor(tailSec * sr))
  if (n === 0) {
    return clonePcm(input)
  }
  const channelData = input.channelData.map((ch) => {
    const out = new Float32Array(ch.length + n)
    out.set(ch)
    return out
  })
  return {
    sampleRate: sr,
    channels: input.channels,
    channelData,
  }
}
