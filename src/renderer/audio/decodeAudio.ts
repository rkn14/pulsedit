import type { DecodeSuccessPayload } from '@shared/audioWorkerMessages'
import { computeMonoPeaks } from './dsp/peaks'

const TARGET_RATE = 44100
const WAVEFORM_BARS = 2048

function ensureAtMostStereo(input: AudioBuffer): AudioBuffer {
  const n = input.numberOfChannels
  if (n <= 2) {
    return input
  }
  const len = input.length
  const out = new AudioBuffer({
    length: len,
    numberOfChannels: 2,
    sampleRate: input.sampleRate,
  })
  out.copyToChannel(input.getChannelData(0), 0)
  out.copyToChannel(input.getChannelData(1), 1)
  return out
}

async function resampleTo44k(input: AudioBuffer): Promise<AudioBuffer> {
  if (input.sampleRate === TARGET_RATE) {
    return input
  }
  const durationSec = input.duration
  const length = Math.max(1, Math.ceil(durationSec * TARGET_RATE))
  const offline = new OfflineAudioContext(input.numberOfChannels, length, TARGET_RATE)
  const src = offline.createBufferSource()
  src.buffer = input
  src.connect(offline.destination)
  src.start(0)
  return offline.startRendering()
}

/**
 * Décode un fichier audio dans le thread renderer (Web Audio n’est pas disponible dans les Workers).
 * Normalise en 44,1 kHz stéréo ou mono.
 */
export async function decodeAndNormalize(
  assetId: string,
  arrayBuffer: ArrayBuffer
): Promise<DecodeSuccessPayload> {
  const requestId = crypto.randomUUID()

  const decodeCtx = new AudioContext()
  const decoded = await decodeCtx.decodeAudioData(arrayBuffer.slice(0))
  await decodeCtx.close()

  const stereo = ensureAtMostStereo(decoded)
  const resampled = await resampleTo44k(stereo)
  const ch: 1 | 2 = resampled.numberOfChannels >= 2 ? 2 : 1
  const channelData: Float32Array[] = []

  for (let c = 0; c < resampled.numberOfChannels; c++) {
    const raw = resampled.getChannelData(c)
    const copy = new Float32Array(raw.length)
    copy.set(raw)
    channelData.push(copy)
  }

  const waveformPeaks = computeMonoPeaks(resampled, WAVEFORM_BARS)

  return {
    type: 'decode-success',
    id: assetId,
    requestId,
    duration: resampled.duration,
    channels: ch,
    sampleRate: TARGET_RATE,
    channelData,
    waveformPeaks,
  }
}
