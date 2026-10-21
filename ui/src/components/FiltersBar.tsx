import type { Filters, Meta } from '../api'
import { FILTER_LABELS, optionLabel } from '../format'

const CHIPS = ['down', 'distance', 'quarter'] as const
const SELECTS = [
  'score',
  'formation',
  'personnel_o',
  'personnel_d',
  'coverage',
  'dropback',
  'opponent',
] as const
const BOOLEANS = ['red_zone', 'play_action'] as const

interface Props {
  meta: Meta
  filters: Filters
  onChange: (f: Filters) => void
}

export function FiltersBar({ meta, filters, onChange }: Props) {
  const set = (key: string, value: string[] | string | undefined) =>
    onChange({ ...filters, [key]: value })
  const toggle = (key: string, v: string) => {
    const current = (filters[key] as string[] | undefined) ?? []
    set(key, current.includes(v) ? current.filter((x) => x !== v) : [...current, v])
  }
  const active = Object.values(filters).some((v) => (Array.isArray(v) ? v.length : v))

  return (
    <section className="filters" aria-label="Filtres de situation">
      {CHIPS.map((key) => (
        <div className="filters__group" key={key} role="group" aria-label={FILTER_LABELS[key]}>
          <span className="filters__label">{FILTER_LABELS[key]}</span>
          {meta.options[key].map((v) => {
            const on = ((filters[key] as string[] | undefined) ?? []).includes(String(v))
            return (
              <button
                key={v}
                type="button"
                className={`chip${on ? ' chip--on' : ''}`}
                aria-pressed={on}
                onClick={() => toggle(key, String(v))}
              >
                {key === 'down' ? `${v}e` : optionLabel(key, v)}
              </button>
            )
          })}
        </div>
      ))}
      {SELECTS.map((key) => (
        <label className="filters__select" key={key}>
          <span className="filters__label">{FILTER_LABELS[key]}</span>
          <select
            value={((filters[key] as string[] | undefined) ?? [])[0] ?? ''}
            onChange={(e) => set(key, e.target.value ? [e.target.value] : [])}
          >
            <option value="">Tous</option>
            {meta.options[key].map((v) => (
              <option key={v} value={String(v)}>
                {optionLabel(key, v)}
              </option>
            ))}
          </select>
        </label>
      ))}
      {BOOLEANS.map((key) => (
        <label className="filters__select" key={key}>
          <span className="filters__label">{FILTER_LABELS[key]}</span>
          <select
            value={(filters[key] as string | undefined) ?? ''}
            onChange={(e) => set(key, e.target.value || undefined)}
          >
            <option value="">Tous</option>
            <option value="true">Oui</option>
            <option value="false">Non</option>
          </select>
        </label>
      ))}
      {(['week_min', 'week_max'] as const).map((key) => (
        <label className="filters__select" key={key}>
          <span className="filters__label">{FILTER_LABELS[key]}</span>
          <select
            value={(filters[key] as string | undefined) ?? ''}
            onChange={(e) => set(key, e.target.value || undefined)}
          >
            <option value="">—</option>
            {meta.options.week.map((w) => (
              <option key={w} value={String(w)}>
                Sem. {w}
              </option>
            ))}
          </select>
        </label>
      ))}
      {active && (
        <button type="button" className="chip chip--reset" onClick={() => onChange({})}>
          Effacer les filtres
        </button>
      )}
    </section>
  )
}
