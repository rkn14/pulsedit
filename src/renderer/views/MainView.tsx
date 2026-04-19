import { FileExplorer } from '@renderer/components/FileExplorer'
import { WaveformPanel } from '@renderer/components/WaveformPanel'
import { EffectsPanel } from '@renderer/components/EffectsPanel'
import { TransportBar } from '@renderer/components/TransportBar'

export function MainView() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex h-10 shrink-0 items-center border-b border-surface-border bg-surface px-4">
        <span className="text-sm font-semibold tracking-tight text-zinc-200">PulsEdit</span>
        <span className="ml-3 text-xs text-zinc-600">éditeur de samples</span>
      </header>
      <div className="flex min-h-0 flex-1">
        <div className="w-64 shrink-0">
          <FileExplorer />
        </div>
        <WaveformPanel />
        <EffectsPanel />
      </div>
      <TransportBar />
    </div>
  )
}
