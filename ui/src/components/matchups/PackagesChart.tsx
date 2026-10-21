import { scaleLinear } from 'd3'
import { useEffect, useState } from 'react'
import { api } from '../../api'
import type { Filters, PackageRow } from '../../api'
import { pct, secs } from '../../format'

interface Props {
  team: string
  filters: Filters
  minSnaps: number
}

const W = 640
const ROW = 64
const LEFT = 130

/** C7 : distribution du temps avant pression par paquet (boîtes : 10e–90e centiles). */
export function PackagesChart({ team, filters, minSnaps }: Props) {
  const [rows, setRows] = useState<PackageRow[]>([])
  useEffect(() => {
    api.packages(team, filters).then(setRows)
  }, [team, filters])
  const x = scaleLinear().domain([1, 6]).range([LEFT, W - 20])
  const fastest = [...rows]
    .filter((r) => r.ttp_median !== null && r.n >= minSnaps)
    .sort((a, b) => (a.ttp_median ?? 9) - (b.ttp_median ?? 9))[0]
  const H = 40 + rows.length * ROW

  return (
    <section className="panel">
      <h3>
        {fastest
          ? `Avec ${fastest.package} joueurs qui chargent, la pression arrive le plus vite (${secs(fastest.ttp_median)} en moyenne)`
          : 'Combien de joueurs chargent le quarterback ?'}
      </h3>
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Temps avant pression par paquet">
        {[1, 2, 3, 4, 5, 6].map((t) => (
          <g key={t}>
            <line x1={x(t)} x2={x(t)} y1={10} y2={H - 20} stroke="#263040" />
            <text x={x(t)} y={H - 4} textAnchor="middle">
              {t} s
            </text>
          </g>
        ))}
        {rows.map((r, i) => {
          const [p10, p25, p50, p75, p90] = r.ttp_quartiles
          const y = 20 + i * ROW
          return (
            <g key={r.package} transform={`translate(0, ${y})`}>
              <text x={0} y={18} style={{ fill: '#e8ecf1', fontWeight: 600 }}>
                {r.package} qui chargent
              </text>
              <text x={0} y={36}>
                {r.n} actions{r.blitz ? ' · blitz' : ''}
              </text>
              {p10 !== null && p90 !== null && p25 !== null && p75 !== null && p50 !== null && (
                <>
                  <line x1={x(p10)} x2={x(p90)} y1={20} y2={20} stroke="#9aa4b1" />
                  <rect x={x(p25)} y={8} width={x(p75) - x(p25)} height={24} fill="#3b82f6" opacity={0.5} />
                  <line x1={x(p50)} x2={x(p50)} y1={6} y2={34} stroke="#e8ecf1" strokeWidth={3} />
                </>
              )}
            </g>
          )
        })}
      </svg>
      <table className="simple">
        <thead>
          <tr>
            <th>Joueurs qui chargent</th>
            <th>Actions</th>
            <th>Pression sur le QB</th>
            <th>Sacks</th>
            <th>Délai avant pression</th>
            <th>Placements les plus fréquents</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.package}>
              <td>{r.package}</td>
              <td>{r.n}</td>
              <td>{pct(r.pressure_rate)}</td>
              <td>{pct(r.sack_rate)}</td>
              <td>
                {secs(r.ttp_median)} <span className="muted">({r.ttp_n} pressions)</span>
              </td>
              <td className="muted">{r.alignments.map((a) => `${a.alignments} (${a.n})`).join(' ; ')}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="muted">
        Boîte : 25e–75e centiles, trait : médiane, moustaches : 10e–90e centiles, sur les jeux avec
        pression mesurée. « Blitz » = 5 joueurs ou plus qui chargent. Combinable avec les filtres
        (exemple : Cover-1, 3e & long).
      </p>
    </section>
  )
}
