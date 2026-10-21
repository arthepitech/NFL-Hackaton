import { line, scaleLinear } from 'd3'
import type { WeekRow } from '../../api'
import { pct } from '../../format'

interface Props {
  weeks: WeekRow[]
  minSnaps: number
  onWeek: (week: number) => void
}

const W = 520
const H = 220
const M = { l: 44, r: 16, t: 16, b: 30 }

/** J2 : est-ce que je progresse ? Blocs gagnés par semaine, avec la moyenne du poste. */
export function ProgressChart({ weeks, minSnaps, onWeek }: Props) {
  if (weeks.length === 0) return null
  const x = scaleLinear()
    .domain([Math.min(...weeks.map((w) => w.week)), Math.max(...weeks.map((w) => w.week))])
    .range([M.l, W - M.r])
  const y = scaleLinear().domain([0.7, 1]).range([H - M.b, M.t]).clamp(true)
  const mine = line<WeekRow>()
    .x((w) => x(w.week))
    .y((w) => y(w.pbwr_pff))
  const avg = line<WeekRow>()
    .defined((w) => w.position_pbwr_pff !== null)
    .x((w) => x(w.week))
    .y((w) => y(w.position_pbwr_pff ?? 0))
  const first = weeks[0].pbwr_pff
  const last = weeks[weeks.length - 1].pbwr_pff
  const delta = (last - first) * 100

  return (
    <section className="panel">
      <h3>
        {delta >= 0 ? 'En progrès' : 'En recul'} : {delta >= 0 ? '+' : ''}
        {delta.toFixed(1)} points de blocs réussis entre la semaine {weeks[0].week} et la semaine{' '}
        {weeks[weeks.length - 1].week}
      </h3>
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Progression par semaine">
        {[0.7, 0.8, 0.9, 1].map((v) => (
          <g key={v}>
            <line x1={M.l} x2={W - M.r} y1={y(v)} y2={y(v)} stroke="#263040" />
            <text x={M.l - 6} y={y(v) + 4} textAnchor="end">
              {Math.round(v * 100)} %
            </text>
          </g>
        ))}
        <path d={avg(weeks) ?? ''} stroke="#6b7280" strokeDasharray="5 4" strokeWidth={2} fill="none" />
        <path d={mine(weeks) ?? ''} stroke="#3b82f6" strokeWidth={3} fill="none" />
        {weeks.map((w) => (
          <g key={w.week} style={{ cursor: 'pointer' }} onClick={() => onWeek(w.week)}>
            <circle
              cx={x(w.week)}
              cy={y(w.pbwr_pff)}
              r={11}
              fill="#3b82f6"
              opacity={w.n < minSnaps ? 0.45 : 1}
            >
              <title>
                Semaine {w.week} : {pct(w.pbwr_pff)} sur {w.n} actions. Voir les actions.
              </title>
            </circle>
            <text x={x(w.week)} y={H - 8} textAnchor="middle">
              S{w.week}
            </text>
          </g>
        ))}
      </svg>
      <p className="legend">
        <span className="legend__swatch" style={{ background: '#3b82f6' }} /> Le joueur ·{' '}
        <span className="legend__swatch" style={{ background: '#6b7280' }} /> moyenne du poste ·
        points atténués sous {minSnaps} actions · touchez un point pour voir les actions de la semaine.
      </p>
    </section>
  )
}
