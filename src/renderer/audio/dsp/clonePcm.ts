import type { DecodedPcm } from '../decodedRegistry'

export function clonePcm(input: DecodedPcm): DecodedPcm {
  const channelData = input.channelData.map((ch) => {
    const c = new Float32Array(ch.length)
    c.set(ch)
    return c
  })
  return {
    sampleRate: input.sampleRate,
    channels: input.channels,
    channelData,
  }
}
