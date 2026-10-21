import { line, scaleLinear } from 'd3'
import { useEffect, useState } from 'react'
import { api } from '../../api'
import type { PlayerSummary, SetCompare as SetData, SetPath } from '../../api'
import { SearchSelect } from '../SearchSelect'

interface Props {
  playerId: number
  players: PlayerSummary[]
}

const W = 420
const H = 300

/** J4 : mes pieds vs la référence. Trajectoire moyenne du set sur les premières secondes. */
export function SetCompare({ playerId, players }: Props) {
  const [reference, setReference] = useState<number | undefined>(undefined)
  const [data, setData] = useState<SetData | null>(null)
  useEffect(() => {
    api.setPath(playerId, reference).then(setData)
  }, [playerId, reference])
  if (!data) return null

  const all = [data.player, data.reference].filter((p): p is SetPath => p !== null)
  const ext = Math.max(1, ...all.flatMap((p) => p.path.map((q) => Math.max(Math.abs(q.dx), Math.abs(q.dy)))))
  // Vue de derrière : extérieur à droite (+dy), recul vers le bas (−dx).
  const sx = scaleLinear().domain([-ext * 0.6, ext * 1.2]).range([0, W])
  const sy = scaleLinear().domain([0.3, -ext * 1.2]).range([0, H])
  const path = line<SetPath['path'][number]>()
    .x((p) => sx(p.dy))
    .y((p) => sy(p.dx))
  const end = (p: SetPath | null) => p?.path.at(-1)
  const me = end(data.player)
  const ref = end(data.reference)

  return (
    <section className="panel">
      <h3>
        {ref && me
          ? `En ${data.window_s} s, ${data.reference?.name} recule de ${Math.abs(ref.dx).toFixed(1)} yd et glisse de ${ref.dy.toFixed(1)} yd ; toi ${Math.abs(me.dx).toFixed(1)} yd et ${me.dy.toFixed(1)} yd`
          : 'Ton placement moyen (set)'}
      </h3>
      <SearchSelect
        label={`Se comparer à (${data.alignment})`}
        value={reference === undefined ? '' : String(reference)}
        emptyLabel="Le meilleur du poste en blocs réussis"
        placeholder="Tapez un nom…"
        options={players
          .filter((p) => p.nflId !== playerId)
          .map((p) => ({ value: String(p.nflId), label: p.name, hint: p.team }))}
        onChange={(v) => setReference(v ? Number(v) : undefined)}
      />
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Trajectoire moyenne du set">
        <rect width={W} height={H} fill="#123018" rx={8} />
        <line x1={sx(0)} x2={sx(0)} y1={0} y2={H} stroke="rgba(255,255,255,0.2)" />
        <text x={W - 8} y={16} textAnchor="end">
          Extérieur →
        </text>
        {data.reference && (
          <path d={path(data.reference.path) ?? ''} stroke="#9aa4b1" strokeWidth={3} strokeDasharray="6 4" fill="none" />
        )}
        <path d={path(data.player.path) ?? ''} stroke="#3b82f6" strokeWidth={3} fill="none" />
      </svg>
      <p className="legend">
        <span className="legend__swatch" style={{ background: '#3b82f6' }} /> {data.player.name} (
        {data.player.n} actions) ·{' '}
        <span className="legend__swatch" style={{ background: '#9aa4b1' }} /> {data.reference?.name ?? '—'} (
        {data.reference?.n ?? 0} actions). Moyenne de toutes ses protections au poste {data.alignment}
        , quel que soit le défenseur affronté.
      </p>
    </section>
  )
}
