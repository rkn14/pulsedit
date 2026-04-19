import type { ExplorerEntry, VolumeInfo } from './types'

export type ExportAudioFormat = 'wav' | 'aiff' | 'mp3'

export type ExportAudioResult =
  | { ok: true; filePath: string }
  | { ok: false; canceled: true }
  | { ok: false; error: string }

/** Contrat API exposée au renderer via preload (IPC typé) */
export type PulseditApi = {
  listDirectory: (dirPath: string) => Promise<ExplorerEntry[]>
  readAudioFile: (filePath: string) => Promise<ArrayBuffer>
  getPathForDisplay: (fullPath: string) => string
  getInitialExplorerRoot: () => Promise<string>
  listVolumes: () => Promise<VolumeInfo[]>
  /**
   * Écrit un WAV (44,1 kHz / 16 bit) déjà encodé ; pour AIFF/MP3, conversion FFmpeg dans le main.
   */
  exportAudio: (payload: {
    wavBytes: ArrayBuffer
    defaultFileName: string
    format: ExportAudioFormat
  }) => Promise<ExportAudioResult>
}
