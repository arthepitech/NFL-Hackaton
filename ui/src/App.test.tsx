import { fireEvent, render, screen } from '@testing-library/react'
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
  it('affiche les vues en français courant et les situations prêtes', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) =>
        Promise.resolve({ ok: true, json: () => Promise.resolve(url.endsWith('/meta') ? META : []) }),
      ),
    )
    render(<App />)
    const tabs = screen.getByRole('navigation').querySelectorAll('button')
    expect([...tabs].map((b) => b.textContent)).toEqual([
      'Fiche joueur',
      'Duels et adversaire',
      'Revoir une action',
      'Mon suivi',
      'Recrutement',
      'Rapport de match',
    ])
    // Situations prêtes en un clic, filtres détaillés repliés mais disponibles.
    expect(await screen.findByRole('button', { name: '3e tentative et long' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Plus de filtres' }))
    expect(screen.getByRole('button', { name: 'Long (7 et +)' })).toBeInTheDocument()
    expect(screen.queryByText(/pff_/)).toBeNull()
  })
})
