import type { EffectChain, EffectInstance, EffectType } from './types'

/**
 * Ordre unique de traitement (DSP buffer + graphe Web Audio preview/export).
 * Toute évolution de la chaîne passe par cette liste.
 */
export const EFFECT_CHAIN_ORDER = [
  'trim',
  'gain',
  'fadeIn',
  'fadeOut',
  'normalize',
  'pan',
  'delay',
  'reverb',
  'chorus',
  'tremolo',
  'stereoToMono',
] as const satisfies readonly EffectType[]

/** Effets core ordonnés présents dans la chaîne et activés. */
export function getEnabledEffectsInOrder(chain: EffectChain): EffectInstance[] {
  const byType = new Map(
    chain.filter((e) => e.enabled).map((e) => [e.type, e] as const)
  )
  const out: EffectInstance[] = []
  for (const t of EFFECT_CHAIN_ORDER) {
    const fx = byType.get(t)
    if (fx) {
      out.push(fx)
    }
  }
  return out
}
