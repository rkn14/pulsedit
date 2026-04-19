import { useEffect, useRef, useState } from 'react'
import WaveSurfer from 'wavesurfer.js'
import ZoomPlugin from 'wavesurfer.js/dist/plugins/zoom.esm.js'
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js'
import { useAppStore } from '@renderer/store/appStore'
import { requestDecode } from '@renderer/audio/decodePipeline'
import { clearDecodedPcm, registerDecodedPcm } from '@renderer/audio/decodedRegistry'
import { stopPlayback } from '@renderer/audio/playbackEngine'
import { setWaveSurferInstance } from '@renderer/audio/waveformBridge'

export function WaveformPanel() {
  const asset = useAppStore((s) => s.currentAsset)
  const patchCurrentAsset = useAppStore((s) => s.patchCurrentAsset)
  const setInternalBufferChannels = useAppStore((s) => s.setInternalBufferChannels)
  const setSelection = useAppStore((s) => s.setSelection)

  const assetId = asset?.id
  const assetPath = asset?.filePath

  const containerRef = useRef<HTMLDivElement>(null)
  const wavesurferRef = useRef<WaveSurfer | null>(null)

  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

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

      try {
        const raw = await window.pulsedit.readAudioFile(assetPath)
        if (cancelled) {
          return
        }

        const decoded = await requestDecode(assetId, raw)
        if (cancelled) {
          return
        }

        registerDecodedPcm(assetId, {
          sampleRate: decoded.sampleRate,
          channels: decoded.channels,
          channelData: decoded.channelData,
        })

        patchCurrentAsset({
          duration: decoded.duration,
          channels: decoded.channels,
          sampleRate: decoded.sampleRate,
        })
        setInternalBufferChannels(decoded.channels)

        const regions = RegionsPlugin.create()

        const ws = WaveSurfer.create({
          container,
          waveColor: '#3d4a63',
          progressColor: '#38bdf8',
          cursorColor: '#94a3b8',
          cursorWidth: 2,
          height: 128,
          normalize: true,
          peaks: [decoded.waveformPeaks],
          duration: decoded.duration,
          minPxPerSec: 64,
          fillParent: true,
          hideScrollbar: false,
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

        const region = regions.addRegion({
          id: 'edit-selection',
          start: 0,
          end: decoded.duration,
          color: 'rgba(56, 189, 248, 0.14)',
          drag: true,
          resize: true,
        })

        setSelection({ start: 0, end: decoded.duration })

        const syncFromRegion = (r: { start: number; end: number }) => {
          setSelection({ start: r.start, end: r.end })
        }

        region.on('update-end', () => {
          syncFromRegion(region)
        })

        regions.on('region-updated', (r) => {
          if (r.id === 'edit-selection') {
            syncFromRegion(r)
          }
        })

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
      setWaveSurferInstance(null)
      clearDecodedPcm(assetId)
      wavesurferRef.current?.destroy()
      wavesurferRef.current = null
    }
  }, [assetId, assetPath, patchCurrentAsset, setInternalBufferChannels, setSelection])

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-surface-raised/30">
      <div className="shrink-0 border-b border-surface-border px-3 py-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Waveform
        </h2>
        {asset ? (
          <div className="mt-1 space-y-0.5 text-xs text-zinc-400">
            <p className="truncate" title={asset.filePath}>
              {asset.filePath}
            </p>
            {status === 'ready' && (
              <p className="text-zinc-500">
                {asset.sampleRate} Hz · {asset.channels === 1 ? 'mono' : 'stéréo'} ·{' '}
                {asset.duration.toFixed(3)} s
              </p>
            )}
            {status === 'loading' && <p className="text-zinc-500">Chargement…</p>}
            {status === 'error' && errorMessage && (
              <p className="text-red-400">{errorMessage}</p>
            )}
          </div>
        ) : (
          <p className="mt-1 text-xs text-zinc-600">Sélectionnez un fichier audio à gauche</p>
        )}
      </div>
      <div className="relative min-h-0 flex-1 bg-[#0c0e14]">
        {asset && (
          <div
            ref={containerRef}
            className="h-full min-h-[160px] w-full overflow-x-auto overflow-y-hidden"
          />
        )}
        {!asset && (
          <div className="flex h-full min-h-[160px] items-center justify-center text-sm text-zinc-600">
            Aucune forme d’onde
          </div>
        )}
      </div>
      {status === 'ready' && (
        <p className="shrink-0 border-t border-surface-border px-3 py-1 text-[11px] text-zinc-600">
          Molette : zoom · région : sélection (glisser / redimensionner)
        </p>
      )}
    </div>
  )
}
