import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MetricTile } from './MetricTile'

const DEF = { label: 'Blocs gagnés (PFF)', definition: 'Part des snaps…', better: 'high' as const }

describe('MetricTile', () => {
  it('affiche n snaps, grise sous le seuil et ouvre les jeux au clic', () => {
    const onOpen = vi.fn()
    render(
      <MetricTile
        metricKey="pbwr_pff"
        metric={{ value: 0.9, n: 42, low_sample: true, tier: null }}
        definition={DEF}
        selected={false}
        onOpen={onOpen}
      />,
    )
    const tile = screen.getByRole('button')
    expect(tile).toHaveClass('tile--low')
    expect(tile).toHaveTextContent('42 snaps · échantillon faible')
    expect(tile).toHaveAttribute('title', 'Part des snaps…')
    fireEvent.click(tile)
    expect(onOpen).toHaveBeenCalledWith('pbwr_pff')
  })

  it('colore top et bottom 10 % avec un libellé explicite', () => {
    render(
      <MetricTile
        metricKey="pressure_rate"
        metric={{ value: 0.12, n: 250, low_sample: false, tier: 'bottom' }}
        definition={{ ...DEF, label: 'Pressions concédées', better: 'low' }}
        selected={false}
        onOpen={() => {}}
      />,
    )
    const tile = screen.getByRole('button')
    expect(tile).toHaveClass('tile--bottom')
    expect(tile).toHaveTextContent('Bottom 10 %')
  })
})
