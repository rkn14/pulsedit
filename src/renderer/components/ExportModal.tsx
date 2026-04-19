import { useState } from 'react'
import type { ExportAudioFormat } from '@shared/ipc'
import { useAppStore } from '@renderer/store/appStore'
import { encodeDecodedPcmToWavBytes } from '@renderer/audio/export/encodeWav'
import { prepareExportPcm } from '@renderer/audio/export/prepareExportPcm'
import { defaultExportFileName } from '@renderer/audio/export/exportFileName'

type Props = {
  open: boolean
  onClose: () => void
}

export function ExportModal({ open, onClose }: Props) {
  const currentAsset = useAppStore((s) => s.currentAsset)
  const selection = useAppStore((s) => s.selection)
  const [format, setFormat] = useState<ExportAudioFormat>('wav')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!open) {
    return null
  }

  const runExport = async () => {
    setError(null)
    setMessage(null)
    if (!currentAsset) {
      setError('Aucun fichier chargé.')
      return
    }
    const pcm = prepareExportPcm(currentAsset.id, selection)
    const frames = pcm?.channelData[0]?.length ?? 0
    if (!pcm || frames < 1) {
      setError('Aucun échantillon à exporter.')
      return
    }

    setBusy(true)
    try {
      const u8 = encodeDecodedPcmToWavBytes(pcm)
      const wavBytes = u8.buffer.slice(
        u8.byteOffset,
        u8.byteOffset + u8.byteLength
      ) as ArrayBuffer
      const defaultFileName = defaultExportFileName(currentAsset.filePath, format)
      const result = await window.pulsedit.exportAudio({
        wavBytes,
        defaultFileName,
        format,
      })
      if (result.ok) {
        setMessage(`Fichier enregistré : ${result.filePath}`)
      } else if ('canceled' in result && result.canceled) {
        onClose()
      } else if ('error' in result) {
        setError(result.error)
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div className="w-full max-w-md rounded border border-surface-border bg-surface-raised p-4 shadow-xl">
        <h2 id="export-title" className="text-sm font-semibold text-zinc-100">
          Exporter
        </h2>
        <p className="mt-1 text-xs text-zinc-400">
          Export de la sélection courante (ou du fichier entier si la sélection est vide). WAV 44,1
          kHz / 16 bit ; AIFF et MP3 via FFmpeg.
        </p>

        <label className="mt-4 block text-xs text-zinc-400" htmlFor="export-format">
          Format
        </label>
        <select
          id="export-format"
          className="mt-1 w-full rounded border border-surface-border bg-surface px-2 py-1.5 text-sm text-zinc-200"
          value={format}
          onChange={(e) => setFormat(e.target.value as ExportAudioFormat)}
          disabled={busy}
        >
          <option value="wav">WAV (PCM 16 bit)</option>
          <option value="aiff">AIFF (PCM 16 bit)</option>
          <option value="mp3">MP3 (320 kb/s)</option>
        </select>

        {error && (
          <p className="mt-3 text-xs text-red-400" role="alert">
            {error}
          </p>
        )}
        {message && <p className="mt-3 text-xs text-emerald-400">{message}</p>}

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            className="rounded border border-surface-border px-3 py-1.5 text-sm text-zinc-300"
            onClick={onClose}
            disabled={busy}
          >
            {message ? 'Fermer' : 'Annuler'}
          </button>
          {!message && (
            <button
              type="button"
              className="rounded border border-emerald-900/80 bg-emerald-950/50 px-3 py-1.5 text-sm text-emerald-100 disabled:opacity-50"
              onClick={() => void runExport()}
              disabled={busy}
            >
              {busy ? 'Export…' : 'Exporter…'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
