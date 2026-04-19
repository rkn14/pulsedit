import { contextBridge, ipcRenderer } from 'electron'
import type { PulseditApi } from '../shared/ipc'
import type { ExplorerEntry, VolumeInfo } from '../shared/types'

const api: PulseditApi = {
  listDirectory: (dirPath: string): Promise<ExplorerEntry[]> =>
    ipcRenderer.invoke('pulsedit:listDirectory', dirPath),

  readAudioFile: (filePath: string): Promise<ArrayBuffer> =>
    ipcRenderer.invoke('pulsedit:readAudioFile', filePath),

  getPathForDisplay: (fullPath: string): string => fullPath,

  getInitialExplorerRoot: (): Promise<string> =>
    ipcRenderer.invoke('pulsedit:getInitialExplorerRoot'),

  listVolumes: (): Promise<VolumeInfo[]> => ipcRenderer.invoke('pulsedit:listVolumes'),
}

contextBridge.exposeInMainWorld('pulsedit', api)
