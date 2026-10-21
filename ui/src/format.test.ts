import { describe, expect, it } from 'vitest'
import * as format from './format'
import { toQuery } from './api'

describe('format', () => {
  it('affiche pourcentages et secondes', () => {
    expect(format.formatMetric('pbwr_pff', 0.9123)).toBe('91.2 %')
    expect(format.pct(0.9123)).toBe('91 %')
    expect(format.formatMetric('ttp', 2.14)).toBe('2.1 s')
    expect(format.formatMetric('pressure_rate', null)).toBe('—')
  })
  it('convertit en mph à l’affichage seulement', () => {
    expect(format.mph(8)).toBe('16.4 mph')
  })
  it('parle football', () => {
    expect(format.downDistance(3, 7)).toBe('3e tentative, 7 yards à gagner')
    expect(format.optionLabel('quarter', 5)).toBe('Prolongation')
    expect(format.optionLabel('distance', 'long')).toBe('Long (7 et +)')
    expect(format.heightLabel(77)).toBe('196 cm (6\'5")')
    expect('toQueryLabel' in format).toBe(false)
  })
  it('construit la requête de filtres', () => {
    expect(toQuery({ down: ['3'], distance: ['long'], red_zone: 'true' }, { metric: 'ttp' })).toBe(
      '?down=3&distance=long&red_zone=true&metric=ttp',
    )
    expect(toQuery({})).toBe('')
  })
})

describe('lien direct', () => {
  it('ouvre un duel précis au bon instant', async () => {
    const { readDeepLink } = await import('./geometry')
    expect(readDeepLink('?vue=playlab&match=2021101709&jeu=1444&bloqueur=52491&t=2.2')).toEqual({
      view: 'playlab',
      playerId: null,
      target: { gameId: 2021101709, playId: 1444, blockerId: 52491, rusherId: null, t: 2.2 },
    })
    expect(readDeepLink('').target).toBeNull()
  })
})

describe('poche', () => {
  it('mesure le rétrécissement par rapport à la surface maximale du dropback', async () => {
    const { maxPocketArea, pocketArea } = await import('./geometry')
    const sq = (k: number): [number, number, null, number][] => [[k, 0, null, 0]]
    const play = {
      frames: [
        { frameId: 1, t: 0, event: 'ball_snap' },
        { frameId: 2, t: 0.1, event: null },
        { frameId: 3, t: 0.2, event: 'qb_sack' },
      ],
      frame_end: 3,
      ol: [1, 2, 3],
      qbId: 4,
      positions: {
        // Triangle OL 1-2-3 + QB : surfaces 2 → 8 → 2 yd².
        '1': [[0, 0, null, 0], [0, 0, null, 0], [0, 0, null, 0]],
        '2': [[2, 0, null, 0], [4, 0, null, 0], [2, 0, null, 0]],
        '3': [[0, 2, null, 0], [0, 4, null, 0], [0, 2, null, 0]],
        '4': [...sq(0), ...sq(0), ...sq(0)],
      },
    } as unknown as Parameters<typeof pocketArea>[0]
    expect(pocketArea(play, 0)).toBe(2)
    expect(maxPocketArea(play)).toBe(8)
  })
})
