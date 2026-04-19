import { useAppStore } from '@renderer/store/appStore'
import { startPlaybackFromDecoded, stopPlayback } from '@renderer/audio/playbackEngine'

export function TransportBar() {
  const playback = useAppStore((s) => s.playback)
  const asset = useAppStore((s) => s.currentAsset)
  const internalCh = useAppStore((s) => s.internalBufferChannelCount)

  const canPlay = Boolean(asset && internalCh !== null)

  return (
    <div className="flex h-14 shrink-0 items-center gap-4 border-t border-surface-border bg-surface px-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={!canPlay}
          className="rounded border border-surface-border bg-surface-raised px-3 py-1.5 text-sm text-zinc-300 disabled:opacity-40"
          onClick={() => {
            if (!asset) {
              return
            }
            startPlaybackFromDecoded(asset.id)
          }}
        >
          Lecture
        </button>
        <button
          type="button"
          disabled={!playback.isPlaying}
          className="rounded border border-surface-border bg-surface-raised px-3 py-1.5 text-sm text-zinc-300 disabled:opacity-40"
          onClick={() => {
            stopPlayback()
          }}
        >
          Stop
        </button>
      </div>
      <div className="text-xs text-zinc-500">
        {playback.isPlaying ? 'Lecture…' : 'Arrêté'} ·{' '}
        {asset ? `${playback.positionSec.toFixed(2)} s` : '—'}
      </div>
    </div>
  )
}
