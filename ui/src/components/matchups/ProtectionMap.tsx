import { useEffect, useState } from 'react'
import { api } from '../../api'
import type { Filters, ProtectionData } from '../../api'
import { pct, secs } from '../../format'
import { amberScale, blueScale } from '../../scales'
import { SeqLegend } from '../SeqLegend'

const LINE = ['LT', 'LG', 'C', 'RG', 'RT']
// Gauche de l'attaque à gauche de l'écran (vue de derrière la ligne).
// Postes : centres x = 145 (LT) … 425 (RT). Flèche de l'adversaire vers le gap visé.
const SLOTS: { side: string; gap: string; x: number; tx: number }[] = [
  { side: 'gauche', gap: 'Extérieur', x: 40, tx: 92 },
  { side: 'gauche', gap: 'C', x: 105, tx: 112 },
  { side: 'gauche', gap: 'B', x: 170, tx: 180 },
  { side: 'gauche', gap: 'A', x: 235, tx: 250 },
  { side: 'droite', gap: 'A', x: 335, tx: 320 },
  { side: 'droite', gap: 'B', x: 400, tx: 390 },
  { side: 'droite', gap: 'C', x: 465, tx: 458 },
  { side: 'droite', gap: 'Extérieur', x: 530, tx: 478 },
]

interface Props {
  team: string
  filters: Filters
  minSnaps: number
}

/** C5 : carte de protection de l'unité. Poste coloré par pressions concédées, flèches par gap. */
export function ProtectionMap({ team, filters, minSnaps }: Props) {
  const [data, setData] = useState<ProtectionData | null>(null)
  useEffect(() => {
    api.protection(team, filters).then(setData)
  }, [team, filters])
  if (!data) return <p className="muted">Chargement…</p>

  const rate = amberScale(0, 0.15)
  const ttpColor = blueScale(4, 2)
  const maxN = Math.max(1, ...data.gaps.map((g) => g.n))
  const measured = data.gaps.filter((g) => g.gap !== null)
  const unmeasured = data.gaps.filter((g) => g.gap === null).reduce((s, g) => s + g.n, 0)
  const top = [...measured].sort((a, b) => b.n - a.n)[0]

  return (
    <section className="panel">
      <h3>
        {top
          ? `${team} : la pression arrive surtout par ${top.gap === 'Extérieur' ? "l'extérieur" : `le gap ${top.gap}`} ${top.side}`
          : `${team} : aucune pression mesurée`}
      </h3>
      <svg className="chart" viewBox="0 0 570 250" role="img" aria-label="Carte de protection">
        {SLOTS.map((s) => {
          const g = measured.find((m) => m.side === s.side && m.gap === s.gap)
          if (!g) return null
          const w = 2 + (14 * g.n) / maxN
          return (
            <g key={`${s.side}-${s.gap}`}>
              <line
                x1={s.x}
                y1={20}
                x2={s.tx}
                y2={150}
                stroke={g.ttp === null ? '#6b7280' : ttpColor(g.ttp)}
                strokeWidth={w}
                strokeLinecap="round"
                markerEnd="url(#arrow)"
              />
              <text x={s.x} y={14} textAnchor="middle">
                {s.gap === 'Extérieur' ? 'Ext.' : s.gap} · {g.n}
              </text>
            </g>
          )
        })}
        <defs>
          <marker
            id="arrow"
            viewBox="0 0 10 10"
            refX="5"
            refY="5"
            markerUnits="userSpaceOnUse"
            markerWidth="12"
            markerHeight="12"
            orient="auto"
          >
            <path d="M0,0 L10,5 L0,10 z" fill="#9aa4b1" />
          </marker>
        </defs>
        {LINE.map((a, i) => {
          const p = data.positions.find((x) => x.alignment === a)
          return (
            <g key={a} transform={`translate(${115 + i * 70}, 165)`}>
              <rect
                width={60}
                height={56}
                rx={8}
                fill={p ? rate(p.rate) : '#1b2430'}
                stroke="#6b7280"
                opacity={p && p.n < minSnaps ? 0.5 : 1}
              />
              <text x={30} y={22} textAnchor="middle" style={{ fill: '#e8ecf1', fontWeight: 700 }}>
                {a}
              </text>
              <text x={30} y={40} textAnchor="middle" style={{ fill: '#e8ecf1' }}>
                {p ? pct(p.rate) : '—'}
              </text>
              <text x={30} y={70} textAnchor="middle">
                {p ? `${p.n} actions` : ''}
              </text>
            </g>
          )
        })}
      </svg>
      <SeqLegend label="Pressions laissées passer par poste" from={rate(0)} to={rate(0.15)} low="0 %" high="≥ 15 %" />
      <SeqLegend label="Couleur de la flèche : délai avant pression" from={ttpColor(4)} to={ttpColor(2)} low="≥ 4 s" high="≤ 2 s" />
      <p className="muted">
        Épaisseur de la flèche = nombre de pressions ({data.pressures} au total). Le couloir (gap) est lu quand le défenseur atteint
        la profondeur de la ligne, sinon au moment de la pression ; {unmeasured} non mesurables.
        Temps médians : {measured.map((g) => `${g.gap} ${g.side} ${secs(g.ttp)}`).join(' · ')}
      </p>
    </section>
  )
}
