import { useEffect, useState } from 'react'
import { FileExplorer } from '@renderer/components/FileExplorer'
import { WaveformPanel } from '@renderer/components/WaveformPanel'
import { EffectsPanel } from '@renderer/components/EffectsPanel'
import { TransportBar } from '@renderer/components/TransportBar'
import { ExportModal } from '@renderer/components/ExportModal'
import { useAppStore } from '@renderer/store/appStore'
import {
  startPlaybackFromDecoded,
  stopPlayback,
} from '@renderer/audio/playbackEngine'
import { rebuildPreview } from '@renderer/audio/rebuildPreview'
import { nudgeWaveformZoom } from '@renderer/audio/waveformBridge'

/** Espace : lecture sauf si le focus est dans un champ texte (pas les sliders). */
function spaceBarShouldPlay(e: KeyboardEvent): boolean {
  const t = e.target
  if (t == null || !(t instanceof Element)) {
    return true
  }
  if (t.closest('textarea, select, [contenteditable="true"]')) {
    return false
  }
  const input = t.closest('input')
  if (input instanceof HTMLInputElement) {
    return input.type === 'range'
  }
  return true
}

export function MainView() {
  const [exportOpen, setExportOpen] = useState(false)
  const undo = useAppStore((s) => s.undo)
  const redo = useAppStore((s) => s.redo)
  const pushHistorySnapshot = useAppStore((s) => s.pushHistorySnapshot)
  const setEffects = useAppStore((s) => s.setEffects)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (!spaceBarShouldPlay(e)) {
          return
        }
        e.preventDefault()
        const { playback, currentAsset } = useAppStore.getState()
        if (playback.isPlaying) {
          stopPlayback()
        } else if (currentAsset) {
          void startPlaybackFromDecoded(currentAsset.id)
        }
        return
      }

      /* Zoom waveform : +/= et − (pas avec Ctrl pour éviter le zoom navigateur). */
      if (
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        spaceBarShouldPlay(e) &&
        (e.code === 'Equal' ||
          e.code === 'Minus' ||
          e.code === 'NumpadAdd' ||
          e.code === 'NumpadSubtract')
      ) {
        const { currentAsset } = useAppStore.getState()
        if (!currentAsset) {
          return
        }
        e.preventDefault()
        if (e.code === 'Equal' || e.code === 'NumpadAdd') {
          nudgeWaveformZoom(1)
        } else {
          nudgeWaveformZoom(-1)
        }
        return
      }

      /* Retirer le dernier effet de la chaîne (ordre de traitement). */
      if (
        (e.ctrlKey || e.metaKey) &&
        e.shiftKey &&
        e.key === 'Backspace' &&
        !e.altKey
      ) {
        e.preventDefault()
        const { currentAsset: asset, effects } = useAppStore.getState()
        if (!asset || effects.length === 0) {
          return
        }
        pushHistorySnapshot()
        setEffects(effects.slice(0, -1))
        rebuildPreview(asset.id)
        return
      }

      if (!(e.ctrlKey || e.metaKey)) {
        return
      }
      const k = e.key.toLowerCase()
      if (k === 'z') {
        e.preventDefault()
        if (e.shiftKey) {
          redo()
        } else {
          undo()
        }
      } else if (k === 'y') {
        e.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo, redo, pushHistorySnapshot, setEffects])

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex h-10 shrink-0 items-center border-b border-surface-border bg-surface px-4">
        <span className="text-sm font-semibold tracking-tight text-zinc-50">PulsEdit</span>
        <span className="ml-3 text-xs text-zinc-400">éditeur de samples</span>
      </header>
      <div className="flex min-h-0 min-w-0 flex-1">
        <div className="flex w-64 shrink-0 flex-col overflow-hidden">
          <FileExplorer />
        </div>
        <WaveformPanel />
        <EffectsPanel />
      </div>
      <TransportBar onOpenExport={() => setExportOpen(true)} />
      <ExportModal open={exportOpen} onClose={() => setExportOpen(false)} />
    </div>
  )
}
