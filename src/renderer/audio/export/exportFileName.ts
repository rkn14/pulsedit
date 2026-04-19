import type { ExportAudioFormat } from '@shared/ipc'

function stemFromFilePath(filePath: string): string {
  const base = filePath.replace(/^.*[/\\]/, '')
  const dot = base.lastIndexOf('.')
  return dot > 0 ? base.slice(0, dot) : base
}

export function defaultExportFileName(
  sourceFilePath: string | undefined,
  format: ExportAudioFormat
): string {
  const stem = sourceFilePath ? stemFromFilePath(sourceFilePath) : 'export'
  const ext = format === 'wav' ? 'wav' : format === 'aiff' ? 'aiff' : 'mp3'
  return `${stem}.${ext}`
}
