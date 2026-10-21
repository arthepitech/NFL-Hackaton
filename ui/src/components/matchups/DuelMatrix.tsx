import { useEffect, useState } from 'react'
import { api } from '../../api'
import type { Filters, MatchupData, SnapRow } from '../../api'
import { pct, secs } from '../../format'
import { blueScale } from '../../scales'
import { SeqLegend } from '../SeqLegend'
import { PlayList, type OpenPlay } from '../PlayList'

interface Props {
  team: string
  opponent: string
  filters: Filters
  minSnaps: number
  onOpenPlay: (p: OpenPlay) => void
}

/** C4 : qui bat qui ? Case = nombre de face-à-face, win rate, TTP médian. */
export function DuelMatrix({ team, opponent, filters, minSnaps, onOpenPlay }: Props) {
  const [data, setData] = useState<MatchupData | null>(null)
  const [duel, setDuel] = useState<{ blocker: number; rusher: number } | null>(null)
  const [clips, setClips] = useState<SnapRow[]>([])

  useEffect(() => {
    api.matchups(team, opponent, filters).then(setData)
  }, [team, opponent, filters])

  useEffect(() => {
    if (!duel) return
    api.matchupDuel(duel.blocker, duel.rusher, filters).then(setClips)
  }, [duel, filters])

  if (!data) return <p className="muted">Chargement…</p>
  if (data.rows.length === 0) return <p className="muted">Aucun duel noté avec ces filtres.</p>
  const color = blueScale(0.5, 1)
  const cell = (b: number, r: number) =>
    data.cells.find((c) => c.blockerId === b && c.rusherId === r)

  return (
    <div className="two-cols">
      <section className="panel">
        <h3>Nos bloqueurs face à leurs défenseurs {opponent ? `(${team} contre ${opponent})` : `(${team})`}</h3>
        <div className="grid-wrap">
          <table className="matrix">
            <thead>
              <tr>
                <th />
                {data.cols.map((c) => (
                  <th key={c.nflId} scope="col">
                    {c.name}
                    <br />
                    <span className="muted">{c.team}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => (
                <tr key={row.nflId}>
                  <th scope="row">
                    {row.alignment} · {row.name}
                  </th>
                  {data.cols.map((col) => {
                    const c = cell(row.nflId, col.nflId)
                    if (!c) return <td key={col.nflId} />
                    const on = duel?.blocker === row.nflId && duel?.rusher === col.nflId
                    return (
                      <td key={col.nflId}>
                        <button
                          type="button"
                          aria-pressed={on}
                          className={c.n < minSnaps ? 'cell--low' : undefined}
                          style={{ background: color(c.win_rate) }}
                          onClick={() => setDuel({ blocker: row.nflId, rusher: col.nflId })}
                          aria-label={`${row.name} contre ${col.name} : ${pct(c.win_rate)} sur ${c.n} face-à-face`}
                        >
                          <span className="cell__main">{Math.round(c.win_rate * 100)} %</span>
                          <span>{c.n} duels · {secs(c.ttp)}</span>
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <SeqLegend label="Blocs réussis" from={color(0.5)} to={color(1)} low="≤ 50 %" high="100 %" />
        <p className="muted">
          Chaque case : blocs réussis · nombre de duels · délai avant pression. Touchez une case pour voir les actions. Cases
          atténuées sous {minSnaps} duels.
        </p>
        {data.projection.length > 0 && (
          <>
            <h3>Duels attendus contre {opponent}</h3>
            <p className="muted">
              D’après le placement habituel de leurs défenseurs : une prévision, pas une
              certitude.
            </p>
            <table className="simple">
              <thead>
                <tr>
                  <th>Leur défenseur</th>
                  <th>Placement habituel</th>
                  <th>Notre bloqueur en face</th>
                </tr>
              </thead>
              <tbody>
                {data.projection.map((p) => (
                  <tr key={p.rusherId}>
                    <td>
                      {p.rusher} <span className="muted">({p.snaps} charges)</span>
                    </td>
                    <td>{p.usual}</td>
                    <td>{p.facing ? `${p.facing} · ${p.blocker ?? '—'}` : 'Pas d’adversaire fixe (blitz)'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </section>
      {duel && (
        <PlayList
          title="Les actions de ce duel, défaites en premier"
          rows={clips}
          nflId={duel.blocker}
          countedLabel="Bloc perdu"
          onOpen={onOpenPlay}
        />
      )}
    </div>
  )
}
