import type WaveSurfer from 'wavesurfer.js'

let instance: WaveSurfer | null = null

export function setWaveSurferInstance(ws: WaveSurfer | null): void {
  instance = ws
}

export function seekWaveformCursor(timeSec: number): void {
  instance?.setTime(Math.max(0, timeSec))
}
