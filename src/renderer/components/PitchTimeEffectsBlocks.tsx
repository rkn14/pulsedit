import type { EffectChain, EffectInstance } from '@shared/types'
import { rebuildPreview } from '@renderer/audio/rebuildPreview'
import { useAppStore } from '@renderer/store/appStore'
import { upsertEffect, removeEffectOfType } from '@renderer/audio/effectUtils'
import {
  EffectActiveRow,
  ResetParamsButton,
  SliderNumRow,
} from '@renderer/components/EffectUiPrimitives'
import {
  PITCH_DEFAULTS,
  TIME_STRETCH_DEFAULTS,
} from '@renderer/components/pitchTimeDefaults'

type CommitFn = (apply: (chain: EffectChain) => EffectChain) => void

type Props = {
  assetId: string | undefined
  canEdit: boolean
  pushHistorySnapshot: () => void
  commit: CommitFn
  pitchFx: EffectInstance | undefined
  timeStretchFx: EffectInstance | undefined
}

export function PitchTimeEffectsBlocks({
  assetId,
  canEdit,
  pushHistorySnapshot,
  commit,
  pitchFx,
  timeStretchFx,
}: Props) {
  const setEffects = useAppStore((s) => s.setEffects)

  const patch = (fx: EffectInstance) => {
    if (!assetId) {
      return
    }
    setEffects(upsertEffect(useAppStore.getState().effects, fx))
    rebuildPreview(assetId)
  }

  return (
    <>
      <section>
        <h3 className="mb-2 font-medium text-zinc-300">Hauteur (pitch)</h3>
        <p className="mb-2 text-[0.6875rem] leading-snug text-zinc-300">
          Décalage en demi-tons + cents. Rééchantillonnage linéaire (durée
          modifiée).
        </p>
        {!pitchFx ? (
          <button
            type="button"
            disabled={!canEdit}
            className="w-full rounded border border-surface-border bg-surface-raised px-2 py-1.5 text-[0.6875rem] hover:bg-zinc-800 disabled:opacity-40"
            onClick={() => {
              if (!assetId) {
                return
              }
              commit((c) =>
                upsertEffect(c, {
                  id: crypto.randomUUID(),
                  type: 'pitch',
                  enabled: true,
                  params: { ...PITCH_DEFAULTS },
                })
              )
            }}
          >
            Ajouter pitch
          </button>
        ) : (
          <div
            className={`space-y-2 ${!pitchFx.enabled ? 'opacity-50' : ''}`}
            onPointerDown={() =>
              canEdit && pitchFx.enabled && pushHistorySnapshot()
            }
          >
            <EffectActiveRow
              id="fx-pitch-enabled"
              enabled={pitchFx.enabled}
              disabled={!canEdit}
              onChange={(enabled) => patch({ ...pitchFx, enabled })}
            />
            <SliderNumRow
              label="Demi-tons"
              suffix=""
              min={-24}
              max={24}
              step={0.01}
              value={pitchFx.params.semitones ?? 0}
              onChange={(semitones) =>
                patch({
                  ...pitchFx,
                  params: { ...pitchFx.params, semitones },
                })
              }
              disabled={!canEdit || !pitchFx.enabled}
              decimals={2}
            />
            <SliderNumRow
              label="Cents"
              suffix=""
              min={-100}
              max={100}
              step={1}
              value={pitchFx.params.cents ?? 0}
              onChange={(cents) =>
                patch({ ...pitchFx, params: { ...pitchFx.params, cents } })
              }
              disabled={!canEdit || !pitchFx.enabled}
              decimals={0}
            />
            <ResetParamsButton
              disabled={!canEdit}
              onClick={() =>
                patch({
                  ...pitchFx,
                  params: { ...PITCH_DEFAULTS },
                })
              }
            />
            <button
              type="button"
              className="w-full text-[0.6875rem] text-zinc-300 hover:text-zinc-300"
              onClick={() =>
                assetId && commit((c) => removeEffectOfType(c, 'pitch'))
              }
            >
              Retirer pitch
            </button>
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-2 font-medium text-zinc-300">Durée (time stretch)</h3>
        <p className="mb-2 text-[0.6875rem] leading-snug text-zinc-300">
          Ratio sur la durée (1 = inchangé). Rééchantillonnage linéaire.
        </p>
        {!timeStretchFx ? (
          <button
            type="button"
            disabled={!canEdit}
            className="w-full rounded border border-surface-border bg-surface-raised px-2 py-1.5 text-[0.6875rem] hover:bg-zinc-800 disabled:opacity-40"
            onClick={() => {
              if (!assetId) {
                return
              }
              commit((c) =>
                upsertEffect(c, {
                  id: crypto.randomUUID(),
                  type: 'timeStretch',
                  enabled: true,
                  params: { ...TIME_STRETCH_DEFAULTS },
                })
              )
            }}
          >
            Ajouter time stretch
          </button>
        ) : (
          <div
            className={`space-y-2 ${!timeStretchFx.enabled ? 'opacity-50' : ''}`}
            onPointerDown={() =>
              canEdit && timeStretchFx.enabled && pushHistorySnapshot()
            }
          >
            <EffectActiveRow
              id="fx-timestretch-enabled"
              enabled={timeStretchFx.enabled}
              disabled={!canEdit}
              onChange={(enabled) => patch({ ...timeStretchFx, enabled })}
            />
            <SliderNumRow
              label="Ratio"
              suffix="×"
              min={0.25}
              max={10}
              step={0.01}
              value={timeStretchFx.params.ratio ?? 1}
              onChange={(ratio) =>
                patch({
                  ...timeStretchFx,
                  params: { ...timeStretchFx.params, ratio },
                })
              }
              disabled={!canEdit || !timeStretchFx.enabled}
              decimals={2}
            />
            <ResetParamsButton
              disabled={!canEdit}
              onClick={() =>
                patch({
                  ...timeStretchFx,
                  params: { ...TIME_STRETCH_DEFAULTS },
                })
              }
            />
            <button
              type="button"
              className="w-full text-[0.6875rem] text-zinc-300 hover:text-zinc-300"
              onClick={() =>
                assetId &&
                commit((c) => removeEffectOfType(c, 'timeStretch'))
              }
            >
              Retirer time stretch
            </button>
          </div>
        )}
      </section>
    </>
  )
}
