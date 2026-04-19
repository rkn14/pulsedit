import { create } from 'zustand'
import type {
  AudioAsset,
  EffectChain,
  SelectionRange,
  SerializedState,
} from '@shared/types'

const TARGET_SAMPLE_RATE = 44100

export type PlaybackState = {
  isPlaying: boolean
  positionSec: number
}

export type UiState = {
  explorerCwd: string | null
  expandedDirs: Set<string>
}

export type AppState = {
  currentAsset: AudioAsset | null
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
  setEffects: (chain: EffectChain) => void
  pushHistorySnapshot: () => void
  undo: () => void
  redo: () => void
  setPlayback: (partial: Partial<PlaybackState>) => void
  resetPlayback: () => void
}

function cloneSerializedState(s: {
  selection: SelectionRange | null
  effects: EffectChain
}): SerializedState {
  return {
    selection: s.selection ? { ...s.selection } : null,
    effects: s.effects.map((e) => ({
      id: e.id,
      type: e.type,
      enabled: e.enabled,
      params: { ...e.params },
    })),
  }
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
      effects: [],
      historyPast: [],
      historyFuture: [],
      selection: null,
    }),

  patchCurrentAsset: (partial) =>
    set((s) =>
      s.currentAsset ? { currentAsset: { ...s.currentAsset, ...partial } } : {}
    ),

  setInternalBufferChannels: (n) => set({ internalBufferChannelCount: n }),

  setSelection: (range) => set({ selection: range }),

  setEffects: (chain) => set({ effects: chain }),

  pushHistorySnapshot: () =>
    set((s) => {
      const snap = cloneSerializedState({
        selection: s.selection,
        effects: s.effects,
      })
      return {
        historyPast: [...s.historyPast, snap].slice(-10),
        historyFuture: [],
      }
    }),

  undo: () =>
    set((s) => {
      if (s.historyPast.length === 0) {
        return s
      }
      const prev = s.historyPast[s.historyPast.length - 1]!
      const curr = cloneSerializedState({
        selection: s.selection,
        effects: s.effects,
      })
      return {
        historyPast: s.historyPast.slice(0, -1),
        historyFuture: [curr, ...s.historyFuture].slice(0, 10),
        selection: prev.selection,
        effects: prev.effects,
      }
    }),

  redo: () =>
    set((s) => {
      if (s.historyFuture.length === 0) {
        return s
      }
      const next = s.historyFuture[0]!
      const curr = cloneSerializedState({
        selection: s.selection,
        effects: s.effects,
      })
      return {
        historyFuture: s.historyFuture.slice(1),
        historyPast: [...s.historyPast, curr].slice(-10),
        selection: next.selection,
        effects: next.effects,
      }
    }),

  setPlayback: (partial) =>
    set((s) => ({
      playback: { ...s.playback, ...partial },
    })),

  resetPlayback: () => set({ playback: initialPlayback }),
}))

export { TARGET_SAMPLE_RATE }
