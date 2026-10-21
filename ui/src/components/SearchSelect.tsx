import { useId, useMemo, useRef, useState } from 'react'
import { normalize } from '../format'

export interface Option {
  value: string
  label: string
  /** Texte secondaire affiché et cherché (équipe, poste…). */
  hint?: string
}

interface Props {
  label: string
  value: string
  options: Option[]
  onChange: (value: string) => void
  /** Libellé de l'option vide ('' = pas de choix), ex. « Toutes ». Absent : pas d'option vide. */
  emptyLabel?: string
  placeholder?: string
  className?: string
}

/**
 * Liste de choix avec recherche (combobox ARIA) : on tape pour filtrer, flèches + Entrée au
 * clavier, toucher au doigt (options de 44 px), Échap pour fermer.
 */
export function SearchSelect({
  label,
  value,
  options,
  onChange,
  emptyLabel,
  placeholder = 'Rechercher…',
  className,
}: Props) {
  const id = useId()
  const input = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)

  const all = useMemo(
    () => (emptyLabel === undefined ? options : [{ value: '', label: emptyLabel }, ...options]),
    [options, emptyLabel],
  )
  const shown = useMemo(() => {
    const q = normalize(query)
    if (!q) return all
    const words = q.split(/\s+/)
    return all.filter((o) => {
      const text = normalize(`${o.label} ${o.hint ?? ''}`)
      return words.every((w) => text.includes(w))
    })
  }, [all, query])
  const current = all.find((o) => o.value === value)

  const choose = (o: Option) => {
    onChange(o.value)
    setOpen(false)
    setQuery('')
    input.current?.blur()
  }

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setActive((a) => Math.min(shown.length - 1, a + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(0, a - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (open && shown[active]) choose(shown[active])
      else setOpen(true)
    } else if (e.key === 'Escape') {
      setOpen(false)
      setQuery('')
    }
  }

  const listId = `${id}-liste`
  return (
    <div className={`search-select${className ? ` ${className}` : ''}`}>
      <label className="filters__label" htmlFor={id}>
        {label}
      </label>
      <div className="search-select__box">
        <input
          ref={input}
          id={id}
          className="search-select__input"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && shown[active] ? `${id}-${active}` : undefined}
          autoComplete="off"
          value={open ? query : (current?.label ?? '')}
          placeholder={open ? (current?.label ?? placeholder) : placeholder}
          onFocus={() => {
            setOpen(true)
            setActive(Math.max(0, all.findIndex((o) => o.value === value)))
          }}
          onBlur={() => {
            setOpen(false)
            setQuery('')
          }}
          onChange={(e) => {
            setQuery(e.target.value)
            setActive(0)
            setOpen(true)
          }}
          onKeyDown={onKey}
        />
        <span className="search-select__chevron" aria-hidden="true">
          ▾
        </span>
      </div>
      {open && (
        <ul id={listId} role="listbox" aria-label={label} className="search-select__list">
          {shown.length === 0 && <li className="search-select__empty">Aucun résultat</li>}
          {shown.map((o, i) => (
            <li
              key={o.value}
              id={`${id}-${i}`}
              role="option"
              aria-selected={o.value === value}
              className={`search-select__option${i === active ? ' is-active' : ''}${o.value === value ? ' is-selected' : ''}`}
              // mousedown : choisir avant que le champ perde le focus.
              onMouseDown={(e) => {
                e.preventDefault()
                choose(o)
              }}
              onMouseEnter={() => setActive(i)}
            >
              <span>{o.label}</span>
              {o.hint && <span className="search-select__hint">{o.hint}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
