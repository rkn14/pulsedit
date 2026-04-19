import { ipcMain } from 'electron'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { isDirectory, listDirectory, listVolumes, pathExists } from './filesystem'

const CH_LIST = 'pulsedit:listDirectory'
const CH_READ = 'pulsedit:readAudioFile'
const CH_ROOT = 'pulsedit:getInitialExplorerRoot'
const CH_DISPLAY = 'pulsedit:getPathForDisplay'
const CH_VOLUMES = 'pulsedit:listVolumes'

function assertSafePath(p: string): string {
  if (typeof p !== 'string' || p.length === 0 || p.length > 4096) {
    throw new Error('Chemin invalide')
  }
  if (p.includes('\0')) {
    throw new Error('Chemin invalide')
  }
  return path.resolve(path.normalize(p))
}

export function registerIpcHandlers(): void {
  ipcMain.handle(CH_LIST, async (_evt, rawPath: unknown) => {
    if (typeof rawPath !== 'string') {
      throw new Error('listDirectory: argument invalide')
    }
    const dir = assertSafePath(rawPath)
    if (!(await pathExists(dir)) || !(await isDirectory(dir))) {
      throw new Error('Dossier introuvable')
    }
    return listDirectory(dir)
  })

  ipcMain.handle(CH_READ, async (_evt, rawPath: unknown) => {
    if (typeof rawPath !== 'string') {
      throw new Error('readAudioFile: argument invalide')
    }
    const filePath = assertSafePath(rawPath)
    if (!(await pathExists(filePath)) || (await isDirectory(filePath))) {
      throw new Error('Fichier introuvable')
    }
    const buf = await readFile(filePath)
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
  })

  ipcMain.handle(CH_ROOT, async () => {
    const home = process.env.USERPROFILE ?? process.env.HOME ?? process.cwd()
    return path.resolve(home)
  })

  ipcMain.handle(CH_DISPLAY, (_evt, rawPath: unknown) => {
    if (typeof rawPath !== 'string') {
      return ''
    }
    return rawPath
  })

  ipcMain.handle(CH_VOLUMES, () => listVolumes())
}
