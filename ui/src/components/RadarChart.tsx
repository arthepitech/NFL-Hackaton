import { lineRadial, scaleLinear } from 'd3'
import type { AxisKey, RadarData } from '../api'
import { pct, YDS_TO_MPH } from '../format'

const AXES: AxisKey[] = ['PP', 'PA', 'SW', 'island', 'fast', 'heavy']
const SERIES = ['#3b82f6', '#f59e0b', '#a78bfa']
const SIZE = 460
const R = 130

/** R1 : win rate par contexte de bloc ; jusqu'à 3 joueurs + moyenne du poste (gris). */
export function RadarChart({ data, minSnaps }: { data: RadarData; minSnaps: number }) {
  const r = scaleLinear().domain([0.5, 1]).range([0, R]).clamp(true)
  const angle = (i: number) => (i / AXES.length) * Math.PI * 2
  // Axe sans donnée : trou dans le polygone, jamais un faux 50 %.
  const shape = lineRadial<number | null>()
    .defined((v) => v !== null)
    .angle((_, i) => angle(i))
    .radius((v) => r(v ?? 0))
  const pathOf = (axes: RadarData['position_average']['axes']) =>
    shape(AXES.map((a) => axes[a].value).concat(axes[AXES[0]].value)) ?? ''
  const series = [
    { name: `Moyenne ${data.position_average.position}`, axes: data.position_average.axes, color: '#6b7280' },
    ...data.players.map((p, i) => ({ name: p.name, axes: p.axes, color: SERIES[i] })),
  ]

  return (
    <figure className="radar">
      <svg className="chart" viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label="Radar de compétences">
        <g transform={`translate(${SIZE / 2}, ${SIZE / 2})`}>
          {[0.6, 0.7, 0.8, 0.9, 1].map((v) => (
            <circle key={v} r={r(v)} fill="none" stroke="#263040" />
          ))}
          {AXES.map((a, i) => {
            const x = Math.sin(angle(i)) * (R + 22)
            const y = -Math.cos(angle(i)) * (R + 22)
            return (
              <g key={a}>
                <line x2={Math.sin(angle(i)) * R} y2={-Math.cos(angle(i)) * R} stroke="#263040" />
                <text x={x} y={y} textAnchor="middle" dominantBaseline="middle">
                  {data.labels[a]}
                </text>
              </g>
            )
          })}
          {series.map((s) => (
            <path key={s.name} d={pathOf(s.axes)} fill="none" stroke={s.color} strokeWidth={2.5} />
          ))}
        </g>
      </svg>
      <table className="simple">
        <thead>
          <tr>
            <th />
            {AXES.map((a) => (
              <th key={a}>{data.labels[a]}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {series.map((s) => (
            <tr key={s.name}>
              <th>
                <span className="legend__swatch" style={{ background: s.color }} /> {s.name}
              </th>
              {AXES.map((a) => (
                <td key={a} className={s.axes[a].n < minSnaps ? 'muted' : undefined}>
                  {pct(s.axes[a].value)}
                  <br />
                  <span className="muted">{s.axes[a].n} actions</span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <figcaption className="muted">
        Blocs réussis selon la situation. Défenseur rapide : {(data.fast_speed * YDS_TO_MPH).toFixed(1)} mph ou plus sur
        les 1,5 premières secondes. Défenseur lourd : {data.heavy_lbs} lbs ou plus. Centre = 50 %,
        bord = 100 %. Trait interrompu = pas de donnée. Chiffres grisés sous {minSnaps} actions.
      </figcaption>
    </figure>
  )
}
