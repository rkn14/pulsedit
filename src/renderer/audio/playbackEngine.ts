import type { SelectionRange } from '@shared/types'
import { getDecodedPcm } from './decodedRegistry'
import { seekWaveformCursor } from './waveformBridge'
import { useAppStore } from '@renderer/store/appStore'

let audioCtx: AudioContext | null = null
let activeSource: AudioBufferSourceNode | null = null
let rafId = 0
let playbackAnchorCtxTime = 0
let playbackOffsetSec = 0
let playbackEndSec = 0

function ensureAudioContext(): AudioContext {
  if (!audioCtx || audioCtx.state === 'closed') {
    audioCtx = new AudioContext({ sampleRate: 44100 })
  }
  return audioCtx
}

function cancelTick(): void {
  if (rafId) {
    cancelAnimationFrame(rafId)
    rafId = 0
  }
}

function effectiveRange(
  selection: SelectionRange | null,
  duration: number
): { start: number; end: number } {
  if (!selection || selection.start >= selection.end) {
    return { start: 0, end: duration }
  }
  return {
    start: Math.max(0, selection.start),
    end: Math.min(duration, selection.end),
  }
}

function tickPlayback(): void {
  const ctx = audioCtx
  if (!ctx || !activeSource) {
    return
  }
  const elapsed = ctx.currentTime - playbackAnchorCtxTime
  const pos = Math.min(playbackOffsetSec + elapsed, playbackEndSec)
  useAppStore.getState().setPlayback({ positionSec: pos, isPlaying: true })
  seekWaveformCursor(pos)
  rafId = requestAnimationFrame(tickPlayback)
}

function onSourceEnded(source: AudioBufferSourceNode): void {
  cancelTick()
  if (activeSource === source) {
    activeSource = null
  }
  const end = playbackEndSec
  useAppStore.getState().setPlayback({ isPlaying: false, positionSec: end })
  seekWaveformCursor(end)
}

/**
 * Lecture des données PCM décodées (44,1 kHz), sur la sélection courante ou tout le fichier.
 */
export function startPlaybackFromDecoded(assetId: string): void {
  const pcm = getDecodedPcm(assetId)
  const asset = useAppStore.getState().currentAsset
  if (!pcm || !asset || asset.id !== assetId) {
    return
  }

  stopPlayback()

  const duration = asset.duration > 0 ? asset.duration : pcm.channelData[0]!.length / pcm.sampleRate
  const { start, end } = effectiveRange(useAppStore.getState().selection, duration)
  const playDuration = Math.max(0.001, end - start)
  if (playDuration <= 0) {
    return
  }

  const ctx = ensureAudioContext()
  void ctx.resume()

  const nCh = pcm.channels
  const frames = pcm.channelData[0]!.length
  const buffer = ctx.createBuffer(nCh, frames, pcm.sampleRate)
  for (let c = 0; c < nCh; c++) {
    buffer.copyToChannel(pcm.channelData[c]!, c)
  }

  const source = ctx.createBufferSource()
  source.buffer = buffer
  source.connect(ctx.destination)

  const when = ctx.currentTime
  playbackAnchorCtxTime = when
  playbackOffsetSec = start
  playbackEndSec = end

  source.onended = () => {
    onSourceEnded(source)
  }

  activeSource = source
  source.start(when, start, playDuration)

  useAppStore.getState().setPlayback({ isPlaying: true, positionSec: start })
  seekWaveformCursor(start)
  cancelTick()
  rafId = requestAnimationFrame(tickPlayback)
}

export function stopPlayback(): void {
  cancelTick()
  if (activeSource) {
    try {
      activeSource.stop()
    } catch {
      /* déjà arrêté */
    }
    activeSource = null
  }
  useAppStore.getState().setPlayback({ isPlaying: false })
}
