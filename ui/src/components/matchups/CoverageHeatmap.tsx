import { useEffect, useState } from 'react'
import { api } from '../../api'
import type { CoverageRow, Filters } from '../../api'
import { actions, COVERAGE_HELP, optionLabel, pct } from '../../format'
import { amberScale } from '../../scales'
import { SeqLegend } from '../SeqLegend'

interface Props {
  team: string
  filters: Filters
  minSnaps: number
}

const situationLabel = (s: string) => {
  const [down, dist] = s.split(' & ')
  const n = Number.parseInt(down, 10)
  return `${optionLabel('down', n)} tentative · ${optionLabel('distance', dist ?? '').toLowerCase()}`
}

/** C6 : quelle couverture encaisse, selon la situation ? */
export function CoverageHeatmap({ team, filters, minSnaps }: Props) {
  const [rows, setRows] = useState<CoverageRow[]>([])
  const [mode, setMode] = useState<'yards' | 'first'>('yards')
  useEffect(() => {
    api.coverage(team, filters).then(setRows)
  }, [team, filters])

  const coverages = [...new Set(rows.map((r) => r.coverage))]
  // Colonnes dans l'ordre de jeu : tentative, puis distance (court → long).
  const distOrder = ['court', 'moyen', 'long']
  const situations = [...new Set(rows.map((r) => r.situation))].sort((a, b) => {
    const [da, xa] = a.split(' & ')
    const [db, xb] = b.split(' & ')
    return Number.parseInt(da, 10) - Number.parseInt(db, 10) || distOrder.indexOf(xa) - distOrder.indexOf(xb)
  })
  const value = (r: CoverageRow) => (mode === 'yards' ? r.yards_per_play : r.first_down_rate)
  const color = mode === 'yards' ? amberScale(0, 12) : amberScale(0, 0.6)
  // Titre : seulement des cases assez fournies (n ≥ seuil, sinon le quart des cases les plus fournies).
  const ns = rows.map((r) => r.n).sort((a, b) => a - b)
  const floor = rows.some((r) => r.n >= minSnaps) ? minSnaps : (ns[Math.floor(ns.length * 0.75)] ?? 0)
  const worst = rows.filter((r) => r.n >= floor).sort((a, b) => value(b) - value(a))[0]

  return (
    <section className="panel">
      <h3>
        {worst
          ? `${worst.coverage} encaisse le plus (${situationLabel(worst.situation)} : ${
              mode === 'yards' ? `${worst.yards_per_play.toFixed(1)} yards par action` : pct(worst.first_down_rate)
            })`
          : 'Quelle défense en couverture encaisse le plus ?'}
      </h3>
      <div className="toolbar">
        <button
          type="button"
          className={`chip${mode === 'yards' ? ' chip--on' : ''}`}
          aria-pressed={mode === 'yards'}
          onClick={() => setMode('yards')}
        >
          Yards concédés
        </button>
        <button
          type="button"
          className={`chip${mode === 'first' ? ' chip--on' : ''}`}
          aria-pressed={mode === 'first'}
          onClick={() => setMode('first')}
        >
          1er essai concédé
        </button>
      </div>
      <div className="grid-wrap">
        <table className="matrix">
          <thead>
            <tr>
              <th />
              {situations.map((s) => (
                <th key={s} scope="col">
                  {situationLabel(s)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {coverages.map((cov) => (
              <tr key={cov}>
                <th scope="row" title={COVERAGE_HELP[cov]}>
                  {cov}
                  <br />
                  <span className="muted small">{COVERAGE_HELP[cov]}</span>
                </th>
                {situations.map((s) => {
                  const r = rows.find((x) => x.coverage === cov && x.situation === s)
                  if (!r) return <td key={s} />
                  return (
                    <td key={s}>
                      <div
                        className={`cell${r.n < minSnaps ? ' cell--low' : ''}`}
                        style={{ background: color(value(r)) }}
                        title={`Complétion ${pct(r.completion)}`}
                      >
                        <span className="cell__main">
                          {mode === 'yards' ? r.yards_per_play.toFixed(1) : pct(r.first_down_rate)}
                        </span>
                        <span>{actions(r.n)}</span>
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <SeqLegend
        label={mode === 'yards' ? 'Yards concédés par action' : 'Part des 1ers essais concédés'}
        from={color.range()[0] as string}
        to={color.range()[1] as string}
        low={mode === 'yards' ? '0' : '0 %'}
        high={mode === 'yards' ? '≥ 12' : '≥ 60 %'}
      />
      <p className="muted">
        Cases atténuées sous {minSnaps} actions. Survolez une défense pour son explication.
      </p>
    </section>
  )
}
