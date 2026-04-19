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

/** Aligné sur ZoomPlugin `maxZoom` et `minPxPerSec` par défaut du panneau waveform. */
const ZOOM_PX_MIN = 16
const ZOOM_PX_MAX = 512
const ZOOM_STEP = 1.14

/** Zoom avant / arrière (raccourcis +/−). Sans instance WaveSurfer, ne fait rien. */
export function nudgeWaveformZoom(direction: 1 | -1): void {
  const ws = instance
  if (!ws) {
    return
  }
  const z = ws.getState().zoom.value
  const cur =
    z > 0 ? z : (ws.options.minPxPerSec ?? 64)
  const factor = direction === 1 ? ZOOM_STEP : 1 / ZOOM_STEP
  const next = Math.max(ZOOM_PX_MIN, Math.min(ZOOM_PX_MAX, cur * factor))
  ws.zoom(next)
}
