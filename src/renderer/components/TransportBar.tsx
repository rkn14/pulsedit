import { useAppStore } from '@renderer/store/appStore'
import { startPlaybackFromDecoded, stopPlayback } from '@renderer/audio/playbackEngine'

type TransportBarProps = {
  onOpenExport?: () => void
}

export function TransportBar({ onOpenExport }: TransportBarProps) {
  const playback = useAppStore((s) => s.playback)
  const asset = useAppStore((s) => s.currentAsset)
  const internalCh = useAppStore((s) => s.internalBufferChannelCount)
  const selection = useAppStore((s) => s.selection)

  const canPlay = Boolean(asset && internalCh !== null)
  const selDur =
    selection && selection.end > selection.start
      ? (selection.end - selection.start).toFixed(3)
      : '—'

  return (
    <div className="flex min-h-14 shrink-0 flex-wrap items-center gap-x-4 gap-y-1 border-t border-surface-border bg-surface px-4 py-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={!canPlay}
          className="btn-bar"
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
          className="btn-bar"
          onClick={() => {
            stopPlayback()
          }}
        >
          Stop
        </button>
        <button
          type="button"
          disabled={!canPlay}
          className="btn-bar"
          onClick={() => onOpenExport?.()}
        >
          Exporter…
        </button>
      </div>
      <div className="flex flex-col gap-0.5 text-xs text-zinc-300">
        <span>
          {playback.isPlaying ? 'Lecture…' : 'Arrêté'} ·{' '}
          {asset ? `t = ${playback.positionSec.toFixed(2)} s` : '—'}
        </span>
        {asset && selection && (
          <span className="text-[0.6875rem] text-zinc-300">
            Sélection : début {selection.start.toFixed(3)} s · fin {selection.end.toFixed(3)} s · durée{' '}
            {selDur} s
          </span>
        )}
      </div>
      <p className="panel-hint ml-auto max-w-[28rem]">
        Raccourcis : Espace lecture · + / − zoom · Ctrl+Z annuler · Ctrl+Y ou Ctrl+⇧+Z refaire ·
        Ctrl+⇧+Retour arrière retirer le dernier effet
      </p>
    </div>
  )
}
