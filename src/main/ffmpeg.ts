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

/**
 * Décode FLAC / AAC (m4a) / etc. en WAV PCM 44,1 kHz pour le renderer (`decodeAudioData`).
 * Conserve le nombre de canaux d’origine.
 */
export function transcodeFileToPcmWavArrayBuffer(inputPath: string): Promise<ArrayBuffer> {
  const bin = getFfmpegPath()
  if (!bin) {
    return Promise.reject(
      new Error('FFmpeg introuvable : installez les dépendances npm (ffmpeg-static).')
    )
  }
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    const p = spawn(
      bin,
      [
        '-nostdin',
        '-hide_banner',
        '-loglevel',
        'error',
        '-i',
        inputPath,
        '-f',
        'wav',
        '-acodec',
        'pcm_s16le',
        '-ar',
        '44100',
        'pipe:1',
      ],
      { windowsHide: true }
    )
    p.stdout.on('data', (c: Buffer) => {
      chunks.push(c)
    })
    let err = ''
    p.stderr.on('data', (d: Buffer) => {
      err += d.toString()
    })
    p.on('error', reject)
    p.on('close', (code) => {
      if (code !== 0) {
        reject(
          new Error(
            `Transcodage échoué (${String(code)}) : ${err.slice(-900)}`
          )
        )
        return
      }
      const out = Buffer.concat(chunks)
      if (out.length < 44) {
        reject(new Error('Sortie WAV vide ou trop courte.'))
        return
      }
      resolve(out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength))
    })
  })
}
