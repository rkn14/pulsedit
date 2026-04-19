import { useEffect } from 'react'
import { FileExplorer } from '@renderer/components/FileExplorer'
import { WaveformPanel } from '@renderer/components/WaveformPanel'
import { EffectsPanel } from '@renderer/components/EffectsPanel'
import { TransportBar } from '@renderer/components/TransportBar'
import { useAppStore } from '@renderer/store/appStore'

export function MainView() {
  const undo = useAppStore((s) => s.undo)
  const redo = useAppStore((s) => s.redo)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
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
      <TransportBar />
    </div>
  )
}
