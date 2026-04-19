import { useCallback } from 'react'
import { useAppStore } from '@renderer/store/appStore'
import type { EffectChain, EffectInstance } from '@shared/types'
import { rebuildPreview } from '@renderer/audio/rebuildPreview'
import { getSourcePcm } from '@renderer/audio/decodedRegistry'
import { upsertEffect, removeEffectOfType } from '@renderer/audio/effectUtils'

function previewToSourceRange(
  selection: { start: number; end: number },
  chain: EffectChain,
  sourceDur: number
): { startSec: number; endSec: number } {
  const tr = chain.find((e) => e.type === 'trim' && e.enabled)
  if (tr) {
    const a = tr.params.startSec ?? 0
    return {
      startSec: Math.min(sourceDur, Math.max(0, a + selection.start)),
      endSec: Math.min(sourceDur, Math.max(0, a + selection.end)),
    }
  }
  return {
    startSec: Math.min(sourceDur, Math.max(0, selection.start)),
    endSec: Math.min(sourceDur, Math.max(0, selection.end)),
  }
}

export function EffectsPanel() {
  const asset = useAppStore((s) => s.currentAsset)
  const internalCh = useAppStore((s) => s.internalBufferChannelCount)
  const effects = useAppStore((s) => s.effects)
  const selection = useAppStore((s) => s.selection)
  const setEffects = useAppStore((s) => s.setEffects)
  const pushHistorySnapshot = useAppStore((s) => s.pushHistorySnapshot)
  const undo = useAppStore((s) => s.undo)
  const redo = useAppStore((s) => s.redo)

  const assetId = asset?.id
  const canEdit = Boolean(assetId && internalCh !== null)

  const commit = useCallback(
    (apply: (chain: EffectChain) => EffectChain) => {
      if (!assetId) {
        return
      }
      pushHistorySnapshot()
      const next = apply(useAppStore.getState().effects)
      setEffects(next)
      rebuildPreview(assetId)
    },
    [assetId, pushHistorySnapshot, setEffects]
  )

  const gainFx = effects.find((e) => e.type === 'gain')
  const fadeInFx = effects.find((e) => e.type === 'fadeIn')
  const fadeOutFx = effects.find((e) => e.type === 'fadeOut')
  const normFx = effects.find((e) => e.type === 'normalize')
  const monoFx = effects.find((e) => e.type === 'stereoToMono')
  const trimFx = effects.find((e) => e.type === 'trim')

  return (
    <div className="relative z-20 flex h-full min-h-0 w-80 shrink-0 flex-col border-l border-surface-border bg-surface shadow-[-12px_0_32px_rgba(0,0,0,0.55)]">
      <div className="shrink-0 border-b border-surface-border px-3 py-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-300">
          Édition
        </h2>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 py-3 text-xs text-zinc-300">
        <div className="flex gap-2">
          <button
            type="button"
            disabled={!canEdit}
            className="rounded border border-surface-border bg-surface-raised px-2 py-1 text-[0.6875rem] text-zinc-300 hover:text-zinc-200 disabled:opacity-40"
            onClick={() => undo()}
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={!canEdit}
            className="rounded border border-surface-border bg-surface-raised px-2 py-1 text-[0.6875rem] text-zinc-300 hover:text-zinc-200 disabled:opacity-40"
            onClick={() => redo()}
          >
            Rétablir
          </button>
        </div>

        <section>
          <h3 className="mb-2 font-medium text-zinc-300">Couper (trim)</h3>
          <p className="mb-2 text-[0.6875rem] leading-snug text-zinc-300">
            Garde la zone sélectionnée sur la piste source (temps absolus).
          </p>
          <button
            type="button"
            disabled={
              !canEdit || !selection || selection.end <= selection.start
            }
            className="w-full rounded border border-sky-900/50 bg-sky-950/30 px-2 py-1.5 text-[0.6875rem] text-sky-200 hover:bg-sky-900/40 disabled:opacity-40"
            onClick={() => {
              if (!assetId || !selection) {
                return
              }
              const src = getSourcePcm(assetId)
              if (!src) {
                return
              }
              const sourceDur = src.channelData[0]!.length / src.sampleRate
              const { startSec, endSec } = previewToSourceRange(selection, effects, sourceDur)
              if (endSec - startSec < 0.001) {
                return
              }
              const trim: EffectInstance = {
                id: trimFx?.id ?? crypto.randomUUID(),
                type: 'trim',
                enabled: true,
                params: { startSec, endSec },
              }
              commit((c) => upsertEffect(c, trim))
            }}
          >
            Appliquer la sélection
          </button>
          {trimFx && (
            <button
              type="button"
              className="mt-2 w-full rounded border border-surface-border px-2 py-1 text-[0.6875rem] text-zinc-300 hover:text-zinc-300"
              onClick={() => {
                if (!assetId) {
                  return
                }
                commit((c) => removeEffectOfType(c, 'trim'))
              }}
            >
              Retirer le trim
            </button>
          )}
        </section>

        <section
          onPointerDown={() => {
            if (canEdit) {
              pushHistorySnapshot()
            }
          }}
        >
          <h3 className="mb-2 font-medium text-zinc-300">Gain</h3>
          <label className="flex items-center gap-2">
            <span className="w-10 text-zinc-300">dB</span>
            <input
              type="range"
              min={-24}
              max={24}
              step={0.5}
              disabled={!canEdit}
              value={gainFx?.params.gainDb ?? 0}
              onChange={(e) => {
                if (!assetId) {
                  return
                }
                const gainDb = Number(e.target.value)
                const prev = useAppStore.getState().effects.find((x) => x.type === 'gain')
                const fx: EffectInstance = {
                  id: prev?.id ?? crypto.randomUUID(),
                  type: 'gain',
                  enabled: true,
                  params: { gainDb },
                }
                setEffects(upsertEffect(useAppStore.getState().effects, fx))
                rebuildPreview(assetId)
              }}
              className="flex-1 accent-sky-600"
            />
            <span className="w-12 tabular-nums text-zinc-300">
              {(gainFx?.params.gainDb ?? 0).toFixed(1)}
            </span>
          </label>
        </section>

        <section>
          <h3 className="mb-2 font-medium text-zinc-300">Fades</h3>
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <span className="w-16 text-zinc-300">Fade in</span>
              <input
                type="range"
                min={0}
                max={2}
                step={0.01}
                disabled={!canEdit}
                value={fadeInFx?.params.durationSec ?? 0}
                onPointerDown={() => canEdit && pushHistorySnapshot()}
                onChange={(e) => {
                  if (!assetId) {
                    return
                  }
                  const durationSec = Number(e.target.value)
                  const prev = useAppStore.getState().effects.find((x) => x.type === 'fadeIn')
                  const fx: EffectInstance = {
                    id: prev?.id ?? crypto.randomUUID(),
                    type: 'fadeIn',
                    enabled: durationSec > 0,
                    params: { durationSec },
                  }
                  setEffects(upsertEffect(useAppStore.getState().effects, fx))
                  rebuildPreview(assetId)
                }}
                className="flex-1 accent-sky-600"
              />
              <span className="w-10 text-zinc-300">{(fadeInFx?.params.durationSec ?? 0).toFixed(2)}s</span>
            </label>
            <label className="flex items-center gap-2">
              <span className="w-16 text-zinc-300">Fade out</span>
              <input
                type="range"
                min={0}
                max={2}
                step={0.01}
                disabled={!canEdit}
                value={fadeOutFx?.params.durationSec ?? 0}
                onPointerDown={() => canEdit && pushHistorySnapshot()}
                onChange={(e) => {
                  if (!assetId) {
                    return
                  }
                  const durationSec = Number(e.target.value)
                  const prev = useAppStore.getState().effects.find((x) => x.type === 'fadeOut')
                  const fx: EffectInstance = {
                    id: prev?.id ?? crypto.randomUUID(),
                    type: 'fadeOut',
                    enabled: durationSec > 0,
                    params: { durationSec },
                  }
                  setEffects(upsertEffect(useAppStore.getState().effects, fx))
                  rebuildPreview(assetId)
                }}
                className="flex-1 accent-sky-600"
              />
              <span className="w-10 text-zinc-300">
                {(fadeOutFx?.params.durationSec ?? 0).toFixed(2)}s
              </span>
            </label>
          </div>
        </section>

        <section>
          <h3 className="mb-2 font-medium text-zinc-300">Niveau</h3>
          <button
            type="button"
            disabled={!canEdit}
            className="w-full rounded border border-surface-border bg-surface-raised px-2 py-1.5 text-[0.6875rem] hover:bg-zinc-800 disabled:opacity-40"
            onClick={() => {
              if (!assetId) {
                return
              }
              const fx: EffectInstance = {
                id: normFx?.id ?? crypto.randomUUID(),
                type: 'normalize',
                enabled: true,
                params: { targetPeak: 0.99 },
              }
              commit((c) => upsertEffect(c, fx))
            }}
          >
            Normaliser (peak 0,99)
          </button>
          {normFx && (
            <button
              type="button"
              className="mt-2 w-full text-[0.6875rem] text-zinc-300 hover:text-zinc-300"
              onClick={() => assetId && commit((c) => removeEffectOfType(c, 'normalize'))}
            >
              Retirer normalisation
            </button>
          )}
        </section>

        <section>
          <h3 className="mb-2 font-medium text-zinc-300">Canaux</h3>
          <button
            type="button"
            disabled={!canEdit || asset?.channels === 1}
            className="w-full rounded border border-surface-border bg-surface-raised px-2 py-1.5 text-[0.6875rem] hover:bg-zinc-800 disabled:opacity-40"
            onClick={() => {
              if (!assetId) {
                return
              }
              const fx: EffectInstance = {
                id: monoFx?.id ?? crypto.randomUUID(),
                type: 'stereoToMono',
                enabled: true,
                params: {},
              }
              commit((c) => upsertEffect(c, fx))
            }}
          >
            Stéréo → mono (moyenne L/R)
          </button>
          {monoFx && (
            <button
              type="button"
              className="mt-2 w-full text-[0.6875rem] text-zinc-300 hover:text-zinc-300"
              onClick={() => assetId && commit((c) => removeEffectOfType(c, 'stereoToMono'))}
            >
              Retirer mono
            </button>
          )}
        </section>
      </div>
    </div>
  )
}
