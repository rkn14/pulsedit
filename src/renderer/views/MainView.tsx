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
  }, [undo, redo])

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
