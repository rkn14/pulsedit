import type { DecodedPcm } from '../decodedRegistry'

/** Extrait [startSec, endSec) en échantillons (aligné sur la grille du sample rate). */
export function slicePcmByTimeRange(
  pcm: DecodedPcm,
  startSec: number,
  endSec: number
): DecodedPcm {
  const sr = pcm.sampleRate
  const len = pcm.channelData[0]?.length ?? 0
  const start = Math.max(0, Math.min(len, Math.floor(startSec * sr)))
  const end = Math.max(start, Math.min(len, Math.ceil(endSec * sr)))
  const channelData = pcm.channelData.map((ch) => ch.subarray(start, end))
  return {
    sampleRate: pcm.sampleRate,
    channels: pcm.channels,
    channelData,
  }
}
