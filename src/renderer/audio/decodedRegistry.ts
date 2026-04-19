/** Registre des buffers PCM — source (décodage fichier) et aperçu (après chaîne d’effets). */

export type DecodedPcm = {
  sampleRate: number
  channels: 1 | 2
  channelData: Float32Array[]
}

/** Buffer original 44,1 kHz — non modifié après chargement. */
const sourceRegistry = new Map<string, DecodedPcm>()
/** Aperçu lecture / waveform (résultat de la chaîne d’effets). */
const previewRegistry = new Map<string, DecodedPcm>()

export function registerSourcePcm(assetId: string, pcm: DecodedPcm): void {
  sourceRegistry.set(assetId, pcm)
}

export function getSourcePcm(assetId: string): DecodedPcm | undefined {
  return sourceRegistry.get(assetId)
}

export function registerPreviewPcm(assetId: string, pcm: DecodedPcm): void {
  previewRegistry.set(assetId, pcm)
}

/** Alias historique : buffer utilisé pour lecture et affichage = aperçu traité. */
export function registerDecodedPcm(assetId: string, pcm: DecodedPcm): void {
  registerPreviewPcm(assetId, pcm)
}

export function getDecodedPcm(assetId: string): DecodedPcm | undefined {
  return previewRegistry.get(assetId)
}

export function clearDecodedPcm(assetId: string): void {
  sourceRegistry.delete(assetId)
  previewRegistry.delete(assetId)
}
