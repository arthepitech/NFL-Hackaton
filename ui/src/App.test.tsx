import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'

const META = {
  thresholds: { min_snaps_display: 100, pressure_radius_yd: 1.5 },
  definitions: {},
  options: {
    down: [1, 2, 3, 4],
    distance: ['court', 'moyen', 'long'],
    quarter: [1, 2, 3, 4, 5],
    score: ['egalite'],
    formation: ['SHOTGUN'],
    personnel_o: [],
    personnel_d: [],
    coverage: ['Cover-1'],
    dropback: ['TRADITIONAL'],
    opponent: ['LV'],
    week: [1, 2],
  },
}

afterEach(() => vi.unstubAllGlobals())

describe('App', () => {
  it('affiche les niveaux dans l’ordre, Matchups réservé à la V2', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) =>
        Promise.resolve({ ok: true, json: () => Promise.resolve(url.endsWith('/meta') ? META : []) }),
      ),
    )
    render(<App />)
    const tabs = screen.getByRole('navigation').querySelectorAll('button')
    expect([...tabs].map((b) => b.textContent)).toEqual([
      'Scout Card',
      'Matchups',
      'Play Lab',
      'Carte joueur',
    ])
    expect(screen.getByRole('button', { name: 'Matchups' })).toBeDisabled()
    // Filtres permanents, en vocabulaire football.
    expect(await screen.findByRole('button', { name: 'Long (≥ 7)' })).toBeInTheDocument()
    expect(screen.queryByText(/pff_/)).toBeNull()
  })
})
