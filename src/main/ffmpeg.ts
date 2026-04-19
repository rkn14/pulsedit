import { spawn } from 'node:child_process'
import ffmpegStatic from 'ffmpeg-static'

/**
 * Binaire FFmpeg embarqué (npm `ffmpeg-static`), ou `null` si indisponible sur la plateforme.
 */
export function getFfmpegPath(): string | null {
  return typeof ffmpegStatic === 'string' && ffmpegStatic.length > 0 ? ffmpegStatic : null
}

export function runFfmpeg(args: string[]): Promise<void> {
  const bin = getFfmpegPath()
  if (!bin) {
    return Promise.reject(new Error('FFmpeg introuvable (ffmpeg-static)'))
  }
  return new Promise((resolve, reject) => {
    const p = spawn(bin, args, { windowsHide: true })
    let err = ''
    p.stderr?.on('data', (d: Buffer) => {
      err += d.toString()
    })
    p.on('error', reject)
    p.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`ffmpeg code ${String(code)} : ${err.slice(-800)}`))
      }
    })
  })
}
