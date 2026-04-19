import { existsSync } from 'node:fs'
import { readdir, stat } from 'node:fs/promises'
import path from 'node:path'
import type { ExplorerEntry, VolumeInfo } from '../shared/types'

/** Extensions considérées comme audio importables (Phase 2) */
const AUDIO_EXTENSIONS = new Set([
  '.wav',
  '.wave',
  '.aiff',
  '.aif',
  '.mp3',
  '.flac',
  '.m4a',
])

function isAudioFile(fileName: string): boolean {
  const ext = path.extname(fileName).toLowerCase()
  return AUDIO_EXTENSIONS.has(ext)
}

function normalizeDirPath(dirPath: string): string {
  const resolved = path.resolve(dirPath)
  return resolved
}

/**
 * Liste le contenu d’un dossier : dossiers + fichiers audio reconnus.
 */
export async function listDirectory(dirPath: string): Promise<ExplorerEntry[]> {
  const root = normalizeDirPath(dirPath)
  const names = await readdir(root, { withFileTypes: true })
  const entries: ExplorerEntry[] = []

  for (const dirent of names) {
    const fullPath = path.join(root, dirent.name)
    if (dirent.isDirectory()) {
      entries.push({ name: dirent.name, fullPath, isDirectory: true })
    } else if (dirent.isFile() && isAudioFile(dirent.name)) {
      entries.push({ name: dirent.name, fullPath, isDirectory: false })
    }
  }

  entries.sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) {
      return a.isDirectory ? -1 : 1
    }
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  })

  return entries
}

export async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await stat(targetPath)
    return true
  } catch {
    return false
  }
}

export async function isDirectory(targetPath: string): Promise<boolean> {
  try {
    const s = await stat(targetPath)
    return s.isDirectory()
  } catch {
    return false
  }
}

/**
 * Liste les volumes accessibles (lettres de lecteur sous Windows).
 */
export function listVolumes(): VolumeInfo[] {
  if (process.platform !== 'win32') {
    return [{ rootPath: path.resolve('/'), label: '/' }]
  }
  const out: VolumeInfo[] = []
  for (let i = 65; i <= 90; i++) {
    const letter = String.fromCharCode(i)
    const rootPath = `${letter}:\\`
    try {
      if (existsSync(rootPath)) {
        out.push({ rootPath, label: `${letter}:` })
      }
    } catch {
      /* lecteur retiré ou inaccessible */
    }
  }
  return out
}
