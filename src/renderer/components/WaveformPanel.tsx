import { useEffect, useRef, useState } from 'react'
import WaveSurfer from 'wavesurfer.js'
import ZoomPlugin from 'wavesurfer.js/dist/plugins/zoom.esm.js'
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js'
import { useAppStore } from '@renderer/store/appStore'
import { requestDecode } from '@renderer/audio/decodePipeline'
import { clearDecodedPcm, registerSourcePcm, type DecodedPcm } from '@renderer/audio/decodedRegistry'
import { stopPlayback } from '@renderer/audio/playbackEngine'
import {
  clearEditRegion,
  setEditRegion,
  setEnsureEditRegionFn,
  setWaveSurferInstance,
  syncEditRegionRange,
} from '@renderer/audio/waveformBridge'
import { rebuildPreview } from '@renderer/audio/rebuildPreview'

/** Même valeur que `minPxPerSec` dans WaveSurfer.create — sert de référence 100 % pour l’affichage. */
const WAVEFORM_BASE_MIN_PX_PER_SEC = 64

/**
 * Couleur de base de la région (inline WaveSurfer). Le rendu détaillé est dans le shadow DOM
 * via injectWaveformRegionStyles — les règles globales index.css ne s’y appliquent pas.
 */
const EDIT_REGION_COLOR = 'rgba(56, 189, 248, 0.18)'

/** Temps (s) au clic à partir de clientX, en tenant compte du scroll horizontal (zoom). */
function clickTimeSecFromClientX(ws: WaveSurfer, clientX: number): number {
  const wrapper = ws.getWrapper()
  const sc = wrapper.parentElement as HTMLElement | null
  if (!sc || wrapper.scrollWidth <= 0) {
    return 0
  }
  const scr = sc.getBoundingClientRect()
  const xInContent = clientX - scr.left + sc.scrollLeft
  const frac = Math.max(0, Math.min(1, xInContent / wrapper.scrollWidth))
  return frac * ws.getDuration()
}

/** Le pointeur est-il à l’intérieur du calque de sélection (repère visuel) ? */
function isPointerInsideSelectionOverlay(
  container: HTMLElement,
  ws: WaveSurfer,
  clientX: number,
  clientY: number,
  sel: { start: number; end: number }
): boolean {
  const host = container.firstElementChild as HTMLElement | undefined
  const regionEl = host?.shadowRoot?.querySelector(
    '[part~="edit-selection"]'
  ) as HTMLElement | null

  if (regionEl?.isConnected) {
    const r = regionEl.getBoundingClientRect()
    return (
      clientX >= r.left &&
      clientX <= r.right &&
      clientY >= r.top &&
      clientY <= r.bottom
    )
  }

  const t = clickTimeSecFromClientX(ws, clientX)
  const tol = 1e-4
  return t >= sel.start - tol && t <= sel.end + tol
}

/** Styles des régions dans le shadow DOM WaveSurfer (obligatoire : le canvas / régions sont encapsulés). */
function injectWaveformRegionStyles(wsHost: HTMLElement): () => void {
  const root = wsHost.shadowRoot
  if (!root) {
    return () => {}
  }
  const style = document.createElement('style')
  style.textContent = `
    [part~="edit-selection"] {
      pointer-events: none !important;
      background:
        linear-gradient(0deg, rgba(0, 24, 52, 0.44), rgba(0, 24, 52, 0.44)),
        linear-gradient(0deg, rgba(56, 189, 248, 0.14), rgba(56, 189, 248, 0.14)) !important;
      box-shadow:
        inset 2px 0 0 0 rgba(56, 189, 248, 0.98),
        inset -2px 0 0 0 rgba(56, 189, 248, 0.98) !important;
    }
    [part~="edit-selection"] [part*="region-handle"] {
      pointer-events: auto !important;
      width: 10px !important;
      min-width: 8px !important;
      border-left: none !important;
      border-right: none !important;
      border-radius: 3px !important;
      background: linear-gradient(
        180deg,
        rgba(56, 189, 248, 0.6) 0%,
        rgba(14, 165, 233, 0.85) 100%
      ) !important;
      box-shadow:
        0 0 0 1px rgba(56, 189, 248, 0.95),
        0 0 12px rgba(56, 189, 248, 0.35);
    }
  `
  root.appendChild(style)
  return () => {
    style.remove()
  }
}

