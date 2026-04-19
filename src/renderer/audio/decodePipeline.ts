import type { DecodeSuccessPayload } from '@shared/audioWorkerMessages'
import { decodeAndNormalize } from './decodeAudio'

/**
 * Décode et normalise en 44,1 kHz (renderer — `AudioContext` n’existe pas dans les Web Workers).
 */
export function requestDecode(
  assetId: string,
  arrayBuffer: ArrayBuffer
): Promise<DecodeSuccessPayload> {
  return decodeAndNormalize(assetId, arrayBuffer)
}
