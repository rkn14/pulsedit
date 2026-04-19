import type { EffectChain, EffectInstance, EffectType } from '@shared/types'

export function upsertEffect(chain: EffectChain, effect: EffectInstance): EffectChain {
  const i = chain.findIndex((e) => e.type === effect.type)
  if (i === -1) {
    return [...chain, effect]
  }
  const next = [...chain]
  next[i] = effect
  return next
}

export function removeEffectOfType(chain: EffectChain, type: EffectType): EffectChain {
  return chain.filter((e) => e.type !== type)
}
