import type { ReactNode } from 'react'

/** Ligne Actif + case à cocher (phase 7.5). */
export function EffectActiveRow(props: {
  id: string
  enabled: boolean
  disabled: boolean
  onChange: (enabled: boolean) => void
}) {
  const { id, enabled, disabled, onChange } = props
  return (
    <label className="flex cursor-pointer items-center gap-2 text-[0.6875rem] text-zinc-300">
      <input
        id={id}
        type="checkbox"
        checked={enabled}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="rounded border-surface-border bg-surface text-sky-600"
      />
      Actif
    </label>
  )
}

type SliderNumProps = {
  label: string
  suffix: string
  min: number
  max: number
  step: number
  value: number
  onChange: (v: number) => void
  disabled: boolean
  decimals: number
  inputWidthClass?: string
}

/** Slider + champ numérique synchronisés. */
export function SliderNumRow(props: SliderNumProps) {
  const {
    label,
    suffix,
    min,
    max,
    step,
    value,
    onChange,
    disabled,
    decimals,
    inputWidthClass = 'w-16',
  } = props
  const stepStr =
    step >= 1 ? '1' : step >= 0.1 ? '0.1' : step >= 0.01 ? '0.01' : '0.001'

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-12 shrink-0 text-zinc-300">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="min-w-0 flex-1 accent-sky-600"
      />
      <input
        type="number"
        min={min}
        max={max}
        step={stepStr}
        disabled={disabled}
        value={
          decimals === 0 ? Math.round(value) : Number(value.toFixed(decimals))
        }
        onChange={(e) => {
          const v = Number(e.target.value)
          if (Number.isFinite(v)) {
            onChange(Math.max(min, Math.min(max, v)))
          }
        }}
        className={`${inputWidthClass} shrink-0 rounded border border-surface-border bg-surface-raised px-1.5 py-0.5 text-right text-[0.6875rem] tabular-nums text-zinc-200`}
      />
      <span className="w-8 shrink-0 text-zinc-400">{suffix}</span>
    </div>
  )
}

export function ResetParamsButton(props: {
  disabled: boolean
  onClick: () => void
  children?: ReactNode
}) {
  return (
    <button
      type="button"
      disabled={props.disabled}
      className="w-full rounded border border-surface-border px-2 py-1 text-[0.6875rem] text-zinc-300 hover:bg-zinc-800 disabled:opacity-40"
      onClick={props.onClick}
    >
      {props.children ?? 'Réinitialiser paramètres'}
    </button>
  )
}
