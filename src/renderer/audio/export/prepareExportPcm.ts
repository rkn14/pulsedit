import type { DecodedPcm } from '../decodedRegistry'
import { getDecodedPcm } from '../decodedRegistry'
import type { SelectionRange } from '@shared/types'
import { slicePcmByTimeRange } from './pcmSlice'

/**
 * PCM tel qu’entendu en preview (buffer traité), restreint à la sélection si elle a une durée > 0.
 */
export function prepareExportPcm(
  assetId: string,
  selection: SelectionRange | null
): DecodedPcm | null {
  const pcm = getDecodedPcm(assetId)
  if (!pcm) {
    return null
  }
  if (selection && selection.end > selection.start) {
    return slicePcmByTimeRange(pcm, selection.start, selection.end)
  }
  return pcm
}
