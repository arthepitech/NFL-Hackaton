import { useEffect, useState } from 'react'
import { api } from '../../api'
import type { Playlist } from '../../api'
import type { OpenPlay } from '../PlayList'

interface Props {
  playerId: number
  onPlayQueue: (queue: OpenPlay[]) => void
}

/** J5 : que dois-je revoir avant jeudi ? Playlists annotées par le coach, lecture enchaînée. */
export function PlayerPlaylists({ playerId, onPlayQueue }: Props) {
  const [lists, setLists] = useState<Playlist[]>([])
  useEffect(() => {
    api.playlists(playerId).then(setLists)
  }, [playerId])

  const queue = (l: Playlist): OpenPlay[] =>
    l.items.map((i) => ({ gameId: i.gameId, playId: i.playId, blockerId: i.nflId, rusherId: null, t: i.t }))

  return (
    <section className="panel">
      <h3>À revoir</h3>
      {lists.length === 0 && <p className="muted">Aucune playlist pour l'instant. Le coach en crée depuis le Play Lab.</p>}
      {lists.map((l) => (
        <div key={l.id} className="playlistbox">
          <div className="toolbar">
            <strong>{l.name}</strong>
            <span className="muted">par {l.author} · {l.items.length} clips</span>
            {l.items.length > 0 && (
              <button type="button" className="chip chip--on" onClick={() => onPlayQueue(queue(l))}>
                Lecture enchaînée
              </button>
            )}
          </div>
          <ol>
            {l.items.map((i, k) => (
              <li key={i.id}>
                <button type="button" className="playrow" onClick={() => onPlayQueue(queue(l).slice(k))}>
                  <span>
                    Jeu {i.playId} · t = {i.t === null ? '—' : `${i.t.toFixed(1)} s`}
                  </span>
                  {i.comment && <span>« {i.comment} »</span>}
                </button>
              </li>
            ))}
          </ol>
        </div>
      ))}
      <p className="muted">Commentaires écrits : les commentaires vocaux ne sont pas encore pris en charge.</p>
    </section>
  )
}
