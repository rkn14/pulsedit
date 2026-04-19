import { create } from 'zustand'
import type { AudioAsset, EffectChain, SelectionRange, SerializedState } from '@shared/types'

const TARGET_SAMPLE_RATE = 44100

export type PlaybackState = {
  isPlaying: boolean
  /** position de lecture en secondes (fichier complet) */
  positionSec: number
}

export type UiState = {
  explorerCwd: string | null
  /** dossiers ouverts dans l’arborescence (chemins complets) */
  expandedDirs: Set<string>
}

export type AppState = {
  currentAsset: AudioAsset | null
  /** Buffer PCM interne 44.1kHz — géré hors store (référence worker plus tard) */
  internalBufferChannelCount: 1 | 2 | null
  selection: SelectionRange | null
  effects: EffectChain
  playback: PlaybackState
  historyPast: SerializedState[]
  historyFuture: SerializedState[]
  ui: UiState
  setExplorerCwd: (path: string) => void
  toggleExpandedDir: (path: string) => void
  setCurrentAsset: (asset: AudioAsset | null) => void
  patchCurrentAsset: (
    partial: Partial<Pick<AudioAsset, 'duration' | 'channels' | 'sampleRate'>>
  ) => void
  setInternalBufferChannels: (n: 1 | 2 | null) => void
  setSelection: (range: SelectionRange | null) => void
  setPlayback: (partial: Partial<PlaybackState>) => void
  resetPlayback: () => void
}

const initialPlayback: PlaybackState = {
  isPlaying: false,
  positionSec: 0,
}

const initialUi: UiState = {
  explorerCwd: null,
  expandedDirs: new Set<string>(),
}

export const useAppStore = create<AppState>((set) => ({
  currentAsset: null,
  internalBufferChannelCount: null,
  selection: null,
  effects: [],
  playback: initialPlayback,
  historyPast: [],
  historyFuture: [],
  ui: initialUi,

  setExplorerCwd: (path: string) =>
    set((s) => ({
      ui: { ...s.ui, explorerCwd: path, expandedDirs: new Set<string>() },
    })),

  toggleExpandedDir: (path: string) =>
    set((s) => {
      const next = new Set(s.ui.expandedDirs)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return { ui: { ...s.ui, expandedDirs: next } }
    }),

  setCurrentAsset: (asset) =>
    set({
      currentAsset: asset,
      internalBufferChannelCount: null,
    }),

  patchCurrentAsset: (partial) =>
    set((s) =>
      s.currentAsset
        ? { currentAsset: { ...s.currentAsset, ...partial } }
        : {}
    ),

  setInternalBufferChannels: (n) => set({ internalBufferChannelCount: n }),

  setSelection: (range) => set({ selection: range }),

  setPlayback: (partial) =>
    set((s) => ({
      playback: { ...s.playback, ...partial },
    })),

  resetPlayback: () => set({ playback: initialPlayback }),
}))

export { TARGET_SAMPLE_RATE }