const editRegionParams = {
  id: 'edit-selection',
  color: EDIT_REGION_COLOR,
  drag: false,
  resize: true,
  resizeStart: true,
  resizeEnd: true,
} as const

/** Bouton souris « molette » (clic milieu) — MDN: 0=gauche, 1=milieu, 2=droit */
const POINTER_BUTTON_MIDDLE = 1

function getWaveformScrollMetrics(ws: WaveSurfer): {
  scrollLeft: number
  maxScroll: number
} {
  const wrapper = ws.getWrapper()
  const sc = wrapper.parentElement
  if (!sc) {
    return { scrollLeft: 0, maxScroll: 0 }
  }
  const maxScroll = Math.max(0, sc.scrollWidth - sc.clientWidth)
  return {
    scrollLeft: sc.scrollLeft,
    maxScroll,
  }
}

/**
 * Pan horizontal : clic molette + glisser (évite le conflit avec zoom molette et sélection).
 */
function attachMiddleButtonPan(container: HTMLElement, ws: WaveSurfer): () => void {
  let lastX = 0
  let active = false
  let capId = 0

  const stopPan = () => {
    active = false
  }

  const onPointerDown = (e: PointerEvent) => {
    if (e.button !== POINTER_BUTTON_MIDDLE) {
      return
    }
    e.preventDefault()
    e.stopPropagation()
    active = true
    lastX = e.clientX
    capId = e.pointerId
    try {
      container.setPointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
  }

  const onPointerMove = (e: PointerEvent) => {
    if (!active || e.pointerId !== capId) {
      return
    }
    e.preventDefault()
    const dx = e.clientX - lastX
    lastX = e.clientX
    ws.setScroll(ws.getScroll() - dx)
  }

  const onPointerUp = (e: PointerEvent) => {
    if (!active || e.pointerId !== capId) {
      return
    }
    e.preventDefault()
    active = false
    try {
      container.releasePointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
  }

  const onAuxClick = (e: MouseEvent) => {
    if (e.button === POINTER_BUTTON_MIDDLE) {
      e.preventDefault()
    }
  }

  container.addEventListener('pointerdown', onPointerDown, true)
  container.addEventListener('pointermove', onPointerMove, true)
  container.addEventListener('pointerup', onPointerUp, true)
  container.addEventListener('pointercancel', onPointerUp, true)
  container.addEventListener('lostpointercapture', stopPan)
  container.addEventListener('auxclick', onAuxClick, true)

  return () => {
    container.removeEventListener('pointerdown', onPointerDown, true)
    container.removeEventListener('pointermove', onPointerMove, true)
    container.removeEventListener('pointerup', onPointerUp, true)
    container.removeEventListener('pointercancel', onPointerUp, true)
    container.removeEventListener('lostpointercapture', stopPan)
    container.removeEventListener('auxclick', onAuxClick, true)
  }
}

export function WaveformPanel() {
  const asset = useAppStore((s) => s.currentAsset)
  const patchCurrentAsset = useAppStore((s) => s.patchCurrentAsset)
  const setInternalBufferChannels = useAppStore((s) => s.setInternalBufferChannels)
  const setSelection = useAppStore((s) => s.setSelection)
  const pushHistorySnapshot = useAppStore((s) => s.pushHistorySnapshot)
  const effects = useAppStore((s) => s.effects)
  const selection = useAppStore((s) => s.selection)

  const assetId = asset?.id
  const assetPath = asset?.filePath

  const containerRef = useRef<HTMLDivElement>(null)
  const wavesurferRef = useRef<WaveSurfer | null>(null)

  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [waveformUi, setWaveformUi] = useState<{
    zoomPercent: number
    scrollLeft: number
    maxScroll: number
  } | null>(null)

  /** Chargement fichier + enregistrement source PCM */
  useEffect(() => {
    if (!assetId || !assetPath) {
      setStatus('idle')
      setErrorMessage(null)
      wavesurferRef.current?.destroy()
      wavesurferRef.current = null
      return
    }

    const container = containerRef.current
    if (!container) {
      return
    }

    let cancelled = false

    async function load() {
      setStatus('loading')
      setErrorMessage(null)
      wavesurferRef.current?.destroy()
      wavesurferRef.current = null
      setWaveSurferInstance(null)

      try {
        const raw = await window.pulsedit.readAudioFile(assetPath)
        if (cancelled) {
          return
        }

        const decoded = await requestDecode(assetId, raw)
        if (cancelled) {
          return
        }

        const pcm: DecodedPcm = {
          sampleRate: decoded.sampleRate,
          channels: decoded.channels,
          channelData: decoded.channelData.map((c) => {
            const x = new Float32Array(c.length)
            x.set(c)
            return x
          }),
        }
        registerSourcePcm(assetId, pcm)

        patchCurrentAsset({
          duration: decoded.duration,
          channels: decoded.channels,
          sampleRate: decoded.sampleRate,
        })
        setInternalBufferChannels(decoded.channels)
        setSelection({ start: 0, end: decoded.duration })

        setStatus('ready')
      } catch (e: unknown) {
        if (!cancelled) {
          setStatus('error')
          setErrorMessage(e instanceof Error ? e.message : 'Erreur de chargement')
          clearDecodedPcm(assetId)
        }
      }
    }

    void load()

    return () => {
      cancelled = true
      stopPlayback()
      setEditRegion(null)
      setWaveSurferInstance(null)
      clearDecodedPcm(assetId)
      wavesurferRef.current?.destroy()
      wavesurferRef.current = null
    }
  }, [
    assetId,
    assetPath,
    patchCurrentAsset,
    setInternalBufferChannels,
    setSelection,
  ])

  /** Rebuild aperçu + WaveSurfer quand les effets changent ou après chargement */
  useEffect(() => {
    if (status !== 'ready' || !assetId) {
      return
    }
    const container = containerRef.current
    if (!container) {
      return
    }

    stopPlayback()
    const r = rebuildPreview(assetId)
    if (!r) {
      return
    }

    wavesurferRef.current?.destroy()
    wavesurferRef.current = null
    setWaveSurferInstance(null)

    const regions = RegionsPlugin.create()

    const syncFromRegion = (reg: { start: number; end: number }) => {
      setSelection({ start: reg.start, end: reg.end })
    }

    const wireEditRegion = (reg: {
      start: number
      end: number
      on: (ev: 'update' | 'update-end', fn: () => void) => void
    }) => {
      setEditRegion(reg)
      reg.on('update', () => {
        syncFromRegion(reg)
      })
      reg.on('update-end', () => {
        pushHistorySnapshot()
        syncFromRegion(reg)
      })
    }

    let isFirstRegion = true

    regions.on('region-created', (reg) => {
      if (!isFirstRegion) {
        regions.getRegions().forEach((r) => {
          if (r !== reg) {
            r.remove()
          }
        })
        reg.setOptions({
          id: editRegionParams.id,
          color: editRegionParams.color,
          drag: editRegionParams.drag,
          resize: editRegionParams.resize,
          resizeStart: editRegionParams.resizeStart,
          resizeEnd: editRegionParams.resizeEnd,
        })
      }
      isFirstRegion = false
      wireEditRegion(reg)
    })

    regions.on('region-updated', (reg) => {
      if (reg.id === 'edit-selection') {
        syncFromRegion(reg)
      }
    })

    const stereo = r.pcm.channels === 2
    const ws = WaveSurfer.create({
      container,
      /* Même teinte avant / après la tête de lecture (pas de masque « progress » différent). */
      waveColor: '#7dd3fc',
      progressColor: '#7dd3fc',
      cursorColor: '#a8b8cc',
      cursorWidth: 2,
      height: 'auto',
      normalize: true,
      peaks: r.waveformPeaks,
      splitChannels: stereo
        ? [
            { waveColor: '#7dd3fc', progressColor: '#7dd3fc' },
            { waveColor: '#5eead4', progressColor: '#5eead4' },
          ]
        : undefined,
      duration: r.durationSec,
      minPxPerSec: WAVEFORM_BASE_MIN_PX_PER_SEC,
      fillParent: true,
      hideScrollbar: true,
      plugins: [
        ZoomPlugin.create({
          scale: 0.35,
          maxZoom: 512,
        }),
        regions,
      ],
    })

    wavesurferRef.current = ws
    setWaveSurferInstance(ws)

    const sel = useAppStore.getState().selection
    regions.addRegion({
      ...editRegionParams,
      start: sel?.start ?? 0,
      end: sel?.end ?? r.durationSec,
    })

    const disableDragSelect = regions.enableDragSelection(
      {
        ...editRegionParams,
      },
      4
    )

    setEnsureEditRegionFn((range) => {
      regions.addRegion({
        ...editRegionParams,
        start: range.start,
        end: range.end,
      })
    })

    const wsHost = container.firstElementChild as HTMLElement | undefined
    const detachRegionStyles = wsHost
      ? injectWaveformRegionStyles(wsHost)
      : () => {}

    /** Règle : hors de la zone de sélection (repère visuel) → annuler la sélection. Pointerdown + capture pour passer avant le glisser-nouvelle-région. */
    const onPointerClearSelection = (e: PointerEvent) => {
      if (e.button !== 0) {
        return
      }
      const cur = useAppStore.getState().selection
      if (!cur || cur.end <= cur.start) {
        return
      }
      if (
        isPointerInsideSelectionOverlay(
          container,
          ws,
          e.clientX,
          e.clientY,
          cur
        )
      ) {
        return
      }
      clearEditRegion()
      useAppStore.getState().setSelection(null)
      const dur = ws.getDuration()
      const t = Math.max(0, Math.min(dur, clickTimeSecFromClientX(ws, e.clientX)))
      ws.setTime(t)
      e.stopPropagation()
    }
    container.addEventListener('pointerdown', onPointerClearSelection, true)

    const detachMiddlePan = attachMiddleButtonPan(container, ws)

    const tickUi = () => {
      if (wavesurferRef.current !== ws) {
        return
      }
      const z = ws.getState().zoom.value
      const pxPerSec =
        z > 0 ? z : (ws.options.minPxPerSec ?? WAVEFORM_BASE_MIN_PX_PER_SEC)
      const { scrollLeft, maxScroll } = getWaveformScrollMetrics(ws)
      setWaveformUi({
        zoomPercent: Math.round(
          (pxPerSec / WAVEFORM_BASE_MIN_PX_PER_SEC) * 100
        ),
        scrollLeft,
        maxScroll,
      })
    }

    const unZoomSig = ws.getState().zoom.subscribe(() => {
      tickUi()
    })
    const unScroll = ws.on('scroll', tickUi)
    const unResize = ws.on('resize', tickUi)

    const scrollEl = ws.getWrapper().parentElement
    const onDomScroll = () => {
      tickUi()
    }
    scrollEl?.addEventListener('scroll', onDomScroll, { passive: true })

    requestAnimationFrame(() => {
      requestAnimationFrame(tickUi)
    })

    return () => {
      unZoomSig()
      unScroll()
      unResize()
      container.removeEventListener('pointerdown', onPointerClearSelection, true)
      detachRegionStyles()
      scrollEl?.removeEventListener('scroll', onDomScroll)
      setEnsureEditRegionFn(null)
      disableDragSelect()
      detachMiddlePan()
      setWaveformUi(null)
      setEditRegion(null)
      ws.destroy()
      if (wavesurferRef.current === ws) {
        wavesurferRef.current = null
      }
      setWaveSurferInstance(null)
    }
  }, [assetId, effects, status, setSelection, pushHistorySnapshot])

  /** Synchronise la région WaveSurfer quand la sélection change sans rebuild (ex. undo). */
  useEffect(() => {
    if (status !== 'ready' || !selection) {
      return
    }
    syncEditRegionRange(selection.start, selection.end)
  }, [selection, status])

  return (
    <div className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[#141924]">
      <div className="shrink-0 border-b border-surface-border bg-surface-raised/40 px-3 py-2">
        <h2 className="panel-title">Waveform</h2>
        {asset ? (
          <div className="mt-1 space-y-0.5 text-xs text-zinc-300">
            <p className="truncate" title={asset.filePath}>
              {asset.filePath}
            </p>
            {status === 'ready' && (
              <p className="text-zinc-300">
                {asset.sampleRate} Hz · {asset.channels === 1 ? 'mono' : 'stéréo'} ·{' '}
                {asset.duration.toFixed(3)} s
              </p>
            )}
            {status === 'loading' && <p className="text-zinc-300">Chargement…</p>}
            {status === 'error' && errorMessage && (
              <div className="space-y-1">
                <p className="text-red-400">{errorMessage}</p>
                <p className="text-[0.6875rem] text-zinc-500">
                  Vérifiez que le fichier existe, qu’il n’est pas ouvert ailleurs en exclusif et qu’il
                  s’agit d’un format audio pris en charge.
                </p>
              </div>
            )}
          </div>
        ) : (
          <p className="mt-1 text-xs text-zinc-300">Sélectionnez un fichier audio à gauche</p>
        )}
      </div>
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {asset && (
          <>
            <div
              ref={containerRef}
              className="waveform-mount min-h-0 flex-1 min-w-0"
            />
            {status === 'ready' && waveformUi && (
              <div className="flex shrink-0 items-center gap-2 border-t border-surface-border bg-[#0f1218] px-2 py-1.5">
                <span
                  className="w-[5.5rem] shrink-0 text-right text-xs font-medium tabular-nums text-sky-300/90"
                  title="Par rapport au zoom initial (100 % = densité par défaut). Touches + et − pour zoomer."
                >
                  Zoom {waveformUi.zoomPercent} %
                </span>
                <input
                  type="range"
                  className="waveform-scroll-range h-3 min-w-0 flex-1"
                  min={0}
                  max={Math.max(1, waveformUi.maxScroll)}
                  step={1}
                  disabled={waveformUi.maxScroll <= 0}
                  value={
                    waveformUi.maxScroll <= 0
                      ? 0
                      : Math.min(waveformUi.scrollLeft, waveformUi.maxScroll)
                  }
                  aria-label="Défilement horizontal de la forme d’onde"
                  onInput={(e) => {
                    const v = Number(e.currentTarget.value)
                    wavesurferRef.current?.setScroll(v)
                    setWaveformUi((prev) =>
                      prev ? { ...prev, scrollLeft: v } : prev
                    )
                  }}
                />
              </div>
            )}
          </>
        )}
        {!asset && (
          <div className="flex min-h-[200px] flex-1 flex-col items-center justify-center gap-3 bg-[#141924] px-8 text-center">
            <p className="text-sm font-medium text-zinc-200">Aucun fichier ouvert</p>
            <p className="max-w-md text-xs leading-relaxed text-zinc-500">
              Choisissez un fichier audio dans l’explorateur à gauche (WAV, MP3, FLAC, etc.). Le sample
              est chargé en mémoire pour l’édition et l’aperçu.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
