import type { EffectChain, EffectInstance } from '@shared/types'
import { rebuildPreview } from '@renderer/audio/rebuildPreview'
import { useAppStore } from '@renderer/store/appStore'
import { upsertEffect, removeEffectOfType } from '@renderer/audio/effectUtils'
import {
  EffectActiveRow,
  ResetParamsButton,
  SliderNumRow,
} from '@renderer/components/EffectUiPrimitives'
import { SECOND_WAVE_DEFAULTS } from '@renderer/components/secondWaveDefaults'

type CommitFn = (apply: (chain: EffectChain) => EffectChain) => void

type Props = {
  assetId: string | undefined
  canEdit: boolean
  pushHistorySnapshot: () => void
  commit: CommitFn
  phaserFx: EffectInstance | undefined
  flangerFx: EffectInstance | undefined
  distortionFx: EffectInstance | undefined
  bitcrusherFx: EffectInstance | undefined
  compressorFx: EffectInstance | undefined
  eqFx: EffectInstance | undefined
}

export function SecondWaveEffectsBlocks({
  assetId,
  canEdit,
  pushHistorySnapshot,
  commit,
  phaserFx,
  flangerFx,
  distortionFx,
  bitcrusherFx,
  compressorFx,
  eqFx,
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
        <h3 className="mb-2 font-medium text-zinc-300">Phaser</h3>
        <p className="mb-2 text-[0.6875rem] leading-snug text-zinc-300">
          Allpass en série + LFO.
        </p>
        {!phaserFx ? (
          <button
            type="button"
            disabled={!canEdit}
            className="btn-bar-sm w-full py-1.5"
            onClick={() => {
              if (!assetId) {
                return
              }
              commit((c) =>
                upsertEffect(c, {
                  id: crypto.randomUUID(),
                  type: 'phaser',
                  enabled: true,
                  params: { rateHz: 0.6, depth: 0.65, mix: 0.45 },
                })
              )
            }}
          >
            Ajouter phaser
          </button>
        ) : (
          <div
            className={`space-y-2 ${!phaserFx.enabled ? 'opacity-50' : ''}`}
            onPointerDown={() =>
              canEdit && phaserFx.enabled && pushHistorySnapshot()
            }
          >
            <EffectActiveRow
              id="fx-phaser-enabled"
              enabled={phaserFx.enabled}
              disabled={!canEdit}
              onChange={(enabled) => patch({ ...phaserFx, enabled })}
            />
            <SliderNumRow
              label="Rate"
              suffix="Hz"
              min={0.05}
              max={10}
              step={0.05}
              value={phaserFx.params.rateHz ?? 0.6}
              onChange={(rateHz) =>
                patch({ ...phaserFx, params: { ...phaserFx.params, rateHz } })
              }
              disabled={!canEdit || !phaserFx.enabled}
              decimals={2}
            />
            <SliderNumRow
              label="Prof."
              suffix=""
              min={0}
              max={1}
              step={0.01}
              value={phaserFx.params.depth ?? 0.65}
              onChange={(depth) =>
                patch({ ...phaserFx, params: { ...phaserFx.params, depth } })
              }
              disabled={!canEdit || !phaserFx.enabled}
              decimals={2}
            />
            <SliderNumRow
              label="Mix"
              suffix=""
              min={0}
              max={1}
              step={0.01}
              value={phaserFx.params.mix ?? 0.45}
              onChange={(mix) =>
                patch({ ...phaserFx, params: { ...phaserFx.params, mix } })
              }
              disabled={!canEdit || !phaserFx.enabled}
              decimals={2}
            />
            <ResetParamsButton
              disabled={!canEdit}
              onClick={() =>
                patch({
                  ...phaserFx,
                  params: { ...SECOND_WAVE_DEFAULTS.phaser },
                })
              }
            />
            <button
              type="button"
              className="w-full text-[0.6875rem] text-zinc-300 hover:text-zinc-300"
              onClick={() =>
                assetId && commit((c) => removeEffectOfType(c, 'phaser'))
              }
            >
              Retirer phaser
            </button>
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-2 font-medium text-zinc-300">Flanger</h3>
        <p className="mb-2 text-[0.6875rem] leading-snug text-zinc-300">
          Court retard modulé + feedback.
        </p>
        {!flangerFx ? (
          <button
            type="button"
            disabled={!canEdit}
            className="btn-bar-sm w-full py-1.5"
            onClick={() => {
              if (!assetId) {
                return
              }
              commit((c) =>
                upsertEffect(c, {
                  id: crypto.randomUUID(),
                  type: 'flanger',
                  enabled: true,
                  params: {
                    rateHz: 0.45,
                    depthMs: 1.8,
                    feedback: 0.4,
                    mix: 0.42,
                  },
                })
              )
            }}
          >
            Ajouter flanger
          </button>
        ) : (
          <div
            className={`space-y-2 ${!flangerFx.enabled ? 'opacity-50' : ''}`}
            onPointerDown={() =>
              canEdit && flangerFx.enabled && pushHistorySnapshot()
            }
          >
            <EffectActiveRow
              id="fx-flanger-enabled"
              enabled={flangerFx.enabled}
              disabled={!canEdit}
              onChange={(enabled) => patch({ ...flangerFx, enabled })}
            />
            <SliderNumRow
              label="Rate"
              suffix="Hz"
              min={0.05}
              max={6}
              step={0.05}
              value={flangerFx.params.rateHz ?? 0.45}
              onChange={(rateHz) =>
                patch({ ...flangerFx, params: { ...flangerFx.params, rateHz } })
              }
              disabled={!canEdit || !flangerFx.enabled}
              decimals={2}
            />
            <SliderNumRow
              label="Prof."
              suffix="ms"
              min={0.3}
              max={4}
              step={0.05}
              value={flangerFx.params.depthMs ?? 1.8}
              onChange={(depthMs) =>
                patch({
                  ...flangerFx,
                  params: { ...flangerFx.params, depthMs },
                })
              }
              disabled={!canEdit || !flangerFx.enabled}
              decimals={2}
            />
            <SliderNumRow
              label="Fdbk"
              suffix=""
              min={0}
              max={0.92}
              step={0.01}
              value={flangerFx.params.feedback ?? 0.4}
              onChange={(feedback) =>
                patch({
                  ...flangerFx,
                  params: { ...flangerFx.params, feedback },
                })
              }
              disabled={!canEdit || !flangerFx.enabled}
              decimals={2}
            />
            <SliderNumRow
              label="Mix"
              suffix=""
              min={0}
              max={1}
              step={0.01}
              value={flangerFx.params.mix ?? 0.42}
              onChange={(mix) =>
                patch({ ...flangerFx, params: { ...flangerFx.params, mix } })
              }
              disabled={!canEdit || !flangerFx.enabled}
              decimals={2}
            />
            <ResetParamsButton
              disabled={!canEdit}
              onClick={() =>
                patch({
                  ...flangerFx,
                  params: { ...SECOND_WAVE_DEFAULTS.flanger },
                })
              }
            />
            <button
              type="button"
              className="w-full text-[0.6875rem] text-zinc-300 hover:text-zinc-300"
              onClick={() =>
                assetId && commit((c) => removeEffectOfType(c, 'flanger'))
              }
            >
              Retirer flanger
            </button>
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-2 font-medium text-zinc-300">Distorsion</h3>
        {!distortionFx ? (
          <button
            type="button"
            disabled={!canEdit}
            className="btn-bar-sm w-full py-1.5"
            onClick={() => {
              if (!assetId) {
                return
              }
              commit((c) =>
                upsertEffect(c, {
                  id: crypto.randomUUID(),
                  type: 'distortion',
                  enabled: true,
                  params: { drive: 0.25 },
                })
              )
            }}
          >
            Ajouter distorsion
          </button>
        ) : (
          <div
            className={`space-y-2 ${!distortionFx.enabled ? 'opacity-50' : ''}`}
            onPointerDown={() =>
              canEdit && distortionFx.enabled && pushHistorySnapshot()
            }
          >
            <EffectActiveRow
              id="fx-distortion-enabled"
              enabled={distortionFx.enabled}
              disabled={!canEdit}
              onChange={(enabled) => patch({ ...distortionFx, enabled })}
            />
            <SliderNumRow
              label="Drive"
              suffix=""
              min={0}
              max={1}
              step={0.01}
              value={distortionFx.params.drive ?? 0.25}
              onChange={(drive) =>
                patch({
                  ...distortionFx,
                  params: { ...distortionFx.params, drive },
                })
              }
              disabled={!canEdit || !distortionFx.enabled}
              decimals={2}
            />
            <ResetParamsButton
              disabled={!canEdit}
              onClick={() =>
                patch({
                  ...distortionFx,
                  params: { ...SECOND_WAVE_DEFAULTS.distortion },
                })
              }
            />
            <button
              type="button"
              className="w-full text-[0.6875rem] text-zinc-300 hover:text-zinc-300"
              onClick={() =>
                assetId && commit((c) => removeEffectOfType(c, 'distortion'))
              }
            >
              Retirer distorsion
            </button>
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-2 font-medium text-zinc-300">Bitcrusher</h3>
        <p className="mb-2 text-[0.6875rem] leading-snug text-zinc-300">
          Quantification + décimation.
        </p>
        {!bitcrusherFx ? (
          <button
            type="button"
            disabled={!canEdit}
            className="btn-bar-sm w-full py-1.5"
            onClick={() => {
              if (!assetId) {
                return
              }
              commit((c) =>
                upsertEffect(c, {
                  id: crypto.randomUUID(),
                  type: 'bitcrusher',
                  enabled: true,
                  params: { bits: 10, downsample: 2 },
                })
              )
            }}
          >
            Ajouter bitcrusher
          </button>
        ) : (
          <div
            className={`space-y-2 ${!bitcrusherFx.enabled ? 'opacity-50' : ''}`}
            onPointerDown={() =>
              canEdit && bitcrusherFx.enabled && pushHistorySnapshot()
            }
          >
            <EffectActiveRow
              id="fx-bitcrusher-enabled"
              enabled={bitcrusherFx.enabled}
              disabled={!canEdit}
              onChange={(enabled) => patch({ ...bitcrusherFx, enabled })}
            />
            <SliderNumRow
              label="Bits"
              suffix=""
              min={4}
              max={16}
              step={1}
              value={bitcrusherFx.params.bits ?? 10}
              onChange={(bits) =>
                patch({
                  ...bitcrusherFx,
                  params: { ...bitcrusherFx.params, bits },
                })
              }
              disabled={!canEdit || !bitcrusherFx.enabled}
              decimals={0}
            />
            <SliderNumRow
              label="↓S"
              suffix="×"
              min={1}
              max={16}
              step={1}
              value={bitcrusherFx.params.downsample ?? 2}
              onChange={(downsample) =>
                patch({
                  ...bitcrusherFx,
                  params: { ...bitcrusherFx.params, downsample },
                })
              }
              disabled={!canEdit || !bitcrusherFx.enabled}
              decimals={0}
            />
            <ResetParamsButton
              disabled={!canEdit}
              onClick={() =>
                patch({
                  ...bitcrusherFx,
                  params: { ...SECOND_WAVE_DEFAULTS.bitcrusher },
                })
              }
            />
            <button
              type="button"
              className="w-full text-[0.6875rem] text-zinc-300 hover:text-zinc-300"
              onClick={() =>
                assetId && commit((c) => removeEffectOfType(c, 'bitcrusher'))
              }
            >
              Retirer bitcrusher
            </button>
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-2 font-medium text-zinc-300">Compresseur</h3>
        {!compressorFx ? (
          <button
            type="button"
            disabled={!canEdit}
            className="btn-bar-sm w-full py-1.5"
            onClick={() => {
              if (!assetId) {
                return
              }
              commit((c) =>
                upsertEffect(c, {
                  id: crypto.randomUUID(),
                  type: 'compressor',
                  enabled: true,
                  params: {
                    thresholdDb: -20,
                    ratio: 4,
                    attackMs: 5,
                    releaseMs: 120,
                  },
                })
              )
            }}
          >
            Ajouter compresseur
          </button>
        ) : (
          <div
            className={`space-y-2 ${!compressorFx.enabled ? 'opacity-50' : ''}`}
            onPointerDown={() =>
              canEdit && compressorFx.enabled && pushHistorySnapshot()
            }
          >
            <EffectActiveRow
              id="fx-compressor-enabled"
              enabled={compressorFx.enabled}
              disabled={!canEdit}
              onChange={(enabled) => patch({ ...compressorFx, enabled })}
            />
            <SliderNumRow
              label="Seuil"
              suffix="dB"
              min={-48}
              max={0}
              step={0.5}
              value={compressorFx.params.thresholdDb ?? -20}
              onChange={(thresholdDb) =>
                patch({
                  ...compressorFx,
                  params: { ...compressorFx.params, thresholdDb },
                })
              }
              disabled={!canEdit || !compressorFx.enabled}
              decimals={1}
            />
            <SliderNumRow
              label="Ratio"
              suffix=""
              min={1}
              max={20}
              step={0.5}
              value={compressorFx.params.ratio ?? 4}
              onChange={(ratio) =>
                patch({
                  ...compressorFx,
                  params: { ...compressorFx.params, ratio },
                })
              }
              disabled={!canEdit || !compressorFx.enabled}
              decimals={1}
            />
            <SliderNumRow
              label="Att."
              suffix="ms"
              min={0.5}
              max={80}
              step={0.5}
              value={compressorFx.params.attackMs ?? 5}
              onChange={(attackMs) =>
                patch({
                  ...compressorFx,
                  params: { ...compressorFx.params, attackMs },
                })
              }
              disabled={!canEdit || !compressorFx.enabled}
              decimals={1}
            />
            <SliderNumRow
              label="Rel."
              suffix="ms"
              min={10}
              max={800}
              step={5}
              value={compressorFx.params.releaseMs ?? 120}
              onChange={(releaseMs) =>
                patch({
                  ...compressorFx,
                  params: { ...compressorFx.params, releaseMs },
                })
              }
              disabled={!canEdit || !compressorFx.enabled}
              decimals={0}
            />
            <ResetParamsButton
              disabled={!canEdit}
              onClick={() =>
                patch({
                  ...compressorFx,
                  params: { ...SECOND_WAVE_DEFAULTS.compressor },
                })
              }
            />
            <button
              type="button"
              className="w-full text-[0.6875rem] text-zinc-300 hover:text-zinc-300"
              onClick={() =>
                assetId && commit((c) => removeEffectOfType(c, 'compressor'))
              }
            >
              Retirer compresseur
            </button>
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-2 font-medium text-zinc-300">EQ 3 bandes</h3>
        <p className="mb-2 text-[0.6875rem] leading-snug text-zinc-300">
          Pics ~180 Hz / 1,4 kHz / 6,5 kHz.
        </p>
        {!eqFx ? (
          <button
            type="button"
            disabled={!canEdit}
            className="btn-bar-sm w-full py-1.5"
            onClick={() => {
              if (!assetId) {
                return
              }
              commit((c) =>
                upsertEffect(c, {
                  id: crypto.randomUUID(),
                  type: 'eq',
                  enabled: true,
                  params: { lowDb: 0, midDb: 0, highDb: 0 },
                })
              )
            }}
          >
            Ajouter EQ
          </button>
        ) : (
          <div
            className={`space-y-2 ${!eqFx.enabled ? 'opacity-50' : ''}`}
            onPointerDown={() =>
              canEdit && eqFx.enabled && pushHistorySnapshot()
            }
          >
            <EffectActiveRow
              id="fx-eq-enabled"
              enabled={eqFx.enabled}
              disabled={!canEdit}
              onChange={(enabled) => patch({ ...eqFx, enabled })}
            />
            <SliderNumRow
              label="Grave"
              suffix="dB"
              min={-12}
              max={12}
              step={0.5}
              value={eqFx.params.lowDb ?? 0}
              onChange={(lowDb) =>
                patch({ ...eqFx, params: { ...eqFx.params, lowDb } })
              }
              disabled={!canEdit || !eqFx.enabled}
              decimals={1}
            />
            <SliderNumRow
              label="Méd."
              suffix="dB"
              min={-12}
              max={12}
              step={0.5}
              value={eqFx.params.midDb ?? 0}
              onChange={(midDb) =>
                patch({ ...eqFx, params: { ...eqFx.params, midDb } })
              }
              disabled={!canEdit || !eqFx.enabled}
              decimals={1}
            />
            <SliderNumRow
              label="Aigu"
              suffix="dB"
              min={-12}
              max={12}
              step={0.5}
              value={eqFx.params.highDb ?? 0}
              onChange={(highDb) =>
                patch({ ...eqFx, params: { ...eqFx.params, highDb } })
              }
              disabled={!canEdit || !eqFx.enabled}
              decimals={1}
            />
            <ResetParamsButton
              disabled={!canEdit}
              onClick={() =>
                patch({
                  ...eqFx,
                  params: { ...SECOND_WAVE_DEFAULTS.eq },
                })
              }
            />
            <button
              type="button"
              className="w-full text-[0.6875rem] text-zinc-300 hover:text-zinc-300"
              onClick={() => assetId && commit((c) => removeEffectOfType(c, 'eq'))}
            >
              Retirer EQ
            </button>
          </div>
        )}
      </section>
    </>
  )
}
