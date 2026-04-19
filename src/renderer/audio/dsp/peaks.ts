/** Pics mono pour affichage waveform (réutilisé par décodage et rebuild). */
export function computeMonoPeaks(buffer: {
  numberOfChannels: number
  length: number
  getChannelData: (ch: number) => Float32Array
}, numBars: number): Float32Array {
  const chCount = buffer.numberOfChannels
  const len = buffer.length
  const block = Math.max(1, Math.floor(len / numBars))
  const out = new Float32Array(numBars)
  for (let i = 0; i < numBars; i++) {
    const start = i * block
    const end = Math.min(start + block, len)
    let peak = 0
    for (let j = start; j < end; j++) {
      let sum = 0
      for (let c = 0; c < chCount; c++) {
        sum += buffer.getChannelData(c)[j] ?? 0
      }
      const v = Math.abs(sum / chCount)
      if (v > peak) {
        peak = v
      }
    }
    out[i] = peak
  }
  return out
}

export function peaksFromDecodedPcm(
  pcm: { channelData: Float32Array[] },
  numBars: number
): Float32Array {
  const len = pcm.channelData[0]?.length ?? 0
  const fake = {
    numberOfChannels: pcm.channelData.length,
    length: len,
    getChannelData: (c: number) => pcm.channelData[c]!,
  }
  return computeMonoPeaks(fake, numBars)
}

function peaksSingleChannel(samples: Float32Array, numBars: number): Float32Array {
  const len = samples.length
  const out = new Float32Array(numBars)
  if (len === 0) {
    return out
  }
  const block = Math.max(1, Math.floor(len / numBars))
  for (let i = 0; i < numBars; i++) {
    const start = i * block
    const end = Math.min(start + block, len)
    let peak = 0
    for (let j = start; j < end; j++) {
      const v = Math.abs(samples[j] ?? 0)
      if (v > peak) {
        peak = v
      }
    }
    out[i] = peak
  }
  return out
}

/** Une courbe de pics par canal (mono → 1 entrée, stéréo → 2). */
export function peaksChannelsFromDecodedPcm(
  pcm: { channelData: Float32Array[] },
  numBars: number
): Float32Array[] {
  return pcm.channelData.map((ch) => peaksSingleChannel(ch, numBars))
}
