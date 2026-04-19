import { useCallback, useEffect, useState } from 'react'
import type { ExplorerEntry, VolumeInfo } from '@shared/types'
import { useAppStore } from '@renderer/store/appStore'

/** Racine du volume Windows pour un chemin (ex. `D:\foo` → `D:\`). */
function windowsVolumeRoot(p: string): string | null {
  const t = p.trim()
  const m = /^([A-Za-z]):[\\/]/.exec(t)
  if (!m) {
    return null
  }
  return `${m[1].toUpperCase()}:\\`
}

function Chevron({ open }: { open: boolean }) {
  return (
    <span
      className="inline-block w-4 text-center text-zinc-300 select-none"
      aria-hidden
    >
      {open ? '▼' : '▶'}
    </span>
  )
}

function TreeRow({
  entry,
  depth,
  onSelectFile,
  selectedPath,
}: {
  entry: ExplorerEntry
  depth: number
  onSelectFile: (path: string) => void
  selectedPath: string | null
}) {
  const toggleExpandedDir = useAppStore((s) => s.toggleExpandedDir)
  const expandedDirs = useAppStore((s) => s.ui.expandedDirs)
  const [children, setChildren] = useState<ExplorerEntry[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const isOpen = expandedDirs.has(entry.fullPath)
  const isSelected = !entry.isDirectory && selectedPath === entry.fullPath

  useEffect(() => {
    if (!entry.isDirectory || !isOpen) {
      return
    }
    let cancelled = false
    setLoadError(null)
    void window.pulsedit
      .listDirectory(entry.fullPath)
      .then((list) => {
        if (!cancelled) {
          setChildren(list)
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : 'Erreur de lecture')
          setChildren([])
        }
      })
    return () => {
      cancelled = true
    }
  }, [entry.fullPath, entry.isDirectory, isOpen])

  const pad = 8 + depth * 14

  if (entry.isDirectory) {
    return (
      <div>
        <button
          type="button"
          className="flex w-full items-center gap-1 rounded px-1 py-0.5 text-left text-sm text-zinc-300 hover:bg-surface-raised"
          style={{ paddingLeft: pad }}
          onClick={() => toggleExpandedDir(entry.fullPath)}
        >
          <Chevron open={isOpen} />
          <span className="truncate">{entry.name}</span>
        </button>
        {loadError && (
          <div className="pl-8 text-xs text-red-400" style={{ paddingLeft: pad + 20 }}>
            {loadError}
          </div>
        )}
        {isOpen && children !== null &&
          children.map((ch) => (
            <TreeRow
              key={ch.fullPath}
              entry={ch}
              depth={depth + 1}
              onSelectFile={onSelectFile}
              selectedPath={selectedPath}
            />
          ))}
      </div>
    )
  }

  return (
    <button
      type="button"
      className={`flex w-full items-center gap-2 rounded px-1 py-0.5 text-left text-sm ${
        isSelected ? 'bg-sky-900/40 text-sky-100' : 'text-zinc-300 hover:bg-surface-raised'
      }`}
      style={{ paddingLeft: pad + 20 }}
      onClick={() => onSelectFile(entry.fullPath)}
    >
      <span className="h-4 w-4 shrink-0" aria-hidden />
      <span className="truncate">{entry.name}</span>
    </button>
  )
}

export function FileExplorer() {
  const explorerCwd = useAppStore((s) => s.ui.explorerCwd)
  const setExplorerCwd = useAppStore((s) => s.setExplorerCwd)
  const setCurrentAsset = useAppStore((s) => s.setCurrentAsset)
  const currentAsset = useAppStore((s) => s.currentAsset)
  const [rootEntries, setRootEntries] = useState<ExplorerEntry[]>([])
  const [error, setError] = useState<string | null>(null)
  const [volumes, setVolumes] = useState<VolumeInfo[]>([])

  useEffect(() => {
    let cancelled = false
    void window.pulsedit
      .listVolumes()
      .then((list) => {
        if (!cancelled) {
          setVolumes(list)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setVolumes([])
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    void window.pulsedit
      .getInitialExplorerRoot()
      .then((root) => {
        if (!cancelled) {
          setExplorerCwd(root)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('Impossible de déterminer le dossier de départ.')
        }
      })
    return () => {
      cancelled = true
    }
  }, [setExplorerCwd])

  useEffect(() => {
    if (!explorerCwd) {
      return
    }
    let cancelled = false
    setError(null)
    void window.pulsedit
      .listDirectory(explorerCwd)
      .then((list) => {
        if (!cancelled) {
          setRootEntries(list)
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Lecture impossible')
          setRootEntries([])
        }
      })
    return () => {
      cancelled = true
    }
  }, [explorerCwd])

  const onSelectFile = useCallback(
    (filePath: string) => {
      const id = crypto.randomUUID()
      setCurrentAsset({
        id,
        filePath,
        sampleRate: 44100,
        channels: 2,
        duration: 0,
      })
    },
    [setCurrentAsset]
  )

  const activeVolumeRoot =
    explorerCwd != null ? windowsVolumeRoot(explorerCwd) : null

  return (
    <div className="flex h-full min-h-0 flex-col border-r border-surface-border bg-surface">
      <div className="shrink-0 border-b border-surface-border px-3 py-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-300">
          Explorateur
        </h2>
        {volumes.length > 0 && (
          <div className="mt-2">
            <p className="mb-1.5 text-[0.625rem] font-medium uppercase tracking-wide text-zinc-300">
              Volumes
            </p>
            <div className="flex max-h-[4.5rem] flex-wrap gap-1 overflow-y-auto pr-0.5">
              {volumes.map((vol) => {
                const isActive =
                  activeVolumeRoot != null &&
                  vol.rootPath.toLowerCase() === activeVolumeRoot.toLowerCase()
                return (
                  <button
                    key={vol.rootPath}
                    type="button"
                    title={vol.rootPath}
                    onClick={() => setExplorerCwd(vol.rootPath)}
                    className={`rounded border px-2 py-0.5 text-[0.6875rem] font-medium tabular-nums transition-colors ${
                      isActive
                        ? 'border-sky-700/80 bg-sky-950/50 text-sky-200'
                        : 'border-surface-border bg-surface-raised text-zinc-300 hover:border-zinc-600 hover:text-zinc-200'
                    }`}
                  >
                    {vol.label}
                  </button>
                )
              })}
            </div>
          </div>
        )}
        {explorerCwd && (
          <p className="mt-2 truncate text-[0.6875rem] text-zinc-300" title={explorerCwd}>
            {explorerCwd}
          </p>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-auto px-1 py-2">
        {error && <p className="px-2 text-xs text-red-400">{error}</p>}
        {!explorerCwd && !error && (
          <p className="px-2 text-xs text-zinc-300">Chargement…</p>
        )}
        {explorerCwd &&
          rootEntries.map((entry) => (
            <TreeRow
              key={entry.fullPath}
              entry={entry}
              depth={0}
              onSelectFile={onSelectFile}
              selectedPath={currentAsset?.filePath ?? null}
            />
          ))}
      </div>
    </div>
  )
}
