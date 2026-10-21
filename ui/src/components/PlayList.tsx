import type { SnapRow } from '../api'
import { BLOCK_TYPES, causeLabel, downDistance, secs } from '../format'

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
        {title} <span className="muted">({rows.length} actions)</span>
      </h3>
      {rows.length === 0 ? (
        <p className="muted">Aucune action dans cette situation.</p>
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
                  Semaine {r.week} · {r.quarter}e QT {r.gameClock} · contre {r.defensiveTeam}
                </span>
                <span className="playrow__dd">{downDistance(r.down, r.yardsToGo)}</span>
                <span className="playrow__desc">{r.playDescription}</span>
                <span className="playrow__facts">
                  {r.pff_positionLinedUp} · {BLOCK_TYPES[r.pff_blockType ?? ''] ?? 'Type de bloc non noté'}
                  {r.blockedName ? ` · face à ${r.blockedName}` : ''}
                </span>
                <span className="playrow__times">
                  Battu à {secs(r.defeat_t)} · pression à {secs(r.ttp)} · lancer à {secs(r.t_end)}
                </span>
                {r.cause && (
                  <span className="playrow__cause" title={r.reason ?? undefined}>
                    Cause probable : {causeLabel(r.cause)}
                  </span>
                )}
                {r.counted && <span className="playrow__badge">{countedLabel}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
