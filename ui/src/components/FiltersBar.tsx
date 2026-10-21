import { useState } from 'react'
import type { Filters, Meta } from '../api'
import { FILTER_LABELS, PRESETS, optionLabel } from '../format'
import { SearchSelect } from './SearchSelect'

// Filtres détaillés rangés par thème (tous les filtres de CLAUDE.md §7 restent disponibles).
const GROUPS: { title: string; chips?: string[]; selects?: string[]; booleans?: string[] }[] = [
  { title: 'Situation de jeu', chips: ['down', 'distance', 'quarter'], selects: ['score'], booleans: ['red_zone'] },
  { title: 'Attaque', selects: ['formation', 'personnel_o', 'dropback'], booleans: ['play_action'] },
  { title: 'Défense', selects: ['coverage', 'personnel_d', 'opponent'] },
]

interface Props {
  meta: Meta
  filters: Filters
  onChange: (f: Filters) => void
}

const same = (a: Filters, b: Filters) => {
  const norm = (f: Filters) =>
    JSON.stringify(
      Object.entries(f)
        .filter(([, v]) => (Array.isArray(v) ? v.length : v))
        .map(([k, v]) => [k, Array.isArray(v) ? [...v].sort() : v])
        .sort(),
    )
  return norm(a) === norm(b)
}

export function FiltersBar({ meta, filters, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const set = (key: string, value: string[] | string | undefined) => onChange({ ...filters, [key]: value })
  const toggle = (key: string, v: string) => {
    const current = (filters[key] as string[] | undefined) ?? []
    set(key, current.includes(v) ? current.filter((x) => x !== v) : [...current, v])
  }

  // Étiquettes des filtres actifs, retirables d'un clic.
  const active: { key: string; value: string; label: string }[] = []
  for (const [key, v] of Object.entries(filters)) {
    const values = Array.isArray(v) ? v : v ? [v] : []
    for (const value of values) {
      const text =
        key === 'red_zone' || key === 'play_action'
          ? `${FILTER_LABELS[key]} : ${value === 'true' ? 'oui' : 'non'}`
          : key === 'week_min' || key === 'week_max'
            ? `${FILTER_LABELS[key]} ${value}`
            : `${FILTER_LABELS[key]} : ${optionLabel(key, value)}`
      active.push({ key, value, label: text })
    }
  }
  const remove = (key: string, value: string) => {
    const v = filters[key]
    set(key, Array.isArray(v) ? v.filter((x) => x !== value) : undefined)
  }

  return (
    <section className="filters" aria-label="Filtres">
      <div className="filters__presets" role="group" aria-label="Situations">
        {PRESETS.map((p) => {
          const on = same(filters, p.filters)
          return (
            <button
              key={p.id}
              type="button"
              className={`chip${on ? ' chip--on' : ''}`}
              aria-pressed={on}
              title={p.help}
              onClick={() => onChange(p.filters)}
            >
              {p.label}
            </button>
          )
        })}
        <button
          type="button"
          className="chip chip--ghost"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? 'Masquer les filtres' : 'Plus de filtres'}
        </button>
      </div>

      {active.length > 0 && (
        <div className="filters__active" aria-label="Filtres actifs">
          {active.map((a) => (
            <button
              key={`${a.key}-${a.value}`}
              type="button"
              className="tag"
              onClick={() => remove(a.key, a.value)}
              aria-label={`Retirer le filtre ${a.label}`}
            >
              {a.label} <span aria-hidden="true">×</span>
            </button>
          ))}
          <button type="button" className="link" onClick={() => onChange({})}>
            Tout effacer
          </button>
        </div>
      )}

      {open && (
        <div className="filters__panel">
          {GROUPS.map((g) => (
            <fieldset key={g.title}>
              <legend>{g.title}</legend>
              {g.chips?.map((key) => (
                <div className="filters__group" key={key} role="group" aria-label={FILTER_LABELS[key]}>
                  <span className="filters__label">{FILTER_LABELS[key]}</span>
                  <div className="filters__chips">
                    {meta.options[key].map((v) => {
                      const on = ((filters[key] as string[] | undefined) ?? []).includes(String(v))
                      return (
                        <button
                          key={v}
                          type="button"
                          className={`chip chip--small${on ? ' chip--on' : ''}`}
                          aria-pressed={on}
                          onClick={() => toggle(key, String(v))}
                        >
                          {optionLabel(key, v)}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
              {g.selects?.map((key) => (
                <SearchSelect
                  key={key}
                  label={FILTER_LABELS[key]}
                  value={((filters[key] as string[] | undefined) ?? [])[0] ?? ''}
                  emptyLabel="Toutes"
                  options={meta.options[key].map((v) => ({ value: String(v), label: optionLabel(key, v) }))}
                  onChange={(v) => set(key, v ? [v] : [])}
                />
              ))}
              {g.booleans?.map((key) => (
                <SearchSelect
                  key={key}
                  label={FILTER_LABELS[key]}
                  value={(filters[key] as string | undefined) ?? ''}
                  emptyLabel="Peu importe"
                  options={[
                    { value: 'true', label: 'Oui' },
                    { value: 'false', label: 'Non' },
                  ]}
                  onChange={(v) => set(key, v || undefined)}
                />
              ))}
            </fieldset>
          ))}
          <fieldset>
            <legend>Période</legend>
            {(['week_min', 'week_max'] as const).map((key) => (
              <SearchSelect
                key={key}
                label={FILTER_LABELS[key]}
                value={(filters[key] as string | undefined) ?? ''}
                emptyLabel="—"
                options={meta.options.week.map((w) => ({ value: String(w), label: `Semaine ${w}` }))}
                onChange={(v) => set(key, v || undefined)}
              />
            ))}
          </fieldset>
        </div>
      )}
    </section>
  )
}
