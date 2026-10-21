import { useEffect, useRef, useState } from 'react'
import { api } from '../api'
import type { MetricValue, WeekRow } from '../api'
import { pct, secs } from '../format'

interface Props {
  playerId: number | null
  name: string
  tier: MetricValue['tier']
  minSnaps: number
}

/** J1 : carte joueur mobile, 3 chiffres maximum, balayage d'une semaine à l'autre. */
export function PlayerCard({ playerId, name, tier, minSnaps }: Props) {
  const [weeks, setWeeks] = useState<WeekRow[]>([])
  const [index, setIndex] = useState(0)
  const startX = useRef<number | null>(null)

  useEffect(() => {
    if (playerId === null) return
    api.weekly(playerId).then((rows) => {
      setWeeks(rows)
      setIndex(rows.length - 1)
    })
  }, [playerId])

  if (playerId === null) return <p className="muted">Choisis un joueur dans la Scout Card.</p>
  const week = weeks[index]
  if (!week) return <p className="muted">Aucun snap.</p>
  const prev = weeks[index - 1]
  const trend = prev ? (week.pbwr_pff - prev.pbwr_pff) * 100 : null
  const go = (d: number) => setIndex((i) => Math.min(weeks.length - 1, Math.max(0, i + d)))

  return (
    <article
      className="pcard"
      onPointerDown={(e) => (startX.current = e.clientX)}
      onPointerUp={(e) => {
        if (startX.current === null) return
        const dx = e.clientX - startX.current
        if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1)
        startX.current = null
      }}
    >
      <header>
        <button type="button" onClick={() => go(-1)} disabled={index === 0} aria-label="Semaine précédente">
          ‹
        </button>
        <div>
          <h2>{name}</h2>
          <p className="muted">
            Semaine {week.week} · {week.n} snaps
            {week.n < minSnaps ? ' · échantillon faible' : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={() => go(1)}
          disabled={index === weeks.length - 1}
          aria-label="Semaine suivante"
        >
          ›
        </button>
      </header>
      <dl className={week.n < minSnaps ? 'pcard__stats tile--low' : 'pcard__stats'}>
        <div>
          <dt>Blocs gagnés</dt>
          <dd>{pct(week.pbwr_pff)}</dd>
        </div>
        <div>
          <dt>Temps avant pression</dt>
          <dd>{secs(week.ttp)}</dd>
          <dd className="muted">{week.ttp_n} pressions</dd>
        </div>
        <div>
          <dt>Tendance</dt>
          <dd>{trend === null ? '—' : `${trend >= 0 ? '▲' : '▼'} ${Math.abs(trend).toFixed(1)} pts`}</dd>
          <dd className="muted">vs semaine précédente</dd>
        </div>
      </dl>
      {tier && (
        <p className={`badge badge--${tier}`}>
          {tier === 'top' ? 'Top 10 % des OL (saison)' : 'Bottom 10 % des OL (saison)'}
        </p>
      )}
    </article>
  )
}
