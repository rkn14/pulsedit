import type WaveSurfer from 'wavesurfer.js'

let instance: WaveSurfer | null = null

type RegionLike = {
  setOptions: (opts: Partial<{ start: number; end: number }>) => void
  remove: () => void
}

let editRegion: RegionLike | null = null

/** Recréer la région si elle a été retirée (ex. après annulation). */
let ensureEditRegion: ((range: { start: number; end: number }) => void) | null =
  null

export function setEnsureEditRegionFn(
  fn: ((range: { start: number; end: number }) => void) | null
): void {
  ensureEditRegion = fn
}

export function setWaveSurferInstance(ws: WaveSurfer | null): void {
  instance = ws
}

export function setEditRegion(r: RegionLike | null): void {
  editRegion = r
}

export function syncEditRegionRange(start: number, end: number): void {
  if (editRegion) {
    editRegion.setOptions({ start, end })
  } else {
    ensureEditRegion?.({ start, end })
  }
}

export function clearEditRegion(): void {
  editRegion?.remove()
  editRegion = null
}

export function seekWaveformCursor(timeSec: number): void {
  instance?.setTime(Math.max(0, timeSec))
}
