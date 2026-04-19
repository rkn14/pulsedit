import type { ExplorerEntry, VolumeInfo } from './types'

/** Contrat API exposée au renderer via preload (IPC typé) */
export type PulseditApi = {
  listDirectory: (dirPath: string) => Promise<ExplorerEntry[]>
  readAudioFile: (filePath: string) => Promise<ArrayBuffer>
  getPathForDisplay: (fullPath: string) => string
  getInitialExplorerRoot: () => Promise<string>
  listVolumes: () => Promise<VolumeInfo[]>
}
