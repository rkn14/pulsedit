import { applyEffectChain } from './dsp/processChain'
import { peaksChannelsFromDecodedPcm } from './dsp/peaks'
import { clonePcm } from './dsp/clonePcm'
import {
  getSourcePcm,
  registerPreviewPcm,
  type DecodedPcm,
} from './decodedRegistry'
import { useAppStore } from '@renderer/store/appStore'

const PEAK_BARS = 2048

export type RebuildResult = {
  pcm: DecodedPcm
  /** Une série de pics par canal (longueur 1 ou 2). */
  waveformPeaks: Float32Array[]
  durationSec: number
}

/**
 * Recalcule l’aperçu à partir du source + chaîne d’effets, met à jour le registre et le store.
 */
export function rebuildPreview(assetId: string): RebuildResult | null {
  const source = getSourcePcm(assetId)
  if (!source) {
    return null
  }
  const effects = useAppStore.getState().effects
  const pcm = applyEffectChain(source, effects)
  registerPreviewPcm(assetId, pcm)

  const frames = pcm.channelData[0]?.length ?? 0
  const durationSec = frames / pcm.sampleRate
  const waveformPeaks = peaksChannelsFromDecodedPcm(
    { channelData: pcm.channelData },
    PEAK_BARS
  )

  useAppStore.getState().patchCurrentAsset({
    duration: durationSec,
    channels: pcm.channels,
    sampleRate: pcm.sampleRate,
  })
  useAppStore.getState().setInternalBufferChannels(pcm.channels)

  const sel = useAppStore.getState().selection
  if (sel) {
    const start = Math.max(0, Math.min(sel.start, durationSec))
    const end = Math.max(start, Math.min(sel.end, durationSec))
    useAppStore.getState().setSelection({ start, end })
  }

  return { pcm, waveformPeaks, durationSec }
}

/** Aperçu identique au source (aucun effet). */
export function resetPreviewToSource(assetId: string): RebuildResult | null {
  const source = getSourcePcm(assetId)
  if (!source) {
    return null
  }
  const pcm = clonePcm(source)
  registerPreviewPcm(assetId, pcm)
  const frames = pcm.channelData[0]?.length ?? 0
  const durationSec = frames / pcm.sampleRate
  const waveformPeaks = peaksChannelsFromDecodedPcm(
    { channelData: pcm.channelData },
    PEAK_BARS
  )
  useAppStore.getState().patchCurrentAsset({
    duration: durationSec,
    channels: pcm.channels,
    sampleRate: pcm.sampleRate,
  })
  useAppStore.getState().setInternalBufferChannels(pcm.channels)
  useAppStore.getState().setSelection({ start: 0, end: durationSec })
  return { pcm, waveformPeaks, durationSec }
}
