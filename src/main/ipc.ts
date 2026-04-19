import { BrowserWindow, dialog, ipcMain } from 'electron'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import type { ExportAudioFormat } from '../shared/ipc'
import { runFfmpeg } from './ffmpeg'
import { isDirectory, listDirectory, listVolumes, pathExists } from './filesystem'

const CH_LIST = 'pulsedit:listDirectory'
const CH_READ = 'pulsedit:readAudioFile'
const CH_ROOT = 'pulsedit:getInitialExplorerRoot'
const CH_DISPLAY = 'pulsedit:getPathForDisplay'
const CH_VOLUMES = 'pulsedit:listVolumes'
const CH_EXPORT = 'pulsedit:exportAudio'

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

  ipcMain.handle(
    CH_EXPORT,
    async (
      event,
      payload: unknown
    ): Promise<
      | { ok: true; filePath: string }
      | { ok: false; canceled: true }
      | { ok: false; error: string }
    > => {
      if (
        !payload ||
        typeof payload !== 'object' ||
        !('wavBytes' in payload) ||
        !('defaultFileName' in payload) ||
        !('format' in payload)
      ) {
        return { ok: false, error: 'Paramètres d’export invalides' }
      }
      const p = payload as {
        wavBytes: unknown
        defaultFileName: unknown
        format: unknown
      }
      if (!(p.wavBytes instanceof ArrayBuffer)) {
        return { ok: false, error: 'Buffer audio invalide' }
      }
      if (typeof p.defaultFileName !== 'string' || p.defaultFileName.length < 1) {
        return { ok: false, error: 'Nom de fichier invalide' }
      }
      const fmt = p.format as ExportAudioFormat
      if (fmt !== 'wav' && fmt !== 'aiff' && fmt !== 'mp3') {
        return { ok: false, error: 'Format non supporté' }
      }

      const win = BrowserWindow.fromWebContents(event.sender)
      const filters =
        fmt === 'wav'
          ? [{ name: 'WAV', extensions: ['wav'] }]
          : fmt === 'aiff'
            ? [{ name: 'AIFF', extensions: ['aiff', 'aif'] }]
            : [{ name: 'MP3', extensions: ['mp3'] }]

      const { filePath, canceled } = await dialog.showSaveDialog(win ?? undefined, {
        title: 'Exporter l’audio',
        defaultPath: p.defaultFileName,
        filters,
      })

      if (canceled || !filePath) {
        return { ok: false, canceled: true }
      }

      try {
        if (fmt === 'wav') {
          await writeFile(filePath, Buffer.from(p.wavBytes))
          return { ok: true, filePath }
        }

        const tmpDir = await mkdtemp(path.join(tmpdir(), 'pulsedit-export-'))
        const tmpWav = path.join(tmpDir, 'pulsedit-src.wav')
        try {
          await writeFile(tmpWav, Buffer.from(p.wavBytes))
          if (fmt === 'aiff') {
            await runFfmpeg(['-y', '-i', tmpWav, '-c:a', 'pcm_s16be', filePath])
          } else {
            await runFfmpeg([
              '-y',
              '-i',
              tmpWav,
              '-codec:a',
              'libmp3lame',
              '-b:a',
              '320k',
              filePath,
            ])
          }
        } finally {
          await rm(tmpDir, { recursive: true, force: true })
        }
        return { ok: true, filePath }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        return { ok: false, error: msg }
      }
    }
  )
}
