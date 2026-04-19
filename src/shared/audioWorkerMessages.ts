/** Charge utile du décodage audio (renderer). */

export type DecodeRequest = {
  type: 'decode'
  id: string
  requestId: string
  arrayBuffer: ArrayBuffer
}

export type DecodeSuccessPayload = {
  type: 'decode-success'
  id: string
  requestId: string
  duration: number
  channels: 1 | 2
  sampleRate: 44100
  /** Données PCM internes (44.1 kHz), une entrée par canal */
  channelData: Float32Array[]
  /** Courbe réduite pour affichage WaveSurfer (mono, valeurs ≥ 0) */
  waveformPeaks: Float32Array
}

export type DecodeErrorPayload = {
  type: 'decode-error'
  id: string
  requestId: string
  message: string
}

export type DecodeResponse = DecodeSuccessPayload | DecodeErrorPayload
