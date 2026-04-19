/**
 * Graphe Web Audio pour la lecture preview — Phase 7.2.
 * Le buffer lu reste déjà traité par le DSP offline ; les nœuds temps réel
 * (delay, reverb, etc.) s’insèrent ici au fil de l’eau sans doublon avec applyEffectChain.
 */
import type { EffectChain } from '@shared/types'

export type PlaybackGraphHandle = {
  /** Entrée : connecter la sortie du BufferSource. */
  input: AudioNode
  /** Sortie : connecter à AudioContext.destination (ou analyse). */
  output: AudioNode
  /** Libère les connexions des nœuds créés pour ce tour de lecture. */
  disconnect: () => void
}

/**
 * Construit une chaîne modulaire jusqu’à la sortie.
 * Aujourd’hui : étage maître (gain 1) — prêt pour Gain / StereoPanner / effets créatifs (7.3+).
 */
export function createPlaybackGraph(
  context: AudioContext,
  _chain: EffectChain,
  _channelCount: 1 | 2
): PlaybackGraphHandle {
  const nodes: AudioNode[] = []
  const master = context.createGain()
  master.gain.value = 1
  nodes.push(master)

  // Phase 7.3+ : getEnabledEffectsInOrder(chain) → Convolver, DelayNode, StereoPanner, etc.

  return {
    input: master,
    output: master,
    disconnect: () => {
      for (const n of nodes) {
        try {
          n.disconnect()
        } catch {
          /* déjà déconnecté */
        }
      }
    },
  }
}
