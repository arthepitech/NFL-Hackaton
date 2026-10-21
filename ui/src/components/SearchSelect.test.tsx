import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { normalize } from '../format'
import { SearchSelect } from './SearchSelect'

const OPTIONS = [
  { value: '1', label: 'Garett Bolles', hint: 'DEN · Tackle' },
  { value: '2', label: 'Dalton Risner', hint: 'DEN · Guard' },
  { value: '3', label: 'Andrew Whitworth', hint: 'LA · Tackle' },
]

describe('SearchSelect', () => {
  it('ignore accents et majuscules', () => {
    expect(normalize('  Défense ÉTUDIÉE ')).toBe('defense etudiee')
  })

  it('filtre en tapant (nom ou indice) et choisit au clic', () => {
    const onChange = vi.fn()
    render(<SearchSelect label="Joueur" value="1" options={OPTIONS} onChange={onChange} />)
    const box = screen.getByRole('combobox', { name: 'Joueur' })
    expect(box).toHaveValue('Garett Bolles')
    fireEvent.focus(box)
    fireEvent.change(box, { target: { value: 'den guard' } })
    const options = screen.getAllByRole('option')
    expect(options.map((o) => o.textContent)).toEqual(['Dalton RisnerDEN · Guard'])
    fireEvent.mouseDown(options[0])
    expect(onChange).toHaveBeenCalledWith('2')
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('se pilote au clavier et propose l’option vide', () => {
    const onChange = vi.fn()
    render(<SearchSelect label="Équipe" value="" options={OPTIONS} onChange={onChange} emptyLabel="Toutes" />)
    const box = screen.getByRole('combobox')
    fireEvent.focus(box)
    expect(screen.getAllByRole('option')[0]).toHaveTextContent('Toutes')
    fireEvent.keyDown(box, { key: 'ArrowDown' })
    fireEvent.keyDown(box, { key: 'Enter' })
    expect(onChange).toHaveBeenCalledWith('1')
  })

  it('indique quand rien ne correspond', () => {
    render(<SearchSelect label="Joueur" value="1" options={OPTIONS} onChange={() => {}} />)
    const box = screen.getByRole('combobox')
    fireEvent.focus(box)
    fireEvent.change(box, { target: { value: 'zzz' } })
    expect(screen.getByText('Aucun résultat')).toBeInTheDocument()
  })
})
