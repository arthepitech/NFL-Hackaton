import type { SnapRow } from '../api'
import { BLOCK_TYPES, downDistance, secs } from '../format'

export interface OpenPlay {
  gameId: number
  playId: number
  blockerId: number
  rusherId: number | null
  t: number | null
}

interface Props {
  rows: SnapRow[]
  nflId: number
  title: string
  countedLabel: string
  onOpen: (p: OpenPlay) => void
  /** Instant auquel ouvrir le Play Lab : défaite par défaut. */
  jumpTo?: 'defeat_t' | 'ttp'
}

export function PlayList({ rows, nflId, title, countedLabel, onOpen, jumpTo = 'defeat_t' }: Props) {
  return (
    <section className="playlist" aria-label={title}>
      <h3>
        {title} <span className="muted">({rows.length} jeux)</span>
      </h3>
      {rows.length === 0 ? (
        <p className="muted">Aucun jeu avec ces filtres.</p>
      ) : (
        <ul>
          {rows.map((r) => (
            <li key={`${r.gameId}-${r.playId}`}>
              <button
                type="button"
                className={`playrow${r.counted ? ' playrow--counted' : ''}`}
                onClick={() =>
                  onOpen({
                    gameId: r.gameId,
                    playId: r.playId,
                    blockerId: nflId,
                    rusherId: r.blockedId,
                    t: r[jumpTo] ?? r.defeat_t,
                  })
                }
              >
                <span className="playrow__when">
                  S{r.week} · Q{r.quarter} {r.gameClock} · vs {r.defensiveTeam}
                </span>
                <span className="playrow__dd">{downDistance(r.down, r.yardsToGo)}</span>
                <span className="playrow__desc">{r.playDescription}</span>
                <span className="playrow__facts">
                  {r.pff_positionLinedUp} · {BLOCK_TYPES[r.pff_blockType ?? ''] ?? 'Sans bloc noté'}
                  {r.blockedName ? ` · face à ${r.blockedName}` : ''}
                </span>
                <span className="playrow__times">
                  Défaite {secs(r.defeat_t)} · Pression {secs(r.ttp)} · Passe {secs(r.t_end)}
                </span>
                {r.counted && <span className="playrow__badge">{countedLabel}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
