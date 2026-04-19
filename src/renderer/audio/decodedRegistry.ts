/** Registre des buffers PCM décodés (hors Zustand — données volumineuses). */

export type DecodedPcm = {
  sampleRate: number
  channels: 1 | 2
  channelData: Float32Array[]
}

const registry = new Map<string, DecodedPcm>()

export function registerDecodedPcm(assetId: string, pcm: DecodedPcm): void {
  registry.set(assetId, pcm)
}

export function getDecodedPcm(assetId: string): DecodedPcm | undefined {
  return registry.get(assetId)
}

export function clearDecodedPcm(assetId: string): void {
  registry.delete(assetId)
}
